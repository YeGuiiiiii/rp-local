// RP-Hub 网页 JS 错误捕获：由 MainActivity 注入，错误经 AndroidBridge.logJsError 写入 rphub-web-error.log
(function () {
  if (window.__rphubErrorTrapInstalled) return 'already';
  window.__rphubErrorTrapInstalled = true;
  function send(kind, msg, src, line) {
    try {
      if (window.AndroidBridge && window.AndroidBridge.logJsError) {
        window.AndroidBridge.logJsError(String(kind || 'js'), String(msg || ''), String(src || ''), Number(line || 0));
      }
    } catch (e) {}
  }
  function stackOf(err) {
    try {
      if (err && err.stack) return String(err.stack).replace(/\s+/g, ' ').slice(0, 900);
      return '';
    } catch (e) { return ''; }
  }
  window.addEventListener('error', function (e) {
    try {
      if (e && e.target && e.target.tagName && !e.message) {
        send('resource', '资源加载失败: ' + (e.target.src || e.target.href || ''), e.target.tagName, 0);
        return;
      }
      var msg = (e && e.message) || 'unknown error';
      if (e && e.error) { var st = stackOf(e.error); if (st) msg = msg + ' | stack: ' + st; }
      send('onerror', msg, (e && e.filename) || '', (e && e.lineno) || 0);
    } catch (err) {}
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    try {
      var r = e && e.reason;
      send('unhandledrejection', (r && (r.stack || r.message)) || String(r), '', 0);
    } catch (err) {}
  });
  var origError = console.error;
  console.error = function () {
    try {
      var parts = [];
      for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i];
        parts.push(a && a.stack ? a.stack : String(a));
      }
      send('console.error', parts.join(' '), '', 0);
    } catch (err) {}
    return origError.apply(console, arguments);
  };
  // Vue 渲染/挂载阶段的告警也回传，便于定位组件级白屏
  var origWarn = console.warn;
  console.warn = function () {
    try {
      var parts = [];
      for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i];
        parts.push(a && a.stack ? a.stack : String(a));
      }
      var text = parts.join(' ');
      if (text.indexOf('Vue') !== -1 || text.indexOf('Unhandled') !== -1 || text.indexOf('error') !== -1) {
        send('console.warn', text, '', 0);
      }
    } catch (err) {}
    return origWarn.apply(console, arguments);
  };
  return 'installed';
})();