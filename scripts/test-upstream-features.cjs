const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const evidence = path.join(root, 'verification/upstream-118');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(installFileBridge);
        await context.addInitScript(() => {
            window.__characterWrites = 0;
            const put = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (value, key) {
                if (key === 'rp_hub_characters') window.__characterWrites++;
                return put.call(this, value, key);
            };
        });
        const page = await context.newPage();
        const errors = [];
        let nativeReads = 0;
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            if (url.pathname === '/RP-Hub/__rphub_backup_read__' && url.searchParams.get('t') === 'fixture-token') {
                nativeReads++;
                return route.fulfill({ json: { type: 'rp-hub-complete-backup', version: 8, entries: [
                    { key: 'rp_hub_characters', value: [{ uuid: 'native-restored', name: '流式读取恢复', createdAt: 1 }] },
                    { key: 'rp_hub_b1_memory_state_restore-deleted',
                        value: { schema: 1, revision: '0'.repeat(32), deleted: true } }
                ] } });
            }
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
            return route.fulfill({ path: file, contentType: ({
                '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css'
            })[path.extname(file)] || 'application/octet-stream' });
        });
        const ready = async () => {
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false;
                __qa.showAnnouncement = false;
            });
        };
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await ready();
        await page.evaluate(async () => {
            __qa.characters = [{ uuid: 'upstream-old', name: '保留原卡', description: '大'.repeat(1048576),
                first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: [], createdAt: 1 }];
            await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
            await RPHubStorage.setScopedStoredValue('chat', 'upstream-old', [{ id: 'old-chat', role: 'assistant', content: '原有正文' }]);
            await __qa.selectCharacter(0, false, { silent: true });
            await new Promise(resolve => setTimeout(resolve, 1400));
            window.__characterWrites = 0;
            __qa.importCharacter({ target: { value: 'fixture', files: [
                new File([JSON.stringify({ name: '新增角色卡', description: '新卡正文', first_mes: '' })],
                    'card.json', { type: 'application/json' })
            ] } });
        });
        await page.waitForFunction(() => __qa.characters.length === 2 && __qa.currentCharacter?.name === '新增角色卡');
        await page.waitForTimeout(1800);
        assert.equal(await page.evaluate(() => window.__characterWrites), 1, 'Import must write the full card collection once');
        assert.equal(await page.evaluate(async () => (await RPHubStorage.getScopedStoredValue('chat', 'upstream-old'))[0].content), '原有正文');
        const uuid = await page.evaluate(() => __qa.currentCharacter.uuid);
        await page.reload();
        await ready();
        assert.equal(await page.evaluate(() => __qa.characters.length), 2);
        assert.equal(await page.evaluate(() => __qa.currentCharacter.uuid), uuid);
        await page.evaluate(async () => { await __qa.scanDataHealth(); __qa.openBackupSizeModal(); });
        await page.waitForFunction(() => __qa.showBackupSizeModal && __qa.backupSizeReport);
        assert.equal(await page.getByRole('heading', { name: '备份体积分析', exact: true }).evaluate(element => {
            const rect = element.getBoundingClientRect();
            return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        }), true, 'The mascot greeting must not cover the backup dialog heading');
        assert.equal(await page.evaluate(() => {
            const speech = document.querySelector('.yy-mascot-speech');
            const dialog = document.querySelector('[role="dialog"][aria-label="备份体积分析"]');
            return !speech || Number(getComputedStyle(speech).zIndex) < Number(getComputedStyle(dialog).zIndex);
        }), true, 'Mascot speech must remain behind dialogs even though it ignores pointer events');
        fs.mkdirSync(evidence, { recursive: true });
        for (const theme of ['day', 'night']) {
            await page.evaluate(theme => RPHubThemeKit.setScheme(theme), theme);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(evidence, `backup-size-${theme}-390.png`) });
        }
        await page.evaluate(() => __qa.shellGoBack());
        assert.equal(await page.evaluate(() => __qa.showBackupSizeModal), false);
        await page.evaluate(async () => {
            await RPHubStorage.replaceMemoryScopeList('restore-deleted', [{ summary: 'remove this existing body' }]);
            window.AndroidBridge = { isNativeApp: () => true, readBackupFileText: () => { throw new Error('Must use stream'); } };
            window.RPLocalFiles.prepareBackupFileRead = () => 'fixture-token';
            __qa.restoreAutoBackupRecord({ id: 'fixture-native-file', name: '测试备份', sizeBytes: 1000 });
        });
        await page.waitForFunction(() => __qa.streamImportPanel.state.phase === 'ready');
        const reloaded = page.waitForEvent('load');
        await page.evaluate(() => { __qa.streamImportPanel.apply(); });
        await reloaded;
        assert.equal(nativeReads, 1, 'Native backup restore must use the local streaming reader');
        await ready();
        assert.equal(await page.evaluate(() => __qa.characters[0].uuid), 'native-restored');
        assert.equal(await page.evaluate(async () => (await RPHubStorage.readMemoryState('restore-deleted')).deleted), true);
        await page.evaluate(async () => {
            window.__savedBackupParts = [];
            window.RPLocalFiles.prepareBackupFileRead = () => 'fixture-token';
            window.AndroidBridge = {
                isNativeApp: () => true,
                beginPickerSave: () => setTimeout(() => rphubPickerSaveReady('copy-token'), 0),
                writeBackupChunk: (token, bytes) => { __savedBackupParts.push(bytes); return 'OK'; },
                finishBackupWrite: () => 'OK', abortBackupWrite: () => {}
            };
            await __qa.exportBackupManagerFile({ id: 'fixture-native-file', fileName: '另存测试.json', sizeBytes: 1000 });
        });
        const copied = await page.evaluate(() => JSON.parse(new TextDecoder().decode(Uint8Array.from(
            __savedBackupParts.map(part => atob(part)).join(''), char => char.charCodeAt(0)))));
        assert.equal(copied.entries.find(entry => entry.key === 'rp_hub_characters').value[0].uuid, 'native-restored');
        assert.equal(nativeReads, 2, '备份历史另存直接复制文件流');
        await page.getByRole('button', { name: '关闭备份弹窗', exact: true }).click();
        assert.deepEqual(errors, []);
        console.log('PASS: import saves once, existing chat survives, reload keeps cards, backup details and back navigation');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
