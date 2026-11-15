const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, '.impeccable/review/update-notice-2.9.111');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [];
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        await context.addInitScript(require('./mock-files.cjs'));
        await context.addInitScript(() => {
            window.__qaFreshInstall = true;
            window.__updateNative = { phase: 'idle' };
            window.__updateDownloads = [];
            window.RPLocalUpdates = {
                state: () => JSON.stringify(__updateNative),
                download: text => {
                    __updateDownloads.push(JSON.parse(text));
                    __updateNative = { phase: 'downloading', progress: 40 };
                },
                install: () => { window.__updateInstall = true; }
            };
        });
        let version = '2.9.599', code = 999, failure = false, imageFailure = false;
        let notes = '修复角色卡导入，改善备份与阅读体验。\n\n' + '这是一段供验证的较长更新说明，弹窗内滚动时按钮仍然可见。\n'.repeat(12);
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname === '121.40.147.125') return route.fulfill({ status: failure ? 503 : 200, json: {
                schema: 1, channel: 'stable', packageName: 'com.rphub.local',
                versionCode: code, versionName: version, size: 1234, sha256: 'a'.repeat(64),
                url: `https://121.40.147.125/updates/stable/RP-local-${version}.apk`, notes
            } });
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            if (imageFailure && url.pathname.includes('/images/updates/')) return route.fulfill({ status: 404, body: '' });
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.css': 'text/css',
                '.html': 'text/html', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        const popup = page.getByRole('dialog', { name: '发现新版本', exact: true });
        const close = () => popup.getByRole('button', { name: '关闭更新提醒' }).click();
        async function load() {
            await page.goto('https://sta1n156.github.io/RP-Hub/');
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => { window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState; });
        }
        await load();
        await page.waitForFunction(() => RPUpdates.state.latest);
        assert.equal(await popup.isVisible(), false, 'User setup must finish before the new-version popup');
        await page.evaluate(() => { __qa.showUserSetupModal = false; });
        await page.getByRole('button', { name: '关闭更新公告' }).click();
        await popup.waitFor();
        assert.ok((await popup.innerText()).includes('2.9.599'));
        assert.equal(await popup.getByRole('region', { name: '新版更新内容' }).count(), 0, 'The small popup does not contain release notes');
        assert.ok(!(await popup.innerText()).includes('修复角色卡导入'), 'Release notes stay in Settings');
        assert.equal(await page.evaluate(() => __updateDownloads.length), 0);
        assert.equal(await popup.getByRole('button', { name: '关闭更新提醒' }).evaluate(el => el === document.activeElement), true);
        await close();
        assert.equal(await popup.isVisible(), false);
        assert.equal(await page.evaluate(() => __updateDownloads.length), 0, 'Closing must leave downloads untouched');
        await page.reload();
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => { window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState; __qa.showUserSetupModal = false; __qa.closeAnnouncement(); });
        assert.equal(await popup.isVisible(), false, 'Dismissal survives a restart');

        for (const [skin, mode, width, height, mascot] of [
            ['classic', 'day', 360, 800, 'yueyue'],
            ['classic', 'night', 390, 844, 'honghualing'],
            ['vampire', 'day', 390, 844, 'honghualing'],
            ['vampire', 'night', 1280, 900, 'yueyue'],
            ['winter', 'day', 1280, 900, 'honghualing'],
            ['winter', 'night', 360, 800, 'yueyue'],
            ['classic', 'day', 844, 390, 'honghualing']
        ]) {
            await page.setViewportSize({ width, height });
            await page.evaluate(async ({ skin, mode, mascot }) => {
                RPThemePacks.set(skin);
                if (RPThemePacks.mode !== mode) RPThemePacks.toggleMode();
                const random = Math.random;
                Math.random = () => mascot === 'yueyue' ? .1 : .9;
                try { await RPUpdates.check(); } finally { Math.random = random; }
            }, { skin, mode, mascot });
            await popup.waitFor();
            const img = popup.locator('img');
            await img.evaluate(el => el.complete && el.naturalWidth ? Promise.resolve() : new Promise((resolve, reject) => {
                el.onload = resolve; el.onerror = reject;
            }));
            assert.ok((await img.getAttribute('src')).endsWith(mascot + '.webp'), 'Each opening uses one of the two random illustrations');
            assert.equal(await img.evaluate(el => RPImagePolicy.isContentImage(el)), false, 'Software illustrations are excluded from player downloads');
            const box = await popup.boundingBox();
            assert.ok(box.width <= 300 && box.height <= 380, 'The reminder is a small popup');
            assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1,
                `${skin}/${mode}/${width}: dialog stays inside viewport`);
            const button = await popup.getByRole('button', { name: '下载更新', exact: true }).boundingBox();
            assert.ok(button.height >= 44 && button.y + button.height <= height, 'Download stays reachable');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.keyboard.press('Shift+Tab');
            assert.equal(await popup.evaluate(el => el.contains(document.activeElement)), true, 'Keyboard focus stays in the modal');
            if (!process.argv.includes('--behavior-only'))
                await page.screenshot({ path: path.join(output, `${skin}-${mode}-${width}-${mascot}.png`) });
            assert.equal(await page.evaluate(() => rphubHandleBack()), true);
            await popup.waitFor({ state: 'hidden' });
        }
        version = '2.10.001'; code = 1000; notes = '这是服务器新发布的版本。';
        await page.evaluate(() => RPUpdates.check());
        await popup.waitFor();
        assert.ok((await popup.innerText()).includes('2.10.001'), 'The popup reads the latest server version, never a bundled version');
        await popup.getByRole('button', { name: '下载更新', exact: true }).click();
        assert.equal(await page.evaluate(() => __updateDownloads.length), 1);
        assert.equal(await page.evaluate(() => __updateDownloads[0].versionName), '2.10.001');
        await page.evaluate(() => { __updateNative = { phase: 'ready', progress: 100 }; });
        await popup.getByRole('button', { name: '安装更新', exact: true }).click();
        assert.equal(await page.evaluate(() => __updateInstall), true);
        await page.keyboard.press('Escape');
        await popup.waitFor({ state: 'hidden' });
        await page.evaluate(() => { __updateNative = { phase: 'idle' }; RPUpdates.state.phase = 'available'; });
        failure = true;
        await page.evaluate(() => RPUpdates.check());
        assert.equal(await popup.isVisible(), false, 'A failed background request never opens a popup');
        assert.equal(await page.evaluate(() => RPUpdates.state.phase), 'error');
        failure = false; imageFailure = true;
        await load();
        await page.evaluate(() => { __qa.showUserSetupModal = false; __qa.closeAnnouncement(); return RPUpdates.check(); });
        await popup.waitFor();
        await page.waitForFunction(() => !!document.querySelector('.update-notice-art > svg'));
        assert.equal(await popup.getByRole('button', { name: '下载更新', exact: true }).isEnabled(), true, 'An image failure does not block updating or closing');
        await close();
        code = 1; version = '1.0';
        await page.evaluate(() => RPUpdates.check());
        assert.equal(await popup.isVisible(), false, 'No popup is shown for older releases');
        if (!process.argv.includes('--behavior-only')) {
            version = '2.9.111'; code = 999;
            notes = '新增新版本提醒，展示最新版本和更新内容。\n\n霓裳玥玥、旗袍红花铃两张 Q 版配图随机出现。\n\n可以直接关闭，点击下载后才开始更新。';
            await page.setViewportSize({ width: 390, height: 844 });
            imageFailure = false;
            for (const mascot of ['yueyue', 'honghualing']) {
                await load();
                await page.evaluate(async mascot => {
                    __qa.showUserSetupModal = false; __qa.closeAnnouncement();
                    RPThemePacks.set('classic');
                    if (RPThemePacks.mode !== 'day') RPThemePacks.toggleMode();
                    const random = Math.random;
                    Math.random = () => mascot === 'yueyue' ? .1 : .9;
                    try { await RPUpdates.check(); } finally { Math.random = random; }
                }, mascot);
                await popup.waitFor();
                await popup.locator('img').evaluate(el => el.complete && el.naturalWidth ? Promise.resolve()
                    : new Promise(resolve => { el.onload = resolve; }));
                await popup.screenshot({ path: path.join(output, 'poster-' + mascot + '.png') });
                await close();
            }
        }
        assert.deepEqual(errors, []);
        console.log('Update popup: startup ordering, close/restart/back/Escape, both random assets, 3 skins/day/night, small size without notes, current server version, download/install, offline and missing-image fallback passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
