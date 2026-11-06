const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('../../scripts/mock-files.cjs');
const root = path.resolve(__dirname, '../..');
const web = path.join(root, 'web');
const output = path.resolve(process.argv[2] || __dirname);
const inputOption = process.argv.indexOf('--cards-dir');
const input = inputOption >= 0 ? path.resolve(process.argv[inputOption + 1]) : __dirname;
const cards = JSON.parse(fs.readFileSync(path.join(input, 'cards.json'), 'utf8'));
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 },
            deviceScaleFactor: 3, reducedMotion: 'reduce' });
        await context.addInitScript(() => {
            // This capture never reloads; keep the mock native files in memory.
            const set = Storage.prototype.setItem;
            Storage.prototype.setItem = function (key, value) {
                if (key !== '__qa_native_files') return set.call(this, key, value);
            };
        });
        await context.addInitScript(installFiles);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            if (/^\/RP-Hub\/card-cover-[0-3]\.png$/.test(url.pathname)) {
                return route.fulfill({ path: path.join(input,
                    url.pathname.split('/').at(-1)), contentType: 'image/png' });
            }
            if (url.pathname.includes('/_files/')) {
                const name = decodeURIComponent(url.pathname.split('/_files/')[1]);
                const record = await page.evaluate(name => __qaNativeFiles[name], name);
                return route.fulfill({ body: Buffer.from(record.binary, 'base64'), contentType: 'image/webp' });
            }
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({ path: file, contentType: ({
                '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webp': 'image/webp'
            })[path.extname(file)] || 'application/octet-stream' });
        });
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async cards => {
            window.__promo = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __promo.showUserSetupModal = false;
            __promo.showAnnouncement = false;
            __promo.user.name = '旅人';
            __promo.characters = cards.map(({ raw }, index) => {
                const imported = RPHubCardUtils.parseImportedCharacterCard(raw);
                return {
                    ...imported, uuid: 'promo-' + index, createdAt: cards.length - index,
                    avatar: 'card-cover-' + index + '.png',
                    worldInfo: imported.worldInfoEntries.map(entry =>
                        RPHubCardUtils.normalizeWorldInfoEntry({ ...entry, scope: 'character' },
                            { systemNames: RPHubConfig.systemWorldInfoNames })),
                    regexScripts: imported.regexScripts.map(script =>
                        RPHubCardUtils.normalizeImportedRegexScript({ ...script, scope: 'character' },
                            { fallbackScope: 'character', systemNames: RPHubConfig.systemRegexNames }))
                };
            });
            await RPHubStorage.setStoredValue('characters', RPHubStorage.cloneForStorage(__promo.characters));
            __promo.characters = await RPHubStorage.getStoredValue('characters');
            for (const card of __promo.characters) {
                const image = await (await fetch(card.avatar)).blob();
                await RPLocalStore.saveImage(card.uuid + '-cover', image, card);
            }
            await __promo.selectCharacter(0, false, { silent: true });
            __promo.toasts = [];
            __promo.navigateWorkspace('characters');
            __promo.characterGridView = true;
        }, cards);
        async function capture(name) {
            await page.evaluate(() => { __promo.toasts = []; document.activeElement?.blur(); });
            await page.waitForTimeout(1800);
            await page.waitForFunction(() => [...document.images].filter(image => image.getClientRects().length)
                .every(image => image.complete && image.naturalWidth > 0));
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(output, name + '.png') });
        }
        await page.evaluate(() => RPThemePacks.set('journal'));
        await capture('screen-day-home');
        await page.evaluate(() => { RPThemePacks.set('vampire'); __promo.navigateWorkspace('advanced'); });
        await capture('screen-night-advanced');
        await page.evaluate(() => __promo.navigateWorkspace('album'));
        if (process.argv.includes('--expanded')) await page.setViewportSize({ width: 390, height: 920 });
        await capture('screen-night-gallery');
        if (process.argv.includes('--expanded')) {
            await page.setViewportSize({ width: 390, height: 844 });
            await page.evaluate(() => {
                RPThemePacks.set('classic');
                RPHubThemeKit.setScheme('day');
                __promo.navigateWorkspace('characters');
                __promo.characterGridView = false;
            });
            await capture('screen-classic-deck');
            await page.evaluate(() => {
                __promo.navigateWorkspace('memory');
                __promo.showMemorySettings = true;
                __promo.memorySettings.enabled = true;
            });
            await capture('screen-classic-memory');
            await page.evaluate(() => {
                RPThemePacks.set('journal');
                __promo.openSettingsSection('appearance');
            });
            await capture('screen-day-appearance');
            await page.evaluate(() => {
                RPThemePacks.set('vampire');
                __promo.navigateWorkspace('characters');
                __promo.characterGridView = true;
            });
            await capture('screen-night-home');
        }
        assert.deepEqual(errors, []);
        console.log('Captured actual application pages at 1170 x 2532, using four existing character cards in isolated storage: ' + output);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
