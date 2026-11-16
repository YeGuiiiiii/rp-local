const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(require('./mock-files.cjs'), { persistFiles: false });
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            return file.startsWith(web + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
                ? route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'application/javascript',
                    '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' }) : route.abort();
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false; __qa.closeAnnouncement();
            window.__imageSize = source => new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
                image.onerror = reject; image.src = source;
            });
            window.__makeCover = async (width, height) => {
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').fillRect(0, 0, width, height);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                canvas.width = canvas.height = 0;
                return new File([blob], 'cover.png', { type: 'image/png' });
            };
        });
        const dimensions = await page.evaluate(async () => {
            const image = await __makeCover(240, 12000);
            const source = await new Promise(resolve => {
                const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(image);
            });
            return __imageSize(await RPHubUtils.compressImage(source, 1600, 0.92));
        });
        assert.deepEqual(dimensions, [32, 1600], 'A tall cover must be limited by its longest edge');
        const invalid = await page.evaluate(async () => {
            try {
                await RPHubUtils.compressImage(new Blob(['invalid image'], { type: 'image/png' }), 1600);
                return false;
            } catch (_) { return true; }
        });
        assert.equal(invalid, true, 'Decode failure must not return the original broken image as success');
        const canvasFailure = await page.evaluate(async () => {
            const image = await __makeCover(40, 60), encode = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = () => { throw new Error('fixture canvas failure'); };
            try {
                await RPHubUtils.compressImage(image, 1600);
                return false;
            } catch (_) { return true; }
            finally { HTMLCanvasElement.prototype.toDataURL = encode; }
        });
        assert.equal(canvasFailure, true, 'Canvas failure must settle the request rather than hang');
        await page.evaluate(async () => {
            const card = (uuid, name) => ({ uuid, name, first_mes: '', description: '', avatar: RPHubUtils.defaultAvatar,
                worldInfo: [], regexScripts: [], uiTemplates: [], customExtension: { retained: 'keep this' } });
            __qa.characters = [card('cover-heavy', '大世界书测试'), card('cover-next', '另一张卡')];
            __qa.characters[0].worldInfo = Array.from({ length: 600 }, (_, i) => ({
                id: 'entry-' + i, comment: '设定' + i, content: '保留世界书内容'.repeat(512), scope: 'character', enabled: false
            }));
            await RPHubStorage.saveCharacterLibrary(__qa.characters);
            await __qa.selectCharacter(0);
            __qa.navigateWorkspace('characters');
            window.__worldBeforeCover = JSON.stringify(__qa.characters[0].worldInfo);
            const stringify = JSON.stringify;
            window.__cardSerializations = 0;
            JSON.stringify = function (value, ...args) {
                if (value?.uuid === 'cover-heavy') __cardSerializations++;
                return stringify.call(this, value, ...args);
            };
            try { await __qa.editCharacter(0); }
            finally { JSON.stringify = stringify; }
            const read = FileReader.prototype.readAsDataURL;
            window.__base64Reads = 0;
            FileReader.prototype.readAsDataURL = function (...args) { __base64Reads++; return read.apply(this, args); };
            window.__coverFile = await __makeCover(240, 12000);
        });
        assert.equal(await page.evaluate(() => __cardSerializations), 0,
            'Opening a large card must not allocate a JSON string copy of the entire card');
        const pending = await page.evaluate(() => {
            const transfer = new DataTransfer(); transfer.items.add(__coverFile);
            const input = document.querySelector('.app-modal-overlay input[type=file][accept="image/*"]');
            if (!input) throw new Error('Cover picker is missing');
            input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
            __qa.saveCharacter();
            return __qa.characterAvatarLoading;
        });
        assert.equal(pending, true);
        assert.equal(await page.evaluate(() => __qa.showCharacterEditor), true,
            'Saving while a cover is pending must not close the editor with the old image');
        await page.waitForFunction(() => !__qa.characterAvatarLoading);
        assert.equal(await page.evaluate(() => __base64Reads), 0, 'Cover selection must not base64-encode the source file');
        assert.deepEqual(await page.evaluate(() => __imageSize(__qa.editingCharacter.data.avatar)), [32, 1600]);
        assert.equal(await page.evaluate(() => JSON.stringify(__qa.editingCharacter.data.worldInfo) === __worldBeforeCover), true);
        const validCover = await page.evaluate(() => __qa.editingCharacter.data.avatar);
        await page.evaluate(() => __qa.handleAvatarUpload({ target: {
            files: [new File(['broken'], 'bad.png', { type: 'image/png' })], value: 'selected'
        } }));
        assert.equal(await page.evaluate(() => __qa.editingCharacter.data.avatar), validCover);
        assert.equal(await page.evaluate(() => __qa.characterAvatarLoading), false);
        await page.evaluate(() => __qa.saveCharacter());
        const saved = await page.evaluate(async () => {
            const card = await RPHubStorage.readCharacter(__qa.characters[0]);
            return { worldUnchanged: JSON.stringify(card.worldInfo) === __worldBeforeCover,
                extension: card.customExtension.retained, size: await __imageSize(card.avatar) };
        });
        assert.deepEqual(saved, { worldUnchanged: true, extension: 'keep this', size: [32, 1600] });
        // Delay only the browser decode so that a previous editor's upload finishes after another card opens.
        await page.evaluate(async () => {
            await __qa.editCharacter(0);
            const NativeImage = window.Image, src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
            window.__heldCoverLoads = []; window.__coverDecoded = 0;
            window.Image = function (...args) {
                const image = new NativeImage(...args);
                image.addEventListener('load', () => __coverDecoded++);
                Object.defineProperty(image, 'src', {
                    get: () => src.get.call(image),
                    set: value => value ? __heldCoverLoads.push(() => src.set.call(image, value)) : src.set.call(image, value)
                });
                return image;
            };
            window.__restoreImage = () => { window.Image = NativeImage; };
            window.__pendingCover = __qa.handleAvatarUpload({ target: { files: [__coverFile], value: 'selected' } });
        });
        await page.waitForFunction(() => __heldCoverLoads.length > 0);
        assert.equal(await page.getByRole('button', { name: '保存角色', exact: true }).isDisabled(), true);
        if (process.argv.includes('--review')) {
            const review = path.join(process.env.TEMP, 'cover-upload-review');
            fs.mkdirSync(review, { recursive: true });
            await page.evaluate(() => { __qa.toasts = []; });
            for (const width of [390, 1280]) {
                await page.setViewportSize({ width, height: 900 });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                await page.screenshot({ path: path.join(review, `pending-${width}.png`) });
            }
        }
        await page.evaluate(async () => {
            __qa.closeCharacterEditor(); await Vue.nextTick(); await __qa.editCharacter(1);
            __restoreImage();
            __heldCoverLoads.splice(0).forEach(start => start());
            await __pendingCover;
        });
        await page.waitForFunction(() => __coverDecoded > 0);
        assert.equal(await page.evaluate(() => __qa.editingCharacter.data.uuid), 'cover-next');
        assert.equal(await page.evaluate(() => __qa.editingCharacter.data.avatar), await page.evaluate(() => RPHubUtils.defaultAvatar),
            'A late upload must never overwrite another editor');
        assert.equal(await page.evaluate(() => __qa.characterAvatarLoading), false);
        assert.deepEqual(errors, []);
        console.log('PASS tall cover sizing, decode/canvas failures, 600-entry worldbook, no base64/JSON copies, save preservation and late upload isolation');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
