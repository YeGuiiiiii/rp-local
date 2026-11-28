const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const bridge = require('./mock-files.cjs');
const web = path.resolve(__dirname, '../web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.resolve(__dirname, '../verification/mascot-visibility');
fs.mkdirSync(output, { recursive: true });

// Catches a cosmetic preference changing the layout, losing chat state, or leaving characters visible.
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [];
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        await context.addInitScript(bridge, { skin: 'chenyue' });
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
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        async function ready() {
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                qa.showUserSetupModal = false; qa.closeAnnouncement();
            });
        }
        const appearance = () => page.evaluate(() => qa.openSettingsSection('appearance'));
        const toggle = () => page.getByRole('switch', { name: '人物装饰', exact: true });
        const toggleRow = () => page.locator('label.shell-form-row').filter({ has: toggle() });
        const people = '.yy-poke-mascot,.yy-mascot-speech,.yy-empty-mascot,.release-mascot,.transfer-mascot,.update-notice-art img';
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await ready();
        await page.evaluate(async () => {
            qa.characters = [{ uuid: 'mascot-fixture', name: '显示测试角色', first_mes: '原来的故事',
                avatar: RPHubUtils.defaultAvatar, createdAt: 1, description: '',
                worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await qa.selectCharacter(0);
        });
        await page.locator('.island-input').fill('未发送的草稿');
        const before = await page.evaluate(() => ({
            character: qa.currentCharacter.uuid, history: JSON.stringify(qa.chatHistory), branch: qa.currentStoryBranch.id
        }));
        await appearance();
        assert.equal(await toggle().count(), 1, 'Modern layout needs an independent mascot visibility switch');
        assert.equal(await toggle().isChecked(), true, 'Existing modern skins keep their characters by default');
        await toggleRow().click();
        await page.waitForFunction(() => document.documentElement.dataset.uiMascots === 'false');
        assert.equal(await page.locator(people).count(), 0, 'Turning characters off removes mounted art and interactions immediately');
        await page.evaluate(() => {
            qa.user.avatar = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="green"/></svg>';
            qa.navigateWorkspace('settings');
        });
        assert.equal(await page.locator('.persona-avatar img').count(), 1, 'A player-supplied avatar stays visible');
        assert.equal(await page.evaluate(() => RPThemePacks.current), 'chenyue');
        assert.equal(await page.evaluate(() => document.documentElement.dataset.uiLayout), 'modern');
        await page.evaluate(() => qa.navigateWorkspace('chat'));
        assert.equal(await page.locator('.island-input').inputValue(), '未发送的草稿');
        assert.deepEqual(await page.evaluate(() => ({
            character: qa.currentCharacter.uuid, history: JSON.stringify(qa.chatHistory), branch: qa.currentStoryBranch.id
        })), before);

        for (const skin of ['chenyue', 'winter', 'classic', 'chenyue']) {
            await page.evaluate(skin => { RPThemePacks.set(skin); qa.navigateWorkspace('settings'); }, skin);
            assert.equal(await page.locator(people).count(), 0, skin + ' preserves the hidden preference');
            assert.equal(await page.evaluate(() => RPThemePacks.current), skin);
        }
        for (const mode of ['night', 'day']) {
            await page.evaluate(mode => RPThemePacks.setMode(mode), mode);
            assert.equal(await page.locator(people).count(), 0, 'Day/night changes do not re-enable characters');
            assert.equal(await page.evaluate(() => RPThemePacks.mode), mode);
        }
        await page.evaluate(() => {
            qa.backupTask.active = true; qa.backupTask.title = '导出备份'; qa.backupTask.locked = false;
        });
        const transfer = page.getByRole('dialog', { name: '导出备份', exact: true });
        await transfer.waitFor();
        assert.equal(await transfer.locator('.transfer-mascot').count(), 0);
        await page.evaluate(() => { qa.backupTask.active = false; qa.openAnnouncement(); });
        const notice = page.getByRole('dialog', { name: '更新公告', exact: true });
        await notice.waitFor();
        assert.equal(await notice.locator('.release-mascot').count(), 0);
        await page.getByRole('button', { name: '关闭更新公告', exact: true }).click();
        await page.evaluate(() => {
            RPUpdates.state.latest = { versionName: '2.9.599', url: 'https://example.test/update.apk' };
            RPUpdates.state.showNotice = true;
        });
        const update = page.getByRole('dialog', { name: '发现新版本', exact: true });
        await update.waitFor();
        assert.equal(await update.locator('.update-notice-art img').count(), 0);
        await page.getByRole('button', { name: '关闭更新提醒', exact: true }).click();
        let releaseStartup;
        const startupGate = new Promise(resolve => { releaseStartup = resolve; });
        await page.route('**/app.js*', async route => { await startupGate; await route.fallback(); });
        const reload = page.reload({ waitUntil: 'commit' });
        try {
            await reload;
            await page.locator('.entry-transition').waitFor();
            assert.equal(await page.locator('.entry-transition img').count(), 0, 'A saved hidden preference applies before the first startup image');
        } finally { releaseStartup(); }
        await ready();
        assert.equal(await page.evaluate(() => RPThemePacks.mascots), false, 'Reload preserves hidden characters');
        await appearance();
        assert.equal(await toggle().isChecked(), false);
        for (const skin of ['chenyue', 'winter']) {
            await page.evaluate(skin => RPThemePacks.set(skin), skin);
            for (const [width, height] of [[390, 844], [1280, 900]]) {
                await page.setViewportSize({ width, height });
                await toggleRow().scrollIntoViewIfNeeded();
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                await page.screenshot({ path: path.join(output, `${skin}-appearance-${width}.png`), animations: 'disabled' });
            }
        }
        const backup = await page.evaluate(async () => {
            const parts = [];
            window.showSaveFilePicker = async () => ({
                createWritable: async () => ({ write: part => parts.push(part), close() {}, async abort() {} })
            });
            await qa.exportAllData();
            if (qa.backupTask.error) throw new Error(qa.backupTask.error);
            return parts.join('');
        });
        assert.equal(JSON.parse(backup).webStorage.localStorage['rphub-ui-mascots'], '0', 'A full backup includes the chosen preference');
        await page.getByRole('button', { name: '关闭备份弹窗', exact: true }).click();
        await page.evaluate(() => RPThemePacks.setMascots(true));
        await page.evaluate(() => qa.navigateWorkspace('backup'));
        await page.locator('.backup-page:visible input[type=file]').first().setInputFiles({
            name: 'mascot-preference.json', mimeType: 'application/json', buffer: Buffer.from(backup)
        });
        await page.waitForFunction(() => ['ready', 'failed'].includes(qa.streamImportPanel.state.phase));
        assert.equal(await page.evaluate(() => qa.streamImportPanel.state.phase), 'ready');
        await page.evaluate(() => { qa.streamImportPanel.apply(); });
        await page.waitForFunction(() => !window.qa && window.__rpDataReady);
        await ready();
        assert.equal(await page.evaluate(() => RPThemePacks.mascots), false, 'Restoring a backup restores its hidden preference');
        await appearance();
        await toggleRow().click();
        await page.evaluate(() => qa.navigateWorkspace('settings'));
        await page.locator('.yy-poke-mascot:visible').first().waitFor();
        await page.locator('.yy-poke-mascot:visible').first().click();
        await page.locator('.yy-mascot-speech').waitFor();
        await appearance();
        await toggleRow().click();
        assert.equal(await page.locator('.yy-mascot-speech,.yy-poke-mascot').count(), 0);
        // A second window changing this preference must update existing components, too.
        const other = await context.newPage();
        await other.goto('https://sta1n156.github.io/RP-Hub/');
        await other.waitForFunction(() => window.RPThemePacks);
        await other.evaluate(() => RPThemePacks.setMascots(true));
        await page.waitForFunction(() => RPThemePacks.mascots);
        assert.equal(await toggle().isChecked(), true);
        await other.close();
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: true, errors, actualDeviceTested: false }, null, 2));
        console.log('Independent mascot visibility: immediate updates, layout/chat/avatar preservation, skins/day/night, dialogs, first paint, backup roundtrip and cross-window sync passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
