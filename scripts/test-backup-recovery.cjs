const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const installFiles = require('./mock-files.cjs');
const web = path.resolve(__dirname, '../web');
const origin = 'https://sta1n156.github.io';
const start = origin + '/RP-Hub/';

async function open(browser, { limit = false, native = false } = {}) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    if (native) await context.addInitScript(installFiles);
    else await context.addInitScript(() => localStorage.setItem('rp-local-release-shown', '99999999'));
    if (limit) await context.addInitScript(() => {
        Object.defineProperty(performance, 'memory', { value: { jsHeapSizeLimit: 128 * 1048576, usedJSHeapSize: 48 * 1048576 } });
    });
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin || !url.pathname.startsWith('/RP-Hub/')) return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
        return route.fulfill({ path: file });
    });
    const page = await context.newPage();
    await page.goto(start);
    await ready(page);
    return page;
}

async function ready(page) {
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
        window.qa = document.querySelector('#app').__vue_app__._container._vnode.component.setupState;
        qa.showUserSetupModal = false;
        qa.closeAnnouncement();
    });
    await page.waitForFunction(() => qa.imageApi.ready);
}

async function exportPack(page) {
    return page.evaluate(async () => {
        const parts = [];
        window.showSaveFilePicker = async () => ({
            createWritable: async () => ({ write: part => parts.push(part), close() {}, async abort() {} })
        });
        await qa.exportAllData();
        if (qa.backupTask.error) throw new Error(qa.backupTask.error);
        return parts.join('');
    });
}

async function restorePack(page, text) {
    await page.evaluate(() => qa.navigateWorkspace('backup'));
    await page.locator('.backup-page:visible input[type=file]').first().setInputFiles({
        name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(text)
    });
    await page.waitForFunction(() => ['ready', 'failed'].includes(qa.streamImportPanel.state.phase));
    const phase = await page.evaluate(() => qa.streamImportPanel.state.phase);
    if (phase === 'ready') {
        await page.evaluate(() => { qa.streamImportPanel.apply(); });
        await page.waitForFunction(() => !window.qa || ['success', 'failed', 'recovery'].includes(qa.streamImportPanel.state.phase));
    }
    const error = await page.evaluate(() => window.qa?.streamImportPanel.state.error);
    assert.ok(!error, `Restore failed: ${error}`);
    await page.waitForFunction(() => !window.qa && window.__rpDataReady);
    await ready(page);
}

async function rollback(browser, mode) {
    const page = await open(browser);
    try {
        const result = await page.evaluate(async mode => {
            const storage = RPHubStorage;
            const original = { uuid: 'before', name: 'Before', description: 'Original body' };
            await storage.saveCharacterLibrary([original]);
            await storage.setStoredValue('fixture', 'old');
            await storage.setScopedStoredValue('chat', 'before', [{ role: 'assistant', content: 'Original chat' }]);
            await storage.replaceMemoryScopeList('before', [{ summary: 'Original memory' }]);
            localStorage.setItem('test-pref', 'old');
            const session = await RPStreamImport.stageEntries([
                { key: 'rp_hub_fixture', value: 'new' },
                { key: 'rp_hub_characters', value: [{ uuid: 'after', name: 'After', description: 'New body' }] },
                { key: 'rp_hub_chat_before', value: [{ role: 'assistant', content: 'New chat' }] },
                { key: 'rp_hub_b1_memory_state_before', value: { schema: 1, revision: '11111111111111111111111111111111', deleted: true } },
                { key: '__ls__:test-pref', value: 'new' },
            ]);
            const controller = new AbortController();
            const setItem = Storage.prototype.setItem;
            if (mode === 'quota') Storage.prototype.setItem = function (key, value) {
                if (key === 'test-pref' && value === 'new') throw new DOMException('Test quota', 'QuotaExceededError');
                return setItem.call(this, key, value);
            };
            let error;
            try {
                await RPStreamImport.apply(session, {
                    beforeApply: async () => {},
                    restoreValue: value => value,
                    signal: controller.signal,
                    progress(_done, _total, label) { if (mode === 'cancel' && !label) controller.abort(); }
                });
            } catch (failure) { error = failure.name; }
            finally { Storage.prototype.setItem = setItem; }
            const [card] = await storage.readCharacterDirectory();
            let body;
            try { body = (await storage.readCharacter(card)).description; }
            catch (failure) { body = failure.name; }
            return {
                error, card: card.uuid, body, fixture: await storage.getStoredValue('fixture'),
                chat: (await storage.getScopedStoredValue('chat', 'before'))[0].content,
                memory: (await storage.readMemoryState('before')).list[0]?.summary,
                pref: localStorage.getItem('test-pref')
            };
        }, mode);
        assert.deepEqual(result, {
            error: mode === 'cancel' ? 'AbortError' : 'QuotaExceededError',
            card: 'before', body: 'Original body', fixture: 'old', chat: 'Original chat',
            memory: 'Original memory', pref: 'old'
        });
    } finally { await page.context().close(); }
}

