(function () {
    'use strict';
    const bridge = window.RPLocalFiles;
    const safeName = value => String(value || '未命名角色卡')
        .normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .replace(/^\.+|[. ]+$/g, '').slice(0, 80) || '未命名角色卡';
    const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest(
        'SHA-256', new TextEncoder().encode(text),
    ))).map(byte => byte.toString(16).padStart(2, '0')).join('');
    const imageUrl = relative => '/RP-Hub/_files/' + relative.split('/').map(encodeURIComponent).join('/');
    const call = (method, ...args) => {
        if (!bridge) return null;
        const result = JSON.parse(bridge[method](...args));
        if (!result.ok) throw new Error(result.error || '本地文件保存失败');
        return result.value;
    };
    const write = (relative, value) => {
        const text = JSON.stringify(value);
        if (text.length > 64 * 1024 && typeof bridge?.beginTextWrite === 'function') {
            const token = call('beginTextWrite', relative);
            try {
                for (let offset = 0; offset < text.length;) {
                    let end = Math.min(offset + 64 * 1024, text.length);
                    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])
                        && /[\uDC00-\uDFFF]/.test(text[end])) end--;
                    call('appendTextWrite', token, text.slice(offset, end));
                    offset = end;
                }
                call('finishTextWrite', token);
            } catch (error) {
                try { call('abortTextWrite', token); } catch (_) {}
                throw error;
            }
        } else if (typeof bridge?.writeTextIfChanged === 'function') call('writeTextIfChanged', relative, text);
        else if (call('readText', relative) !== text) call('writeText', relative, text);
    };
    const read = relative => {
        const text = call('readText', relative);
        return text === null ? null : JSON.parse(text);
    };
    let cards = [];
    let inventory = bridge ? read('个人数据/文件索引.json') || {} : {};
    let queue = Promise.resolve();
    const pendingFailures = new Map();
    let webWritesPaused = false;
    const ordered = (key, task) => {
        const keys = Array.isArray(key) ? key : [key];
        const next = queue.then(task).then(
            value => { keys.forEach(item => pendingFailures.delete(item)); return value; },
            error => { keys.forEach(item => pendingFailures.set(item, error)); throw error; },
        );
        queue = next.catch(() => {});
        return next;
    };
    const ownerOf = key => cards.find(card => key.includes(card.uuid));
    const folderOf = card => card.storageFolder;
    const assignFolders = (list, activate = true) => {
        const used = new Set();
        list.forEach(card => {
            if (!card.uuid) card.uuid = crypto.randomUUID();
            if (!card.importedName) card.importedName = card.name || '未命名角色卡';
            let folder = safeName(card.storageFolder || card.importedName);
            if (used.has(folder)) folder += '（' + String(card.uuid).slice(0, 8) + '）';
            if (used.has(folder)) folder += '-' + used.size;
            card.storageFolder = folder;
            used.add(folder);
        });
        if (activate) cards = list.map(({ uuid, storageFolder, importedName }) => ({ uuid, storageFolder, importedName }));
        return list;
    };
    const pathOf = async (key, value) => {
        const isMemoryTombstone = key.startsWith('rp_hub_b1_memory_state_') && value?.deleted === true;
        const owner = isMemoryTombstone ? null : ownerOf(key);
        const directory = owner ? `角色卡数据/${folderOf(owner)}/` : '个人数据/';
        if (typeof inventory[key] === 'string' && inventory[key].startsWith(directory)) return inventory[key];
        const name = safeName(key.replace('rp_hub_', '')).slice(0, 48) + '-' + (await hash(key)).slice(0, 16);
        return `${directory}${name}.json`;
    };
    async function saveEntry(key, value, revision) {
        if (!bridge) return;
        if (key.startsWith('__rp_card_image__:')) {
            write(`角色卡数据/${folderOf(value)}/封面数据.json`, value.avatar);
        } else if (key.startsWith('__rp_card__:')) {
            write(`角色卡数据/${folderOf(value)}/角色卡.json`, value);
        } else if (key === 'rp_hub_characters' && (Array.isArray(value) || value?.rphubCardLibrary === 1)) {
            const list = Array.isArray(value) ? value : value.cards;
            assignFolders(list);
            if (Array.isArray(value)) {
                for (const card of list) write(`角色卡数据/${folderOf(card)}/角色卡.json`, card);
            }
            write('个人数据/角色卡索引.json', list.map(card => ({
                uuid: card.uuid, importedName: card.importedName, storageFolder: folderOf(card),
                name: card.name, favoriteAt: card.favoriteAt || null, createdAt: card.createdAt
            })));
        } else {
            const base = await pathOf(key, value);
            const file = revision ? base.replace(/(?:\.[a-f0-9]{32})?\.json$/, '.' + revision + '.json') : base;
            write(file, { key, value });
            inventory[key] = file;
        }
    }
    async function initialize(entries, put, { synchronized = false, readEntry } = {}) {
        if (!bridge) return;
        const existing = entries.find(entry => entry.key === 'rp_hub_characters');
        if (existing) {
            const list = Array.isArray(existing.value) ? existing.value : existing.value.cards;
            const previous = list.map(card => [card.uuid, card.storageFolder, card.importedName]);
            const index = read('个人数据/角色卡索引.json') || [];
            for (const card of list) {
                const old = index.find(item => item.uuid === card.uuid);
                if (old) {
                    card.storageFolder ||= old.storageFolder;
                    card.importedName ||= old.importedName;
                }
            }
            assignFolders(list);
            if (list.some((card, i) => card.uuid !== previous[i][0]
                || card.storageFolder !== previous[i][1] || card.importedName !== previous[i][2])) {
                await put(existing.key, existing.value);
            }
        }
        if (synchronized) return;
        // A full backup import can replace the database directly; remove stale file references.
        if (entries.length) {
            const active = new Set(entries.map(entry => entry.key));
            for (const [key, file] of Object.entries(inventory)) {
                if (!active.has(key) && !(key.startsWith('__ls__:') && localStorage.getItem(key.slice(7)) !== null)) {
                    call('remove', file);
                    delete inventory[key];
                }
            }
        }
        // The old database remains intact; copy it before enabling file writes.
        for (const entry of entries)
            await saveEntry(entry.key, Object.hasOwn(entry, 'value') ? entry.value : await readEntry(entry.key));
        if (!entries.length) {
            const index = read('个人数据/角色卡索引.json') || [];
            const restored = index.map(card => {
                const value = read(`角色卡数据/${card.storageFolder}/角色卡.json`);
                if (!value) throw new Error('角色卡文件缺失，请从备份恢复');
                if (value.avatar?.rphubCardImage === 1) {
                    value.avatar = read(`角色卡数据/${card.storageFolder}/封面数据.json`);
                    if (typeof value.avatar !== 'string') throw new Error('角色卡封面缺失，请从备份恢复');
                }
                ['name', 'favoriteAt', 'createdAt'].forEach(key => {
                    if (Object.prototype.hasOwnProperty.call(card, key)) value[key] = card[key];
                });
                return value;
            });
            if (restored.length) {
                assignFolders(restored);
                await put('rp_hub_characters', restored);
            }
            for (const file of Object.values(inventory)) {
                const entry = read(file);
                if (entry && typeof entry.key === 'string') {
                    if (entry.key.startsWith('__ls__:')) localStorage.setItem(entry.key.slice(7), entry.value);
                    else await put(entry.key, entry.value);
                }
            }
        }
        write('个人数据/文件索引.json', inventory);
    }
    const imagePath = async (identity, owner) => {
        if (!owner || !folderOf(owner)) return null;
        return `图片/${folderOf(owner)}/.索引/${await hash(identity)}.json`;
    };
    const findImage = async (identity, owner) => {
        if (!bridge) return null;
        const indexPath = await imagePath(identity, owner);
        if (!indexPath) return null;
        const record = read(indexPath);
        return record && call('exists', record.file) ? { ...record, url: imageUrl(record.file) } : null;
    };
    const saveImage = async (identity, blob, owner) => {
        if (!bridge || !owner) return null;
        const indexPath = await imagePath(identity, owner);
        if (!indexPath) return null;
        const extension = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }[blob.type];
        if (!extension) return null;
        const file = indexPath.replace('/.索引/', '/').replace(/\.json$/, '.' + extension);
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
        await ordered('image:' + indexPath, () => {
            call('writeImage', file, base64);
            write(indexPath, { file, bytes: blob.size, type: blob.type, savedAt: Date.now() });
        });
        return { url: imageUrl(file), file };
    };
    window.RPLocalStore = Object.freeze({
        available: !!bridge, call, read, write, safeName, hash, imageUrl, assignFolders,
        initialize, ownerOf, findImage, saveImage,
        readRevision: () => read('个人数据/同步版本.json'),
        saveRevision: revision => ordered('revision', () => write('个人数据/同步版本.json', revision)),
        save: (key, value) => ordered('record:' + key, async () => {
            await saveEntry(key, value);
            if (bridge) write('个人数据/文件索引.json', inventory);
        }),
        saveBatch: entries => ordered(entries.map(([key]) => 'record:' + key), async () => {
            const previous = { ...inventory };
            const revision = crypto.randomUUID().replace(/-/g, '');
            try {
                for (const [key, value] of entries) {
                    if (value === undefined) delete inventory[key];
                    else await saveEntry(key, value, revision);
                }
                // Publish the directory only after every changed chat part has reached disk.
                if (bridge) write('个人数据/文件索引.json', inventory);
            } catch (error) {
                const abandoned = Object.values(inventory).filter(file => !Object.values(previous).includes(file));
                inventory = previous;
                for (const file of abandoned) { try { call('remove', file); } catch (_) {} }
                throw error;
            }
            for (const [key] of entries) {
                if (previous[key] && previous[key] !== inventory[key]) call('remove', previous[key]);
            }
        }),
        remove: key => ordered('record:' + key, async () => {
            if (key.startsWith('__rp_card__:') || key.startsWith('__rp_card_image__:')) return;
            call('remove', inventory[key] || await pathOf(key));
            delete inventory[key];
            if (bridge) write('个人数据/文件索引.json', inventory);
        }),
        // [rphub 2.9.148] 角色卡文件夹的可删清单。
        //   角色卡写盘走的是 saveEntry 里的特例分支（直接 write 角色卡.json / 封面数据.json），
        //   从来没有进 inventory，所以按账本清理时永远看不到它们——删卡、重导都会把旧文件夹留下。
        //   这里改成「按目录扫」：不依赖账本，谁在盘上就报谁。
        listCardFolders: () => {
            if (!bridge) return [];
            const out = [];
            let folders = [];
            try { folders = call('list', '角色卡数据').filter(item => item.directory); }
            catch (error) { return out; }
            const protectedTombstones = new Set(
                Object.entries(inventory)
                    .filter(([key, file]) => key.startsWith('rp_hub_b1_memory_state_') && typeof file === 'string')
                    .map(([, file]) => file)
            );
            folders.forEach(folder => {
                let files = 0, bytes = 0;
                const prefix = '角色卡数据/' + folder.name + '/';
                try {
                    call('list', '角色卡数据/' + folder.name).forEach(entry => {
                        if (entry.directory) return;
                        if (protectedTombstones.has(prefix + entry.name)) return;
                        files += 1;
                        bytes += Number(entry.size || entry.bytes || 0) || 0;
                    });
                } catch (error) { /* 读不到就按 0 算 */ }
                out.push({ name: folder.name, files, bytes });
            });
            return out;
        },
        // 只删文件夹里的文件，不删目录本身：桥的 remove 对目录的语义没有保证，
        //   删空目录省不了多少空间，删错目录却是不可逆的。
        removeCardFolderFiles: folder => {
            if (!bridge || !folder) return 0;
            const prefix = '角色卡数据/' + folder + '/';
            const keepFiles = new Set(
                Object.entries(inventory)
                    .filter(([key, file]) => key.startsWith('rp_hub_b1_memory_state_') && typeof file === 'string' && file.startsWith(prefix))
                    .map(([, file]) => file)
            );
            let removed = 0;
            try {
                call('list', '角色卡数据/' + folder).forEach(entry => {
                    if (entry.directory) return;
                    const fullPath = prefix + entry.name;
                    if (keepFiles.has(fullPath)) return;
                    try { call('remove', fullPath); removed += 1; }
                    catch (error) { /* 单个失败不影响其它文件 */ }
                });
            } catch (error) { return removed; }
            let indexChanged = false;
            for (const [key, file] of Object.entries(inventory)) {
                if (typeof file === 'string' && file.startsWith(prefix) && !keepFiles.has(file)) {
                    delete inventory[key];
                    indexChanged = true;
                }
            }
            if (indexChanged) {
                try { write('个人数据/文件索引.json', inventory); } catch (_) {}
            }
            return removed;
        },
        flush: async () => {
            await queue;
            if (pendingFailures.size) throw pendingFailures.values().next().value;
        },
        setWebWritesPaused: paused => { webWritesPaused = paused; },
    });
    window.RPLocalPanel = {
        props: { standalone: Boolean, compact: Boolean },
        setup(props) {
            const opened = Vue.ref(false);
            const selected = Vue.ref('');
            const preview = Vue.ref('');
            const folders = Vue.ref([]);
            const images = Vue.ref([]);
            const limit = Vue.ref(48);
            const error = Vue.ref('');
            const locations = Vue.ref({});
            const refresh = () => {
                try {
                    limit.value = 48;
                    images.value = selected.value ? call('list', '图片/' + selected.value)
                        .filter(item => !item.directory && /\.(webp|png|jpe?g|gif)$/i.test(item.name))
                        .map(item => ({ ...item, url: imageUrl(`图片/${selected.value}/${item.name}`) })) : [];
                    error.value = '';
                } catch (failure) { error.value = failure.message; }
            };
            const show = () => {
                try {
                    locations.value = call('locations');
                    folders.value = call('list', '图片').filter(item => item.directory).map(item => item.name).sort();
                    selected.value = folders.value[0] || '';
                    opened.value = true;
                    refresh();
                } catch (failure) { error.value = failure.message; }
            };
            Vue.onMounted(() => { if (props.standalone && bridge) show(); });
            return {
                available: !!bridge, opened, selected, preview, folders, images, limit, error, locations, show, refresh,
                openCollectedGallery: () => window.RPHubImageGallery?.open()
            };
        },
        template: `
        <section v-if="available" :class="standalone ? 'local-album-page' : compact ? '' : 'settings-card'">
          <div v-if="!standalone" :class="compact ? 'backup-actions' : 'settings-card__header'">
            <h3 v-if="!compact" class="settings-card__title">本地数据与图片</h3>
            <button :class="compact ? 'backup-button' : 'settings-action'" type="button" @click="show"><shell-icon v-if="compact" name="Images"></shell-icon>浏览本地图片</button>
          </div>
          <p v-if="!standalone && !compact" class="text-sm text-gray-500">图片按导入卡名分文件夹保存。</p>
          <p v-if="error" role="alert" class="text-sm text-red-600">{{error}}</p>
          <teleport to="body" :disabled="standalone">
            <div v-if="opened" :class="standalone ? 'local-files-inline' : 'local-files-overlay'" :role="standalone ? 'region' : 'dialog'" :aria-modal="standalone ? null : 'true'" aria-label="本地图片">
              <section class="local-files-browser">
                <header><h2>本地图片</h2><button v-if="!standalone" type="button" @click="opened=false" title="关闭" aria-label="关闭">×</button></header>
                <div v-if="standalone" class="workspace-links">
                  <button type="button" class="settings-action" @click="openCollectedGallery">上传图与旧图库</button>
                </div>
                <select v-model="selected" @change="refresh" aria-label="角色卡图片文件夹">
                  <option v-if="!folders.length" value="">暂无图片文件夹</option>
                  <option v-for="folder in folders" :key="folder" :value="folder">{{folder}}</option>
                </select>
                <p v-if="error" role="alert">{{error}}</p>
                <p v-if="!images.length" class="text-gray-500">还没有保存的图片</p>
                <div class="local-files-grid">
                  <button v-for="image in images.slice(0,limit)" :key="image.name" type="button" @click="preview=image.url" :aria-label="'查看图片 '+image.name">
                    <img :src="image.url" loading="lazy" alt="">
                    <small>{{Math.round(image.bytes/1024)}} KB</small>
                  </button>
                </div>
                <button v-if="images.length>limit" type="button" class="settings-action" @click="limit+=48">加载更多</button>
                <details class="local-file-locations"><summary>保存位置</summary>
                  <p>个人数据：<code>{{locations.personal}}</code></p>
                  <p>角色卡数据：<code>{{locations.characters}}</code></p>
                  <p>图片：<code>{{locations.images}}</code></p>
                </details>
              </section>
            </div>
            <div v-if="preview" class="local-files-preview" role="dialog" aria-modal="true" aria-label="查看图片" @click.self="preview=''">
              <button type="button" @click="preview=''" title="关闭图片" aria-label="关闭图片">×</button>
              <img :src="preview" alt="本地保存的图片">
            </div>
          </teleport>
        </section>`,
    };
    const EPHEMERAL_LS_KEYS = new Set([
        'rphub_embedding_cache_count',
        'rphub_embedding_cache_bytes',
        'rphub_import_trace_v1',
        'rphub_heap_marks_v1',
        'rphub_restore_peak_v1',
        'rphub.bootAttempts',
        '__qa_native_files',
        '__qa_release_native'
    ]);
    const isTopWindow = (() => {
        try { return window.top === window; }
        catch (_) { return false; }
    })();
    if (bridge && isTopWindow) {
        const originalSet = Storage.prototype.setItem;
        const originalRemove = Storage.prototype.removeItem;
        Storage.prototype.setItem = function (key, value) {
            originalSet.call(this, key, value);
            if (this === localStorage && !webWritesPaused && !EPHEMERAL_LS_KEYS.has(String(key))) {
                window.RPLocalStore.save('__ls__:' + key, String(value))
                    .catch(error => console.warn('本地偏好保存失败:', error.message));
            }
        };
        Storage.prototype.removeItem = function (key) {
            originalRemove.call(this, key);
            if (this === localStorage && !webWritesPaused && !EPHEMERAL_LS_KEYS.has(String(key))) {
                window.RPLocalStore.remove('__ls__:' + key)
                    .catch(error => console.warn('本地偏好删除失败:', error.message));
            }
        };
    }
})();
