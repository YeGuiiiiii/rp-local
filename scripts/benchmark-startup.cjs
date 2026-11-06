const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const option = (name, fallback) => {
    const index = process.argv.indexOf('--' + name);
    return index < 0 ? fallback : process.argv[index + 1];
};
const backup = path.resolve(option('backup', ''));
assert.ok(fs.statSync(backup).isFile(), 'Pass --backup with a local exported JSON file');
const rate = Number(option('rate', 4));
const count = Number(option('runs', 3));
const output = path.join(root, 'verification/startup-backup');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const revision = option('revision');
    const previous = new Map();
    if (revision) {
        const changed = execFileSync('git', ['diff', '--name-only', revision, '--', 'web'], { cwd: root, encoding: 'utf8' });
        for (const name of changed.trim().split('\n').filter(Boolean)) {
            previous.set(path.resolve(root, name),
                execFileSync('git', ['show', `${revision}:${name}`], { cwd: root, maxBuffer: 16 * 1024 * 1024 }));
        }
    }
    // Stream the large fixture over HTTP; DevTools messages have a 100 MB limit.
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/seed') {
            res.setHeader('Content-Type', 'text/html');
            return res.end('<!doctype html><body></body>');
        }
        const file = url.pathname === '/benchmark-backup.json' ? backup
            : path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
        if (file !== backup && (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())) {
            res.statusCode = 404;
            return res.end();
        }
        res.setHeader('Content-Type', ({
            '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css',
            '.webp': 'image/webp', '.json': 'application/json'
        })[path.extname(file)] || 'application/octet-stream');
        if (previous.has(file)) res.end(previous.get(file));
        else fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const errors = [];
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return url.origin === origin ? route.continue() : route.abort();
    });
    try {
        const seed = await context.newPage();
        await seed.goto(origin + '/seed');
        await seed.addScriptTag({ path: path.join(web, 'assets/js/stream-import.js') });
        const fixture = await seed.evaluate(async () => {
            const data = await (await fetch('/benchmark-backup.json')).json();
            const entries = data.entries;
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open('RPHubDB', 2);
                req.onupgradeneeded = () => {
                    req.result.createObjectStore('store');
                    RPStreamImport.upgrade(req.result);
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            await new Promise((resolve, reject) => {
                const tx = db.transaction('store', 'readwrite');
                for (const { key, value } of entries) tx.objectStore('store').put(value, key);
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
            });
            db.close();
            for (const [key, value] of Object.entries(data.webStorage?.localStorage || {}))
                localStorage.setItem(key, String(value));
            const cards = entries.find(entry => entry.key === 'rp_hub_characters').value;
            window.__benchmarkFiles = {};
            const digest = async value => [...new Uint8Array(await crypto.subtle.digest(
                'SHA-256', new TextEncoder().encode(JSON.stringify(value))
            ))].map(byte => byte.toString(16).padStart(2, '0')).join('');
            window.__benchmarkChecks = await Promise.all(entries.filter(entry =>
                /^rp_hub_(chat_|classic_memories_|worldinfo$|global_worldinfo$|characters$)/.test(entry.key)
            ).map(async entry => ({ key: entry.key, hash: await digest(entry.value) })));
            return {
                bytes: JSON.stringify(data).length, entries: entries.length, cards: cards.length,
                worldInfo: cards.reduce((sum, card) => sum + (card.worldInfo?.length || 0), 0),
                expectedActiveId: entries.find(entry => entry.key === 'rp_hub_last_active_char_id')?.value,
                chatRecords: entries.filter(entry => entry.key.startsWith('rp_hub_chat_')).length
            };
        });
        // Keep simulated disk files across navigations without localStorage's size limit.
        await context.addInitScript(() => {
            const set = Storage.prototype.setItem;
            Storage.prototype.setItem = function (key, value) {
                if (key !== '__qa_native_files') return set.call(this, key, value);
            };
        });
        if (!process.argv.includes('--no-files'))
            await context.addInitScript(installFiles, { skin: null, persistFiles: false });
        await context.addInitScript(() => {
            if (!window.opener) return;
            if (window.__qaNativeFiles) {
                Object.assign(__qaNativeFiles, window.opener.__benchmarkFiles);
                window.opener.__benchmarkFiles = __qaNativeFiles;
            }
            window.__bootStats = { calls: {}, bytes: 0, bridgeMs: 0, stringifyMs: 0 };
            let ready = false;
            Object.defineProperty(window, '__rpDataReady', {
                get: () => ready,
                set: value => { ready = value; if (value) __bootStats.dataReadyMs = performance.now(); }
            });
            for (const method of ['readText', 'writeTextIfChanged', 'writeText', 'remove']) {
                const original = window.RPLocalFiles?.[method];
                if (!original) continue;
                RPLocalFiles[method] = (...args) => {
                    const start = performance.now();
                    const result = original(...args);
                    __bootStats.bridgeMs += performance.now() - start;
                    __bootStats.calls[method] = (__bootStats.calls[method] || 0) + 1;
                    if (method.startsWith('writeText')) __bootStats.bytes += args[1].length;
                    return result;
                };
            }
            const stringify = JSON.stringify;
            JSON.stringify = function (...args) {
                const start = performance.now();
                const result = stringify.apply(this, args);
                __bootStats.stringifyMs += performance.now() - start;
                return result;
            };
            window.addEventListener('rp:startup-finished', () => {
                __bootStats.interactiveMs = performance.now();
            }, { once: true });
        });
        const popup = seed.waitForEvent('popup');
        await seed.evaluate(() => window.open('/seed'));
        const page = await popup;
        page.on('pageerror', error => errors.push(error.message));
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });
        const runs = [];
        for (let i = 0; i <= count; i++) {
            if (process.argv.includes('--profile') && i === 1) {
                await cdp.send('Profiler.enable');
                await cdp.send('Profiler.start');
            }
            await page.goto(origin + '/RP-Hub/', { waitUntil: 'domcontentloaded', timeout: 180000 });
            await page.waitForFunction(() => window.__rpDataReady || window.__rpDataError, null, { timeout: 180000 });
            assert.equal(await page.evaluate(() => !!window.__rpDataError), false, 'Backup must load');
            const readyMs = await page.evaluate(() => performance.now());
            await page.waitForFunction(() => __bootStats.interactiveMs && !document.querySelector('.entry-transition'), null, { timeout: 180000 });
            const run = await page.evaluate(() => {
                const state = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
                return {
                    ...__bootStats, visibleMs: performance.now(), cards: state.characters.length,
                    activeId: state.currentCharacter?.uuid, messages: state.chatHistory.length,
                    worldInfo: state.worldInfo.length, view: state.currentView
                };
            });
            assert.equal(run.cards, fixture.cards);
            if (fixture.expectedActiveId) assert.equal(run.activeId, fixture.expectedActiveId);
            runs.push({ kind: i === 0 ? 'firstMigration' : 'reopen', readyMs, ...run });
            console.log(JSON.stringify(runs.at(-1)));
            if (process.argv.includes('--profile') && i === 1) {
                const { profile } = await cdp.send('Profiler.stop');
                const times = new Map(), nodes = new Map(profile.nodes.map(node => [node.id, node]));
                profile.samples.forEach((id, index) => {
                    const frame = nodes.get(id).callFrame;
                    const key = `${frame.url.split('/').pop()}:${frame.lineNumber + 1} ${frame.functionName}`;
                    times.set(key, (times.get(key) || 0) + profile.timeDeltas[index] / 1000);
                });
                runs.at(-1).cpuSelfMs = [...times].sort((a, b) => b[1] - a[1]).slice(0, 25);
            }
            await page.evaluate(async () => { await RPLocalStore.flush(); });
            await page.evaluate(async () => {
                const db = RPHubStorage.getMainDb();
                for (const expected of window.opener.__benchmarkChecks) {
                    const value = await new Promise((resolve, reject) => {
                        const request = db.transaction('store').objectStore('store').get(expected.key);
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => reject(request.error);
                    });
                    const hash = [...new Uint8Array(await crypto.subtle.digest(
                        'SHA-256', new TextEncoder().encode(JSON.stringify(value))
                    ))].map(byte => byte.toString(16).padStart(2, '0')).join('');
                    if (hash !== expected.hash) throw new Error('Startup changed saved content: ' + expected.key);
                }
            });
        }
        assert.deepEqual(errors, []);
        const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
        const report = {
            environment: `Desktop Edge, CPU ${rate}x slower, simulated synchronous file bridge. Not Android timing.`,
            revision: revision || 'working-tree',
            backupBytes: fs.statSync(backup).size, fixture, runs, errors,
            savedContentVerified: true,
            medianInteractiveMs: median(runs.slice(1).map(run => run.interactiveMs)),
            medianVisibleMs: median(runs.slice(1).map(run => run.visibleMs))
        };
        fs.writeFileSync(path.join(output, option('label', 'latest') + '.json'), JSON.stringify(report, null, 2));
        console.log('Median visible ms:', report.medianVisibleMs);
        if (option('budget')) assert.ok(report.medianVisibleMs < Number(option('budget')), 'Startup exceeds budget');
    } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
