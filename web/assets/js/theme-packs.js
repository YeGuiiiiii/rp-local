(function () {
    'use strict';
    const key = 'rphub-ui-pack';
    const root = document.documentElement;
    const catalog = window.RPThemeCatalog;
    const fallback = 'assets/images/chenyue/';
    let selected;
    const legacyMode = id => id === 'journal' ? 'day' : id === 'vampire' ? 'night' : '';
    const skinId = id => legacyMode(id) ? 'chenyue' : id;
    try {
        selected = localStorage.getItem('rphub-layout118') === '1' ? localStorage.getItem(key) : 'classic';
        const previousMode = legacyMode(selected);
        if (previousMode) {
            localStorage.setItem('rphub-theme-scheme', previousMode);
            window.RPHubTheme.set(previousMode === 'night' ? 'dark' : 'light');
        }
        selected = skinId(selected);
        localStorage.setItem('rphub-layout118', '1');
        localStorage.setItem(key, selected || 'classic');
    } catch (_) { selected = 'classic'; }
    const mode = () => root.dataset.appTheme === 'dark' ? 'night' : 'day';
    const getPack = () => catalog.find(pack => pack.id === selected) || catalog[0];
    const variant = (pack = getPack()) => pack.variants[mode()] || pack.variants.day;
    const asset = name => variant()[name] || variant().overrides?.[name] || (variant().assets || fallback) + name + '.webp';
    const syncStandalone = () => document.querySelectorAll('[data-ui-mascot]').forEach(image => {
        image.src = asset(image.dataset.uiMascot);
    });
    function apply() {
        const current = getPack();
        const appearance = variant(current);
        selected = current.id;
        if (appearance.css && !document.getElementById('ui-skin-' + appearance.skin)) {
            const link = document.createElement('link');
            link.id = 'ui-skin-' + appearance.skin;
            link.rel = 'stylesheet';
            link.href = appearance.css + '?v=' + window.RP_LOCAL_VERSION;
            document.head.appendChild(link);
        }
        root.dataset.uiPack = current.id;
        root.dataset.uiSkin = appearance.skin;
        root.dataset.uiLayout = current.layout;
        document.body?.classList.toggle('chenyue-theme', current.layout !== 'classic');
        syncStandalone();
        window.dispatchEvent(new Event('rp-ui-theme-change'));
    }
    function setMode(value) {
        if (!['day', 'night'].includes(value)) return;
        if (window.RPHubThemeKit) window.RPHubThemeKit.setScheme(value);
        else {
            try { localStorage.setItem('rphub-theme-scheme', value); } catch (_) {}
            window.RPHubTheme.set(value === 'night' ? 'dark' : 'light');
        }
    }
    window.RPThemePacks = Object.freeze({
        catalog, asset, variant, setMode, get mode() { return mode(); }, get current() { return getPack().id; },
        toggleMode: () => setMode(mode() === 'night' ? 'day' : 'night'),
        set(id) {
            const pack = catalog.find(pack => pack.id === skinId(id));
            if (!pack) return;
            selected = pack.id;
            try { localStorage.setItem(key, selected); } catch (_) {}
            window.RPHubThemeKit?.setAccent('');
            if (legacyMode(id)) setMode(legacyMode(id));
            apply();
        }
    });
    window.addEventListener('rphub-theme-change', apply);
    window.addEventListener('storage', event => {
        if (event.key === key) { selected = skinId(event.newValue); apply(); }
    });
    document.addEventListener('DOMContentLoaded', apply, { once: true });
    if (!catalog.some(pack => pack.id === selected)) {
        try {
            const pack = getPack();
            localStorage.setItem(key, pack.id);
            localStorage.removeItem('rphub-theme-accent');
        } catch (_) {}
    }
    apply();
})();
