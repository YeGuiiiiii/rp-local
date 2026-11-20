import { upgrade, database, deleteStagingDatabase, resultOf, completed, rangeOf, saveSession, removeSession, each, StagingSink, validate } from './storage.mjs';
import { profile, profiles } from './profiles.mjs';
import { verifyChunks, decodeChat } from './cloud.mjs';

const readSession = (db, id) => resultOf(db.transaction('restore_sessions').objectStore('restore_sessions').get(id));
const commitKey = id => '__rp_restore_commit__:' + id;
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
                const maxBytes = entry.key === 'rp_hub_characters'
                    ? Math.min(128 * 1048576, Math.max(profiles.at(-1).unitBytes, limits.unitBytes))
                    : limits.unitBytes;
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
    } catch (error) {
        try { await removeSession(db, id); }
        catch (cleanupError) { console.warn('清理导入暂存失败:', cleanupError); }
        throw error;
    }
    finally { db.close(); }
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
async function recoverSession(main, session) {
    const key = commitKey(session.id);
    const committed = session.state === 'applied' || await resultOf(main.transaction('store').objectStore('store').get(key));
    if (session.state === 'applying' || session.state === 'applied') {
        if (committed && session.imageProviders)
            await window.RPImageProviders.persistConfig(session.imageProviders);
        const items = committed ? session.web : session.oldWeb;
        if (!committed && session.hasMoments) await writeMoments(session.oldMoments);
        writeWeb(items);
        for (const { key, value } of items) {
            if (value === null) await window.RPLocalStore?.remove('__ls__:' + key);
            else await window.RPLocalStore?.save('__ls__:' + key, value);
        }
    }
    if (!committed) await discardPreparedCards(main, session);
}

export async function recover(main) {
    // 会话与暂存数据在独立库里；恢复动作只碰正式库的 store。
    const stage = await database();
    window.RPLocalStore?.setWebWritesPaused(true);
    try {
        const sessions = await resultOf(stage.transaction('restore_sessions').objectStore('restore_sessions').getAll());
        for (const session of sessions) {
            await recoverSession(main, session);
            await removeSession(stage, session.id);
        }
        const keys = await window.RPHubStorage.readStorageKeys(main);
        const markers = keys.filter(key => key.startsWith('__rp_restore_commit__:'));
        if (markers.length) {
            const tx = main.transaction('store', 'readwrite');
            markers.forEach(key => tx.objectStore('store').delete(key));
            await completed(tx);
        }
    } finally {
        window.RPLocalStore?.setWebWritesPaused(false);
        stage.close();
    }
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
    let priority = Infinity, bytes = 0, moments;
    const maxMomentsBytes = Math.max(32 * 1048576, Number(session.unitBytes) || 0);
    await each(db, 'restore_companions', rangeOf(session.id), item => {
        const rank = item.database === 'sf_moments_db' && item.store === 'moments' ? 0
            : item.database === 'SakuraMomentsDB' && item.store === 'moments' ? 1
                : item.database === 'moments' && item.store === 'list' ? 2 : -1;
        if (rank < 0 || rank > priority) return;
        if (rank < priority) { priority = rank; bytes = 0; moments = []; }
        bytes += item.bytes;
        if (bytes > maxMomentsBytes) return;
        const record = item.value;
        const value = record && typeof record === 'object' && Object.hasOwn(record, 'v') ? record.v : record;
        if ((record?.k ?? record?.key) === 'list' && Array.isArray(value)) {
            for (const moment of value) moments.push(moment);
        } else moments.push(value);
    });
    if (bytes > maxMomentsBytes)
        throw new Error('名场面数据超过 ' + maxMomentsBytes / 1048576 + ' MB，请切换读取档位或拆分备份');
    return { web: [...web].map(([key, value]) => ({ key, value })), moments };
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
    const main = await window.RPHubStorage.initDB(), stage = await database();
    let retain = false;
    try {
        await applySession(main, stage, id, { beforeApply, restoreValue, signal, progress });
    } catch (error) {
        retain = !!error.recoveryRequired;
        throw error;
    } finally {
        try { if (!retain) await removeSession(stage, id); }
        catch (error) { retain = true; console.warn('清理导入暂存失败:', error); }
        finally { stage.close(); }
        if (!retain) {
            try {
                const tx = main.transaction('store', 'readwrite');
                tx.objectStore('store').delete(commitKey(id));
                await completed(tx);
            } catch (error) { console.warn('清理导入提交标记失败:', error); }
            await deleteStagingDatabase();
        }
    }
}

