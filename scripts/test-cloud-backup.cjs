const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const evidence = path.join(root, '.impeccable/review/backup-2.9.005');
fs.mkdirSync(evidence, { recursive: true });
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(installFileBridge);
    const page = await context.newPage(), blobs = new Map();
    const piece = value => {
        const text = JSON.stringify(value), hash = crypto.createHash('sha256').update(text).digest('hex');
        blobs.set(hash, text);
        return { hash, size: Buffer.byteLength(text) };
    };
    const characters = ['a', 'b'].map(id => ({
        uuid: 'cloud-' + id, name: '云端卡' + id,
        ...piece({ uuid: 'cloud-' + id, name: '云端卡' + id, description: '完整角色内容', worldInfo: [], regexScripts: [], uiTemplates: [] }),
        entries: [{ name: 'chat', id: 'cloud-' + id, ...piece([{ id: 'new-' + id, role: 'assistant', content: '新聊天' + id }]) }]
    }));
    characters[0].entries.push(
        { name: 'chat', id: 'cloud-a__branch__route', ...piece([{ id: 'branch-new', role: 'assistant', content: '云端分支聊天' }]) },
        { name: 'branches', id: 'cloud-a', ...piece({ activeBranchId: 'route', branches: [{ id: 'main' }, { id: 'route', name: '云端路线' }] }) }
    );
    let corrupt = true, downloading = false, releaseDownload, manifest;
    const gate = new Promise(resolve => { releaseDownload = resolve; });
    const uploaded = new Map();
    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' };
        if (url.hostname === 'cloud.test') {
            if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
            if (url.pathname.endsWith('/v1/backup/check')) return route.fulfill({ headers, json: { missing: route.request().postDataJSON().hashes } });
            if (url.pathname.endsWith('/v1/backup') && route.request().method() === 'POST') {
                manifest = route.request().postDataJSON();
                return route.fulfill({ headers, json: { key: '123456789ABCDEFG', expiresAt: Date.now() + 86400000 } });
            }
            if (url.pathname.endsWith('/v1/backup/123456789ABCDEFG')) return route.fulfill({ headers, json: { characters } });
            const hash = url.pathname.split('/').at(-1);
            if (route.request().method() === 'PUT') {
                const bytes = route.request().headers()['x-blob-encoding'] === 'gzip'
                    ? require('node:zlib').gunzipSync(route.request().postDataBuffer()) : route.request().postDataBuffer();
                assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), hash);
                uploaded.set(hash, JSON.parse(bytes));
                return route.fulfill({ headers, body: '' });
            }
            if (!corrupt && hash === characters[1].entries[0].hash) { downloading = true; await gate; }
            if (blobs.has(hash)) return route.fulfill({ headers, body: corrupt && hash === characters[1].entries[0].hash
                ? blobs.get(hash).replace('新聊天', '假聊天') : blobs.get(hash) });
            return route.abort();
        }
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file)) return route.abort();
        if (file.endsWith('index.html')) return route.fulfill({ contentType: 'text/html',
            body: fs.readFileSync(file, 'utf8').replace('<head>', '<head><meta name="rphub-update-api" content="https://cloud.test">') });
        return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async () => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.characters = ['a', 'b'].map(id => ({ uuid: 'cloud-' + id, name: '原卡' + id }));
            await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
            await RPHubStorage.setScopedStoredValue('chat', 'cloud-a', [{ role: 'assistant', content: '原聊天' }]);
            await RPHubStorage.setScopedStoredValue('chat', 'cloud-a__branch__local', [{ role: 'assistant', content: '旧分支' }]);
            await RPHubStorage.replaceMemoryScopeList('cloud-a', [{ classicMemory: true, summary: '原记忆' }]);
            __qa.openCloudBackup('download');
            __qa.cloudBackup.restoreKey = '1234-5678-9ABC-DEFG';
            window.__restoreJob = __qa.startCloudRestore();
        });
        await page.waitForFunction(() => !__qa.cloudBackup.busy);
        assert.equal(await page.evaluate(async () => (await RPHubStorage.getScopedStoredValue('chat', 'cloud-a'))[0].content), '原聊天',
            '后续下载失败不得提前覆盖前面的聊天');
        assert.equal(await page.evaluate(async () => (await RPHubStorage.readMemoryState('cloud-a')).list[0].summary), '原记忆');
        assert.ok((await page.evaluate(() => __qa.backupTask.error)).includes('校验失败'), '大小相同但内容损坏也必须拒绝');
        assert.equal(await page.evaluate(async () => (await RPHubStorage.readCharacterDirectory())[0].name), '原卡a');
        await page.getByRole('button', { name: '关闭备份弹窗', exact: true }).click();
        corrupt = false;
        await page.evaluate(() => {
            Object.defineProperty(Response.prototype, 'body', { configurable: true, get: () => null });
            window.__restoreJob = __qa.startCloudRestore();
        });
        for (let i = 0; i < 100 && !downloading; i++) await page.waitForTimeout(50);
        assert.ok(downloading, JSON.stringify(await page.evaluate(() => ({ task: __qa.backupTask, cloud: __qa.cloudBackup }))));
        await page.evaluate(() => { __qa.toasts = []; });
        await page.locator('.transfer-mascot').evaluate(image => image.decode());
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(evidence, 'cloud-restore-390.png') });
        assert.equal(await page.evaluate(() => document.getElementById('app').inert), true);
        await page.evaluate(() => { __qa.shellGoBack(); __qa.navigateWorkspace('settings'); });
        assert.equal(await page.evaluate(() => __qa.currentView), 'characters');
        const reload = page.waitForEvent('load');
        releaseDownload();
        await reload;
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
        });
        assert.equal(await page.evaluate(async () => (await RPHubStorage.readCharacterDirectory())[0].name), '云端卡a');
        assert.equal(await page.evaluate(async () => (await RPHubStorage.getScopedStoredValue('chat', 'cloud-a'))[0].content), '新聊天a');
        assert.equal(await page.evaluate(async () => (await RPHubStorage.readMemoryState('cloud-a')).deleted), true);
        assert.equal(await page.evaluate(async () => (await RPHubStorage.getScopedStoredValue('chat', 'cloud-a__branch__route'))[0].content), '云端分支聊天');
        assert.equal(await page.evaluate(async () => (await RPHubStorage.getScopedStoredValue('branches', 'cloud-a')).activeBranchId), 'route');
        assert.equal(await page.evaluate(async () => (await RPHubStorage.getScopedStoredValue('chat', 'cloud-a__branch__local')).length), 0);
        await page.evaluate(() => { __qa.openCloudBackup('upload'); });
        await page.evaluate(() => __qa.startCloudBackup());
        assert.equal(manifest.characters.length, 2);
        assert.equal(uploaded.get(manifest.characters[0].hash).description, '完整角色内容');
        assert.ok(manifest.characters[0].entries.some(entry => entry.name === 'chat'));
        await page.evaluate(() => { window.CompressionStream = undefined; });
        await page.evaluate(() => __qa.startCloudBackup());
        assert.equal(manifest.characters.length, 2);
        Object.assign(characters[0], piece({ uuid: 'cloud-a', name: '恢复检查', description: '不同的内容' }));
        await page.evaluate(async () => {
            window.__originalApply = RPStreamImport.apply;
            RPStreamImport.apply = async () => { const error = new Error('需要恢复原数据'); error.recoveryRequired = true; throw error; };
            __qa.openCloudBackup('download');
            __qa.cloudBackup.restoreKey = '123456789ABCDEFG';
            await __qa.startCloudRestore();
        });
        assert.equal(await page.getByRole('button', { name: '重新打开并恢复', exact: true }).count(), 1, '恢复异常时必须提供重开入口并保持保护');
        await page.evaluate(() => __qa.shellGoBack());
        assert.equal(await page.evaluate(() => document.getElementById('app').inert), true);
        const recoveryReload = page.waitForEvent('load');
        await page.getByRole('button', { name: '重新打开并恢复', exact: true }).click();
        await recoveryReload;
        console.log('Cloud failure rollback, verified complete restore, back protection and gzip/identity upload passed.');
    } finally { releaseDownload(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
