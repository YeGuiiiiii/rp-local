(function (root) {
    'use strict';
    const endpoint = 'https://121.40.147.125/updates/stable/latest.json';
    function createUpdater(options) {
        const storage = options.storage;
        const state = (options.reactive || (value => value))({
            automatic: storage.getItem('rp-auto-update') !== 'false', phase: 'idle',
            latest: null, progress: 0, error: '', currentVersion: options.currentVersion
        });
        let pending, timer;
        const bridge = () => options.bridge?.();
        const stop = () => { clearInterval(timer); timer = null; };
        const refresh = () => {
            try {
                const result = JSON.parse(bridge().state());
                if (result.phase !== 'idle') Object.assign(state, result);
                if (['ready', 'error'].includes(result.phase)) stop();
            } catch (error) { state.phase = 'error'; state.error = '无法读取下载状态，请重新检查更新。'; stop(); }
        };
        const download = (automatic = false) => {
            if (!state.latest || !bridge()) return;
            if (['downloading', 'verifying'].includes(state.phase)) return;
            try {
                bridge().download(JSON.stringify({ ...state.latest, automatic }));
                state.phase = 'downloading';
                state.error = '';
                stop();
                timer = setInterval(refresh, 1000);
                timer.unref?.();
            } catch (error) { state.phase = 'error'; state.error = error.message; }
        };
        const check = (automatic = false) => {
            if (pending) return pending;
            if (['downloading', 'verifying', 'ready'].includes(state.phase)) return Promise.resolve();
            state.phase = 'checking';
            state.error = '';
            pending = (async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);
                try {
                    const response = await options.fetch(endpoint, { cache: 'no-store', signal: controller.signal });
                    if (!response.ok) throw new Error('更新服务暂时不可用，请稍后重试。');
                    const info = await response.json();
                    if (info.schema !== 1 || info.channel !== 'stable' || info.packageName !== 'com.rphub.local'
                        || !Number.isSafeInteger(info.versionCode) || info.versionCode <= 0
                        || !/^\d+\.\d+(?:\.\d+)?$/.test(info.versionName)
                        || !Number.isSafeInteger(info.size) || info.size <= 0
                        || !/^[a-f0-9]{64}$/.test(info.sha256) || !/^https:\/\//.test(info.url))
                        throw new Error('更新信息不完整，暂时不能下载，请稍后重试。');
                    state.latest = info.versionCode > options.currentCode ? info : null;
                    state.phase = state.latest ? 'available' : 'current';
                    storage.setItem('rp-update-checked', String(Date.now()));
                    if (automatic && state.latest) {
                        options.notice?.('发现 RP 本地版 ' + info.versionName + '，可在设置里查看更新。');
                        if (bridge()?.isUnmetered()) download(true);
                    }
                } catch (error) {
                    state.phase = 'error';
                    state.error = error.name === 'AbortError' ? '检查更新超时，请稍后重试。'
                        : /fetch|network|offline/i.test(error.message) ? '无法连接更新服务，请检查网络后重试。' : error.message;
                } finally { clearTimeout(timeout); pending = null; }
            })();
            return pending;
        };
        return {
            state, check, download, stop,
            setAutomatic(value) { storage.setItem('rp-auto-update', String(value)); state.automatic = value; },
            async start() {
                if (!bridge()) return;
                refresh();
                if (['downloading', 'verifying'].includes(state.phase)) {
                    timer = setInterval(refresh, 1000); return;
                }
                if (state.automatic && Date.now() - Number(storage.getItem('rp-update-checked') || 0) >= 6 * 3600000)
                    await check(true);
            },
            install() {
                try { bridge()?.install(); refresh(); }
                catch (error) { state.error = error.message; }
            },
            get native() { return !!bridge(); }
        };
    }
    if (typeof module === 'object' && module.exports) module.exports = { createUpdater };
    else root.RPUpdates = createUpdater({
        reactive: root.Vue.reactive, storage: root.localStorage, fetch: root.fetch.bind(root),
        currentCode: root.RP_LOCAL_RELEASE, currentVersion: root.RP_LOCAL_VERSION,
        bridge: () => root.RPLocalUpdates,
        notice: message => root.dispatchEvent(new CustomEvent('rp:notice', { detail: { message } }))
    });
})(typeof window === 'undefined' ? globalThis : window);
