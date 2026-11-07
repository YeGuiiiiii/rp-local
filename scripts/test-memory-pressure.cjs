const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const heavy = process.argv.includes('--heavy');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-precise-memory-info'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(installFileBridge, { persistFiles: false });
    const page = await context.newPage();
    if (heavy) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let requests = 0, release;
    const gate = new Promise(resolve => { release = resolve; });
    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'memory.test') {
            if (route.request().method() === 'OPTIONS') return route.fulfill({ headers: {
                'access-control-allow-origin': '*', 'access-control-allow-headers': '*'
            }, body: '' });
            requests++;
            await gate;
            return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: {
                choices: [{ message: { content: '压力测试总结' } }]
            } });
        }
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file)) return route.abort();
        if (file.endsWith('/app.js') || file.endsWith('\\app.js')) return route.fulfill({
            contentType: 'application/javascript', body: `
            window.__parsedMemoryText = { calls:0, chars:0 };
            const originalParseCot = RPHubUtils.parseCot;
            RPHubUtils.parseCot = text => { __parsedMemoryText.calls++; __parsedMemoryText.chars += String(text || '').length; return originalParseCot(text); };
            ` + fs.readFileSync(file, 'utf8')
        });
        return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async heavy => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.characters = [{ uuid: 'pressure-card', name: '13000楼压力测试', description: '', first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await __qa.selectCharacter(0);
            __qa.navigateWorkspace('memory');
            __qa.chatHistory = Array.from({ length: 13000 }, (_, i) => ({
                id: 'floor-' + i, role: i % 2 ? 'assistant' : 'user',
                content: (i % 2 ? '回复正文。' : '玩家行动。') + (heavy ? '<div>剧情与界面</div>'.repeat(1024) : '压力数据'.repeat(512)),
                ...(heavy ? { uiTemplateSnapshots: [{ html: '<section>历史界面快照</section>'.repeat(1024) }] } : {})
            }));
            __qa.memorySettings.enabled = false;
            __qa.memorySettings.mode = 'classic';
            __qa.memorySettings.classicModel = 'test-summary';
            __qa.memorySettings.classicConcurrency = 2;
            __qa.memorySettings.memoryApiUrl = 'https://memory.test/v1';
            __qa.memorySettings.memoryApiKey = 'TEST_ONLY';
        }, heavy);
        await page.waitForTimeout(700);
        await page.evaluate(() => {
            __parsedMemoryText.calls = 0; __parsedMemoryText.chars = 0;
            window.__pressureStart = performance.now();
            window.__pressureHeap = performance.memory?.usedJSHeapSize || 0;
            __qa.startBatchMemoryExtraction();
        });
        await page.waitForFunction(() => document.querySelector('[aria-label="补录记忆"]') || __qa.memoryBackfillProgress.status === 'running');
        for (let i = 0; i < 200 && requests === 0; i++) await page.waitForTimeout(50);
        assert.ok(requests > 0, '13000楼补录必须发出首批请求');
        const result = await page.evaluate(() => ({
            floors: __qa.chatHistory.length, ...__parsedMemoryText,
            firstBatchMs: Math.round(performance.now() - __pressureStart),
            heapDelta: (performance.memory?.usedJSHeapSize || 0) - __pressureHeap,
            status: __qa.memoryBackfillProgress.status
        }));
        fs.mkdirSync(path.join(root, 'verification/memory-pressure'), { recursive: true });
        fs.writeFileSync(path.join(root, heavy ? 'verification/memory-pressure/heavy-4x.json' : 'verification/memory-pressure/first-batch.json'),
            JSON.stringify({ ...result, heavy, cpuSlowdown: heavy ? 4 : 1 }, null, 2));
        console.log(JSON.stringify(result));
        assert.ok(result.calls < 1000, '首批请求前不应预先提取全部13000楼正文');
        fs.mkdirSync(path.join(root, '.impeccable/review/backup-2.9.005'), { recursive: true });
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(root, '.impeccable/review/backup-2.9.005/memory-pressure-13000.png') });
        await page.getByRole('button', { name: /停止/ }).last().click();
        release();
        await page.waitForFunction(() => __qa.memoryBackfillProgress.status === 'stopped');
        assert.equal(await page.evaluate(() => __qa.chatHistory.length), 13000);
        await page.evaluate(() => {
            __qa.chatHistory = [{ id: 'empty-u', role: 'user', content: '' }, { id: 'empty-a', role: 'assistant', content: '' }];
            __qa.startBatchMemoryExtraction();
        });
        await page.waitForFunction(() => __qa.memoryBackfillProgress.status === 'done');
    } finally { release(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
