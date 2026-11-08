const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const output = path.join(root, '.impeccable/review/card-colors');
fs.mkdirSync(output, { recursive: true });
const backupPath = process.argv[2];
const dinerTemplate = backupPath && JSON.parse(fs.readFileSync(backupPath, 'utf8')).entries
    .find(entry => entry.key === 'rp_hub_characters').value
    .find(card => card.name.includes('地牢')).uiTemplates[0];

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(installFiles);
    await context.addInitScript(() => {
        window.__windowThemes = [];
        window.RPHubNativeTheme = { setBackground: night => __windowThemes.push(night) };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://sta1n156.github.io')
            return dinerTemplate && route.request().resourceType() === 'image' ? route.continue() : route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({
            '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp'
        })[path.extname(file)] || 'application/octet-stream' });
    });
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async () => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.characters = [{ uuid: 'card-colors', name: '纸页阅读测试', first_mes: '',
                worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await __qa.selectCharacter(0);
            RPCardNight.setMode('original');
            const host = document.createElement('div');
            host.id = 'card-color-fixture';
            host.className = 'msg-bubble-glass';
            host.style.cssText = 'position:fixed;inset:100px 0 auto;z-index:100;width:390px';
            host.innerHTML = '<div class="markdown-body"><section style="background:#f1e7cf;color:#2e2620">卡片自定配色</section></div><div class="ui-template-render"></div>';
            const frame = RPHubUiTemplateUtils.createExecutableHtmlIframe(`<!doctype html><html><head><style>
                body{margin:0;padding:20px;background:#33281e;color:#2e2620;font:18px/1.7 sans-serif}
                .paper{padding:24px;background:#f1e7cf}button{color:inherit}
                </style></head><body><div class="paper"><h2>行动建议</h2>
                <p id="ink">手掌摊开给我看看。</p><button>出发</button></div></body></html>`, '');
            host.querySelector('.ui-template-render').append(frame);
            document.body.append(host);
        });
        const colors = () => page.locator('#card-color-fixture iframe').evaluate(frame => {
            const doc = frame.contentDocument, ink = doc.querySelector('#ink'), paper = doc.querySelector('.paper');
            const style = getComputedStyle;
            return { ink: style(ink).color, paper: style(paper).backgroundColor };
        });
        await page.frameLocator('#card-color-fixture iframe').locator('#ink').waitFor();
        for (const skin of ['classic', 'chenyue', 'winter']) {
            await page.evaluate(skin => { RPThemePacks.set(skin); RPThemePacks.setMode('day'); }, skin);
            const day = await colors();
            assert.deepEqual(day, { ink: 'rgb(46, 38, 32)', paper: 'rgb(241, 231, 207)' });
            assert.equal(await page.evaluate(() => __windowThemes.at(-1)), false);
            await page.evaluate(() => RPThemePacks.setMode('night'));
            assert.equal(await page.evaluate(() => __windowThemes.at(-1)), true);
            assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'dark',
                'The native bridge must preserve the app night scheme instead of enabling automatic recoloring');
            assert.deepEqual(await colors(), day, `${skin}: card-authored colors must survive night mode`);
            const filters = await page.locator('#card-color-fixture .markdown-body > section,#card-color-fixture .ui-template-render')
                .evaluateAll(nodes => nodes.map(node => getComputedStyle(node).filter));
            assert.deepEqual(filters, ['none', 'none'], `${skin}: software must not tint card HTML or templates`);
        }
        assert.deepEqual(errors, []);
        await page.locator('#card-color-fixture').screenshot({ path: path.join(output, 'night-paper.png') });
        if (dinerTemplate) {
            await page.evaluate(template => {
                document.querySelector('#card-color-fixture').innerHTML =
                    RPHubUiTemplateUtils.renderUiTemplateHtml(template);
            }, { htmlTemplate: dinerTemplate.htmlTemplate, variableState: dinerTemplate.initialVariableState });
            const frame = page.frameLocator('#card-color-fixture iframe');
            await frame.locator('.sugg-head .txt').first().waitFor();
            const notice = frame.getByRole('button', { name: '知道了', exact: true });
            if (await notice.isVisible()) await notice.click();
            for (const skin of ['classic', 'chenyue', 'winter']) {
                const samples = [];
                for (const mode of ['day', 'night']) {
                    await page.evaluate(({ skin, mode }) => { RPThemePacks.set(skin); RPThemePacks.setMode(mode); }, { skin, mode });
                    samples.push(await frame.locator('.sugg:not(.on) .txt').first().evaluate(node => ({
                        text: getComputedStyle(node).color,
                        paper: getComputedStyle(node.closest('.duty-book')).borderImageSource
                    })));
                }
                assert.deepEqual(samples[1], samples[0], `${skin}: actual diner suggestion colors must stay unchanged`);
                assert.equal(samples[1].text, 'rgb(46, 38, 32)');
                await frame.locator('.duty-book').screenshot({ path: path.join(output, `diner-${skin}-night.png`) });
            }
            console.log('Actual diner template retains dark ink and its original paper in all three night skins.');
        }
        assert.deepEqual(errors, []);
        console.log('All three skins preserve authored card colors, paper and app night scheme.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
