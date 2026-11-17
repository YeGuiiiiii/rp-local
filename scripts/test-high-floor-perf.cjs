const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const installFileBridge = require('./mock-files.cjs');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const hardTimeout = setTimeout(() => {
    console.error('Hard timeout exceeded in test-high-floor-perf.cjs');
    process.exit(1);
}, 25000);
hardTimeout.unref();

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(installFileBridge, { skin: null, persistFiles: false });
        const page = await context.newPage();
        page.setDefaultTimeout(8000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));

        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
                return route.fulfill({ status: 404, body: '' });
            }
            return route.fulfill({
                path: file,
                contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream'
            });
        });

        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));

        const partCount = await page.evaluate(async () => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.memorySettings.enabled = true;
            __qa.settings.uiTemplateEnabled = true;
            const cardId = 'perf-card';
            __qa.characters = [{
                uuid: cardId,
                name: '高楼层测试卡',
                first_mes: '开场',
                worldInfo: [],
                regexScripts: [],
                uiTemplates: [{ id: 'tpl-1', name: '面板', enabled: true, placement: 'bottom', htmlTemplate: '<div>面板</div>' }]
            }];
            await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
            await __qa.selectCharacter(0);

            const panelHtml = '<div class="perf-panel">' + '状态栏内容'.repeat(36000) + '</div>';
            const history = [
                { role: 'system', content: '系统引导（无 id 历史兼容样本）' }
            ];
            for (let turn = 1; turn <= 40; turn++) {
                history.push({ id: `u-${turn}`, role: 'user', content: `第 ${turn} 轮玩家行动`, isSelf: true });
                history.push({
                    id: `a-${turn}`,
                    role: 'assistant',
                    reasoning: `第 ${turn} 轮思考推导过程。`.repeat(30),
                    isSummaryOpen: false,
                    content: `第 ${turn} 轮角色回应正文。`,
                    uiTemplateBlocks: { bottom: [panelHtml] }
                });
            }
            __qa.chatHistory = history;
            await new Promise(r => setTimeout(r, 450));
            await RPLocalStore.flush();

            const keys = await RPHubStorage.readStorageKeys(RPHubStorage.getMainDb());
            const chatKey = keys.find(k => k.startsWith('rp_hub_chat_' + cardId));
            const raw = await RPHubStorage.readChatBaseline(chatKey);
            return raw.directory?.parts || 0;
        });
        assert.ok(partCount >= 4, `Expected multi-part chat fixture, got ${partCount} parts`);

        await page.evaluate(() => {
            window.__idbStats = { chunkPuts: 0, chunkGets: 0, chatDirPuts: 0 };
            const origPut = IDBObjectStore.prototype.put;
            const origGet = IDBObjectStore.prototype.get;
            IDBObjectStore.prototype.put = function (val, k) {
                if (String(k).startsWith('__rp_chat__:')) window.__idbStats.chunkPuts++;
                else if (String(k).startsWith('rp_hub_chat_')) window.__idbStats.chatDirPuts++;
                return origPut.apply(this, arguments);
            };
            IDBObjectStore.prototype.get = function (k) {
                if (String(k).startsWith('__rp_chat__:')) window.__idbStats.chunkGets++;
                return origGet.apply(this, arguments);
            };
        });

        // 1. Toggle thinking summary: only 1 dirty chunk written, 0 chunks read back
        const cotStats = await page.evaluate(async () => {
            window.__idbStats = { chunkPuts: 0, chunkGets: 0, chatDirPuts: 0 };
            const lastAssistant = __qa.chatHistory.at(-1);
            __qa.toggleThinkingSummary(lastAssistant);
            await new Promise(r => setTimeout(r, 420));
            await RPLocalStore.flush();
            return { ...window.__idbStats, open: lastAssistant.isSummaryOpen };
        });
        assert.equal(cotStats.open, true);
        assert.equal(cotStats.chunkPuts, 1, 'Toggling CoT must only rewrite the single affected chunk');
        assert.equal(cotStats.chunkGets, 0, 'Toggling CoT must not read back all chat chunks');

        // 2. Toggle narrative perspective in settings: 0 chat chunks touched
        const povStats = await page.evaluate(async () => {
            __qa.currentView = 'settings-detail';
            await Vue.nextTick();
            window.__idbStats = { chunkPuts: 0, chunkGets: 0, chatDirPuts: 0 };
            __qa.togglePerson('third');
            await new Promise(r => setTimeout(r, 1150));
            await RPLocalStore.flush();
            return { ...window.__idbStats, person: __qa.user.person };
        });
        assert.equal(povStats.person, 'third');
        assert.equal(povStats.chunkPuts, 0, 'Switching perspective must not rewrite chat chunks');
        assert.equal(povStats.chatDirPuts, 0, 'Switching perspective must not touch chat directory');

        // 3. Delete latest user turn while preserving surviving DOM panels & rewriting only tail chunk(s)
        await page.evaluate(async () => {
            __qa.currentView = 'chat';
            await Vue.nextTick();
            window.__keptNodeBefore = document.querySelector('[data-chat-index="78"] .ui-template-render');
            window.__idbStats = { chunkPuts: 0, chunkGets: 0, chatDirPuts: 0 };
            __qa.toasts = [];
            __qa.deleteMessage(79);
        });
        await page.getByRole('button', { name: '确认', exact: true }).click();
        await page.waitForFunction(() => __qa.toasts.some(t => /已删除|删除失败/.test(t.message)));
        const delStats = await page.evaluate(async () => {
            await RPLocalStore.flush();
            const keptNodeAfter = document.querySelector('[data-chat-index="78"] .ui-template-render');
            return {
                ...window.__idbStats,
                length: __qa.chatHistory.length,
                domPreserved: !!window.__keptNodeBefore && window.__keptNodeBefore === keptNodeAfter
            };
        });
        assert.equal(delStats.length, 79);
        assert.equal(delStats.domPreserved, true, 'Surviving message UI panel DOM node must be preserved across deletion');
        assert.ok(delStats.chunkPuts < partCount, `Expected incremental chunk write (< ${partCount}), got ${delStats.chunkPuts}`);
        assert.equal(delStats.chunkGets, 0, 'Post-commit verification must not deserialize all chat chunks');
        assert.deepEqual(errors, []);
        console.log('PASS: high-floor CoT toggle, perspective switch, and message deletion avoid full-history rewrites/readbacks');
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
