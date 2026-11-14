// RP-Hub data services: storage, memory, context, branches and UI-template state.

// --- Storage ---
(function () {
    const DB_NAME = 'RPHubDB';
    const LEGACY_DB_NAME = String.fromCharCode(83, 105, 108, 108, 121, 84, 97, 118, 101, 114, 110, 68, 66);
    const STORAGE_PREFIX = 'rp_hub_';
    const LEGACY_STORAGE_PREFIX = String.fromCharCode(115, 105, 108, 108, 121, 95, 116, 97, 118, 101, 114, 110, 95);
    const DB_VERSION = 2;
    const LOCAL_MIRROR_KEY = '__rp_local_mirror_revision';
    const initialReads = new Map();
    let pendingMirrors = 0, mirrorFailed = false, latestMirrorRevision;
    let mainDb = null;
    let legacyDb = null;
    let initPromise = null;
    let reopenPromise = null;
    // A cloud restore pauses the page's own saves so its stale state cannot overwrite what comes in; the page
    // reloads afterwards. Writes passed `force` still go through.
    let writesPaused = false;

    const openAppDB = (name, version = DB_VERSION) => new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);
        let settled = false;
        const fail = error => { settled = true; clearTimeout(timer); reject(error); };
        const timer = setTimeout(() => fail(new Error('数据库打开超时，请关闭其他软件页面后重试')), 15000);
        request.onerror = () => fail(request.error);
        request.onblocked = () => fail(new Error('数据库升级被其他页面占用，请关闭其他页面后重试'));
        request.onsuccess = (event) => {
            clearTimeout(timer);
            const db = event.target.result;
            if (settled) { db.close(); return; }
            db.onversionchange = () => db.close();
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains('store')) database.createObjectStore('store');
            if (name === DB_NAME) window.RPStreamImport.upgrade(database);
        };
    });

    const initDB = async () => {
        if (reopenPromise) return reopenPromise;
        if (initPromise) return initPromise;
        if (mainDb) return mainDb;
        initPromise = (async () => {
            mainDb = await openAppDB(DB_NAME, DB_VERSION);
            await window.RPStreamImport.recover(mainDb);
            try {
                const dbList = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : null;
                const legacyInfo = dbList?.find(item => item?.name === LEGACY_DB_NAME);
                const shouldOpenLegacy = !dbList || !!legacyInfo;
                if (shouldOpenLegacy) {
                    const legacyVersion = Math.max(1, Number(legacyInfo?.version) || 1);
                    legacyDb = await openAppDB(LEGACY_DB_NAME, legacyVersion);
                }
            } catch (error) {
                console.warn('Legacy DB check failed:', error);
            }
            await syncLocalFiles();
            return mainDb;
        })();
        try {
            return await initPromise;
        } catch (error) {
            initialReads.clear();
            mainDb?.close();
            mainDb = null;
            throw error;
        } finally {
            initPromise = null;
        }
    };

    const syncLocalFiles = async () => {
        if (!window.RPLocalStore?.available) return;
        const revision = await dbGetFrom(mainDb, LOCAL_MIRROR_KEY);
        const value = await dbGetFrom(mainDb, 'rp_hub_characters');
        const synchronized = !!revision && revision === window.RPLocalStore.readRevision()
            && (Array.isArray(value) || isCharacterDirectory(value));
        const entries = synchronized ? [{ key: 'rp_hub_characters', value }]
            : (await readStorageKeys(mainDb)).filter(key => key !== LOCAL_MIRROR_KEY && !isPrivateChatKey(key))
                .map(key => key === 'rp_hub_characters' ? { key, value } : { key });
        if (!synchronized) await dbDeleteFrom(mainDb, LOCAL_MIRROR_KEY, { mirror: false, force: true });
        await window.RPLocalStore.initialize(entries, async (key, restored) => {
            await dbSetTo(mainDb, key, restored, { mirror: false, force: true });
            if (key === 'rp_hub_characters') initialReads.set(key, restored);
        }, { synchronized, readEntry: key => dbGetFrom(mainDb, key) });
        const characters = entries.find(entry => entry.key === 'rp_hub_characters');
        if (characters) initialReads.set(characters.key, characters.value);
        if (!synchronized) {
            const next = crypto.randomUUID();
            await dbSetTo(mainDb, LOCAL_MIRROR_KEY, next, { mirror: false, force: true });
            await window.RPLocalStore.saveRevision(next);
        }
    };

    const isDatabaseClosingError = (error) => {
        const message = String(error?.message || error || '');
        return /connection is closing|database is closing|close pending/i.test(message);
    };

    const reopenMainDB = async () => {
        if (reopenPromise) return reopenPromise;
        const previous = mainDb;
        mainDb = null;
        try { previous?.close(); } catch (_) { }
        reopenPromise = openAppDB(DB_NAME).then(database => {
            mainDb = database;
            return database;
        });
        try { return await reopenPromise; }
        finally { reopenPromise = null; }
    };
    const reopenAfterStorageError = async (originalError) => {
        try { return await reopenMainDB(); }
        catch (error) {
            try { if (error && error !== originalError && error.cause === undefined) error.cause = originalError; } catch (_) { }
            throw error;
        }
    };

    const unwrapForStorage = (value, seen = new WeakMap()) => {
        if (value === null || typeof value !== 'object') return value;
        const raw = Vue.toRaw(value);
        if (raw === null || typeof raw !== 'object') return raw;
        if (seen.has(raw)) return seen.get(raw);
        if (raw instanceof Date) return raw.toISOString();
        if (ArrayBuffer.isView(raw)) return Array.from(raw);
        if (raw instanceof ArrayBuffer) return Array.from(new Uint8Array(raw));

        if (Array.isArray(raw)) {
            const result = [];
            seen.set(raw, result);
            raw.forEach((item, index) => {
                const clonedItem = unwrapForStorage(item, seen);
                result[index] = clonedItem === undefined ? null : clonedItem;
            });
            return result;
        }

        const result = {};
        seen.set(raw, result);
        Object.keys(raw).forEach(key => {
            const item = raw[key];
            if (typeof item === 'function' || typeof item === 'undefined') return;
            result[key] = unwrapForStorage(item, seen);
        });
        return result;
    };

    // [rphub 2.9.051] unwrapForStorage 本身已经逐节点重建了整棵树（新数组、新对象、
    //   Date→ISO、TypedArray→普通数组、循环引用用 WeakMap 保留），随后再 structuredClone
    //   一次只是把同一份数据拷第二遍。聊天到 242MB 时，多这一份就够把渲染进程顶到 OOM，
    //   而它拿到的已经是纯 JSON 结构，再 clone 不带来任何额外保证。
    const cloneForStorage = (value) => unwrapForStorage(value);
    // 2.8.84: 普通对象/数组/标量的“可存储性”由下面的指纹计算兜住，不必在克隆前再整树遍历一遍。
    // 大对象（世界书等）每启动一次省掉一次全量 storageContentKey；非普通原型的值仍走原校验路径，
    // 保证 class 实例/函数等依旧按原样抛 StorageDataError，而不是被克隆悄悄降级成普通对象。
    const isPlainStorable = (value) => {
        if (value === null) return true;
        const type = typeof value;
        if (type === 'string' || type === 'number' || type === 'boolean') return true;
        if (type !== 'object') return false;
        if (Array.isArray(value)) return true;
        const proto = Object.getPrototypeOf(value);
        return proto === Object.prototype || proto === null;
    };

    const storageKey = (name) => `${STORAGE_PREFIX}${name}`;
    const legacyStorageKey = (name) => `${LEGACY_STORAGE_PREFIX}${name}`;
    const scopedStorageKey = (name, id) => `${storageKey(name)}_${id}`;
    const legacyScopedStorageKey = (name, id) => `${legacyStorageKey(name)}_${id}`;

    // B1: requests can succeed before a transaction aborts. Only complete means committed.
    let storageWriteEpoch = 0;
    const storageActiveWrites = new Map();
    const storageWriteError = (name, message) => Object.assign(new Error(message), { name });
    const assertStorageWriteAllowed = (options = {}, epoch = storageWriteEpoch) => {
        if (options.signal?.aborted) throw storageWriteError('AbortError', '写入已取消');
        if (writesPaused && !options.force) throw storageWriteError('StoragePausedError', '存储恢复期间暂停写入');
        if (epoch !== storageWriteEpoch) throw storageWriteError('StorageConflictError', '存储维护代次已变化，请重新载入后再试');
        if (options.guard && options.guard() !== true) throw storageWriteError('StorageConflictError', '写入来源已变化，未提交旧数据');
    };
    const CHAT_PART_PREFIX = '__rp_chat__:';
    const CHAT_PART_BYTES = 4 * 1048576;
    const chatVersions = new WeakMap();
    const isChatKey = key => String(key).startsWith('rp_hub_chat_');
    const isPrivateChatKey = key => String(key).startsWith(CHAT_PART_PREFIX);
    const isChatDirectory = value => value?.rphubChat === 1;
    const chatPartKey = (directory, index) => CHAT_PART_PREFIX + directory.revision + ':' + index;
    const removeChatParts = (store, key) => {
        const request = store.get(key);
        request.onsuccess = () => {
            const directory = request.result;
            if (isChatDirectory(directory)) {
                for (let i = 0; i < directory.parts; i++) store.delete(chatPartKey(directory, i));
            }
        };
    };

    // [rphub 2.9.052] 聊天写入从「每次整份重写」改成「块级增量」。
    //   原来任何一次改动（发一条、删一条）都会先删掉全部 61 个 4MB 块再逐块重写，
    //   242MB 的卡等于每次操作写 242MB 盘；实测 JS 侧序列化只占 0.4 秒，卡顿主体是这笔写盘。
    //   现在：目录里多记 sizes（每块条数）与 edge（每块首尾消息 id），写入前先定位
    //   「从第几块开始真的变了」，保留的块一个字节都不动，只重写变化的那些。
    //   目录仍保留 rphubChat: 1 —— 旧版本按 parts 循环 flat 读回，多出来的字段会被忽略，
    //   所以降级安装也不会读坏；新版本读到没有 sizes/edge 的旧目录时退化为整份重写。
    const chatSizeCache = new WeakMap();
    const chatMessageBytes = (message) => {
        if (!message || typeof message !== 'object') return 64;
        // content 的 length 一变就重算：流式生成时最后一条每帧都在长，缓存必须失效。
        const stamp = (typeof message.content === 'string' ? message.content.length : -1)
            + '|' + (Array.isArray(message.uiTemplateBlocks) ? message.uiTemplateBlocks.length : -1)
            + '|' + (message.avatar ? 1 : 0);
        const hit = chatSizeCache.get(message);
        if (hit && hit.stamp === stamp) return hit.bytes;
        const bytes = JSON.stringify(message).length * 2 + 64;
        chatSizeCache.set(message, { stamp, bytes });
        return bytes;
    };
    const chatIdOf = (message) => (message && typeof message === 'object'
        && typeof message.id === 'string' && message.id) || null;
    const chatEdgeOf = (messages) => (!Array.isArray(messages) || !messages.length)
        ? [null, null] : [chatIdOf(messages[0]), chatIdOf(messages[messages.length - 1])];
    const chunkChatMessages = (messages) => {
        const groups = [];
        let group = [], bytes = 0;
        for (const message of messages) {
            const size = chatMessageBytes(message);
            if (group.length && bytes + size > CHAT_PART_BYTES) {
                groups.push(group); group = []; bytes = 0;
            }
            group.push(message); bytes += size;
        }
        if (group.length) groups.push(group);
        return groups;
    };
    const chatDirectoryValid = (directory) => isChatDirectory(directory)
        && Number.isSafeInteger(directory.parts) && directory.parts >= 1
        && Number.isSafeInteger(directory.length) && directory.length >= 1
        && typeof directory.revision === 'string' && /^[a-f0-9]{32}$/.test(directory.revision);
    // 带 sizes/edge 的目录才谈得上「定位变化」；旧目录一律整份重写。
    const chatDirectoryIndexed = (directory) => chatDirectoryValid(directory)
        && Array.isArray(directory.sizes) && directory.sizes.length === directory.parts
        && Array.isArray(directory.edge) && directory.edge.length === directory.parts
        && directory.sizes.every(count => Number.isSafeInteger(count) && count >= 0)
        && directory.sizes.reduce((total, count) => total + count, 0) === directory.length;

    const writeChatFull = (store, key, value) => {
        removeChatParts(store, key);
        const groups = chunkChatMessages(value);
        if (groups.length <= 1) {
            chatVersions.delete(value);
            return store.put(value, key);
        }
        const directory = {
            rphubChat: 1,
            revision: crypto.randomUUID().replace(/-/g, ''),
            parts: groups.length,
            length: value.length,
            sizes: groups.map(group => group.length),
            edge: groups.map(chatEdgeOf)
        };
        groups.forEach((items, index) => store.put(items, chatPartKey(directory, index)));
        chatVersions.set(value, directory);
        return store.put(directory, key);
    };

    // 定位「第一块真的变了的」下标。返回 { first, keep }：0..first-1 块原样保留，
    // value.slice(keep) 之后的内容重新切块并从 first 开始写。返回 null 表示无法增量。
    const planChatWrite = (directory, value) => {
        if (!chatDirectoryIndexed(directory)) return null;
        // 等长就是编辑（条数不变、内容可能变），保守走整份重写 —— 编辑场景很少，不值得冒漏写的风险。
        if (value.length === directory.length) return null;
        const position = new Map();
        for (let index = 0; index < value.length; index++) {
            const id = chatIdOf(value[index]);
            if (id === null || position.has(id)) return null;
            position.set(id, index);
        }
        let offset = 0;
        for (let index = 0; index < directory.parts; index++) {
            const count = directory.sizes[index];
            if (count === 0) continue;
            const [firstId, lastId] = directory.edge[index];
            if (firstId === null || lastId === null) return null;
            // 双锚点：首条仍落在该块应在的起点、末条仍是同一条，且间距等于原块长度。
            // 只要块内少了一条，末条位置就会前移，这里立刻对不上。
            if (position.get(firstId) !== offset || position.get(lastId) !== offset + count - 1) {
                return { first: index, keep: offset };
            }
            offset += count;
        }
        // 全部块都没变、只是变长 => 纯追加：连最后一块一起重排，新消息能塞进末块就别开新块。
        if (offset === directory.length && value.length > directory.length) {
            const last = directory.parts - 1;
            return { first: last, keep: offset - directory.sizes[last] };
        }
        return null;
    };

    const writeChatIncremental = (store, key, value, directory, plan) => {
        const first = plan.first;
        const groups = chunkChatMessages(value.slice(plan.keep));
        const parts = first + groups.length;
        if (parts <= 1) {
            // 退化成一个块：按旧格式直接存数组，顺手清掉残留块。
            removeChatParts(store, key);
            chatVersions.delete(value);
            return store.put(value, key);
        }
        // 块数变少时把尾部多余的块删掉（revision 不变，key 也就没变）。
        for (let index = parts; index < directory.parts; index++) store.delete(chatPartKey(directory, index));
        const next = {
            rphubChat: 1,
            revision: directory.revision,
            parts,
            length: value.length,
            sizes: directory.sizes.slice(0, first).concat(groups.map(group => group.length)),
            edge: directory.edge.slice(0, first).concat(groups.map(chatEdgeOf))
        };
        groups.forEach((items, offset) => store.put(items, chatPartKey(next, first + offset)));
        chatVersions.set(value, next);
        return store.put(next, key);
    };

    // 聊天里的历史界面可能达数百 MB；目录与全部块在同一事务提交。
    const putStoredRecord = (store, value, key) => {
        if (!isChatKey(key) || !Array.isArray(value)) return store.put(value, key);
        // 先读旧目录再决定走哪条路。onsuccess 里抛错不会自己中止事务，
        // 统一转给 store.fail（由 runStorageWriteTransaction 注入的 abortWith）。
        const request = store.get(key);
        request.onsuccess = () => {
            try {
                const directory = request.result;
                const plan = planChatWrite(directory, value);
                if (plan) writeChatIncremental(store, key, value, directory, plan);
                else writeChatFull(store, key, value);
            } catch (error) {
                if (typeof store.fail === 'function') store.fail(error);
                else throw error;
            }
        };
        return request;
    };
    const deleteStoredRecord = (store, key) => {
        if (isChatKey(key)) removeChatParts(store, key);
        return store.delete(key);
    };
    const storageComparisonKey = (key, value) => storageContentKey(
        isChatKey(key) && Array.isArray(value) ? chatVersions.get(value) || value : value
    );

    const runStorageWriteTransaction = (targetDb, schedule, options = {}) => new Promise((resolve, reject) => {
        let transaction = null;
        let settled = false;
        let failure = null;
        let result;
        let onSignalAbort = null;
        const mirrors = new Map();
        let mirrorRevision;
        const settle = (ok, value) => {
            if (settled) return;
            settled = true;
            if (transaction) storageActiveWrites.delete(transaction);
            if (onSignalAbort) options.signal?.removeEventListener('abort', onSignalAbort);
            if (ok) resolve(value); else reject(value);
        };
        const abortWith = (error) => {
            if (!failure) failure = error || storageWriteError('AbortError', '存储事务已中止');
            if (!transaction) { settle(false, failure); return; }
            // abort() can fail after commit has begun. Wait for the actual terminal event.
            try { transaction.abort(); } catch (_) { }
        };
        try {
            assertStorageWriteAllowed(options, options.writeEpoch);
            transaction = targetDb.transaction(['store'], 'readwrite');
            transaction.oncomplete = () => {
                storageActiveWrites.delete(transaction);
                if (mirrorRevision) {
                    pendingMirrors++;
                    latestMirrorRevision = mirrorRevision;
                }
                Promise.all([...mirrors].map(([key, value]) => value === undefined
                    ? window.RPLocalStore.remove(key) : window.RPLocalStore.save(key, value)))
                    .then(() => {
                        if (mirrorRevision && --pendingMirrors === 0 && !mirrorFailed)
                            return window.RPLocalStore.saveRevision(latestMirrorRevision);
                    })
                    .then(() => settle(true, result),
                        error => {
                            mirrorFailed = true;
                            settle(false, Object.assign(error, { committed: true }));
                        });
            };
            transaction.onabort = () => settle(false, failure || transaction.error || storageWriteError('AbortError', '存储事务已中止'));
            transaction.onerror = (event) => abortWith(event.target?.error || transaction.error || storageWriteError('UnknownError', '存储事务失败'));
            storageActiveWrites.set(transaction, abortWith);
            if (options.signal) {
                onSignalAbort = () => abortWith(storageWriteError('AbortError', '写入已取消'));
                options.signal.addEventListener('abort', onSignalAbort, { once: true });
                if (options.signal.aborted) { onSignalAbort(); return; }
            }
            const store = transaction.objectStore('store');
            const mirror = targetDb === mainDb && options.mirror !== false && window.RPLocalStore?.available;
            const changed = key => {
                initialReads.delete(key);
                if (mirror && !mirrorRevision) {
                    mirrorRevision = crypto.randomUUID();
                    store.put(mirrorRevision, LOCAL_MIRROR_KEY);
                }
            };
            result = schedule({
                get: key => store.get(key),
                fail: error => abortWith(error),
                put: (value, key) => {
                    changed(key);
                    if (key === 'rp_hub_characters' && Array.isArray(value)) window.RPLocalStore?.assignFolders(value);
                    // [rphub 2.9.051] 聊天不再镜像成单个文件。
                    //   镜像走 saveEntry 的兜底分支：write(file, {key, value}) → JSON.stringify 整份
                    //   再按 64KB 一片过桥写盘。聊天到 242MB 时，等于每次保存（含删一条消息）
                    //   都要多拷一份、多 stringify 一遍、多写 242MB 文件 —— 卡死与「越聊越卡」的主因。
                    //   聊天的权威副本一直就在主库的分块里，镜像这层只是冗余。
                    if (mirror && !isChatKey(key) && !isPrivateChatKey(key)) mirrors.set(key, cloneForStorage(value));
                    return putStoredRecord(store, value, key);
                },
                delete: key => {
                    changed(key);
                    if (mirror) mirrors.set(key, undefined);
                    return deleteStoredRecord(store, key);
                }
            }, transaction, abortWith);
            if (result && typeof result.then === 'function') throw storageWriteError('InvalidStateError', '存储事务内不允许异步准备');
        } catch (error) { abortWith(error); }
    });
    const dbSetTo = (targetDb, key, value, options = {}) => {
        // Prepare the payload before opening the transaction; synchronous clone errors remain errors.
        let payload;
        try { payload = options.clone === false ? value : cloneForStorage(value); }
        catch (error) { return Promise.reject(error); }
        return runStorageWriteTransaction(targetDb, store => { store.put(payload, key); }, options);
    };

    const dbSet = async (key, value, options = {}) => {
        if (key === storageKey('characters')) return saveCharacterLibrary(value, options);
        const memoryScope = memoryScopeFromKey(key);
        if (memoryScope !== null) return setMemoryWithState(memoryScope, value, options);
        if (String(key).startsWith(storageKey(MEMORY_STATE_NAME) + '_')) throw storageWriteError('MemoryProtocolError', '版本键不能单独覆盖');
        const writeEpoch = options.writeEpoch ?? storageWriteEpoch;
        assertStorageWriteAllowed(options, writeEpoch);
        const payload = options.clone === false ? value : cloneForStorage(value);
        const writeOptions = { ...options, clone: false, writeEpoch };
        if (!mainDb) await initDB();
        assertStorageWriteAllowed(writeOptions, writeEpoch);
        try {
            return await dbSetTo(mainDb, key, payload, writeOptions);
        } catch (error) {
            if (!isDatabaseClosingError(error)) throw error;
            // Reopen for subsequent operations. A blind retry could overwrite a newer value.
            await reopenAfterStorageError(error);
            assertStorageWriteAllowed(writeOptions, writeEpoch);
            if (typeof options.guard !== 'function') throw error;
            return dbSetTo(mainDb, key, payload, writeOptions);
        }
    };

    const dbGetFrom = async (targetDb, key) => (await readStoredValueSetFrom(targetDb, [key]))[0].value;

    const dbGet = async (key) => {
        if (!mainDb || initPromise) await initDB();
        if (initialReads.has(key)) {
            const value = initialReads.get(key);
            initialReads.delete(key);
            return value;
        }
        try {
            return await dbGetFrom(mainDb, key);
        } catch (error) {
            if (!isDatabaseClosingError(error)) throw error;
            await reopenAfterStorageError(error);
            return dbGetFrom(mainDb, key);
        }
    };

    const dbGetWithLegacy = async (key, oldKey, options = {}) => {
        const memoryScope = memoryScopeFromKey(key);
        if (memoryScope !== null) {
            const state = await readMemoryState(memoryScope, options);
            return state.exists ? state.list : undefined;
        }
        const writeEpoch = storageWriteEpoch;
        const value = await dbGet(key);
        if (value !== undefined || !legacyDb) return value;
        const legacyValue = await dbGetFrom(legacyDb, oldKey);
        if (legacyValue === undefined || options.migrate === false) return legacyValue;
        const payload = cloneForStorage(legacyValue);
        let migratedValue = legacyValue;
        await runStorageWriteTransaction(mainDb, (store, transaction, abortWith) => {
            const request = store.get(key);
            request.onsuccess = () => {
                try {
                    assertStorageWriteAllowed({ writeEpoch }, writeEpoch);
                    if (request.result !== undefined) migratedValue = request.result;
                    else store.put(payload, key);
                } catch (error) { abortWith(error); }
            };
        }, { writeEpoch });
        return migratedValue;
    };

    const dbDeleteFrom = (targetDb, key, options = {}) => runStorageWriteTransaction(
        targetDb, store => { store.delete(key); }, options
    );

    const dbDeleteWithLegacy = async (key, oldKey, inputOptions = {}) => {
        const memoryScope = memoryScopeFromKey(key);
        if (memoryScope !== null) return deleteMemoryScope(memoryScope, inputOptions);
        if (String(key).startsWith(storageKey(MEMORY_STATE_NAME) + '_')) throw storageWriteError('MemoryProtocolError', '删除标记不得移除');
        const options = { ...inputOptions, writeEpoch: inputOptions.writeEpoch ?? storageWriteEpoch };
        assertStorageWriteAllowed(options, options.writeEpoch);
        if (!mainDb) await initDB();
        await dbDeleteFrom(mainDb, key, options);
        // Separate databases cannot be committed atomically; propagate a legacy-delete failure.
        if (legacyDb) await dbDeleteFrom(legacyDb, oldKey, options);
    };

    const readStorageKeys = (targetDb) => new Promise((resolve, reject) => {
        if (!targetDb) return resolve([]);
        const request = targetDb.transaction(['store'], 'readonly').objectStore('store').getAllKeys();
        request.onsuccess = () => resolve(request.result.map(key => String(key)));
        request.onerror = () => reject(request.error);
    });

    const getStorageLogicalKey = (key) => {
        const value = String(key || '');
        if (value.startsWith(STORAGE_PREFIX)) return value.slice(STORAGE_PREFIX.length);
        if (value.startsWith(LEGACY_STORAGE_PREFIX)) return value.slice(LEGACY_STORAGE_PREFIX.length);
        return value;
    };

    const CARD_RECORD_PREFIX = '__rp_card__:';
    const CARD_IMAGE_PREFIX = '__rp_card_image__:';
    const cardRecordKey = (prefix, card) => prefix + (card.rphubCardRevision ? card.rphubCardRevision + ':' : '') + card.uuid;
    const isPrivateCardKey = key => key.startsWith(CARD_RECORD_PREFIX) || key.startsWith(CARD_IMAGE_PREFIX);
    const hasLargeCardImage = card => typeof card.avatar === 'string' && card.avatar.startsWith('data:') && card.avatar.length >= 65536;
    const isCharacterDirectory = value => value?.rphubCardLibrary === 1 && Array.isArray(value.cards);
    const isCharacterStub = card => card?.rphubCardStub === 1;
    const characterPreviews = new WeakMap();
    const characterPreviewUpgrades = new Map();
    let characterWriteQueue = Promise.resolve();
    const characterMetadata = ['uuid', 'name', 'importedName', 'storageFolder', 'createdAt', 'favoriteAt'];
    const CHARACTER_PREVIEW_MAX_EDGE = 1280;
    const characterPreview = async card => {
        const source = String(card.avatar || '');
        const cached = characterPreviews.get(card);
        if (cached && cached.source === source && cached.edge === CHARACTER_PREVIEW_MAX_EDGE) return cached.preview;
        const preview = !source.startsWith('data:') || source.length < 65536 ? source : await new Promise(resolve => {
            const image = new Image();
            image.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const scale = Math.min(1, CHARACTER_PREVIEW_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
                    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                    const context = canvas.getContext('2d');
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/webp', 0.92));
                } catch (_) { resolve(''); }
            };
            image.onerror = () => resolve('');
            image.src = source;
        });
        characterPreviews.set(card, { source, preview, edge: CHARACTER_PREVIEW_MAX_EDGE });
        return preview;
    };
    const toCharacterStub = async source => {
        const card = Vue.toRaw(source);
        if (isCharacterStub(card)) return cloneForStorage(card);
        return {
            ...Object.fromEntries(characterMetadata.filter(key => card[key] !== undefined).map(key => [key, card[key]])),
            ...(characterPreviews.get(card)?.revision ? { rphubCardRevision: characterPreviews.get(card).revision } : {}),
            rphubCardStub: 1, avatar: await characterPreview(card), previewEdge: CHARACTER_PREVIEW_MAX_EDGE,
            description: card.description || '',
            worldInfoNames: (card.worldInfo || []).map(entry => entry.comment),
            regexNames: (card.regexScripts || []).map(script => script.name || script.scriptName)
        };
    };
    const readCharacter = async card => {
        if (!isCharacterStub(card)) return card;
        const value = await dbGet(cardRecordKey(CARD_RECORD_PREFIX, card));
        if (!value || value.uuid !== card.uuid || isCharacterStub(value))
            throw storageWriteError('StorageDataError', '角色卡内容缺失，已保留当前会话，请从备份恢复');
        const imageSaved = value.avatar?.rphubCardImage === 1;
        if (imageSaved) {
            const image = await dbGet(cardRecordKey(CARD_IMAGE_PREFIX, card));
            if (image?.uuid !== card.uuid || typeof image.avatar !== 'string')
                throw storageWriteError('StorageDataError', '角色卡封面缺失，请从备份恢复');
            value.avatar = image.avatar;
        }
        // Directory edits (for example favorites) never replace the full card body.
        characterMetadata.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(card, key)) value[key] = card[key];
            else delete value[key];
        });
        characterPreviews.set(value, { source: value.avatar || '', preview: card.avatar || '', imageSaved,
            edge: card.previewEdge || 256, revision: card.rphubCardRevision });
        return value;
    };
    const saveCharacterLibrary = (list, inputOptions = {}) => {
        if (!Array.isArray(list)) return Promise.reject(storageWriteError('StorageDataError', '角色卡集合必须是数组'));
        const options = { ...inputOptions, writeEpoch: inputOptions.writeEpoch ?? storageWriteEpoch };
        const sources = list.filter(Boolean).map(card => Vue.toRaw(card));
        const payload = sources.map(card => unwrapForStorage(card));
        const task = async () => {
            assertStorageWriteAllowed(options, options.writeEpoch);
            if (!mainDb) await initDB();
            const previous = await dbGet('rp_hub_characters');
            const baseline = JSON.stringify(previous);
            const previousCards = isCharacterDirectory(previous) ? previous.cards : [];
            const previousKeys = isCharacterDirectory(previous)
                ? previousCards.flatMap(card => [cardRecordKey(CARD_RECORD_PREFIX, card), cardRecordKey(CARD_IMAGE_PREFIX, card)])
                : (await readStorageKeys(mainDb)).filter(isPrivateCardKey);
            const ids = new Set();
            payload.forEach(card => {
                if (!card.uuid) card.uuid = crypto.randomUUID();
                if (ids.has(card.uuid)) throw storageWriteError('StorageDataError', '角色卡标识重复，未执行保存');
                ids.add(card.uuid);
            });
            window.RPLocalStore?.assignFolders(payload);
            const summaries = await Promise.all(payload.map(async (card, index) => {
                if (isCharacterStub(card) && !previousCards.some(old => old.uuid === card.uuid))
                    throw storageWriteError('StorageDataError', '角色卡目录已变化，请重新载入');
                const saved = previousCards.find(old => old.uuid === card.uuid);
                if (isCharacterStub(card) && saved?.previewEdge > (card.previewEdge || 0))
                    return { ...cloneForStorage(card), avatar: saved.avatar, previewEdge: saved.previewEdge };
                const preview = characterPreviews.get(sources[index]);
                if (preview) characterPreviews.set(card, preview);
                const summary = await toCharacterStub(card);
                if (saved?.rphubCardRevision) summary.rphubCardRevision = saved.rphubCardRevision;
                return summary;
            }));
            const retainedKeys = new Set(summaries.flatMap(card =>
                [cardRecordKey(CARD_RECORD_PREFIX, card), cardRecordKey(CARD_IMAGE_PREFIX, card)]));
            const directory = { rphubCardLibrary: 1, cards: summaries };
            const perform = () => runStorageWriteTransaction(mainDb, (store, transaction, abortWith) => {
                const request = store.get('rp_hub_characters');
                request.onsuccess = () => {
                    try {
                        assertStorageWriteAllowed(options, options.writeEpoch);
                        // A restore or another page must not be replaced by an older directory.
                        if (JSON.stringify(request.result) !== baseline)
                            throw storageWriteError('StorageConflictError', '角色卡目录已更新，请重新载入');
                        payload.forEach((card, index) => {
                            if (isCharacterStub(card)) return;
                            if (hasLargeCardImage(card)) {
                                const saved = characterPreviews.get(sources[index]);
                                if (!saved?.imageSaved || saved.source !== card.avatar) {
                                    store.put({ uuid: card.uuid, storageFolder: card.storageFolder, avatar: card.avatar },
                                        cardRecordKey(CARD_IMAGE_PREFIX, summaries[index]));
                                }
                                store.put({ ...card, avatar: { rphubCardImage: 1 } }, cardRecordKey(CARD_RECORD_PREFIX, summaries[index]));
                            } else {
                                store.put(card, cardRecordKey(CARD_RECORD_PREFIX, summaries[index]));
                                store.delete(cardRecordKey(CARD_IMAGE_PREFIX, summaries[index]));
                            }
                        });
                        previousKeys.forEach(key => {
                            if (!retainedKeys.has(key)) store.delete(key);
                        });
                        if (baseline !== JSON.stringify(directory))
                            store.put(directory, 'rp_hub_characters');
                    } catch (error) { abortWith(error); }
                };
            }, options);
            try { await perform(); }
            catch (error) {
                if (!isDatabaseClosingError(error)) throw error;
                await reopenAfterStorageError(error);
                await perform();
            }
            sources.forEach((source, index) => {
                if (!isCharacterStub(source)) characterPreviews.set(source, {
                    source: source.avatar || '', preview: summaries[index].avatar,
                    imageSaved: hasLargeCardImage(payload[index]), edge: summaries[index].previewEdge,
                    revision: summaries[index].rphubCardRevision
                });
            });
            return summaries;
        };
        const pending = characterWriteQueue.then(task, task);
        characterWriteQueue = pending.catch(() => {});
        return pending;
    };
    const readCharacterDirectory = async () => {
        const value = await dbGetWithLegacy(storageKey('characters'), legacyStorageKey('characters'));
        if (value === undefined) return [];
        if (isCharacterDirectory(value)) return value.cards;
        if (!Array.isArray(value)) throw storageWriteError('StorageDataError', '角色卡目录损坏，未执行覆盖');
        const paused = writesPaused;
        const session = await window.RPStreamImport.stageEntries([{ key: 'rp_hub_characters', value }],
            { limits: window.RPStreamImport.profile('fast') });
        let recoveryRequired = false;
        try {
            await window.RPStreamImport.apply(session, { beforeApply: async () => {}, restoreValue: item => item });
        } catch (error) {
            recoveryRequired = error.recoveryRequired;
            throw error;
        } finally {
            if (!recoveryRequired) {
                window.RPHubStorage.setWritesPaused(paused);
                window.RPLocalStore?.setWebWritesPaused(paused);
            }
        }
        return (await dbGet('rp_hub_characters')).cards;
    };
    const refreshCharacterPreview = uuid => {
        if (characterPreviewUpgrades.has(uuid)) return characterPreviewUpgrades.get(uuid);
        const refresh = async () => {
            const options = { writeEpoch: storageWriteEpoch };
            assertStorageWriteAllowed(options, options.writeEpoch);
            if (!mainDb) await initDB();
            const directory = await dbGet('rp_hub_characters');
            if (!isCharacterDirectory(directory)) return '';
            const index = directory.cards.findIndex(card => card.uuid === uuid);
            if (index < 0) return '';
            const stub = directory.cards[index];
            if (stub.previewEdge >= CHARACTER_PREVIEW_MAX_EDGE) return stub.avatar || '';
            let avatar = (await dbGet(cardRecordKey(CARD_IMAGE_PREFIX, stub)))?.avatar;
            if (typeof avatar !== 'string') {
                const record = await dbGet(cardRecordKey(CARD_RECORD_PREFIX, stub));
                if (!record || isCharacterStub(record)) return '';
                avatar = record.avatar?.rphubCardImage === 1 ? '' : record.avatar;
            }
            if (typeof avatar !== 'string' || !avatar.startsWith('data:')) return '';
            const preview = await characterPreview({ avatar });
            if (!preview) return '';
            const next = cloneForStorage(directory);
            next.cards[index].avatar = preview;
            next.cards[index].previewEdge = CHARACTER_PREVIEW_MAX_EDGE;
            const perform = () => runStorageWriteTransaction(mainDb, (store, transaction, abortWith) => {
                const request = store.get('rp_hub_characters');
                request.onsuccess = () => {
                    try {
                        assertStorageWriteAllowed(options, options.writeEpoch);
                        if (JSON.stringify(request.result) !== JSON.stringify(directory))
                            throw storageWriteError('StorageConflictError', '角色卡目录已更新，封面预览未覆盖新内容');
                        store.put(next, 'rp_hub_characters');
                    } catch (error) { abortWith(error); }
                };
            }, options);
            try { await perform(); }
            catch (error) {
                if (!isDatabaseClosingError(error)) throw error;
                await reopenAfterStorageError(error);
                await perform();
            }
            return preview;
        };
        const task = characterWriteQueue.then(refresh, refresh).finally(() => characterPreviewUpgrades.delete(uuid));
        characterWriteQueue = task.catch(() => {});
        characterPreviewUpgrades.set(uuid, task);
        return task;
    };
    const expandStorageEntry = async entry => {
        if (entry.key === storageKey('characters') && isCharacterDirectory(entry.value)) {
            return { key: entry.key, value: await Promise.all(entry.value.cards.map(readCharacter)) };
        }
        return entry;
    };
    // Each entry gets its own read transaction: awaiting a card read cannot expire a cursor.
    async function* iterateStoredEntries(targetDb, expand = true, includeKey = () => true) {
        for (const key of await readStorageKeys(targetDb)) {
            if (isPrivateCardKey(key) || isPrivateChatKey(key) || key === LOCAL_MIRROR_KEY || !includeKey(key)) continue;
            const entry = { key, value: await dbGetFrom(targetDb, key) };
            yield expand ? await expandStorageEntry(entry) : entry;
        }
    }
    const eachStoredEntry = async (targetDb, onEntry, shouldStop) => {
        for await (const entry of iterateStoredEntries(targetDb)) {
            if (shouldStop?.()) return;
            await onEntry(entry);
        }
    };

    // B1 storage CAS primitives. Callers must capture expected values when intent is created.
    // This layer neither invents a current revision for an old payload nor publishes UI state.
    const storageContentKey = (value) => {
        const ancestors = new Set();
        const encode = (item, depth) => {
            if (depth > 256) throw storageWriteError('StorageDataError', '存储结构过深，未执行写入');
            if (item === undefined) return ['undefined'];
            if (item === null) return ['null'];
            if (typeof item === 'string' || typeof item === 'boolean') return [typeof item, item];
            if (typeof item === 'number') {
                if (!Number.isFinite(item)) throw storageWriteError('StorageDataError', '存储包含非法数值');
                return ['number', Object.is(item, -0) ? '-0' : item];
            }
            if (typeof item !== 'object' || ancestors.has(item)) throw storageWriteError('StorageDataError', '存储包含循环或不支持的数据');
            const proto = Object.getPrototypeOf(item);
            if (!Array.isArray(item) && proto !== Object.prototype && proto !== null) throw storageWriteError('StorageDataError', '存储内容必须是普通对象或数组');
            ancestors.add(item);
            const body = Object.keys(item).sort().map(key => [key, encode(item[key], depth + 1)]);
            ancestors.delete(item);
            return Array.isArray(item) ? ['array', item.length, body] : ['object', body];
        };
        return JSON.stringify(encode(value, 0));
    };
    const readStoredValueSetFrom = (targetDb, keys) => {
        const names = [...keys];
        if (!names.length || names.some(key => typeof key !== 'string' || !key) || new Set(names).size !== names.length) {
            throw storageWriteError('StorageDataError', '读取键必须非空且不重复');
        }
        return new Promise((resolve, reject) => {
            let transaction = null, failure = null, finished = false;
            const records = new Array(names.length);
            const finish = (ok, value) => {
                if (finished) return;
                finished = true;
                if (ok) resolve(value); else reject(value);
            };
            try {
                transaction = targetDb.transaction(['store'], 'readonly');
                transaction.oncomplete = () => failure ? finish(false, failure) : finish(true, records);
                transaction.onabort = () => finish(false, failure || transaction.error || storageWriteError('AbortError', '读取事务已中止'));
                transaction.onerror = event => {
                    failure = event.target?.error || transaction.error || storageWriteError('UnknownError', '读取事务失败');
                    try { transaction.abort(); } catch (_) { finish(false, failure); }
                };
                const store = transaction.objectStore('store');
                names.forEach((key, index) => {
                    const request = store.get(key);
                    request.onsuccess = () => {
                        const directory = request.result;
                        if (!isChatKey(key) || !isChatDirectory(directory)) {
                            records[index] = { key, value: directory };
                            return;
                        }
                        if (!Number.isSafeInteger(directory.parts) || directory.parts < 1
                            || !Number.isSafeInteger(directory.length) || directory.length < 1
                            || !/^[a-f0-9]{32}$/.test(directory.revision)) {
                            failure = storageWriteError('StorageDataError', '聊天存档目录损坏，已停止读取');
                            transaction.abort();
                            return;
                        }
                        const parts = new Array(directory.parts);
                        let remaining = directory.parts;
                        for (let part = 0; part < directory.parts; part++) {
                            const chunk = store.get(chatPartKey(directory, part));
                            chunk.onsuccess = () => {
                                if (!Array.isArray(chunk.result)) {
                                    failure = storageWriteError('StorageDataError', '聊天存档分块不完整，已停止读取');
                                    transaction.abort();
                                    return;
                                }
                                parts[part] = chunk.result;
                                if (--remaining) return;
                                const value = parts.flat();
                                if (value.length !== directory.length) {
                                    failure = storageWriteError('StorageDataError', '聊天存档条数不完整，已停止读取');
                                    transaction.abort();
                                    return;
                                }
                                chatVersions.set(value, directory);
                                records[index] = { key, value };
                            };
                        }
                    };
                });
            } catch (error) {
                failure = error;
                if (transaction) { try { transaction.abort(); } catch (_) { finish(false, error); } }
                else finish(false, error);
            }
        });
    };
    // [rphub 2.9.051] 只读聊天目录。
    //   commitConversationState 需要的只有两样东西：现有条数、以及做 CAS 基线用的值。
    //   这两样都在目录对象里（{rphubChat:1, revision, parts, length}）。此前为了它们调用
    //   readStoredValueSet，把整份历史（实测 242MB / 3099 条）连同 parts.flat() 读回内存 ——
    //   删一条消息的峰值因此多出 242MB，是「卡死 → 重载 → 对话还在」的直接成因之一。
    const readChatBaseline = async (key) => {
        if (!mainDb) await initDB();
        const raw = await new Promise((resolve, reject) => {
            const request = mainDb.transaction(['store'], 'readonly').objectStore('store').get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || storageWriteError('UnknownError', '读取聊天目录失败'));
        });
        if (raw === undefined) return { value: undefined, length: 0, directory: null };
        if (isChatKey(key) && isChatDirectory(raw)) {
            if (!Number.isSafeInteger(raw.parts) || raw.parts < 1
                || !Number.isSafeInteger(raw.length) || raw.length < 1
                || !/^[a-f0-9]{32}$/.test(raw.revision)) {
                throw storageWriteError('StorageDataError', '聊天存档目录损坏，已停止读取');
            }
            return { value: raw, length: raw.length, directory: raw };
        }
        // 未分块的旧格式（条数少、整体不到一块）本身就是数组，直接给长度即可。
        return { value: raw, length: Array.isArray(raw) ? raw.length : 0, directory: null };
    };
    const readStoredValueSet = async (keys) => {
        if (!mainDb) await initDB();
        return readStoredValueSetFrom(mainDb, keys);
    };
    const compareAndWriteStoredValues = async (command = {}) => {
        const writeEpoch = command.writeEpoch ?? storageWriteEpoch;
        let committed = false;
        let expected, changes, options;
        try {
            options = {guard: command.guard, signal: command.signal, writeEpoch};
            assertStorageWriteAllowed(options, writeEpoch);
            if (!Array.isArray(command.expected) || !command.expected.length || !Array.isArray(command.changes)) {
                throw storageWriteError('StorageDataError', '提交必须携带意图起点的完整基线');
            }
            // Clone and fingerprint before the first await, never borrow a mutable UI reference.
            expected = command.expected.map(item => {
                if (!item || typeof item.key !== 'string' || !item.key) throw storageWriteError('StorageDataError', '提交基线键无效');
                return {key: item.key, fingerprint: storageComparisonKey(item.key, item.value)};
            });
            const names = new Set(expected.map(item => item.key));
            if (names.size !== expected.length) throw storageWriteError('StorageDataError', '提交基线键重复');
            changes = command.changes.map(item => {
                if (item && (memoryScopeFromKey(item.key) !== null || String(item.key).startsWith(storageKey(MEMORY_STATE_NAME) + '_'))
                    && command.memoryPermit !== memoryProtocolPermit) throw storageWriteError('MemoryProtocolError', '记忆比较写入必须经过版本协议');
                if (!item || !names.has(item.key) || !['set', 'delete'].includes(item.operation)) throw storageWriteError('StorageDataError', '每个变更键必须有对应基线');
                if (item.operation === 'delete') return {key: item.key, operation: 'delete', fingerprint: storageContentKey(undefined)};
                if (!isPlainStorable(item.value)) storageContentKey(item.value);
                // plain:true = 调用方保证传进来的是本模块刚 unwrap 出来的纯对象（聊天走这条），
                //   跳过这次深拷贝。IDB 的 put() 在调用瞬间自己会做结构化克隆，JS 侧这份是白拷。
                const value = item.plain === true ? item.value : cloneForStorage(item.value);
                if (item.key === 'rp_hub_characters' && Array.isArray(value)) window.RPLocalStore?.assignFolders(value);
                if (value === undefined) throw storageWriteError('StorageDataError', '删除键须显式使用delete');
                return {key: item.key, operation: 'set', value, fingerprint: isChatKey(item.key) ? null : storageContentKey(value)};
            });
            if (new Set(changes.map(item => item.key)).size !== changes.length) throw storageWriteError('StorageDataError', '变更键重复');
            if (!mainDb) await initDB();
            const perform = () => runStorageWriteTransaction(mainDb, (store, transaction, abortWith) => {
                let remaining = expected.length;
                const actual = new Array(expected.length);
                expected.forEach((item, index) => {
                    const request = store.get(item.key);
                    request.onsuccess = () => {
                        try {
                            actual[index] = request.result;
                            if (--remaining !== 0) return;
                            assertStorageWriteAllowed(options, writeEpoch);
                            if (expected.some((entry, i) => storageContentKey(actual[i]) !== entry.fingerprint)) {
                                throw storageWriteError('StorageConflictError', '基线已被其他操作修改，未覆盖新数据');
                            }
                            for (const change of changes) {
                                if (change.operation === 'delete') store.delete(change.key);
                                else store.put(change.value, change.key);
                            }
                        } catch (error) { abortWith(error); }
                    };
                });
            }, options);
            try { await perform(); }
            catch (error) {
                if (!isDatabaseClosingError(error)) throw error;
                await reopenAfterStorageError(error);
                assertStorageWriteAllowed(options, writeEpoch);
                // CAS repeats the persistent comparison inside the new transaction, not a blind put.
                await perform();
            }
            committed = true;
            if (!changes.length) return {status: 'unchanged', committed: false, writeEpoch};
            const actual = await readStoredValueSet(changes.map(item => item.key));
            if (actual.some((item, i) => storageComparisonKey(item.key, item.value) !==
                (changes[i].fingerprint ?? storageComparisonKey(item.key, changes[i].value)))) {
                throw storageWriteError('StorageVerificationError', '事务已提交，但回读内容已变化；请重新载入核对');
            }
            return {status: 'committed', committed: true, writeEpoch, records: actual};
        } catch (error) {
            committed ||= error?.committed === true;
            const status = committed ? 'committed_unverified'
                : error?.name === 'StoragePausedError' ? 'paused'
                : error?.name === 'StorageConflictError' ? 'conflict'
                : error?.name === 'AbortError' && command.signal?.aborted ? 'cancelled' : 'error';
            return {status, committed, writeEpoch, error};
        }
    };

    // B1: sidecar is outside classic_memories_*; deletion retains only an opaque revision tombstone.
    // Existing arrays/keys/DB version are unchanged. This metadata must not be reused by a restore.
    const MEMORY_STATE_NAME = 'b1_memory_state';
    const memoryProtocolPermit = Symbol('memory-commit');
    const memoryStates = new WeakMap();
    const memoryScopeFromKey = key => typeof key === 'string' && key.startsWith(storageKey('classic_memories') + '_')
        ? key.slice((storageKey('classic_memories') + '_').length) : null;
    const memoryStateKey = scopeId => scopedStorageKey(MEMORY_STATE_NAME, scopeId);
    const newMemoryRevision = () => {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    };
    const isProtectedMemoryKey = key => memoryScopeFromKey(key) !== null
        || String(key).startsWith(storageKey(MEMORY_STATE_NAME) + '_');
    const validateMemoryRecords = (data, metadata) => {
        if (data !== undefined && !Array.isArray(data)) throw storageWriteError('StorageDataError', '记忆数据不是数组，已阻止覆盖');
        if (metadata !== undefined && (!metadata || metadata.schema !== 1 || !/^[a-f0-9]{32}$/.test(metadata.revision)
            || typeof metadata.deleted !== 'boolean')) throw storageWriteError('StorageDataError', '记忆版本记录损坏，已阻止覆盖');
        if (metadata?.deleted && data !== undefined) throw storageWriteError('StorageDataError', '已删除记忆仍有正文，请先检查恢复数据');
        // A live revision with no body means the pair was broken outside this protocol (partial restore,
        // hand-edited record). Refusing it stops a legacy read from silently resurrecting stale content.
        if (metadata !== undefined && !metadata.deleted && data === undefined) {
            throw storageWriteError('StorageDataError', '记忆版本记录缺少正文，请先检查恢复数据');
        }
        storageContentKey(data);
    };
    const makeMemoryState = (scopeId, data, metadata, writeEpoch) => {
        validateMemoryRecords(data, metadata);
        const frozenData = data === undefined ? undefined : cloneForStorage(data);
        const frozenMeta = metadata === undefined ? undefined : cloneForStorage(metadata);
        const state = Object.freeze({ scopeId, revision: metadata?.revision || null, deleted: metadata?.deleted === true,
            exists: data !== undefined, list: cloneForStorage(data || []), writeEpoch });
        // The public list is a detached working copy; mutating it cannot change the captured baseline.
        memoryStates.set(state, { scopeId, data: frozenData, metadata: frozenMeta, writeEpoch });
        return state;
    };
    const readMemoryState = async (scopeId, options = {}) => {
        if (typeof scopeId !== 'string' || !scopeId) throw storageWriteError('MemoryScopeError', '记忆作用域不存在');
        const writeEpoch = storageWriteEpoch;
        const dataKey = scopedStorageKey('classic_memories', scopeId), metaKey = memoryStateKey(scopeId);
        const records = await readStoredValueSet([dataKey, metaKey]);
        if (writeEpoch !== storageWriteEpoch) throw storageWriteError('StorageConflictError', '读取期间存储已切换维护代次');
        let state = makeMemoryState(scopeId, records[0].value, records[1].value, writeEpoch);
        if (state.exists || state.deleted || !legacyDb || options.migrate === false) return state;
        const legacy = await dbGetFrom(legacyDb, legacyScopedStorageKey('classic_memories', scopeId));
        if (legacy === undefined) return state;
        validateMemoryRecords(legacy, undefined);
        const migrated = await commitMemoryState(state, legacy, { guard: options.guard });
        if (migrated.status === 'conflict') return readMemoryState(scopeId, { ...options, migrate: false });
        if (migrated.status !== 'committed') throw Object.assign(migrated.error || new Error('旧记忆迁移未完成'), { committed: migrated.committed });
        return migrated.state;
    };
    const commitMemoryState = async (state, nextList, options = {}) => {
        const captured = memoryStates.get(state);
        if (!captured) return { status: 'error', committed: false, error: storageWriteError('MemoryProtocolError', '缺少真实读取的记忆基线') };
        const { scopeId, data, metadata, writeEpoch } = captured;
        try {
            if (metadata?.deleted && !options.delete && options.recreate !== true) throw storageWriteError('MemoryDeletedError', '作用域已删除，不能由旧任务复活');
            if (!options.delete) validateMemoryRecords(nextList, undefined);
            const nextMeta = { schema: 1, revision: newMemoryRevision(), deleted: options.delete === true };
            const nextData = options.delete ? undefined : cloneForStorage(nextList);
            const dataKey = scopedStorageKey('classic_memories', scopeId), metaKey = memoryStateKey(scopeId);
            const extraExpected = options.expected || [], extraChanges = options.changes || [];
            // Extra keys ride in this transaction, so they must never touch any memory body or sidecar:
            // another scope would be written without its own captured revision, defeating the protocol.
            if (extraExpected.some(item => isProtectedMemoryKey(item?.key))
                || extraChanges.some(item => isProtectedMemoryKey(item?.key))
                || extraExpected.some(item => item?.key === dataKey || item?.key === metaKey)
                || extraChanges.some(item => item?.key === dataKey || item?.key === metaKey)) {
                throw storageWriteError('MemoryProtocolError', '附加事务键不得写入记忆正文或版本键');
            }
            const unchanged = !options.delete && extraChanges.length === 0 && storageContentKey(data) === storageContentKey(nextData);
            const result = await compareAndWriteStoredValues({
                expected: [{ key: dataKey, value: data }, { key: metaKey, value: metadata }, ...extraExpected],
                changes: unchanged ? [] : [options.delete ? { key: dataKey, operation: 'delete' } : { key: dataKey, operation: 'set', value: nextData },
                    { key: metaKey, operation: 'set', value: nextMeta }, ...extraChanges],
                guard: options.guard, signal: options.signal, writeEpoch, memoryPermit: memoryProtocolPermit
            });
            if (result.status === 'committed') result.state = makeMemoryState(scopeId, nextData, nextMeta, writeEpoch);
            if (result.status === 'unchanged') result.state = state;
            return result;
        } catch (error) { return { status: 'error', committed: false, error }; }
    };
    const requireMemoryCommit = result => {
        if (!['committed', 'unchanged'].includes(result.status)) throw Object.assign(result.error || new Error('记忆未提交'), { status: result.status, committed: result.committed === true });
        return result;
    };
    const setMemoryWithState = async (scopeId, value, options) => {
        if (!options.memoryState || options.memoryState.scopeId !== scopeId) throw storageWriteError('MemoryProtocolError', '记忆写入必须提供意图起点的版本基线');
        return requireMemoryCommit(await commitMemoryState(options.memoryState, value, options));
    };
    const deleteMemoryScope = async (scopeId, options = {}) => {
        const state = options.memoryState || await readMemoryState(scopeId, { migrate: false });
        if (state.scopeId !== scopeId) throw storageWriteError('MemoryProtocolError', '删除基线作用域不一致');
        // Keep a tombstone even if the main key was absent: legacy reads must never resurrect it.
        return requireMemoryCommit(await commitMemoryState(state, undefined, { ...options, delete: true }));
    };

    // Restores write raw records, so the pair must be normalized before it reaches the store.
    // Old backups carry a body with no sidecar (synthesize a revision); a tombstone must never
    // arrive with a body. Anything else is corrupt and aborts the restore instead of half-writing.
    const prepareRestoredMemoryEntries = (entries) => {
        if (!Array.isArray(entries)) throw storageWriteError('StorageDataError', '恢复数据条目无效');
        const bodies = new Map(), metas = new Map();
        for (const entry of entries) {
            if (!entry || typeof entry.key !== 'string') continue;
            const bodyScope = memoryScopeFromKey(entry.key);
            if (bodyScope !== null) { bodies.set(bodyScope, entry.value); continue; }
            const metaScope = entry.key.startsWith(storageKey(MEMORY_STATE_NAME) + '_')
                ? entry.key.slice((storageKey(MEMORY_STATE_NAME) + '_').length) : null;
            if (metaScope) metas.set(metaScope, entry.value);
        }
        const fixes = new Map();
        const validMeta = meta => !!meta && meta.schema === 1 && /^[a-f0-9]{32}$/.test(meta.revision)
            && typeof meta.deleted === 'boolean';
        for (const scopeId of new Set([...bodies.keys(), ...metas.keys()])) {
            const body = bodies.get(scopeId), meta = metas.get(scopeId);
            if (meta !== undefined) {
                if (!validMeta(meta)) throw storageWriteError('StorageDataError', `备份中的记忆版本记录损坏（${scopeId}）`);
                fixes.set(memoryStateKey(scopeId), { schema: 1, revision: newMemoryRevision(), deleted: meta.deleted });
                if (meta.deleted) {
                    // 墓碑优先：已删除的作用域即便备份里残留正文，也不能写回正文
                    if (body !== undefined) fixes.set(memoryScopeKeyOf(scopeId), undefined);
                    continue;
                }
                if (body === undefined) throw storageWriteError('StorageDataError', `备份中的记忆版本记录缺少正文（${scopeId}）`);
                if (!Array.isArray(body)) throw storageWriteError('StorageDataError', `备份中的记忆数据不是数组（${scopeId}）`);
                continue;
            }
            if (body === undefined) continue;
            if (!Array.isArray(body)) throw storageWriteError('StorageDataError', `备份中的记忆数据不是数组（${scopeId}）`);
            fixes.set(memoryStateKey(scopeId), { schema: 1, revision: newMemoryRevision(), deleted: false });
        }
        if (!fixes.size) return entries.map(entry => ({ key: entry.key, value: entry.value }));
        const out = entries.map(entry => ({ key: entry.key, value: entry.value }));
        for (const [key, value] of fixes) {
            const index = out.findIndex(entry => entry.key === key);
            if (value === undefined) { if (index >= 0) out.splice(index, 1); continue; }
            if (index >= 0) out[index] = { key, value };
            else out.push({ key, value });
        }
        return out;
    };
    const memoryScopeKeyOf = scopeId => scopedStorageKey('classic_memories', scopeId);
    // Explicit whole-scope replacement for import/restore flows; the fresh read is the baseline,
    // so a concurrent writer still wins through the CAS instead of being overwritten.
    const replaceMemoryScopeList = async (scopeId, list, options = {}) => {
        const state = options.memoryState || await readMemoryState(scopeId, { migrate: false });
        return requireMemoryCommit(await commitMemoryState(state, list, { ...options, recreate: true }));
    };

    // B1: grouped commit for keys that share no revision protocol. One readwrite transaction, and only
    // complete counts as success, so a quota failure cannot leave half of the settings block rewritten.
    // Memory keys are refused here on purpose: they must carry a baseline through commitMemoryState.
    const commitStoredValueBatch = async (command = {}) => {
        const writeEpoch = command.writeEpoch ?? storageWriteEpoch;
        let committed = false;
        let expected, changes, options;
        try {
            options = { guard: command.guard, signal: command.signal, writeEpoch };
            assertStorageWriteAllowed(options, writeEpoch);
            // Optional baseline: when present, the whole group is conditional on those keys being
            // unchanged, so two read-modify-write callers cannot silently drop each other's edit.
            expected = (Array.isArray(command.expected) ? command.expected : []).map(item => {
                if (!item || typeof item.key !== 'string' || !item.key) throw storageWriteError('StorageDataError', '分组提交基线键无效');
                if (isProtectedMemoryKey(item.key)) throw storageWriteError('MemoryProtocolError', '记忆键必须经过版本协议提交');
                return { key: item.key, fingerprint: storageComparisonKey(item.key, item.value) };
            });
            if (new Set(expected.map(item => item.key)).size !== expected.length) {
                throw storageWriteError('StorageDataError', '分组提交基线键重复');
            }
            if (!Array.isArray(command.writes)) throw storageWriteError('StorageDataError', '分组提交必须提供写入列表');
            changes = command.writes.map(item => {
                if (!item || typeof item.key !== 'string' || !item.key) throw storageWriteError('StorageDataError', '分组提交键无效');
                if (isProtectedMemoryKey(item.key)) throw storageWriteError('MemoryProtocolError', '记忆键必须经过版本协议提交');
                const operation = item.operation || 'set';
                if (!['set', 'delete'].includes(operation)) throw storageWriteError('StorageDataError', '分组提交操作无效');
                if (operation === 'delete') return { key: item.key, operation, fingerprint: storageContentKey(undefined) };
                if (!isPlainStorable(item.value)) storageContentKey(item.value);
                const value = cloneForStorage(item.value);
                if (item.key === 'rp_hub_characters' && Array.isArray(value)) window.RPLocalStore?.assignFolders(value);
                if (value === undefined) throw storageWriteError('StorageDataError', '删除键须显式使用delete');
                return { key: item.key, operation, value, fingerprint: isChatKey(item.key) ? null : storageContentKey(value) };
            });
            if (new Set(changes.map(item => item.key)).size !== changes.length) {
                throw storageWriteError('StorageDataError', '分组提交键重复');
            }
            if (!changes.length) return { status: 'unchanged', committed: false, writeEpoch, records: [] };
            if (!mainDb) await initDB();
            const perform = () => runStorageWriteTransaction(mainDb, (store, transaction, abortWith) => {
                const applyChanges = () => {
                    for (const change of changes) {
                        if (change.operation === 'delete') store.delete(change.key);
                        else store.put(change.value, change.key);
                    }
                };
                if (!expected.length) { applyChanges(); return; }
                let remaining = expected.length;
                const actual = new Array(expected.length);
                expected.forEach((item, index) => {
                    const request = store.get(item.key);
                    request.onsuccess = () => {
                        try {
                            actual[index] = request.result;
                            if (--remaining !== 0) return;
                            assertStorageWriteAllowed(options, writeEpoch);
                            if (expected.some((entry, i) => storageContentKey(actual[i]) !== entry.fingerprint)) {
                                throw storageWriteError('StorageConflictError', '基线已被其他操作修改，未覆盖新数据');
                            }
                            applyChanges();
                        } catch (error) { abortWith(error); }
                    };
                });
            }, options);
            try { await perform(); }
            catch (error) {
                if (!isDatabaseClosingError(error)) throw error;
                await reopenAfterStorageError(error);
                assertStorageWriteAllowed(options, writeEpoch);
                // Same rule as dbSet: no blind retry without an explicit source guard.
                if (typeof command.guard !== 'function') throw error;
                await perform();
            }
            committed = true;
            const actual = await readStoredValueSet(changes.map(item => item.key));
            if (actual.some((item, index) => storageComparisonKey(item.key, item.value) !==
                (changes[index].fingerprint ?? storageComparisonKey(item.key, changes[index].value)))) {
                throw storageWriteError('StorageVerificationError', '事务已提交，但回读内容已变化；请重新载入核对');
            }
            return { status: 'committed', committed: true, writeEpoch, records: actual };
        } catch (error) {
            committed ||= error?.committed === true;
            const status = committed ? 'committed_unverified'
                : error?.name === 'StoragePausedError' ? 'paused'
                : error?.name === 'StorageConflictError' ? 'conflict'
                : error?.name === 'AbortError' && command.signal?.aborted ? 'cancelled' : 'error';
            return { status, committed, writeEpoch, error };
        }
    };

    const setRawStoredValue = (key, value) => dbSet(String(key), value);

    window.RPHubStorage = Object.freeze({
        readMemoryState,
        commitMemoryState,
        deleteMemoryScope,
        prepareRestoredMemoryEntries,
        replaceMemoryScopeList,
        commitStoredValueBatch,
        storageKeyFor: storageKey,
        scopedStorageKeyFor: scopedStorageKey,
        storageContentKey,
        readStoredValueSet,
        readChatBaseline,
        compareAndWriteStoredValues,
        putStoredRecord,
        cloneForStorage,
        readCharacterDirectory,
        refreshCharacterPreview,
        readCharacter,
        toCharacterStub,
        characterPreviewUrl: card => characterPreviews.get(Vue.toRaw(card))?.preview ?? card?.avatar ?? '',
        saveCharacterLibrary,
        eachStoredEntry,
        iterateStoredEntries,
        deleteScopedStoredValue: (name, id, options = {}) => dbDeleteWithLegacy(scopedStorageKey(name, id), legacyScopedStorageKey(name, id), options),
        deleteStoredValue: (name, options = {}) => dbDeleteWithLegacy(storageKey(name), legacyStorageKey(name), options),
        getLegacyDb: () => legacyDb,
        getMainDb: () => mainDb,
        getScopedStoredValue: (name, id, options = {}) => dbGetWithLegacy(scopedStorageKey(name, id), legacyScopedStorageKey(name, id), options),
        getStoredValue: async (name, options = {}) => {
            const value = await dbGetWithLegacy(storageKey(name), legacyStorageKey(name), options);
            return (await expandStorageEntry({ key: storageKey(name), value })).value;
        },
        getStorageLogicalKey,
        initDB,
        syncLocalFiles,
        isDatabaseClosingError,
        readStorageKeys,
        setScopedStoredValue: (name, id, value, options = {}) => dbSet(scopedStorageKey(name, id), value, options),
        setWritesPaused: (paused) => {
            const next = !!paused;
            if (writesPaused !== next) {
                initialReads.clear();
                storageWriteEpoch++;
                writesPaused = next;
                const reason = storageWriteError(next ? 'StoragePausedError' : 'StorageConflictError', '存储维护状态变化，未提交事务已中止');
                for (const abort of storageActiveWrites.values()) abort(reason);
            }
        },
        getStorageWriteState: () => ({ paused: writesPaused, epoch: storageWriteEpoch }),
        setStoredValue: (name, value, options = {}) => dbSet(storageKey(name), value, options),
        unwrapForStorage
    });
})();

