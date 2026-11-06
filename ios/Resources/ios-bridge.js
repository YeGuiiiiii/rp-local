(function () {
    'use strict';
    if (!window.webkit?.messageHandlers?.rpNetwork) return;
    const call = (scope, method, args) => window.prompt('__RP_IOS__', JSON.stringify({ scope, method, args }));
    const appCall = (method, ...args) => {
        const result = JSON.parse(call('app', method, args));
        if (!result?.ok) throw new Error(result?.error || 'iOS operation failed');
        return result.value;
    };
    window.RPLocalFiles = Object.fromEntries([
        'readText', 'writeText', 'writeTextIfChanged', 'readImage', 'writeImage',
        'exists', 'list', 'remove', 'locations', 'consumeReleaseNotice', 'runtimeInfo',
    ].map(method => [method, (...args) => call('files', method, args)]));
    window.AndroidBridge = Object.fromEntries([
        'saveFile', 'saveImageToGallery', 'openLighthouse',
        'createBackupFile', 'createBackupFileToDownloads', 'writeBackupChunk',
        'finishBackupWrite', 'abortBackupWrite', 'listBackupFiles', 'readBackupFileText',
        'deleteBackupFile', 'renameBackupFile', 'getBackupFolder', 'getDefaultBackupFolderPath',
    ].map(method => [method, (...args) => appCall(method, ...args)]));
    window.AndroidBridge.isNativeApp = () => true;
    if (!crypto.randomUUID) {
        crypto.randomUUID = () => {
            const bytes = crypto.getRandomValues(new Uint8Array(16));
            bytes[6] = (bytes[6] & 15) | 64;
            bytes[8] = (bytes[8] & 63) | 128;
            const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
            return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
        };
    }
    if (!crypto.subtle) {
        Object.defineProperty(crypto, 'subtle', { value: {
            digest: async (algorithm, bytes) => {
                if (String(algorithm?.name || algorithm).toUpperCase() !== 'SHA-256')
                    throw new Error('Only SHA-256 is supported');
                const view = ArrayBuffer.isView(bytes)
                    ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) : new Uint8Array(bytes);
                const result = JSON.parse(call('crypto', 'sha256', [Array.from(view)]));
                if (!result?.ok) throw new Error(result?.error || 'SHA-256 failed');
                return Uint8Array.from(result.value.match(/../g), part => parseInt(part, 16)).buffer;
            },
        } });
    }
    const originalFetch = window.fetch.bind(window);
    const pending = new Map();
    const send = message => window.webkit.messageHandlers.rpNetwork.postMessage(message);
    const decode = encoded => Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const encode = buffer => {
        const bytes = new Uint8Array(buffer);
        let text = '';
        for (let i = 0; i < bytes.length; i += 32768)
            text += String.fromCharCode(...bytes.subarray(i, i + 32768));
        return btoa(text);
    };
    let sequence = 0;
    window.__rpReceiveNetwork = message => {
        const entry = pending.get(message.id);
        if (!entry) return;
        try {
            if (message.type === 'response') {
                const noBody = entry.method === 'HEAD' || [204, 205, 304].includes(message.status);
                const response = new Response(noBody ? null : entry.stream, {
                    status: message.status, headers: message.headers,
                });
                Object.defineProperty(response, 'url', { value: message.url || entry.url });
                Object.defineProperty(response, 'redirected', { value: !!message.url && message.url !== entry.url });
                entry.resolve(response);
            } else if (message.type === 'data') {
                entry.controller.enqueue(decode(message.data));
            } else if (message.type === 'end') {
                entry.controller.close();
                entry.cleanup();
            } else if (message.type === 'error') {
                entry.fail(new TypeError(message.error || 'Network request failed'));
            }
        } catch (error) { entry.fail(error); }
    };
    window.fetch = async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : input, location.href);
        if (!/^https?:$/.test(url.protocol)) return originalFetch(input, init);
        const request = new Request(input instanceof Request ? input : url.href, init);
        const signal = request.signal;
        signal.throwIfAborted();
        const body = request.body ? encode(await request.arrayBuffer()) : null;
        signal.throwIfAborted();
        const id = String(++sequence);
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                signal.removeEventListener('abort', abort);
                pending.delete(id);
            };
            const abort = () => {
                send({ cancel: id });
                entry.fail(signal.reason || new DOMException('Aborted', 'AbortError'));
            };
            let controller;
            const stream = new ReadableStream({
                start: value => { controller = value; },
                cancel: () => { send({ cancel: id }); cleanup(); },
            });
            const entry = {
                resolve, stream, controller, method: request.method, url: request.url, cleanup,
                fail: error => {
                    if (!pending.has(id)) return;
                    reject(error);
                    entry.controller.error(error);
                    cleanup();
                },
            };
            pending.set(id, entry);
            signal.addEventListener('abort', abort, { once: true });
            try {
                send({ id, url: request.url, method: request.method, headers: Object.fromEntries(request.headers), body });
            } catch (error) { entry.fail(error); }
        });
    };
})();
