const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification', 'quick-theme-dock-1.12');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(installFileBridge);
  const page = await context.newPage(), errors = [], missing = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      if (url.pathname.includes('/assets/')) missing.push(url.pathname);
      return route.fulfill({ status: 404, body: '' });
    }
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
  });
  async function ready() {
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
    });
  }
  async function settle() {
    await page.waitForTimeout(220);
    await page.waitForFunction(() => [...document.images].filter(image => image.getClientRects().length)
      .every(image => image.complete && image.naturalWidth > 0));
  }
  async function night() {
    await page.evaluate(() => RPThemePacks.set('vampire'));
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--yy-paper').trim() === '#211d23');
  }
  async function capture(name) {
    await page.evaluate(() => {
      __qa.toasts = [];
      document.querySelectorAll('.shell-page,.management-view').forEach(element => { element.scrollTop = 0; });
      document.activeElement?.blur();
    });
    await settle();
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow: ' + name);
  }
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
    await page.evaluate(async () => {
      const cards = [
        { uuid: 'night-a', name: '钟楼下的来信', avatar: 'assets/images/chenyue/album.webp',
          first_mes: '夜色落在窗沿，书页上夹着一封未拆的信。', worldInfo: [], regexScripts: [], uiTemplates: [] },
        { uuid: 'night-b', name: '很长的角色卡名称也要清楚显示', avatar: 'assets/images/chenyue/welcome.webp', first_mes: '测试开场', worldInfo: [], regexScripts: [], uiTemplates: [] }
      ];
      __qa.characters = cards;
      await RPHubStorage.setStoredValue('characters', cards);
      await RPHubStorage.setStoredValue('theme_sentinel', { keep: '角色卡与记忆数据保持原状' });
      await __qa.selectCharacter(0);
      __qa.chatHistory = [{ id: 'night-message', role: 'assistant', content: '夜色落在窗沿，书页上夹着一封未拆的信。', shouldAnimate: false }];
      await RPHubStorage.setScopedStoredValue('chat', 'night-a', RPHubStorage.cloneForStorage(__qa.chatHistory));
    });
    await night();
    const screenshots = [];
    for (const width of [360, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const view of ['characters', 'advanced', 'settings', 'album', 'chat']) {
        await page.evaluate(view => __qa.navigateWorkspace(view), view);
        const name = `${view}-night-${width}`;
        await capture(name); screenshots.push(name);
      }
      await page.evaluate(() => { __qa.openSettingsSection('appearance'); });
      await capture(`appearance-night-${width}`); screenshots.push(`appearance-night-${width}`);
      assert.equal(await page.getByRole('radio', { name: /夜蔷薇/ }).isChecked(), true);
      await page.getByRole('radio', { name: /白昼手账/ }).check();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.uiSkin), 'chenyue');
      assert.equal(await page.evaluate(() => RPHubThemeKit.scheme), 'day');
      await page.getByRole('radio', { name: /夜蔷薇/ }).check();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.uiSkin), 'vampire');
      await page.evaluate(() => { __qa.navigateWorkspace('chat'); __qa.isNavigationOpen = true; });
      await page.getByRole('button', { name: '切换到日间模式', exact: true }).click();
      assert.equal(await page.evaluate(() => RPThemePacks.current), 'journal');
      assert.equal(await page.getByRole('dialog', { name: '聊天菜单', exact: true }).count(), 1);
      await page.getByRole('button', { name: '切换到夜间模式', exact: true }).click();
      assert.equal(await page.evaluate(() => RPThemePacks.current), 'vampire');
      await capture(`menu-night-${width}`); screenshots.push(`menu-night-${width}`);
      const menu = page.getByRole('dialog', { name: '聊天菜单', exact: true });
      const bounds = await menu.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      await menu.getByRole('button', { name: '关闭聊天菜单', exact: true }).click();
      await page.evaluate(() => __qa.navigateWorkspace('characters'));
      const dock = await page.locator('.shell-dock-wrap').boundingBox();
      assert.ok(dock.width <= 360 && dock.width <= width - 47);
      assert.equal(await page.locator('.shell-dock').evaluate(el => getComputedStyle(el).borderRadius), '30px');
      assert.equal(await page.locator('.shell-online-trigger').evaluate(el => getComputedStyle(el).borderRadius), '50%');
      assert.equal(await page.locator('.shell-dock > button').evaluateAll(buttons => buttons.every(button => {
        const rect = button.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44;
      })), true);
      await capture(`dock-night-${width}`);
      await page.evaluate(() => RPThemePacks.set('journal'));
      await capture(`dock-day-${width}`);
      await night();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { __qa.navigateWorkspace('settings'); __qa.openSettingsSection('appearance'); RPThemePacks.set('journal'); });
    await page.reload(); await ready();
    assert.equal(await page.evaluate(() => RPThemePacks.current), 'journal');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.uiSkin), 'chenyue');
    await night();
    await page.reload(); await ready();
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--shell-bg').trim()), '#141216');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--yy-paper').trim()), '#211d23');
    await page.evaluate(() => RPHubThemeKit.setScheme('day'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.uiSkin), 'chenyue');
    await page.evaluate(() => __qa.navigateWorkspace('settings'));
    await capture('settings-day-390'); screenshots.push('settings-day-390');
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.evaluate(() => RPHubThemeKit.setScheme('auto'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.uiSkin), 'vampire');
    await page.evaluate(() => { __qa.openSettingsSection('image'); });
    const imageControl = page.locator('.shell-image-section input:visible,.shell-image-section button:visible').first();
    await imageControl.waitFor();
    await capture('image-settings-night-390'); screenshots.push('image-settings-night-390');
    assert.equal(await page.locator('button.settings-toggle-row').evaluate(button => {
      const bounds = button.getBoundingClientRect();
      return [...button.children].every(child => {
        const content = child.getBoundingClientRect();
        return content.top >= bounds.top + 4 && content.bottom <= bounds.bottom - 4;
      }) && getComputedStyle(button.querySelector('.settings-toggle-status')).color === 'rgb(231, 172, 187)';
    }), true, 'Image toggle text fits and enabled status uses the night accent');
    await page.evaluate(() => __qa.navigateWorkspace('chat'));
    await page.locator('.island-input').fill('尚未发送的草稿');
    await page.evaluate(() => { __qa.isNavigationOpen = true; });
    await page.getByRole('button', { name: '切换到日间模式', exact: true }).click();
    await page.getByRole('button', { name: '切换到夜间模式', exact: true }).click();
    await page.getByRole('button', { name: '关闭聊天菜单', exact: true }).click();
    await page.evaluate(() => { RPThemePacks.set('journal'); RPThemePacks.set('vampire'); });
    assert.equal(await page.locator('.island-input').inputValue(), '尚未发送的草稿');
    const composer = await page.locator('.input-island').evaluate(element => ({
      background: getComputedStyle(element).backgroundColor,
      input: getComputedStyle(element.querySelector('textarea')).color,
      rectangle: element.getBoundingClientRect().toJSON(),
    }));
    assert.equal(composer.background, 'rgb(33, 29, 35)');
    assert.equal(composer.input, 'rgb(242, 233, 235)');
    assert.ok(composer.rectangle.width <= 390);
    assert.equal(await page.evaluate(() => RPImagePolicy.isUiUrl(RPThemePacks.asset('welcome'))), true);
    assert.equal(await page.locator('.yy-page-mascot + .rphub-img-save-btn,[data-rphub-no-save] .rphub-img-save-btn').count(), 0);
    assert.deepEqual(await page.evaluate(() => RPHubStorage.getStoredValue('theme_sentinel')), { keep: '角色卡与记忆数据保持原状' });
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
      themePackSwitch: true, modeLinkedToUi: true, persistedAfterReload: true, autoDarkAndReducedMotion: true,
      dayUiRetained: true, settingsAndAdvancedAndComposerCovered: true, softwareImagesNotDownloadable: true,
      quickMenuDayNightSwitch: true, compactRoundDock: true, touchTargets44px: true,
      dataPreserved: true, draftPreserved: true, composer, screenshots, errors, missing
    }, null, 2));
    console.log('Theme pack switching, persistence, day/night modes, UI assets and responsive checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
