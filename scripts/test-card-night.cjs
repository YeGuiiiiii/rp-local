const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, '.impeccable/review/card-night-2.9.012');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        await context.addInitScript(installFiles);
        await context.addInitScript(() => {
            window.__cardDark = false;
            window.RPHubCardTheme = { setEnabled: value => { window.__cardDark = value; } };
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: ({
                '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp'
            })[path.extname(file)] || 'application/octet-stream' });
        });
        const ready = async () => {
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false; __qa.showAnnouncement = false;
            });
        };
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
        await page.evaluate(async () => {
            __qa.characters = ['card-night-a', 'card-night-b'].map((uuid, i) => ({
                uuid, name: i ? '纸页卡片' : '夜间卡片', first_mes: '保留故事与草稿',
                worldInfo: [], regexScripts: [], uiTemplates: []
            }));
            await __qa.selectCharacter(0);
            __qa.userInput = '尚未发送的草稿';
            __qa.toasts = [];
            __qa.openSettingsSection('appearance');
        });
        const globalSwitch = page.getByRole('switch', { name: '卡片自动变暗', exact: true });
        await globalSwitch.waitFor({ timeout: 3000 });
        assert.equal(await globalSwitch.isChecked(), true, 'Card darkening must start enabled');
        assert.equal(await globalSwitch.evaluate(el => el.closest('.shell-form-row').previousElementSibling.textContent.trim()), '夜间模式');
        const active = () => page.evaluate(() => __cardDark);
        for (const skin of ['classic', 'chenyue', 'winter']) {
            await page.evaluate(skin => { RPThemePacks.set(skin); RPThemePacks.setMode('night'); }, skin);
            assert.equal(await active(), true);
            for (const width of [390, 1280]) {
                await page.setViewportSize({ width, height: 900 });
                await page.evaluate(() => __qa.openSettingsSection('appearance'));
                await globalSwitch.scrollIntoViewIfNeeded();
                await page.screenshot({ path: path.join(output, `${skin}-appearance-${width}.png`), animations: 'disabled' });
                await page.evaluate(() => { __qa.navigateWorkspace('chat'); __qa.isNavigationOpen = true; });
                const select = page.getByRole('combobox', { name: '当前卡片夜间显示', exact: true });
                await select.waitFor();
                assert.equal(await select.inputValue(), 'follow');
                await page.screenshot({ path: path.join(output, `${skin}-menu-${width}.png`), animations: 'disabled' });
                assert.equal(await select.evaluate(el => Math.round(el.getBoundingClientRect().height) >= 44), true);
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                await select.selectOption('original');
                assert.equal(await active(), false);
                assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'dark');
                await select.selectOption('auto');
                assert.equal(await active(), true);
                await page.evaluate(() => RPThemePacks.setMode('day'));
                assert.equal(await active(), false, 'Per-card auto must never darken day mode');
                await page.evaluate(() => RPThemePacks.setMode('night'));
                await select.selectOption('follow');
                await page.getByRole('button', { name: skin === 'classic' ? '关闭导航' : '关闭聊天菜单', exact: true }).click();
            }
        }
        await page.evaluate(() => { __qa.openSettingsSection('appearance'); });
        await globalSwitch.locator('../..').click();
        assert.equal(await active(), false);
        await page.evaluate(() => { __qa.navigateWorkspace('chat'); __qa.isNavigationOpen = true; });
        const select = page.getByRole('combobox', { name: '当前卡片夜间显示', exact: true });
        await select.selectOption('auto');
        assert.equal(await active(), true, 'A card can override the disabled global setting');
        await select.selectOption('original');
        await page.getByRole('button', { name: '关闭聊天菜单' }).click();
        await page.evaluate(async () => {
            await __qa.selectCharacter(1);
            await __qa.selectCharacter(0);
            __qa.isNavigationOpen = true;
        });
        assert.equal(await select.inputValue(), 'original');
        await page.getByRole('button', { name: '关闭聊天菜单' }).click();
        await page.evaluate(async () => { await RPLocalStore.flush(); });
        await page.reload(); await ready();
        await page.evaluate(() => { RPThemePacks.setMode('night'); __qa.navigateWorkspace('chat'); __qa.isNavigationOpen = true; });
        assert.equal(await select.inputValue(), 'original', 'The current card choice must survive restart');
        assert.equal(await active(), false);
        await page.getByRole('button', { name: '关闭聊天菜单' }).click();
        await page.evaluate(() => __qa.openSettingsSection('appearance'));
        assert.equal(await globalSwitch.isChecked(), false, 'The global choice must survive restart');
        assert.deepEqual(errors, []);
        console.log('PASS default, three skins, day/night, card overrides, switching, persistence and responsive controls');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
