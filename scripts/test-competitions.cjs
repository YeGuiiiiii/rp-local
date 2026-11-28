const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const bridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.join(root, 'verification/competitions-160');
fs.mkdirSync(output, { recursive: true });
const hall = 'https://wxdt.duckdns.org/designs/before-redesign/#forum/board/9o5VqeN0SqzFEE7y';

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
    const select = async name => {
        const surface = await page.locator('.release-overlay').count() ? page.locator('.release-overlay') : page.locator('.shell-advanced');
        const entry = surface.getByRole('button', { name, exact: true });
        if (!await entry.isVisible() && await surface.locator('.competition-carousel').count())
            await surface.getByRole('button', { name: '查看' + name, exact: true }).click();
        await entry.click();
    };
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false; __qa.closeAnnouncement();
            __qa.navigateWorkspace('advanced');
        });
        assert.equal(await page.locator('.competition-entry').count(), 2);
        await page.getByRole('button', { name: '查看提丰杯', exact: true }).click();
        const arrow = page.getByRole('button', { name: '上一场赛事', exact: true });
        await arrow.hover();
        const resting = await arrow.boundingBox();
        await page.mouse.down(); await page.waitForTimeout(140);
        assert.ok(Math.abs((await arrow.boundingBox()).y - resting.y) <= 2, 'Pressed arrow stays centered');
        await page.mouse.up();
        assert.equal(await page.getByRole('button', { name: '雷霆杯', exact: true }).isVisible(), true);
        await page.getByRole('button', { name: '下一场赛事', exact: true }).click();
        await page.getByRole('button', { name: '提丰杯', exact: true }).focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '雷霆杯');
        await page.keyboard.press('ArrowLeft');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '提丰杯');
        await select('提丰杯');
        const detail = page.locator('.competition-detail');
        assert.match(await detail.innerText(), /心动纯爱.*万象沙盒.*脑洞大开/s);
        assert.match(await detail.innerText(), /2027年1月31日 23:59/);
        assert.match(await detail.innerText(), /每人.*一个赛区.*一件作品/);
        await page.getByText('作品提交格式', { exact: true }).click();
        const mail = decodeURIComponent(await page.getByRole('link', { name: '打开投稿邮件草稿' }).getAttribute('href'));
        assert.match(mail, /^mailto:819167238@qq\.com\?/);
        assert.match(mail, /【提丰杯】\+赛区\+作品名/);
        assert.doesNotMatch(await detail.innerText(), /科技杯|2459751615/);
        await page.getByRole('button', { name: '返回', exact: true }).click();
        await select('雷霆杯');
        assert.match(await detail.innerText(), /#⚡⚡⚡/);
        assert.match(await detail.innerText(), /2027年2月2日 24:00/);
        assert.match(await detail.innerText(), /387/);
        assert.match(await detail.innerText(), /同一作品.*提丰杯/);
        assert.match(await detail.innerText(), /仅.*提及.*客串/);
        assert.equal(await page.getByRole('link', { name: '打开投稿邮件草稿' }).count(), 0);
        assert.deepEqual(await page.evaluate(() => {
            const event = RPCompetitions.events.find(e => e.id === 'thunder');
            return ['2026-11-29T07:59:59+08:00', '2026-11-29T08:00:00+08:00',
                '2027-02-02T23:59:59+08:00', '2027-02-03T00:00:00+08:00']
                .map(date => RPCompetitions.phase(event, Date.parse(date)));
        }), ['尚未开始', '投稿中', '投稿中', '投稿已截止']);
        const visit = page.getByRole('button', { name: '前往灯塔活动专区', exact: true });
        await visit.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('.competition-poster')?.naturalWidth > 0);
        const poster = await page.locator('.competition-poster').boundingBox();
        assert.ok((await visit.boundingBox()).y >= poster.y + poster.height);
        assert.equal(await page.locator('.competition-poster').evaluate(image => RPImagePolicy.isContentImage(image)), false);
        await page.evaluate(() => {
            window.__lighthouseCalls = [];
            window.AndroidBridge = { openLighthouse: url => __lighthouseCalls.push(url) };
        });
        await visit.click();
        assert.deepEqual(await page.evaluate(() => __lighthouseCalls), [hall]);
        assert.equal(await page.evaluate(() => __qa.currentView), 'competition');
        await page.evaluate(() => { delete window.AndroidBridge; });
        await visit.click();
        assert.equal(await page.evaluate(() => __qa.lighthouseUrl), hall);
        await page.evaluate(() => __qa.shellGoBack());
        await page.evaluate(() => __qa.shellGoBack());
        assert.equal(await page.getByRole('button', { name: '雷霆杯', exact: true }).isVisible(), true);
        await page.evaluate(() => __qa.openAnnouncement());
        assert.match(await page.locator('.release-reading').innerText(), /红花铃.*主要贡献者/s);
        await page.locator('.release-overlay').getByRole('button', { name: '提丰杯', exact: true }).scrollIntoViewIfNeeded();
        const scroll = await page.locator('.release-reading').evaluate(el => el.scrollTop);
        await select('提丰杯');
        await page.evaluate(() => __qa.shellGoBack());
        await page.locator('.release-notice').waitFor();
        assert.equal(await page.locator('.release-reading').evaluate(el => el.scrollTop), scroll);
        await page.getByRole('button', { name: '关闭更新公告', exact: true }).click();
        await page.locator('.release-overlay').waitFor({ state: 'detached' });
        for (const theme of ['journal', 'vampire', 'classic']) {
            await page.evaluate(theme => { RPThemePacks.set(theme); __qa.openAnnouncement(); }, theme);
            await select('雷霆杯');
            await page.getByRole('button', { name: '返回', exact: true }).click();
            await page.locator('.release-notice').waitFor();
            await page.evaluate(() => __qa.closeAnnouncement());
            await page.locator('.release-overlay').waitFor({ state: 'detached' });
        }
        for (const theme of ['journal', 'vampire']) {
            await page.evaluate(theme => RPThemePacks.set(theme), theme);
            for (const [width, height] of [[360, 800], [390, 844], [1280, 900], [844, 390]]) {
                await page.setViewportSize({ width, height });
                for (const name of ['提丰杯', '雷霆杯']) {
                    await page.evaluate(() => __qa.navigateWorkspace('advanced'));
                    await page.getByRole('button', { name: '查看' + name, exact: true }).click();
                    const banner = page.getByRole('button', { name, exact: true });
                    await banner.scrollIntoViewIfNeeded();
                    await page.waitForFunction(() => [...document.querySelectorAll('.competition-entry img')]
                        .filter(img => img.getClientRects().length).every(img => img.complete && img.naturalWidth > 0));
                    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                    assert.equal(await banner.locator('img').evaluate(img => RPImagePolicy.isContentImage(img)), false);
                    await page.screenshot({ path: path.join(output, `banner-${theme}-${width}-${name}.png`) });
                    await select(name);
                    assert.equal(await detail.evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
                    await page.screenshot({ path: path.join(output, `detail-${theme}-${width}-${name}.png`) });
                }
            }
        }
        await detail.evaluate(el => { el.style.fontSize = '28px'; el.scrollTop = el.scrollHeight; });
        assert.equal(await detail.evaluate(el => el.scrollWidth > el.clientWidth + 1 || el.scrollTop + el.clientHeight < el.scrollHeight - 1), false);
        assert.deepEqual(errors, []); assert.deepEqual(missing, []);
        console.log('PASS current events, deadlines, mail, native/web links, return scroll, three skins and four viewport sizes');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
