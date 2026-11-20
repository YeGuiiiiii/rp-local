const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('./playwright.cjs');
const installFileBridge = require('./mock-files.cjs');

const timer = setTimeout(() => {
    console.error('TIMEOUT in test-large-memory-storage.cjs');
    process.exit(2);
}, 45000);
timer.unref();

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const context = await browser.newContext();
        await context.addInitScript(installFileBridge, { skin: null, persistFiles: false });
        let summaryCalls = 0;
        let embeddingBatchInputs = 0;
        const pageErrors = [];

        await context.route('**/*', async route => {
            const req = route.request();
            const url = new URL(req.url());
            if (url.hostname === 'relay-a.test' || url.hostname === 'relay-b.test') {
                const headers = {
                    'access-control-allow-origin': '*',
                    'access-control-allow-headers': '*',
                    'access-control-allow-methods': 'POST,OPTIONS'
                };
                if (req.method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
                if (url.pathname.endsWith('/embeddings')) {
                    const body = JSON.parse(req.postData() || '{}');
                    const inputs = Array.isArray(body.input) ? body.input : [body.input];
                    embeddingBatchInputs += inputs.length;
                    return route.fulfill({
                        headers,
                        status: 200,
                        json: {
                            data: inputs.map((_, index) => ({ index, embedding: [0.6, 0.8, 0.0] }))
                        }
                    });
                }
                if (url.pathname.endsWith('/chat/completions')) {
                    summaryCalls += 1;
                    return route.fulfill({
                        headers,
                        status: 200,
                        json: {
                            choices: [{
                                message: { role: 'assistant', content: `合成补录总结第 ${summaryCalls} 条：角色在观测站完成巡检。` },
                                finish_reason: 'stop'
                            }]
                        }
                    });
                }
            }
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            return file.startsWith(web + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
                ? route.fulfill({
                    path: file,
                    contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream'
                })
                : route.abort();
        });

        const page = await context.newPage();
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));

        const outcome = await page.evaluate(async () => {
            const __qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            __qa.closeAnnouncement();

            const scopeId = 'large-mem-card';
            const padAssistant = '星港观测记录归档正文片段。'.repeat(700); // ~9 KB UTF-8, ~18 KB UTF-16 estimate
            const packedEmb = window.RPHubMemoryUtils.quantizeEmbeddingForStorage([0.6, 0.8, 0.0]);
            const initialMemories = [];
            const initialChat = [];
            let nextNo = 1;
            // Build 70 compressed groups (350 leaf turns, > 6.5 MB storable bytes => 2+ chunks of 4 MB)
            for (let g = 0; g < 70; g++) {
                const startTurn = g * 5 + 1;
                const endTurn = startTurn + 4;
                const leaves = [];
                for (let t = startTurn; t <= endTurn; t++) {
                    const uId = `u-${t}`, aId = `a-${t}`;
                    const uText = `第 ${t} 轮旅人询问航标坐标`;
                    const sumText = `第 ${t} 轮总结：航标坐标核验完毕。`;
                    initialChat.push({ id: uId, role: 'user', content: uText });
                    initialChat.push({ id: aId, role: 'assistant', content: `第 ${t} 轮回复：${padAssistant}`, shouldAnimate: false });
                    const leaf = {
                        id: `leaf-${t}`,
                        no: nextNo++,
                        turn: t,
                        timestamp: 1700000000000 + t,
                        summary: sumText,
                        enabled: true,
                        classicMemory: true,
                        summaryModel: 'fixture-summary-v1',
                        sourceUserIds: [uId],
                        sourceAssistantIds: [aId],
                        sourceUserText: uText,
                        sourceAssistantText: `第 ${t} 轮回复：${padAssistant}`,
                        ...packedEmb,
                        embeddingModel: 'fixture-emb-v2',
                        embeddingApiUrl: 'https://relay-a.test/v1/embeddings',
                        embeddingInputFingerprint: window.RPHubMemoryUtils.summaryEmbeddingFingerprint({
                            summary: sumText,
                            sourceUserText: uText
                        }),
                        customUnknownField: { tag: `keep-${t}` }
                    };
                    leaves.push(leaf);
                }
                initialMemories.push({
                    id: `group-${g + 1}`,
                    no: nextNo++,
                    turn: endTurn,
                    turnStart: startTurn,
                    turnEnd: endTurn,
                    timestamp: 1700001000000 + g,
                    summary: `第 ${startTurn}-${endTurn} 轮阶段压缩摘要。`,
                    enabled: true,
                    classicMemory: true,
                    secondaryCompressed: true,
                    summaryModel: 'fixture-summary-v1',
                    sourceUserIds: leaves.flatMap(item => item.sourceUserIds),
                    sourceAssistantIds: leaves.flatMap(item => item.sourceAssistantIds),
                    sourceMemories: leaves,
                    customGroupMeta: `gmeta-${g + 1}`
                });
            }

            // Add 5 new unsummarized turns at the tail (turns 351..355)
            for (let t = 351; t <= 355; t++) {
                initialChat.push({ id: `u-${t}`, role: 'user', content: `第 ${t} 轮旅人询问星门钥匙与航标` });
                initialChat.push({ id: `a-${t}`, role: 'assistant', content: `第 ${t} 轮回复：星门钥匙已就位。`, shouldAnimate: false });
            }

            __qa.characters = [{ uuid: scopeId, name: '巨型记忆角色', first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: [] }];
            await window.RPHubStorage.setStoredValue('characters', window.RPHubStorage.cloneForStorage(__qa.characters));
            await window.RPHubStorage.replaceMemoryScopeList(scopeId, initialMemories);

            const db = window.RPHubStorage.getMainDb();
            const rawPrimary = await new Promise((resolve, reject) => {
                const req = db.transaction('store', 'readonly').objectStore('store').get(`rp_hub_classic_memories_${scopeId}`);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            const allKeysBefore = await window.RPHubStorage.readStorageKeys(db);
            const memPartKeysBefore = allKeysBefore.filter(k => k.startsWith('__rp_mem__:')).sort();

            const fp = window.RPHubStorage.storageContentKey(initialMemories);

            // Check stale CAS conflict still works on chunked memory state
            const staleBase = await window.RPHubStorage.readMemoryState(scopeId);
            await __qa.selectCharacter(0);
            __qa.chatHistory = initialChat;

            // Switch chat API domain from relay-a.test to relay-b.test while keeping same embeddingModel!
            Object.assign(__qa.settings, { apiUrl: 'https://relay-b.test/v1', apiKey: 'FAKE_KEY' });
            Object.assign(__qa.memorySettings, {
                enabled: true,
                mode: 'enhanced',
                classicModel: 'fixture-summary-v1',
                embeddingModel: 'fixture-emb-v2',
                memoryApiUrl: '',
                memoryApiKey: '',
                classicConcurrency: 6
            });
            await new Promise(resolve => setTimeout(resolve, 0));

            // Instrument IDB put & get to verify incremental chunk writes and zero post-commit chunk body reads!
            const origPut = IDBObjectStore.prototype.put;
            const origGet = IDBObjectStore.prototype.get;
            const idbStats = { memPartPuts: [], memPartGets: [] };
            IDBObjectStore.prototype.put = function (val, key) {
                if (typeof key === 'string' && key.startsWith('__rp_mem__:')) idbStats.memPartPuts.push(key);
                return origPut.apply(this, arguments);
            };
            IDBObjectStore.prototype.get = function (key) {
                if (typeof key === 'string' && key.startsWith('__rp_mem__:')) idbStats.memPartGets.push(key);
                return origGet.apply(this, arguments);
            };

            try {
                await __qa.startBatchMemoryExtraction();
            } finally {
                IDBObjectStore.prototype.put = origPut;
                IDBObjectStore.prototype.get = origGet;
            }

            // Stale baseline commit must be rejected as conflict
            const staleAttempt = await window.RPHubStorage.commitMemoryState(staleBase, []);

            // Deep in-place mutation must invalidate cached node stamps immediately
            const origLeafSummary = initialMemories[35].sourceMemories[2].summary;
            initialMemories[35].sourceMemories[2].summary = origLeafSummary + '（篡改）';
            const mutatedFp = window.RPHubStorage.storageContentKey(initialMemories);
            initialMemories[35].sourceMemories[2].summary = origLeafSummary;
            const restoredFp = window.RPHubStorage.storageContentKey(initialMemories);

            // Verify backup iteration expands chunks back to full array and hides private __rp_mem__: keys
            const exportedEntries = [];
            for await (const entry of window.RPHubStorage.iterateStoredEntries(db, false)) {
                exportedEntries.push({ key: entry.key, isArray: Array.isArray(entry.value), len: Array.isArray(entry.value) ? entry.value.length : null, sampleUnknown: Array.isArray(entry.value) ? entry.value[0]?.customGroupMeta : null, leafUnknown: Array.isArray(entry.value) ? entry.value[0]?.sourceMemories?.[0]?.customUnknownField?.tag : null });
            }

            // Verify deleting scope cleans up all __rp_mem__: chunk keys and leaves tombstone
            await window.RPHubStorage.deleteMemoryScope(scopeId);
            await window.RPLocalStore.flush();
            const keysAfterDelete = await window.RPHubStorage.readStorageKeys(db);
            const afterState = await window.RPHubStorage.readMemoryState(scopeId);

            return {
                chunked: rawPrimary?.rphubMemory === 1,
                initialParts: rawPrimary?.parts || 0,
                memPartKeysCount: memPartKeysBefore.length,
                fpLength: fp.length,
                backfillStatus: __qa.memoryBackfillProgress.status,
                backfillMessage: __qa.memoryBackfillProgress.message,
                firstChunkTouched: idbStats.memPartPuts.includes(memPartKeysBefore[0]),
                memPartPutsCount: idbStats.memPartPuts.length,
                memPartGetsDuringCommit: idbStats.memPartGets.length,
                staleConflictStatus: staleAttempt.status,
                deepMutationDetected: mutatedFp !== fp && restoredFp === fp,
                displayedCount: __qa.displayedClassicMemories.length,
                leakedPrivateKeysInBackup: exportedEntries.some(e => e.key.startsWith('__rp_mem__:')),
                exportedMemoryEntry: exportedEntries.find(e => e.key === `rp_hub_classic_memories_${scopeId}`),
                remainingMemPartsAfterDelete: keysAfterDelete.filter(k => k.startsWith('__rp_mem__:')).length,
                deletedTombstone: afterState.deleted
            };
        });

        assert.deepEqual(pageErrors, []);
        assert.equal(outcome.chunked, true, 'Large classic memories (> 4 MB) must be stored as a chunked directory');
        assert.ok(outcome.initialParts >= 2 && outcome.memPartKeysCount === outcome.initialParts);
        assert.ok(outcome.fpLength < 128, 'storageContentKey must return a compact digest instead of multi-MB JSON');
        assert.equal(outcome.backfillStatus, 'done', `Backfill should complete cleanly, got: ${outcome.backfillMessage}`);
        assert.equal(summaryCalls, 5, 'Exactly the 5 unsummarized turns must be summarized');
        assert.equal(embeddingBatchInputs, 5, 'Same embeddingModel across relay domain switch must NOT re-embed the 350 existing memories');
        assert.equal(outcome.firstChunkTouched, false, 'Unchanged leading memory chunks must not be rewritten during tail backfill');
        assert.equal(outcome.memPartGetsDuringCommit, 0, 'Post-commit verification must use store.count instead of reading chunk bodies back');
        assert.equal(outcome.staleConflictStatus, 'conflict', 'Stale memory baseline must still be rejected');
        assert.equal(outcome.deepMutationDetected, true, 'Deep in-place mutation inside sourceMemories must invalidate stamp cache');
        assert.equal(outcome.leakedPrivateKeysInBackup, false, 'Backup export must not expose internal __rp_mem__: keys');
        assert.equal(outcome.exportedMemoryEntry?.isArray, true);
        assert.ok(outcome.exportedMemoryEntry?.len >= 71, 'Compressed groups + newly summarized/compressed tail turns must be preserved');
        assert.equal(outcome.exportedMemoryEntry?.sampleUnknown, 'gmeta-1');
        assert.equal(outcome.exportedMemoryEntry?.leafUnknown, 'keep-1');
        assert.equal(outcome.remainingMemPartsAfterDelete, 0, 'Deleting memory scope must remove all __rp_mem__: chunk records');
        assert.equal(outcome.deletedTombstone, true);

        console.log('PASS: large memory chunking, incremental tail writes, cross-domain embedding preservation, CAS & cleanup');
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
