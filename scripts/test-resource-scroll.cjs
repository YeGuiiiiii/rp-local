const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/resource-scroll-1.17');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.addInitScript(bridge);
    const page = await context.newPage(), errors = [], report = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    const cdp = await context.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
        type, touchPoints: x === undefined ? [] : [{ x, y, id: 1 }]
    });
    async function swipe(x, from, to, duration = 240) {
        await touch('touchStart', x, from);
        for (let i = 1; i <= 12; i++) {
            await touch('touchMove', x, from + (to - from) * i / 12);
            await page.waitForTimeout(duration / 12);
        }
        await touch('touchEnd');
        await page.waitForTimeout(300);
    }
    async function state() {
        return page.evaluate(() => {
            const list = document.getElementById('regex-list'), page = list.closest('.management-view');
            const rect = el => el.getBoundingClientRect().toJSON();
            return {
                rows: list.children.length, scrollTop: page.scrollTop, clientHeight: page.clientHeight, scrollHeight: page.scrollHeight,
                page: rect(page), list: rect(list), main: rect(page.parentElement),
                overflowY: getComputedStyle(page).overflowY, minHeight: getComputedStyle(page).minHeight,
                touchAction: getComputedStyle(list).touchAction, last: rect(list.lastElementChild),
                inert: page.parentElement.inert,
                sortable: !!Sortable.get(list), touchHandle: getComputedStyle(list.querySelector('.sortable-list-handle')).touchAction,
                order: [...list.querySelectorAll('h3')].slice(0, 6).map(el => el.textContent.trim())
            };
        });
    }
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.regexScripts = Array.from({ length: 50 }, (_, i) => ({
                name: '滚动检查脚本 ' + (i + 1), regex: '/test/g', replacement: 'text',
                enabled: true, placement: [2], scope: 'character'
            }));
            __qa.navigateWorkspace({ view: 'regex', scope: 'character' });
        });
        await page.waitForTimeout(300);
        for (const theme of ['journal', 'vampire']) {
            await page.evaluate(theme => RPThemePacks.set(theme), theme);
            await page.waitForTimeout(240);
            await page.locator('#regex-list').evaluate(el => { el.closest('.management-view').scrollTop = 0; });
            const initial = await state();
            await swipe(190, 650, 250);
            const afterTouch = await state();
            await page.waitForTimeout(800);
            await page.locator('#regex-list').evaluate(el => { el.closest('.management-view').scrollTop = 0; });
            await page.waitForTimeout(100);
            assert.equal((await state()).scrollTop, 0, 'Touch inertia has stopped before the wheel check');
            await page.mouse.move(190, 550); await page.mouse.wheel(0, 500); await page.waitForTimeout(200);
            const afterWheel = await state();
            await page.locator('#regex-list').evaluate(el => { el.closest('.management-view').scrollTop = el.scrollHeight; });
            const bottom = await state();
            assert.ok(afterTouch.scrollTop > 100, 'Touch swipes scroll the list');
            assert.deepEqual(afterTouch.order, initial.order, 'Normal scrolling must not reorder scripts');
            assert.ok(afterWheel.scrollTop > 0, 'Mouse wheel scrolls the list');
            assert.ok(bottom.page.bottom <= bottom.main.bottom + 1, 'List viewport fits beneath the character context');
            assert.ok(bottom.last.bottom <= bottom.main.bottom - 10, 'The final script and its buttons remain reachable');
            await page.screenshot({ path: path.join(output, theme + '-bottom.png') });
            report.push({ theme, initial, afterTouch, afterWheel, bottom });
        }
        await page.locator('#regex-list').evaluate(el => { el.closest('.management-view').scrollTop = 0; });
        const beforeSort = await state();
        const handle = await page.locator('#regex-list .sortable-list-handle').nth(1).boundingBox();
        await swipe(handle.x + handle.width / 2, handle.y + handle.height / 2, handle.y + handle.height / 2 + 160, 360);
        const afterSort = await state();
        assert.notDeepEqual(afterSort.order, beforeSort.order, 'Dragging the handle still reorders scripts');
        const boundaries = [];
        for (const viewport of [{ width: 360, height: 640 }, { width: 740, height: 360 }, { width: 1280, height: 900 }]) {
            await page.setViewportSize(viewport);
            for (const count of [10, 50]) {
                await page.evaluate(count => {
                    __qa.regexScripts = Array.from({ length: count }, (_, i) => ({
                        name: '脚本 ' + (i + 1), regex: '/test/g', replacement: 'text', enabled: true, scope: 'character'
                    }));
                }, count);
                await page.locator('#regex-list').evaluate(el => { el.closest('.management-view').scrollTop = el.scrollHeight; });
                const bottom = await state();
                assert.ok(bottom.last.bottom <= viewport.height - 10, `${viewport.width}px / ${count} scripts`);
                boundaries.push({ viewport, count, lastBottom: bottom.last.bottom, pageBottom: bottom.page.bottom });
            }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        const sharedPages = [];
        for (const view of ['worldinfo', 'uitemplates', 'memory']) {
            await page.evaluate(view => __qa.navigateWorkspace(view), view);
            await page.waitForTimeout(200);
            const geometry = await page.locator('.app-main > .management-view:visible').evaluate(el => ({
                bottom: el.getBoundingClientRect().bottom, clientHeight: el.clientHeight
            }));
            assert.ok(geometry.bottom <= 845, view + ' fits below the context bar');
            sharedPages.push({ view, ...geometry });
        }
        assert.deepEqual(errors, []);
        const result = { report, beforeSort, afterSort, boundaries, sharedPages, errors, actualAndroidTested: false };
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(result, null, 2));
        console.log('Regex touch/wheel scrolling, last-row reachability, drag sorting and shared page heights passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
