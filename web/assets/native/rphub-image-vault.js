/* Persistent image files are separate from the disposable browser image cache. */
(function () {
    'use strict';
    if (window.__rphubImageVaultLoaded) return;
    window.__rphubImageVaultLoaded = true;
    const local = () => window.RPLocalStore;
    const pending = new Map();
    const urls = new Map();
    let database;
    const open = () => database ||= new Promise((resolve, reject) => {
        const request = indexedDB.open('RPHubImageVaultV1', 1);
        request.onupgradeneeded = () => {
            const store = request.result.createObjectStore('images', { keyPath: 'k' });
            store.createIndex('g', 'g', { unique: false });
            store.createIndex('a', 'a', { unique: false });
            request.result.createObjectStore('meta', { keyPath: 'k' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => { database = null; reject(request.error); };
    });
    const transaction = async (mode, operation) => {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('images', mode);
            const request = operation(tx.objectStore('images'));
            tx.oncomplete = () => resolve(request?.result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('图片保存已中止'));
        });
    };
    const canonical = value => {
        const url = new URL(value, location.href);
        url.searchParams.delete('token');
        url.searchParams.delete('nocache');
        url.searchParams.sort();
        return url.href;
    };
    const legacyKey = value => {
        const url = new URL(value, location.href);
        const pairs = [...url.searchParams].filter(([name]) => name !== 'token' && name !== 'nocache');
        pairs.sort((a, b) => a[0].localeCompare(b[0]));
        return url.origin + url.pathname + '?' + pairs.map(pair => pair.join('=')).join('&');
    };
    const identity = (request, owner) => owner?.identity
        ? owner.identity + '\n' + (new URL(request, location.href).searchParams.get('tag') || '')
        : canonical(request);
    const blobUrl = (key, blob) => {
        if (!urls.has(key)) urls.set(key, URL.createObjectURL(blob));
        return urls.get(key);
    };
    async function compress(blob) {
        if (blob.size < 200 * 1024 || !/^image\/(png|jpeg)$/.test(blob.type)) return blob;
        let bitmap;
        try {
            bitmap = await createImageBitmap(blob);
            if (bitmap.width * bitmap.height > 20 * 1024 * 1024) return blob;
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            canvas.getContext('2d').drawImage(bitmap, 0, 0);
            const output = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.9));
            canvas.width = canvas.height = 0;
            return output && output.type === 'image/webp' && output.size < blob.size * 0.95 ? output : blob;
        } catch (_) { return blob; }
        finally { bitmap?.close(); }
    }
    async function lookup(request, owner) {
        const key = identity(request, owner);
        if (local()?.available) {
            const file = await local().findImage(key, owner);
            if (file) return file;
        }
        const record = await transaction('readonly', store => store.get(key))
            || await transaction('readonly', store => store.get(canonical(request)))
            || await transaction('readonly', store => store.get(legacyKey(request)));
        if (!record?.b) return null;
        const blob = record.compressed ? record.b : await compress(record.b);
        const file = await local()?.saveImage(key, blob, owner);
        if (file) {
            await transaction('readwrite', store => store.delete(record.k));
        } else if (!record.compressed || record.k !== key) {
            await transaction('readwrite', store => store.put({
                k: key, b: blob, n: blob.size, a: Date.now(), t: record.t || Date.now(),
                compressed: true, owner: owner?.uuid || '', g: record.g || '',
            }));
        }
        return file || { url: blobUrl(key, blob), bytes: blob.size };
    }
    function remember(request, source, owner) {
        const key = identity(request, owner);
        if (pending.has(key)) return pending.get(key);
        const task = (async () => {
            const saved = await lookup(request, owner);
            if (saved) return saved;
            const response = await fetch(source, { cache: 'force-cache' });
            if (!response.ok) throw new Error('图片下载失败：HTTP ' + response.status);
            let original = await response.blob();
            if (!original.type.startsWith('image/')) {
                const bytes = new Uint8Array(await original.slice(0, 16).arrayBuffer());
                const mime = bytes[0] === 137 && bytes[1] === 80 ? 'image/png'
                    : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg'
                    : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP' ? 'image/webp'
                    : String.fromCharCode(...bytes.slice(0, 3)) === 'GIF' ? 'image/gif' : '';
                if (!mime) throw new Error('返回内容不是可识别的图片');
                original = new Blob([original], { type: mime });
            }
            if (!original.size || original.size > 32 * 1024 * 1024) throw new Error('图片大小异常');
            const blob = await compress(original);
            const file = await local()?.saveImage(key, blob, owner);
            if (!file) await transaction('readwrite', store => store.put({
                k: key, b: blob, n: blob.size, a: Date.now(), t: Date.now(),
                compressed: true, owner: owner?.uuid || '', g: new URL(request).searchParams.get('tag') || '',
            }));
            return file || { url: blobUrl(key, blob), bytes: blob.size };
        })().finally(() => pending.delete(key));
        pending.set(key, task);
        return task;
    }
    async function restore(card, request, owner) {
        const saved = await lookup(request, owner);
        if (!saved || !card.isConnected) return false;
        const image = card.querySelector('img');
        if (!image) return false;
        image.src = saved.url;
        card.classList.remove('is-generating', 'is-waiting', 'is-generation-error');
        card.dataset.imageJobState = 'frozen';
        return true;
    }
    const markExpired = card => {
        card.classList.remove('is-generating', 'is-waiting');
        card.classList.add('is-generation-error');
        const label = card.querySelector('.generated-image-progress-label');
        if (label) label.textContent = '图片不可用，未自动重新生成';
    };
    document.addEventListener('error', event => {
        const image = event.target;
        if (image?.tagName !== 'IMG') return;
        const card = image.closest('.generated-image-card');
        if (!card || card.dataset.imageVaultTried === '1') return;
        card.dataset.imageVaultTried = '1';
        restore(card, card.dataset.imageRequest, card.__imageOwner)
            .then(found => { if (!found) markExpired(card); }).catch(() => markExpired(card));
    }, true);
    window.RPHubImageVault = Object.freeze({
        available: () => !!indexedDB,
        remember, restore, compress,
        attach: (card, request, owner) => restore(card, request, owner),
        resolve: async (request, owner) => {
            const item = await lookup(request, owner);
            if (!item) return null;
            return (await fetch(item.url)).blob();
        },
        stats: async () => ({ count: await transaction('readonly', store => store.count()), persistentFiles: !!local()?.available }),
        clear: () => transaction('readwrite', store => store.clear()),
    });
})();
