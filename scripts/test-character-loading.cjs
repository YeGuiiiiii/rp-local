const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(installFiles);
    await context.addInitScript(() => {
        window.__cardReads = [];
        window.__storageReads = [];
        const get = IDBObjectStore.prototype.get;
        IDBObjectStore.prototype.get = function (key) {
            __storageReads.push(String(key));
            if (String(key).startsWith('__rp_card__:')) __cardReads.push(key);
            return get.call(this, key);
        };
    });
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        if (url.pathname === '/seed') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({
            '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp'
        })[path.extname(file)] || 'application/octet-stream' });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ready = async () => {
        await page.waitForFunction(() => window.__rpDataReady || window.__rpDataError);
        assert.equal(await page.evaluate(() => !!window.__rpDataError), false);
        await page.waitForFunction(() => !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
        });
    };
    try {
        await page.goto('https://sta1n156.github.io/seed');
        await page.addScriptTag({ path: path.join(web, 'assets/js/stream-import.js') });
        await page.evaluate(async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400; canvas.height = 585;
            canvas.getContext('2d').fillRect(0, 0, 400, 585);
            const avatar = canvas.toDataURL();
            const cards = ['a', 'b', 'c'].map((id, i) => ({
                uuid: 'load-' + id, name: '测试卡' + id, createdAt: i + 1,
                avatar, description: '可检索的描述' + id, first_mes: '开场' + id,
                worldInfo: [{ comment: '设定' + id, content: '必须保留' + id, keys: [id], scope: 'character', enabled: true }],
                regexScripts: [],
                uiTemplates: [{ id: 'ui-' + id, name: '历史模板' + id, scope: 'character', enabled: false,
                    htmlTemplate: '<div>' + id.repeat(100000) + '</div>', initialVariableState: { count: i } }],
                customExtension: { unknown: '原样保留' + id }
            }));
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open('RPHubDB', 2);
                req.onupgradeneeded = () => RPStreamImport.upgrade(req.result);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            await new Promise((resolve, reject) => {
                const tx = db.transaction('store', 'readwrite'), store = tx.objectStore('store');
                store.put(cards, 'rp_hub_characters');
                store.put(0, 'rp_hub_last_active_char');
                store.put('load-a', 'rp_hub_last_active_char_id');
                store.put({ uuid: 'load-user', name: '测试玩家' }, 'rp_hub_user');
                store.put({ uiTemplateKeepFloors: 1 }, 'rp_hub_settings');
                store.put([], 'rp_hub_global_worldinfo');
                store.put([{ comment: '旧版副本', content: '无需恢复的旧列表'.repeat(1000) }], 'rp_hub_worldinfo');
                store.put(Array.from({ length: 12 }, (_, i) => ({
                    id: 'a-msg-' + i, role: 'assistant', content: i ? '后续故事' + i : '已保存的故事a',
                    uiTemplateBlocks: { top: [], bottom: ['<div>当时的历史画面</div>'] }
                })), 'rp_hub_chat_load-a');
                tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
            });
            db.close();
        });
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await ready();
        const loaded = () => page.evaluate(() => __qa.characters.filter(card => Array.isArray(card.worldInfo)).map(card => card.uuid));
        assert.deepEqual(await loaded(), ['load-a'],
            'Startup must retain full card content only for the active character');
        assert.equal(await page.evaluate(() => __qa.currentCharacter.customExtension.unknown), '原样保留a');
        assert.equal(await page.evaluate(() => __qa.chatHistory[0].uiTemplateBlocks.bottom[0]), '<div>当时的历史画面</div>');
        await page.evaluate(() => __qa.selectCharacter(1));
        assert.deepEqual(await loaded(), ['load-b'], 'Switching must release the previous card content');
        await page.evaluate(() => __qa.selectCharacter(0));
        assert.deepEqual(await loaded(), ['load-a']);
        assert.equal(await page.evaluate(() => __qa.chatHistory[0].content), '已保存的故事a');
        // Favorites on an unloaded card must not replace its body with the directory stub.
        await page.evaluate(async () => {
            __qa.toggleCharacterFavorite(2);
            await new Promise(resolve => setTimeout(resolve, 1300));
        });
        await page.evaluate(() => __qa.selectCharacter(2));
        assert.equal(await page.evaluate(() => __qa.currentCharacter.worldInfo[0].content), '必须保留c');
        assert.ok(await page.evaluate(() => __qa.currentCharacter.favoriteAt > 0));
        // Opening an inactive card's editor reads a temporary copy, without changing the played card.
        await page.evaluate(() => __qa.editCharacter(1));
        assert.equal(await page.evaluate(() => __qa.editingCharacter.data.uiTemplates[0].htmlTemplate.length), 100011);
        assert.equal(await page.evaluate(() => __qa.currentCharacter.uuid), 'load-c');
        await page.evaluate(() => { __qa.showCharacterEditor = false; });
        const full = await page.evaluate(async () => (await RPHubStorage.getStoredValue('characters')).map(card => ({
            uuid: card.uuid, world: card.worldInfo[0].content, unknown: card.customExtension.unknown,
            uiLength: card.uiTemplates[0].htmlTemplate.length
        })));
        assert.deepEqual(full, ['a', 'b', 'c'].map(id => ({
            uuid: 'load-' + id, world: '必须保留' + id, unknown: '原样保留' + id, uiLength: 100011
        })), 'Legacy library reads and backup exports must reconstruct every complete card');
        assert.equal(await page.evaluate(async () =>
            (await RPHubStorage.getScopedStoredValue('chat', 'load-a'))[0].uiTemplateBlocks.bottom[0]),
        '<div>当时的历史画面</div>', 'Saving must preserve UI snapshots outside the display retention window');
        await page.evaluate(() => {
            window.AndroidBridge = {
                isNativeApp: () => true,
                saveFile: (bytes, name, mime) => { window.__cardExport = { bytes, name, mime }; }
            };
            __qa.openCharacterExportModal(1);
            __qa.confirmCharacterExport('png');
        });
        await page.waitForFunction(() => window.__cardExport);
        const png = await page.evaluate(() => {
            const bytes = Uint8Array.from(atob(__cardExport.bytes), character => character.charCodeAt(0));
            const card = RPHubCardUtils.parsePngCharacterData(bytes).data.data;
            delete window.AndroidBridge;
            return { name: card.name, world: card.character_book.entries[0].content,
                ui: card.uiTemplates[0].htmlTemplate.length, opening: card.first_mes };
        });
        assert.deepEqual(png, { name: '测试卡b', world: '必须保留b', ui: 100011, opening: '开场b' },
            'Exporting an inactive card must assemble a complete PNG, not export its thumbnail or stub');
        assert.deepEqual(await loaded(), ['load-c']);
        await page.reload();
        await ready();
        assert.deepEqual(await loaded(), ['load-c']);
        const reads = await page.evaluate(() => __cardReads);
        assert.ok(!reads.some(key => key.endsWith(':load-a') || key.endsWith(':load-b')),
            'Reopening must not read inactive card bodies');
        assert.equal(await page.evaluate(() => __storageReads.includes('rp_hub_worldinfo')), false,
            'An existing global worldbook must not trigger a read of the unused legacy card copy');
        // A missing next card must leave the old session usable, not replace it with an empty card.
        await page.evaluate(async () => {
            const db = RPHubStorage.getMainDb();
            const missingKeys = (await RPHubStorage.readStorageKeys(db))
                .filter(key => key.startsWith('__rp_card__:') && key.endsWith(':load-b'));
            await new Promise((resolve, reject) => {
                const tx = db.transaction('store', 'readwrite');
                missingKeys.forEach(key => tx.objectStore('store').delete(key));
                tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
            });
            await __qa.selectCharacter(1);
        });
        assert.equal(await page.evaluate(() => __qa.currentCharacter.uuid), 'load-c');
        assert.deepEqual(await loaded(), ['load-c']);
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ activeOnly: true, switchesReleaseBodies: true, historyPreserved: true,
            inactiveFavoriteSafe: true, inactiveEditorComplete: true, unknownFieldsPreserved: true,
            inactivePngExportComplete: true, reopenReadsOnlyActive: true, failedReadPreservesSession: true, errors }));
    } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