// --- Shared summary memory utilities ---
(function () {
    const isEmbeddingLike = value => Array.isArray(value) || ArrayBuffer.isView(value);
    const markRuntimeRaw = (value) => {
        if (!value || typeof value !== 'object') return value;
        return Vue.markRaw(value);
    };


    const bytesToBase64 = (source) => {
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < source.length; i += chunkSize) {
            binary += String.fromCharCode(...source.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    };

    const base64ToInt8Array = (base64) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Int8Array(bytes.buffer);
    };

    const quantizeEmbeddingForStorage = (embedding) => {
        if (!isEmbeddingLike(embedding) || embedding.length === 0) return null;
        let maxAbs = 0;
        for (let i = 0; i < embedding.length; i++) {
            const value = Math.abs(Number(embedding[i]) || 0);
            if (value > maxAbs) maxAbs = value;
        }
        if (maxAbs <= 0) return null;

        const quantized = new Int8Array(embedding.length);
        for (let i = 0; i < embedding.length; i++) {
            const scaled = Math.round(((Number(embedding[i]) || 0) / maxAbs) * 127);
            quantized[i] = Math.max(-127, Math.min(127, scaled));
        }

        return {
            embeddingQ: bytesToBase64(new Uint8Array(quantized.buffer)),
            embeddingScale: maxAbs / 127,
            embeddingDims: embedding.length,
            embeddingEncoding: 'int8:maxabs:v1'
        };
    };


    const normalizeClassicMemoryForRuntime = (memory, depth = 0, ancestors = new Set()) => {
        if (depth > 128 || !memory || typeof memory !== 'object' || ancestors.has(memory)
            || memory.classicMemory !== true || !String(memory.summary || '').trim()) {
            throw Object.assign(new Error('记忆来源树损坏或过深，未加载缩水副本'), { name: 'MemoryTreeError' });
        }
        ancestors.add(memory);
        const { storyTime: _storedStoryTime, ...memoryData } = memory;
        const fallbackTurn = Math.max(1, Number(memory.turn) || 1);
        const secondaryCompressed = memory.secondaryCompressed === true;
        const turnStart = secondaryCompressed
            ? Math.max(1, Number(memory.turnStart) || fallbackTurn)
            : fallbackTurn;
        const turnEnd = secondaryCompressed
            ? Math.max(turnStart, Number(memory.turnEnd) || fallbackTurn)
            : fallbackTurn;
        const normalized = {
            ...memoryData,
            turn: secondaryCompressed ? turnEnd : fallbackTurn,
            summary: String(memory.summary || '').trim(),
            sourceUserIds: Array.isArray(memory.sourceUserIds) ? memory.sourceUserIds.filter(Boolean) : [],
            sourceAssistantIds: Array.isArray(memory.sourceAssistantIds) ? memory.sourceAssistantIds.filter(Boolean) : []
        };
        if (secondaryCompressed) {
            normalized.secondaryCompressed = true;
            normalized.turnStart = turnStart;
            normalized.turnEnd = turnEnd;
        }
        if (memory.sourceMemories !== undefined && !Array.isArray(memory.sourceMemories)) {
            throw Object.assign(new Error('记忆来源必须是数组，未加载缩水副本'), { name: 'MemoryTreeError' });
        }
        if (Array.isArray(memory.sourceMemories)) {
            normalized.sourceMemories = memory.sourceMemories.map(item => normalizeClassicMemoryForRuntime(item, depth + 1, ancestors));
        } else if (secondaryCompressed) normalized.sourceMemories = [];
        ancestors.delete(memory);
        return markRuntimeRaw(normalized);
    };

    const prepareClassicMemoriesForRuntime = (items) => {
        if (items === undefined) return [];
        if (!Array.isArray(items)) throw Object.assign(new Error('记忆列表损坏，未用空表替代'), { name: 'MemoryTreeError' });
        return items.map(memory => normalizeClassicMemoryForRuntime(memory));
    };

    // 每条总结记忆有一个持久编号（显示为 M编号），上下文、召回和正文引用共用；旧数据按轮次顺序补号。
    const flattenClassicMemories = items => {
        const out = [], ancestors = new Set(), emitted = new Set();
        const visit = (list, depth) => {
            if (!Array.isArray(list) || depth > 128) throw Object.assign(new Error('记忆来源树损坏或过深'), { name: 'MemoryTreeError' });
            for (const memory of list) {
                if (!memory || typeof memory !== 'object' || ancestors.has(memory)) throw Object.assign(new Error('记忆来源树存在循环或无效节点'), { name: 'MemoryTreeError' });
                ancestors.add(memory);
                if (memory.sourceMemories !== undefined) visit(memory.sourceMemories, depth + 1);
                ancestors.delete(memory);
                if (!emitted.has(memory)) { emitted.add(memory); out.push(memory); }
            }
        };
        visit(items === undefined ? [] : items, 0);
        return out;
    };
    const getNextClassicMemoryNo = items => flattenClassicMemories(items)
        .reduce((max, memory) => Math.max(max, Number.isInteger(memory?.no) ? memory.no : 0), 0) + 1;
    const numberClassicMemories = items => {
        let next = getNextClassicMemoryNo(items);
        flattenClassicMemories(items)
            .filter(memory => memory && !Number.isInteger(memory.no))
            .sort((a, b) => (a.secondaryCompressed === true) - (b.secondaryCompressed === true)
                || (Number(a.turnStart || a.turn) || 0) - (Number(b.turnStart || b.turn) || 0)
                || (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0))
            .forEach(memory => { memory.no = next++; });
        return items;
    };


    const trimMemoryText = (text, maxLength) => {
        const cleanText = String(text || '').replace(/\n{3,}/g, '\n\n').trim();
        return cleanText.length <= maxLength ? cleanText : `${cleanText.slice(0, maxLength)}...`;
    };

    const getClassicMemoryKey = (sourceAssistantIds, turn = 0) => {
        const ids = Array.isArray(sourceAssistantIds) ? sourceAssistantIds.filter(Boolean) : [];
        return ids.length > 0 ? ids.join('|') : `turn:${Number(turn) || 0}`;
    };


    const normalizeEmbedding = embedding => {
        const values = isEmbeddingLike(embedding) ? Array.from(embedding) : [];
        return values.length && values.every(value => typeof value === 'number' && Number.isFinite(value))
            ? values : [];
    };

    const cosineSimilarity = (a, b) => {
        if (!isEmbeddingLike(a) || !isEmbeddingLike(b) || !a.length || a.length !== b.length) return -1;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return normA && normB ? dot / Math.sqrt(normA * normB) : -1;
    };

    // 二次压缩仍保留逐轮总结；增强模式只索引这些基础总结。
    // 2.8.30（RP-Hub）：官方原实现只做递归 flatMap、**不去重**。分段主线（「按轮数补录主线」）
    // 的 sourceMemories 是顶层逐轮总结的深拷贝，而分段条目自己又保留在 classicMemories 里
    // ⇒ 同一轮出现两份相同内容，会重复占用召回名额（SUMMARY_RECALL_LIMIT），也重复喂给总纲。
    // 这里在**原函数内部**去重（所有既有调用点自动受益，不必逐个去改官方代码）。
    // 保留**先出现**的那份：顶层原条目在数组中先于分段主线，也就是用户可能刚编辑过的最新文本。
    const getSummarySources = items => {
        const roots = Array.isArray(items) ? items : [];
        const keyOf = memory => memory.id ? 'id:' + String(memory.id)
            : 't:' + Number(memory.turn || memory.turnEnd || 0) + '#' + String(memory.summary || '').slice(0, 64);
        const top = new Map();
        roots.forEach(memory => {
            if (memory && !memory.secondaryCompressed && memory.classicMemory) top.set(keyOf(memory), memory);
        });
        const seen = new Set(), out = [];
        const walk = list => (Array.isArray(list) ? list : []).forEach(memory => {
            if (!memory || memory.enabled === false) return;
            if (memory.secondaryCompressed) { walk(memory.sourceMemories); return; }
            if (!memory.classicMemory || !memory.summary) return;
            const key = keyOf(memory);
            const preferred = top.get(key) || memory;
            if (seen.has(key) || preferred.enabled === false || !preferred.summary) return;
            seen.add(key);
            out.push(preferred);
        });
        walk(roots);
        return out;
    };

    const embeddingCache = new WeakMap();
    const getSummaryEmbedding = memory => {
        if (!memory?.embeddingQ) return [];
        const cached = embeddingCache.get(memory);
        if (cached?.encoded === memory.embeddingQ) return cached.value;
        try {
            const value = base64ToInt8Array(memory.embeddingQ);
            if (value.length !== memory.embeddingDims) return [];
            embeddingCache.set(memory, { encoded: memory.embeddingQ, value });
            return value;
        } catch (_) {
            return [];
        }
    };

    const buildSummaryEmbeddingText = memory =>
        `用户原输入：\n${memory.sourceUserText || ''}\n\n本轮总结：\n${memory.summary || ''}`;

    // 向量坐标必须能自证「算的是哪段文本」。旧条目没有这个字段时不能靠它反推历史输入，
    // 因此它只用于两种情况：写入时记录、以及「有指纹但不符」时判定坐标为脏。
    // 双通道 FNV + 长度参与，避免单路 32 位碰撞把两段不同文本判成同一坐标。
    const summaryEmbeddingFingerprint = memory => {
        const text = buildSummaryEmbeddingText(memory || {});
        let h1 = 0x811c9dc5, h2 = 0x01000193;
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
            h2 = Math.imul(h2 ^ code, 0x85ebca6b) >>> 0;
            h2 = (h2 ^ (h2 >>> 13)) >>> 0;
        }
        return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}:${text.length.toString(36)}`;
    };

    window.RPHubMemoryUtils = Object.freeze({
        buildSummaryEmbeddingText,
        cosineSimilarity,
        flattenClassicMemories,
        getClassicMemoryKey,
        getNextClassicMemoryNo,
        getSummaryEmbedding,
        getSummarySources,
        markRuntimeRaw,
        normalizeEmbedding,
        numberClassicMemories,
        prepareClassicMemoriesForRuntime,
        quantizeEmbeddingForStorage,
        summaryEmbeddingFingerprint,
        trimMemoryText
    });
})();

// --- Context utilities ---
(function () {
    const { prompts: BUILTIN_PROMPTS } = window.RPHubBuiltinContent;
    const escapeXmlAttribute = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const escapeXmlText = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const indentXmlText = (text, spaces) => {
        const prefix = ' '.repeat(spaces);
        return String(text || '')
            .split(/\r?\n/)
            .map(line => `${prefix}${line}`)
            .join('\n');
    };

    const isRoleMemoryContextContent = content => String(content || '').trimStart().startsWith('[角色记忆');

    const appendEnhancedMemoryRecall = (messages, memories) => {
        if (!memories.length) return messages;
        let index = messages.length - 1;
        while (index >= 0 && (messages[index].role !== 'user' || messages[index].tool_calls)) index--;
        if (index < 0) return messages;
        const block = [
            '<enhanced_memory_recall>',
            ...BUILTIN_PROMPTS.enhancedMemoryRecallDescription,
            ...memories.map(memory => [
                `  <memory_fragment id="M${escapeXmlAttribute(memory.no)}" turn="${escapeXmlAttribute(memory.turn)}" similarity="${(memory.score * 100).toFixed(1)}%">`,
                `    <user_input>${escapeXmlText(memory.sourceUserText)}</user_input>`,
                `    <summary>${escapeXmlText(memory.summary)}</summary>`,
                '  </memory_fragment>'
            ].join('\n')),
            '</enhanced_memory_recall>'
        ].join('\n');
        return messages.map((message, messageIndex) => messageIndex === index
            ? { ...message, content: `${message.content}\n\n${block}`, _enhancedMemoryRecallCount: memories.length }
            : message);
    };

    const getMessageSourceIndexes = (message, index) => {
        const source = message._sourceIndexes;
        if (!Array.isArray(source)) return [index];
        return [...source];
    };

    const toPlainContextMessage = (message, index, trackSources) => {
        const nextMessage = {
            role: message.role,
            name: message.name,
            content: String(message.content || '')
        };
        if (message.id) nextMessage.id = message.id;
        if (Number.isFinite(message._contextFloor)) nextMessage._contextFloor = message._contextFloor;
        if (message._preventContextMerge === true) nextMessage._preventContextMerge = true;
        if (message._classicMemory === true) nextMessage._classicMemory = true;
        if (trackSources) nextMessage._sourceIndexes = getMessageSourceIndexes(message, index);
        else if (Array.isArray(message._sourceIndexes)) nextMessage._sourceIndexes = getMessageSourceIndexes(message, index);
        if (Array.isArray(message._worldInfoEntries)) nextMessage._worldInfoEntries = message._worldInfoEntries;
        return nextMessage;
    };

    const mergeConsecutiveRoleMessages = (messages, options = {}) => {
        const {
            mergeRoles = ['user', 'assistant'],
            includeSystem = true,
            trackSources = false
        } = options;
        const mergeRoleSet = new Set(mergeRoles);
        const merged = [];
        (Array.isArray(messages) ? messages : []).forEach((message, index) => {
            if (!message || typeof message !== 'object') return;
            if (!includeSystem && message.role === 'system') return;

            const nextMessage = toPlainContextMessage(message, index, trackSources);
            const previous = merged[merged.length - 1];
            if (previous
                && previous.role === nextMessage.role
                && mergeRoleSet.has(nextMessage.role)
                && previous._preventContextMerge !== true
                && nextMessage._preventContextMerge !== true) {
                previous.content = [previous.content, nextMessage.content].filter(Boolean).join('\n\n');
                if (!previous.name && nextMessage.name) previous.name = nextMessage.name;
                if (Number.isFinite(nextMessage._contextFloor)) {
                    previous._contextFloor = Number.isFinite(previous._contextFloor)
                        ? Math.min(previous._contextFloor, nextMessage._contextFloor)
                        : nextMessage._contextFloor;
                }
                if (trackSources || previous._sourceIndexes || nextMessage._sourceIndexes) {
                    previous._sourceIndexes = [
                        ...(previous._sourceIndexes || []),
                        ...(nextMessage._sourceIndexes || [])
                    ];
                }
                if (previous._worldInfoEntries || nextMessage._worldInfoEntries) {
                    previous._worldInfoEntries = [
                        ...(previous._worldInfoEntries || []),
                        ...(nextMessage._worldInfoEntries || [])
                    ];
                }
                return;
            }
            merged.push(nextMessage);
        });
        return merged;
    };

    const postprocessContextMessages = (messages) => mergeConsecutiveRoleMessages(messages);

    const getPostprocessedChatMessages = (messages, options = {}) => {
        const { includeSystem = false } = options;
        return mergeConsecutiveRoleMessages(messages, {
            includeSystem,
            trackSources: true
        });
    };

    const buildConversationTurnSnapshot = (messages, options = {}) => {
        const { includeSystem = false, alreadyPostprocessed = false } = options;
        const processedMessages = alreadyPostprocessed
            ? (Array.isArray(messages) ? messages : [])
                .filter(message => message && typeof message === 'object' && (includeSystem || message.role !== 'system'))
                .map((message, index) => {
                    const nextMessage = toPlainContextMessage(message, index, false);
                    nextMessage._sourceIndexes = getMessageSourceIndexes(message, index);
                    return nextMessage;
                })
            : getPostprocessedChatMessages(messages, { includeSystem });

        const turns = [];
        let pendingUser = null;
        processedMessages.forEach((message, messageIndex) => {
            if (message.role === 'system') return;
            const sourceIndexes = message._sourceIndexes;
            const sourceStartIndex = sourceIndexes.length ? Math.min(...sourceIndexes) : messageIndex;
            const sourceEndIndex = sourceIndexes.length ? Math.max(...sourceIndexes) : messageIndex;

            if (message.role === 'user') {
                pendingUser = { message, messageIndex, sourceIndexes, sourceStartIndex, sourceEndIndex };
                return;
            }
            if (message.role !== 'assistant' || !pendingUser) return;

            const turn = turns.length + 1;
            turns.push({
                turn,
                user: pendingUser.message,
                assistant: message,
                messages: [pendingUser.message, message],
                messageIndexes: [pendingUser.messageIndex, messageIndex],
                sourceIndexes: [...pendingUser.sourceIndexes, ...sourceIndexes],
                startIndex: pendingUser.sourceStartIndex,
                endIndex: sourceEndIndex
            });
            pendingUser = null;
        });
        return { messages: processedMessages, turns };
    };

    const getConversationTurnAtIndexFromSnapshot = (snapshot, index) => {
        if (!Number.isFinite(index) || index < 0) return null;
        const matchedTurn = snapshot.turns.find(turn => turn.sourceIndexes.includes(index));
        if (matchedTurn) return matchedTurn.turn;
        return snapshot.turns.filter(turn => turn.endIndex < index).length + 1;
    };

    const toNonNegativeNumber = (value, fallback = 0) => {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0, number) : fallback;
    };

    const createWorldInfoRegex = (pattern) => {
        let source = String(pattern || '');
        let flags = 'i';
        if (source.startsWith('/') && source.lastIndexOf('/') > 0) {
            const lastSlash = source.lastIndexOf('/');
            const potentialFlags = source.slice(lastSlash + 1);
            if (/^[dgimsuvy]*$/.test(potentialFlags)) {
                source = source.slice(1, lastSlash);
                flags = potentialFlags;
            }
        }
        flags = flags.replace(/g/g, '');
        if (!flags.includes('i')) flags += 'i';
        if (/\\[pP]\{/.test(source) && !flags.includes('u')) flags += 'u';
        return new RegExp(source, flags);
    };

    // 同一段扫描文本要和几千条世界书的关键词逐个比对，小写结果只算一次。
    let lowerCaseCache = { text: '', lower: '' };
    const worldInfoKeyMatchesText = (entry, key, text) => {
        const rawKey = String(key || '').trim();
        const rawText = String(text || '');
        if (!rawKey || !rawText) return false;
        if (!entry?.useRegex) {
            if (lowerCaseCache.text !== rawText) lowerCaseCache = { text: rawText, lower: rawText.toLowerCase() };
            return lowerCaseCache.lower.includes(rawKey.toLowerCase());
        }
        try {
            return createWorldInfoRegex(rawKey).test(rawText);
        } catch (_) {
            console.warn(`Invalid world info regex: ${rawKey}`);
            return false;
        }
    };

    const resolveWorldInfoEntries = (entries, messages, settings) => {
        const activeEntries = (Array.isArray(entries) ? entries : []).filter(entry => entry?.enabled !== false);
        const chatMessages = Array.isArray(messages) ? messages : [];
        const probabilityResults = new Map();
        const triggerMap = new Map();
        const scanTexts = new Map();

        const passesProbability = (entry) => {
            const probability = Math.min(100, toNonNegativeNumber(entry?.probability, 100));
            if (entry?.useProbability === false || probability >= 100) return true;
            if (!probabilityResults.has(entry)) {
                probabilityResults.set(entry, probability > 0 && Math.random() * 100 < probability);
            }
            return probabilityResults.get(entry) === true;
        };

        activeEntries.forEach(entry => {
            if (entry.constant) {
                triggerMap.set(entry, { score: Infinity, matchedKeys: ['常驻 (Constant)'] });
                return;
            }

            const rawScanDepth = toNonNegativeNumber(entry.scanDepth ?? settings.scanDepth, 0);
            const maxScanDepth = toNonNegativeNumber(settings.maxDepth, 0);
            const scanDepth = maxScanDepth > 0 ? Math.min(rawScanDepth, maxScanDepth) : rawScanDepth;
            const keys = Array.isArray(entry.keys) ? entry.keys : [];
            if (scanDepth === 0 || keys.length === 0 || !passesProbability(entry)) return;

            if (!scanTexts.has(scanDepth)) scanTexts.set(scanDepth, chatMessages.slice(-scanDepth).map(message => message?.content || '').join('\n'));
            const scanText = scanTexts.get(scanDepth);
            const matchedKeys = keys
                .map(key => String(key || '').trim())
                .filter(key => key && worldInfoKeyMatchesText(entry, key, scanText));
            if (matchedKeys.length > 0) {
                triggerMap.set(entry, { score: matchedKeys.length, matchedKeys: [...new Set(matchedKeys)] });
            }
        });

        const resolvedEntries = [...triggerMap.keys()].sort((a, b) => {
            if (a.constant && !b.constant) return -1;
            if (!a.constant && b.constant) return 1;
            return (b.order || 0) - (a.order || 0);
        });
        const groups = {
            system_top: [],
            global_note: [],
            before_char: [],
            after_char: [],
            user_top: [],
            assistant_top: [],
            at_depth: []
        };
        resolvedEntries.forEach(entry => {
            const position = Object.prototype.hasOwnProperty.call(groups, entry.position) ? entry.position : 'at_depth';
            groups[position].push(entry);
        });
        Object.values(groups).forEach(group => group.sort((a, b) => (a.order || 0) - (b.order || 0)));

        return { entries: resolvedEntries, groups, triggerMap };
    };

    const buildContextViewerState = ({
        messages,
        budgetedEntries,
        triggeredEntries: triggerMap,
        postprocessedChatHistory: chatMessages,
        worldInfoSettings
    }) => {
        const escapeHtml = (value) => String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        const getDisplayName = (entry) => entry.comment || entry.name || '未命名条目';
        const floorInfo = new Map();
        const scanDepth = toNonNegativeNumber(worldInfoSettings.scanDepth, 2);
        const maxScanDepth = toNonNegativeNumber(worldInfoSettings.maxDepth, 0);

        triggerMap.forEach((data, entry) => {
            const rawEntryScanDepth = toNonNegativeNumber(entry.scanDepth ?? scanDepth, 0);
            const entryScanDepth = maxScanDepth > 0 ? Math.min(rawEntryScanDepth, maxScanDepth) : rawEntryScanDepth;
            const entryStart = Math.max(0, chatMessages.length - entryScanDepth);

            data.matchedKeys.forEach(key => {
                if (key === '常驻 (Constant)') return;
                for (let index = entryStart; index < chatMessages.length; index++) {
                    if (!worldInfoKeyMatchesText(entry, key, chatMessages[index].content)) continue;
                    if (!floorInfo.has(key)) floorInfo.set(key, new Set());
                    floorInfo.get(key).add(index + 1);
                }
            });
        });

        const getTriggerText = (entry) => {
            const entryData = triggerMap.get(entry);
            if (!entryData?.matchedKeys) return '关联触发';
            return entryData.matchedKeys.map(key => {
                if (key === '常驻 (Constant)') return '常驻';
                const floors = floorInfo.get(key);
                return floors?.size > 0
                    ? `${key} (${Array.from(floors).map(floor => `F${floor}`).join(', ')})`
                    : key;
            }).join(', ');
        };

        const worldInfoContents = budgetedEntries
            .map(entry => String(entry.content || '').trim())
            .filter(Boolean);
        const triggeredWorldInfos = budgetedEntries.map(entry => ({
            name: getDisplayName(entry),
            triggers: getTriggerText(entry)
        }));
        const contextMessages = messages.map(message => {
            const injectedWorldInfos = new Map();
            (Array.isArray(message._worldInfoEntries) ? message._worldInfoEntries : []).forEach(entry => {
                if (entry) injectedWorldInfos.set(getDisplayName(entry), getTriggerText(entry));
            });

            const recallCount = Number(message._enhancedMemoryRecallCount) || 0;
            // 附加召回片段不改变原消息的角色，仍保留记忆提示和高亮。
            const isMemory = message.role !== 'system' && isRoleMemoryContextContent(message.content);
            if (isMemory || recallCount > 0) {
                const memoryName = recallCount ? '增强记忆召回' : '角色记忆';
                const memoryTrigger = recallCount ? `已注入 ${recallCount} 条总结` : '已注入';
                injectedWorldInfos.set(memoryName, memoryTrigger);
                if (!triggeredWorldInfos.some(item => item.name === memoryName)) {
                    triggeredWorldInfos.push({ name: memoryName, triggers: memoryTrigger });
                }
            }

            const content = message.tool_calls
                ? JSON.stringify({ content: message.content, tool_calls: message.tool_calls }, null, 2)
                : String(message.content || '');
            let renderedContent = escapeHtml(content);
            Array.from(floorInfo.keys()).sort((a, b) => b.length - a.length).forEach(key => {
                const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                renderedContent = renderedContent.replace(
                    new RegExp(`(${escapedKey})(?![^<]*>)`, 'gi'),
                    '<mark class="bg-yellow-200/80 text-yellow-900 border-b border-yellow-400 font-bold px-0.5 mx-px rounded shadow-sm">$1</mark>'
                );
            });
            // 总结记忆的编号标签和召回片段标签一样高亮，方便对照正文里的引用。
            renderedContent = renderedContent.replace(
                /\[M\d{1,6}\]/g,
                '<mark class="bg-primary-200/80 text-primary-900 border-b border-primary-400 font-bold px-1 rounded shadow-sm">$&</mark>'
            );
            if (isMemory || recallCount > 0) {
                renderedContent = renderedContent.replace(
                    /&lt;\/?(?:enhanced_memory_recall|memory_fragment)\b[\s\S]*?&gt;/g,
                    '<mark class="bg-primary-200/80 text-primary-900 border-b border-primary-400 font-bold px-1 rounded shadow-sm">$&</mark>'
                );
            }

            return {
                role: message.role,
                name: message.name,
                content,
                renderedContent,
                // 用对话里的真实楼层号：记忆压缩会把部分楼层并掉，按顺序重新编号就和简介对不上。
                floor: Number.isFinite(message._contextFloor) ? message._contextFloor : null,
                // 这条消息里世界书正文占的字数，查看器把它从所在消息里拆出来单独统计。
                worldInfoChars: worldInfoContents.reduce((total, text) => total + (content.includes(text) ? text.length : 0), 0),
                // 被记忆替换的楼层（总结和合并标记）也按记忆显示和统计，原文只算没被替换的部分。
                isMemory: isMemory || message._classicMemory === true,
                wiTriggers: Array.from(injectedWorldInfos.entries()).map(([name, triggers]) => ({ name, triggers }))
            };
        });

        return { contextMessages, triggeredWorldInfos };
    };

    const injectContextMessages = ({
        messages,
        worldInfoGroups: groups,
        safeTargetLimit
    }) => {
        const finalMessages = [...messages];
        const joinEntries = (entries) => entries
            .map(entry => `[${entry.comment || 'Entry'}]\n${entry.content}`)
            .join('\n\n');
        const findDepthIndex = (depth) => {
            const reversedMessages = [...finalMessages].reverse();
            let countdown = depth;
            let targetIndex = -1;
            for (let index = 0; index < reversedMessages.length; index++) {
                if (reversedMessages[index].role === 'user' || reversedMessages[index].role === 'assistant') countdown--;
                if (countdown < 0) {
                    targetIndex = reversedMessages.length - 1 - index;
                    break;
                }
            }
            return Math.max(targetIndex, safeTargetLimit);
        };

        const depthEntries = groups.at_depth;
        depthEntries.sort((a, b) => (a.order || 0) - (b.order || 0));
        depthEntries.forEach(entry => {
            finalMessages.splice(findDepthIndex(entry.depth !== undefined ? entry.depth : 4), 0, {
                role: 'user',
                content: `[${entry.comment || 'Entry'}]\n${entry.content}`,
                _worldInfoEntries: [entry]
            });
        });

        const userTopEntries = groups.user_top;
        if (userTopEntries.length > 0) {
            const lastUserMessage = finalMessages.slice().reverse().find(message => message.role === 'user');
            if (lastUserMessage) {
                lastUserMessage.content = `${joinEntries(userTopEntries)}\n\n${lastUserMessage.content}`;
                lastUserMessage._worldInfoEntries = [
                    ...(lastUserMessage._worldInfoEntries || []),
                    ...userTopEntries
                ];
            }
        }

        const assistantTopEntries = groups.assistant_top;
        if (assistantTopEntries.length > 0) {
            const lastAssistantMessage = finalMessages.slice().reverse().find(message => message?.role === 'assistant');
            if (lastAssistantMessage) {
                lastAssistantMessage.content = `${joinEntries(assistantTopEntries)}\n\n${lastAssistantMessage.content}`;
                lastAssistantMessage._worldInfoEntries = [
                    ...(lastAssistantMessage._worldInfoEntries || []),
                    ...assistantTopEntries
                ];
            }
        }
        return finalMessages;
    };

    // [rphub 2.9.053] 只要轮次编号时的轻量索引：不建消息副本、不拼接正文。
    //   轮次只取决于「角色序列」，与正文无关；原来为了拿一个 turn 号，要把整份聊天逐条
    //   toPlainContextMessage，合并同角色消息时还要 join 正文，3099 条约 100ms。而这个
    //   函数会被「视野附近每条消息各调一次」，于是每次滚动都要重建几遍整份快照。
    const buildTurnIndex = (messages) => {
        const list = Array.isArray(messages) ? messages : [];
        const byIndex = new Int32Array(list.length);
        const turns = [];
        // 第一趟：按「同角色且未禁用合并」切成逻辑消息组。
        const groups = [];
        let current = null;
        for (let index = 0; index < list.length; index++) {
            const message = list[index];
            if (!message || typeof message !== 'object') continue;
            const role = message.role;
            if (role !== 'user' && role !== 'assistant') { current = null; continue; }
            const preventMerge = message._preventContextMerge === true;
            if (current && current.role === role && current.preventMerge !== true && preventMerge !== true) {
                current.indexes.push(index);
                current.endIndex = index;
                continue;
            }
            current = { role, startIndex: index, endIndex: index, indexes: [index], preventMerge };
            groups.push(current);
        }
        // 第二趟：user 组后面紧跟 assistant 组才算一轮。必须等整组结束再配对，
        //   否则「连续三条 assistant」只把第一条算进轮次，与旧实现不一致。
        let pending = null;
        for (const group of groups) {
            if (group.role === 'user') { pending = group; continue; }
            if (!pending) continue;
            turns.push({
                turn: turns.length + 1,
                startIndex: pending.startIndex,
                endIndex: group.endIndex,
                indexes: pending.indexes.concat(group.indexes)
            });
            pending = null;
        }
        for (const info of turns) for (const index of info.indexes) byIndex[index] = info.turn;
        // 不在任何轮次里的（system、孤立 user、开头 assistant）与
        // getConversationTurnAtIndexFromSnapshot 的兜底一致：已结束轮次数 + 1。
        let cursor = 0;
        for (let index = 0; index < list.length; index++) {
            if (byIndex[index]) continue;
            while (cursor < turns.length && turns[cursor].endIndex < index) cursor += 1;
            byIndex[index] = cursor + 1;
        }
        return { byIndex, turns };
    };

    window.RPHubContextUtils = {
        appendEnhancedMemoryRecall,
        buildContextViewerState,
        buildConversationTurnSnapshot,
        buildTurnIndex,
        escapeXmlAttribute,
        getConversationTurnAtIndexFromSnapshot,
        getPostprocessedChatMessages,
        indentXmlText,
        injectContextMessages,
        isRoleMemoryContextContent,
        postprocessContextMessages,
        resolveWorldInfoEntries
    };
})();

// --- Story branches ---
(function () {
    const STORY_BRANCH_MAIN_ID = 'main';
    const STORY_BRANCH_SCOPE_SEPARATOR = '__branch__';
    const STORY_BRANCH_CHAT_EXPORT_TYPE = 'rp-hub-branch-chat';
    const STORY_BRANCH_CHAT_EXPORT_VERSION = 1;

    const getStoryBranchScopeId = (characterId, branchId = STORY_BRANCH_MAIN_ID) => {
        if (!characterId || !branchId || branchId === STORY_BRANCH_MAIN_ID) return characterId || null;
        return `${characterId}${STORY_BRANCH_SCOPE_SEPARATOR}${branchId}`;
    };

    const getStoryBranchOwnerId = (scopeId) => String(scopeId || '').split(STORY_BRANCH_SCOPE_SEPARATOR)[0];

    const getConversationBodyLength = (history = []) => history.reduce((total, message) => {
        if (!['user', 'assistant'].includes(message?.role)) return total;
        return total + window.RPHubUtils.parseCot(message.content || '').main.length;
    }, 0);

    const formatStoryBranchWordCount = (count) => {
        const units = Math.max(0, Number(count) || 0) / 10000;
        const decimals = units < 1 ? 2 : units < 100 ? 1 : 0;
        const formatted = units.toFixed(decimals);
        return `${decimals > 0 ? formatted.replace(/\.?0+$/, '') : formatted}W`;
    };

    const createMainStoryBranch = (character) => ({
        id: STORY_BRANCH_MAIN_ID,
        name: '主线',
        parentId: null,
        createdAt: Number(character?.createdAt) || Date.now(),
        updatedAt: Date.now(),
        forkFloor: 0,
        floorCount: 0,
        messageCount: 0,
        wordCount: 0
    });

    const normalizeStoryBranches = (character, saved) => {
        const source = Array.isArray(saved?.branches) ? saved.branches : [];
        const seen = new Set();
        const branches = source.map((branch, index) => {
            const id = String(branch?.id || '').trim();
            if (!id || seen.has(id)) return null;
            seen.add(id);
            const fallbackName = `分支 ${index + 1}`;
            const name = id === STORY_BRANCH_MAIN_ID
                ? '主线'
                : String(branch?.name || fallbackName).trim().replace(/^路线(?=\s*\d+$)/, '分支');
            return {
                id,
                name: name.slice(0, 30),
                parentId: id === STORY_BRANCH_MAIN_ID ? null : String(branch?.parentId || STORY_BRANCH_MAIN_ID),
                createdAt: Number(branch?.createdAt) || Date.now(),
                updatedAt: Number(branch?.updatedAt) || Number(branch?.createdAt) || Date.now(),
                forkFloor: Math.max(0, Number(branch?.forkFloor) || 0),
                floorCount: Math.max(0, Number(branch?.floorCount) || 0),
                messageCount: Math.max(0, Number(branch?.messageCount) || 0),
                wordCount: Math.max(0, Number(branch?.wordCount) || 0)
            };
        }).filter(Boolean);

        if (!seen.has(STORY_BRANCH_MAIN_ID)) branches.unshift(createMainStoryBranch(character));
        const validIds = new Set(branches.map(branch => branch.id));
        branches.forEach(branch => {
            if (branch.id !== STORY_BRANCH_MAIN_ID && !validIds.has(branch.parentId)) {
                branch.parentId = STORY_BRANCH_MAIN_ID;
            }
        });
        return branches;
    };

    const createStoryRouteMap = ({ branches, activeBranchId, selectedBranchId, activeWordCount, activeFloorCount }) => {
        const NODE_WIDTH = 124;
        const NODE_HEIGHT = 64;
        const HORIZONTAL_GAP = 28;
        const LEVEL_GAP = 70;
        const PADDING_X = 28;
        const PADDING_Y = 30;
        const branchesById = new Map(branches.map(branch => [branch.id, branch]));
        const childrenByParent = new Map();
        branches.forEach(branch => {
            const parentId = branch.parentId || null;
            if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
            childrenByParent.get(parentId).push(branch);
        });
        childrenByParent.forEach(children => children.sort((a, b) => a.createdAt - b.createdAt));

        const positions = new Map();
        const visiting = new Set();
        let leafIndex = 0;
        let maxDepth = 0;
        const placeBranch = (branch, depth) => {
            if (positions.has(branch.id)) return positions.get(branch.id).centerX;
            if (visiting.has(branch.id)) return PADDING_X + NODE_WIDTH / 2;
            visiting.add(branch.id);
            maxDepth = Math.max(maxDepth, depth);
            const childCenters = (childrenByParent.get(branch.id) || [])
                .filter(child => child.id !== branch.id)
                .map(child => placeBranch(child, depth + 1));
            const centerX = childCenters.length
                ? childCenters.reduce((total, value) => total + value, 0) / childCenters.length
                : PADDING_X + NODE_WIDTH / 2 + leafIndex++ * (NODE_WIDTH + HORIZONTAL_GAP);
            const y = PADDING_Y + depth * (NODE_HEIGHT + LEVEL_GAP);
            positions.set(branch.id, { x: centerX - NODE_WIDTH / 2, y, centerX, centerY: y + NODE_HEIGHT / 2 });
            visiting.delete(branch.id);
            return centerX;
        };

        const roots = branches
            .filter(branch => !branch.parentId || !branchesById.has(branch.parentId))
            .sort((a, b) => (a.id === STORY_BRANCH_MAIN_ID ? -1 : b.id === STORY_BRANCH_MAIN_ID ? 1 : a.createdAt - b.createdAt));
        roots.forEach(branch => placeBranch(branch, 0));
        branches.forEach(branch => {
            if (!positions.has(branch.id)) placeBranch(branch, 0);
        });

        const collectRouteIds = (startId) => {
            const ids = new Set();
            let branch = branchesById.get(startId);
            while (branch && !ids.has(branch.id)) {
                ids.add(branch.id);
                branch = branchesById.get(branch.parentId);
            }
            return ids;
        };
        const activeRouteIds = collectRouteIds(activeBranchId);
        const selectedRouteIds = collectRouteIds(selectedBranchId);
        const routeColumns = Math.max(1, leafIndex);
        const naturalWidth = PADDING_X * 2 + routeColumns * NODE_WIDTH + (routeColumns - 1) * HORIZONTAL_GAP;
        const width = Math.max(360, naturalWidth);
        const horizontalOffset = (width - naturalWidth) / 2;
        const naturalHeight = PADDING_Y * 2 + (maxDepth + 1) * NODE_HEIGHT + maxDepth * LEVEL_GAP;
        const height = Math.max(170, naturalHeight);
        const verticalOffset = (height - naturalHeight) / 2;
        const nodes = branches.map(branch => {
            const position = positions.get(branch.id);
            const isActive = branch.id === activeBranchId;
            const wordCount = isActive ? activeWordCount : branch.wordCount;
            return {
                ...branch,
                x: position.x + horizontalOffset,
                y: position.y + verticalOffset,
                centerX: position.centerX + horizontalOffset,
                centerY: position.centerY + verticalOffset,
                isActive,
                isSelected: branch.id === selectedBranchId,
                isOnActiveRoute: activeRouteIds.has(branch.id),
                isOnSelectedRoute: selectedRouteIds.has(branch.id),
                floorCount: isActive ? activeFloorCount : branch.floorCount,
                wordCount,
                wordCountText: formatStoryBranchWordCount(wordCount)
            };
        });
        const links = nodes.filter(node => positions.has(node.parentId)).map(node => {
            const parent = positions.get(node.parentId);
            const startX = parent.centerX + horizontalOffset;
            const startY = parent.y + verticalOffset + NODE_HEIGHT;
            const endX = node.centerX;
            const endY = node.y;
            const middleY = (startY + endY) / 2;
            return {
                id: `${node.parentId}-${node.id}`,
                path: `M ${startX} ${startY} C ${startX} ${middleY}, ${endX} ${middleY}, ${endX} ${endY}`,
                isActive: activeRouteIds.has(node.id),
                isSelected: selectedRouteIds.has(node.id)
            };
        });
        return { nodes, links, width, height };
    };

    window.RPHubStoryBranches = {
        STORY_BRANCH_CHAT_EXPORT_TYPE,
        STORY_BRANCH_CHAT_EXPORT_VERSION,
        STORY_BRANCH_MAIN_ID,
        createStoryRouteMap,
        getConversationBodyLength,
        getStoryBranchOwnerId,
        getStoryBranchScopeId,
        normalizeStoryBranches
    };
})();

// --- UI-template utilities ---
(function () {
    const { generateUUID } = window.RPHubUtils;

    const cloneUiObject = (value) => JSON.parse(JSON.stringify(value || {}));
    const cloneUiValue = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

    const stripUiTemplateCodeFence = (value) => {
        const text = String(value || '').trim();
        const fenced = text.match(/^```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)\s*```$/);
        return (fenced ? fenced[1] : text).trim();
    };

    const inferInitialUiTemplateState = (template = {}, variableState = null) => {
        if (template.initialVariableState && typeof template.initialVariableState === 'object') {
            return cloneUiObject(template.initialVariableState);
        }
        let baseState = cloneUiObject(variableState || template.variableState || template.variables);
        const logs = Array.isArray(template.changeLog) ? [...template.changeLog].sort((a, b) => (a.time || 0) - (b.time || 0)) : [];
        const initializedKeys = new Set();
        logs.forEach(log => {
            Object.entries(log.changes || {}).forEach(([key, change]) => {
                if (!initializedKeys.has(key) && change && Object.prototype.hasOwnProperty.call(change, 'from')) {
                    if (key === '$root') baseState = cloneUiValue(change.from) || {};
                    else baseState = setUiTemplateValue(baseState, key, change.from);
                    initializedKeys.add(key);
                }
            });
        });
        return baseState;
    };

    const normalizeUiTemplate = (template = {}) => {
        const variableState = (template.variableState && typeof template.variableState === 'object')
            ? cloneUiObject(template.variableState)
            : (template.variables && typeof template.variables === 'object'
                ? cloneUiObject(template.variables)
                : (template.initialVariableState && typeof template.initialVariableState === 'object'
                    ? cloneUiObject(template.initialVariableState)
                    : {}));
        return {
            id: template.id || generateUUID(),
            name: template.name || 'UI模板',
            enabled: template.enabled !== false,
            scope: template.scope === 'global' ? 'global' : 'character',
            order: Number.isFinite(Number(template.order)) ? Number(template.order) : 100,
            placement: ['top', 'bottom'].includes(template.placement) ? template.placement : 'bottom',
            htmlTemplate: stripUiTemplateCodeFence(template.htmlTemplate || template.template),
            initialVariableState: inferInitialUiTemplateState(template, variableState),
            variableState,
            variableSchema: (template.variableSchema && (typeof template.variableSchema === 'object' || typeof template.variableSchema === 'string')) ? template.variableSchema : '',
            changeLog: Array.isArray(template.changeLog) ? template.changeLog : [],
            runtimeByCharacter: (template.runtimeByCharacter && typeof template.runtimeByCharacter === 'object') ? cloneUiObject(template.runtimeByCharacter) : {},
            updateMode: template.updateMode || 'merge'
        };
    };

    const sanitizeUiTemplateImportEntry = (template) => {
        const { changeLog, runtimeByCharacter, variableState, model, version, ...cleanTemplate } = template || {};
        if (!cleanTemplate.initialVariableState && !cleanTemplate.variables && variableState && typeof variableState === 'object') {
            cleanTemplate.initialVariableState = cloneUiObject(variableState);
        }
        return cleanTemplate;
    };

    const isUiTemplateObject = (value) => value !== null && typeof value === 'object';
    const splitUiTemplatePath = (path) => String(path || '')
        .trim()
        .replace(/\[(?:'([^']+)'|"([^"]+)"|([^\]]+))\]/g, (_, single, double, bare) => `.${single ?? double ?? String(bare || '').trim()}`)
        .split('.')
        .map(part => part.trim())
        .filter(Boolean);

    const readUiTemplatePath = (source, path) => {
        const normalizedPath = String(path || '').trim();
        if (!normalizedPath || normalizedPath === 'this' || normalizedPath === '.') return source;
        if (isUiTemplateObject(source) && Object.prototype.hasOwnProperty.call(source, normalizedPath)) {
            return source[normalizedPath];
        }
        return splitUiTemplatePath(normalizedPath).reduce((acc, key) => (
            acc !== undefined && acc !== null && acc[key] !== undefined ? acc[key] : undefined
        ), source);
    };

    const getUiTemplateValue = (source, path, context = null) => {
        const expression = String(path || '').trim();
        if (!expression) return undefined;
        if (context) {
            if (expression === 'this' || expression === '.') return context.current;
            if (expression === '@index') return context.index ?? 0;
            if (expression === '@number') return (context.index ?? 0) + 1;
            if (expression === '@first') return (context.index ?? 0) === 0;
            if (expression === '@last') return (context.index ?? 0) === (context.length ?? 0) - 1;
            if (expression === '@key') return context.key ?? context.index ?? '';
            if (expression.startsWith('root.')) return readUiTemplatePath(context.root, expression.slice(5));
            if (expression === 'root') return context.root;
            if (expression.startsWith('../')) {
                let parentContext = context.parentContext;
                let parentPath = expression;
                while (parentPath.startsWith('../')) {
                    parentPath = parentPath.slice(3);
                    if (parentPath.startsWith('../') && parentContext?.parentContext) {
                        parentContext = parentContext.parentContext;
                    }
                }
                const fallbackParent = { root: context.root, current: context.root, parentContext: null };
                return getUiTemplateValue(context.root, parentPath, parentContext || fallbackParent);
            }
            if (context.alias && (expression === context.alias || expression.startsWith(`${context.alias}.`))) {
                return expression === context.alias
                    ? context.current
                    : readUiTemplatePath(context.current, expression.slice(context.alias.length + 1));
            }
            const localValue = readUiTemplatePath(context.current, expression);
            if (localValue !== undefined) return localValue;
        }
        return readUiTemplatePath(source, expression);
    };

    const setUiTemplateValue = (source, path, value) => {
        const expression = String(path || '').trim();
        if (!expression) return source;
        if (expression === '$root' || expression === 'this' || expression === '.') return cloneUiValue(value);
        const root = isUiTemplateObject(source) ? source : {};
        if (Object.prototype.hasOwnProperty.call(root, expression) || !/[.[\]]/.test(expression)) {
            root[expression] = cloneUiValue(value);
            return root;
        }
        const parts = splitUiTemplatePath(expression);
        if (!parts.length) return root;
        let target = root;
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                target[part] = cloneUiValue(value);
                return;
            }
            const nextPart = parts[index + 1];
            if (!isUiTemplateObject(target[part])) target[part] = /^\d+$/.test(nextPart) ? [] : {};
            target = target[part];
        });
        return root;
    };

    const stringifyUiTemplateValue = (value) => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch (error) {
                return String(value);
            }
        }
        return String(value);
    };

    const escapeUiValue = (value) => stringifyUiTemplateValue(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const createUiTemplateRenderContext = (variables, overrides = {}) => ({
        root: variables,
        current: variables,
        parentContext: null,
        index: 0,
        key: '',
        length: 1,
        alias: '',
        ...overrides
    });

    const renderUiTemplateString = (templateText, variables, context = null) => {
        const activeContext = context || createUiTemplateRenderContext(variables);
        const withArrays = renderUiTemplateEachBlocks(String(templateText || ''), variables, activeContext);
        return withArrays.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, expression) => {
            const key = expression.trim();
            if (!key || key === 'else' || key.startsWith('#') || key.startsWith('/')) return match;
            return escapeUiValue(getUiTemplateValue(variables, key, activeContext));
        });
    };

    const renderUiTemplateEachBlocks = (templateText, variables, context) => {
        let output = templateText;
        const eachBlockPattern = /\{\{\s*#each\s+([^\s}]+)(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*\}\}((?:(?!\{\{\s*#each\b)[\s\S])*?)\{\{\s*\/each\s*\}\}/g;
        for (let pass = 0; pass < 50; pass++) {
            let replaced = false;
            output = output.replace(eachBlockPattern, (match, path, alias, body) => {
                replaced = true;
                const value = getUiTemplateValue(variables, path, context);
                const [itemTemplate, emptyTemplate = ''] = body.split(/\{\{\s*else\s*\}\}/i);
                const entries = Array.isArray(value)
                    ? value.map((item, index) => ({ item, key: index, index }))
                    : (isUiTemplateObject(value)
                        ? Object.entries(value).map(([key, item], index) => ({ item, key, index }))
                        : []);
                if (!entries.length) return renderUiTemplateString(emptyTemplate, variables, context);
                return entries.map(({ item, key, index }) => renderUiTemplateString(itemTemplate, variables, createUiTemplateRenderContext(variables, {
                    current: item,
                    parentContext: context,
                    index,
                    key,
                    length: entries.length,
                    alias: alias || ''
                }))).join('');
            });
            if (!replaced) break;
        }
        return output;
    };

    const htmlIframeSandbox = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-same-origin allow-downloads allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation';

    const buildExecutableHtmlDocument = (rawHtml) => {
        const metaViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">';
        const resetStyle = '<style>html,body{margin:0!important;padding:0!important;width:100%!important;height:auto!important;min-height:auto!important;word-wrap:break-word!important;box-sizing:border-box!important;overflow:hidden!important;}::-webkit-scrollbar{display:none;}*,*::before,*::after{box-sizing:inherit!important;}img,video,canvas,svg{max-width:100%!important;height:auto!important;}table{display:block!important;overflow-x:auto!important;max-width:100%!important;}pre{white-space:pre-wrap!important;word-wrap:break-word!important;max-width:100%!important;}.container,.reality-panel,.app-container{max-width:100%!important;width:100%!important;margin:0!important;border-radius:0!important;box-shadow:none!important;border:none!important;height:auto!important;min-height:0!important;}body>div:first-child{margin:0!important;max-width:100%!important;height:auto!important;min-height:0!important;}#app{height:auto!important;min-height:auto!important;}.bottom-safe{display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;}</style>';
        const jqueryScript = '<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js" defer><\/script>';
        const scriptShim = `
            <script>
                window.triggerSlash = function(text) {
                    if (window.parent && window.parent.triggerSlash) window.parent.triggerSlash(text);
                };

                let lastHeight = 0;
                let isUpdating = false;
                let lastScheduledAt = 0;
                let scheduleTimer = null;
                function scheduleUpdateHeight(delay) {
                    var wait = typeof delay === 'number' ? delay : 80;
                    var now = Date.now();
                    if (!scheduleTimer && now - lastScheduledAt >= wait) {
                        lastScheduledAt = now;
                        requestAnimationFrame(updateHeight);
                        return;
                    }
                    if (scheduleTimer) return;
                    scheduleTimer = setTimeout(function() {
                        scheduleTimer = null;
                        lastScheduledAt = Date.now();
                        requestAnimationFrame(updateHeight);
                    }, wait);
                }
                function updateHeight() {
                    if (!window.frameElement || isUpdating) return;
                    isUpdating = true;
                    requestAnimationFrame(function() {
                        var body = document.body;
                        var html = document.documentElement;
                        if (!body || !html) {
                            isUpdating = false;
                            return;
                        }
                        var maxBottom = 0;
                        for (var i = 0; i < body.children.length; i++) {
                            var child = body.children[i];
                            if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'LINK') continue;
                            var style = window.getComputedStyle(child);
                            if (style.position === 'fixed') continue;
                            var rect = child.getBoundingClientRect();
                            var itemMax = Math.max(rect.bottom, child.offsetTop + child.offsetHeight);
                            if (itemMax > maxBottom) maxBottom = itemMax;
                        }
                        var bodyStyle = window.getComputedStyle(body);
                        var marginBottom = parseFloat(bodyStyle.marginBottom) || 0;
                        var newHeight = Math.max(maxBottom + marginBottom, body.scrollHeight) + 4;
                        if (Math.abs(newHeight - lastHeight) > 0) {
                            lastHeight = newHeight;
                            window.frameElement.style.height = newHeight + 'px';
                        }
                        isUpdating = false;
                    });
                }

                window.addEventListener('load', function() {
                    updateHeight();
                    setTimeout(updateHeight, 200);
                    setTimeout(updateHeight, 1000);
                });
                window.addEventListener('resize', updateHeight);
                window.addEventListener('click', function(event) {
                    var slashTarget = event.target && event.target.closest && event.target.closest('[data-slash]');
                    if (slashTarget) {
                        event.preventDefault();
                        var command = slashTarget.getAttribute('data-slash');
                        if (command) window.triggerSlash(command);
                    }
                    var start = Date.now();
                    var tick = function() {
                        if (Date.now() - start >= 600) return;
                        updateHeight();
                        requestAnimationFrame(tick);
                    };
                    tick();
                });
                window.addEventListener('DOMContentLoaded', function() {
                    document.querySelectorAll('img').forEach(function(img) {
                        img.addEventListener('load', updateHeight);
                    });
                    // 卡片里的记忆引用 [M12]：借父页面同一套处理加角标，点击回到父页面打开判断依据。
                    var citations = window.parent && window.parent.RPHubMemoryCitations;
                    if (citations && citations.decorate(document)) {
                        var citationStyle = document.createElement('style');
                        citationStyle.textContent = citations.frameStyle();
                        document.head.appendChild(citationStyle);
                        document.addEventListener('click', function(event) {
                            var cite = event.target.closest && event.target.closest('.memory-cite, .memory-cite-text');
                            if (cite) citations.open(cite.getAttribute('data-memory-nos'));
                        });
                    }
                    updateHeight();
                });
                if (window.ResizeObserver) {
                    var ro = new ResizeObserver(function() { scheduleUpdateHeight(100); });
                    if (document.body) ro.observe(document.body);
                } else {
                    setInterval(updateHeight, 1000);
                }
                if (document.readyState === 'complete') updateHeight();
            <\/script>
        `;

        const content = rawHtml || '';
        const trimmed = content.trim();
        if (/^\s*(<!doctype|<html)/i.test(trimmed)) {
            const headRegex = /<head(\s[^>]*)?>/i;
            const htmlRegex = /<html(\s[^>]*)?>/i;
            if (headRegex.test(content)) {
                return content.replace(headRegex, match => match + metaViewport + resetStyle + jqueryScript + scriptShim);
            }
            if (htmlRegex.test(content)) {
                return content.replace(htmlRegex, match => match + '<head>' + metaViewport + resetStyle + jqueryScript + scriptShim + '</head>');
            }
            return metaViewport + resetStyle + jqueryScript + scriptShim + content;
        }

        return `<!DOCTYPE html>
