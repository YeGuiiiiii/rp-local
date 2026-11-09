(function () {
    'use strict';
    const safeName = value => String(value || 'RP图片').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 70);
    const notify = (message, error = false) => {
        window.dispatchEvent(new CustomEvent('rp:notice', { detail: { message, error } }));
    };
    const toBase64 = blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
        reader.readAsDataURL(blob);
    });
    const normalize = async blob => {
        if (!blob?.size) throw new Error('图片内容为空');
        const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
        const text = (start, end) => String.fromCharCode(...bytes.slice(start, end));
        const type = bytes[0] === 137 && text(1, 4) === 'PNG' ? 'image/png'
            : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg'
            : text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP' ? 'image/webp'
            : text(0, 3) === 'GIF' ? 'image/gif' : '';
        if (!type) throw new Error('返回内容不是 PNG、JPEG、WebP 或 GIF 图片');
        return blob.type === type ? blob : new Blob([blob], { type });
    };
    async function bytesFrom(source, image) {
        if (source instanceof Blob) return normalize(source);
        let url = new URL(String(source || ''), location.href);
        const prefix = '/RP-Hub/_files/';
        if (url.origin === location.origin && url.pathname.startsWith(prefix)
            && typeof window.RPLocalFiles?.readImage === 'function') {
            const result = JSON.parse(window.RPLocalFiles.readImage(decodeURIComponent(url.pathname.slice(prefix.length))));
            if (!result.ok) throw new Error(result.error || '本地图片读取失败');
            const binary = atob(result.value.base64);
            return normalize(new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: result.value.mime }));
        }
        if (!['http:', 'https:', 'blob:', 'data:'].includes(url.protocol)) throw new Error('图片地址不受支持');
        // A generation URL must never be requested just to save an existing image.
        if (/\/(?:generate|api\/jobs)\/?$/.test(url.pathname)) throw new Error('这是生图任务地址，请等待图片生成完成');
        const request = image?.closest?.('.generated-image-card')?.dataset.imageRequest;
        if (request) {
            const job = new URL(request, location.href);
            const token = job.searchParams.get('token');
            if (job.origin === url.origin && token && !url.searchParams.has('token')) url.searchParams.set('token', token);
        }
        const response = await fetch(url.href, { cache: 'force-cache', signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`图片读取失败（HTTP ${response.status}），未重新生图`);
        return normalize(await response.blob());
    }
    async function save(source, options = {}) {
        const image = source instanceof HTMLImageElement ? source : null;
        const card = image?.closest('.generated-image-card');
        let blob;
        if (card && window.RPHubImageVault) {
            blob = await window.RPHubImageVault.resolve(card.dataset.imageRequest, card.__imageOwner);
        }
        blob = await normalize(blob || await bytesFrom(image ? image.currentSrc || image.src : source, image));
        const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[blob.type];
        const name = safeName(options.name) + '-' + Date.now() + '.' + extension;
        const bridge = window.AndroidBridge;
        if (typeof bridge?.saveImageToGallery === 'function') {
            bridge.saveImageToGallery(await toBase64(blob), name, blob.type);
            notify('已提交保存到系统相册');
        } else {
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = name;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
            notify('已开始下载图片');
        }
        return { name, type: blob.type, bytes: blob.size };
    }
    window.RPImageDownload = Object.freeze({
        save,
        request: image => window.dispatchEvent(new CustomEvent('rp:image-download', { detail: image })),
        run: (source, options) => save(source, options).catch(error => {
            notify(error.message || '图片保存失败', true);
            throw error;
        })
    });
})();
