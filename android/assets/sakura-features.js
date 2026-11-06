/**
 * RP-Hub 樱花功能集（sakura-features）
 * 沉浸时长 · 名场面手记 · 条目关键词搜索
 * 自包含：CSS + HTML + JS 全在本文件
 * 不依赖 Vue 实例；任何子模块失败不影响其他
 */
(function () {
    'use strict';
    if (window.__sakuraFeaturesLoaded) return;
    window.__sakuraFeaturesLoaded = true;

    // 等应用真正就绪再挂载，而不是固定等 800ms：
    // 快机型不白等，慢机型也不会抢跑（原实现是写死的 setTimeout(fn, 800)）。
    // 就绪信号取「#app 上的 v-cloak 已被移除」—— 这是 Vue 完成挂载的可靠标志，
    // 且不依赖任何按钮的 title（官方改文案也不会失效）。
    function onReady(fn) {
        var started = Date.now();
        var TIMEOUT_MS = 3000;
        function check() {
            var app = document.getElementById('app');
            var mounted = !!app && !app.hasAttribute('v-cloak');
            if (mounted || Date.now() - started > TIMEOUT_MS) {
                try { fn(); } catch (e) { console.warn('[SF] onReady 回调失败:', e); }
                return;
            }
            setTimeout(check, 100);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', check);
        } else {
            check();
        }
    }

    /* ---------- 共用工具 ---------- */
    var _sfDBP = null;
    function openDB(name, store, version) {
        var key = name + ':' + (version || 1);
        if (_sfDBP && _sfDBP._key === key) return _sfDBP;
        _sfDBP = new Promise(function (resolve, reject) {
            try {
                var req = indexedDB.open(name, version || 1);
                req.onupgradeneeded = function (e) {
                    var db = e.target.result;
                    if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
                };
                req.onsuccess = function (e) { e.target.result._key = key; resolve(e.target.result); };
                req.onerror = function (e) { reject(e.target.error || new Error('打开数据库失败')); };
            } catch (e) { reject(e); }
        });
        return _sfDBP;
    }
    function idbGet(dbName, store, key) {
        return openDB(dbName, store).then(function (db) {
            return new Promise(function (resolve, reject) {
                try {
                    var tx = db.transaction([store], 'readonly');
                    var req = tx.objectStore(store).get(key);
                    tx.oncomplete = function () { resolve(req.result !== undefined ? req.result : null); };
                    tx.onerror = function () { reject(tx.error || new Error('读取失败')); };
                    // 事务被 abort（连接被关闭 / 配额 / 版本变更）时只挂 onerror 不会触发，
                    // Promise 会永远悬着 ⇒ 调用方既不成功也不报错，界面表现为"点了没反应"。
                    tx.onabort = function () { reject(tx.error || new Error('读取事务中断')); };
                } catch (e) { reject(e); }
            });
        });
    }
    function idbPut(dbName, store, key, val) {
        return openDB(dbName, store).then(function (db) {
            return new Promise(function (resolve, reject) {
                try {
                    var tx = db.transaction([store], 'readwrite');
                    tx.objectStore(store).put(val, key);
                    tx.oncomplete = function () { resolve(true); };
                    tx.onerror = function () { reject(tx.error || new Error('写入失败')); };
                    tx.onabort = function () { reject(tx.error || new Error('写入事务中断')); };
                } catch (e) { reject(e); }
            });
        });
    }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function fmtMin(sec) { return Math.round((sec || 0) / 60); }

    /* ---------- CSS ---------- */
    var SF_CSS = '<style id="sakura-features-css">\n'
    + 'button[title="便捷更换 API 站"]{display:none!important}\n'
    + /* 工具栏注入按钮（回车切换 / 名场面）— 对齐官网原生 .island-button 视觉风格 */
    '#sf-enter-toggle,#sf-moments-trigger{cursor:pointer;flex-shrink:0}\n'
    + '#sf-enter-toggle.is-on{color:var(--c-primary,#2563eb)}\n'
    + ':root[data-app-theme="dark"] #sf-enter-toggle.is-on{color:var(--night-accent,#96baff)}\n'
    + '.sfm-panel-title{font-size:13px;font-weight:700;color:#1f2937;display:flex;align-items:center;gap:6px}\n'
    + '.sfm-panel-close{background:none;border:none;cursor:pointer;color:#9ca3af;font-size:18px;line-height:1;padding:2px}\n'
    + '.sfm-panel-empty{text-align:center;padding:20px;color:#9ca3af;font-size:12px}\n'
    + /* 名场面面板：从顶部弹出 */
    '#sf-moment-panel{position:fixed;top:0;left:0;right:0;z-index:9991;background:#fff;border-bottom:1px solid #e5e7eb;box-shadow:0 4px 24px rgba(0,0,0,.1);transform:translateY(-100%);transition:transform .3s cubic-bezier(.22,1,.36,1);max-height:75vh;display:flex;flex-direction:column}\n'
    + '#sf-moment-panel.is-open{transform:translateY(0)}\n'
    + '.sfm-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;border-bottom:1px solid #f3f4f6}\n'
    + '.sfm-add-form{padding:10px 16px;border-bottom:1px solid #f3f4f6}\n'
    + '.sfm-add-form input,.sfm-add-form textarea{width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;font-size:12px;color:#1f2937;margin-bottom:6px;box-sizing:border-box}\n'
    + '.sfm-add-form input{font-weight:600}\n'
    + '.sfm-add-form textarea{min-height:64px;resize:vertical}\n'
    + '.sfm-add-form input:focus,.sfm-add-form textarea:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.1)}\n'
    + '.sfm-add-btn{width:100%;padding:8px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:12px;font-weight:600;cursor:pointer}\n'
    + '.sfm-add-btn:hover{background:#1d4ed8}\n'
    + '.sfm-list{flex:1;overflow-y:auto;padding:8px;min-height:60px}\n'
    + '.sfm-item{border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;font-size:12px;color:#374151;position:relative;overflow:hidden}\n'
    + '.sfm-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;cursor:pointer;user-select:none}\n'
    + '.sfm-header:hover{background:#f9fafb}\n'
    + '.sfm-title{font-weight:700;color:#1f2937;font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n'
    + '.sfm-chevron{color:#9ca3af;font-size:11px;transition:transform .2s;flex-shrink:0}\n'
    + '.sfm-chevron.is-open{transform:rotate(90deg)}\n'
    + '.sfm-body{display:none;padding:0 12px 10px;border-top:1px solid #f3f4f6}\n'
    + '.sfm-body.is-open{display:block}\n'
    + '.sfm-text{white-space:pre-line;word-break:break-word;color:#6b7280;padding-top:6px}\n'
    + '.sfm-meta{font-size:10px;color:#9ca3af;margin-top:6px}\n'
    + '.sfm-del{position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:#d1d5db;font-size:14px;z-index:1}\n'
    + '.sfm-del:hover{color:#ef4444}\n'
    + /* 条目关键词搜索模态框与高亮 */
    /* 注入的放大镜按钮：基类用官网 settings-icon-button，这里只兜底图标尺寸，
       保证 Tailwind CDN 不可用时图标依然有确定大小、不会塌成 0。 */
    '.sakura-entry-search-btn svg{width:20px;height:20px;flex:none}\n'
    + '#sakura-entry-search.sakura-mask{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(3px)}\n'
    + '#sakura-entry-search .sakura-box{display:flex!important;flex-direction:column!important;width:min(600px,calc(100vw - 24px))!important;max-width:600px!important;max-height:calc(100dvh - 40px)!important;padding:0!important;overflow:hidden!important;background:#fff;border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,.15);border:1px solid #e5e7eb}\n'
    + '#sakura-entry-search .sakura-head{padding:16px 20px 12px;border-bottom:1px solid #f3f4f6;background:#fafafa}\n'
    + '#sakura-entry-search .sakura-modal-topbar{display:flex;align-items:center;justify-content:space-between}\n'
    + '#sakura-entry-search .sakura-title-with-icon{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#1f2937}\n'
    + '#sakura-entry-search .sakura-title-svg{width:18px;height:18px;color:#2563eb}\n'
    + '#sakura-entry-search .sakura-close-btn{background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;padding:4px;border-radius:6px;line-height:1}\n'
    + '#sakura-entry-search .sakura-close-btn:hover{color:#ef4444;background:#fee2e2}\n'
    + '#sakura-entry-search .sakura-sub{font-size:11.5px;color:#6b7280;margin-top:4px}\n'
    + '#sakura-entry-search .sakura-body{display:flex!important;flex-direction:column!important;gap:10px!important;min-height:0!important;flex:1!important;padding:16px 20px 20px;background:#fff}\n'
    + '.sakura-es-search{position:relative!important}\n'
    + '.sakura-es-input{width:100%!important;box-sizing:border-box!important;padding:11px 14px!important;border:1px solid #e5e7eb!important;border-radius:12px!important;background:#fff!important;color:#1f2937!important;font-size:14px!important;outline:none!important;transition:border-color .15s ease,box-shadow .15s ease!important}\n'
    + '.sakura-es-input:focus{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.12)!important}\n'
    + '.sakura-es-input::placeholder{color:#9ca3af!important}\n'
    + '.sakura-es-count{font-size:11.5px!important;color:#6b7280!important;font-weight:600!important;padding:0 2px!important}\n'
    + '.sakura-es-results{flex:1!important;min-height:120px!important;max-height:min(52vh,460px)!important;overflow-y:auto!important;display:flex!important;flex-direction:column!important;gap:6px!important}\n'
    + '.sakura-es-item{padding:10px 12px!important;border:1px solid #f3f4f6!important;border-radius:11px!important;background:#f9fafb!important;cursor:pointer!important;transition:border-color .15s ease,background-color .15s ease,transform .12s ease!important;-webkit-tap-highlight-color:transparent!important}\n'
    + '.sakura-es-item:hover{border-color:#2563eb!important;background:#eff6ff!important}\n'
    + '.sakura-es-item:active{transform:scale(.985)!important;background:#dbeafe!important}\n'
    + '.sakura-es-name{font-size:13px!important;font-weight:700!important;color:#1f2937!important;margin-bottom:4px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}\n'
    + '.sakura-es-snippet{font-size:11.5px!important;line-height:1.6!important;color:#4b5563!important;word-break:break-word!important}\n'
    + '.sakura-es-item mark{background:rgba(37,99,235,.2)!important;color:#1d4ed8!important;border-radius:3px!important;padding:0 2px!important;font-weight:700!important}\n'
    + '.sakura-es-empty{padding:40px 16px!important;text-align:center!important;color:#9ca3af!important;font-size:12.5px!important}\n'
    + /* 夜间模式适配（支持 data-app-theme="dark" 与 data-sakura-night="1"） */
    ':root[data-app-theme="dark"] #sakura-entry-search .sakura-box,:root[data-sakura-night="1"] #sakura-entry-search .sakura-box{background:#1f2937!important;border-color:rgba(255,255,255,.12)!important}\n'
    + ':root[data-app-theme="dark"] #sakura-entry-search .sakura-head,:root[data-sakura-night="1"] #sakura-entry-search .sakura-head{background:#111827!important;border-bottom-color:rgba(255,255,255,.08)!important}\n'
    + ':root[data-app-theme="dark"] #sakura-entry-search .sakura-title-with-icon,:root[data-sakura-night="1"] #sakura-entry-search .sakura-title-with-icon{color:#f3f4f6!important}\n'
    + ':root[data-app-theme="dark"] #sakura-entry-search .sakura-body,:root[data-sakura-night="1"] #sakura-entry-search .sakura-body{background:#1f2937!important}\n'
    + ':root[data-app-theme="dark"] .sakura-es-input,:root[data-sakura-night="1"] .sakura-es-input{background:#111827!important;border-color:rgba(255,255,255,.15)!important;color:#f9fafb!important}\n'
    + ':root[data-app-theme="dark"] .sakura-es-item,:root[data-sakura-night="1"] .sakura-es-item{background:#111827!important;border-color:rgba(255,255,255,.08)!important}\n'
    + ':root[data-app-theme="dark"] .sakura-es-item:hover,:root[data-sakura-night="1"] .sakura-es-item:hover{background:#1e293b!important;border-color:#3b82f6!important}\n'
    + ':root[data-app-theme="dark"] .sakura-es-item:active,:root[data-sakura-night="1"] .sakura-es-item:active{background:#1e3a8a!important}\n'
    + ':root[data-app-theme="dark"] .sakura-es-name,:root[data-sakura-night="1"] .sakura-es-name{color:#f9fafb!important}\n'
    + ':root[data-app-theme="dark"] .sakura-es-snippet,:root[data-sakura-night="1"] .sakura-es-snippet{color:#9ca3af!important}\n'
    + ':root[data-app-theme="dark"] .sakura-es-count,:root[data-sakura-night="1"] .sakura-es-count{color:#9ca3af!important}\n'
    + ':root[data-app-theme="dark"] .sakura-es-item mark,:root[data-sakura-night="1"] .sakura-es-item mark{background:rgba(59,130,246,.35)!important;color:#93c5fd!important}\n'
    + '</style>';

    /* ================================================================
    // 模块一：工具栏按钮注入（Enter ↔ 换行 切换 + 名场面手记）
    // 2.8.21：留声机（按钮 / 面板 / CSS / 数据读写）已彻底删除，此槽位改为回车行为切换按钮。
    //   起因：官方输入行里原来的切换按钮（index.html #17）因官网删掉 .relative.mr-2 容器
    //   而锚点失配、被列入豁免 ⇒ 按钮消失；逻辑仍在 app.js（rphubEnterNewline /
    //   toggleRphubEnterNewline，持久化在 localStorage 'rphub-enter-newline'）。
    //   本模块只负责画按钮与同步外观，点击交给 window.RPHubEnterToggle（与 Vue 同一份状态）。
    //   沉浸时长统计已移到设置页（见模块二 renderPresence）。
    // ================================================================ */
    function sfFindToolbar() {
        // 找 ⚙ 快捷面板按钮，确保其父容器是 flex 行。
        // 选择器按「稳定性」排序兜底 —— 只认 title 的话，官方改个文案这里就全挂：
        //   aria-controls 是语义属性（指向弹层 id），比 title 稳；
        //   aria-label 次之；title 最后。
        var quickBtn = document.querySelector('button[aria-controls="chat-quick-panel"]')
            || document.querySelector('button[aria-label="快捷面板"]')
            || document.querySelector('button[title="快捷面板"]');
        if (quickBtn) {
            var parent = quickBtn.parentElement;
            if (parent) {
                // 如果父容器不是 flex，就把它变成 flex（同一排水平排列）
                var style = window.getComputedStyle(parent);
                if (style.display.indexOf('flex') < 0 && style.display.indexOf('inline-flex') < 0) {
                    parent.style.display = 'flex';
                    parent.style.alignItems = 'center';
                    parent.style.gap = '8px';
                    parent.style.flexWrap = 'nowrap';
                }
                return parent;
            }
        }
        // 退化：找 .flex.items-center 含 ≥2 button
        var candidates = document.querySelectorAll('.flex.items-center');
        for (var j = candidates.length - 1; j >= 0; j--) {
            if (candidates[j].querySelectorAll('button').length >= 2) return candidates[j];
        }
        return null;
    }
    /* ---------- 回车行为切换按钮（2.8.21） ---------- */
    var SF_ENTER_BTN_ID = 'sf-enter-toggle';
    var sfEnterTimer = null;
    // 状态真身在官方 Vue 层（app.js 的 rphubEnterNewline），经 window.RPHubEnterToggle 读写；
    // 钩子未就绪时退回直接读 localStorage，保证按钮外观不会闪错。
    function sfEnterIsNewline() {
        try {
            if (window.RPHubEnterToggle && typeof window.RPHubEnterToggle.get === 'function') {
                return window.RPHubEnterToggle.get() === true;
            }
        } catch (e) { /* 忽略，退回 localStorage */ }
        try { return localStorage.getItem('rphub-enter-newline') === '1'; } catch (e) { return false; }
    }
    function sfRenderEnterButton() {
        var btn = document.getElementById(SF_ENTER_BTN_ID);
        if (!btn) return;
        var on = sfEnterIsNewline();
        btn.classList.toggle('is-on', on);
        btn.title = on ? '当前：Enter 换行（点击改为 Enter 发送）' : '当前：Enter 发送（点击改为 Enter 换行）';
        btn.setAttribute('aria-label', '切换回车行为');
    }
    function sfToggleEnter() {
        try {
            if (window.RPHubEnterToggle && typeof window.RPHubEnterToggle.toggle === 'function') {
                window.RPHubEnterToggle.toggle();
            } else {
                // 兜底：Vue 钩子尚未就绪时直接落盘，下次启动生效
                var next = !sfEnterIsNewline();
                try { localStorage.setItem('rphub-enter-newline', next ? '1' : '0'); } catch (e) {}
            }
        } catch (e) { console.warn('[SF] 切换回车行为失败:', e); }
        sfRenderEnterButton();
    }
    function sfMountToolbar() {
        var toolbar = sfFindToolbar();
        if (toolbar && !document.getElementById(SF_ENTER_BTN_ID)) {
            // 插到 ⚙ 按钮前面（不是 appendChild 到末尾，确保排序正确）—— 原留声机按钮的槽位
            var btn = document.createElement('button');
            btn.id = SF_ENTER_BTN_ID;
            btn.className = 'island-button';
            btn.type = 'button';
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M9 10l-5 5 5 5"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 15h11a4 4 0 004-4V4"/></svg>';
            btn.addEventListener('click', sfToggleEnter);
            var quickBtn = toolbar.querySelector('button[title="快捷面板"]');
            if (quickBtn) {
                toolbar.insertBefore(btn, quickBtn);
            } else {
                toolbar.appendChild(btn);
            }
        }
        // 名场面手记按钮：紧跟回车切换按钮（同一排，间距 8px）。与上面一起维护，
        // 这样官方 Vue 重渲染把节点吞掉后，下一轮补挂会一并恢复两个按钮。
        try {
            var enterBtn = document.getElementById(SF_ENTER_BTN_ID);
            if (enterBtn && !document.getElementById('sf-moments-trigger')) {
                var mBtn = document.createElement('button');
                mBtn.id = 'sf-moments-trigger';
                mBtn.className = 'island-button';
                mBtn.title = '名场面手记';
                mBtn.type = 'button';
                mBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
                mBtn.addEventListener('click', function () { momentsPanel(); });
                enterBtn.parentElement.insertBefore(mBtn, enterBtn.nextSibling);
            }
        } catch (e) { console.warn('[SF] 名场面按钮挂载失败:', e); }
        sfRenderEnterButton();
        // 官方工具栏由 Vue 渲染，重渲染可能吞掉我们加的 class 甚至节点 ⇒ 低频补挂与补样式
        if (!sfEnterTimer) sfEnterTimer = setInterval(function () { try { sfMountToolbar(); } catch (e) {} }, 2500);
    }

    /* ================================================================
    // 模块二：沉浸时长记录
    // ================================================================ */
    var PRESENCE_KEY = 'sf_presence_days_v1';
    var presenceMem = null, presenceAnchor = Date.now(), presenceTimer = null;
    function presenceDayKey(offset) {
        var d = new Date(Date.now() - (offset || 0) * 86400000);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function presenceLoad() {
        if (presenceMem) return presenceMem;
        presenceMem = {};
        try { var arr = JSON.parse(localStorage.getItem(PRESENCE_KEY) || '[]'); if (Array.isArray(arr)) arr.forEach(function (it) { if (it && it.day) presenceMem[it.day] = Math.max(0, it.sec || 0); }); } catch (e) {}
        return presenceMem;
    }
    function presencePersist() {
        try { var mem = presenceLoad(); var days = Object.keys(mem).sort().slice(-7); localStorage.setItem(PRESENCE_KEY, JSON.stringify(days.map(function (day) { return { day: day, sec: Math.round(mem[day]) }; }))); } catch (e) {}
    }
    // 设置页「在线时长」页里的统计（2.8.21：由弃用的留声机面板移到设置页）
    // 渲染签名：数据没变、容器节点也没被 Vue 重建时不重复写 DOM（下面的轮询会频繁调它）
    var presenceSig = '', presenceSigEl = null;

    // 2.8.44：导航里那一格改成「灯塔」，在线时长收进设置页最底部的一张卡。
    // 数据逻辑不动——renderPresence 每秒轮询，卡片挂上来自动就填好了。
    function mountPresenceCard() {
        if (document.getElementById('sf-presence-card')) return;
        var stack = document.querySelector('.settings-view .settings-stack');
        if (!stack) return;
        var card = document.createElement('div');
        card.id = 'sf-presence-card';
        card.className = 'settings-card';
        card.innerHTML = [
            '<div class="settings-card__header">',
            '  <div class="settings-card__title">⏳ 在线时长</div>',
            '</div>',
            '<div id="sf-presence-settings" class="mt-2 text-sm font-semibold">⏳ 今日在线 0 分钟 · 近 7 天共 0 分钟</div>',
            '<ul id="sf-presence-days" class="mt-2 text-xs space-y-0.5"></ul>',
            '<p class="mt-2 text-xs opacity-60">只统计应用处于前台且可见时的时长，按天累计，保留最近 7 天；数据只存在本机。</p>'
        ].join('');
        stack.appendChild(card);
    }

    function renderPresence() {
        mountPresenceCard();
        var pi = document.getElementById('sf-presence-settings');
        if (!pi) { presenceSig = ''; presenceSigEl = null; return; }
        var mem = presenceLoad();
        var today = mem[presenceDayKey(0)] || 0;
        var week = 0;
        var days = [];
        for (var i = 6; i >= 0; i--) {
            var key = presenceDayKey(i);
            var sec = mem[key] || 0;
            week += sec;
            days.push({ day: key, sec: sec });
        }
        var sig = today + '|' + week + '|' + days.map(function (x) { return x.day + ':' + x.sec; }).join(',');
        if (sig === presenceSig && presenceSigEl === pi) return;
        presenceSig = sig; presenceSigEl = pi;
        pi.textContent = '⏳ 今日在线 ' + fmtMin(today) + ' 分钟 · 近 7 天共 ' + fmtMin(week) + ' 分钟';
        var list = document.getElementById('sf-presence-days');
        if (!list) return;
        list.innerHTML = '';
        days.forEach(function (item) {
            var li = document.createElement('li');
            li.textContent = item.day + ' · ' + fmtMin(item.sec) + ' 分钟';
            list.appendChild(li);
        });
    }
    function initPresence() {
        if (presenceTimer) return;
        var tick = 0;
        presenceTimer = setInterval(function () {
            if (document.hidden) return;
            tick++;
            var el = Math.floor((Date.now() - presenceAnchor) / 1000);
            presenceAnchor = Date.now();
            if (el > 0 && el <= 30) { var m = presenceLoad(); var d = presenceDayKey(0); m[d] = (m[d] || 0) + el; if (tick % 5 === 0) presencePersist(); }
            // 1s 一次（原 5s）：「在线时长」是 v-if 整页，点开时才挂到 DOM 上；
            // 5s 轮询会让页面先显示静态默认值（0 分钟）最多 5 秒才纠正，看起来像数据丢了。
            renderPresence();
        }, 1000);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                var el = Math.floor((Date.now() - presenceAnchor) / 1000);
                if (el > 0 && el <= 600) { var m = presenceLoad(); var d = presenceDayKey(0); m[d] = (m[d] || 0) + el; presencePersist(); }
                presenceAnchor = Date.now();
            } else { presenceAnchor = Date.now(); }
        });
    }

    /* ================================================================
    // 模块三：名场面回忆手记（带命名 · 表单在顶部 · 手风琴列表 · 顶部弹出）
    // ================================================================ */
    var MOMENTS_DB = 'sf_moments_db', MOMENTS_STORE = 'moments';
    var momentsCache = null;
    /* 严格读写（2.8.52）
       原来的 momentsSave 有两个静默失败：
         · 读失败时 load 返回空数组 ⇒ 调用方以为是"本来就没有"，unshift 一条再写回，
           会把用户全部手记覆盖成一条；
         · save 把写入错误吞掉 ⇒ 真机上 IDB 写失败时，删除和收录都"假装成功"：
           界面上条目没了、提示说已收录，重开面板又回来，再点就永远提示已收录。
       所有**写操作**都走下面这两个：读要读到、写要回读验证，失败必须能让用户看见。 */
    function momentsLoadStrict() {
        return idbGet(MOMENTS_DB, MOMENTS_STORE, 'list').then(function (list) {
            momentsCache = Array.isArray(list) ? list : [];
            return momentsCache;
        });
    }
    function momentsSaveStrict(list) {
        var copy = list.slice();
        return idbPut(MOMENTS_DB, MOMENTS_STORE, 'list', copy).then(function () {
            return idbGet(MOMENTS_DB, MOMENTS_STORE, 'list');
        }).then(function (back) {
            var same = Array.isArray(back) && back.length === copy.length
                && back.every(function (x, i) {
                    return x && copy[i] && x.id === copy[i].id && x.text === copy[i].text;
                });
            if (!same) {
                throw new Error('写入后回读不一致（期望 ' + copy.length + ' 条，实际 '
                    + (Array.isArray(back) ? back.length + ' 条' : '读取失败') + '）');
            }
            // 只有确认落盘才更新内存缓存，避免"界面是新的、库是旧的"
            momentsCache = copy;
            return copy;
        });
    }
    function momentsPanel() {
        var existing = document.getElementById('sf-moment-panel');
        if (existing) {
            /* 2.8.54 修正：命中已存在的面板时必须重渲染列表。
               原来这里直接 toggle 就 return，于是列表永久停在「第一次打开那一刻」的 DOM：
               库里明明写进去了，屏幕上却看不到。用户报的「删掉之后再点收录就没有了」就是它
               ——第一次能看见，是因为那一下刚建面板、render 是新建时跑的那次。
               手动收藏路径之所以没这毛病，是因为它写完自己调了 momentsRenderList()。 */
            momentsRenderList();
            existing.classList.toggle('is-open');
            return;
        }
        var panel = document.createElement('div');
        panel.id = 'sf-moment-panel';
        panel.innerHTML = [
            '<div class="sfm-head"><div class="sfm-panel-title">📖 名场面手记</div><button class="sfm-panel-close" id="sf-moment-close">✕</button></div>',
            '<div class="sfm-add-form">',
            '  <input type="text" id="sf-moment-title" placeholder="给这条名场面起个名字…" maxlength="50">',
            '  <textarea id="sf-moment-text" placeholder="粘贴或输入要收藏的内容…" rows="3"></textarea>',
            '  <button class="sfm-add-btn" id="sf-moment-save">收 藏</button>',
            '</div>',
            '<div class="sfm-list" id="sf-moment-list"></div>'
        ].join('');
        document.body.appendChild(panel);
        document.getElementById('sf-moment-close').addEventListener('click', function () { panel.classList.remove('is-open'); });
        document.getElementById('sf-moment-save').addEventListener('click', function () {
            var titleEl = document.getElementById('sf-moment-title');
            var textEl = document.getElementById('sf-moment-text');
            var title = titleEl.value.trim();
            var text = textEl.value.trim();
            if (!title && !text) return;
            if (!title) title = text.substring(0, 20) + (text.length > 20 ? '…' : '');
            momentsLoadStrict().then(function (list) {
                list.unshift({ id: 'm_' + Date.now(), title: title, text: text, ts: Date.now() });
                return momentsSaveStrict(list);
            }).then(function () {
                titleEl.value = ''; textEl.value = '';
                momentsRenderList();
            }).catch(function (err) {
                console.warn('[SF] 手记保存失败:', err);
                // 不清空输入框：用户刚写的字还在，重试不用重打
                sfToast('保存失败：' + ((err && err.message) || '存储不可用'));
            });
        });
        requestAnimationFrame(function () { panel.classList.add('is-open'); });
        momentsRenderList();
    }
    /* 面板已经建过就顺手刷新；没建过就不要凭空弹出来 */
    function sfRefreshMomentPanel() {
        try { if (document.getElementById('sf-moment-list')) momentsRenderList(); } catch (e) { }
    }
    function momentsRenderList() {
        var listEl = document.getElementById('sf-moment-list'); if (!listEl) return;
        // 2.8.54：改用严格读。原来走 momentsLoad()（读失败吞掉返回空数组），
        // 于是「读失败」在界面上长得跟「本来就一条都没有」一模一样 —— 用户会以为收录丢了。
        momentsLoadStrict().then(function (list) {
            if (!list.length) { listEl.innerHTML = '<div class="sfm-panel-empty">还没有收藏名场面<br>在上方添加第一条吧</div>'; return; }
            listEl.innerHTML = '';
            list.forEach(function (m) {
                var el = document.createElement('div');
                el.className = 'sfm-item';
                el.innerHTML = '<div class="sfm-header">'
                    + '<span class="sfm-title">' + esc(m.title) + '</span>'
                    + '<span class="sfm-chevron">▶</span>'
                    + '</div>'
                    + '<div class="sfm-body">'
                    + (m.text ? '<div class="sfm-text">' + esc(m.text) + '</div>' : '')
                    + '<div class="sfm-meta">' + new Date(m.ts).toLocaleString() + '</div>'
                    + '</div>'
                    + '<button class="sfm-del" data-id="' + m.id + '">✕</button>';
                el.querySelector('.sfm-header').addEventListener('click', function () {
                    var body = el.querySelector('.sfm-body');
                    var chevron = el.querySelector('.sfm-chevron');
                    var isOpen = body.classList.toggle('is-open');
                    chevron.classList.toggle('is-open', isOpen);
                });
                el.querySelector('.sfm-del').addEventListener('click', function (e) {
                    e.stopPropagation();
                    momentsLoadStrict().then(function (l) {
                        return momentsSaveStrict(l.filter(function (x) { return x.id !== m.id; }));
                    }).then(function () {
                        el.remove();
                    }).catch(function (err) {
                        // 删不掉就别把 DOM 摘掉：摘了用户以为删成功，重开面板又回来，
                        // 接着再收录同一条就会被判重（这正是 2.8.51 那个"删了还说我已收录"）。
                        console.warn('[SF] 手记删除失败:', err);
                        sfToast('删除失败：' + ((err && err.message) || '存储不可用'));
                        try { momentsRenderList(); } catch (e2) { }
                    });
                });
                listEl.appendChild(el);
            });
        }).catch(function (err) {
            console.warn('[SF] 手记列表读取失败:', err);
            // 读失败必须长得跟"空"不一样，否则用户会当成收录丢了
            listEl.innerHTML = '<div class="sfm-panel-empty">读取失败：'
                + esc((err && err.message) || '存储不可用') + '</div>';
        });
    }

    // 预设分组快速选择


    /* ================================================================
    // 模块三之二：消息级「收录至名场面手记」
    // 原先只能打开手记面板手动粘贴；这里给每条 AI 回复的操作栏挂一个书签按钮。
    // 两个关键取舍：
    //   1. 按钮插在「删除」左边 —— 垃圾桶必须永远是操作栏最右那一个，
    //      否则用户按肌肉记忆点最右会误删（官方 5 个按钮里只有它是 --danger）。
    //   2. 收录时去掉思考块 / COT / 生图提示词 / 官方 next_response 协议块，
    //      只留正文；否则手记里会混进一堆机器数据。
    // ================================================================ */
    var SF_MOMENT_BTN_LABEL = '收录至名场面手记';

    function sfStripForMoment(raw) {
        return String(raw || '')
            .replace(/<think[\s\S]*?<\/think>/gi, '')
            .replace(/<cot[\s\S]*?<\/cot>/gi, '')
            .replace(/<next_response\b[^>]*>[\s\S]*?<\/next_response>/gi, '')
            .replace(/<ui_template_updates>[\s\S]*?<\/ui_template_updates>/gi, '')
            .replace(/image###[\s\S]*?###/gi, '')
            .trim();
    }

    // 轻量提示条：不依赖官方 toast（官方 showToast 未导出），也不进 Vue 管理区。
    function sfToast(text) {
        try {
            var el = document.createElement('div');
            el.textContent = String(text || '');
            el.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);'
                + 'max-width:80vw;padding:8px 14px;border-radius:10px;font-size:12px;line-height:1.4;'
                + 'background:rgba(17,17,17,.9);color:#fff;z-index:100000;pointer-events:none;'
                + 'opacity:0;transition:opacity .18s ease;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            document.body.appendChild(el);
            requestAnimationFrame(function () { el.style.opacity = '1'; });
            setTimeout(function () {
                el.style.opacity = '0';
                setTimeout(function () { if (el.parentElement) el.parentElement.removeChild(el); }, 240);
            }, 1500);
        } catch (e) {}
    }

    function sfOnMomentBookmark(e) {
        try {
            e.preventDefault();
            e.stopPropagation();
        } catch (e0) {}
        var btn = e.currentTarget;
        var wrap = btn && btn.closest ? btn.closest('[data-chat-index]') : null;
        if (!wrap) return;
        var idx = parseInt(wrap.getAttribute('data-chat-index'), 10);
        var st = getVueState();
        var history = st ? sakuraUnwrapRef(st.chatHistory) : null;
        if (isNaN(idx) || !Array.isArray(history) || !history[idx]) { sfToast('没找到这条消息'); return; }
        var body = sfStripForMoment(history[idx].content);
        if (!body) { sfToast('这条没有可收录的正文'); return; }

        // 向上追溯最近一条玩家消息做对戏上下文（截 160 字，够定位剧情即可）
        var prompt = '';
        for (var i = idx - 1; i >= 0; i--) {
            var m = history[i];
            if (m && (m.role === 'user' || m.isSelf)) {
                prompt = sfStripForMoment(m.content).slice(0, 160);
                break;
            }
        }
        var flat = body.replace(/\s+/g, ' ');
        var title = flat.slice(0, 14) + (flat.length > 14 ? '…' : '');
        var text = prompt ? ('【对戏】' + prompt + '\n\n' + body) : body;
        // 消息身份 = 角色 + 会话下标 + 正文长度。
        // 原来按「全文相等」判重，看起来更严，实际是个死锁：只要有一条相同文本残留在库里，
        // 这条就永远收不进去。而残留恰恰来自删除写入失败（save 把错误吞了）。
        var srcKey = String(history[idx].role || '') + '|' + idx + '|' + body.length;

        momentsLoadStrict().then(function (list) {
            var hit = -1;
            for (var k = 0; k < list.length; k++) {
                if (!list[k]) continue;
                // 2.8.51 存的老条目没有 srcKey，退回全文比较，顺手把身份补上
                if (list[k].srcKey === srcKey || (!list[k].srcKey && list[k].text === text)) { hit = k; break; }
            }
            if (hit >= 0) {
                // 同一条消息再点一次：覆盖那一条，而不是拦住用户
                list[hit] = {
                    id: list[hit].id || ('m_' + Date.now()),
                    title: title, text: text, ts: Date.now(), srcKey: srcKey
                };
                return momentsSaveStrict(list).then(function () { return 'updated'; });
            }
            list.unshift({ id: 'm_' + Date.now(), title: title, text: text, ts: Date.now(), srcKey: srcKey });
            return momentsSaveStrict(list).then(function () { return 'ok'; });
        }).then(function (result) {
            sfToast(result === 'updated' ? '已更新「' + title + '」' : '已收录「' + title + '」');
            // 2.8.54：面板开着就同步刷新；没建过就不弹（用户可能根本没用过手记面板）
            sfRefreshMomentPanel();
            try {
                btn.style.color = '#f472b6';
                setTimeout(function () { btn.style.color = ''; }, 1200);
            } catch (e2) {}
        }).catch(function (err) {
            console.warn('[SF] 收录失败:', err);
            sfToast('收录失败：' + ((err && err.message) || '存储不可用'));
        });
    }

    function sfInjectMomentBookmark() {
        var bars = document.querySelectorAll('.message-action-bar');
        for (var i = 0; i < bars.length; i++) {
            var bar = bars[i];
            if (bar.querySelector('.sf-moment-btn')) continue;
            var wrap = bar.closest ? bar.closest('[data-chat-index]') : null;
            if (!wrap) continue;
            if (wrap.getAttribute('data-role') !== 'assistant') continue;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'message-action-button sf-moment-btn';
            btn.title = SF_MOMENT_BTN_LABEL;
            btn.setAttribute('aria-label', SF_MOMENT_BTN_LABEL);
            btn.innerHTML = '<svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor"'
                + ' viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"'
                + ' d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>';
            btn.addEventListener('click', sfOnMomentBookmark);
            var del = bar.querySelector('button[title="删除"]');
            if (del && del.parentElement === bar) bar.insertBefore(btn, del);
            else bar.appendChild(btn);
        }
    }

    // 只对「新出现的操作栏」做检查：聊天流每个字都在触发 childList，
    // 全量 querySelectorAll 太贵；这里先看新增子树里有没有 .message-action-bar。
    function sfStartMomentBookmarkWatch() {
        // 先做一次全量注入：首次进入会话时消息早就渲染好了，等不到 MutationObserver。
        // 放在建 observer 之前，是为了让「MutationObserver 不可用」只降级成「后续新消息不挂按钮」，
        // 而不是连已经渲染出来的历史消息一起丢。
        try { sfInjectMomentBookmark(); } catch (e) { console.warn('[SF] 手记按钮首次注入失败:', e); }
        if (typeof MutationObserver === 'undefined') return;
        var pending = false;
        var obs = new MutationObserver(function (records) {
            var hit = false;
            for (var i = 0; i < records.length && !hit; i++) {
                var added = records[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var node = added[j];
                    if (!node || node.nodeType !== 1) continue;
                    if ((node.classList && node.classList.contains('message-action-bar'))
                        || (node.querySelector && node.querySelector('.message-action-bar'))) {
                        hit = true;
                        break;
                    }
                }
            }
            if (!hit || pending) return;
            pending = true;
            setTimeout(function () {
                pending = false;
                try { sfInjectMomentBookmark(); } catch (e) { console.warn('[SF] 手记按钮注入失败:', e); }
            }, 60);
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    /* ================================================================
    // 模块四：条目关键词搜索（预设管理 / 世界书 / 正则脚本）
    // ================================================================ */
    // 按钮基类直接用官网的 settings-icon-button：本地 styles.css 定义、跟随主题令牌
    // （--c-surface / --c-border / --c-text-2），日夜间自动适配，且不依赖 Tailwind CDN，
    // 与顶栏上导出/导入/新建按钮完全同风格，不会有"补丁按钮很突兀"的问题。
    var SAKURA_ENTRY_SEARCH_CLS = 'settings-icon-button sakura-entry-search-btn';

    function getVueState() {
        try {
            var el = document.getElementById('app');
            if (el && el.__vue_app__ && el.__vue_app__._instance) {
                return el.__vue_app__._instance.setupState || el.__vue_app__._instance.proxy || null;
            }
            if (el && el.__vue_app__ && el.__vue_app__._container && el.__vue_app__._container._vnode) {
                return el.__vue_app__._container._vnode.component ? el.__vue_app__._container._vnode.component.setupState : null;
            }
        } catch (e) {}
        return null;
    }

    function sakuraUnwrapRef(v) {
        return (v && typeof v === 'object' && 'value' in v) ? v.value : v;
    }

    function sakuraEscapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&#34;').replace(/'/g, '&#39;');
    }

    function sakuraPick(obj) {
        if (!obj) return '';
        for (var i = 1; i < arguments.length; i++) {
            var k = arguments[i];
            var v = obj[k];
            if (typeof v === 'string' && v) return v;
        }
        return '';
    }

    var SAKURA_ENTRY_SEARCH_DEFS = [
        {
            key: 'presets', headerTitle: '预设管理', arrKey: 'presets', editFn: 'editPreset', label: '预设',
            nameOf: function (e) { return sakuraPick(e, 'name') || '未命名预设'; },
            searchOf: function (e) { return [sakuraPick(e, 'name'), sakuraPick(e, 'content')].join('\n'); }
        },
        {
            key: 'regex', headerTitle: '正则脚本', arrKey: 'regexScripts', editFn: 'editRegex', label: '正则脚本',
            nameOf: function (e) { return sakuraPick(e, 'name', 'scriptName') || '未命名脚本'; },
            searchOf: function (e) {
                return [
                    sakuraPick(e, 'name', 'scriptName'),
                    sakuraPick(e, 'regex', 'findRegex'),
                    sakuraPick(e, 'replacement', 'replaceString')
                ].join('\n');
            }
        }
    ];

    function injectEntrySearch() {
        var headers = document.querySelectorAll('settings-page-header, .settings-page-header');
        for (var i = 0; i < headers.length; i++) {
            var hdr = headers[i];
            var txt = hdr.textContent || '';
            var def = null;
            for (var d = 0; d < SAKURA_ENTRY_SEARCH_DEFS.length; d++) {
                if (txt.indexOf(SAKURA_ENTRY_SEARCH_DEFS[d].headerTitle) !== -1) {
                    def = SAKURA_ENTRY_SEARCH_DEFS[d];
                    break;
                }
            }
            if (!def) continue;
            if (hdr.querySelector('.sakura-entry-search-btn')) continue;

            // 优先查找 SettingsPageHeader 的按钮容器 slot
            var wrapper = hdr.querySelector('div.space-x-2');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = SAKURA_ENTRY_SEARCH_CLS + ' sakura-entry-search-btn';
            btn.title = '搜索' + def.label;
            btn.setAttribute('aria-label', '搜索' + def.label);
            btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"></path></svg>';
            
            (function (currentDef) {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    openEntrySearch(currentDef.key);
                });
            })(def);

            if (wrapper) {
                wrapper.insertBefore(btn, wrapper.firstChild);
            } else {
                // 兼容降级插入点
                var anchor = hdr.querySelector('.settings-create-button, .settings-icon-button');
                if (anchor && anchor.parentElement) {
                    anchor.parentElement.insertBefore(btn, anchor);
                } else {
                    hdr.appendChild(btn);
                }
            }
        }
    }

    function openEntrySearch(kind) {
        var st = getVueState();
        if (!st) { alert('无法访问数据'); return; }
        var def = null;
        for (var d = 0; d < SAKURA_ENTRY_SEARCH_DEFS.length; d++) {
            if (SAKURA_ENTRY_SEARCH_DEFS[d].key === kind) {
                def = SAKURA_ENTRY_SEARCH_DEFS[d];
                break;
            }
        }
        if (!def) return;
        var arr = sakuraUnwrapRef(st[def.arrKey]);
        var list = Array.isArray(arr) ? arr : [];
        var idx = list.map(function (entry, i) {
            return {
                index: i,
                name: String(def.nameOf(entry) || ''),
                text: String(def.searchOf(entry) || '')
            };
        });

        var exist = document.getElementById('sakura-entry-search');
        if (exist) exist.remove();
        var mask = document.createElement('div');
        mask.id = 'sakura-entry-search';
        mask.className = 'sakura-mask';
        mask.style.zIndex = '99999';
        var box = document.createElement('div');
        box.className = 'sakura-box';
        var head = document.createElement('div');
        head.className = 'sakura-head';
        head.innerHTML = [
            '<div class="sakura-modal-topbar">',
            '    <div class="sakura-title-with-icon">',
            '        <svg class="sakura-title-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>',
            '        <span>搜索' + def.label + '</span>',
            '    </div>',
            '    <button type="button" class="sakura-close-btn" title="关闭">✕</button>',
            '</div>',
            '<div class="sakura-sub">输入关键词，命中条目实时列出 · 点击直接跳转编辑</div>'
        ].join('');

        var body = document.createElement('div');
        body.className = 'sakura-body';
        var searchWrap = document.createElement('div');
        searchWrap.className = 'sakura-es-search';
        var input = document.createElement('input');
        input.type = 'search';
        input.className = 'sakura-es-input';
        input.placeholder = '输入关键词，例如：神化';
        input.setAttribute('autocomplete', 'off');
        searchWrap.appendChild(input);
        var countEl = document.createElement('div');
        countEl.className = 'sakura-es-count';
        var resultEl = document.createElement('div');
        resultEl.className = 'sakura-es-results custom-scrollbar';
        body.appendChild(searchWrap);
        body.appendChild(countEl);
        body.appendChild(resultEl);
        box.appendChild(head);
        box.appendChild(body);
        mask.appendChild(box);

        var render = function () {
            var q = input.value.trim().toLowerCase();
            resultEl.innerHTML = '';
            if (!q) {
                countEl.textContent = '共 ' + list.length + ' 条 · 输入关键词开始搜索';
                return;
            }
            var hits = idx.filter(function (it) { return it.text.toLowerCase().indexOf(q) !== -1; });
            countEl.textContent = '命中 ' + hits.length + ' 条 / 共 ' + list.length + ' 条';
            if (!hits.length) {
                var empty = document.createElement('div');
                empty.className = 'sakura-es-empty';
                empty.textContent = '没有匹配的条目';
                resultEl.appendChild(empty);
                return;
            }
            var escStr = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            var re = new RegExp(escStr, 'ig');
            var hl = function (str) { return str.replace(re, function (m) { return '<mark>' + m + '</mark>'; }); };
            hits.forEach(function (hit) {
                var row = document.createElement('div');
                row.className = 'sakura-es-item';
                var low = hit.text.toLowerCase();
                var pos = low.indexOf(q);
                var snippet;
                if (pos >= 0) {
                    var start = Math.max(0, pos - 24);
                    var end = Math.min(hit.text.length, pos + q.length + 24);
                    snippet = (start > 0 ? '…' : '') + hit.text.slice(start, end) + (end < hit.text.length ? '…' : '');
                } else {
                    snippet = hit.text.slice(0, 60);
                }
                row.innerHTML = '<div class="sakura-es-name">' + hl(sakuraEscapeHtml(hit.name)) + '</div><div class="sakura-es-snippet">' + hl(sakuraEscapeHtml(snippet)) + '</div>';
                row.addEventListener('click', function () {
                    mask.remove();
                    try {
                        if (typeof st[def.editFn] === 'function') st[def.editFn](hit.index);
                    } catch (err) { console.warn('[SF] 搜索跳转失败:', err); }
                });
                resultEl.appendChild(row);
            });
        };

        var timer = null;
        input.addEventListener('input', function () {
            if (timer) clearTimeout(timer);
            timer = setTimeout(render, 120);
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); render(); }
        });
        head.querySelector('.sakura-close-btn').onclick = function () { mask.remove(); };
        mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });
        document.body.appendChild(mask);
        render();
        try { input.focus(); } catch (e) {}
    }


    /* ================================================================
    // 调度
    // ================================================================ */
    onReady(function () {
        var styleEl = document.createElement('div');
        styleEl.innerHTML = SF_CSS;
        document.head.appendChild(styleEl.firstChild);
        try { sfMountToolbar(); } catch (e) { console.warn('[SF] 工具栏按钮挂载失败:', e); }
        try { initPresence(); } catch (e) { console.warn('[SF] 沉浸时长初始化失败:', e); }
        // 名场面触发按钮由 sfMountToolbar() 一并维护（紧跟回车切换按钮，同一排，间距 8px）。
        // 回车转换行按钮：2.8.21 起改回 DOM 注入 —— 原来那条 index.html 规则（锚 .relative.mr-2
        // 容器）因官网删除该容器而锚点失配、一直处于豁免状态，按钮就此消失。现注入官方工具栏，
        // 点击走 window.RPHubEnterToggle，与 Vue 层共用同一份状态（持久化仍在 localStorage）。
        // 预设分组快捷选择：已改回 HTML 补丁（preset-editor-modal 的 presetGroups prop +
        // 输入框下方一排分组按钮），不再用 DOM 方案 —— 弹窗是 v-if，DOM 监听会在重开后失效。

        // 条目关键词搜索（世界书、预设管理、正则脚本）按钮注入与路由视图监听
        // MutationObserver 用脏标记合并：聊天页消息流会高频触发 childList/subtree，
        // 这里把一串突变合并成一次扫描，避免每个节点变动都全文档 querySelectorAll。
        try {
            injectEntrySearch();
            var searchPending = false;
            var searchObs = new MutationObserver(function () {
                if (searchPending) return;
                searchPending = true;
                setTimeout(function () {
                    searchPending = false;
                    try { injectEntrySearch(); } catch (e) { console.warn('[SF] 条目搜索注入失败:', e); }
                }, 0);
            });
            searchObs.observe(document.body, { childList: true, subtree: true });
        } catch (e) {
            console.warn('[SF] 条目搜索初始化失败:', e);
        }

        // 消息级「收录至名场面手记」按钮：跟着消息流一起长出来
        try {
            sfStartMomentBookmarkWatch();
        } catch (e) {
            console.warn('[SF] 手记按钮监听失败:', e);
        }
    });

    
})();
