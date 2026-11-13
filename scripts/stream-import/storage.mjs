export const stores = {
    restore_sessions: 'id',
    restore_units: ['session', 'source', 'entry', 'part'],
    restore_records: ['session', 'source', 'entry'],
    restore_web: ['session', 'key'],
    restore_companions: ['session', 'database', 'store', 'part'],
};
export function upgrade(db) {
    if (!db.objectStoreNames.contains('store')) db.createObjectStore('store');
    for (const [name, keyPath] of Object.entries(stores)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
    }
}
export const resultOf = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});
export const completed = tx => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('导入已取消'));
    tx.onerror = () => {}; // An error can precede rollback; wait for onabort.
});
export const rangeOf = (...keys) => IDBKeyRange.bound(keys, [...keys, []]);
export const database = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('RPHubDB', 2);
    let settled = false;
    const timer = setTimeout(() => fail(new Error('打开数据库超时，请关闭其他软件页面后重试')), 15000);
    function fail(error) { settled = true; clearTimeout(timer); reject(error); }
    request.onupgradeneeded = () => upgrade(request.result);
    request.onblocked = () => fail(new Error('数据库被其他页面占用，请关闭其他页面后重试'));
    request.onerror = () => fail(request.error);
    request.onsuccess = () => {
        clearTimeout(timer);
        const db = request.result;
        if (settled) { db.close(); return; }
        db.onversionchange = () => db.close();
        resolve(db);
    };
});
export async function saveSession(db, session) {
    const tx = db.transaction('restore_sessions', 'readwrite');
    tx.objectStore('restore_sessions').put(session);
    await completed(tx);
}
export async function removeSession(db, id) {
    const tx = db.transaction(Object.keys(stores), 'readwrite');
    tx.objectStore('restore_sessions').delete(id);
    for (const name of Object.keys(stores).slice(1)) tx.objectStore(name).delete(rangeOf(id));
    await completed(tx);
}
export async function each(db, name, range, fn) {
    const tx = db.transaction(name);
    const done = completed(tx);
    const request = tx.objectStore(name).openCursor(range);
    let failure;
    request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        try { fn(cursor.value); cursor.continue(); }
        catch (error) { failure = error; tx.abort(); }
    };
    try { await done; } catch (error) { throw failure || error; }
}
export class StagingSink {
    constructor(db, session) {
        Object.assign(this, { db, session, queue: [] });
        // [rphub 2.9.036] 边写边累加每个集合的分片数与字节数。原先这些数字要在
        //   validate() 里把整库再读一遍才算得出来 —— 300MB 级备份就是 300MB 的重复反序列化，
        //   手机上正好卡在「进度 100% 之后」。记录完整性校验也一并挪到这里，零额外 I/O。
        this.tally = new Map();
    }
    emit(item) { this.queue.push(item); }
    async flush() {
        if (!this.queue.length) return;
        const id = item => JSON.stringify([item.source, item.entry]);
        const prepared = [];
        for (const { kind, ...item } of this.queue) {
            if (kind === 'unit') {
                const key = id(item);
                const tally = this.tally.get(key) || { count: 0, bytes: 0 };
                tally.count += 1;
                tally.bytes += Number(item.bytes) || 0;
                this.tally.set(key, tally);
            } else if (kind === 'record') {
                // 空数组条目一个分片都没有，累加表里本来就不会有它。
                const tally = this.tally.get(id(item)) || { count: 0, bytes: 0 };
                this.tally.delete(id(item));
                if (tally.count !== item.count)
                    throw new Error('暂存记录不完整：' + item.key);
                item.bytes = tally.bytes;
            }
            prepared.push([kind, item]);
        }
        const tx = this.db.transaction(Object.keys(stores).slice(1), 'readwrite');
        const names = { unit: 'restore_units', record: 'restore_records', localStorage: 'restore_web', companion: 'restore_companions' };
        for (const [kind, item] of prepared) {
            tx.objectStore(names[kind]).put({ ...item, session: this.session });
        }
        await completed(tx);
        this.queue.length = 0;
    }
}
export async function validate(db, session, source, wait, maxCollectionBytes = 128 * 1048576, onStep) {
    const last = new Map();
    await each(db, 'restore_records', rangeOf(session, source), item => {
        last.set(item.key, item);
        if (last.size > 100000) throw new Error('备份存储项超过 10 万项');
    });
    const deleted = new Set();
    const summary = { records: last.size, cards: 0, messages: 0, memories: 0 };
    // [rphub 2.9.036] 逐条回推进度：300MB 级暂存库在手机上核对要几十秒，
    //   原先这段不发任何消息，界面看门狗 45s 就会把 worker 直接 terminate。
    let done = 0;
    for (const [key, record] of last) {
        await wait();
        onStep?.(++done, last.size);
        if (key.startsWith('rp_hub_b1_memory_state_')) {
            const meta = (await resultOf(db.transaction('restore_units').objectStore('restore_units')
                .get([session, source, record.entry, 0])))?.value;
            const scope = key.slice('rp_hub_b1_memory_state_'.length);
            if (!scope || !meta || meta.schema !== 1 || !/^[a-f0-9]{32}$/.test(meta.revision) || typeof meta.deleted !== 'boolean')
                throw new Error('记忆版本记录损坏：' + key);
            const body = 'rp_hub_classic_memories_' + scope;
            if (meta.deleted) deleted.add(body);
            else if (!last.get(body)?.array) throw new Error('记忆版本记录缺少正文：' + body);
        }
        if (key.startsWith('rp_hub_classic_memories_') && !record.array) throw new Error('记忆正文必须是数组：' + key);
        if (key === 'rp_hub_characters' && !record.array) throw new Error('角色卡集合必须是数组');
        // [rphub 2.9.036] 分片数与字节数由 StagingSink 在写入时累加并盖在记录上；
        //   只有旧版本留下的暂存没有这个字段，才退回逐分片统计。
        let bytes = Number(record.bytes);
        if (!Number.isFinite(bytes)) {
            bytes = 0;
            let count = 0;
            await each(db, 'restore_units', rangeOf(session, source, record.entry), unit => {
                bytes += Number(unit.bytes) || 0;
                count++;
            });
            if (count !== record.count) throw new Error('暂存记录不完整：' + key);
        }
        // Cards and chats use bounded records; other collections still need one bounded value.
        if (key !== 'rp_hub_characters' && !key.startsWith('rp_hub_chat_') && bytes > maxCollectionBytes)
            throw new Error('单个数据集合超过 ' + maxCollectionBytes / 1048576 + ' MB，请切换读取档位或拆分备份：' + key);
        if (key === 'rp_hub_characters') summary.cards = record.count;
        if (key.startsWith('rp_hub_chat_') && record.array) summary.messages += record.count;
        if (key.startsWith('rp_hub_classic_memories_')) summary.memories += record.count;
    }
    for (const key of deleted) summary.memories -= last.get(key)?.count || 0;
    return { plan: [...last.values()], deleted: [...deleted], summary };
}