async function applySession(main, stage, id, { beforeApply, restoreValue, signal, progress }) {
    const session = await readSession(stage, id);
    if (session?.state !== 'complete') throw new Error('暂存数据不可用，请重新选择文件');
    const deleted = new Set(session.deleted);
    const records = session.plan.filter(item => !item.key.startsWith('__ls__:')
        && item.key !== '__rp_local_mirror_revision'
        && !item.key.startsWith('__rp_restore_commit__:')
        && !item.key.startsWith('rp_hub_b1_memory_state_') && !deleted.has(item.key));
    const cardCount = session.plan.find(item => item.key === 'rp_hub_characters')?.count || 0;
    const totalWork = cardCount + records.length + 1;
    const extras = await prepareExtras(stage, session);
    cancelled(signal);
    await beforeApply();
    await window.RPLocalStore?.flush();
    window.RPHubStorage.setWritesPaused(true);
    window.RPLocalStore?.setWebWritesPaused(true);
    let journal, committed = false, recoveryRequired = false;

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
        const settingsRecord = records.find(item => item.key === 'rp_hub_settings');
        const settings = settingsRecord && await readRecordValue(settingsRecord);
        const imageProviders = Object.hasOwn(settings ?? {}, 'imageProviderBackup')
            ? window.RPImageProviders.validateConfig(settings.imageProviderBackup) : undefined;
        if (settings && typeof settings === 'object') {
            delete settings.imageProviderBackup;
            if (imageProviders) settings.imageGenKey = imageProviders.profiles.find(item => item.id === 'builtin').key;
            // Older archives do not identify the provider that owned this key.
            else delete settings.imageGenKey;
        }
        const oldCardKeys = cardCount || session.plan.some(item => item.key === 'rp_hub_characters')
            ? (await window.RPHubStorage.readStorageKeys(main))
            .filter(key => key.startsWith('__rp_card__:') || key.startsWith('__rp_card_image__:')) : [];
        const characters = await prepareCharacters(main, stage, session, restoreValue, signal,
            done => progress?.(done, totalWork, '正在整理角色卡 ' + done + ' / ' + cardCount));
        const snapshot = {
            id, state: 'applying', web: extras.web, cardRevision: session.cardRevision, imageProviders,
            oldWeb: extras.web.map(({ key }) => ({ key, value: localStorage.getItem(key) })),
            hasMoments: extras.moments !== undefined,
        };
        if (snapshot.hasMoments) {
            const moments = await momentsDb();
            try { snapshot.oldMoments = await resultOf(moments.transaction('moments').objectStore('moments').get('list')); }
            finally { moments.close(); }
        }
        await saveSession(stage, snapshot);
        journal = snapshot;
        cancelled(signal);
        if (journal.hasMoments) await writeMoments(extras.moments.map(value => restoreValue(value)));
        cancelled(signal);

        await new Promise((resolve, reject) => {
            const tx = main.transaction('store', 'readwrite', { durability: 'strict' });
            const store = tx.objectStore('store');
            const marker = commitKey(id);
            let failure, index = 0;
            const fail = error => {
                failure ||= error;
                try { tx.abort(); } catch (_) {}
            };
            const abort = () => fail(new DOMException('导入已取消', 'AbortError'));
            const settle = error => {
                signal?.removeEventListener('abort', abort);
                if (error) reject(error); else resolve();
            };
            tx.oncomplete = () => settle();
            tx.onabort = () => settle(failure || tx.error || new Error('导入事务失败'));
            store.fail = fail;
            signal?.addEventListener('abort', abort, { once: true });

            const next = () => {
                cancelled(signal);
                if (index === records.length) {
                    writeWeb(extras.web);
                    store.put(true, marker);
                    return;
                }
                const record = records[index];
                let ready = false, value, error;
                const load = record.key === 'rp_hub_characters' ? Promise.resolve(characters)
                    : record === settingsRecord ? Promise.resolve(settings) : readRecordValue(record);
                load.then(result => { value = result; ready = true; }, failure => { error = failure; ready = true; });
                // Keep the transaction active while reading one record from the separate staging database.
                const pump = () => {
                    store.get(marker).onsuccess = () => {
                        try {
                            cancelled(signal);
                            if (!ready) { pump(); return; }
                            if (error) throw error;
                            for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([{ key: record.key, value }]))
                                window.RPHubStorage.putStoredRecord(store, entry.value, entry.key);
                            index++;
                            progress?.(cardCount + index, totalWork);
                            next();
                        } catch (error) { fail(error); }
                    };
                };
                pump();
            };
            try {
                store.delete('__rp_local_mirror_revision');
                oldCardKeys.forEach(key => store.delete(key));
                for (const key of deleted) {
                    for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([
                        { key: key.replace('rp_hub_classic_memories_', 'rp_hub_b1_memory_state_'),
                            value: { schema: 1, revision: crypto.randomUUID().replaceAll('-', ''), deleted: true } }
                    ])) store.put(entry.value, entry.key);
                    window.RPHubStorage.deleteStoredRecord(store, key);
                }
                next();
            } catch (error) { fail(error); }
        });
        committed = true;
        // [rphub 2.9.043] 收尾两件事：写本机文件副本、回收暂存库。文案说明「只需一次」。
        progress?.(totalWork - 1, totalWork, '正在写入本机存档（只需一次，之后启动更快）');
        await (window.RPHubStorage.syncLocalFiles?.() ?? null);
        await recoverSession(main, journal);
        progress?.(totalWork, totalWork);
    } catch (error) {
        if (committed) {
            recoveryRequired = true;
            error.recoveryRequired = true;
            error.message = '本机存档保存未完成，请重新打开软件继续恢复：' + error.message;
        }
        if (!committed) {
            try {
                if (journal) await recoverSession(main, journal);
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
    }
}
window.RPStreamImport = { upgrade, database, recover, apply, stageEntries, readSession, removeSession, profile, profiles, verifyChunks, decodeChat };
