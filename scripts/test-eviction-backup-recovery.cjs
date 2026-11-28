const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const installFiles = require('./mock-files.cjs');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const source = name => fs.readFileSync(path.join(root, 'web/assets', name), 'utf8');
const origin = 'https://sta1n156.github.io';
const start = origin + '/RP-Hub/';

async function openApp(browser, { persistFiles = false, injectInit = null, apiHandler = null, routeFilter = null } = {}) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    await context.addInitScript(installFiles, { persistFiles, skin: null });
    if (typeof injectInit === 'function') await context.addInitScript(injectInit);
    const errors = [];
    await context.route('**/*', route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== origin || !url.pathname.startsWith('/RP-Hub/')) {
            if (typeof apiHandler === 'function') return apiHandler(route, request, url);
            return route.abort();
        }
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
        if (typeof routeFilter === 'function') {
            const handled = routeFilter(route, request, url, file);
            if (handled !== false) return handled;
        }
        return route.fulfill({ path: file });
    });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(start);
    await ready(page);
    return { context, page, errors };
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

// 1a) 完整应用层部分驱逐保护：RPHubDB 仅保留零散配置/新聊天且缺少 rp_hub_characters 时，
//     不得删除本机副本，自动找回角色卡与记忆并弹出提示，且真正删光全部角色卡时不误复活。
async function testPartialEvictionAndDeleteGuard(browser) {
    const { context, page, errors } = await openApp(browser, { persistFiles: true });
    try {
        const largeAvatar = 'data:image/png;base64,' + 'A'.repeat(70000);
        await page.evaluate(async largeAvatar => {
            const card = { uuid: 'evict-card', name: '防驱逐测试卡', description: '完整角色设定', avatar: largeAvatar };
            await RPHubStorage.saveCharacterLibrary([card]);
            await RPHubStorage.setScopedStoredValue('chat', 'evict-card', [
                { id: 'u-1', role: 'user', content: '第一轮提问' },
                { id: 'a-1', role: 'assistant', content: '第一轮回答' }
            ]);
            const largeMem = Array.from({ length: 6 }, (_, i) => ({
                id: 'mem-' + i,
                turn: i + 1,
                summary: '重要分块记忆-' + i + '-' + 'M'.repeat(200 * 1024),
                classicMemory: true,
                enabled: true,
                sourceAssistantIds: i === 0 ? ['a-1'] : ['a-extra-' + i]
            }));
            await RPHubStorage.replaceMemoryScopeList('evict-card', largeMem);
            await RPHubStorage.setScopedStoredValue('branches', 'evict-card', {
                activeBranchId: 'main',
                branches: [{ id: 'main', name: '主线' }]
            });
            await RPLocalStore.flush();
        }, largeAvatar);

        const preSnapshot = await page.evaluate(async () => {
            const fileCount = Object.keys(window.__qaNativeFiles).length;
            const db = RPHubStorage.getMainDb();
            await new Promise((resolve, reject) => {
                const tx = db.transaction('store', 'readwrite');
                const store = tx.objectStore('store');
                store.clear();
                store.put({ apiUrl: 'https://api.example.invalid/v1', theme: 'classic' }, 'rp_hub_settings');
                store.put([
                    { id: 'u-1', role: 'user', content: '第一轮提问' },
                    { id: 'a-1', role: 'assistant', content: '第一轮回答' },
                    { id: 'u-2', role: 'user', content: '驱逐后新增聊天内容' }
                ], 'rp_hub_chat_evict-card');
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
            });
            return { fileCount };
        });
        assert.ok(preSnapshot.fileCount > 0, 'Local files must exist before eviction');

        await page.reload();
        await ready(page);

        const recovered = await page.evaluate(async () => {
            const dir = await RPHubStorage.readCharacterDirectory();
            const fullCard = dir[0] ? await RPHubStorage.readCharacter(dir[0]) : null;
            const chat = await RPHubStorage.getScopedStoredValue('chat', 'evict-card');
            const mem = await RPHubStorage.readMemoryState('evict-card');
            const branches = await RPHubStorage.getScopedStoredValue('branches', 'evict-card');
            const toastText = (qa.toasts || []).map(t => t.message || t.text || '').join('\n');
            return {
                cardCount: dir.length,
                cardUuid: dir[0]?.uuid,
                cardDesc: fullCard?.description,
                avatarLength: fullCard?.avatar?.length || 0,
                chatLength: chat?.length || 0,
                lastChat: chat?.at(-1)?.content || '',
                memLength: mem?.list?.length || 0,
                memFirstPrefix: mem?.list?.[0]?.summary?.slice(0, 8) || '',
                branchesCount: branches?.branches?.length || 0,
                nativeFileCount: Object.keys(window.__qaNativeFiles).length,
                toastText,
            };
        });

        assert.equal(recovered.cardCount, 1, 'Card must be restored from local mirror after partial eviction');
        assert.equal(recovered.cardUuid, 'evict-card');
        assert.equal(recovered.cardDesc, '完整角色设定');
        assert.equal(recovered.avatarLength, largeAvatar.length, 'Large avatar must be restored intact');
        assert.equal(recovered.chatLength, 3, 'Newer chat after eviction must be preserved without rollback');
        assert.equal(recovered.lastChat, '驱逐后新增聊天内容');
        assert.equal(recovered.memLength, 6, 'Classic memories must be recovered from local mirror');
        assert.equal(recovered.memFirstPrefix, '重要分块记忆-0');
        assert.equal(recovered.branchesCount, 1, 'Branches must be recovered from local mirror');
        assert.ok(recovered.nativeFileCount >= preSnapshot.fileCount, 'Partial eviction must never wipe surviving mirror files');
        assert.ok(recovered.toastText.includes('自动找回'), 'User must be notified when auto-recovery runs');

        await page.evaluate(async () => {
            await RPHubStorage.saveCharacterLibrary([]);
            await RPHubStorage.setStoredValue('settings', { apiUrl: 'https://api.example.invalid/v1' });
            await RPLocalStore.flush();
        });
        await page.reload();
        await ready(page);
        const afterRealDelete = await page.evaluate(async () => (await RPHubStorage.readCharacterDirectory()).length);
        assert.equal(afterRealDelete, 0, 'Intentional deletion of all cards must stay empty');
        assert.deepEqual(errors, []);
        console.log('PASS 1a: partial eviction mirror protection & auto-recovery (and real deletion guard)');
    } finally {
        await context.close();
    }
}

