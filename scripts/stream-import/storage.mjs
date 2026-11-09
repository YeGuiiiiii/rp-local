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
    constructor(db, session) { Object.assign(this, { db, session, queue: [] }); }
    emit(item) { this.queue.push(item); }
    async flush() {
        if (!this.queue.length) return;
        const tx = this.db.transaction(Object.keys(stores).slice(1), 'readwrite');
        const names = { unit: 'restore_units', record: 'restore_records', localStorage: 'restore_web', companion: 'restore_companions' };
        for (const { kind, ...item } of this.queue) {
            tx.objectStore(names[kind]).put({ ...item, session: this.session });
        }
        await completed(tx);
        this.queue.length = 0;
    }
}
export async function validate(db, session, source, wait, maxCollectionBytes = 128 * 1048576) {
    const last = new Map();
    await each(db, 'restore_records', rangeOf(session, source), item => {
        last.set(item.key, item);
        if (last.size > 100000) throw new Error('备份存储项超过 10 万项');
    });
    const deleted = new Set();
    const summary = { records: last.size, cards: 0, messages: 0, memories: 0 };
    for (const [key, record] of last) {
        await wait();
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
        let bytes = 0, count = 0;
        await each(db, 'restore_units', rangeOf(session, source, record.entry), unit => {
            bytes += unit.bytes;
            count++;
            if (key === 'rp_hub_characters' && (!unit.value || typeof unit.value !== 'object' || Array.isArray(unit.value)))
                throw new Error('角色卡内容不是对象');
        });
        if (count !== record.count) throw new Error('暂存记录不完整：' + key);
        // Character cards are committed one at a time; other collections still need one bounded value.
        if (key !== 'rp_hub_characters' && bytes > maxCollectionBytes)
            throw new Error('单个数据集合超过 ' + maxCollectionBytes / 1048576 + ' MB，请切换读取档位或拆分备份：' + key);
        if (key === 'rp_hub_characters') summary.cards = record.count;
        if (key.startsWith('rp_hub_chat_') && record.array) summary.messages += record.count;
        if (key.startsWith('rp_hub_classic_memories_')) summary.memories += record.count;
    }
    for (const key of deleted) summary.memories -= last.get(key)?.count || 0;
    return { plan: [...last.values()], deleted: [...deleted], summary };
}
