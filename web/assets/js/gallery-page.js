(function () {
    'use strict';
    const { ref, computed, onMounted, onBeforeUnmount, watch } = Vue;
    const GalleryPage = {
        components: { Icon: window.RPAppShell.Icon, MascotHeader: window.RPAppShell.MascotHeader, ThemeMascot: window.RPAppShell.ThemeMascot, CharacterCover: window.RPHubComponents.CharacterCover },
        props: { characters: { type: Array, default: () => [] }, active: Boolean },
        setup(props, { expose }) {
            const search = ref('');
            const selectedId = ref('');
            const photos = ref([]);
            const counts = ref({});
            const loading = ref(false);
            const error = ref('');
            const limit = ref(48);
            const previewIndex = ref(-1);
            const zoomed = ref(false);
            const saving = ref(false);
            const gallerySurface = ref(null), previewSurface = ref(null);
            const glass = window.RPGalleryGlass(() => props.active, () => [gallerySurface.value, previewSurface.value]);
            let sequence = 0;
            const urls = new Set();
            const releaseUrls = () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
            const local = window.RPLocalStore;
            const selected = computed(() => props.characters.find(card => card.uuid === selectedId.value));
            const albums = computed(() => props.characters.filter(card =>
                String(card.name || '').toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())));
            const preview = computed(() => photos.value[previewIndex.value] || null);
            const coverLoaded = ({ target: image }) => {
                image.classList.remove('is-missing');
                image.closest('.shell-album-cover').style.setProperty('--album-ratio', `${image.naturalWidth} / ${image.naturalHeight}`);
            };
            const folder = card => card.storageFolder || local.safeName(card.importedName || card.name);
            const nativeList = card => local.call('list', '图片/' + folder(card))
                .filter(item => !item.directory && /\.(webp|png|jpe?g|gif)$/i.test(item.name))
                .sort((a, b) => (b.modified || 0) - (a.modified || 0) || a.name.localeCompare(b.name))
                .map(item => ({ ...item, url: local.imageUrl(`图片/${folder(card)}/${item.name}`) }));
            const readBrowserPhotos = card => new Promise((resolve, reject) => {
                const request = indexedDB.open('RPHubImageVaultV1', 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    const store = db.createObjectStore('images', { keyPath: 'k' });
                    store.createIndex('g', 'g'); store.createIndex('a', 'a');
                    db.createObjectStore('meta', { keyPath: 'k' });
                };
                request.onsuccess = () => {
                    const db = request.result;
                    const tx = db.transaction('images', 'readonly');
                    const get = tx.objectStore('images').getAll();
                    get.onsuccess = () => {
                        const records = get.result.filter(item => item.b && item.owner === card.uuid).map(item => {
                            const url = URL.createObjectURL(item.b);
                            urls.add(url);
                            return { name: item.k, url, bytes: item.n || item.b.size };
                        });
                        resolve(records);
                    };
                    get.onerror = () => reject(get.error);
                    tx.oncomplete = () => db.close();
                };
                request.onerror = () => reject(request.error);
            });
            const refreshCounts = () => {
                if (!local.available) return;
                for (const card of props.characters) {
                    try { counts.value[card.uuid] = nativeList(card).length; }
                    catch (_) { counts.value[card.uuid] = null; }
                }
            };
            const open = async card => {
                const token = ++sequence;
                releaseUrls();
                selectedId.value = card.uuid;
                previewIndex.value = -1;
                loading.value = true;
                error.value = '';
                photos.value = [];
                limit.value = 48;
                try {
                    const result = local.available ? nativeList(card) : await readBrowserPhotos(card);
                    if (token !== sequence) return;
                    photos.value = result;
                    counts.value[card.uuid] = result.length;
                } catch (failure) { error.value = failure.message || '图片读取失败'; }
                finally { if (token === sequence) loading.value = false; }
            };
            const back = () => {
                if (preview.value) { previewIndex.value = -1; zoomed.value = false; return true; }
                if (selectedId.value) { selectedId.value = ''; photos.value = []; sequence++; releaseUrls(); return true; }
                return false;
            };
            const move = delta => {
                previewIndex.value = Math.max(0, Math.min(photos.value.length - 1, previewIndex.value + delta));
                zoomed.value = false;
            };
            const save = async () => {
                if (!preview.value || saving.value) return;
                saving.value = true;
                try {
                    await window.RPImageDownload.run(preview.value.url, { name: selected.value?.importedName || selected.value?.name });
                    error.value = '';
                } catch (failure) { error.value = failure.message; }
                finally { saving.value = false; }
            };
            // ── [rphub 2.9.127] 长按多选 ──────────────────────────────
            //   长按 450ms 进入选择模式并选中该张；选择模式下单击改为勾选/取消。
            //   批量下载复用单张的下载通道，批量删除走本地文件 remove。
            const selectMode = ref(false);
            const picked = ref([]);
            const notice = ref('');
            let pressTimer = null, pressStart = null, longPressed = null;
            const isPicked = name => picked.value.indexOf(name) >= 0;
            const enterSelect = photo => {
                selectMode.value = true;
                if (!isPicked(photo.name)) picked.value = [...picked.value, photo.name];
            };
            const togglePick = photo => {
                picked.value = isPicked(photo.name)
                    ? picked.value.filter(name => name !== photo.name)
                    : [...picked.value, photo.name];
                if (!picked.value.length) selectMode.value = false;
            };
            const selectAll = () => {
                picked.value = photos.value.slice(0, limit.value).map(photo => photo.name);
                selectMode.value = true;
            };
            const exitSelect = () => { selectMode.value = false; picked.value = []; };
            const startPress = (photo, event) => {
                if (!event.isPrimary || event.button !== 0) return;
                longPressed = null;
                if (selectMode.value) return;
                pressStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
                clearTimeout(pressTimer);
                pressTimer = setTimeout(() => {
                    pressTimer = null;
                    longPressed = photo.name;
                    enterSelect(photo);
                }, 450);
            };
            const movePress = event => {
                if (event.pointerId !== pressStart?.id) return;
                if (Math.abs(event.clientX - pressStart.x) > 10 || Math.abs(event.clientY - pressStart.y) > 10) endPress();
            };
            const endPress = event => {
                if (event && event.pointerId !== pressStart?.id) return;
                clearTimeout(pressTimer); pressTimer = null; pressStart = null;
            };
            const onPhotoClick = (photo, index, event) => {
                if (event.detail && photo.name === longPressed) { longPressed = null; return; }
                if (selectMode.value) { togglePick(photo); return; }
                previewIndex.value = index;
                zoomed.value = false;
            };
            const removeBrowserPhoto = key => new Promise((resolve, reject) => {
                const request = indexedDB.open('RPHubImageVaultV1', 1);
                request.onsuccess = () => {
                    const db = request.result;
                    const tx = db.transaction('images', 'readwrite');
                    tx.objectStore('images').delete(key);
                    tx.oncomplete = () => { db.close(); resolve(true); };
                    tx.onabort = () => { db.close(); reject(tx.error); };
                };
                request.onerror = () => reject(request.error);
            });
            const batchSave = async () => {
                if (!picked.value.length || saving.value) return;
                saving.value = true; notice.value = '';
                const targetName = selected.value?.importedName || selected.value?.name;
                let ok = 0, fail = 0;
                for (const name of [...picked.value]) {
                    const photo = photos.value.find(item => item.name === name);
                    if (!photo) continue;
                    try { await window.RPImageDownload.run(photo.url, { name: targetName }); ok += 1; }
                    catch (_) { fail += 1; }
                }
                saving.value = false;
                notice.value = '已保存 ' + ok + ' 张' + (fail ? '，失败 ' + fail + ' 张' : '');
                if (!fail) exitSelect();
            };
            const batchRemove = async () => {
                if (!picked.value.length || saving.value || !selected.value) return;
                const list = [...picked.value];
                if (!window.confirm('删除选中的 ' + list.length + ' 张图片？此操作不可撤销')) return;
                const card = selected.value, token = sequence;
                const base = '图片/' + folder(card), removed = new Set();
                saving.value = true;
                try {
                    for (const name of list) {
                        try {
                            if (local.available) local.call('remove', base + '/' + name);
                            else await removeBrowserPhoto(name);
                            removed.add(name);
                        } catch (_) {}
                    }
                    if (token !== sequence) return;
                    photos.value = photos.value.filter(photo => !removed.has(photo.name));
                    counts.value[card.uuid] = photos.value.length;
                    const failed = list.length - removed.size;
                    notice.value = '已删除 ' + removed.size + ' 张' + (failed ? '，失败 ' + failed + ' 张' : '');
                    exitSelect();
                } finally {
                    saving.value = false;
                }
            };
            const keys = event => {
                if (!props.active || !preview.value) return;
                if (event.key === 'Escape') { event.preventDefault(); back(); }
                if (event.key === 'ArrowLeft') move(-1);
                if (event.key === 'ArrowRight') move(1);
            };
            onMounted(() => { if (props.active) refreshCounts(); window.addEventListener('keydown', keys); });
            watch(() => props.active, value => {
                if (value) refreshCounts();
                else previewIndex.value = -1;
            });
            watch(() => props.characters.map(card => card.uuid + ':' + card.storageFolder).join('|'), () => {
                if (props.active) refreshCounts();
            });
            onBeforeUnmount(() => { sequence++; endPress(); releaseUrls(); window.removeEventListener('keydown', keys); });
            expose({ back, open, selectedId });
            return { search, selected, albums, photos, counts, loading, error, limit, preview, previewIndex, zoomed, saving, open, back, move, save, coverLoaded,
                selectMode, picked, notice, isPicked, togglePick, selectAll, exitSelect, startPress, movePress, endPress, onPhotoClick, batchSave, batchRemove,
                gallerySurface, previewSurface, glassPointer: glass.pointer, glassReset: glass.reset };
        },
        template: `
          <main ref="gallerySurface" class="shell-page shell-gallery" @pointermove.passive="glassPointer" @pointerleave="glassReset">
            <mascot-header v-if="!selected" title="画廊" :active="active" :count="characters.length+' 本相簿'" pose="album"></mascot-header>
            <header v-else class="shell-page-header yy-album-heading">
              <div class="shell-album-title"><button type="button" class="shell-icon-button" aria-label="返回画廊" @click="back"><icon name="ArrowLeft"/></button><div><h1>{{selected.name}}</h1></div></div>
              <span class="shell-count">{{selectMode?'已选 '+picked.length+' 张':photos.length+' 张'}}</span>
            </header>
            <label v-if="!selected" class="shell-search"><icon name="Search"/><input v-model="search" type="search" aria-label="搜索角色相簿" placeholder="搜索角色相簿"></label>
            <p v-if="error" role="alert" class="shell-error">{{error}}</p>
            <template v-if="!selected">
              <div class="shell-album-grid">
                <button v-for="card in albums" :key="card.uuid" type="button" class="shell-album" @click="open(card)" :aria-label="'打开相簿：'+card.name">
                  <div class="shell-album-cover"><div class="shell-album-aperture image-glass"><icon name="Images"/><character-cover v-if="card.avatar" :src="card.avatar" :uuid="card.uuid" :alt="card.name" loading="lazy" decoding="async" @error="$event.target.classList.add('is-missing');$event.target.closest('.shell-album-cover').style.removeProperty('--album-ratio')" @load="coverLoaded"></character-cover></div></div>
                  <strong>{{card.name}}</strong><small>{{counts[card.uuid] === null?'读取失败':counts[card.uuid] === undefined?'本地相簿':counts[card.uuid]+' 张图片'}}</small>
                </button>
              </div>
              <div v-if="!albums.length" class="shell-empty"><theme-mascot class="yy-empty-mascot" pose="confused" alt="困惑的陈玥"></theme-mascot><h2>{{search?'没有匹配的相簿':'还没有角色相簿'}}</h2><p>{{search?'试试其他角色名':'导入角色卡后，相簿会显示在这里。'}}</p></div>
            </template>
            <template v-else>
              <p v-if="loading" role="status">正在读取本地图片…</p>
              <div v-else-if="!photos.length && !error" class="shell-empty"><theme-mascot class="yy-empty-mascot" pose="album" alt="抱着相簿的陈玥"></theme-mascot><h2>相簿还是空的</h2><p>这张角色卡生成并保存的图片会出现在这里。</p></div>
              <p v-if="notice" class="shell-gallery-notice">{{notice}}</p>
              <div class="shell-photo-grid" :class="{'is-selecting':selectMode}" @pointermove.passive="movePress" @pointerup="endPress" @pointercancel="endPress" @pointerleave="endPress">
                <button v-for="(photo,index) in photos.slice(0,limit)" :key="photo.name" type="button"
                  class="image-glass shell-photo-cell" :class="{'is-picked':isPicked(photo.name)}"
                  @pointerdown="startPress(photo, $event)" @click="onPhotoClick(photo, index, $event)"
                  :aria-pressed="selectMode ? isPicked(photo.name) : null"
                  :aria-label="'第 '+(index+1)+' 张图片'">
                  <img :src="photo.url" alt="" loading="lazy">
                  <small>{{Math.round(photo.bytes/1024)}} KB</small>
                  <span v-if="selectMode" class="shell-photo-check" :class="{'is-on':isPicked(photo.name)}"><icon name="Check"/></span>
                </button>
              </div>
              <div v-if="selectMode" class="shell-gallery-actions">
                <span class="shell-gallery-count">已选 {{picked.length}} 张</span>
                <button type="button" class="shell-gallery-action" @click="selectAll"><icon name="CheckCheck"/>全选</button>
                <button type="button" class="shell-gallery-action" :disabled="!picked.length||saving" @click="batchSave"><icon name="Download"/>{{saving?'保存中':'下载'}}</button>
                <button type="button" class="shell-gallery-action is-danger" :disabled="!picked.length||saving" @click="batchRemove"><icon name="Trash2"/>删除</button>
                <button type="button" class="shell-gallery-action" @click="exitSelect">取消</button>
              </div>
              <button v-if="limit<photos.length" type="button" class="shell-button" @click="limit+=48">加载更多图片</button>
              <button v-if="error" type="button" class="shell-button" @click="open(selected)"><icon name="RefreshCw"/>重新读取</button>
            </template>
            <teleport to="body">
              <div v-if="preview && active" ref="previewSurface" class="shell-photo-viewer" role="dialog" aria-modal="true" aria-label="查看图片" @click.self="back" @pointermove.passive="glassPointer" @pointerleave="glassReset">
                <header><button type="button" class="shell-icon-button" aria-label="关闭大图" @click="back"><icon name="X"/></button><span>{{previewIndex+1}} / {{photos.length}}</span><button type="button" class="shell-icon-button" :disabled="saving" aria-label="保存图片到相册" title="保存图片到相册" @click="save"><icon name="Download"/></button></header>
                <div class="shell-photo-stage" :class="{'is-zoomed':zoomed}"><div class="shell-photo-glass image-glass"><img :src="preview.url" alt="生成的图片" @click="zoomed=!zoomed"></div></div>
                <footer><button type="button" class="shell-icon-button" :disabled="previewIndex===0" aria-label="上一张图片" @click="move(-1)"><icon name="ChevronLeft"/></button><button type="button" class="shell-icon-button" aria-label="切换图片缩放" @click="zoomed=!zoomed"><icon name="Expand"/></button><button type="button" class="shell-icon-button" :disabled="previewIndex===photos.length-1" aria-label="下一张图片" @click="move(1)"><icon name="ChevronRight"/></button></footer>
                <p v-if="error" role="alert" class="shell-viewer-error">{{error}}</p>
              </div>
            </teleport>
          </main>`
    };
    window.RPGalleryPage = GalleryPage;
})();
