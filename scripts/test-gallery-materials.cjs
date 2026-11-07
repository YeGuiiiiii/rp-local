const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/glass-ui-1.09');
fs.mkdirSync(output, { recursive: true });
const portrait = fs.readFileSync('C:/Users/pzh/Downloads/大梦未觉.png');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const contexts = [], errors = [], missing = [];
  async function load(permission) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    contexts.push(context);
    await context.addInitScript(installFileBridge);
    await context.addInitScript(permission => {
      const add = window.addEventListener, remove = window.removeEventListener;
      window.__sensorListeners = new Set();
      window.addEventListener = function (type, callback, ...args) {
        if (type === 'deviceorientation') __sensorListeners.add(callback);
        return add.call(this, type, callback, ...args);
      };
      window.removeEventListener = function (type, callback, ...args) {
        if (type === 'deviceorientation') __sensorListeners.delete(callback);
        return remove.call(this, type, callback, ...args);
      };
      Object.defineProperty(window.DeviceOrientationEvent, 'requestPermission', {
        value: permission ? async () => { window.__permissionRequests = (window.__permissionRequests || 0) + 1; return permission; } : undefined
      });
    }, permission);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'https://sta1n156.github.io') return route.abort();
      if (url.pathname === '/portrait.png') return route.fulfill({ body: portrait, contentType: 'image/png' });
      if (url.pathname.includes('/_files/')) {
        const name = decodeURIComponent(url.pathname.split('/_files/')[1]);
        const file = await page.evaluate(name => __qaNativeFiles[name], name);
        return route.fulfill(file?.binary ? { body: Buffer.from(file.binary, 'base64'), contentType: 'image/webp' } : { status: 404, body: '' });
      }
      const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
      if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        if (url.pathname.includes('/assets/')) missing.push(url.pathname);
        return route.fulfill({ status: 404, body: '' });
      }
      return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    await page.goto('https://sta1n156.github.io/RP-Hub/');
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(async base64 => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
      __qa.characters = [0, 1, 2, 3].map(i => ({ uuid: 'material-' + i,
        name: ['大梦未觉', '夜色中的长信与漫长的角色卡名字', '玻璃书页', '月光来信'][i], avatar: '/portrait.png',
        first_mes: '测试正文', worldInfo: [], regexScripts: [], uiTemplates: [] }));
      await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
      const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), letter => letter.charCodeAt(0))], { type: 'image/png' }));
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 600;
      canvas.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
      const photo = canvas.toDataURL('image/webp', .85).split(',')[1];
      const folder = RPLocalStore.safeName(__qa.characters[0].name);
      RPLocalFiles.writeImage('图片/' + folder + '/one.webp', photo);
      RPLocalFiles.writeImage('图片/' + folder + '/two.webp', photo);
    }, portrait.toString('base64'));
    return { page, context };
  }
  async function capture(page, name) {
    await page.evaluate(() => { __qa.toasts = []; document.activeElement?.blur(); });
    await page.waitForTimeout(240);
    await page.waitForFunction(() => [...document.images].filter(image => image.getClientRects().length)
      .every(image => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name);
  }
  async function sensor(page, gamma, beta = 45) {
    await page.evaluate(({ gamma, beta }) => {
      const event = new Event('deviceorientation');
      Object.assign(event, { gamma, beta }); window.dispatchEvent(event);
    }, { gamma, beta });
    await page.waitForTimeout(230);
  }
  try {
    const { page, context } = await load();
    assert.equal(await page.evaluate(() => __sensorListeners.size), 0);
    await page.evaluate(() => { RPThemePacks.set('vampire'); __qa.navigateWorkspace('album'); });
    assert.equal(await page.evaluate(() => __sensorListeners.size), 1, JSON.stringify(await page.evaluate(() => ({
      hidden: document.hidden, reduced: matchMedia('(prefers-reduced-motion:reduce)').matches, view: __qa.currentView,
      active: __qa.galleryPage.$.props.active
    }))));
    const aperture = page.locator('.shell-album-aperture').first();
    await page.waitForFunction(() => document.querySelector('.shell-album-cover img')?.naturalWidth === 400);
    await page.waitForTimeout(240);
    const original = await aperture.locator('img').evaluate(image => image.getBoundingClientRect().toJSON());
    await sensor(page, 0); await sensor(page, -25);
    const left = await aperture.screenshot({ path: path.join(output, 'reflection-left.png') });
    const leftTransform = await aperture.evaluate(el => getComputedStyle(el, '::before').transform);
    await sensor(page, 25);
    const right = await aperture.screenshot({ path: path.join(output, 'reflection-right.png') });
    const rightTransform = await aperture.evaluate(el => getComputedStyle(el, '::before').transform);
    assert.notEqual(leftTransform, rightTransform);
    assert.equal(left.equals(right), false, 'Reflection visibly changes');
    assert.deepEqual(await aperture.locator('img').evaluate(image => image.getBoundingClientRect().toJSON()), original, 'Only reflection moves');
    assert.equal(await aperture.evaluate(el => getComputedStyle(el, '::before').pointerEvents), 'none');
    await page.evaluate(() => __qa.navigateWorkspace('settings'));
    assert.equal(await page.evaluate(() => __sensorListeners.size), 0);
    const stopped = await page.locator('.shell-gallery').evaluate(el => el.style.getPropertyValue('--glass-x'));
    await sensor(page, -25);
    assert.equal(await page.locator('.shell-gallery').evaluate(el => el.style.getPropertyValue('--glass-x')), stopped);
    await page.evaluate(() => __qa.navigateWorkspace('album'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => __sensorListeners.size === 0);
    assert.equal(await page.evaluate(() => __sensorListeners.size), 0);
    assert.equal(await aperture.evaluate(el => getComputedStyle(el, '::before').transform), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => __sensorListeners.size === 1);
    assert.equal(await page.evaluate(() => __sensorListeners.size), 1);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.evaluate(() => __sensorListeners.size), 0);
    await page.evaluate(() => {
      delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.evaluate(() => __sensorListeners.size), 1);
    for (const mode of ['journal', 'vampire']) {
      await page.evaluate(mode => RPThemePacks.set(mode), mode);
      for (const width of [360, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => __qa.navigateWorkspace('album'));
        await capture(page, `albums-${mode}-${width}`);
        await page.getByRole('button', { name: '打开相簿：大梦未觉', exact: true }).click();
        await capture(page, `photos-${mode}-${width}`);
        await page.getByRole('button', { name: '查看第 1 张图片', exact: true }).click();
        await capture(page, `viewer-${mode}-${width}`);
        if (mode === 'journal' && width === 360) {
          await page.evaluate(() => {
            window.__glassSaved = null;
            window.AndroidBridge = { isNativeApp: () => true,
              saveImageToGallery: (bytes, name, mime) => { window.__glassSaved = { bytes, name, mime }; } };
          });
          await page.getByRole('button', { name: '保存图片到相册', exact: true }).click();
          await page.waitForFunction(() => window.__glassSaved);
          assert.equal(await page.evaluate(() => __glassSaved.bytes === __qaNativeFiles['图片/大梦未觉/one.webp'].binary), true,
            'Saving reads original bytes and never bakes the glass overlay into the image');
          await page.evaluate(() => { delete window.AndroidBridge; });
        }
        const geometry = await page.locator('.shell-photo-glass').evaluate(el => {
          const r = el.getBoundingClientRect(), i = el.querySelector('img').getBoundingClientRect();
          return { edges: [r.left - i.left, r.right - i.right, r.top - i.top, r.bottom - i.bottom], w: r.width, h: r.height };
        });
        assert.ok(geometry.edges.every(value => Math.abs(value) < 1), JSON.stringify(geometry));
        assert.ok(Math.abs(geometry.w / geometry.h - 2 / 3) < .002);
        await page.getByRole('button', { name: '切换图片缩放', exact: true }).click();
        await page.getByRole('button', { name: '切换图片缩放', exact: true }).click();
        await page.getByRole('button', { name: '下一张图片', exact: true }).click();
        await page.getByRole('button', { name: '上一张图片', exact: true }).click();
        await page.getByRole('button', { name: '关闭大图', exact: true }).click();
        await page.getByRole('button', { name: '返回画廊', exact: true }).click();
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => __qa.openSettingsSection('appearance'));
    assert.equal(await page.locator('select:visible,input[type="color"]:visible').count(), 0);
    await page.evaluate(() => RPHubThemeKit.setAccent('#168273'));
    await page.getByRole('radio', { name: '经典皮肤', exact: true }).check();
    await page.getByRole('radio', { name: '玥玥经典皮肤', exact: true }).check();
    assert.equal(await page.evaluate(() => RPHubThemeKit.accent), '');
    await page.evaluate(() => RPThemePacks.setMode('day'));
    await page.locator('label.shell-form-row').filter({ has: page.getByRole('switch', { name: '夜间模式', exact: true }) }).click();
    assert.equal(await page.evaluate(() => RPHubThemeKit.scheme), 'night');
    assert.equal(await page.getByRole('switch', { name: '倾斜反光', exact: true }).isChecked(), true);
    await page.locator('label.shell-form-row').filter({ has: page.getByRole('switch', { name: '倾斜反光', exact: true }) }).click();
    await page.evaluate(() => __qa.navigateWorkspace('album'));
    assert.equal(await page.evaluate(() => __sensorListeners.size), 0);
    assert.equal(await page.getByRole('button', { name: '启用倾斜反光', exact: true }).count(), 0);
    await page.reload();
    await page.waitForFunction(() => window.__rpDataReady);
    assert.equal(await page.evaluate(() => RPThemePacks.current), 'chenyue');
    assert.equal(await page.evaluate(() => RPHubThemeKit.scheme), 'night');
    assert.equal(await page.evaluate(() => RPGalleryMotion.enabled), false);
    await page.waitForFunction(() => !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false; __qa.openSettingsSection('appearance');
    });
    assert.equal(await page.getByRole('switch', { name: '倾斜反光', exact: true }).isChecked(), false);
    await capture(page, 'appearance-toggle-off-390');
    await page.getByRole('switch', { name: '倾斜反光', exact: true }).focus();
    await page.getByRole('switch', { name: '倾斜反光', exact: true }).press('Space');
    await page.evaluate(() => __qa.navigateWorkspace('album'));
    assert.equal(await page.evaluate(() => __sensorListeners.size), 1);
    const denied = await load('denied');
    await denied.page.evaluate(() => __qa.navigateWorkspace('album'));
    assert.equal(await denied.page.evaluate(() => window.__permissionRequests || 0), 0);
    await denied.page.getByRole('searchbox', { name: '搜索角色相簿', exact: true }).click();
    await denied.page.waitForFunction(() => RPGalleryMotion.permission === 'denied');
    assert.equal(await denied.page.evaluate(() => __sensorListeners.size), 0);
    const granted = await load('granted');
    await granted.page.evaluate(() => __qa.navigateWorkspace('album'));
    await granted.page.getByRole('searchbox', { name: '搜索角色相簿', exact: true }).click();
    await granted.page.waitForFunction(() => RPGalleryMotion.permission === 'available');
    assert.equal(await granted.page.evaluate(() => __sensorListeners.size), 1);
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    const report = { sensorEventSimulationChangesReflectionPixels: true, imageGeometryUnchanged: true,
      noSensorsOutsideGalleryOrInBackground: true, reducedMotionStatic: true,
      permissionRequestedOnlyOnClick: true, grantedAndDeniedPaths: true, viewerRatioAndControls: true,
      enabledByDefault: true, appearanceSwitchPersistsAndStopsMotion: true, noGalleryPermissionButton: true,
      originalImageBytesSavedWithoutOverlay: true, uiLinkedModeAndAccent: true, themeSelectionPersists: true,
      widths: [360, 390, 1280], actualAndroidSensorTested: false, errors, missing };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
