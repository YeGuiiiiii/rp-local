const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const release = Number(fs.readFileSync(path.join(web, 'index.html'), 'utf8').match(/RP_LOCAL_RELEASE = (\d+)/)[1]);
const output = path.join(root, 'verification/announcement-1.10');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [], missing = [], remoteChecks = [], contexts = [];
    async function load({ native = true, previous, reducedMotion = 'no-preference' } = {}) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
        contexts.push(context);
        if (native) await context.addInitScript(installFileBridge);
        await context.addInitScript(({ native, previous }) => {
            window.__qaFreshInstall = true;
            if (previous !== undefined && !sessionStorage.getItem('release-fixture-seeded')) {
                localStorage.setItem(native ? '__qa_release_native' : 'rp-local-release-shown', String(previous));
                sessionStorage.setItem('release-fixture-seeded', '1');
            }
            if (native) {
                const consume = RPLocalFiles.consumeReleaseNotice;
                RPLocalFiles.consumeReleaseNotice = () => {
                    window.__noticeClaims = (window.__noticeClaims || 0) + 1;
                    return consume();
                };
            }
        }, { native, previous });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (/\/v1\/version|announcement\.json|update-check\.js/.test(url.href)) remoteChecks.push(url.href);
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
                if (url.pathname.includes('/assets/')) missing.push(url.pathname);
                return route.fulfill({ status: 404, body: '' });
            }
            return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
        });
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await ready(page);
        return page;
    }
    async function ready(page) {
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => { window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState; });
    }
    async function dismissSetup(page) {
        await page.evaluate(() => { __qa.showUserSetupModal = false; });
    }
    const dialog = page => page.getByRole('dialog', { name: '玥玥的更新简报', exact: true });
    const close = page => page.getByRole('button', { name: '关闭更新公告', exact: true });
    async function capture(page, name) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(240);
        await page.waitForFunction(() => {
            const image = document.querySelector('.release-mascot');
            return image?.complete && image.naturalWidth > 0;
        });
        const geometry = await page.evaluate(() => {
            const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
            return { box: rect('.release-notice'), content: rect('.release-reading'), footer: rect('.release-footer'),
                close: rect('.release-close'), image: rect('.release-mascot'),
                overflowing: document.documentElement.scrollWidth > innerWidth,
                viewport: { width: innerWidth, height: innerHeight } };
        });
        assert.equal(geometry.overflowing, false, name);
        assert.ok(geometry.box.top >= 0 && geometry.box.bottom <= geometry.viewport.height, name);
        assert.ok(geometry.close.right <= geometry.viewport.width && geometry.close.top >= 0 && geometry.close.bottom <= geometry.viewport.height, name);
        assert.equal(await close(page).evaluate(el => getComputedStyle(el).borderRadius), '50%');
        assert.equal(geometry.close.width, geometry.close.height, 'Announcement close remains a circle');
        assert.ok(geometry.footer.bottom <= geometry.box.bottom + 1, 'Floating mascot stays in announcement');
        assert.ok(geometry.image.left >= geometry.footer.left && geometry.image.right <= geometry.footer.right
            && geometry.image.top >= 0 && geometry.image.bottom <= geometry.viewport.height, name);
        assert.equal(await page.locator('.release-overlay .rphub-image-download-button').count(), 0);
        assert.equal(await page.evaluate(() => RPImagePolicy.isContentImage(document.querySelector('.release-mascot'))), false);
        if (!process.argv.includes('--behavior-only')) await page.screenshot({ path: path.join(output, name + '.png') });
        return geometry;
    }
    try {
        const fresh = await load();
        assert.equal(await fresh.evaluate(() => __qa.showUserSetupModal), true);
        assert.equal(await dialog(fresh).count(), 0, 'Setup goes first');
        assert.equal(await fresh.evaluate(() => window.__noticeClaims || 0), 0);
        await dismissSetup(fresh);
        await dialog(fresh).waitFor();
        assert.equal(await fresh.evaluate(() => localStorage.getItem('__qa_release_native')), String(release), 'Recorded when displayed');
        assert.equal(await fresh.evaluate(() => window.__noticeClaims), 1);
        assert.equal(await dialog(fresh).getByRole('button').count(), 3, 'Close plus two optional event entries, no confirmation');
        assert.equal(await fresh.locator('.release-footer').innerText(), '', 'No explanatory footer');
        assert.match(await fresh.locator('.release-reading').innerText(), /特别鸣谢红花铃🔔老师、启元老师/);
        assert.match(await fresh.locator('.release-reading').innerText(), /QQ 群 472441481、132292045 发布/);
        assert.equal(await fresh.locator('.release-reading').innerText().then(text => /预编译|并发写入|隔离数据|同一版本|把故事留在本地/.test(text)), false);
        await fresh.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '关闭更新公告');
        await fresh.keyboard.press('Tab');
        assert.equal(await fresh.evaluate(() => document.activeElement?.getAttribute('aria-label')), '更新内容');
        await fresh.keyboard.press('Tab');
        assert.equal(await fresh.evaluate(() => document.activeElement?.getAttribute('aria-label')), '奇幻杯周赛');
        await fresh.keyboard.press('Tab');
        assert.equal(await fresh.evaluate(() => document.activeElement?.getAttribute('aria-label')), '科技／科幻杯');
        await fresh.keyboard.press('Tab');
        assert.equal(await fresh.evaluate(() => document.activeElement?.getAttribute('aria-label')), '关闭更新公告');
        const screenshots = [];
        for (const theme of ['journal', 'vampire']) {
            await fresh.evaluate(theme => RPThemePacks.set(theme), theme);
            for (const [width, height] of [[360, 800], [390, 844], [1280, 900], [844, 390]]) {
                await fresh.setViewportSize({ width, height });
                screenshots.push(await capture(fresh, `notice-${theme}-${width}`));
            }
        }
        await fresh.setViewportSize({ width: 390, height: 844 });
        await fresh.locator('.release-reading').evaluate(element => { element.scrollTop = element.scrollHeight; });
        assert.ok(await fresh.evaluate(() => document.querySelector('.release-section:last-child').getBoundingClientRect().bottom
            <= document.querySelector('.release-footer').getBoundingClientRect().top), 'Last paragraph clears floating mascot');
        await capture(fresh, 'notice-night-end');
        assert.equal(await close(fresh).isVisible(), true, 'Close stays visible after scroll');
        await fresh.evaluate(() => {
            const reading = document.querySelector('.release-reading');
            reading.style.fontSize = '30px';
            reading.querySelectorAll('h3').forEach(heading => { heading.style.fontSize = '32px'; });
            reading.scrollTop = reading.scrollHeight;
        });
        assert.ok(await fresh.evaluate(() => document.querySelector('.release-section:last-child').getBoundingClientRect().bottom
            <= document.querySelector('.release-footer').getBoundingClientRect().top), 'Large text clears floating mascot');
        await capture(fresh, 'notice-text-200-end');
        // Simulate closing the process without reading or pressing close.
        await fresh.reload(); await ready(fresh); await dismissSetup(fresh);
        await fresh.waitForTimeout(100);
        assert.equal(await dialog(fresh).count(), 0, 'No repeat after abrupt restart');
        await fresh.evaluate(() => {
            window.dispatchEvent(new Event('rp:startup-finished'));
            document.dispatchEvent(new Event('visibilitychange'));
        });
        assert.equal(await dialog(fresh).count(), 0);
        await fresh.evaluate(() => {
            __qa.navigateWorkspace('settings');
            __qa.navigateWorkspace('patchlist');
        });
        assert.equal(await fresh.locator('.yy-page-heading > p').count(), 0, 'No header slogans');
        await fresh.getByRole('button', { name: '查看更新公告', exact: true }).click();
        await dialog(fresh).waitFor();
        await fresh.keyboard.press('Escape'); await dialog(fresh).waitFor({ state: 'detached' });
        assert.equal(await fresh.evaluate(() => document.activeElement?.textContent.includes('查看更新公告')), true);
        await fresh.evaluate(() => __qa.openAnnouncement());
        await fresh.evaluate(() => { window.__backConsumed = rphubHandleBack(); });
        assert.equal(await fresh.evaluate(() => __backConsumed), true);
        await dialog(fresh).waitFor({ state: 'detached' });
        const upgrade = await load({ previous: release - 1 }); await dismissSetup(upgrade); await dialog(upgrade).waitFor();
        await close(upgrade).click(); await dialog(upgrade).waitFor({ state: 'detached' });
        // Restoring preferences from another backup does not alter the native installation marker.
        await upgrade.evaluate(async () => {
            localStorage.setItem('rp-local-release-shown', '1');
            await RPHubStorage.setStoredValue('user', { name: '恢复备份玩家', description: '', person: 'second' });
            await RPLocalStore.flush();
        });
        await upgrade.reload(); await ready(upgrade);
        assert.equal(await dialog(upgrade).count(), 0, 'Stale imported browser marker cannot replay native notice');
        for (const previous of [release, release + 1]) {
            const existing = await load({ previous }); await dismissSetup(existing);
            await existing.waitForTimeout(100);
            assert.equal(await dialog(existing).count(), 0, 'Same version / downgrade');
        }
        const fallback = await load({ native: false, reducedMotion: 'reduce' });
        await dismissSetup(fallback); await dialog(fallback).waitFor();
        assert.equal(await fallback.evaluate(() => localStorage.getItem('rp-local-release-shown')), String(release));
        assert.ok(await fallback.locator('.release-overlay').evaluate(element => parseFloat(getComputedStyle(element).transitionDuration) <= .001));
        await close(fallback).click(); await dialog(fallback).waitFor({ state: 'detached' });
        await fallback.reload(); await ready(fallback); await dismissSetup(fallback);
        await fallback.waitForTimeout(100); assert.equal(await dialog(fallback).count(), 0);
        assert.deepEqual(errors, []); assert.deepEqual(missing, []); assert.deepEqual(remoteChecks, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
            freshInstallOnce: true, waitsForSetupAndStartup: true, recordedOnDisplay: true, immediateClose: true,
            restartWithoutCloseNoRepeat: true, upgradeOnce: true, sameVersionAndDowngradeNoRepeat: true,
            oldBackupBrowserMarkerCannotReplayNativeNotice: true, manualReopenAndFocusReturn: true, keyboardAndAndroidBack: true,
            browserFallbackAndReducedMotion: true, softwareArtworkNotDownloadable: true, noRemoteUpdateChecks: true,
            originalBaseline: '2.8.116', viewports: screenshots, errors, missing, actualAndroidTested: false
        }, null, 2));
        console.log('Release announcement lifecycle, version gating, keyboard, themes and responsive layout passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
