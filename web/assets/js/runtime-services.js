// RP-Hub message rendering and application composables.

// --- Message renderer ---
(function () {
    const MAX_CACHE_SIZE = 2000;

    const createMessageRenderer = ({
        processRegex, replaceUserPlaceholder, createExecutableHtmlIframe, marked, DOMPurify,
        getMemoryCitationLabel, getMemoryCitationVersion
    }) => {
        const renderedCache = new Map();
        const frameDetectionCache = new Map();

        const cacheValue = (cache, key, value) => {
            cache.set(key, value);
            if (cache.size > MAX_CACHE_SIZE) cache.delete(cache.keys().next().value);
            return value;
        };

        const clearCaches = () => {
            renderedCache.clear();
            frameDetectionCache.clear();
        };

        const applyDisplayRegex = (text, role, skipRegex) => {
            const replaced = replaceUserPlaceholder(text);
            return skipRegex ? replaced : processRegex(replaced, { isDisplay: true, role });
        };

        const contentUsesHtmlFrame = (text, role = 'assistant', skipRegex = false) => {
            if (!text) return false;
            const cacheKey = `${role}_${skipRegex}_${text}`;
            if (frameDetectionCache.has(cacheKey)) return frameDetectionCache.get(cacheKey);

            const trimmed = applyDisplayRegex(text, role, skipRegex).trim();
            let usesFrame = false;
            const codeFencePattern = /```([^\n`]*)\n?([\s\S]*?)```/g;
            let codeMatch;
            while ((codeMatch = codeFencePattern.exec(trimmed)) !== null) {
                const language = codeMatch[1];
                const content = codeMatch[2];
                if (/\b(html|xml)\b/i.test(language)
                    || /^\s*<(!doctype|html|head|body|div|span|style|script|table|img)/i.test(content)) {
                    usesFrame = true;
                    break;
                }
            }
            if (!usesFrame && !trimmed.includes('```')) {
                usesFrame = /(<!doctype html>|<html\b[^>]*>|^\s*<(style|script)\b)/i.test(trimmed);
            }
            return cacheValue(frameDetectionCache, cacheKey, usesFrame);
        };

        const cleanConfig = {
            ADD_TAGS: ['details', 'summary', 'iframe', 'svg', 'path', 'g', 'circle', 'rect', 'defs', 'linearGradient', 'stop', 'style', 'div', 'span', 'script', 'button', 'input'],
            ADD_ATTR: ['style', 'open', 'srcdoc', 'sandbox', 'frameborder', 'allow', 'allowfullscreen', 'class', 'id', 'viewBox', 'fill', 'stroke', 'stroke-width', 'd', 'stroke-linecap', 'stroke-linejoin', 'x1', 'y1', 'x2', 'y2', 'offset', 'stop-color', 'stop-opacity', 'width', 'height', 'onclick', 'type', 'value', 'checked', 'data-slash'],
            FORBID_ATTR: ['onmouseover', 'onload'],
            FORCE_BODY: true
        };

        const sanitizeMarkdown = (text) => DOMPurify.sanitize(marked.parse(text), cleanConfig);
        const markdownOnlyRenderer = new marked.Renderer();
        markdownOnlyRenderer.html = token => String(typeof token === 'string' ? token : token.text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const createIframe = (html) => createExecutableHtmlIframe(html, 'border-t border-gray-200 shadow-sm');

        const replaceHtmlCodeBlocks = (documentNode) => {
            let modified = false;
            documentNode.querySelectorAll('pre code').forEach(block => {
                const rawHtml = block.textContent;
                const hasHtmlLanguage = block.classList.contains('language-html') || block.classList.contains('language-xml');
                const looksLikeHtml = /^\s*<(!doctype|html|head|body|div|span|style|script|table|img)/i.test(rawHtml);
                if (!hasHtmlLanguage && !looksLikeHtml) return;
                const pre = block.parentElement;
                if (!pre?.parentNode) return;
                pre.parentNode.replaceChild(createIframe(rawHtml), pre);
                modified = true;
            });
            return modified;
        };

        const replaceEscapedHtmlParagraphs = (documentNode) => {
            let modified = false;
            documentNode.querySelectorAll('p').forEach(paragraph => {
                if (!/^\s*</.test(paragraph.innerHTML)) return;
                const rawHtml = paragraph.textContent;
                if (!/^\s*<(!doctype|html|head|body|div|span|style|script|table|img)/i.test(rawHtml)) return;
                if (!paragraph.parentNode) return;
                paragraph.parentNode.replaceChild(createIframe(rawHtml), paragraph);
                modified = true;
            });
            return modified;
        };

        const replaceScriptedPanels = (documentNode) => {
            let modified = false;
            documentNode.querySelectorAll('div[style*="position"], div[style*="background"], div[class*="panel"]').forEach(panel => {
                if (!panel.querySelector('script') || !panel.parentNode) return;
                panel.parentNode.replaceChild(createIframe(panel.outerHTML), panel);
                modified = true;
            });
            return modified;
        };

        // 正文里的记忆引用 [M12]：编号变成可点的小角标，并给它前面那句话加下划线。
        // 往回找到句末标点、上一处引用或段落开头为止；跨格式的长句只会划到能可靠切开的位置。
        const MEMORY_CITATION_PATTERN = /((?:\[M\d{1,6}\])+)/;
        // 引号里的句末标点后面紧跟“她说”之类的叙述时不算断句，整句一起划线。
        const SENTENCE_END_PATTERN = /[。！？!?…]+(?![。！？!?…])(?:[”’」』"']+(?=$|[\s“‘「『"'])|(?![”’」』"']))\s*|\n+/g;
        const TRAILING_PUNCTUATION_PATTERN = /[\s。！？!?…，,；;：:”’」』）)"']+$/;
        const underlineCitedSentence = (cite) => {
            const nodes = [];
            let following = '';
            for (let node = cite.previousSibling; node; node = node.previousSibling) {
                if (node.nodeType === 1 && node.matches('.memory-cite, .memory-cite-text, br, img, iframe')) break;
                const text = node.textContent;
                // 句子自己的句末标点紧挨着引用，不能当成上一句的结尾；带上后面已划进来的文字一起判断，
                // 正则给引语单独加了样式时，问号和标签外的引号、叙述仍连成一句。
                const body = nodes.length ? text : text.replace(TRAILING_PUNCTUATION_PATTERN, '');
                let boundary = -1;
                for (const match of (body + following).matchAll(SENTENCE_END_PATTERN)) {
                    if (match.index < body.length) boundary = Math.min(match.index + match[0].length, body.length);
                }
                if (boundary < 0) {
                    nodes.unshift(node);
                    following = text + following;
                    continue;
                }
                if (node.nodeType === 3 && boundary < text.length) nodes.unshift(node.splitText(boundary));
                else if (node.nodeType === 1 && !nodes.length) nodes.unshift(node);
                break;
            }
            if (!nodes.some(node => node.textContent.trim())) return;
            const span = cite.ownerDocument.createElement('span');
            span.className = 'memory-cite-text';
            span.dataset.memoryNos = cite.dataset.memoryNos;
            nodes[0].before(span);
            span.append(...nodes);
        };
        const decorateMemoryCitations = (documentNode) => {
            const textNodes = [];
            const walker = documentNode.createTreeWalker(documentNode.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (MEMORY_CITATION_PATTERN.test(node.nodeValue) && !node.parentElement?.closest('pre:not(.sv-prose), code, a, button, script, style, textarea')) textNodes.push(node);
            }
            textNodes.forEach(node => {
                const fragment = documentNode.createDocumentFragment();
                node.nodeValue.split(MEMORY_CITATION_PATTERN).forEach((part, index) => {
                    if (index % 2 === 0) {
                        if (part) fragment.append(part);
                        return;
                    }
                    const numbers = part.match(/\d+/g);
                    const cite = documentNode.createElement('button');
                    cite.type = 'button';
                    cite.className = 'memory-cite';
                    cite.dataset.memoryNos = numbers.join(',');
                    // 角标显示记忆对应的轮次：单轮如 3，合并总结如 1-5；找不到的记忆显示问号。
                    const labels = numbers.map(no => getMemoryCitationLabel(Number(no)) || '?');
                    cite.setAttribute('aria-label', `查看判断依据：第 ${labels.join('、')} 轮`);
                    cite.textContent = labels.join(',');
                    fragment.append(cite);
                });
                node.replaceWith(fragment);
            });
            documentNode.querySelectorAll('.memory-cite').forEach(underlineCitedSentence);
            return textNodes.length > 0;
        };
        // 以 HTML 开头的回复不经过 Markdown，正文文字直接挂在最外层；消息容器会把最外层的每个子元素排成单独一块，
        // 所以把带引用的那段行内内容包进段落，角标才会跟在句末。
        const BLOCK_TAG_PATTERN = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DETAILS|DIV|DL|FIELDSET|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HR|IFRAME|LI|MAIN|NAV|OL|P|PRE|SCRIPT|SECTION|STYLE|TABLE|UL)$/;
        const wrapLooseCitationText = (documentNode) => {
            const body = documentNode.body;
            const isInline = node => node && (node.nodeType === 3 || (node.nodeType === 1 && !BLOCK_TAG_PATTERN.test(node.tagName)));
            [...body.childNodes].forEach(node => {
                if (node.parentNode !== body || node.nodeType !== 3 || !MEMORY_CITATION_PATTERN.test(node.nodeValue)) return;
                let start = node;
                let end = node;
                while (isInline(start.previousSibling)) start = start.previousSibling;
                while (isInline(end.nextSibling)) end = end.nextSibling;
                const paragraph = documentNode.createElement('p');
                start.before(paragraph);
                for (let current = start, next; current; current = next) {
                    next = current === end ? null : current.nextSibling;
                    paragraph.append(current);
                }
            });
        };
        // 正则替换成 HTML、或本身以 HTML 开头的回复走单独的渲染分支，也要补上记忆引用。
        const decorateHtml = (html, role) => {
            if (role !== 'assistant' || !/\[M\d/.test(html)) return html;
            const documentNode = new DOMParser().parseFromString(html, 'text/html');
            wrapLooseCitationText(documentNode);
            return decorateMemoryCitations(documentNode) ? documentNode.body.innerHTML : html;
        };
        // 美化正则可能会改写方括号（例如把 [状态] 变成标签），先把引用换成正则碰不到的占位符，替换完再还原。
        const protectCitations = text => text.replace(/\[M(\d{1,6})\]/g, '\uE000M$1\uE001');
        const restoreCitations = text => text.replace(/\uE000M(\d{1,6})\uE001/g, '[M$1]');

        const renderMarkdown = (text, role = 'assistant', skipRegex = false, allowHtml = true) => {
            if (!text) return '';
            // 记忆的轮次会随删改楼层变化，带引用的回复按当前对照表缓存，轮次变了角标跟着更新。
            const citationVersion = role === 'assistant' && text.includes('[M') ? getMemoryCitationVersion() : '';
            const cacheKey = `${role}_${skipRegex}_${allowHtml}_${citationVersion}_${text}`;
            if (renderedCache.has(cacheKey)) return renderedCache.get(cacheKey);

            let processed = role === 'assistant'
                ? restoreCitations(applyDisplayRegex(protectCitations(text), role, skipRegex))
                : applyDisplayRegex(text, role, skipRegex);
            if (!allowHtml) {
                const html = DOMPurify.sanitize(marked.parse(processed, { renderer: markdownOnlyRenderer }));
                return cacheValue(renderedCache, cacheKey, decorateHtml(html, role));
            }
            const trimmed = processed.trim();
            const htmlMatch = trimmed.match(/(<!doctype html>|<html\b[^>]*>)/i);

            if (htmlMatch && !trimmed.includes('```')) {
                const startIndex = htmlMatch.index;
                const closeTag = '</html>';
                const closeIndex = trimmed.toLowerCase().lastIndexOf(closeTag);
                const hasCloseTag = closeIndex !== -1 && closeIndex > startIndex;
                const endIndex = hasCloseTag ? closeIndex + closeTag.length : trimmed.length;
                const htmlContent = trimmed.substring(startIndex, endIndex);
                const preText = trimmed.substring(0, startIndex);
                const postText = hasCloseTag ? trimmed.substring(endIndex) : '';
                const container = document.createElement('div');
                container.className = 'html-card-container';
                container.style.margin = '0';
                container.style.paddingBottom = '0';
                container.style.marginBottom = '-1px';
                container.appendChild(createIframe(htmlContent));
                const result = [
                    preText.trim() ? decorateHtml(sanitizeMarkdown(preText), role) : '',
                    container.outerHTML,
                    postText.trim() ? decorateHtml(sanitizeMarkdown(postText), role) : ''
                ].join('');
                return cacheValue(renderedCache, cacheKey, result);
            }

            if (/^\s*<(div|table|section|article|aside|header|footer|style|script)/i.test(trimmed)
                && !trimmed.includes('```')) {
                return cacheValue(renderedCache, cacheKey, decorateHtml(DOMPurify.sanitize(processed, cleanConfig), role));
            }

            const lowerTrimmed = trimmed.toLowerCase();
            if (lowerTrimmed.includes('<html') || lowerTrimmed.includes('<!doctype')) {
                processed = processed
                    .replace(/<!DOCTYPE html>/gi, '')
                    .replace(/<\/?html[^>]*>/gi, '')
                    .replace(/<\/?head[^>]*>/gi, '')
                    .replace(/<\/?body[^>]*>/gi, '');
            }

            const html = sanitizeMarkdown(processed);
            try {
                const documentNode = new DOMParser().parseFromString(html, 'text/html');
                const codeBlocksChanged = replaceHtmlCodeBlocks(documentNode);
                const paragraphsChanged = replaceEscapedHtmlParagraphs(documentNode);
                const panelsChanged = replaceScriptedPanels(documentNode);
                const citationsChanged = role === 'assistant' && decorateMemoryCitations(documentNode);
                const modified = codeBlocksChanged || paragraphsChanged || panelsChanged || citationsChanged;
                if (modified) return cacheValue(renderedCache, cacheKey, documentNode.body.innerHTML);
            } catch (error) {
                console.error('Error rendering HTML preview:', error);
            }
            return cacheValue(renderedCache, cacheKey, html);
        };

        return { clearCaches, contentUsesHtmlFrame, decorateMemoryCitations, renderMarkdown };
    };

    window.RPHubMessageRenderer = Object.freeze({ createMessageRenderer });
})();

