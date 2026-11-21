const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const installFiles = require('./mock-files.cjs');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const origin = 'https://sta1n156.github.io';
const start = origin + '/RP-Hub/';

async function openApp(browser, { native = true, routeExtra = null } = {}) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    if (native) await context.addInitScript(installFiles);
    else await context.addInitScript(() => localStorage.setItem('rp-local-release-shown', '99999999'));
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (routeExtra && routeExtra(route, url)) return;
        if (url.origin !== origin || !url.pathname.startsWith('/RP-Hub/')) return route.abort();
        const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
        return route.fulfill({ path: file });
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    await page.goto(start);
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
        window.qa = document.querySelector('#app').__vue_app__._container._vnode.component.setupState;
        qa.showUserSetupModal = false;
        qa.closeAnnouncement();
    });
    await page.waitForFunction(() => qa.imageApi.ready);
    return { page, context, pageErrors };
}

async function testStorageAndHealth(browser) {
    const { page, context, pageErrors } = await openApp(browser, { native: true });
    try {
        const result = await page.evaluate(async () => {
            const liveCard = { name: '审计测试卡', description: '正文' };
            await RPHubStorage.saveCharacterLibrary([liveCard]);
            await RPLocalStore.flush();
            const cardSynced = {
                hasUuid: !!liveCard.uuid,
                hasFolder: !!liveCard.storageFolder,
                hasImportedName: liveCard.importedName === '审计测试卡'
            };

            // Write a legacy auto_backup_* entry and an active tombstone, plus an empty orphan folder check
            await RPHubStorage.setStoredValue('auto_backup_20250101', { stale: true });
            const tombstoneKey = 'rp_hub_b1_memory_state_' + liveCard.uuid;
            await RPLocalStore.save(tombstoneKey, { schema: 1, revision: 'a'.repeat(32), deleted: true });
            await RPLocalStore.flush();
            const indexAfterTombstone = RPLocalStore.read('个人数据/文件索引.json') || {};
            const tombstonePath = indexAfterTombstone[tombstoneKey] || '';

            // Write a real orphan folder with a file, and confirm liveCard's folder is NOT flagged
            RPLocalFiles.writeText('角色卡数据/旧孤立卡/残余.json', JSON.stringify({ junk: 1 }));
            qa.characters = [liveCard];
            await qa.scanDataHealth();
            const items = (qa.dataHealthResult?.items || []).map(i => ({ id: i.id, count: i.count, folders: i.folders }));
            const orphanItem = items.find(i => i.id === 'orphan-card-folders');
            const legacyBackupCount = qa.backupSizeReport?.legacyBackupCount || 0;
            const legacyBackupKeys = qa.backupSizeReport?.legacyBackupKeys || [];

            // Clean orphan folder; verify subsequent scan does not keep reporting empty folder
            if (orphanItem) await qa.cleanDataHealthItem(qa.dataHealthResult.items.find(i => i.id === 'orphan-card-folders'));
            await qa.scanDataHealth();
            const orphanAfterClean = (qa.dataHealthResult?.items || []).find(i => i.id === 'orphan-card-folders');

            // Verify compactDatabase runs cleanly and preserves live keys
            const compactRes = await RPHubStorage.compactDatabase();
            const keysAfterCompact = await RPHubStorage.readStorageKeys(RPHubStorage.getMainDb());

            return {
                cardSynced,
                tombstoneInPersonal: tombstonePath.startsWith('个人数据/'),
                orphanFolders: orphanItem?.folders || [],
                liveCardNotFlagged: !(orphanItem?.folders || []).includes(liveCard.storageFolder),
                autoBackupDetected: legacyBackupCount >= 1 && legacyBackupKeys.includes('auto_backup_20250101'),
                orphanGoneAfterClean: !orphanAfterClean,
                compactOk: compactRes?.keys > 0 && keysAfterCompact.includes('rp_hub_characters')
            };
        });
        assert.deepEqual(result.cardSynced, { hasUuid: true, hasFolder: true, hasImportedName: true });
        assert.equal(result.tombstoneInPersonal, true, 'Deleted memory tombstone must route to 个人数据/');
        assert.deepEqual(result.orphanFolders, ['旧孤立卡']);
        assert.equal(result.liveCardNotFlagged, true, 'Live saved character must not be flagged as orphan');
        assert.equal(result.autoBackupDetected, true, 'Legacy auto_backup_* key must be detected by health scan');
        assert.equal(result.orphanGoneAfterClean, true, 'Cleaned orphan folder with 0 files must not re-appear');
        assert.equal(result.compactOk, true, 'compactDatabase must preserve main store keys');
        assert.deepEqual(pageErrors, []);
    } finally {
        await context.close();
    }
}

