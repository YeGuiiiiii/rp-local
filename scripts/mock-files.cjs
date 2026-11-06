module.exports = function installFileBridge() {
  if (window.top !== window) return;
  const originalSet = Storage.prototype.setItem;
  const storeKey = '__qa_native_files';
  const files = window.__qaNativeFiles = JSON.parse(localStorage.getItem(storeKey) || '{}');
  const response = value => JSON.stringify({ ok: true, value });
  const persist = () => originalSet.call(localStorage, storeKey, JSON.stringify(files));
  const validate = name => {
    if (!/^(个人数据|角色卡数据|图片)(\/|$)/.test(name) || name.split('/').some(p => p === '..' || p === '.')) throw new Error('Invalid path');
  };
  window.RPLocalFiles = {
    writeText(name, value) {
      validate(name);
      files[name] = { text: value };
      persist();
      return response(true);
    },
    writeTextIfChanged(name, value) {
      validate(name);
      if (files[name]?.text === value) return response(false);
      // Keep the existing write hook so failure fixtures exercise both paths.
      return window.RPLocalFiles.writeText(name, value);
    },
    runtimeInfo() {
      return response({ packageName: 'com.rphub.local', version: window.RP_LOCAL_VERSION, android: '15', webView: 'Test WebView' });
    },
    consumeReleaseNotice() {
      // Existing regression fixtures represent an installation that saw the notice.
      const version = window.RP_LOCAL_RELEASE;
      const previous = Number(localStorage.getItem('__qa_release_native') ?? (window.__qaFreshInstall ? 0 : version));
      if (previous >= version) return response(false);
      originalSet.call(localStorage, '__qa_release_native', String(version));
      return response(true);
    },
    readText(name) { validate(name); return response(files[name]?.text ?? null); },
    writeImage(name, value) {
      validate(name);
      files[name] = { binary: value };
      persist();
      return response(true);
    },
    readImage(name) {
      validate(name);
      const file = files[name];
      if (!name.startsWith('图片/') || !file?.binary) return JSON.stringify({ ok: false, error: 'Image missing' });
      const extension = name.split('.').pop();
      return response({ base64: file.binary, mime: { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' }[extension] });
    },
    exists(name) { validate(name); return response(!!files[name]); },
    remove(name) { validate(name); delete files[name]; persist(); return response(true); },
    list(name) {
      validate(name);
      const found = new Map();
      Object.entries(files).forEach(([file, value]) => {
        if (!file.startsWith(name + '/')) return;
        const child = file.slice(name.length + 1).split('/');
        found.set(child[0], { name: child[0], directory: child.length > 1, bytes: value.binary ? Math.floor(value.binary.length * .75) : value.text?.length || 0 });
      });
      return response([...found.values()]);
    },
    locations() { return response({ personal: 'private/RP数据/个人数据', characters: 'app-files/RP数据/角色卡数据', images: 'app-files/RP数据/图片' }); },
  };
};
