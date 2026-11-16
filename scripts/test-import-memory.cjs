const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const web = path.resolve(__dirname, '../web');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(require('./mock-files.cjs'), { persistFiles: false });
        await context.addInitScript(() => {
            window.__blobs = new Map();
            const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
            URL.createObjectURL = function (blob) {
                const url = create.call(this, blob);
                __blobs.set(url, { ref: new WeakRef(blob), bytes: blob.size, active: true,
                    list: new Error().stack.includes('listAvatarUrl') });
                return url;
            };
            URL.revokeObjectURL = function (url) {
                if (__blobs.has(url)) __blobs.get(url).active = false;
                return revoke.call(this, url);
            };
        });
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            if (url.pathname === '/hook-test') return route.fulfill({ body: '<!doctype html><body></body>', contentType: 'text/html' });
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            return file.startsWith(web + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
                ? route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
                    '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' }) : route.abort();
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') console.error('PAGE:', message.text().slice(0, 500)); });
        const cdp = await context.newCDPSession(page);
        const collect = async () => {
            await cdp.send('HeapProfiler.collectGarbage');
            return cdp.send('Runtime.getHeapUsage');
        };
        // Revoking immediately after a click must release the cache without breaking an in-flight download.
        await page.goto('https://sta1n156.github.io/hook-test');
        await page.addScriptTag({ path: path.join(web, 'assets/native/download-hook.js') });
        await page.evaluate(() => {
            window.__saved = [];
            window.AndroidBridge = { saveFile: (bytes, name) => __saved.push({ bytes: atob(bytes), name }) };
            for (const attached of [false, true]) {
                const blob = new Blob(['download fixture'], { type: 'text/plain' });
                const url = URL.createObjectURL(blob), anchor = document.createElement('a');
                anchor.href = url; anchor.download = attached ? 'attached.txt' : 'detached.txt';
                if (attached) document.body.append(anchor);
                anchor.click();
                URL.revokeObjectURL(url); anchor.remove();
            }
            for (let i = 0; i < 6; i++) {
                const url = URL.createObjectURL(new Blob([new Uint8Array(1048576)]));
                URL.revokeObjectURL(url);
            }
        });
        await page.waitForFunction(() => __saved.length === 2);
        assert.deepEqual(await page.evaluate(() => __saved), [
            { bytes: 'download fixture', name: 'detached.txt' },
            { bytes: 'download fixture', name: 'attached.txt' }
        ]);
        await collect();
        const retainedRevoked = await page.evaluate(() => [...__blobs.values()]
            .filter(item => !item.active && item.ref.deref()).reduce((sum, item) => sum + item.bytes, 0));

        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false; __qa.closeAnnouncement();
            __qa.characterGridView = true;
            window.__importFixture = async round => {
                const canvas = document.createElement('canvas');
                canvas.width = 256; canvas.height = 384;
                const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 384);
                let seed = 12345 + round;
                for (let i = 0; i < pixels.data.length; i += 4) {
                    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                    pixels.data[i] = seed >>> 24; pixels.data[i + 1] = seed >>> 16;
                    pixels.data[i + 2] = seed >>> 8; pixels.data[i + 3] = 255;
                }
                ctx.putImageData(pixels, 0, 0);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                canvas.width = canvas.height = 0;
                const card = { name: 'Memory fixture', first_mes: '', description: 'import memory fixture',
                    character_book: { entries: [{ keys: ['fixture'], content: 'worldbook fixture '.repeat(16384),
                        enabled: false, extensions: { retained: true } }] } };
                const png = RPHubCardUtils.injectPngTextChunk(await blob.arrayBuffer(), 'chara',
                    RPHubCardUtils.encodeBase64Utf8(JSON.stringify(card)));
                __qa.importCharacter({ target: { files: [new File([png], 'fixture.png', { type: 'image/png' })], value: '' } });
            };
        });
        const cycles = [];
        const rounds = Number(process.env.RPHUB_IMPORT_CYCLES) || 6;
        for (let round = 0; round < rounds; round++) {
            console.log('Import cycle', round + 1);
            await page.evaluate(round => __importFixture(round), round);
            await page.waitForFunction(() => __qa.currentCharacter?.name === 'Memory fixture' && __qa.showAutoImageGenModal)
                .catch(async error => { console.error(await page.evaluate(() => ({
                    cards: __qa.characters.map(card => card.name), current: __qa.currentCharacter?.name,
                    toasts: __qa.toasts
                }))); throw error; });
            await page.waitForFunction(async () => (await RPHubStorage.readCharacterDirectory()).length === 1);
            // Let the existing one-second autosave finish before measuring or deleting the card.
            await page.waitForTimeout(1300);
            await page.evaluate(async () => {
                __qa.showAutoImageGenModal = false;
                __qa.navigateWorkspace('characters');
                await Vue.nextTick();
            });
            await page.waitForFunction(() => __qa.displayedCharacters.length === 1 && __qa.displayedCharacters[0].avatar.startsWith('blob:'));
            const url = await page.evaluate(() => __qa.displayedCharacters[0].avatar);
            assert.equal(await page.evaluate(url => fetch(url).then(response => response.ok), url), true);
            if (round === 0) {
                await page.evaluate(() => { __qa.characterSearchQuery = 'no matching character'; });
                await page.waitForFunction(() => __qa.displayedCharacters.length === 0);
                assert.equal(await page.evaluate(() => [...__blobs.values()].filter(item => item.list && item.active).length), 0);
                await page.evaluate(() => { __qa.characterSearchQuery = ''; });
                await page.waitForFunction(() => __qa.displayedCharacters.length === 1);
                const dimensions = await page.evaluate(() => new Promise((resolve, reject) => {
                    const image = new Image();
                    image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
                    image.onerror = reject;
                    image.src = __qa.displayedCharacters[0].avatar;
                }));
                assert.deepEqual(dimensions, [256, 384], 'Returning from a search must recreate a readable avatar');
            }
            await page.evaluate(() => { __qa.deleteCharacter(0); __qa.handleConfirm(); });
            await page.waitForFunction(async () => __qa.characters.length === 0 && (await RPHubStorage.readCharacterDirectory()).length === 0);
            await page.waitForFunction(() => __qa.toasts.some(toast => toast.message === '角色已删除'));
            await page.waitForTimeout(1300);
            const heap = await collect();
            const resources = await page.evaluate(() => ({
                listUrls: [...__blobs.values()].filter(item => item.list && item.active).length,
                retainedRevokedBytes: [...__blobs.values()].filter(item => !item.active && item.ref.deref())
                    .reduce((sum, item) => sum + item.bytes, 0)
            }));
            cycles.push({ round: round + 1, ...resources, heapBytes: heap.usedSize, backingBytes: heap.backingStorageSize });
        }
        console.log(JSON.stringify({ retainedRevoked, cycles }, null, 2));
        assert.equal(retainedRevoked, 0, 'Download hook must release revoked Blobs after downloads finish');
        assert.ok(cycles.every(cycle => cycle.listUrls === 0), 'Deleting imported cards must release their list avatar URLs');
        assert.ok(cycles.every(cycle => cycle.retainedRevokedBytes === 0), 'Repeated import/delete must not retain revoked Blobs');
        assert.deepEqual(errors, []);
        console.log('PASS repeated PNG import/delete and search release avatar URLs; revoked Blobs are collected and attached/detached downloads remain intact');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