async function moments(browser) {
    const source = await open(browser);
    const target = await open(browser, { limit: true });
    try {
        await source.evaluate(() => new Promise((resolve, reject) => {
            const request = indexedDB.open('sf_moments_db', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('moments');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('moments', 'readwrite');
                tx.objectStore('moments').put([{ id: 'scene', content: 'x'.repeat(17 * 1048576) }], 'list');
                tx.onabort = () => { db.close(); reject(tx.error); };
                tx.oncomplete = () => { db.close(); resolve(); };
            };
        }));
        assert.equal(await target.evaluate(() => RPStreamImportLimits(RPStreamImport.profile()).unitBytes), 32 * 1048576);
        await restorePack(target, await exportPack(source));
        assert.equal(await target.evaluate(() => new Promise((resolve, reject) => {
            const open = indexedDB.open('sf_moments_db');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
                const db = open.result;
                const get = db.transaction('moments').objectStore('moments').get('list');
                get.onsuccess = () => { db.close(); resolve(get.result[0].content.length); };
                get.onerror = () => { db.close(); reject(get.error); };
            };
        })), 17 * 1048576);
    } finally { await target.context().close(); await source.context().close(); }
}

async function restartRecovery(browser, mode) {
    const page = await open(browser, { native: true });
    try {
        const interrupted = await page.evaluate(async mode => {
            await RPHubStorage.saveCharacterLibrary([{ uuid: 'before', name: 'Before', description: 'Old body' }]);
            await RPLocalStore.flush();
            localStorage.setItem('restore-pref', 'old');
            const session = await RPStreamImport.stageEntries([
                { key: 'rp_hub_characters', value: [{ uuid: 'after', name: 'After', description: 'New body' }] },
                { key: '__ls__:restore-pref', value: 'new' },
            ]);
            const stage = await RPStreamImport.database();
            await new Promise((resolve, reject) => {
                const tx = stage.transaction('restore_companions', 'readwrite');
                tx.objectStore('restore_companions').put({
                    session, database: 'sf_moments_db', store: 'moments', part: 0, bytes: 40,
                    value: { k: 'list', v: [{ id: 'new-scene' }] }
                });
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
            });
            stage.close();
            const controller = new AbortController();
            const setItem = Storage.prototype.setItem;
            const write = RPLocalFiles.writeTextIfChanged;
            if (mode === 'before') Storage.prototype.setItem = function (key, value) {
                if (key === 'restore-pref') throw new Error('Interrupted before rollback could finish');
                return setItem.call(this, key, value);
            };
            else RPLocalFiles.writeTextIfChanged = (file, value) => file === '个人数据/同步版本.json'
                ? JSON.stringify({ ok: false, error: 'Interrupted file mirror' }) : write(file, value);
            try {
                await RPStreamImport.apply(session, {
                    beforeApply: async () => {}, restoreValue: value => value, signal: controller.signal,
                    progress(_done, _total, label) { if (mode === 'before' && !label) controller.abort(); }
                });
                return null;
            } catch (error) {
                const journal = await RPStreamImport.database();
                try {
                    return {
                        required: error.recoveryRequired,
                        session: (await RPStreamImport.readSession(journal, session))?.state,
                        paused: RPHubStorage.getStorageWriteState().paused
                    };
                } finally { journal.close(); }
            }
        }, mode);
        assert.deepEqual(interrupted, { required: true, session: 'applying', paused: true });
        await page.reload();
        await ready(page);
        const recovered = await page.evaluate(async () => {
            const [card] = await RPHubStorage.readCharacterDirectory();
            const scene = await new Promise((resolve, reject) => {
                const open = indexedDB.open('sf_moments_db', 1);
                open.onerror = () => reject(open.error);
                open.onsuccess = () => {
                    const db = open.result;
                    const get = db.transaction('moments').objectStore('moments').get('list');
                    get.onsuccess = () => { db.close(); resolve(get.result?.[0]?.id); };
                    get.onerror = () => { db.close(); reject(get.error); };
                };
            });
            const file = RPLocalStore.read(`角色卡数据/${card.storageFolder}/角色卡.json`);
            return {
                card: card.uuid, body: (await RPHubStorage.readCharacter(card)).description, file: file?.description,
                pref: localStorage.getItem('restore-pref'), scene, paused: RPHubStorage.getStorageWriteState().paused,
                marker: (await RPHubStorage.readStorageKeys(RPHubStorage.getMainDb())).some(key => key.startsWith('__rp_restore_commit__:'))
            };
        });
        assert.deepEqual(recovered, mode === 'before'
            ? { card: 'before', body: 'Old body', file: 'Old body', pref: 'old', scene: undefined, paused: false, marker: false }
            : { card: 'after', body: 'New body', file: 'New body', pref: 'new', scene: 'new-scene', paused: false, marker: false });
    } finally { await page.context().close(); }
}

