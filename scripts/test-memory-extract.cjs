const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext();
        await context.addInitScript(require('./mock-files.cjs'));
        let reply = '', requests = 0, status = 200;
        const errors = [];
        await context.route('**/*', route => {
            const request = route.request(), url = new URL(request.url());
            if (url.hostname === 'extract.test') {
                const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
                    'access-control-allow-methods': 'POST,OPTIONS' };
                if (request.method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
                requests++;
                return route.fulfill({ headers, status, json: status === 200
                    ? { choices: [{ message: { role: 'assistant', content: reply }, finish_reason: 'stop' }] }
                    : { error: { message: 'fixture unavailable' } } });
            }
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            return file.startsWith(web + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
                ? route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
                    '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' }) : route.abort();
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        async function ready() {
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false; __qa.closeAnnouncement();
            });
        }
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready();
        await page.evaluate(async () => {
            __qa.characters = [{ uuid: 'extract-card', name: '提炼测试', first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
            await RPHubStorage.replaceMemoryScopeList('extract-card', [
                { id: 'source-memory', classicMemory: true, turn: 1, summary: '林曦管理灯塔，阿岚送来一封信。' }
            ]);
            await __qa.selectCharacter(0);
            Object.assign(__qa.memorySettings, {
                classicModel: 'fixture-summary', memoryApiUrl: 'https://extract.test/v1', memoryApiKey: 'TEST_ONLY'
            });
            __qa.openMemTools();
        });
        await page.waitForFunction(() => !__qa.memToolsExtract.loading && __qa.memToolsExtractSource.count === 1);
        const source = await page.evaluate(() => JSON.stringify(__qa.classicMemories));
        async function extract(text, kind = 'character') {
            reply = text;
            const before = requests;
            await page.evaluate(kind => __qa.runMemToolsExtract(kind), kind);
            assert.equal(requests, before + 1, 'Formatting differences must not trigger a second model request');
            return page.evaluate(kind => ({
                entries: __qa.memToolsExtract.entries.map(({ kind, label, text }) => ({ kind, label, text })),
                error: __qa.memToolsExtract.error, notice: __qa.memToolsExtract.notice,
                needsContinue: __qa.memToolsExtractNeedsContinue(kind)
            }), kind);
        }
        let result = await extract('<character name="林曦">灯塔管理员。</character>');
        assert.deepEqual(result.entries, [{ kind: 'character', label: '林曦', text: '灯塔管理员。' }]);
        result = await extract('<CHARACTER role="keeper" NAME = “林 曦”>灯塔管理员。</CHARACTER >\n<character name=阿岚>送信人。</character>');
        assert.deepEqual(result.entries, [
            { kind: 'character', label: '林 曦', text: '灯塔管理员。' },
            { kind: 'character', label: '阿岚', text: '送信人。' }
        ], 'Attribute order, smart quotes, unquoted names and closing whitespace must remain readable');
        assert.equal(result.needsContinue, false, 'Closing whitespace must not suggest another paid continuation');
        result = await extract('<character name="甲">甲正文\n<character name="乙">乙正文');
        assert.deepEqual(result.entries.map(entry => [entry.label, entry.text]), [['甲', '甲正文'], ['乙', '乙正文']],
            'A missing closing tag must not swallow the next character');
        assert.equal(result.needsContinue, true);
        reply = '，补完。</character >';
        await page.evaluate(() => __qa.continueMemToolsExtract('character'));
        assert.deepEqual(await page.evaluate(() => __qa.memToolsExtract.entries.map(entry => [entry.label, entry.text])),
            [['甲', '甲正文'], ['乙', '乙正文，补完。']]);
        assert.equal(await page.evaluate(() => __qa.memToolsExtractNeedsContinue('character')), false);
        result = await extract("<story extra='yes' title='灯塔来信'>阿岚送来一封信。</story >", 'story');
        assert.equal(result.entries.at(-1).label, '灯塔来信');
        const beforeDraft = result.entries;
        const raw = '## 林曦\n灯塔管理员。\n\n## 阿岚\n送信人。';
        result = await extract(raw);
        assert.equal(result.error, '');
        assert.deepEqual(result.entries.slice(0, -1), beforeDraft, 'Unformatted output must preserve existing entries of both types');
        assert.equal(result.entries.at(-1).text, raw);
        assert.match(result.entries.at(-1).label, /原文|草稿/);
        assert.match(result.notice, /原文|草稿/);
        assert.ok((await page.locator('textarea').evaluateAll(elements => elements.map(element => element.value))).includes(raw));
        await page.evaluate(() => __qa.saveMemToolsExtract());
        await page.reload(); await ready();
        await page.waitForFunction(() => __qa.currentCharacter?.uuid === 'extract-card' && __qa.memToolsExtractSource.count === 1);
        await page.evaluate(() => {
            Object.assign(__qa.memorySettings, {
                classicModel: 'fixture-summary', memoryApiUrl: 'https://extract.test/v1', memoryApiKey: 'TEST_ONLY'
            });
            __qa.openMemTools();
        });
        await page.waitForFunction(() => !__qa.memToolsExtract.loading);
        assert.equal(await page.evaluate(() => __qa.memToolsExtract.entries.at(-1)?.text), raw,
            'The raw draft must survive saving and reloading');
        const saved = await page.evaluate(() => __qa.memToolsExtract.entries);
        status = 503;
        await extract('unavailable');
        assert.deepEqual(await page.evaluate(() => __qa.memToolsExtract.entries), saved);
        status = 200;
        reply = '续写仍没有标签。';
        await page.evaluate(() => {
            __qa.memToolsExtractRaw.character = '原始无标签段落。';
            return __qa.continueMemToolsExtract('character');
        });
        assert.equal(await page.evaluate(() => __qa.memToolsExtract.entries.at(-1).text), '原始无标签段落。\n\n续写仍没有标签。');
        assert.deepEqual(await page.evaluate(() => __qa.memToolsExtract.entries.slice(0, -1)), saved);
        assert.equal(await page.evaluate(() => JSON.stringify(__qa.classicMemories)), source,
            'Extraction and draft recovery must never alter the source memories');
        assert.deepEqual(errors, []);
        console.log('PASS tagged extraction, compatible attributes, truncated boundaries, continuation, raw draft preservation and reload');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
