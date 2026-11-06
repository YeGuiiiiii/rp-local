(function () {
    'use strict';
    const key = 'rphub-gallery-tilt';
    const permission = Vue.ref(typeof window.DeviceOrientationEvent?.requestPermission === 'function' ? 'prompt' : 'available');
    const readEnabled = () => { try { return localStorage.getItem(key) !== '0'; } catch (_) { return true; } };
    const enabled = Vue.ref(readEnabled());
    let requesting = null;
    const notify = () => window.dispatchEvent(new Event('rp-gallery-motion-change'));
    const request = async () => {
        if (permission.value !== 'prompt' || requesting) return;
        try {
            requesting = window.DeviceOrientationEvent.requestPermission();
            permission.value = await requesting === 'granted' ? 'available' : 'denied';
        }
        catch (_) { permission.value = 'denied'; }
        finally { requesting = null; notify(); }
    };
    window.RPGalleryMotion = Object.freeze({
        get enabled() { return enabled.value; },
        get permission() { return permission.value; },
        request,
        set(value) {
            enabled.value = !!value;
            try { localStorage.setItem(key, value ? '1' : '0'); } catch (_) {}
            if (value) request();
            notify();
        }
    });
    window.addEventListener('storage', event => {
        if (event.key === key) { enabled.value = readEnabled(); notify(); }
    });
    window.RPGalleryGlass = function (active, surfaces) {
        const { watch, onBeforeUnmount } = Vue;
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        let frame = 0, listening = false, asking = false, baseline = null, lastUpdate = 0;
        let position = { x: 0, y: 0 };
        const clamp = value => Math.max(-1, Math.min(1, value));
        const paint = () => {
            frame = 0;
            surfaces().filter(Boolean).forEach(surface => {
                surface.style.setProperty('--glass-x', position.x.toFixed(3));
                surface.style.setProperty('--glass-y', position.y.toFixed(3));
            });
        };
        const update = (x, y) => {
            position = { x: clamp(x), y: clamp(y) };
            if (!frame) frame = requestAnimationFrame(paint);
        };
        const orientation = event => {
            if (!Number.isFinite(event.gamma) || !Number.isFinite(event.beta)) return;
            const angle = screen.orientation?.angle || window.orientation || 0;
            if (!baseline || baseline.angle !== angle) baseline = { gamma: event.gamma, beta: event.beta, angle };
            const time = performance.now();
            if (time - lastUpdate < 32) return;
            lastUpdate = time;
            const delta = (value, initial) => ((value - initial + 540) % 360) - 180;
            const horizontal = delta(event.gamma, baseline.gamma), vertical = delta(event.beta, baseline.beta);
            const radians = angle * Math.PI / 180;
            update((horizontal * Math.cos(radians) + vertical * Math.sin(radians)) / 28,
                (vertical * Math.cos(radians) - horizontal * Math.sin(radians)) / 28);
        };
        const pointer = event => {
            if (!enabled.value || preference.matches || event.pointerType === 'touch') return;
            const bounds = event.currentTarget.getBoundingClientRect();
            update(((event.clientX - bounds.left) / bounds.width - .5) * 2,
                ((event.clientY - bounds.top) / bounds.height - .5) * 2);
        };
        const reset = () => update(0, 0);
        const gesture = event => {
            if (event.target.closest('.shell-gallery,.shell-photo-viewer')) request();
        };
        const sync = () => {
            const running = active() && enabled.value && !document.hidden && !preference.matches;
            const canListen = running && permission.value === 'available';
            const canAsk = running && permission.value === 'prompt';
            if (canListen !== listening) {
                window[canListen ? 'addEventListener' : 'removeEventListener']('deviceorientation', orientation);
                listening = canListen;
            }
            if (canAsk !== asking) {
                window[canAsk ? 'addEventListener' : 'removeEventListener']('pointerdown', gesture, true);
                asking = canAsk;
            }
            baseline = null;
            if (!running) { cancelAnimationFrame(frame); frame = 0; position = { x: 0, y: 0 }; paint(); }
        };
        watch([active, enabled, permission], sync, { immediate: true });
        preference.addEventListener('change', sync);
        document.addEventListener('visibilitychange', sync);
        onBeforeUnmount(() => {
            window.removeEventListener('deviceorientation', orientation);
            window.removeEventListener('pointerdown', gesture, true);
            preference.removeEventListener('change', sync);
            document.removeEventListener('visibilitychange', sync);
            cancelAnimationFrame(frame);
        });
        return { pointer, reset };
    };
})();
