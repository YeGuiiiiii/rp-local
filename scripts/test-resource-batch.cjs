const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
        await context.addInitScript(require('./mock-files.cjs'));
        await context.route('**/*', route => {
            const url = new URL(route.request().url()), file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            return url.origin === 'https://sta1n156.github.io' && file.startsWith(web + path.sep) && fs.existsSync(file)
                ? route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' })
                : route.abort();
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async () => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false; __qa.closeAnnouncement();
            __qa.characters = [{ uuid: 'batch-card', name: '批量测试', first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await __qa.selectCharacter(0);
        });
        for (const [view, label, field, titleKey] of [
            ['worldinfo', '世界书', 'worldInfo', 'comment'], ['regex', '正则', 'regexScripts', 'name']
        ]) {
            await page.evaluate(({ view, field, titleKey }) => {
                __qa[field] = Array.from({ length: 125 }, (_, index) => ({
                    [titleKey]: index < 2 ? '同名条目' : '条目' + index, scope: index === 1 ? 'global' : 'character',
                    keys: [], content: '正文' + index, regex: 'fixture', replacement: '正文', enabled: true
                }));
                __qa.navigateWorkspace(view);
            }, { view, field, titleKey });
            const list = page.locator('#' + view + '-list'), checkboxes = list.locator('.resource-select input');
            await page.getByRole('button', { name: '批量删除' + label, exact: true }).click();
            assert.equal(await page.locator('.resource-batch-actions button').count(), 2);
            assert.equal(await checkboxes.count(), view === 'worldinfo' ? 100 : 125);
            const first = checkboxes.first();
            const box = await first.locator('..').boundingBox();
            assert.ok(box.width >= 44 && box.height >= 44, 'Selection needs a full touch target');
            await first.check();
            const secondRow = list.locator('[data-resource-index="0"]');
            await secondRow.locator('.resource-select input').check();
            assert.equal(await list.locator('.resource-select input:checked').count(), 2);
            const output = path.join(root, '.impeccable/review/resource-batch');
            fs.mkdirSync(output, { recursive: true });
            for (const skin of ['classic', 'chenyue', 'winter']) {
                for (const mode of ['day', 'night']) {
                    for (const width of [360, 1280]) {
                        await page.setViewportSize({ width, height: 844 });
                        await page.evaluate(({ skin, mode }) => {
                            RPThemePacks.set(skin); RPThemePacks.setMode(mode); __qa.toasts = [];
                        }, { skin, mode });
                        const header = page.locator('.resource-management .settings-page-header');
                        assert.ok(await header.getByRole('button', { name: '删除所选' + label, exact: true }).isVisible());
                        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
                        assert.equal(await list.locator('.resource-select input:checked').count(), 2);
                        await page.screenshot({ path: path.join(output, `${view}-${skin}-${mode}-${width}.png`), animations: 'disabled' });
                    }
                }
            }
            await page.setViewportSize({ width: 390, height: 844 });
            await secondRow.getByRole('button', { name: '查看同名条目', exact: true }).click();
            assert.equal(await page.evaluate(view => view === 'worldinfo' ? __qa.showWorldInfoEditor : __qa.showRegexEditor, view), true);
            await page.evaluate(view => { if (view === 'worldinfo') __qa.showWorldInfoEditor = false; else __qa.showRegexEditor = false; }, view);
            assert.equal(await list.locator('.resource-select input:checked').count(), 2);
            // A ghost click after a pan must neither open an editor nor toggle selection.
            for (const target of [secondRow.locator('.resource-select input'), secondRow.locator('.resource-open')]) {
                await target.evaluate(node => {
                    const options = { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: 80, clientY: 200 };
                    node.dispatchEvent(new PointerEvent('pointerdown', options));
                    node.dispatchEvent(new PointerEvent('pointermove', { ...options, clientY: 150 }));
                    node.dispatchEvent(new PointerEvent('pointercancel', options));
                    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
                });
            }
            assert.equal(await list.locator('.resource-select input:checked').count(), 2);
            assert.equal(await page.evaluate(() => __qa.showWorldInfoEditor || __qa.showRegexEditor), false);
            const beforeScroll = await list.evaluate(node => node.closest('.management-view').scrollTop);
            const cdp = await context.newCDPSession(page);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 175, y: 650 }] });
            for (let y = 620; y >= 300; y -= 40)
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 175, y }] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await page.waitForFunction(({ view, before }) => document.getElementById(view + '-list').closest('.management-view').scrollTop > before, { view, before: beforeScroll });
            assert.equal(await page.evaluate(() => __qa.showWorldInfoEditor || __qa.showRegexEditor), false);
            await page.getByRole('button', { name: '删除所选' + label, exact: true }).click();
            assert.match(await page.evaluate(() => __qa.globalConfirmModal.message), /2/);
            await page.evaluate(() => __qa.globalConfirmModal.onCancel());
            assert.equal(await page.evaluate(field => __qa[field].length, field), 125);
            await page.getByRole('button', { name: '删除所选' + label, exact: true }).click();
            await page.evaluate(() => __qa.globalConfirmModal.onConfirm());
            await page.waitForFunction(field => __qa[field].length === 123, field);
            assert.equal(await page.evaluate(({ field, titleKey }) => __qa[field].some(item => item[titleKey] === '同名条目'), { field, titleKey }), false);
            await page.getByRole('button', { name: '全选' + label, exact: true }).click();
            assert.match(await page.locator('.resource-batch-status').innerText(), /123/);
            await page.getByRole('button', { name: '全不选' + label, exact: true }).click();
            assert.equal(await list.locator('.resource-select input:checked').count(), 0);
            await page.getByRole('button', { name: '全选' + label, exact: true }).click();
            await page.getByRole('button', { name: '删除所选' + label, exact: true }).click();
            await page.evaluate(() => __qa.globalConfirmModal.onConfirm());
            await page.waitForFunction(field => __qa[field].length === 0, field);
            assert.equal(await list.locator('.sortable-list-item').count(), 0);
            await page.evaluate(() => __qa.shellGoBack());
            assert.equal(await page.evaluate(() => __qa.currentView), view);
            assert.equal(await checkboxes.count(), 0);
        }
        assert.equal(await page.evaluate(() => __qa.characters[0].worldInfo.length + __qa.characters[0].regexScripts.length), 0);
        assert.deepEqual(errors, []);
        console.log('Worldbook/regex bulk selection, hidden rows, duplicates, cancel/confirm, viewing and touch scroll passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
