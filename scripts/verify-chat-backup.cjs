const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/chat-delete-original');
fs.mkdirSync(output, { recursive: true });
const backup = JSON.parse(fs.readFileSync(process.env.RP_TEST_BACKUP, 'utf8'));
const active = backup.entries.find(x => x.key === 'rp_hub_last_active_char')?.value || 0;
const card = backup.entries.find(x => x.key === 'rp_hub_characters').value[active];
const branchKey = 'rp_hub_branches_' + card.uuid;
const branch = backup.entries.find(x => x.key === branchKey);
const scope = card.uuid + '__branch__' + branch.value.activeBranchId;
const keys = [branchKey, 'rp_hub_chat_' + scope, 'rp_hub_classic_memories_' + scope, 'rp_hub_b1_memory_state_' + scope];
const entries = backup.entries.filter(x => keys.includes(x.key));
const originalCount = entries.find(x => x.key === 'rp_hub_chat_' + scope).value.length;
// Keep the saved runtime state, with no remote services or credentials in the fixture.
card.avatar = '';
card.worldInfo = [];
card.regexScripts = [];
card.description = '';
for (const t of card.uiTemplates || []) t.htmlTemplate = '<div>测试面板</div>';
entries.push({ key: 'rp_hub_characters', value: [card] }, { key: 'rp_hub_last_active_char', value: 0 },
    { key: 'rp_hub_settings', value: { uiTemplateEnabled: true, uiTemplateMainModelAnalysis: true } },
    { key: 'rp_hub_memory_settings', value: { enabled: true, mode: 'classic' } });
const fixture = path.join(output, 'fixture.json');
fs.writeFileSync(fixture, JSON.stringify(entries));
console.log('fixture MB', fs.statSync(fixture).size / 1048576);

(async () => {
    const server = http.createServer((request, response) => {
        const file = request.url.endsWith('/fixture.json') ? fixture : null;
        if (file) {
            response.setHeader('Content-Type', 'application/json');
            response.setHeader('Access-Control-Allow-Origin', '*');
            fs.createReadStream(file).pipe(response);
        } else { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const fixtureUrl = `http://127.0.0.1:${server.address().port}/fixture.json`;
    const origin = new URL(fixtureUrl).origin;
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'error') console.log(message.text().slice(0, 1500)); });
    page.on('pageerror', error => console.error('PAGE', error.message));
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname.endsWith('/fixture.json')) return route.continue();
        if (url.pathname.endsWith('/seed')) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
        return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
            '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    try {
        await page.goto(origin + '/RP-Hub/seed');
        await page.addScriptTag({ content: fs.readFileSync(path.join(web, 'assets/vendor/vue.global.prod.js'), 'utf8') });
        await page.addScriptTag({ content: fs.readFileSync(path.join(web, 'assets/js/stream-import.js'), 'utf8') });
        await page.addScriptTag({ content: fs.readFileSync(path.join(web, 'assets/js/data-services.js'), 'utf8').split('// --- Shared summary memory utilities ---')[0] });
        await page.evaluate(async () => {
            const entries = await (await fetch('fixture.json')).json();
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('RPHubDB', 1);
                request.onupgradeneeded = () => request.result.createObjectStore('store');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            const chat = entries.find(e => e.key.startsWith('rp_hub_chat_'));
            window.__rawChatError = await new Promise(resolve => {
                const tx = db.transaction('store', 'readwrite');
                let error = '';
                tx.oncomplete = () => resolve('');
                tx.onabort = () => resolve(error || tx.error?.message || 'Raw chat write aborted');
                tx.onerror = () => {};
                const request = tx.objectStore('store').put(chat.value, chat.key);
                request.onerror = () => { error = request.error?.message; };
            });
            console.log('Original single-record write:', __rawChatError || 'accepted by this browser');
            for (const e of entries) await new Promise((resolve, reject) => {
                const tx = db.transaction('store', 'readwrite'), store = tx.objectStore('store');
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error || new Error('Seed aborted: ' + e.key));
                tx.onerror = event => { console.error('SEED', e.key, event.target.error?.message); };
                const request = RPHubStorage.putStoredRecord(store, e.value, e.key);
                request.onerror = () => console.error('SEED request', e.key, request.error?.message);
            });
            db.close();
            localStorage.setItem('rphub-layout118', '1');
            localStorage.setItem('rphub-ui-pack', 'classic');
            localStorage.setItem('rp-local-release-shown', '99999');
        });
        const rawWriteError = await page.evaluate(() => __rawChatError);
        assert.match(rawWriteError, /too large/, 'The original branch must reproduce the browser record limit');
        await page.goto(origin + '/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'), null, { timeout: 120000 });
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
        });
        console.log('loaded', await page.evaluate(() => ({ count: __qa.chatHistory.length, card: __qa.currentCharacter?.name })));
        await page.evaluate(() => { __qa.deleteMessage(__qa.chatHistory.length - 1); __qa.handleConfirm(); });
        await page.waitForFunction(() => __qa.toasts.some(x => /已删除|删除失败/.test(x.message)), null, { timeout: 120000 });
        console.log('result', await page.evaluate(() => ({ count: __qa.chatHistory.length, toasts: __qa.toasts.map(x => x.message) })));
        assert.equal(await page.evaluate(() => __qa.chatHistory.length), originalCount - 1);
        const summary = await page.evaluate(async scope => {
            const stored = await RPHubStorage.getScopedStoredValue('chat', scope);
            return { count: stored.length, snapshots: stored.filter(m => m.uiTemplateBlocks).length };
        }, scope);
        assert.equal(summary.count, originalCount - 1);
        await page.reload();
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'), null, { timeout: 120000 });
        assert.equal(await page.evaluate(() => document.getElementById('app').__vue_app__._container._vnode.component.setupState.chatHistory.length),
            originalCount - 1, 'Deleted history must survive reload');
        await page.evaluate(() => {
            document.getElementById('app').__vue_app__._container._vnode.component.setupState.showUserSetupModal = false;
        });
        await page.getByRole('heading', { name: '欢迎使用 RP Hub', exact: true }).waitFor({ state: 'hidden' });
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
            originalCount, afterDelete: summary.count, retainedSnapshots: summary.snapshots, reloadVerified: true,
            originalWriteError: rawWriteError,
            originalBackupUnmodified: true, realApiUsed: false, phoneUsed: false
        }, null, 2));
        await page.screenshot({ path: path.join(output, 'delete.png') });
    } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
