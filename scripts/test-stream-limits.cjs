const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  let fault = '';
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
    if (file.endsWith('stream-import-worker.js') && fault) {
      if (fault === 'ready') return route.fulfill({ contentType: 'application/javascript', body: '' });
      const prefix = fault === 'blocked' ? 'indexedDB.open = () => { const req = {}; setTimeout(() => req.onblocked(), 0); return req; };\n'
        : 'Blob.prototype.arrayBuffer = () => new Promise(() => {});\n';
      return route.fulfill({ contentType: 'application/javascript', body: prefix + fs.readFileSync(file, 'utf8') });
    }
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' });
  });
  async function init() {
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false; __qa.navigateWorkspace('settings'); __qa.navigateWorkspace('backup');
    });
  }
  async function smallFile() {
    await page.getByLabel('选择流式导入文件').setInputFiles({ name: 'small.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ type: 'rp-hub-complete-backup', entries: [{ key: 'rp_hub_stream_limit_probe', value: 'new' }] })) });
  }
  async function failed() {
    await page.waitForFunction(() => __qa.streamImportPanel.state.phase === 'failed', null, { timeout: 180000 });
    assert.equal(await page.evaluate(() => RPHubStorage.getStoredValue('stream_limit_probe')), 'old');
    return page.evaluate(() => __qa.streamImportPanel.state.error);
  }
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/'); await init();
    await page.evaluate(() => RPHubStorage.setStoredValue('stream_limit_probe', 'old'));
    const report = {};
    for (fault of ['blocked', 'ready', 'read']) { await smallFile(); report[fault] = await failed(); }
    fault = '';
    await page.evaluate(() => {
      const input = document.querySelector('[aria-label="选择流式导入文件"]'), transfer = new DataTransfer();
      transfer.items.add(new File(['{"type":"rp-hub-complete-backup","entries":[{"key":"rp_hub_characters","value":[{"name":"over","description":"',
        'x'.repeat(33 * 1048576), '"}]}]}'], 'single-33mb.json', { type: 'application/json' }));
      input.files = transfer.files; input.dispatchEvent(new Event('change'));
    });
    report.singleRecordLimit = await failed();
    assert.match(report.singleRecordLimit, /32 MB/);
    const largeFile = path.resolve(root, '../RP-流式导入实验/test-data/large-340mb.json');
    await page.getByLabel('选择流式导入文件').setInputFiles(largeFile);
    report.largeFileBytes = fs.statSync(largeFile).size;
    report.collectionLimit = await failed();
    assert.match(report.collectionLimit, /128 MB/);
    // Actually restore a 32 MiB collection without the artificial localStorage file bridge.
    await page.evaluate(() => {
      const input = document.querySelector('[aria-label="选择流式导入文件"]'), transfer = new DataTransfer();
      const card = i => ({ uuid: 'large-card-' + i, name: '大文件测试' + i, description: 'x'.repeat(2 * 1048576) });
      transfer.items.add(new File([JSON.stringify({ type: 'rp-hub-complete-backup', entries: [
        { key: 'rp_hub_characters', value: Array.from({ length: 16 }, (_, i) => card(i)) },
        { key: 'rp_hub_stream_limit_probe', value: 'committed' },
      ] })], 'valid-32mb.json', { type: 'application/json' }));
      input.files = transfer.files; input.dispatchEvent(new Event('change'));
    });
    await page.waitForFunction(() => __qa.streamImportPanel.state.phase === 'ready', null, { timeout: 120000 });
    await page.evaluate(async () => {
      const db = RPHubStorage.getMainDb();
      const sessions = await new Promise(resolve => {
        const req = db.transaction('restore_sessions').objectStore('restore_sessions').getAll(); req.onsuccess = () => resolve(req.result);
      });
      await RPStreamImport.apply(sessions.find(s => s.state === 'complete').id, {
        beforeApply: __qa.prepareStreamImport, restoreValue: value => __qa.restoreRphubBinaryDeep(value),
      });
    });
    await page.reload(); await init();
    report.restored = await page.evaluate(async () => ({
      count: (await RPHubStorage.getStoredValue('characters')).length,
      descriptionBytes: (await RPHubStorage.getStoredValue('characters'))[15].description.length,
      probe: await RPHubStorage.getStoredValue('stream_limit_probe'),
    }));
    assert.deepEqual(report.restored, { count: 16, descriptionBytes: 2 * 1048576, probe: 'committed' });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(root, 'verification/stream-import-1.05/limits.json'), JSON.stringify({ ...report, errors }, null, 2));
    console.log('Worker faults, 33 MiB record limit, 340 MiB collection guard and actual 32 MiB restore passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
