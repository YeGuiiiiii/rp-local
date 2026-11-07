const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, '.impeccable/review/skins-2.9.007');
fs.mkdirSync(output, { recursive: true });
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        for (const [legacy, expectedSkin, expectedMode] of [
            ['journal', 'chenyue', 'day'], ['vampire', 'chenyue', 'night'], ['classic', 'classic', 'night'],
            ['winter', 'winter', 'night']
        ]) {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
            await context.addInitScript(bridge, { skin: legacy });
            await context.addInitScript(() => {
                if (!localStorage.getItem('__skinFixture')) {
                    localStorage.setItem('__skinFixture', '1');
                    localStorage.setItem('rphub-appearance', 'dark');
                    localStorage.setItem('rphub-theme-scheme', 'night');
                }
            });
            const errors = [], page = await context.newPage();
            page.on('pageerror', error => errors.push(error.message));
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.origin !== 'https://sta1n156.github.io') return route.abort();
                if (url.pathname.includes('/_files/')) return route.fulfill({
                    path: path.join(web, 'assets/images/chenyue/welcome.webp'), contentType: 'image/webp'
                });
                const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
                if (!file.startsWith(web + path.sep) || !fs.existsSync(file)) return route.abort();
                return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
            });
            const ready = async () => {
                await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
                await page.evaluate(() => {
                    window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                    __qa.showUserSetupModal = false; __qa.showAnnouncement = false;
                });
            };
            await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
            assert.equal(await page.evaluate(() => RPThemePacks.current), expectedSkin);
            assert.equal(await page.evaluate(() => RPThemePacks.mode), expectedMode);
            await page.evaluate(async avatar => {
                __qa.characters = [{ uuid: 'skin-card', name: '皮肤切换测试', avatar, first_mes: '保留当前故事', worldInfo: [], regexScripts: [], uiTemplates: [] }];
                __qa.user.avatar = avatar;
                await __qa.selectCharacter(0);
                __qa.toasts = [];
                __qa.openSettingsSection('appearance');
            }, 'data:image/webp;base64,' + fs.readFileSync(path.join(web, 'assets/images/chenyue/welcome.webp')).toString('base64'));
            assert.equal(await page.getByRole('radio').count(), 3);
            const night = page.getByRole('switch', { name: '夜间模式', exact: true });
            assert.equal(await night.isChecked(), expectedMode === 'night');
            assert.equal(await night.evaluate(el => el.closest('.shell-form-row').previousElementSibling.textContent.trim()), '倾斜反光');
            await night.locator('..').locator('..').click();
            assert.equal(await page.evaluate(() => RPThemePacks.current), expectedSkin);
            await page.getByRole('radio', { name: '玥玥经典皮肤', exact: true }).check();
            if (!await night.isChecked()) await night.locator('..').locator('..').click();
            for (const width of legacy === 'classic' ? [390, 1280] : []) {
                await page.setViewportSize({ width, height: 900 });
                for (const skin of ['classic', 'chenyue', 'winter']) {
                    await page.evaluate(skin => RPThemePacks.set(skin), skin);
                    for (const mode of ['day', 'night']) {
                        await page.evaluate(({ skin, mode }) => { RPThemePacks.set(skin); RPThemePacks.setMode(mode); }, { skin, mode });
                        await page.waitForFunction(() => [...document.images].filter(img => img.getClientRects().length).every(img => img.complete && img.naturalWidth > 0));
                        if (skin === 'winter') {
                            assert.equal(await page.evaluate(() => !!document.querySelector('#ui-skin-winter')), true);
                            for (const name of ['welcome', 'transfer']) {
                                assert.equal(await page.evaluate(name => RPThemePacks.asset(name).endsWith(`/mascots/${name}.webp`), name), true);
                            }
                        }
                        await page.locator('.management-view:visible').evaluate(el => { el.scrollTop = 0; });
                        await page.screenshot({ path: path.join(output, `${skin}-${mode}-${width}.png`), animations: 'disabled' });
                        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                    }
                }
            }
            if (legacy === 'classic') {
                await page.setViewportSize({ width: 390, height: 844 });
                for (const skin of ['classic', 'chenyue', 'winter']) {
                    await page.evaluate(skin => RPThemePacks.set(skin), skin);
                    for (const view of ['advanced', 'settings', 'chat', 'album']) {
                        const geometry = [];
                        for (const mode of ['day', 'night']) {
                            await page.evaluate(({ view, mode }) => {
                                RPThemePacks.setMode(mode); __qa.navigateWorkspace(view);
                            }, { view, mode });
                            await page.waitForTimeout(120);
                            if (skin === 'winter' && view === 'advanced') {
                                const titleLabel = await page.locator('.yy-page-heading > h1').evaluateAll(elements =>
                                {
                                    const el = elements.find(item => item.getClientRects().length && item.textContent.includes('高级功能'));
                                    return getComputedStyle(el).backgroundImage;
                                });
                                assert.match(titleLabel, /title-label/);
                            }
                            if (skin === 'winter' && view === 'advanced') {
                                assert.match(await page.locator('.shell-action-grid > button').first()
                                    .evaluate(el => getComputedStyle(el).borderImageSource), /button-paper/);
                            }
                            if (skin === 'winter' && view === 'album') {
                                assert.match(await page.locator('.shell-album-cover')
                                    .evaluate(el => getComputedStyle(el).borderImageSource), /album-frame/);
                            }
                            if (skin === 'chenyue' && mode === 'night' && view === 'album') {
                                await page.waitForFunction(() => [...document.querySelectorAll('.shell-dock-night-art')]
                                    .filter(image => image.getClientRects().length && image.complete && image.naturalWidth > 0).length === 4);
                                const ornament = await page.locator('.shell-album-cover').first().evaluate(el => {
                                    const style = getComputedStyle(el, '::after');
                                    return {
                                        image: style.backgroundImage,
                                        right: style.right,
                                        bottom: style.bottom
                                    };
                                });
                                assert.match(ornament.image, /corner-lower\.webp/);
                                assert.equal(ornament.right, '2px');
                                assert.equal(ornament.bottom, '2px');
                                await page.screenshot({ path: path.join(output, 'chenyue-night-gallery.png'), animations: 'disabled' });
                            }
                            geometry.push(await page.locator('.yy-page-header,.shell-card-picker,.shell-action-grid,.shell-profile,.shell-row-list,.input-island')
                                .evaluateAll(elements => elements.filter(el => el.getClientRects().length).map(el => {
                                    const box = el.getBoundingClientRect();
                                    return [el.className, Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)];
                                })));
                            if (view === 'advanced') await page.screenshot({ path: path.join(output, `${skin}-${mode}-advanced.png`), animations: 'disabled' });
                            if (skin === 'winter' && view === 'album') await page.screenshot({ path: path.join(output, `${skin}-${mode}-gallery.png`), animations: 'disabled' });
                            if (skin === 'winter' && view === 'settings') await page.screenshot({ path: path.join(output, `${skin}-${mode}-settings.png`), animations: 'disabled' });
                        }
                        assert.deepEqual(geometry[1], geometry[0], `${skin}/${view}: day/night must keep geometry`);
                    }
                }
            }
            await page.evaluate(skin => {
                RPThemePacks.set(skin); RPThemePacks.setMode('night'); __qa.navigateWorkspace('characters');
            }, expectedSkin);
            if (expectedSkin !== 'classic') {
                await page.evaluate(() => __qa.navigateWorkspace('characters'));
                await page.waitForFunction(() => [...document.querySelectorAll('.shell-dock-art,.shell-dock-night-art')]
                    .filter(image => image.getClientRects().length).length === 4);
                assert.deepEqual(await page.locator('.shell-dock-art,.shell-dock-night-art').evaluateAll(images =>
                    images.map(image => ({ loaded: image.complete && image.naturalWidth > 0, src: new URL(image.src).pathname }))),
                ['characters', 'album', 'advanced', 'settings'].map(view => ({
                    loaded: true,
                    src: new URL(
                        expectedSkin === 'chenyue' ? `assets/themes/vampire/nav-${view}.webp` : `assets/images/navigation/${view}.webp`,
                        'https://sta1n156.github.io/RP-Hub/'
                    ).pathname
                })), `${expectedSkin}/night: dock artwork must load`);
            }
            await page.evaluate(() => { RPThemePacks.setMode('day'); __qa.navigateWorkspace('chat'); });
            await page.locator('.island-input').fill('切换时保留这份草稿');
            await page.getByRole('button', { name: /聊天菜单|打开导航/, exact: true }).first().click();
            const menu = page.locator(expectedSkin === 'classic' ? '#app-navigation-panel' : '.shell-chat-menu');
            await page.waitForFunction(() => !document.querySelector('.app-navigation-enter-active'));
            if (expectedSkin === 'winter') {
                const close = menu.locator('.yy-menu-close');
                assert.ok(await close.boundingBox(), 'winter menu needs a visible close button');
                assert.match(await close.evaluate(el => getComputedStyle(el).backgroundImage), /close\.webp/);
            }
            await menu.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).filter(animation =>
                animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finish())));
            await page.evaluate(() => __qa.toasts = []);
            const beforeMenu = await menu.boundingBox();
            if (legacy !== 'vampire') await page.screenshot({ path: path.join(output, `${expectedSkin}-day-menu.png`), animations: 'disabled' });
            const inputNode = await page.locator('.island-input').elementHandle();
            if (expectedSkin === 'classic') await menu.getByRole('switch', { name: '夜间模式', exact: true }).click();
            else await menu.getByRole('button', { name: '切换到夜间模式', exact: true }).click();
            assert.equal(await page.evaluate(() => RPThemePacks.current), expectedSkin);
            assert.equal(await page.evaluate(() => RPThemePacks.mode), 'night');
            assert.equal(await inputNode.evaluate(el => el.isConnected && el.value === '切换时保留这份草稿'), true);
            assert.equal(await menu.isVisible(), true);
            const afterMenu = await menu.boundingBox();
            assert.deepEqual(afterMenu, beforeMenu, 'Day/night keeps the open menu in place');
            if (legacy !== 'vampire') await page.screenshot({ path: path.join(output, `${expectedSkin}-night-menu.png`), animations: 'disabled' });
            await page.reload(); await ready();
            assert.equal(await page.evaluate(() => RPThemePacks.current), expectedSkin);
            assert.equal(await page.evaluate(() => RPThemePacks.mode), 'night');
            assert.deepEqual(errors, []);
            await context.close();
        }
        console.log('Skin/mode independence, legacy migration, appearance/menu controls, stable layout and reload passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
