const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification', 'settings-1.06');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(installFileBridge);
  const page = await context.newPage(), errors = [], jobs = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'https://nai.sta1n.cn') {
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
      if (url.pathname === '/api/jobs') {
        jobs.push(route.request().postDataJSON());
        return route.fulfill({ headers, json: { id: String(jobs.length), status: 'done', imageUrl: `https://nai.sta1n.cn/api/jobs/${jobs.length}/content` } });
      }
      if (url.pathname.endsWith('/content')) return route.fulfill({ headers, contentType: 'image/png', path: path.join(root, 'dist/app-icon.png') });
      return route.fulfill({ headers, json: { remaining: 999 } });
    }
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' });
  });
  async function init() {
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
    });
  }
  async function imageSettings() {
    await page.evaluate(() => { __qa.navigateWorkspace('settings'); __qa.openSettingsSection('image'); });
    await page.getByText('高级生图参数', { exact: false }).locator('..').evaluate(element => { element.open = true; });
  }
  const control = label => page.locator('.min-w-0').filter({ has: page.locator('label.settings-label', { hasText: new RegExp('^' + label + '$') }) }).getByRole('button', { expanded: false });
  async function select(label, option) {
    await control(label).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  }
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/'); await init(); await imageSettings();
    await select('采样器', 'Euler');
    const initial = await page.evaluate(() => ({
      value: __qa.imageGenParams.sampler,
      saved: JSON.parse(localStorage.getItem('rphub_image_gen_params') || '{}').sampler,
    }));
    if (process.argv.includes('--expect-broken')) {
      assert.notEqual(initial.value, 'k_euler');
      fs.writeFileSync(path.join(output, 'before.json'), JSON.stringify(initial, null, 2));
      console.log('Reproduced: selecting Euler leaves the sampler unchanged.');
      return;
    }
    assert.deepEqual(initial, { value: 'k_euler', saved: 'k_euler' });
    const samplers = [
      ['DPM++ 2M SDE', 'k_dpmpp_2m_sde'], ['DPM++ 2M', 'k_dpmpp_2m'], ['DPM++ SDE', 'k_dpmpp_sde'],
      ['DPM++ 2S Ancestral', 'k_dpmpp_2s_ancestral'], ['Euler Ancestral', 'k_euler_ancestral'], ['Euler', 'k_euler'],
    ];
    for (const [label, value] of samplers) {
      await select('采样器', label);
      assert.equal(await page.evaluate(() => __qa.imageGenParams.sampler), value);
      await expectSelected(label);
    }
    async function expectSelected(label) { assert.equal(await control('采样器').innerText(), label); }
    for (const [label, value] of [['Karras（官网默认）', 'karras'], ['Native', 'native'], ['Exponential', 'exponential']]) {
      await select('噪声调度', label);
      assert.equal(await page.evaluate(() => __qa.imageGenParams.noise_schedule), value);
    }
    await page.reload(); await init(); await imageSettings();
    assert.equal(await control('采样器').innerText(), 'Euler');
    assert.equal(await control('噪声调度').innerText(), 'Exponential');
    await page.evaluate(async () => {
      __qa.characters = [{ uuid: 'sampler-test', name: '采样器测试', first_mes: '开始', worldInfo: [], regexScripts: [], uiTemplates: [] }];
      await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
      await __qa.selectCharacter(0);
      __qa.settings.imageGenKey = 'TEST_ONLY';
      __qa.settings.freezeGeneratedImages = false; __qa.settings.freezeGeneratedImagesExplicit = true;
      __qa.worldInfo.find(entry => entry.comment === '自动生图').enabled = true;
      __qa.chatHistory = [{ id: 'sampler-message', role: 'assistant', shouldAnimate: false, content: 'image###red cat, blue sky, garden###' }];
    });
    await page.waitForFunction(() => document.querySelector('.generated-image-card')?.dataset.imageJobStatus === 'done'
      || document.querySelector('.generated-image-reroll:not(:disabled)'));
    await page.waitForTimeout(300);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].steps, '28');
    assert.equal(jobs[0].sampler, 'k_euler'); assert.equal(jobs[0].noise_schedule, 'exponential');
    await imageSettings();
    await select('采样器', 'DPM++ 2M SDE'); await select('噪声调度', 'Karras（官网默认）');
    await page.evaluate(() => __qa.navigateWorkspace('chat'));
    await page.locator('.generated-image-card').first().evaluate(card => {
      const source = new URL(card.dataset.imageRequest);
      source.searchParams.set('sampler', 'k_euler'); source.searchParams.set('noise_schedule', 'exponential');
      card.dataset.imageRequest = source.href;
    });
    await page.getByRole('button', { name: '重新生成图片', exact: true }).first().dispatchEvent('click');
    await page.waitForTimeout(400);
    assert.equal(jobs.at(-1).sampler, 'k_dpmpp_2m_sde');
    assert.equal(jobs.at(-1).noise_schedule, 'karras');
    await imageSettings();
    for (const width of [360, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => { __qa.toasts = []; });
      await control('采样器').click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(output, `sampler-${width}.png`), fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button', { name: '恢复默认', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('rphub_image_gen_params')), null);
    await page.evaluate(() => {
      window.__exported = [];
      window.__folder = '';
      window.AndroidBridge = {
        isNativeApp: () => true, getBackupFolder: () => __folder, chooseBackupFolder: () => {},
        createBackupFileToDownloads: (name, mime) => { __exported.push({ name, mime, target: 'downloads', chunks: '' }); return 'OK:test'; },
        createBackupFile: (name, mime) => { __exported.push({ name, mime, target: 'custom', chunks: '' }); return 'OK:test'; },
        writeBackupChunk: (token, base64) => { __exported.at(-1).chunks += atob(base64); return 'OK'; },
        finishBackupWrite: () => 'OK', abortBackupWrite: () => {},
      };
      __qa.navigateWorkspace('settings'); __qa.navigateWorkspace('backup');
    });
    await page.getByText('下载 / RP本地版 / 数据备份', { exact: true }).waitFor();
    await page.getByRole('button', { name: '导出全部数据', exact: true }).click();
    await page.waitForFunction(() => __exported.length && !__qa.isExportingAllData);
    assert.match(await page.evaluate(() => __exported[0].name), /^RP本地版-数据备份-\d{4}-\d{2}-\d{2}\.json$/);
    assert.equal(await page.evaluate(() => {
      const pack = JSON.parse(new TextDecoder().decode(Uint8Array.from(__exported[0].chunks, char => char.charCodeAt(0))));
      if (pack.entries.find(entry => entry.key === 'rp_hub_characters').value[0].name !== '采样器测试') throw new Error('Export text corrupted');
      return pack.type;
    }), 'rp-hub-complete-backup');
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => { __qa.toasts = []; });
    await page.locator('.management-view:visible').evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: path.join(output, 'backup-folder-390.png'), fullPage: true });
    await page.evaluate(() => { __folder = 'content://test/custom-folder'; window.rphubBackupFolderChanged(__folder); __qa.backupFileName = '我的备份'; });
    await page.getByRole('button', { name: '导出全部数据', exact: true }).click();
    await page.waitForFunction(() => __exported.length === 2 && !__qa.isExportingAllData);
    assert.deepEqual(await page.evaluate(() => __exported.map(({ name, target }) => ({ name, target }))), [
      { name: await page.evaluate(() => __exported[0].name), target: 'downloads' }, { name: '我的备份.json', target: 'custom' },
    ]);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ samplers: 6, noiseSchedules: 3, persistedAfterReload: true,
      requestUsesSelection: true, requestReturnsToDefault: true, customFolderAndFilenamePreserved: true, jobs, errors }, null, 2));
    console.log('Sampler selection, persistence, actual request parameters and export naming passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
