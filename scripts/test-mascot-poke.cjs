const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/mascot-poke-1.14');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(bridge);
    const page = await context.newPage(), errors = [], missing = [], remote = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://sta1n156.github.io') { remote.push(url.href); return route.abort(); }
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
            missing.push(url.pathname); return route.fulfill({ status: 404, body: '' });
        }
        return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    const speech = () => page.locator('.yy-mascot-speech:not(.yy-speech-leave-active)');
    const mascot = () => page.getByRole('button', { name: '戳戳玥玥', exact: true }).filter({ visible: true });
    const screenshots = [];
    async function bounds(name) {
        await page.waitForFunction(() => [...document.images].filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight;
        }).every(img => img.complete && img.naturalWidth));
        const rect = await speech().boundingBox(), size = page.viewportSize();
        assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= size.width && rect.y + rect.height <= size.height, name);
        assert.equal(await speech().evaluate(el => getComputedStyle(el).pointerEvents), 'none');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, name + '.png') });
        screenshots.push(name);
    }
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
        });
        await speech().waitFor();
        assert.match(await speech().textContent(), /来啦|等到|我在呢/);
        await page.waitForTimeout(1800);
        assert.equal(await page.locator('.yy-mascot-speech').count(), 0);
        await page.evaluate(() => __qa.navigateWorkspace('settings'));
        await page.waitForTimeout(250);
        const before = await mascot().boundingBox();
        await mascot().click();
        assert.equal(await speech().textContent(), '甭戳啦~ 脸要肿啦 ~');
        assert.match(await mascot().locator('img').getAttribute('src'), /chenyue\/poke-pout.webp$/);
        assert.ok(await mascot().locator('img').evaluate(el => el.getAnimations().length > 0));
        await bounds('settings-day-first-390');
        assert.deepEqual(await mascot().boundingBox(), before);
        await mascot().click();
        assert.equal(await speech().textContent(), '再戳我要咬你了！');
        assert.match(await mascot().locator('img').getAttribute('src'), /poke-angry.webp$/);
        await bounds('settings-day-angry-390');
        await page.waitForTimeout(1100);
        assert.equal(await speech().count(), 1, 'Speech remains readable for at least one second');
        await page.waitForTimeout(700);
        assert.equal(await page.locator('.yy-mascot-speech').count(), 0, 'Speech disappears within two seconds');
        assert.match(await mascot().locator('img').getAttribute('src'), /chenyue\/peek.webp$/);
        const lines = [];
        for (let i = 0; i < 6; i++) { await mascot().click(); lines.push(await speech().textContent()); }
        assert.equal(new Set(lines).size, 6);
        assert.ok(lines.includes('手掌摊开给我看看。'));
        assert.ok(lines.some(text => /设置|慢慢挑/.test(text)), 'Settings uses its page-specific library');
        assert.equal(await page.locator('.yy-mascot-speech:not(.yy-speech-leave-active)').count(), 1);
        await page.evaluate(() => __qa.navigateWorkspace('album'));
        await page.waitForTimeout(220);
        assert.equal(await page.locator('.yy-mascot-speech').count(), 0);
        await mascot().click();
        assert.equal(await speech().textContent(), '甭戳啦~ 脸要肿啦 ~', 'Each page has its own poke sequence');
        await page.evaluate(() => __qa.navigateWorkspace('characters'));
        await page.waitForTimeout(220);
        assert.equal(await page.locator('.yy-mascot-speech').count(), 0, 'Hidden gallery clears its bubble');
        await mascot().click();
        assert.equal(await speech().textContent(), '甭戳啦~ 脸要肿啦 ~');
        await page.evaluate(() => __qa.navigateWorkspace('advanced'));
        await mascot().focus();
        await page.keyboard.press('Enter');
        assert.equal(await speech().textContent(), '甭戳啦~ 脸要肿啦 ~');
        await page.keyboard.press('Space');
        assert.equal(await speech().textContent(), '再戳我要咬你了！');
        await page.evaluate(() => RPThemePacks.set('vampire'));
        await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--yy-paper').trim() === '#211d23');
        assert.match(await mascot().locator('img').getAttribute('src'), /vampire\/poke-angry.webp$/);
        await bounds('advanced-night-angry-390');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await mascot().click();
        assert.equal(await mascot().locator('img').evaluate(el => el.getAnimations().length), 0);
        const networkBefore = remote.length;
        for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 900 }, { width: 740, height: 360 }]) {
            await page.setViewportSize(viewport);
            await page.evaluate(() => { __qa.navigateWorkspace('chat'); __qa.isNavigationOpen = true; });
            await mascot().click();
            await bounds('menu-night-' + viewport.width);
            await page.getByRole('button', { name: '切换到日间模式', exact: true }).click();
            await mascot().click();
            await bounds('menu-day-' + viewport.width);
            await page.getByRole('button', { name: '关闭聊天菜单', exact: true }).click();
            await page.waitForTimeout(220);
            assert.equal(await page.locator('.yy-mascot-speech').count(), 0);
            await page.evaluate(() => RPThemePacks.set('vampire'));
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => __qa.navigateWorkspace('settings'));
        await mascot().click();
        assert.notEqual(await speech().textContent(), '甭戳啦~ 脸要肿啦 ~', 'Counters survive page remounts');
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(220);
        assert.equal(await page.locator('.yy-mascot-speech').count(), 0);
        assert.equal(await page.locator('.yy-poke-mascot .rphub-img-save-btn,.yy-poke-mascot .rphub-image-save-btn').count(), 0);
        assert.equal(await mascot().locator('img').evaluate(img => RPImagePolicy.isContentImage(img)), false);
        assert.equal(remote.length, networkBefore, 'Poking does not make external requests');
        assert.deepEqual(errors, []); assert.deepEqual(missing, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
            firstTwoLines: true, localPageDecks: true, launchGreeting: true, autoDismissUnder2Seconds: true,
            noStacking: true, dayNightExpressions: true, keyboard: true, reducedMotion: true,
            navigationCleanup: true, noContentImageActions: true, screenshots, errors, missing
        }, null, 2));
        console.log('Mascot dialogue, expressions, expiry, keyboard, themes, mobile/desktop and cleanup passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
