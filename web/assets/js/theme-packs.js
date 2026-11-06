(function () {
    'use strict';
    const key = 'rphub-ui-pack';
    const root = document.documentElement;
    const catalog = window.RPThemeCatalog;
    const fallback = 'assets/images/chenyue/';
    let selected;
    let selecting = false;
    try {
        selected = localStorage.getItem('rphub-layout118') === '1' ? localStorage.getItem(key) : 'classic';
        localStorage.setItem('rphub-layout118', '1');
        localStorage.setItem(key, selected || 'classic');
    } catch (_) { selected = 'classic'; }
    const mode = () => root.dataset.appTheme === 'dark' ? 'night' : 'day';
    const getPack = () => catalog.find(pack => pack.id === selected)
        || catalog.find(pack => pack.mode === mode()) || catalog[0];
    const asset = name => (getPack().assets || fallback) + name + '.webp';
    const syncStandalone = () => document.querySelectorAll('[data-ui-mascot]').forEach(image => {
        image.src = asset(image.dataset.uiMascot);
    });
    function apply() {
        const current = getPack();
        selected = current.id;
        if (current.css && !document.getElementById('ui-skin-' + current.skin)) {
            const link = document.createElement('link');
            link.id = 'ui-skin-' + current.skin;
            link.rel = 'stylesheet';
            link.href = current.css + '?v=' + window.RP_LOCAL_VERSION;
            document.head.appendChild(link);
        }
        root.dataset.uiPack = current.id;
        root.dataset.uiSkin = current.skin;
        document.body?.classList.toggle('chenyue-theme', current.id !== 'classic');
        syncStandalone();
        window.dispatchEvent(new Event('rp-ui-theme-change'));
    }
    window.RPThemePacks = Object.freeze({
        catalog, asset, get current() { return getPack().id; },
        set(id) {
            const pack = catalog.find(pack => pack.id === id);
            if (!pack) return;
            selected = id;
            try { localStorage.setItem(key, id); } catch (_) {}
            selecting = true;
            window.RPHubThemeKit?.setAccent('');
            if (pack.id !== 'classic') {
                if (window.RPHubThemeKit) window.RPHubThemeKit.setScheme(pack.mode);
                else window.RPHubTheme.set(pack.mode === 'night' ? 'dark' : 'light');
            }
            selecting = false;
            apply();
        }
    });
    window.addEventListener('rphub-theme-change', () => {
        if (selecting) return;
        if (getPack().id !== 'classic' && getPack().mode !== mode()) {
            selected = catalog.find(pack => pack.id !== 'classic' && pack.mode === mode())?.id || catalog[0].id;
            try { localStorage.setItem(key, selected); } catch (_) {}
        }
        apply();
    });
    window.addEventListener('storage', event => {
        if (event.key === key) { selected = event.newValue; apply(); }
    });
    document.addEventListener('DOMContentLoaded', apply, { once: true });
    if (!catalog.some(pack => pack.id === selected)) {
        try {
            const pack = getPack();
            localStorage.setItem(key, pack.id);
            localStorage.setItem('rphub-theme-scheme', pack.mode);
            localStorage.removeItem('rphub-theme-accent');
        } catch (_) {}
    }
    apply();
})();
