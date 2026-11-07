const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const output = path.join(root, 'verification', 'stream-import-1.05');
fs.mkdirSync(output, { recursive: true });
const transferEvidence = path.join(root, '.impeccable/review/transfer-2.9.004');
fs.mkdirSync(transferEvidence, { recursive: true });
const revision = '0123456789abcdef0123456789abcdef';
const fixture = () => ({
  type: 'rp-hub-complete-backup', version: 8, entries: [
    { key: 'rp_hub_characters', value: [{ uuid: 'stream-new', name: '流式测试卡', description: '中文与转义🌙"\\\n',
      worldInfo: [{ content: '世界书', keys: ['雨'] }], regexScripts: [{ name: '脚本', enabled: false }],
      uiTemplates: [{ name: '面板', enabled: false, htmlTemplate: '<div>保留</div>' }] }] },
    { key: 'rp_hub_chat_stream-new', value: [{ role: 'assistant', content: '聊天正文', id: 'stream-msg' }] },
    { key: 'rp_hub_classic_memories_stream-new', value: [{ classicMemory: true, turn: 1, summary: '记忆正文' }] },
    { key: 'rp_hub_b1_memory_state_stream-new', value: { schema: 1, revision, deleted: false } },
    { key: 'rp_hub_classic_memories_deleted', value: [{ summary: '不应复活' }] },
    { key: 'rp_hub_b1_memory_state_deleted', value: { schema: 1, revision, deleted: true } },
    { key: 'rp_hub_story_branches_stream-new', value: { activeBranchId: 'main', branches: [{ id: 'main' }] } },
    { key: 'rp_hub_stream_binary', value: { image: { __rphub_bin__: 'AQID', __rphub_type__: 'Blob', __rphub_mime__: 'image/png' } } },
    { key: '__ls__:stream-pref', value: 'entry-wins' },
    { key: 'rp_hub_stream_probe', value: 'first' },
    { key: 'rp_hub_stream_probe', value: 'last' },
    { key: 'rp_hub_preset_groups', value: ['STA1N官方分组', '流式恢复的空组'] },
  ],
  databases: {
    RPHubDB: { store: [{ k: 'rp_hub_stream_probe', v: 'duplicate-database-must-not-win' }] },
    sf_moments_db: { moments: [{ k: 'list', v: [{ content: '名场面正文' }] }] },
  }, webStorage: { localStorage: { 'stream-pref': 'web-fallback' } },
});
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(installFileBridge);
  const page = await context.newPage();
  const errors = [];
  let workerMode = '';
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
      return route.fulfill({ status: 404, body: '' });
    if (file.endsWith('stream-import-worker.js') && workerMode) {
      const prefix = workerMode === 'crash' ? 'throw new Error("injected worker failure");\n'
        : workerMode === 'hang' ? 'Blob.prototype.arrayBuffer = () => new Promise(() => {});\n'
          : workerMode === 'slow' ? 'const originalRead = Blob.prototype.arrayBuffer; Blob.prototype.arrayBuffer = async function () { await new Promise(resolve => setTimeout(resolve, 25)); return originalRead.call(this); };\n' : '';
      return route.fulfill({ contentType: 'application/javascript', body: prefix + fs.readFileSync(file, 'utf8') });
    }
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' });
  });
  async function ready() {
    await page.waitForFunction(() => window.__rpDataReady || window.__rpDataError);
    const error = await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
      return window.__rpDataError;
    });
    assert.equal(error, undefined);
    await page.waitForFunction(() => !document.querySelector('.entry-transition'));
  }
  async function backup() {
    await page.evaluate(() => { __qa.navigateWorkspace('settings'); __qa.navigateWorkspace('backup'); });
    await page.getByRole('button', { name: '流式导入 JSON', exact: true }).waitFor();
  }
  async function stage(data = fixture(), phase = 'ready') {
    if (await page.evaluate(() => __qa.streamImportPanel?.state.phase === 'ready'))
      await page.getByRole('button', { name: '取消', exact: true }).click();
    const buffer = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
    await page.getByLabel('选择流式导入文件').setInputFiles({ name: 'fixture.json', mimeType: 'application/json', buffer });
    await page.waitForFunction(phase => __qa.streamImportPanel?.state.phase === phase, phase, { timeout: 60000 });
  }
  async function unchanged() {
    const result = await page.evaluate(async () => ({
      sentinel: await RPHubStorage.getStoredValue('stream_probe'),
      cards: (await RPHubStorage.getStoredValue('characters')).map(card => card.uuid),
      preference: localStorage.getItem('stream-pref'),
      moments: await new Promise((resolve, reject) => {
        const r = indexedDB.open('sf_moments_db', 1);
        r.onsuccess = () => { const db = r.result; const tx = db.transaction('moments'); const q = tx.objectStore('moments').get('list'); q.onsuccess = () => { db.close(); resolve(q.result); }; q.onerror = () => reject(q.error); };
      }),
    }));
    assert.deepEqual(result, { sentinel: 'old', cards: ['stream-old'], preference: 'old-pref', moments: [{ content: '原名场面' }] });
  }
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/');
    await ready();
    await page.evaluate(async () => {
      await RPHubStorage.setStoredValue('characters', [{ uuid: 'stream-old', name: '原角色' }]);
      await RPHubStorage.setStoredValue('stream_probe', 'old');
      localStorage.setItem('stream-pref', 'old-pref');
      await RPLocalStore.flush();
      await new Promise((resolve, reject) => {
        const r = indexedDB.open('sf_moments_db', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('moments');
        r.onsuccess = () => {
          const db = r.result; const tx = db.transaction('moments', 'readwrite');
          tx.objectStore('moments').put([{ content: '原名场面' }], 'list');
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
        };
      });
    });
    const navigation = [];
    for (const parent of ['settings', 'advanced', 'chat']) {
      for (const view of ['backup', 'presets', 'regex', 'worldinfo', 'tools', 'uitemplates', 'usage', 'memory', 'generator', 'square', 'lighthouse', 'novel', 'cache', 'patchlist']) {
        await page.evaluate(({ parent, view }) => {
          __qa.navigateWorkspace('characters'); __qa.navigateWorkspace(parent); __qa.navigateWorkspace(view);
        }, { parent, view });
        const back = page.locator('.management-view:visible,.h-full:visible').getByRole('button', { name: /^(返回|返回本地版)$/ }).first();
        if (await back.count()) await back.click(); else await page.evaluate(() => __qa.shellGoBack());
        assert.equal(await page.evaluate(() => __qa.currentView), parent, parent + ' -> ' + view);
        navigation.push(parent + '/' + view);
      }
    }
    await page.evaluate(() => {
      __qa.navigateWorkspace('advanced'); __qa.navigateWorkspace({ view: 'regex', scope: 'global' });
      __qa.openSettingsSection('api'); __qa.shellGoBack();
    });
    assert.deepEqual(await page.evaluate(() => ({ view: __qa.currentView, scope: __qa.resourceScope })), { view: 'regex', scope: 'global' });
    await backup();
    // Hold a real storage transaction open to exercise a slow full export.
    await page.evaluate(() => {
      window.__holdExport = true;
      const store = RPHubStorage.getMainDb().transaction('store', 'readwrite').objectStore('store');
      const keepOpen = () => { store.get('rp_hub_stream_probe').onsuccess = () => { if (__holdExport) keepOpen(); }; };
      keepOpen();
      window.AndroidBridge = { isNativeApp: () => true, saveFile: (base64, name) => { window.__fullExport = { base64, name }; } };
    });
    await page.getByRole('button', { name: '导出全部数据', exact: true }).click();
    await page.getByRole('dialog', { name: '导出备份', exact: true }).waitFor();
    await page.locator('.transfer-mascot').evaluate(image => image.decode());
    await page.screenshot({ path: path.join(transferEvidence, 'export-wait-390.png'), animations: 'disabled' });
    await page.evaluate(() => { __qa.shellGoBack(); __qa.navigateWorkspace('characters'); });
    assert.equal(await page.evaluate(() => __qa.currentView), 'backup', '导出过程中返回不得离开等候弹窗');
    await page.evaluate(() => { __holdExport = false; });
    await page.waitForFunction(() => !__qa.isExportingAllData && window.__fullExport);
    assert.equal(await page.evaluate(() => document.getElementById('app').inert), false);
    await page.evaluate(() => { delete window.AndroidBridge; });
    await stage();
    await page.evaluate(() => { __qa.shellGoBack(); __qa.navigateWorkspace('characters'); });
    assert.equal(await page.evaluate(() => __qa.currentView), 'backup', '返回和切页不得中断等待确认的导入');
    assert.equal(await page.getByRole('dialog', { name: '导入备份' }).count(), 1, '读文件起使用独立弹窗');
    assert.equal(await page.evaluate(() => document.getElementById('app').inert), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('.stream-import-dialog')), true, '焦点保持在弹窗内');
    assert.deepEqual(await page.evaluate(() => JSON.parse(JSON.stringify(__qa.streamImportPanel.state.summary))), { records: 11, cards: 1, messages: 1, memories: 1 });
    await unchanged();
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await unchanged();
    await stage('{"type":"rp-hub-complete-backup","entries":[', 'failed');
    await unchanged();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: '重新选择', exact: true }).click();
    await (await chooser).setFiles({ name: 'retry.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture())) });
    await page.waitForFunction(() => __qa.streamImportPanel.state.phase === 'ready');
    await page.getByRole('button', { name: '取消', exact: true }).click();
    const invalid = fixture();
    invalid.entries.find(item => item.key === 'rp_hub_b1_memory_state_stream-new').value.revision = 'broken';
    await stage(invalid, 'failed'); await unchanged();
    workerMode = 'crash';
    await stage(fixture(), 'failed'); workerMode = '';
    await unchanged();
    const larger = fixture();
    workerMode = 'slow';
    larger.entries[0].value[0].description = 'x'.repeat(5 * 1048576);
    const buffer = Buffer.from(JSON.stringify(larger));
    await page.getByLabel('选择流式导入文件').setInputFiles({ name: 'pause.json', mimeType: 'application/json', buffer });
    await page.waitForFunction(() => __qa.streamImportPanel.state.read > 0);
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    await page.evaluate(() => { for (let i = 0; i < 3; i++) __qa.shellGoBack(); });
    assert.equal(await page.evaluate(() => __qa.currentView), 'backup', '暂停时连续返回不得离开数据页');
    await page.waitForTimeout(250);
    const read = await page.evaluate(() => __qa.streamImportPanel.state.read);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => __qa.streamImportPanel.state.read), read);
    await page.locator('.transfer-mascot').evaluate(image => image.decode());
    await page.screenshot({ path: path.join(transferEvidence, 'import-paused-390.png'), animations: 'disabled' });
    await page.getByRole('button', { name: '继续', exact: true }).click();
    await page.getByRole('button', { name: '取消', exact: true }).click();
    workerMode = '';
    await unchanged();
    for (const failure of ['decode', 'quota', 'cancel', 'rollback']) {
      await stage();
      const message = await page.evaluate(async failure => {
        const db = RPHubStorage.getMainDb();
        const s = await RPStreamImport.readSession(db, (await new Promise(resolve => {
          const q = db.transaction('restore_sessions').objectStore('restore_sessions').getAll(); q.onsuccess = () => resolve(q.result);
        })).find(s => s.state === 'complete').id);
        const controller = new AbortController();
        const original = Storage.prototype.setItem;
        if (['quota', 'rollback'].includes(failure)) Storage.prototype.setItem = function (key, value) {
          if (key === 'stream-pref' && (value === 'entry-wins' || failure === 'rollback')) throw new DOMException('injected quota', 'QuotaExceededError');
          return original.call(this, key, value);
        };
        try {
          await RPStreamImport.apply(s.id, {
            beforeApply: async () => {}, signal: controller.signal,
            restoreValue: value => { if (failure === 'decode' && value === 'last') throw new Error('injected decode'); return value; },
            progress: () => { if (failure === 'cancel') controller.abort(); },
          });
          return 'unexpected success';
        } catch (error) {
          if (failure === 'rollback') {
            if (!error.recoveryRequired) throw new Error('Missing recovery-required state');
            Storage.prototype.setItem = original;
            await RPStreamImport.recover(db);
            RPHubStorage.setWritesPaused(false); RPLocalStore.setWebWritesPaused(false);
          }
          return error.message;
        } finally { Storage.prototype.setItem = original; }
      }, failure);
      assert.notEqual(message, 'unexpected success', failure);
      await unchanged();
    }
    // Reopen after a simulated process death between companion writes and the main commit.
    await page.evaluate(async () => {
      const db = RPHubStorage.getMainDb();
      const tx = db.transaction('restore_sessions', 'readwrite');
      tx.objectStore('restore_sessions').put({ id: 'crash-journal', state: 'applying', web: [],
        oldWeb: [{ key: 'stream-pref', value: 'old-pref' }], hasMoments: true, oldMoments: [{ content: '原名场面' }] });
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); });
      localStorage.setItem('stream-pref', 'interrupted-new');
      await new Promise(resolve => {
        const req = indexedDB.open('sf_moments_db', 1);
        req.onsuccess = () => {
          const moments = req.result, tx = moments.transaction('moments', 'readwrite');
          tx.objectStore('moments').put([{ content: '中断时的新名场面' }], 'list');
          tx.oncomplete = () => { moments.close(); resolve(); };
        };
      });
    });
    await page.reload(); await ready(); await unchanged(); await backup();
    await stage();
    for (const [skin, theme] of [['journal','day'],['vampire','night'],['classic','day'],['classic','night']]) {
      await page.getByRole('button', { name: '取消', exact: true }).click();
      await page.evaluate(() => __qa.shellGoBack());
      await page.evaluate(({skin,theme}) => { RPThemePacks.set(skin); RPHubThemeKit.setScheme(theme); }, {skin,theme});
      await backup(); await stage();
      for (const [width, height] of [[360,640],[390,844],[844,390],[1280,900]]) {
        await page.setViewportSize({ width, height });
        await page.locator('.transfer-mascot').evaluate(image => image.decode());
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(transferEvidence, `import-${skin}-${theme}-${width}.png`), fullPage: true });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}/${skin}/${theme}`);
        const box = await page.locator('.stream-import-dialog').boundingBox();
        assert.ok(box.y >= 0 && box.y + box.height <= height, '弹窗适应短屏并独立滚动');
        await page.getByRole('button', { name: '确认导入', exact: true }).scrollIntoViewIfNeeded();
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => __qa.currentView), 'backup', 'Escape 不打断等待确认');
      }
    }
    // Exercise the real confirmation, commit, reload and native-file synchronization.
    await page.getByRole('button', { name: '确认导入', exact: true }).click();
    await page.waitForURL('**/RP-Hub/', { waitUntil: 'load' });
    await page.waitForFunction(() => !window.__qa || __qa.streamImportPanel?.state.phase === 'success');
    await page.waitForTimeout(1000);
    await ready();
    const restored = await page.evaluate(async () => {
      const get = key => RPHubStorage.getStoredValue(key);
      const binary = await get('stream_binary');
      return {
        cards: (await get('characters')).map(card => ({ uuid: card.uuid, worldInfo: card.worldInfo, regexScripts: card.regexScripts, uiTemplates: card.uiTemplates })),
        chat: await get('chat_stream-new'), memory: await get('classic_memories_stream-new'),
        deleted: await get('classic_memories_deleted'), meta: await get('b1_memory_state_stream-new'),
        deletedState: await RPHubStorage.readMemoryState('deleted'),
        probe: await get('stream_probe'), pref: localStorage.getItem('stream-pref'),
        presetGroups: await get('preset_groups'),
        binary: binary.image instanceof Blob ? Array.from(new Uint8Array(await binary.image.arrayBuffer())) : null,
        files: Object.values(__qaNativeFiles).filter(file => file.text?.includes('流式测试卡')).length,
      };
    });
    assert.equal(restored.cards[0].uuid, 'stream-new'); assert.equal(restored.cards[0].uiTemplates[0].htmlTemplate, '<div>保留</div>');
    assert.equal(restored.chat[0].content, '聊天正文'); assert.equal(restored.memory[0].summary, '记忆正文');
    assert.equal(restored.deleted, undefined);
    assert.equal(restored.deletedState.deleted, true);
    assert.equal(restored.meta.deleted, false);
    assert.match(restored.meta.revision, /^[a-f0-9]{32}$/);
    assert.notEqual(restored.meta.revision, revision);
    assert.equal(restored.probe, 'last'); assert.equal(restored.pref, 'entry-wins');
    assert.deepEqual(restored.presetGroups, ['STA1N官方分组', '流式恢复的空组']);
    assert.deepEqual(restored.binary, [1, 2, 3]); assert.ok(restored.files > 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ navigation, cancelledAndFailedImportsPreservedData: true,
      transactionRollback: ['decode', 'quota', 'cancel'], failedRollbackRetainsRecoveryJournal: true, interruptedImportRecovered: true, restored, errors }, null, 2));
    console.log('Streaming import, rollback, recovery, navigation and responsive checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
