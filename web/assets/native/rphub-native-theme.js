// Sync the Android window background independently of per-card night rendering.
(function () {
    if (window.__rphubNativeThemeBound) return;
    window.__rphubNativeThemeBound = true;

    var KEY = 'rphub-appearance';

    function readTheme() {
        var attr = document.documentElement.dataset.appTheme;
        if (attr === 'dark' || attr === 'light') return attr;
        try {
            var raw = localStorage.getItem(KEY);
            if (raw === 'dark' || raw === 'light') return raw;
        } catch (e) { /* ignore */ }
        return 'light';
    }

    var last = null;

    function push() {
        var theme = readTheme();
        if (theme === last) return;
        last = theme;
        try {
            if (window.RPHubNativeTheme
                && typeof window.RPHubNativeTheme.setBackground === 'function') {
                window.RPHubNativeTheme.setBackground(theme === 'dark');
            }
        } catch (e) { /* ignore */ }
    }

    window.addEventListener('rphub-theme-change', push);
    window.addEventListener('storage', function (event) {
        if (event.key === KEY) push();
    });
    new MutationObserver(push).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-app-theme']
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', push, { once: true });
    }
    push();
})();
