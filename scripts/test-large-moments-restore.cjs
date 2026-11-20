const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('./playwright.cjs');
const installFiles = require('./mock-files.cjs');
const web = path.resolve(__dirname, '../web');
const MB = 1024 * 1024;

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    await context.addInitScript(installFiles, { persistFiles: false });
    await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
    const page = await context.newPage();
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/test');
        for (const file of ['assets/vendor/vue.global.prod.js', 'assets/js/local-files.js', 'assets/js/stream-import.js',
            'assets/js/built-in-content.js', 'assets/js/core-utils.js', 'assets/js/stream-import-ui.js'])
            await page.addScriptTag({ path: path.join(web, file) });
        await page.addScriptTag({ content: require('node:fs').readFileSync(path.join(web, 'assets/js/data-services.js'), 'utf8')
            .split('// --- Shared summary memory utilities ---')[0] });
        const result = await page.evaluate(async () => {
            const storage = RPHubStorage;
            await storage.initDB();
            const oldMoments = [{ content: '原有名场面' }];
            const openMoments = () => new Promise((resolve, reject) => {
                const request = indexedDB.open('sf_moments_db', 1);
                request.onupgradeneeded = () => request.result.createObjectStore('moments');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            const writeOld = await openMoments();
            await new Promise((resolve, reject) => {
                const tx = writeOld.transaction('moments', 'readwrite');
                tx.objectStore('moments').put(oldMoments, 'list');
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
            });
            writeOld.close();

            const stage = await RPStreamImport.database();
            const id = 'large-moments-fixture';
            const moments = [{ content: 'x'.repeat(33 * 1024 * 1024) }];
            await new Promise((resolve, reject) => {
                const tx = stage.transaction(['restore_sessions', 'restore_companions'], 'readwrite');
                tx.objectStore('restore_sessions').put({
                    id, state: 'complete', plan: [], deleted: [], source: 'entries', unitBytes: 64 * 1024 * 1024
                });
                tx.objectStore('restore_companions').put({
                    session: id, database: 'sf_moments_db', store: 'moments', part: 0,
                    bytes: 33 * 1024 * 1024, value: { k: 'list', v: moments }
                });
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
            });
            stage.close();

            let error;
            try {
                await RPStreamImport.apply(id, { beforeApply: async () => {}, restoreValue: value => value });
            } catch (caught) {
                error = caught.message;
            }
            const read = await openMoments();
            const saved = await new Promise((resolve, reject) => {
                const request = read.transaction('moments').objectStore('moments').get('list');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            read.close();
            return {
                error,
                savedLength: saved?.[0]?.content?.length,
                savedStart: saved?.[0]?.content?.slice(0, 8),
                savedEnd: saved?.[0]?.content?.slice(-8)
            };
        });
        assert.equal(result.error, undefined,
            `A 33 MiB moments collection should import under the 64 MiB profile: ${result.error}`);
        assert.deepEqual(result, {
            error: undefined,
            savedLength: 33 * MB,
            savedStart: 'xxxxxxxx',
            savedEnd: 'xxxxxxxx'
        });
        console.log('PASS 33 MiB moments data restores under a 64 MiB import profile');
    } finally {
        await context.close();
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