// 1b) >4MB 真实分块记忆目录（rphubMemory: 1 + __rp_mem__: 分片）在局部驱逐后的恢复验证
async function testChunkedMemoryPartialEviction(browser) {
    const context = await browser.newContext();
    await context.addInitScript(installFiles, { persistFiles: false, skin: null });
    await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html>' }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    try {
        let files = {};
        async function loadScripts() {
            await page.goto(origin + '/RP-Hub/chunked-eviction');
            await page.evaluate(saved => Object.assign(__qaNativeFiles, saved), files);
            for (const file of ['vendor/vue.global.prod.js', 'js/local-files.js', 'js/stream-import.js']) {
                await page.addScriptTag({ content: source(file) });
            }
            await page.addScriptTag({ content: source('js/data-services.js').split('// --- Shared summary memory utilities ---')[0] });
            await page.evaluate(() => RPHubStorage.initDB());
        }

        await loadScripts();
        const seeded = await page.evaluate(async () => {
            await RPHubStorage.saveCharacterLibrary([{ uuid: 'chunk-mem-card', name: '分块记忆驱逐卡' }]);
            const largeMem = Array.from({ length: 6 }, (_, i) => ({
                id: 'chunk-mem-' + i,
                turn: i + 1,
                summary: '超大记忆-' + i + '-' + 'Z'.repeat(900 * 1024),
                classicMemory: true,
                enabled: true
            }));
            await RPHubStorage.replaceMemoryScopeList('chunk-mem-card', largeMem);
            await RPHubStorage.setScopedStoredValue('chat', 'chunk-mem-card', [
                { id: 'u1', role: 'user', content: '你好' },
                { id: 'a1', role: 'assistant', content: '在的' }
            ]);
            await RPLocalStore.flush();
            const db = RPHubStorage.getMainDb();
            const keys = await RPHubStorage.readStorageKeys(db);
            const rawDir = await new Promise((resolve, reject) => {
                const req = db.transaction('store').objectStore('store').get('rp_hub_classic_memories_chunk-mem-card');
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            return {
                rphubMemory: rawDir?.rphubMemory,
                memChunkKeys: keys.filter(k => k.startsWith('__rp_mem__:')).length,
                nativeKeys: Object.keys(__qaNativeFiles).length
            };
        });
        assert.equal(seeded.rphubMemory, 1, 'Seeded memory >4MB must create rphubMemory: 1 chunk directory');
        assert.ok(seeded.memChunkKeys >= 2, 'Seeded memory must create >=2 __rp_mem__: chunk keys');

        // 模拟局部驱逐：清掉 rp_hub_characters、rphubMemory 目录及 __rp_mem__ 分片，仅写回零散设置与新聊天
        files = await page.evaluate(async () => {
            const db = RPHubStorage.getMainDb();
            await new Promise((resolve, reject) => {
                const tx = db.transaction('store', 'readwrite');
                const store = tx.objectStore('store');
                store.clear();
                store.put({ theme: 'classic' }, 'rp_hub_settings');
                store.put([
                    { id: 'u1', role: 'user', content: '你好' },
                    { id: 'a1', role: 'assistant', content: '在的' },
                    { id: 'u2', role: 'user', content: '局部驱逐后的新增提问' }
                ], 'rp_hub_chat_chunk-mem-card');
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
            });
            db.close();
            return __qaNativeFiles;
        });

        await loadScripts();
        const after = await page.evaluate(async () => {
            const cards = await RPHubStorage.readCharacterDirectory();
            const mem = await RPHubStorage.readMemoryState('chunk-mem-card');
            const chat = await RPHubStorage.getScopedStoredValue('chat', 'chunk-mem-card');
            return {
                cards: cards.length,
                memCount: mem?.list?.length || 0,
                memLastSummaryLen: mem?.list?.at(-1)?.summary?.length || 0,
                chatLen: chat?.length || 0,
                chatLast: chat?.at(-1)?.content || '',
                noticeCards: window.__rpLocalRecoveryNotice?.cards || 0
            };
        });

        assert.equal(after.cards, 1);
        assert.equal(after.memCount, 6, 'All 6 chunked memories must be restored from rphubMemory directory + __rp_mem__ shards');
        assert.ok(after.memLastSummaryLen > 900 * 1024);
        assert.equal(after.chatLen, 3);
        assert.equal(after.chatLast, '局部驱逐后的新增提问');
        assert.equal(after.noticeCards, 1);
        assert.deepEqual(errors, []);
        console.log('PASS 1b: >4MB rphubMemory chunked memories recover cleanly after partial eviction');
    } finally {
        await context.close();
    }
}

// 2) 备份导出残档拦路闸：激活角色下记忆降级或主库缺 rp_hub_characters 时拦截手动与自动备份
async function testIncompleteBackupGate(browser) {
    const { context, page, errors } = await openApp(browser);
    try {
        await page.evaluate(async () => {
            await RPHubStorage.saveCharacterLibrary([{ uuid: 'gate-card', name: '闸门测试卡', description: 'desc' }]);
            await RPHubStorage.replaceMemoryScopeList('gate-card', [{ id: 'm1', turn: 1, summary: '正常记忆', classicMemory: true, enabled: true }]);
            await RPHubStorage.setStoredValue('last_active_char', 0);
            await RPHubStorage.setStoredValue('last_active_char_id', 'gate-card');
        });
        await page.reload();
        await ready(page);

        const activeUuid = await page.evaluate(() => qa.currentCharacter?.uuid);
        assert.equal(activeUuid, 'gate-card', 'Target character must be active before running gate checks');

        const gateResults = await page.evaluate(async () => {
            let pickerCalls = 0;
            window.showSaveFilePicker = async () => {
                pickerCalls++;
                return { createWritable: async () => ({ write() {}, close() {}, async abort() {} }) };
            };
            // Case A: classicMemoryLoad 处于 error 降级态
            Object.assign(qa.classicMemoryLoad, { status: 'error', error: '记忆读取失败，原记录已保留。' });
            await qa.exportAllData();
            const exportErrMem = qa.backupTask.error;
            qa.backupTask.active = false;
            await qa.performDailyAutoBackup(true);
            const autoToastMem = (qa.toasts || []).map(t => t.message || '').join('\n');
            const callsAfterCaseA = pickerCalls;

            // Case B: 主库缺少 rp_hub_characters 但内存列表非空
            Object.assign(qa.classicMemoryLoad, { status: 'ready', error: '' });
            const db = RPHubStorage.getMainDb();
            const savedChars = await new Promise((resolve, reject) => {
                const req = db.transaction('store').objectStore('store').get('rp_hub_characters');
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            await new Promise((resolve, reject) => {
                const tx = db.transaction('store', 'readwrite');
                tx.objectStore('store').delete('rp_hub_characters');
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
            });
            qa.backupTask.error = '';
            await qa.exportAllData();
            const exportErrMissingChars = qa.backupTask.error;
            qa.backupTask.active = false;
            const callsAfterCaseB = pickerCalls;

            // Case C: 恢复 rp_hub_characters 后正常导出可通过
            await new Promise((resolve, reject) => {
                const tx = db.transaction('store', 'readwrite');
                tx.objectStore('store').put(savedChars, 'rp_hub_characters');
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
            });
            qa.backupTask.error = '';
            await qa.exportAllData();
            const exportOkErr = qa.backupTask.error;
            return { pickerCalls, callsAfterCaseA, callsAfterCaseB, exportErrMem, autoToastMem, exportErrMissingChars, exportOkErr };
        });

        assert.equal(gateResults.callsAfterCaseA, 0, 'Blocked memory-error export must not open file picker');
        assert.equal(gateResults.callsAfterCaseB, 0, 'Blocked missing-characters export must not open file picker');
        assert.equal(gateResults.pickerCalls, 1, 'Only valid export opens file picker once');
        assert.ok(gateResults.exportErrMem.includes('记忆尚未读取成功'), 'Manual export must block when memory failed to load');
        assert.ok(gateResults.autoToastMem.includes('记忆尚未读取成功'), 'Auto backup must block when memory failed to load');
        assert.ok(gateResults.exportErrMissingChars.includes('缺少角色卡记录'), 'Manual export must block when rp_hub_characters is missing');
        assert.equal(gateResults.exportOkErr, '', 'Valid export must pass cleanly');
        assert.deepEqual(errors, []);
        console.log('PASS 2: incomplete backup gate blocks both manual export & auto-backup without false success');
    } finally {
        await context.close();
    }
}

// 3) 流式导入：Worker + Client 真实链路下 backing store 报错翻译成大白话中文 + 低空间预警 + recover() 容错
async function testImportStorageDiagnosticsAndRecovery(browser) {
    const { context, page, errors } = await openApp(browser, {
        injectInit: () => {
            try {
                Object.defineProperty(navigator, 'storage', {
                    configurable: true,
                    value: {
                        estimate: async () => ({ quota: 200 * 1048576, usage: 150 * 1048576 }),
                        persist: async () => true,
                        persisted: async () => true,
                    }
                });
            } catch (_) {}
            const origOpen = IDBFactory.prototype.open;
            IDBFactory.prototype.open = function (name) {
                if (name === 'RPHubStagingDB') {
                    const req = {
                        onerror: null, onsuccess: null, onupgradeneeded: null, onblocked: null,
                        error: new DOMException('Internal error opening backing store for indexedDB.open.', 'UnknownError')
                    };
                    setTimeout(() => { if (typeof req.onerror === 'function') req.onerror({ target: req }); }, 0);
                    return req;
                }
                return origOpen.apply(this, arguments);
            };
        },
        routeFilter: (route, _request, url, file) => {
            if (!url.pathname.endsWith('stream-import-worker.js')) return false;
            const workerHook = `
(() => {
    const origOpen = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name) {
        if (name === 'RPHubStagingDB') {
            const req = {
                onerror: null, onsuccess: null, onupgradeneeded: null, onblocked: null,
                error: new DOMException('Internal error opening backing store for indexedDB.open.', 'UnknownError')
            };
            setTimeout(() => { if (typeof req.onerror === 'function') req.onerror({ target: req }); }, 0);
            return req;
        }
        return origOpen.apply(this, arguments);
    };
})();
`;
            return route.fulfill({
                contentType: 'application/javascript',
                body: workerHook + '\n' + fs.readFileSync(file, 'utf8')
            });
        }
    });
    try {
        assert.equal(await page.evaluate(() => window.__rpDataReady), true);

        const sampleBackup = JSON.stringify({
            type: 'rp-hub-complete-backup',
            __rphub_backup__: 1,
            version: 8,
            entries: [
                { key: 'rp_hub_characters', value: [{ uuid: 'imp-1', name: '导入测试卡', description: 'hello' }] }
            ],
            databases: {},
            webStorage: { localStorage: {} }
        });
        await page.evaluate(() => qa.navigateWorkspace('backup'));
        await page.locator('.backup-page:visible input[type=file]').first().setInputFiles({
            name: 'test-low-space.json',
            mimeType: 'application/json',
            buffer: Buffer.from(sampleBackup)
        });
        await page.waitForFunction(() => qa.streamImportPanel.state.phase === 'failed', { timeout: 10000 });
        await page.waitForFunction(() => !!qa.streamImportPanel.state.storageWarning, { timeout: 5000 });
        const result = await page.evaluate(() => ({
            phase: qa.streamImportPanel.state.phase,
            error: qa.streamImportPanel.state.error,
            warning: qa.streamImportPanel.state.storageWarning,
        }));
        assert.equal(result.phase, 'failed');
        assert.ok(result.error.includes('手机可用存储空间不足或浏览器数据库底层无法打开'), 'Raw worker backing store error must be translated to friendly Chinese');
        assert.ok(result.error.includes('2 GB'), 'Translated message should advise freeing storage');
        assert.ok(result.warning.includes('当前浏览器可用存储空间约'), 'Low storage estimate must produce warning banner');

        const clientFormat = await page.evaluate(async () => {
            let caught = '';
            try { await RPStreamImport.database(); }
            catch (err) { caught = err.message; }
            return caught;
        });
        assert.ok(clientFormat.includes('手机可用存储空间不足或浏览器数据库底层无法打开'));

        const recoverOk = await page.evaluate(async () => {
            const origDbs = indexedDB.databases;
            indexedDB.databases = async () => [{ name: 'RPHubDB', version: 2 }, { name: 'RPHubStagingDB', version: 1 }];
            try {
                await RPStreamImport.recover(RPHubStorage.getMainDb());
                return true;
            } finally {
                indexedDB.databases = origDbs;
            }
        });
        assert.equal(recoverOk, true, 'recover() must tolerate unopenable staging DB when no commit marker exists');
        assert.deepEqual(errors, []);
        console.log('PASS 3: Worker + UI backing store error translation, storage warning & tolerant recover()');
    } finally {
        await context.close();
    }
}

// 4) 补录记忆幽灵 2/2 假进度与向量总数跳变修复
async function testBackfillSkipsEmptyTurnsCleanly(browser) {
    let summaryCalls = 0;
    const { context, page, errors } = await openApp(browser, {
        apiHandler: (route, request, url) => {
            if (url.pathname.endsWith('/chat/completions')) {
                summaryCalls++;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ choices: [{ message: { content: '新增的第4轮总结内容。' } }] })
                });
            }
            if (url.pathname.endsWith('/embeddings')) {
                const payload = JSON.parse(request.postData() || '{}');
                const inputs = Array.isArray(payload.input) ? payload.input : [payload.input || ''];
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: inputs.map((_, index) => ({ index, embedding: [0.1, 0.2, 0.3, 0.4] })) })
                });
            }
            return route.abort();
        }
    });
    try {
        await page.evaluate(async () => {
            const card = { uuid: 'ghost-card', name: '幽灵轮次测试卡', description: 'd' };
            await RPHubStorage.saveCharacterLibrary([card]);
            await RPHubStorage.setStoredValue('last_active_char', 0);
            await RPHubStorage.setStoredValue('last_active_char_id', 'ghost-card');
            await RPHubStorage.setStoredValue('settings', {
                apiUrl: 'https://mock-api.invalid/v1',
                apiKey: 'sk-test-1234',
                model: 'test-model'
            });
            await RPHubStorage.setStoredValue('memory_settings', {
                enabled: true,
                mode: 'enhanced',
                classicModel: 'test-model',
                embeddingModel: 'test-emb',
                classicConcurrency: 1
            });
            await RPHubStorage.setScopedStoredValue('chat', 'ghost-card', [
                { id: 'u1', role: 'user', content: '第一轮正常问题' },
                { id: 'a1', role: 'assistant', content: '第一轮正常回答' },
                { id: 'u2', role: 'user', content: '第二轮未闭合think提问' },
                { id: 'a2', role: 'assistant', content: '<think>\n未闭合思考标签吞掉的正文' },
                { id: 'u3', role: 'user', content: '第三轮空回复提问' },
                { id: 'a3', role: 'assistant', content: '' }
            ]);
            await RPHubStorage.replaceMemoryScopeList('ghost-card', [
                {
                    id: 'mem-1',
                    no: 1,
                    turn: 1,
                    summary: '第一轮已有总结。',
                    classicMemory: true,
                    enabled: true,
                    sourceUserIds: ['u1'],
                    sourceAssistantIds: ['a1'],
                    sourceUserText: '第一轮正常问题',
                    sourceAssistantText: '第一轮正常回答',
                    embedding: [0.1, 0.2, 0.3, 0.4],
                    embeddingModel: 'test-emb'
                }
            ]);
        });
        await page.reload();
        await ready(page);

        assert.equal(await page.evaluate(() => qa.currentCharacter?.uuid), 'ghost-card');

        for (let attempt = 1; attempt <= 2; attempt++) {
            await page.evaluate(() => qa.startBatchMemoryExtraction());
            await page.waitForFunction(() => qa.memoryBackfillProgress.status === 'done', { timeout: 10000 });
            const snap = await page.evaluate(() => ({
                status: qa.memoryBackfillProgress.status,
                message: qa.memoryBackfillProgress.message,
                stages: qa.memoryBackfillProgress.stages.map(s => ({ key: s.key, current: s.current, total: s.total }))
            }));
            const summaryStage = snap.stages.find(s => s.key === 'summary');
            const vectorStage = snap.stages.find(s => s.key === 'vector');
            assert.equal(summaryCalls, 0, `Attempt ${attempt}: no summary API call should happen`);
            assert.equal(summaryStage.total, 0, `Attempt ${attempt}: empty/unclosed-cot turns must not create ghost 2/2 progress`);
            assert.equal(vectorStage.total, 1, `Attempt ${attempt}: vector total must not inflate with ghost turns`);
            assert.equal(vectorStage.current, 1);
            assert.ok(snap.message.includes('跳过 2 轮'), `Attempt ${attempt}: completion note should explain skipped 2 empty turns`);
        }

        await page.evaluate(async () => {
            const chat = await RPHubStorage.getScopedStoredValue('chat', 'ghost-card');
            chat.push({ id: 'u4', role: 'user', content: '第四轮有效问题' });
            chat.push({ id: 'a4', role: 'assistant', content: '第四轮有效回复内容' });
            qa.chatHistory = chat;
            await RPHubStorage.setScopedStoredValue('chat', 'ghost-card', chat);
            await qa.startBatchMemoryExtraction();
        });
        await page.waitForFunction(() => !qa.isActiveBatchExtracting && qa.memoryBackfillProgress.status === 'done', { timeout: 10000 });
        const afterReal = await page.evaluate(() => ({
            message: qa.memoryBackfillProgress.message,
            stages: qa.memoryBackfillProgress.stages.map(s => ({ key: s.key, current: s.current, total: s.total })),
            memCount: qa.memoryStats.activeTotal
        }));
        const realSummary = afterReal.stages.find(s => s.key === 'summary');
        const realVector = afterReal.stages.find(s => s.key === 'vector');
        assert.equal(summaryCalls, 1, 'Exactly one real uncovered turn must trigger one summary request');
        assert.equal(realSummary.current, 1);
        assert.equal(realSummary.total, 1);
        assert.equal(realVector.total, 2, 'Vector denominator must match actual valid summary count (2)');
        assert.equal(realVector.current, 2);
        assert.equal(afterReal.memCount, 2);
        assert.deepEqual(errors, []);
        console.log('PASS 4: backfill skips empty/unclosed-think turns cleanly without ghost 2/2 or vector shrink');
    } finally {
        await context.close();
    }
}

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        await testPartialEvictionAndDeleteGuard(browser);
        await testChunkedMemoryPartialEviction(browser);
        await testIncompleteBackupGate(browser);
        await testImportStorageDiagnosticsAndRecovery(browser);
        await testBackfillSkipsEmptyTurnsCleanly(browser);
        console.log('ALL 2.9.159 EVICTION / BACKUP GATE / IMPORT DIAGNOSTIC / BACKFILL TESTS PASSED');
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
