const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.join(root, '.impeccable/review/image-providers');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        await context.addInitScript(bridge);
        const page = await context.newPage(), errors = [], requests = [];
        let fail = false, jobsFail = false, format = 'url', modelFail = false;
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
            const url = new URL(route.request().url()), method = route.request().method();
            if (['images-a.test', 'images-b.test', 'nai.sta1n.cn'].includes(url.hostname)) {
                const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,authorization',
                    'access-control-allow-methods': 'GET,POST,HEAD,OPTIONS' };
                if (method === 'OPTIONS') return route.fulfill({ headers, body: '' });
                requests.push({ url: url.href, method, key: route.request().headers().authorization,
                    body: method === 'POST' ? route.request().postDataJSON() : null });
                if (url.pathname.endsWith('/models')) return route.fulfill({ headers, status: modelFail ? 404 : 200,
                    json: modelFail ? { error: { message: 'Model listing unavailable' } } : {
                        data: [{ id: 'fixture-image-2' }, { id: 'fixture-image-other' }]
                    } });
                if (url.pathname.endsWith('/images/generations')) return route.fulfill({ headers,
                    status: fail ? 401 : 200, json: fail ? { error: { message: 'fixture key rejected' } } : {
                        data: [format === 'base64' || format === 'data-uri'
                            ? { b64_json: (format === 'data-uri' ? 'data:image/png;base64,' : '')
                                + fs.readFileSync(path.join(root, 'dist/app-icon.png')).toString('base64') }
                            : { url: format === 'relative' ? '../result.png' : 'https://images-b.test/result.png' }]
                    } });
                if (url.pathname.endsWith('/api/jobs')) return route.fulfill({ headers,
                    json: { id: 'job-a', status: 'queued' } });
                if (url.pathname.endsWith('/api/jobs/job-a')) return route.fulfill({ headers,
                    json: jobsFail
                        ? { id: 'job-a', status: 'failed', error: 'fixture generation failed' }
                        : { id: 'job-a', status: 'done', imageUrl: 'https://images-a.test/result.png' } });
                if (url.pathname.endsWith('.png')) return route.fulfill({ headers,
                    contentType: 'image/png', path: path.join(root, 'dist/app-icon.png') });
                return route.fulfill({ headers, json: { status: 'ok', type: 'sta1n', data: { value: 10 } } });
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
                __qa.showUserSetupModal = false; __qa.showAnnouncement = false;
            });
        }
        const imagePage = () => page.evaluate(() => __qa.openSettingsSection('image'));
        const keyInput = () => page.locator('.shell-image-section .secret-input input');
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready(); await imagePage();
        assert.equal(await page.getByRole('button', { name: '添加生图接口', exact: true }).count(), 1,
            'Image settings must let the user add independent providers');
        await keyInput().fill('original-key');
        await page.getByRole('button', { name: '添加生图接口', exact: true }).click();
        assert.equal(await page.getByLabel('输出尺寸', { exact: true }).inputValue(), '1024x1024',
            'New OpenAI profiles must start with explicit dimensions rather than auto');
        await page.getByLabel('接口名称', { exact: true }).fill('A站');
        await page.getByLabel('接口名称', { exact: true }).press('Tab');
        await page.getByLabel('接口格式', { exact: true }).selectOption('jobs');
        await page.getByLabel('生图 API 地址', { exact: true }).fill('https://images-a.test/proxy');
        await page.getByLabel('生图 API 地址', { exact: true }).press('Tab');
        await keyInput().fill('1323');
        const a = await page.evaluate(() => __qa.imageApi.selectedId);
        await page.getByRole('button', { name: '添加生图接口', exact: true }).click();
        await page.getByLabel('接口名称', { exact: true }).fill('B站');
        await page.getByLabel('接口名称', { exact: true }).press('Tab');
        await page.getByLabel('生图 API 地址', { exact: true }).fill('https://images-b.test/v1');
        await page.getByLabel('生图 API 地址', { exact: true }).press('Tab');
        await page.getByLabel('生图模型', { exact: true }).fill('fixture-image');
        await page.getByLabel('生图模型', { exact: true }).press('Tab');
        await keyInput().fill('4343');
        const b = await page.evaluate(() => __qa.imageApi.selectedId);
        assert.equal(await page.getByRole('button', { name: '读取生图模型列表', exact: true }).count(), 1);
        await page.getByLabel('可用生图模型', { exact: true }).waitFor();
        assert.deepEqual(await page.getByLabel('可用生图模型', { exact: true }).locator('option').allTextContents(),
            ['选择模型', 'fixture-image-2', 'fixture-image-other']);
        assert.equal(requests.find(item => item.url === 'https://images-b.test/v1/models').key, 'Bearer 4343');
        await page.getByLabel('可用生图模型', { exact: true }).selectOption('fixture-image-2');
        assert.equal(await page.getByLabel('生图模型', { exact: true }).inputValue(), 'fixture-image-2');
        modelFail = true;
        await page.getByRole('button', { name: '读取生图模型列表', exact: true }).click();
        await page.getByRole('status').filter({ hasText: '模型列表读取失败' }).waitFor();
        assert.equal(await page.getByLabel('生图模型', { exact: true }).inputValue(), 'fixture-image-2');
        await page.getByLabel('生图模型', { exact: true }).fill('manual-image-model');
        assert.equal(await page.evaluate(() => __qa.imageApi.current.model), 'manual-image-model');
        modelFail = false;
        await page.getByLabel('生图接口', { exact: true }).selectOption(a);
        assert.equal(await keyInput().inputValue(), '1323');
        await page.getByLabel('生图接口', { exact: true }).selectOption(b);
        assert.equal(await keyInput().inputValue(), '4343');
        await page.getByLabel('生图模型', { exact: true }).fill('fixture-image-2');
        await page.evaluate(() => __qa.imageApi.flush());
        await page.reload(); await ready(); await imagePage();
        assert.equal(await keyInput().inputValue(), '4343');
        assert.equal(await page.getByLabel('生图模型', { exact: true }).inputValue(), 'fixture-image-2');
        await page.evaluate(() => {
            const write = RPLocalFiles.writeTextIfChanged;
            window.__restoreProviderWrite = () => { RPLocalFiles.writeTextIfChanged = write; };
            RPLocalFiles.writeTextIfChanged = function (file, value) {
                return file === '个人数据/生图接口.json' ? JSON.stringify({ ok: false, error: 'fixture disk full' })
                    : write.call(this, file, value);
            };
        });
        await keyInput().fill('unsaved-key');
        await page.getByRole('alert').filter({ hasText: '生图接口未保存' }).waitFor();
        await page.evaluate(() => __restoreProviderWrite());
        await keyInput().fill('4343');
        await page.evaluate(() => __qa.imageApi.flush());
        assert.equal(await page.getByRole('alert').filter({ hasText: '生图接口未保存' }).count(), 0);

        const generate = async (id, provider) => {
            await page.evaluate(async ({ id, provider }) => {
                __qa.imageApi.select(provider);
                if (!__qa.characters.length) {
                    __qa.characters = [{ uuid: 'image-provider-test', name: '接口测试', first_mes: '', worldInfo: [],
                        regexScripts: [], uiTemplates: [], avatar: 'assets/images/chenyue/welcome.webp' }];
                    await __qa.selectCharacter(0);
                }
                __qa.worldInfo.find(item => item.comment === '自动生图').enabled = true;
                __qa.chatHistory = [{ id, role: 'assistant', content: 'image###a silver tree, ' + id + '###', shouldAnimate: false }];
                __qa.navigateWorkspace('chat');
            }, { id, provider });
            return page.locator('.generated-image-card').last();
        };
        requests.length = 0;
        let card = await generate('task-a', a);
        await page.waitForFunction(() => document.querySelector('.generated-image-card')?.dataset.imageJobState === 'done');
        const create = requests.find(item => item.url === 'https://images-a.test/proxy/api/jobs');
        assert.equal(create.body.token, '1323');
        assert.ok(requests.some(item => item.url === 'https://images-a.test/proxy/api/jobs/job-a?token=1323'));
        assert.equal(requests.some(item => item.url.includes('nai.sta1n.cn')), false, 'Custom keys must never be sent to the built-in site');
        card = await generate('image-b', b);
        await page.waitForFunction(() => document.querySelector('.generated-image-card')?.dataset.imageJobState === 'done');
        const openai = requests.find(item => item.url === 'https://images-b.test/v1/images/generations');
        assert.equal(openai.key, 'Bearer 4343');
        assert.equal(openai.body.model, 'fixture-image-2');
        assert.match(openai.body.prompt, /a silver tree/);
        assert.equal(openai.body.n, 1);
        assert.equal(openai.body.size, '1024x1024');
        assert.equal(openai.body.token, undefined);
        await imagePage();
        await page.getByLabel('常用输出尺寸', { exact: true }).selectOption('832x1216');
        await generate('image-b-portrait', b);
        await page.waitForFunction(() => document.querySelector('.generated-image-card')?.dataset.imageJobState === 'done');
        assert.equal(requests.filter(item => item.method === 'POST').at(-1).body.size, '832x1216');
        await imagePage();
        await page.getByLabel('输出尺寸', { exact: true }).fill(' 768 × 1152 ');
        await generate('image-b-custom', b);
        await page.waitForFunction(() => document.querySelector('.generated-image-card')?.dataset.imageJobState === 'done');
        assert.equal(requests.filter(item => item.method === 'POST').at(-1).body.size, '768x1152');
        await imagePage();
        await page.getByLabel('常用输出尺寸', { exact: true }).selectOption('');
        await generate('image-b-server-default', b);
        await page.waitForFunction(() => document.querySelector('.generated-image-card')?.dataset.imageJobState === 'done');
        assert.equal(Object.hasOwn(requests.filter(item => item.method === 'POST').at(-1).body, 'size'), false,
            'Server default must omit size rather than silently sending auto');
        await imagePage();
        await page.getByLabel('常用输出尺寸', { exact: true }).selectOption('auto');
        await page.getByLabel('生图接口', { exact: true }).selectOption(a);
        await page.getByLabel('生图接口', { exact: true }).selectOption(b);
        assert.equal(await page.getByLabel('输出尺寸', { exact: true }).inputValue(), 'auto');
        await generate('image-b-auto', b);
        await page.waitForFunction(() => document.querySelector('.generated-image-card')?.dataset.imageJobState === 'done');
        assert.equal(requests.filter(item => item.method === 'POST').at(-1).body.size, 'auto');
        format = 'relative';
        await generate('image-b-relative', b);
        await page.waitForFunction(() => document.querySelector('.generated-image-card img')?.naturalWidth > 0);
        assert.ok(requests.some(item => item.url === 'https://images-b.test/result.png'));
        format = 'url';
        const protocolRequest = page.waitForRequest('https://images-b.test/v1/api/jobs', { timeout: 3000 });
        await page.evaluate(async () => {
            __qa.settings.freezeGeneratedImagesExplicit = true;
            __qa.settings.freezeGeneratedImages = false;
            __qa.chatHistory = [];
            await Vue.nextTick();
            __qa.imageApi.update('protocol', 'jobs');
            __qa.chatHistory = [{ id: 'image-b', role: 'assistant', shouldAnimate: false,
                content: 'image###a silver tree, image-b###' }];
        });
        await protocolRequest;
        await page.waitForFunction(() => ['done', 'frozen'].includes(document.querySelector('.generated-image-card')?.dataset.imageJobState));
        await page.evaluate(() => __qa.imageApi.update('protocol', 'openai'));
        fail = true;
        const beforeFailure = requests.filter(item => item.method === 'POST').length;
        card = await generate('image-b-failed', b);
        await page.waitForFunction(element => element.classList.contains('is-generation-error'), await card.elementHandle());
        assert.match(await card.innerText(), /fixture key rejected/);
        assert.equal(requests.filter(item => item.method === 'POST').length, beforeFailure + 1,
            'An error must not trigger another billable request with different parameters');
        fail = false;
        await page.evaluate(a => { __qa.imageApi.select(a); __qa.imageApi.update('protocol', 'jobs'); }, a);
        jobsFail = true;
        const jobsPostCount = requests.filter(item => item.method === 'POST').length;
        card = await generate('image-job-failed', a);
        await page.waitForFunction(element => element.classList.contains('is-generation-error'), await card.elementHandle());
        assert.equal(await card.locator('img').getAttribute('src'), null,
            'A failed job with an id must not render its content endpoint as an image');
        assert.equal(requests.filter(item => item.method === 'POST').length, jobsPostCount + 1,
            'A failed job must not retry or submit a second billable request');
        await page.waitForTimeout(1000);
        assert.equal((await page.evaluate(() => RPHubImageGallery.records()))
            .some(item => item.tag.includes('image-job-failed')), false,
        'Failed placeholders must not be saved in the image gallery');
        jobsFail = false; format = 'data-uri';
        await generate('image-b-data-uri', b);
        await page.waitForFunction(() => document.querySelector('.generated-image-card img')?.naturalWidth > 0);
        format = 'base64';
        await generate('image-b-base64', b);
        await page.waitForFunction(() => {
            const source = document.querySelector('.generated-image-card img')?.src || '';
            return source.startsWith('blob:') || source.includes('/_files/');
        });
        await page.evaluate(() => __qa.imageApi.flush());
        await context.addInitScript(() => {
            let providers;
            Object.defineProperty(window, 'RPImageProviders', {
                get: () => providers,
                set: value => {
                    providers = { create(...args) {
                        const api = value.create(...args), load = api.load;
                        window.__imageApiForStartup = api;
                        api.load = async (...args) => {
                            await new Promise(resolve => setTimeout(resolve, 600));
                            return load(...args);
                        };
                        return api;
                    } };
                }
            });
            window.__earlyImageRequests = [];
            const fetch = window.fetch;
            window.fetch = function (url, options) {
                if (options?.method === 'POST' && /\/api\/jobs$|\/images\/generations$/.test(String(url))
                    && !window.__imageApiForStartup?.ready) __earlyImageRequests.push(String(url));
                return fetch.call(this, url, options);
            };
        });
        await page.evaluate(async () => {
            await new Promise(resolve => setTimeout(resolve, 1500));
            await RPLocalStore.flush();
            await RPHubStorage.setScopedStoredValue('chat', __qa.currentCharacter.uuid, [
                { id: 'startup-image', role: 'assistant', content: 'image###startup silver tree###', shouldAnimate: false }
            ]);
            await RPLocalStore.flush();
        });
        const startupRequest = page.waitForRequest(request => request.method() === 'POST'
            && /\/api\/jobs$|\/images\/generations$/.test(new URL(request.url()).pathname));
        await page.reload(); await ready();
        await startupRequest;
        assert.deepEqual(await page.evaluate(() => __earlyImageRequests), [],
            'Restored chat must wait for the selected provider before generating');
        // Import an old backup containing a different shared key; independent phone settings must win after restart.
        await page.evaluate(async () => {
            await RPLocalStore.flush();
            const settings = await RPHubStorage.getStoredValue('settings');
            settings.imageGenKey = 'old-import-key';
            const session = await RPStreamImport.stageEntries([{ key: 'rp_hub_settings', value: settings }]);
            await RPStreamImport.apply(session, { beforeApply: async () => {}, restoreValue: value => value });
        });
        await page.reload(); await ready(); await imagePage();
        assert.equal(await keyInput().inputValue(), '4343');
        assert.equal(await page.getByLabel('输出尺寸', { exact: true }).inputValue(), 'auto',
            'Explicit auto in an existing profile must survive reload and backup import');
        await page.getByLabel('生图接口', { exact: true }).selectOption(a);
        assert.equal(await keyInput().inputValue(), '1323');
        await page.getByLabel('生图接口', { exact: true }).selectOption('builtin');
        assert.equal(await keyInput().inputValue(), 'original-key');
        await page.getByLabel('生图接口', { exact: true }).selectOption(b);
        const preview = await page.evaluate(async () => {
            const bridge = window.RPLocalFiles;
            window.RPLocalFiles = undefined;
            try {
                const first = RPImageProviders.create('https://nai.sta1n.cn');
                await first.load('preview-original');
                first.add(); first.update('key', 'preview-a');
                const a = first.selectedId;
                first.add(); first.update('key', 'preview-b');
                await first.select(a); await first.flush();
                const next = RPImageProviders.create('https://nai.sta1n.cn');
                await next.load('old-backup-key');
                return { current: next.current.key, keys: next.profiles.map(item => item.key) };
            } finally { window.RPLocalFiles = bridge; }
        });
        assert.deepEqual(preview, { current: 'preview-a', keys: ['preview-original', 'preview-a', 'preview-b'] });
        for (const skin of ['classic', 'chenyue', 'winter']) {
            for (const mode of ['day', 'night']) {
                for (const width of [390, 1280]) {
                    await page.setViewportSize({ width, height: 900 });
                    await page.evaluate(({ skin, mode }) => {
                        __qa.toasts = [];
                        RPThemePacks.set(skin); RPThemePacks.setMode(mode);
                    }, { skin, mode });
                    await imagePage();
                    await page.waitForTimeout(200);
                    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                    await page.screenshot({ path: path.join(output, `${skin}-${mode}-${width}.png`) });
                }
            }
        }
        await page.getByRole('button', { name: '删除生图接口', exact: true }).click();
        await page.getByRole('button', { name: '删除', exact: true }).last().click();
        assert.equal(await page.getByLabel('生图接口', { exact: true }).locator(`option[value="${b}"]`).count(), 0);
        assert.deepEqual(errors, []);
        console.log('PASS per-site configuration, explicit/custom/omitted/auto sizes, URL/base64/data URI, single-attempt errors, all skin modes');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
