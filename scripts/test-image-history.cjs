const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(require('./mock-files.cjs'), { persistFiles: false });
        const page = await context.newPage(), posts = [], errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname === 'history-images.test') {
                const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
                    'access-control-allow-methods': 'GET,POST,OPTIONS,HEAD' };
                if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
                if (route.request().method() === 'POST') {
                    posts.push(route.request().postDataJSON());
                    return route.fulfill({ headers, json: { data: [{ url: 'https://history-images.test/saved.png' }] } });
                }
                if (url.pathname.endsWith('.png')) return route.fulfill({
                    headers, path: path.join(root, 'dist/app-icon.png'), contentType: 'image/png'
                });
                return route.fulfill({ headers, json: { data: [] } });
            }
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.js': 'application/javascript',
                '.css': 'text/css', '.webp': 'image/webp' }[path.extname(file)] || 'application/octet-stream' });
        });
        const ready = async () => {
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false; __qa.showAnnouncement = false; __qa.closeAnnouncement();
            });
        };
        const revealHistory = async () => {
            for (let attempt = 0; attempt < 5; attempt++) {
                await page.evaluate(() => {
                    let container = document.querySelector('[data-chat-index]')?.parentElement;
                    while (container && !/auto|scroll/.test(getComputedStyle(container).overflowY))
                        container = container.parentElement;
                    if (!container) throw new Error('Chat scroll container missing');
                    container.scrollTop = 0; container.dispatchEvent(new Event('scroll'));
                });
                await page.waitForTimeout(500);
                if (await page.locator('[data-chat-index="0"]').count()) break;
            }
            await page.waitForFunction(() => {
                const card = document.querySelector('[data-chat-index="0"] .generated-image-card');
                return card && ['history', 'done', 'frozen', 'failed'].includes(card.dataset.imageJobState);
            });
        };
        const oldImage = () => page.locator('[data-chat-index="0"] .generated-image-card').first();
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
        await page.evaluate(async () => {
            __qa.imageApi.add();
            for (const [name, value] of Object.entries({ protocol: 'openai', url: 'https://history-images.test/v1',
                model: 'fixture-image', key: 'TEST_ONLY', size: '1024x1024' })) __qa.imageApi.update(name, value);
            await __qa.imageApi.flush();
            __qa.settings.freezeGeneratedImagesExplicit = true;
            __qa.settings.freezeGeneratedImages = true;
            __qa.characters = [{ uuid: 'history-scroll-test', name: 'History fixture', first_mes: '',
                worldInfo: [], regexScripts: [], uiTemplates: [], avatar: 'assets/images/chenyue/welcome.webp' }];
            await RPHubStorage.saveCharacterLibrary(__qa.characters);
            await RPHubStorage.setScopedStoredValue('chat', 'history-scroll-test', Array.from({ length: 40 }, (_, i) => ({
                id: `history-${i}`, role: 'assistant', shouldAnimate: false,
                content: i ? `Stored message ${i}. ` + 'Existing text. '.repeat(30)
                    : 'Old illustration: image###silver tree, historical illustration###'
            })));
            await __qa.selectCharacter(0);
            __qa.worldInfo.find(item => item.comment === '自动生图').enabled = true;
            __qa.navigateWorkspace('chat'); __qa.toasts = [];
        });
        await page.waitForFunction(() => document.querySelector('[data-chat-index="39"]'));
        assert.equal(await page.locator('[data-chat-index="0"]').count(), 0);
        assert.equal(posts.length, 0);
        await revealHistory();
        assert.equal(posts.length, 0, 'Scrolling to a stored image without a local copy must not create a billable request');
        assert.equal(await oldImage().getAttribute('data-image-job-state'), 'history');
        // Continuing an old message may add a new image, but must not regenerate its existing token.
        await page.evaluate(() => {
            __qa.chatHistory[0].content += '\nimage###new tree, continuation illustration###';
        });
        await page.waitForFunction(() =>
            document.querySelectorAll('[data-chat-index="0"] .generated-image-card')[1]?.dataset.imageJobState === 'done');
        assert.equal(posts.length, 1);
        assert.match(posts[0].prompt, /continuation illustration/);
        assert.equal(await oldImage().getAttribute('data-image-job-state'), 'history');
        // The user can explicitly generate the missing historical image.
        await oldImage().getByRole('button', { name: '重新生成图片', exact: true }).click();
        await page.waitForFunction(() =>
            document.querySelector('[data-chat-index="0"] .generated-image-card')?.dataset.imageJobState === 'frozen');
        assert.equal(posts.length, 2, 'One explicit historical reroll must submit once');
        assert.match(posts[1].prompt, /historical illustration/);
        await page.waitForFunction(() =>
            document.querySelector('[data-chat-index="0"] .generated-image-card img')?.naturalWidth > 0);
        await page.evaluate(async () => {
            __qa.chatHistory.push({ id: 'new-reply', role: 'assistant',
                content: 'New reply image###fresh tree, current reply illustration###' });
            await Vue.nextTick();
        });
        await page.waitForFunction(() =>
            document.querySelector('[data-chat-index="40"] .generated-image-card')?.dataset.imageJobState === 'done');
        assert.equal(posts.length, 3, 'New replies must retain automatic generation');
        await page.evaluate(async () => {
            await RPHubStorage.setScopedStoredValue('chat', 'history-scroll-test',
                RPHubStorage.cloneForStorage(__qa.chatHistory));
            await RPLocalStore.flush();
            __qa.navigateWorkspace('characters');
        });
        await page.reload(); await ready();
        await page.evaluate(async () => { await __qa.selectCharacter(0); __qa.navigateWorkspace('chat'); });
        await revealHistory();
        assert.equal(posts.length, 3, 'Reopening stored history must reuse existing images');
        assert.equal(await oldImage().getAttribute('data-image-job-state'), 'frozen');
        assert.deepEqual(errors, []);
        console.log('PASS stored history scroll/reload without generation, explicit reroll once, continuation and new replies');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
