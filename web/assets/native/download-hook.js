/* RP-Hub 下载钩子（2.8.56）
 *
 * 问题：万相广场（rphforum）的下载实现是
 *   fetch('/api/cards/{id}/download', {method:'POST'}) → blob
 *   → URL.createObjectURL(blob) → 造 <a download href="blob:…"> → a.click()
 * → 站点随后自己弹「已发起下载，请查看浏览器下载列表」。
 *
 * 为什么在 App 里必然失败（两层机制，缺一层都存不住）：
 *   ① `DownloadListener.onDownloadStart` 收到的是 blob: URL。blob 的字节活在**渲染进程**
 *      里，原生侧拿到的是一个网页内部句柄，DownloadManager / 系统浏览器都取不到内容
 *      ⇒ 请求要么排队后失败，要么根本没有外部程序认领。
 *   ② WebView 对 `<a download>` 的默认动作是「在本帧内导航到该 URL」，不触发下载委托。
 *      blob: 既不能导航也不能下载，于是只剩站点自己那句成功提示。
 *
 * 结论：App 侧没有任何办法从原生层拿到这个 blob 的字节，只能在**页面上下文**里
 * 把 Blob 读成 base64，再经 JS 桥交给原生写进系统下载目录（MediaStore）。
 *
 * 这个脚本因此做三件事，全部是旁路，不改站点任何代码：
 *   1. 记住 URL.createObjectURL 产出的 Blob（站点 3 秒后 revoke 也不影响我们）；
 *   2. 捕获阶段拦截 <a download href="blob:…|data:…"> 的点击，preventDefault 掉原始导航；
 *   3. FileReader → base64 → 桥 saveFile(base64, fileName, mimeType)。
 *
 * 2.8.80 补的第 4 件：**没挂到文档上的 <a>**。
 * 站点（灯塔审核面板、创作中心导出）的写法是
 *   const a = document.createElement('a'); a.href = url; a.download = name; a.click();
 * 全程没有 appendChild。分离节点的事件传播路径只有它自己，document 不在路径上 ⇒
 * 上面第 2 条挂的 document 捕获监听收到 0 次（无头 Edge 实测），导出只剩站点自己那句
 * 「已导出」。这里改写 HTMLAnchorElement.prototype.click 补上这条缝，只接管
 * 「未入文档 + 带 download + blob:/data:」，入文档的仍走 document 监听（不重复处理）。
 *
 * 桥的名称：灯塔独立窗口注入的桥叫 RPHubLighthouse（只暴露 saveFile / logJsError），
 * 主 WebView 的桥叫 AndroidBridge。两者都试，都没有就静默放弃（桌面端即此情形）。
 */
