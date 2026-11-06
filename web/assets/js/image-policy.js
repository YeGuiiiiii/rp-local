(function () {
    'use strict';
    const isUiUrl = source => {
        if (!source) return false;
        try {
            const url = new URL(source, location.href);
            return url.origin === location.origin
                && /^\/(?:RP-Hub\/)?assets\//.test(url.pathname);
        } catch (_) { return false; }
    };
    const isContentImage = image => image?.tagName === 'IMG'
        && !isUiUrl(image.getAttribute('src'))
        && !isUiUrl(image.currentSrc || image.src)
        && !image.closest('[data-rphub-no-save], .rphub-no-save, [data-rphub-save-skip]')
        && !!image.closest('.message-content-wrapper, .generated-image-card, [data-rphub-saveable]');
    window.RPImagePolicy = Object.freeze({ isUiUrl, isContentImage });
})();
