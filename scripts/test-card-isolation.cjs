const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const installFiles = require('./mock-files.cjs');
const web = path.resolve(__dirname, '../web');
const output = process.env.RPHUB_TEST_OUTPUT_DIR || path.resolve(__dirname, '../verification/card-isolation');

// Catches host styles/scripts escaping a card, stale frame commands, and card rules becoming global.
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(installFiles);
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'cdn.jsdelivr.net')
            return route.fulfill({ contentType: 'application/javascript', body: '' });
        if (url.origin !== 'https://sta1n156.github.io') return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file))
            return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file, contentType: ({
            '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp'
        })[path.extname(file)] || 'application/octet-stream' });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const failures = [];
    let checks = 0;
    const check = async (name, run) => {
        checks++;
        try { await run(); console.log('PASS ' + name); }
        catch (error) {
            failures.push(name + ': ' + error.message);
            console.error('FAIL ' + name + ': ' + error.message);
            console.error(await page.evaluate(() => ({ view: __qa.currentView, switching: __qa.switchingCharacterIndex,
                pending: __qa.pendingCardInteraction, packets: window.__isolationPackets?.slice(-4),
                frame: document.querySelector('#isolation-frame iframe')?.dataset.rpCardRuntime })));
            console.error('browser errors', errors);
            if (await page.locator('#isolation-frame iframe').count())
                console.error(await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => ({
                    ready: document.readyState, api: typeof window.RPHubCard
                })));
        }
    };
    const switchCard = index => page.evaluate(index => __qa.selectCharacter(index), index);
    const waitForStorage = (body, key, value) => body.evaluate((el, { key, value }) => new Promise((resolve, reject) => {
        const until = Date.now() + 2000;
        const poll = () => (key === null ? localStorage.length : localStorage.getItem(key)) === value ? resolve()
            : Date.now() > until ? reject(new Error('another card page still reads stale storage: ' + JSON.stringify({
                key, value, actual: key === null ? localStorage.length : localStorage.getItem(key),
                events: window.storageEvents
            }))) : setTimeout(poll, 20);
        poll();
    }), { key, value });
    const appendFrame = async (html, id = 'isolation-frame', preview = false, settle = true) => {
        await page.evaluate(({ html, id, preview }) => {
            document.getElementById(id)?.remove();
            const holder = document.createElement('div');
            holder.id = id;
            holder.style.cssText = 'position:fixed;inset:240px 8px auto;z-index:101;width:360px';
            holder.innerHTML = RPHubUiTemplateUtils.createExecutableHtmlIframe(html, '', { preview }).outerHTML;
            document.body.appendChild(holder);
        }, { html, id, preview });
        await page.waitForFunction(id => {
            const height = document.querySelector('#' + id + ' iframe')?.style.height;
            return height && height !== 'auto';
        }, id);
        if (settle) await page.locator('#' + id + ' iframe').evaluate(el =>
            Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {}))));
    };
    try {
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        page.setDefaultTimeout(15000);
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(async () => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.showAnnouncement = false;
            window.__isolationPackets = [];
            window.addEventListener('message', event => {
                if (event.data?.type === 'RPHUB_CARD') __isolationPackets.push(event.data);
            });
            __qa.characters = ['A', 'B'].map(name => ({
                uuid: 'isolation-' + name, name, description: '', first_mes: 'CARD_SENTINEL',
                avatar: RPHubUtils.defaultAvatar,
                regexScripts: [{ name: 'rule-' + name, regex: 'CARD_SENTINEL', replacement: 'ONLY_' + name,
                    enabled: true, scope: 'character', markdownOnly: true }],
                worldInfo: [], uiTemplates: []
            }));
            await __qa.selectCharacter(0);
            const probe = document.createElement('div');
            probe.id = 'outside-card';
            probe.textContent = 'Host';
            probe.style.color = 'rgb(1, 2, 3)';
            document.body.appendChild(probe);
        });
        await check('card imports keep character scope even with a built-in name', async () => {
            const scope = await page.evaluate(() => RPHubCardUtils.normalizeImportedRegexScript({
                name: 'NAI画图正则', regex: 'CARD_SENTINEL', scope: 'character'
            }, { fallbackScope: 'character', systemNames: RPHubConfig.systemRegexNames }).scope);
            assert.equal(scope, 'character');
        });
        await check('ordinary HTML styles stay inside the message frame', async () => {
            const result = await page.evaluate(() => {
                const holder = document.createElement('div');
                holder.id = 'inline-card';
                holder.innerHTML = __qa.renderMarkdown('<div><style>#outside-card{color:rgb(200, 0, 0)!important}</style><p>Card CSS</p></div>');
                document.body.appendChild(holder);
                return { color: getComputedStyle(document.getElementById('outside-card')).color,
                    frames: holder.querySelectorAll('iframe').length };
            });
            assert.equal(result.color, 'rgb(1, 2, 3)');
            assert.equal(result.frames, 1);
        });
        await check('fixed card panels remain inside an isolated page', async () => {
            const count = await page.evaluate(() => {
                const html = __qa.renderMarkdown('<div style="position:fixed;inset:0;background:red;z-index:999999">Card overlay</div>');
                return new DOMParser().parseFromString(html, 'text/html').querySelectorAll('iframe').length;
            });
            assert.equal(count, 1);
        });
        await check('host image generation remains reachable beside isolated card content', async () => {
            const result = await page.evaluate(() => {
                const html = __qa.renderMarkdown('<style>body{color:blue}</style><p>Story panel</p>'
                    + '<div class="generated-image-card" data-image-request="https://images.test/generate?tag=fixture">'
                    + '<style>#outside-card{color:red}</style><img><button class="generated-image-reroll">Regenerate</button></div>');
                const parsed = new DOMParser().parseFromString(html, 'text/html');
                return { cards: parsed.querySelectorAll('.generated-image-card[data-image-request]').length,
                    frames: parsed.querySelectorAll('iframe').length, styles: parsed.querySelectorAll('style').length };
            });
            assert.deepEqual(result, { cards: 1, frames: 1, styles: 0 });
        });
        await check('card scripts cannot read or modify the host', async () => {
            await appendFrame(`<style>body{background:rgb(240,230,200)}button{color:rgb(5,6,7)}</style>
                <button id="action" data-slash="A interaction">Action</button>
                <p id="report"></p><script>
                let blocked=false;try{parent.document.body.dataset.cardLeak='A'}catch(e){blocked=true}
                document.getElementById('report').textContent=blocked?'isolated':'leaked';
                </script>`);
            const frame = page.frameLocator('#isolation-frame iframe');
            await frame.locator('#report').waitFor();
            assert.equal(await frame.locator('#report').innerText(), 'isolated');
            assert.equal(await page.evaluate(() => document.body.dataset.cardLeak || ''), '');
            assert.equal(await frame.locator('#action').evaluate(el => getComputedStyle(el).color), 'rgb(5, 6, 7)');
        });
        await check('buttons and automatic frame sizing still work', async () => {
            await page.waitForFunction(() => parseFloat(document.querySelector('#isolation-frame iframe').style.height) > 30);
            await page.frameLocator('#isolation-frame iframe').locator('#action').click();
            await page.waitForFunction(() => __qa.pendingCardInteraction === 'A interaction');
            assert.ok(await page.locator('#isolation-frame iframe').evaluate(el => parseFloat(el.style.height) > 30));
            await page.waitForTimeout(1200);
            await page.frameLocator('#isolation-frame iframe').locator('#report').evaluate(el => { el.style.height = '600px'; });
            await page.waitForFunction(() => parseFloat(document.querySelector('#isolation-frame iframe').style.height) > 600,
                null, { timeout: 1500 });
            await page.frameLocator('#isolation-frame iframe').locator('#report').evaluate(el => { el.style.height = '20px'; });
            await page.waitForFunction(() => parseFloat(document.querySelector('#isolation-frame iframe').style.height) < 150);
        });
        await check('viewport-height panels do not grow continuously', async () => {
            await appendFrame('<section style="height:100vh">Viewport card</section>', 'isolation-frame', false, false);
            const before = await page.locator('#isolation-frame iframe').evaluate(el => parseFloat(el.style.height));
            await page.waitForTimeout(400);
            const after = await page.locator('#isolation-frame iframe').evaluate(el => parseFloat(el.style.height));
            assert.ok(Math.abs(after - before) <= 1, JSON.stringify({ before, after }));
        });
        await check('same storage key is isolated from host and other cards', async () => {
            await page.evaluate(() => localStorage.setItem('card-shared-key', 'HOST'));
            await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => localStorage.setItem('card-shared-key', 'A'));
            await page.waitForFunction(() => Object.keys(localStorage).some(key => key.startsWith('rp-card-state::')));
            await switchCard(1);
            await appendFrame('<p id="storage">Storage</p>');
            assert.equal(await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => localStorage.getItem('card-shared-key')), null);
            await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => localStorage.setItem('card-shared-key', 'B'));
            assert.equal(await page.evaluate(() => localStorage.getItem('card-shared-key')), 'HOST');
            await switchCard(0);
            await appendFrame('<p id="storage">Storage</p>');
            assert.equal(await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => localStorage.getItem('card-shared-key')), 'A');
        });
        await check('regex rules stay with each card through repeated switches', async () => {
            await page.evaluate(() => {
                __qa.regexScripts.push({ name: 'player-global', regex: 'SHARED_SENTINEL', replacement: 'GLOBAL_OK',
                    scope: 'global', enabled: true, markdownOnly: true });
            });
            for (const index of [1, 0, 1, 0]) {
                await switchCard(index);
                const html = await page.evaluate(() => __qa.renderMarkdown('CARD_SENTINEL SHARED_SENTINEL'));
                assert.ok(html.includes(index ? 'ONLY_B' : 'ONLY_A'), html);
                assert.ok(!html.includes(index ? 'ONLY_A' : 'ONLY_B'), html);
                assert.ok(html.includes('GLOBAL_OK'), html);
            }
        });
        await check('a character rule sharing the built-in name cannot change global image generation', async () => {
            await page.evaluate(() => {
                __qa.regexScripts.push({ name: 'NAI画图正则', regex: 'NAME_SENTINEL', replacement: 'CARD_NAME_OK',
                    scope: 'character', enabled: true, markdownOnly: true });
            });
            assert.ok((await page.evaluate(() => __qa.renderMarkdown('NAME_SENTINEL'))).includes('CARD_NAME_OK'));
            await switchCard(1);
            assert.ok(!(await page.evaluate(() => __qa.renderMarkdown('NAME_SENTINEL'))).includes('CARD_NAME_OK'));
            assert.equal(await page.evaluate(() => __qa.regexScripts.find(rule => rule.name === 'NAI画图正则' && rule.scope === 'global').enabled), false);
            await switchCard(0);
            assert.ok((await page.evaluate(() => __qa.renderMarkdown('NAME_SENTINEL'))).includes('CARD_NAME_OK'));
        });
        await check('stale frames cannot send commands after A to B to A', async () => {
            await appendFrame('<button id="stale" data-slash="STALE_A">Old frame</button>', 'stale-card');
            await page.frameLocator('#stale-card iframe').locator('#stale').waitFor();
            await switchCard(1);
            await switchCard(0);
            await page.evaluate(() => __qa.clearPendingCardInteraction());
            await page.frameLocator('#stale-card iframe').locator('#stale').click();
            const storageBefore = await page.evaluate(() => JSON.stringify(Object.fromEntries(
                Object.entries(localStorage).filter(([key]) => key.startsWith('rp-card-state::')))));
            await page.frameLocator('#stale-card iframe').locator('body').evaluate(() => {
                localStorage.setItem('stale-write', 'bad');
                RPHubCard.setAppearance({ background: 'red' });
            });
            await page.waitForTimeout(120);
            assert.equal(await page.evaluate(() => __qa.pendingCardInteraction), '');
            assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(
                Object.entries(localStorage).filter(([key]) => key.startsWith('rp-card-state::'))))), storageBefore);
            assert.notEqual(await page.locator('.chat-view-root').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 0, 0)');
        });
        await check('saved UI snapshots retain isolation and interactions after switching back', async () => {
            await page.evaluate(() => {
                document.getElementById('stale-card')?.remove();
                document.getElementById('isolation-frame')?.remove();
                const frame = document.createElement('iframe');
                frame.className = 'executable-html-frame';
                frame.sandbox = 'allow-scripts allow-same-origin';
                frame.srcdoc = '<style>#outside-card{color:red!important}</style>'
                    + '<script>function scheduleUpdateHeight(){};window.triggerSlash = function(text){parent.triggerSlash(text)};var oldFrame=window.frameElement;</script>'
                    + '<button id="legacy-action" data-slash="Saved interaction">Saved UI</button>';
                window.__savedUiHtml = '<div class="html-card-container">' + frame.outerHTML + '</div>';
                __qa.chatHistory.push({ id: 'saved-ui', role: 'assistant', content: 'Saved panel',
                    uiTemplateBlocks: { top: [__savedUiHtml], bottom: [] } });
            });
            await page.frameLocator('.ui-template-render iframe').locator('#legacy-action').press('Enter');
            await page.waitForFunction(() => __qa.pendingCardInteraction === 'Saved interaction', null, { timeout: 3000 });
            await switchCard(1);
            await switchCard(0);
            await page.evaluate(() => __qa.clearPendingCardInteraction());
            await page.frameLocator('.ui-template-render iframe').locator('#legacy-action').press('Enter');
            await page.waitForFunction(() => __qa.pendingCardInteraction === 'Saved interaction', null, { timeout: 3000 });
            assert.equal(await page.frameLocator('.ui-template-render iframe').locator('body').evaluate(() => {
                try { return !!parent.document; } catch (_) { return false; }
            }), false);
            assert.equal(await page.evaluate(() => __qa.chatHistory.find(msg => msg.id === 'saved-ui').uiTemplateBlocks.top[0]), await page.evaluate(() => __savedUiHtml));
            for (const skin of ['classic', 'winter', 'chenyue']) {
                await page.evaluate(skin => { RPThemePacks.set(skin); __qa.clearPendingCardInteraction(); }, skin);
                await page.frameLocator('.ui-template-render iframe').locator('#legacy-action').press('Enter');
                await page.waitForFunction(() => __qa.pendingCardInteraction === 'Saved interaction');
            }
        });
        await check('an unregistered window cannot forge a card bridge command', async () => {
            await appendFrame('<p>Bridge owner</p>');
            const result = await page.evaluate(async () => {
                __qa.clearPendingCardInteraction();
                const frame = document.querySelector('#isolation-frame iframe');
                const packet = { type: 'RPHUB_CARD', channel: frame.dataset.rpCardChannel,
                    runtime: frame.dataset.rpCardRuntime, action: 'slash', value: 'FORGED' };
                window.postMessage(packet, '*');
                await new Promise(resolve => setTimeout(resolve, 50));
                return __qa.pendingCardInteraction;
            });
            assert.equal(result, '');
        });
        await check('nested and removed frames cannot forge a card bridge command', async () => {
            const packet = await page.locator('#isolation-frame iframe').evaluate(frame => ({
                type: 'RPHUB_CARD', channel: frame.dataset.rpCardChannel, runtime: frame.dataset.rpCardRuntime,
                action: 'slash', value: 'FORGED_NESTED'
            }));
            await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(packet => {
                const nested = document.createElement('iframe');
                nested.srcdoc = '<script>top.postMessage(' + JSON.stringify(packet) + ',"*")</script>';
                document.body.appendChild(nested);
            }, packet);
            await page.waitForTimeout(80);
            assert.equal(await page.evaluate(() => __qa.pendingCardInteraction), '');
            await page.evaluate(packet => {
                const frame = document.querySelector('#isolation-frame iframe'), source = frame.contentWindow;
                frame.remove();
                window.dispatchEvent(new MessageEvent('message', { source, data: packet, origin: 'null' }));
            }, packet);
            assert.equal(await page.evaluate(() => __qa.pendingCardInteraction), '');
        });
        await check('card appearance is temporary and scoped to the current card', async () => {
            await appendFrame('<button id="appearance" onclick="RPHubCard.setAppearance({background:\'#eeddaa\',bubbleColor:\'#123456\'})">Appearance</button>');
            await page.frameLocator('#isolation-frame iframe').locator('#appearance').click();
            await page.waitForFunction(() => getComputedStyle(document.querySelector('.chat-view-root')).backgroundColor === 'rgb(238, 221, 170)');
            await switchCard(1);
            assert.notEqual(await page.locator('.chat-view-root').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(238, 221, 170)');
            await switchCard(0);
            assert.equal(await page.locator('.chat-view-root').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(238, 221, 170)');
            assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('outside-card')).color), 'rgb(1, 2, 3)');
        });
        await check('preview scripts cannot write card state, appearance or pending interaction', async () => {
            await page.evaluate(() => __qa.clearPendingCardInteraction());
            const before = await page.evaluate(() => JSON.stringify(Object.fromEntries(
                Object.entries(localStorage).filter(([key]) => key.startsWith('rp-card-state::')))));
            await appendFrame(`<button id="preview" onclick="localStorage.setItem('preview-write','bad');
                triggerSlash('PREVIEW');RPHubCard.setAppearance({background:'red'})">Preview</button>`, 'isolation-frame', true);
            await page.frameLocator('#isolation-frame iframe').locator('#preview').click();
            await page.waitForTimeout(80);
            assert.equal(await page.evaluate(() => __qa.pendingCardInteraction), '');
            assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.chat-view-root')).backgroundColor), 'rgb(238, 221, 170)');
            assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(
                Object.entries(localStorage).filter(([key]) => key.startsWith('rp-card-state::'))))), before);
        });
        await check('memory citations still open the host explanation', async () => {
            await appendFrame('<p>A remembered event [M12]</p>');
            await page.frameLocator('#isolation-frame iframe').locator('.memory-cite').click();
            await page.waitForFunction(() => __qa.memoryCitationNos.includes(12));
            await page.evaluate(() => { __qa.memoryCitationNos = []; });
        });
        await check('new branches do not inherit another branch storage or appearance', async () => {
            await page.evaluate(async () => { await __qa.createStoryBranch(); });
            await appendFrame('<p>Branch storage</p>');
            assert.equal(await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => localStorage.getItem('card-shared-key')), null);
            assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector('.chat-view-root')).backgroundColor), 'rgb(238, 221, 170)');
            await page.evaluate(async () => { await __qa.switchStoryBranch('main'); });
            await appendFrame('<p>Main branch storage</p>');
            assert.equal(await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => localStorage.getItem('card-shared-key')), 'A');
        });
        await check('lazy snapshot flags cannot put arbitrary styles in the host', async () => {
            const result = await page.evaluate(() => {
                const holder = document.createElement('div');
                holder.innerHTML = __qa.renderUiTemplateBlock('<style>#outside-card{color:red!important}</style>', true, 0, 'top');
                document.body.appendChild(holder);
                return getComputedStyle(document.getElementById('outside-card')).color;
            });
            assert.equal(result, 'rgb(1, 2, 3)');
        });
        await check('saved snapshots omit runtime storage while their displayed copy loads current state', async () => {
            const result = await page.evaluate(() => {
                const html = RPHubUiTemplateUtils.renderUiTemplateHtml({
                    htmlTemplate: '<p id="snapshot-state"></p><script>document.getElementById("snapshot-state").textContent=localStorage.getItem("card-shared-key")</script>',
                    variableState: {}
                });
                const holder = document.createElement('div');
                holder.id = 'snapshot-storage';
                holder.innerHTML = __qa.renderUiTemplateBlock(html);
                document.body.appendChild(holder);
                return new DOMParser().parseFromString(html, 'text/html').querySelector('iframe').srcdoc;
            });
            assert.equal(result.includes('HOST'), false);
            assert.equal(result.includes('"card-shared-key":"A"'), false);
            assert.equal(await page.frameLocator('#snapshot-storage iframe').locator('#snapshot-state').innerText(), 'A');
        });
        await check('card storage survives reload without leaking into the host', async () => {
            await page.reload();
            await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
            await page.evaluate(() => {
                window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                __qa.showUserSetupModal = false;
                __qa.showAnnouncement = false;
            });
            await switchCard(0);
            await appendFrame('<p id="reload">Reloaded card</p>');
            assert.equal(await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => localStorage.getItem('card-shared-key')), 'A');
            assert.equal(await page.evaluate(() => localStorage.getItem('card-shared-key')), 'HOST');
        });
        await check('pages of the same card observe storage writes, removals and clear', async () => {
            await appendFrame('<p>First page</p>', 'storage-first');
            await appendFrame('<p>Second page</p>', 'storage-second');
            const first = page.frameLocator('#storage-first iframe').locator('body');
            const second = page.frameLocator('#storage-second iframe').locator('body');
            try {
                await second.evaluate(() => {
                    window.storageEvents = [];
                    addEventListener('storage', event => storageEvents.push([event.key, event.newValue]));
                });
                await first.evaluate(() => localStorage.setItem('shared-panel-state', 'updated'));
                await waitForStorage(second, 'shared-panel-state', 'updated');
                assert.deepEqual(await second.evaluate(() => storageEvents.at(-1)), ['shared-panel-state', 'updated']);
                await first.evaluate(() => localStorage.removeItem('shared-panel-state'));
                await waitForStorage(second, 'shared-panel-state', null);
                assert.equal(await second.evaluate(() => localStorage.getItem('shared-panel-state')), null);
                await first.evaluate(() => localStorage.clear());
                await waitForStorage(second, null, 0);
                assert.equal(await second.evaluate(() => localStorage.length), 0);
            } finally {
                await first.evaluate(() => localStorage.setItem('card-shared-key', 'A'));
                await page.evaluate(() => {
                    document.getElementById('storage-first').remove();
                    document.getElementById('storage-second').remove();
                });
            }
        });
        await check('cached message markup starts scripts with the latest card storage', async () => {
            await page.evaluate(() => {
                window.__cachedCardMarkup = __qa.renderMarkdown('<p id="fresh-state"></p><script>'
                    + 'document.getElementById("fresh-state").textContent=localStorage.getItem("card-shared-key")</script>');
            });
            await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => localStorage.setItem('card-shared-key', 'LATEST'));
            await page.waitForFunction(() => JSON.parse(localStorage.getItem('rp-card-state::isolation-A'))['card-shared-key'] === 'LATEST');
            await page.evaluate(() => {
                const holder = document.createElement('div');
                holder.id = 'cached-card-state';
                holder.innerHTML = __cachedCardMarkup;
                document.body.appendChild(holder);
            });
            try {
                assert.equal(await page.frameLocator('#cached-card-state iframe').locator('#fresh-state').innerText(), 'LATEST');
            } finally {
                await page.frameLocator('#isolation-frame iframe').locator('body').evaluate(() => localStorage.setItem('card-shared-key', 'A'));
                await page.evaluate(() => document.getElementById('cached-card-state').remove());
            }
        });
        await check('newly committed card pages can initialize before switching finishes', async () => {
            await page.evaluate(async () => { await __qa.createStoryBranch(); });
            const branchId = await page.evaluate(() => __qa.currentStoryBranch.id);
            try {
                await page.evaluate(() => { __qa.storyBranchSwitching = true; });
                await appendFrame('<p>Initializing</p><script>localStorage.setItem("initialized","new-scope");</script>');
                await page.waitForFunction(branchId => {
                    const value = localStorage.getItem('rp-card-state::isolation-A__branch__' + branchId);
                    return value && JSON.parse(value).initialized === 'new-scope';
                }, branchId, { timeout: 2000 });
                assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('rp-card-state::isolation-A')).initialized), undefined);
            } finally {
                await page.evaluate(async () => {
                    __qa.storyBranchSwitching = false;
                    await __qa.switchStoryBranch('main');
                });
            }
        });
        await check('card HTML remains readable and interactive at phone and desktop widths', async () => {
            await page.evaluate(() => {
                __qa.toasts = [];
                document.getElementById('isolation-frame')?.remove();
                __qa.chatHistory = [{ id: 'visual-panel', role: 'assistant', skipReveal: true, shouldAnimate: false,
                    content: '<style>body{background:#eaf2f4;color:#263638;font:16px/1.7 sans-serif}section{padding:18px}h3{margin:0}button{background:#285c58;color:white;border:0;padding:10px 16px;margin-top:12px}</style>'
                        + '<section><h3>Card A</h3><p>Private styles, state and interactions.</p><button id="visual-action" data-slash="Continue A">Continue</button></section>' }];
            });
            fs.mkdirSync(output, { recursive: true });
            for (const [width, skin] of [[390, 'classic'], [1280, 'chenyue']]) {
                await page.setViewportSize({ width, height: 844 });
                await page.evaluate(skin => RPThemePacks.set(skin), skin);
                const frame = page.frameLocator('.message-content-wrapper iframe');
                await frame.locator('#visual-action').waitFor();
                assert.equal(await frame.locator('body').evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                await frame.locator('#visual-action').press('Enter');
                await page.waitForFunction(() => __qa.pendingCardInteraction === 'Continue A');
                await page.screenshot({ path: path.join(output, 'card-' + width + '.png') });
            }
        });
        await check('workshop previews cannot modify the app and keep their preview interaction', async () => {
            await page.evaluate(() => { __qa.clearPendingCardInteraction(); __qa.navigateWorkspace('generator'); });
            const workshop = page.frameLocator('iframe[src*="character/index.html"]');
            await workshop.locator('#app').waitFor();
            await workshop.locator('#app').evaluate(el => {
                const state = el.__vue_app__._container._vnode.component.setupState;
                state.currentCharacter.first_mes = '<!doctype html><html><head></head><body>'
                    + '<p id="workshop-isolation"></p><button id="workshop-action" onclick="triggerSlash(\'Preview only\')">Preview</button>'
                    + '<script>let isolated=false;try{top.document.body.dataset.workshopLeak="yes"}catch(e){isolated=true}'
                    + 'document.getElementById("workshop-isolation").textContent=isolated?"isolated":"leaked";</script></body></html>';
                state.showPreview = true;
            });
            const preview = workshop.frameLocator('iframe[srcdoc]');
            assert.equal(await preview.locator('#workshop-isolation').innerText(), 'isolated');
            await preview.locator('#workshop-action').evaluate(button => button.click());
            await workshop.locator('.toast-text').filter({ hasText: '触发：发送消息 "Preview only"' }).waitFor({ state: 'attached' });
            assert.equal(await page.evaluate(() => document.body.dataset.workshopLeak || ''), '');
            assert.equal(await page.evaluate(() => __qa.pendingCardInteraction), '');
        });
        fs.mkdirSync(output, { recursive: true });
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ checks, failures, errors, androidTested: false }, null, 2));
        assert.deepEqual(failures, []);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
