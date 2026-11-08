(function () {
    'use strict';
    const key = 'rp-card-night';
    const root = document.documentElement;
    let current = '';
    const read = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(key));
            return { enabled: saved?.enabled !== false,
                cards: saved?.cards && typeof saved.cards === 'object' && !Array.isArray(saved.cards) ? saved.cards : {} };
        } catch (_) { return { enabled: true, cards: {} }; }
    };
    let saved = read();
    const mode = () => ['auto', 'original'].includes(saved.cards[current]) ? saved.cards[current] : 'follow';
    function sync() {
        const active = !!current && root.dataset.appTheme === 'dark'
            && (mode() === 'auto' || (mode() === 'follow' && saved.enabled));
        // Only Android's opt-in recoloring needs the light scheme; ordinary browsers keep the app scheme.
        root.dataset.cardAutoDark = String(active && !!window.RPHubCardTheme);
        window.RPHubCardTheme?.setEnabled(active);
        window.dispatchEvent(new Event('rp-card-night-change'));
    }
    function save() {
        try { localStorage.setItem(key, JSON.stringify(saved)); } catch (_) {}
        sync();
    }
    window.RPCardNight = Object.freeze({
        get enabled() { return saved.enabled; },
        get mode() { return mode(); },
        select(id) { current = String(id || ''); sync(); },
        setEnabled(value) { saved.enabled = value === true; save(); },
        setMode(value) {
            if (!current || !['follow', 'auto', 'original'].includes(value)) return;
            if (value === 'follow') delete saved.cards[current];
            else saved.cards[current] = value;
            save();
        }
    });
    window.addEventListener('rphub-theme-change', sync);
    window.addEventListener('storage', event => {
        if (event.key === key || event.key === null) { saved = read(); sync(); }
    });
    sync();
})();