// --- Application composables ---
(function () {
    const { computed, reactive, ref, watch } = Vue;

    const useTokenUsage = ({
        pageSize,
        cloneForStorage,
        confirm,
        ensureStorage,
        generateUUID,
        getApiKey,
        getApiUrl,
        getTokenUsageLimit,
        normalizeApiUsage,
        saveStoredValue,
        toast
    }) => {
        const tokenUsageHistory = ref([]);
        const tokenUsagePage = ref(1);
        const tokenUsageFilter = ref('all');
        const tokenUsageTimeFilter = ref('all');
        const showTokenUsageTimeFilter = ref(false);
        const tokenUsageTimeFilterOptions = Object.freeze([
            { value: 'all', label: '全部' },
            { value: '24h', label: '24小时' },
            { value: '7d', label: '7天' },
            { value: '30d', label: '30天' }
        ]);
        const tokenUsageTimeRanges = Object.freeze({
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        });
        const tokenUsageTimeFilterLabel = computed(() => (
            tokenUsageTimeFilterOptions.find(option => option.value === tokenUsageTimeFilter.value)?.label || '全部'
        ));
        const getTokenUsageCategory = (type) => {
            if (['summary', 'embedding'].includes(type)) return 'memory';
            if (type === 'ui_template') return 'variables';
            return 'chat';
        };
        const filteredTokenUsageHistory = computed(() => {
            const timeRange = tokenUsageTimeRanges[tokenUsageTimeFilter.value];
            const cutoff = timeRange ? Date.now() - timeRange : 0;
            return tokenUsageHistory.value.filter(record => {
                const matchesType = tokenUsageFilter.value === 'all'
                    || getTokenUsageCategory(record.type) === tokenUsageFilter.value;
                if (!matchesType || !timeRange) return matchesType;
                const timestamp = Number(record.timestamp);
                return Number.isFinite(timestamp) && timestamp >= cutoff;
            });
        });
        const getUncachedInputTokens = (record) => {
            if (!Number.isFinite(record?.inputTokens)) return null;
            const cached = Number.isFinite(record.cacheReadTokens) ? record.cacheReadTokens : 0;
            return Math.max(0, record.inputTokens - cached);
        };
        const tokenUsageStats = computed(() => filteredTokenUsageHistory.value.reduce((stats, record) => {
            const inputTokens = getUncachedInputTokens(record);
            if (inputTokens !== null) {
                stats.inputTokens += inputTokens;
                stats.inputTokensReports++;
            }
            ['outputTokens', 'cacheReadTokens'].forEach(key => {
                if (!Number.isFinite(record[key])) return;
                stats[key] += record[key];
                stats[`${key}Reports`]++;
            });
            return stats;
        }, {
            inputTokens: 0,
            inputTokensReports: 0,
            outputTokens: 0,
            outputTokensReports: 0,
            cacheReadTokens: 0,
            cacheReadTokensReports: 0
        }));
        const tokenUsagePageCount = computed(() => Math.max(
            1,
            Math.ceil(filteredTokenUsageHistory.value.length / pageSize)
        ));
        const displayedTokenUsageHistory = computed(() => {
            const start = (tokenUsagePage.value - 1) * pageSize;
            return filteredTokenUsageHistory.value.slice(start, start + pageSize);
        });
        const latestMainTokenUsage = computed(() => tokenUsageHistory.value.find(
            record => record.type === 'chat' || record.type === 'tool_continuation'
        ) || null);
        const formatLatestTokenCount = value => {
            const count = Number(value || 0);
            if (count <= 0) return '0.00w';
            return `${Math.max(0.01, count / 10000).toFixed(2)}w`;
        };

        let saveQueue = Promise.resolve();
        const saveTokenUsageHistoryNow = () => {
            const snapshot = cloneForStorage(tokenUsageHistory.value);
            const saveTask = async () => {
                await ensureStorage();
                await saveStoredValue('token_usage_history', snapshot, { clone: false });
            };
            saveQueue = saveQueue.then(saveTask, saveTask);
            return saveQueue;
        };
        const fetchLatestQuota = async (record, apiKey) => {
            try {
                const getLogKey = log => String(log?.request_id || [log?.created_at, log?.model_name, log?.prompt_tokens, log?.completion_tokens].join('|'));
                for (const delay of [500, 5000]) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    const apiRoot = record.apiUrl.replace(/\/+$/, '').replace(/\/v1$/i, '');
                    const response = await fetch(`${apiRoot}/api/log/token`, {
                        headers: { Authorization: `Bearer ${apiKey}` }
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const payload = await response.json();
                    const logs = Array.isArray(payload?.data) ? payload.data : (payload?.data?.items || []);
                    const claimedLogs = new Set(tokenUsageHistory.value.map(item => item.usageLogKey).filter(Boolean));
                    const log = logs.filter(item => !claimedLogs.has(getLogKey(item))
                        && Number(item?.type) === 2
                        && String(item?.model_name || '') === record.model
                        && Math.abs(Number(item?.created_at) * 1000 - record.timestamp) < 120000
                        && (!Number.isFinite(record.inputTokens) || Number(item?.prompt_tokens) === record.inputTokens)
                        && (!Number.isFinite(record.outputTokens) || Number(item?.completion_tokens) === record.outputTokens))
                        .sort((a, b) => Math.abs(Number(a.created_at) * 1000 - record.timestamp) - Math.abs(Number(b.created_at) * 1000 - record.timestamp))[0];
                    if (!log || !Number.isFinite(Number(log.quota))) continue;
                    record.actualQuota = Number(log.quota);
                    record.usageGroup = String(log.group || '');
                    record.usageLogKey = getLogKey(log);
                    saveTokenUsageHistoryNow().catch(error => console.error('Token usage history save failed:', error));
                    return;
                }
            } catch (error) {
                console.warn('New API usage log fetch failed:', error);
            }
        };
        const recordApiUsage = (usage, meta = {}) => {
            const record = reactive({
                id: generateUUID(),
                timestamp: Date.now(),
                type: meta.type || 'chat',
                model: String(meta.model || ''),
                apiUrl: String(meta.apiUrl ?? getApiUrl() ?? ''),
                isStream: meta.isStream === true,
                durationMs: Number.isFinite(meta.durationMs) ? Math.max(0, meta.durationMs) : null,
                outputCharacters: Number.isFinite(meta.outputCharacters) ? Math.max(0, meta.outputCharacters) : null,
                ...normalizeApiUsage(usage)
            });
            tokenUsageHistory.value.unshift(record);
            const usageLimit = Math.max(1, Number(getTokenUsageLimit?.() || 0) || 1000);
            if (tokenUsageHistory.value.length > usageLimit) {
                tokenUsageHistory.value = tokenUsageHistory.value.slice(0, usageLimit);
            }
            const apiKey = String(getApiKey?.() || '').trim();
            if (record.apiUrl && apiKey) fetchLatestQuota(record, apiKey);
            saveTokenUsageHistoryNow().catch(error => console.error('Token usage history save failed:', error));
        };
        const clearTokenUsageHistory = () => {
            confirm('确定要清空全部 Token 用量记录吗？此操作无法撤销。', async () => {
                tokenUsageHistory.value = [];
                tokenUsagePage.value = 1;
                await saveTokenUsageHistoryNow();
                toast('Token 用量记录已清空', 'success');
            });
        };

        watch([tokenUsageFilter, tokenUsageTimeFilter], () => { tokenUsagePage.value = 1; });
        watch(tokenUsagePageCount, count => { tokenUsagePage.value = Math.min(tokenUsagePage.value, count); });

        return {
            clearTokenUsageHistory,
            displayedTokenUsageHistory,
            filteredTokenUsageHistory,
            formatLatestTokenCount,
            formatTokenAggregate: (value, reports) => {
                if (reports <= 0 || value <= 0) return '0';
                if (value >= 1e9) return `${Number((value / 1e9).toFixed(2))}B`;
                if (value >= 1e6) return `${Number((value / 1e6).toFixed(2))}M`;
                return value.toLocaleString();
            },
            formatTokenCount: (value) => Number.isFinite(value) ? value.toLocaleString() : '0',
            formatTokenUsageTime: (timestamp) => {
                const date = new Date(timestamp);
                const year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric';
                return date.toLocaleString('zh-CN', { year, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
            },
            getTokenUsageCategory,
            getUncachedInputTokens,
            latestMainTokenUsage,
            recordApiUsage,
            showTokenUsageTimeFilter,
            tokenUsageFilter,
            tokenUsageHistory,
            tokenUsagePage,
            tokenUsagePageCount,
            tokenUsageStats,
            tokenUsageTimeFilter,
            tokenUsageTimeFilterLabel,
            tokenUsageTimeFilterOptions
        };
    };

    window.RPHubComposables = Object.freeze({ useTokenUsage });
})();

// --- Image saving: hold generated images; retain native buttons for other content. ---
(function () {
    const STYLE_ID = 'rphub-image-save-style';
    const BTN_CLASS = 'rphub-image-save-btn';
    const WRAP_CLASS = 'rphub-image-save-wrap';
    const ATTACHED_FLAG = '__rphubSaveAttached';

    if (window.__RPHubImageSaveInstalled) return;
    window.__RPHubImageSaveInstalled = true;

    const isNativeApp = () => {
        try {
            return !!(window.AndroidBridge
                && typeof window.AndroidBridge.isNativeApp === 'function'
                && window.AndroidBridge.isNativeApp());
        } catch (error) {
            return false;
        }
    };

    const injectStyle = () => {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.' + WRAP_CLASS + '{position:absolute;top:6px;right:6px;z-index:20;pointer-events:auto;}',
            '.' + BTN_CLASS + '{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;',
            'padding:0;border:0;border-radius:9999px;background:rgba(15,23,42,.52);color:#fff;cursor:pointer;',
            'box-shadow:0 2px 8px rgba(15,23,42,.28);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);',
            'transition:background .12s ease,transform .12s ease,box-shadow .12s ease;',
            'touch-action:manipulation;-webkit-tap-highlight-color:transparent;}',
            '.' + BTN_CLASS + ' svg{width:18px;height:18px;display:block;}',
            '.' + BTN_CLASS + ':active,' + '.' + BTN_CLASS + '.rphub-btn-pressed{',
            'background:rgba(244,63,94,.92)!important;transform:scale(.92)!important;',
            'box-shadow:0 0 0 3px rgba(244,63,94,.28)!important;}'
        ].join('');
        (document.head || document.documentElement).appendChild(style);
    };

    const guessName = image => {
        const source = String(image.currentSrc || image.src || '');
        let name = '';
        try {
            const parsed = new URL(source, location.href);
            const last = parsed.pathname.split('/').filter(Boolean).pop();
            if (last && last.indexOf('.') > 0) name = decodeURIComponent(last);
        } catch (error) {
        }
        if (!/\.(png|jpe?g|webp|gif|bmp)$/i.test(name)) name += '.png';
        // 相册里同名文件累计到 33 个后，MediaStore 会直接抛
        // "Failed to build unique file: <路径>" 而保存失败 —— 同一张图反复保存、
        // 或站点给的图片地址末段没有扩展名（如 /api/jobs/xxx/content）都会撞上，
        // 因为那时所有图片都叫同一个名字。这里固定追加到秒的时间戳来保证唯一。
        let base = name.replace(/\.[^.]*$/, '').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 60);
        if (!base) base = 'rphub-image';
        const ext = (/\.(png|jpe?g|webp|gif|bmp)$/i.exec(name) || ['.png'])[0].toLowerCase();
        const now = new Date();
        const pad = value => (value < 10 ? '0' + value : '' + value);
        const stamp = '' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate())
            + '-' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
        return base + '_' + stamp + ext;
    };

    const guessMime = image => {
        const source = String(image.currentSrc || image.src || '');
        const match = /^data:(image\/[a-z0-9.+-]+)/i.exec(source);
        if (match) return match[1];
        if (/\.jpe?g$/i.test(source)) return 'image/jpeg';
        if (/\.webp$/i.test(source)) return 'image/webp';
        if (/\.gif$/i.test(source)) return 'image/gif';
        if (/\.bmp$/i.test(source)) return 'image/bmp';
        return 'image/png';
    };

    const saveImage = image => {
        const bridge = window.AndroidBridge;
        if (!bridge) {
            if (window.toast) window.toast('当前环境不支持保存到相册', 'error');
            return;
        }
        const source = String(image.currentSrc || image.src || '');
        const name = guessName(image);
        const mime = guessMime(image);
        if (source.startsWith('data:image/')) {
            if (typeof bridge.saveImageToGallery !== 'function') {
                if (window.toast) window.toast('当前版本不支持保存该图片', 'error');
                return;
            }
            bridge.saveImageToGallery(source.split(',')[1] || '', name, mime);
            return;
        }
        if (window.RPImageDownload) {
            window.RPImageDownload.run(image, { name: name.replace(/\.[^.]+$/, '') }).catch(() => {});
            return;
        }
        if (!/^https?:/i.test(source)) {
            if (window.toast) window.toast('图片地址不受支持', 'error');
            return;
        }
        if (typeof bridge.saveImageFromUrl === 'function') {
            bridge.saveImageFromUrl(source, name, mime);
            return;
        }
        if (window.toast) window.toast('当前版本不支持保存网络图片', 'error');
    };

    const isSaveableImage = image => {
        return window.RPImagePolicy?.isContentImage(image)
            && image.complete && image.naturalWidth > 0;
    };
    const generatedImage = target => {
        const image = target?.closest?.('.generated-image-card img');
        return image && isSaveableImage(image)
            && !image.closest('.is-generating, .is-rerolling, .is-generation-error') ? image : null;
    };
    let press = null, heldImage = null;
    const cancelHold = () => {
        clearTimeout(press?.timer);
        press = null;
    };
    document.addEventListener('pointerdown', event => {
        cancelHold();
        heldImage = null;
        const image = generatedImage(event.target);
        if (!image || event.button !== 0 || !event.isPrimary) return;
        press = { id: event.pointerId, x: event.clientX, y: event.clientY,
            timer: setTimeout(() => {
                if (!image.isConnected || !generatedImage(image)) return cancelHold();
                heldImage = image;
                window.RPImageDownload.request(image);
            }, 500) };
    }, { passive: true });
    document.addEventListener('pointermove', event => {
        if (press && event.pointerId === press.id
            && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) cancelHold();
    }, { passive: true });
    ['pointerup', 'pointercancel', 'scroll'].forEach(type => document.addEventListener(type, cancelHold, true));
    window.addEventListener('blur', cancelHold);
    document.addEventListener('visibilitychange', cancelHold);
    document.addEventListener('contextmenu', event => {
        if (generatedImage(event.target)) event.preventDefault();
    });
    document.addEventListener('click', event => {
        if (heldImage && event.target === heldImage) {
            event.preventDefault();
            event.stopPropagation();
            heldImage = null;
        }
    }, true);
    document.addEventListener('keydown', event => {
        const image = generatedImage(event.target);
        if (image && ['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            window.RPImageDownload.request(image);
        }
    });

    const pressFeedback = button => {
        button.classList.add('rphub-btn-pressed');
        try {
            if (navigator.vibrate) navigator.vibrate(10);
        } catch (error) {
        }
        setTimeout(() => button.classList.remove('rphub-btn-pressed'), 340);
    };

    const makeButton = image => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = BTN_CLASS;
        button.setAttribute('aria-label', '保存到相册');
        button.setAttribute('title', '保存到相册');
        button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">'
            + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>';
        let firedAt = 0;
        const run = event => {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const now = Date.now();
            if (now - firedAt < 500) return;
            firedAt = now;
            if (!isSaveableImage(image)) return;
            pressFeedback(button);
            saveImage(image);
        };
        button.addEventListener('pointerdown', run);
        button.addEventListener('click', run);
        button.addEventListener('touchend', run, { passive: false });
        return button;
    };

    const attachButton = image => {
        if (image.closest('.generated-image-card')) {
            image[ATTACHED_FLAG]?.remove();
            image[ATTACHED_FLAG] = null;
            image.parentElement.querySelector('.' + WRAP_CLASS)?.remove();
            image.draggable = false;
            if (isSaveableImage(image)) {
                image.tabIndex = 0;
                image.setAttribute('role', 'button');
                image.setAttribute('aria-label', '图片操作');
                image.setAttribute('aria-haspopup', 'dialog');
            } else {
                ['tabindex', 'role', 'aria-label', 'aria-haspopup'].forEach(name => image.removeAttribute(name));
            }
            return;
        }
        if (!isNativeApp()) return;
        const previous = image[ATTACHED_FLAG];
        if (previous && (!isSaveableImage(image) || previous.parentElement !== image.parentElement)) {
            const anchor = previous.parentElement;
            previous.remove();
            image[ATTACHED_FLAG] = null;
            if (anchor?.dataset.rphubSavePos && !anchor.querySelector('.' + WRAP_CLASS)) {
                anchor.style.removeProperty('position');
                delete anchor.dataset.rphubSavePos;
            }
        }
        if (!isSaveableImage(image) || image[ATTACHED_FLAG]) return;
        const parent = image.parentElement;
        if (!parent) return;

        // Ensure the image container can anchor the absolute-positioned button.
        let anchor = parent;
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.position === 'static') {
            parent.dataset.rphubSavePos = '1';
            parent.style.position = 'relative';
            anchor = parent;
        }

        const wrap = document.createElement('span');
        wrap.className = WRAP_CLASS;
        image[ATTACHED_FLAG] = wrap;
        wrap.appendChild(makeButton(image));
        anchor.appendChild(wrap);
    };

    const scan = root => {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('img').forEach(attachButton);
        if (root && root.tagName === 'IMG') attachButton(root);
    };

    injectStyle();
    const init = () => {
        scan(document);
        document.addEventListener('load', event => {
            if (event.target.tagName === 'IMG') attachButton(event.target);
        }, true);
        try {
            const observer = new MutationObserver(records => {
                records.forEach(record => record.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) scan(node);
                }));
                records.filter(record => record.type === 'attributes').forEach(record => scan(record.target));
            });
            observer.observe(document.body, { childList: true, subtree: true, attributes: true,
                attributeFilter: ['src', 'srcset', 'data-rphub-no-save', 'data-rphub-save-skip'] });
        } catch (error) {
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    console.log('[RP-Hub] image save interactions installed');
})();
// --- Sidebar watermark (cumulative left-to-right fade in/out) ---
(function () {
    const STYLE_ID = 'rphub-sidebar-watermark-style';
    const CHARS = Array.from('红花玲🌹🔔 /⚡');
    const CHAR_MS = 200;   // per-character stagger
    const FADE_MS = 340;   // opacity transition duration per character
    const HOLD_MS = 420;   // fully visible hold
    const EXIT_START_MS = 120;

    if (window.__RPHubSidebarWatermarkInstalled) return;
    window.__RPHubSidebarWatermarkInstalled = true;

    const injectStyle = () => {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.sidebar-watermark-seq{position:relative;display:block;height:1.7em;line-height:1.7em;',
            'white-space:nowrap;letter-spacing:.18em;text-align:center;overflow:visible;}',
            '.sidebar-watermark-seq > span{display:inline-block;opacity:0;',
            'transform:translateY(3px);transition:opacity ' + FADE_MS + 'ms ease, transform ' + FADE_MS + 'ms ease;}',
            '.sidebar-watermark-seq > span.rphub-wm-on{opacity:1;transform:translateY(0);}',
            '.sidebar-watermark-seq > span.rphub-wm-out{opacity:0;transform:translateY(-3px);}'
        ].join('');
        (document.head || document.documentElement).appendChild(style);
    };

    const buildSequence = container => {
        if (!container || container.__rphubSeqReady) return container;
        container.__rphubSeqReady = true;
        container.textContent = '';
        container.__rphubSpans = CHARS.map(char => {
            const span = document.createElement('span');
            span.textContent = char;
            container.appendChild(span);
            return span;
        });
        return container;
    };

    const clearTimers = container => {
        if (container.__rphubTimers) {
            container.__rphubTimers.forEach(t => clearTimeout(t));
        }
        container.__rphubTimers = [];
    };

    const later = (container, fn, delay) => {
        const t = setTimeout(fn, delay);
        container.__rphubTimers.push(t);
        return t;
    };

    const playSequence = container => {
        const spans = container.__rphubSpans;
        if (!spans || !spans.length) return;
        clearTimers(container);
        spans.forEach(span => span.classList.remove('rphub-wm-on', 'rphub-wm-out'));

        // Fade in left -> right.
        spans.forEach((span, i) => {
            later(container, () => {
                span.classList.remove('rphub-wm-out');
                span.classList.add('rphub-wm-on');
            }, i * CHAR_MS);
        });

        // Fade out left -> right after fully visible.
        const exitBase = (spans.length - 1) * CHAR_MS + FADE_MS + HOLD_MS + EXIT_START_MS;
        spans.forEach((span, i) => {
            later(container, () => {
                span.classList.remove('rphub-wm-on');
                span.classList.add('rphub-wm-out');
            }, exitBase + i * CHAR_MS);
        });
    };

    const handleSidebar = sidebar => {
        const container = sidebar.querySelector('.sidebar-watermark-seq');
        if (!container) return;
        injectStyle();
        buildSequence(container);
        // 官网把侧栏从 .app-sidebar + .mobile-sidebar-open 改成了 Vue 组件
        // <app-navigation> 的 #app-navigation-panel，打开时挂载、关闭时卸载。
        // 因此「面板出现在 DOM 里」本身就是打开信号，直接播放逐字水印动画。
        if (!sidebar.__rphubWmPlayed) {
            sidebar.__rphubWmPlayed = true;
            playSequence(container);
        }
    };

    const scan = () => {
        document.querySelectorAll('.app-navigation-panel').forEach(handleSidebar);
    };

    const init = () => {
        scan();
        try {
            const observer = new MutationObserver(scan);
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        } catch (error) {
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
