/**
 * RP-Hub 向量缓存（rphub-embedding-cache）
 *
 * 作用：把 /embeddings 的响应按「站点 + 模型 + 输入」缓存到 IndexedDB，命中直接合成响应，
 *      零请求、零计费。对官网完全透明——它只读 response.ok / status / headers.get / text()。
 *
 * 为什么走 fetch 钩子，而不是加一条补丁规则：
 *   api-utils.js 里是 `await fetch(options.url, {...})`，无前缀的全局查找、调用时才解析。
 *   替换 window.fetch 就能拦住官网所有请求，一行官网代码都不用改 ⇒ 补丁清单不动 ⇒ 门禁不动
 *   ⇒ 不会因为新增规则把 extraMissing 顶到 MAX_MISSING_ANCHORS(3)。
 *   官网改版时最坏结果是钩子失效、缓存静默不生效，不会白屏、不会失配。
 *
 * 自包含：不依赖 Vue、不依赖 sakura-features.js、任何异常都退回原生 fetch。
 * 紧急关闭：localStorage['rphub_embedding_cache_off'] = '1'（下一个页面加载生效）
 */
(function () {
    'use strict';

    var G = window;
    if (G.__rphubEmbeddingCacheLoaded) return;
    G.__rphubEmbeddingCacheLoaded = true;

    // ==================== 常量 ====================
    var DB_NAME = 'RPHubEmbeddingCacheV1';
    var DB_VERSION = 1;
    var STORE = 'vectors';
    var IDX_UPDATED = 'updatedAt';

    // 上限：条目数 + 总字节。两个都要，因为单条体积差 10 倍以上
    // （单条总结向量 ~13 KB，16 条一批 ~200 KB）。
    // 允许用 localStorage 覆盖，便于自测与现场调参（不设就用默认值）。
    function readLimit(key, def) {
        try {
            var raw = localStorage.getItem(key);
            if (raw === null) return def;
            var n = parseInt(raw, 10);
            return (isFinite(n) && n > 0) ? n : def;
        } catch (_) { return def; }
    }
    var MAX_ENTRIES = readLimit('rphub_embedding_cache_max_entries', 3000);
    var MAX_BYTES = readLimit('rphub_embedding_cache_max_bytes', 32 * 1024 * 1024);
    // 单条超过这个体积直接不缓存：多半是异常响应（比如整库重算的超大批次），
    // 存进去会把上限瞬间吃掉，收益却极低。
    var MAX_ENTRY_BYTES = 2 * 1024 * 1024;

    // 计数器放 localStorage：同步读、启动零成本。
    // 允许漂移——漂低了只是多缓存一点，不是正确性问题；stats() 里有权威重算。
    var K_COUNT = 'rphub_embedding_cache_count';
    var K_BYTES = 'rphub_embedding_cache_bytes';
    var K_OFF = 'rphub_embedding_cache_off';

    var HIT_LOG_LIMIT = 20;   // 每次页面加载最多打 20 条命中日志，之后闭嘴
    var HIT_LOG_INTERVAL = 3000;

    // ==================== 状态 ====================
    var _dbPromise = null;
    var _hits = 0;
    var _misses = 0;
    var _logged = 0;
    var _lastLogAt = 0;
    var _evicting = false;
    var _evictPending = false;
    var _installed = false;
    var _nativeFetch = null;
    // 连续打开失败 / 一直不回调时直接放弃本页的缓存。
    // 背景：WebView 里 IndexedDB 会因为「另一个 context 正在 upgrade」而 onblocked，
    // 那个 open 请求可能**永远不回调**。任何 await 在它上面的路径都会把官方请求一起挂住，
    // 表现就是「发一条消息卡两分钟然后报 API 超时」。宁可这次不缓存，也绝不能拖住请求。
    var _openFails = 0;
    var _disabled = false;
    var MAX_OPEN_FAILS = 3;

    // 读缓存最多等这么久，超时就当未命中走网络。
    // 单条 get 正常在 5 ms 内，200 ms 已经是 40 倍余量。
    var READ_TIMEOUT_MS = 200;
    // open 自己的看门狗。比 READ_TIMEOUT_MS 长一点，好让「读超时」先发生
    // （读超时只是这次不缓存），之后看门狗再记账；连续 MAX_OPEN_FAILS 次就整页放弃缓存。
    // 没有这个看门狗的话，open 永不回调时 _dbPromise 会永久 pending：
    // 每次请求都白等 200 ms，而且永远凑不满 MAX_OPEN_FAILS，_disabled 一辈子不触发。
    var OPEN_TIMEOUT_MS = 500;
    // 写缓存不参与响应路径（见 install 里的 cacheWriteAsync），这里只是兜底上限。
    var WRITE_TIMEOUT_MS = 4000;
    // 全库扫描（recount）要走完所有条目，不能按单条读的 200 ms 卡。
    // 3000 条 × 每条 ~13 KB 的游标扫完通常 < 300 ms，3 s 是 10 倍余量。
    var SCAN_TIMEOUT_MS = 3000;

    function withTimeout(promise, ms, fallback) {
        return new Promise(function (resolve) {
            var settled = false;
            var timer = setTimeout(function () {
                if (settled) return;
                settled = true;
                resolve(fallback);
            }, ms);
            Promise.resolve(promise).then(function (v) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(v);
            }, function () {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(fallback);
            });
        });
    }

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);
            console.info.apply(console, ['[RPHubEmb]'].concat(args));
        } catch (_) { /* 日志失败不影响主流程 */ }
    }

    function warn() {
        try {
            var args = Array.prototype.slice.call(arguments);
            console.warn.apply(console, ['[RPHubEmb]'].concat(args));
        } catch (_) {}
    }

    function isOff() {
        try { return localStorage.getItem(K_OFF) === '1'; } catch (_) { return false; }
    }

    // ==================== IndexedDB ====================
    function openDB() {
        if (_disabled) return Promise.reject(new Error('cache disabled'));
        if (_dbPromise) return _dbPromise;
        _dbPromise = withTimeout(new Promise(function (resolve, reject) {
            var req;
            try { req = indexedDB.open(DB_NAME, DB_VERSION); }
            catch (e) { reject(e); return; }
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                var store;
                if (!db.objectStoreNames.contains(STORE)) {
                    store = db.createObjectStore(STORE, { keyPath: 'key' });
                } else {
                    store = e.target.transaction.objectStore(STORE);
                }
                if (!store.indexNames.contains(IDX_UPDATED)) {
                    store.createIndex(IDX_UPDATED, IDX_UPDATED, { unique: false });
                }
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
            req.onblocked = function () { reject(new Error('blocked')); };
        }), OPEN_TIMEOUT_MS, null).then(function (db) {
            // withTimeout 超时给的是 null；转成 rejection，让下面那个 catch
            // 统一走「打开失败」的计数与放弃逻辑。
            if (!db) throw new Error('open timeout');
            return db;
        });
        // 打开失败别把 Promise 永久钉在 rejected 状态：清掉，下次还能重试；
        // 连续失败 MAX_OPEN_FAILS 次就整页放弃缓存（见 _disabled 的注释）。
        _dbPromise.catch(function () {
            _dbPromise = null;
            _openFails += 1;
            if (_openFails >= MAX_OPEN_FAILS && !_disabled) {
                _disabled = true;
                warn('IndexedDB 连续 ' + _openFails + ' 次不可用，本页关闭向量缓存');
            }
        });
        return _dbPromise;
    }

    function readEntry(key) {
        if (_disabled) return Promise.resolve(null);
        return withTimeout(openDB().then(function (db) {
            return new Promise(function (resolve) {
                var tx = db.transaction(STORE, 'readonly');
                var req = tx.objectStore(STORE).get(key);
                req.onsuccess = function () { resolve(req.result || null); };
                req.onerror = function () { resolve(null); };
            });
        }), READ_TIMEOUT_MS, null);
    }

    function bumpCounters(dCount, dBytes) {
        try {
            var c = parseInt(localStorage.getItem(K_COUNT) || '0', 10) || 0;
            var b = parseInt(localStorage.getItem(K_BYTES) || '0', 10) || 0;
            c = Math.max(0, c + dCount);
            b = Math.max(0, b + dBytes);
            localStorage.setItem(K_COUNT, String(c));
            localStorage.setItem(K_BYTES, String(b));
        } catch (_) {}
    }

    function writeEntry(record) {
        if (_disabled) return Promise.resolve(false);
        return withTimeout(openDB().then(function (db) {
            return new Promise(function (resolve) {
                var tx = db.transaction(STORE, 'readwrite');
                var store = tx.objectStore(STORE);
                var req = store.put(record);
                req.onsuccess = function () { resolve(true); };
                req.onerror = function () { resolve(false); };
                tx.oncomplete = function () { resolve(true); };
                tx.onerror = function () { resolve(false); };
                tx.onabort = function () { resolve(false); };
            });
        }), WRITE_TIMEOUT_MS, false);
    }

    // 后台写入：读 clone 的 body → 校验 → 剥 usage → 落库 → 计数 → 视情况淘汰。
    // 整条链完全脱离响应路径，任何一步失败都只是「这次没缓存上」。
    function cacheWriteAsync(clone, job, key) {
        var expected = job.inputs.length;
        Promise.resolve(clone.text()).then(function (text) {
            if (!isValidPayload(text, expected)) return null;
            var clean = stripUsage(text);
            var size = byteLen(clean);
            if (size > MAX_ENTRY_BYTES) return null;
            var record = {
                key: key,
                payload: clean,
                model: job.model,
                dim: 0,
                apiUrl: job.scope,
                bytes: size,
                updatedAt: Date.now()
            };
            try {
                var parsed = JSON.parse(clean);
                if (parsed && parsed.data && parsed.data[0] && Array.isArray(parsed.data[0].embedding)) {
                    record.dim = parsed.data[0].embedding.length;
                }
            } catch (_) {}
            return writeEntry(record).then(function (ok) {
                if (ok) {
                    bumpCounters(1, size);
                    evictIfNeeded();
                }
                return ok;
            });
        }).catch(function () { return null; });
    }

    // 按 updatedAt 升序删最旧的，删到低于上限为止。
    // 用索引游标而不是 getAll：条目上万时 getAll 会把整库读进内存。
    //
    // 两个坑（都跟「写缓存改成了后台跑」有关，写变并发之后才暴露）：
    //   ① 不能在进循环前把 needCount 算死。写缓存是并发的，算死的那一刻到真正删之间
    //      又写进来几条，这几条就永远轮不到被删 —— 上限被一点点顶穿，而且自愈极慢。
    //      改成边删边按「预计剩余」判断，多写进来几条也会一起删掉。
    //   ② 淘汰正在跑的时候又来一次淘汰请求，不能直接 return 丢掉。
    //      丢掉的那次携带的「超出量」就没人处理了。记 _evictPending，跑完再补一轮。
    function evictIfNeeded(retry) {
        if (_disabled) return;
        if (_evicting) {
            _evictPending = true;
            return;
        }
        retry = retry || 0;
        var count = 0;
        var bytes = 0;
        try {
            count = parseInt(localStorage.getItem(K_COUNT) || '0', 10) || 0;
            bytes = parseInt(localStorage.getItem(K_BYTES) || '0', 10) || 0;
        } catch (_) { return; }
        if (count <= MAX_ENTRIES && bytes <= MAX_BYTES) return;

        _evicting = true;

        openDB().then(function (db) {
            return new Promise(function (resolve) {
                var tx = db.transaction(STORE, 'readwrite');
                var idx = tx.objectStore(STORE).index(IDX_UPDATED);
                var removed = 0;
                var removedBytes = 0;
                var cursorReq = idx.openCursor();
                cursorReq.onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (!cursor) return;
                    // 预计剩余还在上限内就停手
                    if (count - removed <= MAX_ENTRIES && bytes - removedBytes <= MAX_BYTES) return;
                    var rec = cursor.value || {};
                    var size = rec.bytes || 0;
                    cursor.delete();
                    removed += 1;
                    removedBytes += size;
                    cursor.continue();
                };
                tx.oncomplete = function () {
                    bumpCounters(-removed, -removedBytes);
                    if (removed > 0) {
                        log('淘汰最旧 ' + removed + ' 条 / ' + Math.round(removedBytes / 1024) + ' KB');
                    }
                    resolve(removed);
                };
                tx.onerror = function () { resolve(0); };
                tx.onabort = function () { resolve(0); };
            });
        }).catch(function () {
            return 0;
        }).then(function (removed) {
            _evicting = false;
            var pending = _evictPending;
            _evictPending = false;
            // removed > 0 说明刚删过东西，计数可能又因为并发写入重新超出 ⇒ 复查一轮；
            // pending 说明有请求被合并掉了 ⇒ 补跑。retry 上限防止在库读不出来时无限递归。
            if ((pending || removed > 0) && retry < 8) evictIfNeeded(retry + 1);
        });
        // 兜底：事务如果永远不 complete，_evicting 会永久为 true，
        // 之后所有淘汰都被跳过 ⇒ 缓存无限增长。到点强制解锁。
        setTimeout(function () { _evicting = false; }, 8000);
    }

    function resetCounters() {
        try {
            localStorage.setItem(K_COUNT, '0');
            localStorage.setItem(K_BYTES, '0');
        } catch (_) {}
    }

    function clearAll() {
        // 库都打不开的时候也就没有条目可清。直接把计数器归零，
        // 免得面板一直显示旧数字（用户点了清空却看到数字不变，会以为按钮坏了）。
        if (_disabled) {
            resetCounters();
            _hits = 0;
            _misses = 0;
            return Promise.resolve(true);
        }
        return withTimeout(openDB().then(function (db) {
            return new Promise(function (resolve) {
                var tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).clear();
                tx.oncomplete = function () {
                    resetCounters();
                    _hits = 0;
                    _misses = 0;
                    resolve(true);
                };
                tx.onerror = function () { resolve(false); };
                // abort 不监听的话，事务被浏览器中止时这个 Promise 永远不 settle，
                // 设置页那颗按钮就永久卡在「清空中…」。
                tx.onabort = function () { resolve(false); };
            });
        }), WRITE_TIMEOUT_MS, false).catch(function () { return false; });
    }

    // 权威重算：只有用户主动看统计时才跑，别放进热路径
    function recount() {
        if (_disabled) return Promise.resolve({ count: 0, bytes: 0 });
        return withTimeout(openDB().then(function (db) {
            return new Promise(function (resolve) {
                var tx = db.transaction(STORE, 'readonly');
                var req = tx.objectStore(STORE).openCursor();
                var c = 0;
                var b = 0;
                req.onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (!cursor) return;
                    c += 1;
                    b += (cursor.value && cursor.value.bytes) || 0;
                    cursor.continue();
                };
                tx.oncomplete = function () {
                    try {
                        localStorage.setItem(K_COUNT, String(c));
                        localStorage.setItem(K_BYTES, String(b));
                    } catch (_) {}
                    resolve({ count: c, bytes: b });
                };
                tx.onerror = function () { resolve({ count: 0, bytes: 0 }); };
                tx.onabort = function () { resolve({ count: 0, bytes: 0 }); };
            });
        }).catch(function () { return { count: 0, bytes: 0 }; }), SCAN_TIMEOUT_MS, { count: 0, bytes: 0 });
    }

    // ==================== 键与校验 ====================

    // djb2：把「站点+模型+完整输入」压成短键。IndexedDB 键太长既慢又占空间。
    // 正反各算一次 + 长度前缀，能挡掉绝大多数碰撞。
    function djb2(str) {
        var h = 5381;
        var s = String(str || '');
        for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
        return (h >>> 0).toString(36);
    }

    function reverseStr(s) {
        var out = '';
        for (var i = s.length - 1; i >= 0; i--) out += s.charAt(i);
        return out;
    }

    // 官方 app.js:5407 的写法是
    //   input: normalizedInputs.length === 1 ? normalizedInputs[0] : normalizedInputs
    // 单条时是字符串、多条时是数组。不归一化的话，同一个输入会算出两个不同的键，
    // 命中率直接腰斩。这里统一成数组。
    function normalizeInputs(body) {
        if (!body) return null;
        var raw = body.input;
        if (typeof raw === 'string') return [raw];
        if (Array.isArray(raw)) {
            var out = [];
            for (var i = 0; i < raw.length; i++) {
                var item = raw[i];
                out.push(typeof item === 'string' ? item : String((item && (item.text || item.input)) || ''));
            }
            return out;
        }
        return null;
    }

    function buildKey(scope, model, inputs) {
        var identity = JSON.stringify([scope, model, inputs]);
        return 'emb:' + identity.length + ':' + djb2(identity) + ':' + djb2(reverseStr(identity));
    }

    // 五重校验。看着啰嗦，但这是唯一一道防线：
    // 官网 app.js:5413~5424 自己也会校验并抛「嵌入接口返回的数据不完整」——
    // 可它校验的是**当次响应**。我们把响应存进缓存之后，下次命中直接绕过网络，
    // 官网那个校验根本不会跑在缓存数据上。半截响应（中转站超时只回 3 条 / 请求 16 条）
    // 会被 quantizeEmbeddingForStorage 量化后写进记忆库，packed.some(v => !v) 也不一定报错，
    // 最后就是维度对不上、cosineSimilarity 算出越界值 —— 不报错、召回悄悄变差、极难察觉。
    // 所以校验必须在写缓存之前，坏数据永远进不去。
    function isValidPayload(text, expectedCount) {
        try {
            var data = JSON.parse(String(text || ''));
            if (!data || !Array.isArray(data.data)) return false;
            if (data.data.length !== expectedCount) return false;
            var seen = {};
            var dim = -1;
            for (var i = 0; i < data.data.length; i++) {
                var item = data.data[i];
                if (!item) return false;
                var idx = item.index;
                if (typeof idx !== 'number' || !isFinite(idx) || Math.floor(idx) !== idx) return false;
                if (idx < 0 || idx >= expectedCount) return false;
                if (seen[idx]) return false;
                seen[idx] = 1;
                var vec = item.embedding;
                if (!Array.isArray(vec) || !vec.length) return false;
                for (var j = 0; j < vec.length; j++) {
                    if (typeof vec[j] !== 'number' || !isFinite(vec[j])) return false;
                }
                if (dim === -1) dim = vec.length;
                else if (vec.length !== dim) return false;
            }
            return dim > 0;
        } catch (_) { return false; }
    }

    // ==================== 响应合成 ====================

    // 不用 new Response：
    //   ① 旧 WebView 内核（Chrome < 43）没有 Response 构造器，直接抛；
    //   ② Response 的 body 是流，和 withApiResponse 的 AbortSignal 交互容易出岔子。
    // 官网对 response 只用四个成员（api-utils.js:101~108）：
    //   response.ok / response.status / response.headers.get('content-type') / response.text()
    // 鸭子类型足够，且绝不会和官方代码打架。
    function makeResponse(text) {
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            url: '',
            headers: {
                get: function (name) {
                    var k = String(name || '').toLowerCase();
                    if (k === 'content-type') return 'application/json';
                    return null;
                },
                has: function (name) {
                    return String(name || '').toLowerCase() === 'content-type';
                }
            },
            text: function () { return Promise.resolve(text); },
            json: function () { return Promise.resolve(JSON.parse(text)); },
            clone: function () { return makeResponse(text); }
        };
    }

    // 命中时把用量字段删掉再返回。原因：
    //   app.js:5409 无条件 recordApiUsage(getApiUsagePayload(data), {type:'embedding', ...})，
    //   而 runtime-services.js:410 里还有 fetchLatestQuota(record, apiKey) ——
    //   它会按 [500, 5000] 两次延迟去 GET /api/log/token 找真实日志。
    //   缓存命中没有真实请求、没有服务端日志，那两次 GET 必然匹配失败（无害但白打两枪）。
    // 更严重的是 token 数：原样带着 usage 的话，这条记录会把上次真实消耗的 token 再记一遍
    //   ⇒ 用量面板虚高，用户会以为「缓存没生效，还在扣钱」。
    // 删掉 usage 后那条记录显示 0 token —— 这才是真实情况。
    function stripUsage(text) {
        try {
            var obj = JSON.parse(text);
            var changed = false;
            if (obj && typeof obj === 'object') {
                if ('usage' in obj) { delete obj.usage; changed = true; }
                if ('usageMetadata' in obj) { delete obj.usageMetadata; changed = true; }
            }
            return changed ? JSON.stringify(obj) : text;
        } catch (_) { return text; }
    }

    function byteLen(text) {
        try { return new Blob([text]).size; } catch (_) {}
        // 退化估算：ASCII 1 字节，其余按 UTF-8 常见 3 字节
        var n = 0;
        for (var i = 0; i < text.length; i++) n += text.charCodeAt(i) < 128 ? 1 : 3;
        return n;
    }

    // ==================== 主流程 ====================

    function resolveUrl(input) {
        if (typeof input === 'string') return input;
        if (input && typeof input.url === 'string') return input.url;
        try { return String(input); } catch (_) { return ''; }
    }

    function isEmbeddingsUrl(url) {
        return /\/embeddings\/?(?:[?#]|$)/i.test(String(url || ''));
    }

    // 作用域 = 这次请求真正打到的地址（去掉 query / 尾斜杠，小写）。
    //
    // 为什么不读 settings.apiUrl：那要依赖官网 state 的形状（ref 还是 unwrap 值、
    // 挂在 setupState 还是 store、localStorage 键叫什么），官方一改就静默失效。
    // 而请求地址本身就是「这个向量是谁算的」最权威的答案 ——
    // buildApiEndpoint(apiUrl, 'embeddings') 出来的东西，换了站地址必然不同。
    //
    // 为什么必须隔离：柳贯一插件那段注释（「不绑定 API 站地址，同名模型就是同一向量空间」）
    // 是旧结论，它自己的代码早就改成按来源隔离了 —— 代码是对的。
    // 中转站「标 A 实 B」很常见，跨站复用不报错，只会让召回质量慢慢变差，
    // 这种 bug 用户永远不报，只会觉得「AI 变笨了」。
    function scopeFromUrl(url) {
        var u = String(url || '');
        var q = u.indexOf('?');
        if (q >= 0) u = u.slice(0, q);
        var h = u.indexOf('#');
        if (h >= 0) u = u.slice(0, h);
        u = u.replace(/\/+$/, '');
        return u.toLowerCase();
    }

    function handleEmbedding(args, url) {
        var init = args[1] || {};
        var method = String(init.method || 'GET').toUpperCase();
        if (method !== 'POST') return null;
        if (typeof init.body !== 'string' || !init.body) return null;

        var body;
        try { body = JSON.parse(init.body); } catch (_) { return null; }
        if (!body || typeof body !== 'object') return null;

        var model = String(body.model || '').trim();
        var inputs = normalizeInputs(body);
        if (!model || !inputs || !inputs.length) return null;

        return { init: init, model: model, inputs: inputs, scope: scopeFromUrl(url) };
    }

    function install() {
        if (_installed) return true;
        if (typeof G.fetch !== 'function') return false;

        _nativeFetch = G.fetch;

        var patched = function (input, init) {
            var self = this;
            var args = arguments;
            var url = resolveUrl(input);

            // 只碰 /embeddings。其余一律原样放行（聊天、配额查询、下载都不受影响）。
            if (!isEmbeddingsUrl(url) || isOff()) {
                return _nativeFetch.apply(self, args);
            }

            var job;
            try { job = handleEmbedding(args, url); } catch (_) { job = null; }
            if (!job) return _nativeFetch.apply(self, args);

            var key;
            try {
                key = buildKey(job.scope, job.model, job.inputs);
            } catch (_) {
                return _nativeFetch.apply(self, args);
            }

            return readEntry(key).then(function (hit) {
                if (hit && typeof hit.payload === 'string'
                        && isValidPayload(hit.payload, job.inputs.length)) {
                    _hits += 1;
                    var now = Date.now();
                    if (_logged < HIT_LOG_LIMIT && now - _lastLogAt > HIT_LOG_INTERVAL) {
                        _logged += 1;
                        _lastLogAt = now;
                        log('命中（' + job.model + ' / ' + job.inputs.length + ' 条），跳过重复计费');
                    }
                    return makeResponse(hit.payload);
                }
                if (hit) {
                    // 键对上了但数据不可用（半截 / 维度不一致 / 版本升级）⇒ 丢掉重算，
                    // 别让它一直占着位置、每次都白读一遍。
                    try { dropEntry(key, hit.bytes || 0); } catch (_) {}
                }
                _misses += 1;

                return _nativeFetch.apply(self, args).then(function (response) {
                    // 关键：写缓存**不进响应路径**。
                    // 原来是 return response.clone().text().then(...writeEntry...).then(=> response)，
                    // 一旦 IndexedDB 卡住（onblocked / 事务挂起），官方那次 fetch 就跟着挂，
                    // 120s 后报「API 响应超时」—— 缓存本该是纯增益，不能变成新的故障源。
                    // 现在：clone() 同步拿到（安全，不消费原 body），写入完全后台跑，
                    // 官方立刻拿到响应。写失败最多是下次没命中，不影响任何正确性。
                    try {
                        if (response && response.ok && typeof response.clone === 'function') {
                            var clone = response.clone();
                            cacheWriteAsync(clone, job, key);
                        }
                    } catch (_) {}
                    return response;
                });
            }).catch(function () {
                // 缓存层任何异常都不许影响请求本身
                return _nativeFetch.apply(self, args);
            });
        };

        try {
            patched.__rphubEmbeddingCache = true;
            G.fetch = patched;
        } catch (_) {
            return false;
        }
        _installed = true;
        log('已接管 fetch（/embeddings 缓存）');
        return true;
    }

    function dropEntry(key, bytes) {
        if (_disabled) return Promise.resolve(false);
        return withTimeout(openDB().then(function (db) {
            return new Promise(function (resolve) {
                var tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).delete(key);
                tx.oncomplete = function () {
                    bumpCounters(-1, -(bytes || 0));
                    resolve(true);
                };
                tx.onerror = function () { resolve(false); };
                tx.onabort = function () { resolve(false); };
            });
        }), WRITE_TIMEOUT_MS, false).catch(function () { return false; });
    }

    // ==================== 对外 API ====================

    var API = {
        version: '1.0.0',
        install: install,
        // 同步读计数器，给设置页做快速显示
        peek: function () {
            var c = 0, b = 0;
            try {
                c = parseInt(localStorage.getItem(K_COUNT) || '0', 10) || 0;
                b = parseInt(localStorage.getItem(K_BYTES) || '0', 10) || 0;
            } catch (_) {}
            return { count: c, bytes: b, hits: _hits, misses: _misses, off: isOff(), installed: _installed };
        },
        stats: function () {
            return recount().then(function (r) {
                return { count: r.count, bytes: r.bytes, hits: _hits, misses: _misses, off: isOff(), installed: _installed };
            });
        },
        clear: function () {
            return clearAll().then(function (ok) {
                if (ok) log('已清空向量缓存');
                return ok;
            });
        },
        recount: recount
    };
    G.RPHubEmbeddingCache = API;

    // 立即安装。注入点在 onPageStarted，正常情况下早于官网任何 API 请求。
    try { install(); } catch (e) { warn('安装失败:', e); }

    // ==================== 设置页入口（可选，失配则静默不显示） ====================
    // 单独一张卡，只读展示 + 一个「清空」按钮。
    // 挂不上就什么都不做 —— 官方改 .settings-stack / .settings-card 时最多是这张卡消失，
    // 不会报错、不会白屏。
    var cardSig = '';
    var cardEl = null;

    function fmtKB(bytes) {
        var kb = (bytes || 0) / 1024;
        if (kb < 1024) return Math.round(kb) + ' KB';
        return (kb / 1024).toFixed(1) + ' MB';
    }

    function mountCard() {
        if (document.getElementById('rphub-emb-cache-card')) return true;
        var stack = document.querySelector('.settings-view .settings-stack');
        if (!stack) return false;
        var card = document.createElement('div');
        card.id = 'rphub-emb-cache-card';
        card.className = 'settings-card';
        card.innerHTML = [
            '<div class="settings-card__header">',
            '  <div class="settings-card__title">🧠 向量缓存</div>',
            '</div>',
            '<div id="rphub-emb-cache-stat" class="mt-2 text-sm font-semibold">读取中…</div>',
            '<div class="mt-2 flex items-center gap-2">',
            '  <button type="button" id="rphub-emb-cache-clear"',
            '    class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300">清空缓存</button>',
            '</div>',
            '<p class="mt-2 text-xs opacity-60">同一段文本 + 同一向量模型 + 同一接口地址的向量会被复用，'
                + '换 API 站、重试、切分支都不再重复计费。清空后下次补录会重新计算。数据只存在本机。</p>'
        ].join('');
        stack.appendChild(card);

        var btn = card.querySelector('#rphub-emb-cache-clear');
        if (btn) {
            btn.addEventListener('click', function () {
                btn.disabled = true;
                btn.textContent = '清空中…';
                API.clear().then(function () {
                    btn.disabled = false;
                    btn.textContent = '清空缓存';
                    cardSig = '';
                    renderCard();
                });
            });
        }
        return true;
    }

    function renderCard() {
        var el = document.getElementById('rphub-emb-cache-stat');
        if (!el) { cardSig = ''; cardEl = null; return; }
        var p = API.peek();
        var total = p.hits + p.misses;
        var rate = total > 0 ? Math.round(p.hits * 100 / total) : 0;
        var sig = p.count + '|' + p.bytes + '|' + p.hits + '|' + p.misses + '|' + (p.off ? 1 : 0);
        if (sig === cardSig && cardEl === el) return;
        cardSig = sig;
        cardEl = el;
        if (p.off) {
            el.textContent = '⏸ 已关闭（本次页面未启用）';
            return;
        }
        el.textContent = '🧠 ' + p.count + ' 条 · ' + fmtKB(p.bytes)
            + ' · 本次命中 ' + p.hits + ' / ' + total + '（' + rate + '%）';
    }

    function tickCard() {
        try {
            if (G.RPThemePacks.current !== 'classic') return;
            if (!document.querySelector('.settings-view:not(.shell-settings-detail) .settings-stack')) return;
            if (!mountCard()) return;
            renderCard();
        } catch (_) {}
    }

    // 低频轮询：只在设置页出现时才动 DOM，且 renderCard 有签名去重。
    try {
        setInterval(tickCard, 2000);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', tickCard);
        } else {
            setTimeout(tickCard, 0);
        }
    } catch (_) {}
})();
