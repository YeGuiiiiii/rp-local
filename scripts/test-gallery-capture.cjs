const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('./playwright.cjs');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext();
        await context.route('**/*', route => route.fulfill({
            contentType: 'text/html', body: '<!doctype html><div id="app"></div>'
        }));
        const page = await context.newPage();
        await page.goto('https://gallery.test/');
        await page.evaluate(async base64 => {
            const source = 'data:image/png;base64,' + base64;
            window.fixtureState = {
                currentCharacter: { uuid: 'gallery-fixture', name: 'Gallery fixture' },
                activeStoryBranchId: 'main',
                chatHistory: [{ content: '<img src="' + source + '">', imageAttachments: [{ dataUrl: source }] }]
            };
            document.getElementById('app').__vue_app__ = { _instance: { setupState: fixtureState } };
            for (const state of ['done', 'frozen', 'queued', 'running', 'failed']) {
                const card = document.createElement('div');
                card.className = 'generated-image-card';
                card.dataset.imageJobId = state;
                card.dataset.imageJobState = state;
                card.dataset.imageRequest = 'https://images.test/generate?tag=' + state;
                const image = new Image();
                image.src = source;
                await image.decode();
                card.append(image);
                document.body.append(card);
            }
            const broken = document.createElement('div');
            broken.className = 'generated-image-card';
            broken.dataset.imageJobState = 'done';
            broken.dataset.imageJobId = 'broken';
            broken.dataset.imageRequest = 'https://images.test/generate?tag=broken';
            const image = new Image();
            image.src = 'data:image/png;base64,AAAA';
            await image.decode().catch(() => {});
            broken.append(image);
            document.body.append(broken);
        }, fs.readFileSync(path.join(root, 'dist/app-icon.png')).toString('base64'));
        for (const file of ['js/image-policy.js', 'native/rphub-image-gallery.js'])
            await page.addScriptTag({ path: path.join(root, 'web/assets', file) });
        await page.evaluate(() => RPHubImageGallery.collect());
        await page.waitForFunction(async () => (await RPHubImageGallery.records()).some(record => record.tag === 'frozen'));
        await page.waitForTimeout(700);
        const records = await page.evaluate(async () => (await RPHubImageGallery.records())
            .map(record => ({ tag: record.tag, source: record.source, kind: record.kind, hasThumb: !!record.thumb })));
        assert.deepEqual(records.filter(record => record.source === 'remote').map(record => record.tag).sort(),
            ['done', 'frozen'], 'Only successfully completed images belong in the gallery');
        assert.ok(records.some(record => record.source === 'content'), 'Message illustrations must remain collectible');
        assert.ok(records.some(record => record.kind === 'upload'), 'Uploaded attachments must remain collectible');
        assert.ok(records.every(record => record.hasThumb), 'Broken images must not leave blank gallery records');
        console.log('PASS gallery excludes queued/running/failed/broken images and retains completed/history/content/uploads');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
