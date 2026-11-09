(function () {
    'use strict';
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
                            || saved.profiles.some(item => !item || !['jobs', 'openai'].includes(item.protocol)
                                || ['id', 'name', 'url', 'key', 'model', 'size'].some(key => typeof item[key] !== 'string'))) {
                            throw new Error('生图接口记录损坏，请保留数据并重试');
                        }
                        api.profiles = saved.profiles;
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
                if (field === 'protocol' && !['jobs', 'openai'].includes(value)) return;
                api.current[field] = String(value);
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
    window.RPImageProviders = Object.freeze({ create });
})();
