import { upgrade, database, deleteStagingDatabase, resultOf, completed, rangeOf, saveSession, removeSession, each, StagingSink, validate } from './storage.mjs';
import { profile, profiles } from './profiles.mjs';
import { verifyChunks, decodeChat } from './cloud.mjs';

const readSession = (db, id) => resultOf(db.transaction('restore_sessions').objectStore('restore_sessions').get(id));
const webText = value => String(value ?? '');
const cancelled = signal => {
    if (signal?.aborted) throw new DOMException('导入已取消', 'AbortError');
};
export async function stageEntries(entries, { limits = profile() } = {}) {
    // [rphub 2.9.147] 暂存写进独立库，不再落到正式库 RPHubDB。
    const db = await database(), id = crypto.randomUUID().replaceAll('-', '');
    const sink = new StagingSink(db, id), encoder = new TextEncoder();
    try {
        await saveSession(db, { id, state: 'reading' });
        let index = 0;
        for await (const entry of entries) {
            const array = Array.isArray(entry.value) || !!entry.value?.[Symbol.asyncIterator];
            let part = 0;
            const write = async value => {
                const bytes = encoder.encode(JSON.stringify(value)).length;
                const maxBytes = entry.key === 'rp_hub_characters' ? profiles.at(-1).unitBytes : limits.unitBytes;
                if (bytes > maxBytes) throw new Error('单条云端数据超过 ' + maxBytes / 1048576 + ' MB，原数据未改动');
                sink.emit({ kind: 'unit', source: 'entries', entry: index, part: part++, value, bytes });
                await sink.flush();
            };
            if (array) { for await (const value of entry.value) await write(value); }
            else await write(entry.value);
            sink.emit({ kind: 'record', source: 'entries', entry: index++, key: entry.key, hasValue: true, array, count: part });
            await sink.flush();
        }
        const result = await validate(db, id, 'entries', async () => {}, limits.collectionBytes);
        await saveSession(db, { id, ...result, source: 'entries', state: 'complete' });
        return id;
    } catch (error) { await removeSession(db, id); throw error; }
}
async function momentsDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('sf_moments_db', 1);
        let settled = false;
        const timer = setTimeout(() => { settled = true; reject(new Error('名场面数据库打开超时')); }, 15000);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains('moments')) req.result.createObjectStore('moments');
        };
        req.onsuccess = () => { clearTimeout(timer); if (settled) req.result.close(); else resolve(req.result); };
        req.onerror = () => { clearTimeout(timer); reject(req.error); };
        req.onblocked = () => { settled = true; clearTimeout(timer); reject(new Error('名场面数据库被其他页面占用')); };
    });
}
async function writeMoments(value) {
    const db = await momentsDb();
    try {
        const tx = db.transaction('moments', 'readwrite');
        if (value === undefined) tx.objectStore('moments').delete('list');
        else tx.objectStore('moments').put(value, 'list');
        await completed(tx);
    } finally { db.close(); }
}
function writeWeb(items) {
    for (const { key, value } of items) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
        if (localStorage.getItem(key) !== value) throw new Error('偏好设置写入失败：' + key);
    }
}
async function discardPreparedCards(main, session) {
    if (!session.cardRevision) return;
    const tx = main.transaction('store', 'readwrite'), store = tx.objectStore('store');
    for (const prefix of ['__rp_card__:', '__rp_card_image__:']) {
        const start = prefix + session.cardRevision + ':';
        store.delete(IDBKeyRange.bound(start, start + '\uffff'));
    }
    await completed(tx);
}
// The journal is committed before touching another database or localStorage.
// The formal store and the journal's final state commit in the same transaction.
export async function recover(main) {
    // 会话与暂存数据在独立库里；恢复动作只碰正式库的 store。
    const stage = await database();
    const sessions = await resultOf(stage.transaction('restore_sessions').objectStore('restore_sessions').getAll());
    for (const session of sessions) {
        if (session.state === 'applying' || session.state === 'applied') {
            window.RPLocalStore?.setWebWritesPaused(true);
            try {
                const items = session.state === 'applying' ? session.oldWeb : session.web;
                if (session.state === 'applying' && session.hasMoments) await writeMoments(session.oldMoments);
                writeWeb(items);
                for (const { key, value } of items) {
                    if (value === null) await window.RPLocalStore?.remove('__ls__:' + key);
                    else await window.RPLocalStore?.save('__ls__:' + key, value);
                }
            } finally { window.RPLocalStore?.setWebWritesPaused(false); }
        }
        if (session.state !== 'applied') await discardPreparedCards(main, session);
        await removeSession(stage, session.id);
    }
    stage.close();
    // 老版本把暂存表建在正式库里，那些行还占着逻辑空间；新代码不再读它们，顺手清空。
    //   注意：IndexedDB 删行不会立刻缩小文件，但至少让「压缩存储」重写时不再搬这几张废表。
    const legacy = ['restore_sessions', 'restore_units', 'restore_records', 'restore_web', 'restore_companions']
        .filter(name => main.objectStoreNames.contains(name));
    if (legacy.length) {
        try {
            const tx = main.transaction(legacy, 'readwrite');
            legacy.forEach(name => tx.objectStore(name).clear());
            await completed(tx);
        } catch (error) { /* 清不掉不影响使用 */ }
    }
    // 暂存库已清空：整库删掉，把空间还给系统（这是本版的核心目的）。
    await deleteStagingDatabase();
}
async function prepareExtras(db, session) {
    const web = new Map();
    await each(db, 'restore_web', rangeOf(session.id), item => web.set(item.key, webText(item.value)));
    for (const record of session.plan.filter(item => item.key.startsWith('__ls__:'))) {
        const unit = await resultOf(db.transaction('restore_units').objectStore('restore_units')
            .get([session.id, session.source, record.entry, 0]));
        if (record.array) throw new Error('偏好设置格式错误：' + record.key);
        web.set(record.key.slice(7), webText(unit?.value));
    }
    if ([...web].reduce((total, [key, value]) => total + (key.length + value.length) * 2, 0) > 16 * 1048576)
        throw new Error('偏好设置体积超过 16 MB');
    const groups = new Map();
    let bytes = 0;
    await each(db, 'restore_companions', rangeOf(session.id), item => {
        const priority = item.database === 'sf_moments_db' && item.store === 'moments' ? 0
            : item.database === 'SakuraMomentsDB' && item.store === 'moments' ? 1
                : item.database === 'moments' && item.store === 'list' ? 2 : -1;
        if (priority < 0) return;
        bytes += item.bytes;
        if (bytes > 32 * 1048576) throw new Error('名场面数据超过 32 MB，请使用原有导入');
        if (!groups.has(priority)) groups.set(priority, []);
        const record = item.value;
        const value = record && typeof record === 'object' && Object.hasOwn(record, 'v') ? record.v : record;
        if ((record?.k ?? record?.key) === 'list' && Array.isArray(value)) groups.get(priority).push(...value);
        else groups.get(priority).push(value);
    });
    const priority = [...groups.keys()].sort()[0];
    return { web: [...web].map(([key, value]) => ({ key, value })), moments: groups.get(priority) };
}
async function prepareCharacters(main, stage, session, restoreValue, signal, progress) {
    const record = session.plan.find(item => item.key === 'rp_hub_characters');
    if (!record) return null;
    await discardPreparedCards(main, session);
    session.cardRevision = crypto.randomUUID().replaceAll('-', '');
    await saveSession(stage, session);
    const cards = [], ids = new Set();
    for (let part = 0; part < record.count; part++) {
        cancelled(signal);
        const unit = await resultOf(stage.transaction('restore_units').objectStore('restore_units')
            .get([session.id, session.source, record.entry, part]));
        const card = restoreValue(unit?.value);
        // [rphub 2.9.036] 原先这条在 validate() 里靠回扫 62MB 分片来查，现在挪到真正用到的地方。
        if (!card || typeof card !== 'object' || Array.isArray(card))
            throw new Error('角色卡内容不是对象，原数据未改动');
        if (card.rphubCardStub === 1 || card.avatar?.rphubCardImage === 1)
            throw new Error('备份缺少完整角色卡内容，原数据未改动');
        const uuid = card.uuid || crypto.randomUUID();
        if (ids.has(uuid)) throw new Error('角色卡标识重复，原数据未改动');
        ids.add(uuid);
        const summary = { ...await window.RPHubStorage.toCharacterStub(card), uuid,
            rphubCardRevision: session.cardRevision };
        cards.push(summary);
        window.RPLocalStore?.assignFolders(cards, false);
        Object.assign(card, { uuid, importedName: summary.importedName, storageFolder: summary.storageFolder });
        const suffix = session.cardRevision + ':' + uuid;
        const tx = main.transaction('store', 'readwrite'), store = tx.objectStore('store');
        if (typeof card.avatar === 'string' && card.avatar.startsWith('data:') && card.avatar.length >= 65536) {
            store.put({ uuid, storageFolder: card.storageFolder, avatar: card.avatar }, '__rp_card_image__:' + suffix);
            card.avatar = { rphubCardImage: 1 };
        }
        store.put(card, '__rp_card__:' + suffix);
        await completed(tx);
        progress?.(part + 1);
    }
    return { rphubCardLibrary: 1, cards };
}
export async function apply(id, { beforeApply, restoreValue, signal, progress }) {
    // [rphub 2.9.147] 正式库与暂存库分开：读暂存、写正式，两边各开各的连接。
    //   原来它们在同一个库、同一个事务里，好处是「要么全成要么全不成」；
    //   代价是暂存数据留在正式库里清不掉。现在按 key 逐个写，每个 key 自己一个事务，
    //   导入失败时旧代码那套「恢复旧偏好 + 删掉本次准备好的卡片」照旧执行。
    const main = await window.RPHubStorage.initDB();
    const stage = await database();
    const session = await readSession(stage, id);
    if (session?.state !== 'complete') throw new Error('暂存数据不可用，请重新选择文件');
    const deleted = new Set(session.deleted);
    const records = session.plan.filter(item => !item.key.startsWith('__ls__:')
        && item.key !== '__rp_local_mirror_revision'
        && !item.key.startsWith('rp_hub_b1_memory_state_') && !deleted.has(item.key));
    const cardCount = session.plan.find(item => item.key === 'rp_hub_characters')?.count || 0;
    const totalWork = cardCount + records.length + 1;
    const extras = await prepareExtras(stage, session);
    cancelled(signal);
    await beforeApply();
    await window.RPLocalStore?.flush();
    window.RPHubStorage.setWritesPaused(true);
    window.RPLocalStore?.setWebWritesPaused(true);
    let journaled = false, committed = false, recoveryRequired = false;

    const writeKey = (key, value) => new Promise((resolve, reject) => {
        const tx = main.transaction('store', 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || new DOMException('导入已取消', 'AbortError'));
        tx.onerror = () => {};
        try {
            for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([{ key, value }])) {
                window.RPHubStorage.putStoredRecord(tx.objectStore('store'), entry.value, entry.key);
            }
        } catch (error) {
            try { tx.abort(); } catch (_) {}
            reject(error);
        }
    });

    const readRecordValue = async record => {
        if (!record.array) {
            const unit = await resultOf(stage.transaction('restore_units').objectStore('restore_units')
                .get([session.id, session.source, record.entry, 0]));
            return restoreValue(unit?.value);
        }
        const value = [];
        const tx = stage.transaction('restore_units');
        const request = tx.objectStore('restore_units').openCursor(rangeOf(session.id, session.source, record.entry));
        await new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) { resolve(); return; }
                try { value.push(restoreValue(cursor.value.value)); cursor.continue(); }
                catch (error) { reject(error); }
            };
            request.onerror = () => reject(request.error);
        });
        return value;
    };

    try {
        const oldCardKeys = cardCount || session.plan.some(item => item.key === 'rp_hub_characters')
            ? (await window.RPHubStorage.readStorageKeys(main))
            .filter(key => key.startsWith('__rp_card__:') || key.startsWith('__rp_card_image__:')) : [];
        const characters = await prepareCharacters(main, stage, session, restoreValue, signal,
            done => progress?.(done, totalWork, '正在整理角色卡 ' + done + ' / ' + cardCount));
        const journal = {
            id, state: 'applying', web: extras.web, cardRevision: session.cardRevision,
            oldWeb: extras.web.map(({ key }) => ({ key, value: localStorage.getItem(key) })),
            hasMoments: extras.moments !== undefined,
        };
        if (journal.hasMoments) {
            const moments = await momentsDb();
            try { journal.oldMoments = await resultOf(moments.transaction('moments').objectStore('moments').get('list')); }
            finally { moments.close(); }
        }
        await saveSession(stage, journal);
        journaled = true;
        cancelled(signal);
        if (journal.hasMoments) await writeMoments(extras.moments.map(value => restoreValue(value)));
        cancelled(signal);

        // ① 清掉旧的卡片键与本次要作废的键（单独一个事务，量小）
        await new Promise((resolve, reject) => {
            const tx = main.transaction('store', 'readwrite');
            const store = tx.objectStore('store');
            store.delete('__rp_local_mirror_revision');
            oldCardKeys.forEach(key => store.delete(key));
            try {
                for (const key of deleted) {
                    for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([
                        { key: key.replace('rp_hub_classic_memories_', 'rp_hub_b1_memory_state_'),
                            value: { schema: 1, revision: crypto.randomUUID().replaceAll('-', ''), deleted: true } }
                    ])) store.put(entry.value, entry.key);
                    window.RPHubStorage.deleteStoredRecord(store, key);
                }
            } catch (error) { try { tx.abort(); } catch (_) {} reject(error); return; }
            tx.oncomplete = () => resolve();
            tx.onabort = () => reject(tx.error || new DOMException('导入已取消', 'AbortError'));
            tx.onerror = () => {};
        });
        cancelled(signal);

        // ② 逐条写入：读一条（或一整个数组记录）、写一条，写完就放手。
        for (let index = 0; index < records.length; index++) {
            cancelled(signal);
            const record = records[index];
            const value = record.key === 'rp_hub_characters' ? characters : await readRecordValue(record);
            cancelled(signal);
            await writeKey(record.key, value);
            progress?.(cardCount + index + 1, totalWork);
        }

        writeWeb(extras.web);
        await saveSession(stage, { id, state: 'applied', web: extras.web, cardRevision: session.cardRevision });
        committed = true;
        // [rphub 2.9.043] 收尾两件事：写本机文件副本、回收暂存库。文案说明「只需一次」。
        progress?.(totalWork - 1, totalWork, '正在写入本机存档（只需一次，之后启动更快）');
        await (window.RPHubStorage.syncLocalFiles?.() ?? null);
        progress?.(totalWork, totalWork);
    } catch (error) {
        if (committed) {
            error.recoveryRequired = true;
            error.message = '本机存档保存未完成，请重新打开软件继续恢复：' + error.message;
        }
        if (!committed) {
            try {
                if (journaled) await recover(main);
                else await discardPreparedCards(main, session);
            }
            catch (rollbackError) {
                recoveryRequired = true;
                const failure = new Error('恢复原数据未完成，请重新打开软件自动恢复：' + rollbackError.message);
                failure.recoveryRequired = true;
                throw failure;
            }
        }
        throw error;
    } finally {
        if (!committed && !recoveryRequired) {
            window.RPHubStorage.setWritesPaused(false);
            window.RPLocalStore?.setWebWritesPaused(false);
        }
        try { stage.close(); } catch (_) {}
        try { main.close?.(); } catch (_) {}
        // 成功或失败都清掉暂存库：成功时数据已经写进正式库，失败时重导即可。
        // 这一句是「导一次涨几百兆」的根治点——暂存那几百兆从此不在正式库里。
        if (!recoveryRequired) await deleteStagingDatabase();
    }
}
window.RPStreamImport = { upgrade, database, recover, apply, stageEntries, readSession, removeSession, profile, profiles, verifyChunks, decodeChat };
