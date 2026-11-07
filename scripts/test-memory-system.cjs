const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(installFileBridge);
  const page = await context.newPage();
  const errors = [];
  let summaryRequests = 0;
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'memory.test') {
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type',
        'access-control-allow-methods': 'GET,POST,OPTIONS' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
      if (url.pathname.endsWith('/models')) return route.fulfill({ headers, json: {
        data: [{ id: 'test-summary-model' }, { id: 'test-embedding-model' }],
      } });
      if (url.pathname.endsWith('/chat/completions')) {
        summaryRequests++;
        return route.fulfill({ headers, json: {
          choices: [{ message: { role: 'assistant', content: '测试角色答应在钟楼等候旅人。' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        } });
      }
      return route.abort();
    }
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript',
      '.css': 'text/css', '.html': 'text/html', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
  });
  async function ready() {
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
    });
  }
  const nav = name => page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('button', { name, exact: true });
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'load' });
    await ready();
    await page.evaluate(() => __qa.navigateWorkspace('patchlist'));
    await page.locator('.shell-runtime-info').waitFor();
    assert.ok((await page.locator('.shell-runtime-info').innerText()).includes('com.rphub.local'));
    assert.ok((await page.locator('.shell-runtime-info').innerText()).includes(await page.evaluate(() => window.RP_LOCAL_VERSION)));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(root, 'verification/performance-1.04/runtime-info-390.png') });
    await page.evaluate(() => __qa.navigateWorkspace('settings'));
    await nav('设置').click();
    await page.getByRole('button', { name: '记忆系统', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'memory');
    assert.equal(await page.locator('#memory-settings-panel').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.getByRole('button', { name: '管理分支记忆', exact: true }).count(), 0);
    await page.getByRole('checkbox', { name: '启用记忆系统', exact: true }).locator('..').click();
    assert.equal(await page.getByRole('checkbox', { name: '启用记忆系统', exact: true }).isChecked(), true);
    await page.getByPlaceholder('https://api.example.com/v1', { exact: true }).fill('https://memory.test/v1');
    await page.getByPlaceholder('记忆站 API Key（可选）', { exact: true }).fill('FAKE_TEST_KEY');
    await page.getByRole('button', { name: '获取模型', exact: true }).click();
    await page.getByRole('button', { name: '选择总结模型', exact: true }).click();
    await page.getByRole('button', { name: 'test-summary-model', exact: true }).click();
    await page.getByRole('button', { name: '切换到增强模式', exact: true }).click();
    await page.getByRole('button', { name: '选择向量模型', exact: true }).click();
    await page.getByRole('button', { name: 'test-embedding-model', exact: true }).click();
    const concurrency = page.getByRole('slider', { name: '补录并发数', exact: true });
    await concurrency.focus();
    await page.keyboard.press('End');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
    assert.equal(await concurrency.inputValue(), '6');
    await page.getByRole('button', { name: '锁定补录并发数', exact: true }).click();
    assert.equal(await concurrency.isDisabled(), true);
    await page.getByRole('button', { name: '锁定补录并发数', exact: true }).click();
    const floors = page.getByRole('slider', { name: '保留最近楼层', exact: true });
    await floors.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => __qa.activeKeepFloors), 24);
    await page.waitForTimeout(650);
    assert.equal(await page.evaluate(async () => (await RPHubStorage.getStoredValue('memory_settings')).classicConcurrency), 6);
    await page.getByRole('button', { name: '返回', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'settings');
    await page.evaluate(async () => {
      const card = (uuid, name) => ({ uuid, name, first_mes: '', description: '', worldInfo: [], regexScripts: [], uiTemplates: [] });
      __qa.characters = [card('memory-card-a', '记忆测试甲'), card('memory-card-b', '记忆测试乙')];
      await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
      await RPHubStorage.replaceMemoryScopeList('memory-card-b',
        [{ id: 'b-sentinel', classicMemory: true, no: 1, turn: 1, summary: '乙角色原有记忆' }]);
      await __qa.selectCharacter(0);
      __qa.chatHistory = [
        { id: 'memory-user', role: 'user', content: '明天在钟楼见面。' },
        { id: 'memory-assistant', role: 'assistant', content: '我会在钟楼等你。', shouldAnimate: false },
      ];
      __qa.memorySettings.mode = 'classic';
    });
    await page.getByRole('button', { name: '聊天菜单', exact: true }).click();
    await page.getByRole('dialog', { name: '聊天菜单', exact: true }).getByRole('button', { name: '记忆系统', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'memory');
    assert.equal(await page.getByRole('dialog', { name: '角色卡记忆管理', exact: true }).count(), 0);
    await page.getByRole('button', { name: '补录记忆', exact: true }).click();
    await page.waitForFunction(() => __qa.memoryBackfillProgress.status === 'done');
    assert.ok(summaryRequests > 0);
    await page.evaluate(() => { __qa.showMemoryBackfillModal = false; __qa.toasts = []; });
    await page.getByText('测试角色答应在钟楼等候旅人。', { exact: true }).waitFor();
    const saved = await page.evaluate(() => RPHubStorage.getScopedStoredValue('classic_memories', 'memory-card-a'));
    assert.ok(saved.some(memory => memory.summary === '测试角色答应在钟楼等候旅人。'));
    assert.equal(await page.getByRole('button', { name: '管理分支记忆', exact: true }).count(), 0);
    await page.getByRole('button', { name: '返回', exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'chat');
    await page.evaluate(() => __qa.shellGoBack());
    await page.evaluate(async () => { await __qa.selectCharacter(1); __qa.shellGoBack(); });
    await nav('高级').click();
    await page.waitForFunction(() => __qa.currentCharacter?.uuid === 'memory-card-b');
    await page.getByRole('button', { name: '记忆', exact: true }).click();
    await page.getByText('乙角色原有记忆', { exact: true }).waitFor();
    assert.equal(await page.getByText('测试角色答应在钟楼等候旅人。', { exact: true }).count(), 0);
    await page.getByRole('button', { name: '切换到增强模式', exact: true }).click();
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(root, `verification/memory-system-${width}.png`), fullPage: true });
    }
    await page.waitForTimeout(650);
    await page.reload({ waitUntil: 'load' });
    await ready();
    assert.deepEqual(await page.evaluate(() => {
      const m = __qa.memorySettings;
      return { enabled: m.enabled, mode: m.mode, classic: m.classicModel, embedding: m.embeddingModel, concurrency: m.classicConcurrency, floors: m.summaryKeepFloors };
    }), { enabled: true, mode: 'enhanced', classic: 'test-summary-model', embedding: 'test-embedding-model', concurrency: 6, floors: 24 });
    assert.deepEqual(errors, []);
    const report = { fullMemoryPageFromChatAndAdvancedAndSettings: true, settingsInitiallyExpanded: true,
      enableAndModesAndModelSelection: true, slidersAndLocksPersist: true, mockBackfillStored: true,
      characterMemoriesStaySeparate: true, redundantBranchDialogRemoved: true, returnToCaller: true,
      reloadPreservesSettings: true, runtimeVersionsDisplayed: true, widths: [390, 1280], summaryRequests, realApiUsed: false, errors };
    fs.writeFileSync(path.join(root, 'verification/memory-system.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
