const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(require('./mock-files.cjs'));
        await context.route('**/*', route => {
            const url = new URL(route.request().url()), file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            return url.origin === 'https://sta1n156.github.io' && file.startsWith(web + path.sep) && fs.existsSync(file)
                ? route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript',
                    '.html': 'text/html', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' }) : route.abort();
        });
        const page = await context.newPage();
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false; __qa.showAnnouncement = false;
            __qa.navigateWorkspace('settings'); __qa.navigateWorkspace('backup');
        });
        const surface = page.locator('.backup-page:visible');
        assert.equal(await surface.getByRole('button', { name: '云端上传', exact: true }).count(), 1);
        await surface.getByRole('button', { name: '云端下载', exact: true }).click();
        assert.equal(await page.getByPlaceholder('XXXX-XXXX-XXXX-XXXX').isVisible(), true);
        await page.evaluate(() => __qa.closeCloudBackup());
        assert.equal(await surface.getByLabel('传输速度', { exact: true }).isVisible(), true,
            'Import and export speed must be available on the main backup page');
        await surface.getByLabel('传输速度', { exact: true }).selectOption('fast');
        assert.equal(await page.evaluate(() => __qa.backupProfile), 'fast');
        const chosen = page.waitForEvent('filechooser');
        await surface.getByText('导入备份', { exact: true }).click();
        await chosen;
        assert.equal(await surface.getByRole('heading', { name: '备份与恢复', exact: true }).count(), 1);
        assert.equal(await surface.getByRole('switch', { name: '每日 JSON 备份' }).isVisible(), true);
        assert.equal(await surface.getByLabel('备份文件名', { exact: true }).isVisible(), true);
        await surface.getByLabel('备份文件名', { exact: true }).fill('我的备份');
        await surface.locator('summary').filter({ hasText: '备份内容' }).click();
        await surface.getByLabel('聊天记录', { exact: true }).uncheck();
        assert.equal(await page.evaluate(() => __qa.backupScope.chat), false);
        await surface.getByRole('button', { name: '全部包含', exact: true }).click();
        assert.equal(await page.evaluate(() => __qa.backupScope.chat), true);
        await page.evaluate(() => {
            window.AndroidBridge = { isNativeApp: () => true, listBackupFiles: () => JSON.stringify([
                { id: 'manual', name: '手动.json', time: 2000, size: 200 },
                { id: 'daily', name: 'rp-hub-autobackup-2026-11-09.json', time: 1000, size: 100 }
            ]) };
        });
        await surface.locator('summary').filter({ hasText: '历史备份' }).click();
        await page.waitForFunction(() => __qa.backupUi.files.length === 2);
        await surface.getByLabel('备份来源').selectOption('manual');
        assert.equal(await surface.locator('.backup-file').count(), 1);
        await surface.getByRole('button', { name: '手动.json 的操作' }).click();
        await surface.getByRole('button', { name: '重命名', exact: true }).click();
        await surface.getByLabel('新文件名').fill('改名.json');
        await page.evaluate(() => __qa.shellGoBack());
        assert.equal(await surface.getByLabel('新文件名').count(), 0);
        assert.equal(await page.evaluate(() => __qa.currentView), 'backup');
        const output = path.join(root, '.impeccable/review/backup-simple');
        fs.mkdirSync(output, { recursive: true });
        for (const skin of ['classic', 'chenyue', 'winter']) {
            for (const mode of ['day', 'night']) {
                for (const width of [360, 390, 1280]) {
                    await page.setViewportSize({ width, height: 900 });
                    await page.evaluate(({ skin, mode }) => {
                        RPThemePacks.set(skin); RPThemePacks.setMode(mode);
                        __qa.autoBackupConfig.enabled = true; __qa.toasts = [];
                    }, { skin, mode });
                    assert.equal(await surface.getByLabel('传输速度', { exact: true }).isVisible(), true);
                    assert.ok(await surface.evaluate(node => node.getBoundingClientRect().width <= 761));
                    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
                    if (width !== 390) await page.screenshot({ path: path.join(output, `${skin}-${mode}-${width}.png`), animations: 'disabled' });
                }
            }
        }
        console.log('Backup file picker, filename, daily switch and shared speed control are on one page.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
