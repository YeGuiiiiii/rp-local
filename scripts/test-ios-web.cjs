const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { webkit } = require(process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'ios/Resources/site');
const evidence = path.join(root, 'verification/ios');
const origin = 'https://ios-preview.local';
fs.mkdirSync(evidence, { recursive: true });

(async () => {
    const browser = await webkit.launch({ headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        await context.addInitScript(installFileBridge);
        await context.addInitScript(() => {
            if (window.top !== window) return;
            const nativeFiles = window.RPLocalFiles;
            const sessions = new Map();
            window.__iosExports = [];
            window.prompt = (_, raw) => {
                const { scope, method, args } = JSON.parse(raw);
                if (scope === 'files') return nativeFiles[method](...args);
                try {
                    let value = true;
                    if (method === 'getBackupFolder') value = '';
                    else if (method === 'listBackupFiles') value = '[]';
                    else if (method === 'getDefaultBackupFolderPath') value = '/Application Support/RPData/Backups';
                    else if (method === 'createBackupFileToDownloads' || method === 'createBackupFile') {
                        const token = crypto.randomUUID();
                        sessions.set(token, { name: args[0], body: '' });
                        value = 'OK:' + token;
                    } else if (method === 'writeBackupChunk') {
                        sessions.get(args[0]).body += atob(args[1]);
                        value = 'OK';
                    } else if (method === 'finishBackupWrite') {
                        window.__iosExports.push(sessions.get(args[0]));
                        sessions.delete(args[0]);
                        value = 'OK';
                    } else if (method === 'saveFile' || method === 'saveImageToGallery') {
                        window.__iosExports.push({ name: args[1], body: atob(args[0]) });
                    } else if (method !== 'abortBackupWrite' && method !== 'openLighthouse') {
                        throw new Error('Unexpected native operation: ' + method);
                    }
                    return JSON.stringify({ ok: true, value });
                } catch (error) { return JSON.stringify({ ok: false, error: error.message }); }
            };
            window.webkit = { messageHandlers: { rpNetwork: {
                postMessage(message) {
                    if (message.cancel) return;
                    queueMicrotask(() => {
                        __rpReceiveNetwork({ id: message.id, type: 'response', status: 200, headers: { 'content-type': 'application/json' } });
                        __rpReceiveNetwork({ id: message.id, type: 'data', data: btoa('{"remaining":999}') });
                        __rpReceiveNetwork({ id: message.id, type: 'end' });
                    });
                },
            } } };
        });
        await context.addInitScript({ path: path.join(root, 'ios/Resources/ios-bridge.js') });
        const page = await context.newPage();
        const errors = [];
        const missing = [];
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) return route.abort();
            const relative = decodeURIComponent(url.pathname.replace(/^\/RP-Hub\//, '')) || 'index.html';
            if (relative.startsWith('_files/')) {
                const name = relative.slice(7);
                const image = await page.evaluate(name => __qaNativeFiles[name], name);
                return route.fulfill({ status: image?.binary ? 200 : 404,
                    body: image?.binary ? Buffer.from(image.binary, 'base64') : '',
                    contentType: 'image/png' });
            }
            const file = path.resolve(site, relative);
            if (!file.startsWith(site + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
                missing.push(relative);
                return route.fulfill({ status: 404, body: '' });
            }
            return route.fulfill({ path: file, contentType: ({
                '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
                '.webp': 'image/webp', '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg',
            })[path.extname(file)] || 'application/octet-stream' });
        });
        const ready = async () => {
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false;
            });
        };
        await page.goto(origin + '/RP-Hub/', { waitUntil: 'load' });
        await ready();
        assert.equal(await page.evaluate(() => RPLocalStore.available), true);
        await page.screenshot({ path: path.join(evidence, 'webkit-home-390.png') });
        await page.evaluate(async () => {
            __qa.characters = [{
                uuid: 'ios-test-card', name: '苹果迁移测试', first_mes: '', description: '',
                worldInfo: [], regexScripts: [], uiTemplates: [],
            }];
            await __qa.selectCharacter(0, true, { silent: true });
            __qa.currentView = 'chat';
            __qa.chatHistory = [
                { id: 'ios-message', role: 'assistant', content: 'ios-offline-test：重开后保留聊天。', shouldAnimate: false },
            ];
        });
        await page.waitForFunction(() => Object.values(__qaNativeFiles).some(file =>
            file.text?.includes('ios-offline-test')));
        await page.waitForFunction(() => Object.keys(__qaNativeFiles).some(name => name.endsWith('/角色卡.json')));
        await page.reload({ waitUntil: 'load' });
        await ready();
        assert.equal(await page.evaluate(() => __qa.currentCharacter.uuid), 'ios-test-card');
        assert.ok(await page.evaluate(() => __qa.chatHistory.some(message => message.content.includes('ios-offline-test'))));
        await page.evaluate(async () => {
            const card = RPLocalStore.assignFolders(__qa.characters)[0];
            const blob = new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
            const saved = await RPLocalStore.saveImage('ios-image-test', blob, card);
            const found = await RPLocalStore.findImage('ios-image-test', card);
            if (!saved || found.file !== saved.file) throw new Error('Image index failed');
            RPHubCardUtils.downloadBlob(new Blob(['{"test":"苹果"}'], { type: 'application/json' }), 'ios-card.json');
        });
        await page.waitForFunction(() => __iosExports.some(item => item.name === 'ios-card.json'));
        await page.evaluate(() => __qa.exportAllData());
        await page.waitForFunction(() => __iosExports.some(item => item.name !== 'ios-card.json'));
        const exported = await page.evaluate(() => __iosExports.find(item => item.name !== 'ios-card.json'));
        const payload = JSON.parse(Buffer.from(exported.body, 'binary').toString('utf8'));
        assert.equal(payload.type, 'rp-hub-complete-backup');
        assert.equal(payload.version, 8);
        assert.ok(JSON.stringify(payload.entries).includes('ios-offline-test'));
        for (const [width, height] of [[390, 844], [844, 390], [1024, 768]]) {
            await page.setViewportSize({ width, height });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(evidence, `webkit-${width}.png`) });
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(missing, []);
        const report = {
            engine: 'Playwright WebKit on Windows; native calls simulated',
            offlineBundledPage: true, missingLocalResources: missing,
            chatSurvivesReload: true, imageIndexRoundTrip: true,
            cardExportReachesNativeBridge: true, fullBackupContainsChat: true,
            layouts: ['390x844', '844x390', '1024x768'], pageErrors: errors,
            notVerified: ['Xcode compilation', 'native Swift execution', 'iPhone installation',
                'real API and SSE transport', 'upgrade data retention'],
        };
        fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
