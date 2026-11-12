const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/app-updates');
fs.mkdirSync(output, { recursive: true });
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(require('./mock-files.cjs'));
        await context.addInitScript(() => {
            if (!localStorage.getItem('update-fixture')) {
                localStorage.setItem('rp-auto-update', 'false');
                localStorage.setItem('update-fixture', '1');
            }
            window.__updates = { phase: 'idle' };
            window.__updateDownloads = [];
            window.RPLocalUpdates = {
                state: () => JSON.stringify(__updates), isUnmetered: () => true,
                download: json => { __updateDownloads.push(JSON.parse(json)); __updates = { phase: 'downloading', progress: 40 }; },
                install: () => { window.__installRequested = true; }
            };
        });
        let requests = 0, failure = false;
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname === '121.40.147.125') {
                requests++;
                return route.fulfill({ status: failure ? 503 : 200, json: {
                    schema: 1, channel: 'stable', packageName: 'com.rphub.local',
                    versionCode: 999, versionName: '2.9.599', size: 1234, sha256: 'a'.repeat(64),
                    url: 'https://121.40.147.125/updates/stable/RP-local-2.9.599.apk', notes: '供本地验证的更新内容'
                } });
            }
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.css': 'text/css',
                '.html': 'text/html', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        async function ready() {
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false;
                __qa.closeAnnouncement();
                __qa.navigateWorkspace('settings');
            });
        }
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
        assert.equal(requests, 0);
        for (const skin of ['classic', 'vampire', 'winter']) {
            await page.evaluate(skin => RPThemePacks.set(skin), skin);
            for (const width of [390, 1280]) {
                await page.setViewportSize({ width, height: 900 });
                const panel = page.locator('.app-update-controls:visible');
                await panel.waitFor();
                await panel.scrollIntoViewIfNeeded();
                assert.equal(await panel.getByRole('switch', { name: '自动更新' }).isChecked(), false);
                await panel.getByRole('button', { name: '检查更新', exact: true }).click();
                await panel.getByRole('status').filter({ hasText: '发现新版本 2.9.599' }).waitFor();
                assert.equal(await page.evaluate(() => __updateDownloads.length), 0);
                const check = await panel.getByRole('button', { name: '检查更新', exact: true }).boundingBox();
                const download = await panel.getByRole('button', { name: '下载更新', exact: true }).boundingBox();
                assert.ok(Math.abs(check.x + check.width - download.x - download.width) < 1,
                    'Download must align under the check button: ' + skin + '/' + width);
                const placement = await panel.evaluate(element => {
                    if (document.querySelector('.shell-settings-home')) {
                        return !!element.previousElementSibling?.textContent.includes('关于与鸣谢')
                            && element.nextElementSibling?.classList.contains('shell-compat');
                    }
                    return element.previousElementSibling?.textContent.includes('文风过滤')
                        && element.nextElementSibling?.getAttribute('aria-label') === '外观与皮肤';
                });
                assert.equal(placement, true, 'Update controls must use the screenshot placement: ' + skin);
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
                await page.screenshot({ path: path.join(output, `${skin}-${width}.png`) });
            }
        }
        const panel = page.locator('.app-update-controls:visible');
        await panel.locator('label.app-update-toggle').click();
        await page.reload(); await ready();
        assert.equal(await page.locator('.app-update-controls:visible').getByRole('switch', { name: '自动更新' }).isChecked(), true);
        await page.locator('.app-update-controls:visible label.app-update-toggle').click();
        failure = true;
        await page.getByRole('button', { name: '检查更新', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: '更新服务暂时不可用' }).waitFor();
        failure = false;
        await page.getByRole('button', { name: '检查更新', exact: true }).click();
        await page.getByRole('button', { name: '下载更新', exact: true }).click();
        await page.waitForFunction(() => __updateDownloads.length === 1);
        assert.equal(await page.evaluate(() => __updateDownloads[0].automatic), false);
        await page.evaluate(() => { __updates = { phase: 'ready', progress: 100 }; });
        await page.getByRole('button', { name: '安装更新' }).click();
        assert.equal(await page.evaluate(() => __installRequested), true);
        assert.deepEqual(errors, []);
        console.log('Settings update controls: all 3 skins at mobile/desktop, placement, persistence, check/error/download/install passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
