// Only the signed catalog ID and numeric usage leave the player. Each queued request has its own key.
(() => {
    const api = 'https://rphub.nanamirui.eu.cc/api/heat/';
    const prefix = 'rph:queued-heat:';
    const week = 7 * 86400000;
    const inflight = new Set();
    const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
    let vestaCache;
    function valid(source) {
        return uuid.test(source?.cardId || '') && /^[0-9a-f]{64}$/.test(source?.proof || '');
    }
    async function vestaSource() {
        const id = sessionStorage.getItem('vesta-forum-work') || '';
        if (vestaCache?.id === id && vestaCache.until > Date.now()) return vestaCache.promise;
        const promise = fetch(api + 'vesta' + (id ? '?cardId=' + encodeURIComponent(id) : ''), {
            credentials:'omit', referrerPolicy:'no-referrer', cache:'no-store'
        }).then(r => r.status === 200 ? r.json() : null).catch(() => null);
        vestaCache = {id, until:Date.now()+60000, promise};
        return promise;
    }
    async function deliver(event) {
        const key = prefix + event.eventId;
        if (inflight.has(key)) return;
        inflight.add(key);
        try {
            if (event.occurredAt < Date.now()-week) { localStorage.removeItem(key); return; }
            const res = await fetch(api+'events', {method:'POST', headers:{'Content-Type':'application/json'},
                body:JSON.stringify(event), credentials:'omit', referrerPolicy:'no-referrer', keepalive:true});
            if (res.ok || [400,403,404].includes(res.status)) localStorage.removeItem(key);
        } catch { /* A later visit retries the same event ID. */ }
        finally { inflight.delete(key); }
    }
    function flush() {
        try {
            const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix)).slice(0,25);
            for (const key of keys) {
                try {
                    const event = JSON.parse(localStorage.getItem(key));
                    if (!valid(event) || key !== prefix + event.eventId) localStorage.removeItem(key);
                    else void deliver(event);
                }
                catch { localStorage.removeItem(key); }
            }
        } catch { /* Storage may be disabled. */ }
    }
    function newEventId() {
        if (crypto.randomUUID) return crypto.randomUUID();
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
        return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-');
    }
    function capture(source, channel) {
        if (!globalThis.crypto?.getRandomValues || (channel === 'vesta' ? !source : !valid(source))) return () => {};
        const binding = channel === 'vesta' ? vestaSource().catch(() => null) : source;
        const recorded = new Set();
        return async ({inputTokens,outputTokens,totalTokens}, attempt = 1) => {
            if (!Number.isSafeInteger(totalTokens) || totalTokens <= 0 || recorded.has(attempt)) return;
            recorded.add(attempt);
            const eventId = newEventId();
            const resolved = await binding;
            if (!valid(resolved)) return;
            const event = {eventId, channel, occurredAt:Date.now(), cardId:resolved.cardId, proof:resolved.proof,
                input:inputTokens ?? 0, output:outputTokens ?? 0, total:totalTokens ?? 0};
            try { localStorage.setItem(prefix+eventId,JSON.stringify(event)); } catch { /* Send immediately. */ }
            await deliver(event);
        };
    }
    window.RPHForumHeat = {capture, valid};
    window.addEventListener('online', flush);
    setTimeout(flush, 1500);
    setInterval(flush, 60000);
})();
