const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(installFileBridge);
    const page = await context.newPage();
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({
            '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp'
        })[path.extname(file)] || 'application/octet-stream' });
    });
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'load' });
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async () => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.characters = [{
                uuid: 'obfuscation-toggle-card', name: '混淆开关测试',
                first_mes: '', description: '', worldInfo: [], regexScripts: [], uiTemplates: []
            }];
            await __qa.selectCharacter(0);
            __qa.settings.model = 'test-openai-model';
        });
        const modelState = await page.evaluate(() => ({
            model: __qa.settings.model,
            gemini: __qa.isGeminiModel
        }));
        assert.equal(modelState.model, 'test-openai-model');
        assert.equal(modelState.gemini, false);
        await page.getByRole('button', { name: '快捷面板', exact: true }).click();
        const panel = page.getByRole('dialog', { name: '快捷面板', exact: true });
        await panel.waitFor();
        await panel.getByText('输入混淆', { exact: true }).waitFor();
        assert.equal(await panel.getByText('Gemini抗截断', { exact: true }).count(), 0);
        await panel.getByText('输入混淆', { exact: true }).click();
        await page.waitForFunction(() => __qa.settings.inputObfuscation === false);
        await page.evaluate(() => { __qa.settings.model = 'gemini-2.5-pro'; });
        await page.waitForFunction(() => __qa.isGeminiModel === true);
        await panel.getByText('Gemini抗截断', { exact: true }).waitFor();
        await panel.getByText('输入混淆', { exact: true }).waitFor();
        console.log('PASS input obfuscation toggle stays visible for non-Gemini models');
    } finally {
        await context.close();
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
