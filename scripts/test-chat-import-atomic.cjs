const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext();
        await context.addInitScript(require('./mock-files.cjs'), { persistFiles: false });
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            return file.startsWith(web + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
                ? route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
                    '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' }) : route.abort();
        });
        const page = await context.newPage();
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async () => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false; __qa.closeAnnouncement();
            __qa.characters = [{ uuid: 'import-atomic', name: 'Import fixture', description: '', first_mes: '',
                worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await __qa.selectCharacter(0);
            __qa.chatHistory = [{ id: 'original', role: 'assistant', content: 'original conversation', shouldAnimate: false }];
            await Vue.nextTick();
            await RPHubStorage.setScopedStoredValue('chat', 'import-atomic', RPHubStorage.cloneForStorage(__qa.chatHistory));
        });
        async function importChat(records, failureKey) {
            await page.evaluate(({ records, failureKey }) => {
                __qa.toasts = [];
                const put = IDBObjectStore.prototype.put;
                window.__restoreImportPut = () => { IDBObjectStore.prototype.put = put; };
                IDBObjectStore.prototype.put = function (value, key) {
                    if (key === failureKey) throw new DOMException('fixture import write failure', 'QuotaExceededError');
                    return put.call(this, value, key);
                };
                __qa.importCharacter({ target: { value: '', files: [new File([
                    records.map(record => JSON.stringify(record)).join('\n')
                ], 'atomic.jsonl')] } });
            }, { records, failureKey });
            try {
                await page.waitForFunction(() => __qa.toasts.some(toast =>
                    /成功.*导入|成功为|fixture import write failure/.test(toast.message)));
            } finally { await page.evaluate(() => __restoreImportPut()); }
        }
        const manifest = {
            type: 'rp-hub-branch-chat', version: 1, activeBranchId: 'route',
            branches: [{ id: 'main', name: 'Main' }, { id: 'route', name: 'Route' }]
        };
        const before = await page.evaluate(async () => ({
            chat: await RPHubStorage.getScopedStoredValue('chat', 'import-atomic'),
            branchIds: (await RPHubStorage.getScopedStoredValue('branches', 'import-atomic')).branches.map(b => b.id),
            activeBranchId: 'main'
        }));
        const branchRecords = [manifest,
            { branchId: 'main', messages: [{ id: 'main-new', role: 'assistant', content: 'imported main' }] },
            { branchId: 'route', messages: [{ id: 'route-new', role: 'assistant', content: 'imported route' }] }];
        await importChat(branchRecords, 'rp_hub_chat_import-atomic__branch__route');
        assert.deepEqual(await page.evaluate(async () => ({
            chat: await RPHubStorage.getScopedStoredValue('chat', 'import-atomic'),
            branchIds: (await RPHubStorage.getScopedStoredValue('branches', 'import-atomic')).branches.map(b => b.id),
            activeBranchId: (await RPHubStorage.getScopedStoredValue('branches', 'import-atomic')).activeBranchId
        })), before, 'A failed branch import must preserve every conversation and the branch directory');
        assert.equal(await page.evaluate(() => __qa.chatHistory[0].content), 'original conversation');
        await importChat([{ id: 'plain-new', role: 'assistant', content: 'plain replacement' }], 'rp_hub_chat_import-atomic');
        assert.equal(await page.evaluate(() => __qa.chatHistory[0].content), 'original conversation',
            'A failed plain import must keep the visible history so autosave cannot publish the failed replacement');
        await importChat(branchRecords);
        assert.equal(await page.evaluate(() => __qa.chatHistory[0].content), 'imported route');
        assert.equal(await page.evaluate(async () =>
            (await RPHubStorage.getScopedStoredValue('chat', 'import-atomic'))[0].content), 'imported main');
        assert.equal(await page.evaluate(async () =>
            (await RPHubStorage.getScopedStoredValue('branches', 'import-atomic')).activeBranchId), 'route');
        console.log('PASS: failed branch/plain imports preserve stored and visible chats; retry restores all branches');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
