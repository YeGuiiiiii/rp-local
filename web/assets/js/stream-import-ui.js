(function () {
    const StreamImportPanel = {
        props: { prepare: Function, decode: Function, confirm: Function },
        setup(props) {
            const { ref, reactive, computed, onBeforeUnmount } = Vue;
            const input = ref(null);
            const state = reactive({ phase: 'idle', name: '', bytes: 0, read: 0, message: '', error: '', summary: null, paused: false });
            const busy = computed(() => ['reading', 'applying', 'recovery'].includes(state.phase));
            const isApplying = computed(() => ['applying', 'success', 'recovery'].includes(state.phase));
            const percent = computed(() => state.bytes ? Math.min(100, Math.floor(state.read / state.bytes * 100)) : 0);
            const format = bytes => bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
            Vue.watch(isApplying, async value => {
                document.getElementById('app').inert = value;
                if (value) {
                    await Vue.nextTick();
                    document.querySelector('.stream-import-dialog button, .stream-import-dialog')?.focus();
                }
            });
            let worker, blobUrl, timer, id, controller, disposed = false, generation = 0;
            const stopWorker = () => {
                clearTimeout(timer);
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
                if (!file || isApplying.value) return;
                await cancel();
                if (disposed) return;
                const run = ++generation;
                Object.assign(state, { phase: 'reading', name: file.name, bytes: file.size, read: 0, error: '', summary: null, paused: false, message: '准备读取文件' });
                if (/\.zip$/i.test(file.name)) { fail('ZIP 文件请使用“导入全部数据”'); return; }
                id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
                watchdog(10000);
                try {
                    const response = await fetch('assets/js/stream-import-worker.js?v=' + window.RP_LOCAL_VERSION);
                    if (!response.ok) throw new Error('导入组件加载失败，请重新打开软件');
                    const source = await response.text();
                    if (disposed || run !== generation || state.phase !== 'reading') return;
                    blobUrl = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
                    worker = new Worker(blobUrl);
                    worker.onerror = event => { event.preventDefault(); fail('导入组件异常，请重试；原数据未改动'); };
                    worker.onmessageerror = () => fail('导入消息读取失败，请重试');
                    worker.onmessage = ({ data }) => {
                        watchdog();
                        if (data.type === 'ready') worker.postMessage({ type: 'import', id, file });
                        if (data.type === 'progress') { state.read = data.read; state.message = data.phase; }
                        if (data.type === 'failed') fail(data.message);
                        if (data.type === 'complete') {
                            stopWorker();
                            state.phase = 'ready'; state.read = file.size; state.summary = data.summary;
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
                const run = generation;
                if (!await props.confirm('导入数据', '校验已通过。导入将覆盖备份中对应的现有数据，建议先导出当前备份。确认继续吗？', { confirmText: '确认导入' })) return;
                if (disposed || run !== generation) return;
                state.phase = 'applying'; state.message = '正在恢复数据'; state.error = '';
                controller = new AbortController();
                try {
                    await RPStreamImport.apply(id, {
                        beforeApply: props.prepare, restoreValue: value => props.decode(value), signal: controller.signal,
                        progress: (done, total) => { state.message = '正在恢复数据 ' + done + ' / ' + total; },
                    });
                    state.phase = 'success'; state.message = '导入完成，正在重新打开';
                    setTimeout(() => {
                        try { window.AndroidBridge?.clearPatchCacheBeforeReload?.(); } catch (_) {}
                        window.location.reload();
                    }, 300);
                } catch (error) {
                    state.phase = error.recoveryRequired ? 'recovery' : 'failed';
                    state.error = error.name === 'AbortError' ? '已取消，原数据已恢复' : error.message;
                } finally { controller = null; }
            };
            const beforeUnload = event => { if (isApplying.value) { event.preventDefault(); event.returnValue = ''; } };
            window.addEventListener('beforeunload', beforeUnload);
            onBeforeUnmount(() => {
                disposed = true; generation++; stopWorker(); controller?.abort();
                window.removeEventListener('beforeunload', beforeUnload);
                if (!isApplying.value) cleanup(id).catch(console.warn);
            });
            return { input, state, busy, isApplying, percent, format, start, pause, cancel, apply,
                reload: () => window.location.reload(),
                choose: () => { if (!busy.value) input.value?.click(); } };
        },
        template: `
            <input ref="input" type="file" accept=".json,application/json" hidden aria-label="选择流式导入文件" @change="start">
            <section v-if="state.phase !== 'idle'" class="stream-import-panel mt-4 pt-4 border-t border-gray-200" aria-label="流式导入">
                <div class="flex flex-wrap items-start justify-between gap-2">
                    <h4 class="text-sm font-bold text-gray-700">流式导入 JSON</h4>
                    <span class="text-xs text-gray-500">{{ format(state.read) }} / {{ format(state.bytes) }}</span>
                </div>
                <p class="text-sm text-gray-700 mt-2 break-all">{{ state.name }}</p>
                <progress :value="percent" max="100" class="w-full mt-3" aria-label="文件读取进度"></progress>
                <p role="status" class="text-sm text-gray-500 mt-2">{{ state.paused ? '已暂停' : state.message }}</p>
                <p v-if="state.error" role="alert" class="text-sm text-red-500 mt-2 break-words">{{ state.error }}</p>
                <p v-if="state.summary" class="text-sm text-gray-700 mt-2">
                    角色卡 {{ state.summary.cards }} 张 · 聊天 {{ state.summary.messages }} 条 · 记忆 {{ state.summary.memories }} 条
                </p>
                <div class="flex flex-wrap gap-2 mt-3">
                    <button v-if="state.phase === 'reading'" class="shell-button" type="button" @click="pause">{{ state.paused ? '继续' : '暂停' }}</button>
                    <button v-if="state.phase === 'ready'" class="shell-button" type="button" @click="apply">确认导入</button>
                    <button v-if="['reading','ready'].includes(state.phase)" class="shell-button" type="button" @click="cancel">取消</button>
                    <button v-if="['failed','cancelled'].includes(state.phase)" class="shell-button" type="button" @click="choose">重新选择</button>
                </div>
            </section>
            <teleport to="body">
                <div v-if="isApplying" class="stream-import-overlay" role="dialog" aria-modal="true" aria-label="正在导入数据">
                    <div class="stream-import-dialog" tabindex="-1" @keydown.tab.prevent>
                        <h3>{{ state.phase === 'recovery' ? '需要恢复原数据' : '正在恢复数据' }}</h3>
                        <p v-if="state.phase === 'recovery'" role="alert">{{ state.error }}</p>
                        <p v-else role="status">{{ state.message }}</p>
                        <button v-if="state.phase === 'applying'" class="shell-button" type="button" @click="cancel">取消并恢复原数据</button>
                        <button v-if="state.phase === 'recovery'" class="shell-button" type="button" @click="reload">重新打开并恢复</button>
                    </div>
                </div>
            </teleport>`
    };
    window.RPStreamImportPanel = StreamImportPanel;
})();
