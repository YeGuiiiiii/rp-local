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
  const page = await context.newPage();
  const errors = [];
  let jobs = 0;
  let externalFetches = 0;
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'https://nai.sta1n.cn') {
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS,HEAD' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
      if (url.pathname === '/api/jobs' && route.request().method() === 'POST') {
        jobs++;
        return route.fulfill({ headers, json: { id: String(jobs), status: 'done', imageUrl: `https://nai.sta1n.cn/api/jobs/${jobs}/content` } });
      }
      if (url.pathname.endsWith('/content')) return route.fulfill({ headers, contentType: 'image/png', path: path.join(root, 'dist/app-icon.png') });
      return route.fulfill({ headers, json: { remaining: 999 } });
    }
    if (url.origin !== 'https://sta1n156.github.io') { externalFetches++; return route.abort(); }
    if (url.pathname === '/fixture.png') return route.fulfill({ path: path.join(root, 'dist/app-icon.png'), contentType: 'image/png' });
    if (url.pathname.includes('/_files/')) {
      const name = decodeURIComponent(url.pathname.split('/_files/')[1]);
      const file = await page.evaluate(name => window.__qaNativeFiles?.[name], name);
      if (!file?.binary) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ body: Buffer.from(file.binary, 'base64'), contentType: name.endsWith('.webp') ? 'image/webp' : 'image/png' });
    }
    const relative = url.pathname.slice('/RP-Hub/'.length) || 'index.html';
    const file = path.resolve(web, relative);
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream' });
  });
  const initState = async () => {
    await page.waitForFunction(() => window.__rpDataReady || window.__rpDataError);
    const status = await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
      return { ready: window.__rpDataReady, failed: window.__rpDataError };
    });
    assert.equal(status.failed, undefined, JSON.stringify(errors));
    await page.waitForFunction(() => !document.querySelector('.entry-transition'));
  };
  const nav = name => page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('button', { name, exact: true });
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'load' });
    await initState();
    assert.equal(await page.evaluate(() => __qa.currentView), 'characters');
    await page.evaluate(async () => {
      const card = (uuid, name) => ({
        uuid, name, avatar: '/fixture.png', description: '测试用角色卡', first_mes: '欢迎来到故事。',
        worldInfo: [{ comment: name + '世界书', content: name + '的设定', keys: [name], enabled: true, scope: 'character' }],
        regexScripts: [{ name: name + '正则', regex: '/TEST/g', replacement: name, enabled: false, placement: [2], scope: 'character' }],
        uiTemplates: [{ id: uuid + '-ui', name: name + '面板', scope: 'character', enabled: false, htmlTemplate: '<div>TEST</div>', initialVariableState: {} }],
      });
      __qa.characters = [
        card('shell-card-a', '地牢小馆：炒翻日常'),
        card('shell-card-b', '洛茜的午后'),
        card('shell-card-c', '魔法使的新娘'),
        card('shell-card-d', '很长的角色卡名称也应该完整显示且不会挤坏底部导航'),
      ];
      await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
      __qa.user.name = '叮了个大当';
    });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.char-grid-item:visible').count(), 4);
    const firstCard = page.locator('.char-grid-item:visible').filter({ hasText: '地牢小馆' });
    await firstCard.getByRole('button', { name: '收藏角色', exact: true }).click();
    assert.ok(await page.evaluate(() => __qa.characters[0].favoriteAt > 0));
    await firstCard.getByRole('button', { name: '取消收藏', exact: true }).click();
    await firstCard.getByRole('button', { name: '编辑角色', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.editingCharacter.data.uuid), 'shell-card-a');
    await page.evaluate(() => window.rphubHandleBack());
    assert.equal(await page.evaluate(() => __qa.showCharacterEditor), false);
    await firstCard.getByRole('button', { name: '导出角色', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.showCharacterExportModal), true);
    await page.evaluate(() => window.rphubHandleBack());
    await page.getByRole('button', { name: '添加角色卡', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.showAddCharacterMenu), true);
    await page.evaluate(() => window.rphubHandleBack());
    await page.getByRole('button', { name: '批量删除', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.isBatchDeleteMode), true);
    await page.getByRole('button', { name: '取消选择', exact: true }).click();
    await page.evaluate(async () => {
      await RPHubStorage.setScopedStoredValue('classic_memories', 'shell-card-a',
        [{ classicMemory: true, turn: 1, no: 1, summary: '记忆管理测试' }]);
    });
    await firstCard.getByRole('button', { name: '管理记忆', exact: true }).click();
    const memoryDialog = page.getByRole('dialog', { name: '角色卡记忆管理' });
    await memoryDialog.locator('textarea').waitFor();
    assert.equal(await memoryDialog.locator('textarea').inputValue(), '记忆管理测试');
    await memoryDialog.locator('textarea').fill('通过卡片修改的记忆');
    await memoryDialog.getByRole('button', { name: '保存记忆', exact: true }).click();
    await memoryDialog.getByText('记忆已保存', { exact: true }).waitFor();
    await memoryDialog.getByRole('button', { name: '关闭记忆管理', exact: true }).click();
    await page.screenshot({ path: path.join(evidence, 'shell-home-390.png') });
    await page.getByRole('button', { name: '切换为叠卡布局', exact: true }).click();
    assert.equal(await page.locator('.character-deck:visible').count(), 1);
    await page.getByRole('button', { name: '切换为网格布局', exact: true }).click();
    await page.getByRole('button', { name: '收起底部快捷栏', exact: true }).click();
    await page.getByRole('navigation', { name: '主导航' }).waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('navigation', { name: '主导航' }).count(), 0);
    await page.getByRole('button', { name: '展开底部快捷栏', exact: true }).click();
    await page.getByRole('button', { name: '在线入口', exact: true }).click();
    const wheel = page.getByRole('dialog', { name: '在线入口', exact: true });
    await wheel.waitFor();
    assert.equal(await wheel.getByRole('button', { name: '万象广场', exact: true }).count(), 1);
    assert.equal(await wheel.getByRole('button', { name: '灯塔', exact: true }).count(), 1);
    await page.screenshot({ path: path.join(evidence, 'shell-online-390.png') });
    await wheel.getByRole('button', { name: '万象广场', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'square');
    assert.equal(await page.getByRole('navigation', { name: '主导航' }).count(), 0);
    await page.evaluate(() => window.rphubHandleBack());
    assert.equal(await page.evaluate(() => __qa.currentView), 'characters');
    await page.getByRole('button', { name: '在线入口', exact: true }).click();
    await page.evaluate(() => window.AndroidBridge = { openLighthouse: url => { window.__openedLighthouse = url; } });
    await wheel.getByRole('button', { name: '灯塔', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__openedLighthouse), 'https://wxdt.duckdns.org/');
    await page.evaluate(() => { delete window.AndroidBridge; });
    await page.locator('.char-grid-item:visible').filter({ hasText: '地牢小馆' }).click();
    await page.waitForFunction(() => __qa.currentView === 'chat' && __qa.currentCharacter?.uuid === 'shell-card-a');
    assert.equal(await page.getByRole('navigation', { name: '主导航' }).count(), 0);
    await page.getByRole('button', { name: '聊天菜单', exact: true }).click();
    await page.getByRole('dialog', { name: '聊天菜单' }).waitFor();
    await page.evaluate(() => __qa.toasts = []);
    await page.screenshot({ path: path.join(evidence, 'chenyue-chat-menu-390.png') });
    await page.getByRole('dialog', { name: '聊天菜单' }).getByRole('button', { name: '当前角色世界书', exact: true }).click();
    assert.equal(await page.locator('#worldinfo-list h3').textContent(), '地牢小馆：炒翻日常世界书');
    await page.getByRole('button', { name: '返回', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'chat');
    await page.evaluate(() => window.rphubHandleBack());
    await nav('高级').click();
    await page.screenshot({ path: path.join(evidence, 'shell-advanced-390.png') });
    await page.getByRole('button', { name: '预设管理', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'presets');
    await page.getByRole('button', { name: '返回', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'advanced');
    await page.getByLabel('选择配置所属角色', { exact: true }).selectOption('1');
    await page.waitForFunction(() => __qa.currentCharacter?.uuid === 'shell-card-b');
    await page.getByRole('button', { name: '世界书', exact: true }).click();
    assert.equal(await page.locator('#worldinfo-list h3').textContent(), '洛茜的午后世界书');
    await page.getByRole('button', { name: '返回', exact: true }).click();
    await nav('设置').click();
    await page.screenshot({ path: path.join(evidence, 'shell-settings-390.png') });
    for (const [label, section] of [['API 连接与服务','api'],['生图设置','image'],['阅读与性能','reading'],['外观','appearance'],['数据存储','storage']]) {
      await page.getByRole('button', { name: label, exact: true }).click();
      assert.equal(await page.evaluate(() => __qa.settingsSection), section);
      if (section === 'image') {
        assert.equal(await page.getByText('生图设置', { exact: true }).count() > 0, true);
        const imageControls = await page.locator('.shell-image-section input:visible, .shell-image-section select:visible, .shell-image-section button:visible').count();
        assert.ok(imageControls > 2, 'Image settings must show functional controls');
        await page.waitForTimeout(2100);
        assert.equal(await page.locator('#rphub-emb-cache-card,#sf-presence-card').count(), 0);
        await page.screenshot({ path: path.join(evidence, 'shell-image-settings-390.png') });
      }
      await page.getByRole('button', { name: '返回', exact: true }).click();
      assert.equal(await page.evaluate(() => __qa.currentView), 'settings');
    }
    await page.getByRole('button', { name: '向量缓存', exact: true }).click();
    await page.getByRole('button', { name: '刷新统计', exact: true }).click();
    await page.getByRole('button', { name: '返回', exact: true }).click();
    await nav('角色卡').click();
    await page.evaluate(async () => {
      await __qa.selectCharacter(0);
      __qa.settings.imageGenKey = 'TEST_ONLY';
      __qa.settings.freezeGeneratedImages = true;
      __qa.settings.freezeGeneratedImagesExplicit = true;
      __qa.worldInfo.find(entry => entry.comment === '自动生图').enabled = true;
      __qa.chatHistory = [{ id: 'shell-image-message', role: 'assistant', shouldAnimate: false, content: 'image###red cat, blue sky, garden###' }];
    });
    await page.waitForFunction(() => document.querySelector('.generated-image-card img')?.src.includes('/_files/'));
    assert.equal(jobs, 1);
    await page.evaluate(() => __qa.settings.imageStyle = 'custom');
    await page.waitForTimeout(300);
    assert.equal(jobs, 1);
    await page.evaluate(() => window.rphubHandleBack());
    await nav('画廊').click();
    await page.evaluate(() => __qa.toasts = []);
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.shell-album').count(), 4);
    await page.screenshot({ path: path.join(evidence, 'shell-gallery-390.png') });
    await page.getByRole('button', { name: '打开相簿：地牢小馆：炒翻日常', exact: true }).click();
    assert.equal(await page.locator('.shell-photo-grid button').count(), 1);
    await page.getByRole('button', { name: '查看第 1 张图片', exact: true }).click();
    await page.evaluate(() => {
      window.AndroidBridge = {
        isNativeApp: () => true,
        saveImageToGallery: (base64,name,mime) => { window.__savedImage = { base64, name, mime }; },
        saveImageFromUrl: () => { throw new Error('Network downloader must not be used for local images'); }
      };
    });
    await page.getByRole('button', { name: '保存图片到相册', exact: true }).click();
    await page.waitForFunction(() => window.__savedImage);
    const saved = await page.evaluate(() => ({ ...window.__savedImage, base64: window.__savedImage.base64.length }));
    assert.ok(saved.base64 > 100);
    assert.equal(saved.mime, 'image/webp');
    assert.equal(jobs, 1);
    await page.evaluate(() => { delete window.AndroidBridge; });
    await page.getByRole('button', { name: '关闭大图', exact: true }).click();
    await page.getByRole('button', { name: '返回画廊', exact: true }).click();
    await nav('角色卡').click();
    await page.reload({ waitUntil: 'load' });
    await initState();
    assert.equal(await page.evaluate(() => __qa.currentView), 'chat');
    assert.equal(jobs, 1, 'Startup in the card directory must not hydrate hidden chat images');
    await page.evaluate(() => __qa.navigateWorkspace('characters'));
    await page.evaluate(() => {
      __qa.chatHistory = [{ id: 'shell-not-yet-generated', role: 'assistant', content: 'image###unrequested image, purple sky, new scene###', shouldAnimate: false }];
    });
    await page.waitForTimeout(500);
    assert.equal(jobs, 1, 'Hidden chat content must not submit a new image job');
    for (const width of [360, 420, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [name, view] of [['角色卡','characters'],['画廊','album'],['高级','advanced'],['设置','settings']]) {
        await nav(name).click();
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${view}@${width}`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await nav('高级').click();
    await page.evaluate(() => window.RPHubThemeKit.setScheme('night'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(evidence, 'shell-advanced-night-390.png') });
    await page.evaluate(() => window.RPHubThemeKit.setScheme('day'));
    assert.deepEqual(errors, []);
    const report = { fourRootPages: true, gridAndDeck: true, cardEditExportFavoriteAndBatchActions: true, foldAndRecoverDock: true, radialOnlineButtons: true, nativeLighthouse: true, chatHidesDock: true, backHierarchy: true, characterResources: true, settingsCategories: true, albumByCharacterCover: true, generatedImages: jobs, localImageSavedAsBytes: saved, startupDoesNotGenerateImages: true, widths: [360,390,420,1280], errors };
    fs.writeFileSync(path.join(evidence,'shell.json'), JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } catch (error) {
    await page.screenshot({ path: path.join(evidence,'shell-failure.png') }).catch(() => {});
    console.error('Page errors:', errors);
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
