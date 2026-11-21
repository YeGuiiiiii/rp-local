// RP-Hub 早期错误捕获与白屏哨兵：由 MainActivity 在 onPageStarted 注入，早于页面脚本执行。
// 目的：抓住初始化阶段（onPageFinished 之前）的未捕获异常，并提供白屏看门狗自愈联动。
(function () {
  if (window.__rphubEarlyTrapInstalled) return;
  window.__rphubEarlyTrapInstalled = true;

  var fatalErrorEncountered = false;
  var fatalReason = '';

  function send(kind, msg, src, line) {
    try {
      if (window.AndroidBridge && window.AndroidBridge.logJsError) {
        window.AndroidBridge.logJsError(String(kind || 'early'), String(msg || ''), String(src || ''), Number(line || 0));
      }
    } catch (e) {}
  }

  function fmt(err) {
    try {
      if (err && err.stack) return String(err.stack).replace(/\s+/g, ' ').slice(0, 900);
      return '';
    } catch (e) { return ''; }
  }

  function checkFatalIndicator(text) {
    if (!text) return false;
    var lower = text.toLowerCase();
    return lower.indexOf('typeerror') !== -1 ||
           lower.indexOf('is not a function') !== -1 ||
           lower.indexOf('cannot read properties of undefined') !== -1 ||
           lower.indexOf('cannot destructure property') !== -1 ||
           lower.indexOf('failed to mount') !== -1;
  }

  window.onerror = function (message, source, lineno, colno, error) {
    var text = String(message || 'unknown');
    var st = fmt(error);
    if (st) text += ' | stack: ' + st;
    send('early.onerror', text, source || '', lineno || 0);

    if (checkFatalIndicator(text)) {
      fatalErrorEncountered = true;
      fatalReason = text;
    }
    return false;
  };

  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    var text = (r && (r.stack || r.message)) || String(r);
    send('early.rejection', text, '', 0);

    if (checkFatalIndicator(text)) {
      fatalErrorEncountered = true;
      fatalReason = text;
    }
  });

  var isTopFrame = true;
  try { isTopFrame = window.parent === window; } catch (e) { isTopFrame = false; }

  // ========== 全时防顶栏上移/窗口程序性滚动漂移守护 ==========
  // 彻底防止 Android IME/Focus 把整个 window/document 滚上去（产生 37px 顶栏被切上移 bug）
  if (isTopFrame) {
    function preventWindowScroll() {
      try {
        if (window.scrollY !== 0 || (document.documentElement && document.documentElement.scrollTop !== 0) || (document.body && document.body.scrollTop !== 0)) {
          window.scrollTo(0, 0);
          if (document.documentElement && document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
          if (document.body && document.body.scrollTop !== 0) document.body.scrollTop = 0;
        }
      } catch (e) {}
    }
    window.addEventListener('scroll', preventWindowScroll, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', preventWindowScroll, { passive: true });
      window.visualViewport.addEventListener('scroll', preventWindowScroll, { passive: true });
    }
    document.addEventListener('focusout', function () {
      setTimeout(preventWindowScroll, 50);
    });
    window.addEventListener('orientationchange', function () {
      setTimeout(preventWindowScroll, 100);
    });

    // ========== 白屏看门狗（Watchdog）==========
    // 页面加载 6.5 秒后检测：仅在顶层窗口执行，且排除静态 <template> 占位节点，防止白屏时误判已渲染。
    setTimeout(function () {
      try {
        var appEl = document.getElementById('app');
        var isCloaked = appEl && appEl.hasAttribute('v-cloak');
        var hasRenderedChildren = !!(appEl && appEl.children && Array.prototype.some.call(appEl.children, function (node) {
          return node && node.tagName !== 'TEMPLATE';
        }));

        if ((fatalErrorEncountered && isCloaked) || (isCloaked && !hasRenderedChildren)) {
          var reason = fatalReason || 'Vue 挂载超时 (仍处于 v-cloak 遮罩状态)';
          if (window.AndroidBridge && window.AndroidBridge.reportWhiteScreenFailure) {
            window.AndroidBridge.reportWhiteScreenFailure(reason);
          }
        }
      } catch (watchdogErr) {}
    }, 6500);

    // ========== 持久化存储申请（2.8.55）==========
    (function requestPersistentStorage() {
      try {
        var s = navigator.storage;
        if (!s || typeof s.persist !== 'function') return;
        s.persist().then(function (granted) {
          if (!granted) send('storage', 'persist 未授予，IndexedDB 仍可能被系统自动回收', '', 0);
        }, function (err) {
          send('storage', 'persist 申请异常: ' + ((err && err.message) || err), '', 0);
        });
      } catch (e) {}
    })();
  }

  return 'installed';
})();