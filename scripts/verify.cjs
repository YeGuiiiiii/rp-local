const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const evidence = path.join(root, 'verification');
fs.mkdirSync(evidence, { recursive: true });
const origin = 'https://sta1n156.github.io';
const reports = [];
const installFileBridge = require('./mock-files.cjs');

async function verifyImages(page, jobs) {
  await page.evaluate(async () => {
    const s = window.__qa;
    s.showUserSetupModal = false;
    s.user.name = '本地测试';
    s.characters = [{ uuid: 'local-qa-character', name: '本地测试', first_mes: '', description: '', worldInfo: [], regexScripts: [], uiTemplates: [] }];
    await s.selectCharacter(0, true, { silent: true });
    s.currentView = 'chat';
    s.settings.imageGenKey = 'local-test-only';
    s.settings.freezeGeneratedImages = true;
    s.settings.freezeGeneratedImagesExplicit = true;
    s.worldInfo.find(w => w.comment === '自动生图').enabled = true;
    s.chatHistory = [{
      id: 'local-qa-message', role: 'assistant', shouldAnimate: false,
      content: '第一张：\nimage###red cat, blue sky, garden###\n\n第二张：\nimage###green bird, yellow flower, forest###',
    }];
  });
  await page.waitForFunction(() => document.querySelectorAll('.generated-image-card img[src]').length === 2);
  await page.waitForTimeout(500);
  assert.equal(jobs.length, 2, 'Initial render must submit exactly two image jobs');
  const afterInitial = jobs.length;
  const imageBefore = await page.locator('.generated-image-card img').evaluateAll(imgs => imgs.map(img => img.src));
  await page.evaluate(() => {
    window.__qa.settings.customImageArtists = [{ name: '测试画师', artists: 'artist-b', negative: '', selected: true }];
    window.__qa.settings.imageStyle = 'custom';
  });
  await page.waitForTimeout(1800);
  assert.equal(jobs.length, 2, 'Switching artists must not submit image jobs');
  await page.evaluate(() => { window.__qa.currentView = 'characters'; });
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.__qa.currentView = 'chat'; });
  await page.waitForTimeout(500);
  assert.equal(jobs.length, 2, 'Reopening chat must not submit image jobs');
  await page.screenshot({ path: path.join(evidence, 'image-freeze-360.png') });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => {
    const el = document.getElementById('app');
    if (!el?.__vue_app__) return false;
    window.__qa = el.__vue_app__._container._vnode.component.setupState;
    if (window.__rpDataReady) window.__qa.currentView = 'chat';
    return window.__qa.currentCharacter?.uuid === 'local-qa-character'
      && document.querySelectorAll('.generated-image-card img[src]').length === 2;
  });
  await page.waitForTimeout(700);
  await page.waitForFunction(() => !document.querySelector('.entry-transition'));
  assert.equal(jobs.length, 2, 'Reloading persisted history must not submit image jobs');
  await page.evaluate(() => __qa.currentView = 'chat');
  const secondBefore = await page.locator('.generated-image-card img').nth(1).getAttribute('src');
  await page.locator('.generated-image-reroll').first().click();
  await page.waitForFunction(() => !document.querySelector('.is-rerolling'));
  await page.waitForTimeout(500);
  assert.equal(jobs.length, 3, 'Reroll must submit exactly one additional image job');
  const secondAfter = await page.locator('.generated-image-card img').nth(1).getAttribute('src');
  assert.equal(secondAfter, secondBefore, 'Reroll must preserve the other image');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__rpDataReady);
  await page.waitForFunction(() => !document.querySelector('.entry-transition'));
  await page.evaluate(() => {
    window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
    __qa.currentView = 'chat';
  });
  await page.waitForFunction(() => document.querySelectorAll('.generated-image-card img[src]').length === 2);
  await page.waitForTimeout(500);
  assert.equal(jobs.length, 3, 'Reload after reroll must reuse both saved images');
  const folders = await page.evaluate(() => Object.keys(window.__qaNativeFiles).filter(name => name.startsWith('图片/') && !name.endsWith('.json')));
  assert.equal(folders.length, 3, 'Two initial images and one reroll must be durable files');
  assert.ok(folders.every(name => name.startsWith('图片/本地测试/')));
  const localSources = await page.locator('.generated-image-card img').evaluateAll(imgs => imgs.map(img => img.src));
  assert.ok(localSources.every(src => src.includes('/RP-Hub/_files/')));
  await page.evaluate(() => {
    const app = document.getElementById('app').__vue_app__;
    window.__qa = app._container._vnode.component.setupState;
    window.__qa.openSettingsSection('storage');
  });
  await page.getByRole('button', { name: '浏览本地图片' }).click();
  await page.locator('.local-files-grid img').first().waitFor();
  assert.equal(await page.locator('.local-files-grid img').count(), 3);
  await page.screenshot({ path: path.join(evidence, 'local-folders-360.png') });
  return { afterInitial, afterArtistSwitch: 2, afterReopen: 2, afterReload: 2, afterSingleReroll: jobs.length, otherImageUnchanged: true, savedImages: imageBefore.length };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [width, height] of [[360, 800], [420, 933], [1280, 900]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      if (width === 360) await context.addInitScript(installFileBridge);
      const page = await context.newPage();
      const errors = [];
      const requests = [];
      const jobs = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        requests.push({ url: url.href, method: route.request().method() });
        if (url.origin === 'https://nai.sta1n.cn') {
          const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,HEAD,OPTIONS' };
          if (route.request().method() === 'OPTIONS' || route.request().method() === 'HEAD') return route.fulfill({ status: 200, headers, body: '' });
          if (url.pathname === '/api/jobs' && route.request().method() === 'POST') {
            jobs.push(JSON.parse(route.request().postData()));
            return route.fulfill({ headers, json: { id: String(jobs.length), status: 'done', imageUrl: `https://nai.sta1n.cn/api/jobs/${jobs.length}/content` } });
          }
          if (url.pathname.endsWith('/content')) return route.fulfill({ headers, contentType: 'image/png', path: path.join(root, 'dist', 'app-icon.png') });
          return route.fulfill({ headers, json: { remaining: 999, quota: 999 } });
        }
        if (url.origin !== origin || !url.pathname.startsWith('/RP-Hub/')) return route.abort();
        const relative = url.pathname.slice('/RP-Hub/'.length);
        if (relative.startsWith('_files/')) {
          const name = decodeURIComponent(relative.slice('_files/'.length));
          const file = await page.evaluate(name => window.__qaNativeFiles?.[name], name);
          if (!file?.binary) return route.fulfill({ status: 404, body: '' });
          return route.fulfill({ body: Buffer.from(file.binary, 'base64'), contentType: name.endsWith('.webp') ? 'image/webp' : 'image/png' });
        }
        const file = path.join(web, relative.endsWith('/') || !relative ? relative + 'index.html' : relative);
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return route.fulfill({ status: 404, body: '' });
        }
        const contentType = ({ '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.woff2': 'font/woff2', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream';
        return route.fulfill({ path: file, contentType });
      });
      await page.goto(origin + '/RP-Hub/', { waitUntil: 'load' });
      await page.waitForFunction(() => !document.querySelector('.entry-transition'));
      await page.waitForFunction(() => !!document.getElementById('app')?.__vue_app__ && typeof window.tailwind === 'object');
      await page.waitForTimeout(1500);
      const state = await page.evaluate(() => {
        const app = document.getElementById('app');
        const component = app.__vue_app__._container._vnode.component;
        window.__qa = component.setupState;
        return {
          mounted: !!app.__vue_app__,
          cloak: app.hasAttribute('v-cloak'),
          overflow: document.documentElement.scrollWidth > innerWidth,
          utilityStyle: [...document.querySelectorAll('style')].some(s => s.textContent.includes('--tw-')),
          imageVault: typeof window.RPHubImageVault?.remember,
          gallery: typeof window.RPHubImageGallery,
        };
      });
      assert.equal(state.mounted, true);
      assert.equal(state.cloak, false);
      assert.equal(state.utilityStyle, true);
      assert.equal(state.overflow, false);
      assert.equal(state.imageVault, 'function');
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(evidence, `home-${width}.png`) });
      const images = width === 360 ? await verifyImages(page, jobs) : null;
      const pages = [];
      if (width === 420) {
        for (const section of ['character', 'novel']) {
          await page.goto(`${origin}/RP-Hub/${section}/`, { waitUntil: 'load' });
          await page.waitForTimeout(700);
          const sectionState = await page.evaluate(() => ({
            vue: typeof window.Vue,
            tailwind: typeof window.tailwind,
            title: document.title,
            overflow: document.documentElement.scrollWidth > innerWidth,
          }));
          assert.equal(sectionState.vue, 'object');
          assert.equal(sectionState.tailwind, 'object');
          assert.equal(sectionState.overflow, false);
          pages.push({ section, ...sectionState });
          await page.screenshot({ path: path.join(evidence, `${section}-420.png`) });
        }
      }
      assert.deepEqual(errors, []);
      reports.push({ width, state, errors, images, pages, externalRequests: requests.filter(r => !r.url.startsWith(origin + '/RP-Hub/')) });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(evidence, 'browser.json'), JSON.stringify(reports, null, 2));
  console.log(JSON.stringify(reports.map(({ externalRequests, ...report }) => report), null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
