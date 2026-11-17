const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.join(root, 'verification/memory-switch-timeout');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        for (const scenario of (process.argv[2] ? [process.argv[2]] : ['boot-skipped', 'boot-timeout', 'target-timeout'])) {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
            const page = await context.newPage();
            await context.addInitScript(() => {
                localStorage.setItem('rp-local-release-shown', '999999');
                const timeout = window.setTimeout;
                window.setTimeout = (fn, ms, ...args) => timeout(fn, ms === 20000 ? 80 : ms, ...args);
            });
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.origin !== 'https://sta1n156.github.io') return route.abort();
                const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
                if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                    return route.fulfill({ status: 404, body: '' });
                if (scenario === 'boot-timeout' && file === path.join(web, 'assets/js/app.js')) {
                    return route.fulfill({ contentType: 'application/javascript', body: `
                        if (localStorage.getItem('__qaBootTimeout') === '1') {
                            const storage = RPHubStorage;
                            window.RPHubStorage = { ...storage, readMemoryState: (scope, ...args) =>
                                scope === 'timeout-a' ? new Promise(() => {}) : storage.readMemoryState(scope, ...args) };
                        }
                    ` + fs.readFileSync(file, 'utf8') });
                }
                return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html',
                    '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
            });
            async function ready() {
                await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
                await page.evaluate(() => {
                    window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                    __qa.showUserSetupModal = false;
                });
            }
            try {
                await page.goto('https://sta1n156.github.io/RP-Hub/');
                await ready();
                await page.evaluate(async scenario => {
                    const cards = ['a', 'b', 'c'].map(id => ({
                        uuid: 'timeout-' + id, name: 'Card ' + id, first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: []
                    }));
                    await RPHubStorage.setStoredValue('characters', cards);
                    for (const card of cards) {
                        await RPHubStorage.setScopedStoredValue('chat', card.uuid, [{ id: card.uuid, role: 'assistant', content: 'Chat ' + card.name }]);
                        await RPHubStorage.replaceMemoryScopeList(card.uuid, [{
                            id: 'memory-' + card.uuid, classicMemory: true, turn: 1, summary: 'Memory ' + card.name,
                            extension: { preserve: true }
                        }]);
                    }
                    await RPHubStorage.setStoredValue('last_active_char', 0);
                    await RPHubStorage.setStoredValue('last_active_char_id', cards[0].uuid);
                    if (scenario === 'boot-skipped') localStorage.setItem('rphub.memoryBootSkip', '1');
                    if (scenario === 'boot-timeout') localStorage.setItem('__qaBootTimeout', '1');
                }, scenario);
                await page.reload();
                await ready();
                assert.equal(await page.evaluate(() => __qa.currentCharacter.uuid), 'timeout-a');
                if (scenario === 'target-timeout') {
                    await page.evaluate(() => {
                        const storage = RPHubStorage;
                        window.__releaseMemory = null;
                        window.RPHubStorage = { ...storage, readMemoryState: async (scope, ...args) => {
                            const result = await storage.readMemoryState(scope, ...args);
                            if (scope !== 'timeout-b') return result;
                            await new Promise(resolve => { window.__releaseMemory = resolve; });
                            return result;
                        } };
                    });
                }
                const switched = await page.evaluate(async () => {
                    const result = await Promise.race([
                        __qa.selectCharacter(1).then(value => ({ value }), error => ({ error: error.name + ': ' + error.message })),
                        new Promise(resolve => setTimeout(() => resolve({ pending: true }), 1800))
                    ]);
                    return { ...result, active: __qa.currentCharacter.uuid, switching: __qa.switchingCharacterIndex };
                });
                await page.screenshot({ path: path.join(output, scenario + '.png') });
                assert.equal(switched.value, true, scenario + ': switching must finish even when memories are unavailable: ' + JSON.stringify(switched));
                assert.equal(switched.active, 'timeout-b');
                assert.equal(switched.switching, -1);
                if (scenario === 'target-timeout') {
                    assert.deepEqual(await page.evaluate(() => __qa.displayedClassicMemories.map(item => item.summary)), [],
                        'A timed-out card must not inherit the previous card memories');
                } else {
                    assert.deepEqual(await page.evaluate(() => __qa.displayedClassicMemories.map(item => item.summary)), ['Memory Card b']);
                }
                await page.evaluate(() => __qa.chatHistory.push({ id: 'edited-b', role: 'user', content: 'B still saves' }));
                assert.equal(await page.evaluate(() => __qa.selectCharacter(2)), true, 'Leaving an unloaded memory scope must remain possible');
                if (scenario === 'target-timeout') {
                    await page.evaluate(() => __releaseMemory());
                    await page.waitForTimeout(120);
                }
                assert.deepEqual(await page.evaluate(() => __qa.displayedClassicMemories.map(item => item.summary)), ['Memory Card c'],
                    'A late read must not overwrite the new card memories');
                const preserved = await page.evaluate(async () => ({
                    a: (await RPHubStorage.getScopedStoredValue('classic_memories', 'timeout-a'))[0],
                    b: (await RPHubStorage.getScopedStoredValue('classic_memories', 'timeout-b'))[0],
                    bChat: (await RPHubStorage.getScopedStoredValue('chat', 'timeout-b')).at(-1).content
                }));
                assert.equal(preserved.a.summary, 'Memory Card a');
                assert.equal(preserved.b.summary, 'Memory Card b');
                assert.deepEqual(preserved.b.extension, { preserve: true });
                assert.equal(preserved.bChat, 'B still saves');
                await page.evaluate(async () => {
                    await __qa.createStoryBranch();
                    window.__branchId = __qa.currentStoryBranch.id;
                    await __qa.switchStoryBranch('main');
                    const storage = RPHubStorage;
                    const blockedScope = 'timeout-c__branch__' + __branchId;
                    window.RPHubStorage = { ...storage, readMemoryState: (scope, ...args) =>
                        scope === blockedScope ? new Promise(() => {}) : storage.readMemoryState(scope, ...args) };
                    await __qa.switchStoryBranch(__branchId);
                });
                assert.equal(await page.evaluate(() => __qa.currentStoryBranch.id === __branchId && __branchId !== 'main'), true,
                    'Existing branch switching must use the same bounded memory read');
                assert.deepEqual(await page.evaluate(() => __qa.displayedClassicMemories), []);
                await page.evaluate(async () => __qa.switchStoryBranch('main'));
                assert.equal(await page.evaluate(() => __qa.currentStoryBranch.id), 'main');
                assert.deepEqual(await page.evaluate(() => __qa.displayedClassicMemories.map(item => item.summary)), ['Memory Card c']);
                for (const name of ['Card a', 'Card c']) {
                    await page.evaluate(() => { __qa.characterGridView = true; __qa.navigateWorkspace('characters'); });
                    await page.locator('.char-grid-item:visible:not([inert])')
                        .filter({ has: page.getByText(name, { exact: true }) }).click();
                    await page.waitForFunction(name => __qa.currentView === 'chat' && __qa.currentCharacter.name === name, name);
                }
                await page.evaluate(async () => {
                    await RPHubStorage.replaceMemoryScopeList('timeout-c', [
                        { id: 'external-change', classicMemory: true, turn: 1, summary: 'External memory' }
                    ]);
                });
                for (let attempt = 0; attempt < 2; attempt++) {
                    const blocked = await page.evaluate(async () => {
                        try { await __qa.selectCharacter(0); } catch (_) {}
                        return __qa.currentCharacter.uuid;
                    });
                    assert.equal(blocked, 'timeout-c', 'A real memory conflict must still prevent leaving stale changes');
                }
                assert.equal(await page.evaluate(async () => (await RPHubStorage.readMemoryState('timeout-c')).list[0].summary),
                    'External memory', 'Conflict handling must not overwrite a committed external change');
                console.log('PASS ' + scenario + ': switch finishes, chats save, original memories preserved, late reads ignored');
            } finally { await context.close(); }
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
