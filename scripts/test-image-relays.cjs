const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const JSZip = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/jszip');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
(async () => {
    const png = fs.readFileSync(path.join(root, 'dist/app-icon.png'));
    const zip = new JSZip(); zip.file('image_0.png', png);
    const packed = await zip.generateAsync({ type: 'nodebuffer' });
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(require('./mock-files.cjs'));
        const requests = [], errors = [];
        let format = 'zip';
        await context.route('**/*', route => {
            const request = route.request(), url = new URL(request.url());
            if (url.hostname === 'gnai.rbq.my') {
                const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
                    'access-control-allow-methods': 'GET,POST,OPTIONS' };
                if (request.method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
                requests.push({ url: url.href, method: request.method(), key: request.headers().authorization,
                    body: request.method() === 'POST' ? request.postDataJSON() : null });
                if (url.pathname !== '/ai/generate-image') return route.fulfill({ headers, status: 404, body: 'wrong path' });
                if (format === 'unauthorized') return route.fulfill({ headers, status: 401, json: { detail: '测试密钥已失效' } });
                if (format === 'html') return route.fulfill({ headers, contentType: 'text/html', body: '<html>service unavailable</html>' });
                if (format === 'json') return route.fulfill({ headers, json: { images: [{ image: png.toString('base64') }] } });
                if (format === 'png') return route.fulfill({ headers, contentType: 'image/png', body: png });
                return route.fulfill({ headers, contentType: 'application/zip', body: packed });
            }
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            return file.startsWith(web + path.sep) && fs.existsSync(file)
                ? route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' })
                : route.abort();
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        async function ready() {
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false; __qa.closeAnnouncement();
            });
        }
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
        await page.evaluate(() => __qa.openSettingsSection('image'));
        await page.getByRole('button', { name: '添加生图接口', exact: true }).click();
        await page.getByLabel('生图 API 地址', { exact: true }).fill('https://gnai.rbq.my/ai/generate-image');
        await page.getByLabel('生图 API 地址', { exact: true }).press('Tab');
        assert.equal(await page.evaluate(() => __qa.imageApi.endpoint()), 'https://gnai.rbq.my/ai/generate-image',
            'A complete NovelAI URL must not gain an OpenAI path');
        assert.equal(await page.getByLabel('接口格式', { exact: true }).inputValue(), 'novelai');
        await page.locator('.shell-image-section .secret-input input').fill('relay-fixture-key');
        await page.getByLabel('生图模型', { exact: true }).fill('nai-diffusion-4-5-full');
        await page.getByLabel('输出尺寸', { exact: true }).fill('1216x832');
        await page.evaluate(async () => {
            const api = __qa.imageApi;
            const endpoint = url => api.endpoint({ ...api.current, url, protocol: 'novelai' });
            if (endpoint('https://relay.test') !== 'https://relay.test/ai/generate-image'
                || endpoint('https://relay.test/proxy/ai/generate-image/') !== 'https://relay.test/proxy/ai/generate-image')
                throw new Error('NovelAI base URLs and complete endpoints must preserve proxy paths');
            // Simulate an existing profile saved before NovelAI was supported.
            await api.update('protocol', 'openai');
            await api.flush();
        });
        await page.reload(); await ready();
        assert.equal(await page.evaluate(() => __qa.imageApi.current.key), 'relay-fixture-key');
        assert.equal(await page.evaluate(() => __qa.imageApi.current.protocol), 'novelai');
        await page.evaluate(() => {
            window.__relayNativeRequests = [];
            if (window.RPNativeNetwork) window.RPNativeNetwork = { fetch: (url, options) => {
                __relayNativeRequests.push(String(url)); return fetch(url, options);
            } };
        });
        async function generate(id, failed = false) {
            await page.evaluate(async id => {
                if (!__qa.characters.length) {
                    __qa.characters = [{ uuid: 'relay-fixture', name: '中转接口测试', first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: [] }];
                    await __qa.selectCharacter(0);
                }
                __qa.settings.freezeGeneratedImagesExplicit = true; __qa.settings.freezeGeneratedImages = false;
                __qa.worldInfo.find(item => item.comment === '自动生图').enabled = true;
                __qa.chatHistory = [{ id, role: 'assistant', content: 'image###a silver tree, ' + id + '###', shouldAnimate: false }];
                __qa.navigateWorkspace('chat');
            }, id);
            await page.waitForFunction(failed => {
                const card = document.querySelector('.generated-image-card');
                return failed ? card?.classList.contains('is-generation-error')
                    : card?.dataset.imageJobState === 'done' && card.querySelector('img')?.naturalWidth > 0;
            }, failed);
        }
        await generate('novel-zip');
        const create = requests.find(request => request.method === 'POST');
        assert.equal(create.url, 'https://gnai.rbq.my/ai/generate-image');
        assert.equal(create.key, 'Bearer relay-fixture-key');
        assert.equal(create.body.action, 'generate');
        assert.match(create.body.input, /a silver tree/);
        assert.equal(create.body.model, 'nai-diffusion-4-5-full');
        assert.equal(create.body.parameters.width, 1216);
        assert.equal(create.body.parameters.height, 832);
        assert.equal(create.body.parameters.n_samples, 1);
        assert.equal(create.body.parameters.steps, 28);
        assert.equal(create.body.parameters.cfg_rescale, 0);
        assert.equal(create.body.parameters.v4_prompt.caption.base_caption, create.body.input);
        assert.equal(create.body.parameters.v4_negative_prompt.caption.base_caption, create.body.parameters.negative_prompt);
        assert.equal(create.body.token, undefined);
        if (await page.evaluate(() => !!window.RPNativeNetwork))
            assert.ok(await page.evaluate(() => __relayNativeRequests.length > 0), 'Beta must use Android image transport');
        for (format of ['png', 'json']) await generate('novel-' + format);
        for (format of ['unauthorized', 'html']) {
            const before = requests.filter(request => request.method === 'POST').length;
            await generate('novel-' + format, true);
            assert.equal(requests.filter(request => request.method === 'POST').length, before + 1,
                'Errors must not trigger another billable request in a different format');
            assert.match(await page.locator('.generated-image-card').innerText(),
                format === 'unauthorized' ? /测试密钥已失效/ : /图片|格式|接口/);
        }
        assert.deepEqual(errors, []);
        console.log('NovelAI full URL, saved keys, exact request fields, ZIP/PNG/JSON responses and single-attempt errors passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
