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
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    const relative = url.pathname.slice('/RP-Hub/'.length) || 'index.html';
    const file = path.join(web, relative);
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
    const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webp': 'image/webp', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream';
    return route.fulfill({ path: file, contentType: mime });
  });
  const state = () => page.evaluate(() => {
    window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
    window.__qa.showUserSetupModal = false;
  });
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__rpDataReady);
    await page.waitForFunction(() => !document.querySelector('.entry-transition'));
    await page.waitForTimeout(600);
    await state();
    await page.evaluate(() => {
      __qa.resourceScope = 'global';
      __qa.worldInfo = [
        { comment: '第一条', keys: ['北门暗号'], content: '守卫在这里巡逻', scope: 'global', enabled: true },
        { comment: '星港', keys: ['港口'], content: '正文中的琥珀茶铺', scope: 'global', enabled: false },
        { comment: '同名条目', keys: [], content: '目标正文', scope: 'global', enabled: true },
        { comment: '同名条目', keys: [], content: '另一份正文', scope: 'global', enabled: true },
      ];
      __qa.currentView = 'worldinfo';
    });
    const input = page.getByRole('searchbox', { name: '搜索世界书', exact: true });
    await input.fill('北门暗号');
    assert.equal(await page.evaluate(() => Sortable.get(document.getElementById('worldinfo-list')).option('disabled')), true);
    assert.equal(await page.locator('#worldinfo-list .sortable-list-item').count(), 1);
    assert.equal(await page.locator('#worldinfo-list h3').textContent(), '第一条');
    await input.fill('琥珀茶铺');
    assert.equal(await page.locator('#worldinfo-list h3').textContent(), '星港');
    await page.locator('#worldinfo-list button[title="编辑"]').click();
    const originalIndex = await page.evaluate(() => __qa.editingWorldInfo.id);
    assert.equal(originalIndex, 1, 'Filtered edit must use the original data index');
    await page.evaluate(() => {
      __qa.editingWorldInfo.data.content = '已修改的星港正文';
      __qa.saveWorldInfo();
    });
    await input.fill('同名条目');
    assert.equal(await page.locator('#worldinfo-list .sortable-list-item').count(), 2);
    await input.fill('不存在的内容');
    assert.equal(await page.locator('#worldinfo-list .sortable-list-item').count(), 0);
    await page.getByRole('button', { name: '清空搜索' }).click();
    assert.equal(await page.evaluate(() => Sortable.get(document.getElementById('worldinfo-list')).option('disabled')), false);
    assert.equal(await page.locator('#worldinfo-list .sortable-list-item').count(), 4);
    await input.fill('星港');
    await page.screenshot({ path: path.join(root, 'verification', 'worldbook-search-390.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const presetNames = await page.evaluate(() => {
      const targets = [__qa.presets[0].name, 'COT', '破限预注入 · AI 1'];
      for (const name of targets) {
        const index = __qa.presets.findIndex(preset => preset.name === name);
        if (index < 0) continue;
        __qa.editPreset(index);
        __qa.editingPreset.data.content = '用户自定义预设：' + name;
        __qa.savePreset();
      }
      __qa.worldInfo.push({
        comment: '自动生图', keys: [], content: '系统初始内容',
        scope: 'global', enabled: true, constant: true, order: 11, depth: 2,
      });
      const index = __qa.worldInfo.findIndex(entry => entry.comment === '自动生图');
      __qa.editWorldInfo(index);
      __qa.editingWorldInfo.data.content = '用户自定义自动生图世界书';
      __qa.saveWorldInfo();
      return targets.filter(name => __qa.presets.some(preset => preset.name === name));
    });
    await page.waitForTimeout(2200);
    await page.evaluate(() => RPLocalStore.flush());
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__rpDataReady);
    await page.waitForFunction(() => !document.querySelector('.entry-transition'));
    await page.waitForTimeout(800);
    await state();
    await page.evaluate(() => { __qa.settings.imageGenCount = 3; });
    await page.waitForTimeout(300);
    const saved = await page.evaluate(names => ({
      presets: names.map(name => __qa.presets.find(preset => preset.name === name)),
      entry: __qa.worldInfo.find(entry => entry.comment === '自动生图'),
      ordinary: __qa.worldInfo.find(entry => entry.comment === '星港'),
    }), presetNames);
    for (const preset of saved.presets) assert.equal(preset.content, '用户自定义预设：' + preset.name);
    assert.equal(saved.entry.content, '用户自定义自动生图世界书');
    assert.equal(saved.entry.depth, 2);
    assert.equal(saved.entry.order, 11);
    assert.equal(saved.ordinary.content, '已修改的星港正文');
    assert.equal(saved.ordinary.enabled, false);
    assert.deepEqual(errors, []);
    const report = { titleSearch: true, keywordSearch: true, contentSearch: true, duplicateTitles: true, filteredEditOriginalIndex: originalIndex, emptyAndClear: true, presetsPreservedAfterReload: presetNames, generatedWorldbookEditPreserved: true, ordinaryWorldbookEditPreserved: true, errors };
    fs.writeFileSync(path.join(root, 'verification', 'worldbook.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
