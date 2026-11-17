const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const crypto = require('node:crypto'), zlib = require('node:zlib');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { chromium } = require('./playwright.cjs');
const web = path.resolve(__dirname, '../web'), MB = 1048576;
const key = '123456789ABCDEFG', scope = 'cloud-long';
const card = Buffer.from(JSON.stringify({ uuid: scope, name: 'Long chat' }));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const descriptor = bytes => ({ hash: hash(bytes), size: bytes.length });
const cardPiece = descriptor(card);
let fixture, chatPiece, mode = '', sent = 0;
function* parts() {
    if (mode === 'syntax') { yield Buffer.from('[{"content":}]'); return; }
    if (mode === 'object') { yield Buffer.from('{"content":"not an array"}'); return; }
    yield Buffer.from('[');
    for (let i = 0; i < fixture.count; i++) {
        if (i) yield Buffer.from(',');
        yield Buffer.from(JSON.stringify({ id: i, role: 'assistant', content: fixture.content, extension: { keep: '原样🌕' } }));
    }
    yield Buffer.from(']');
}
function prepare(count, bytes) {
    fixture = { count, content: 'x'.repeat(bytes) };
    const digest = crypto.createHash('sha256');
    let size = 0;
    for (const chunk of parts()) { digest.update(chunk); size += chunk.length; }
    chatPiece = { hash: digest.digest('hex'), size };
}
(async () => {
    const server = http.createServer(async (req, res) => {
        try {
            if (req.url === `/v1/backup/${key}`) {
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ characters: [{ uuid: scope, name: 'Long chat', ...cardPiece,
                    entries: [{ name: 'chat', id: scope, ...chatPiece,
                        ...(mode === 'short-size' ? { size: chatPiece.size - 1 } : {}),
                        ...(mode === 'long-size' ? { size: chatPiece.size + 1 } : {}),
                        ...(mode === 'hash' ? { hash: '0'.repeat(64) } : {}) }] }] }));
            }
            if (req.url.startsWith(`/v1/backup/${key}/blobs/`)) {
                if (req.url.endsWith(cardPiece.hash)) return res.end(card);
                sent++;
                res.setHeader('Content-Encoding', 'gzip');
                if (mode === 'gzip') return res.end('broken gzip');
                const output = zlib.createGzip();
                output.pipe(res);
                res.on('close', () => output.destroy());
                for (const chunk of parts()) {
                    if (output.destroyed) return;
                    if (!output.write(chunk)) await once(output, 'drain');
                }
                return output.end();
            }
            const pathname = req.url.split('?')[0].replace(/^\/RP-Hub/, '');
            const file = path.resolve(web, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
                res.writeHead(404); return res.end();
            }
            res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream');
            fs.createReadStream(file).pipe(res);
        } catch (error) { if (!res.destroyed) res.destroy(error); }
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await context.addInitScript(() => localStorage.setItem('rp-local-release-shown', '999999'));
    try {
        await page.goto(origin + '/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(origin => document.querySelector('meta[name="rphub-update-api"]').content = origin, origin);
        await page.addScriptTag({ path: path.join(web, 'assets/js/cloud-backup.js') });
        await page.evaluate(async () => {
            const qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            qa.showUserSetupModal = false;
            // A whole-response conversion would reintroduce multiple copies of a long chat.
            for (const name of ['text', 'json', 'arrayBuffer']) {
                const original = Response.prototype[name];
                Response.prototype[name] = function (...args) {
                    if (this.url.includes('/blobs/') && !this.url.endsWith(window.__cardHash))
                        throw new Error('Long chat must be decoded incrementally');
                    return original.apply(this, args);
                };
            }
            for (const name of ['text', 'arrayBuffer']) {
                const original = Blob.prototype[name];
                Blob.prototype[name] = function (...args) {
                    if (this.size > 64 * 1048576) throw new Error('Long chat must not be copied as a whole');
                    return original.apply(this, args);
                };
            }
            window.__cloudTest = RPHubCloudBackup.useCloudBackup({
                saveAll: async () => ({ ok: true }), decode: value => value, toast() {},
                transfer: { start() {}, progress(value) { window.__progress = value; }, finish() {},
                    fail(error) { window.__failure = error.message; } }
            });
        });
        await page.evaluate(hash => { window.__cardHash = hash; }, cardPiece.hash);
        async function start(profile) {
            await page.evaluate(async ({ scope, key, profile }) => {
                localStorage.setItem('rp-backup-profile', profile);
                await RPHubStorage.setScopedStoredValue('chat', scope, [{ content: 'original' }]);
                window.__failure = '';
                __cloudTest.openCloudBackup('download');
                __cloudTest.cloudBackup.restoreKey = key;
                __cloudTest.startCloudRestore();
            }, { scope, key, profile });
            await page.waitForFunction(() => !!window.__failure || window.__progress?.label === '恢复完成，正在刷新页面',
                null, { timeout: 180000 });
        }
        for (const failure of ['hash', 'short-size', 'long-size', 'syntax', 'gzip', 'unit', 'object']) {
            mode = failure;
            prepare(2, failure === 'unit' ? 17 * MB : 65536);
            await start('light');
            const error = await page.evaluate(() => window.__failure);
            assert.ok(error, failure + ' must fail');
            if (failure === 'unit') assert.match(error, /16 MB/, 'Reject an oversized message using the selected profile');
            if (failure === 'hash' || failure === 'long-size') assert.match(error, /校验失败/);
            if (failure === 'short-size') assert.match(error, /大小异常/);
            if (failure === 'object') assert.match(error, /聊天内容不完整/);
            assert.equal(await page.evaluate(async scope => (await RPHubStorage.getScopedStoredValue('chat', scope))[0].content, scope),
                'original', failure + ' must preserve the original chat');
            assert.equal(await page.evaluate(async () => {
                const db = await RPHubStorage.initDB();
                return new Promise(resolve => { const req = db.transaction('restore_sessions').objectStore('restore_sessions').count();
                    req.onsuccess = () => resolve(req.result); });
            }), 0, 'Failed staging must be removed');
        }
        mode = '';
        prepare(516, 256 * 1024);
        assert.ok(chatPiece.size > 128 * MB);
        await start('balanced');
        assert.equal(await page.evaluate(() => window.__failure), '', 'A valid chat over 128 MiB must restore in balanced mode');
        const result = await page.evaluate(async scope => {
            const chat = await RPHubStorage.getScopedStoredValue('chat', scope);
            return { count: chat.length, first: chat[0].id, last: chat.at(-1).id, length: chat.at(-1).content.length,
                extension: chat.at(-1).extension.keep };
        }, scope);
        assert.deepEqual(result, { count: 516, first: 0, last: 515, length: 262144, extension: '原样🌕' });
        console.log(JSON.stringify({ largeChatBytes: chatPiece.size, result, failureRollbackCases: 7, downloads: sent }));
    } finally {
        await browser.close();
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
