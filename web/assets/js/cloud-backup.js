// Cloud backup: characters and all their chats (branches included, summaries not) go to the update service as
// pieces named by the SHA-256 of their JSON, so whatever the server already holds is skipped. The key it returns
// merges them into another device or browser within 15 days. The service is the one in `rphub-update-api`.
(function () {
    const { reactive } = Vue;
    const apiUrl = String(document.querySelector('meta[name="rphub-update-api"]')?.content || '')
        .trim()
        .replace(/\/+$/, '');
    const MB = 1024 * 1024;
    const MAX_BACKUP_BYTES = 1024 * MB;
    const SCOPED_NAMES = ['chat', 'branches'];
    const LAST_BACKUP_STORAGE_KEY = 'rp_hub_cloud_backup';
    const encoder = new TextEncoder();
    const storage = () => window.RPHubStorage;
    const formatBytes = bytes => bytes < 1024 ? `${Math.round(bytes)} B` : bytes < MB
        ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / MB).toFixed(1)} MB`;

    const readError = (status, text) => {
        let message = '';
        try { message = JSON.parse(text).error; } catch (_) { /* Not JSON. */ }
        return new Error(message || `云端服务出错（${status}）`);
    };
    const request = async (path, options = {}) => {
        let response;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        try {
            response = await fetch(`${apiUrl}${path}`, { cache: 'no-store', signal: controller.signal, ...options });
        } catch (_) {
            throw new Error('连不上云端服务，请检查网络后重试');
        } finally { clearTimeout(timer); }
        if (response.ok) return response;
        throw readError(response.status, await response.text().catch(() => ''));
    };
    const postJson = (path, body) => request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(response => response.json());
    // XHR rather than fetch, because only XHR reports how much of an upload has been sent.
    const putPiece = (hash, body, encoding, onFraction) => new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${apiUrl}/v1/backup/blobs/${hash}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.setRequestHeader('X-Blob-Encoding', encoding);
        xhr.upload.onprogress = event => event.lengthComputable && onFraction(event.loaded / event.total);
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(readError(xhr.status, xhr.responseText)));
        xhr.onerror = () => reject(new Error('连不上云端服务，请检查网络后重试'));
        xhr.timeout = 180000;
        xhr.ontimeout = () => reject(new Error('上传超时，请检查网络后重试'));
        xhr.onabort = () => reject(new Error('上传已中断，请重试'));
        xhr.send(body);
    });
    // The server sends pieces gzipped and the browser unpacks them, so the bytes counted here match a piece's size.
    const downloadPiece = async (key, piece, onBytes = () => {}) => {
        const response = await request(`/v1/backup/${key}/blobs/${piece.hash}`);
        const maxBytes = window.RPStreamImport.profile(localStorage.getItem('rp-backup-profile')).collectionBytes;
        if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('云端数据超过当前读取档位');
        const reader = response.body?.getReader?.();
        const chunks = [];
        let received = 0;
        if (reader) {
            try {
                for (;;) {
                    let timer;
                    const { done, value } = await Promise.race([reader.read(), new Promise((_, reject) => {
                        timer = setTimeout(() => reject(new Error('下载超时，请重试')), 45000);
                    })]).finally(() => clearTimeout(timer));
                    if (done) break;
                    received += value.length;
                    if (received > maxBytes || received > piece.size) throw new Error('云端数据大小异常，原数据未改动');
                    chunks.push(value);
                    onBytes(received);
                }
            } finally { await reader.cancel().catch(() => {}); }
        } else {
            const blob = await response.blob();
            received = blob.size;
            if (received > maxBytes) throw new Error('云端数据超过当前读取档位');
            chunks.push(blob);
            onBytes(received);
        }
        const blob = new Blob(chunks);
        if (blob.size !== piece.size || await sha256(await blob.arrayBuffer()) !== piece.hash)
            throw new Error('云端数据校验失败，原数据未改动，请重新上传备份');
        try { return JSON.parse(await blob.text()); }
        catch (_) { throw new Error('云端文件内容不完整，请重新上传备份'); }
    };

    const encode = async value => encoder.encode(JSON.stringify(window.RPBackupFormat.hasBinary(value)
        ? await window.RPBackupFormat.encodeBinary(value) : value ?? null));
    const sha256 = async bytes => Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
        byte => byte.toString(16).padStart(2, '0')
    ).join('');
    const gzip = bytes => (typeof CompressionStream === 'function'
        ? new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()
        : Promise.resolve(null));

    // Field order and empty fields (the page adds some to a character when it is opened) do not make cards differ.
    const isEmptyField = value => value === undefined || value === null || value === ''
        || (Array.isArray(value) ? value.length === 0 : typeof value === 'object' && Object.keys(value).length === 0);
    const canonical = (value) => {
        if (Array.isArray(value)) return value.map(canonical);
        if (!value || typeof value !== 'object') return value;
        return Object.fromEntries(Object.keys(value).sort()
            .filter(field => !isEmptyField(value[field]))
            .map(field => [field, canonical(value[field])]));
    };
    const isSameCard = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

    // Chats and branch lists of the given characters, by owner; a branch's chat is named "<uuid>__branch__<id>".
    const listScopedEntries = async (uuids) => {
        const { getLegacyDb, getMainDb, getStorageLogicalKey, initDB, readStorageKeys } = storage();
        await initDB();
        const keys = [...await readStorageKeys(getMainDb()), ...await readStorageKeys(getLegacyDb())];
        const owners = new Map(uuids.map(uuid => [uuid, []]));
        new Set(keys.map(getStorageLogicalKey)).forEach((logicalKey) => {
            const name = SCOPED_NAMES.find(item => logicalKey.startsWith(`${item}_`));
            if (!name) return;
            const id = logicalKey.slice(name.length + 1);
            owners.get(window.RPHubStoryBranches.getStoryBranchOwnerId(id))?.push({ name, id });
        });
        return owners;
    };

    // `replaces` is this device's previous key, which the server retires once the new backup exists.
    const createBackup = async (onProgress, replaces) => {
        const { getScopedStoredValue } = storage();
        const characters = (await storage().readCharacterDirectory()).filter(character => character?.uuid);
        if (!characters.length) throw new Error('还没有角色卡可以备份');
        const owners = await listScopedEntries(characters.map(character => character.uuid));
        const total = characters.reduce((count, character) => count + 1 + owners.get(character.uuid).length, 0);

        // 1. Every piece is measured and named first, so an oversized backup fails before anything is sent.
        //    `read` fetches it again for sending, so only one piece at a time is held in memory.
        const pieces = [];
        let totalBytes = 0;
        const measure = async (piece, value) => {
            const bytes = await encode(value);
            totalBytes += bytes.length;
            if (totalBytes > MAX_BACKUP_BYTES) throw new Error('角色卡和聊天加起来超过 1GB，超出单次备份上限');
            Object.assign(piece, { hash: await sha256(bytes), size: bytes.length });
            pieces.push(piece);
            onProgress({ label: '正在整理数据', percent: pieces.length / total * 100, detail: `${pieces.length} / ${total} 项` });
            return piece;
        };
        const manifest = [];
        for (const character of characters) {
            const entries = [];
            for (const { name, id } of owners.get(character.uuid)) {
                const value = await getScopedStoredValue(name, id);
                if (value !== undefined) entries.push(await measure({ name, id, read: () => getScopedStoredValue(name, id) }, value));
            }
            const name = String(character.name || '').slice(0, 200);
            manifest.push(await measure({ uuid: character.uuid, name, read: () => storage().readCharacter(character), entries },
                await storage().readCharacter(character)));
        }

        // 2. The server says which pieces it lacks; the rest are skipped.
        const hashes = [...new Set(pieces.map(piece => piece.hash))];
        const missing = new Set();
        for (let index = 0; index < hashes.length; index += 1000) {
            const { missing: lacking } = await postJson('/v1/backup/check', { hashes: hashes.slice(index, index + 1000) });
            lacking.forEach(hash => missing.add(hash));
        }
        const skipped = pieces.filter(piece => !missing.has(piece.hash)).length;

        // 3. Only those go up. A chat changed since step 1 goes up as it is now.
        const sizes = new Map(pieces.map(piece => [piece.hash, piece.size]));
        const uploadBytes = [...missing].reduce((sum, hash) => sum + sizes.get(hash), 0);
        const sent = new Set();
        let sentBytes = 0;
        const report = (extra = 0) => onProgress({
            label: '正在上传',
            percent: uploadBytes ? (sentBytes + extra) / uploadBytes * 100 : 100,
            detail: `${formatBytes(Math.min(uploadBytes, sentBytes + extra))} / ${formatBytes(uploadBytes)}`
        });
        report();
        for (const piece of pieces) {
            if (!missing.has(piece.hash) || sent.has(piece.hash)) continue;
            const planned = piece.size;
            const bytes = await encode(await piece.read());
            Object.assign(piece, { hash: await sha256(bytes), size: bytes.length });
            if (!sent.has(piece.hash)) {
                const packed = await gzip(bytes);
                await putPiece(piece.hash, packed || bytes, packed ? 'gzip' : 'identity', fraction => report(fraction * planned));
                sent.add(piece.hash);
            }
            sentBytes += planned;
            report();
        }
        onProgress({ label: '正在生成密钥', percent: 100, detail: '' });
        return { ...await postJson('/v1/backup', { characters: manifest, replaces }), total: pieces.length, skipped };
    };

    // Look-alike letters are read as the digits they resemble, as the server does.
    const normalizeKey = key => String(key || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
        .replace(/O/g, '0').replace(/[IL]/g, '1');

    // Sorts the backup's characters against this browser: a card identical to the local one is skipped with all its
    // chats, the same character with a different card takes the backup's card and chats, the rest are added.
    const fetchBackup = async (rawKey, onProgress) => {
        const key = normalizeKey(rawKey);
        if (key.length !== 16) throw new Error('密钥应为 16 位字母和数字');
        const { characters } = await request(`/v1/backup/${key}`).then(response => response.json());
        if (!Array.isArray(characters) || !characters.length || characters.length > 100000) throw new Error('云端备份目录无效');
        const ids = new Set();
        let bytes = 0;
        for (const item of characters) {
            if (!item || typeof item.uuid !== 'string' || !item.uuid || item.uuid.length > 200 || ids.has(item.uuid)
                || !Array.isArray(item.entries)) throw new Error('云端角色卡目录损坏');
            ids.add(item.uuid);
            for (const piece of [item, ...item.entries]) {
                if (!/^[a-f0-9]{64}$/.test(piece?.hash) || !Number.isSafeInteger(piece.size) || piece.size < 0)
                    throw new Error('云端备份缺少有效的大小或校验信息');
                bytes += piece.size;
                if (bytes > MAX_BACKUP_BYTES) throw new Error('云端备份超过 1 GB');
                if (piece !== item && (!SCOPED_NAMES.includes(piece.name) || typeof piece.id !== 'string'
                    || window.RPHubStoryBranches.getStoryBranchOwnerId(piece.id) !== item.uuid))
                    throw new Error('云端聊天归属与角色卡不符');
            }
        }
        const local = new Map((await storage().readCharacterDirectory()).map(character => [character?.uuid, character]));
        const plan = { key, added: [], replaced: [], skipped: [] };
        for (const [index, item] of characters.entries()) {
            onProgress({ label: '正在比对本机角色卡', percent: index / characters.length * 100, detail: `${index} / ${characters.length} 个` });
            if (!local.has(item.uuid)) {
                plan.added.push(item);
                continue;
            }
            const localCard = await storage().readCharacter(local.get(item.uuid));
            if (await sha256(await encode(localCard)) !== item.hash) {
                const remoteCard = await downloadPiece(key, item);
                if (!isSameCard(localCard, remoteCard)) {
                    plan.replaced.push(item);
                    continue;
                }
            }
            plan.skipped.push(item);
        }
        return plan;
    };

    const applyBackup = async ({ key, added, replaced }, onProgress, options) => {
        const {
            getScopedStoredValue, readCharacterDirectory, readCharacter, scopedStorageKeyFor
        } = storage();
        const items = [...added, ...replaced];
        const entries = items.flatMap(item => item.entries);
        const totalBytes = [...items, ...entries].reduce((sum, piece) => sum + piece.size, 0);
        let doneBytes = 0;
        const report = (extra = 0) => onProgress({
            label: '正在下载',
            percent: totalBytes ? Math.min(90, (doneBytes + extra) / totalBytes * 90) : 90,
            detail: `${formatBytes(doneBytes + extra)} / ${formatBytes(totalBytes)}`
        });
        const finish = (piece) => {
            doneBytes += piece.size;
            report();
        };
        const download = async (piece) => {
            const value = await downloadPiece(key, piece, report);
            if (piece.uuid && (!value || value.uuid !== piece.uuid || Array.isArray(value))) throw new Error('云端角色卡内容与目录不符');
            if (piece.name === 'chat' && !Array.isArray(value)) throw new Error('云端聊天内容不完整');
            finish(piece);
            return value;
        };

        const local = await readCharacterDirectory(), incoming = new Map(items.map(item => [item.uuid, item]));
        const incomingKeys = new Set(entries.map(entry => `${entry.name}_${entry.id}`));
        const owners = await listScopedEntries(replaced.map(item => item.uuid));
        const removed = [...owners.values()].flat().filter(entry => !incomingKeys.has(`${entry.name}_${entry.id}`));
        const deletedMemory = id => ({ key: scopedStorageKeyFor('b1_memory_state', id),
            value: { schema: 1, revision: crypto.randomUUID().replaceAll('-', ''), deleted: true } });
        const cards = async function* () {
            for (const card of local) yield incoming.has(card.uuid) ? await download(incoming.get(card.uuid)) : await readCharacter(card);
            for (const item of added) yield await download(item);
        };
        const records = async function* () {
            yield { key: 'rp_hub_characters', value: cards() };
            for (const entry of entries) {
                const previous = await getScopedStoredValue(entry.name, entry.id);
                if (previous !== undefined && await sha256(await encode(previous)) === entry.hash) { finish(entry); continue; }
                yield { key: scopedStorageKeyFor(entry.name, entry.id), value: await download(entry) };
                if (entry.name === 'chat') yield { key: scopedStorageKeyFor('classic_memories', entry.id), value: [] };
            }
            for (const entry of removed) {
                yield { key: scopedStorageKeyFor(entry.name, entry.id), value: entry.name === 'chat' ? [] : null };
                if (entry.name === 'chat') yield deletedMemory(entry.id);
            }
        };
        let session, recoveryRequired = false;
        try {
            session = await window.RPStreamImport.stageEntries(records(), {
                limits: window.RPStreamImport.profile(localStorage.getItem('rp-backup-profile'))
            });
            await window.RPStreamImport.apply(session, {
                beforeApply: async () => {
                    const saved = await options.saveAll();
                    if (saved?.ok === false) throw saved.error || new Error('保存当前数据失败');
                }, restoreValue: options.decode,
                progress: (done, total, label = '正在恢复备份') => onProgress({ label, percent: 90 + done / total * 10, detail: `${done} / ${total} 项` })
            });
        } catch (error) {
            recoveryRequired = error.recoveryRequired;
            throw error;
        } finally {
            if (session && !recoveryRequired) await window.RPStreamImport.removeSession(storage().getMainDb(), session);
        }
    };

    const useCloudBackup = ({ saveAll, toast, decode, transfer }) => {
        const cloudBackup = reactive({
            enabled: Boolean(apiUrl),
            mode: '', // 'upload' or 'download' while its dialog is open
            busy: false,
            progress: null, // { label, percent, detail }
            key: '',
            expiresAt: 0,
            restoreKey: ''
        });
        try {
            const last = JSON.parse(localStorage.getItem(LAST_BACKUP_STORAGE_KEY) || 'null');
            if (last?.expiresAt > Date.now()) Object.assign(cloudBackup, { key: last.key, expiresAt: last.expiresAt });
        } catch (_) { /* Storage can be blocked in local-file mode. */ }

        const setProgress = (progress) => {
            cloudBackup.progress = { ...progress, percent: Math.min(100, Math.max(0, progress.percent)) };
            transfer?.progress(cloudBackup.progress);
        };
        const run = async (task) => {
            if (cloudBackup.busy) return;
            cloudBackup.busy = true;
            try {
                transfer?.start(cloudBackup.mode === 'upload' ? '上传云端备份' : '恢复云端备份');
                if (!globalThis.crypto?.subtle) throw new Error('当前网页环境不支持云端备份，请用 https 地址打开');
                await task();
                transfer?.finish();
            } catch (error) {
                toast(error?.message || '操作失败', 'error', 5000);
                transfer?.fail(error);
            } finally {
                cloudBackup.busy = false;
                cloudBackup.progress = null;
            }
        };

        const openCloudBackup = (mode) => {
            cloudBackup.mode = mode;
        };
        const closeCloudBackup = () => {
            if (!cloudBackup.busy) cloudBackup.mode = '';
        };

        const startCloudBackup = () => run(async () => {
            setProgress({ label: '正在保存当前数据', percent: 0, detail: '' });
            const saved = await saveAll();
            if (saved?.ok === false) throw saved.error || new Error('保存当前数据失败，请先重试保存');
            const { key, expiresAt, total, skipped, replaced } = await createBackup(setProgress, cloudBackup.key || undefined);
            Object.assign(cloudBackup, { key, expiresAt });
            try {
                localStorage.setItem(LAST_BACKUP_STORAGE_KEY, JSON.stringify({ key, expiresAt }));
            } catch (_) { /* The key is still shown in the dialog. */ }
            const summary = skipped ? `备份完成：共 ${total} 项，其中 ${skipped} 项云端已有，已跳过` : `备份完成：共 ${total} 项`;
            toast(replaced ? `${summary}；旧密钥已作废` : summary, 'success');
        });

        // Reads the backup and merges it at once; the dialog states the rules, the closing message the counts.
        const startCloudRestore = () => run(async () => {
            const saved = await saveAll();
            if (saved?.ok === false) throw saved.error || new Error('保存当前数据失败');
            setProgress({ label: '正在读取备份', percent: 0, detail: '' });
            const plan = await fetchBackup(cloudBackup.restoreKey, setProgress);
            if (!plan.added.length && !plan.replaced.length) {
                toast('备份里的角色卡本机都有且完全相同，无需恢复', 'info');
                return;
            }
            await applyBackup(plan, setProgress, { saveAll, decode });
            const counts = [`新增 ${plan.added.length} 个`, `替换 ${plan.replaced.length} 个`, `跳过 ${plan.skipped.length} 个`]
                .filter(text => !text.includes(' 0 个'));
            setProgress({ label: '恢复完成，正在刷新页面', percent: 100, detail: counts.join('，') });
            toast(`恢复完成：${counts.join('，')}`, 'success', 3000);
            setTimeout(() => location.reload(), 1500);
            // Keeps the dialog locked until the page reloads.
            await new Promise(() => {});
        });

        const copyCloudBackupKey = () => navigator.clipboard.writeText(cloudBackup.key)
            .then(() => toast('密钥已复制', 'success'), () => toast('复制失败，请手动选中密钥复制', 'error'));
        const formatCloudBackupTime = time => new Date(time).toLocaleString('zh-CN', {
            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return {
            cloudBackup, closeCloudBackup, copyCloudBackupKey, formatCloudBackupTime, openCloudBackup,
            startCloudBackup, startCloudRestore
        };
    };

    window.RPHubCloudBackup = Object.freeze({ useCloudBackup });
})();