async function testEphemeralLsAndStreamImport(browser) {
    const { page, context, pageErrors } = await openApp(browser, { native: true });
    try {
        const result = await page.evaluate(async () => {
            localStorage.setItem('rphub_heap_marks_v1', '["probe"]');
            localStorage.setItem('rphub_embedding_cache_count', '42');
            localStorage.setItem('rphub.bootAttempts', '1');
            localStorage.setItem('rp_audit_real_pref', 'keep-me');
            await RPLocalStore.flush();
            const idx = RPLocalStore.read('个人数据/文件索引.json') || {};

            const parts = [];
            window.showSaveFilePicker = async () => ({
                createWritable: async () => ({ write: part => parts.push(part), close() {}, async abort() {} })
            });
            await qa.exportAllData();
            if (qa.backupTask.error) throw new Error(qa.backupTask.error);
            const parsed = JSON.parse(parts.join(''));
            const entryKeys = parsed.entries.map(e => e.key);
            const wsKeys = Object.keys(parsed.webStorage?.localStorage || {});

            // Test large rp_hub_classic_memories_* staging (> default collection limit on balanced/low? use 3MB)
            const bigList = Array.from({ length: 40 }, (_, i) => ({
                id: 'm' + i, summary: 's'.repeat(60000), updatedAt: Date.now()
            }));
            const session = await RPStreamImport.stageEntries([
                { key: 'rp_hub_classic_memories_audit_scope', value: bigList }
            ]);
            const stageDb = await RPStreamImport.database();
            const staged = await RPStreamImport.readSession(stageDb, session);
            await RPStreamImport.removeSession(stageDb, session);
            stageDb.close();

            return {
                ephemeralMirrored: !!(idx['__ls__:rphub_heap_marks_v1'] || idx['__ls__:rphub_embedding_cache_count'] || idx['__ls__:rphub.bootAttempts']),
                realPrefMirrored: !!idx['__ls__:rp_audit_real_pref'],
                leakedInEntries: entryKeys.some(k => k.includes('rphub_heap_marks_v1') || k.includes('__qa_native_files') || k.includes('rphub_embedding_cache_count')),
                leakedInWebStorage: wsKeys.some(k => k === 'rphub_heap_marks_v1' || k === '__qa_native_files' || k === 'rphub_embedding_cache_count'),
                realPrefExported: entryKeys.includes('__ls__:rp_audit_real_pref') && wsKeys.includes('rp_audit_real_pref'),
                stagedMemoriesComplete: staged?.state === 'complete'
            };
        });
        assert.equal(result.ephemeralMirrored, false, 'Ephemeral localStorage keys must not mirror to RPLocalFiles');
        assert.equal(result.realPrefMirrored, true, 'Normal localStorage preferences must still mirror to RPLocalFiles');
        assert.equal(result.leakedInEntries, false, 'Ephemeral/QA keys must not leak into backup entries');
        assert.equal(result.leakedInWebStorage, false, 'Ephemeral/QA keys must not leak into webStorage dump');
        assert.equal(result.realPrefExported, true, 'Normal preferences must still be exported');
        assert.equal(result.stagedMemoriesComplete, true, 'Large classic memories must stage without maxCollectionBytes rejection');
        assert.deepEqual(pageErrors, []);
    } finally {
        await context.close();
    }
}

