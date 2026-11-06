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

  // ========== 全时防顶栏上移/窗口程序性滚动漂移守护 ==========
  // 彻底防止 Android IME/Focus 把整个 window/document 滚上去（产生 37px 顶栏被切上移 bug）
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
  // 页面加载 6 秒后检测：如果 Vue 挂载中断（例如仍有 v-cloak 或发生致命启动异常且页面无内容）
  setTimeout(function () {
    try {
      var appEl = document.getElementById('app');
      var isCloaked = appEl && appEl.hasAttribute('v-cloak');
      var hasChildren = appEl && appEl.children && appEl.children.length > 0;
      
      // 如果发生严重初始化异常且应用未成功展开，或者 6 秒后仍挂在 v-cloak 上
      if ((fatalErrorEncountered && isCloaked) || (isCloaked && !hasChildren)) {
        var reason = fatalReason || 'Vue 挂载超时 (仍处于 v-cloak 遮罩状态)';
        if (window.AndroidBridge && window.AndroidBridge.reportWhiteScreenFailure) {
          window.AndroidBridge.reportWhiteScreenFailure(reason);
        }
      }
    } catch (watchdogErr) {}
  }, 6500);

  // ========== 持久化存储申请（2.8.55）==========
  // WebView 的 IndexedDB 在系统存储压力下是「可回收的」：Chromium 的配额模型会在压力下
  // 把整个 origin 的存储一起清掉（不是只清缓存）。官网从不调 persist()，我们之前也不调
  // ⇒ 角色卡、聊天记录、名场面手记都可能在一次系统清理后整体消失，且用户看不到提示。
  // navigator.storage.persist() 申请把本 origin 标记为 persistent：granted 之后数据
  // 不再被自动回收（仍然会占空间，需要用户自己清）。是否授予由浏览器按参与度/配额判定，
  // 不需要用户点确认，失败也只是保持原状，所以这里静默申请、只在异常时留日志。
  (function requestPersistentStorage() {
    try {
      var s = navigator.storage;
      if (!s || typeof s.persist !== 'function') return;
      s.persist().then(function (granted) {
        // 只在“未授予”时留一条记录，正常授权不刷日志
        if (!granted) send('storage', 'persist 未授予，IndexedDB 仍可能被系统自动回收', '', 0);
      }, function (err) {
        send('storage', 'persist 申请异常: ' + ((err && err.message) || err), '', 0);
      });
    } catch (e) {}
  })();

  return 'installed';
})();