const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/quota-worldbook-1.18');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(bridge);
    const page = await context.newPage(), errors = [], requests = [];
    let amount = 1101, fail = false, delayed;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/api/getUser') {
            const key = route.request().postDataJSON().toUserId;
            requests.push(key);
            if (key === 'fixture-old-key') {
                await new Promise(resolve => { delayed = resolve; });
                try { return await route.fulfill({ headers: { 'access-control-allow-origin': '*' },
                    json: { status: 'ok', type: 'sta1n', data: { value: 777 } } }); } catch (_) { return; }
            }
            return route.fulfill({ headers: { 'access-control-allow-origin': '*' },
                status: fail ? 500 : 200,
                json: { status: 'ok', type: 'sta1n', data: { value: key === 'fixture-new-key' ? 22 : amount } } });
        }
        if (url.origin !== 'https://sta1n156.github.io') {
            if (route.request().method() === 'OPTIONS') return route.fulfill({ headers: {
                'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type',
                'access-control-allow-methods': 'POST,OPTIONS'
            }, body: '' });
            return route.abort();
        }
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
    });
    async function ready() {
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
        });
    }
    async function imagePage() {
        await page.evaluate(() => { __qa.navigateWorkspace('settings'); __qa.openSettingsSection('image'); });
    }
    const quota = () => page.locator('.shell-image-section .image-quota');
    const refresh = () => page.getByRole('button', { name: '刷新剩余生图次数', exact: true });
    const titles = () => page.locator('#worldinfo-list h3').allTextContents();
    const searchEntry = async query => {
        await page.getByRole('button', { name: '搜索世界书', exact: true }).click();
        const input = page.locator('#sakura-entry-search input');
        await input.fill(query); await input.press('Enter');
        await page.locator('.sakura-es-item').click();
    };
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/'); await ready(); await imagePage();
        assert.match(await quota().innerText(), /未填写密钥/);
        assert.equal(await refresh().isDisabled(), true);
        await page.locator('.shell-image-section .secret-input input').fill('fixture-key');
        await page.waitForFunction(() => __qa.quotaValue === 1101 && !__qa.quotaLoading);
        assert.match(await quota().innerText(), /剩余 1101 次/);
        amount = 1099;
        await refresh().click();
        await page.waitForFunction(() => __qa.quotaValue === 1099 && !__qa.quotaLoading);
        await page.evaluate(() => __qa.openSettingsSection('api'));
        await page.getByText('生图服务', { exact: true }).waitFor();
        assert.match(await page.locator('.model-setting-row').filter({ hasText: '生图服务' }).innerText(), /剩余 1099 次/);
        await imagePage();
        fail = true; await refresh().click();
        await page.waitForFunction(() => __qa.quotaError && !__qa.quotaLoading);
        assert.match(await quota().innerText(), /查询失败/);
        assert.doesNotMatch(await quota().innerText(), /1099/);
        fail = false; amount = 0; await refresh().click();
        await page.waitForFunction(() => __qa.quotaValue === 0 && !__qa.quotaLoading);
        assert.match(await quota().innerText(), /剩余 0 次/);
        await page.locator('.shell-image-section .secret-input input').fill('fixture-old-key');
        await page.waitForFunction(() => __qa.quotaLoading);
        assert.equal(await refresh().isDisabled(), true);
        await page.waitForTimeout(100);
        await page.locator('.shell-image-section .secret-input input').fill('fixture-new-key');
        await page.waitForFunction(() => __qa.quotaValue === 22 && !__qa.quotaLoading);
        delayed?.(); delayed = null;
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => __qa.quotaValue), 22);
        for (const width of [360, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            for (const theme of ['journal', 'vampire']) {
                await page.evaluate(theme => RPThemePacks.set(theme), theme);
                await page.waitForTimeout(220);
                await page.locator('.management-view:visible').evaluate(el => { el.scrollTop = 0; });
                await page.screenshot({ path: path.join(output, `quota-${theme}-${width}.png`) });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            }
        }
        const beforeClear = requests.length;
        await page.locator('.shell-image-section .secret-input input').fill('');
        await page.waitForFunction(() => __qa.quotaLabel === '未填写密钥');
        assert.equal(await refresh().isDisabled(), true);
        assert.equal(requests.length, beforeClear);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(async () => {
            __qa.characters = [
                { uuid: 'scope-a', name: '角色甲', first_mes: '开始', worldInfo: [{ comment: '角色甲专属', keys: [], content: 'A', enabled: true, scope: 'character', constant: true }], regexScripts: [], uiTemplates: [] },
                { uuid: 'scope-b', name: '角色乙', first_mes: '开始', worldInfo: [{ comment: '角色乙专属', keys: [], content: 'B', enabled: true, scope: 'character', constant: true }], regexScripts: [], uiTemplates: [] }
            ];
            await __qa.selectCharacter(0);
            __qa.worldInfo.push({ comment: '两张卡共用', keys: [], content: 'GLOBAL_FIXTURE', scope: 'global', enabled: true, constant: true, probability: 100, useProbability: false });
            __qa.navigateWorkspace('worldinfo');
        });
        await page.waitForTimeout(220);
        assert.ok((await titles()).includes('角色甲专属'));
        assert.ok((await titles()).includes('两张卡共用'));
        assert.ok((await titles()).indexOf('两张卡共用') < (await titles()).indexOf('角色甲专属'));
        await searchEntry('两张卡共用');
        await page.evaluate(() => { __qa.editingWorldInfo.data.content = 'GLOBAL_EDITED'; __qa.saveWorldInfo(); });
        await page.evaluate(async () => {
            await __qa.selectConfigurationCharacter(1);
            __qa.navigateWorkspace('worldinfo');
        });
        assert.ok((await titles()).includes('两张卡共用'));
        assert.equal(await page.evaluate(() => __qa.worldInfo.find(entry => entry.comment === '两张卡共用').content), 'GLOBAL_EDITED');
        assert.equal(await page.evaluate(() => RPHubContextUtils.resolveWorldInfoEntries(__qa.worldInfo, [], {})
            .entries.some(entry => entry.content === 'GLOBAL_EDITED')), true, 'Global content still participates in context matching');
        await searchEntry('角色乙专属');
        await page.evaluate(() => { __qa.editingWorldInfo.data.scope = 'global'; __qa.saveWorldInfo(); });
        assert.ok((await titles()).includes('角色乙专属'), 'Changing scope follows the entry instead of hiding it');
        await page.locator('#worldinfo-list button[title="编辑"]').filter({ visible: true }).first().waitFor();
        for (const theme of ['journal', 'vampire']) {
            await page.evaluate(theme => RPThemePacks.set(theme), theme);
            await page.evaluate(() => { __qa.toasts = []; document.activeElement?.blur(); });
            await page.waitForTimeout(220);
            await page.screenshot({ path: path.join(output, `worldbook-${theme}-390.png`) });
        }
        await page.waitForTimeout(1200);
        await page.evaluate(() => RPLocalStore.flush());
        await page.reload(); await ready();
        await page.evaluate(() => __qa.navigateWorkspace('worldinfo'));
        const persisted = await titles();
        assert.ok(persisted.includes('两张卡共用') && persisted.includes('角色乙专属'));
        await searchEntry('两张卡共用');
        await page.evaluate(() => { __qa.editingWorldInfo.data.scope = 'character'; __qa.saveWorldInfo(); });
        assert.ok((await titles()).includes('两张卡共用'));
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
            quotaRefresh: true, apiPageSharesQuota: true, loadingAndEmptyAndFailureAndZero: true,
            staleKeyIgnored: true, globalFirstWithoutScopeSwitch: true, globalAcrossCharacters: true,
            scopeChangeFollowsEntry: true, persistence: true, dayNightAndResponsive: true, errors
        }, null, 2));
        console.log('Image quota refresh/key isolation and visible global worldbook scopes passed.');
    } finally { delayed?.(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
