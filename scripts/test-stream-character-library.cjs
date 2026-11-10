const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const web = path.resolve(__dirname, '../web');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext();
        await context.addInitScript(require('./mock-files.cjs'));
        const page = await context.newPage();
        await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
        await page.goto('https://sta1n156.github.io/RP-Hub/test');
        for (const name of ['assets/vendor/vue.global.prod.js', 'assets/js/local-files.js', 'assets/js/stream-import.js'])
            await page.addScriptTag({ path: path.join(web, name) });
        await page.addScriptTag({ content: fs.readFileSync(path.join(web, 'assets/js/data-services.js'), 'utf8')
            .split('// --- Shared summary memory utilities ---')[0] });
        const result = await page.evaluate(async () => {
            const storage = RPHubStorage, db = await storage.initDB();
            const get = key => new Promise((resolve, reject) => {
                const req = db.transaction('store').objectStore('store').get(key);
                req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
            });
            const original = [{ uuid: 'previous', name: '原卡', unknown: '原内容' }];
            await storage.setStoredValue('characters', original);
            await storage.setScopedStoredValue('chat', 'previous', [{ content: '原聊天' }]);
            const cards = Array.from({ length: 4 }, (_, i) => ({
                uuid: 'restored-' + i, name: '恢复的卡' + i, description: 'x'.repeat(1024),
                avatar: 'data:image/png;base64,' + 'a'.repeat(65536),
                worldInfo: [{ comment: '设定', content: '完整正文' + i }], unknown: { preserved: i }
            }));
            const entries = [
                { key: 'rp_hub_characters', value: cards },
                { key: 'rp_hub_chat_restored-0', value: [{ content: '导入聊天' }] }
            ];
            // Each card fits, but their combined images do not. They must never be reassembled into one value.
            const limits = { unitBytes: 64000, collectionBytes: 100000 };
            const session = await RPStreamImport.stageEntries(entries, { limits });
            const apply = () => RPStreamImport.apply(session, {
                beforeApply: async () => {}, restoreValue: value => value
            });
            const put = IDBObjectStore.prototype.put;
            let interrupted = false;
            IDBObjectStore.prototype.put = function (value, key) {
                const req = put.call(this, value, key);
                if (String(key).startsWith('__rp_card__:') && String(key).endsWith(':restored-1')) this.transaction.abort();
                return req;
            };
            try { await apply(); } catch (_) { interrupted = true; }
            finally { IDBObjectStore.prototype.put = put; }
            const rollback = {
                interrupted, oldBody: (await storage.getStoredValue('characters'))[0].unknown,
                oldChat: (await storage.getScopedStoredValue('chat', 'previous'))[0].content,
                noPartial: !(await storage.readStorageKeys(db)).some(key =>
                    key.startsWith('__rp_card__:') && key.endsWith(':restored-0'))
            };
            const publishSession = await RPStreamImport.stageEntries(entries, { limits });
            IDBObjectStore.prototype.put = function (value, key) {
                const req = put.call(this, value, key);
                if (key === 'rp_hub_characters') this.transaction.abort();
                return req;
            };
            try {
                await RPStreamImport.apply(publishSession, { beforeApply: async () => {}, restoreValue: value => value });
            } catch (_) {} finally { IDBObjectStore.prototype.put = put; }
            const publishRollback = (await storage.getStoredValue('characters'))[0].uuid === 'previous'
                && !(await storage.readStorageKeys(db)).some(key =>
                    key.startsWith('__rp_card__:') && key.endsWith(':restored-0'));
            // An aborted transaction removes its session during journal recovery; stage the same backup again.
            const retry = await RPStreamImport.stageEntries(entries, { limits });
            let monolithicWrites = 0;
            let publishBodyCount = 0;
            const bodyWrites = new WeakMap();
            IDBObjectStore.prototype.put = function (value, key) {
                if (key === 'rp_hub_characters' && Array.isArray(value)) monolithicWrites++;
                if (String(key).startsWith('__rp_card__:'))
                    bodyWrites.set(this.transaction, (bodyWrites.get(this.transaction) || 0) + 1);
                if (key === 'rp_hub_characters') publishBodyCount = bodyWrites.get(this.transaction) || 0;
                return put.call(this, value, key);
            };
            try {
                await RPStreamImport.apply(retry, { beforeApply: async () => {}, restoreValue: value => value });
            } finally { IDBObjectStore.prototype.put = put; }
            const directory = await get('rp_hub_characters');
            const full = await storage.readCharacter(directory.cards[3]);
            await RPStreamImport.recover(db);
            storage.setWritesPaused(false); RPLocalStore.setWebWritesPaused(false);
            full.unknown.updated = true;
            await storage.saveCharacterLibrary([...directory.cards.slice(0, 3), full]);
            const edited = await storage.readCharacter((await storage.readCharacterDirectory())[3]);
            const exportCards = await storage.getStoredValue('characters');
            let oversizedChatRejected = false;
            try {
                await RPStreamImport.stageEntries([{ key: 'rp_hub_chat_guard', value: ['x'.repeat(65000)] }], { limits });
            } catch (_) { oversizedChatRejected = true; }
            return {
                rollback, publishRollback, monolithicWrites, publishBodyCount, directory: directory.rphubCardLibrary, count: directory.cards.length,
                full: { world: full.worldInfo[0].content, unknown: full.unknown.preserved, avatar: full.avatar.length },
                staleRemoved: await get('__rp_card__:previous') === undefined,
                chat: (await get('rp_hub_chat_restored-0'))[0].content, oversizedChatRejected,
                mirrorReady: RPLocalStore.read('个人数据/角色卡索引.json').length === 4,
                editedAfterRestore: edited.unknown.updated && edited.avatar === full.avatar,
                internalRevisionNotExported: exportCards.every(card => !Object.hasOwn(card, 'rphubCardRevision'))
            };
        });
        assert.deepEqual(result, {
            rollback: { interrupted: true, oldBody: '原内容', oldChat: '原聊天', noPartial: true }, publishRollback: true,
            monolithicWrites: 0, publishBodyCount: 0, directory: 1, count: 4,
            full: { world: '完整正文3', unknown: 3, avatar: 65558 }, staleRemoved: true,
            chat: '导入聊天', oversizedChatRejected: true, mirrorReady: true,
            editedAfterRestore: true, internalRevisionNotExported: true
        });
        console.log('PASS streamed character restore writes separate cards atomically, retains original images, and keeps chat size guards');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
