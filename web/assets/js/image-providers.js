(function () {
    'use strict';
    const detectProtocol = address => /\/ai\/generate-image\/?$/i.test(String(address).trim()) ? 'novelai'
        : /\/images\/generations\/?$/i.test(String(address).trim()) ? 'openai'
        : /\/api\/jobs\/?$/i.test(String(address).trim()) ? 'jobs' : '';
    const file = '个人数据/生图接口.json';
    const native = (method, ...args) => {
        const result = JSON.parse(window.RPLocalFiles[method](...args));
        if (!result.ok) throw new Error(result.error || '生图接口保存失败');
        return result.value;
    };
    // Browser previews use a separate database; player backup imports never replace connection credentials.
    const browserStore = (mode, value) => new Promise((resolve, reject) => {
        const request = indexedDB.open('RPLocalImageProviders', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('config');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result, tx = db.transaction('config', mode);
            const entry = mode === 'readonly' ? tx.objectStore('config').get('providers')
                : tx.objectStore('config').put(value, 'providers');
            tx.oncomplete = () => { db.close(); resolve(entry.result); };
            tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || new Error('生图接口保存失败')); };
        };
    });
    function create(baseUrl) {
        let pending = Promise.resolve();
        let modelController, modelTimer;
        const api = Vue.reactive({
            ready: false, error: '', selectedId: 'builtin', models: [], modelsLoading: false, modelsError: '',
            profiles: [{ id: 'builtin', name: '默认站点（STA1N）', protocol: 'jobs', url: baseUrl, key: '', model: '', size: 'auto' }],
            get current() { return this.profiles.find(item => item.id === this.selectedId) || this.profiles[0]; },
            async load(legacyKey) {
                try {
                    const saved = window.RPLocalFiles ? JSON.parse(native('readText', file) || 'null')
                        : await browserStore('readonly');
                    if (saved) {
                        if (!Array.isArray(saved.profiles) || !saved.profiles.some(item => item.id === 'builtin')
                            || saved.profiles.some(item => !item || !['jobs', 'openai', 'novelai'].includes(item.protocol)
                                || ['id', 'name', 'url', 'key', 'model', 'size'].some(key => typeof item[key] !== 'string'))) {
                            throw new Error('生图接口记录损坏，请保留数据并重试');
                        }
                        api.profiles = saved.profiles;
                        api.profiles.forEach(provider => { provider.protocol = detectProtocol(provider.url) || provider.protocol; });
                        api.selectedId = api.profiles.some(item => item.id === saved.selectedId) ? saved.selectedId : 'builtin';
                    } else api.current.key = String(legacyKey || '');
                    api.ready = true;
                    if (!saved && legacyKey) await save();
                } catch (error) { api.error = error.message; }
            },
            select(id) {
                if (!api.ready || !api.profiles.some(item => item.id === id)) return;
                api.selectedId = id;
                return save();
            },
            add() {
                if (!api.ready) return;
                const profile = { id: crypto.randomUUID(), name: '自定义接口', protocol: 'openai',
                    url: '', key: '', model: '', size: 'auto' };
                api.profiles.push(profile);
                api.selectedId = profile.id;
                return save();
            },
            update(field, value) {
                if (!api.ready || !['name', 'protocol', 'url', 'key', 'model', 'size'].includes(field)) return;
                if (field === 'protocol' && !['jobs', 'openai', 'novelai'].includes(value)) return;
                api.current[field] = String(value);
                if (field === 'url') api.current.protocol = detectProtocol(value) || api.current.protocol;
                return save();
            },
            remove() {
                if (!api.ready || api.selectedId === 'builtin') return;
                api.profiles = api.profiles.filter(item => item.id !== api.selectedId);
                api.selectedId = 'builtin';
                return save();
            },
            endpoint(provider = api.current) {
                const url = new URL(provider.url.trim());
                if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
                    throw new Error('请填写有效的生图 API 地址，不要包含密钥或查询参数');
                let address = url.href.replace(/\/+$/, '');
                if (provider.protocol === 'openai') {
                    if (url.pathname === '/') address += '/v1/images/generations';
                    else if (!address.endsWith('/images/generations')) address += '/images/generations';
                }
                if (provider.protocol === 'novelai' && !address.endsWith('/ai/generate-image')) address += '/ai/generate-image';
                if (provider.protocol === 'jobs') address = address.replace(/\/api\/jobs$/i, '');
                return address;
            },
            async fetchModels() {
                modelController?.abort();
                const controller = modelController = new AbortController();
                const provider = { ...api.current };
                api.modelsError = '';
                if (provider.protocol !== 'openai') return;
                api.modelsLoading = true;
                const timer = setTimeout(() => controller.abort(), 15000);
                try {
                    const endpoint = api.endpoint(provider).replace(/\/images\/generations$/, '/models');
                    const response = await fetch(endpoint, { signal: controller.signal,
                        headers: provider.key.trim() ? { Authorization: 'Bearer ' + provider.key.trim() } : {} });
                    const payload = await response.json();
                    if (!response.ok) throw new Error(payload.error?.message || 'HTTP ' + response.status);
                    const models = [...new Set((Array.isArray(payload.data) ? payload.data : [])
                        .map(item => item?.id).filter(id => typeof id === 'string' && id.trim()))];
                    if (modelController === controller) {
                        api.models = models;
                        if (!models.length) api.modelsError = '此接口未返回模型列表，可手动填写';
                    }
                } catch (error) {
                    if (modelController === controller)
                        api.modelsError = '模型列表读取失败，可手动填写或重试';
                } finally {
                    clearTimeout(timer);
                    if (modelController === controller) api.modelsLoading = false;
                }
            },
            flush: () => pending
        });
        Vue.watch(() => [api.ready, api.selectedId, api.current.url, api.current.key, api.current.protocol], () => {
            clearTimeout(modelTimer);
            modelController?.abort();
            modelController = null;
            api.models = [];
            api.modelsError = '';
            api.modelsLoading = false;
            if (api.ready && api.current.protocol === 'openai' && api.current.url.trim())
                modelTimer = setTimeout(() => api.fetchModels(), 600);
        });
        function save() {
            const snapshot = JSON.parse(JSON.stringify({ selectedId: api.selectedId, profiles: api.profiles }));
            try {
                if (window.RPLocalFiles) {
                    native('writeTextIfChanged', file, JSON.stringify(snapshot));
                    pending = Promise.resolve();
                } else pending = pending.catch(() => {}).then(() => browserStore('readwrite', snapshot));
            } catch (error) { pending = Promise.reject(error); }
            return pending.then(() => { api.error = ''; return true; }, error => {
                api.error = '生图接口未保存，请重试：' + error.message;
                return false;
            });
        }
        return api;
    }
    const generateNovelImage = async (provider, params) => {
        const input = [params.tag, params.artist].filter(Boolean).join(', ');
        const size = provider.size.trim() === 'auto' || !provider.size.trim() ? params.size : provider.size.trim();
        let [width, height] = /横/.test(size) ? [1216, 832] : /方/.test(size) ? [1024, 1024] : [832, 1216];
        const dimensions = /^(\d+)[x×](\d+)$/i.exec(size || '');
        if (dimensions) [width, height] = dimensions.slice(1).map(Number);
        else if (/^[24]K/i.test(size || '')) { const factor = Number(size[0]); width *= factor; height *= factor; }
        const model = provider.model.trim() || params.model || 'nai-diffusion-4-5-full';
        const seed = params.seed !== '' && params.seed != null && Number(params.seed) >= 0
            ? Math.floor(Number(params.seed)) : crypto.getRandomValues(new Uint32Array(1))[0];
        const parameters = {
            params_version: 3, width, height, n_samples: 1, seed,
            steps: Number(params.steps) || 28, scale: Number(params.scale) || 6, cfg_rescale: Number(params.cfg) || 0,
            sampler: params.sampler || 'k_dpmpp_2m_sde', noise_schedule: params.noise_schedule || 'karras',
            negative_prompt: params.negative || '', sm: String(params.sm) === 'true', sm_dyn: String(params.sm_dyn) === 'true',
            dynamic_thresholding: String(params.decrisper) === 'true',
            ucPreset: 0, qualityToggle: false, add_original_image: false, legacy: false, legacy_v3_extend: false,
            prefer_brownian: true, deliberate_euler_ancestral_bug: false, controlnet_strength: 1, uncond_scale: 1,
            reference_image_multiple: [], reference_information_extracted_multiple: [], reference_strength_multiple: []
        };
        if (/nai-diffusion-[45]/.test(model)) {
            parameters.v4_prompt = { caption: { base_caption: input, char_captions: [] }, use_coords: false, use_order: true };
            parameters.v4_negative_prompt = { caption: { base_caption: parameters.negative_prompt, char_captions: [] } };
        }
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 180000);
        const limit = 32 * 1024 * 1024;
        try {
            const response = await (window.RPNativeNetwork?.fetch || window.fetch.bind(window))(provider.endpoint, {
                method: 'POST', signal: controller.signal,
                headers: { 'Content-Type': 'application/json', Accept: 'application/zip, image/png, application/json',
                    ...(provider.key.trim() ? { Authorization: 'Bearer ' + provider.key.trim() } : {}) },
                body: JSON.stringify({ action: 'generate', input, model, parameters })
            }, { ...window.RPNativeContext?.(), kind: 'image', label: 'NovelAI 生图' });
            const reader = response.body?.getReader(), chunks = [];
            let bytes = 0;
            if (reader) {
                try {
                    for (;;) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        bytes += value.byteLength;
                        if (bytes > limit) throw new Error('生图响应超过 32 MB，请降低输出尺寸');
                        chunks.push(value);
                    }
                } finally { await reader.cancel().catch(() => {}); }
            } else chunks.push(await response.arrayBuffer());
            let blob = new Blob(chunks, { type: response.headers.get('content-type')?.split(';')[0] || '' });
            if (blob.size > limit) throw new Error('生图响应超过 32 MB，请降低输出尺寸');
            const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
            if (response.ok && (signature[0] === 80 && signature[1] === 75)) {
                const zip = await window.JSZip.loadAsync(blob);
                const image = Object.values(zip.files).find(file => !file.dir && /\.(png|jpe?g|webp)$/i.test(file.name));
                if (!image) throw new Error('生图接口返回的 ZIP 中没有图片');
                if (image._data.uncompressedSize > limit) throw new Error('解压后的图片超过 32 MB，请降低输出尺寸');
                blob = new Blob([await image.async('uint8array')], {
                    type: /\.jpe?g$/i.test(image.name) ? 'image/jpeg' : /\.webp$/i.test(image.name) ? 'image/webp' : 'image/png'
                });
            } else if (!response.ok || !blob.type.startsWith('image/')) {
                let payload;
                try { payload = JSON.parse(await blob.text()); } catch (_) { throw new Error('生图接口未返回图片，请检查地址或稍后重试'); }
                if (!response.ok) throw new Error(String(payload.error?.message || payload.error || payload.detail || payload.message || `HTTP ${response.status}`).slice(0, 300));
                const image = payload.data?.[0] || payload.images?.[0] || payload;
                if (image.url) return new URL(image.url, provider.endpoint).href;
                const base64 = typeof image === 'string' ? image : image.b64_json || image.image;
                if (!base64) throw new Error('生图接口未返回图片，请检查接口格式和模型');
                return base64.startsWith('data:image/') ? base64 : 'data:image/png;base64,' + base64;
            }
            return await new Promise((resolve, reject) => {
                const file = new FileReader(); file.onload = () => resolve(file.result); file.onerror = () => reject(file.error);
                file.readAsDataURL(blob);
            });
        } catch (error) {
            if (controller.signal.aborted) throw new Error('生图请求超时，请稍后重试');
            throw error;
        } finally { clearTimeout(timer); }
    };
    window.RPImageProviders = Object.freeze({ create, generateNovelImage });
})();
