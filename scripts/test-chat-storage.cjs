const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, 'web/assets/js', file), 'utf8');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext();
        if (process.argv.includes('--file-bridge'))
            await context.addInitScript(require('./mock-files.cjs'), { skin: null, persistFiles: false });
        const page = await context.newPage();
        await page.route('**/*', route => route.fulfill({ body: '<!doctype html><body></body>', contentType: 'text/html' }));
        await page.goto('https://sta1n156.github.io/RP-Hub/test');
        await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'web/assets/vendor/vue.global.prod.js'), 'utf8') });
        if (process.argv.includes('--file-bridge')) await page.addScriptTag({ content: source('local-files.js') });
        await page.addScriptTag({ content: source('stream-import.js') });
        await page.addScriptTag({ content: source('data-services.js').split('// --- Shared summary memory utilities ---')[0] });
        const result = await page.evaluate(async () => {
            const s = RPHubStorage, key = 'rp_hub_chat_large';
            const messages = Array.from({ length: 80 }, (_, i) => ({
                id: 'message-' + i, role: i % 2 ? 'assistant' : 'user',
                content: '原始正文' + i, uiTemplateBlocks: { bottom: ['历史界面'.repeat(16384) + i] }
            }));
            // Simulate the browser's per-record limit without a hundred-megabyte fixture.
            const put = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (value, recordKey) {
                if (recordKey === key && Array.isArray(value) && value.length > 32)
                    throw new DOMException('Serialized value exceeds browser record limit', 'UnknownError');
                return put.call(this, value, recordKey);
            };
            await s.setStoredValue('chat_large', messages);
            const snapshot = (await s.readStoredValueSet([key]))[0];
            const changed = messages.slice(0, -1);
            const committed = await s.compareAndWriteStoredValues({
                expected: [snapshot], changes: [{ key, operation: 'set', value: changed }]
            });
            const stale = await s.compareAndWriteStoredValues({
                expected: [snapshot], changes: [{ key, operation: 'set', value: messages }]
            });
            const saved = await s.getStoredValue('chat_large');
            const exported = [];
            for await (const entry of s.iterateStoredEntries(s.getMainDb())) exported.push(entry);
            const raw = await new Promise(resolve => {
                const request = s.getMainDb().transaction('store').objectStore('store').get(key);
                request.onsuccess = () => resolve(request.result);
            });
            // Failing any chunk write must roll back the descriptor and every chunk.
            IDBObjectStore.prototype.put = function (value, recordKey) {
                if (String(recordKey).startsWith('__rp_chat__:'))
                    throw new DOMException('Test chunk write failure', 'QuotaExceededError');
                return put.call(this, value, recordKey);
            };
            const failed = await s.compareAndWriteStoredValues({
                expected: [{ key, value: saved }], changes: [{ key, operation: 'set', value: messages }]
            });
            IDBObjectStore.prototype.put = put;
            const afterFailure = await s.getStoredValue('chat_large');
            const batch = await s.commitStoredValueBatch({
                expected: [{ key, value: afterFailure }], writes: [{ key, value: changed }]
            });
            const session = await RPStreamImport.stageEntries([{ key, value: changed }], {
                limits: { ...RPStreamImport.profile('light'), collectionBytes: 1024 }
            });
            await RPStreamImport.apply(session, { beforeApply: async () => {}, restoreValue: value => value });
            const reimported = await s.getStoredValue('chat_large');
            s.setWritesPaused(false);
            await s.deleteStoredValue('chat_large');
            return { committed: committed.status, stale: stale.status, failed: failed.status,
                batch: batch.status, reimportExact: JSON.stringify(reimported) === JSON.stringify(changed),
                count: saved.length, last: saved.at(-1).content,
                exact: JSON.stringify(saved) === JSON.stringify(changed),
                failedRetained: JSON.stringify(afterFailure) === JSON.stringify(changed),
                backupKeys: exported.map(x => x.key),
                exportedExact: JSON.stringify(exported.find(x => x.key === key).value) === JSON.stringify(changed),
                chunked: raw.rphubChat === 1,
                afterDelete: (await s.readStorageKeys(s.getMainDb())).filter(x => x === key || x.startsWith('__rp_chat__:')) };
        });
        assert.deepEqual(result, { committed: 'committed', stale: 'conflict', failed: 'error', batch: 'committed', reimportExact: true,
            count: 79, last: '原始正文78', exact: true, failedRetained: true, backupKeys: ['rp_hub_chat_large'],
            exportedExact: true, chunked: true, afterDelete: [] });
        console.log('PASS: bounded chat records, exact history/export, stale rejection, rollback and chunk cleanup');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
