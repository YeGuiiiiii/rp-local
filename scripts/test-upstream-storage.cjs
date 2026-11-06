const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, 'web', file), 'utf8');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext();
        await context.addInitScript(installFileBridge);
        await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
        const page = await context.newPage();
        await page.goto('https://sta1n156.github.io/RP-Hub/test');
        for (const file of ['assets/vendor/vue.global.prod.js', 'assets/js/local-files.js', 'assets/js/stream-import.js']) {
            await page.addScriptTag({ content: read(file) });
        }
        await page.addScriptTag({ content: read('assets/js/data-services.js').split('// --- Shared summary memory utilities ---')[0] });
        assert.equal(await page.evaluate(() => typeof RPHubStorage.readMemoryState), 'function',
            'Memory edits need a captured revision so an old task cannot overwrite a newer edit');
        const result = await page.evaluate(async () => {
            const storage = RPHubStorage;
            await storage.initDB();
            const original = await storage.readMemoryState('upstream-fixture');
            const saved = await storage.commitMemoryState(original, [{ summary: 'newer edit' }]);
            const stale = await storage.commitMemoryState(original, [{ summary: 'stale edit' }]);
            const current = await storage.readMemoryState('upstream-fixture');
            const restored = storage.prepareRestoredMemoryEntries([
                { key: 'rp_hub_classic_memories_upstream-fixture', value: current.list },
                { key: 'rp_hub_b1_memory_state_upstream-fixture',
                    value: { schema: 1, revision: current.revision, deleted: false } }
            ]);
            const deleted = await storage.deleteMemoryScope('upstream-fixture', { memoryState: current });
            const resurrected = await storage.commitMemoryState(saved.state, [{ summary: 'must stay deleted' }]);
            const tombstone = await storage.readMemoryState('upstream-fixture', { migrate: false });
            storage.setWritesPaused(true);
            let paused;
            try { await storage.setStoredValue('paused_fixture', 'must not write'); }
            catch (error) { paused = error.name; }
            storage.setWritesPaused(false);
            await storage.setStoredValue('batch_a', 'old a');
            await storage.setStoredValue('batch_b', 'old b');
            const put = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (value, key) {
                const request = put.call(this, value, key);
                if (key === 'rp_hub_batch_b') this.transaction.abort();
                return request;
            };
            let aborted;
            try {
                aborted = await storage.commitStoredValueBatch({ writes: [
                    { key: 'rp_hub_batch_a', value: 'new a' }, { key: 'rp_hub_batch_b', value: 'new b' }
                ] });
            } finally { IDBObjectStore.prototype.put = put; }
            const state = await storage.readMemoryState('upstream-fixture');
            await RPLocalStore.flush();
            const mirror = Object.values(window.__qaNativeFiles).filter(file => file.text).map(file => {
                try { return JSON.parse(file.text); } catch (_) { return null; }
            }).filter(Boolean);
            return {
                saved: saved.status, stale: stale.status, deleted: deleted.status,
                resurrected: resurrected.status, tombstone: tombstone.deleted,
                paused, pausedValue: await storage.getStoredValue('paused_fixture'),
                aborted: aborted.committed,
                a: await storage.getStoredValue('batch_a'), b: await storage.getStoredValue('batch_b'),
                mirrorDeleted: mirror.some(entry => entry.key === 'rp_hub_b1_memory_state_upstream-fixture'
                    && entry.value.deleted === true),
                mirrorBody: mirror.some(entry => entry.key === 'rp_hub_classic_memories_upstream-fixture'),
                stateDeleted: state.deleted,
                freshRestoreRevision: restored.find(entry => entry.key === 'rp_hub_b1_memory_state_upstream-fixture')
                    .value.revision !== current.revision
            };
        });
        assert.deepEqual(result, {
            saved: 'committed', stale: 'conflict', deleted: 'committed',
            resurrected: 'conflict', tombstone: true, paused: 'StoragePausedError',
            pausedValue: undefined, aborted: false, a: 'old a', b: 'old b',
            mirrorDeleted: true, mirrorBody: false, stateDeleted: true, freshRestoreRevision: true
        });
        console.log('PASS: stale memory rejection, deletion, paused saves, transaction rollback and file mirrors');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
