const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [];
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(installFiles);
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
        });
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.showAnnouncement = false;
            window.AndroidBridge = {
                isNativeApp: () => true,
                listBackupFiles: () => JSON.stringify([
                    { id: 'manual', name: '我的手动备份.json', size: 200, time: 2000, isTreeDoc: true },
                    { id: 'daily', name: 'rp-hub-autobackup-2026-11-09.json', size: 100, time: 1000, isTreeDoc: false }
                ])
            };
            __qa.navigateWorkspace('settings');
            __qa.navigateWorkspace('backup');
        });
        const surface = page.locator('.backup-page:visible');
        assert.equal(await surface.getByRole('heading', { name: '备份与恢复', exact: true }).count(), 1,
            'Backup home must expose the approved primary tasks');
        assert.equal(await surface.getByLabel('备份文件名').count(), 0, 'Filename must not crowd the home');
        await surface.getByRole('button', { name: /创建备份/ }).click();
        await surface.getByLabel('备份文件名', { exact: true }).fill('测试保存');
        assert.ok((await surface.textContent()).includes('测试保存.json'));
        assert.equal(await surface.getByLabel('聊天记录', { exact: true }).isVisible(), false);
        await surface.locator('summary').filter({ hasText: '导出内容' }).click();
        await surface.getByLabel('聊天记录', { exact: true }).uncheck();
        assert.equal(await page.evaluate(() => __qa.backupScope.chat), false);
        await surface.getByRole('button', { name: '全部包含', exact: true }).click();
        assert.equal(await page.evaluate(() => __qa.backupScope.chat), true);
        await page.evaluate(() => rphubHandleBack());
        assert.equal(await surface.getByRole('heading', { name: '备份与恢复', exact: true }).count(), 1);
        await surface.getByRole('button', { name: /历史备份/ }).click();
        assert.equal(await surface.locator('.backup-file').count(), 2, 'Both sources share one list');
        await surface.getByLabel('备份来源').selectOption('daily');
        assert.equal(await surface.locator('.backup-file').count(), 1);
        assert.ok((await surface.locator('.backup-file').textContent()).includes('rp-hub-autobackup'));
        await surface.getByLabel('备份来源').selectOption('manual');
        assert.ok((await surface.locator('.backup-file').textContent()).includes('我的手动备份'));
        await surface.getByRole('button', { name: '我的手动备份.json 的操作' }).click();
        await surface.getByRole('button', { name: '重命名', exact: true }).click();
        await surface.getByLabel('新文件名').fill('保留手动备份.json');
        await surface.getByRole('button', { name: '取消', exact: true }).click();
        assert.ok((await surface.locator('.backup-file').textContent()).includes('我的手动备份'));
        await surface.getByRole('button', { name: '恢复', exact: true }).click();
        const restoreConfirm = page.locator('.app-modal-panel').filter({ has: page.getByRole('heading', { name: '还原自动备份', exact: true }) });
        await restoreConfirm.waitFor();
        assert.ok((await restoreConfirm.innerText()).includes('我的手动备份.json'));
        await restoreConfirm.getByRole('button', { name: '取消', exact: true }).click();
        await page.evaluate(() => rphubHandleBack());
        assert.equal(await surface.getByRole('button', { name: '重命名', exact: true }).count(), 0);
        await page.evaluate(() => rphubHandleBack());
        await surface.getByRole('button', { name: /^每日备份/ }).click();
        const previous = await surface.getByRole('switch', { name: '每日 JSON 备份' }).isChecked();
        await surface.locator('label.backup-switch').click();
        assert.equal(await page.evaluate(() => __qa.autoBackupConfig.enabled), !previous);
        await page.evaluate(() => rphubHandleBack());
        await page.evaluate(() => rphubHandleBack());
        assert.equal(await page.evaluate(() => __qa.currentView), 'settings');
        const output = path.join(root, '.impeccable/review/backup-2.9.015');
        fs.mkdirSync(output, { recursive: true });
        const layouts = [];
        for (const skin of ['classic', 'chenyue', 'winter']) {
            for (const mode of ['day', 'night']) {
                for (const width of [360, 390, 1280]) {
                    await page.setViewportSize({ width, height: 900 });
                    await page.evaluate(({ skin, mode }) => {
                        __qa.toasts = [];
                        RPThemePacks.set(skin); RPThemePacks.setMode(mode);
                        __qa.navigateWorkspace('backup');
                    }, { skin, mode });
                    await page.waitForTimeout(80);
                    assert.equal(await page.locator('.backup-page:visible').count(), 1);
                    const pageWidth = await surface.evaluate(element => ({ width: element.getBoundingClientRect().width,
                        max: getComputedStyle(element).maxWidth, parent: element.parentElement.className }));
                    assert.ok(pageWidth.width <= 761, 'Backup page keeps its reading width: ' + JSON.stringify({ skin, mode, width, ...pageWidth }));
                    const overflow = await surface.evaluate(element => {
                        const boundary = element.getBoundingClientRect();
                        return [...element.querySelectorAll('button,input,select')].filter(control => {
                            if (!control.getClientRects().length || control.type === 'file') return false;
                            const box = control.getBoundingClientRect();
                            return box.width < 40 || box.height < 40 || box.right > boundary.right + 1 || box.left < boundary.left - 1;
                        }).map(control => control.textContent);
                    });
                    assert.deepEqual(overflow, [], skin + mode + width);
                    if (width !== 390) await page.screenshot({ path: path.join(output, `${skin}-${mode}-${width}.png`), animations: 'disabled' });
                    layouts.push({ skin, mode, width });
                    await surface.getByRole('button', { name: /创建备份/ }).click();
                    await page.evaluate(() => __qa.shellGoBack());
                    await page.evaluate(() => __qa.navigateWorkspace('settings'));
                }
            }
        }
        await page.evaluate(() => { RPThemePacks.set('chenyue'); RPThemePacks.setMode('day'); __qa.navigateWorkspace('backup'); });
        await page.setViewportSize({ width: 390, height: 844 });
        for (const target of ['home', 'locations', 'daily', 'import', 'export', 'history', 'maintenance']) {
            await page.evaluate(target => { __qa.toasts = []; return __qa.backupUi.go(target); }, target);
            await page.screenshot({ path: path.join(output, `${target}-390.png`), animations: 'disabled' });
        }
        for (const skin of ['classic', 'chenyue', 'winter']) {
            await page.evaluate(async skin => {
                __qa.toasts = [];
                RPThemePacks.set(skin); RPThemePacks.setMode('night');
                __qa.autoBackupConfig.enabled = true;
                await __qa.backupUi.go('daily');
            }, skin);
            await page.screenshot({ path: path.join(output, `${skin}-daily-night-390.png`), animations: 'disabled' });
            await page.evaluate(async () => {
                await __qa.backupUi.go('history');
                __qa.backupUi.source = 'manual';
                __qa.backupUi.menu = 'manual';
            });
            await page.screenshot({ path: path.join(output, `${skin}-actions-night-390.png`), animations: 'disabled' });
            assert.equal(await surface.getByRole('button', { name: '删除', exact: true }).isVisible(), true);
        }
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ layouts, errors, sharedJsonHistory: true,
            scopeCheckboxes: true, nativeBackHierarchy: true }, null, 2));
        console.log('Backup navigation, JSON scope, merged source filters, inline actions and daily setting passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
