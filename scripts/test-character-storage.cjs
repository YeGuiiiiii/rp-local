const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const web = path.resolve(__dirname, '../web');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    await context.addInitScript(installFiles);
    await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
    const page = await context.newPage();
    const load = async () => {
        await page.goto('https://sta1n156.github.io/RP-Hub/test');
        for (const file of ['assets/vendor/vue.global.prod.js', 'assets/js/local-files.js', 'assets/js/stream-import.js',
            'assets/js/built-in-content.js', 'assets/js/core-utils.js']) {
            await page.addScriptTag({ path: path.join(web, file) });
        }
        await page.addScriptTag({ content: fs.readFileSync(path.join(web, 'assets/js/data-services.js'), 'utf8')
            .split('// --- Shared summary memory utilities ---')[0] });
        await page.addScriptTag({ path: path.join(web, 'assets/js/ui-components.js') });
    };
    try {
        await load();
        const result = await page.evaluate(async () => {
            const s = RPHubStorage;
            await s.initDB();
            const db = s.getMainDb();
            const rawPut = async (value, key) => {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction('store', 'readwrite');
                    tx.objectStore('store').put(value, key);
                    tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
                });
            };
            const rawGet = key => new Promise((resolve, reject) => {
                const request = db.transaction('store').objectStore('store').get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            const canvas = document.createElement('canvas');
            canvas.width = 1200; canvas.height = 1800;
            const context = canvas.getContext('2d');
            context.fillStyle = '#202020';
            context.fillRect(0, 0, 1200, 1800);
            context.fillStyle = '#f0b0c0';
            context.fillRect(200, 250, 800, 1300);
            const png = new Uint8Array(await (await fetch(canvas.toDataURL())).arrayBuffer());
            const cover = RPHubCardUtils.injectPngTextChunk(png, 'chara', 'X'.repeat(300000));
            const avatar = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(new Blob([cover], { type: 'image/png' }));
            });
            const original = [{ uuid: 'atomic-a', name: '完整原卡', avatar,
                worldInfo: [{ comment: '设定', content: '保留内容' }],
                uiTemplates: [{ htmlTemplate: '<div>保留模板</div>' }],
                regexScripts: [], unknown: { nested: ['未识别扩展也保留'] } }];
            await rawPut(original, 'rp_hub_characters');
            const put = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (value, key) {
                const req = put.call(this, value, key);
                if (key === '__rp_card__:atomic-a') this.transaction.abort();
                return req;
            };
            let aborted = false;
            try { await s.readCharacterDirectory(); } catch (_) { aborted = true; }
            finally { IDBObjectStore.prototype.put = put; }
            const afterAbort = await rawGet('rp_hub_characters');
            const partial = await rawGet('__rp_card__:atomic-a');
            let directory = await s.readCharacterDirectory();
            const complete = await s.readCharacter(directory[0]);
            const previewUrl = s.characterPreviewUrl(complete);
            const previewBitmap = await createImageBitmap(await fetch(previewUrl).then(response => response.blob()));
            const oldPreview = await new Promise(resolve => {
                const image = new Image();
                image.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = 256 / Math.max(image.naturalWidth, image.naturalHeight);
                    canvas.width = Math.round(image.naturalWidth * scale);
                    canvas.height = Math.round(image.naturalHeight * scale);
                    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/webp', 0.86));
                };
                image.src = avatar;
            });
            const staleDirectory = await rawGet('rp_hub_characters');
            staleDirectory.cards[0].avatar = oldPreview;
            delete staleDirectory.cards[0].previewEdge;
            await rawPut(staleDirectory, 'rp_hub_characters');
            const coverHost = document.createElement('div');
            document.body.append(coverHost);
            const refreshedPreview = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Visible legacy cover did not upgrade')), 5000);
                Vue.createApp({
                    components: { CharacterCover: RPHubComponents.CharacterCover },
                    setup: () => ({ src: oldPreview }),
                    methods: { loaded(event) {
                        if (Math.max(event.target.naturalWidth, event.target.naturalHeight) < 1024) return;
                        clearTimeout(timeout);
                        resolve(event.target.src);
                    } },
                    template: '<character-cover :src="src" uuid="atomic-a" @load="loaded" />'
                }).mount(coverHost);
            });
            const refreshedBitmap = await createImageBitmap(await fetch(refreshedPreview).then(response => response.blob()));
            directory = await s.readCharacterDirectory();
            const writes = [];
            IDBObjectStore.prototype.put = function (value, key) {
                if (String(key).startsWith('__rp_card__:')) writes.push(key);
                return put.call(this, value, key);
            };
            try {
                directory[0].favoriteAt = 123;
                await s.saveCharacterLibrary(directory);
            } finally { IDBObjectStore.prototype.put = put; }
            const favorite = await s.readCharacter(directory[0]);
            const imageWrites = [];
            let bodyChars = 0;
            IDBObjectStore.prototype.put = function (value, key) {
                if (String(key).startsWith('__rp_card_image__:')) imageWrites.push(key);
                if (key === '__rp_card__:atomic-a') bodyChars = JSON.stringify(value).length;
                return put.call(this, value, key);
            };
            try {
                favorite.unknown.updated = true;
                await s.saveCharacterLibrary([favorite]);
            } finally { IDBObjectStore.prototype.put = put; }
            const entries = [];
            await s.eachStoredEntry(db, entry => entries.push(entry));
            const exported = entries.find(entry => entry.key === 'rp_hub_characters').value;
            // An old-format restore may replace only store's public characters key.
            await rawPut([{ uuid: 'restored-b', name: '恢复后的卡', worldInfo: [], uiTemplates: [] }], 'rp_hub_characters');
            await s.readCharacterDirectory();
            const staleBodyRemoved = await rawGet('__rp_card__:atomic-a') === undefined;
            const staleImageRemoved = await rawGet('__rp_card_image__:atomic-a') === undefined;
            await s.setStoredValue('characters', [{ uuid: 'recovery-cover', name: '封面恢复测试',
                avatar, worldInfo: [{ content: '恢复后的内容' }], uiTemplates: [] }]);
            await RPLocalStore.flush();
            db.close();
            await new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase('RPHubDB');
                request.onsuccess = resolve; request.onerror = () => reject(request.error);
            });
            return {
                aborted, originalRetained: JSON.stringify(afterAbort) === JSON.stringify(original),
                partialAbsent: partial === undefined,
                thumbnailChars: directory[0].avatar.length, originalChars: avatar.length,
                previewWidth: previewBitmap.width, previewHeight: previewBitmap.height,
                refreshedPreviewWidth: refreshedBitmap.width, refreshedPreviewHeight: refreshedBitmap.height,
                originalCoverRetained: complete.avatar === avatar,
                fullWorld: complete.worldInfo[0].content, fullUI: complete.uiTemplates[0].htmlTemplate,
                unknown: complete.unknown.nested[0], favorite: favorite.favoriteAt, favoriteBodyWrites: writes,
                unchangedImageWrites: imageWrites, mutableBodyChars: bodyChars,
                exportFullCover: exported[0].avatar === avatar,
                exportUnknown: exported[0].unknown.nested[0],
                internalKeysExported: entries.some(entry => entry.key.startsWith('__rp_card')),
                staleBodyRemoved, staleImageRemoved
            };
        });
        assert.equal(result.aborted, true);
        assert.equal(result.originalRetained, true, 'An aborted migration must keep the entire old collection');
        assert.equal(result.partialAbsent, true, 'An aborted migration must not leave partial card records');
        assert.ok(result.thumbnailChars < result.originalChars / 10, 'Directory images must not carry embedded card JSON');
        assert.ok(Math.max(result.previewWidth, result.previewHeight) >= 1024,
            'Directory cover previews must retain enough pixels for mobile cards and album covers');
        assert.ok(Math.max(result.refreshedPreviewWidth, result.refreshedPreviewHeight) >= 1024,
            'A visible legacy card cover must refresh its old low-resolution directory preview');
        assert.equal(result.originalCoverRetained, true);
        assert.equal(result.fullWorld, '保留内容');
        assert.equal(result.fullUI, '<div>保留模板</div>');
        assert.equal(result.unknown, '未识别扩展也保留');
        assert.equal(result.favorite, 123);
        assert.deepEqual(result.favoriteBodyWrites, [], 'Favorites must update the directory without rewriting card bodies');
        assert.deepEqual(result.unchangedImageWrites, [], 'Saving a changed card must not rewrite an unchanged cover');
        assert.ok(result.mutableBodyChars < result.originalChars / 10);
        assert.equal(result.exportFullCover, true);
        assert.equal(result.exportUnknown, '未识别扩展也保留');
        assert.equal(result.internalKeysExported, false);
        assert.equal(result.staleBodyRemoved, true, 'A restored old-format collection must remove abandoned split records');
        assert.equal(result.staleImageRemoved, true);
        await load();
        const recovered = await page.evaluate(async () => {
            await RPHubStorage.initDB();
            const cards = await RPHubStorage.getStoredValue('characters');
            return { uuid: cards[0].uuid, avatarChars: cards[0].avatar.length, world: cards[0].worldInfo[0].content };
        });
        assert.deepEqual(recovered, { uuid: 'recovery-cover', avatarChars: result.originalChars, world: '恢复后的内容' });
        result.nativeCoverRecovery = true;
        console.log(JSON.stringify(result));
    } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