<html>
<head>
${metaViewport}
${resetStyle}
${jqueryScript}
${scriptShim}
</head>
<body>
${content}
</body>
</html>`;
    };

    const createExecutableHtmlIframe = (rawHtml, extraClass) => {
        const iframe = document.createElement('iframe');
        iframe.className = `w-full bg-white block executable-html-frame ${extraClass}`.trim();
        iframe.style.height = 'auto';
        iframe.style.overflow = 'hidden';
        iframe.style.transition = 'height 0.2s ease-out';
        iframe.style.margin = '0';
        iframe.style.padding = '0';
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('sandbox', htmlIframeSandbox);
        iframe.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture');
        iframe.srcdoc = buildExecutableHtmlDocument(rawHtml);
        return iframe;
    };

    const renderExecutableHtmlFrame = (rawHtml, extraClass) => {
        const container = document.createElement('div');
        container.className = 'html-card-container ui-template-frame-container';
        container.style.margin = '0';
        container.style.padding = '0';
        container.style.overflow = 'hidden';
        container.appendChild(createExecutableHtmlIframe(rawHtml, extraClass));
        return container.outerHTML;
    };

    const renderUiTemplateHtml = (template) => {
        if (!template || !template.htmlTemplate) return '';
        const variables = template.variableState || {};
        const html = renderUiTemplateString(stripUiTemplateCodeFence(template.htmlTemplate), variables);
        return renderExecutableHtmlFrame(html, 'ui-template-iframe');
    };

    const stringifyUiSchema = (schema) => {
        if (!schema) return '';
        return typeof schema === 'string' ? schema : JSON.stringify(schema, null, 2);
    };

    const findUiTemplateUpdateBlock = (text) => {
        const source = String(text || '');
        const taggedCandidate = window.RPHubCardUtils.findLastUnprotectedMatch(
            source, /<ui_template_updates\b[^>]*>/i, { includeUiTemplateUpdates: true }
        );
        const taggedTail = taggedCandidate ? source.slice(taggedCandidate.index).trimEnd() : '';
        const tagged = taggedTail.match(/^<ui_template_updates\b[^>]*>([\s\S]*?)(?:<\/ui_template_updates>)?$/i);
        if (tagged) {
            const result = [taggedTail, tagged[1]];
            result.index = taggedCandidate.index;
            return result;
        }
        return null;
    };

    const stripUiTemplateUpdateBlock = (text) => {
        const source = String(text || '');
        const match = findUiTemplateUpdateBlock(source);
        return match ? source.slice(0, match.index).trimEnd() : source;
    };

    const parseUiTemplateUpdates = (rawContent, expectedTemplates = []) => {
        const source = String(rawContent || '').trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
        if (!source) return { updates: [] };
        let parsed;
        try {
            parsed = JSON.parse(source);
        } catch (error) {
            const parseError = new SyntaxError(`JSON变量块格式错误：${error.message}`);
            parseError.jsonSource = source;
            throw parseError;
        }
        if (expectedTemplates.length > 1 && Array.isArray(parsed)
            && parsed.every(item => item && typeof item === 'object' && !Array.isArray(item)
                && typeof item.id === 'string' && Object.prototype.hasOwnProperty.call(item, 'variables'))) {
            return { updates: parsed.map(item => ({ id: item.id.trim(), variables: item.variables })) };
        }
        return { updates: [{ id: '', variables: parsed }] };
    };

    const normalizeUiTemplateUpdateList = (parsed, expectedTemplates = []) => {
        const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
        const isUnsafeKey = key => ['__proto__', 'prototype', 'constructor'].includes(String(key));
        const valueType = value => Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
        const issues = [];
        const updates = isRecord(parsed) && Array.isArray(parsed.updates) ? parsed.updates : [];
        if (!isRecord(parsed) || !Array.isArray(parsed.updates)) issues.push('变量块缺少有效的JSON更新内容');
        if (!issues.length && !updates.length) return updates;
        const templatesById = new Map(expectedTemplates.map(template => [String(template.id), template]));
        const receivedById = new Map();
        updates.forEach((update, index) => {
            const location = '第 ' + (index + 1) + ' 项';
            if (!isRecord(update)) { issues.push(location + '不是有效对象'); return; }
            if (!Object.prototype.hasOwnProperty.call(update, 'variables')) { issues.push(location + '缺少 variables 字段'); return; }
            if (update.variables === null || typeof update.variables !== 'object') { issues.push(location + '的 variables 必须是对象或数组'); return; }
            const unknownFields = Object.keys(update).filter(key => !['id', 'variables'].includes(key));
            if (unknownFields.length) issues.push(location + '包含未定义字段：' + unknownFields.join('、'));
            const explicitId = typeof update.id === 'string' ? update.id.trim() : '';
            const id = explicitId || (expectedTemplates.length === 1 ? String(expectedTemplates[0].id) : '');
            if (!id) { issues.push(expectedTemplates.length > 1 ? location + '缺少模板ID；多模板必须使用JSON数组成员的 id 字段' : location + '缺少有效模板ID'); return; }
            if (!templatesById.has(id)) { issues.push(location + '使用了未知模板ID“' + id + '”'); return; }
            if (!receivedById.has(id)) receivedById.set(id, []);
            receivedById.get(id).push({ variables: update.variables });
        });
        const dynamicSamplesFor = (expected, path, schemaText) => {
            if (!path) return undefined;
            const escaped = String(path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const hasIdMarker = String(schemaText || '').includes(path + '.{id}')
                || String(schemaText || '').includes(path + '{id}');
            const allowsNewKey = new RegExp('新增(?:键|\\s*id)[^\\n]*' + escaped, 'i').test(schemaText);
            if (!hasIdMarker && !allowsNewKey) return undefined;
            return expected.flatMap(Object.values);
        };
        const validateValue = (samples, actual, path, schemaText, unknownNames, invalidNames) => {
            const typedSamples = samples.filter(sample => sample !== null && sample !== undefined);
            if (actual === null && samples.includes(null)) return;
            if (typedSamples.length && !typedSamples.some(sample => valueType(sample) === valueType(actual))) {
                invalidNames.push(path || '$root');
                return;
            }
            if (Array.isArray(actual)) {
                // 所有原始成员共同定义合法字段；空数组不推断成员结构，但仍检查危险键。
                const items = typedSamples.filter(Array.isArray).flat();
                actual.forEach((item, index) => validateValue(items, item, (path || '$root') + '[' + index + ']', schemaText, unknownNames, invalidNames));
                return;
            }
            if (isRecord(actual)) {
                const objects = typedSamples.filter(isRecord);
                Object.entries(actual).forEach(([key, value]) => {
                    if (isUnsafeKey(key)) { unknownNames.push(path ? path + '.' + key : key); return; }
                    const childPath = path ? path + '.' + key : key;
                    let childSamples = objects.filter(object => Object.prototype.hasOwnProperty.call(object, key)).map(object => object[key]);
                    if (!childSamples.length && objects.length) {
                        childSamples = dynamicSamplesFor(objects, path, schemaText);
                        if (childSamples === undefined) { unknownNames.push(childPath); return; }
                    }
                    validateValue(childSamples, value, childPath, schemaText, unknownNames, invalidNames);
                });
            }
        };
        receivedById.forEach((received, id) => {
            const template = templatesById.get(id);
            const label = template.name || id;
            if (received.length > 1) issues.push('模板“' + label + '”重复输出了 ' + received.length + ' 次');
            const unknownNames = [];
            const invalidNames = [];
            // 字段定义不随运行状态缩减；旧模板沿用已有的初始状态推断。
            validateValue([inferInitialUiTemplateState(template)], received[0].variables, '', stringifyUiSchema(template.variableSchema), unknownNames, invalidNames);
            if (unknownNames.length) issues.push('模板“' + label + '”输出了未定义变量：' + unknownNames.join('、'));
            if (invalidNames.length) issues.push('模板“' + label + '”变量类型或结构错误：' + invalidNames.join('、'));
        });
        if (issues.length) throw new Error(issues.join('；'));
        return updates;
    };
    const applyUiTemplateUpdateListToTemplate = (template, updates, { model = '', turn = null, source = 'ai' } = {}) => {
        let fieldCount = 0;
        let changed = false;
        updates.forEach(update => {
            if (!template || !update || typeof update !== 'object') return;
            if (update.id && update.id !== template.id) return;
            if (update.variables === null || typeof update.variables !== 'object') return;
            const changes = {};
            const variableEntries = [];
            const collectEntries = (value, path = '') => {
                if (Array.isArray(value) || value === null || typeof value !== 'object') {
                    if (path) variableEntries.push([path, value]);
                    return;
                }
                const entries = Object.entries(value);
                if (!entries.length && path) variableEntries.push([path, value]);
                entries.forEach(([key, child]) => {
                    const childPath = path ? `${path}.${key}` : key;
                    const current = getUiTemplateValue(template.variableState || {}, childPath);
                    if (child && typeof child === 'object' && !Array.isArray(child)
                        && current && typeof current === 'object' && !Array.isArray(current)) collectEntries(child, childPath);
                    else variableEntries.push([childPath, child]);
                });
            };
            if (Array.isArray(update.variables)) variableEntries.push(['$root', update.variables]);
            else collectEntries(update.variables);
            variableEntries.forEach(([key, value]) => {
                const oldValue = key === '$root'
                    ? template.variableState
                    : getUiTemplateValue(template.variableState || {}, key);
                if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
                    template.variableState = setUiTemplateValue(template.variableState || {}, key, value);
                    changes[key] = { from: oldValue, to: value };
                }
            });
            if (Object.keys(changes).length > 0) {
                if (!Array.isArray(template.changeLog)) template.changeLog = [];
                template.changeLog.unshift({
                    id: generateUUID(),
                    time: Date.now(),
                    source,
                    model,
                    turn,
                    changes
                });
                template.changeLog = template.changeLog.slice(0, 50);
                fieldCount += Object.keys(changes).length;
                changed = true;
            }
        });
        return { changed, fieldCount };
    };

    window.RPHubUiTemplateUtils = {
        applyUiTemplateUpdateListToTemplate,
        cloneUiObject,
        createExecutableHtmlIframe,
        findUiTemplateUpdateBlock,
        inferInitialUiTemplateState,
        normalizeUiTemplate,
        normalizeUiTemplateUpdateList,
        parseUiTemplateUpdates,
        renderUiTemplateHtml,
        sanitizeUiTemplateImportEntry,
        setUiTemplateValue,
        stringifyUiSchema,
        stripUiTemplateUpdateBlock
    };
})();
