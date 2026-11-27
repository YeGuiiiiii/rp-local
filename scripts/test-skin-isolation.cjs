const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.join(root, 'verification/skin-isolation');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [], results = [];
    try {
        for (const initial of [null, 'classic', 'chenyue', 'winter', 'invalid']) {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
            await context.addInitScript(bridge, { skin: null });
            await context.addInitScript(initial => {
                if (!sessionStorage.getItem('skin-seeded')) {
                    sessionStorage.setItem('skin-seeded', '1');
                    if (initial) localStorage.setItem('rphub-ui-pack', initial);
                }
            }, initial);
            let release, gate, hold = true;
            const block = () => { gate = new Promise(resolve => { release = resolve; }); };
            block();
            const page = await context.newPage();
            const personaRequests = [];
            page.on('request', request => {
                if (/\/(?:images\/chenyue|images\/updates|images\/announcements|themes\/[^/]+\/.*mascots)\//.test(request.url()))
                    personaRequests.push(request.url());
            });
            page.on('pageerror', error => errors.push(error.message));
            await context.route('**/*', async route => {
                const url = new URL(route.request().url());
                if (url.origin !== 'https://sta1n156.github.io') return route.abort();
                if (hold && url.pathname.endsWith('/app.js')) await gate;
                const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
                if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                    return route.fulfill({ status: 404, body: '' });
                return route.fulfill({ path: file, contentType: ({
                    '.html': 'text/html', '.js': 'application/javascript',
                    '.css': 'text/css', '.webp': 'image/webp'
                })[path.extname(file)] || 'application/octet-stream' });
            });
            const expected = ['chenyue', 'winter'].includes(initial) ? initial : 'classic';
            async function checkStartup(skin) {
                await page.locator('.entry-transition').waitFor();
                await page.waitForFunction(() => window.RPThemePacks);
                assert.equal(await page.evaluate(() => RPThemePacks.current), skin);
                if (skin === 'classic') {
                    assert.equal(await page.locator('.startup-mascot:visible').count(), 0, 'Classic startup must not expose Yueyue');
                    await page.locator('.entry-transition-book').waitFor();
                    assert.equal(await page.locator('.entry-transition img').count(), 0);
                } else {
                    await page.locator('.startup-mascot').waitFor();
                    await page.waitForFunction(() => {
                        const image = document.querySelector('.startup-mascot');
                        return image?.complete && image.naturalWidth > 0;
                    });
                    assert.match(await page.locator('.startup-mascot').getAttribute('src'),
                        skin === 'winter' ? /winter\/.*mascots\/transfer/ : /(?:chenyue|vampire)\/transfer/);
                }
                await page.screenshot({ path: path.join(output, `${skin}-startup-${initial}.png`) });
            }
            async function ready() {
                await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
                await page.evaluate(() => {
                    window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                    __qa.showUserSetupModal = false; __qa.showAnnouncement = false;
                });
            }
            let navigation = page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'commit' });
            try {
                await navigation; await checkStartup(expected);
                if (expected === 'classic') assert.deepEqual(personaRequests, [], 'Classic first paint does not request persona artwork');
            } finally { release(); hold = false; }
            await ready();
            if (initial === null) {
                await page.evaluate(async () => {
                    __qa.characters = [{ uuid: 'skin-preserve', name: 'Skin fixture', first_mes: 'Saved story',
                        avatar: RPHubUtils.defaultAvatar,
                        createdAt: 1, description: '', worldInfo: [], regexScripts: [], uiTemplates: [] }];
                    await __qa.selectCharacter(0);
                    await __qa.saveData();
                    await RPHubStorage.saveCharacterLibrary(__qa.characters);
                    await RPLocalStore.flush();
                });
                await page.locator('.island-input').fill('Draft survives skin changes');
                for (const skin of ['chenyue', 'winter', 'classic']) {
                    await page.evaluate(() => __qa.openSettingsSection('appearance'));
                    await page.getByRole('radio', {
                        name: ({ classic: '经典皮肤', chenyue: '玥玥经典皮肤', winter: '冬至皮肤' })[skin], exact: true
                    }).check();
                    await page.evaluate(() => __qa.navigateWorkspace('chat'));
                    assert.equal(await page.locator('.island-input').inputValue(), 'Draft survives skin changes');
                    assert.equal(await page.evaluate(() => __qa.currentCharacter?.uuid), 'skin-preserve', skin + ' preserves selected character');
                    assert.equal(await page.evaluate(() => __qa.chatHistory[0].content), 'Saved story');
                    await page.evaluate(() => {
                        __qa.backupTask.active = true;
                        __qa.backupTask.title = '导出备份';
                        __qa.backupTask.locked = false;
                    });
                    const transfer = page.getByRole('dialog', { name: '导出备份', exact: true });
                    await transfer.waitFor();
                    assert.equal(await transfer.locator('.transfer-mascot').count(), skin === 'classic' ? 0 : 1);
                    await page.evaluate(() => { __qa.backupTask.active = false; __qa.openAnnouncement(); });
                    const notice = page.getByRole('dialog', { name: skin === 'classic' ? '更新公告' : '玥玥的更新简报', exact: true });
                    await notice.waitFor();
                    assert.equal(await notice.locator('.release-mascot').count(), skin === 'classic' ? 0 : 1);
                    await page.screenshot({ path: path.join(output, `${skin}-announcement.png`) });
                    await page.getByRole('button', { name: '关闭更新公告', exact: true }).click();
                    await notice.waitFor({ state: 'detached' });
                    await page.evaluate(() => {
                        RPUpdates.state.latest = { versionName: '2.9.599', url: 'https://example.test/update.apk' };
                        RPUpdates.state.showNotice = true;
                    });
                    const update = page.getByRole('dialog', { name: '发现新版本', exact: true });
                    await update.waitFor();
                    assert.equal(await update.locator('.update-notice-art img').count(), skin === 'classic' ? 0 : 1);
                    await page.getByRole('button', { name: '关闭更新提醒', exact: true }).click();
                    await page.evaluate(() => { __qa.navigateWorkspace('characters'); __qa.toasts = []; RPThemePacks.setMode('night'); });
                    for (const width of [390, 1280]) {
                        await page.setViewportSize({ width, height: 900 });
                        await page.waitForFunction(() => [...document.images].filter(image => image.getClientRects().length)
                            .every(image => image.complete && image.naturalWidth > 0));
                        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                        await page.screenshot({ path: path.join(output, `${skin}-directory-${width}.png`), animations: 'disabled' });
                    }
                    await page.setViewportSize({ width: 390, height: 844 });
                    if (skin === 'classic') {
                        assert.equal(await page.locator('.yy-poke-mascot,.yy-mascot-speech').count(), 0);
                        assert.equal(await page.locator('img[src*="/chenyue/"]:visible').count(), 0);
                    } else {
                        await page.locator('.yy-poke-mascot:visible').first().click();
                        await page.locator('.yy-mascot-speech').waitFor();
                        await page.evaluate(() => RPThemePacks.set('classic'));
                        assert.equal(await page.locator('.yy-mascot-speech,.yy-poke-mascot').count(), 0);
                        await page.evaluate(skin => RPThemePacks.set(skin), skin);
                    }
                    hold = true; block();
                    navigation = page.reload({ waitUntil: 'commit' });
                    try { await navigation; await checkStartup(skin); } finally { release(); hold = false; }
                    await ready();
                    await page.evaluate(() => __qa.navigateWorkspace('chat'));
                    await page.locator('.island-input').fill('Draft survives skin changes');
                    assert.equal(await page.evaluate(() => RPThemePacks.mode), 'night');
                }
                // A failed saved-data read keeps the neutral splash and retry action.
                await page.route('**/data-services.js*', route => route.fulfill({
                    contentType: 'application/javascript',
                    body: fs.readFileSync(path.join(web, 'assets/js/data-services.js'), 'utf8')
                        + '\nwindow.RPHubStorage = { ...RPHubStorage, initDB: async () => { throw new Error("skin read failure"); } };'
                }));
                await page.reload();
                await page.waitForFunction(() => window.__rpDataError);
                assert.equal(await page.locator('.entry-transition img').count(), 0);
                await page.getByRole('button', { name: '重新加载', exact: true }).waitFor();
            }
            results.push({ initial, expected, passed: true });
            await context.close();
        }
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ results, errors, actualDeviceTested: false }, null, 2));
        console.log('Skin isolation: default/invalid selection, saved skins without migration marker, startup, reload, day/night, transfer, announcement, update and failure passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
