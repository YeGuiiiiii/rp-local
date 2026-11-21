const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.join(root, 'verification/mobile-editors');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const failures = [], errors = [];
    try {
        for (const skin of ['journal', 'classic']) {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
            await context.addInitScript(installFileBridge, { skin });
            await context.addInitScript(() => {
                window.qaVisualHeight = 844;
                Object.defineProperty(visualViewport, 'height', { get: () => window.qaVisualHeight });
                Object.defineProperty(visualViewport, 'offsetTop', { get: () => 0 });
            });
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.origin !== 'https://sta1n156.github.io') return route.abort();
                const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
                if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                    return route.fulfill({ status: 404, body: '' });
                return route.fulfill({ path: file, contentType: ({
                    '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html'
                })[path.extname(file)] || 'application/octet-stream' });
            });
            const page = await context.newPage();
            page.on('pageerror', error => errors.push(error.message));
            const keyboard = async (mode, inset) => {
                await page.evaluate(({ mode, inset }) => {
                    if (mode === 'native') window.rphubSetKeyboardInset(inset);
                    else {
                        window.qaVisualHeight = 844 - inset;
                        visualViewport.dispatchEvent(new Event('resize'));
                    }
                    let cover = document.getElementById('qa-keyboard');
                    if (!cover) {
                        cover = document.createElement('div');
                        cover.id = 'qa-keyboard';
                        cover.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#333';
                        document.body.appendChild(cover);
                    }
                    cover.style.height = inset + 'px';
                }, { mode, inset });
                await page.waitForTimeout(250);
            };
            const visibleAboveKeyboard = async (locator, bottom, label) => {
                const rect = await locator.boundingBox();
                assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= bottom + 1,
                    `${label}: ${JSON.stringify(rect)}, keyboard starts at ${bottom}`);
                assert.equal(await locator.evaluate(el => {
                    const r = el.getBoundingClientRect();
                    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                    return hit === el || el.contains(hit);
                }), true, label + ' must be reachable');
            };
            const check = async (label, work) => {
                try { await work(); console.log('PASS ' + label); }
                catch (error) {
                    failures.push(label + ': ' + error.message);
                    await page.screenshot({ path: path.join(output, label + '-failed.png') });
                    console.error('FAIL ' + label + ': ' + error.message);
                }
            };
            await page.goto('https://sta1n156.github.io/RP-Hub/');
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                qa.showUserSetupModal = false;
                qa.closeAnnouncement();
                qa.presets = [{ name: 'Keyboard fixture', content: 'Keep this content', group: 'Original', enabled: true, role: 'system' }];
            });
            assert.equal(await page.evaluate(() => qa.classicUi), skin === 'classic', 'Exercise the actual selected layout');
            for (const mode of ['native', 'browser']) {
                await check(`${skin}-${mode}-batch-move`, async () => {
                    await keyboard(mode, 0);
                    await page.evaluate(() => {
                        qa.navigateWorkspace('presets');
                        qa.openPresetGroup('Original');
                        qa.isPresetBatchManaging = true;
                        qa.selectedPresetIndices = [0];
                    });
                    await page.getByRole('button', { name: '移动分组', exact: true }).click();
                    const input = page.getByPlaceholder('输入分组名称（留空即默认分组）');
                    await input.fill('Keyboard group');
                    await keyboard(mode, 340);
                    await visibleAboveKeyboard(input, 504, 'Group name');
                    await visibleAboveKeyboard(page.getByRole('button', { name: '确认移动', exact: true }), 504, 'Move button');
                    await page.screenshot({ path: path.join(output, `${skin}-${mode}-group.png`) });
                    await page.evaluate(() => {
                        qa.presets.push(...Array.from({ length: 20 }, (_, i) => ({
                            name: 'Extra preset ' + i, content: '', group: 'Extra group ' + i, enabled: true, role: 'system'
                        })));
                    });
                    await keyboard(mode, 540);
                    await visibleAboveKeyboard(input, 304, 'Group name with many groups and a tall keyboard');
                    await visibleAboveKeyboard(page.getByRole('button', { name: '确认移动', exact: true }), 304, 'Move button with tall keyboard');
                    await page.getByRole('button', { name: '确认移动', exact: true }).click();
                    assert.deepEqual(await page.evaluate(() => [qa.presets[0].group, qa.presets[0].content]), ['Keyboard group', 'Keep this content']);
                });
                await keyboard(mode, 0);
                await page.evaluate(() => { qa.showPresetBatchMoveModal = false; qa.presets[0].group = 'Original'; });
                await check(`${skin}-${mode}-persona`, async () => {
                    await page.evaluate(() => {
                        qa.navigateWorkspace('settings');
                        qa.openSettingsSection('persona');
                        qa.user.description = Array.from({ length: 80 }, (_, i) => `Persona line ${i}`).join('\n');
                    });
                    const description = page.getByPlaceholder('外貌、性格、背景故事等...').filter({ visible: true });
                    await description.click();
                    await description.press('Control+End');
                    await keyboard(mode, 340);
                    await visibleAboveKeyboard(description, 504, 'Persona description');
                    await description.press('End');
                    await description.press('X');
                    assert.ok((await page.evaluate(() => qa.user.description)).endsWith('79X'));
                    await page.screenshot({ path: path.join(output, `${skin}-${mode}-persona.png`) });
                    await keyboard(mode, 540);
                    await visibleAboveKeyboard(description, 304, 'Persona with tall keyboard');
                    await keyboard(mode, 0);
                    assert.equal(await description.inputValue(), await page.evaluate(() => qa.user.description));
                    assert.equal(await page.evaluate(() => window.scrollY), 0, 'Header must not scroll offscreen');
                });
                await keyboard(mode, 0);
            }
            await check(`${skin}-chat-and-desktop`, async () => {
                await page.evaluate(() => {
                    qa.currentCharacter = { uuid: 'keyboard-chat', name: 'Keyboard chat', description: '' };
                    qa.currentView = 'chat';
                    qa.userInput = 'Draft remains intact';
                });
                const chat = page.locator('.input-island textarea');
                await chat.focus();
                await keyboard('browser', 340);
                await visibleAboveKeyboard(chat, 504, 'Chat composer');
                await keyboard('browser', 0);
                assert.equal(await chat.inputValue(), 'Draft remains intact');
                await page.setViewportSize({ width: 1280, height: 900 });
                await page.waitForTimeout(100);
                await page.evaluate(() => { qa.isNavigationOpen = true; });
                const menu = skin === 'classic' ? page.locator('#app-navigation-panel')
                    : page.getByRole('dialog', { name: '聊天菜单', exact: true });
                const closeMenu = menu.getByRole('button', { name: skin === 'classic' ? '关闭导航' : '关闭聊天菜单', exact: true });
                await closeMenu.focus();
                await page.waitForTimeout(100);
                assert.equal(await menu.isVisible(), true, 'Focusing desktop controls must not close the menu');
                await page.keyboard.press('Escape');
                await menu.waitFor({ state: 'hidden' });
                await page.evaluate(() => { qa.navigateWorkspace('presets'); qa.openPresetGroup('Original'); qa.selectedPresetIndices = [0]; });
                await page.evaluate(() => qa.openPresetBatchMoveModal());
                await visibleAboveKeyboard(page.getByPlaceholder('输入分组名称（留空即默认分组）'), 900, 'Desktop group name');
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            });
            await context.close();
        }
        assert.deepEqual(errors, [], 'No page errors');
        assert.deepEqual(failures, []);
        console.log('Mobile group move and long persona editing passed in both layouts and keyboard paths.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