async function testApiUsageAndEmbeddingCache(browser) {
    const quotaCalls = [];
    let embeddingNetworkHits = 0;
    let failNextEmbedding = true;
    const { page, context, pageErrors } = await openApp(browser, {
        native: true,
        routeExtra(route, url) {
            if (url.hostname === 'secondary.invalid') {
                if (url.pathname.endsWith('/embeddings')) {
                    embeddingNetworkHits++;
                    if (failNextEmbedding) {
                        failNextEmbedding = false;
                        route.abort('failed');
                        return true;
                    }
                    route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
                            usage: { prompt_tokens: 12, total_tokens: 12 }
                        })
                    });
                    return true;
                }
                quotaCalls.push({
                    url: url.href,
                    auth: route.request().headers()['authorization'] || ''
                });
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ hard_limit_usd: 10, total_usage: 100 })
                });
                return true;
            }
            if (url.hostname === 'slow.invalid') {
                // Intentionally never respond so timeoutMs triggers
                setTimeout(() => route.abort('timedout').catch(() => {}), 5000);
                return true;
            }
            return false;
        }
    });
    try {
        const result = await page.evaluate(async () => {
            await RPHubEmbeddingCache.clear();
            // 1. Network failure on /embeddings must NOT trigger a duplicate fallback fetch
            let firstErr = '';
            try {
                await fetch('https://secondary.invalid/v1/embeddings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sec-key' },
                    body: JSON.stringify({ model: 'emb-1', input: 'audit-probe-text' })
                });
            } catch (e) { firstErr = e.message || 'failed'; }

            // 2. Second request succeeds and caches; third request hits cache and sets __rpEmbeddingCacheHit
            const res1 = await RPHubApiClient.requestJson({
                url: 'https://secondary.invalid/v1/embeddings',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sec-key' },
                body: { model: 'emb-1', input: 'audit-probe-text' },
                pool: false
            });
            // cacheWriteAsync persists to IndexedDB asynchronously after returning response
            await new Promise(r => setTimeout(r, 200));
            const res2 = await RPHubApiClient.requestJson({
                url: 'https://secondary.invalid/v1/embeddings',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sec-key' },
                body: { model: 'emb-1', input: 'audit-probe-text' },
                pool: false
            });

            // 3. requestJson honors timeoutMs
            const t0 = Date.now();
            let timeoutErr = '';
            try {
                await RPHubApiClient.requestJson({
                    url: 'https://slow.invalid/v1/models',
                    method: 'GET',
                    timeoutMs: 250,
                    pool: false
                });
            } catch (e) { timeoutErr = e.message || String(e); }
            const elapsedMs = Date.now() - t0;

            // 4. recordApiUsage uses meta.apiKey (not main chat apiKey) and skips quota on cached=true
            qa.settings.apiKey = 'MAIN-CHAT-SECRET-KEY';
            qa.settings.apiUrl = 'https://main.invalid/v1';
            const usageHelper = RPHubComposables.useTokenUsage({
                pageSize: 20,
                cloneForStorage: value => value,
                confirm: async () => true,
                ensureStorage: async () => {},
                generateUUID: () => crypto.randomUUID(),
                getApiKey: () => qa.settings.apiKey,
                getApiUrl: () => qa.settings.apiUrl,
                getTokenUsageLimit: () => 50,
                normalizeApiUsage: RPHubUtils.normalizeApiUsage,
                saveStoredValue: async () => {},
                toast: () => {}
            });
            usageHelper.recordApiUsage(
                { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
                { apiUrl: 'https://secondary.invalid/v1/embeddings', apiKey: 'SECONDARY-ONLY-KEY', model: 'emb-1', cached: false }
            );
            usageHelper.recordApiUsage(
                { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
                { apiUrl: 'https://secondary.invalid/v1/embeddings', apiKey: 'SECONDARY-CACHED-KEY', model: 'emb-1', cached: true }
            );
            await new Promise(r => setTimeout(r, 750));

            // 5. replaceEscapedHtmlParagraphs handles &lt;div&gt;...&lt;/div&gt;
            const rendered = typeof qa.renderMarkdown === 'function'
                ? qa.renderMarkdown('&lt;div class="audit-box"&gt;hello&lt;/div&gt;', 'assistant')
                : RPHubMessageRenderer.createMessageRenderer({
                    marked: window.marked,
                    DOMPurify: window.DOMPurify,
                    getMessageSettings: () => ({ enableHtmlPreview: true })
                }).renderMarkdown('&lt;div class="audit-box"&gt;hello&lt;/div&gt;', 'assistant', 'm1');

            return {
                firstErr: !!firstErr,
                res1Cached: !!res1.__rpEmbeddingCacheHit,
                res2Cached: !!res2.__rpEmbeddingCacheHit,
                timeoutTriggered: !!timeoutErr && elapsedMs < 2500,
                renderedHasBox: rendered.includes('audit-box') || rendered.includes('iframe')
            };
        });
        assert.equal(result.firstErr, true);
        assert.equal(embeddingNetworkHits, 2, '1 failed fetch + 1 successful fetch + 1 cache hit => exactly 2 network calls');
        assert.equal(result.res1Cached, false);
        assert.equal(result.res2Cached, true, 'Embedding cache hit must attach __rpEmbeddingCacheHit');
        assert.equal(result.timeoutTriggered, true, 'withApiResponse/requestJson must honor options.timeoutMs');
        assert.ok(quotaCalls.length > 0, 'Quota check should fire for non-cached secondary call');
        assert.ok(quotaCalls.every(c => !c.auth.includes('MAIN-CHAT-SECRET-KEY')), 'Must NEVER leak main chat API key to secondary quota check');
        assert.ok(quotaCalls.every(c => !c.auth.includes('SECONDARY-CACHED-KEY')), 'Cached embedding usage must skip quota fetch');
        assert.ok(quotaCalls.every(c => !c.url.includes('/embeddings')), 'Quota URL must strip trailing /embeddings');
        assert.equal(result.renderedHasBox, true);
        assert.deepEqual(pageErrors, []);
    } finally {
        await context.close();
    }
}

