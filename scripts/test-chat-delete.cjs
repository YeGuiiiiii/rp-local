const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/chat-delete-2.9.021');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(bridge);
    const page = await context.newPage(), errors = [], logs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') logs.push(message.text()); });
    let failGeneration = true, holdRequest = false, heldRequest;
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'chat.test') {
            if (holdRequest) {
                heldRequest = route;
                return;
            }
            const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
                'access-control-allow-methods': 'GET,POST,OPTIONS' };
            if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
            if (url.pathname.endsWith('/models')) return route.fulfill({ headers, json: { data: [{ id: 'test-chat' }] } });
            return failGeneration ? route.fulfill({ headers: { ...headers, 'content-type': 'text/event-stream' },
                body: 'data: {"choices":[{"delta":{"reasoning_content":"先考虑旅人的问候。"}}]}\n\n'
                    + 'data: {"error":{"message":"Test model unavailable"}}\n\n' })
                : route.fulfill({ headers, json: {
                    choices: [{ message: { role: 'assistant', content: '你好，旅人。' }, finish_reason: 'stop' }]
                } });
        }
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
            '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    async function ready() {
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
        });
    }
    async function remove(index = null) {
        await page.evaluate(() => { __qa.toasts = []; });
        if (index === null) await page.locator('button.message-action-button[title="删除"]').last().click();
        else await page.locator(`[data-chat-index="${index}"] button[title="删除"]`).click();
        await page.getByRole('button', { name: '确认', exact: true }).click();
        await page.waitForFunction(() => __qa.toasts.some(item => /已删除|删除失败/.test(item.message)), null,
            { timeout: 10000 });
    }
    async function send(text) {
        await page.getByPlaceholder('输入消息...', { exact: true }).fill(text);
        await page.evaluate(() => __qa.sendMessage());
    }
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
        await page.evaluate(async () => {
            __qa.memorySettings.enabled = true;
            __qa.characters = [{ uuid: 'delete-card', name: '删除测试', first_mes: '旅人抵达钟楼。',
                worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
            await __qa.selectCharacter(0);
            Object.assign(__qa.settings, { apiUrl: 'https://chat.test/v1', apiKey: 'TEST', model: 'test-chat',
                stream: true, uiTemplateEnabled: false });
        });
        await send('这轮生成失败。');
        assert.equal(await page.evaluate(() => __qa.isGenerating), false);
        assert.match(await page.evaluate(() => __qa.chatHistory.at(-1).responseError), /Test model unavailable/);
        await remove();
        assert.deepEqual(await page.evaluate(() => __qa.chatHistory.map(item => item.role)), ['assistant', 'user'],
            'A failed response can be removed');
        failGeneration = false;
        await send('你好');
        assert.equal(await page.evaluate(() => __qa.chatHistory.at(-1).content), '你好，旅人。');
        await remove();
        assert.deepEqual(await page.evaluate(() => __qa.chatHistory.map(item => item.role)),
            ['assistant', 'user', 'user'], 'The next successful response can also be removed');
        await page.evaluate(() => RPLocalStore.flush());
        await page.reload(); await ready();
        await page.evaluate(() => __qa.selectCharacter(0));
        assert.deepEqual(await page.evaluate(() => __qa.chatHistory.map(item => item.role)), ['assistant', 'user', 'user']);
        await remove(2);
        await remove(1);
        assert.deepEqual(await page.evaluate(() => __qa.chatHistory.map(item => item.content)), ['旅人抵达钟楼。'],
            'Deleting a user turn must preserve the opening');

        // A stopped request must release the same deletion path.
        holdRequest = true;
        await page.getByPlaceholder('输入消息...', { exact: true }).fill('停止这一轮');
        await page.evaluate(() => { Object.assign(__qa.settings, { apiUrl: 'https://chat.test/v1', apiKey: 'TEST', model: 'test-chat' }); });
        const requestReceived = page.waitForRequest('https://chat.test/v1/chat/completions');
        const pendingSend = page.evaluate(() => __qa.sendMessage());
        await requestReceived;
        await page.evaluate(() => __qa.stopGeneration());
        await pendingSend;
        await heldRequest.abort().catch(() => {});
        holdRequest = false;
        await remove(1);
        assert.equal(await page.evaluate(() => __qa.chatHistory.length), 1);

        await send('保留这轮，模拟磁盘失败');
        await page.evaluate(() => {
            const put = IDBObjectStore.prototype.put;
            window.__restorePut = () => { IDBObjectStore.prototype.put = put; };
            IDBObjectStore.prototype.put = function (value, key) {
                if (key === 'rp_hub_chat_delete-card') throw new DOMException('Test disk unavailable', 'QuotaExceededError');
                return put.call(this, value, key);
            };
        });
        await remove();
        assert.equal(await page.evaluate(() => __qa.chatHistory.length), 3, 'Failed storage must preserve the visible conversation');
        assert.match(await page.evaluate(() => __qa.toasts.at(-1).message), /Test disk unavailable/);
        await page.evaluate(() => __restorePut());
        await remove();
        assert.equal(await page.evaluate(() => __qa.chatHistory.length), 2, 'Deletion works again after storage recovers');
        await page.screenshot({ path: path.join(output, 'deleted.png') });
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ errors, logs,
            deleteAfterFailure: true, deleteNextSuccess: true, deleteUserTurn: true,
            deleteAfterCancel: true, deletionPersists: true,
            storageFailurePreservesChat: true, storageRecovery: true, realApiUsed: false }, null, 2));
        console.log('PASS: deletion after model failure/cancel, subsequent success, restart and storage recovery');
    } catch (error) {
        await page.screenshot({ path: path.join(output, 'failure.png') });
        console.error({ errors, logs });
        throw error;
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
