(function () {
    // [rphub 2.9.037] 导入中断取证：手机上调不到 logcat，「进度到 100% 后弹窗自己没了」
    //   这类故障只能靠设备把状态机的每一次写入留在本地，下次打开导入口时直接摆在界面上。
    const TRACE_KEY = 'rphub_import_trace_v1';
    const TRACE_MAX = 60;
    // 这三条 tag 表示一次导入正常收尾，其余都算「没走完」。
    const TRACE_DONE = ['dismissed', 'applied', 'done'];
    // [rphub 2.9.043] 上一版只认上面三条 tag，可 setPhase 写下的那条是「切到 X」的转换记录
    //   （tag = phase:applying->success），phase 字段记的又是切换**前**的值 —— 于是导入成功、
    //   页面重载之后，下次打开面板照样会说「上次导入没有正常结束」，而且文案写成
    //   「停在 reading｜触发：complete」这种看不懂的样子。这里补上「切到了终态」也算走完。
    const TRACE_SETTLED = ['success', 'idle', 'cancelled', 'failed'];
    const traceEnd = tag => {
        const text = String(tag || '');
        if (TRACE_DONE.includes(text)) return 'done';
        if (!text.startsWith('phase:')) return '';
        const arrow = text.indexOf('->');
        if (arrow < 0) return '';
        return TRACE_SETTLED.includes(text.slice(arrow + 2)) ? 'done' : 'running';
    };
    const readTrace = () => {
        try {
            const list = JSON.parse(localStorage.getItem(TRACE_KEY) || '[]');
            return Array.isArray(list) ? list.filter(item => item && typeof item === 'object') : [];
        } catch (_) { return []; }
    };
    const writeTrace = list => {
        try { localStorage.setItem(TRACE_KEY, JSON.stringify(list)); } catch (_) {}
    };
    const heapUsed = () => {
        try { return Number(performance.memory && performance.memory.usedJSHeapSize) || 0; } catch (_) { return 0; }
    };
    const clockOf = ts => {
        const d = new Date(Number(ts) || Date.now());
        return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
    };
    // [rphub 2.9.048] 「上次导入没有正常结束」只该由导入状态机自己的记录触发。
    //   ① 切外观（classic <-> modern）会让 app.js 根 vnode 的 key 换值、整棵子树重建，
    //      导入面板在 idle 状态被卸载；旧实现无条件写 unmount，下次挂载就读成中断。
    //      旧版本已经写进 localStorage 的这类假轨迹也必须跳过，否则装新包还会弹一次。
    //   ② 创建备份 / 导出 JSON 这类外部任务写的是 external，它不是导入，且没有终态标记，
    //      收尾时也没有对应的 done —— 同样会串成一条假账。
    //   真中断的 unmount 记的是 reading / ready / applying / recovery / select，不会被跳过。
    const isIdleUnmountNoise = item => item && item.tag === 'unmount'
        && TRACE_SETTLED.includes(String(item.phase || 'idle'));
    const isNonImportTrace = item => item
        && (item.tag === 'external' || item.tag === 'external-ignored');
    // 上一次导入如果没走到收尾，把「停在哪一步」拼成一句话，交给弹窗顶部展示。
    const pendingRecap = () => {
        const list = readTrace();
        let last = null;
        for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i];
            if (!item || item.tag === 'mount' || isIdleUnmountNoise(item) || isNonImportTrace(item)) continue; // 挂载/换肤卸载/外部任务都不是导入事件
            last = item;
            break;
        }
        if (!last || traceEnd(last.tag) === 'done') return '';
        if (Date.now() - Number(last.t || 0) > 1800000) return ''; // 半小时前的旧账不再提
        // 转换记录老实写成「a → b」，别让用户以为它停在 a 那一步没动过。
        const text = String(last.tag || '');
        const arrow = text.indexOf('->');
        const where = text.startsWith('phase:') && arrow > 0
            ? text.slice('phase:'.length, arrow) + ' → ' + text.slice(arrow + 2)
            : String(last.phase || '?');
        const bits = [clockOf(last.t) + ' 停在 ' + where];
        if (last.why) bits.push('触发：' + last.why);
        if (last.msg) bits.push(last.msg);
        if (last.heap) bits.push('堆 ' + (Number(last.heap) / 1048576).toFixed(0) + 'MB');
        return bits.join('｜');
    };
    // [rphub 2.9.044] 量体函数从 setup() 提到 IIFE 顶层并挂到 window：备份页的「导入档位」
    //   也要显示本机实测的单条上限，否则下拉里永远写着 16/32/64MB，看着像根本没自适应。
    //   数值必须与导入时真正下发给 worker 的一致 —— 所以只能共用这一份，不能另抄一套公式。
    const UNIT_CAP = 128 * 1048576;
    const measureTransferLimits = base => {
        let limit = 0, used = 0;
        try {
            const mem = performance.memory;
            if (mem && Number(mem.jsHeapSizeLimit) > 0) {
                limit = Number(mem.jsHeapSizeLimit);
                used = Number(mem.usedJSHeapSize) || 0;
            }
        } catch (_) {}
        if (!limit) {
            const ram = Number(navigator.deviceMemory) || 0;
            limit = (ram >= 8 ? 512 : ram >= 4 ? 384 : ram >= 2 ? 256 : 128) * 1048576;
        }
        const affordable = Math.floor(Math.max(0, limit * 0.85 - used) / 2.5);
        const unitBytes = Math.min(UNIT_CAP, Math.max(base.unitBytes, affordable));
        const chunkBytes = Math.max(base.chunkBytes, limit >= 384 * 1048576 ? 1048576
            : limit >= 256 * 1048576 ? 524288 : 262144);
        return Object.assign({}, base, { unitBytes, chunkBytes });
    };
    window.RPStreamImportLimits = measureTransferLimits;
    const StreamImportPanel = {
        props: { prepare: Function, decode: Function, task: Object, profile: String },
        setup(props) {
            const { ref, reactive, computed, onBeforeUnmount } = Vue;
            const input = ref(null);
            const panel = ref(null);
            const art = ref(window.RPThemePacks.asset('transfer'));
            const syncArt = () => { art.value = window.RPThemePacks.asset('transfer'); };
            window.addEventListener('rp-ui-theme-change', syncArt);
            const state = reactive({ phase: 'idle', name: '', bytes: 0, read: 0, message: '', error: '', errorPath: '', errorLimit: 0, summary: null, paused: false, applied: 0, legacy: [], cleanLegacy: false, unitLimit: 0, recap: '', legacyCount: 0, legacyTotal: 0, items: [], picked: [], clock: 0, spans: [], entriesOpen: -1, entriesClose: -1, indexed: false });
            const busy = computed(() => ['reading', 'ready', 'applying', 'success', 'recovery'].includes(state.phase));
            const isApplying = computed(() => ['applying', 'success', 'recovery'].includes(state.phase));
            const external = computed(() => props.task?.active);
            const trace = readTrace();
            // 上次导入没走完（弹窗被静默关掉那种）：页面一加载就把那行字摆出来。
            //   否则用户下次点「导入备份」会直接进系统文件选择器，永远看不到它。
            const bootRecap = pendingRecap();
            if (bootRecap) state.recap = bootRecap;
            const mark = (tag, extra) => {
                const item = { t: Date.now(), tag: String(tag), phase: state.phase, ext: !!external.value };
                if (extra && typeof extra === 'object') Object.assign(item, extra);
                if (!('heap' in item)) item.heap = heapUsed();
                trace.push(item);
                while (trace.length > TRACE_MAX) trace.shift();
                // 采样只进内存：读盘/写盘最吃紧的那几秒里别再同步写 localStorage，
                //   下一条真轨迹会把它们一起落盘。
                if (String(tag) !== 'sample') writeTrace(trace);
            };
            // phase 只从这里写：界面上看到的每次切换，磁盘上都有一条对应的轨迹。
            const setPhase = (next, why, msg) => {
                if (state.phase === next) return;
                mark('phase:' + state.phase + '->' + next, { why: why || '', msg: msg || '' });
                state.phase = next;
            };
            let lastWorkerMessage = '';
            let lastSample = 0;
            // [rphub 2.9.037] 外部任务（导出备份 / 云端上传 / 整包 ZIP 导入）不得改写正在跑的
            //   导入面板：原先无条件归零，正在「核对」的面板会被静默关掉，用户看到的就是
            //   「进度到 100% 后弹窗自己没了」，而且没有任何错误提示可查。
            Vue.watch(external, active => {
                if (!active) return;
                const title = String(props.task?.title || '');
                if (busy.value) { mark('external-ignored', { why: '外部任务被拒：' + title }); return; }
                mark('external', { why: '外部任务：' + title });
                state.recap = '';
                setPhase('idle', 'external: ' + title);
            });
            const isOpen = computed(() => external.value || state.phase !== 'idle' || !!state.recap);
            const canClose = computed(() => external.value ? !props.task.locked : !busy.value);
            const percent = computed(() => external.value ? props.task.percent : isApplying.value ? state.applied
                : state.bytes ? Math.min(100, Math.floor(state.read / state.bytes * 100)) : 0);
            const format = bytes => bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
            // [rphub 2.9.044] 量体函数已上提到 IIFE 顶层（window.RPStreamImportLimits），
            //   备份页要用同一个口径显示本机实测值，这里保留调用点不变。
            const legacyBytes = computed(() => (state.legacy || []).reduce((sum, item) => sum + (Number(item.bytes) || 0), 0));
            const pickedBytes = computed(() => (state.items || []).reduce((sum, row) =>
                state.picked.includes(row.group) ? sum + (Number(row.bytes) || 0) : sum, 0));
            let previousFocus, previousOverflow, previousInert;
            const restorePage = () => {
                const app = document.getElementById('app');
                if (previousInert === undefined) return;
                app.inert = previousInert;
                document.body.style.overflow = previousOverflow;
                previousInert = undefined;
                if (previousFocus?.isConnected) previousFocus.focus();
            };
            // [rphub 2.9.041] 活体计数：主线程真活着这个数字就一直跳。它一停，说明卡在主线程
            //   而不是 worker —— 这两种情况在屏幕上长得一模一样，只能靠它分辨。
            let clockTimer = null;
            Vue.watch(isOpen, value => {
                clearInterval(clockTimer); clockTimer = null;
                if (!value) return;
                clockTimer = setInterval(() => { state.clock++; }, 500);
            }, { immediate: true });
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
            const close = () => {
                if (!canClose.value) return;
                if (external.value) { props.task.active = false; return; }
                mark('dismissed', { why: '手动关闭' });
                state.recap = '';
                setPhase('idle', 'close');
            };
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
            // 取消 / 卸载时要能把正在等结果的那一趟收掉，否则 await 永远挂着。
            let settlePass = null;
            mark('mount', { msg: '面板挂载' });
            // [rphub 2.9.038] 收尾顺序：先停 worker，再把「中止读取」和「回收 blob」推到下一个
            //   任务。原先先 abort 再 terminate —— 而「从备份列表恢复」这条路径（startUrl）读的是
            //   fetch 的 body 流，流的所有权已经转给 worker；abort 要先让属主把流置错，下一行
            //   就把属主 terminate 掉，abort 可能永远等不到回调，主线程就钉在这里。
            const stopWorker = options => {
                const graceful = !!(options && options.graceful);
                clearTimeout(timer);
                const pending = readController;
                readController = null;
                const url = blobUrl;
                blobUrl = null;
                worker?.terminate(); worker = null;
                setTimeout(() => {
                    if (pending && !graceful) { try { pending.abort(); } catch (_) {} }
                    if (url) { try { URL.revokeObjectURL(url); } catch (_) {} }
                }, 0);
            };
            const cleanup = async sessionId => {
                if (!sessionId) return;
                const db = await RPStreamImport.database();
                try { await RPStreamImport.removeSession(db, sessionId); } finally { db.close(); }
            };
            const fail = (message, detail) => {
                mark('fail', { msg: String(message || ''), why: '最后消息：' + lastWorkerMessage });
                const settle = settlePass; settlePass = null; settle?.();
                stopWorker();
                setPhase('failed', 'fail');
                state.paused = false; state.error = message; state.message = '导入未完成，原数据未改动';
                state.errorPath = detail?.path || ''; state.errorLimit = detail?.unitLimit || 0;
                cleanup(id).catch(error => console.warn('清理导入暂存失败:', error));
            };
            const watchdog = (delay = 45000) => {
                clearTimeout(timer);
                if (state.paused) return;
                timer = setTimeout(() => {
                    mark('watchdog', { why: delay + 'ms 内无任何消息', msg: '最后消息：' + lastWorkerMessage });
                    fail('导入响应超时，请重试；原数据未改动');
                }, delay);
            };
            const cancel = async () => {
                generation++;
                if (isApplying.value) { controller?.abort(); return; }
                mark('cancel', { why: '用户取消', msg: '最后消息：' + lastWorkerMessage });
                const settle = settlePass; settlePass = null; settle?.();
                stopWorker();
                const previous = id; id = null;
                setPhase('cancelled', 'cancel');
                state.paused = false; state.message = '已取消，原数据未改动';
                await cleanup(previous);
            };
            // [rphub 2.9.040] 大文件先清点再导入。307MB 的包一次全塞进去，手机端必然在
            //   「进度 100%」之后卡死：暂存库里躺着三百兆，解码器还要把每条的值都建出来。
            //   清单这一遍全程按字节整段跳过，一个值都不建、一条都不落库，只报每项多大。
            const SURVEY_MIN = 48 * 1048576;
            const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
            let fileRef = null;
            // 旧版自动备份快照永远不参与导入（解码器里就跳过了），不能列成可勾选项。
            const isLegacyKey = key => {
                const raw = String(key || '').replace(/^__ls__:/, '');
                const modern = raw.startsWith('silly_tavern_') ? 'rp_hub_' + raw.slice('silly_tavern_'.length) : raw;
                return modern.startsWith('rp_hub_auto_backup_') && modern !== 'rp_hub_auto_backup_config';
            };
            // 后缀一律不截断：几个聊天共用同一段前缀时，截断会让整张表全是同名行。
            //   显示不下交给 CSS 的 ellipsis，用户至少能从开头分辨。
            const labelOf = key => {
                const raw = String(key || '');
                if (raw === 'rp_hub_characters') return '角色卡库';
                if (raw === 'rp_hub_auto_backup_config') return '自动备份设置';
                if (raw.startsWith('rp_hub_chat_')) return '聊天记录 · ' + raw.slice('rp_hub_chat_'.length);
                if (raw.startsWith('rp_hub_')) return raw.slice(7);
                if (raw.startsWith('__ls__:')) return '偏好 · ' + raw.slice(7);
                return raw;
            };
            // 记忆正文（classic_memories_*）与记忆版本记录（b1_memory_state_*）必须同进同退，
            //   否则核对会判「缺少正文」。按同一段 scope 合成一行。
            const memoryScope = key => {
                const raw = String(key || '');
                for (const prefix of ['rp_hub_classic_memories_', 'rp_hub_b1_memory_state_'])
                    if (raw.startsWith(prefix)) return raw.slice(prefix.length);
                return '';
            };
            const buildItems = list => {
                const rows = new Map();
                for (const item of list) {
                    const key = String(item && item.key || '');
                    if (!key || isLegacyKey(key)) continue;
                    const scope = memoryScope(key);
                    const group = scope ? 'memory:' + scope : 'key:' + key;
                    let row = rows.get(group);
                    if (!row) { row = { group, keys: [], bytes: 0, label: '' }; rows.set(group, row); }
                    row.keys.push(key);
                    row.bytes += Math.max(0, Number(item.bytes) || 0);
                    if (!row.label) row.label = scope ? '记忆 · ' + scope : labelOf(key);
                }
                // 同名的行加序号，免得 5 行一模一样的「聊天记录 · xxx」没法选。
                const seen = new Map();
                for (const row of rows.values()) {
                    const count = (seen.get(row.label) || 0) + 1;
                    seen.set(row.label, count);
                    if (count > 1) row.label += ' #' + count;
                }
                return [...rows.values()].sort((a, b) => b.bytes - a.bytes);
            };
            // 一趟完整读取：建 worker、把文件喂进去、等它给出 expect 那条消息。
            //   fileRef.url 是「从备份列表恢复」那条路径，流是一次性的，所以每一趟都重新 fetch。
            const launch = async (extra, expect) => {
                const run = generation;
                watchdog(10000);
                const response = await fetch('assets/js/stream-import-worker.js?v=' + window.RP_LOCAL_VERSION);
                if (!response.ok) throw new Error('导入组件加载失败，请重新打开软件');
                const code = await response.text();
                if (disposed || run !== generation) return null;
                let stream;
                if (fileRef.url) {
                    readController = new AbortController();
                    const content = await fetch(fileRef.url, { cache: 'no-store', signal: readController.signal });
                    if (!content.ok || !content.body) throw new Error('读取本地备份失败，请重新选择文件');
                    stream = content.body;
                }
                if (disposed || run !== generation) return null;
                blobUrl = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
                worker = new Worker(blobUrl);
                try {
                    return await new Promise(resolve => {
                        let settled = false;
                        const settle = data => {
                            if (settled) return;
                            settled = true;
                            settlePass = null;
                            resolve(data || null);
                        };
                        settlePass = () => settle(null);
                        worker.onmessage = ({ data }) => {
                            if (settled) return;
                            watchdog();
                            if (data.type === 'ready') {
                                worker.postMessage({ type: 'import', id, profile: props.profile,
                                    limits: measureTransferLimits(RPStreamImport.profile(props.profile)),
                                    survey: !!extra.survey, pick: extra.pick || null,
                                    ...(extra.ranges ? { ranges: extra.ranges } : {}),
                                    ...(stream ? { stream, name: fileRef.name, bytes: fileRef.size } : { file: fileRef.file }) },
                                    stream ? [stream] : []);
                                return;
                            }
                            if (data.type === 'progress') {
                                lastWorkerMessage = 'progress: ' + String(data.phase || '');
                                state.read = data.read; state.bytes = data.bytes || state.bytes; state.message = data.phase;
                                // 每 2 秒留一条采样：中断后能看出「最后推进到多少 MB、当时堆多大」。
                                if (performance.now() - lastSample >= 2000) {
                                    lastSample = performance.now();
                                    mark('sample', { msg: String(data.phase || '') + ' ' + ((Number(data.read) || 0) / 1048576).toFixed(1) + 'MB' });
                                }
                                return;
                            }
                            if (data.type === 'failed') { fail(data.message, data); settle(null); return; }
                            if (data.type === expect) settle(data);
                        };
                        worker.onerror = event => { event.preventDefault(); fail('导入组件异常，请重试；原数据未改动'); settle(null); };
                        worker.onmessageerror = () => { fail('导入消息读取失败，请重试'); settle(null); };
                    });
                } finally {
                    // 这一趟的东西全部作废：先停 worker，worker 里那份暂存连接和整棵解析树
                    //   才跟着线程一起没。收尾放在这里，界面重绘之前就已经干净了。
                    stopWorker({ graceful: true });
                }
            };
            // [rphub 2.9.044] 默认全选 —— 但只在「能按字节区间读」时。
            //   敢放开全选的依据：2.9.042 之后第二趟只读勾选的那几条（真机已验证全选可过），
            //   读取量与峰值内存都跟着勾选量走。
            //   从备份列表打开时（fileRef.url，一次性流）没有随机读能力，拿不到 ranges，
            //   两趟都得从头读到尾 —— 这时全选的代价就是「几百兆连读两遍」，正是
            //   2.9.038~041 崩溃的那个形状。这一路仍退回「先选体积小的一批」。
            const AUTO_BUDGET = 40 * 1048576;
            const pickSmallBatch = items => {
                const picked = [];
                let total = 0;
                for (const row of [...items].sort((a, b) => a.bytes - b.bytes)) {
                    if (picked.length && total + row.bytes > AUTO_BUDGET) continue;
                    picked.push(row.group);
                    total += row.bytes;
                }
                return picked;
            };
            const defaultPick = (items, canRange) => canRange ? items.map(row => row.group) : pickSmallBatch(items);
            const surveyPass = async () => {
                setPhase('reading', 'survey', '清点文件 ' + state.name + ' ' + format(state.bytes));
                state.message = '正在清点内容（只量体积，不读数据本体）';
                const data = await launch({ survey: true }, 'survey');
                if (!data) return false;
                const items = buildItems(data.items || []);
                if (!items.length) { fail('没有读出可导入的内容，请确认这是 RP-Hub 全量备份'); return false; }
                // 能不能按区间读：既要清点出连续区间，也得真有可随机读取的 File。
                const canRange = !!data.indexed && !!fileRef.file;
                Object.assign(state, { items, picked: defaultPick(items, canRange),
                    legacyCount: Number(data.legacyCount) || 0, legacyTotal: Number(data.legacyBytes) || 0,
                    // [rphub 2.9.042] 清点顺带量出的字节区间：导入时只读勾选的那几条。
                    spans: Array.isArray(data.spans) ? data.spans : [], indexed: !!data.indexed,
                    entriesOpen: Number.isFinite(data.entriesOpen) ? data.entriesOpen : -1,
                    entriesClose: Number.isFinite(data.entriesClose) ? data.entriesClose : -1 });
                setPhase('select', 'survey-done');
                const rest = items.length - state.picked.length;
                state.message = canRange
                    ? '共 ' + items.length + ' 项，已全选；点开清单可逐项取消'
                    : '共 ' + items.length + ' 项；这类备份不能按区间读，先选体积小的一批'
                        + (rest > 0 ? '，剩下 ' + rest + ' 项可点开清单自己勾' : '');
                return true;
            };
            const importPass = async (pick, ranges) => {
                id = newId();
                setPhase('reading', 'import', ranges ? '正在读取选中的那几条（跳过其余 ' + format(Math.max(0, state.bytes -
                    ranges.reduce((sum, item) => sum + (item.end - item.start), 0))) + '）' : '');
                state.message = ranges ? '正在读取选中的条目（只读这一段，不再重读整个文件）' : '准备读取文件';
                const data = await launch({ pick: pick || null, ranges: ranges || null }, 'complete');
                if (!data) return;
                try {
                    mark('done', { msg: data.ranged ? '核对完成（只读了选中的 ' + format(Number(data.read) || 0) + '）' : '核对完成，等待确认' });
                    state.bytes = data.bytes || state.bytes; state.read = state.bytes; state.summary = data.summary;
                    state.legacy = Array.isArray(data.legacy) ? data.legacy.filter(item => item && item.key) : [];
                    state.cleanLegacy = false;
                    state.unitLimit = Number(data.unitLimit) || 0;
                    state.paused = false;
                    state.legacyCount = Number(data.legacyCount) || 0;
                    state.legacyTotal = Number(data.legacyBytes) || 0;
                    state.message = data.ranged
                        ? '校验完成，这次只读了选中的 ' + format(Number(data.read) || 0) + '，等待确认'
                        : '校验完成，等待确认';
                    setPhase('ready', 'complete');
                } catch (error) {
                    mark('complete-error', { msg: String((error && error.message) || error) });
                    fail('导入收尾失败：' + ((error && error.message) || error));
                }
            };
            const start = async event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (busy.value || external.value || state.phase === 'select') return;
                await cancel();
                if (disposed) return;
                // 上一轮没走完留下的那行字不能跟着这一轮一起显示，否则截图永远对不上号。
                state.recap = '';
                const isBlob = file instanceof Blob;
                fileRef = isBlob
                    ? { file, name: String(file.name || ''), size: Number(file.size) || 0 }
                    : { url: file.url, name: String(file.name || ''), size: Number(file.size) || 0 };
                generation++;
                Object.assign(state, { name: fileRef.name, bytes: fileRef.size, read: 0, error: '', errorPath: '',
                    summary: null, paused: false, items: [], picked: [], unitLimit: 0, legacyCount: 0, legacyTotal: 0,
                    spans: [], indexed: false, entriesOpen: -1, entriesClose: -1 });
                if (/\.zip$/i.test(fileRef.name)) { fail('ZIP 文件请使用“导入备份”'); return; }
                setPhase('reading', 'start', '文件 ' + fileRef.name + ' ' + format(fileRef.size));
                if (fileRef.size >= SURVEY_MIN) { await surveyPass(); return; }
                await importPass(null);
            };
            // [rphub 2.9.042] 由清点量出的区间拼出第二趟要读的字节段：
            //   头部（到 entries 的 '[' 之后）+ 勾选的每一条 + 尾巴（']' 及其后）。
            //   最后一条不能带上尾逗号，否则 ']' 前会多出一个逗号、整包语法错误。
            //   区间之间恰好隔一个字节（逗号），这一点已由解码器逐段核验过。
            const buildRanges = keys => {
                if (!state.indexed || !state.spans.length) return null;
                if (!fileRef?.file || !(fileRef.file instanceof Blob)) return null;
                if (!(state.entriesOpen >= 0) || !(state.entriesClose > state.entriesOpen)) return null;
                if (state.entriesClose > fileRef.size) return null;
                const wanted = new Set(keys);
                const chosen = state.spans.filter(item => wanted.has(item.key));
                if (!chosen.length) return null;
                const ranges = [{ start: 0, end: state.entriesOpen }];
                for (let index = 0; index < chosen.length; index++) {
                    const span = chosen[index];
                    if (!(span.end > span.start) || span.start < state.entriesOpen || span.end > state.entriesClose) return null;
                    ranges.push({ start: span.start, end: index < chosen.length - 1 ? span.end + 1 : span.end, entry: true });
                }
                ranges.push({ start: state.entriesClose, end: fileRef.size });
                return ranges;
            };
            const pickAll = on => { state.picked = on ? state.items.map(item => item.group) : []; };
            const startImport = async () => {
                if (state.phase !== 'select' || !state.picked.length) return;
                const keys = [];
                for (const row of state.items) if (state.picked.includes(row.group)) keys.push(...row.keys);
                if (!keys.length) return;
                const ranges = buildRanges(keys);
                // 勾选清单照旧传下去：区间读省掉的是「没勾选的那几百兆」，
                //   尾巴里的偏好仍要靠 pick 逐条筛，否则取消勾选的偏好也会被写进去。
                await importPass(keys, ranges);
            };
            const pause = () => {
                state.paused = !state.paused;
                worker?.postMessage({ type: state.paused ? 'pause' : 'resume' });
                if (state.paused) clearTimeout(timer); else watchdog();
            };
            const apply = async () => {
                if (state.phase !== 'ready') return;
                setPhase('applying', 'apply');
                state.applied = 0; state.message = '正在恢复数据'; state.error = '';
                controller = new AbortController();
                try {
                    await RPStreamImport.apply(id, {
                        beforeApply: props.prepare, restoreValue: value => props.decode(value), signal: controller.signal,
                        progress: (done, total, message) => { state.applied = total ? Math.floor(done / total * 100) : 0; state.message = message || '正在恢复数据 ' + done + ' / ' + total; },
                    });
                    if (state.cleanLegacy && state.legacy.length) {
                        state.message = '正在清理旧版备份快照';
                        await purgeLegacyKeys(state.legacy.map(item => item.key));
                    }
                    mark('applied', { msg: '导入完成' });
                    setPhase('success', 'applied');
                    state.applied = 100; state.message = '导入完成，正在重新打开';
                    setTimeout(() => {
                        try { window.AndroidBridge?.clearPatchCacheBeforeReload?.(); } catch (_) {}
                        window.location.reload();
                    }, 300);
                } catch (error) {
                    setPhase(error.recoveryRequired ? 'recovery' : 'failed', 'apply-error', String(error.message || ''));
                    state.error = error.name === 'AbortError' ? '已取消，原数据已恢复' : error.message;
                } finally { controller = null; }
            };
            // 旧版自动备份快照：当前版本不读取，删掉只是回收空间。走存储层统一入口，
            //   逻辑键（剥掉 rp_hub_ 前缀）由它自己补前缀并连带清历史前缀。
            const purgeLegacyKeys = async keys => {
                const api = window.RPHubStorage;
                if (!api || typeof api.deleteStoredValue !== 'function') return 0;
                let done = 0;
                for (const key of keys) {
                    const logical = String(key || '').replace(/^rp_hub_/, '');
                    if (!logical) continue;
                    try { await api.deleteStoredValue(logical); done++; }
                    catch (error) { console.warn('清理旧版快照失败:', key, error); }
                }
                return done;
            };
            const beforeUnload = event => {
                if (window.AndroidBridge?.isNativeApp?.() || state.phase === 'success' ||
                    (props.task?.active && props.task.percent === 100 && !props.task.error)) return;
                if (busy.value || props.task?.locked) { event.preventDefault(); event.returnValue = ''; }
            };
            window.addEventListener('beforeunload', beforeUnload);
            onBeforeUnmount(() => {
                // 面板被卸载是唯一能「静默杀掉 worker」的路径 —— 但只有真在导入时才留痕。
                // [rphub 2.9.048] 切外观会重建整棵子树，idle 面板也被卸载；写 unmount 会让
                //   下次挂载误报「上次导入没有正常结束」。success/cancelled/failed 已经走完，
                //   也不该再补一条没头没尾的记录盖掉原本的终态。
                if (!TRACE_SETTLED.includes(state.phase)) {
                    mark('unmount', { why: '面板卸载', msg: '最后消息：' + lastWorkerMessage });
                }
                disposed = true; generation++; settlePass?.(); settlePass = null; stopWorker(); controller?.abort();
                clearInterval(clockTimer);
                window.removeEventListener('beforeunload', beforeUnload);
                window.removeEventListener('rp-ui-theme-change', syncArt);
                restorePage();
                if (!isApplying.value) cleanup(id).catch(console.warn);
            });
            const choose = () => {
                if (busy.value || external.value) return;
                // 上次导入没正常收尾：先把那行字摊给用户看（可截图反馈），再让他选文件。
                if (state.phase === 'idle') {
                    const recap = pendingRecap();
                    if (recap) { state.recap = recap; return; }
                }
                input.value?.click();
            };
            const resume = () => { state.recap = ''; input.value?.click(); };
            return { input, panel, art, state, busy, external, isApplying, isOpen, canClose, close, handleBack, trapFocus, percent, format, start, pause, cancel, apply, choose, resume, pickedBytes, pickAll, startImport,
                reload: () => window.location.reload(),
                startUrl: (url, name, bytes) => start({ target: { value: '', files: [{ url, name, size: bytes }] } }) };
        },
        template: `
            <input ref="input" type="file" accept=".json,application/json" hidden aria-label="选择流式导入文件" @change="start">
            <teleport to="body">
                <div v-if="isOpen" class="stream-import-overlay" role="dialog" aria-modal="true" :aria-label="external ? task.title : '导入备份'">
                    <section ref="panel" class="stream-import-dialog transfer-dialog" tabindex="-1" @keydown="trapFocus">
                        <button v-if="canClose" class="transfer-close" type="button" :aria-label="external ? '关闭备份弹窗' : '关闭导入弹窗'" @click="close"><shell-icon name="X"></shell-icon></button>
                        <img class="transfer-mascot" :src="art" alt="" aria-hidden="true" draggable="false">
                        <h3>{{ external ? task.title : state.phase === 'recovery' ? '需要恢复原数据' : state.phase === 'ready' ? '备份已准备好' : state.phase === 'select' ? '选择要导入的内容' : state.phase === 'failed' ? '这次没有导入成功' : state.phase === 'cancelled' ? '已取消导入' : '导入备份' }}</h3>
                        <p v-if="!external" class="transfer-filename">{{ state.name }}</p>
                        <div v-if="!external && state.recap" style="margin:8px 0 12px;padding:10px 12px;border-radius:10px;border:1px solid #f0c2a8;background:#fff7f1;text-align:left">
                            <p style="font-size:12px;font-weight:600;color:#9a3412;margin:0 0 4px">上次导入没有正常结束</p>
                            <p style="font-size:12px;color:#7c2d12;line-height:1.6;margin:0;word-break:break-all">{{ state.recap }}</p>
                            <p style="font-size:11px;color:#b45309;margin:6px 0 0">这行字用于反馈问题，可以截图。</p>
                        </div>
                        <progress v-if="external || ['reading','ready','applying','success'].includes(state.phase)"
                            :value="percent" max="100" :aria-label="external ? '备份进度' : '文件读取进度'"></progress>
                        <div class="transfer-progress-meta" v-if="external">
                            <span>{{ task.detail }}</span><span>{{ Math.floor(percent) }}%</span>
                        </div>
                        <div class="transfer-progress-meta" v-else-if="['reading','ready'].includes(state.phase)">
                            <span>{{ format(state.read) }} / {{ format(state.bytes) }}</span><span>{{ percent }}%</span>
                        </div>
                        <p role="status" v-if="external || state.message">{{ external ? task.message : state.paused ? '已暂停，随时可以继续。' : state.message }}<span v-if="!external && state.phase === 'reading'" style="color:#9ca3af"> · {{ state.clock }}</span></p>
                        <p v-if="external ? task.error : state.error" role="alert" class="transfer-error">{{ external ? task.error : state.error }}</p>
                        <p v-if="!external && state.errorPath" class="transfer-error transfer-error-path">出错位置：{{ state.errorPath }}<span v-if="state.errorLimit">（当前档位单条上限 {{ Math.round(state.errorLimit / 1048576) }} MB）</span></p>
                        <p v-if="!external && state.summary" class="transfer-summary">角色卡 {{ state.summary.cards }} 张 · 聊天 {{ state.summary.messages }} 条 · 记忆 {{ state.summary.memories }} 条</p>
                        <div v-if="!external && state.phase === 'select'" style="margin:8px 0;padding:10px 12px;border-radius:10px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left">
                            <details>
                                <summary style="font-size:12px;color:#374151;cursor:pointer;line-height:1.6">共 {{ state.items.length }} 项 · 已选 {{ state.picked.length }} 项 · {{ format(pickedBytes) }}<span style="color:#9ca3af">（点开可逐项取消）</span></summary>
                                <div style="display:flex;gap:6px;margin:8px 0 6px">
                                    <button class="shell-button" type="button" @click.prevent="pickAll(true)">全选</button>
                                    <button class="shell-button" type="button" @click.prevent="pickAll(false)">全不选</button>
                                </div>
                                <div style="max-height:36vh;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff">
                                    <label v-for="row in state.items" :key="row.group" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#374151">
                                        <input type="checkbox" :value="row.group" v-model="state.picked">
                                        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ row.label }}</span>
                                        <span style="flex:none;color:#6b7280">{{ format(row.bytes) }}</span>
                                    </label>
                                </div>
                            </details>
                            <p v-if="state.legacyCount" style="font-size:11px;color:#1d4ed8;line-height:1.5;margin:6px 0 0">另有 {{ state.legacyCount }} 条旧备份快照（{{ format(state.legacyTotal) }}）已自动跳过，不在这里列。</p>
                            <p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:6px 0 0">导入只会写入选中的项，没选的保持原样。体积大的项建议单独导一次；同名的项以最后一次导入为准。</p>
                        </div>
                        <div v-if="!external && state.phase === 'ready' && state.legacy.length" style="margin:8px 0;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;text-align:left">
                            <p style="font-size:12px;font-weight:600;color:#374151;margin:0 0 4px">检测到 {{ state.legacy.length }} 条旧版备份快照，共 {{ format(legacyBytes) }}</p>
                            <p style="font-size:11px;color:#6b7280;line-height:1.5;margin:0 0 6px">当前版本既不读取、也不参与还原，只是占着空间。导入会自动跳过它们。</p>
                            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#374151">
                                <input type="checkbox" v-model="state.cleanLegacy"> 导入后一并删除这些旧快照
                            </label>
                            <p style="font-size:11px;color:#9ca3af;margin:6px 0 0">删除后无法从应用内找回；不确定就先别勾，可稍后在「数据体检」里导出再清理。</p>
                        </div>
                                    <div v-if="!external && state.phase === 'ready' && state.legacyCount" style="margin:8px 0;padding:10px 12px;border-radius:10px;border:1px solid #d7e3f4;background:#f4f8ff;text-align:left">
                            <p style="font-size:12px;color:#1e3a8a;line-height:1.6;margin:0">已跳过 {{ state.legacyCount }} 条旧备份快照（{{ format(state.legacyTotal) }}），不参与这次导入。原文件里这些数据还在，需要时从原文件取即可。</p>
                        </div>
                        <p v-if="!external && state.phase === 'ready'" class="transfer-warning">导入会覆盖备份中对应的现有数据。请先保留当前备份，再确认导入。</p>
                        <div v-if="external && task.confirm" class="transfer-actions">
                            <button class="shell-button" type="button" @click="task.confirm(false)">取消</button>
                            <button class="shell-button transfer-primary" type="button" @click="task.confirm(true)">确认导入</button>
                        </div>
                        <div v-if="external && task.recovery" class="transfer-actions">
                            <button class="shell-button transfer-primary" type="button" @click="reload">重新打开并恢复</button>
                        </div>
                        <div v-if="!external" class="transfer-actions">
                            <button v-if="state.recap && state.phase === 'idle'" class="shell-button transfer-primary" type="button" @click="resume">重新选择备份</button>
                            <button v-if="state.phase === 'reading'" class="shell-button" type="button" @click="pause">{{ state.paused ? '继续' : '暂停' }}</button>
                            <button v-if="state.phase === 'select'" class="shell-button transfer-primary" type="button" :disabled="!state.picked.length" @click="startImport">导入选中项</button>
                            <button v-if="['reading','ready','select'].includes(state.phase)" class="shell-button" type="button" @click="cancel">取消</button>
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
