const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/settings-resources-1.19');
const baseline = process.argv.includes('--baseline');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(bridge);
    const page = await context.newPage(), errors = [], failures = [], checks = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({
            '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp'
        })[path.extname(file)] || 'application/octet-stream' });
    });
    const check = async (name, action) => {
        try { await action(); checks.push(name); }
        catch (error) { failures.push({ name, error: error.message }); }
    };
    const settings = async section => page.evaluate(section => {
        __qa.navigateWorkspace('settings'); __qa.openSettingsSection(section);
    }, section);
    const scope = name => page.getByRole('group', { name: '正则作用范围' }).getByRole('button', { name, exact: true });
    const stepInput = () => page.locator('.shell-image-section input[type="number"]').first();
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
        });
        await check('credits stay first whenever the announcement is opened', async () => {
            for (let i = 0; i < 2; i++) {
                await page.evaluate(() => __qa.openAnnouncement());
                const first = page.locator('.release-section').first();
                assert.match(await first.innerText(), /鸣谢.*红花铃.*启元.*472441481/s);
                await page.getByRole('button', { name: '关闭更新公告', exact: true }).click();
            }
        });
        await check('NAI global regex can be reached and edited without changing the character scope', async () => {
            await page.evaluate(async () => {
                __qa.characters = [
                    { uuid: 'settings-card-a', name: '角色甲', first_mes: '开始', worldInfo: [], regexScripts: [], uiTemplates: [] },
                    { uuid: 'settings-card-b', name: '角色乙', first_mes: '开始', worldInfo: [], regexScripts: [], uiTemplates: [] }
                ];
                await __qa.selectCharacter(0);
                __qa.navigateWorkspace('regex');
            });
            assert.equal(await scope('全局生效').count(), 1);
            await scope('全局生效').click();
            const row = page.locator('#regex-list .sortable-list-item').filter({ hasText: 'NAI画图正则' });
            assert.equal(await row.count(), 1);
            await row.getByTitle('编辑', { exact: true }).click();
            await page.evaluate(() => {
                __qa.editingRegex.data.enabled = true;
                __qa.saveRegex();
            });
            assert.equal(await scope('全局生效').getAttribute('aria-pressed'), 'true');
            await scope('当前角色卡').click();
            assert.equal(await page.locator('#regex-list h3').filter({ hasText: 'NAI画图正则' }).count(), 0);
            await page.evaluate(async () => { await __qa.selectConfigurationCharacter(1); __qa.navigateWorkspace('regex'); });
            await scope('全局生效').click();
            assert.equal(await page.locator('#regex-list .sortable-list-item').filter({ hasText: 'NAI画图正则' }).getByRole('checkbox').isChecked(), true);
        });
        await check('settings detail headings are not repeated', async () => {
            for (const [section, title] of [['api', 'API 连接与服务'], ['image', '生图设置']]) {
                await settings(section);
                assert.equal(await page.locator('.shell-settings-detail').getByText(title, { exact: true }).filter({ visible: true }).count(), 1, title);
            }
            for (const section of ['persona', 'reading']) {
                await settings(section);
                assert.equal(await page.locator('.shell-settings-detail .settings-card__title').filter({ visible: true }).count(), 0);
            }
            await settings('persona');
            assert.equal(await page.getByTitle('新建人设', { exact: true }).isVisible(), true);
            assert.equal(await page.getByTitle('删除当前人设', { exact: true }).isVisible(), true);
        });
        await check('steps above 28 need confirmation and cancel restores the visible and saved value', async () => {
            await settings('image');
            await page.locator('.shell-image-section details').evaluate(el => { el.open = true; });
            assert.equal(await stepInput().inputValue(), '28');
            await stepInput().fill('29'); await stepInput().press('Tab');
            await page.waitForFunction(() => __qa.globalConfirmModal.show);
            assert.equal(await page.evaluate(() => __qa.imageGenParams.steps), 28);
            await page.getByRole('button', { name: '保持原步数', exact: true }).click();
            assert.equal(await stepInput().inputValue(), '28');
            await stepInput().fill('32'); await stepInput().press('Tab');
            await page.waitForFunction(() => __qa.globalConfirmModal.show);
            await page.getByRole('button', { name: '继续使用', exact: true }).click();
            await page.waitForFunction(() => __qa.imageGenParams.steps === 32);
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('rphub_image_gen_params')).steps), 32);
            await stepInput().fill('28'); await stepInput().press('Tab');
            assert.equal(await page.evaluate(() => __qa.globalConfirmModal.show), false);
            assert.equal(await stepInput().inputValue(), '28');
        });
        await check('saved step preferences survive reopening settings', async () => {
            await page.evaluate(() => localStorage.setItem('rphub_image_gen_params', JSON.stringify({ steps: 32, sampler: 'k_euler' })));
            await page.reload();
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false;
            });
            assert.equal(await page.evaluate(() => __qa.imageGenParams.steps), 32);
            assert.equal(await page.evaluate(() => __qa.globalConfirmModal.show), false);
        });
        await check('default persona avatar follows both themes and keeps uploaded images', async () => {
            await page.evaluate(() => { __qa.user.avatar = ''; __qa.navigateWorkspace('settings'); });
            assert.equal(await page.locator('.shell-profile .persona-avatar').count(), 1);
            await settings('persona');
            const avatar = page.locator('.settings-profile-avatar .persona-avatar');
            assert.equal(await avatar.count(), 1);
            const colors = [];
            for (const theme of ['journal', 'vampire']) {
                await page.evaluate(theme => RPThemePacks.set(theme), theme);
                colors.push(await avatar.evaluate(el => getComputedStyle(el).backgroundColor));
            }
            assert.notEqual(colors[0], colors[1]);
            await page.evaluate(() => { __qa.user.avatar = 'assets/themes/vampire/peek.webp'; });
            assert.equal(await page.locator('.settings-profile-avatar img').first().getAttribute('src'), 'assets/themes/vampire/peek.webp');
        });

        await page.evaluate(() => {
            // Native files do not have localStorage's small quota; retain this fixture in memory.
            RPLocalFiles.writeText = (name, text) => {
                __qaNativeFiles[name] = { text }; return JSON.stringify({ ok: true, value: true });
            };
            __qa.worldInfo = Array.from({ length: 1200 }, (_, index) => ({
                comment: '世界书条目 ' + (index + 1), keys: ['key-' + index], scope: 'character',
                content: '用于大世界书翻阅检查的正文。'.repeat(180), enabled: true
            }));
            __qa.navigateWorkspace('advanced');
        });
        await page.waitForTimeout(700);
        const timings = [];
        for (let i = 0; i < 3; i++) {
            timings.push(await page.evaluate(async () => {
                const start = performance.now();
                __qa.navigateWorkspace('worldinfo');
                await Vue.nextTick();
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                return performance.now() - start;
            }));
            if (i < 2) await page.evaluate(async () => { __qa.navigateWorkspace('advanced'); await Vue.nextTick(); });
        }
        const performanceReport = {
            entries: 1200, rendered: await page.locator('#worldinfo-list .sortable-list-item').count(),
            openMs: timings.map(value => Math.round(value)), medianMs: Math.round(timings.slice().sort((a, b) => a - b)[1])
        };
        await check('large books render a bounded page while search still covers the last entry', async () => {
            assert.ok(performanceReport.rendered <= 100, 'A 1200-entry book must not create all row controls');
            const search = page.getByRole('searchbox', { name: '搜索世界书', exact: true });
            await search.fill('世界书条目 1200');
            assert.equal(await page.locator('#worldinfo-list h3').innerText(), '世界书条目 1200');
            await page.locator('#worldinfo-list button[title="编辑"]').click();
            assert.equal(await page.evaluate(() => __qa.editingWorldInfo.id), 1199);
            await page.evaluate(() => { __qa.showWorldInfoEditor = false; });
            await search.fill('');
        });
        await check('paging edits original entries and quick return reaches the top', async () => {
            const pageInput = page.getByRole('spinbutton', { name: '世界书页码', exact: true });
            assert.equal(await pageInput.count(), 1);
            await pageInput.fill('12'); await pageInput.press('Enter');
            assert.equal(await page.locator('#worldinfo-list h3').first().innerText(), '世界书条目 1101');
            await page.locator('#worldinfo-list button[title="编辑"]').nth(6).click();
            assert.equal(await page.evaluate(() => __qa.editingWorldInfo.id), 1106);
            await page.evaluate(() => {
                __qa.editingWorldInfo.data.comment = '已修改的远处条目';
                __qa.saveWorldInfo();
            });
            assert.equal(await page.evaluate(() => __qa.worldInfo[1106].comment), '已修改的远处条目');
            assert.equal(await page.evaluate(() => __qa.worldInfo.length), 1200);
            const view = page.locator('.worldinfo-view');
            await view.evaluate(el => { el.scrollTop = el.scrollHeight; });
            assert.ok(await view.evaluate(el => el.scrollTop > 500));
            await page.getByRole('button', { name: '返回世界书顶部', exact: true }).click();
            await page.waitForFunction(() => document.querySelector('.worldinfo-view').scrollTop === 0);
            assert.equal(await view.evaluate(el => getComputedStyle(el, '::-webkit-scrollbar').display), 'block');
            await pageInput.fill('1'); await pageInput.press('Enter');
            await page.getByRole('button', { name: '下一页世界书', exact: true }).click();
            assert.equal(await page.locator('#worldinfo-list h3').first().innerText(), '世界书条目 101');
        });
        await check('sorting a later page only changes the rows on that page', async () => {
            const handles = page.locator('#worldinfo-list .sortable-list-handle');
            await page.waitForFunction(() => {
                const sortable = Sortable.get(document.getElementById('worldinfo-list'));
                return sortable && !sortable.option('disabled');
            });
            await handles.first().hover();
            const from = await handles.nth(0).boundingBox(), to = await handles.nth(2).boundingBox();
            await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
            await page.mouse.down();
            try {
                await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 8, { steps: 3 });
                await page.locator('.sortable-list-preview').waitFor();
                await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
                await page.waitForFunction(() =>
                    document.querySelector('#worldinfo-list .sortable-list-item').dataset.resourceIndex !== '100');
            } finally { await page.mouse.up(); }
            await page.waitForFunction(() => __qa.worldInfo[100].comment !== '世界书条目 101');
            const result = await page.evaluate(() => ({
                beforePage: __qa.worldInfo[99].comment,
                page: __qa.worldInfo.slice(100, 103).map(entry => entry.comment),
                afterPage: __qa.worldInfo[200].comment
            }));
            assert.equal(result.beforePage, '世界书条目 100');
            assert.equal(result.afterPage, '世界书条目 201');
            assert.notDeepEqual(result.page, ['世界书条目 101', '世界书条目 102', '世界书条目 103']);
            assert.deepEqual(result.page.slice().sort(), ['世界书条目 101', '世界书条目 102', '世界书条目 103']);
        });
        if (!baseline) {
            for (const width of [360, 390, 1280]) {
                await page.setViewportSize({ width, height: 844 });
                for (const theme of ['journal', 'vampire']) {
                    await page.evaluate(theme => { RPThemePacks.set(theme); __qa.toasts = []; }, theme);
                    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                    await page.screenshot({ path: path.join(output, `worldbook-${theme}-${width}.png`) });
                    await settings('persona');
                    await page.evaluate(() => { __qa.user.avatar = ''; });
                    await page.screenshot({ path: path.join(output, `persona-${theme}-${width}.png`) });
                    if (width === 390) {
                        await settings('api');
                        await page.screenshot({ path: path.join(output, `api-${theme}.png`) });
                        await settings('image');
                        await page.locator('.shell-image-section details').evaluate(el => { el.open = true; });
                        await page.screenshot({ path: path.join(output, `image-${theme}.png`) });
                        await page.locator('#image-steps').fill('35'); await page.locator('#image-steps').press('Tab');
                        await page.waitForFunction(() => __qa.globalConfirmModal.show);
                        await page.getByRole('button', { name: '继续使用', exact: true }).waitFor({ state: 'visible' });
                        await page.waitForTimeout(300);
                        await page.screenshot({ path: path.join(output, `steps-warning-${theme}.png`) });
                        await page.getByRole('button', { name: '保持原步数', exact: true }).click();
                    }
                    await page.evaluate(() => __qa.navigateWorkspace('worldinfo'));
                }
            }
        }
        fs.writeFileSync(path.join(output, baseline ? 'before.json' : 'after.json'),
            JSON.stringify({ checks, failures, performance: performanceReport, errors, actualAndroidTested: false }, null, 2));
        console.log(JSON.stringify({ checks, failures, performance: performanceReport, errors }, null, 2));
        assert.deepEqual(errors, []);
        assert.deepEqual(failures, []);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
