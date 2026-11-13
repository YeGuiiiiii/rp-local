import { upgrade, database, resultOf, completed, rangeOf, saveSession, removeSession, each, StagingSink, validate } from './storage.mjs';
import { profile, profiles } from './profiles.mjs';

const readSession = (db, id) => resultOf(db.transaction('restore_sessions').objectStore('restore_sessions').get(id));
const webText = value => String(value ?? '');
const cancelled = signal => {
    if (signal?.aborted) throw new DOMException('导入已取消', 'AbortError');
};
export async function stageEntries(entries, { limits = profile() } = {}) {
    const db = await window.RPHubStorage.initDB(), id = crypto.randomUUID().replaceAll('-', '');
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
async function discardPreparedCards(db, session) {
    if (!session.cardRevision) return;
    const tx = db.transaction('store', 'readwrite'), store = tx.objectStore('store');
    for (const prefix of ['__rp_card__:', '__rp_card_image__:']) {
        const start = prefix + session.cardRevision + ':';
        store.delete(IDBKeyRange.bound(start, start + '\uffff'));
    }
    await completed(tx);
}
// The journal is committed before touching another database or localStorage.
// The formal store and the journal's final state commit in the same transaction.
export async function recover(db) {
    const sessions = await resultOf(db.transaction('restore_sessions').objectStore('restore_sessions').getAll());
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
        if (session.state !== 'applied') await discardPreparedCards(db, session);
        await removeSession(db, session.id);
    }
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
async function prepareCharacters(db, session, restoreValue, signal, progress) {
    const record = session.plan.find(item => item.key === 'rp_hub_characters');
    if (!record) return null;
    await discardPreparedCards(db, session);
    session.cardRevision = crypto.randomUUID().replaceAll('-', '');
    await saveSession(db, session);
    const cards = [], ids = new Set();
    for (let part = 0; part < record.count; part++) {
        cancelled(signal);
        const unit = await resultOf(db.transaction('restore_units').objectStore('restore_units')
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
        const tx = db.transaction('store', 'readwrite'), store = tx.objectStore('store');
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
    const db = await window.RPHubStorage.initDB();
    const session = await readSession(db, id);
    if (session?.state !== 'complete') throw new Error('暂存数据不可用，请重新选择文件');
    const deleted = new Set(session.deleted);
    const records = session.plan.filter(item => !item.key.startsWith('__ls__:')
        && item.key !== '__rp_local_mirror_revision'
        && !item.key.startsWith('rp_hub_b1_memory_state_') && !deleted.has(item.key));
    const cardCount = session.plan.find(item => item.key === 'rp_hub_characters')?.count || 0;
    const totalWork = cardCount + records.length + 1;
    const extras = await prepareExtras(db, session);
    cancelled(signal);
    await beforeApply();
    await window.RPLocalStore?.flush();
    window.RPHubStorage.setWritesPaused(true);
    window.RPLocalStore?.setWebWritesPaused(true);
    let journaled = false, committed = false, recoveryRequired = false;
    try {
        const oldCardKeys = cardCount || session.plan.some(item => item.key === 'rp_hub_characters')
            ? (await window.RPHubStorage.readStorageKeys(db))
            .filter(key => key.startsWith('__rp_card__:') || key.startsWith('__rp_card_image__:')) : [];
        const characters = await prepareCharacters(db, session, restoreValue, signal,
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
        await saveSession(db, journal);
        journaled = true;
        cancelled(signal);
        if (journal.hasMoments) await writeMoments(extras.moments.map(value => restoreValue(value)));
        cancelled(signal);
        await new Promise((resolve, reject) => {
            const tx = db.transaction(['store', 'restore_units', 'restore_sessions'], 'readwrite');
            const store = tx.objectStore('store');
            store.delete('__rp_local_mirror_revision');
            oldCardKeys.forEach(key => store.delete(key));
            let failure;
            const abort = () => { try { tx.abort(); } catch (_) {} };
            signal?.addEventListener('abort', abort, { once: true });
            tx.oncomplete = () => { signal?.removeEventListener('abort', abort); committed = true; resolve(); };
            tx.onabort = () => { signal?.removeEventListener('abort', abort); reject(failure || tx.error || new DOMException('导入已取消', 'AbortError')); };
            tx.onerror = () => {};
            const fail = error => { failure = error; abort(); };
            for (const key of deleted) {
                for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([
                    { key: key.replace('rp_hub_classic_memories_', 'rp_hub_b1_memory_state_'),
                        value: { schema: 1, revision: crypto.randomUUID().replaceAll('-', ''), deleted: true } }
                ])) store.put(entry.value, entry.key);
                store.delete(key);
            }
            const next = index => {
                try {
                    cancelled(signal);
                    if (index === records.length) {
                        writeWeb(extras.web);
                        tx.objectStore('restore_sessions').put({ id, state: 'applied', web: extras.web,
                            cardRevision: session.cardRevision });
                        return;
                    }
                    const record = records[index];
                    if (record.key === 'rp_hub_characters') {
                        store.put(characters, record.key);
                        progress?.(cardCount + index + 1, totalWork);
                        next(index + 1);
                        return;
                    }
                    let value = record.array ? [] : undefined;
                    const req = tx.objectStore('restore_units').openCursor(rangeOf(id, session.source, record.entry));
                    req.onsuccess = () => {
                        try {
                            const cursor = req.result;
                            if (cursor) {
                                const item = restoreValue(cursor.value.value);
                                if (record.array) value.push(item); else value = item;
                                cursor.continue();
                            } else {
                                for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([
                                    { key: record.key, value }
                                ])) window.RPHubStorage.putStoredRecord(store, entry.value, entry.key);
                                value = null;
                                progress?.(cardCount + index + 1, totalWork);
                                next(index + 1);
                            }
                        } catch (error) { fail(error); }
                    };
                } catch (error) { fail(error); }
            };
            next(0);
        });
        // [rphub 2.9.043] 收尾有两件事：① 把导入结果写成手机上的本地文件副本；② 删掉这次用的
        //   暂存库（300MB 级备份的暂存库可能几十兆）。两者互不相干，原先排队做，用户就盯着
        //   「正在保存本机存档」多等一份时间。这里并行发起，并把文案说清「只需一次」。
        //   这一步不能省：写入本机文件是让下次冷启动直接可用的前提，省掉它只是把同一份等待
        //   挪到重载之后，用户会以为「启动变慢了」。
        progress?.(totalWork - 1, totalWork, '正在写入本机存档（只需一次，之后启动更快）');
        await Promise.all([
            window.RPHubStorage.syncLocalFiles?.() ?? null,
            removeSession(db, id),
        ]);
        progress?.(totalWork, totalWork);
    } catch (error) {
        if (committed) {
            error.recoveryRequired = true;
            error.message = '本机存档保存未完成，请重新打开软件继续恢复：' + error.message;
        }
        if (!committed) {
            try {
                if (journaled) await recover(db);
                else await discardPreparedCards(db, session);
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
    }
}
window.RPStreamImport = { upgrade, database, recover, apply, stageEntries, readSession, removeSession, profile, profiles };
