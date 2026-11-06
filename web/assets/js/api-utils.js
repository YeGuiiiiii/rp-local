// Shared model API transport for chat, memory, templates and standalone pages.
(function () {
    const { extractApiErrorMessage, formatApiErrorMessage, getApiUsagePayload } = window.RPHubUtils;
    const { extractNativeReasoning, isNativeReasoningPart } = window.RPHubCardUtils;
    const buildApiEndpoint = (baseUrl, path) => {
        const root = String(baseUrl || '').replace(/\/+$/, '');
        const apiRoot = /\/v1$/i.test(root) ? root : `${root}/v1`;
        return `${apiRoot}/${path}`;
    };

    const buildUserInputToolMessages = (text, callId) => [
        {
            role: 'assistant',
            content: null,
            tool_calls: [{
                id: callId,
                type: 'function',
                function: { name: 'read_user_input', arguments: '{}' }
            }]
        },
        {
            role: 'tool',
            tool_call_id: callId,
            content: JSON.stringify({ source: 'user_input', text })
        }
    ];

    const parsePayload = (text, status) => {
        const data = JSON.parse(text);
        const error = extractApiErrorMessage(data, status);
        if (error) throw new Error(error);
        return data;
    };
    const readTextContent = value => Array.isArray(value)
        ? value.filter(part => !isNativeReasoningPart(part)).map(part => part?.text || part?.content || '').join('')
        : String(value || '');
    // 仅用于日志：合并响应字段，不提取正文或解码工具参数。
    const mergeResponseDelta = (previous = {}, delta = {}, append = true) => {
        const merged = { ...previous };
        for (const [key, value] of Object.entries(delta)) {
            if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
            if (Array.isArray(value)) {
                const items = Array.isArray(merged[key]) ? [...merged[key]] : [];
                if (!append) {
                    merged[key] = value.length ? value : items;
                    continue;
                }
                value.forEach((part, position) => {
                    const index = part?.index ?? (key === 'tool_calls' ? position : null);
                    if (Number.isInteger(index) && index >= 0) items[index] = mergeResponseDelta(items[index], part);
                    else items.push(part);
                });
                merged[key] = items;
            } else if (value && typeof value === 'object') {
                merged[key] = mergeResponseDelta(merged[key], value, append);
            } else if (typeof value === 'string' && /^(content|text|reasoning_content|reasoning|thinking|thinking_content|thought|thoughts|reasoning_text|refusal|arguments|name)$/.test(key)) {
                if (value || merged[key] === undefined) {
                    merged[key] = (append && typeof merged[key] === 'string' ? merged[key] : '') + value;
                }
            } else if (value !== null || merged[key] === undefined) {
                merged[key] = value;
            }
        }
        return merged;
    };
    const replyTool = {
        type: 'function',
        function: {
            name: 'output_reply',
            description: '将本次回复交给聊天界面显示。遵守现有输出规则，正文及需要附带的面板、图片标记、变量更新块等全部放入 content，不在普通消息中重复输出。检索工具返回结果后，只传新增回复内容。',
            parameters: {
                type: 'object',
                properties: { content: { type: 'string', description: '本次回复的原文，保留原有格式；作为 JSON 字符串正确转义。' } },
                required: ['content'],
                additionalProperties: false
            }
        }
    };

    // 超时按“多久没有响应”计算，持续输出的长回复不会因总时长被中断。
    const createAbortError = () => {
        const error = new Error('Generation cancelled by user');
        error.name = 'AbortError';
        return error;
    };

    // [RP-Hub 2.8.18] 模型真实状态副标题 —— 在官方思考气泡下追加一行小字，随时分辨
    // 「还没响应 / 正在往抗截断工具吐字 / 长思考静默」。只给 .typing-bubble /
    // .active-tool-waiting 挂 class 并写一个 CSS 变量，不插入子节点、不改 Vue state、
    // 不碰官方计时；目标节点不存在时全程静默跳过。
    const rphubModelStatus = (() => {
        const STYLE_ID = 'rphub-model-status-style';
        const NODES = '.typing-bubble,.active-tool-waiting';
        const CLASSES = ['rphub-model-waiting', 'rphub-model-responding', 'rphub-model-stalled'];
        const TICK_MS = 500;
        const STALL_MS = 30000;
        // 只在出现「实质增量」时才判定为已响应，避免上游空心跳帧（仅 role / 空 delta）被误报成正在吐字。
        const SUBSTANTIVE = /"(?:arguments|content|reasoning_content|reasoning|thinking|thinking_content|thought|thoughts|reasoning_text|refusal|text)":\s*"(?!")/;
        let timer = null;
        let current = null;
        const ensureStyles = () => {
            if (document.getElementById(STYLE_ID)) return;
            const style = document.createElement('style');
            style.id = STYLE_ID;
            const accent = 'rgb(var(--primary-500, 90 111 240))';
            const dark = ':root[data-app-theme="dark"] ';
            style.textContent = [
                '.typing-bubble.rphub-model-waiting::after,.active-tool-waiting.rphub-model-waiting::after{content:var(--rphub-model-status,"等待模型响应")}',
                '.typing-bubble.rphub-model-responding::after,.active-tool-waiting.rphub-model-responding::after{content:var(--rphub-model-status,"模型正在响应")}',
                '.typing-bubble.rphub-model-stalled::after,.active-tool-waiting.rphub-model-stalled::after{content:var(--rphub-model-status,"模型正在长思考")}',
                '.typing-bubble.rphub-model-waiting::after,.typing-bubble.rphub-model-responding::after,.typing-bubble.rphub-model-stalled::after,'
                    + '.active-tool-waiting.rphub-model-waiting::after,.active-tool-waiting.rphub-model-responding::after,.active-tool-waiting.rphub-model-stalled::after{'
                    + 'display:block;width:100%;margin-top:7px;padding:0 2px;text-align:left;font-size:10.5px;line-height:1.45;'
                    + 'font-weight:500;letter-spacing:.1px;font-variant-numeric:tabular-nums;white-space:normal;overflow-wrap:anywhere;'
                    + 'opacity:.76;transition:color .2s ease,opacity .2s ease}',
                '.typing-bubble.rphub-model-waiting::after,.active-tool-waiting.rphub-model-waiting::after{color:#858b96}',
                '.typing-bubble.rphub-model-responding::after,.active-tool-waiting.rphub-model-responding::after{color:' + accent + ';opacity:.9}',
                '.typing-bubble.rphub-model-stalled::after,.active-tool-waiting.rphub-model-stalled::after{color:#d08a12;opacity:.9}',
                dark + '.typing-bubble.rphub-model-waiting::after,' + dark + '.active-tool-waiting.rphub-model-waiting::after{color:#b0b6c2}',
                dark + '.typing-bubble.rphub-model-responding::after,' + dark + '.active-tool-waiting.rphub-model-responding::after{color:' + accent + ';opacity:.95}',
                dark + '.typing-bubble.rphub-model-stalled::after,' + dark + '.active-tool-waiting.rphub-model-stalled::after{color:#ffc247;opacity:.95}'
            ].join('\n');
            (document.head || document.documentElement).appendChild(style);
        };
        const fmtDuration = ms => {
            const total = Math.max(0, Math.floor(ms / 1000));
            return total < 60 ? total + 's' : Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
        };
        const setStatusText = text => {
            try {
                const root = document.documentElement;
                if (text) root.style.setProperty('--rphub-model-status', '"' + String(text).replace(/["\\]/g, '\\$&') + '"');
                else root.style.removeProperty('--rphub-model-status');
            } catch (_) { }
        };
        const syncBubbleClass = () => {
            try {
                const nodes = document.querySelectorAll(NODES);
                if (!nodes.length) return;
                const state = current;
                let name = '';
                if (state && !state.ended) {
                    if (!state.received) name = CLASSES[0];
                    else name = Date.now() - state.lastDataAt > STALL_MS ? CLASSES[2] : CLASSES[1];
                }
                nodes.forEach(node => {
                    CLASSES.forEach(item => node.classList.remove(item));
                    if (name) node.classList.add(name);
                });
            } catch (_) { }
        };
        const render = () => {
            const state = current;
            if (!state) return;
            const now = Date.now();
            if (!state.received) setStatusText('等待模型响应 · 已 ' + fmtDuration(now - state.startAt));
            else {
                const silent = now - state.lastDataAt;
                setStatusText(silent > STALL_MS
                    ? '静默 ' + fmtDuration(silent) + ' · 可能在长思考'
                    : '模型响应中 · 累计 ' + state.chars + ' 字 · 静默 ' + fmtDuration(silent));
            }
            syncBubbleClass();
        };
        const stopTimer = () => {
            if (timer) { clearInterval(timer); timer = null; }
        };
        // 只有主聊天请求（附带 logResponse）才驱动气泡；记忆 / UI 副模型请求返回 null，全程不介入。
        const begin = options => {
            // 2.8.20：双判据 —— 官方一旦改名或移除 logResponse，单条件会让状态副标题静默失效。
            // 主聊天路径传 onDelta（逐段回调），记忆 / UI 副模型不传；独立页虽也传，
            // 但页面上没有 .typing-bubble ⇒ class 同步自然空转，无副作用。
            const rphubIsMainChat = !!options
                && (options.logResponse === true || typeof options.onDelta === 'function');
            if (!rphubIsMainChat) return null;
            try {
                ensureStyles();
                stopTimer();
                const state = { startAt: Date.now(), lastDataAt: Date.now(), received: false, chars: 0, ended: false };
                current = state;
                render();
                timer = setInterval(render, TICK_MS);
                return {
                    onData(text) {
                        if (current !== state || state.ended) return;
                        state.lastDataAt = Date.now();
                        if (typeof text === 'string') {
                            state.chars += text.length;
                            if (!state.received && SUBSTANTIVE.test(text)) state.received = true;
                        }
                        render();
                    },
                    end() {
                        if (current !== state || state.ended) return;
                        state.ended = true;
                        stopTimer();
                        current = null;
                        setStatusText('');
                        syncBubbleClass();
                    }
                };
            } catch (_) { return null; }
        };
        return { begin };
    })();

    const throwIfChatAborted = (signal, force = false) => {
        if (signal?.aborted || force === true) throw createAbortError();
    };

    // ===== 2.8.51：SSE 保活 =====
    // 官方超时是「多久没收到数据」而不是「总时长」——timer 在每次 reader.read() 返回后重置。
    // 但长思考模型在思考阶段一个 chunk 都不发，超过 120s 就被前端 abort，报「API 响应超时」，
    // 而服务端往往已经生成完并计费（日志完整、费用照扣）。
    // 这里往流里补 SSE 注释行（": keep-alive"）：注释行不是 data: 行，readLine 直接忽略，
    // 对正文/工具调用/用量统计零影响，但能让 read() 定期返回，把官方计时器一直重置下去。
    const KEEP_ALIVE_INTERVAL_MS = 15000;
    const KEEP_ALIVE_IDLE_MS = 10000;
    const KEEP_ALIVE_MAX_TOTAL_MS = 10 * 60 * 1000;
    const KEEP_ALIVE_MAX_INJECTS = 32;

    const keepAliveResponse = (response, options) => {
        try {
            if (!options || options.stream !== true) return response;
            if (!response || !response.body || typeof response.body.getReader !== 'function') return response;
            const contentType = (response.headers && response.headers.get('content-type')) || '';
            // ★ 2.8.58：中转站常把 SSE 流标成 text/plain / application/json / octet-stream。
            //   原来这条早退（必须 text/event-stream）一命中就整条放弃保活 ⇒ 长思考模型照样 120s 超时，
            //   服务端已经生成完并计费。改成两档：头就是 event-stream 的照旧；
            //   头可疑的等首块到了再判断（见 pull() 里的探测）。
            //   探测放在 pull() 里是因为 keepAliveResponse 必须保持同步 —— 调用点是
            //   `return await read(keepAliveResponse(response, options), touch);`，
            //   改成 async 会把一个 Promise 塞进 read()。
            //   绝不用 response.clone()：移动端/代理下 tee 的背压不稳，会丢首块。
            const declaredSse = /text\/event-stream/i.test(contentType);
            const probeSse = !declaredSse && (!contentType
                || /text\/plain|text\/html|application\/(?:json|x-ndjson|octet-stream)|text\/x-ndjson/i.test(contentType));
            if (!declaredSse && !probeSse) return response;
            if (typeof ReadableStream !== 'function' || typeof TextEncoder !== 'function') return response;

            const nativeReader = response.body.getReader();
            const keepAliveChunk = new TextEncoder().encode(': keep-alive\n\n');
            const startedAt = Date.now();
            let lastDataAt = Date.now();
            let finished = false;
            let controllerRef = null;
            let injected = 0;
            let timer = null;
            // 边界安全位：只有上一块的最后一个字节是换行时，才允许插注释行。
            // 否则上游可能正停在一行 data: 的中间（只发了半段 JSON），插进去会被拼进那行
            // JSON 里，直接污染 payload。初始 true：流刚建立时必然处于事件边界。
            let tailSafe = true;
            // 探测通过前不插注释行：普通 JSON/HTML 响应被插进去就是脏数据。
            let armed = declaredSse;
            const stop = () => {
                if (finished) return;
                finished = true;
                if (timer) clearInterval(timer);
                timer = null;
            };
            timer = setInterval(() => {
                if (!armed) return;
                if (finished || !controllerRef || !tailSafe) return;
                if (injected >= KEEP_ALIVE_MAX_INJECTS) return;
                if (Date.now() - startedAt > KEEP_ALIVE_MAX_TOTAL_MS) return;
                if (Date.now() - lastDataAt < KEEP_ALIVE_IDLE_MS) return;
                try {
                    controllerRef.enqueue(keepAliveChunk);
                    lastDataAt = Date.now();
                    injected += 1;
                } catch (_) {
                    stop();
                }
            }, KEEP_ALIVE_INTERVAL_MS);
            const stream = new ReadableStream({
                start(controller) { controllerRef = controller; },
                async pull(controller) {
                    try {
                        const chunk = await nativeReader.read();
                        if (chunk.done) {
                            stop();
                            try { controller.close(); } catch (_) { }
                            return;
                        }
                        lastDataAt = Date.now();
                        if (!armed && probeSse) {
                            // 首块探测：只看开头 32 字节，不消费、不丢弃 —— 同一块照原样往下发。
                            let head = '';
                            try {
                                const view = chunk.value && chunk.value.subarray
                                    ? chunk.value.subarray(0, 32)
                                    : chunk.value;
                                head = new TextDecoder('utf-8').decode(view);
                            } catch (_) { head = ''; }
                            if (/^\s*(?::|data:|event:|id:|retry:)/.test(head)) armed = true;
                        }
                        if (chunk.value && chunk.value.length) {
                            const lastByte = chunk.value[chunk.value.length - 1];
                            tailSafe = lastByte === 10 || lastByte === 13;
                        }
                        controller.enqueue(chunk.value);
                    } catch (error) {
                        stop();
                        try { controller.error(error); } catch (_) { }
                    }
                },
                cancel(reason) {
                    stop();
                    try { nativeReader.cancel(reason); } catch (_) { }
                }
            });
            const headers = new Headers(response.headers);
            // 注入后长度必然变了，留着会误导下游；content-type 必须保留（官方靠它判流式）。
            headers.delete('content-length');
            return new Response(stream, {
                status: response.status,
                statusText: response.statusText,
                headers: headers
            });
        } catch (_) {
            return response;
        }
    };

    // ===== 2.8.79：错误响应体的有界读取 =====
    // 官方原实现是裸 `const text = await response.text();`，有两个问题：
    // ① 上面 touch() 之后计时器不再重置。错误体卡住时（中转站 502 后不关连接、或慢慢吐字节）
    //    会一直等到 120s 被 abort，外层把 timedOut 当成「API 响应超时」，真实状态码与错误正文
    //    全丢，onErrorResponse 也从未触发，官方调试日志里没有原始错误体；
    // ② 正文没有上限，中转站或 CDN 返回的 HTML 错误页会整段写进 message.responseError。
    // 现在按 8KB 上限 + 5s 独立 deadline 读取，超时/超限都保留已读部分。
    // 中止必须抛 AbortError（而不是普通 Error），否则 app.js 里 error.name === 'AbortError'
    // 那条「生成已中止」分支会失效，用户点停止会看到「请求失败」。
    const API_ERROR_READ_LIMIT = 8192;
    const API_ERROR_READ_DEADLINE_MS = 5000;
    const API_ERROR_MESSAGE_LIMIT = 800;
    const clampApiErrorMessage = (detail) => {
        const text = String(detail || '');
        if (text.length <= API_ERROR_MESSAGE_LIMIT) return text;
        return text.slice(0, API_ERROR_MESSAGE_LIMIT) + '…（已截断，共 ' + text.length + ' 字符）';
    };
    const readApiErrorBody = async (response, controller, signal) => {
        if (signal?.aborted) throw createAbortError();
        let text = '';
        let bytes = 0;
        let complete = false;
        let reader = null;
        let timer = null;
        let onAbort = null;
        const read = (async () => {
            try {
                if (response.body === null) { complete = true; return; }
                if (typeof response.body?.getReader === 'function') {
                    reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    while (bytes < API_ERROR_READ_LIMIT) {
                        const chunk = await reader.read();
                        if (chunk.done) { text += decoder.decode(); complete = true; return; }
                        const take = chunk.value.subarray(0, API_ERROR_READ_LIMIT - bytes);
                        bytes += take.byteLength;
                        text += decoder.decode(take, { stream: true });
                    }
                    text += decoder.decode();
                    return;
                }
                const raw = String((await response.text()) || '');
                text = raw.slice(0, API_ERROR_READ_LIMIT);
                complete = raw.length <= API_ERROR_READ_LIMIT;
            } catch (error) {
                // 只有调用方主动中止才往上抛；deadline 触发的 abort 由下面 finally 统一收尾，
                // 这里吞掉是为了不让 read 变成未处理的 rejection。
                if (signal?.aborted) throw createAbortError();
            }
        })();
        const deadline = new Promise((resolve) => { timer = setTimeout(resolve, API_ERROR_READ_DEADLINE_MS); });
        const cancelled = new Promise((resolve, reject) => {
            if (!signal) return;
            onAbort = () => reject(createAbortError());
            signal.addEventListener('abort', onAbort, { once: true });
            if (signal.aborted) onAbort();
        });
        try {
            await Promise.race([read, deadline, cancelled]);
            if (signal?.aborted) throw createAbortError();
            return { text, incomplete: !complete };
        } finally {
            clearTimeout(timer);
            if (onAbort) signal.removeEventListener('abort', onAbort);
            if (!complete) {
                if (reader) { try { Promise.resolve(reader.cancel()).catch(() => { }); } catch (_) { } }
                try { controller.abort(); } catch (_) { }
            }
            // 这行只做一件事：read 结束后释放 reader 锁（complete 分支里不会走上面的
            // reader.cancel()）。不要误以为它在防 unhandledrejection —— Promise.race
            // 内部对每个 promise 都注册了 then，read 的拒绝一定有人消费；实测把这行
            // 删掉也测不出任何 unhandledrejection，它对本变异不敏感。
            const release = () => { if (reader) { try { reader.releaseLock(); } catch (_) { } } };
            read.then(release, release);
        }
    };
    const withApiResponse = async (options, read) => {
        const controller = new AbortController();
        // 2.7.84：pool===false 的请求（向量嵌入）不登记进共享池，
        // 否则「中止生成」调RPHubAbortChatRequests() 会连带打断它，
        // 而嵌入侧只检查传入 signal，会把打断误报成「返回的数据不完整」。
        window.RPHubChatAbortControllers = window.RPHubChatAbortControllers || new Set();
        if (options.pool !== false) window.RPHubChatAbortControllers.add(controller);
        const abort = () => controller.abort();
        let timer;
        let timedOut = false;
        const touch = () => {
            clearTimeout(timer);
            timer = setTimeout(() => { timedOut = true; controller.abort(); }, 120000);
        };
        if (options.signal?.aborted) abort();
        else options.signal?.addEventListener('abort', abort, { once: true });
        touch();
        try {
            const response = await fetch(options.url, {
                method: options.body === undefined ? 'GET' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.apiKey}` },
                ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
                signal: controller.signal
            });
            touch();
            if (!response.ok) {
                // 2.8.79：改为有界读取，详见 readApiErrorBody 上方注释。
                // 截断只作用于最终提示文本；onErrorResponse 拿到的是上限内的原文，
                // 官方调试日志链路不受影响。
                const diagnostic = await readApiErrorBody(response, controller, options.signal);
                const text = diagnostic.text;
                try { options.onErrorResponse?.(text); } catch (_) { }
                let payload;
                try { payload = JSON.parse(text); } catch (_) { }
                let detail;
                try {
                    detail = extractApiErrorMessage(payload, response.status) || formatApiErrorMessage(response.status, text);
                } catch (_) {
                    detail = text || response.statusText || '';
                }
                detail = String(detail || '请求失败');
                if (diagnostic.incomplete) detail += '\n（错误正文未完整读取）';
                const failure = new Error(clampApiErrorMessage(detail));
                // 挂上状态码与原文，上层要按 401/429 分流时不用再解析字符串
                failure.status = response.status;
                failure.responseBody = text;
                failure.responseBodyIncomplete = diagnostic.incomplete;
                throw failure;
            }
            return await read(keepAliveResponse(response, options), touch);
        } catch (error) {
            if (timedOut && !options.signal?.aborted) {
                const timeout = new Error('API 响应超时，请稍后重试');
                timeout.name = 'TimeoutError';
                throw timeout;
            }
            throw error;
        } finally {
            clearTimeout(timer);
            options.signal?.removeEventListener('abort', abort);
            window.RPHubChatAbortControllers?.delete?.(controller);
        }
    };

    window.RPHubAbortChatRequests = () => {
        const controllers = Array.from(window.RPHubChatAbortControllers || []);
        controllers.forEach(controller => {
            try { controller.abort(); } catch (error) {}
        });
    };

    const requestJson = options => withApiResponse(options, async response => parsePayload(await response.text(), response.status));

    const requestChatCompletionOnce = async (options, attempt) => {
        const startedAt = Date.now();
        // [RP-Hub 2.8.18] 主聊天请求才驱动模型状态副标题；记忆 / UI 副模型请求 begin 返回 null，不干扰气泡。
        const rphubMonitor = rphubModelStatus.begin(options);
        const logResponse = options.logResponse || options.replyInTool;
        let rawResponse = '';
        let streamResponse = null;
        const result = { content: '', reasoning: '', toolCalls: [], assistantMessage: null, usage: null, finishReason: null, isStream: false };
        let receivedPayload = false;
        let pendingContent = '';
        let pendingReasoning = '';
        const calls = new Map();
        const assistantMetadata = {};
        let toolsChanged = false;
        const toolSnapshot = () => [...calls.entries()].sort(([a], [b]) => a - b).map(([index, call]) => ({
            ...call, index, function: { ...call.function }
        }));
        const getReplyCall = () => [...calls.values()].find(call => call.function.name === replyTool.function.name);
        let plainContent = '';
        let refusal = '';
        let failure = null;
        let replyPosition = null;
        let replyClosed = false;
        const invalidReply = () => new Error('输出正文工具的参数格式错误，应为仅含 content 字符串的 JSON 对象');
        // 只解码已经收齐的字符串字符，JSON 外壳和未收齐的转义不会进入正文。
        const readReplyDelta = () => {
            const replyCall = getReplyCall();
            if (!replyCall || replyClosed) return '';
            const source = replyCall.function.arguments;
            if (replyPosition === null) {
                const header = /^\s*\{\s*"content"\s*:\s*"/.exec(source);
                if (!header) return '';
                replyPosition = header[0].length;
            }
            let text = '';
            let lastPosition = replyPosition;
            while (replyPosition < source.length) {
                const char = source[replyPosition];
                if (char === '"') { replyPosition++; replyClosed = true; break; }
                if (char.charCodeAt(0) < 32) throw invalidReply();
                let size = 1;
                if (char === '\\') {
                    const escape = source[replyPosition + 1];
                    if (!escape) break;
                    if (escape === 'u') {
                        const digits = source.slice(replyPosition + 2, replyPosition + 6);
                        if (/[^\da-f]/i.test(digits)) throw invalidReply();
                        if (digits.length < 4) break;
                        size = 6;
                    } else {
                        if (!'"\\/bfnrt'.includes(escape)) throw invalidReply();
                        size = 2;
                    }
                }
                lastPosition = replyPosition;
                text += size === 1 ? char : JSON.parse('"' + source.slice(replyPosition, replyPosition + size) + '"');
                replyPosition += size;
            }
            if (!replyClosed && /[\uD800-\uDBFF]$/.test(text)) {
                replyPosition = lastPosition;
                text = text.slice(0, -1);
            }
            return text;
        };
        const finish = () => {
            const nativeCalls = toolSnapshot();
            const replyCalls = nativeCalls.filter(call => call.function.name === replyTool.function.name);
            result.toolCalls = nativeCalls.filter(call => !options.replyInTool || call.function.name !== replyTool.function.name);
            if (nativeCalls.length && (result.finishReason === 'content_filter' || refusal.trim())) throw new Error('API 已停止工具输出');
            if (result.toolCalls.length) {
                // 工具调用必须保留服务端 ID；伪造 ID 会破坏下一轮的调用/结果配对。
                if (replyCalls.length || result.toolCalls.some(call => !call.id || call.type !== 'function' || !call.function.name)
                    || new Set(result.toolCalls.map(call => call.id)).size !== result.toolCalls.length) {
                    throw new Error('API 返回的工具调用不完整或混用了回复工具，请重新尝试');
                }
                result.assistantMessage = { role: 'assistant', content: plainContent || null, ...assistantMetadata,
                    tool_calls: result.toolCalls.map(({ index, ...call }) => call) };
                if (options.replyInTool) {
                    pendingContent += plainContent;
                    result.content = plainContent;
                }
                return result;
            }
            if (!options.replyInTool) return result;
            if (result.finishReason === 'content_filter' || refusal.trim()) throw new Error('API 已停止工具输出');
            if (replyCalls.length > 1) throw invalidReply();
            const replyArguments = getReplyCall()?.function.arguments || '';
            if (replyArguments.trim()) {
                let payload;
                try { payload = JSON.parse(replyArguments); }
                catch (_) {
                    if (replyPosition === null || (replyClosed && replyArguments.slice(replyPosition).trim())) throw invalidReply();
                    // 容忍末尾缺失的 JSON 闭合符号，保留已经解码的正文。
                }
                if (payload !== undefined) {
                    if (!payload || typeof payload.content !== 'string' || Object.keys(payload).length !== 1
                        || !payload.content.startsWith(result.content)) throw invalidReply();
                    pendingContent += payload.content.slice(result.content.length);
                    result.content = payload.content;
                }
            }
            // 响应结束后才选普通正文兜底，避免与稍后到来的工具正文重复。
            if (!result.content.trim()) {
                if (!plainContent.trim()) {
                    throw Object.assign(new Error('API 未返回抗截断输出，可能触发了空回或站点不支持，请重新尝试。'), {
                        // 已有思考或工具调用时不算真正空回，也不重试。
                        retryableEmptyToolReply: !calls.size && !result.reasoning.trim()
                    });
                }
                pendingContent += plainContent;
                result.content += plainContent;
            }
            return result;
        };
        const accept = data => {
            if (streamResponse) {
                const { choices = [], ...metadata } = data;
                streamResponse = mergeResponseDelta(streamResponse, metadata);
                choices.forEach((choice, position) => {
                    const { delta, message, ...fields } = choice;
                    const index = choice.index ?? position;
                    const previous = streamResponse.choices[index] || {};
                    streamResponse.choices[index] = {
                        ...mergeResponseDelta(previous, fields),
                        // 完整 message 不是增量；补齐已有字段，不能覆盖此前的思考或重复拼接正文。
                        message: delta ? mergeResponseDelta(previous.message, delta)
                            : message ? mergeResponseDelta(previous.message, message, false) : previous.message
                    };
                });
            }
            receivedPayload = true;
            result.usage = getApiUsagePayload(data) || result.usage;
            const choice = data.choices?.[0] || {};
            const message = choice.delta || choice.message || {};
            let content = readTextContent(message.content ?? choice.text);
            const reasoning = extractNativeReasoning(message) || extractNativeReasoning(choice);
            plainContent += content;
            refusal += readTextContent(message.refusal);
            // 保留转接接口返回的签名和推理字段，原样用于本轮工具结果回传，不混进聊天正文。
            for (const key of ['reasoning_content', 'reasoning', 'reasoning_details', 'extra_content']) {
                if (message[key] == null) continue;
                assistantMetadata[key] = typeof message[key] === 'string'
                    ? (assistantMetadata[key] || '') + message[key]
                    : message[key];
            }
            for (const [position, part] of (message.tool_calls || []).entries()) {
                const index = part.index ?? position;
                if (!Number.isInteger(index) || index < 0 || (part.type && part.type !== 'function')) throw new Error('API 返回了无效的工具调用');
                let call = calls.get(index);
                if (!call) {
                    call = { id: '', type: 'function', function: { name: '', arguments: '' } };
                    calls.set(index, call);
                }
                if (part.id && call.id && part.id !== call.id) throw new Error('API 返回了冲突的工具调用 ID');
                call.id = part.id || call.id;
                for (const key of ['name', 'arguments']) {
                    if (part.function?.[key] == null) continue;
                    if (typeof part.function[key] !== 'string') throw new Error('API 工具参数应为 JSON 字符串');
                    call.function[key] += part.function[key];
                }
                if (part.extra_content) call.extra_content = { ...call.extra_content, ...part.extra_content };
                toolsChanged = true;
            }
            if (options.replyInTool) content = readReplyDelta();
            result.content += content;
            result.reasoning += reasoning;
            result.finishReason = choice.finish_reason ?? result.finishReason;
            pendingContent += content;
            pendingReasoning += reasoning;
        };
        try {
            options.onBeforeRequest?.();
            const tools = [...(options.tools || []), ...(options.replyInTool && !options.requireTool ? [replyTool] : [])];
            return await withApiResponse({ ...options, onErrorResponse: text => {
                if (logResponse) rawResponse = text;
            }, body: {
                model: options.model, messages: options.messages, temperature: options.temperature,
                ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
                ...(tools.length ? {
                    tools,
                    tool_choice: options.requireTool || (options.replyInTool && options.tools?.length) ? 'required'
                        : options.replyInTool ? { type: 'function', function: { name: replyTool.function.name } } : 'auto',
                    parallel_tool_calls: false
                } : {}),
                stream: !!options.stream,
                ...(options.stream ? { stream_options: { include_usage: true } } : {})
            } }, async (response, touch) => {
                const eventStream = response.headers.get('content-type')?.includes('text/event-stream');
                let rawText;
                if (!eventStream) {
                    rawText = await response.text();
                    if (!/^\s*(?:data:|:)/.test(rawText)) {
                        if (logResponse) rawResponse = rawText;
                        accept(parsePayload(rawText, response.status));
                        return finish();
                    }
                }
                if (logResponse) streamResponse = { choices: [] };
                result.isStream = !!options.stream;
                let buffer = '';
                let eventLines = [];
                let done = false;
                let flushPromise = Promise.resolve();
                const flush = () => {
                    if (!result.isStream || (!pendingContent && !pendingReasoning && !toolsChanged)) return;
                    const delta = { content: pendingContent, reasoning: pendingReasoning,
                        ...(toolsChanged ? { toolCalls: toolSnapshot().filter(call => call.function.name
                            && !(options.replyInTool && replyTool.function.name.startsWith(call.function.name))) } : {}) };
                    pendingContent = pendingReasoning = '';
                    toolsChanged = false;
                    flushPromise = flushPromise.then(() => options.onDelta?.(delta));
                    // 立即挂上处理器，最终仍由 await 抛出回调错误。
                    flushPromise.catch(() => {});
                };
                const dispatch = () => {
                    if (!eventLines.length) return;
                    const payload = eventLines.join('\n');
                    eventLines = [];
                    if (payload.trim() === '[DONE]') {
                        done = true;
                        return;
                    }
                    if (payload.trim()) accept(parsePayload(payload, response.status));
                };
                const readLine = line => {
                    if (done) return;
                    if (!line.trim()) dispatch();
                    else if (line.startsWith('data:')) {
                        // 部分兼容接口省略事件间空行，但多行 JSON 仍需等它完整。
                        let complete = eventLines.join('\n').trim() === '[DONE]';
                        try { JSON.parse(eventLines.join('\n')); complete = true; } catch (_) { }
                        if (complete) dispatch();
                        if (!done) eventLines.push(line.slice(5).replace(/^ /, ''));
                    }
                };
                const feed = text => {
                    buffer += text;
                    const lines = buffer.split(/\r\n|\n|\r(?!$)/);
                    buffer = lines.pop();
                    lines.forEach(readLine);
                };
                const reader = rawText === undefined ? response.body.getReader() : null;
                const decoder = new TextDecoder();
                const interval = setInterval(flush, 60);
                // [RP-Hub 2.8.18] 流保活句柄。官方 withApiResponse 只在 reader.read() 返回时才调用
                // touch() 重置 120s「无数据」硬超时；慢模型首字 20s+、长思考静默常超 120s，
                // 会被前端误判超时 abort，而服务端其实已生成完并计费。等待数据期间定时 touch()
                // 续命即可，效果等价于插件往流里注入 SSE 注释行，但无需改写响应流。
                let rphubKeepAlive = null;
                try {
                    // 只有真正进入流式读取才保活；一次性 JSON 请求保持官方原行为（该超时是必要兜底）。
                    if (reader) rphubKeepAlive = setInterval(() => { try { touch(); } catch (_) { } }, 10000);
                    if (reader) {
                        while (!done) {
                            throwIfChatAborted(options.signal, window.RPHubChatAbortRequested === true);
                            const chunk = await reader.read();
                            touch();
                            throwIfChatAborted(options.signal, window.RPHubChatAbortRequested === true);
                            if (chunk.done) break;
                            const rphubChunkText = decoder.decode(chunk.value, { stream: true });
                            rphubMonitor?.onData(rphubChunkText);
                            feed(rphubChunkText);
                        }
                        feed(decoder.decode());
                    } else feed(rawText);
                    // 兼容缺失最后换行的完整 JSON；损坏 JSON 必须报错，不能伪装成功。
                    if (!done) { readLine(buffer.replace(/\r$/, '')); dispatch(); }
                    if (!receivedPayload) throw new Error('API 未返回有效的模型响应');
                    return finish();
                } finally {
                    clearInterval(interval);
                    if (rphubKeepAlive) { clearInterval(rphubKeepAlive); rphubKeepAlive = null; }
                    if (reader) {
                        try { await reader.cancel(); } catch (_) { }
                        reader.releaseLock();
                    }
                    if (options.signal?.aborted || window.RPHubChatAbortRequested === true) {
                        pendingContent = '';
                        pendingReasoning = '';
                        toolsChanged = false;
                    } else {
                        flush();
                        await flushPromise;
                    }
                }
            });
        } catch (error) {
            failure = error;
            throw error;
        } finally {
            rphubMonitor?.end();
            if (logResponse) console.info(options.logResponse ? '[模型输出][最新一次]' : '[Gemini抗截断]', {
                模型: options.model, 次数: attempt, 结果: failure ? failure.message : '成功',
                响应体: rawResponse || (streamResponse ? JSON.stringify(streamResponse) : '')
            });
            // 在业务层 JSON/模板校验之前记账；部分流式响应后中止也不会漏掉已返回的用量。
            if (receivedPayload) options.onUsage?.(result.usage, {
                isStream: result.isStream, durationMs: Date.now() - startedAt,
                outputCharacters: [...calls.values()].reduce((sum, call) => sum + call.function.arguments.length, 0) + plainContent.length + result.reasoning.length
            });
        }
    };

    const requestChatCompletion = async options => {
        for (let attempt = 1; ; attempt++) {
            try { return await requestChatCompletionOnce(options, attempt); }
            catch (error) {
                if (!error.retryableEmptyToolReply || attempt >= 3 || options.signal?.aborted) throw error;
            }
        }
    };

    window.RPHubApiUtils = Object.freeze({ buildApiEndpoint, buildUserInputToolMessages });
    window.RPHubApiClient = Object.freeze({ requestChatCompletion, requestJson });
})();
