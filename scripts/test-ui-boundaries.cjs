const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const evidence = path.join(root, 'verification');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(installFileBridge);
  await context.addInitScript(() => {
    window.__savedImages = [];
    window.AndroidBridge = {
      isNativeApp: () => true,
      saveImageToGallery: (bytes, name, mime) => __savedImages.push({ bytes: bytes.length, name, mime }),
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const fixture = fs.readFileSync(path.join(root, 'dist/app-icon.png'));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['rphforum.zeabur.app', 'wxdt.duckdns.org'].includes(url.hostname)) {
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><h1>在线页面测试</h1><input placeholder="测试输入"><p>站点内容保持原样。</p>' });
    }
    if (url.hostname === 'story.test') return route.fulfill({
      contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: fixture,
    });
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return route.fulfill({ status: 404, body: '' });
    }
    return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
      '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
  });
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
    });
    await page.getByRole('button', { name: '在线入口', exact: true }).click();
    await page.getByRole('button', { name: '万象广场', exact: true }).click();
    await page.getByRole('button', { name: '返回本地版', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'characters');
    for (const view of ['square', 'lighthouse', 'generator', 'novel']) {
      await page.evaluate(view => __qa.navigateWorkspace(view), view);
      const back = page.getByRole('button', { name: '返回本地版', exact: true });
      await back.waitFor();
      if (view === 'square' || view === 'lighthouse') {
        await page.frameLocator(`iframe[src*="${view === 'square' ? 'rphforum' : 'wxdt'}"]`).getByRole('heading', { name: '在线页面测试' }).waitFor();
        await page.waitForFunction(view => !__qa[view === 'square' ? 'isSquareLoading' : 'isLighthouseLoading'], view);
      }
      const buttonBox = await back.boundingBox();
      const frameBox = await page.locator('.yy-online-toolbar + div iframe').boundingBox();
      assert.ok(buttonBox.y + buttonBox.height <= frameBox.y, 'Return control must not cover the website');
      assert.equal(await page.locator('.app-nav-trigger--embedded').count(), 0);
      assert.ok(await back.evaluate(el => getComputedStyle(el).backgroundImage.includes('/chenyue/close')));
      if (view === 'square') await page.screenshot({ path: path.join(evidence, 'online-return-390.png') });
      await back.click();
      assert.equal(await page.evaluate(() => __qa.currentView), 'characters');
    }
    await page.evaluate(async () => {
      await RPHubImageGallery.clear();
      __qa.characters = [{ uuid: 'ui-boundary-card', name: '图片用途测试', avatar: 'assets/images/chenyue/welcome.webp',
        first_mes: '测试开场', description: '', worldInfo: [], regexScripts: [], uiTemplates: [] }];
      await __qa.selectCharacter(0);
    });
    await page.evaluate(({ base64 }) => {
      __qa.chatHistory = [
        { id: 'story-message', role: 'assistant', shouldAnimate: false,
          content: '剧情插图 ![故事图片](https://story.test/assets/story.png)\n\n界面素材 ![界面](assets/images/chenyue/welcome.webp)' },
        { id: 'upload-message', role: 'user', content: '上传图片', imageAttachments: [{ dataUrl: 'data:image/png;base64,' + base64 }] },
      ];
    }, { base64: fixture.toString('base64') });
    await page.waitForFunction(() => document.querySelectorAll('.message-content-wrapper .rphub-image-save-btn').length === 2);
    assert.equal(await page.locator('img[src*="/chenyue/"] + .rphub-image-save-wrap').count(), 0);
    await page.evaluate(async () => {
      const card = document.createElement('div');
      card.id = 'generated-fixture';
      card.className = 'generated-image-card';
      const image = new Image(40, 40);
      image.src = 'https://story.test/generated.png';
      card.appendChild(image);
      document.body.appendChild(card);
      await image.decode();
    });
    await page.waitForFunction(() => document.querySelector('#generated-fixture img').tabIndex === 0);
    assert.equal(await page.locator('#generated-fixture .rphub-image-save-btn').count(), 0);
    await page.locator('#generated-fixture img').press('Enter');
    await page.getByRole('button', { name: '下载图片', exact: true }).click();
    await page.waitForFunction(() => __savedImages.length === 1);
    await page.getByRole('button', { name: '聊天菜单', exact: true }).click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.shell-menu-mask .rphub-image-save-btn').count(), 0);
    await page.screenshot({ path: path.join(evidence, 'menu-no-image-download-390.png') });
    await page.getByRole('button', { name: '关闭聊天菜单', exact: true }).click();
    await page.evaluate(() => {
      const image = document.querySelector('#generated-fixture img');
      image.setAttribute('data-rphub-no-save', '');
    });
    await page.waitForFunction(() => !document.querySelector('#generated-fixture img').hasAttribute('tabindex'));
    await page.evaluate(() => document.querySelector('#generated-fixture img').removeAttribute('data-rphub-no-save'));
    await page.waitForFunction(() => document.querySelector('#generated-fixture img').tabIndex === 0);
    await page.evaluate(() => RPHubImageGallery.collect());
    let records = [];
    for (let attempt = 0; attempt < 60; attempt++) {
      records = await page.evaluate(async () => (await RPHubImageGallery.records()).map(item => ({
        kind: item.kind, source: item.source, originUrl: item.originUrl,
      })));
      if (records.some(item => item.originUrl.includes('story.test/assets/story.png'))
        && records.some(item => item.kind === 'upload')
        && records.some(item => item.originUrl.includes('story.test/generated.png'))) break;
      await page.waitForTimeout(200);
    }
    assert.ok(records.every(record => !record.originUrl.includes('/chenyue/')));
    assert.ok(records.some(record => record.originUrl.includes('story.test/assets/story.png')), JSON.stringify(records));
    assert.ok(records.some(record => record.kind === 'upload'), JSON.stringify(records));
    assert.ok(records.some(record => record.originUrl.includes('story.test/generated.png')), JSON.stringify(records));
    await page.evaluate(() => { document.querySelector('#generated-fixture').remove(); __qa.shellGoBack(); });
    for (const width of [360, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => __qa.navigateWorkspace('square'));
      const box = await page.getByRole('button', { name: '返回本地版', exact: true }).boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44 && box.x >= 0 && box.y >= 0 && box.x + box.width <= width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('button', { name: '返回本地版', exact: true }).click();
    }
    await page.evaluate(() => {
      document.documentElement.dataset.appTheme = 'dark';
      __qa.navigateWorkspace('lighthouse');
    });
    assert.ok(await page.getByRole('button', { name: '返回本地版', exact: true })
      .evaluate(el => getComputedStyle(el).backgroundImage.includes('close-night.webp')));
    await page.frameLocator('iframe[src*="wxdt"]').getByRole('heading', { name: '在线页面测试' }).waitFor();
    await page.waitForFunction(() => !__qa.isLighthouseLoading);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(evidence, 'online-return-night-390.png') });
    assert.deepEqual(errors, []);
    const report = {
      embeddedViews: ['square', 'lighthouse', 'generator', 'novel'], themedReturnClicks: true,
      softwareArtAndAvatarsExcluded: true, narrativeAndUploadSaveButtons: true, generatedImageConfirmation: true,
      smallGeneratedImageSaveExecuted: true, optOutUpdatesRemoveAndRestoreAction: true,
      softwareArtExcludedFromLegacyGallery: true, externalAssetsImagePreserved: true,
      widths: [360, 390, 1280], nightReturn: true, errors,
    };
    fs.writeFileSync(path.join(evidence, 'ui-boundaries.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