async function imageBackup(browser, native) {
    const source = await open(browser, { native });
    const target = await open(browser, { native });
    try {
        if (native) await target.evaluate(() => qa.imageApi.update('key', 'target-key'));
        await source.evaluate(async () => {
            const api = qa.imageApi;
            await api.update('key', 'fixture-default-key');
            await api.add();
            for (const [field, value] of Object.entries({
                name: 'Fixture provider', url: 'https://image.invalid/v1',
                model: 'fixture-model', size: '768x1152', key: 'fixture-custom-key'
            })) await api.update(field, value);
        });
        const backup = await exportPack(source);
        const settings = JSON.parse(backup).entries.find(item => item.key === 'rp_hub_settings').value;
        assert.equal(settings.imageGenKey, 'fixture-default-key', 'Immediate export must preserve the current default-site key');
        await restorePack(target, backup);
        assert.deepEqual(await target.evaluate(() => {
            const api = qa.imageApi;
            const { name, url, model, size, key } = api.current;
            return { name, url, model, size, key, builtin: api.profiles.find(profile => profile.id === 'builtin').key };
        }), {
            name: 'Fixture provider', url: 'https://image.invalid/v1', model: 'fixture-model', size: '768x1152',
            key: 'fixture-custom-key', builtin: 'fixture-default-key'
        });
        await target.evaluate(() => qa.imageApi.update('key', 'edited-after-restore'));
        await target.reload();
        await ready(target);
        assert.equal(await target.evaluate(() => qa.imageApi.current.key), 'edited-after-restore');
        const oldPack = JSON.parse(backup);
        const oldSettings = oldPack.entries.find(item => item.key === 'rp_hub_settings').value;
        delete oldSettings.imageProviderBackup;
        oldSettings.imageGenKey = 'ambiguous-legacy-key';
        await restorePack(target, JSON.stringify(oldPack));
        assert.deepEqual(await target.evaluate(() => qa.imageApi.profiles.map(profile => profile.key)),
            ['fixture-default-key', 'edited-after-restore']);
    } finally { await target.context().close(); await source.context().close(); }
}

