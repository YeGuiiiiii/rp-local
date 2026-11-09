(function () {
    const StreamImportPanel = {
        props: { prepare: Function, decode: Function, task: Object, profile: String },
        setup(props) {
            const { ref, reactive, computed, onBeforeUnmount } = Vue;
            const input = ref(null);
            const panel = ref(null);
            const art = ref(window.RPThemePacks.asset('transfer'));
            const syncArt = () => { art.value = window.RPThemePacks.asset('transfer'); };
            window.addEventListener('rp-ui-theme-change', syncArt);
            const state = reactive({ phase: 'idle', name: '', bytes: 0, read: 0, message: '', error: '', summary: null, paused: false, applied: 0 });
            const busy = computed(() => ['reading', 'ready', 'applying', 'success', 'recovery'].includes(state.phase));
            const isApplying = computed(() => ['applying', 'success', 'recovery'].includes(state.phase));
            const external = computed(() => props.task?.active);
            Vue.watch(external, active => { if (active) state.phase = 'idle'; });
            const isOpen = computed(() => external.value || state.phase !== 'idle');
            const canClose = computed(() => external.value ? !props.task.locked : !busy.value);
            const percent = computed(() => external.value ? props.task.percent : isApplying.value ? state.applied
                : state.bytes ? Math.min(100, Math.floor(state.read / state.bytes * 100)) : 0);
            const format = bytes => bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
            let previousFocus, previousOverflow, previousInert;
            const restorePage = () => {
                const app = document.getElementById('app');
                if (previousInert === undefined) return;
                app.inert = previousInert;
                document.body.style.overflow = previousOverflow;
                previousInert = undefined;
                if (previousFocus?.isConnected) previousFocus.focus();
            };
            Vue.watch(isOpen, async value => {
                if (value) {
                    previousFocus = document.activeElement;
                    previousOverflow = document.body.style.overflow;
                    const app = document.getElementById('app');
                    previousInert = app.inert;
                    app.inert = true;
                    document.body.style.overflow = 'hidden';
                    await Vue.nextTick();
                    panel.value?.focus();
                } else restorePage();
            });
            Vue.watch(() => state.phase, async () => {
                await Vue.nextTick();
                if (isOpen.value && !panel.value?.contains(document.activeElement)) panel.value?.focus();
            });
            const close = () => { if (canClose.value) { if (external.value) props.task.active = false; else state.phase = 'idle'; } };
            const handleBack = () => { if (!isOpen.value) return false; close(); return true; };
            const trapFocus = event => {
                if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); handleBack(); }
                if (event.key !== 'Tab') return;
                const items = [...panel.value.querySelectorAll('button:not(:disabled)')].filter(item => item.getClientRects().length);
                const first = items[0], last = items.at(-1);
                if (!first) { event.preventDefault(); return; }
                if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
                    event.preventDefault(); last.focus();
                } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.value)) {
                    event.preventDefault(); first.focus();
                }
            };
            let worker, blobUrl, timer, id, controller, readController, disposed = false, generation = 0;
            const stopWorker = () => {
                clearTimeout(timer);
                readController?.abort(); readController = null;
                worker?.terminate(); worker = null;
                if (blobUrl) URL.revokeObjectURL(blobUrl);
                blobUrl = null;
            };
            const cleanup = async sessionId => {
                if (!sessionId) return;
                const db = await RPStreamImport.database();
                try { await RPStreamImport.removeSession(db, sessionId); } finally { db.close(); }
            };
            const fail = message => {
                stopWorker();
                state.phase = 'failed'; state.paused = false; state.error = message; state.message = '导入未完成，原数据未改动';
                cleanup(id).catch(error => console.warn('清理导入暂存失败:', error));
            };
            const watchdog = (delay = 45000) => {
                clearTimeout(timer);
                if (!state.paused) timer = setTimeout(() => fail('导入响应超时，请重试；原数据未改动'), delay);
            };
            const cancel = async () => {
                generation++;
                if (isApplying.value) { controller?.abort(); return; }
                stopWorker();
                const previous = id; id = null;
                state.phase = 'cancelled'; state.paused = false; state.message = '已取消，原数据未改动';
                await cleanup(previous);
            };
            const start = async event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file || busy.value || external.value) return;
                await cancel();
                if (disposed) return;
                const run = ++generation;
                Object.assign(state, { phase: 'reading', name: file.name, bytes: file.size, read: 0, error: '', summary: null, paused: false, message: '准备读取文件' });
                if (/\.zip$/i.test(file.name)) { fail('ZIP 文件请使用“导入备份”'); return; }
                id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
                watchdog(10000);
                try {
                    const response = await fetch('assets/js/stream-import-worker.js?v=' + window.RP_LOCAL_VERSION);
                    if (!response.ok) throw new Error('导入组件加载失败，请重新打开软件');
                    const source = await response.text();
                    if (disposed || run !== generation || state.phase !== 'reading') return;
                    let stream;
                    if (!(file instanceof Blob)) {
                        readController = new AbortController();
                        const content = await fetch(file.url, { cache: 'no-store', signal: readController.signal });
                        if (!content.ok || !content.body) throw new Error('读取本地备份失败，请重新选择文件');
                        stream = content.body;
                    }
                    if (disposed || run !== generation || state.phase !== 'reading') return;
                    blobUrl = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
                    worker = new Worker(blobUrl);
                    worker.onerror = event => { event.preventDefault(); fail('导入组件异常，请重试；原数据未改动'); };
                    worker.onmessageerror = () => fail('导入消息读取失败，请重试');
                    worker.onmessage = ({ data }) => {
                        watchdog();
                        if (data.type === 'ready') worker.postMessage({ type: 'import', id, profile: props.profile,
                            ...(stream ? { stream, name: file.name, bytes: file.size } : { file }) }, stream ? [stream] : []);
                        if (data.type === 'progress') { state.read = data.read; state.bytes = data.bytes || state.bytes; state.message = data.phase; }
                        if (data.type === 'failed') fail(data.message);
                        if (data.type === 'complete') {
                            stopWorker();
                            state.phase = 'ready'; state.bytes = data.bytes || state.bytes; state.read = state.bytes; state.summary = data.summary;
                            state.paused = false; state.message = '校验完成，等待确认';
                        }
                    };
                } catch (error) { if (run === generation && !disposed) fail(error.message); }
            };
            const pause = () => {
                state.paused = !state.paused;
                worker?.postMessage({ type: state.paused ? 'pause' : 'resume' });
                if (state.paused) clearTimeout(timer); else watchdog();
            };
            const apply = async () => {
                if (state.phase !== 'ready') return;
                state.phase = 'applying'; state.applied = 0; state.message = '正在恢复数据'; state.error = '';
                controller = new AbortController();
                try {
                    await RPStreamImport.apply(id, {
                        beforeApply: props.prepare, restoreValue: value => props.decode(value), signal: controller.signal,
                        progress: (done, total) => { state.applied = total ? Math.floor(done / total * 100) : 0; state.message = '正在恢复数据 ' + done + ' / ' + total; },
                    });
                    state.phase = 'success'; state.applied = 100; state.message = '导入完成，正在重新打开';
                    setTimeout(() => {
                        try { window.AndroidBridge?.clearPatchCacheBeforeReload?.(); } catch (_) {}
                        window.location.reload();
                    }, 300);
                } catch (error) {
                    state.phase = error.recoveryRequired ? 'recovery' : 'failed';
                    state.error = error.name === 'AbortError' ? '已取消，原数据已恢复' : error.message;
                } finally { controller = null; }
            };
            const beforeUnload = event => {
                if (window.AndroidBridge?.isNativeApp?.() || state.phase === 'success' ||
                    (props.task?.active && props.task.percent === 100 && !props.task.error)) return;
                if (busy.value || props.task?.locked) { event.preventDefault(); event.returnValue = ''; }
            };
            window.addEventListener('beforeunload', beforeUnload);
            onBeforeUnmount(() => {
                disposed = true; generation++; stopWorker(); controller?.abort();
                window.removeEventListener('beforeunload', beforeUnload);
                window.removeEventListener('rp-ui-theme-change', syncArt);
                restorePage();
                if (!isApplying.value) cleanup(id).catch(console.warn);
            });
            return { input, panel, art, state, busy, external, isApplying, isOpen, canClose, close, handleBack, trapFocus, percent, format, start, pause, cancel, apply,
                reload: () => window.location.reload(),
                startUrl: (url, name, bytes) => start({ target: { value: '', files: [{ url, name, size: bytes }] } }),
                choose: () => { if (!busy.value && !external.value) input.value?.click(); } };
        },
        template: `
            <input ref="input" type="file" accept=".json,application/json" hidden aria-label="选择流式导入文件" @change="start">
            <teleport to="body">
                <div v-if="isOpen" class="stream-import-overlay" role="dialog" aria-modal="true" :aria-label="external ? task.title : '导入备份'">
                    <section ref="panel" class="stream-import-dialog transfer-dialog" tabindex="-1" @keydown="trapFocus">
                        <button v-if="canClose" class="transfer-close" type="button" :aria-label="external ? '关闭备份弹窗' : '关闭导入弹窗'" @click="close"><shell-icon name="X"></shell-icon></button>
                        <img class="transfer-mascot" :src="art" alt="" aria-hidden="true" draggable="false">
                        <h3>{{ external ? task.title : state.phase === 'recovery' ? '需要恢复原数据' : state.phase === 'ready' ? '备份已准备好' : state.phase === 'failed' ? '这次没有导入成功' : state.phase === 'cancelled' ? '已取消导入' : '导入备份' }}</h3>
                        <p v-if="!external" class="transfer-filename">{{ state.name }}</p>
                        <progress v-if="external || ['reading','ready','applying','success'].includes(state.phase)"
                            :value="percent" max="100" :aria-label="external ? '备份进度' : '文件读取进度'"></progress>
                        <div class="transfer-progress-meta" v-if="external">
                            <span>{{ task.detail }}</span><span>{{ Math.floor(percent) }}%</span>
                        </div>
                        <div class="transfer-progress-meta" v-else-if="['reading','ready'].includes(state.phase)">
                            <span>{{ format(state.read) }} / {{ format(state.bytes) }}</span><span>{{ percent }}%</span>
                        </div>
                        <p role="status">{{ external ? task.message : state.paused ? '已暂停，随时可以继续。' : state.message }}</p>
                        <p v-if="external ? task.error : state.error" role="alert" class="transfer-error">{{ external ? task.error : state.error }}</p>
                        <p v-if="!external && state.summary" class="transfer-summary">角色卡 {{ state.summary.cards }} 张 · 聊天 {{ state.summary.messages }} 条 · 记忆 {{ state.summary.memories }} 条</p>
                        <p v-if="!external && state.phase === 'ready'" class="transfer-warning">导入会覆盖备份中对应的现有数据。请先保留当前备份，再确认导入。</p>
                        <div v-if="external && task.confirm" class="transfer-actions">
                            <button class="shell-button" type="button" @click="task.confirm(false)">取消</button>
                            <button class="shell-button transfer-primary" type="button" @click="task.confirm(true)">确认导入</button>
                        </div>
                        <div v-if="external && task.recovery" class="transfer-actions">
                            <button class="shell-button transfer-primary" type="button" @click="reload">重新打开并恢复</button>
                        </div>
                        <div v-if="!external" class="transfer-actions">
                            <button v-if="state.phase === 'reading'" class="shell-button" type="button" @click="pause">{{ state.paused ? '继续' : '暂停' }}</button>
                            <button v-if="['reading','ready'].includes(state.phase)" class="shell-button" type="button" @click="cancel">取消</button>
                            <button v-if="state.phase === 'ready'" class="shell-button transfer-primary" type="button" @click="apply">确认导入</button>
                            <button v-if="['failed','cancelled'].includes(state.phase)" class="shell-button transfer-primary" type="button" @click="choose">重新选择</button>
                            <button v-if="state.phase === 'applying'" class="shell-button" type="button" @click="cancel">取消并恢复原数据</button>
                            <button v-if="state.phase === 'recovery'" class="shell-button transfer-primary" type="button" @click="reload">重新打开并恢复</button>
                        </div>
                    </section>
                </div>
            </teleport>`
    };
    window.RPStreamImportPanel = StreamImportPanel;
})();
