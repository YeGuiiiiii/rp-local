const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/ui-polish-1.02');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    recordVideo: { dir: path.join(output, 'motion'), size: { width: 390, height: 844 } }
  });
  await context.addInitScript(installFileBridge);
  const page = await context.newPage(), errors = [], snapshots = [];
  let generationRequests = 0;
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'POST') generationRequests++;
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    if (url.pathname === '/cover.png') return route.fulfill({ path: path.join(root, 'dist/app-icon.png'), contentType: 'image/png' });
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
      return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
  });
  const navigate = async view => {
    await page.evaluate(view => __qa.navigateWorkspace(view), view);
    await page.waitForTimeout(220);
  };
  const measure = () => page.evaluate(() => {
    const visible = selector => [...document.querySelectorAll(selector)].filter(el => el.getClientRects().length);
    const bounds = el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const mascot = visible('.yy-page-mascot')[0];
    const cover = visible('.shell-album-cover')[0];
    const aperture = visible('.shell-album-aperture')[0];
    const main = document.querySelector('.app-main');
    const scroll = visible('.app-main > :is(.shell-page,.management-view)')[0];
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      pageOverflow: scroll && scroll.scrollWidth > scroll.clientWidth + 1,
      mascot: mascot && bounds(mascot),
      main: bounds(main),
      cover: cover && bounds(cover),
      aperture: aperture && bounds(aperture),
      fit: aperture && getComputedStyle(aperture.querySelector('img')).objectFit,
      corner: cover && getComputedStyle(cover, '::before').width,
      searchBackground: visible('.shell-search')[0] && getComputedStyle(visible('.shell-search')[0]).backgroundImage,
      searchInputBackground: visible('.shell-search input')[0] && getComputedStyle(visible('.shell-search input')[0]).backgroundColor,
      controls: visible('.shell-settings-detail .settings-control').length,
      primary: scroll && getComputedStyle(scroll).getPropertyValue('--primary-600').trim()
    };
  });
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__rpDataReady);
    await page.waitForFunction(() => !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
      __qa.characters = Array.from({ length: 16 }, (_, i) => ({
        uuid: 'polish-' + i, name: i === 0 ? '玥玥的午后' : i === 1 ? '很长的角色名称：月光与旅人的幻想手账' : '旅人的故事 ' + (i + 1),
        avatar: i === 2 ? '/missing-cover.png' : '/cover.png', first_mes: '', description: '',
        worldInfo: [], regexScripts: [], uiTemplates: []
      }));
      __qa.user.name = '旅人';
      __qa.user.preferences = '喜欢自然的对话，保留故事里的细小变化。';
      __qa.user.description = '在城市之间旅行，收集相遇与故事。';
    });
    // Inspect actual in-flight animations before waiting for the settled pages.
    await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('button', { name: '画廊', exact: true }).click();
    const motion = await page.evaluate(() => ({
      pages: document.querySelector('.shell-gallery').getAnimations().map(a => ({ duration: a.effect.getTiming().duration, frames: a.effect.getKeyframes() })),
      dockTransition: getComputedStyle(document.querySelector('.shell-dock-indicator')).transitionDuration,
      dockAnimations: document.querySelector('.shell-dock button.is-active img').getAnimations().length
    }));
    assert.ok(motion.pages.some(a => a.duration === 160), JSON.stringify(motion));
    assert.equal(motion.dockTransition, '0.2s');
    await page.waitForTimeout(220);
    await page.locator('.shell-gallery').evaluate(el => el.scrollTop = 460);
    const savedScroll = await page.locator('.shell-gallery').evaluate(el => el.scrollTop);
    await navigate('settings'); await navigate('album');
    assert.equal(await page.locator('.shell-gallery').evaluate(el => el.scrollTop), savedScroll);
    await page.locator('.shell-search input').focus();
    await page.setViewportSize({ width: 390, height: 560 });
    const focusedScroll = await page.locator('.shell-gallery').evaluate(el => el.scrollTop);
    await navigate('settings'); await navigate('album');
    assert.equal(await page.locator('.shell-gallery').evaluate(el => el.scrollTop), focusedScroll);
    await page.locator('.shell-gallery').evaluate(el => el.scrollTop = 0);
    await page.locator('.shell-search input').blur();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.shell-album img.is-missing').first().waitFor({ state: 'attached' });
    assert.equal(await page.locator('.shell-album').nth(2).locator('.shell-icon').evaluate(el => getComputedStyle(el).visibility), 'visible');
    await page.getByRole('button', { name: '打开相簿：玥玥的午后', exact: true }).click();
    await page.getByRole('heading', { name: '相簿还是空的', exact: true }).waitFor();
    await page.getByRole('button', { name: '返回画廊', exact: true }).click();
    await navigate('settings');
    await page.evaluate(() => __qa.openSettingsSection('persona'));
    await page.locator('input[placeholder="您的名字"]').fill('旅人·测试');
    await page.getByRole('button', { name: /第三人称/ }).click();
    assert.equal(await page.evaluate(() => __qa.user.person), 'third');
    await page.locator('.settings-page-header').getByRole('button', { name: '返回', exact: true }).click();
    await page.evaluate(() => __qa.openSettingsSection('persona'));
    assert.equal(await page.locator('input[placeholder="您的名字"]').inputValue(), '旅人·测试');
    await page.evaluate(() => __qa.shellGoBack());
    // Rapid real navigation must settle at the last requested page.
    for (const view of ['album', 'advanced', 'characters', 'settings']) await page.evaluate(view => __qa.navigateWorkspace(view), view);
    await page.waitForTimeout(240);
    assert.equal(await page.evaluate(() => __qa.currentView), 'settings');
    await page.getByRole('button', { name: '收起底部快捷栏', exact: true }).click();
    await page.getByRole('navigation', { name: '主导航' }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '展开底部快捷栏', exact: true }).click();
    await page.getByRole('navigation', { name: '主导航' }).waitFor();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => __qa.navigateWorkspace('album'));
    const reduced = await page.evaluate(() => document.querySelector('.shell-gallery').getAnimations().map(a => ({
      duration: a.effect.getTiming().duration, transforms: a.effect.getKeyframes().map(frame => frame.transform)
    })));
    assert.ok(reduced.some(a => a.duration === 90 && a.transforms.every(t => t === 'none')), JSON.stringify(reduced));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // One batched visual pass across sizes, themes and representative screens.
    for (const [width, height, mode] of [[360, 640, 'day'], [390, 844, 'day'], [390, 844, 'night'], [768, 1024, 'day'], [1280, 900, 'day'], [1280, 900, 'night'], [844, 390, 'day']]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(mode => RPHubThemeKit.setScheme(mode), mode);
      for (const screen of ['album', 'persona', 'api']) {
        if (screen === 'album') {
          await navigate('album');
          await page.locator('.shell-gallery').evaluate(el => el.scrollTop = 0);
        } else {
          await navigate('settings');
          await page.evaluate(section => __qa.openSettingsSection(section), screen);
        }
        await page.waitForTimeout(220);
        const geometry = await measure();
        assert.equal(geometry.overflow, false, `${screen}-${width}-${mode}`);
        assert.equal(geometry.pageOverflow, false, `${screen}-${width}-${mode}`);
        if (screen === 'album') {
          assert.equal(geometry.fit, 'contain');
          assert.equal(geometry.searchBackground, 'none');
          assert.equal(geometry.searchInputBackground, 'rgba(0, 0, 0, 0)');
          assert.ok(Math.abs(geometry.aperture.left - geometry.cover.left) < 1);
          assert.ok(Math.abs(geometry.aperture.right - geometry.cover.right) < 1);
          assert.ok(geometry.mascot.top >= geometry.main.top);
          assert.ok(geometry.mascot.right <= geometry.main.right);
        } else assert.ok(geometry.controls >= 3, JSON.stringify(geometry));
        const file = `${screen}-${width}-${mode}.png`;
        if (!process.argv.includes('--checks-only')) await page.screenshot({ path: path.join(output, file), scale: 'css' });
        snapshots.push({ file, width, height, mode, screen, ...geometry });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const mode of ['eye', 'eyeNight']) {
      await page.evaluate(mode => RPHubThemeKit.setScheme(mode), mode);
      assert.ok(await page.locator('.settings-control').first().evaluate(el => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'));
    }
    await page.evaluate(() => { RPHubThemeKit.setScheme('day'); RPHubThemeKit.setAccent('#0f9b8e'); });
    const custom = await measure();
    assert.notEqual(custom.primary, '142 78 96');
    await page.evaluate(() => RPHubThemeKit.setAccent(''));
    assert.equal(generationRequests, 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({
      fixture: 'Fictional cards using the existing app icon; no user data or model calls.',
      motion, reduced, rootScrollRestored: savedScroll, focusAndViewportRestore: true,
      personaControlsAndState: true, rapidNavigation: true, fold: true, customAccent: true,
      eyeModes: true, generationRequests, errors, snapshots,
      androidDeviceTested: false
    }, null, 2));
    console.log(JSON.stringify({ screenshots: snapshots.length, motion, reduced, savedScroll, generationRequests, errors }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
