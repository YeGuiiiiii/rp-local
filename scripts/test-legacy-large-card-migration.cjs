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
            const db = await storage.initDB();
            const card = {
                uuid: 'legacy-large-card',
                name: '超大旧卡',
                description: 'x'.repeat(64 * 1024 * 1024 + 1),
                worldInfo: [{ comment: '保留设定', content: '原始正文' }],
                regexScripts: [],
                uiTemplates: [],
                customExtension: { keep: true }
            };
            await new Promise((resolve, reject) => {
                const tx = db.transaction('store', 'readwrite');
                tx.objectStore('store').put([card], 'rp_hub_characters');
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
            });
            let directory;
            try {
                directory = await storage.readCharacterDirectory();
            } catch (error) {
                return { error: error.message };
            }
            const full = await storage.readCharacter(directory[0]);
            const currentDb = await storage.initDB();
            const storedDirectory = await new Promise((resolve, reject) => {
                const request = currentDb.transaction('store').objectStore('store').get('rp_hub_characters');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            return {
                count: directory.length,
                uuid: full.uuid,
                descriptionLength: full.description.length,
                descriptionEdges: full.description.slice(0, 16) + full.description.slice(-16),
                worldInfo: full.worldInfo[0].content,
                extension: full.customExtension.keep,
                directoryPublished: storedDirectory?.rphubCardLibrary === 1
            };
        });
        assert.equal(result.error, undefined,
            `A legacy character larger than 64 MiB must migrate during startup: ${result.error}`);
        assert.deepEqual(result, {
            count: 1,
            uuid: 'legacy-large-card',
            descriptionLength: 64 * MB + 1,
            descriptionEdges: 'x'.repeat(32),
            worldInfo: '原始正文',
            extension: true,
            directoryPublished: true
        });
        console.log('PASS legacy character larger than 64 MiB migrates without losing card data');
    } finally {
        await context.close();
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
