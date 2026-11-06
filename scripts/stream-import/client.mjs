import { upgrade, database, resultOf, completed, rangeOf, saveSession, removeSession, each } from './storage.mjs';

const readSession = (db, id) => resultOf(db.transaction('restore_sessions').objectStore('restore_sessions').get(id));
const webText = value => String(value ?? '');
const cancelled = signal => {
    if (signal?.aborted) throw new DOMException('导入已取消', 'AbortError');
};
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
export async function apply(id, { beforeApply, restoreValue, signal, progress }) {
    const db = await window.RPHubStorage.initDB();
    const session = await readSession(db, id);
    if (session?.state !== 'complete') throw new Error('暂存数据不可用，请重新选择文件');
    const extras = await prepareExtras(db, session);
    cancelled(signal);
    await beforeApply();
    await window.RPLocalStore?.flush();
    window.RPHubStorage.setWritesPaused(true);
    window.RPLocalStore?.setWebWritesPaused(true);
    let journaled = false, committed = false, recoveryRequired = false;
    try {
        const journal = {
            id, state: 'applying', web: extras.web,
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
            let failure;
            const abort = () => { try { tx.abort(); } catch (_) {} };
            signal?.addEventListener('abort', abort, { once: true });
            tx.oncomplete = () => { signal?.removeEventListener('abort', abort); committed = true; resolve(); };
            tx.onabort = () => { signal?.removeEventListener('abort', abort); reject(failure || tx.error || new DOMException('导入已取消', 'AbortError')); };
            tx.onerror = () => {};
            const fail = error => { failure = error; abort(); };
            const deleted = new Set(session.deleted);
            const records = session.plan.filter(item => !item.key.startsWith('__ls__:')
                && item.key !== '__rp_local_mirror_revision'
                && !item.key.startsWith('rp_hub_b1_memory_state_') && !deleted.has(item.key));
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
                        tx.objectStore('restore_sessions').put({ id, state: 'applied', web: extras.web });
                        return;
                    }
                    const record = records[index];
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
                                ])) store.put(entry.value, entry.key);
                                value = null;
                                progress?.(index + 1, records.length);
                                next(index + 1);
                            }
                        } catch (error) { fail(error); }
                    };
                } catch (error) { fail(error); }
            };
            next(0);
        });
    } catch (error) {
        if (journaled && !committed) {
            try { await recover(db); }
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
window.RPStreamImport = { upgrade, database, recover, apply, readSession, removeSession };