async function testAppStateThemeAndSubpages(browser) {
    const { page, context, pageErrors } = await openApp(browser, { native: true });
    try {
        const result = await page.evaluate(async () => {
            const hasSaveData = typeof qa.saveData === 'function';
            const quickIds = (qa.quickApiProviders || []).map(p => p.id);
            const hasCustomDummy = quickIds.includes('custom');
            const freezeExplicitInitial = qa.settings.freezeGeneratedImagesExplicit;

            // Icons check
            const iconNames = ['PackageCheck', 'ListTodo', 'BellRing', 'FileText'];
            const iconsPresent = iconNames.every(name => Array.isArray(RPShellIcons?.[name]) && RPShellIcons[name].length > 0);

            // Theme specificity & accent scope check
            RPThemePacks.set('classic');
            RPHubThemeKit.setAccent('#e05a76');
            const accentScopeClassic = document.documentElement.getAttribute('data-accent-scope');
            RPThemePacks.set('vampire');
            if (RPThemePacks.mode !== 'night') RPThemePacks.toggleMode();
            await new Promise(resolve => {
                const deadline = Date.now() + 2000;
                const check = () => {
                    const bg = getComputedStyle(document.documentElement).getPropertyValue('--shell-bg').trim().toLowerCase();
                    if (bg === '#141216' || Date.now() > deadline) return resolve();
                    setTimeout(check, 25);
                };
                check();
            });
            const vampireBg = getComputedStyle(document.documentElement).getPropertyValue('--shell-bg').trim();
            const accentScopeVampire = document.documentElement.getAttribute('data-accent-scope');
            RPHubThemeKit.setAccent('');
            const accentScopeOff = document.documentElement.getAttribute('data-accent-scope');

            // regenerateMessage deadlock guard on 1-message assistant history
            const card = { uuid: 'regen-card-1', name: '重生成测试', first_mes: '开场白' };
            qa.characters = [card];
            qa.activeCharacter = card;
            qa.chatHistory = [{ role: 'assistant', content: '第一条回复' }];
            qa.settings.apiUrl = '';
            qa.settings.apiKey = '';
            qa.settings.model = '';
            await qa.regenerateMessage(0);
            const stuckGenerating = qa.isGenerating;

            return {
                hasSaveData,
                hasCustomDummy,
                freezeExplicitInitial,
                iconsPresent,
                vampireBg,
                accentScopeClassic,
                accentScopeVampire,
                accentScopeOff,
                stuckGenerating
            };
        });
        assert.equal(result.hasSaveData, true, 'saveData must be exported in setup() return');
        assert.equal(result.hasCustomDummy, false, 'quickApiProviders must exclude dummy custom entry');
        assert.equal(result.freezeExplicitInitial, false, 'freezeGeneratedImagesExplicit must default to false');
        assert.equal(result.iconsPresent, true, 'All 4 missing shell icons must be registered');
        assert.equal(result.vampireBg.toLowerCase(), '#141216', 'chenyue-theme must not override vampire --shell-bg');
        assert.equal(result.accentScopeClassic, '1', 'Setting accent on classic must enable data-accent-scope="1"');
        assert.equal(result.accentScopeVampire, null, 'Switching to vampire must immediately revoke data-accent-scope via rp-ui-theme-change');
        assert.equal(result.accentScopeOff, null, 'Clearing accent must remove data-accent-scope');
        assert.equal(result.stuckGenerating, false, 'regenerateMessage failure must not leave isGenerating stuck true');
        assert.deepEqual(pageErrors, []);
    } finally {
        await context.close();
    }

    // Static check: sub-pages must not load main-app-only scripts
    for (const rel of ['web/character/index.html', 'web/novel/index.html']) {
        const html = fs.readFileSync(path.join(root, rel), 'utf8');
        for (const forbidden of [
            'local-files.js', 'sakura-features.js', 'rphub-image-gallery.js',
            'rphub-image-vault.js', 'rphub-embedding-cache.js', 'rphub-native-theme.js'
        ]) {
            assert.ok(!html.includes(forbidden), `${rel} must not load main-app script ${forbidden}`);
        }
    }
    const charHtml = fs.readFileSync(path.join(root, 'web/character/index.html'), 'utf8');
    assert.ok(
        charHtml.indexOf('image-policy.js') < charHtml.indexOf('image-download.js'),
        'web/character/index.html must load image-policy.js before image-download.js'
    );
}

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const tests = [
        ['storage-and-health', () => testStorageAndHealth(browser)],
        ['ephemeral-ls-and-stream-import', () => testEphemeralLsAndStreamImport(browser)],
        ['api-usage-and-embedding-cache', () => testApiUsageAndEmbeddingCache(browser)],
        ['app-state-theme-and-subpages', () => testAppStateThemeAndSubpages(browser)]
    ];
    try {
        for (const [name, run] of tests) {
            try {
                await run();
                console.log('PASS', name);
            } catch (error) {
                console.error('FAIL', name, error);
                process.exitCode = 1;
            }
        }
    } finally {
        await browser.close();
    }
})();