(function () {
  if (window.__rphubDownloadHook) return;
  window.__rphubDownloadHook = 1;

  var blobs = {};

  function bridge() {
    try {
      var b = window.RPHubLighthouse || window.AndroidBridge;
      if (b && typeof b.saveFile === 'function') return b;
    } catch (e) {
    }
    return null;
  }

  function log(message) {
    try {
      var b = window.RPHubLighthouse || window.AndroidBridge;
      if (b && b.logJsError) {
        b.logJsError('download', String(message).slice(0, 300), String(location.href).slice(0, 200), 0);
      }
    } catch (e) {
    }
  }

  // 1. 记住 Blob。站点是「createObjectURL → 立刻 click → 3 秒后 revoke」，
  //    我们在 click 时同步取对象，比再去 fetch 一次更可靠（尤其是大文件）。
  try {
    var originalCreate = URL.createObjectURL;
    if (typeof originalCreate === 'function') {
      URL.createObjectURL = function (object) {
        var url = originalCreate.call(URL, object);
        try {
          if (object && typeof object.size === 'number') blobs[url] = object;
        } catch (e) {
        }
        return url;
      };
    }
  } catch (e) {
  }

  function guessMime(name, type) {
    if (type && type !== 'application/octet-stream') return type;
    var lower = String(name || '').toLowerCase();
    if (/\.json$/.test(lower)) return 'application/json';
    if (/\.txt$/.test(lower)) return 'text/plain';
    if (/\.png$/.test(lower)) return 'image/png';
    if (/\.jpe?g$/.test(lower)) return 'image/jpeg';
    if (/\.webp$/.test(lower)) return 'image/webp';
    if (/\.gif$/.test(lower)) return 'image/gif';
    if (/\.zip$/.test(lower)) return 'application/zip';
    if (/\.pdf$/.test(lower)) return 'application/pdf';
    return type || 'application/octet-stream';
  }

  function toBase64(blob, onDone, onFail) {
    try {
      var reader = new FileReader();
      reader.onload = function () {
        var text = String(reader.result || '');
        var at = text.indexOf('base64,');
        if (at < 0) {
          onFail('data url without base64');
          return;
        }
        onDone(text.slice(at + 7), blob.size, blob.type);
      };
      reader.onerror = function () {
        onFail('reader error');
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      onFail(e && e.message ? e.message : String(e));
    }
  }

  function extFor(mime) {
    var m = String(mime || '').toLowerCase();
    if (m.indexOf('json') >= 0) return '.json';
    if (m.indexOf('zip') >= 0) return '.zip';
    if (m.indexOf('plain') >= 0) return '.txt';
    if (m.indexOf('png') >= 0) return '.png';
    if (m.indexOf('jpeg') >= 0) return '.jpg';
    if (m.indexOf('pdf') >= 0) return '.pdf';
    return '';
  }

  function deliver(blob, name) {
    var api = bridge();
    if (!api) return;
    var finalName = name || ('rphub-download' + extFor(blob.type));
    // base64 会把体积放大 1.33 倍，再进 Java 侧解码又是同样大小的一份字节数组。
    // 超过 48MB 硬跳过：与其把渲染进程撑到 OOM（表现为整页白屏），不如什么都不做。
    if (blob.size > 48 * 1024 * 1024) {
      log('blob too large, skipped: ' + blob.size + ' ' + finalName);
      return;
    }
    toBase64(blob, function (base64) {
      try {
        api.saveFile(base64, finalName, guessMime(finalName, blob.type));
      } catch (e) {
        log('saveFile threw: ' + (e && e.message ? e.message : String(e)));
      }
    }, function (reason) {
      log('read failed: ' + reason);
    });
  }

  function fromBlobUrl(url, name) {
    var hit = blobs[url];
    if (hit) {
      deliver(hit, name);
      return;
    }
    // 兜底：Blob 没被记录到（例如跨页创建、或我们注入晚于创建）时重新取一次。
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 0) deliver(xhr.response, name);
        else log('blob xhr status ' + xhr.status);
      };
      xhr.onerror = function () {
        log('blob xhr error');
      };
      xhr.send();
    } catch (e) {
      log('blob xhr threw: ' + (e && e.message ? e.message : String(e)));
    }
  }

  function fromDataUrl(url, name) {
    var comma = url.indexOf(',');
    if (comma < 0) return;
    var head = url.slice(0, comma);
    var body = url.slice(comma + 1);
    var mime = (head.match(/data:([^;,]+)/) || [])[1] || 'application/octet-stream';
    var api = bridge();
    if (!api) return;
    if (head.indexOf('base64') < 0) {
      try {
        body = btoa(decodeURIComponent(body));
      } catch (e) {
        log('data url decode failed');
        return;
      }
    }
    try {
      api.saveFile(body, name, guessMime(name, mime));
    } catch (e) {
      log('saveFile threw: ' + (e && e.message ? e.message : String(e)));
    }
  }

  // 2. 判定一个 <a> 是否属于「我们该接管的下载」。
  //    返回 null 表示放行（交给容器原有行为），否则返回命中信息。
  function anchorTarget(node) {
    if (!node || node.tagName !== 'A') return null;

    var href = node.getAttribute('href') || '';
    var name = node.getAttribute('download') || '';
    var isBlob = href.indexOf('blob:') === 0;
    var isData = href.indexOf('data:') === 0;
    if (!isBlob && !isData) return null;
    if (!name && !isBlob) return null;
    if (!name && isBlob) {
      // 没有 download 属性的 blob 链接可能是站内的图片/PDF 预览，不去抢它。
      var recorded = blobs[href];
      if (!recorded) return null;
      var type = String(recorded.type || '').toLowerCase();
      if (/^image\//.test(type) || /^text\/html/.test(type) || type.indexOf('pdf') >= 0) return null;
    }

    // 没有桥就不要抢这次点击 —— 交给容器原有行为，至少不改变现状。
    // （桌面端根本不注入本脚本；灯塔窗口的桥是随 WebView 建的，正常不会走到这里。）
    if (!bridge()) return null;

    return { href: href, name: name, isBlob: isBlob };
  }

  function handleAnchor(node) {
    var hit = anchorTarget(node);
    if (!hit) return false;
    if (hit.isBlob) fromBlobUrl(hit.href, hit.name);
    else fromDataUrl(hit.href, hit.name);
    return true;
  }

  // 3. 捕获阶段拦截。挂在 document 上 ⇒ 站点把 <a> 追加到 body 后调 a.click()
  //    触发的事件也一样会先经过这里（capture 是从 document 往下走的）。
  document.addEventListener('click', function (event) {
    var node = event.target;
    while (node && node !== document && (!node.tagName || node.tagName !== 'A')) {
      node = node.parentNode;
    }
    if (!node || node === document) return;
    if (!anchorTarget(node)) return;

    event.preventDefault();
    event.stopPropagation();
    handleAnchor(node);
  }, true);

  // 4. 分离节点（createElement 后从未入文档）的 a.click()。
  //    上面的 document 监听看不到这类调用：分离节点派发事件时，传播路径只有节点自己。
  //    改写 prototype 而不是拦具体元素，是因为站点在点击那一刻才现造 <a>。
  function isDetached(node) {
    var root = node;
    while (root.parentNode) root = root.parentNode;
    // 不用 node.isConnected：老 WebView（Chrome < 51）上它是 undefined，
    // !undefined 会把已入文档的节点误判成分离，导致同一份文件被接两次。
    return root !== document;
  }

  try {
    var proto = window.HTMLAnchorElement && HTMLAnchorElement.prototype;
    var rawClick = proto && proto.click;
    if (typeof rawClick === 'function' && !proto.__rphubClickPatched) {
      proto.__rphubClickPatched = 1;
      proto.click = function () {
        try {
          if (isDetached(this) && anchorTarget(this)) {
            log('detached anchor: ' + (this.getAttribute('download') || '(no name)'));
            handleAnchor(this);
            return;
          }
        } catch (e) {
        }
        return rawClick.apply(this, arguments);
      };
    }
  } catch (e) {
  }
})();