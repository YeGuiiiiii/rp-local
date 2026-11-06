(function () {
    'use strict';
    const localPrefix = '__ls__:';
    const modernKey = key => key.startsWith('silly_tavern_') ? 'rp_hub_' + key.slice('silly_tavern_'.length) : key;
    const plainObject = value => value && typeof value === 'object' && !Array.isArray(value);
    const memoryStatePrefix = 'rp_hub_b1_memory_state_';
    const memoryBodyPrefix = 'rp_hub_classic_memories_';
    const hasBinary = (value, seen = new WeakSet()) => {
        if (!value || typeof value !== 'object') return false;
        if (value instanceof Blob || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return true;
        if (seen.has(value)) return false;
        seen.add(value);
        return Object.values(value).some(item => hasBinary(item, seen));
    };
    const encodeBinary = async (value, seen = new WeakSet()) => {
        if (value === null || typeof value !== 'object') return value;
        if (value instanceof Date) return value.toISOString();
        if (value instanceof Blob || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
            const bytes = value instanceof Blob ? new Uint8Array(await value.arrayBuffer())
                : value instanceof ArrayBuffer ? new Uint8Array(value)
                    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
            let text = '';
            for (let offset = 0; offset < bytes.length; offset += 32768) {
                text += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
            }
            return {
                __rphub_bin__: btoa(text),
                __rphub_type__: value instanceof Blob ? 'Blob' : 'ArrayBuffer',
                ...(value instanceof Blob ? { __rphub_mime__: value.type } : {})
            };
        }
        if (seen.has(value)) throw new Error('备份数据中存在循环引用，未生成不完整备份');
        seen.add(value);
        const out = Array.isArray(value) ? [] : {};
        for (const key of Object.keys(value)) {
            if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
            out[key] = await encodeBinary(value[key], seen);
        }
        seen.delete(value);
        return out;
    };
    const prepareMemoryEntries = entries => {
        const records = new Map(entries.map(entry => [entry.key, entry]));
        for (const entry of entries) {
            if (!entry.key.startsWith(memoryStatePrefix)) continue;
            const meta = entry.value;
            const scope = entry.key.slice(memoryStatePrefix.length);
            if (!scope || !plainObject(meta) || meta.schema !== 1
                || !/^[a-f0-9]{32}$/.test(meta.revision) || typeof meta.deleted !== 'boolean') {
                throw new Error('备份中的记忆版本记录损坏：' + scope);
            }
            const bodyKey = memoryBodyPrefix + scope;
            const body = records.get(bodyKey);
            if (meta.deleted) {
                // An empty main record also blocks lazy fallback to an old legacy database.
                records.set(bodyKey, { key: bodyKey, value: [] });
            } else if (!body || !Array.isArray(body.value)) {
                throw new Error('备份中的记忆版本记录缺少有效正文：' + scope);
            }
            // A restore is a new write intent. The 116 importer creates its own revision.
            records.delete(entry.key);
        }
        for (const entry of records.values()) {
            if (entry.key.startsWith(memoryBodyPrefix) && !Array.isArray(entry.value)) {
                throw new Error('备份中的记忆正文不是数组：' + entry.key.slice(memoryBodyPrefix.length));
            }
        }
        return [...records.values()];
    };
    const normalizePackage = data => {
        if (!plainObject(data)) throw new Error('备份文件不是有效的对象');
        let entries = [];
        const extraDatabases = plainObject(data.databases) ? data.databases : {};
        const webStorage = plainObject(data.webStorage) ? data.webStorage : {};
        let isPluginFormat = false;
        if (Array.isArray(data.entries) && (data.type === 'rp-hub-complete-backup' || data.__rphub_backup__)) {
            entries = data.entries;
        } else if (data.__rphub_backup__ || Object.keys(extraDatabases).length) {
            isPluginFormat = true;
            const database = extraDatabases.RPHubDB || extraDatabases.main || extraDatabases.SillyTavernDB;
            const store = plainObject(database) && Object.hasOwn(database, 'store') ? database.store : database;
            if (Array.isArray(store)) {
                entries = store.map(record => {
                    const key = record?.k ?? record?.key;
                    return { key: key === undefined ? undefined : String(key),
                        value: Object.hasOwn(record || {}, 'v') ? record.v : record?.value };
                });
            } else if (plainObject(store)) {
                entries = Object.entries(store).map(([key, value]) => ({ key, value }));
            } else throw new Error('备份中缺少主数据库 store');
            if (plainObject(webStorage.localStorage)) {
                entries = entries.concat(Object.entries(webStorage.localStorage).map(([key, value]) => ({
                    key: localPrefix + key, value: String(value ?? '')
                })));
            }
        } else throw new Error('不是支持的 RP-Hub 全量备份格式');
        const result = new Map();
        entries.forEach((entry, index) => {
            if (!plainObject(entry) || typeof entry.key !== 'string' || !entry.key || entry.value === undefined) {
                throw new Error('备份条目不完整：第 ' + (index + 1) + ' 项缺少 key 或 value');
            }
            const key = entry.key.startsWith(localPrefix) ? entry.key : modernKey(entry.key);
            result.set(key, { key, value: entry.value });
        });
        return { entries: prepareMemoryEntries([...result.values()]), extraDatabases, webStorage, isPluginFormat };
    };
    window.RPBackupFormat = Object.freeze({ normalizePackage, prepareMemoryEntries, hasBinary, encodeBinary });
})();
