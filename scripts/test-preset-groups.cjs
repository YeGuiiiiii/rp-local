const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification', 'preset-groups-1.11');
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
      window.__downloads = [];
      window.AndroidBridge = { isNativeApp: () => true, saveFile: (bytes, name) => __downloads.push({ bytes, name }) };
    });
  }
  async function overview() {
    await page.evaluate(() => { __qa.navigateWorkspace('presets'); __qa.openPresetGroup(null); });
    await page.getByRole('button', { name: '新建分组', exact: true }).waitFor();
  }
  async function importFile(data, global = false) {
    const active = await page.evaluate(() => __qa.activePresetGroupName);
    const input = page.getByLabel(!global && active ? '导入到分组：' + active : '导入预设或分组', { exact: true });
    const file = { name: 'preset.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) };
    if (!global && active) {
      const chooser = page.waitForEvent('filechooser');
      await page.locator('.preset-group-import').click();
      await (await chooser).setFiles(file);
    } else await input.setInputFiles(file);
    await page.waitForFunction(label => document.querySelector('input[aria-label="' + label + '"]').value === '',
      !global && active ? '导入到分组：' + active : '导入预设或分组');
  }
  async function groupAction(name) {
    await page.locator('.preset-group-body summary').click();
    await page.getByRole('button', { name, exact: true }).click();
  }
  async function download(action) {
    const count = await page.evaluate(() => __downloads.length);
    await action();
    await page.waitForFunction(count => __downloads.length > count, count);
    const file = await page.evaluate(() => __downloads.at(-1));
    return { name: file.name, data: JSON.parse(Buffer.from(file.bytes, 'base64').toString('utf8')) };
  }
  async function snapshot() {
    return page.evaluate(() => ({
      presets: JSON.parse(JSON.stringify(__qa.presets)),
      groups: __qa.presetGroups.map(group => group.key)
    }));
  }
  async function capture(name) {
    await page.evaluate(() => { __qa.toasts = []; document.activeElement?.blur(); });
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name);
    assert.equal(await page.locator('.preset-group-row,.preset-group-body,.preset-group-form').evaluateAll(elements =>
      elements.some(element => element.getBoundingClientRect().right > innerWidth + 1)), false, name);
    assert.equal(await page.locator('.preset-group-open').evaluateAll(buttons => buttons.every(button => {
      const label = button.querySelector('strong');
      return label && label.getBoundingClientRect().width > 0 && label.getBoundingClientRect().height > 0
        && button.querySelectorAll(':scope > .shell-icon').length === 1;
    })), true, 'Group labels and icons must actually render');
    assert.equal(await page.locator('.preset-group-row .settings-toggle').evaluateAll(tracks => tracks.every(track => {
      const thumb = getComputedStyle(track, '::after'), style = getComputedStyle(track);
      return style.position === 'relative'
        && Math.abs(parseFloat(thumb.top) * 2 + parseFloat(thumb.height) - track.clientHeight) < 1;
    })), true, 'Switch thumbs stay inside their tracks');
  }
  const custom = '秋日长夜与城堡来信的自定义预设分组';
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
    await page.evaluate(async () => {
      await RPHubStorage.setStoredValue('presets', [
        { name: '旧默认条目', content: '原始正文必须保留', enabled: false, role: 'assistant', customContent: true, extra: { keep: 1 } },
        { name: '既有自定义组', content: '旧组正文', enabled: true, role: 'user', group: '旧组' }
      ]);
      await RPHubStorage.setStoredValue('group_sentinel', { chat: '聊天不变', memory: '记忆不变' });
    });
    await page.reload(); await ready(); await overview();
    assert.equal(await page.getByRole('button', { name: '打开分组：STA1N官方分组', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: '打开分组：默认分组', exact: true }).count(), 0);
    const legacy = (await snapshot()).presets.find(preset => preset.name === '旧默认条目');
    assert.deepEqual(legacy, { name: '旧默认条目', content: '原始正文必须保留', enabled: false, role: 'assistant', customContent: true, extra: { keep: 1 }, group: 'STA1N官方分组' });
    await page.getByRole('button', { name: '新建分组', exact: true }).click();
    await page.getByRole('button', { name: '保存分组', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '请填写分组名称' }).waitFor();
    await page.getByRole('textbox', { name: '新建分组', exact: true }).fill('旧组');
    await page.getByRole('button', { name: '保存分组', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '已有同名分组' }).waitFor();
    await page.getByRole('textbox', { name: '新建分组', exact: true }).fill(custom);
    await page.getByRole('button', { name: '保存分组', exact: true }).click();
    await page.getByText('这个分组还没有预设', { exact: true }).waitFor();
    await page.waitForFunction(async name => (await RPHubStorage.getStoredValue('preset_groups')).includes(name), custom);
    await page.reload(); await ready(); await overview();
    await page.getByRole('button', { name: '打开分组：' + custom, exact: true }).waitFor();
    const raw = { name: '导入的独立预设', content: '完整正文\n"引号"与中文', role: 'user', enabled: false, group: '外部组名', customContent: true, metadata: { keep: ['a', 2] } };
    await importFile([raw]); await importFile(raw);
    assert.equal((await snapshot()).groups.filter(name => name === '默认分组').length, 1);
    assert.equal((await snapshot()).groups.includes('外部组名'), false);
    assert.equal((await snapshot()).presets.filter(preset => preset.name === raw.name && preset.group === '默认分组').length, 2);
    const beforeInvalid = await snapshot();
    for (const bad of [{ wrong: 'format' }, [raw, null], { type: 'rp-hub-preset-groups', version: 99, groups: [] },
      { type: 'rp-hub-preset-groups', version: 1, groups: [{ name: '不应创建', presets: [raw] }, { name: '坏组', presets: [{}] }] }]) {
      await importFile(bad);
      assert.deepEqual(await snapshot(), beforeInvalid, 'Invalid file must not partially import');
    }
    await page.getByRole('button', { name: '打开分组：' + custom, exact: true }).click();
    const groupCount = await page.locator('.preset-group-row').count();
    assert.equal(await page.locator('.preset-group-body').count(), 1);
    assert.ok(groupCount > 1, 'Other groups stay visible');
    const toggle = page.getByRole('button', { name: '打开分组：' + custom, exact: true });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await toggle.click();
    assert.equal(await page.locator('.preset-group-body').count(), 0);
    await toggle.focus(); await page.keyboard.press('Enter');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await importFile([raw, { name: '第二项', content: '二号正文', enabled: true, role: 'assistant' }]);
    assert.equal((await snapshot()).presets.filter(preset => preset.group === custom).length, 2);
    const itemExport = await download(async () => {
      await groupAction('导出组内预设');
      await page.evaluate(() => { __qa.selectAllExportItems(); __qa.confirmExport(); });
    });
    assert.ok(itemExport.name.includes(custom));
    assert.equal(itemExport.data.length, 2);
    assert.deepEqual(itemExport.data[0].metadata, raw.metadata);
    assert.equal(itemExport.data[0].role, 'user'); assert.equal(itemExport.data[0].enabled, false);
    const unaffected = (await snapshot()).presets.filter(preset => preset.group !== custom);
    await page.evaluate(() => {
      const list = document.querySelector('[data-preset-group]');
      const rows = list.querySelectorAll('[data-preset-index]');
      list.insertBefore(rows[1], rows[0]);
      Sortable.get(list).option('onEnd')();
    });
    assert.deepEqual((await snapshot()).presets.filter(preset => preset.group === custom).map(preset => preset.name), ['第二项', raw.name]);
    assert.deepEqual((await snapshot()).presets.filter(preset => preset.group !== custom), unaffected);
    await groupAction('重命名分组');
    const renamed = custom + '-改名';
    await page.getByRole('textbox', { name: '重命名分组', exact: true }).fill(renamed);
    await page.getByRole('button', { name: '保存分组', exact: true }).click();
    assert.equal((await snapshot()).groups.includes(custom), false);
    assert.equal((await snapshot()).presets.filter(preset => preset.group === renamed).length, 2);
    const singleGroup = await download(() => groupAction('导出整个分组'));
    assert.equal(singleGroup.data.type, 'rp-hub-preset-groups');
    assert.equal(singleGroup.data.groups.length, 1);
    assert.equal(singleGroup.data.groups[0].name, renamed);
    await page.getByRole('button', { name: '打开分组：' + renamed, exact: true }).click();
    assert.equal(await page.evaluate(() => __qa.currentView), 'presets');
    await page.getByRole('button', { name: '新建分组', exact: true }).waitFor();
    await page.getByRole('button', { name: '打开分组：' + renamed, exact: true }).click();
    const fromDirectory = await download(() => groupAction('导出整个分组'));
    assert.deepEqual(fromDirectory.data, singleGroup.data);
    await importFile(singleGroup.data, true);
    assert.equal((await snapshot()).presets.filter(preset => preset.group === renamed).length, 4);
    assert.equal((await snapshot()).groups.filter(name => name === renamed).length, 1);
    await page.getByRole('button', { name: '打开分组：旧组', exact: true }).click();
    await importFile(singleGroup.data);
    assert.equal((await snapshot()).presets.filter(preset => preset.group === '旧组').length, 3, 'In-group import uses the chosen target');
    await groupAction('批量管理');
    await page.evaluate(() => __qa.selectAllPresets());
    assert.equal(await page.evaluate(() => __qa.selectedPresetIndices.length), 3);
    await page.evaluate(() => { __qa.openPresetBatchMoveModal(); __qa.presetBatchTargetGroup = '移动后的空白测试组'; __qa.applyPresetBatchMove(); });
    assert.equal((await snapshot()).presets.filter(preset => preset.group === '旧组').length, 0);
    assert.ok((await snapshot()).groups.includes('旧组'), 'Empty source group is retained');
    await overview();
    const allGroups = await download(() => page.getByRole('button', { name: '导出全部分组', exact: true }).click());
    assert.ok(allGroups.data.groups.some(group => group.name === '旧组' && group.presets.length === 0));
    const allBeforeImport = await snapshot();
    await importFile(allGroups.data);
    assert.equal((await snapshot()).presets.length, allBeforeImport.presets.length * 2);
    assert.deepEqual((await snapshot()).groups, allBeforeImport.groups);
    for (const scheme of ['day', 'night']) {
      await page.evaluate(scheme => RPHubThemeKit.setScheme(scheme), scheme);
      for (const width of [360, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 }); await overview();
        await capture(`groups-${scheme}-${width}`);
        await page.getByRole('button', { name: '打开分组：' + renamed, exact: true }).click();
        await capture(`presets-${scheme}-${width}`);
      }
    }
    await page.getByRole('button', { name: '打开分组：' + renamed, exact: true }).click();
    await page.getByRole('button', { name: '打开分组：旧组', exact: true }).click();
    const otherFlags = await page.evaluate(() => __qa.presets.filter(p => p.group !== '默认分组').map(p => p.enabled));
    const defaultSwitch = page.getByRole('switch', { name: '启用分组：默认分组', exact: true });
    if (!await defaultSwitch.isChecked()) await defaultSwitch.locator('..').click();
    assert.equal(await defaultSwitch.isChecked(), true);
    assert.deepEqual(await page.evaluate(() => __qa.presets.filter(p => p.group !== '默认分组').map(p => p.enabled)), otherFlags);
    assert.equal(await page.getByRole('button', { name: '打开分组：旧组', exact: true }).getAttribute('aria-expanded'), 'true', 'Switch does not change open group');
    await capture('empty-group-night-1280');
    const beforeReload = await snapshot();
    await page.waitForFunction(async () => JSON.stringify(await RPHubStorage.getStoredValue('presets')) === JSON.stringify(__qa.presets));
    await page.evaluate(() => RPLocalStore.flush());
    await page.reload(); await ready(); await overview();
    assert.deepEqual(await snapshot(), beforeReload);
    assert.deepEqual(await page.evaluate(() => RPHubStorage.getStoredValue('group_sentinel')), { chat: '聊天不变', memory: '记忆不变' });
    await page.getByRole('button', { name: '打开分组：旧组', exact: true }).click();
    await page.evaluate(() => window.rphubHandleBack());
    assert.equal(await page.evaluate(() => __qa.currentView), 'characters');
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    const report = { legacyOfficialMigration: true, emptyGroupPersists: true, customNameAndRename: true,
      ordinaryImportUsesNamedDefault: true, inGroupImportExport: true, groupedRoundTripAndSameNameMerge: true,
      fullLibraryIncludesEmptyGroups: true, invalidImportAtomic: true, sortPreservesOtherGroups: true,
      batchMoveAndEmptySource: true, backToCallerWithExpandedGroup: true, contentAndRolesAndFlagsRetained: true,
      accordionAndKeyboard: true, explicitGroupFileChooser: true, globalImportIndependentOfOpenGroup: true,
      groupToggleDoesNotExpandOrChangeOtherGroups: true,
      reloadAndOtherDataPreserved: true, widths: [360, 390, 1280], schemes: ['day', 'night'], errors, missing };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
