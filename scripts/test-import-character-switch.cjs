const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(process.env.RP_TEST_ROOT || path.join(__dirname, '..'));
const web = path.join(root, 'web');
const evidence = path.join(__dirname, '../verification/card-switch-bug');
fs.mkdirSync(evidence, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(installFiles, { persistFiles: !process.env.RP_TEST_BACKUP });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
      return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript',
      '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') console.error('PAGE:', message.text().slice(0, 600));
  });
  const ready = async () => {
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
    });
  };
  async function importCard(name) {
    await page.evaluate(name => {
      const file = new File([JSON.stringify({ name, description: name + '的设定', first_mes: name + '的开场' })],
        name + '.json', { type: 'application/json' });
      __qa.importCharacter({ target: { files: [file], value: '' } });
    }, name);
    await page.waitForFunction(name => __qa.currentCharacter?.name === name, name);
    await page.waitForTimeout(700);
    await page.evaluate(() => { __qa.showAutoImageGenModal = false; });
  }
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'load' });
    await ready();
    if (process.env.RP_TEST_BACKUP) {
      const backup = JSON.parse(fs.readFileSync(process.env.RP_TEST_BACKUP, 'utf8'));
      const entries = backup.entries.filter(entry => /^rp_hub_(characters$|chat_|classic_memories_|b1_memory_state_|branches_)/.test(entry.key));
      await page.evaluate(async entries => {
        const db = RPHubStorage.getMainDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction('store', 'readwrite');
          entries.forEach(entry => tx.objectStore('store').put(entry.value, entry.key));
          tx.objectStore('store').put(0, 'rp_hub_last_active_char');
          tx.oncomplete = resolve;
          tx.onabort = () => reject(tx.error);
        });
      }, entries);
      await page.reload({ waitUntil: 'load' });
      await ready();
      console.log('Real backup fixture loaded; values omitted');
      console.log(await page.evaluate(async () => {
        try { return { initialSwitch: await __qa.selectCharacter(0), cards: __qa.characters.length }; }
        catch (error) { return { initialError: error.name + ': ' + error.message }; }
      }));
    } else await importCard('旧角色');
    const oldName = await page.evaluate(() => __qa.currentCharacter.name);
    const newIndex = await page.evaluate(() => __qa.characters.length);
    await page.evaluate(() => { __qa.chatHistory.push({ id: 'old-chat', role: 'user', content: '旧角色的聊天必须保留' }); });
    await page.waitForTimeout(600);
    if (!process.env.RP_TEST_BACKUP && !process.env.RP_TEST_CHAT_FAILURE) await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, key) {
        if (key === 'rp_hub_last_active_char') {
          IDBObjectStore.prototype.put = put;
          throw new DOMException('One transient save failure during import', 'UnknownError');
        }
        return put.call(this, value, key);
      };
    });
    await importCard('新角色');
    const switched = await page.evaluate(async () => {
      try {
        return { result: await __qa.selectCharacter(0), name: __qa.currentCharacter?.name };
      } catch (error) {
        return { error: error.name + ': ' + error.message, name: __qa.currentCharacter?.name };
      }
    });
    console.log(JSON.stringify({ result: switched.result, error: switched.error, switchedToOld: switched.name === oldName }));
    assert.equal(switched.name, oldName, 'Importing a new card must still allow switching back to an existing card: ' + JSON.stringify(switched));
    assert.equal(switched.result, true);
    assert.ok(await page.evaluate(() => __qa.chatHistory.some(message => message.content === '旧角色的聊天必须保留')));
    assert.equal(await page.evaluate(async index => await __qa.selectCharacter(index), newIndex), true);
    assert.equal(await page.evaluate(() => __qa.currentCharacter.name), '新角色');
    await page.reload({ waitUntil: 'load' });
    await ready();
    assert.equal(await page.evaluate(() => __qa.currentCharacter.name), '新角色');
    assert.equal(await page.evaluate(async () => await __qa.selectCharacter(0)), true);
    assert.ok(await page.evaluate(() => __qa.chatHistory.some(message => message.content === '旧角色的聊天必须保留')));
    if (!process.env.RP_TEST_BACKUP) {
      await page.evaluate(() => {
        const put = IDBObjectStore.prototype.put;
        const key = 'rp_hub_chat_' + __qa.currentCharacter.uuid;
        window.__chatWriteBlocked = true;
        window.__chatWriteFailures = 0;
        IDBObjectStore.prototype.put = function (value, recordKey) {
          if (recordKey === key && __chatWriteBlocked) {
            __chatWriteFailures++;
            throw new DOMException('Chat storage temporarily unavailable', 'UnknownError');
          }
          return put.call(this, value, recordKey);
        };
        __qa.chatHistory.push({ id: 'retry-chat', role: 'user', content: '保存恢复后必须保住这条聊天' });
      });
      await page.waitForFunction(() => __chatWriteFailures > 0);
      const blocked = await page.evaluate(async index => {
        try { await __qa.selectCharacter(index); } catch (_) {}
        return __qa.currentCharacter.name;
      }, newIndex);
      assert.equal(blocked, oldName, 'A real chat save failure must prevent leaving the unsaved conversation');
      await page.evaluate(() => { __chatWriteBlocked = false; });
      const recovered = await page.evaluate(async index => {
        try { return { result: await __qa.selectCharacter(index) }; }
        catch (error) { return { error: error.name }; }
      }, newIndex);
      assert.equal(recovered.result, true, 'After storage recovers, switching must retry the current chat instead of retaining a failed queue: ' + JSON.stringify(recovered));
      assert.ok(await page.evaluate(async () => (await RPHubStorage.getScopedStoredValue('chat', __qa.characters[0].uuid))
        .some(message => message.content === '保存恢复后必须保住这条聊天')));
      await page.evaluate(() => { __qa.characterGridView = true; __qa.navigateWorkspace('characters'); });
      await page.locator('.char-grid-item:visible:not([inert])').filter({ has: page.getByText('旧角色', { exact: true }) }).click();
      await page.waitForFunction(() => __qa.currentView === 'chat' && __qa.currentCharacter.name === '旧角色');
      await page.evaluate(() => { __qa.characterGridView = false; __qa.navigateWorkspace('characters'); });
      await page.getByRole('button', { name: '下一个角色', exact: true }).click();
      await page.getByRole('button', { name: '进入对话', exact: true }).click();
      await page.waitForFunction(() => __qa.currentView === 'chat' && __qa.currentCharacter.name === '新角色');
    }
    assert.deepEqual(errors, []);
    console.log('PASS imported cards can switch both ways and preserve existing chats after reload');
  } finally {
    await page.screenshot({ path: path.join(evidence, 'import-switch.png') }).catch(() => {});
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
