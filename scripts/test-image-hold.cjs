const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, '.impeccable/review/image-hold-2.9.013');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true });
        await context.addInitScript(installFiles);
        await context.addInitScript(() => {
            window.__saves = [];
            window.AndroidBridge = { isNativeApp: () => true,
                saveImageToGallery: (bytes, name, type) => __saves.push({ bytes: bytes.length, name, type }) };
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname === 'story.test') return route.fulfill({ path: path.join(root, 'dist/app-icon.png'), contentType: 'image/png' });
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
                '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
        });
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async () => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false; __qa.showAnnouncement = false;
            __qa.characters = [{ uuid: 'image-hold', name: '图片操作测试', avatar: 'assets/images/chenyue/welcome.webp',
                first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await __qa.selectCharacter(0);
            __qa.chatHistory = [{ id: 'hold-message', role: 'assistant', shouldAnimate: false, content:
                '<div class="generated-image-card"><img src="https://story.test/one.png" alt="测试生成图片" style="width:100%;max-height:300px;object-fit:contain"></div>' }];
            __qa.userInput = '保留这条草稿'; __qa.toasts = [];
        });
        const image = page.locator('.message-content-wrapper .generated-image-card img').first();
        await expectLoaded(image);
        assert.equal(await page.locator('.generated-image-card .rphub-image-save-btn').count(), 0,
            'Generated pictures must have no corner download target');
        const sheet = page.getByRole('dialog', { name: '下载这张图片？', exact: true });
        const begin = async () => {
            const box = await image.boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
        };
        const hold = async () => { await begin(); await page.waitForTimeout(650); await page.mouse.up(); await sheet.waitFor(); };
        const saves = () => page.evaluate(() => __saves.length);
        await image.click();
        assert.equal(await sheet.count(), 0);
        assert.equal(await saves(), 0);
        await begin(); await page.waitForTimeout(150); await page.mouse.up();
        assert.equal(await sheet.count(), 0);
        await begin(); await page.mouse.move(30, 110); await page.waitForTimeout(650); await page.mouse.up();
        assert.equal(await sheet.count(), 0, 'A scroll gesture must cancel the hold');
        await begin();
        await image.dispatchEvent('pointercancel', { pointerId: 1 });
        await page.waitForTimeout(650); await page.mouse.up();
        assert.equal(await sheet.count(), 0);
        const touch = await context.newCDPSession(page);
        const bounds = await image.boundingBox();
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
            { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }] });
        await page.waitForTimeout(650);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await sheet.waitFor();
        await page.getByRole('button', { name: '取消', exact: true }).click();
        await sheet.waitFor({ state: 'hidden' });
        await image.evaluate(el => el.closest('.generated-image-card').classList.add('is-generating'));
        await begin(); await page.waitForTimeout(650); await page.mouse.up();
        assert.equal(await sheet.count(), 0, 'An unfinished image must not offer downloads');
        await image.evaluate(el => el.closest('.generated-image-card').classList.remove('is-generating'));
        for (const skin of ['classic', 'chenyue', 'winter']) {
            for (const mode of ['day', 'night']) {
                await page.evaluate(({ skin, mode }) => { RPThemePacks.set(skin); RPThemePacks.setMode(mode); }, { skin, mode });
                for (const width of [390, 1280]) {
                    await page.setViewportSize({ width, height: 844 });
                    await expectLoaded(image);
                    await hold();
                    assert.equal(await saves(), 0, 'Opening confirmation must not save');
                    const geometry = await sheet.evaluate(el => {
                        const box = el.getBoundingClientRect(), backdrop = getComputedStyle(el, '::backdrop');
                        return { bottom: box.bottom, right: box.right, left: box.left, height: innerHeight,
                            width: innerWidth, shade: backdrop.backgroundColor };
                    });
                    assert.ok(Math.abs(geometry.bottom - geometry.height) <= 1, JSON.stringify(geometry));
                    assert.ok(geometry.left >= 0 && geometry.right <= geometry.width + 1);
                    assert.match(geometry.shade, /rgba\(0, 0, 0, 0\.[3-6]\)/);
                    await page.screenshot({ path: path.join(output, `${skin}-${mode}-${width}.png`), animations: 'disabled' });
                    await page.mouse.click(10, 80);
                    await sheet.waitFor({ state: 'hidden' });
                    assert.equal(await page.evaluate(() => __qa.currentView), 'chat');
                }
            }
        }
        await hold();
        await page.getByRole('button', { name: '取消', exact: true }).click();
        await sheet.waitFor({ state: 'hidden' });
        await hold(); await page.keyboard.press('Escape'); await sheet.waitFor({ state: 'hidden' });
        await image.focus();
        await page.keyboard.press('Enter');
        await sheet.waitFor();
        await page.keyboard.press('Escape');
        await sheet.waitFor({ state: 'hidden' });
        await hold();
        assert.equal(await page.evaluate(() => rphubHandleBack()), true);
        await sheet.waitFor({ state: 'hidden' });
        assert.equal(await page.evaluate(() => __qa.currentView), 'chat');
        await hold();
        await page.getByRole('button', { name: '下载图片', exact: true }).click();
        await sheet.waitFor({ state: 'hidden' });
        await page.waitForFunction(() => __saves.length === 1);
        assert.equal(await page.evaluate(() => __qa.userInput), '保留这条草稿');
        assert.equal(await saves(), 1);
        assert.deepEqual(errors, []);
        console.log('PASS long hold only, movement/cancel, confirmation before saving, dismiss/back and all six skin colors');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

async function expectLoaded(image) {
    await image.waitFor();
    await image.evaluate(async el => { await el.decode(); });
}
