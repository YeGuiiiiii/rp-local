const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const fixture = process.argv[2];
if (!fixture || !fs.existsSync(fixture)) throw new Error('Pass a local backup path. Data stays in an isolated browser; only numeric results are saved.');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-precise-memory-info'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(installFiles, { persistFiles: false, skin: 'classic' });
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
        return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    const page = await context.newPage();
    const ready = async () => {
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false; __qa.showAnnouncement = false;
            __qa.navigateWorkspace('settings'); __qa.navigateWorkspace('backup');
        });
    };
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
        const report = { fileBytes: fs.statSync(fixture).size, profiles: [] };
        for (const profile of ['balanced', 'fast']) {
            await page.evaluate(profile => { __qa.backupProfile = profile; }, profile);
            const start = Date.now();
            await page.getByLabel('选择流式导入文件').setInputFiles(path.resolve(fixture));
            await page.waitForFunction(() => ['ready', 'failed'].includes(__qa.streamImportPanel.state.phase), null, { timeout: 180000 });
            const result = await page.evaluate(() => ({ phase: __qa.streamImportPanel.state.phase,
                summary: __qa.streamImportPanel.state.summary }));
            report.profiles.push({ profile, seconds: (Date.now() - start) / 1000, ...result });
            if (profile === 'balanced') await page.getByRole('button', { name: '关闭导入弹窗', exact: true }).click();
        }
        assert.equal(report.profiles[1].phase, 'ready');
        const reload = page.waitForEvent('load', { timeout: 180000 }), applyStart = Date.now();
        await page.getByRole('dialog', { name: '导入备份', exact: true }).getByRole('button', { name: '确认导入', exact: true }).click();
        await reload; await ready();
        report.applyAndReopenSeconds = (Date.now() - applyStart) / 1000;
        await page.evaluate(() => {
            window.__measureChunks = [];
            window.AndroidBridge = {
                isNativeApp: () => true, createBackupFileToDownloads: () => 'OK:measure',
                writeBackupChunk: (token, base64) => {
                    __measureChunks.push(Uint8Array.from(atob(base64), char => char.charCodeAt(0)));
                    return 'OK';
                }, finishBackupWrite: () => 'OK', abortBackupWrite: () => {}
            };
        });
        const exportStart = Date.now();
        await page.evaluate(() => __qa.exportAllData());
        report.exportSeconds = (Date.now() - exportStart) / 1000;
        Object.assign(report, await page.evaluate(() => ({
            exportChunks: __measureChunks.length, maxChunkBytes: Math.max(...__measureChunks.map(bytes => bytes.length)),
            exportBytes: __measureChunks.reduce((sum, bytes) => sum + bytes.length, 0),
            completed: __qa.backupTask.percent === 100 && !__qa.backupTask.error
        })));
        assert.equal(report.completed, true);
        await page.getByRole('button', { name: '关闭备份弹窗', exact: true }).click();
        await page.evaluate(() => {
            __qa.backupProfile = 'fast';
            const file = new File(__measureChunks, 'roundtrip.json', { type: 'application/json' });
            __measureChunks.length = 0;
            __qa.streamImportPanel.start({ target: { value: '', files: [file] } });
        });
        await page.waitForFunction(() => ['ready', 'failed'].includes(__qa.streamImportPanel.state.phase), null, { timeout: 180000 });
        report.roundtrip = await page.evaluate(() => ({
            phase: __qa.streamImportPanel.state.phase, summary: __qa.streamImportPanel.state.summary
        }));
        assert.equal(report.roundtrip.phase, 'ready');
        assert.equal(report.roundtrip.summary.cards, report.profiles[1].summary.cards);
        assert.equal(report.roundtrip.summary.messages, report.profiles[1].summary.messages);
        fs.mkdirSync(path.join(root, 'verification/backup-2.9.005'), { recursive: true });
        fs.writeFileSync(path.join(root, 'verification/backup-2.9.005/real-backup-numbers.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report, null, 2));
        await page.getByRole('button', { name: '取消', exact: true }).click();
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
