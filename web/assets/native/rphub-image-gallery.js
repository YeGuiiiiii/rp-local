/**
 * RP-Hub 图片库（2.8.36）
 *
 * 定位：把散落在消息里的图片、以及每次生图的结果，收成一份可浏览 / 可清理 / 可导出的索引。
 *
 * 三条硬约束（决定了本模块的形态）：
 *   1. 不存原图副本。落盘的只有 240px 缩略图，原图按需从远端 URL 拉取。
 *   2. 不碰官方数据。独立 IndexedDB（RPHubGalleryDB），与官方 RPHubDB 完全隔离，
 *      官方备份 / 清库 / 升级都不牵连本库。
 *   3. 不碰官方 Vue 组件。设置页卡片与图库浮层都由本模块自绘，
 *      通过 MutationObserver 维持注入，官方改版最多丢入口、不会白屏。
 *
 * 生图历史的实际含义：官方每次重载都会按 data-image-request 重新 POST 生成，
 * 且重 roll 会覆盖消息里的 tag（app.js:2167）。本模块把每次成功的结果连同 tag
 * 一起记下来，于是「配方」和「当时那张图」都留得住。
 */
(function () {
    'use strict';

    if (window.__RPHubImageGalleryInstalled) return;
    window.__RPHubImageGalleryInstalled = true;

    var DB_NAME = 'RPHubGalleryDB';
    var DB_VERSION = 1;
    var STORE = 'images';
    var THUMB_MAX = 240;
    var THUMB_QUALITY = 0.82;
    // 生图 URL 里带着用户的 imageGenKey，入库前替换掉，用时再取回。
    var TOKEN_PLACEHOLDER = '__RPHUB_TOKEN__';
    var NAV_ITEM_ID = 'rphub-gallery-nav';
    var OVERLAY_ID = 'rphub-gallery-overlay';
    var STYLE_ID = 'rphub-gallery-style';
    // 官方 advancedItems 里用的是 24x24 线性图标风格，这里保持同一套描边宽度。
    var ICON_PATH = 'M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 3h4v4H7V8zm0 6h10m-10 3h7';

    var dbPromise = null;
    var records = null;          // 内存缓存，null = 未加载
    var loadPromise = null;      // 读取中的 promise：多个入口同时调用只打一次库
    var knownIds = new Set();    // 已入库 id：去重靠内存集合，避免并发采集时的查库竞态
    var collectQueue = [];
    var collecting = false;
    var lastError = '';          // 最近一次采集错误，直接显示在图库空态里
    var stats = { done: 0, thumbFailed: 0, noSrc: 0 };
    var selectedIds = null;      // null = 未进入多选
    var observerTimer = null;

    /* ============================================================
     * 一、IndexedDB（原生 API，绕开官方 setStoredValue）
     * ============================================================ */

    function openDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise(function (resolve, reject) {
            var request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function (event) {
                var db = event.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    var store = db.createObjectStore(STORE, { keyPath: 'id' });
                    store.createIndex('byCreatedAt', 'createdAt');
                    store.createIndex('byKind', 'kind');
                }
            };
            request.onsuccess = function (event) { resolve(event.target.result); };
            request.onerror = function (event) { reject(event.target.error); };
        });
        return dbPromise;
    }

    function dbAll() {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var request = db.transaction([STORE], 'readonly').objectStore(STORE).getAll();
                request.onsuccess = function () { resolve(request.result || []); };
                request.onerror = function () { reject(request.error); };
            });
        });
    }

    function dbPut(record) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var request = db.transaction([STORE], 'readwrite').objectStore(STORE).put(record);
                request.onsuccess = function () { resolve(record); };
                request.onerror = function () { reject(request.error); };
            });
        });
    }

    function dbDelete(id) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var request = db.transaction([STORE], 'readwrite').objectStore(STORE).delete(id);
                request.onsuccess = function () { resolve(true); };
                request.onerror = function () { reject(request.error); };
            });
        });
    }

    function loadRecords() {
        if (records) return Promise.resolve(records);
        if (loadPromise) return loadPromise;
        // IDB 在某些 WebView 状态下会「不报错也不回调」（存储被禁用 / 无痕 / file 协议），
        // 裸等会让图库永久停在「读取中」。这里给一个上限，超时按空库处理，功能降级但不卡死。
        loadPromise = withTimeout(dbAll(), 4000, []).then(function (list) {
            list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
            records = list.filter(function (item) { return !window.RPImagePolicy.isUiUrl(item.originUrl); });
            records.forEach(function (item) { knownIds.add(item.id); });
            return records;
        }).catch(function (error) {
            console.warn('[图库] 读取失败:', error);
            records = [];
            return records;
        }).then(function (value) {
            loadPromise = null;
            return value;
        });
        return loadPromise;
    }

    function withTimeout(promise, ms, fallback) {
        var timer = null;
        var timeout = new Promise(function (resolve) {
            timer = setTimeout(function () { resolve(fallback); }, ms);
        });
        // Promise.race 比「在 then 里判断 settled」更可靠：即便上游同步抛错也能落到 fallback。
        return Promise.race([
            Promise.resolve().then(function () { return promise; }),
            timeout
        ]).then(function (value) {
            if (timer) clearTimeout(timer);
            return value === undefined ? fallback : value;
        }, function () {
            if (timer) clearTimeout(timer);
            return fallback;
        });
    }

    /* ============================================================
     * 二、官方状态读取（只读，不写回）
     * ============================================================ */

    function getVueState() {
        try {
            var el = document.getElementById('app');
            if (el && el.__vue_app__ && el.__vue_app__._instance) {
                return el.__vue_app__._instance.setupState || el.__vue_app__._instance.proxy || null;
            }
            if (el && el.__vue_app__ && el.__vue_app__._container && el.__vue_app__._container._vnode) {
                var component = el.__vue_app__._container._vnode.component;
                return component ? component.setupState : null;
            }
        } catch (error) { /* 官方结构变了就静默降级 */ }
        return null;
    }

    function unwrap(value) {
        return (value && typeof value === 'object' && 'value' in value) ? value.value : value;
    }

    function getSettings() {
        var state = getVueState();
        if (!state) return null;
        try { return unwrap(state.settings) || null; } catch (error) { return null; }
    }

    function currentContext() {
        var state = getVueState();
        var ctx = { chatId: '', characterId: '', characterName: '' };
        if (!state) return ctx;
        try {
            var character = unwrap(state.currentCharacter) || null;
            if (character) {
                ctx.characterId = String(character.uuid || character.id || '');
                ctx.characterName = String(character.name || '');
            }
            var branch = unwrap(state.activeStoryBranchId) || 'main';
            ctx.chatId = (ctx.characterId || 'unknown') + '::' + String(branch);
        } catch (error) { /* 拿不到就用空上下文，不影响记录本身 */ }
        return ctx;
    }

    function currentHistory() {
        var state = getVueState();
        if (!state) return [];
        try {
            var history = unwrap(state.chatHistory);
            return Array.isArray(history) ? history : [];
        } catch (error) { return []; }
    }

    /* ============================================================
     * 三、URL 脱敏与还原
     * ============================================================ */

    function maskUrl(url) {
        if (!url) return '';
        return String(url).replace(/([?&]token=)[^&]*/i, '$1' + TOKEN_PLACEHOLDER);
    }

    function resolveUrl(url) {
        if (!url) return '';
        if (String(url).indexOf(TOKEN_PLACEHOLDER) === -1) return url;
        var settings = getSettings();
        var token = settings && settings.imageGenKey ? String(settings.imageGenKey).trim() : '';
        return String(url).replace(TOKEN_PLACEHOLDER, encodeURIComponent(token));
    }

    /* ============================================================
     * 四、缩略图
     * ============================================================ */

    function blobFromDataUrl(dataUrl) {
        return fetch(dataUrl).then(function (response) { return response.blob(); });
    }

    function decodeBlob(blob) {
        if (typeof createImageBitmap === 'function') {
            return createImageBitmap(blob).catch(function () { return decodeViaImage(blob); });
        }
        return decodeViaImage(blob);
    }

    // 旧 WebView 没有 createImageBitmap 时的兜底：走 <img> + objectURL
    function decodeViaImage(blob) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(blob);
            var img = new Image();
            img.onload = function () {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('图片解码失败'));
            };
            img.src = url;
        });
    }

    function makeThumb(source) {
        // 缩略图失败不应该拖垮整条采集队列：Android WebView 上 canvas.toBlob
        // 偶发不回调，一旦那张图卡住，后面的图就永远排不上。这里全部限时 + 兜底。
        return raceTimeout(makeThumbInner(source), 12000, '缩略图生成超时').catch(function (error) {
            lastError = String(error && error.message ? error.message : error);
            console.warn('[图库] 缩略图失败:', lastError);
            return { blob: null, width: 0, height: 0 };
        });
    }

    function raceTimeout(promise, ms, message) {
        var timer = null;
        var timeout = new Promise(function (_, reject) {
            timer = setTimeout(function () { reject(new Error(message)); }, ms);
        });
        return Promise.race([promise, timeout]).then(function (value) {
            if (timer) clearTimeout(timer);
            return value;
        }, function (error) {
            if (timer) clearTimeout(timer);
            throw error;
        });
    }

    function dataUrlToBlob(dataUrl) {
        var parts = String(dataUrl).split(',');
        var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/webp';
        var binary = atob(parts[1] || '');
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    function makeThumbInner(source) {
        var blobPromise = String(source).indexOf('data:') === 0
            ? blobFromDataUrl(source)
            : fetch(source, { mode: 'cors', credentials: 'omit' }).then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.blob();
            });
        return blobPromise.then(decodeBlob).then(function (image) {
            var width = image.width || image.naturalWidth || 0;
            var height = image.height || image.naturalHeight || 0;
            if (!width || !height) throw new Error('图片尺寸异常');
            var scale = Math.min(1, THUMB_MAX / Math.max(width, height));
            var thumbW = Math.max(1, Math.round(width * scale));
            var thumbH = Math.max(1, Math.round(height * scale));
            var canvas = document.createElement('canvas');
            canvas.width = thumbW;
            canvas.height = thumbH;
            canvas.getContext('2d').drawImage(image, 0, 0, thumbW, thumbH);
            if (typeof image.close === 'function') { try { image.close(); } catch (error) { /* 忽略 */ } }
            return new Promise(function (resolve) {
                var settled = false;
                var finish = function (blob) {
                    if (settled) return;
                    settled = true;
                    resolve({ blob: blob || null, width: width, height: height });
                };
                try {
                    canvas.toBlob(function (blob) {
                        if (blob) { finish(blob); return; }
                        // WebP 不被支持时会回 null，改走 dataURL 兜底。
                        try { finish(dataUrlToBlob(canvas.toDataURL('image/webp', THUMB_QUALITY))); }
                        catch (error) { finish(null); }
                    }, 'image/webp', THUMB_QUALITY);
                } catch (error) { finish(null); }
                // toBlob 完全不回调时的最后一道保险。
                setTimeout(function () {
                    if (settled) return;
                    try { finish(dataUrlToBlob(canvas.toDataURL('image/webp', THUMB_QUALITY))); }
                    catch (error) { finish(null); }
                }, 3000);
            });
        });
    }

    /* ============================================================
     * 五、记录
     * ============================================================ */

    function shortHash(text) {
        var value = String(text || '');
        // 长 base64 不整串遍历：长度 + 首尾片段已经足够区分。
        var sample = value.length > 512
            ? value.slice(0, 128) + value.slice(-128) + '#' + value.length
            : value;
        var hash = 5381;
        for (var i = 0; i < sample.length; i++) {
            hash = ((hash << 5) + hash + sample.charCodeAt(i)) | 0;
        }
        return (hash >>> 0).toString(36);
    }

    function parseRequestMeta(requestUrl) {
        var meta = { tag: '', model: '', size: '', artist: '' };
        if (!requestUrl) return meta;
        try {
            var url = new URL(requestUrl, window.location.href);
            meta.tag = url.searchParams.get('tag') || '';
            meta.model = url.searchParams.get('model') || '';
            meta.size = url.searchParams.get('size') || '';
            meta.artist = url.searchParams.get('artist') || '';
        } catch (error) { /* 解析失败就留空 */ }
        return meta;
    }

    function enqueue(task) {
        collectQueue.push(task);
        drainQueue();
    }

    function drainQueue() {
        if (collecting) return;
        var task = collectQueue.shift();
        if (!task) return;
        collecting = true;
        // task() 若同步抛错（例如非法 URL 让 fetch 直接抛），不包一圈的话
        // collecting 会永远停在 true，整个队列从此停摆且不留任何错误——最难查的一种。
        var running;
        try {
            running = Promise.resolve(task());
        } catch (error) {
            running = Promise.reject(error);
        }
        running.catch(function (error) {
            lastError = String(error && error.message ? error.message : error);
            console.warn('[图库] 采集失败:', lastError);
        }).then(function () {
            collecting = false;
            stats.done++;
            // 图库开着的时候每收一张就刷新，用户点了进来立刻能看到东西，不用手动重开。
            if (document.getElementById(OVERLAY_ID)) renderGrid();
            // 串行 + 小间隔：一次性解码几十张大图会直接把 WebView 打爆。
            setTimeout(drainQueue, 60);
        });
    }

    function recordUploadedImage(message, messageIndex, imageIndex, ctx) {
        var attachment = message && message.imageAttachments && message.imageAttachments[imageIndex];
        var dataUrl = attachment && attachment.dataUrl;
        if (!dataUrl || String(dataUrl).indexOf('data:image/') !== 0) return;
        var id = 'up:' + ctx.chatId + ':' + messageIndex + ':' + imageIndex + ':' + shortHash(dataUrl);
        if (knownIds.has(id)) return;
        knownIds.add(id);
        enqueue(function () {
            return makeThumb(dataUrl).then(function (thumb) {
                return dbPut({
                    id: id,
                    kind: 'upload',
                    thumb: thumb.blob,
                    width: thumb.width,
                    height: thumb.height,
                    tag: '',
                    model: '',
                    size: '',
                    originUrl: '',
                    source: 'data',
                    chatId: ctx.chatId,
                    characterId: ctx.characterId,
                    characterName: ctx.characterName,
                    messageIndex: messageIndex,
                    imageIndex: imageIndex,
                    createdAt: Date.now()
                });
            }).then(function (record) {
                if (!record.thumb) stats.thumbFailed++;
                if (records && !records.some(function (item) { return item.id === record.id; })) records.unshift(record);
            });
        });
    }

    function recordGeneratedImage(card) {
        if (!card || !card.isConnected) return;
        var image = card.querySelector('img');
        var src = image && (image.currentSrc || image.src);
        // 生图卡片的 src 可能是远端 URL，也可能是服务端直接回 base64（data:）。
        // 两种都要收，不能因为不是 http 就跳过。
        if (!src) { stats.noSrc++; return; }
        if (!window.RPImagePolicy.isContentImage(image)) return;
        var requestUrl = card.dataset.imageRequest || '';
        var meta = parseRequestMeta(requestUrl);
        // 去重键刻意不含 src：同一张卡片的 img.src 会随加载状态变化（相对/绝对、带不带 query），
        // 用它当键会把一张图算成两条。真正稳定的是「配方 + 会话 + 官方 job id」。
        // 重 roll 会改写 tag（app.js:2167）并产生新 job id，因此旧图天然保留。
        var ctx = currentContext();
        var id = 'gen:' + shortHash(meta.tag) + ':' + ctx.chatId + ':' + (card.dataset.imageJobId || '');
        if (knownIds.has(id)) return;
        knownIds.add(id);
        enqueue(function () {
            return makeThumb(src).then(function (thumb) {
                return dbPut({
                    id: id,
                    kind: 'gen',
                    thumb: thumb.blob,
                    width: thumb.width,
                    height: thumb.height,
                    tag: meta.tag,
                    model: meta.model,
                    size: meta.size,
                    originUrl: maskUrl(src),
                    source: 'remote',
                    chatId: ctx.chatId,
                    characterId: ctx.characterId,
                    characterName: ctx.characterName,
                    messageIndex: -1,
                    imageIndex: -1,
                    createdAt: Date.now()
                });
            }).then(function (record) {
                if (!record.thumb) stats.thumbFailed++;
                if (records && !records.some(function (item) { return item.id === record.id; })) records.unshift(record);
                refreshCardSummary();
            });
        });
    }

    /* ============================================================
     * 六、采集：上传图（读官方 chatHistory）+ 生图（读 DOM 卡片）
     * ============================================================ */

    function collectUploadedFromHistory() {
        var history = currentHistory();
        if (!history.length) return;
        var ctx = currentContext();
        history.forEach(function (message, messageIndex) {
            if (!message) return;
            var attachments = message.imageAttachments;
            if (!Array.isArray(attachments) || !attachments.length) return;
            attachments.forEach(function (_, imageIndex) {
                recordUploadedImage(message, messageIndex, imageIndex, ctx);
            });
        });
    }

    var MD_IMAGE_PATTERN = /!\[[^\]]*\]\(\s*([^)\s]+)/g;
    var HTML_IMAGE_PATTERN = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;

    function matchAll(text, pattern) {
        var out = [];
        if (!text) return out;
        pattern.lastIndex = 0;
        var m;
        while ((m = pattern.exec(text)) !== null) {
            out.push(m[1]);
            if (m.index === pattern.lastIndex) pattern.lastIndex++;
        }
        return out;
    }

    function isUsableImageUrl(url) {
        var value = String(url || '').trim();
        if (!value) return false;
        if (window.RPImagePolicy.isUiUrl(value)) return false;
        if (/^data:image\//i.test(value)) return true;
        if (/^https?:\/\//i.test(value)) return true;
        // 相对路径也要收（有些卡会写 ./img/a.png）；只挡掉明显不是图片的来源。
        return !/^(#|javascript:|mailto:|tel:|blob:)/i.test(value);
    }

    /**
     * 正文里的插图：AI 回复常直接写 markdown 图片或 <img>，
     * 这类图既不在 imageAttachments 里，也不一定是生图卡片，只能从消息正文里抠。
     */
    function collectContentImagesFromHistory() {
        var history = currentHistory();
        if (!history.length) return;
        var ctx = currentContext();
        history.forEach(function (message, messageIndex) {
            if (!message) return;
            var content = String(message.content || '');
            if (!content) return;
            var urls = matchAll(content, MD_IMAGE_PATTERN).concat(matchAll(content, HTML_IMAGE_PATTERN));
            urls.forEach(function (url, imageIndex) {
                if (!isUsableImageUrl(url)) return;
                recordContentImage(url, messageIndex, imageIndex, ctx);
            });
        });
    }

    function recordContentImage(url, messageIndex, imageIndex, ctx) {
        var id = 'ct:' + ctx.chatId + ':' + messageIndex + ':' + shortHash(url);
        if (knownIds.has(id)) return;
        knownIds.add(id);
        enqueue(function () {
            return makeThumb(url).then(function (thumb) {
                return dbPut({
                    id: id,
                    kind: 'gen',
                    source: 'content',
                    thumb: thumb.blob,
                    width: thumb.width,
                    height: thumb.height,
                    tag: '',
                    model: '',
                    size: '',
                    originUrl: maskUrl(url),
                    chatId: ctx.chatId,
                    characterId: ctx.characterId,
                    characterName: ctx.characterName,
                    messageIndex: messageIndex,
                    imageIndex: imageIndex,
                    createdAt: Date.now()
                });
            }).then(function (record) {
                if (!record.thumb) stats.thumbFailed++;
                if (records && !records.some(function (item) { return item.id === record.id; })) records.unshift(record);
                refreshCardSummary();
            });
        });
    }

    function collectGeneratedFromDom() {
        // 不能只认 data-image-job-state="done"：重新打开会话时官方会把卡片重置为
        // loading 并重新发起任务，历史卡片会长期停在这个状态。只要 img 有 src 就说明
        // 图已经显示出来了，就该收。
        var cards = document.querySelectorAll('.generated-image-card');
        for (var i = 0; i < cards.length; i++) recordGeneratedImage(cards[i]);
    }

    var collectTimer = null;
    function scheduleCollect() {
        if (collectTimer) return;
        collectTimer = setTimeout(function () {
            collectTimer = null;
            try {
                collectUploadedFromHistory();
                collectContentImagesFromHistory();
                collectGeneratedFromDom();
            } catch (error) {
                console.warn('[图库] 采集调度失败:', error);
            }
        }, 800);
    }

    /* ============================================================
     * 七、样式（跟随官网主题令牌）
     * ============================================================ */

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '#' + OVERLAY_ID + '{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;',
            'background:var(--c-bg,#f9fafb);color:var(--c-text,#1f2937);}',
            '#' + OVERLAY_ID + ' *{box-sizing:border-box;}',
            '.rphub-gal-head{display:flex;align-items:center;gap:10px;padding:14px 16px;',
            'border-bottom:1px solid var(--c-border,#e5e7eb);background:var(--c-surface,#fff);flex:0 0 auto;}',
            '.rphub-gal-title{font-weight:700;font-size:15px;flex:1;min-width:0;}',
            '.rphub-gal-close,.rphub-gal-act{border:1px solid var(--c-border,#e5e7eb);background:var(--c-surface,#fff);',
            'color:var(--c-text,#1f2937);border-radius:10px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;}',
            '.rphub-gal-body{flex:1;min-height:0;overflow-y:auto;padding:12px 16px 28px;}',
            '.rphub-gal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}',
            '.rphub-gal-pick{flex:none;max-width:46%;min-width:0;border:1px solid var(--c-border,#e5e7eb);',
            'background:var(--c-surface,#fff);color:var(--c-text,#1f2937);border-radius:10px;',
            'padding:6px 8px;font-size:12px;font-weight:600;cursor:pointer;}',
            '@media(min-width:640px){.rphub-gal-grid{grid-template-columns:repeat(5,1fr);}}',
            '.rphub-gal-item{position:relative;padding-top:100%;border-radius:10px;overflow:hidden;',
            'background:var(--c-surface,#fff);border:1px solid var(--c-border,#e5e7eb);cursor:pointer;}',
            '.rphub-gal-item img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}',
            '.rphub-gal-item.is-picked{outline:3px solid var(--primary-500,#6366f1);outline-offset:-3px;}',
            '.rphub-gal-badge{position:absolute;left:6px;bottom:6px;right:6px;font-size:10px;line-height:1.3;',
            'color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.rphub-gal-empty{padding:48px 16px;text-align:center;color:var(--c-text-2,#6b7280);font-size:13px;line-height:1.9;}',
            '.rphub-gal-foot{flex:0 0 auto;padding:10px 16px;border-top:1px solid var(--c-border,#e5e7eb);',
            'background:var(--c-surface,#fff);font-size:12px;color:var(--c-text-2,#6b7280);}',
            '.rphub-gal-viewer{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.92);',
            'display:flex;flex-direction:column;}',
            '.rphub-gal-viewer img{flex:1;min-height:0;width:100%;object-fit:contain;}',
            '.rphub-gal-viewer-bar{display:flex;gap:8px;padding:12px 16px;flex-wrap:wrap;justify-content:center;}',
            '.rphub-gal-viewer-bar button{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);',
            'color:#fff;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;}',
            '#rphub-gallery-card .rphub-gal-stat{margin-top:6px;font-size:12px;color:var(--c-text-2,#6b7280);}'
        ].join('');
        (document.head || document.documentElement).appendChild(style);
    }

    /* ============================================================
     * 八、导航抽屉入口
     * ============================================================ */

    function cardSummaryText(list) {
        if (!list || !list.length) return '还没有收录图片。打开聊天或生成图片后会自动收录。';
        var gen = list.filter(function (item) { return item.kind === 'gen'; }).length;
        var up = list.length - gen;
        var bytes = 0;
        list.forEach(function (item) { bytes += (item.thumb && item.thumb.size) || 0; });
        return '已收录 ' + list.length + ' 张（生图 ' + gen + ' · 上传 ' + up + '）· 缩略图占用 ' + formatBytes(bytes);
    }

    function formatBytes(bytes) {
        var value = Number(bytes) || 0;
        if (value < 1024) return value + ' B';
        if (value < 1024 * 1024) return (value / 1024).toFixed(0) + ' KB';
        return (value / 1024 / 1024).toFixed(1) + ' MB';
    }

    function refreshCardSummary() {
        var stat = document.querySelector('#' + NAV_ITEM_ID + ' .rphub-gal-stat');
        if (!stat) return;
        loadRecords().then(function (list) {
            if (stat.isConnected) stat.textContent = cardSummaryText(list);
        });
    }

    // 2.8.118 places the gallery before backup and repairs its position after a menu rerender.
    var NAV_ANCHOR_LABELS = ['数据与备份', '数据备份', '灯塔', '在线时长'];

    function mountNavItem() {
        if (window.RPThemePacks.current !== 'classic') return;
        var existing = document.getElementById(NAV_ITEM_ID);
        var items = document.querySelectorAll('.app-navigation-grid .app-navigation-item');
        var target = null;
        var tail = null;
        for (var i = 0; i < items.length; i++) {
            if (existing && items[i] === existing) continue;
            var spans = items[i].querySelectorAll('span');
            var text = spans.length ? String(spans[spans.length - 1].textContent || '').trim() : '';
            if (NAV_ANCHOR_LABELS.indexOf(text) >= 0) { target = items[i]; break; }
            tail = items[i];
        }
        if (existing && existing.isConnected && target && existing.nextElementSibling === target) return;
        if (existing && existing.isConnected && !target) return;
        if (existing && existing.isConnected) existing.remove();
        if (!target && !tail) return;

        ensureStyle();
        var btn = (target || tail).cloneNode(true);
        btn.id = NAV_ITEM_ID;
        btn.removeAttribute('aria-current');
        btn.classList.remove('is-current');
        var clonedSpans = btn.querySelectorAll('span');
        if (clonedSpans.length) clonedSpans[clonedSpans.length - 1].textContent = '图片管理';
        var path = btn.querySelector('svg path');
        if (path) path.setAttribute('d', ICON_PATH);
        var dot = btn.querySelector('.app-navigation-status');
        if (dot) dot.remove();

        // 捕获阶段截住：克隆节点本就没有官方的 selectView 监听，这里再兜一层，
        // 顺手把抽屉关掉，避免浮层盖在还开着的菜单上。
        btn.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            var closer = document.querySelector('.app-navigation-close');
            if (closer) { try { closer.click(); } catch (error) { /* 忽略 */ } }
            openGallery();
        }, true);

        if (target) target.parentElement.insertBefore(btn, target);
        else tail.parentElement.appendChild(btn);
    }

    /* ============================================================
     * 九、图库浮层
     * ============================================================ */

    // 顶栏下拉框选中的角色卡；空串 = 全部。
    var activeCharacterId = '';

    function filteredRecords(list) {
        // 不再按生图 / 上传分档（上传图占比极低），只按顶栏选中的角色卡过滤。
        var all = list || [];
        if (!activeCharacterId) return all;
        return all.filter(function (record) {
            return String(record.characterId || '') === activeCharacterId;
        });
    }

    // 选项按收录张数从多到少排，常用的角色排前面。
    function characterOptions(list) {
        var order = [];
        var map = Object.create(null);
        (list || []).forEach(function (record) {
            var key = String(record.characterId || '');
            var bucket = map[key];
            if (!bucket) {
                bucket = map[key] = {
                    key: key,
                    name: String(record.characterName || '').trim() || '未关联角色',
                    count: 0
                };
                order.push(bucket);
            }
            bucket.count++;
        });
        order.sort(function (a, b) { return b.count - a.count; });
        return order;
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    // 每次渲染重建选项：新收录的图会带出新角色卡，被删空的角色也要从列表里退场。
    function syncCharacterPicker(list) {
        var pick = document.querySelector('.rphub-gal-head .rphub-gal-pick');
        if (!pick) return;
        var options = characterOptions(list);
        if (activeCharacterId && !options.some(function (item) { return item.key === activeCharacterId; })) {
            activeCharacterId = '';
        }
        var html = ['<option value="">全部角色（' + ((list && list.length) || 0) + ' 张）</option>'];
        options.forEach(function (item) {
            html.push('<option value="' + escapeHtml(item.key) + '">'
                + escapeHtml(item.name) + '（' + item.count + ' 张）</option>');
        });
        pick.innerHTML = html.join('');
        pick.value = activeCharacterId;
    }

    function renderGrid() {
        var grid = document.querySelector('#rphub-gal-body .rphub-gal-grid');
        var empty = document.querySelector('#rphub-gal-body .rphub-gal-empty');
        if (!grid) return;
        loadRecords().then(function (list) {
            syncCharacterPicker(list);
            var items = filteredRecords(list);
            // 先清空 DOM 再回收 URL：反过来的话正在显示的图会先变破图。
            grid.innerHTML = '';
            releaseObjectUrls();
            if (empty) {
                empty.style.display = items.length ? 'none' : 'block';
                // 空的时候把「到底卡在哪一步」写出来，省得只能靠猜。
                if (!items.length) empty.innerHTML = emptyStateHtml(list);
            }
            items.forEach(function (record) {
                grid.appendChild(buildItem(record));
            });
            updateFoot(list);
        });
    }

    function emptyStateHtml(list) {
        var state = getVueState();
        if (!state) return '读不到应用状态，页面可能还没初始化完。<br>稍等几秒再打开一次。';
        var history = currentHistory();
        var uploads = 0;
        var contentImages = 0;
        var imageTags = 0;
        history.forEach(function (message) {
            if (!message) return;
            if (Array.isArray(message.imageAttachments)) uploads += message.imageAttachments.length;
            var content = String(message.content || '');
            if (!content) return;
            contentImages += matchAll(content, MD_IMAGE_PATTERN).length + matchAll(content, HTML_IMAGE_PATTERN).length;
            var tagPattern = /image###/g;
            while (tagPattern.exec(content) !== null) imageTags++;
        });
        var genCards = document.querySelectorAll('.generated-image-card').length;
        var doneCards = document.querySelectorAll('.generated-image-card[data-image-job-state="done"]').length;
        var loadingCards = document.querySelectorAll('.generated-image-card[data-image-job-state="loading"]').length;
        var lines = ['当前会话 ' + history.length + ' 条消息 · 上传图 ' + uploads + ' · 正文图片 ' + contentImages
            + ' · 生图标记 ' + imageTags + ' · 生图卡片 ' + genCards
            + '（完成 ' + doneCards + ' / 加载中 ' + loadingCards + '）· 已收录 ' + ((list && list.length) || 0) + ' 张'];
        lines.push('采集统计：入库 ' + stats.done + ' · 缩略图失败 ' + stats.thumbFailed + ' · 无图地址 ' + stats.noSrc
            + ' · 队列 ' + collectQueue.length);
        if (!history.length) {
            lines.push('还没读到消息，可能仍在从本地库加载，稍后再打开一次。');
        } else if (!uploads && !contentImages && !imageTags && !genCards) {
            lines.push('这个会话里确实没有检出任何图片。如果聊天里明明有图却显示为 0，<br>把这一行发我，说明图片存的地方不在已知的几种形态里。');
        } else if (!list || !list.length) {
            var stuck = stats.done === 0 && (genCards > 0 || imageTags > 0);
            lines.push(stuck
                ? '检出了图片但采集没有推进：队列可能被某一张卡住，或缩略图连续失败。'
                : '检出了图片但没能写入图库：' + (lastError || '未知原因'));
        }
        if (lastError && list && list.length) lines.push('最近一次采集错误：' + lastError);
        return lines.join('<br>');
    }

    // 缩略图是 Blob，每次显示都要 createObjectURL。renderGrid 会因为「每收一张就刷新」
    // 被反复调用，不回收的话 URL 会一直堆着不放，长时间使用内存只涨不降。
    var activeObjectUrls = [];

    function trackObjectUrl(url) {
        if (url) activeObjectUrls.push(url);
        return url;
    }

    function releaseObjectUrls() {
        activeObjectUrls.forEach(function (url) {
            try { URL.revokeObjectURL(url); } catch (error) { /* 忽略 */ }
        });
        activeObjectUrls = [];
    }

    function objectUrlForThumb(blob) {
        return blob ? trackObjectUrl(URL.createObjectURL(blob)) : '';
    }

    function buildItem(record) {
        var item = document.createElement('div');
        item.className = 'rphub-gal-item' + (selectedIds && selectedIds.has(record.id) ? ' is-picked' : '');
        item.dataset.id = record.id;
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = record.tag || '图片';
        if (record.thumb) img.src = objectUrlForThumb(record.thumb);
        // 缩略图没生成成功时回落到远端原图：宁可慢一点，也别在格子里显示空白。
        else if (record.originUrl) img.src = resolveUrl(record.originUrl);
        item.appendChild(img);
        if (record.tag) {
            var badge = document.createElement('div');
            badge.className = 'rphub-gal-badge';
            badge.textContent = record.tag.split(',')[0];
            item.appendChild(badge);
        }
        item.addEventListener('click', function () {
            if (selectedIds) {
                if (selectedIds.has(record.id)) selectedIds.delete(record.id);
                else selectedIds.add(record.id);
                item.classList.toggle('is-picked');
                updateFoot(records || []);
                return;
            }
            openViewer(record);
        });
        var holdTimer = null;
        item.addEventListener('touchstart', function () {
            holdTimer = setTimeout(function () {
                if (!selectedIds) { selectedIds = new Set(); }
                selectedIds.add(record.id);
                item.classList.add('is-picked');
                updateFoot(records || []);
            }, 480);
        }, { passive: true });
        ['touchend', 'touchmove', 'touchcancel'].forEach(function (name) {
            item.addEventListener(name, function () { if (holdTimer) clearTimeout(holdTimer); }, { passive: true });
        });
        return item;
    }

    function updateFoot(list) {
        var bar = document.querySelector('.rphub-gal-foot');
        if (!bar) return;
        var items = filteredRecords(list || []);
        var picked = selectedIds ? selectedIds.size : 0;
        if (picked) {
            bar.textContent = '已选 ' + picked + ' 张 · 点「导出」打包下载，或「删除」移出图库';
            return;
        }
        var bytes = 0;
        items.forEach(function (record) { bytes += (record.thumb && record.thumb.size) || 0; });
        bar.textContent = '共 ' + items.length + ' 张 · 缩略图占用 ' + formatBytes(bytes)
            + ' · 长按多选 · 往上翻聊天记录可收录更多';
    }

    function openViewer(record) {
        var viewer = document.createElement('div');
        viewer.className = 'rphub-gal-viewer';
        // 预览自己持有一个临时 URL，关掉就释放；不要去共享 renderGrid 的那批。
        var previewUrl = '';
        var url;
        if (record.kind === 'upload' && record.thumb) {
            previewUrl = URL.createObjectURL(record.thumb);
            url = previewUrl;
        } else {
            url = resolveUrl(record.originUrl);
        }
        var img = document.createElement('img');
        img.alt = record.tag || '图片';
        img.src = url;
        viewer.appendChild(img);

        var closeViewer = function () {
            viewer.remove();
            if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch (error) { /* 忽略 */ } }
        };
        viewer.__rphubClose = closeViewer;

        var bar = document.createElement('div');
        bar.className = 'rphub-gal-viewer-bar';
        bar.innerHTML = [
            '<button type="button" data-act="save">存到相册</button>',
            record.tag ? '<button type="button" data-act="copy">复制配方</button>' : '',
            '<button type="button" data-act="delete">删除</button>',
            '<button type="button" data-act="close">关闭</button>'
        ].join('');
        viewer.appendChild(bar);
        document.body.appendChild(viewer);

        bar.addEventListener('click', function (event) {
            var action = event.target && event.target.dataset ? event.target.dataset.act : '';
            if (!action) return;
            if (action === 'close') { closeViewer(); return; }
            if (action === 'copy') {
                copyText(record.tag);
                return;
            }
            if (action === 'save') {
                saveRecordToAlbum(record);
                return;
            }
            if (action === 'delete') {
                deleteRecords([record.id]).then(function () {
                    closeViewer();
                    renderGrid();
                    refreshCardSummary();
                });
            }
        });
    }

    function copyText(text) {
        if (!text) return;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text);
            } else {
                var input = document.createElement('textarea');
                input.value = text;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                input.remove();
            }
            toast('已复制配方');
        } catch (error) {
            toast('复制失败');
        }
    }

    function toast(message) {
        var el = document.createElement('div');
        el.textContent = message;
        el.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:2147483002;'
            + 'background:rgba(17,24,39,.92);color:#fff;padding:9px 16px;border-radius:999px;font-size:13px;'
            + 'pointer-events:none;max-width:80vw;text-align:center;';
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 1800);
    }

    function saveRecordToAlbum(record) {
        if (window.RPImageDownload) {
            var source = record.kind === 'upload' ? record.thumb : resolveUrl(record.originUrl);
            if (!source) { toast('没有可保存的图片'); return; }
            window.RPImageDownload.run(source, { name: 'RP图片' }).catch(function () {});
            return;
        }
        var bridge = window.AndroidBridge;
        // 上传图走 base64 直传（缩略图本来就小），远端图直接给 URL 让原生去拉，
        // 这里不需要再创建 objectURL。
        var url = record.kind === 'upload' ? '' : resolveUrl(record.originUrl);
        var name = 'rphub-' + Date.now() + '.png';
        try {
            if (bridge && typeof bridge.saveImageFromUrl === 'function' && record.kind !== 'upload') {
                bridge.saveImageFromUrl(url, name, 'image/png');
                toast('已保存到相册');
                return;
            }
            if (bridge && typeof bridge.saveImageToGallery === 'function' && record.thumb) {
                // 没有原图时退回缩略图：体积小、足够分享。
                var reader = new FileReader();
                reader.onload = function () {
                    var base64 = String(reader.result || '').split(',')[1] || '';
                    bridge.saveImageToGallery(base64, name, 'image/webp');
                    toast('已保存到相册');
                };
                reader.readAsDataURL(record.thumb);
                return;
            }
        } catch (error) {
            console.warn('[图库] 保存失败:', error);
        }
        toast('当前环境不支持保存');
    }

    function deleteRecords(ids) {
        return Promise.all(ids.map(function (id) { return dbDelete(id); })).then(function () {
            if (records) {
                records = records.filter(function (item) { return ids.indexOf(item.id) === -1; });
            }
            // 删过的 id 也从去重集合里摘掉，否则同一张图删了就再也收不回来。
            ids.forEach(function (id) { knownIds.delete(id); });
            if (selectedIds) {
                ids.forEach(function (id) { selectedIds.delete(id); });
            }
        });
    }

    function exportSelected() {
        if (!selectedIds || !selectedIds.size) { toast('先长按选中图片'); return; }
        var list = (records || []).filter(function (item) { return selectedIds.has(item.id); });
        if (!list.length) return;
        if (typeof JSZip !== 'function') { toast('导出组件未就绪'); return; }
        toast('正在打包 ' + list.length + ' 张…');
        var zip = new JSZip();
        var tasks = list.map(function (record, index) {
            var name = 'image-' + String(index + 1).padStart(3, '0') + '.webp';
            return fetchThumbBlob(record).then(function (blob) {
                if (blob) zip.file(name, blob);
            }).catch(function () { /* 单张失败不阻塞整体 */ });
        });
        Promise.all(tasks).then(function () {
            return zip.generateAsync({ type: 'base64' });
        }).then(function (base64) {
            var bridge = window.AndroidBridge;
            if (bridge && typeof bridge.saveFile === 'function') {
                bridge.saveFile(base64, 'rphub-gallery-' + Date.now() + '.zip', 'application/zip');
            } else {
                toast('当前环境不支持导出');
            }
        }).catch(function (error) {
            console.warn('[图库] 导出失败:', error);
            toast('导出失败');
        });
    }

    function fetchThumbBlob(record) {
        if (record.thumb) return Promise.resolve(record.thumb);
        return Promise.resolve(null);
    }

    function openGallery() {
        ensureStyle();
        var existing = document.getElementById(OVERLAY_ID);
        if (existing) { existing.remove(); releaseObjectUrls(); return; }

        // 打开即扫一遍当前会话：图片本来就在消息里，不主动过一遍的话用户看到的是空库。
        try {
            collectUploadedFromHistory();
            collectContentImagesFromHistory();
            collectGeneratedFromDom();
        } catch (error) { /* 采集失败不影响打开 */ }

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.innerHTML = [
            '<div class="rphub-gal-head">',
            '  <div class="rphub-gal-title">🖼 图片库</div>',
            '  <select class="rphub-gal-pick" aria-label="按角色卡筛选"></select>',
            '  <button type="button" class="rphub-gal-act" data-act="export">导出</button>',
            '  <button type="button" class="rphub-gal-close" data-act="close">关闭</button>',
            '</div>',
            '<div class="rphub-gal-body" id="rphub-gal-body">',
            '  <div class="rphub-gal-grid"></div>',
            '  <div class="rphub-gal-empty">正在读取…</div>',
            '</div>',
            '<div class="rphub-gal-foot"></div>'
        ].join('');
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.dataset) return;
            if (target.dataset.act === 'close') { overlay.remove(); releaseObjectUrls(); return; }
            if (target.dataset.act === 'export') { exportSelected(); return; }
        });

        var pick = overlay.querySelector('.rphub-gal-pick');
        if (pick) {
            pick.addEventListener('change', function () {
                activeCharacterId = pick.value || '';
                renderGrid();
            });
        }

        selectedIds = null;
        loadRecords().then(function (list) {
            renderGrid();
            updateFoot(list);
        });
    }

    /* ============================================================
     * 十、注入维持 + 启动
     * ============================================================ */

    function tick() {
        try {
            mountNavItem();
            scheduleCollect();
        } catch (error) {
            console.warn('[图库] 注入失败:', error);
        }
    }

    function start() {
        ensureStyle();
        tick();
        // 启动那一刻 chatHistory 往往还没从 IndexedDB 载入，隔几秒再补一次。
        setTimeout(tick, 1500);
        setTimeout(tick, 4000);
        // 聊天页消息流高频变动：用脏标记合并，避免 observer 自己把自己拖死。
        var observer = new MutationObserver(function () {
            if (observerTimer) return;
            observerTimer = setTimeout(function () {
                observerTimer = null;
                tick();
            }, 500);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        // 定时兜底：只靠 MutationObserver 的话，聊天区稳定不动时永远采不到上传图。
        setInterval(function () {
            if (document.hidden) return;
            try {
                collectUploadedFromHistory();
                collectContentImagesFromHistory();
                collectGeneratedFromDom();
            } catch (error) {
                console.warn('[图库] 定时采集失败:', error);
            }
        }, 12000);
        console.info('[图库] 已加载');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    // 供调试与后续扩展（导出、批量操作）使用
    window.RPHubImageGallery = Object.freeze({
        open: openGallery,
        records: function () { return loadRecords(); },
        collect: function () { collectUploadedFromHistory(); collectContentImagesFromHistory(); collectGeneratedFromDom(); },
        stats: function () {
            return {
                done: stats.done,
                thumbFailed: stats.thumbFailed,
                noSrc: stats.noSrc,
                lastError: lastError,
                objectUrls: activeObjectUrls.length
            };
        },
        clear: function () {
            return loadRecords().then(function (list) {
                return Promise.all(list.map(function (item) { return dbDelete(item.id); }));
            }).then(function () {
                records = [];
                knownIds.clear();
                renderGrid();
                refreshCardSummary();
            });
        }
    });
})();
