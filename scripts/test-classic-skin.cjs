const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, '.impeccable/review/classic-1.23');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [], missing = [], remoteAnnouncements = [];
    let embeddingRequests = 0;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(installFiles, { skin: null });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'patch.test') {
            const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,authorization' };
            if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
            if (url.pathname.endsWith('/embeddings')) {
                embeddingRequests++;
                return route.fulfill({ headers, json: { object: 'list',
                    data: [{ object: 'embedding', index: 0, embedding: [0.1, 0.2, 0.3] }], model: 'fixture-vector' } });
            }
            return route.abort();
        }
        if (/announcement\.json|update-check|\/v1\/version/.test(url.href)) remoteAnnouncements.push(url.href);
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
            if (url.pathname.includes('/assets/')) missing.push(url.pathname);
            return route.abort();
        }
        return route.fulfill({ path: file, contentType: ({
            '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp'
        })[path.extname(file)] || 'application/octet-stream' });
    });
    async function ready() {
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.showAnnouncement = false;
        });
    }
    async function capture(name) {
        await page.waitForTimeout(250);
        await page.waitForFunction(() => !document.querySelector('.app-navigation-enter-active'));
        await page.screenshot({ path: path.join(output, name + '.png') });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name);
    }
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await ready();
        assert.equal(await page.evaluate(() => RPThemePacks.current), 'classic', 'First launch must use the actual 2.8.118 layout');
        assert.equal(await page.evaluate(() => __qa.autoBackupConfig.triggerMode), 'remind', 'Use the 2.8.118 daily backup reminder default');
        assert.equal(await page.evaluate(() => __qa.imageGenParams.steps), 28, 'Use the confirmed 28-step default without replacing saved custom parameters');
        assert.equal(await page.evaluate(() => __qa.settings.immersiveMode), false);
        assert.equal(await page.locator('.shell-dock:visible').count(), 0);
        assert.equal(await page.locator('.chenyue-theme').count(), 0);
        await page.evaluate(async () => {
            __qa.autoBackupConfig.lastRemindDate = new Date().toLocaleDateString('en-CA');
            __qa.characters = [{ uuid: 'classic-sentinel', name: '经典皮肤测试卡', first_mes: '', description: '',
                avatar: 'assets/images/chenyue/welcome.webp', worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__qa.characters));
            await __qa.selectCharacter(0, false, { silent: true });
            __qa.chatHistory = [{ id: 'classic-message', role: 'assistant', content: '保留原来的故事。' }];
            await RPHubStorage.setScopedStoredValue('chat', 'classic-sentinel', RPHubStorage.cloneForStorage(__qa.chatHistory));
            await RPHubStorage.replaceMemoryScopeList('classic-sentinel',
                [{ id: 'classic-memory', classicMemory: true, no: 1, turn: 1, summary: '约好明天见面。' }]);
            window.__memoryBeforeSkin = await RPHubStorage.readMemoryState('classic-sentinel');
            __qa.applyManagedMemories({ scope: 'classic-sentinel',
                memories: __memoryBeforeSkin.list, state: __memoryBeforeSkin });
            __qa.navigateWorkspace('characters');
        });
        await capture('mobile');
        await page.getByRole('button', { name: '管理记忆', exact: true }).first().click();
        await page.getByRole('dialog', { name: '角色卡记忆管理' }).waitFor({ timeout: 2000 });
        await page.waitForFunction(() => document.querySelector('.workspace-memory textarea')?.value.includes('约好明天见面。'));
        await page.getByRole('button', { name: '关闭记忆管理', exact: true }).click();
        await page.evaluate(async () => { window.__memoryBeforeSkin = await RPHubStorage.readMemoryState('classic-sentinel'); });
        await page.getByRole('button', { name: '打开导航', exact: true }).first().click();
        const nav = page.getByRole('navigation', { name: '页面', exact: true });
        await nav.getByRole('button', { name: '图片管理', exact: true }).waitFor({ timeout: 3000 });
        assert.equal(await page.locator('#rphub-gallery-nav').evaluate(button =>
            button.nextElementSibling?.innerText.trim() === '数据备份'), true);
        await capture('navigation-mobile');
        await nav.getByRole('button', { name: '补丁清单', exact: true }).click();
        assert.equal(await page.locator('.app-main ol > li').count(), 44, 'Classic keeps all 44 patch checklist entries');
        await page.getByRole('button', { name: '查看更新公告' }).waitFor();
        await page.evaluate(() => { __qa.navigateWorkspace('characters'); __qa.isNavigationOpen = true; });
        await nav.getByRole('button', { name: '记忆系统', exact: true }).click();
        await page.locator('#memory-settings-panel').waitFor();
        assert.equal(await page.locator('#memory-settings-panel').getAttribute('aria-hidden'), 'false');
        await capture('memory-mobile');
        await page.evaluate(() => __qa.navigateWorkspace('settings'));
        await page.locator('#rphub-emb-cache-card').waitFor();
        await page.locator('#sf-presence-card').waitFor();
        await capture('settings-mobile');
        async function embedding() {
            return page.evaluate(async () => (await fetch('https://patch.test/v1/embeddings', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fixture' },
                body: JSON.stringify({ model: 'fixture-vector', input: '记得明天见面。' })
            })).json());
        }
        assert.deepEqual((await embedding()).data[0].embedding, [0.1, 0.2, 0.3]);
        await page.waitForFunction(async () => (await RPHubEmbeddingCache.stats()).count === 1);
        assert.deepEqual((await embedding()).data[0].embedding, [0.1, 0.2, 0.3]);
        assert.equal(embeddingRequests, 1, 'The same embedding must use the cache');
        await page.evaluate(() => __qa.navigateWorkspace('chat'));
        await page.locator('#sf-enter-toggle').click();
        assert.equal(await page.evaluate(() => RPHubEnterToggle.get()), true);
        await page.locator('#sf-moments-trigger').click();
        await page.locator('#sf-moment-title').fill('经典布局的手记');
        await page.locator('#sf-moment-text').fill('约好明天见面。');
        await page.locator('#sf-moment-save').click();
        await page.locator('#sf-moment-list').getByText('经典布局的手记', { exact: true }).waitFor();
        await page.locator('#sf-moment-close').click();
        await page.evaluate(() => __qa.navigateWorkspace('worldinfo'));
        await page.getByRole('button', { name: '搜索世界书', exact: true }).waitFor();
        await page.evaluate(() => __qa.openSettingsSection('appearance'));
        await page.getByRole('radio', { name: /经典/ }).waitFor();
        assert.equal(await page.getByRole('radio', { name: /经典/ }).isChecked(), true);
        await capture('appearance-mobile');
        await page.getByRole('radio', { name: /白昼手账/ }).check();
        assert.equal(await page.evaluate(() => document.body.classList.contains('chenyue-theme')), true);
        await page.evaluate(() => __qa.navigateWorkspace('characters'));
        await page.locator('.shell-dock').waitFor();
        await capture('journal-mobile');
        await page.evaluate(() => __qa.openSettingsSection('appearance'));
        await page.getByRole('radio', { name: /夜蔷薇/ }).check();
        await page.evaluate(() => __qa.navigateWorkspace('chat'));
        await page.locator('.island-input').fill('切换皮肤时保留的草稿');
        await page.evaluate(() => __qa.openSettingsSection('appearance'));
        await page.getByRole('radio', { name: /经典/ }).check();
        await page.evaluate(() => __qa.navigateWorkspace('chat'));
        assert.equal(await page.locator('.island-input').inputValue(), '切换皮肤时保留的草稿');
        assert.deepEqual(await page.evaluate(() => RPHubStorage.readMemoryState('classic-sentinel')),
            await page.evaluate(() => window.__memoryBeforeSkin));
        await page.evaluate(() => __qa.openSettingsSection('appearance'));
        await page.reload(); await ready();
        assert.equal(await page.evaluate(() => RPThemePacks.current), 'classic');
        await page.evaluate(() => RPHubThemeKit.setScheme('night'));
        assert.equal(await page.evaluate(() => RPThemePacks.current), 'classic', 'Classic night mode must retain the classic layout');
        await page.evaluate(() => __qa.navigateWorkspace('characters'));
        await capture('classic-night-mobile');
        await page.evaluate(() => __qa.openAnnouncement());
        await page.getByRole('dialog', { name: '玥玥的更新简报' }).waitFor();
        const notice = await page.locator('.release-reading').innerText();
        assert.ok(notice.includes('设置') && notice.includes('外观') && notice.includes('界面主题'));
        assert.ok(notice.includes('472441481') && notice.includes('132292045'));
        await capture('announcement-mobile');
        await page.getByRole('button', { name: '关闭更新公告' }).click();
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.evaluate(() => { RPHubThemeKit.setScheme('day'); __qa.navigateWorkspace('characters'); });
        await capture('desktop');
        await page.evaluate(() => __qa.openSettingsSection('appearance'));
        await capture('appearance-desktop');
        assert.deepEqual(errors, []);
        assert.deepEqual(missing, []);
        assert.deepEqual(remoteAnnouncements, []);
        fs.writeFileSync(path.join(root, 'verification/alignment-1.23/classic.json'),
            JSON.stringify({ defaultClassic: true, originalNavigation: true, modesKeepClassic: true,
                allSkinsSwitch: true, draftAndMemoryPreserved: true, ownAnnouncement: true,
                cacheHitWithoutNetwork: true, cacheAndPresenceVisible: true, momentsSaved: true,
                enterToggleWorks: true, worldbookSearchEntry: true, errors, missing }, null, 2));
        console.log('Classic default, original navigation, appearance switching, memory/draft preservation and local announcement passed.');
    } catch (error) {
        console.error(await page.evaluate(() => ({
            pack: RPThemePacks.current, classic: __qa?.classicUi, view: __qa?.currentView,
            navigation: !!document.querySelector('.shell-chat-menu'), dock: !!document.querySelector('.shell-dock'),
            radios: [...document.querySelectorAll('input[name="ui-pack"]')].map(input => [input.value, input.checked])
        })), errors);
        await page.screenshot({ path: path.join(output, 'failure.png') });
        throw error;
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
