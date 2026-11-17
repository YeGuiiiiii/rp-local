const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const root = path.resolve(__dirname, '..'), web = process.env.RPHUB_TEST_WEB_ROOT || path.join(root, 'web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.join(root, 'verification/memory-mode-compat');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch(process.env.RPHUB_LEGACY_CHROMIUM
        ? { executablePath: process.env.RPHUB_LEGACY_CHROMIUM, headless: true }
        : { channel: 'msedge', headless: true });
    try {
        for (const skin of [null, 'journal']) {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
            await context.addInitScript(require('./mock-files.cjs'), { skin });
            await context.addInitScript(() => {
                delete window.structuredClone;
            });
            const page = await context.newPage(), errors = [];
            let embeddingRequests = 0;
            page.on('pageerror', error => errors.push(error.message));
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.hostname === 'memory-compat.test') {
                    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
                        'access-control-allow-methods': 'POST,OPTIONS' };
                    if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
                    if (url.pathname === '/v1/embeddings') {
                        embeddingRequests++;
                        const body = route.request().postDataJSON();
                        assert.equal(body.model, 'fixture-vector');
                        assert.ok(body.input.includes('clock tower'));
                        return route.fulfill({ headers, json: {
                            data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }], model: 'fixture-vector'
                        } });
                    }
                    return route.abort();
                }
                if (url.origin !== 'https://sta1n156.github.io') return route.abort();
                const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
                return file.startsWith(web + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
                    ? route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
                        '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' }) : route.abort();
            });
            await page.goto('https://sta1n156.github.io/RP-Hub/');
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(async () => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false;
                __qa.user.name = 'Compatibility test';
                __qa.closeAnnouncement();
                __qa.characters = [{ uuid: 'compat-card', name: 'Compatibility test', first_mes: '',
                    worldInfo: [], regexScripts: [], uiTemplates: [] }];
                await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
                await RPHubStorage.replaceMemoryScopeList('compat-card', [{
                    id: 'compat-memory', no: 1, turn: 1, classicMemory: true, summary: 'Meet at the clock tower.',
                    sourceUserIds: ['compat-user'], sourceAssistantIds: ['compat-assistant'],
                    sourceUserText: 'Wait at the clock tower.'
                }]);
                await __qa.selectCharacter(0, false, { silent: true });
                __qa.chatHistory = [
                    { id: 'compat-user', role: 'user', content: 'Wait at the clock tower.' },
                    { id: 'compat-assistant', role: 'assistant', content: 'I will wait there.' }
                ];
                Object.assign(__qa.memorySettings, { enabled: true, mode: 'classic', memoryApiUrl: 'https://memory-compat.test',
                    memoryApiKey: 'TEST_ONLY', embeddingModel: '', classicModel: 'fixture-summary' });
                __qa.navigateWorkspace('memory');
            });
            const enhanced = page.getByRole('button', { name: '切换到增强模式', exact: true });
            await enhanced.waitFor({ state: 'attached' });
            await page.waitForTimeout(700);
            await page.screenshot({ path: path.join(output, `${skin || 'classic'}-before.png`) });
            const geometry = await enhanced.evaluate(button => {
                const rect = button.getBoundingClientRect();
                const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
                return { width: rect.width, height: rect.height, receivesTap: hit === button };
            });
            console.log(JSON.stringify({ engine: browser.version(), skin, geometry }));
            await enhanced.tap({ timeout: 5000 });
            await page.waitForTimeout(600);
            assert.equal(await page.evaluate(() => __qa.memorySettings.mode), 'enhanced',
                'Tapping the enhanced option must change mode and reveal vector settings');
            await page.locator('button[title="请选择向量模型"]').waitFor({ state: 'visible', timeout: 5000 });
            await page.getByRole('button', { name: '查看增强模式说明', exact: true }).tap();
            assert.equal(await page.getByRole('button', { name: '查看增强模式说明', exact: true }).getAttribute('aria-expanded'), 'true');
            assert.equal(await page.evaluate(() => __qa.memorySettings.mode), 'enhanced', 'Help must not switch modes');
            await page.getByRole('button', { name: '查看增强模式说明', exact: true }).tap();
            await page.evaluate(() => { __qa.memorySettings.embeddingModel = 'fixture-vector'; });
            await page.waitForTimeout(100);
            await page.getByRole('button', { name: '补录记忆', exact: true }).tap();
            await page.waitForFunction(() => __qa.memoryBackfillProgress.status !== 'running');
            assert.equal(await page.evaluate(() => __qa.memoryBackfillProgress.status), 'done');
            assert.equal(embeddingRequests, 1);
            assert.equal(await page.evaluate(async () => {
                const list = await RPHubStorage.getScopedStoredValue('classic_memories', 'compat-card');
                return RPHubMemoryUtils.getSummaryEmbedding(list[0]).length;
            }), 3, 'Vector coordinates must survive saving without structuredClone');
            await page.evaluate(() => { __qa.showMemoryBackfillModal = false; });
            await page.screenshot({ path: path.join(output, `${skin || 'classic'}-enhanced.png`) });
            await page.getByRole('button', { name: '切换到基础模式', exact: true }).tap();
            assert.equal(await page.evaluate(() => __qa.memorySettings.mode), 'classic');
            await page.getByRole('button', { name: '切换到增强模式', exact: true }).focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.evaluate(() => __qa.memorySettings.mode), 'enhanced');
            await page.waitForTimeout(650);
            assert.equal(await page.evaluate(async () => (await RPHubStorage.getStoredValue('memory_settings')).mode), 'enhanced');
            assert.deepEqual(errors, []);
            await context.close();
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