async function imageSaveFailure(browser) {
    const page = await open(browser, { native: true });
    try {
        const result = await page.evaluate(async () => {
            const write = RPLocalFiles.writeTextIfChanged;
            RPLocalFiles.writeTextIfChanged = (file, text) => file === '个人数据/生图接口.json'
                ? JSON.stringify({ ok: false, error: 'Profile write failed' }) : write(file, text);
            await qa.imageApi.update('key', 'not-saved');
            let opened = false;
            window.showSaveFilePicker = async () => { opened = true; throw new Error('Unexpected export'); };
            await qa.exportAllData();
            return { opened, error: qa.backupTask.error };
        });
        assert.deepEqual(result, { opened: false, error: 'Profile write failed' });
    } finally { await page.context().close(); }
}

async function gallery(browser, mode) {
    const page = await open(browser, { native: true });
    try {
        await page.evaluate(mixed => {
            qa.characters = [{ uuid: 'album', name: 'Fixture album', storageFolder: 'Fixture album' }];
            const file = '图片/Fixture album/photo.png';
            RPLocalFiles.writeImage(file, 'AA==');
            if (mixed) RPLocalFiles.writeImage('图片/Fixture album/second.png', 'AA==');
            const remove = RPLocalFiles.remove;
            RPLocalFiles.remove = path => path === file
                ? JSON.stringify({ ok: false, error: 'Test write failure' }) : remove(path);
            qa.navigateWorkspace('album');
        }, mode === 'delete-failure');
        await page.getByRole('button', { name: '打开相簿：Fixture album' }).click();
        const photo = page.getByRole('button', { name: '第 1 张图片', exact: true });
        await photo.hover();
        await page.mouse.down();
        await page.waitForFunction(() => document.querySelector('.shell-photo-cell')?.getAttribute('aria-pressed') === 'true');
        if (mode === 'long-press') {
            await page.mouse.up();
            assert.equal(await photo.getAttribute('aria-pressed'), 'true');
            await photo.click();
            assert.equal(await photo.getAttribute('aria-pressed'), null, 'A subsequent click still deselects');
            const touch = await page.context().newCDPSession(page);
            const bounds = await photo.boundingBox();
            const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
            await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
            await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: point.x + 35 }] });
            await page.waitForTimeout(500);
            assert.equal(await photo.getAttribute('aria-pressed'), null, 'A swipe does not enter selection');
            await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
            await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
            await page.waitForFunction(() => document.querySelector('.shell-photo-cell')?.getAttribute('aria-pressed') === 'true');
            await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            assert.equal(await photo.getAttribute('aria-pressed'), 'true', 'Lifting a finger leaves the photo selected');
            await photo.press('Space');
            assert.equal(await photo.getAttribute('aria-pressed'), null, 'Keyboard selection still works');
        } else {
            await page.mouse.move(1, 1);
            await page.mouse.up();
            await page.getByRole('button', { name: '全选', exact: true }).click();
            page.once('dialog', dialog => dialog.accept());
            await page.locator('.shell-gallery-actions').getByRole('button', { name: '删除', exact: true }).click();
            assert.match(await page.locator('.shell-gallery-notice').textContent(), /已删除 1 张，失败 1 张/);
            assert.equal(await page.locator('.shell-photo-cell').count(), 1);
            assert.match(await photo.locator('img').getAttribute('src'), /\/photo\.png$/);
        }
    } finally { await page.context().close(); }
}

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const cases = {
        cancel: () => rollback(browser, 'cancel'),
        quota: () => rollback(browser, 'quota'),
        'restart-before-commit': () => restartRecovery(browser, 'before'),
        'restart-after-commit': () => restartRecovery(browser, 'after'),
        moments: () => moments(browser),
        'image-browser': () => imageBackup(browser, false),
        'image-local-files': () => imageBackup(browser, true),
        'image-save-failure': () => imageSaveFailure(browser),
        'long-press': () => gallery(browser, 'long-press'),
        'delete-failure': () => gallery(browser, 'delete-failure'),
    };
    try {
        for (const [name, run] of Object.entries(cases)) {
            if (process.argv.length > 2 && !process.argv.includes(name)) continue;
            try { await run(); console.log(`PASS ${name}`); }
            catch (error) { console.error(`FAIL ${name}`, error); process.exitCode = 1; }
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
