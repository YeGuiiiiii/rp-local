const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(bridge);
        const page = await context.newPage(), errors = [], saves = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
            if (message.type() === 'error') saves.push(message.text());
        });
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
                '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
        });
        const ready = async () => {
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false; __qa.showAnnouncement = false;
            });
        };
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
        await page.evaluate(async () => {
            __qa.characters = [{ uuid: 'temperature-save', name: '温度保存测试', first_mes: '保留故事',
                avatar: 'assets/images/chenyue/welcome.webp', worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await __qa.selectCharacter(0);
            __qa.settings.qualityModel = 'qa-quality';
            __qa.settings.balancedModel = 'qa-balanced';
            __qa.settings.fastModel = 'qa-fast';
        });
        await page.waitForTimeout(1600);
        saves.length = 0;
        await page.evaluate(() => {
            __qa.toasts = [];
            window.__configTransactions = 0;
            const transaction = IDBDatabase.prototype.transaction;
            IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
                if (mode === 'readwrite') __configTransactions++;
                return transaction.call(this, stores, mode, ...rest);
            };
            __qa.showChatModelSelector = true;
        });
        const slider = page.getByRole('slider', { name: '温度', exact: true });
        await slider.waitFor();
        await slider.evaluate(element => {
            for (let i = 0; i <= 60; i++) {
                element.value = String(i / 100);
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(1600);
        const report = await page.evaluate(async () => ({
            temperature: __qa.settings.temperature, slots: __qa.settings.slotTemperatures,
            saved: (await RPHubStorage.getStoredValue('settings')).temperature,
            warnings: __qa.toasts.filter(item => item.message.includes('保存失败')).map(item => item.message),
            transactions: __configTransactions
        }));
        console.log(JSON.stringify({ report, saveErrors: saves.filter(text => text.includes('Save failed')).length }));
        assert.equal(saves.filter(text => text.includes('Save failed')).length, 0, 'Dragging must not race config readback');
        assert.deepEqual(report.warnings, []);
        assert.ok(report.transactions < 15, 'Dragging must coalesce writes instead of saving every input');
        assert.equal(report.saved, 0.6);
        await page.evaluate(() => {
            __qa.selectChatModelSlot({ mode: 'balanced', model: 'qa-balanced' });
            __qa.slotTemperature = 0.8;
        });
        await page.waitForTimeout(1300);
        await page.evaluate(() => {
            __qa.selectChatModelSlot({ mode: 'fast', model: 'qa-fast' });
            __qa.slotTemperature = 0.3;
        });
        await page.waitForTimeout(1300);
        await page.evaluate(() => RPLocalStore.flush());
        await page.reload(); await ready();
        assert.deepEqual(await page.evaluate(() => __qa.settings.slotTemperatures),
            { quality: 0.6, balanced: 0.8, fast: 0.3 });
        await page.evaluate(() => {
            __qa.toasts = [];
            const put = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (value, key) {
                if (key === 'rp_hub_settings') throw new DOMException('Test storage failure', 'UnknownError');
                return put.call(this, value, key);
            };
            window.__restoreSettingsPut = () => { IDBObjectStore.prototype.put = put; };
            __qa.slotTemperature = 0.4;
        });
        await page.waitForFunction(() => __qa.toasts.some(item => item.message.includes('设置保存失败')));
        await page.evaluate(() => { __restoreSettingsPut(); __qa.slotTemperature = 0.5; });
        await page.waitForFunction(async () => (await RPHubStorage.getStoredValue('settings')).temperature === 0.5);
        assert.deepEqual(errors, []);
        console.log('PASS continuous slider changes, three slot values survive reload, genuine write failures still report and retry');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
