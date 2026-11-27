const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const bridge = require('./mock-files.cjs');
const web = path.resolve(__dirname, '../web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.resolve(__dirname, '../verification/chat-return');
fs.mkdirSync(output, { recursive: true });

// Catches lost chat origins, stale return targets and return actions that reload a chat or bypass a dialog.
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [];
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        await context.addInitScript(bridge, { skin: 'chenyue' });
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: ({
                '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css'
            })[path.extname(file)] || 'application/octet-stream' });
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async () => {
            window.qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            qa.showUserSetupModal = false; qa.showAnnouncement = false;
            qa.characters = [{ uuid: 'return-fixture', name: '导航测试角色', first_mes: '原来的聊天\n\n' + '旅人停下来阅读这一段故事。\n\n'.repeat(80),
                avatar: RPHubUtils.defaultAvatar, createdAt: 1, description: '',
                worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await qa.selectCharacter(0);
        });
        const state = () => page.evaluate(() => qa.currentView);
        const navigate = view => page.evaluate(view => qa.navigateWorkspace(view), view);
        const back = () => page.evaluate(() => window.rphubHandleBack());
        const returnButton = () => page.getByRole('button', { name: '返回聊天', exact: true });
        await navigate('settings');
        await back();
        assert.equal(await state(), 'chat', 'Back from settings opened in chat must return to that chat');

        const chatScroll = page.locator('.chat-view-root [class*="overflow-y-auto"]').first();
        await chatScroll.evaluate(element => { element.scrollTop = 420; });
        const readingTop = await chatScroll.evaluate(element => element.scrollTop);
        assert.ok(readingTop > 100, 'Fixture has enough history to test reading position');
        await navigate('settings');
        await returnButton().click();
        await page.waitForFunction(top => {
            const element = document.querySelector('.chat-view-root [class*="overflow-y-auto"]');
            return Math.abs(element.scrollTop - top) < 3;
        }, readingTop);
        await page.locator('.island-input').fill('还没有发出的草稿');
        const before = await page.evaluate(() => ({
            character: qa.currentCharacter.uuid, history: JSON.stringify(qa.chatHistory), branch: qa.currentStoryBranch.id
        }));
        for (const skin of ['chenyue', 'winter', 'classic']) {
            await page.evaluate(skin => RPThemePacks.set(skin), skin);
            await navigate('settings');
            for (const view of ['settings-detail', 'memory', 'cache', 'backup', 'usage', 'patchlist']) {
                if (view === 'settings-detail') await page.evaluate(() => qa.openSettingsSection('appearance'));
                else await navigate(view);
                assert.equal(await returnButton().count(), 1, skin + '/' + view + ' has one return action');
                if (view === 'settings-detail') {
                    await page.evaluate(() => { qa.toasts = []; });
                    await page.screenshot({ path: path.join(output, `${skin}-appearance-390.png`), animations: 'disabled' });
                    const fits = await returnButton().evaluate(button => {
                        const rect = button.getBoundingClientRect();
                        return rect.left >= 0 && rect.right <= innerWidth && rect.height >= 44;
                    });
                    assert.ok(fits, 'The return action fits in the mobile header');
                }
                await returnButton().click();
                assert.equal(await state(), 'chat');
                assert.equal(await page.locator('.island-input').inputValue(), '还没有发出的草稿');
                assert.deepEqual(await page.evaluate(() => ({
                    character: qa.currentCharacter.uuid, history: JSON.stringify(qa.chatHistory), branch: qa.currentStoryBranch.id
                })), before, 'Returning must preserve the actual chat and branch');
                await navigate('settings');
            }
            await returnButton().click();
            await page.evaluate(() => qa.openSettingsSection('appearance'));
            await back();
            assert.equal(await state(), 'chat', 'Direct chat shortcut returns directly');
        }
        await page.evaluate(() => RPThemePacks.set('chenyue'));
        await navigate('settings');
        await page.evaluate(() => qa.openSettingsSection('api'));
        await back();
        assert.equal(await state(), 'settings');
        await back();
        assert.equal(await state(), 'chat');
        await navigate('settings');
        await page.evaluate(() => qa.openSettingsSection('appearance'));
        for (const skin of ['winter', 'classic', 'chenyue']) {
            await page.getByRole('radio', { name: ({
                winter: '冬至皮肤', classic: '经典皮肤', chenyue: '玥玥经典皮肤'
            })[skin], exact: true }).check();
            assert.equal(await returnButton().count(), 1, 'Skin change keeps the chat destination');
        }
        await page.evaluate(() => { qa.showModelSelector = true; });
        await page.evaluate(() => document.querySelector('.chat-return-button').click());
        assert.equal(await state(), 'settings-detail', 'Return dismisses an open dialog before navigating');
        assert.equal(await page.evaluate(() => qa.showModelSelector), false);
        await page.evaluate(() => { qa.backupTask.active = true; qa.backupTask.locked = true; });
        await page.evaluate(() => document.querySelector('.chat-return-button').click());
        assert.equal(await state(), 'settings-detail', 'Locked backup must not be bypassed');
        await page.evaluate(() => { qa.backupTask.active = false; qa.backupTask.locked = false; });
        await returnButton().click();
        assert.equal(await state(), 'chat');

        await navigate('settings');
        await navigate('characters');
        await navigate('settings');
        assert.equal(await returnButton().count(), 0, 'Leaving the settings visit clears its chat origin');
        await back();
        assert.equal(await state(), 'characters');
        await navigate('chat');
        await page.evaluate(() => { qa.chatHistory = []; });
        await navigate('settings');
        await returnButton().click();
        assert.equal(await state(), 'chat', 'An empty conversation is still a valid return target');
        assert.equal(await page.evaluate(() => qa.chatHistory.length), 0);
        await navigate('chat');
        await navigate('settings');
        await page.evaluate(async () => { await qa.saveData(); await RPLocalStore.flush(); });
        await page.evaluate(() => { qa.characters = []; qa.currentCharacterIndex = -1; });
        assert.equal(await returnButton().count(), 0, 'Deleted character must not leave a stale return button');
        await back();
        assert.equal(await state(), 'characters');

        // Real settings menu click plus responsive screenshots, using an isolated fixture.
        await page.evaluate(async () => {
            qa.characters = [{ uuid: 'return-visual', name: '导航测试角色', first_mes: '原来的聊天',
                avatar: RPHubUtils.defaultAvatar, createdAt: 1, worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await qa.selectCharacter(0);
            qa.isNavigationOpen = true;
        });
        await page.locator('.shell-chat-menu').getByRole('button', { name: '设置', exact: true }).click();
        await page.evaluate(() => { qa.toasts = []; });
        for (const width of [390, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            await returnButton().waitFor();
            await page.locator('.shell-settings-home').evaluate(element => { element.scrollTop = 0; });
            await page.screenshot({ path: path.join(output, `settings-${width}.png`), animations: 'disabled' });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.locator('.shell-settings-home').evaluate(element => { element.scrollTop = 300; });
            assert.ok(await returnButton().evaluate(button => {
                const rect = button.getBoundingClientRect();
                return rect.top >= 0 && rect.bottom < innerHeight;
            }), 'The return action stays visible after scrolling settings');
        }
        await returnButton().click();
        assert.equal(await state(), 'chat');
        let heldResponse;
        let generationRequests = 0;
        await context.route('https://chat.test/**', async route => {
            const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
                'access-control-allow-methods': 'POST,OPTIONS' };
            if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
            generationRequests++;
            await new Promise(resolve => { heldResponse = resolve; });
            return route.fulfill({ headers, json: { choices: [{
                message: { role: 'assistant', content: '回来时这轮回复已经完成。' }, finish_reason: 'stop'
            }] } });
        });
        await page.evaluate(() => {
            Object.assign(qa.settings, { apiUrl: 'https://chat.test/v1', apiKey: 'TEST', model: 'test-chat', stream: false });
            qa.memorySettings.enabled = false;
            qa.userInput = '生成过程中去设置';
        });
        const received = page.waitForRequest('https://chat.test/v1/chat/completions');
        const sending = page.evaluate(() => qa.sendMessage());
        await received;
        await navigate('settings');
        assert.equal(await page.evaluate(() => qa.isGenerating), true);
        await returnButton().click();
        assert.equal(await state(), 'chat');
        assert.equal(await page.evaluate(() => qa.isGenerating), true, 'Returning keeps the request alive');
        heldResponse();
        await sending;
        assert.equal(generationRequests, 1, 'Navigation must not send a second request');
        assert.equal(await page.evaluate(() => qa.chatHistory.at(-1).content), '回来时这轮回复已经完成。');
        assert.deepEqual(errors, [], 'No browser runtime errors');
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: true, errors }, null, 2));
        console.log('PASS: settings return, direct shortcuts, all skins, state, guards, invalid origins and responsive UI');
        await context.close();
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
