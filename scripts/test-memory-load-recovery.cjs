const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.join(root, 'verification/memory-load-recovery');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const scenarios = process.argv[2] ? [process.argv[2]]
        : ['skipped-view', 'skipped-manual', 'failed-read', 'target-timeout', 'late-switch', 'failed-write', 'secondary'];
    try {
        for (const scenario of scenarios) {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
            let requests = 0;
            await context.addInitScript(skin => {
                if (skin) {
                    localStorage.setItem('rphub-layout118', '1');
                    localStorage.setItem('rphub-ui-pack', skin);
                }
                localStorage.setItem('rp-local-release-shown', '999999');
                const timeout = window.setTimeout;
                window.setTimeout = (fn, ms, ...args) => timeout(fn, ms === 20000 ? 500 : ms, ...args);
            }, process.env.RPHUB_TEST_SKIN || '');
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.hostname === 'memory.test') {
                    const headers = { 'access-control-allow-origin': '*',
                        'access-control-allow-headers': 'authorization,content-type',
                        'access-control-allow-methods': 'GET,POST,OPTIONS' };
                    if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
                    if (url.pathname.endsWith('/models')) return route.fulfill({ headers, json: { data: [] } });
                    requests++;
                    return route.fulfill({ headers, json: {
                        choices: [{ message: { role: 'assistant', content: 'Generated fixture summary' }, finish_reason: 'stop' }]
                    } });
                }
                if (url.origin !== 'https://sta1n156.github.io') return route.abort();
                const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
                if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                    return route.fulfill({ status: 404, body: '' });
                return route.fulfill({ path: file, contentType: ({
                    '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css'
                })[path.extname(file)] || 'application/octet-stream' });
            });
            const page = await context.newPage();
            const ready = async () => {
                await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
                await page.evaluate(() => {
                    window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                    __qa.showUserSetupModal = false;
                });
            };
            try {
                await page.goto('https://sta1n156.github.io/RP-Hub/');
                await ready();
                await page.evaluate(async scenario => {
                    const cards = ['a', 'b'].map(id => ({
                        uuid: 'load-' + id, name: 'Card ' + id, first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: []
                    }));
                    await RPHubStorage.setStoredValue('characters', cards);
                    for (const card of cards) {
                        const chat = [
                            { id: card.uuid + '-u', role: 'user', content: 'Meet at the clock tower.' },
                            { id: card.uuid + '-a', role: 'assistant', content: 'I will be there.' }
                        ];
                        const memories = [{
                            id: card.uuid + '-m', classicMemory: true, turn: 1, summary: 'Stored memory ' + card.name,
                            sourceUserIds: [card.uuid + '-u'], sourceAssistantIds: [card.uuid + '-a'],
                            extension: { preserve: 'original' }
                        }];
                        if (scenario === 'secondary' && card.uuid === 'load-a') {
                            for (let turn = 2; turn <= 30; turn++) {
                                chat.push({ id: 'u-' + turn, role: 'user', content: 'Question ' + turn },
                                    { id: 'a-' + turn, role: 'assistant', content: 'Answer ' + turn });
                                memories.push({ id: 'm-' + turn, classicMemory: true, turn,
                                    summary: 'Stored turn ' + turn, sourceUserIds: ['u-' + turn], sourceAssistantIds: ['a-' + turn] });
                            }
                        }
                        await RPHubStorage.setScopedStoredValue('chat', card.uuid, chat);
                        await RPHubStorage.replaceMemoryScopeList(card.uuid, memories);
                    }
                    await RPHubStorage.setStoredValue('memory_settings', {
                        enabled: true, mode: 'classic', classicModel: 'test-summary', classicConcurrency: 6,
                        memoryApiUrl: 'https://memory.test/v1', memoryApiKey: 'FAKE_TEST_KEY', summaryKeepFloors: 50
                    });
                    await RPHubStorage.setStoredValue('last_active_char', 0);
                    await RPHubStorage.setStoredValue('last_active_char_id', 'load-a');
                    localStorage.setItem('rphub.memoryBootSkip', '1');
                }, scenario);
                await page.reload();
                await ready();
                assert.equal(await page.evaluate(() => __qa.memoryStats.activeTotal), 0);
                if (scenario === 'skipped-view') {
                    await page.evaluate(() => __qa.navigateWorkspace('memory'));
                    await page.waitForFunction(() => __qa.memoryStats.activeTotal === 1, null, { timeout: 3000 });
                    await page.getByText('Stored memory Card a', { exact: true }).waitFor();
                    assert.equal(await page.getByText('还没有记忆', { exact: true }).count(), 0);
                    assert.equal(await page.evaluate(() => localStorage.getItem('rphub.memoryBootSkip')), null);
                    assert.equal(requests, 0, 'Opening memory must read stored data without generation');
                    await page.screenshot({ path: path.join(output, scenario + '.png') });
                } else if (scenario === 'skipped-manual') {
                    const requestOrTimeout = page.waitForRequest('**/chat/completions', { timeout: 3000 }).catch(() => null);
                    await page.evaluate(() => { window.__done = false; __qa.startBatchMemoryExtraction().finally(() => { __done = true; }); });
                    await Promise.race([page.waitForFunction(() => __done), requestOrTimeout]);
                    await page.waitForTimeout(30);
                    assert.equal(requests, 0, 'A skipped load must recover existing memories before scheduling API requests');
                    assert.equal(await page.evaluate(() => __qa.memoryStats.activeTotal), 1);
                    assert.equal(await page.evaluate(() => __qa.memoryBackfillProgress.status), 'done');
                } else if (scenario === 'failed-read') {
                    const requestOrTimeout = page.waitForRequest('**/chat/completions', { timeout: 3000 }).catch(() => null);
                    await page.evaluate(() => {
                        const storage = RPHubStorage;
                        window.RPHubStorage = { ...storage, readMemoryState: () => new Promise(() => {}) };
                        window.__done = false;
                        __qa.startBatchMemoryExtraction().finally(() => { __done = true; });
                    });
                    await Promise.race([page.waitForFunction(() => __done), requestOrTimeout]);
                    await page.waitForTimeout(30);
                    assert.equal(requests, 0, 'An unavailable memory baseline must stop before the first paid request');
                    assert.equal(await page.evaluate(() => __qa.memoryBackfillProgress.status), 'error');
                    await page.evaluate(() => __qa.navigateWorkspace('memory'));
                    await page.getByRole('button', { name: '重新读取记忆', exact: true }).waitFor();
                    assert.equal(await page.getByText('还没有记忆', { exact: true }).count(), 0);
                    await page.evaluate(() => { __qa.showMemoryBackfillModal = false; });
                    await page.getByRole('dialog', { name: '补录记忆', exact: true }).waitFor({ state: 'hidden' });
                    await page.getByRole('button', { name: '重新读取记忆', exact: true }).scrollIntoViewIfNeeded();
                    await page.screenshot({ path: path.join(output, scenario + '.png') });
                } else if (scenario === 'target-timeout') {
                    await page.evaluate(async () => {
                        const storage = RPHubStorage;
                        window.__storage = storage;
                        window.RPHubStorage = { ...storage, readMemoryState: scope =>
                            scope === 'load-b' ? new Promise(() => {}) : storage.readMemoryState(scope) };
                        await __qa.selectCharacter(1);
                        window.RPHubStorage = storage;
                        __qa.navigateWorkspace('memory');
                    });
                    await page.waitForFunction(() => __qa.memoryStats.activeTotal === 1);
                    assert.deepEqual(await page.evaluate(() => __qa.displayedClassicMemories.map(item => item.summary)), ['Stored memory Card b']);
                    assert.equal(requests, 0);
                } else if (scenario === 'late-switch') {
                    await page.evaluate(() => {
                        const storage = RPHubStorage;
                        window.RPHubStorage = { ...storage, readMemoryState: async scope => {
                            const state = await storage.readMemoryState(scope);
                            if (scope === 'load-a') await new Promise(resolve => { window.__release = resolve; });
                            return state;
                        } };
                        __qa.navigateWorkspace('memory');
                    });
                    await page.waitForFunction(() => typeof __release === 'function', null, { timeout: 3000 });
                    await page.evaluate(async () => { await __qa.selectCharacter(1); __release(); });
                    await page.waitForTimeout(160);
                    assert.deepEqual(await page.evaluate(() => __qa.displayedClassicMemories.map(item => item.summary)), ['Stored memory Card b']);
                    assert.equal(requests, 0);
                } else if (scenario === 'failed-write') {
                    await page.evaluate(async () => {
                        await __qa.selectCharacter(1);
                        await __qa.selectCharacter(0);
                        __qa.chatHistory.push(
                            { id: 'load-a-u2', role: 'user', content: 'Second question.' },
                            { id: 'load-a-a2', role: 'assistant', content: 'Second answer.' });
                        const storage = RPHubStorage;
                        window.RPHubStorage = { ...storage, commitMemoryState: async () => ({
                            status: 'conflict', committed: false,
                            error: { name: 'StorageConflictError', message: 'Fixture changed elsewhere' }
                        }) };
                        window.__done = false;
                        __qa.startBatchMemoryExtraction().finally(() => { __done = true; });
                    });
                    await page.waitForFunction(() => __done);
                    assert.equal(requests, 1, 'A rejected write must not restart generation using an unloaded view');
                    assert.equal(await page.evaluate(() => __qa.memoryBackfillProgress.status), 'error');
                } else if (scenario === 'secondary') {
                    await page.evaluate(() => __qa.startBatchMemoryExtraction());
                    const progress = await page.evaluate(() => __qa.memoryBackfillProgress);
                    assert.equal(progress.status, 'done', 'Secondary compression must commit and advance: ' + progress.message);
                    assert.equal(requests, 1, 'Existing summaries must only need one secondary compression request');
                    assert.equal(await page.evaluate(() => __qa.memoryStats.activeTotal), 26);
                    const merged = await page.evaluate(async () =>
                        (await RPHubStorage.readMemoryState('load-a')).list.find(memory => memory.secondaryCompressed));
                    assert.equal(merged.sourceMemories.length, 5);
                    assert.deepEqual(merged.sourceMemories[0].extension, { preserve: 'original' });
                    const before = requests;
                    await page.evaluate(() => __qa.startBatchMemoryExtraction());
                    assert.equal(requests, before, 'A completed group must not be compressed again');
                }
                const preserved = await page.evaluate(async () => {
                    const db = await RPHubStorage.initDB();
                    return new Promise((resolve, reject) => {
                        const request = db.transaction('store').objectStore('store').get('rp_hub_classic_memories_load-a');
                        request.onsuccess = () => {
                            const find = list => list.flatMap(memory => [memory, ...(memory.sourceMemories ? find(memory.sourceMemories) : [])]);
                            resolve(find(request.result).find(memory => memory.id === 'load-a-m'));
                        };
                        request.onerror = () => reject(request.error);
                    });
                });
                assert.equal(preserved.summary, 'Stored memory Card a');
                assert.deepEqual(preserved.extension, { preserve: 'original' });
                console.log('PASS ' + scenario + ': stored memories preserved; requests=' + requests);
            } finally { await context.close(); }
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
