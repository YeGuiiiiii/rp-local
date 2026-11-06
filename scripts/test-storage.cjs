const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, 'web', name), 'utf8');
const storageModule = source('assets/js/data-services.js').split('// --- Shared summary memory utilities ---')[0];
const filesModule = source('assets/js/local-files.js');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.addInitScript(installFileBridge);
  if (process.argv.includes('--legacy-bridge')) {
    await context.addInitScript(() => { delete window.RPLocalFiles.writeTextIfChanged; });
  }
  const page = await context.newPage();
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html><body></body>' }));
  const load = async () => {
    await page.goto('https://sta1n156.github.io/RP-Hub/test');
    await page.addScriptTag({ content: source('assets/vendor/vue.global.prod.js') });
    await page.addScriptTag({ content: filesModule });
    await page.addScriptTag({ content: source('assets/js/stream-import.js') });
    await page.addScriptTag({ content: storageModule });
  };
  try {
    await load();
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('RPHubDB', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('store');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('store', 'readwrite');
        const store = tx.objectStore('store');
        store.put([
          { uuid: '11111111-1111-4111-8111-111111111111', name: '同名卡' },
          { uuid: '22222222-2222-4222-8222-222222222222', name: '同名卡' },
        ], 'rp_hub_characters');
        store.put({ imageGenKey: 'FAKE_TEST_KEY', model: 'test-model' }, 'rp_hub_settings');
        store.put([{ role: 'assistant', content: '迁移测试' }], 'rp_hub_chat_11111111-1111-4111-8111-111111111111');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      await RPHubStorage.initDB();
    });
    const initial = await page.evaluate(async () => {
      const cards = await RPHubStorage.getStoredValue('characters');
      const folders = cards.map(c => c.storageFolder);
      cards[0].name = '改名后的显示名称';
      await RPHubStorage.setStoredValue('characters', cards);
      await RPHubStorage.setScopedStoredValue('chat', cards[1].uuid, [{ role: 'user', content: '另一张卡的数据' }]);
      localStorage.setItem('rphub-image-freeze::' + cards[0].uuid, '{"frozen":true}');
      await RPLocalStore.flush();
      const files = Object.entries(window.__qaNativeFiles);
      return { folders, files: files.map(([name, entry]) => ({ name, text: entry.text })) };
    });
    assert.equal(new Set(initial.folders).size, 2);
    assert.ok(initial.files.some(file => file.name.startsWith('角色卡数据/同名卡/') && file.text.includes('迁移测试')));
    assert.ok(initial.files.some(file => file.name.startsWith('个人数据/') && file.text.includes('FAKE_TEST_KEY')));
    assert.ok(!initial.files.some(file => file.name.startsWith('角色卡数据/') && file.text.includes('FAKE_TEST_KEY')));
    assert.ok(initial.files.some(file => file.name.startsWith('角色卡数据/同名卡/') && file.text.includes('frozen')));
    await page.evaluate(async () => {
      RPHubStorage.getMainDb().close();
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase('RPHubDB');
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });
    });
    await load();
    const restored = await page.evaluate(async () => {
      await RPHubStorage.initDB();
      const cards = await RPHubStorage.getStoredValue('characters');
      return {
        cards,
        settings: await RPHubStorage.getStoredValue('settings'),
        first: await RPHubStorage.getScopedStoredValue('chat', cards[0].uuid),
        second: await RPHubStorage.getScopedStoredValue('chat', cards[1].uuid),
        frozen: localStorage.getItem('rphub-image-freeze::' + cards[0].uuid),
      };
    });
    assert.equal(restored.cards[0].name, '改名后的显示名称');
    assert.equal(restored.cards[0].storageFolder, '同名卡');
    assert.equal(restored.cards[0].importedName, '同名卡');
    assert.equal(restored.settings.imageGenKey, 'FAKE_TEST_KEY');
    assert.equal(restored.first[0].content, '迁移测试');
    assert.equal(restored.second[0].content, '另一张卡的数据');
    assert.equal(restored.frozen, '{"frozen":true}');
    const failures = await page.evaluate(async () => {
      const original = RPLocalFiles.writeText;
      RPLocalFiles.writeText = () => JSON.stringify({ ok: false, error: 'Disk full fixture' });
      let rejected = false;
      try { await RPHubStorage.setStoredValue('test_failure', { value: 1 }); }
      catch (_) { rejected = true; }
      RPLocalFiles.writeText = original;
      return rejected;
    });
    assert.equal(failures, true);
    const report = { legacyMigration: true, duplicateNamesIsolated: true, originalImportNamePreserved: true, privateKeysSeparated: true, nativeFileRestoreAfterDatabaseLoss: true, chatIsolation: true, localPreferencesRestored: true, writeFailureReported: failures, folders: initial.folders };
    fs.writeFileSync(path.join(root, 'verification', process.argv.includes('--legacy-bridge') ? 'storage-legacy-bridge.json' : 'storage.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
