const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/online-gesture-1.15');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.addInitScript(bridge);
    const page = await context.newPage(), errors = [], screenshots = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (['rphforum.zeabur.app', 'wxdt.duckdns.org'].includes(url.hostname))
            return route.fulfill({ contentType: 'text/html', body: '<!doctype html><h1>Online fixture</h1>' });
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    const cdp = await context.newCDPSession(page);
    const center = async locator => {
        const box = await locator.boundingBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const touch = (type, point) => cdp.send('Input.dispatchTouchEvent', {
        type, touchPoints: point ? [{ ...point, id: 1 }] : []
    });
    const trigger = () => page.getByRole('button', { name: '在线入口', exact: true });
    const dialog = () => page.getByRole('dialog', { name: '在线入口', exact: true });
    const option = name => dialog().getByRole('button', { name, exact: true });
    async function closed(view = 'settings') {
        await dialog().waitFor({ state: 'detached' });
        assert.equal(await page.evaluate(() => __qa.currentView), view);
        assert.equal(await page.evaluate(() => __qa.onlineOpen), false);
    }
    async function hold() {
        const point = await center(trigger());
        await touch('touchStart', point);
        await page.waitForTimeout(420);
        await dialog().waitFor();
        await page.waitForTimeout(200);
        return point;
    }
    async function capture(name) {
        await page.screenshot({ path: path.join(output, name + '.png') });
        screenshots.push(name);
    }
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.navigateWorkspace('settings');
            window.__onlineCalls = [];
            window.AndroidBridge = { openLighthouse: url => __onlineCalls.push(url) };
        });
        await page.waitForTimeout(220);
        // A quick touch remains a normal click; all targets remain keyboard/click accessible.
        await trigger().tap();
        await dialog().waitFor();
        const mask = await page.locator('.shell-online-mask').boundingBox();
        assert.deepEqual(mask, { x: 0, y: 0, width: 390, height: 844 });
        assert.equal(await page.locator('.app-main').evaluate(el => el.inert), true);
        for (const name of ['灯塔', '万象广场']) {
            const point = await center(option(name)), anchor = await center(trigger());
            assert.ok(point.x < anchor.x && point.y < anchor.y, name + ' is above and left of the trigger');
            assert.equal(await option(name).evaluate(el => getComputedStyle(el).borderRadius), '50%');
        }
        await page.keyboard.press('Escape'); await closed();
        // Releasing before the hold threshold does not start a late long press.
        await trigger().tap();
        await page.waitForTimeout(450);
        await option('灯塔').tap(); await closed();
        assert.equal(await page.evaluate(() => __onlineCalls.length), 1);
        // Real touch capture keeps delivering moves and release after the global mask appears.
        await hold();
        await touch('touchMove', await center(option('灯塔')));
        await page.waitForFunction(() => document.querySelector('.shell-online-choice.is-target')?.getAttribute('aria-label') === '灯塔');
        await capture('touch-lighthouse-selected-day-390');
        assert.equal(await page.evaluate(() => __onlineCalls.length), 1, 'Moving onto a choice must wait for release');
        await touch('touchEnd'); await closed();
        assert.equal(await page.evaluate(() => __onlineCalls.length), 2);
        await hold();
        await touch('touchMove', await center(option('万象广场')));
        await page.waitForFunction(() => document.querySelector('.shell-online-choice.is-target')?.getAttribute('aria-label') === '万象广场');
        await touch('touchEnd'); await closed('square');
        await page.evaluate(() => window.rphubHandleBack());
        assert.equal(await page.evaluate(() => __qa.currentView), 'settings', 'Online page returns to the caller');
        await hold(); await touch('touchMove', { x: 35, y: 100 }); await touch('touchEnd'); await closed();
        await hold(); await touch('touchMove', await center(option('灯塔')));
        await touch('touchCancel'); await closed();
        assert.equal(await page.evaluate(() => __onlineCalls.length), 2, 'Cancelled gestures must not navigate');
        await hold();
        assert.equal(await page.evaluate(() => window.rphubHandleBack()), true);
        await touch('touchEnd'); await closed();
        await page.waitForTimeout(450); await closed();
        // Moving off the trigger before activation cancels, without swallowing the next tap.
        const start = await center(trigger());
        await touch('touchStart', start);
        await touch('touchMove', { x: start.x - 26, y: start.y - 16 });
        await page.waitForTimeout(450);
        assert.equal(await dialog().count(), 0);
        await touch('touchEnd'); await closed();
        await trigger().tap(); await dialog().waitFor();
        await page.mouse.click(20, 20); await closed();
        // Mouse hold and keyboard activation use the same choices.
        const mouseStart = await center(trigger());
        await page.mouse.move(mouseStart.x, mouseStart.y); await page.mouse.down();
        await page.waitForTimeout(580);
        const destination = await center(option('灯塔'));
        await page.mouse.move(destination.x, destination.y); await page.mouse.up(); await closed();
        assert.equal(await page.evaluate(() => __onlineCalls.length), 3);
        await trigger().focus(); await page.keyboard.press('Enter');
        await dialog().waitFor();
        assert.equal(await page.getByRole('button', { name: '关闭在线入口', exact: true }).evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await closed();
        assert.equal(await page.evaluate(() => __onlineCalls.length), 4);
        for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 900 }, { width: 740, height: 360 }]) {
            await page.setViewportSize(viewport);
            for (const theme of ['journal', 'vampire']) {
                await page.evaluate(theme => RPThemePacks.set(theme), theme);
                await page.waitForTimeout(220);
                await trigger().tap(); await dialog().waitFor(); await page.waitForTimeout(220);
                const anchor = await center(trigger());
                for (const name of ['灯塔', '万象广场']) {
                    const box = await option(name).boundingBox();
                    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height + 25 <= viewport.height);
                    assert.ok(box.x + box.width / 2 < anchor.x && box.y + box.height / 2 < anchor.y);
                }
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                assert.equal(await page.getByRole('button', { name: '关闭在线入口', exact: true }).evaluate(el => getComputedStyle(el).borderRadius), '50%');
                await capture(`${theme}-radial-${viewport.width}`);
                await page.keyboard.press('Escape'); await closed();
            }
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await trigger().tap(); await dialog().waitFor(); await page.waitForTimeout(150);
        assert.equal(await option('灯塔').evaluate(el => getComputedStyle(el).transform), 'none');
        await page.setViewportSize({ width: 390, height: 844 }); await closed();
        // A system pointer cancellation after resize cannot reopen or navigate.
        await hold();
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await touch('touchEnd'); await closed();
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
            longPress360ms: true, realTouchDragAndRelease: true, hoverHighlight: true, fullViewportDim: true,
            blankReleaseCancels: true, pointerCancel: true, nativeBackWhileHeld: true, earlyMovementCancels: true,
            tapAndKeyboard: true, mouseDrag: true, returnToCaller: true, dayNight: true,
            resizeAndBlurCleanup: true, reducedMotion: true, screenshots, errors
        }, null, 2));
        console.log('Long-press touch/mouse drag, cancellation, keyboard, back navigation and responsive radial layout passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
