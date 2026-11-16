const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const root = path.resolve(process.env.RP_TEST_ROOT || path.join(__dirname, '..'));
const source = name => fs.readFileSync(path.join(root, 'web/assets', name), 'utf8');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext();
        await context.addInitScript(require('./mock-files.cjs'), { persistFiles: false, skin: null });
        await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html>' }));
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        let files = {};
        async function load() {
            await page.goto('https://sta1n156.github.io/RP-Hub/test');
            await page.evaluate(files => Object.assign(__qaNativeFiles, files), files);
            for (const file of ['vendor/vue.global.prod.js', 'js/local-files.js', 'js/stream-import.js'])
                await page.addScriptTag({ content: source(file) });
            await page.addScriptTag({ content: source('js/data-services.js').split('// --- Shared summary memory utilities ---')[0] });
            await page.evaluate(() => RPHubStorage.initDB());
        }
        async function loseDatabase() {
            files = await page.evaluate(async () => {
                RPHubStorage.getMainDb().close();
                await new Promise((resolve, reject) => {
                    const request = indexedDB.deleteDatabase('RPHubDB');
                    request.onsuccess = resolve;
                    request.onerror = () => reject(request.error);
                });
                return __qaNativeFiles;
            });
            await load();
        }
        await load();
        await page.evaluate(async () => {
            await RPHubStorage.setStoredValue('characters', [{ uuid: 'recovery-card', name: '分块恢复' }]);
            const messages = Array.from({ length: 5 }, (_, i) => ({
                id: 'message-' + i, role: 'assistant', content: String(i).repeat(1100 * 1024)
            }));
            await RPHubStorage.setScopedStoredValue('chat', 'recovery-card', messages);
            await RPLocalStore.flush();
        });
        await loseDatabase();
        assert.equal(await page.evaluate(async () => (await RPHubStorage.getScopedStoredValue('chat', 'recovery-card'))?.length), 5,
            'Every saved chat part must survive loss of the browser database');
        const incremental = await page.evaluate(async () => {
            const index = () => RPLocalStore.read('个人数据/文件索引.json');
            const before = index();
            const messages = await RPHubStorage.getScopedStoredValue('chat', 'recovery-card');
            messages.push({ id: 'message-5', role: 'user', content: '追加后也必须能恢复' });
            __qaTextWriteChunks.length = 0;
            await RPHubStorage.setScopedStoredValue('chat', 'recovery-card', messages);
            await RPLocalStore.flush();
            const after = index(), parts = Object.keys(before).filter(key => key.startsWith('__rp_chat__:'));
            return { unchangedParts: parts.filter(key => before[key] === after[key]).length,
                writtenCharacters: __qaTextWriteChunks.reduce((sum, size) => sum + size, 0) };
        });
        assert.ok(incremental.unchangedParts >= 4, 'Appending must preserve unchanged chat part files');
        assert.ok(incremental.writtenCharacters < 2 * 1048576, 'Appending must not serialize the entire conversation again');
        const failedWrite = await page.evaluate(async () => {
            const before = RPLocalStore.read('个人数据/文件索引.json');
            const original = RPLocalFiles.writeText;
            const messages = await RPHubStorage.getScopedStoredValue('chat', 'recovery-card');
            messages.push({ id: 'message-6', role: 'assistant', content: '尚未镜像成功' });
            RPLocalFiles.writeText = (name, value) => name === '个人数据/文件索引.json'
                ? JSON.stringify({ ok: false, error: 'Injected index write failure' }) : original(name, value);
            let rejected = false;
            try { await RPHubStorage.setScopedStoredValue('chat', 'recovery-card', messages); }
            catch (error) { rejected = error.committed === true; }
            finally { RPLocalFiles.writeText = original; }
            return { rejected, before, after: RPLocalStore.read('个人数据/文件索引.json'),
                intact: Object.values(before).every(file => !!__qaNativeFiles[file]) };
        });
        assert.equal(failedWrite.rejected, true);
        assert.deepEqual(failedWrite.after, failedWrite.before, 'A failed mirror must leave the last complete file directory published');
        assert.equal(failedWrite.intact, true, 'A failed mirror must preserve all files referenced by the previous directory');
        await loseDatabase();
        assert.deepEqual(await page.evaluate(async () => {
            const messages = await RPHubStorage.getScopedStoredValue('chat', 'recovery-card');
            return { length: messages.length, last: messages.at(-1).content, firstBytes: messages[0].content.length };
        }), { length: 6, last: '追加后也必须能恢复', firstBytes: 1100 * 1024 });
        await page.evaluate(async () => {
            await RPHubStorage.deleteScopedStoredValue('chat', 'recovery-card');
            await RPLocalStore.flush();
        });
        await loseDatabase();
        assert.equal(await page.evaluate(() => RPHubStorage.getScopedStoredValue('chat', 'recovery-card')), undefined,
            'Deleted chats must not return from stale part files');
        assert.deepEqual(errors, []);
        console.log('PASS chunked chat recovery, incremental mirrors, failed publication preserves complete files, and deleted chats stay deleted');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
