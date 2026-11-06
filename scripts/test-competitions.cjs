const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, 'verification/competitions-1.21');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [], missing = [];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(bridge);
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
            missing.push(url.pathname);
            return route.fulfill({ status: 404, body: '' });
        }
        return route.fulfill({ path: file, contentType: ({
            '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
            '.webp': 'image/webp', '.png': 'image/png'
        })[path.extname(file)] || 'application/octet-stream' });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const ready = async () => {
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.closeAnnouncement();
        });
    };
    const select = async name => {
        const surface = await page.locator('.release-overlay').count() ? page.locator('.release-overlay') : page.locator('.shell-advanced');
        const entry = surface.getByRole('button', { name, exact: true });
        if (!await entry.isVisible() && await surface.locator('.competition-carousel').count())
            await surface.getByRole('button', { name: '查看' + name, exact: true }).click();
        await entry.click();
    };
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await ready();
        await page.evaluate(() => __qa.navigateWorkspace('advanced'));
        assert.equal(await page.locator('.competition-entry').count(), 2, 'Both competitions have permanent entries');
        assert.equal(await page.locator('.competition-entry:visible').count(), 1, 'One banner at a time');
        const previousArrow = page.getByRole('button', { name: '上一场赛事', exact: true });
        await page.waitForTimeout(220);
        await previousArrow.hover();
        const restingArrow = await previousArrow.boundingBox();
        await page.mouse.down(); await page.waitForTimeout(140);
        const pressedArrow = await previousArrow.boundingBox();
        assert.ok(Math.abs(pressedArrow.y - restingArrow.y) <= 2, 'Pressing the arrow does not displace its circular control: ' + JSON.stringify({ restingArrow, pressedArrow }));
        await page.mouse.up();
        await page.getByRole('button', { name: '查看奇幻杯周赛', exact: true }).click();
        await page.getByRole('button', { name: '上一场赛事', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: '科技／科幻杯', exact: true }).isVisible(), true, 'Previous wraps to the other event');
        await page.getByRole('button', { name: '下一场赛事', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: '奇幻杯周赛', exact: true }).isVisible(), true);
        await page.getByRole('button', { name: '查看科技／科幻杯', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: '科技／科幻杯', exact: true }).isVisible(), true);
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(2200);
        assert.equal(await page.getByRole('button', { name: '奇幻杯周赛', exact: true }).isVisible(), true, 'Keyboard switches and banners do not autoplay');
        await page.getByRole('button', { name: '奇幻杯周赛', exact: true }).focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '科技／科幻杯', 'Keyboard focus follows the visible banner');
        await page.keyboard.press('ArrowLeft');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '奇幻杯周赛', 'Repeated keyboard navigation needs no extra click');
        await select('奇幻杯周赛');
        await page.locator('.competition-detail').waitFor();
        const visit = page.getByRole('button', { name: '前往灯塔查看赛事', exact: true });
        assert.equal(await visit.count(), 1, 'One source entry per detail page');
        assert.equal(await page.locator('.competition-poster').evaluate(image =>
            Boolean(image.compareDocumentPosition(document.querySelector('.competition-visit')) & Node.DOCUMENT_POSITION_FOLLOWING)),
            true, 'Lighthouse source entry follows the complete poster');
        await visit.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('.competition-poster')?.naturalWidth > 0);
        const posterBounds = await page.locator('.competition-poster').boundingBox();
        const visitBounds = await visit.boundingBox();
        assert.ok(visitBounds.y >= posterBounds.y + posterBounds.height, 'Lighthouse source entry follows the complete poster');
        assert.match(await page.locator('.competition-detail').innerText(), /热度排名/);
        assert.match(await page.locator('.competition-detail').innerText(), /每位作者.*一张/);
        assert.match(await page.locator('.competition-detail').innerText(), /2026年11月6日—11月12日 23:59/);
        assert.equal(await page.getByRole('link', { name: '打开投稿邮件草稿' }).count(), 0, 'Fantasy does not borrow the science submission method');
        assert.deepEqual(await page.evaluate(() => {
            const event = RPCompetitions.events.find(item => item.id === 'fantasy');
            return [
                RPCompetitions.phase(event, Date.parse('2026-11-05T23:59:59+08:00')),
                RPCompetitions.phase(event, Date.parse('2026-11-06T00:00:00+08:00')),
                RPCompetitions.phase(event, Date.parse('2026-11-12T23:59:59+08:00')),
                RPCompetitions.phase(event, Date.parse('2026-11-13T00:00:00+08:00'))
            ];
        }), ['尚未开始', '投稿中', '投稿中', '投稿已截止']);
        await page.getByRole('button', { name: '返回', exact: true }).click();
        assert.equal(await page.evaluate(() => __qa.currentView), 'advanced');
        await select('科技／科幻杯');
        assert.match(await page.locator('.competition-detail').innerText(), /盲审/);
        assert.match(await page.locator('.competition-detail').innerText(), /2500/);
        assert.match(await page.locator('.competition-detail').innerText(), /2026年12月1日 23:59/);
        await page.getByText('作品提交格式', { exact: true }).click();
        const mail = page.getByRole('link', { name: '打开投稿邮件草稿' });
        assert.ok((await mail.getAttribute('href')).startsWith('mailto:2459751615@qq.com?'));
        assert.match(decodeURIComponent(await mail.getAttribute('href')), /【科技杯】作品名 - 作者昵称/);
        assert.match(decodeURIComponent(await mail.getAttribute('href')), /原理.*限制与代价.*社会影响/);
        await page.getByText('参赛须知', { exact: true }).click();
        assert.match(await page.locator('.competition-detail').innerText(), /不在评审期间.*影响评委/);
        assert.equal(await page.getByText('赛事海报', { exact: true }).count(), 0, 'No redundant poster label');
        await page.locator('.competition-poster').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => {
            const image = document.querySelector('.competition-poster');
            return image?.complete && image.naturalWidth > 0;
        });
        assert.equal(await page.locator('.competition-detail .rphub-image-download-button').count(), 0);
        assert.equal(await page.locator('.competition-poster').evaluate(image => RPImagePolicy.isContentImage(image)), false);
        await page.evaluate(() => {
            window.__lighthouseCalls = [];
            window.AndroidBridge = { openLighthouse: url => __lighthouseCalls.push(url) };
        });
        await page.getByRole('button', { name: '前往灯塔查看赛事' }).click();
        assert.deepEqual(await page.evaluate(() => __lighthouseCalls), [
            'https://wxdt.duckdns.org/designs/before-redesign/#forum/topic/E8198ObJXB0gHgWR'
        ]);
        assert.equal(await page.evaluate(() => __qa.currentView), 'competition', 'Native window preserves the event page');
        await page.evaluate(() => { delete window.AndroidBridge; });
        await page.getByRole('button', { name: '前往灯塔查看赛事' }).click();
        assert.equal(await page.evaluate(() => __qa.currentView), 'lighthouse');
        assert.equal(await page.evaluate(() => __qa.lighthouseUrl),
            'https://wxdt.duckdns.org/designs/before-redesign/#forum/topic/E8198ObJXB0gHgWR');
        await page.evaluate(() => __qa.shellGoBack());
        assert.equal(await page.evaluate(() => __qa.currentView), 'competition');
        await page.evaluate(() => __qa.shellGoBack());
        assert.equal(await page.evaluate(() => __qa.currentView), 'advanced');
        assert.equal(await page.getByRole('button', { name: '科技／科幻杯', exact: true }).isVisible(), true, 'Returning preserves the selected banner');
        await page.evaluate(() => __qa.openAnnouncement());
        assert.match(await page.locator('.release-section').first().innerText(), /鸣谢.*红花铃.*启元.*472441481/s);
        await select('奇幻杯周赛');
        assert.equal(await page.evaluate(() => __qa.showAnnouncement), false);
        await page.getByRole('button', { name: '前往灯塔查看赛事' }).click();
        assert.equal(await page.evaluate(() => __qa.lighthouseUrl),
            'https://wxdt.duckdns.org/designs/before-redesign/#forum/topic/tjnOqr_NrPzBw6-f');
        await page.evaluate(() => __qa.shellGoBack());
        await page.evaluate(() => __qa.shellGoBack());
        assert.equal(await page.evaluate(() => __qa.currentView), 'advanced', 'Announcement entry returns to its original page');
        for (const theme of ['journal', 'vampire']) {
            await page.evaluate(theme => RPThemePacks.set(theme), theme);
            for (const [width, height] of [[360, 800], [390, 844], [1280, 900], [844, 390]]) {
                await page.setViewportSize({ width, height });
                await page.evaluate(() => __qa.navigateWorkspace('advanced'));
                await page.getByRole('button', { name: '查看奇幻杯周赛', exact: true }).click();
                await page.locator('.competition-list').scrollIntoViewIfNeeded();
                await page.waitForFunction(() => [...document.querySelectorAll('.competition-entry img')].filter(image => image.getClientRects().length).every(image => image.complete && image.naturalWidth > 0));
                await page.waitForTimeout(200);
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                assert.equal(await page.locator('.competition-list img').evaluateAll(images => images.every(image =>
                    image.src.endsWith('-banner.webp') && !RPImagePolicy.isContentImage(image))), true);
                assert.ok(await page.locator('.competition-entry strong').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= 20);
                await page.screenshot({ path: path.join(output, `entries-${theme}-${width}.png`) });
                await page.getByRole('button', { name: '查看科技／科幻杯', exact: true }).click();
                await page.waitForFunction(() => {
                    const image = document.querySelector('.competition-entry--science img');
                    return image?.complete && image.naturalWidth > 0;
                });
                await page.screenshot({ path: path.join(output, `entries-science-${theme}-${width}.png`) });
                await select('科技／科幻杯');
                await page.waitForTimeout(200);
                assert.equal(await page.locator('.competition-detail').evaluate(el => el.scrollWidth > el.clientWidth), false);
                await page.screenshot({ path: path.join(output, `detail-${theme}-${width}.png`) });
            }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => __qa.navigateWorkspace('advanced'));
        await select('奇幻杯周赛');
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(output, 'fantasy-vampire-390.png') });
        await page.locator('.competition-poster').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => {
            const image = document.querySelector('.competition-poster');
            return image?.complete && image.naturalWidth > 0;
        });
        await page.locator('.competition-poster').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('.competition-poster').evaluate(image =>
            Math.abs(image.clientWidth / image.clientHeight - image.naturalWidth / image.naturalHeight) < .01), true);
        await page.screenshot({ path: path.join(output, 'poster-vampire-390.png') });
        for (const theme of ['journal', 'vampire']) {
            await page.evaluate(theme => RPThemePacks.set(theme), theme);
            await visit.scrollIntoViewIfNeeded();
            await page.waitForTimeout(200);
            assert.equal(await visit.isVisible(), true);
            await page.screenshot({ path: path.join(output, `source-entry-${theme}-390.png`) });
        }
        await page.evaluate(() => __qa.openAnnouncement());
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(output, 'announcement-vampire-390.png') });
        await page.evaluate(() => __qa.closeAnnouncement());
        await page.locator('.competition-detail').evaluate(el => {
            el.style.fontSize = '28px';
            el.scrollTop = el.scrollHeight;
        });
        assert.equal(await page.locator('.competition-detail').evaluate(el =>
            el.scrollWidth > el.clientWidth || el.scrollTop + el.clientHeight < el.scrollHeight - 1), false);
        await page.reload(); await ready();
        assert.equal(await page.locator('.release-overlay').count(), 0, 'Events do not repeat the release popup');
        assert.deepEqual(errors, []);
        assert.deepEqual(missing, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
            distinctRules: true, exactDeadlineBoundaries: true, submissionDraft: true,
            nativeAndEmbeddedTopicLinks: true, parentNavigation: true, manualCarouselWithArrowsDotsAndKeyboard: true, repeatedKeyboardFocus: true,
            customBannersWithReadableText: true, artworkExcludedFromGallery: true,
            viewports: [360, 390, 1280, 844], themes: ['journal', 'vampire'], errors, missing,
            actualAndroidTested: false
        }, null, 2));
        console.log('Competition entries, rules, deadlines, submission, return navigation and both themes passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
