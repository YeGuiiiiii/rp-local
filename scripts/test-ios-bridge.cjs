const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = path.resolve(__dirname, '../ios/Resources/ios-bridge.js');
const load = (overrides = {}) => {
    const sent = [];
    const calls = [];
    const context = vm.createContext({
        URL, Request, Response, Headers, ReadableStream, Uint8Array, ArrayBuffer,
        DOMException, AbortController, TextEncoder, TextDecoder, btoa, atob,
        crypto: require('node:crypto').webcrypto,
        location: { href: 'rplocal://localhost/RP-Hub/' },
        fetch: async () => new Response('original'),
        prompt: (_, message) => {
            calls.push(JSON.parse(message));
            return JSON.stringify({ ok: true, value: 'native-result' });
        },
        webkit: { messageHandlers: { rpNetwork: { postMessage: message => sent.push(message) } } },
    });
    Object.assign(context, overrides);
    context.window = context;
    vm.runInContext(fs.readFileSync(source, 'utf8'), context);
    return { context, sent, calls, receive: message => context.__rpReceiveNetwork(message) };
};

test('storage preserves the existing Android JSON contract; app methods unwrap it', () => {
    const { context, calls } = load();
    assert.deepEqual(JSON.parse(context.RPLocalFiles.readText('个人数据/设置.json')), {
        ok: true, value: 'native-result',
    });
    assert.equal(context.AndroidBridge.saveFile('e30=', 'backup.json', 'application/json'), 'native-result');
    assert.equal(calls[0].scope, 'files');
    assert.equal(calls[0].method, 'readText');
    assert.deepEqual(calls[0].args, ['个人数据/设置.json']);
    assert.equal(calls[1].scope, 'app');
    context.prompt = () => JSON.stringify({ ok: false, error: 'Disk full' });
    assert.throws(() => context.AndroidBridge.saveFile('', 'x.json', ''), /Disk full/);
});

test('HTTP responses stream before completion and preserve split UTF-8 bytes', async () => {
    const { context, sent, receive } = load();
    const responsePromise = context.fetch('https://api.example.test/chat', {
        method: 'POST', headers: { Authorization: 'Bearer fake-key' }, body: '{"test":true}',
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(sent.length, 1);
    const { id } = sent[0];
    assert.equal(sent[0].method, 'POST');
    assert.equal(sent[0].headers.authorization, 'Bearer fake-key');
    assert.equal(atob(sent[0].body), '{"test":true}');
    receive({ id, type: 'response', status: 200, headers: { 'content-type': 'text/event-stream' },
        url: 'https://api.example.test/chat' });
    const response = await responsePromise;
    assert.equal(response.url, 'https://api.example.test/chat');
    const reader = response.body.getReader();
    receive({ id, type: 'data', data: Buffer.from([0xe4, 0xbd]).toString('base64') });
    const first = await reader.read();
    assert.deepEqual(Array.from(first.value), [0xe4, 0xbd]);
    receive({ id, type: 'data', data: Buffer.from([0xa0]).toString('base64') });
    const second = await reader.read();
    assert.equal(new TextDecoder().decode(new Uint8Array([...first.value, ...second.value])), '你');
    receive({ id, type: 'end' });
    assert.equal((await reader.read()).done, true);
});

test('abort rejects fetch before headers and cancels the native task', async () => {
    const { context, sent } = load();
    const controller = new AbortController();
    const request = context.fetch('https://api.example.test/chat', { signal: controller.signal });
    await new Promise(resolve => setImmediate(resolve));
    controller.abort();
    await assert.rejects(request, { name: 'AbortError' });
    assert.equal(sent[1].cancel, sent[0].id);
});

test('abort after headers errors the body; late native events are ignored', async () => {
    const { context, sent, receive } = load();
    const controller = new AbortController();
    const request = context.fetch('https://api.example.test/chat', { signal: controller.signal });
    await new Promise(resolve => setImmediate(resolve));
    const { id } = sent[0];
    receive({ id, type: 'response', status: 200, headers: {} });
    const response = await request;
    controller.abort();
    await assert.rejects(response.text(), { name: 'AbortError' });
    assert.doesNotThrow(() => receive({ id, type: 'data', data: 'eA==' }));
});

test('HTTP errors remain readable responses and transport errors reject', async () => {
    const { context, sent, receive } = load();
    const request = context.fetch('https://api.example.test/chat');
    await new Promise(resolve => setImmediate(resolve));
    const { id } = sent[0];
    receive({ id, type: 'response', status: 401, headers: {} });
    receive({ id, type: 'data', data: Buffer.from('bad key').toString('base64') });
    receive({ id, type: 'end' });
    const response = await request;
    assert.equal(response.ok, false);
    assert.equal(await response.text(), 'bad key');
    const failure = context.fetch('https://api.example.test/chat');
    await new Promise(resolve => setImmediate(resolve));
    receive({ id: sent[1].id, type: 'error', error: 'Connection lost' });
    await assert.rejects(failure, /Connection lost/);
});

test('local resources and blobs use WebKit fetch, while HEAD has no response body', async () => {
    const { context, sent, receive } = load();
    assert.equal(await (await context.fetch('blob:example')).text(), 'original');
    assert.equal(await (await context.fetch('assets/example.json')).text(), 'original');
    assert.equal(sent.length, 0);
    const request = context.fetch('https://api.example.test/chat', { method: 'HEAD' });
    await new Promise(resolve => setImmediate(resolve));
    receive({ id: sent[0].id, type: 'response', status: 200, headers: {} });
    const response = await request;
    assert.equal(response.body, null);
    receive({ id: sent[0].id, type: 'end' });
});

test('a pre-aborted request never starts native networking', async () => {
    const { context, sent } = load();
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(context.fetch('https://api.example.test/', { signal: controller.signal }),
        { name: 'AbortError' });
    assert.equal(sent.length, 0);
});

test('SHA-256 fallback respects typed-array offsets on nonsecure custom origins', async () => {
    const calls = [];
    const { context } = load({
        crypto: { getRandomValues: bytes => require('node:crypto').randomFillSync(bytes) },
        prompt: (_, message) => {
            calls.push(JSON.parse(message));
            return JSON.stringify({ ok: true,
                value: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' });
        },
    });
    const input = new Uint8Array([0, 97, 98, 99, 0]).subarray(1, 4);
    const digest = await context.crypto.subtle.digest('SHA-256', input);
    assert.equal(Buffer.from(digest).toString('hex'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    assert.deepEqual(calls[0], { scope: 'crypto', method: 'sha256', args: [[97, 98, 99]] });
    assert.match(context.crypto.randomUUID(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    await assert.rejects(context.crypto.subtle.digest('SHA-1', input), /Only SHA-256/);
});

test('ordinary browsers receive no iOS bridge', async () => {
    const { context, sent } = load({ webkit: undefined });
    assert.equal(context.RPLocalFiles, undefined);
    assert.equal(await (await context.fetch('https://api.example.test/')).text(), 'original');
    assert.equal(sent.length, 0);
});

test('cancelling a response reader cancels native networking without accepting late data', async () => {
    const { context, sent, receive } = load();
    const request = context.fetch('https://api.example.test/chat');
    await new Promise(resolve => setImmediate(resolve));
    const { id } = sent[0];
    receive({ id, type: 'response', status: 200, headers: {} });
    const reader = (await request).body.getReader();
    await reader.cancel();
    assert.equal(sent[1].cancel, id);
    assert.doesNotThrow(() => receive({ id, type: 'data', data: 'eA==' }));
    assert.equal((await reader.read()).done, true);
});
