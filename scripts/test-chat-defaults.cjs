const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/chat-defaults-1.16');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(bridge);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    async function ready() {
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
        });
    }
    const names = () => page.locator('.centered-message-shell .msg-name-tag:visible');
    async function toggleImmersive() {
        await page.getByRole('button', { name: '快捷面板', exact: true }).click();
        await page.locator('#chat-quick-panel label').filter({ hasText: '沉浸模式' }).click();
        await page.getByRole('button', { name: '关闭快捷面板', exact: true }).click();
    }
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
        assert.equal(await page.evaluate(() => __qa.settings.immersiveMode), true, 'Fresh install defaults to immersive');
        await page.evaluate(async () => {
            const saved = await RPHubStorage.getStoredValue('settings');
            delete saved.localImmersiveDefault;
            RPHubStorage.setWritesPaused(true);
            await RPHubStorage.setStoredValue('settings', { ...saved, immersiveMode: false, upgradeSentinel: 'keep' }, { force: true });
            await RPLocalStore.flush();
        });
        await page.reload(); await ready();
        assert.equal(await page.evaluate(() => __qa.settings.immersiveMode), true, 'Old install receives the new default once');
        await page.evaluate(async () => {
            __qa.characters = [{ uuid: 'immersive-card', name: '默认阅读检查', avatar: 'assets/images/chenyue/welcome.webp',
                first_mes: '故事从这里开始。', worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await __qa.selectCharacter(0);
            __qa.chatHistory = [
                { id: 'read-user', role: 'user', isSelf: true, name: '玩家', content: '继续故事。', shouldAnimate: false },
                { id: 'read-assistant', role: 'assistant', content: '窗边的书页轻轻翻动，故事从这里开始。', shouldAnimate: false }
            ];
            await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
        });
        assert.equal(await names().count(), 0);
        assert.equal(await page.locator('.centered-message-shell .msg-avatar:visible').count(), 0);
        await toggleImmersive();
        assert.equal(await page.evaluate(() => __qa.settings.immersiveMode), false);
        assert.equal(await names().count(), 2);
        await page.waitForTimeout(1100);
        await page.waitForFunction(async () => {
            const saved = await RPHubStorage.getStoredValue('settings');
            return saved.immersiveMode === false && saved.localImmersiveDefault === true;
        });
        await page.evaluate(() => RPLocalStore.flush());
        await page.reload(); await ready();
        assert.equal(await page.evaluate(() => __qa.settings.immersiveMode), false, 'Explicit opt-out survives restart');
        assert.equal(await page.evaluate(async () => (await RPHubStorage.getStoredValue('settings')).upgradeSentinel), 'keep');
        await toggleImmersive();
        assert.equal(await names().count(), 0);
        for (const width of [360, 390, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            await page.evaluate(() => RPThemePacks.set('vampire'));
            await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--yy-paper').trim() === '#211d23');
            await page.waitForTimeout(220);
            const geometry = await page.locator('.input-island').evaluate(el => {
                const box = el.getBoundingClientRect(), toolbar = el.querySelector('.island-toolbar').getBoundingClientRect();
                const art = getComputedStyle(el, '::before');
                return { artTop: box.bottom - parseFloat(art.bottom) - parseFloat(art.height), toolbarBottom: toolbar.bottom,
                    bottom: art.bottom, background: art.backgroundImage, pointerEvents: art.pointerEvents, box: box.toJSON() };
            });
            assert.ok(geometry.artTop >= geometry.toolbarBottom, 'Decoration stays below every toolbar control');
            assert.equal(geometry.bottom, '2px');
            assert.match(geometry.background, /ribbon.webp/);
            assert.equal(geometry.pointerEvents, 'none');
            assert.ok(geometry.box.bottom <= 844 && geometry.box.x >= 0 && geometry.box.right <= width);
            await page.screenshot({ path: path.join(output, `night-chat-${width}.png`) });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => __qa.openAnnouncement());
        const reading = page.getByRole('region', { name: '更新内容', exact: true });
        await reading.waitFor();
        await page.waitForTimeout(240);
        assert.match(await reading.innerText(), /特别鸣谢红花铃🔔老师、启元老师/);
        assert.match(await reading.innerText(), /QQ 群 472441481 发布/);
        await reading.evaluate(el => { el.scrollTop = el.scrollHeight; });
        assert.ok(await page.evaluate(() => document.querySelector('.release-section:last-child').getBoundingClientRect().bottom
            <= document.querySelector('.release-footer').getBoundingClientRect().top));
        await page.screenshot({ path: path.join(output, 'announcement-credits.png') });
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
            freshImmersiveDefault: true, existingInstallMigration: true, optOutPersists: true, settingsExtrasPreserved: true,
            messageAvatarsAndNamesHidden: true, nightRibbonBelowToolbar: true, creditsAndUpdateGroup: true, errors
        }, null, 2));
        console.log('Immersive defaults/upgrade/opt-out, message metadata, night ribbon and credits passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
