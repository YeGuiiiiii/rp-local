const { createApp, ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick, getCurrentInstance } = Vue;
const { useTokenUsage } = window.RPHubComposables;
const { createMessageRenderer } = window.RPHubMessageRenderer;
const { AppNavigation } = window.RPHubLayoutComponents;
const { requestChatCompletion, requestJson } = window.RPHubApiClient;
const { buildApiEndpoint, buildUserInputToolMessages } = window.RPHubApiUtils;
const {
    ActionConfirmModal,
    ActiveToolEditorModal,
    AddCharacterModal,
    AutoImageGenModal,
    CharacterExportModal,
    CharacterEditorModal,
    CharacterCard,
    CharacterDeck,
    ContextViewerModal,
    EmbeddedViewContent,
    GenerationTimer,
    ExportSelectionModal,
    ModelSelectorModal,
    ModalHeader,
    ModalShell,
    PaginationControls,
    PresetEditorModal,
    RegexEditorModal,
    RetryConfirmModal,
    SecretInput,
    SettingsHelp,
    SettingsPageHeader,
    MemoryBackfillModal,
    MemoryCitationModal,
    StoryBranchModal,
    TokenUsageView,
    UiTemplatesView,
    UiTemplateEditorModal,
    UiTemplatePending,
    UserSetupModal,
    WorldInfoEditorModal
} = window.RPHubComponents;
const {
    compressImage,
    defaultAvatar,
    generateUUID,
    getApiUsagePayload,
    getImageTagRegex,
    getToastIcon,
    normalizeApiUsage,
    parseCot,
    stringifyErrorDetail
} = window.RPHubUtils;
const {
    buildSummaryEmbeddingText,
    cosineSimilarity,
    flattenClassicMemories,
    getClassicMemoryKey,
    getNextClassicMemoryNo,
    getSummaryEmbedding,
    getSummarySources,
    markRuntimeRaw,
    normalizeEmbedding,
    numberClassicMemories,
    prepareClassicMemoriesForRuntime,
    quantizeEmbeddingForStorage,
    summaryEmbeddingFingerprint,
    trimMemoryText
} = window.RPHubMemoryUtils;
const {
    appendEnhancedMemoryRecall,
    buildContextViewerState,
    buildConversationTurnSnapshot: createConversationTurnSnapshot,
    escapeXmlAttribute,
    getConversationTurnAtIndexFromSnapshot,
    getPostprocessedChatMessages: postprocessChatHistory,
    indentXmlText,
    injectContextMessages,
    isRoleMemoryContextContent,
    postprocessContextMessages,
    resolveWorldInfoEntries
} = window.RPHubContextUtils;
const {
    STORY_BRANCH_CHAT_EXPORT_TYPE,
    STORY_BRANCH_CHAT_EXPORT_VERSION,
    STORY_BRANCH_MAIN_ID,
    createStoryRouteMap,
    getConversationBodyLength,
    getStoryBranchOwnerId,
    getStoryBranchScopeId: buildStoryBranchScopeId,
    normalizeStoryBranches
} = window.RPHubStoryBranches;
// [rphub 2.7.90] 内置预设的跨文件来源是 built-in-content.js（它在 index.html 里
// 用 document.write 同步加载，排在 app.js 之前）。一旦它没按时就位，
//   window.RPHubBuiltinPresets 就是 undefined，Vue 首屏渲染会中途抛错中断
//   （真机实测：满屏「二次提炼」弹窗 + {{ }} 原样 + 布局错位）。
// 这里给一层兜底：缺全局时退化成空对象，让渲染继续走下去，
//   而不是让整个首屏死在 builtin-preset 这一项上。
const __rpBuiltinPresets = (window.RPHubBuiltinPresets && typeof window.RPHubBuiltinPresets === 'object')
    ? window.RPHubBuiltinPresets
    : { buildCotPresetContent: null, corePresets: [], managedPresets: {} };
const {
    buildCotPresetContent,
    corePresets: BUILTIN_CORE_PRESETS,
    managedPresets: BUILTIN_PRESETS
} = __rpBuiltinPresets;
const {
    applyUiTemplateUpdateListToTemplate,
    cloneUiObject,
    createExecutableHtmlIframe,
    findUiTemplateUpdateBlock,
    inferInitialUiTemplateState,
    normalizeUiTemplate,
    normalizeUiTemplateUpdateList,
    parseUiTemplateUpdates,
    renderUiTemplateHtml,
    sanitizeUiTemplateImportEntry,
    setUiTemplateValue,
    stringifyUiSchema,
    stripUiTemplateUpdateBlock
} = window.RPHubUiTemplateUtils;
const {
    cloneForStorage,
    deleteScopedStoredValue,
    deleteStoredValue,
    getLegacyDb,
    getMainDb,
    getScopedStoredValue,
    getStoredValue,
    getStorageLogicalKey,
    initDB,
    isDatabaseClosingError,
    readStorageKeys,
    setScopedStoredValue,
    setStoredValue,
    unwrapForStorage
} = window.RPHubStorage;
const { prompts: BUILTIN_PROMPTS } = window.RPHubBuiltinContent;
const {
    activeTools: activeToolConfig,
    apiProviderOptions,
    defaultApiConfig: DEFAULT_API_CONFIG,
    defaultApiProviderId: DEFAULT_API_PROVIDER_ID,
    imageGenBaseUrl: IMAGE_GEN_BASE_URL,
    systemRegexNames,
    systemWorldInfoNames,
    uiOptions
} = window.RPHubConfig;

// Configure marked to disable indented code blocks
// This allows indented HTML (like details/summary) to be rendered as HTML instead of code
marked.use({
    breaks: true,
    tokenizer: {
        // Disable the indentation-based code block tokenizer
        code(src) {
            return undefined;
        }
    }
});

const RollingText = {
    props: { value: { type: [String, Number], default: '' } },
    setup(props) {
        const text = computed(() => String(props.value ?? ''));
        const characters = computed(() => Array.from(text.value));
        return { characters, text };
    },
    template: `
        <span class="inline-flex" :aria-label="text">
            <span v-for="(character, index) in characters" :key="index" class="inline-grid overflow-hidden">
                <transition name="usage-roll" appear>
                    <span :key="character" class="col-start-1 row-start-1" aria-hidden="true">{{ character }}</span>
                </transition>
            </span>
        </span>`
};

// [rphub 2.7.63] 输入行独立子组件。
// 目的：把 userInput 从「父组件 render 依赖」中摘出去。
//   实测（200 条 × 3000 字）：输入框与消息列表同组件时，userInput 每变一次
//   都会重跑模板内全部消息的函数（parseCot×6 / processMainContent×3 / renderMarkdown×2），
//   删除时每键一次 ⇒ 5.00 ms/键；隔离后 0.10 ms/键（约 50 倍）。
//   中文 IME 合成期 v-model 不更新、退格每键更新，这就是「打字不卡、删除卡」的原因。
// 实现要点：setup 直接复用父组件 setupState ⇒ 模板可逐字照抄，
//   不必把 userInput / sendMessage 等改写成 ctx.xxx（改动面最小的关键）。
//   ref="inputBox" 仍会写回父组件的 inputBox ref；v-model 双向绑定照常。
const RphubInputRow = {
    name: 'RphubInputRow',
    setup() {
        // 复用父组件 setupState：模板可逐字照抄，不必改写 userInput → ctx.userInput。
        // 父组件若因故取不到（理论上不会），退回空对象由 Vue 报错定位，不静默白屏。
        const inst = getCurrentInstance();
        const parent = inst && inst.parent;
        return (parent && parent.setupState) || {};
    },
    template: `
<div class="relative w-full flex items-end gap-2 px-1">
    <textarea v-model="userInput" @input="autoResizeInput" @focus="handleChatInputFocus"
        @blur="handleChatInputBlur" @keydown="handleChatInputEnter"
        :placeholder="'输入消息...'"
        class="flex-1 bg-gray-100/70 text-gray-800 rounded-2xl px-4 py-2.5 md:px-4 md:py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-none border border-transparent shadow-inner transition-all focus:bg-white chat-input-scrollbar min-h-[44px] md:min-h-[46px] max-h-[140px] md:max-h-[160px]"
        rows="1" ref="inputBox"></textarea>

    <!-- Send/Stop Button -->
    <div class="flex-shrink-0 flex items-center gap-1" @pointerdown.capture="flushChatInput">
        <button v-if="!isConversationBusy" @click="sendMessage"
            :disabled="(!userInput.trim() && pendingChatImages.length === 0 && !pendingCardInteraction) || pendingChatImageReadCount > 0"
            class="p-2 md:p-2.5 bg-primary-600 text-white rounded-2xl md:hover:bg-primary-700 md:hover:shadow-lg md:hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all shadow-md flex items-center justify-center w-[44px] h-[44px] md:w-[46px] md:h-[46px]"
            title="发送">
            <svg class="w-5 h-5" fill="none"
                stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10.268 21a2 2 0 0 0 3.464 0"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
            </svg>
        </button>
        <button v-else @click="stopGeneration"
            class="p-2 md:p-2.5 bg-red-500 text-white rounded-2xl md:hover:bg-red-600 md:hover:shadow-lg md:hover:-translate-y-0.5 active:scale-95 transition-all shadow-md flex items-center justify-center w-[44px] h-[44px] md:w-[46px] md:h-[46px]"
            title="中止生成">
            <svg class="w-5 h-5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    </div>
</div>`
};

RphubInputRow.render = window.RPCompiledRenders?.RphubInputRow;
let activeMainRender;
const app = createApp({
    render(...args) {
        const render = this.classicUi ? window.RPCompiledClassicRender : window.RPCompiledMainRender;
        if (activeMainRender !== render) { args[1].length = 0; activeMainRender = render; }
        const layout = render.apply(this, args);
        layout.key = this.classicUi ? 'classic' : 'modern';
        return layout;
    },
    components: {
        // [rphub 2.7.63] 输入行隔离组件
        RphubInputRow,
        ActionConfirmModal,
        ActiveToolEditorModal,
        AddCharacterModal,
        AppNavigation,
        AutoImageGenModal,
        CharacterExportModal,
        CharacterEditorModal,
        CharacterCard,
        CharacterDeck,
        CustomSelect: window.RPHubCustomSelect,
        ContextViewerModal,
        EmbeddedViewContent,
        GenerationTimer,
        ExportSelectionModal,
        ModelSelectorModal,
        PaginationControls,
        PresetEditorModal,
        RegexEditorModal,
        RetryConfirmModal,
        RollingText,
        SecretInput,
        SettingsHelp,
        SettingsPageHeader,
        StreamImportPanel: window.RPStreamImportPanel,
        MemoryBackfillModal,
        MemoryCitationModal,
        StoryBranchModal,
        TokenUsageView,
        UiTemplatesView,
        UiTemplateEditorModal,
        UiTemplatePending,
        UserSetupModal,
        WorldInfoEditorModal
    },
    setup() {
        const cardUtils = window.RPHubCardUtils;
        const {
            fontSizes: fontSizeOptions,
            imageCounts: imageGenCountOptions,
            imageModels: imageModelOptions,
            imageSizes: imageSizeOptions,
            imageStyles: imageStyleOptions,
            popularModelFamilies,
            presetRoleDisplayLabels,
            presetRoles: presetRoleOptions,
            uiTemplatePlacements: uiTemplatePlacementOptions,
            worldInfoPositions: worldInfoPositionOptions
        } = uiOptions;
        const ACTIVE_TOOL_KEYWORD_TYPE = activeToolConfig.types.keyword;
        const ACTIVE_TOOL_WEB_TYPE = activeToolConfig.types.web;
        const ACTIVE_TOOL_RANDOM_TYPE = activeToolConfig.types.random;
        const ACTIVE_TOOL_MIN_RESULT_COUNT = activeToolConfig.resultCount.min;
        const ACTIVE_TOOL_DEFAULT_RESULT_COUNT = activeToolConfig.resultCount.default;
        const ACTIVE_TOOL_MAX_RESULT_COUNT = activeToolConfig.resultCount.max;
        const ACTIVE_TOOL_RESULT_COUNT_VERSION = activeToolConfig.resultCount.version;
        const ACTIVE_TOOL_MAX_AUTO_CONTINUE = activeToolConfig.maxAutoContinue;
        const ACTIVE_TOOL_AGGRESSIVENESS_ADAPTIVE = activeToolConfig.aggressiveness.adaptive;
        const ACTIVE_TOOL_AGGRESSIVENESS_OPTIONS = activeToolConfig.aggressiveness.options;
        const ACTIVE_TOOL_REMINDERS = activeToolConfig.aggressiveness.reminders;
        const ACTIVE_TOOL_TAVILY_ENDPOINT = activeToolConfig.tavily.searchEndpoint;
        const ACTIVE_TOOL_TAVILY_EXTRACT_ENDPOINT = activeToolConfig.tavily.extractEndpoint;
        const ACTIVE_TOOL_TAVILY_SEARCH_DEPTH = activeToolConfig.tavily.searchDepth;
        const ACTIVE_TOOL_TAVILY_EXTRACT_MAX_URLS = ACTIVE_TOOL_DEFAULT_RESULT_COUNT;
        const getDefaultActiveToolDefinitions = () => activeToolConfig.defaults.map(tool => ({ ...tool }));

        // --- State ---
        const globalConfirmModal = ref({
            show: false,
            title: '',
            message: '',
            onConfirm: null,
            onCancel: null
        });

        const showVueConfirmModal = (title, message, options = {}) => {
            const resolvedTitle = String(title || '');
            const confirmText = String(options && options.confirmText ? options.confirmText : (resolvedTitle.includes('遇到错误') ? '立即重试' : '确认'));
            const cancelText = String(options && options.cancelText ? options.cancelText : '取消');
            return new Promise((resolve) => {
                globalConfirmModal.value = {
                    show: true,
                    title,
                    message,
                    confirmText,
                    cancelText,
                    onConfirm: () => {
                        globalConfirmModal.value.show = false;
                        resolve(true);
                    },
                    onCancel: () => {
                        globalConfirmModal.value.show = false;
                        resolve(false);
                    }
                };
            });
        };

        const currentView = ref('characters');
        const uiPack = ref(window.RPThemePacks.current);
        const classicUi = computed(() => window.RPThemePacks.catalog.find(pack => pack.id === uiPack.value)?.layout === 'classic');
        const syncUiPack = () => { uiPack.value = window.RPThemePacks.current; };
        window.addEventListener('rp-ui-theme-change', syncUiPack);
        onBeforeUnmount(() => window.removeEventListener('rp-ui-theme-change', syncUiPack));
        const shellRoots = ['characters', 'album', 'advanced', 'settings'];
        const shellHistory = [];
        const streamImportPanel = ref(null);
        const backupTask = reactive({ active: false, locked: false, title: '', message: '', percent: 0, detail: '', error: '', confirm: null, recovery: false });
        const backupProfiles = window.RPStreamImport.profiles;
        const backupProfile = ref(window.RPStreamImport.profile(localStorage.getItem('rp-backup-profile')).id);
        const backupSource = ref('all'), backupMenu = ref(''), backupListError = ref('');
        watch(backupProfile, id => localStorage.setItem('rp-backup-profile', window.RPStreamImport.profile(id).id));
        const beginBackupTask = title => Object.assign(backupTask, {
            active: true, locked: true, title, message: '正在准备…', percent: 0, detail: '', error: '', confirm: null, recovery: false
        });
        const confirmBackupTask = (title, message) => new Promise(resolve => {
            Object.assign(backupTask, { title, message, confirm: answer => { backupTask.confirm = null; resolve(answer); } });
        });
        const shellScroll = new Map();
        let shellMotion;
        let shellReturning = false;
        watch(currentView, (view, previous) => {
            const visiblePage = () => [...document.querySelectorAll('.app-main > :is(.shell-page,.management-view)')]
                .find(element => element.getClientRects().length);
            if (shellRoots.includes(previous)) {
                const page = visiblePage();
                if (page) shellScroll.set(previous, page.scrollTop);
            }
            const returning = shellReturning;
            shellReturning = false;
            shellMotion?.cancel();
            nextTick(() => {
                if (currentView.value !== view) return;
                const page = visiblePage();
                if (!page || view === 'chat') return;
                if (shellRoots.includes(view)) page.scrollTop = shellScroll.get(view) || 0;
                const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
                const rootChange = shellRoots.includes(view) && shellRoots.includes(previous);
                shellMotion = page.animate([
                    { opacity: .6, transform: reduced ? 'none' : rootChange ? 'translateY(5px)' : `translateX(${returning ? -6 : 6}px)` },
                    { opacity: 1, transform: 'none' }
                ], { duration: reduced ? 90 : rootChange ? 160 : 180, easing: 'cubic-bezier(.22,1,.36,1)' });
            });
        }, { flush: 'pre' });
        const shellRoot = computed(() => shellRoots.includes(currentView.value));
        const onlineOpen = ref(false);
        const dockFolded = ref(localStorage.getItem('rp-dock-folded') === '1');
        const galleryPage = ref(null);
        const settingsSection = ref('persona');
        const settingTitles = {
            persona: '个人设定', api: 'API 连接与服务', image: '生图设置',
            reading: '阅读与性能', appearance: '外观',
            legacy: '旧版共享配置'
        };
        const shellParent = ref('characters');
        const foldDock = folded => {
            dockFolded.value = folded;
            localStorage.setItem('rp-dock-folded', folded ? '1' : '0');
        };
        const resourceScope = ref('character');
        const selectedCompetition = ref(null);
        const openCompetition = id => {
            const event = window.RPCompetitions.events.find(item => item.id === id);
            if (!event) return;
            selectedCompetition.value = event;
            navigateWorkspace('competition');
            closeAnnouncement();
        };
        const navigateWorkspace = target => {
            if (streamImportPanel.value?.isOpen) return;
            const view = typeof target === 'string' ? target : target.view;
            if (view === 'appearance') { openSettingsSection('appearance'); return; }
            onlineOpen.value = false;
            isNavigationOpen.value = false;
            if (view === 'lighthouse') {
                lighthouseUrl.value = target.url || 'https://wxdt.duckdns.org/';
                isLighthouseLoading.value = true;
            }
            if (view === 'lighthouse' && window.AndroidBridge?.openLighthouse) {
                try { window.AndroidBridge.openLighthouse(lighthouseUrl.value); return; }
                catch (error) { showToast('独立窗口打开失败，改用内嵌页面', 'warning'); }
            }
            if (view === currentView.value) return;
            if (shellRoots.includes(view)) {
                shellHistory.length = 0;
            } else {
                shellHistory.push({ view: currentView.value, section: settingsSection.value, scope: resourceScope.value,
                    announcement: showAnnouncement.value,
                    announcementScroll: document.querySelector('.release-reading')?.scrollTop || 0 });
            }
            shellParent.value = shellHistory.at(-1)?.view || (view === 'chat' ? 'characters' : 'advanced');
            if (['worldinfo', 'regex', 'uitemplates'].includes(view)) resourceScope.value = target.scope || 'character';
            if (view === 'cardconfig' && !currentCharacter.value) {
                currentView.value = 'characters';
                return;
            }
            currentView.value = view;
            if (view === 'backup') { backupMenu.value = ''; cancelRenameBackupFile(); }
        };
        const openSettingsSection = section => {
            if (section === 'storage') { navigateWorkspace('backup'); return; }
            navigateWorkspace('settings-detail');
            settingsSection.value = section;
        };
        const shellGoBack = () => {
            const imageDownload = document.querySelector('.image-download-sheet[open]');
            if (imageDownload) { imageDownload.close(); return true; }
            if (streamImportPanel.value?.handleBack()) return true;
            if (cloudBackup.busy) return true;
            if (cloudBackup.mode) { closeCloudBackup(); return true; }
            const chatExportPanel = document.getElementById('rphub-chat-export-panel');
            if (chatExportPanel) { chatExportPanel.dispatchEvent(new Event('rp:close')); return true; }
            if (showAnnouncement.value) { closeAnnouncement(); return true; }
            if (onlineOpen.value) { onlineOpen.value = false; return true; }
            if (isNavigationOpen.value) { isNavigationOpen.value = false; return true; }
            if (globalConfirmModal.value.show) { globalConfirmModal.value.onCancel?.(); return true; }
            if (showConfirmModal.value) { showConfirmModal.value = false; return true; }
            for (const modal of [showCharacterEditor, showCharacterExportModal, showAddCharacterMenu,
                showPresetEditor, showRegexEditor, showWorldInfoEditor, showUiTemplateEditor,
                showModelSelector, showChatModelSelector, showStoryBranchModal, showAutoImageGenModal, showExportModal, showActiveToolEditor,
                showContextViewerModal, showMemoryBackfillModal, showBackupSizeModal,
                showPresetBatchMoveModal, showPresetGroupForm]) {
                if (modal.value) { modal.value = false; return true; }
            }
            if (currentView.value === 'album' && galleryPage.value?.back()) return true;
            if (resourceBatch.active) { resourceBatch.reset(); return true; }
            if (currentView.value === 'backup') {
                if (backupRenameId.value) { cancelRenameBackupFile(); return true; }
                if (backupMenu.value) { backupMenu.value = ''; return true; }
            }
            if (currentView.value === 'characters') return false;
            if (shellRoots.includes(currentView.value)) {
                navigateWorkspace('characters');
                return true;
            }
            const previous = shellHistory.pop();
            shellReturning = true;
            settingsSection.value = previous?.section || 'persona';
            resourceScope.value = previous?.scope || 'character';
            currentView.value = previous?.view || (['settings-detail','cache','backup','usage','patchlist'].includes(currentView.value) ? 'settings' : 'characters');
            shellParent.value = shellHistory.at(-1)?.view || 'characters';
            if (previous?.announcement) {
                openAnnouncement();
                nextTick(() => {
                    const reading = document.querySelector('.release-reading');
                    if (reading) reading.scrollTop = previous.announcementScroll;
                });
            }
            return true;
        };
        const shellNotice = event => showToast(event.detail.message, event.detail.error ? 'error' : 'success', 5000);
        const finishStartup = async () => {
            if (currentCharacter.value && chatHistory.value.length) {
                currentView.value = 'chat';
                if (!await readerSession.restore()) await scrollChatToBottom();
            } else {
                hasOpenedCharacterManager.value = true;
                currentView.value = 'characters';
            }
        };
        const isNavigationOpen = ref(false);
        const showDescriptionPanel = ref(false);
        const showModelSelector = ref(false);
        const modelSelectionTarget = ref('model');
        const showChatModelSelector = ref(false);
        const showCharacterEditor = ref(false);
        const showPresetEditor = ref(false);
        const showUiTemplateEditor = ref(false);
        // 2.7.87：detail 承载副模型分析失败的错误原文（原来只有 console 可见）。
        const uiTemplateUpdateStatus = reactive({ state: 'idle', message: '待命', targetMessageId: null, detail: '' });
        let uiTemplateUpdateSeq = 0;
        let uiTemplateUpdateAbortController = null;
        const showRegexEditor = ref(false);
        const showWorldInfoEditor = ref(false);
        const showActiveToolEditor = ref(false);
        const showUserSetupModal = ref(false);
        const { showAnnouncement, openAnnouncement, closeAnnouncement } = window.RPReleaseNotes.use(() => showUserSetupModal.value);
        const showAutoImageGenModal = ref(false);
        // 仅保存本轮原生 assistant/tool 消息，不写入用户消息或长期记忆。
        const activeToolMessages = [];
        const tempUserSetup = reactive({ name: '', description: '', person: 'second' });
        const characterDisplayLimit = ref(8);
        const hasOpenedCharacterManager = ref(false);
        const hasOpenedChat = ref(false);
        const isDesktopCharacterLayout = ref(window.innerWidth >= 768);

        // Quota State
        const quotaValue = ref(null);
        const quotaLoading = ref(false);
        const quotaError = ref(false);
        const quotaLabel = computed(() => imageApi.selectedId !== 'builtin' ? '此接口不提供次数查询'
            : !settings.imageGenKey.trim() ? '未填写密钥'
            : quotaLoading.value ? '查询中…' : quotaError.value ? '查询失败'
            : quotaValue.value === null ? '待查询' : `剩余 ${quotaValue.value} 次`);
        let quotaController;

        const fetchQuota = async () => {
            quotaController?.abort();
            const controller = quotaController = new AbortController();
            const imageGenToken = settings.imageGenKey.trim();
            quotaValue.value = null;
            quotaError.value = false;
            quotaLoading.value = !!imageGenToken;
            if (imageApi.selectedId !== 'builtin') { quotaLoading.value = false; return; }
            if (!imageGenToken) return;
            const timeout = setTimeout(() => controller.abort(), 10000);
            try {
                const baseUrl = IMAGE_GEN_BASE_URL;
                const response = await fetch(`${baseUrl}/api/api/getUser`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toUserId: imageGenToken }),
                    signal: controller.signal
                });
                if (!response.ok) throw new Error('Quota request failed');
                const data = await response.json();
                if (quotaController !== controller || settings.imageGenKey.trim() !== imageGenToken) return;
                if (data.status === 'ok' && data.type === 'sta1n') {
                    const val = Number.parseInt(data.data?.value, 10);
                    if (!Number.isFinite(val)) throw new Error('Invalid quota value');
                    quotaValue.value = val;
                } else {
                    quotaError.value = true;
                }
            } catch (_) {
                if (quotaController === controller && settings.imageGenKey.trim() === imageGenToken) quotaError.value = true;
            } finally {
                clearTimeout(timeout);
                if (quotaController === controller) quotaLoading.value = false;
            }
        };
        onBeforeUnmount(() => quotaController?.abort());

        const showConfirmModal = ref(false);
        const confirmMessage = ref('');
        const confirmCallback = ref(null);
        const showMemoryBackfillModal = ref(false);
        const isGenerating = ref(false);
        const isReceiving = ref(false);
        const isThinking = ref(false);
        const activeToolContinuationMessageId = ref(null);
        const activeToolContinuationToolCallId = ref(null);
        const activeToolContinuationHasResponse = ref(false);
        const activeToolHandoffPending = ref(false);
        const activeToolQueueRunning = ref(false);
        const activeToolContinuationPending = ref(false);
        let activeToolQueueAbortController = null;
        const abortController = ref(null);
        const userInput = ref('');
        const pendingCardInteraction = ref('');
        const pendingChatImages = ref([]);
        const pendingChatImageReadCount = ref(0);
        let chatImageSelectionEpoch = 0;
        const modelSearchQuery = ref('');
        const activeModelTag = ref('all');
        const characterSearchQuery = ref('');
        // [rphub 2.8.91] 检索防抖后的值。输入框仍绑 characterSearchQuery（打字即时回显），
        // filteredCharacters 只认这个 applied 值，避免每敲一个字就全量重排一次卡片列表。
        const characterSearchQueryApplied = ref('');
        let characterSearchDebounceTimer = null;
        const availableModels = ref([]);
        const uiTemplateAvailableModels = ref([]);
        const isFetchingUiTemplateModels = ref(false);
        const toasts = ref([]);
        let toastIdSeed = 0;
        const chatContainer = ref(null);
        const isChatFullscreen = ref(false);
        const isInputBarHidden = ref(false);
        const toggleInputBarVisibility = () => {
            isInputBarHidden.value = !isInputBarHidden.value;
            // [rphub 2.8.65] 进纯净观看时把侧栏收掉，否则导航遮罩还压在正文上、点不动。
            if (isInputBarHidden.value) { try { closeNavigation(); } catch (e) { /* 导航未初始化不能阻断切换 */ } }
        };
        const isMobileKeyboardOpen = ref(false);
        const inputBox = ref(null);
        const messageElements = ref([]);
        let mobileViewportRaf = null;
        let mobileKeyboardBlurTimer = null;
        let lastAppliedMobileViewportHeight = 0;
        let lastAppliedMobileKeyboardInset = 0;
        let lastAppliedMobileBackgroundHeight = 0;

        const memoryAvailableModels = ref([]);
        const isFetchingMemoryModels = ref(false);
        let scrollRevealObserver = null;
        const initScrollReveal = () => {
            if (window.IntersectionObserver) {
                scrollRevealObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.dataset.revealed = 'true';
                            entry.target.classList.add('reveal-active');
                            scrollRevealObserver.unobserve(entry.target);
                        }
                    });
                }, {
                    threshold: 0,
                    rootMargin: '50px 0px 50px 0px'
                });
            }
        };

        // Watch for changes in the message list to observe new bubbles
        watch(messageElements, (newEls) => {
            if (!scrollRevealObserver) initScrollReveal();
            if (scrollRevealObserver && newEls) {
                newEls.forEach(el => {
                    if (el instanceof HTMLElement && el.dataset.revealed !== 'true' && !el.classList.contains('reveal-active')) {
                        scrollRevealObserver.observe(el);
                    }
                });
            }
        }, { deep: true, flush: 'post' });


        // [rphub 2.7.62] 输入框自动高度：原实现每键被触发两次
        //   （index.html 的 @input="autoResizeInput" + 下方 watch(userInput)->nextTick），
        //   每次都要读 scrollHeight，造成强制同步布局(reflow)。实测每键 1.90 次。
        //   这里改为 rAF 合并：同一帧内重复调用只执行一次布局读取。
        //   本函数不读写 userInput / el.value，与 IME 合成无关；
        //   中文输入保护由 flushChatInput 的 isComposing 判断负责（未改动）。
        let rphubAutoResizeRaf = 0;
        const autoResizeInputNow = () => {
            rphubAutoResizeRaf = 0;
            if (inputBox.value) {
                inputBox.value.style.height = 'auto';
                if (userInput.value === '') {
                    inputBox.value.style.height = '';
                } else {
                    inputBox.value.style.height = Math.min(inputBox.value.scrollHeight, 180) + 'px';
                }
            }
        };
        const autoResizeInput = () => {
            if (rphubAutoResizeRaf) return;
            if (typeof requestAnimationFrame !== 'function') { autoResizeInputNow(); return; }
            rphubAutoResizeRaf = requestAnimationFrame(autoResizeInputNow);
            // rAF 被浏览器节流/挂起（页面在后台）时不会回调，此时同步兜底，
            // 保证「清空输入框后高度复位」这类关键路径不丢。
            if (!rphubAutoResizeRaf) autoResizeInputNow();
        };

        watch(userInput, () => {
            nextTick(autoResizeInput);
        });

        // 兼容壳：输入框已回归 v-model（index.html 的 @input 直接绑 autoResizeInput）。
        // 保留这两个函数名，是因为 index.html 的 @pointerdown.capture 与 setup 导出列表仍引用它们。
        // v-model 下二者均无副作用；flushChatInput 额外加一层「IME 合成期不回写 userInput」的保护。
        const flushChatInput = () => {
            const el = inputBox.value;
            if (!el) return;
            if (el.isComposing === true) return;
            const value = el.value || '';
            if (userInput.value !== value) userInput.value = value;
        };
        const onChatInput = () => {
            autoResizeInput();
        };


        const isMobileViewport = () => (
            (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
            || window.innerWidth <= 768
        );

        const toggleNavigation = () => {
            if (classicUi.value || currentView.value === 'chat') isNavigationOpen.value = !isNavigationOpen.value;
            else if (!shellRoot.value) shellGoBack();
            else foldDock(false);
        };

        const closeNavigation = () => {
            isNavigationOpen.value = false;
        };

        const applyMobileVisualViewportHeight = (height, { force = false } = {}) => {
            const rphubNativeInset = Math.max(0, Math.round(Number(window.__rphubNativeInset) || 0));
            if (rphubNativeInset > 0) {
                const rphubLayoutH = window.innerHeight || document.documentElement.clientHeight || 0;
                height = Math.max(0, Math.round(rphubLayoutH - rphubNativeInset));
            }
            if (!Number.isFinite(height) || height <= 0) return;
            const safeHeight = rphubNativeInset > 0 ? Math.round(height) : Math.max(320, Math.round(height));
            if (!force && Math.abs(safeHeight - lastAppliedMobileViewportHeight) < 2) return;
            lastAppliedMobileViewportHeight = safeHeight;
            document.documentElement.style.setProperty('--app-visual-height', `${safeHeight}px`);
            const appElement = document.getElementById('app');
            if (appElement?.style.height) appElement.style.height = '';
        };

        const applyMobileKeyboardInset = (inset, { force = false } = {}) => {
            if ((Number(window.__rphubNativeInset) || 0) > 0) {
                if (lastAppliedMobileKeyboardInset !== 0) {
                    lastAppliedMobileKeyboardInset = 0;
                    document.documentElement.style.setProperty('--keyboard-inset', '0px');
                }
                return;
            }
            const safeInset = Math.max(0, Math.round(Number(inset) || 0));
            if (!force && Math.abs(safeInset - lastAppliedMobileKeyboardInset) < 2) return;
            lastAppliedMobileKeyboardInset = safeInset;
            document.documentElement.style.setProperty('--keyboard-inset', `${safeInset}px`);
        };

            window.rphubSetKeyboardInset = (inset) => {
                if (!isMobileViewport()) return;
                const safeInset = Math.max(0, Math.round(Number(inset) || 0));
                window.__rphubNativeInset = safeInset;
                isMobileKeyboardOpen.value = safeInset > 0;
                applyMobileKeyboardInset(0, { force: true });
                const rphubLayoutH = window.innerHeight || document.documentElement.clientHeight || 0;
                applyMobileVisualViewportHeight(rphubLayoutH - safeInset, { force: true });
            };

        const applyMobileBackgroundHeight = (height, { force = false } = {}) => {
            if (!Number.isFinite(height) || height <= 0) return;
            const safeHeight = Math.max(
                320,
                Math.round(height),
                lastAppliedMobileBackgroundHeight
            );
            if (!force && Math.abs(safeHeight - lastAppliedMobileBackgroundHeight) < 2) return;
            lastAppliedMobileBackgroundHeight = safeHeight;
            document.documentElement.style.setProperty('--chat-bg-height', `${safeHeight}px`);
        };

        const syncMobileVisualViewport = ({ force = false } = {}) => {
            if (!isMobileViewport()) {
                closeNavigation();
                isMobileKeyboardOpen.value = false;
                lastAppliedMobileViewportHeight = 0;
                lastAppliedMobileKeyboardInset = 0;
                lastAppliedMobileBackgroundHeight = 0;
                document.documentElement.style.removeProperty('--app-visual-height');
                document.documentElement.style.removeProperty('--keyboard-inset');
                document.documentElement.style.removeProperty('--chat-bg-height');
                return;
            }

            const viewport = window.visualViewport;
            const height = viewport?.height || window.innerHeight || document.documentElement.clientHeight;
            const layoutHeight = window.innerHeight || document.documentElement.clientHeight || height;
            const viewportOffsetTop = viewport?.offsetTop || 0;
            const visualHeightForLayout = viewport ? height + viewportOffsetTop : height;
            const inputFocused = document.activeElement === inputBox.value;
            const keyboardInset = viewport
                ? Math.max(0, layoutHeight - height - viewportOffsetTop)
                : 0;
            const viewportCompressed = viewport && height < layoutHeight - 80;
            const keyboardOpen = !!(viewportCompressed || keyboardInset > 40);
            const keyboardInsetForLayout = keyboardOpen ? keyboardInset : 0;
            const appHeightForLayout = keyboardInsetForLayout > 0 ? layoutHeight : visualHeightForLayout;
            const freezeBackground = inputFocused || keyboardOpen || isMobileKeyboardOpen.value;
            const backgroundHeight = freezeBackground
                ? Math.max(lastAppliedMobileBackgroundHeight, lastAppliedMobileViewportHeight, appHeightForLayout)
                : Math.max(layoutHeight, visualHeightForLayout);

            applyMobileVisualViewportHeight(appHeightForLayout, { force });
            applyMobileKeyboardInset(keyboardInsetForLayout, { force });
            applyMobileBackgroundHeight(backgroundHeight, { force });
            isMobileKeyboardOpen.value = !!(inputFocused || keyboardOpen);

        };

        const scheduleMobileVisualViewportSync = (options = {}) => {
            if (mobileViewportRaf) cancelAnimationFrame(mobileViewportRaf);
            mobileViewportRaf = requestAnimationFrame(() => {
                mobileViewportRaf = null;
                syncMobileVisualViewport(options);
            });
        };

        const handleChatInputFocus = () => {
            if (!isMobileViewport()) return;
            clearTimeout(mobileKeyboardBlurTimer);
            isMobileKeyboardOpen.value = true;
            scheduleMobileVisualViewportSync({ force: true });
        };

        const handleChatInputBlur = () => {
            flushChatInput();
            clearTimeout(mobileKeyboardBlurTimer);
            mobileKeyboardBlurTimer = setTimeout(() => {
                isMobileKeyboardOpen.value = false;
                scheduleMobileVisualViewportSync({ force: true });
            }, 180);
        };

        const handleMobileViewportResize = () => {
            isDesktopCharacterLayout.value = window.innerWidth >= 768;
            scheduleMobileVisualViewportSync();
        };
        const handleMobileOrientationChange = () => {
            lastAppliedMobileBackgroundHeight = 0;
            document.documentElement.style.removeProperty('--chat-bg-height');
            scheduleMobileVisualViewportSync({ force: true });
        };

        // Service Status
        const apiStatus = ref('unknown'); // 'unknown', 'checking', 'connected', 'error'
        const apiLatency = ref(0);
        const imageGenStatus = ref('unknown');
        const imageGenLatency = ref(0);

        const user = reactive({
            name: '请前往设置自定义你的名称',
            description: '',
            preferences: '',
            avatar: '',
            person: 'second', //记录人称偏好：second 或 third
        });
        const replaceUserNamePlaceholder = (value) => String(value ?? '')
            .replace(/\{\{\s*user\s*\}\}/gi, () => String(user.name || '').trim());
        const buildUserInfoPrompt = () => BUILTIN_PROMPTS.buildUserInfoPrompt(user);
        const getCurrentCharacterPrompt = () => BUILTIN_PROMPTS.buildCharacterPrompt(currentCharacter.value);

        const userProfiles = ref([]);
        const activeProfileId = ref(null);
        const showProfileDropdown = ref(false);

        watch(user, (newVal) => {
            if (activeProfileId.value) {
                const profileIndex = userProfiles.value.findIndex(p => p.uuid === activeProfileId.value);
                if (profileIndex !== -1) {
                    const currentProfile = userProfiles.value[profileIndex];
                    if (currentProfile.name !== newVal.name ||
                        currentProfile.description !== newVal.description ||
                        currentProfile.preferences !== newVal.preferences ||
                        currentProfile.avatar !== newVal.avatar ||
                        currentProfile.person !== newVal.person) {
                        userProfiles.value[profileIndex] = JSON.parse(JSON.stringify(newVal));
                        userProfiles.value[profileIndex].uuid = activeProfileId.value;
                    }
                }
            }
        }, { deep: true });

        const MAX_CONTEXT_SIZE = 1000000;

        const settings = reactive({
            apiUrl: DEFAULT_API_CONFIG.apiUrl,
            apiKey: DEFAULT_API_CONFIG.apiKey,
            apiProviderId: DEFAULT_API_PROVIDER_ID,
            apiProviderKeys: {},
            customApiUrl: '',
            customApiProviders: [],
            slotTemperatures: {},
            apiProviderModels: {},
            model: DEFAULT_API_CONFIG.qualityModel,
            contextSize: MAX_CONTEXT_SIZE,
            temperature: 1.0,
            reasoningEffort: '',
            stream: true,
            activeToolAggressiveness: 'adaptive',

            useCharacterBackground: true,
            immersiveMode: false,
            showLatestUsageBar: false,
            preventTruncation: false,
            inputObfuscation: true,
            styleFilterEnabled: true,
            uiTemplateEnabled: false,
            uiTemplateModel: '',
            uiTemplateApiUrl: '',
            uiTemplateApiKey: '',
            uiTemplateAnalysisDepth: 4,
            uiTemplateInjectContext: false,
            uiTemplateMainModelAnalysis: true,
            fontSize: window.innerWidth > 768 ? 16 : 14,
            imageGenKey: '',
            imageStyle: 'vertical',
            customImageArtists: [{ name: '', artists: '', negative: '', selected: true }],
            freezeGeneratedImages: false,
            imageModel: 'nai-diffusion-4-5-full',
            imageSize: '竖图',
            imageGenCount: 2,
            qualityModel: DEFAULT_API_CONFIG.qualityModel,
            balancedModel: DEFAULT_API_CONFIG.balancedModel,
            fastModel: DEFAULT_API_CONFIG.fastModel,
            tokenUsageRetentionLimit: 1000,
            chatRenderMessageLimit: 100,
            uiTemplateKeepFloors: 3
        });
        let retainedSettingsExtras = {};
        const imageApi = window.RPImageProviders.create(IMAGE_GEN_BASE_URL);
        watch(() => imageApi.current.key, key => { settings.imageGenKey = key; });
        watch(() => [imageApi.selectedId, imageApi.current.url, imageApi.current.protocol], () => {
            fetchQuota();
            imageGenStatus.value = 'unknown';
        });
        const removeImageProvider = async () => {
            if (await showVueConfirmModal('删除生图接口', '删除「' + imageApi.current.name + '」及其本机密钥？',
                { confirmText: '删除' })) imageApi.remove();
        };
        const tokenUsageRetentionOptions = Object.freeze([
            { value: 500, label: '保留 500 条' },
            { value: 1000, label: '保留 1000 条' },
            { value: 2000, label: '保留 2000 条' },
            { value: 5000, label: '保留 5000 条' }
        ]);

        const v5UnsupportedImageStyles = new Set(['r18', 'lolita25d', 'anime']);
        const availableImageStyleOptions = computed(() => settings.imageModel === 'nai-diffusion-5-full'
            ? imageStyleOptions.filter(option => !v5UnsupportedImageStyles.has(option.value))
            : imageStyleOptions);
        const getImageModelName = (value) => (imageModelOptions.find(option => option.value === value)?.label
            || imageModelOptions[0].label).replace(/（[^）]*）$/, '');
        const normalizeFontSize = (value) => {
            const size = Number(value);
            return Number.isFinite(size) ? Math.max(12, Math.min(20, Math.round(size))) : 16;
        };

        const showApiProviderSelector = ref(false);
        const showCustomArtistEditor = ref(false);
        const showCustomApiSites = ref(false);

        const activeCustomArtist = computed(() => {
            const list = Array.isArray(settings.customImageArtists) ? settings.customImageArtists : [];
            const picked = list.find(item => item && typeof item === 'object' && item.selected === true);
            if (picked) return picked;
            return list.find(item => item && typeof item === 'object') || { artists: '', negative: '', selected: false };
        });
        const selectCustomArtist = (index) => {
            const list = Array.isArray(settings.customImageArtists) ? settings.customImageArtists : [];
            list.forEach((item, i) => { if (item && typeof item === 'object') item.selected = (i === index); });
        };
        const removeCustomArtist = (index) => {
            const list = Array.isArray(settings.customImageArtists) ? settings.customImageArtists : [];
            if (list.length <= 1) return;
            const removingActive = !!(list[index] && list[index].selected);
            list.splice(index, 1);
            if (removingActive || !list.some(item => item && typeof item === 'object' && item.selected)) {
                const nextIndex = Math.max(0, Math.min(index, list.length - 1));
                list.forEach((item, i) => { if (item && typeof item === 'object') item.selected = (i === nextIndex); });
            }
        };
        const customApiProviderOption = {
            id: 'custom',
            name: '自定义',
            apiUrl: '',
            icon: ''
        };
        const normalizeCustomApiProviders = () => {
            if (!Array.isArray(settings.customApiProviders)) settings.customApiProviders = [];
            const validProviders = [];
            settings.customApiProviders.forEach((provider, index) => {
                if (!provider || typeof provider !== 'object') return;
                if (!provider.id) provider.id = 'custom-site-' + index;
                provider.name = String(provider.name || '').trim();
                provider.apiUrl = String(provider.apiUrl || '').trim();
                provider.icon = '';
                validProviders.push(provider);
            });
            return validProviders;
        };
        const customApiProviderOptions = reactive([customApiProviderOption, ...normalizeCustomApiProviders()]);
        const isCustomApiProviderId = (id) => customApiProviderOptions.some(provider => provider.id === id);
        const getCustomApiUrlValue = (id) => {
            const dynamic = normalizeCustomApiProviders().find(provider => provider.id === id);
            if (dynamic) return dynamic.apiUrl;
            return isCustomApiProviderId(id) ? (settings.customApiUrl || '') : '';
        };
        const setCustomApiUrlValue = (id, value) => {
            const dynamic = normalizeCustomApiProviders().find(provider => provider.id === id);
            if (dynamic) dynamic.apiUrl = String(value || '').trim();
            else if (isCustomApiProviderId(id)) settings.customApiUrl = String(value || '').trim();
        };
        const refreshCustomApiProviderOptions = () => {
            customApiProviderOptions.splice(0, customApiProviderOptions.length, customApiProviderOption, ...normalizeCustomApiProviders());
        };
        const createCustomApiProvider = () => {
            normalizeCustomApiProviders();
            const id = 'custom-api-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
            settings.customApiProviders.push({ id, name: '自定义站点 ' + (settings.customApiProviders.length + 1), apiUrl: '', icon: '' });
            if (!settings.apiProviderKeys || typeof settings.apiProviderKeys !== 'object' || Array.isArray(settings.apiProviderKeys)) settings.apiProviderKeys = {};
            settings.apiProviderKeys[id] = '';
            refreshCustomApiProviderOptions();
            saveData({ saveMemories: false, saveCharacters: false });
            return id;
        };
        const removeCustomApiProvider = (id) => {
            const index = normalizeCustomApiProviders().findIndex(provider => provider.id === id);
            if (index < 0) return;
            settings.customApiProviders.splice(index, 1);
            if (settings.apiProviderKeys) delete settings.apiProviderKeys[id];
            if (settings.apiProviderId === id) {
                settings.apiProviderId = DEFAULT_API_PROVIDER_ID;
                settings.apiUrl = DEFAULT_API_CONFIG.apiUrl;
                settings.apiKey = settings.apiProviderKeys[DEFAULT_API_PROVIDER_ID] || '';
            }
            refreshCustomApiProviderOptions();
            saveData({ saveMemories: false, saveCharacters: false });
        };
        const updateCustomApiProvider = (id, field, value) => {
            const provider = normalizeCustomApiProviders().find(item => item.id === id);
            if (!provider) return;
            provider[field] = String(value || '');
            if (field === 'apiUrl' && settings.apiProviderId === id) settings.apiUrl = provider.apiUrl;
            refreshCustomApiProviderOptions();
            saveData({ saveMemories: false, saveCharacters: false });
        };
        const updateCustomApiKey = (id, value) => {
            if (!settings.apiProviderKeys || typeof settings.apiProviderKeys !== 'object' || Array.isArray(settings.apiProviderKeys)) settings.apiProviderKeys = {};
            settings.apiProviderKeys[id] = String(value || '');
            saveData({ saveMemories: false, saveCharacters: false });
        };
        const normalizeApiProviderUrl = (url) => String(url || '').replace(/\/+$/, '').toLowerCase();
        const getApiProviderById = (id) => apiProviderOptions.find(provider => provider.id === id);
        const getApiProviderByUrl = (url) => {
            const currentUrl = normalizeApiProviderUrl(url);
            return apiProviderOptions.find(provider => normalizeApiProviderUrl(provider.apiUrl) === currentUrl);
        };
        const syncCurrentApiKeyToProvider = () => {
            const providerId = settings.apiProviderId;
            settings.apiProviderKeys[providerId] = settings.apiKey || '';
            if (isCustomApiProviderId(providerId)) {
                setCustomApiUrlValue(providerId, settings.apiUrl || '');
            }
        };
        const normalizeApiProviderSettings = (savedSettings = settings) => {
            if (!settings.apiProviderKeys || typeof settings.apiProviderKeys !== 'object' || Array.isArray(settings.apiProviderKeys)) {
                settings.apiProviderKeys = {};
            }
            // 将旧的当前自定义2配置并入唯一的自定义入口。
            if (settings.apiProviderId === 'custom2') {
                settings.apiProviderId = 'custom';
                settings.customApiUrl = savedSettings.customApiUrl2 || settings.apiUrl || '';
                settings.apiProviderKeys.custom = settings.apiKey || settings.apiProviderKeys.custom2 || '';
            }
            delete settings.apiProviderKeys.custom2;
            if (!settings.apiProviderModels || typeof settings.apiProviderModels !== 'object' || Array.isArray(settings.apiProviderModels)) {
                settings.apiProviderModels = {};
            }
            refreshCustomApiProviderOptions();
            [...apiProviderOptions, ...customApiProviderOptions].forEach(provider => {
                if (typeof settings.apiProviderKeys[provider.id] !== 'string') {
                    settings.apiProviderKeys[provider.id] = '';
                }
                if (!settings.apiProviderModels[provider.id]) {
                    settings.apiProviderModels[provider.id] = { qualityModel: '', balancedModel: '', fastModel: '', mode: 'quality' };
                }
            });

            let provider = getApiProviderById(settings.apiProviderId);
            if (!provider && !isCustomApiProviderId(settings.apiProviderId)) {
                provider = getApiProviderByUrl(settings.apiUrl);
                settings.apiProviderId = provider?.id || DEFAULT_API_PROVIDER_ID;
            }
            if (isCustomApiProviderId(settings.apiProviderId)) {
                if (!getCustomApiUrlValue(settings.apiProviderId) && settings.apiUrl) {
                    setCustomApiUrlValue(settings.apiProviderId, settings.apiUrl);
                }
                settings.apiUrl = getCustomApiUrlValue(settings.apiProviderId) || '';
            } else {
                provider = getApiProviderById(settings.apiProviderId) || getApiProviderById(DEFAULT_API_PROVIDER_ID);
                settings.apiProviderId = provider.id;
                settings.apiUrl = provider.apiUrl;
            }

            if (settings.apiKey && !settings.apiProviderKeys[settings.apiProviderId]) {
                settings.apiProviderKeys[settings.apiProviderId] = settings.apiKey;
            }
            settings.apiKey = settings.apiProviderKeys[settings.apiProviderId] || '';
        };
        const selectedApiProvider = computed(() => {
            if (isCustomApiProviderId(settings.apiProviderId)) return customApiProviderOption;
            const selectedProvider = getApiProviderById(settings.apiProviderId);
            if (selectedProvider) return selectedProvider;
            return getApiProviderByUrl(settings.apiUrl) || customApiProviderOption;
        });
        const isCustomApiProvider = computed(() => isCustomApiProviderId(selectedApiProvider.value.id));
        const selectApiProvider = (provider) => {
            // 切站前先把当前三个模型存回「旧站点」的槽位：否则下面 apiProviderId 一改，
            // 负责保存的 watcher 会拿新站点 id 去写，把旧站点的模型覆盖进新站点的记忆 ——
            // 这正是「不管切到哪个 API 站，模型栏位都是那三个」的根因。
            // 2.8.57：官网删掉了 selectedApiProviderId 这个镜像 ref，这里不再写它。
            saveCurrentProviderModelMemory();
            syncCurrentApiKeyToProvider();
            settings.apiProviderId = provider.id;
            settings.apiUrl = isCustomApiProviderId(provider.id)
                ? getCustomApiUrlValue(provider.id) || ''
                : provider.apiUrl;
            settings.apiKey = settings.apiProviderKeys[provider.id] || '';
            applyProviderModelMemory(provider.id);
            showApiProviderSelector.value = false;
        };
        normalizeApiProviderSettings();

        watch(() => settings.apiKey, (newKey) => {
            const providerId = settings.apiProviderId;
            if (settings.apiProviderKeys[providerId] !== (newKey || '')) {
                settings.apiProviderKeys[providerId] = newKey || '';
            }
        });

        watch(() => settings.apiUrl, (newUrl) => {
            if (isCustomApiProviderId(settings.apiProviderId)) {
                setCustomApiUrlValue(settings.apiProviderId, newUrl || '');
            }
        });

        const syncSettingsToGenerator = () => {
            const iframe = document.querySelector('iframe[src*="character"]');
            if (iframe && iframe.contentWindow) {
                try {
                    const syncData = {
                        type: 'SYNC_SETTINGS',
                        settings: JSON.parse(JSON.stringify(settings))
                    };
                    iframe.contentWindow.postMessage(syncData, '*');
                } catch (e) {
                    console.error('Settings sync failed:', e);
                }
            }
        };

        let workshopImportPending = false;
        let squareImportPending = false;
        const getSquareFrame = () => document.querySelector(`iframe[src="${squareUrl.value}"]`);
        // The plaza follows RP-Hub's day/night theme while it is embedded here.
        const sendSquareTheme = (target = getSquareFrame()?.contentWindow) => target?.postMessage(
            { type: 'RPHUB_THEME', theme: document.documentElement.dataset.appTheme }, new URL(squareUrl.value).origin
        );
        window.addEventListener('rphub-theme-change', () => sendSquareTheme());
        // Each embedded page may only use its own message bridge.
        window.addEventListener('message', async (event) => {
            if (['RPH_FORUM_READY', 'RPH_FORUM_IMPORT_CARD', 'RPH_FORUM_THEME_REQUEST'].includes(event.data?.type)) {
                const iframe = getSquareFrame();
                if (!iframe || event.source !== iframe.contentWindow || event.origin !== new URL(squareUrl.value).origin) return;
                if (event.data.type === 'RPH_FORUM_THEME_REQUEST') {
                    sendSquareTheme(event.source);
                    return;
                }
                if (event.data.type === 'RPH_FORUM_READY') {
                    event.source.postMessage({ type: 'RPHUB_IMPORT_READY' }, event.origin);
                    return;
                }
                const { requestId, buffer } = event.data;
                if (typeof requestId !== 'string' || !/^[\w-]{1,80}$/.test(requestId)) return;
                const reply = (result) => event.source.postMessage({ type: 'RPHUB_IMPORT_RESULT', requestId, ...result }, event.origin);
                if (squareImportPending) {
                    reply({ error: '上一张角色卡仍在导入，请稍后再试' });
                    return;
                }
                squareImportPending = true;
                try {
                    if (!(buffer instanceof ArrayBuffer) || !buffer.byteLength || buffer.byteLength > 100 * 1024 * 1024) {
                        throw new Error('角色卡文件无效或超过 100 MB');
                    }
                    const { data } = cardUtils.parsePngCharacterData(buffer);
                    const source = data?.data || data;
                    if (!source || typeof source.name !== 'string' || !source.name.trim()) throw new Error('角色卡缺少有效名称');
                    const avatar = await cardUtils.blobToDataUrl(new Blob([buffer], { type: 'image/png' }));
                    const char = await importCharacterData(data, avatar, { activate: false });
                    try {
                        const index = characters.value.findIndex(item => item.uuid === char.uuid);
                        if (!await selectCharacter(index, false, { silent: true })) throw new Error('切换未完成');
                    } catch (error) {
                        console.error('Square character switch failed:', error);
                        throw new Error('角色卡已导入，但自动切换未完成，请在角色库手动选择，无需重复导入');
                    }
                    reply({ name: char.name });
                } catch (error) {
                    console.error('Square import failed:', error);
                    reply({ error: error.message || '导入失败，请重试' });
                } finally {
                    squareImportPending = false;
                }
                return;
            }

            if (event.data && event.data.type === 'WORKSHOP_READY') {
                if (event.source !== document.querySelector('iframe[src*="character/index.html"]')?.contentWindow) return;
                syncSettingsToGenerator();
            }

            if (event.data?.type === 'WORKSHOP_IMPORT_AND_PLAY') {
                const iframe = document.querySelector('iframe[src*="character/index.html"]');
                if (!iframe || event.source !== iframe.contentWindow || workshopImportPending) return;
                workshopImportPending = true;
                try {
                    if (!event.data.card?.data || typeof event.data.card.data.name !== 'string' || !event.data.card.data.name.trim()) {
                        throw new Error('角色卡缺少名称，请先完善角色卡');
                    }
                    const char = await importCharacterData(event.data.card, event.data.avatar, { askImageGeneration: false });
                    if (currentCharacter.value?.uuid !== char.uuid || currentView.value !== 'chat') {
                        throw new Error('角色卡已导入，暂时未能进入对话，请从角色卡管理中打开');
                    }
                } catch (error) {
                    console.error('Workshop import failed:', error);
                    event.source.postMessage({ type: 'WORKSHOP_IMPORT_RESULT', error: error.message || '导入失败，请重试' }, '*');
                    showToast(error.message || '导入失败，请重试', 'error');
                } finally {
                    workshopImportPending = false;
                }
                return;
            }

            if (event.data?.type === 'REQUEST_RPHUB_API_SETTINGS') {
                const iframe = document.querySelector('iframe[src*="novel/index.html"]');
                if (event.source !== iframe?.contentWindow) return;

                const providers = [
                    ...apiProviderOptions.map(({ id, name, apiUrl, icon }) => ({ id, name, apiUrl, icon })),
                    ...customApiProviderOptions.map(({ id, name }) => ({
                        id,
                        name,
                        apiUrl: getCustomApiUrlValue(id) || '',
                        icon: ''
                    }))
                ];
                event.source.postMessage({
                    type: 'RPHUB_API_SETTINGS',
                    requestId: event.data.requestId,
                    settings: {
                        apiProviderId: settings.apiProviderId,
                        apiProviderKeys: JSON.parse(JSON.stringify(settings.apiProviderKeys)),
                        apiKey: settings.apiKey,
                        customApiUrl: settings.customApiUrl
                    },
                    providers
                }, '*');
            }
        });

        watch(() => [settings.apiUrl, settings.apiKey, settings.model], ([, , newModel]) => {
            if (newModel !== settings.fastModel && newModel !== settings.balancedModel) {
                settings.qualityModel = newModel; // 确保 qualityModel 也同步更新
            }



            // Update currentModelMode based on the actual selected model
            if (newModel === settings.fastModel) {
                currentModelMode.value = 'fast';
            } else if (newModel === settings.balancedModel) {
                currentModelMode.value = 'balanced';
            } else {
                currentModelMode.value = 'quality';
            }

            syncSettingsToGenerator();
        });

        // Watch image gen and model settings for sync
        watch(() => [settings.imageGenKey, settings.imageModel, settings.imageStyle, settings.customImageArtists, settings.imageGenCount, settings.qualityModel, settings.balancedModel, settings.fastModel, settings.uiTemplateModel], () => {
            syncSettingsToGenerator();
        });

        const currentModelMode = ref('quality');
        // 三个模型栏位按 API 站各自记忆 —— 载入指定站点的模型记忆。
        // 从未用过的站点没有记忆，此时保留当前模型：首次使用先继承，用户一改就记到该站点。
        const applyProviderModelMemory = (providerId) => {
            const saved = settings.apiProviderModels ? settings.apiProviderModels[providerId] : null;
            if (!saved) return;
            const quality = saved.qualityModel || '';
            const balanced = saved.balancedModel || '';
            const fast = saved.fastModel || '';
            if (!quality && !balanced && !fast) return;
            settings.qualityModel = quality;
            settings.balancedModel = balanced;
            settings.fastModel = fast;
            const mode = ['quality', 'balanced', 'fast'].includes(saved.mode) ? saved.mode : 'quality';
            currentModelMode.value = mode;
            // settings.model 是「当前生效的模型」，必须跟着一起切，否则上面那个
            // [apiUrl, apiKey, model] 的 watcher 会把 qualityModel 又改回旧模型。
            const activeModel = { quality, balanced, fast }[mode] || quality || balanced || fast;
            if (activeModel) settings.model = activeModel;
            applyModelSlotTemperature(mode);
        };
        const saveCurrentProviderModelMemory = () => {
            const providerId = settings.apiProviderId || DEFAULT_API_PROVIDER_ID;
            if (!settings.apiProviderModels || typeof settings.apiProviderModels !== 'object' || Array.isArray(settings.apiProviderModels)) {
                settings.apiProviderModels = {};
            }
            settings.apiProviderModels[providerId] = {
                qualityModel: settings.qualityModel || '',
                balancedModel: settings.balancedModel || '',
                fastModel: settings.fastModel || '',
                mode: currentModelMode.value || 'quality'
            };
        };
        window.__rphubSaveProviderModelMemory = saveCurrentProviderModelMemory;
        saveCurrentProviderModelMemory();
        watch(() => [settings.apiProviderId, settings.qualityModel, settings.balancedModel, settings.fastModel, currentModelMode.value], saveCurrentProviderModelMemory);
        const rphubEnterNewline = ref(false);
        try { rphubEnterNewline.value = localStorage.getItem('rphub-enter-newline') === '1'; } catch (error) {}
        const toggleRphubEnterNewline = () => {
            rphubEnterNewline.value = !rphubEnterNewline.value;
            try { localStorage.setItem('rphub-enter-newline', rphubEnterNewline.value ? '1' : '0'); } catch (error) {}
            showToast(rphubEnterNewline.value ? '已切换为 Enter 换行' : '已切换为 Enter 发送', 'success');
        };
        // 2.8.21：官方把输入行里的 .relative.mr-2 容器删掉了，原先给切换按钮那条补丁
        // （index.html #17）锚点失配被列入豁免 ⇒ 按钮消失。现改由 assets/sakura-features.js
        // 往官方工具栏注入按钮，这里只把同一份状态暴露出去，避免两套 state 各说各话
        // （持久化仍在 localStorage 'rphub-enter-newline'）。
        try {
            window.RPHubEnterToggle = {
                get: () => rphubEnterNewline.value === true,
                toggle: () => toggleRphubEnterNewline()
            };
        } catch (error) {}
        const showApiQuickSelector = ref(false);
        const quickApiProviders = computed(() => [
            ...apiProviderOptions.filter(provider => (
                provider.id === settings.apiProviderId || String(settings.apiProviderKeys?.[provider.id] || '').trim()
            )),
            ...customApiProviderOptions
        ]);
        const toggleApiQuickSelector = () => { showApiQuickSelector.value = !showApiQuickSelector.value; };
        const selectQuickApiProvider = (provider) => {
            if (!provider) return;
            selectApiProvider(provider);
            showApiQuickSelector.value = false;
            showToast('已切换 API 站：' + (provider.name || provider.id), 'success');
        };
        const isGeminiModel = computed(() => /gemini/i.test(String(settings.model || '')));
        const isTruncationEnabled = computed(() => isGeminiModel.value && settings.preventTruncation);
        const modelMode = computed({
            get: () => {
                return currentModelMode.value;
            },
            set: (val) => {
                currentModelMode.value = val;
                if (val === 'fast') {
                    settings.model = settings.fastModel;
                } else if (val === 'balanced') {
                    settings.model = settings.balancedModel;
                } else {
                    settings.model = settings.qualityModel;
                }
                showModelSelector.value = false;
                showChatModelSelector.value = false;
            }
        });
        const reasoningEffortOptions = [
            { value: 'none', label: '关闭' },
            { value: 'low', label: '低（Low）' },
            { value: 'medium', label: '中（Medium）' },
            { value: 'high', label: '高（High）' },
            { value: 'max', label: '最高（Max）' },
            { value: '', label: '默认' }
        ];
        const reasoningEffortSlider = computed({
            get: () => Math.max(0, reasoningEffortOptions.findIndex(option => option.value === settings.reasoningEffort)),
            set: index => { settings.reasoningEffort = reasoningEffortOptions[index]?.value || ''; }
        });
        const reasoningEffortLabel = computed(() => reasoningEffortOptions[reasoningEffortSlider.value].label);
        const chatModelSlots = computed(() => [
            { mode: 'quality', model: settings.qualityModel },
            { mode: 'balanced', model: settings.balancedModel },
            { mode: 'fast', model: settings.fastModel }
        ]);
        const readSlotTemperatures = () => {
            const source = settings.slotTemperatures && typeof settings.slotTemperatures === 'object' ? settings.slotTemperatures : {};
            const fallback = Number.isFinite(Number(settings.temperature)) ? Number(settings.temperature) : 1;
            const quality = Number.isFinite(Number(source.quality)) ? Number(source.quality) : fallback;
            const balanced = Number.isFinite(Number(source.balanced)) ? Number(source.balanced) : fallback;
            const fast = Number.isFinite(Number(source.fast)) ? Number(source.fast) : fallback;
            return { quality, balanced, fast };
        };
        const ensureSlotTemperatures = () => {
            const source = settings.slotTemperatures;
            const values = readSlotTemperatures();
            if (!source || source.quality !== values.quality || source.balanced !== values.balanced || source.fast !== values.fast) {
                settings.slotTemperatures = values;
            }
            return settings.slotTemperatures;
        };
        const applyModelSlotTemperature = (mode) => {
            const values = ensureSlotTemperatures();
            settings.temperature = Number(values[mode] ?? values.quality ?? 1);
        };
        const slotTemperature = computed({
            get: () => Number(readSlotTemperatures()[currentModelMode.value] ?? 1),
            set: value => {
                const next = Math.max(0, Math.min(1, Number(value)));
                if (!Number.isFinite(next)) return;
                const values = ensureSlotTemperatures();
                values[currentModelMode.value] = next;
                settings.slotTemperatures = { ...values };
                settings.temperature = next;
            }
        });
        const selectChatModelSlot = (slot) => {
            if (!slot?.model) return;
            currentModelMode.value = slot.mode;
            settings.model = slot.model;
            applyModelSlotTemperature(slot.mode);
        };


        const characters = ref([]);
        const showAddCharacterMenu = ref(false);
        const currentCharacterIndex = ref(-1);
        const switchingCharacterIndex = ref(-1);

        const chatHistory = ref([]);
        // 编辑任意消息时收起底部输入栏：键盘弹出会把输入栏顶上去，压住编辑区的保存/取消按钮
        const isAnyMessageEditing = computed(() => chatHistory.value.some(m => m && m.isEditing_Message));
        const CHAT_RENDER_INITIAL_LIMIT = 20;
        const CHAT_RENDER_DEFAULT_LIMIT = 100;
        const CHAT_RENDER_MIN_LIMIT = 20;
        const CHAT_RENDER_MAX_LIMIT = 500;
        const UI_TEMPLATE_KEEP_DEFAULT_FLOORS = 3;
        const UI_TEMPLATE_KEEP_MIN_FLOORS = 1;
        const UI_TEMPLATE_KEEP_MAX_FLOORS = 20;
        const normalizeChatRenderMessageLimit = (value) => {
            const number = Number(value);
            if (!Number.isFinite(number)) return CHAT_RENDER_DEFAULT_LIMIT;
            return Math.max(CHAT_RENDER_MIN_LIMIT, Math.min(CHAT_RENDER_MAX_LIMIT, Math.round(number / 10) * 10));
        };
        const normalizeUiTemplateKeepFloors = (value) => {
            const number = Number(value);
            if (!Number.isFinite(number)) return UI_TEMPLATE_KEEP_DEFAULT_FLOORS;
            return Math.max(UI_TEMPLATE_KEEP_MIN_FLOORS, Math.min(UI_TEMPLATE_KEEP_MAX_FLOORS, Math.round(number)));
        };
        const getChatRenderMessageLimit = () => normalizeChatRenderMessageLimit(settings.chatRenderMessageLimit);
        const getUiTemplateKeepFloors = () => normalizeUiTemplateKeepFloors(settings.uiTemplateKeepFloors);
        const getMobileUiTemplateRetention = (history = []) => {
            const snapshot = buildConversationTurnSnapshot(Array.isArray(history) ? history : []);
            const turns = Array.isArray(snapshot?.turns) ? snapshot.turns : [];
            const firstKeptTurn = Math.max(1, turns.length - getUiTemplateKeepFloors() + 1);
            const keptIndexes = new Set();
            turns.forEach(turnInfo => {
                if (Number(turnInfo?.turn) < firstKeptTurn) return;
                (turnInfo?.sourceIndexes || []).forEach(index => keptIndexes.add(index));
            });
            return { firstKeptTurn, keptIndexes };
        };
        const buildMobileUiLazyBlock = (index, placement) => (
            '<div class="rphub-ui-lazy" data-rphub-ui-lazy="' + index + '" data-rphub-ui-placement="' + placement + '">' +
            '<div class="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-center">UI 模板已延迟，滚动到此处加载</div>' +
            '</div>'
        );
        const CHAT_RENDER_BATCH_SIZE = 10;
        const chatRenderLimit = ref(CHAT_RENDER_INITIAL_LIMIT);
        let isLoadingEarlierChatMessages = false;
        let isChatTopUnlockArmed = true;
        const lastActiveCharacterId = ref(null); // For persistence
        function hasActiveToolContinuationWork() {
            return !!(activeToolContinuationPending.value || (
                activeToolContinuationMessageId.value
                && isGenerating.value
            ));
        }

        const hasActiveToolInlineWork = computed(() => {
            if (activeToolHandoffPending.value || hasActiveToolContinuationWork() || activeToolQueueRunning.value) return true;
            if (!isGenerating.value) return false;
            return chatHistory.value.some(msg => (
                msg?.role === 'assistant'
                && Array.isArray(msg.toolCalls)
                && msg.toolCalls.some(toolCall => ['receiving', 'queued', 'running'].includes(toolCall?.status))
            ));
        });
        const isConversationBusy = computed(() => isGenerating.value || hasActiveToolInlineWork.value);

        const presets = ref([]);
        const presetLibrary = window.RPPresetLibrary;
        const presetGroupNames = ref([]);
        const activePresetGroupName = ref(null);
        const showPresetGroupForm = ref(false);
        const presetGroupDraft = ref('');
        const presetGroupEditing = ref(false);
        const presetGroupError = ref('');
        // 抗截断只临时停用 COT，不改写用户保存的开关状态。
        const isPresetEnabled = preset => preset.enabled !== false
            && (preset.name !== 'COT' || !isTruncationEnabled.value);
        const isStoryPanelsEnabled = computed(() => presets.value.some(preset => preset.name === BUILTIN_PRESETS.storyPanels.name
            && preset.enabled !== false && String(preset.content || '').trim()));
        const normalizePresetRole = (role) => (
            ['system', 'user', 'assistant'].includes(role) ? role : 'system'
        );
        const normalizePresetGroup = presetLibrary.groupName;
        const normalizePreset = (preset = {}) => ({
            ...preset,
            name: preset.name || 'New Preset',
            content: String(preset.content || ''),
            enabled: preset.enabled !== false,
            group: presetLibrary.groupOf(preset),
            role: normalizePresetRole(preset.role || preset.presetRole || preset.type)
        });
        const presetGroups = computed(() => {
            const groups = new Map(presetLibrary.names(presets.value, presetGroupNames.value)
                .map(name => [name, { key: name, label: name, items: [] }]));
            presets.value.forEach((preset, index) => {
                if (preset.name === '第二人称' || preset.name === '第三人称') return;
                groups.get(presetLibrary.groupOf(preset)).items.push({ index, preset });
            });
            return [...groups.values()];
        });
        const activePresetGroup = computed(() => presetGroups.value.find(group => group.key === activePresetGroupName.value));
        const visiblePresetGroups = computed(() => activePresetGroup.value ? [activePresetGroup.value] : []);
        const openPresetGroup = name => {
            activePresetGroupName.value = name;
            isPresetBatchManaging.value = false;
            selectedPresetIndices.value = [];
            showPresetGroupForm.value = false;
        };
        const openPresetGroupForm = (editing = false) => {
            presetGroupEditing.value = editing;
            presetGroupDraft.value = editing ? activePresetGroupName.value : '';
            presetGroupError.value = '';
            showPresetGroupForm.value = true;
            nextTick(() => document.getElementById('preset-group-name')?.focus());
        };
        const savePresetGroup = () => {
            const name = normalizePresetGroup(presetGroupDraft.value);
            const previous = presetGroupEditing.value ? activePresetGroupName.value : null;
            if (!name) { presetGroupError.value = '请填写分组名称'; return; }
            if (name !== previous && presetGroups.value.some(group => group.key === name)) {
                presetGroupError.value = '已有同名分组，请换一个名称';
                return;
            }
            if (previous) {
                presets.value.forEach(preset => {
                    if (presetLibrary.groupOf(preset) === previous) preset.group = name;
                });
                presetGroupNames.value = presetGroupNames.value.filter(item => item !== previous);
            }
            presetGroupNames.value = [...new Set([...presetGroupNames.value, name])];
            openPresetGroup(name);
            saveData();
        };
        // 同组一键开关：COT 在抗截断开启时被强制停用，不参与批量开关
        const presetGroupToggleableItems = (group) => (group && group.items ? group.items : [])
            .filter(({ preset }) => !(preset && preset.name === 'COT' && isTruncationEnabled.value));
        const isPresetGroupAllEnabled = (group) => {
            const items = presetGroupToggleableItems(group);
            return items.length > 0 && items.every(({ preset }) => preset.enabled !== false);
        };
        const togglePresetGroupEnabled = (group) => {
            const items = presetGroupToggleableItems(group);
            if (!items.length) return;
            const next = !isPresetGroupAllEnabled(group);
            items.forEach(({ preset }) => { preset.enabled = next; });
            saveData();
        };
        // --- 预设批量管理模式（方案 A）---
        const isPresetBatchManaging = ref(false);
        const selectedPresetIndices = ref([]);
        const showPresetBatchMoveModal = ref(false);
        const presetBatchTargetGroup = ref('');

        const togglePresetBatchMode = () => {
            isPresetBatchManaging.value = !isPresetBatchManaging.value;
            if (!isPresetBatchManaging.value) {
                selectedPresetIndices.value = [];
            }
        };

        const toggleSelectPreset = (index) => {
            const idx = Number(index);
            const pos = selectedPresetIndices.value.indexOf(idx);
            if (pos >= 0) {
                selectedPresetIndices.value.splice(pos, 1);
            } else {
                selectedPresetIndices.value.push(idx);
            }
        };

        const isPresetSelected = (index) => selectedPresetIndices.value.includes(Number(index));

        const getGroupToggleableIndices = (group) => (group && group.items ? group.items : [])
            .filter(({ preset }) => preset && preset.name !== '第二人称' && preset.name !== '第三人称')
            .map(({ index }) => Number(index));

        const isPresetGroupAllSelected = (group) => {
            const indices = getGroupToggleableIndices(group);
            return indices.length > 0 && indices.every(idx => selectedPresetIndices.value.includes(idx));
        };

        const toggleSelectGroupPresets = (group) => {
            const indices = getGroupToggleableIndices(group);
            if (!indices.length) return;
            if (isPresetGroupAllSelected(group)) {
                selectedPresetIndices.value = selectedPresetIndices.value.filter(idx => !indices.includes(idx));
            } else {
                const set = new Set([...selectedPresetIndices.value, ...indices]);
                selectedPresetIndices.value = Array.from(set);
            }
        };

        const selectAllPresets = () => {
            selectedPresetIndices.value = visiblePresetGroups.value.flatMap(getGroupToggleableIndices);
        };

        const clearSelectedPresets = () => {
            selectedPresetIndices.value = [];
        };

        const openPresetBatchMoveModal = () => {
            if (!selectedPresetIndices.value.length) return;
            presetBatchTargetGroup.value = activePresetGroupName.value || presetLibrary.defaultGroup;
            showPresetBatchMoveModal.value = true;
        };

        const applyPresetBatchMove = () => {
            const count = selectedPresetIndices.value.length;
            if (!count) return;
            const targetGroup = normalizePresetGroup(presetBatchTargetGroup.value) || presetLibrary.defaultGroup;
            presetGroupNames.value = [...new Set([...presetGroupNames.value, targetGroup])];
            selectedPresetIndices.value.forEach(index => {
                const preset = presets.value[index];
                if (preset) {
                    preset.group = targetGroup;
                }
            });
            saveData();
            showPresetBatchMoveModal.value = false;
            selectedPresetIndices.value = [];
            showToast('已将 ' + count + ' 项预设移动到「' + targetGroup + '」', 'success');
        };

        const batchTogglePresetsEnabled = (enable) => {
            const count = selectedPresetIndices.value.length;
            if (!count) return;
            selectedPresetIndices.value.forEach(index => {
                const preset = presets.value[index];
                if (preset) {
                    if (preset.name === 'COT' && isTruncationEnabled.value && enable) return;
                    preset.enabled = enable;
                }
            });
            saveData();
            showToast('已批量' + (enable ? '开启 ' : '关闭 ') + count + ' 项预设', 'success');
        };
        // --- 2.8.87 预设删除：多选批量删除 / 整组删除 ---
        // 下标取自 presets 原始数组。倒序 splice，避免删掉前面一条后后面的下标整体前移，
        // 把「下一条」当成「这一条」删掉。第二人称/第三人称不在任何分组里，也一并跳过。
        const collectPresetDeletableIndices = candidates => (Array.isArray(candidates) ? candidates : [])
            .map(index => Number(index))
            .filter(index => Number.isInteger(index) && index >= 0 && index < presets.value.length)
            .filter(index => {
                const preset = presets.value[index];
                return preset && preset.name !== '第二人称' && preset.name !== '第三人称';
            });

        const removePresetsAt = indices => {
            const unique = Array.from(new Set(indices)).sort((a, b) => b - a);
            unique.forEach(index => presets.value.splice(index, 1));
            // 删完必须清空选中：这些下标已经指向别的条目了。
            selectedPresetIndices.value = [];
            return unique.length;
        };

        const batchDeletePresets = () => {
            const indices = collectPresetDeletableIndices(selectedPresetIndices.value);
            if (!indices.length) return;
            confirmAction(`确定要删除选中的 ${indices.length} 项预设吗？此操作无法撤销。`, () => {
                const removed = removePresetsAt(indices);
                saveData();
                showToast('已删除 ' + removed + ' 项预设', 'success');
            });
        };

        const deletePresetGroup = group => {
            const indices = collectPresetDeletableIndices(
                (group && group.items ? group.items : []).map(entry => entry && entry.index)
            );
            if (!indices.length) return;
            const label = (group && group.label) || '该分组';
            confirmAction(`确定要删除「${label}」分组的 ${indices.length} 项预设吗？此操作无法撤销。`, () => {
                const removed = removePresetsAt(indices);
                saveData();
                showToast(`已删除「${label}」分组的 ${removed} 项预设`, 'success');
            });
        };

        // [rphub 2.7.90] 上游 2.7.90 顶层解构已加兜底，但调用点仍可能传入 undefined
        //   （BUILTIN_PRESETS 退化成 {} 后，BUILTIN_PRESETS.deUserCentric 仍是 undefined）。
        // 原签名 `= ({ name, content, ... })` 对 undefined 解构会抛
        //   TypeError: Cannot destructure property 'name' of 'undefined'。
        // 改成先接参数、判空、再解构：缺预设时静默跳过，不打断首屏渲染。
        const syncBuiltinPreset = (__rpPreset) => {
            if (!__rpPreset) return;
            const {
                name,
                content,
                aliases = [],
                role,
                enabled = true,
                before,
                after
            } = __rpPreset;
            const names = new Set([name, ...aliases]);
            const existing = presets.value.find(preset => names.has(preset?.name));
            if (existing) return existing;
            const preset = normalizePreset({ name, content, role, enabled });
            const beforeIndex = before ? presets.value.findIndex(item => item?.name === before) : -1;
            const afterIndex = after ? presets.value.findIndex(item => item?.name === after) : -1;
            const index = beforeIndex !== -1 ? beforeIndex : afterIndex !== -1 ? afterIndex + 1 : presets.value.length;
            presets.value.splice(index, 0, preset);
            return preset;
        };
        const getPresetRoleLabel = (preset) => {
            const role = normalizePresetRole(preset?.role);
            return presetRoleOptions.find(option => option.value === role)?.label || '系统提示词';
        };
        const getPresetRoleDisplayLabel = (preset) => {
            const role = normalizePresetRole(preset?.role);
            return presetRoleDisplayLabels[role] || '系统';
        };
        const getPresetRoleBadgeClass = (preset) => {
            return `meta-badge--${normalizePresetRole(preset?.role)}`;
        };
        const blockedStyleSentencePattern = /[^。！？!?\n]*(?:不容置疑|(?:不易|难以)(?:察觉|觉察)|(?:微|几)不可察|一抹|弧度|生理性|微微泛|因为用力|像在|风箱|手术刀|上扬|带着一种|语气很平|声音很平|(?:指尖|指节|指关节)[^。！？!?\n]*(?:发白|泛白)|像(?:是)?[^。！？!?\n]*?[，,]\s*又像(?:是)?|不是[^。！？!?\n]*?(?:而是|就是|[，,]\s*(?:是|(?:更|倒|反倒)?像是)))[^。！？!?\n]*(?:[。！？!?]+[”’」』】）)]*(?:\*\*|__)?)?/g;
        const standaloneWordCountSentencePattern = /(^|[。！？!?\n]+[”’」』】）)]*)[ \t]*(?:\*\*|__)?(?:\d+|[零〇一二两三四五六七八九十百千万]+)个字[^。！？!?\n]*(?:[。！？!?]+[”’」』】）)]*(?:\*\*|__)?)?/gm;
        const paleFingerClausePattern = /(?:^|[，,；;])[^，,。！？!?；;\n]*(?:指尖|指节|指关节)[^，,。！？!?；;\n]*(?:发白|泛白)[^，,。！？!?；;\n]*(?=$|[，,。！？!?；;\n])/gm;
        const blockedStyleClausePattern = /(?:^|[，,；;])[^，,。！？!?；;\n*_]*(?:微微泛|因为用力|像在|风箱|手术刀|上扬|带着一种)[^，,。！？!?；;\n*_]*(?=(?:\*\*|__)?[ \t]*(?:$|[，,。！？!?；;\n]))/gm;
        const blockedStyleWordPattern = /极其/g;
        const quotedDialoguePattern = /(“[\s\S]*?”|『[\s\S]*?』|"[\s\S]*?")/g;
        const standaloneRenderedContentPattern = /^(?:```|<!doctype\b|<\?xml\b|<html\b|<(?:head|body|style|script|template|svg|canvas|iframe|div|section|article|aside|header|footer|main|nav|form|table|ul|ol|pre|p|img)\b)/i;
        const isStandaloneRenderedContent = (text) => {
            let content = String(text || '').trimStart();
            // Skip each leading comment once; repeated regex matches can backtrack exponentially.
            while (content.startsWith('<!--')) {
                const end = content.indexOf('-->', 4);
                if (end < 0) return false;
                content = content.slice(end + 3).trimStart();
            }
            return standaloneRenderedContentPattern.test(content);
        };
        const loggedBlockedStyleFragments = new Set();
        const openStyleFilterMessageKey = ref('');
        const getStyleFilterMessageKey = (message, index) => String(message?.id || `message-${index}`);
        const isStyleFilterDetailsOpen = (message, index) => (
            openStyleFilterMessageKey.value === getStyleFilterMessageKey(message, index)
        );
        const toggleStyleFilterDetails = (message, index) => {
            const key = getStyleFilterMessageKey(message, index);
            openStyleFilterMessageKey.value = openStyleFilterMessageKey.value === key ? '' : key;
        };
        const normalizeStyleFilterHit = fragment => String(fragment || '')
            .trim()
            .replace(/^[，,；;]\s*/, '')
            .replace(/^(?:\*\*|__)/, '')
            .replace(/(?:\*\*|__)$/, '')
            .trim();
        const styleFilterHighlightPattern = /(?:不容置疑|(?:不易|难以)(?:察觉|觉察)|(?:微|几)不可察|一抹|弧度|生理性|微微泛|因为用力|像在|风箱|手术刀|上扬|带着一种|语气很平|声音很平|(?:\d+|[零〇一二两三四五六七八九十百千万]+)个字|指尖|指节|指关节|发白|泛白|不是|而是|就是|又像(?:是)?|(?:更|倒|反倒)?像是|极其)/g;
        const getStyleFilterHitSegments = fragment => {
            const text = String(fragment || '');
            const segments = [];
            let lastIndex = 0;
            for (const match of text.matchAll(styleFilterHighlightPattern)) {
                if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index), matched: false });
                segments.push({ text: match[0], matched: true });
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), matched: false });
            return segments.length ? segments : [{ text, matched: false }];
        };
        const filterBlockedStyleText = (text, { log = false, collect = null } = {}) => {
            const source = String(text || '');
            if (!settings.styleFilterEnabled) return source;
            if (isStandaloneRenderedContent(source)) return source;
            const removedFragments = [];
            const updateBlock = findUiTemplateUpdateBlock(source);
            const filterEnd = updateBlock?.index ?? source.length;
            const filtered = cardUtils.transformUnprotectedText(source.slice(0, filterEnd), part => part
                .split(quotedDialoguePattern)
                .map((fragment, index) => index % 2 ? fragment : fragment
                    .replace(standaloneWordCountSentencePattern, (match, prefix = '') => {
                        removedFragments.push(match.slice(prefix.length).trim());
                        return prefix;
                    })
                    .replace(blockedStyleSentencePattern, match => { removedFragments.push(match.trim()); return ''; })
                    .replace(paleFingerClausePattern, match => { removedFragments.push(match.trim()); return ''; })
                    .replace(blockedStyleClausePattern, match => { removedFragments.push(match.trim()); return ''; })
                    .replace(blockedStyleWordPattern, match => { removedFragments.push(match); return ''; })
                    .replace(/^[ \t]*[，,；;]+/gm, '')
                    .replace(/[，,；;]{2,}/g, marks => marks.charAt(marks.length - 1))
                    .replace(/[，,；;]+([。！？!?])/g, '$1')
                    .replace(/[ \t]+\n/g, '\n')
                    .replace(/\n{3,}/g, '\n\n'))
                .join(''));
            if (Array.isArray(collect)) {
                collect.push(...removedFragments.map(normalizeStyleFilterHit).filter(Boolean));
            }
            if (log) {
                const newFragments = removedFragments.filter(fragment => fragment && !loggedBlockedStyleFragments.has(fragment));
                newFragments.forEach(fragment => loggedBlockedStyleFragments.add(fragment));
                if (newFragments.length) console.info(`[文风过滤] 已过滤 ${newFragments.length} 处`, newFragments);
            }
            return filtered + source.slice(filterEnd);
        };
        // 历史回复的文风过滤结果按原文缓存，长对话每次组装上下文不必全部重跑；开关变化时清空。
        const styleFilteredContentCache = new Map();
        watch(() => settings.styleFilterEnabled, () => styleFilteredContentCache.clear());
        const getStyleFilteredContent = (content) => {
            if (styleFilteredContentCache.has(content)) return styleFilteredContentCache.get(content);
            const filtered = filterBlockedStyleText(content);
            styleFilteredContentCache.set(content, filtered);
            if (styleFilteredContentCache.size > 2000) styleFilteredContentCache.delete(styleFilteredContentCache.keys().next().value);
            return filtered;
        };
        const getPostprocessedChatMessages = (messages = chatHistory.value, options = {}) => (
            postprocessChatHistory(messages, options).map(message => message.role === 'assistant'
                ? { ...message, content: getStyleFilteredContent(message.content) }
                : message)
        );
        const buildConversationTurnSnapshot = (messages = chatHistory.value, options = {}) => (
            createConversationTurnSnapshot(messages, options)
        );

        const getConversationTurnAtIndex = (index) => {
            return getConversationTurnAtIndexFromSnapshot(buildConversationTurnSnapshot(), index);
        };

        const getLatestCompleteConversationTurn = () => {
            const snapshot = buildConversationTurnSnapshot();
            return snapshot.turns[snapshot.turns.length - 1] || null;
        };

        const latestDeletableMessageIndexes = computed(() => {
            let latestUserIndex = -1;
            for (let index = chatHistory.value.length - 1; index >= 0; index--) {
                if (chatHistory.value[index]?.role === 'user') {
                    latestUserIndex = index;
                    break;
                }
            }
            if (latestUserIndex < 0) return new Set();
            const indexes = new Set([latestUserIndex]);
            for (let index = latestUserIndex + 1; index < chatHistory.value.length; index++) {
                if (['assistant', 'system'].includes(chatHistory.value[index]?.role)) indexes.add(index);
            }
            return indexes;
        });
        const canDeleteMessage = (index) => latestDeletableMessageIndexes.value.has(index);

        const regexScripts = ref([]);
        const globalRegexScripts = ref([]);
        const LEGACY_USER_REGEX_NAME = 'Auto Replace {{user}}';
        const isLegacyUserRegex = (script) => (script?.name || script?.scriptName) === LEGACY_USER_REGEX_NAME;
        const removeLegacyUserRegex = () => {
            regexScripts.value = regexScripts.value.filter(script => !isLegacyUserRegex(script));
            globalRegexScripts.value = globalRegexScripts.value.filter(script => !isLegacyUserRegex(script));
            characters.value.forEach(character => {
                if (Array.isArray(character.regexScripts)) {
                    character.regexScripts = character.regexScripts.filter(script => !isLegacyUserRegex(script));
                }
            });
        };
        const globalWorldInfo = ref([]);
        const worldInfo = ref([]);
        const worldInfoLimit = ref(100);
        const worldInfoViewport = ref(null);
        const worldInfoScrolled = ref(false);
        const globalFirst = (a, b) => Number(b.scope === 'global') - Number(a.scope === 'global');
        const orderedWorldInfo = computed(() => worldInfo.value.map((entry, index) => ({ entry, index }))
            .sort((a, b) => globalFirst(a.entry, b.entry)));
        const visibleWorldInfo = computed(() => orderedWorldInfo.value.slice(0, worldInfoLimit.value));
        const onWorldInfoScroll = event => {
            const view = event.target;
            worldInfoScrolled.value = view.scrollTop > 300;
            if (view.scrollHeight - view.scrollTop - view.clientHeight < 600) {
                worldInfoLimit.value = Math.min(worldInfo.value.length, worldInfoLimit.value + 100);
            }
        };
        const scrollWorldInfoTop = () => {
            worldInfoViewport.value?.scrollTo({
                top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
        };
        watch([currentView, currentCharacterIndex], () => {
            worldInfoLimit.value = 100;
            worldInfoScrolled.value = false;
        });
        const managedRegexScripts = computed(() => regexScripts.value.map((script, index) => ({ script, index }))
            .sort((a, b) => globalFirst(a.script, b.script)));
        const resourceBatch = window.RPLocalWorkspace.createResourceBatch({
            source: () => currentView.value === 'worldinfo' ? worldInfo : regexScripts,
            label: () => currentView.value === 'worldinfo' ? '世界书' : '正则',
            confirm: showVueConfirmModal,
            deleted: () => showToast('所选条目已删除', 'success')
        });
        const resourceTap = window.RPLocalWorkspace.createTapGuard();
        watch([currentView, currentCharacterIndex], resourceBatch.reset);
        const globalUiTemplates = ref([]);
        const recentGenerationTimes = ref([]);
        const currentWaitTime = ref('0.0');
        let waitTimer = null;
        // --- Memory System State ---
        const SUMMARY_EMBEDDING_BATCH_SIZE = 16;
        const SUMMARY_RECALL_LIMIT = 10;
        const SUMMARY_RECALL_MIN_SIMILARITY = 0.48;
        const CLASSIC_MEMORY_MIN_CONCURRENCY = 1;
        const CLASSIC_MEMORY_MAX_CONCURRENCY = 10;
        const CLASSIC_MEMORY_DEFAULT_CONCURRENCY = 5;
        const CLASSIC_SECONDARY_KEEP_TURNS = 25;
        const CLASSIC_SECONDARY_GROUP_SIZE = 5;
        const MEMORY_MODE_ENHANCED = 'enhanced';
        const MEMORY_MODE_CLASSIC = 'classic';
        const SUMMARY_KEEP_FLOORS_MIN = 10;
        // 50 楼约等于 25 轮，正好接上二次压缩的起点（25 轮以前）；再高会让被切开的合并总结与保留的原文重复。
        const SUMMARY_KEEP_FLOORS_MAX = 300;
        const SUMMARY_KEEP_FLOORS_DEFAULT = 20;
        const LIST_PAGE_SIZE = 10;
        const classicMemories = ref([]);
        const classicMemoryPage = ref(1);
        const memorySettings = reactive({
            enabled: false,
            mode: MEMORY_MODE_CLASSIC,
            embeddingModel: '',
            classicModel: '',
            summaryKeepFloors: SUMMARY_KEEP_FLOORS_DEFAULT,
            classicConcurrency: CLASSIC_MEMORY_DEFAULT_CONCURRENCY,
            memoryApiUrl: '',
            memoryApiKey: '',
            // 2.7.82：防误触锁。滑块拖动极易误触（曾有用户反馈被拖到 300 楼），
            // 锁定后滑块 disabled，需显式点锁按钮才可再改。
            // 持久化：下方 watch(memorySettings, {deep:true}) 已自动落盘。
            keepFloorsLocked: false,
            concurrencyLocked: false
        });
        const isClassicBatchExtracting = ref(false);

        // ═══════════ 记忆工具（只读审计层，批次 A）═══════════
        // 隔离约定：
        //   · 只读 classicMemories.value，不写回、不改字段、不参与自动总结
        //   · 阈值存独立 localStorage 键，不进 settings / memorySettings
        //   · 唯一外部依赖是官方 window.RPHubStorage.getScopedStoredValue，只读一次用于比对
        //   · 关掉浮层即丢弃全部中间状态，删掉本段不影响任何原有功能
        // 注意：下面几个函数体引用 getStoryBranchScopeId / getLatestCompleteConversationTurn，
        // 它们在本行之后才声明；只在点击时调用，不在初始化期求值，因此不会踩 TDZ。
        const MEM_TOOLS_CONFIG_KEY = 'rphub_mem_tools_config';
        const readMemToolsConfig = () => {
            try {
                const raw = JSON.parse(localStorage.getItem(MEM_TOOLS_CONFIG_KEY) || '{}');
                return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
            } catch (e) { return {}; }
        };
        const memToolsConfig = reactive({ minChars: 40, keepFloors: 20, ...readMemToolsConfig() });
        const saveMemToolsConfig = () => {
            try {
                // 保留楼层填成和「记忆设置」一致 ⇒ 标记为跟随，下次打开自动同步；
                // 填成别的值才代表用户手动定过，此后不再被记忆设置冲掉。
                const keepFloorsRaw = Number(memToolsConfig.keepFloors);
                const keepFloorsReal = Math.max(0, Number(memorySettings.summaryKeepFloors) || 0);
                localStorage.setItem(MEM_TOOLS_CONFIG_KEY, JSON.stringify({
                    minChars: Number(memToolsConfig.minChars) || 0,
                    keepFloors: Number(memToolsConfig.keepFloors) || 0,
                    keepFloorsFollow: !(Number.isFinite(keepFloorsRaw) && keepFloorsRaw !== keepFloorsReal)
                }));
            } catch (e) { /* 写不进去就算了，不影响审计 */ }
        };
        // 保留楼层的默认值应当等于「记忆设置」里真正生效的 summaryKeepFloors。
        // 两处默认都是 20，所以失配平时看不出来；一旦用户改了记忆设置，
        // 巡检还按 20 算就会把故意留的楼报成「缺总结」，或反过来放过真断档。
        const memToolsKeepFloorsFollowing = () => readMemToolsConfig().keepFloorsFollow !== false;
        const syncMemToolsKeepFloors = () => {
            if (!memToolsKeepFloorsFollowing()) return;
            const real = Math.max(0, Number(memorySettings.summaryKeepFloors) || 0);
            if (Number(memToolsConfig.keepFloors) === real) return;
            memToolsConfig.keepFloors = real;
        };
        const showMemTools = ref(false);
        const memToolsAudit = reactive({
            loading: false, error: '', issues: [],
            memoryCount: 0, storedCount: -1, coveredTurns: 0, auditableMaxTurn: 0
        });
        const memToolsScopeId = computed(() => {
            const uuid = currentCharacter.value?.uuid;
            if (!uuid) return '';
            return getStoryBranchScopeId(uuid) || '';
        });
        const memToolsTextLength = text => String(text || '').replace(/\s+/g, '').length;
        const memToolsRange = memory => {
            const fallback = Number(memory?.turn) || 0;
            const start = Math.max(1, Number(memory?.turnStart) || fallback || 1);
            const end = Math.max(start, Number(memory?.turnEnd) || fallback || start);
            return { start, end };
        };
        const runMemToolsAudit = async () => {
            const issues = [];
            memToolsAudit.loading = true;
            memToolsAudit.error = '';
            try {
                const list = (Array.isArray(classicMemories.value) ? classicMemories.value : [])
                    .filter(memory => memory && memory.enabled !== false);
                memToolsAudit.memoryCount = list.length;

                const ranges = list
                    .map(memory => ({ memory, ...memToolsRange(memory) }))
                    .sort((a, b) => a.start - b.start || a.end - b.end);

                // 1) 区间重叠：同一轮被两条记忆覆盖，召回会重复
                for (let i = 1; i < ranges.length; i++) {
                    const prev = ranges[i - 1], cur = ranges[i];
                    if (cur.start > prev.end) continue;
                    issues.push({
                        level: 'warn', tag: '区间重叠',
                        where: `第 ${cur.start}–${cur.end} 轮`,
                        text: `与「第 ${prev.start}–${prev.end} 轮」重叠，同一轮被两条记忆覆盖，召回时会出现重复内容。`
                    });
                }

                // 2) 区间断档：只看「已过保留楼层」的部分，尾部未总结是正常现象
                const covered = new Set();
                ranges.forEach(item => { for (let t = item.start; t <= item.end; t++) covered.add(t); });
                memToolsAudit.coveredTurns = covered.size;
                const lastTurn = Number(getLatestCompleteConversationTurn()?.turn) || 0;
                const keepFloors = Math.max(0, Number(memToolsConfig.keepFloors) || 0);
                const auditableMax = Math.max(0, lastTurn - keepFloors);
                memToolsAudit.auditableMaxTurn = auditableMax;
                const gaps = [];
                let gapStart = 0;
                for (let t = 1; t <= auditableMax; t++) {
                    if (!covered.has(t)) { if (!gapStart) gapStart = t; }
                    else if (gapStart) { gaps.push([gapStart, t - 1]); gapStart = 0; }
                }
                if (gapStart) gaps.push([gapStart, auditableMax]);
                gaps.forEach(([from, to]) => {
                    issues.push({
                        level: 'warn', tag: '缺总结',
                        where: from === to ? `第 ${from} 轮` : `第 ${from}–${to} 轮`,
                        text: `这一段没有被任何记忆覆盖，共 ${to - from + 1} 轮。已过保留楼层仍未覆盖，说明总结没有补全。`
                    });
                });

                // 3) 字数过短：信息密度不足，后续召回容易丢细节
                const minChars = Math.max(0, Number(memToolsConfig.minChars) || 0);
                list.forEach(memory => {
                    const len = memToolsTextLength(memory.summary || memory.text || memory.content);
                    if (len >= minChars) return;
                    const range = memToolsRange(memory);
                    issues.push({
                        level: 'err', tag: '过短',
                        where: range.start === range.end ? `第 ${range.start} 轮` : `第 ${range.start}–${range.end} 轮`,
                        text: `只有 ${len} 字，低于阈值 ${minChars} 字。这类总结信息密度不够，后续召回容易丢细节。`
                    });
                });

                // 4) 源记忆不连续：二次总结条目的区间写着连续，源记忆却稀疏
                //    正常情况两者一致（合并是按连续分组做的）。出现空洞通常是删过记忆
                //    或做过迁移后没重算 ⇒ 区间法会把空洞当已覆盖，这里单独报出来。
                list.forEach(memory => {
                    if (memory?.secondaryCompressed !== true) return;
                    const sources = Array.isArray(memory.sourceMemories) ? memory.sourceMemories : [];
                    if (!sources.length) return;
                    // 递归到基础总结：三级结构里一层来源的 turn 只是子节点的 turnEnd，
                    // 按一层取会得到「只有 1 条」，这段空洞检查就静默失效了。
                    // 这里自带一份递归，避免依赖后面才声明的同名工具（const 暂时性死区）。
                    const collectTurns = (item, out = new Set()) => {
                        if (!item || typeof item !== 'object') return out;
                        const children = Array.isArray(item.sourceMemories) ? item.sourceMemories : [];
                        if (item.secondaryCompressed === true && children.length) {
                            children.forEach(child => collectTurns(child, out));
                            return out;
                        }
                        const turn = Number(item.turn);
                        if (turn >= 1) out.add(turn);
                        children.forEach(child => collectTurns(child, out));
                        return out;
                    };
                    const turns = [...collectTurns(memory)].sort((a, b) => a - b);
                    if (turns.length < 2) return;
                    const holes = [];
                    for (let i = 1; i < turns.length; i++) {
                        if (turns[i] - turns[i - 1] > 1) holes.push([turns[i - 1] + 1, turns[i] - 1]);
                    }
                    if (!holes.length) return;
                    const range = memToolsRange(memory);
                    const holeText = holes
                        .map(([from, to]) => (from === to ? `第 ${from} 轮` : `第 ${from}–${to} 轮`))
                        .join('、');
                    issues.push({
                        level: 'warn', tag: '源记忆不连续',
                        where: range.start === range.end ? `第 ${range.start} 轮` : `第 ${range.start}–${range.end} 轮`,
                        text: `区间记作连续 ${range.end - range.start + 1} 轮，源记忆却只有 ${turns.length} 条，中间缺 ${holeText}。这类条目通常是删过记忆或迁移过之后没重算，缺口检查会把它当成已覆盖。`
                    });
                });

                // 5) 内存与库比对：只读一次，用来发现「有改动没落盘」
                memToolsAudit.storedCount = -1;
                const scopeId = memToolsScopeId.value;
                if (scopeId && typeof getScopedStoredValue === 'function') {
                    try {
                        const stored = await getScopedStoredValue('classic_memories', scopeId);
                        memToolsAudit.storedCount = Array.isArray(stored) ? stored.length : 0;
                    } catch (e) { memToolsAudit.storedCount = -1; }
                }

                memToolsAudit.issues = issues;
            } catch (error) {
                memToolsAudit.error = `检查失败：${error?.message || error}`;
                memToolsAudit.issues = issues;
            } finally {
                memToolsAudit.loading = false;
            }
        };
        const openMemTools = () => {
            showMemTools.value = true;
            syncMemToolsKeepFloors();
            runMemToolsAudit();
            loadMemToolsVersions().then(() => loadMemToolsVersionsCurrent());
            loadMemToolsExtractPrompt();
            loadMemToolsExtract();
            loadMemToolsPinned();
        };
        const closeMemTools = () => {
            showMemTools.value = false;
            memToolsAudit.issues = [];
            memToolsAudit.error = '';
            // 外部对话是纯内存态：关浮层就丢，不留给下一个角色 —— 工坊换数据源时
            // 清 pinnedRanges（#8234）是同一个道理，旧来源的范围套到新来源上会处理到
            // 不相干的轮次。closeMemTools 只在点击时执行，此时 import 模块已初始化。
            clearMemToolsImport();
        };
        // ═══════════ 记忆工具 · 存档与回滚（批次 B1） ═══════════
        // 三条硬线：① 只写自有键 rphub_mem_tools_versions，不碰 classic_memories
        //          ② 只有「回滚」会写 classic_memories，且必过 二次确认 → 自动存当前 → 回读校验
        //          ③ 上限 10 份，同内容不重复存
        // 回滚写库前必须确认 _classicMemoriesLoaded：否则 saveClassicMemoriesNow 的守卫会静默
        // return（写了等于没写），绕过守卫则会用空数组覆盖真数据。
        const MEM_TOOLS_VERSIONS_KEY = 'rphub_mem_tools_versions';
        const MEM_TOOLS_VERSIONS_MAX = 10;

        // FNV-1a 32 位。只用来判断「内容变没变」，不承担抗碰撞职责。
        const memToolsHash = text => {
            let h = 0x811c9dc5;
            const s = String(text || '');
            for (let i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i);
                h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
            }
            return h.toString(16).padStart(8, '0');
        };
        const memToolsTimeText = ts => {
            const n = Number(ts) || 0;
            if (!n) return '';
            const d = new Date(n);
            const pad2 = v => String(v).padStart(2, '0');
            return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
        };
        const memToolsVersions = reactive({
            loading: false, error: '', saving: false, restoring: '', list: []
        });

        const readMemToolsVersions = async scopeId => {
            if (!scopeId) return [];
            try {
                const raw = await getScopedStoredValue(MEM_TOOLS_VERSIONS_KEY, scopeId);
                return Array.isArray(raw)
                    ? raw.filter(version => version && Array.isArray(version.memories))
                    : [];
            } catch (error) {
                return [];
            }
        };
        const loadMemToolsVersions = async () => {
            const scopeId = memToolsScopeId.value;
            memToolsVersions.loading = true;
            memToolsVersions.error = '';
            try {
                memToolsVersions.list = await readMemToolsVersions(scopeId);
            } catch (error) {
                memToolsVersions.error = `读取存档失败：${error?.message || error}`;
                memToolsVersions.list = [];
            } finally {
                memToolsVersions.loading = false;
            }
        };
        const saveMemToolsSnapshot = async (label = '手动存档') => {
            const scopeId = memToolsScopeId.value;
            if (!scopeId) { showToast('先选一个角色', 'error'); return false; }
            if (!_classicMemoriesLoaded) { showToast('记忆还没加载完，稍后再试', 'error'); return false; }
            // B1: 同步上锁，早于第一个 await。否则手动存档与自动存档会在读-改-写之间互相覆盖，
            // 后写的一方把前一份悄悄抹掉。UI 的 saving 只是显示，这里才是互斥。
            if (memToolsVersions.saving) { showToast('上一份存档还没写完，稍等一下'); return false; }
            // 存档源必须是已提交内容：视图被旁路改过时存下来的是「还没进库的样子」，
            // 回滚它等于把从未生效的数据当保险。
            if (memoryContentKey(classicMemories.value) !== _b1MemoryViewKey) {
                showToast('记忆有未保存的改动，先保存再存档', 'error');
                return false;
            }
            memToolsVersions.saving = true;
            try {
                const store = window.RPHubStorage;
                const versionsKey = store.scopedStorageKeyFor(MEM_TOOLS_VERSIONS_KEY, scopeId);
                // 基线必须用未过滤的原始值：列表里有坏条目时，过滤后的数组和库里永远不相等，
                // 条件写会退化成永久冲突。
                const rawExisting = await getScopedStoredValue(MEM_TOOLS_VERSIONS_KEY, scopeId);
                const existing = Array.isArray(rawExisting)
                    ? rawExisting.filter(version => version && Array.isArray(version.memories))
                    : [];
                const source = Array.isArray(classicMemories.value)
                    ? cloneForStorage(classicMemories.value)
                    : [];
                // versionId 与 id 同值双写：老代码按 id 找、模板按 id 做 :key，
                // 树形渲染按 parentVersionId 算深度。同一份数据两个视角，不另造别名逻辑。
                const newVersionId = generateUUID();
                const entry = {
                    id: newVersionId,
                    versionId: newVersionId,
                    parentVersionId: String(memToolsVersionsCurrentId.value || '') || null,
                    type: String(label || '').indexOf('自动存档') >= 0 ? 'auto' : 'manual',
                    createdAt: Date.now(),
                    label: String(label || '手动存档'),
                    count: source.length,
                    chars: source.reduce((sum, memory) => sum + memToolsTextLength(memory?.summary), 0),
                    sha: memToolsHash(JSON.stringify(source)),
                    memories: source
                };
                if (existing.length && existing[0].sha === entry.sha && existing[0].count === entry.count) {
                    showToast('当前状态和最新存档一致，没有重复存');
                    memToolsVersions.list = existing;
                    return false;
                }
                // 淘汰走 rebase：砍最老的节点前先把它的子节点挂到它的父上，否则树会断出孤儿。
                // 当前所在节点不参与淘汰，否则「当前」指针会指向一个刚被砍掉的版本。
                const next = memToolsVersionsPrune([entry, ...existing], MEM_TOOLS_VERSIONS_MAX,
                    memToolsVersionsCurrentId.value);
                const written = await store.commitStoredValueBatch({
                    expected: [{ key: versionsKey, value: rawExisting }],
                    writes: [{ key: versionsKey, value: next }]
                });
                if (written.status === 'conflict') {
                    showToast('存档列表刚被别的操作改过，请再存一次', 'error');
                    return false;
                }
                if (written.status !== 'committed') {
                    throw written.error || Object.assign(new Error('存档未提交'), { name: written.status });
                }
                memToolsVersions.list = next;
                showToast(`已存档 ${entry.count} 条`);
                return true;
            } catch (error) {
                showToast(`存档失败：${error?.message || error}`, 'error');
                return false;
            } finally {
                memToolsVersions.saving = false;
            }
        };
        // 字段指纹：只比会影响官网识别与召回的字段。整份 JSON 求哈希太脆，
        // no / timestamp 任何无关差异都会误报「校验不一致」，反而盖住真问题。
        const memToolsMemorySignature = list => memToolsHash(JSON.stringify(
            (Array.isArray(list) ? list : []).map(memory => [
                String(memory?.id || ''),
                Number(memory?.turn) || 0,
                Number(memory?.turnStart) || 0,
                Number(memory?.turnEnd) || 0,
                String(memory?.summary || ''),
                memory?.enabled !== false ? 1 : 0,
                memory?.secondaryCompressed === true ? 1 : 0
            ])
        ));
        // 作用域守卫：写库路径里每个 await 之后都要重新确认目标没被切走。
        // 用户在存档或写库的那几百毫秒里切角色/分支，原实现会把数据写进错的作用域。
        const memToolsScopeMoved = scopeId => !scopeId || memToolsScopeId.value !== scopeId;
        // 增强记忆模式下，改写或新合并的总结不会被向量召回，必须重建索引才生效
        const memToolsNeedsReindex = () => memorySettings.mode === MEMORY_MODE_ENHANCED;
        const restoreMemToolsSnapshot = async id => {
            const scopeId = memToolsScopeId.value;
            const entry = memToolsVersions.list.find(version => version && version.id === id);
            if (!scopeId || !entry) return;
            if (!_classicMemoriesLoaded) { showToast('记忆还没加载完，稍后再试', 'error'); return; }
            const currentCount = Array.isArray(classicMemories.value) ? classicMemories.value.length : 0;
            const confirmed = await showVueConfirmModal(
                '回滚记忆',
                `把当前 ${currentCount} 条记忆替换成存档里的 ${entry.count} 条。回滚前会自动先存一份当前状态，可以再滚回来。`
            );
            if (!confirmed) return;
            memToolsVersions.restoring = id;
            try {
                const autoSaved = await saveMemToolsSnapshot('回滚前自动存档');
                if (autoSaved === false) {
                    // 返回 false 有两种：内容与最新存档一致（去重，保险本来就在）、写库失败（保险没了）。
                    // 只有后者该中止，所以回读一次确认最新存档确实等于当前状态。
                    const latest = (memToolsVersions.list || [])[0];
                    const currentSig = memToolsMemorySignature(classicMemories.value);
                    if (!latest || memToolsMemorySignature(latest.memories) !== currentSig) {
                        showToast('回滚前的自动存档没成功，为了不丢保险，本次回滚已取消', 'error');
                        return;
                    }
                }
                if (memToolsScopeMoved(scopeId)) {
                    showToast('角色或分支已经切换，本次回滚已取消', 'error');
                    return;
                }
                // 用局部副本写库，不依赖共享的 classicMemories.value：中途切角色时它会被换掉，
                // 直接读它就会把新角色的数组写进旧作用域。整表替换是回滚的本意，故严格核对基线。
                const rollbackTarget = cloneForStorage(entry.memories);
                const versionId = String(entry.versionId || entry.id || '');
                const currentKey = window.RPHubStorage.scopedStorageKeyFor(MEM_TOOLS_VERSIONS_CURRENT_KEY, scopeId);
                const ok = await memToolsWriteMemoryList(scopeId, () => rollbackTarget, {
                    // 记忆与「当前所在版本」指针同一事务：否则回滚成功、指针没写成，
                    // 下次打开会把当前标记退回最新一份，用户看到的是错节点。
                    changes: [{ key: currentKey, operation: 'set', value: { versionId, updatedAt: Date.now() } }]
                });
                if (!ok) {
                    if (memToolsScopeMoved(scopeId)) {
                        showToast('角色或分支已经切换，回滚已写入原角色，请刷新后确认', 'warning', 4000);
                    }
                    return;
                }
                if (memToolsNeedsReindex()) {
                    showToast(`已回滚到 ${entry.count} 条。增强记忆模式需要重建索引后才会被召回`, 'warning', 4000);
                } else {
                    showToast(`已回滚到 ${entry.count} 条`);
                }
                // 指针已在上面那次事务里落地，这里只更新内存状态，不再重复写库。
                memToolsVersionsCurrentId.value = versionId;
                await loadMemToolsVersions();
                await runMemToolsAudit();
            } catch (error) {
                showToast(`回滚失败：${error?.message || error}`, 'error');
            } finally {
                memToolsVersions.restoring = '';
            }
        };
        const deleteMemToolsSnapshot = async id => {
            const scopeId = memToolsScopeId.value;
            if (!scopeId) return;
            const confirmed = await showVueConfirmModal('删除存档', '删掉这一份存档？当前记忆不受影响。');
            if (!confirmed) return;
            try {
                const store = window.RPHubStorage;
                const versionsKey = store.scopedStorageKeyFor(MEM_TOOLS_VERSIONS_KEY, scopeId);
                const currentKey = store.scopedStorageKeyFor(MEM_TOOLS_VERSIONS_CURRENT_KEY, scopeId);
                const rawExisting = await getScopedStoredValue(MEM_TOOLS_VERSIONS_KEY, scopeId);
                if (!Array.isArray(rawExisting)) { showToast('存档列表已经不存在，请刷新后确认', 'warning'); return; }
                // memToolsVersions.list 是 reactive，读出来是 Vue 代理；IDB 的
                // structuredClone 克隆不了代理。
                const next = cloneForStorage(memToolsVersionsRemoveNode(rawExisting, id));
                const clearsCurrent = String(memToolsVersionsCurrentId.value) === String(id);
                const writes = [{ key: versionsKey, value: next }];
                // 「删掉的正好是当前所在」时指针与列表必须一起落地，否则中途失败会留下悬空指针。
                if (clearsCurrent) writes.push({ key: currentKey, value: { versionId: '', updatedAt: Date.now() } });
                const written = await store.commitStoredValueBatch({
                    expected: [{ key: versionsKey, value: rawExisting }],
                    writes
                });
                if (written.status === 'conflict') {
                    showToast('存档列表刚被别的操作改过，请刷新后重试', 'error');
                    return;
                }
                if (written.status !== 'committed') {
                    throw written.error || Object.assign(new Error('删除未提交'), { name: written.status });
                }
                memToolsVersions.list = next;
                if (clearsCurrent) memToolsVersionsCurrentId.value = '';
                showToast('已删除');
            } catch (error) {
                showToast(`删除失败：${error?.message || error}`, 'error');
            }
        };
        // ═══════════ 记忆工具 · 钉住区间（2.8.75 批次 2） ═══════════
        // 定位：搬工坊的 togglePinnedRange。钉住的区间不参与自动总结。
        //       · 第一次用（键不存在）时把「已合并」区间视为钉住 —— 与工坊
        //         defaultPinnedRangesForVersion 的兜底同一个用意：接管旧数据时
        //         不能把已经压过的轮次再压一遍；
        //       · 自动总结跑完一段就把它钉住，中途停止后重跑不会重复劳动。
        // 只写自有键 rphub_mem_tools_pinned，按作用域存 [{start, end}]，
        // 不碰 classic_memories，也不碰官网存储。
        const MEM_TOOLS_PINNED_KEY = 'rphub_mem_tools_pinned';
        const memToolsPinned = reactive({
            loading: false, error: '', loaded: false, list: []
        });
        // 归一化：只认正整数区间，start 非法整条丢掉，end 缺省或小于 start 时取 start。
        // 不能图省事用 Math.max(1, Number(x) || 0)：那样 null / {} / 非数字都会变成
        // {start:1,end:1}，等于莫名其妙钉住第 1 轮。
        const memToolsNormalizeRanges = list => (Array.isArray(list) ? list : [])
            .map(item => {
                if (!item || typeof item !== 'object') return null;
                const startRaw = Number(item.start);
                if (!Number.isFinite(startRaw) || startRaw < 1) return null;
                const start = Math.floor(startRaw);
                const endRaw = Number(item.end);
                const end = Number.isFinite(endRaw) && endRaw >= start ? Math.floor(endRaw) : start;
                return { start, end };
            })
            .filter(Boolean)
            .sort((a, b) => a.start - b.start || a.end - b.end);
        // 键不存在时的默认固定集 = 已合并区间。取 computed 而不是载入时快照：
        // 记忆可能还没加载完（_classicMemoriesLoaded 还是 false），快照会把默认集
        // 算空，之后又把空集当真值写回去。
        const memToolsPinnedDefault = computed(() => (Array.isArray(classicMemories.value) ? classicMemories.value : [])
            .filter(memory => memory && memory.secondaryCompressed === true)
            .map(memory => memToolsRange(memory))
            .map(range => ({ start: range.start, end: range.end })));
        // 生效集：存过就以存的为准（含用户主动清成的空数组），没存过才走默认集。
        const memToolsPinnedEffective = computed(() => memToolsPinned.loaded
            ? (Array.isArray(memToolsPinned.list) ? memToolsPinned.list : [])
            : memToolsPinnedDefault.value);
        const readMemToolsPinned = async scopeId => {
            if (!scopeId) return undefined;
            try {
                return await getScopedStoredValue(MEM_TOOLS_PINNED_KEY, scopeId);
            } catch (error) {
                return undefined;
            }
        };
        const writeMemToolsPinned = async (scopeId, list, options = {}) => {
            if (!getMainDb()) await initDB();
            // 必须过 cloneForStorage：memToolsPinned 是 reactive，读出来的 list 是
            // Vue 代理，IDB 的 structuredClone 克隆不了代理（"could not be cloned"）。
            // 传 { clone: false } 是给「已经是 plain 值」的调用方用的（见官网
            // chat 写入）； reactive 值要先自己 cloneForStorage，与官网
            // setStoredValue('memory_settings', cloneForStorage(memorySettings), {clone:false})
            // 同一个写法。
            if (Object.prototype.hasOwnProperty.call(options, 'expected')) {
                // 用户点图钉走条件写：读-判-写之间若别的标签页改过，宁可报冲突也不覆盖。
                const key = window.RPHubStorage.scopedStorageKeyFor(MEM_TOOLS_PINNED_KEY, scopeId);
                const written = await window.RPHubStorage.commitStoredValueBatch({
                    expected: [{ key, value: options.expected }],
                    writes: [{ key, value: cloneForStorage(list) }]
                });
                if (written.status === 'conflict') {
                    throw Object.assign(new Error('固定标记刚被改动，请重试'), { name: 'StorageConflictError' });
                }
                if (written.status !== 'committed') {
                    throw written.error || Object.assign(new Error('固定标记未提交'), { name: written.status });
                }
                return true;
            }
            await setScopedStoredValue(MEM_TOOLS_PINNED_KEY, scopeId, cloneForStorage(list), { clone: false });
            return true;
        };
        const loadMemToolsPinned = async () => {
            const scopeId = memToolsScopeId.value;
            memToolsPinned.loading = true;
            memToolsPinned.error = '';
            try {
                if (!scopeId) { memToolsPinned.list = []; memToolsPinned.loaded = false; return; }
                const raw = await readMemToolsPinned(scopeId);
                if (Array.isArray(raw)) {
                    memToolsPinned.list = memToolsNormalizeRanges(raw);
                    memToolsPinned.loaded = true;
                } else {
                    // 键不存在 ⇒ 第一次用，默认集见 memToolsPinnedEffective
                    memToolsPinned.list = [];
                    memToolsPinned.loaded = false;
                }
            } catch (error) {
                memToolsPinned.error = `读取固定标记失败：${error?.message || error}`;
                memToolsPinned.list = [];
                memToolsPinned.loaded = false;
            } finally {
                memToolsPinned.loading = false;
            }
        };
        // 判定用「重叠」而不是「包含」：钉了 3–6 之后，3–4 和 5–6 都不能再参与。
        const memToolsRangePinned = (start, end) => memToolsPinnedEffective.value
            .some(range => range.end >= start && range.start <= end);
        // 增删都按「与目标重叠的部分」算，不留咬合的残段：
        // 已钉 3–6 时再钉 3–4 ⇒ 合成一条 3–6，不能留下 3–4 与 5–6 两条；
        // 已钉 1–10 时取消 3–4 ⇒ 拆成 1–2 与 5–10，不能把整条一起取消。
        // start 非法时原样返回：不能把 0 / NaN 当成「钉住第 1 轮」。
        const memToolsPinRange = (start, end, base = null) => {
            const source = Array.isArray(base) ? base : memToolsPinnedEffective.value;
            const lo = Math.floor(Number(start));
            if (!Number.isFinite(lo) || lo < 1) return source.slice();
            const hi = Math.max(lo, Math.floor(Number(end)) || lo);
            // 并集：与目标重叠的区间要一起并进来。只「删掉重叠的再添新的」会在
            // 新范围被旧区间包含时把钉子缩小 —— 已钉 3–6 再钉 3–4 会变成 3–4，
            // 于是 5–6 又被放回去参与压缩。
            const overlapping = source
                .filter(range => range.end >= lo && range.start <= hi);
            const kept = source
                .filter(range => range.end < lo || range.start > hi);
            const uLo = overlapping.length ? Math.min(lo, ...overlapping.map(range => range.start)) : lo;
            const uHi = overlapping.length ? Math.max(hi, ...overlapping.map(range => range.end)) : hi;
            return memToolsNormalizeRanges([...kept, { start: uLo, end: uHi }]);
        };
        const memToolsUnpinRange = (start, end, base = null) => {
            const source = Array.isArray(base) ? base : memToolsPinnedEffective.value;
            const lo = Math.floor(Number(start));
            if (!Number.isFinite(lo) || lo < 1) return source.slice();
            const hi = Math.max(lo, Math.floor(Number(end)) || lo);
            const next = [];
            source.forEach(range => {
                if (range.end < lo || range.start > hi) { next.push({ ...range }); return; }
                if (range.start < lo) next.push({ start: range.start, end: lo - 1 });
                if (range.end > hi) next.push({ start: hi + 1, end: range.end });
            });
            return memToolsNormalizeRanges(next);
        };
        const toggleMemToolsPin = async row => {
            const scopeId = memToolsScopeId.value;
            const start = Number(row && row.start) || 0;
            const end = Math.max(start, Number(row && row.end) || start);
            if (!scopeId || !start) { showToast('先选一个角色'); return; }
            const label = `第 ${start}${end !== start ? '–' + end : ''} 轮`;
            const before = (memToolsPinned.list || []).slice();
            try {
                // 判定与写入都要以库里的当前值为准：内存列表可能是别的标签页写入前的旧值。
                const raw = await readMemToolsPinned(scopeId);
                const base = Array.isArray(raw) ? memToolsNormalizeRanges(raw) : memToolsPinnedEffective.value.slice();
                const pinned = base.some(range => range.end >= start && range.start <= end);
                const next = pinned ? memToolsUnpinRange(start, end, base) : memToolsPinRange(start, end, base);
                memToolsPinned.list = next;
                await writeMemToolsPinned(scopeId, next, { expected: raw });
                memToolsPinned.loaded = true;
                memToolsPinned.error = '';
                showToast(pinned ? `已取消固定${label}，它会重新参与自动总结` : `已固定${label}，自动总结会跳过它`);
            } catch (error) {
                memToolsPinned.list = before;
                memToolsPinned.error = `保存固定标记失败：${error?.message || error}`;
            }
        };
        // ═══════════ 记忆工具 · 逐条查看与修改（批次 1，2.8.74） ═══════════
        // 定位：补上「旧总结既不敢删也没法改」里的「没法改」。整份回滚太重、合并只对连续
        //       多条有意义，单条写坏了此前只能整份回滚 —— 这里给每条一个改 / 重试 / 撤销。
        // 三条硬线：① 只写 classic_memories ② 写入前存档 + 前后作用域守卫 + 写入后指纹校验
        //          ③ 增强模式下改完必须重建这一条的向量，否则召回还是旧的
        const MEM_TOOLS_EDIT_PREVIEW = 40;
        const memToolsEditPreview = text => {
            const flat = String(text || '').replace(/\s+/g, ' ').trim();
            return flat.length > MEM_TOOLS_EDIT_PREVIEW ? `${flat.slice(0, MEM_TOOLS_EDIT_PREVIEW)}…` : flat;
        };
        const memToolsEdit = reactive({
            listOpen: false, id: '', text: '', running: '', writing: false, error: '', notice: ''
        });
        let _memToolsEditAbort = null;
        // 行模型：按轮次排序的启用中记忆清单。列表、按钮、编辑框全吃它。
        const memToolsRows = computed(() => (Array.isArray(classicMemories.value) ? classicMemories.value : [])
            .filter(memory => memory && memory.enabled !== false)
            .map(memory => {
                const range = memToolsRange(memory);
                return {
                    memory, start: range.start, end: range.end,
                    len: memToolsTextLength(memory.summary),
                    preview: memToolsEditPreview(memory.summary)
                };
            })
            .sort((a, b) => a.start - b.start || a.end - b.end));
        // 父版本 = 当前所在存档节点的 parentVersionId 指向的那个节点。
        // 取不到（从没存过档 / 节点已被淘汰）就返回 []，撤销降级成纯删除。
        const memToolsParentMemories = computed(() => {
            const current = memToolsVersionsCurrent.value;
            const parentId = String(current && current.parentVersionId ? current.parentVersionId : '');
            if (!parentId) return [];
            const parent = (memToolsVersions.list || [])
                .find(version => String(version.versionId || version.id || '') === parentId);
            return parent && Array.isArray(parent.memories) ? parent.memories : [];
        });
        // 把 [start, end] 这一段恢复成父版本里的样子：取父版本重叠项的并集，删掉当前所有
        // 重叠条目，再把父版本那些条目整条插回。
        // 取并集是为了不出现「只还原半条父版本总结」：父版本 3–6 是一条、当前被拆成 3–4 与
        // 5–6 两条时，只按 3–4 的范围去取会把 5–6 漏在外面，两边各剩一半。
        const memToolsRevertRange = (list, parentList, start, end) => {
            const base = Array.isArray(list) ? list : [];
            const parent = Array.isArray(parentList) ? parentList : [];
            const parentRanges = parent
                .map(memory => ({ memory, ...memToolsRange(memory) }))
                .filter(item => item.end >= start && item.start <= end)
                .sort((a, b) => a.start - b.start || a.end - b.end);
            const lo = parentRanges.length ? Math.min(start, ...parentRanges.map(item => item.start)) : start;
            const hi = parentRanges.length ? Math.max(end, ...parentRanges.map(item => item.end)) : end;
            const kept = base.filter(memory => {
                const range = memToolsRange(memory);
                return range.end < lo || range.start > hi;
            });
            // 拼回后按轮次排一次：数组顺序本身就是官网不变量之一（上下文组装按数组顺序走），
            // 不能因为回退就把顺序打乱。
            const next = [...kept, ...parentRanges.map(item => cloneForStorage(item.memory))]
                .sort((a, b) => {
                    const ra = memToolsRange(a), rb = memToolsRange(b);
                    return ra.start - rb.start || ra.end - rb.end;
                });
            return { list: next, lo, hi, restored: parentRanges.length };
        };
        // ═══════════ 记忆工具 · 手动合并（批次 B2） ═══════════
        // 只做一件事：把用户勾选的连续几条记忆合成一条。
        // 提示词不自己写，直接调官网的 requestClassicSecondarySummary；新条目字段照抄官网
        // 二次总结的构造（secondaryCompressed + sourceMemories），这样官网后续的上下文组装、
        // 二次总结判据、记忆徽标都能正常识别它。
        const memToolsMerge = reactive({
            picking: false, selected: [], running: false, error: '',
            preview: '', previewOpen: false, writing: false,
            sourceIds: [], rangeStart: 0, rangeEnd: 0
        });
        let _memToolsMergeAbort = null;

        const memToolsMergePickable = computed(() => {
            const list = Array.isArray(classicMemories.value) ? classicMemories.value : [];
            return list
                .filter(memory => memory && memory.enabled !== false)
                .map(memory => {
                    const range = memToolsRange(memory);
                    return {
                        memory, start: range.start, end: range.end,
                        len: memToolsTextLength(memory.summary)
                    };
                })
                .sort((a, b) => a.start - b.start || a.end - b.end);
        });
        const memToolsMergePickedList = computed(() => {
            const picked = new Set(memToolsMerge.selected);
            return memToolsMergePickable.value.filter(item => picked.has(item.memory.id));
        });
        // 区间必须首尾相接。有空隙就会漏掉中间几轮，而官网 prompt 是按 startTurn–endTurn
        // 整体描述的 ⇒ 模型会以为空隙也在总结范围内。
        const memToolsMergeGap = computed(() => {
            const picked = memToolsMergePickedList.value;
            if (picked.length < 2) return null;
            for (let i = 1; i < picked.length; i++) {
                const prev = picked[i - 1], cur = picked[i];
                if (cur.start > prev.end + 1) return { from: prev.end + 1, to: cur.start - 1 };
            }
            return null;
        });
        const memToolsMergeCanRun = computed(() => (
            memToolsMergePickedList.value.length >= 2
            && !memToolsMergeGap.value
            && !memToolsMerge.running
        ));
        const openMemToolsMergePick = () => {
            memToolsMerge.picking = true;
            memToolsMerge.selected = [];
            memToolsMerge.error = '';
            memToolsMerge.preview = '';
            memToolsMerge.previewOpen = false;
        };
        const closeMemToolsMergePick = () => {
            memToolsMerge.picking = false;
            memToolsMerge.selected = [];
            memToolsMerge.error = '';
            memToolsMerge.preview = '';
            memToolsMerge.previewOpen = false;
        };
        const abortMemToolsMerge = () => {
            try { if (_memToolsMergeAbort) _memToolsMergeAbort.abort(); } catch (error) { /* 已经结束 */ }
        };
        const runMemToolsMerge = async () => {
            const picked = memToolsMergePickedList.value;
            if (picked.length < 2) { memToolsMerge.error = '至少选两条'; return; }
            if (memToolsMergeGap.value) { memToolsMerge.error = '选中的记忆之间有空隙，先补齐'; return; }
            if (!_classicMemoriesLoaded) { memToolsMerge.error = '记忆还没加载完，稍后再试'; return; }
            if (!String(memorySettings.classicModel || '').trim()) {
                memToolsMerge.error = '先在记忆系统设置里选总结模型';
                return;
            }
            memToolsMerge.running = true;
            memToolsMerge.error = '';
            memToolsMerge.preview = '';
            memToolsMerge.previewOpen = false;
            _memToolsMergeAbort = new AbortController();
            try {
                const group = picked.map(item => item.memory);
                const summary = await requestClassicSecondarySummary(group, _memToolsMergeAbort.signal);
                memToolsMerge.sourceIds = group.map(memory => memory.id);
                memToolsMerge.rangeStart = picked[0].start;
                memToolsMerge.rangeEnd = picked[picked.length - 1].end;
                memToolsMerge.preview = summary;
                memToolsMerge.previewOpen = true;
            } catch (error) {
                if (error && error.name === 'AbortError') memToolsMerge.error = '已取消';
                else memToolsMerge.error = `合并失败：${error?.message || error}`;
            } finally {
                memToolsMerge.running = false;
                _memToolsMergeAbort = null;
            }
        };
        const cancelMemToolsMergePreview = () => {
            memToolsMerge.previewOpen = false;
            memToolsMerge.preview = '';
            memToolsMerge.error = '';
        };
        const confirmMemToolsMergeWrite = async () => {
            const scopeId = memToolsScopeId.value;
            const text = String(memToolsMerge.preview || '').trim();
            if (!scopeId) return;
            if (!text) { memToolsMerge.error = '合并结果是空的'; return; }
            if (!_classicMemoriesLoaded) { memToolsMerge.error = '记忆还没加载完，稍后再试'; return; }
            const ids = memToolsMerge.sourceIds;
            if (!ids.length) { memToolsMerge.error = '没有可写入的来源，请重新合并'; return; }
            const group = (Array.isArray(classicMemories.value) ? classicMemories.value : [])
                .filter(memory => memory && ids.includes(memory.id));
            // 预览期间记忆被别处改过（删了某条 / 重跑了总结）⇒ 来源对不上，必须重来
            if (group.length !== ids.length) {
                memToolsMerge.error = '来源记忆已经变了，请重新合并';
                return;
            }
            memToolsMerge.writing = true;
            memToolsMerge.error = '';
            try {
                await saveMemToolsSnapshot('合并前自动存档');
                if (memToolsScopeMoved(scopeId)) {
                    memToolsMerge.error = '角色或分支已经切换，本次合并已取消';
                    return;
                }
                const ordered = [...group].sort(
                    (a, b) => (Number(a.turn) || 0) - (Number(b.turn) || 0)
                );
                const startTurn = memToolsMerge.rangeStart || Number(ordered[0]?.turn) || 1;
                const endTurn = memToolsMerge.rangeEnd
                    || Number(ordered[ordered.length - 1]?.turn) || startTurn;
                const merged = {
                    id: generateUUID(),
                    no: getNextClassicMemoryNo(classicMemories.value),
                    timestamp: Date.now(),
                    turn: endTurn,
                    turnStart: startTurn,
                    turnEnd: endTurn,
                    summary: text,
                    enabled: true,
                    classicMemory: true,
                    secondaryCompressed: true,
                    summaryModel: String(memorySettings.classicModel || '').trim(),
                    sourceUserIds: [...new Set(ordered.flatMap(memory => memory.sourceUserIds || []))],
                    sourceAssistantIds: [...new Set(ordered.flatMap(memory => memory.sourceAssistantIds || []))],
                    sourceMemories: ordered.map(memory => cloneForStorage(memory))
                };
                const sourceSet = new Set(ids);
                // 按当前已发布列表重算：合并期间别处追加的无关条目不会被这份旧快照抹掉
                const ok = await memToolsWriteMemoryList(scopeId, list => [
                    ...list.filter(memory => !sourceSet.has(String(memory && memory.id || ''))),
                    merged
                ], {sourceIds: ids});
                if (!ok) {
                    if (memToolsScopeMoved(scopeId)) memToolsMerge.error = '角色或分支已经切换，合并结果已写入原角色，请刷新后确认';
                    return;
                }
                if (memToolsNeedsReindex()) {
                    showToast(`已把 ${ids.length} 条合并成 1 条。增强记忆模式需要重建索引后才会被召回`, 'warning', 4000);
                } else {
                    showToast(`已把 ${ids.length} 条合并成 1 条`);
                }
                memToolsMerge.previewOpen = false;
                memToolsMerge.preview = '';
                memToolsMerge.picking = false;
                memToolsMerge.selected = [];
                await loadMemToolsVersions();
                await runMemToolsAudit();
            } catch (error) {
                memToolsMerge.error = `写入失败：${error?.message || error}`;
            } finally {
                memToolsMerge.writing = false;
            }
        };
        // ═══════════ 记忆工具 · 逐条动作：改 / 重试 / 撤销（批次 1，2.8.74） ═══════════
        // 写入骨架照 confirmMemToolsMergeWrite：存档 → 作用域守卫 → 写 → 指纹校验 → 刷新。
        // 传入 transform 时按当前已发布列表重算，未受影响的条目不会被旧快照覆盖；
        // sourceIds 只用于核对本次真正依赖的那几条来源。
        const memToolsWriteMemoryList = async (scopeId, nextListOrTransform, options = {}) => {
            const intent = options.intent || await beginMemoryIntent(options.label || '记忆工具保存');
            if (intent.scopeId !== scopeId) throw memoryOperationError('MemoryScopeError', '记忆与作用域不匹配');
            const transform = typeof nextListOrTransform === 'function'
                ? nextListOrTransform
                : () => nextListOrTransform;
            const sourceIds = Array.isArray(options.sourceIds) ? options.sourceIds.map(String) : null;
            // 把附加事务键透传下去：回滚要同时写「当前所在版本」指针，两键必须同一事务。
            const extra = { expected: options.expected, changes: options.changes };
            const result = sourceIds
                ? await commitMemoryTransform(intent, transform, {
                    ...extra,
                    validate: (current, before) => sourceIds.every(id => sameMemorySources(current, before, [id]))
                })
                : await commitMemoryDraft(intent, transform(intent.source), extra);
            if (!result.published) return false;   // 调用方按 memToolsScopeMoved 给出各自的提示
            const stored = await getScopedStoredValue('classic_memories', scopeId);
            const storedList = Array.isArray(stored) ? stored : [];
            if (memToolsMemorySignature(storedList) !== memToolsMemorySignature(result.list)) {
                // 校验不过就返回 false：调用方据此不再显示「已保存」，批量任务也会停。
                showToast('写入后校验不一致，请用存档回滚', 'error');
                return false;
            } else if (memToolsNeedsReindex()) {
                await memToolsReindexMemory(options.memoryId);
            }
            await loadMemToolsVersions();
            await runMemToolsAudit();
            return true;
        };
        // 增强模式下改完必须重建这一条的向量。sourceUserText 来自原始轮用户输入，
        // 老记忆对应的对话被裁掉时取不到 ⇒ 只能提示召回还是旧的，不能假装成功。
        const memToolsReindexMemory = async memoryId => {
            const memory = (Array.isArray(classicMemories.value) ? classicMemories.value : [])
                .find(item => String(item && item.id) === String(memoryId || ''));
            if (!memory) return;
            try {
                const indexed = await indexSummaryMemories(
                    buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false }),
                    null,
                    [memory]
                );
                // 缺原文、被中断、没写成是三种状态，提示分开；都不报成功。
                if (indexed.cancelled) showToast('向量重建被中断，这一条暂时不参与召回', 'warning', 5000);
                else if (indexed.skippedParent) showToast('父摘要是压缩节点，本身不参与向量索引', 'info', 4000);
                else if (indexed.skippedNoSource) showToast('这一条找不到对应原文，向量没重建，召回可能还是旧的', 'warning', 5000);
                else if (indexed.requested && indexed.written < indexed.requested) showToast('总结已改，但向量没重建，召回可能还是旧的', 'warning', 5000);
                else if (!indexed.requested) showToast('这一条的向量已是最新，无需重建');
                else showToast('已重建这一条的向量');
            } catch (error) {
                showToast(`总结已改，但向量没重建（${error?.message || error}），召回可能还是旧的`, 'warning', 5000);
            }
        };
        const openMemToolsMemoryEdit = row => {
            const memory = row && row.memory;
            if (!memory) return;
            memToolsEdit.id = String(memory.id || '');
            memToolsEdit.text = String(memory.summary || '');
            memToolsEdit.error = '';
            memToolsEdit.notice = '';
        };
        const cancelMemToolsMemoryEdit = () => {
            memToolsEdit.id = '';
            memToolsEdit.text = '';
            memToolsEdit.error = '';
        };
        const saveMemToolsMemoryEdit = async row => {
            const scopeId = memToolsScopeId.value;
            const memory = row && row.memory;
            if (!scopeId || !memory) return;
            if (!_classicMemoriesLoaded) { memToolsEdit.error = '记忆还没加载完，稍后再试'; return; }
            const text = String(memToolsEdit.text || '').trim();
            // 清空输入框 = 撤回这一段，与工坊同一处理：写空条目只会把这一轮变成噪音
            if (!text) {
                await undoMemToolsMemory(row, { skipConfirm: true });
                return;
            }
            memToolsEdit.writing = true;
            memToolsEdit.error = '';
            memToolsEdit.notice = '';
            try {
                await saveMemToolsSnapshot('编辑前自动存档');
                if (memToolsScopeMoved(scopeId)) {
                    memToolsEdit.error = '角色或分支已经切换，本次修改已取消';
                    return;
                }
                const targetId = String(memory.id);
                const ok = await memToolsWriteMemoryList(scopeId, list => list.map(item => {
                    if (!item || String(item.id) !== targetId) return item;
                    const next = { ...item, summary: text };
                    // 正文改了旧坐标就作废。清掉而不是留着：重建失败时这条不参与召回，
                    // 也不能拿旧文本的向量给新正文打分。
                    if (!isSecondaryClassicMemory(next)) ['embeddingQ', 'embeddingScale', 'embeddingDims',
                        'embeddingEncoding', 'embeddingModel', 'embeddingApiUrl', 'embeddingInputFingerprint']
                        .forEach(key => delete next[key]);
                    return next;
                }), { memoryId: memory.id, sourceIds: [targetId] });
                if (!ok) return;
                cancelMemToolsMemoryEdit();
                memToolsEdit.notice = '已保存这一条的修改';
            } catch (error) {
                memToolsEdit.error = `保存失败：${error?.message || error}`;
            } finally {
                memToolsEdit.writing = false;
            }
        };
        const retryMemToolsMemory = async row => {
            const scopeId = memToolsScopeId.value;
            const memory = row && row.memory;
            if (!scopeId || !memory) return;
            if (memToolsEdit.running) return;
            if (!_classicMemoriesLoaded) { memToolsEdit.error = '记忆还没加载完，稍后再试'; return; }
            if (!String(memorySettings.classicModel || '').trim()) {
                memToolsEdit.error = '先在记忆系统设置里选总结模型';
                return;
            }
            const job = memToolsRetryJob(row);
            if (!job) {
                memToolsEdit.error = `第 ${row.start}${row.end !== row.start ? '–' + row.end : ''} 轮的原文已经不在当前对话里，只能手动改`;
                return;
            }
            memToolsEdit.running = String(memory.id || '');
            memToolsEdit.error = '';
            memToolsEdit.notice = '';
            _memToolsEditAbort = new AbortController();
            try {
                const text = String(await requestMemToolsRangeSummary(job, _memToolsEditAbort.signal) || '').trim();
                if (!text) throw new Error('副模型没有返回有效总结');
                await saveMemToolsSnapshot('重试前自动存档');
                if (memToolsScopeMoved(scopeId)) {
                    memToolsEdit.error = '角色或分支已经切换，本次重试未写入';
                    return;
                }
                const targetId = String(memory.id);
                const ok = await memToolsWriteMemoryList(scopeId, list => list.map(item => {
                    if (!item || String(item.id) !== targetId) return item;
                    const next = { ...item, summary: text };
                    if (!isSecondaryClassicMemory(next)) ['embeddingQ', 'embeddingScale', 'embeddingDims',
                        'embeddingEncoding', 'embeddingModel', 'embeddingApiUrl', 'embeddingInputFingerprint']
                        .forEach(key => delete next[key]);
                    return next;
                }), { memoryId: memory.id, sourceIds: [targetId] });
                if (!ok) return;
                memToolsEdit.notice = `已重新总结第 ${row.start}${row.end !== row.start ? '–' + row.end : ''} 轮`;
            } catch (error) {
                if (error && error.name === 'AbortError') memToolsEdit.error = '已取消';
                else memToolsEdit.error = `重试失败：${error?.message || error}`;
            } finally {
                _memToolsEditAbort = null;
                memToolsEdit.running = '';
            }
        };
        const abortMemToolsEdit = () => {
            try { if (_memToolsEditAbort) _memToolsEditAbort.abort(); } catch (error) { /* 已经结束 */ }
        };
        // 撤销 = 删掉本版本对这一段的改动，恢复父版本里的映射。
        // 范围取父版本重叠项的并集，理由见 memToolsRevertRange。
        const undoMemToolsMemory = async (row, options = {}) => {
            const scopeId = memToolsScopeId.value;
            const memory = row && row.memory;
            if (!scopeId || !memory) return;
            if (!_classicMemoriesLoaded) { memToolsEdit.error = '记忆还没加载完，稍后再试'; return; }
            const start = Number(row && row.start) || 1;
            const end = Math.max(start, Number(row && row.end) || start);
            const label = `第 ${start}${end !== start ? '–' + end : ''} 轮`;
            const parentList = memToolsParentMemories.value;
            const probe = memToolsRevertRange(classicMemories.value, parentList, start, end);
            const target = probe.restored
                ? (probe.restored > 1 ? `${probe.restored} 条父版本总结` : '父版本总结')
                : '原始轮对话';
            if (!options.skipConfirm) {
                const answer = await showVueConfirmModal(
                    `撤销${label}`,
                    `将撤销${label}的总结，恢复为${target}${probe.lo !== probe.hi ? `（合并前的第 ${probe.lo}–${probe.hi} 轮映射）` : ''}。`,
                    { confirmText: '撤销' }
                );
                if (!answer) return;
            }
            memToolsEdit.writing = true;
            memToolsEdit.error = '';
            memToolsEdit.notice = '';
            try {
                await saveMemToolsSnapshot('撤销前自动存档');
                if (memToolsScopeMoved(scopeId)) {
                    memToolsEdit.error = '角色或分支已经切换，本次撤销已取消';
                    return;
                }
                // 受影响来源 = 当前列表里与待恢复区间重叠的条目；只核对这些，别处新增不受牵连
                const affectedIds = (Array.isArray(classicMemories.value) ? classicMemories.value : [])
                    .filter(item => {
                        const range = memToolsRange(item);
                        return range.end >= probe.lo && range.start <= probe.hi;
                    })
                    .map(item => String(item && item.id || ''))
                    .filter(Boolean);
                const ok = await memToolsWriteMemoryList(
                    scopeId,
                    list => memToolsRevertRange(list, parentList, start, end).list,
                    { sourceIds: affectedIds }
                );
                if (!ok) return;
                cancelMemToolsMemoryEdit();
                memToolsEdit.notice = `已撤销${label}，恢复为${target}`;
            } catch (error) {
                memToolsEdit.error = `撤销失败：${error?.message || error}`;
            } finally {
                memToolsEdit.writing = false;
            }
        };
        // ═══════════ 记忆工具 · 自动总结（2.8.75 批次 2） ═══════════
        // 定位：搬工坊的 autoSummary + 钉住区间。官网的二次压缩写死在
        //       CLASSIC_SECONDARY_KEEP_TURNS=25 / GROUP_SIZE=5，而且只在「全量补录」
        //       流程末尾跑一次，用户想主动压一批旧总结没有入口。这里给一个能随时开、
        //       能随时停的批量压缩。
        // 三条硬线（照前几批）
        //   ① 只写 classic_memories；参数存自有键 rphub_mem_tools_auto，固定标记存
        //      rphub_mem_tools_pinned，都不碰官网存储
        //   ② 开跑前自动存档一次；每组写入仍走 memToolsWriteMemoryList
        //      （作用域守卫 + 写后指纹校验 + 增强模式重建这一条的向量），
        //      一段失败不拖垮已保存的部分
        //   ③ 模型返回拒绝回答不算成功：写进去就是一条永久噪音，而且这段随后会被
        //      自动钉住，以后再也不处理
        // 与官网 getEligibleClassicSecondaryGroups 的差别：官网按绝对轮号 1–5、6–10
        // 切组，且组内必须全是还没合并过的单轮总结；这里按工坊的做法把候选元素按
        // 连续性切段、段内每 group 个元素一组 —— 已合并的 4–5 轮算 1 个元素，
        // 可以继续往上并。
        const MEM_TOOLS_AUTO_KEY = 'rphub_mem_tools_auto';
        const readMemToolsAuto = () => {
            try {
                const raw = JSON.parse(localStorage.getItem(MEM_TOOLS_AUTO_KEY) || '{}');
                return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
            } catch (e) { return {}; }
        };
        const memToolsAuto = reactive({
            keepTurns: 25, groupSize: 5,
            running: false, stopping: false, error: '', notice: '',
            done: 0, total: 0, current: '', retryLeft: 0, retryMax: 0,
            ...readMemToolsAuto()
        });
        const saveMemToolsAuto = () => {
            try {
                localStorage.setItem(MEM_TOOLS_AUTO_KEY, JSON.stringify({
                    keepTurns: Math.max(0, Number(memToolsAuto.keepTurns) || 0),
                    groupSize: Math.max(1, Number(memToolsAuto.groupSize) || 1)
                }));
            } catch (e) { /* 存不下就用默认值，不影响本次运行 */ }
        };
        // 拒绝回答检测（工坊 looksLikeRefusal 原文）：模型回「我不能…」时，
        // 内容看着像总结其实是拒答，写进去比不写更糟。
        const memToolsLooksLikeRefusal = text => {
            const s = String(text || '');
            if (!s) return false;
            return /cannot fulfill|unable to (generate|comply|assist)|could not be submitted|sensitive words|prohibited use policy|violates? .{0,20}polic|I can'?t (help|assist|generate)|content policy|无法(满足|完成|生成|协助)|拒绝生成|违反.{0,10}(政策|规范)/i.test(s);
        };
        // 计划：候选 = 启用中、有正文、且整段都在保留线之前的记忆，再扣掉被钉住的。
        // 连续性按「前一个 end + 1 === 后一个 start」切段，中间钉住的区间会断开 ——
        // 钉了 1–2 之后，3 和 6 不会被打包成 3–6。
        // 计数单位是「元素」而不是轮：已合并的 4–5 轮算 1 个元素。
        const memToolsAutoPlan = computed(() => {
            const snapshot = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false });
            const turns = Array.isArray(snapshot && snapshot.turns) ? snapshot.turns : [];
            const totalTurns = turns.length;
            const keep = Math.max(0, Number(memToolsAuto.keepTurns) || 0);
            const group = Math.max(1, Number(memToolsAuto.groupSize) || 1);
            const cutoff = Math.max(0, totalTurns - keep);
            const rows = (Array.isArray(classicMemories.value) ? classicMemories.value : [])
                .filter(memory => memory && memory.enabled !== false && String(memory.summary || '').trim())
                .map(memory => ({ memory, ...memToolsRange(memory) }))
                .filter(item => item.end <= cutoff)
                .sort((a, b) => a.start - b.start || a.end - b.end);
            const pinnedCount = rows.filter(item => memToolsRangePinned(item.start, item.end)).length;
            const eligible = rows.filter(item => !memToolsRangePinned(item.start, item.end));
            const segments = [];
            eligible.forEach(item => {
                const last = segments[segments.length - 1];
                if (last && item.start === last[last.length - 1].end + 1) last.push(item);
                else segments.push([item]);
            });
            const groups = [];
            segments.forEach(segment => {
                for (let i = 0; i < segment.length; i += group) {
                    const slice = segment.slice(i, i + group);
                    // 单元素组没有压缩意义：只会把一条现有总结改写一遍，白跑一次请求
                    if (slice.length > 1) groups.push(slice);
                }
            });
            return {
                totalTurns, keep, group, cutoff, groups,
                eligibleCount: eligible.length, pinnedCount, memoryCount: rows.length
            };
        });
        // 二次总结请求：system 用官网 buildClassicSecondarySummaryPrompt，逐条标签写成区间。
        // 不直接用官网的 requestClassicSecondarySummary：它按 memory.turn 打标签
        //（【第 5 轮】），而组里可能有 4–5 这样的已合并元素，标签会告诉模型错的覆盖范围。
        const requestMemToolsAutoSummary = async (memories, signal) => {
            const ordered = [...memories].sort((a, b) => memToolsRange(a).start - memToolsRange(b).start);
            const ranges = ordered.map(item => memToolsRange(item));
            const startTurn = ranges.length ? ranges[0].start : 1;
            const endTurn = ranges.length ? ranges[ranges.length - 1].end : startTurn;
            const messages = [{
                role: 'system',
                content: BUILTIN_PROMPTS.buildClassicSecondarySummaryPrompt({
                    userName: user.name,
                    characterName: currentCharacter.value?.name,
                    startTurn,
                    endTurn
                })
            }, {
                role: 'user',
                content: ordered.map((item, index) => {
                    const range = ranges[index];
                    return `【第 ${range.start}${range.end !== range.start ? `–${range.end}` : ''} 轮】\n${String(item.summary || '')}`;
                }).join('\n\n')
            }];
            return requestClassicMemoryCompletion(messages, signal);
        };
        // 合并条目字段照官网二次总结的构造（secondaryCompressed + sourceMemories），
        // 这样官网后续的上下文组装、二次总结判据、记忆徽标都能正常识别它。
        // markRuntimeRaw 与官网 compressEligibleClassicMemories 一致：合并条目带着
        // 整棵 sourceMemories 子树，不该被 Vue 逐层代理。
        const memToolsAutoMergedMemory = (memories, summary) => {
            const ordered = [...memories].sort((a, b) => memToolsRange(a).start - memToolsRange(b).start);
            const ranges = ordered.map(item => memToolsRange(item));
            const startTurn = ranges[0].start;
            const endTurn = ranges[ranges.length - 1].end;
            return markRuntimeRaw({
                id: generateUUID(),
                no: getNextClassicMemoryNo(classicMemories.value),
                timestamp: Date.now(),
                turn: endTurn,
                turnStart: startTurn,
                turnEnd: endTurn,
                summary,
                enabled: true,
                classicMemory: true,
                secondaryCompressed: true,
                summaryModel: String(memorySettings.classicModel || '').trim(),
                sourceUserIds: [...new Set(ordered.flatMap(memory => memory.sourceUserIds || []))],
                sourceAssistantIds: [...new Set(ordered.flatMap(memory => memory.sourceAssistantIds || []))],
                sourceMemories: ordered.map(memory => cloneForStorage(memory))
            });
        };
        // 断网重试：失败后按 10 / 30 / 60 秒自动重试，最多 3 次。
        // 倒计时显示在进度行上，不弹框 —— 批量跑几十段时弹框会打断用户做别的事。
        // 倒计时拆成 1 秒一跳，每跳都看 signal：用户点停止要能立刻打断等待中的重试，
        // 否则「点了停止没反应」还要再等一个完整周期。
        // delays 放对象里而不是 const 数组：逻辑复验要把它压成 0 秒，
        // 不能让测试真等 10 秒。
        const memToolsAutoRetry = { delays: [10, 30, 60] };
        const memToolsAutoStopError = () => {
            const error = new Error('已停止');
            error.name = 'AbortError';
            return error;
        };
        const memToolsAutoSleep = ms => new Promise(resolve => setTimeout(resolve, ms));
        const memToolsAutoWithRetry = async (attemptFn, label, signal) => {
            const delays = memToolsAutoRetry.delays;
            let lastError = null;
            for (let attempt = 0; attempt <= delays.length; attempt++) {
                if (signal && signal.aborted) throw memToolsAutoStopError();
                try {
                    const result = await attemptFn();
                    memToolsAuto.retryLeft = 0;
                    memToolsAuto.retryMax = 0;
                    return result;
                } catch (error) {
                    if (error && error.name === 'AbortError') throw error;
                    lastError = error;
                    if (attempt >= delays.length) break;
                    const delay = Number(delays[attempt]) || 0;
                    memToolsAuto.retryMax = delays.length;
                    memToolsAuto.retryLeft = delay;
                    memToolsAuto.current = `${label}失败，${delay} 秒后重试（第 ${attempt + 1}/${delays.length} 次）`;
                    for (let left = delay; left > 0; left--) {
                        if (signal && signal.aborted) throw memToolsAutoStopError();
                        memToolsAuto.retryLeft = left;
                        await memToolsAutoSleep(1000);
                    }
                    memToolsAuto.retryLeft = 0;
                    memToolsAuto.retryMax = 0;
                }
            }
            throw lastError;
        };
        let _memToolsAutoAbort = null;
        const memToolsAutoRangeLabel = (start, end) => `第 ${start}${end !== start ? '–' + end : ''} 轮`;
        // 开跑前存档一次，之后每组写入不再单独存档：存档上限 10 份，
        // 批量跑几十段每组存一份会把上限挤爆，回滚时反而找不到起点。
        // 也不判 saveMemToolsSnapshot 的返回值 —— 它与最新存档一致时也返回 false，
        // 而那种情况下最新存档就是当前状态，照样能回滚；真失败它有 error toast。
        const runMemToolsAuto = async () => {
            const scopeId = memToolsScopeId.value;
            if (!scopeId) { memToolsAuto.error = '先选一个角色'; return; }
            if (memToolsAuto.running) return;
            if (!_classicMemoriesLoaded) { memToolsAuto.error = '记忆还没加载完，稍后再试'; return; }
            if (!String(memorySettings.classicModel || '').trim()) {
                memToolsAuto.error = '先在记忆系统设置里选总结模型';
                return;
            }
            const plan = memToolsAutoPlan.value;
            const groups = plan.groups;
            if (!groups.length) {
                memToolsAuto.error = plan.pinnedCount
                    ? `没有可压缩的段落：剩 ${plan.pinnedCount} 条已被钉住，在「逐条查看与修改」里点图钉可以放开`
                    : `没有可压缩的段落：当前保留最近 ${plan.keep} 轮`;
                return;
            }
            saveMemToolsAuto();
            await saveMemToolsSnapshot('自动总结前自动存档');
            if (memToolsScopeMoved(scopeId)) {
                memToolsAuto.error = '角色或分支已经切换，本次自动总结已取消';
                return;
            }
            memToolsAuto.running = true;
            memToolsAuto.stopping = false;
            memToolsAuto.error = '';
            memToolsAuto.notice = '';
            memToolsAuto.done = 0;
            memToolsAuto.total = groups.length;
            memToolsAuto.current = '';
            memToolsAuto.retryLeft = 0;
            memToolsAuto.retryMax = 0;
            _memToolsAutoAbort = new AbortController();
            const signal = _memToolsAutoAbort.signal;
            // 分组在开跑前取一次快照：每写一段 classicMemories 都会变，计划 computed
            // 会跟着重算，边跑边取会把后面的段重新分组。
            try {
                for (let index = 0; index < groups.length; index++) {
                    if (signal.aborted) break;
                    if (memToolsScopeMoved(scopeId)) {
                        memToolsAuto.error = '角色或分支已经切换，已保存的部分会保留';
                        break;
                    }
                    const rows = groups[index];
                    const memories = rows.map(row => row.memory);
                    const start = rows[0].start;
                    const end = rows[rows.length - 1].end;
                    const label = memToolsAutoRangeLabel(start, end);
                    memToolsAuto.current = label;
                    // 来源必须还在：跑半途中用户删了某条 / 改了某条，这一段就不能写
                    const ids = memories.map(memory => String(memory && memory.id || ''));
                    const live = (Array.isArray(classicMemories.value) ? classicMemories.value : [])
                        .filter(memory => ids.includes(String(memory && memory.id || '')));
                    if (live.length !== ids.length) {
                        memToolsAuto.error = `${label}的来源记忆已经变了，之后的段落已停止`;
                        break;
                    }
                    let summary = '';
                    try {
                        summary = String(await memToolsAutoWithRetry(
                            () => requestMemToolsAutoSummary(memories, signal), label, signal
                        ) || '').trim();
                    } catch (error) {
                        if (error && error.name === 'AbortError') break;
                        memToolsAuto.error = `${label}压缩失败：${error?.message || error}（已保存 ${memToolsAuto.done} 段）`;
                        break;
                    }
                    if (signal.aborted) break;
                    if (memToolsScopeMoved(scopeId)) {
                        memToolsAuto.error = '角色或分支已经切换，已保存的部分会保留';
                        break;
                    }
                    if (!summary) {
                        memToolsAuto.error = `${label}模型没有返回有效总结，没有写入`;
                        break;
                    }
                    if (memToolsLooksLikeRefusal(summary)) {
                        memToolsAuto.error = `${label}模型返回的是拒绝回答，没有写入`;
                        break;
                    }
                    const merged = memToolsAutoMergedMemory(memories, summary);
                    const sourceSet = new Set(ids);
                    const ok = await memToolsWriteMemoryList(scopeId, list => [
                        ...list.filter(memory => !sourceSet.has(String(memory && memory.id || ''))),
                        merged
                    ], { memoryId: merged.id, sourceIds: ids });
                    if (!ok) {
                        // 骨架返回 false 有两种：写后校验不过、写入期间切了角色。
                        // 前者它自己弹 toast，这里只补后者的卡片提示。
                        if (memToolsScopeMoved(scopeId)) {
                            memToolsAuto.error = '角色或分支已经切换，已保存的部分会保留';
                        }
                        break;
                    }
                    // 跑完一段就钉住：中途停止后重跑不会把这一段再压一遍。
                    // 钉不住只是提示，不影响已经写进去的结果。
                    try {
                        memToolsPinned.list = memToolsPinRange(start, end);
                        await writeMemToolsPinned(scopeId, memToolsPinned.list);
                        memToolsPinned.loaded = true;
                    } catch (error) {
                        memToolsPinned.error = `固定标记保存失败：${error?.message || error}`;
                    }
                    memToolsAuto.done++;
                    memToolsAuto.notice = `已完成${label}（${memToolsAuto.done}/${groups.length}）`;
                }
                if (!memToolsAuto.error) {
                    memToolsAuto.notice = memToolsAuto.done === groups.length
                        ? `全部完成，共压缩 ${groups.length} 段`
                        : `已停止，完成 ${memToolsAuto.done}/${groups.length} 段，已保存的部分会保留`;
                }
            } finally {
                memToolsAuto.running = false;
                memToolsAuto.stopping = false;
                memToolsAuto.current = '';
                memToolsAuto.retryLeft = 0;
                memToolsAuto.retryMax = 0;
                _memToolsAutoAbort = null;
            }
        };
        // 冷停止：直接掐断在途请求。批量一段要跑几十秒，只置标记的话
        // 用户看到的就是「点了停止没反应」。
        const abortMemToolsAuto = () => {
            if (!memToolsAuto.running) return;
            memToolsAuto.stopping = true;
            try { if (_memToolsAutoAbort) _memToolsAutoAbort.abort(); } catch (error) { /* 已经结束 */ }
        };
        // ═══════════ 记忆工具 · 上下文提炼（2.8.70） ═══════════
        // 定位：把整段对话压成「人物档案 / 故事总纪事」，供用户自己贴进世界书或人设。
        // 三条硬线：① 只写自有键 rphub_mem_tools_extract，不碰 classic_memories
        //          ② 结果不自动进上下文、不进向量索引 —— 不复制就永远是草稿
        //          ③ 提示词照搬第三方工坊原文，只去掉首行 NSFW 声明
        const MEM_TOOLS_EXTRACT_KEY = 'rphub_mem_tools_extract';
        const MEM_TOOLS_EXTRACT_TAGS = {
            character: { tag: 'character', attr: 'name', fallback: '未命名人物', label: '人物' },
            story: { tag: 'story', attr: 'title', fallback: '未命名故事', label: '故事' }
        };
        const MEM_TOOLS_EXTRACT_PROMPT_CHARACTER = [
            "你是一名专精于长篇角色扮演与互动叙事的【专业级人物档案与世界书设定集整理器】。下面是角色扮演对话的完整上下文记录（包含逐轮总结与关键原文）。",
            "对话中玩家可能以“你”或其他名字被称呼，指代玩家时一律以对话里的实际称呼或名字为准，不得自行猜测姓名。",
            "任务：全面、详尽地提取上下文中真实登场或被明确提及的【全部人物】（包括主角、主要女主/男主、常驻配角、对手、具有剧情推动作用的路人、家属等，宁多勿漏），为每个人物输出一份详实饱满、可直接作为长期记忆世界书条目（Lorebook/Character Book）使用的深度立体独立档案。",
            "输出格式（必须严格遵守）：每个人物用一对标签包裹，形如 <character name=\"人物正式称呼\">档案正文</character>；标签外严禁输出任何解释、标题、前言、结语或代码块标记。标签之后的正文直到下一个标签之前，都视为该人物的档案内容。同一人物的不同称谓必须合并（name 取最正式完整名称）。",
            "【档案正文专业多维结构强制要求】（必须按以下 8 个方面分段深入详述，字数要充实饱满，拒绝空泛的性格形容词，全部落到具体动作、物件、原声台词与真实经历上，严禁一两句话草率概括；仅露一面且信息极少的纯路人可精简为 1、2、6、8 项）：",
            "1.【基本身份、社会定位与一句话定义】：",
            "  - 基础身份：正式全名、昵称/代号/外号（谁有资格叫）、名字的来历或替他说了什么；性别、年龄与生日或生命阶段、社会阶层与公开职业、所属势力/阵营/家庭、法定身份与户籍/学籍归属、当前实力等级或阶层位置。",
            "  - 一句话定义：主语是他的位置，谓语是他做的事，落点是他最在意的东西（严禁写“他是个复杂的人”这类空话）。",
            "2.【外貌轮廓、承重物与感官档案】：",
            "  - 辨识特征与体态：别人一眼认出他的记忆点；身高体型、发型发色、五官容貌神情、看人的眼神、肤色肤质、体态步姿与坐姿、手部细节（茧的位置、伤痕或常做的手部动作——把经历写在身上）。",
            "  - 着装与生活痕迹：典型着装风格与常服搭配细节、衣物状态（如袖口磨白、裤脚卷起、起球、缺扣等处境痕迹）及身上“一件不该在这或最显眼的东西”。",
            "  - 承重物与随身物品：具有纪念意义、命运分量或不可修复的专属配饰与核心物证（如耳钉、钢笔、项链、工牌、旧木簪、铁盒等）、日常随身物、以及“那件看似没用却一直带着的东西”（写明来历与紧张时最常摸哪一件）。",
            "  - 感官锚点与失控生理信号：身上的专属气味（如葱油味、洗衣粉味、冷铁味）、触觉温度、说话语调/声线特征；标志性小动作与微表情，尤其是情绪波动或嘴硬说“没事”时【自己控制不住的身体信号】（如耳根泛红、拇指扣紧某物、呼吸微滞半拍、咬下唇内侧等——嘴会撒谎，身体不会）。",
            "3.【深层人格剖析、性格调色盘与模式路由】：",
            "  - 模式三问（全部用动词和具体事回答）：① 遇事默认怎么处理？② 什么事在他眼里算“习以为常的正常”？③ 他脑子里有哪几个格子、没有哪几个格子？",
            "  - 性格调色盘（三层复合概念，格式为“[修饰语]+[核心特质]”，严禁单字标签）：",
            "    · 底色（最底层的人格基调与成因）",
            "    · 主色调（日常表现的主旋律与对外伪装，如表面阳光逞强/清冷守礼）",
            "    · 点缀（熟稔或破防时流露的反差、笨拙或软肋）",
            "    · 微场景衍生：结合上下文真实互动，还原体现其调色盘的典型微场景（触发情境 → 连续动作链 → 原声台词 → 收尾动作）。",
            "  - 壳与芯·多面模式切换：在不同场景/对象下的状态路由（如陌生防备模式 / 权威长辈模式 / 熟人模式 / 独处恢复模式 / 面对玩家时的专属模式 / 厌恶或应激模式），写明触发条件、能量状态、身体行为模式，以及从一面漏出另一面的“破壳渗透瞬间”。",
            "4.【视角锚定、底层动机与心理防线】：",
            "  - 视角锚定：进入场景第一眼看得见什么、什么就在眼前却看不见/不在意；时间朝向（朝前看/回头结算/只看当下）；过度揪着不放的小事。",
            "  - 核心动机与执念（排除法）：排除表面借口后，驱动他一切行为的唯一底层发动机；隐秘的欲望、追求的理想或执念，以及说不出口的“行为翻译”（如想留人却说外面下雨了）。",
            "  - 心理防线与崩溃刻度：行事逻辑准则、处事底线与偏执点；内心的恐惧/创伤、心理防御机制（如回避、反话、过度克制、预防性自我贬低）；决策优先顺序（用“A ＞ B ＞ C ＞ D”排列）；发怒阈值、软肋（具体到动作）、以及极端压力或突发事件下的应激反应模式与【崩溃刻度上限】（最坏反应到哪一步为止）。",
            "  - 最易误解（防漂移边界）：明确指出该角色“不是什么”（防刻板印象滑坡）。",
            "5.【声音指纹、原声声部与语言禁区】：",
            "  - 语言指纹：语速、句长、口癖/句尾习惯、结巴或停顿规律、称谓习惯（遮住名字能认出是谁）。",
            "  - 声部一·社会互动（摘录或还原上下文中极具代表性的对外原声台词 + 紧接其后的身体动作）。",
            "  - 声部二·〈〉内心独白（摘录或提炼他在事件背后的真实原声心声，展现嘴上与心里的温差）。",
            "  - 声部三·他者视角（上下文中其他角色对他的评价、印象或态度）。",
            "  - 语言禁区：他这辈子绝不会说出口的三类话，以及当他想表达该意思时被迫换成的替代行动。",
            "6.【日常小事、剧情关键经历与高光名场面（大事略写·小事详写）】：",
            "  - 过往背景与日常小事：精炼交代身世与过往创伤（时间+环境+身体受力）；详写日常作息时间表、生活半径、习惯吃什么、喜欢什么与讨厌什么（附具体理由与来历）、什么话题会让他瞬间沉默。",
            "  - 剧情关键经历与因果始末：在当前剧情中参与的所有重大转折事件与行动始末（必须写清时间、地点、具体行为、说过的代表性话语原意、带来的直接后果与影响，严禁一笔带过）。",
            "  - 高光时刻与标志性名场面：在剧情中令人印象深刻的情感爆发、决绝抉择、舍身付出或反差瞬间（细致还原当时的场景氛围、承重物细节、生理受力与心理状态）。",
            "7.【人际关系网与动态演变】：",
            "  - 与玩家角色的完整关系发展脉络：从初遇到当前的阶段演变（好感起伏、情感羁绊转折点、关键互动情景、说话姿态如何从“朝对方客气/戒备”变为“朝自己自问”或“把软肋交出来”、态度转变根源）。",
            "  - 与其他在场角色的纽带：亲疏远近、利益/恩怨账本、暗流、依赖或隔阂、同场时的视线与心理错位；在群体中的定位与社交动态。",
            "8.【当前状态、资产秘密、信息隔离与后续伏笔】：",
            "  - 当前状态与资产：身体健康与体能状态、心理情绪基调；当前确切所在地、正在做的事与行动去向；所持有的财产/关键物品/工具道具。",
            "  - 信息隔离总表（严防全知视角）：截至当前剧情，他【确切知道的事实与掌握的隐秘情报/心底秘密】、【明确不知道的信息】、【误解或猜错的事】。",
            "  - 承诺账单与后续伏笔：向他人许下的诺言/约定；未完成的愿望或正在推进的计划；推动他接下来行动或退缩的方向，以及留给未来剧情的 2~3 个具体悬念钩子。",
            "【篇幅动态分级原则（下限保底·上不封顶·严禁因篇幅长而删减过往与细节）】：",
            "严禁人为限制字数上限！每个人物的档案篇幅必须严格与其在上下文中的【戏份权重、经历跨度与信息丰富度】正相关，有几分料写几分货，宁长勿短：",
            "  - S级·核心主角/灵魂伴侣/长线核心角色（贯穿多轮剧情、有多重转折与海量互动细节）：【至少 1500 字以上，上不封顶（可写至 3000~5000+ 字）】。面对长篇故事，必须将第 6 项「剧情关键经历与因果始末」按时间演进拆分为多个子阶段逐一详述，所有背景身世、过往创伤、重要名场面、原声台词、承重物细节与关系演变节点必须全量收录，绝不允许概括省略。",
            "  - A级·重要常驻配角/关键反派/阶段性核心人物（参与过完整事件篇章、性格立体）：【不少于 800~1500 字，上不封顶】，完整覆盖 8 大维度，详写其核心交锋与关键互动。",
            "  - B级·次要功能性配角（有一定互动与背景，但出场集中在局部段落）：【不少于 400~800 字】，重点写清身份、特征、在事件中的具体作用与态度。",
            "  - C级·边缘路人/仅被提及的背景人物（仅露一面或活在台词里）：【不少于 150~300 字】，精简为 1、2、6、8 项，如实记录已知信息，不强行注水编造。",
            "【规范原则】：只依据提供上下文的真实信息，以客观严谨而细节扎实的第三人称叙述，严格区分客观事实与角色主观认知。只输出标签块本身。"
        ].join('\n');
        const MEM_TOOLS_EXTRACT_PROMPT_STORY = [
            "你是一名专精于长篇角色扮演与史诗长篇编年史的【专业级剧情纪事与故事线架构整理器】。下面是角色扮演对话的完整上下文记录（包含逐轮总结与关键原文）。",
            "对话中玩家可能以“你”或其他名字被称呼，指代玩家时一律以对话里的实际称呼或名字为准，不得自行猜测姓名。",
            "任务：把整段剧情从头到尾完整梳理并融合成【唯一一篇】脉络连贯、因果严密、细节极其详尽的【完整故事总纪事】（除非下方「本次额外要求」明确指定只提取某一部分/某几段剧情，否则严禁拆分成多个零散标签块，必须合成为一个从开端到当前结局的完整长篇故事）。",
            "输出格式（必须严格遵守）：整篇故事只用一对标签包裹，形如 <story title=\"故事总标题（或所提取段落的标题）\">故事正文</story>；标签外严禁输出任何解释、标题、前言、结语或代码块标记。标签之后的正文直到闭合标签之前，都视为该故事的内容。",
            "【故事正文专业纪事结构强制要求】（必须按以下 6 个方面在故事正文中分段深入详述，按时间演进将全篇来龙去脉与各阶段节点有机串联，杜绝流水账粗略概括，充分展现情节高亮点、具体物件与原声交锋）：",
            "1.【时空情境与场景氛围】：故事开端与各关键阶段的时间节点（具体天数、时辰或季节时令演进）、具体地理环境与空间格局转换、气候天气与光影声息（如暴风雨夜的海浪轰鸣、夏日午后的蝉鸣、室内的气味与温度）、在场的全部参与者及其入场/离场节点。",
            "2.【起因驱动与核心矛盾】：故事因何缘由触发，以及各阶段矛盾如何层层升级；各方角色的初始诉求、利益冲突、情感矛盾或外界危机（如台风即将来临、面临离别倒计时、开店筹备资金短缺等）；同场角色各自的算盘、视线与关注点的错位。",
            "3.【发展经过与交锋博弈】：剧情从头到尾的逐步推进过程与起承转合；人物之间的言语交锋、心理试探、误解、分歧与妥协；玩家角色与核心角色在各关键节点具有推动作用的行动与抉择；关键对话的核心原意、原声台词与潜台词。",
            "4.【高潮转折与细节高亮点】：故事中各重大冲突的最高峰与核心名场面（如生死关头的逆行救援、深夜的烛光坦白、意外的契约达成）；最具张力的肢体接触、生理受力反应或情绪决堤瞬间；场景中决定胜负或情感落定的标志性承重物与细节（如暴雨中死守的锚缆、飞奔递上的雨衣、签下的兼职约定、推过来的栗子、紧扣的剑鞘等，必须还原具体动作与物件，严禁用空泛形容词一笔带过）。",
            "5.【解决结果与处境变迁（收尾硬事实）】：各场危机或事件最终如何平息收尾，直到当前剧情终点的尘埃落定状态；各角色的最新处境、所在位置、身体状态（受伤/疲惫）与资产/物品归属变化；彼此之间的好感度跃迁、称呼改变与心理距离拉近；以及【信息流动结果】（经此全程，谁知道了什么真相、谁仍被蒙在鼓里或存有误会）。",
            "6.【契约余波与后续伏笔】：在整个故事历程中达成的正式契约、口头承诺、誓言或人情账单；截至当前仍未解决的遗留隐患或心结；收束时的最后一个具体画面，以及对下一阶段剧情产生的深远伏笔与推动力。",
            "【篇幅动态分级原则（按剧情跨度自适应·下限保底·上不封顶·严禁中后段草率压缩）】：",
            "严禁人为限制字数上限或为了赶进度而在中后段草草收尾！故事总纪事的篇幅必须根据上下文的【实际轮次跨度与事件密度】动态延展：",
            "  - 短篇/单幕局部剧情（如仅十余轮、单一事件或按额外要求提取局部片段）：【不少于 800~1500 字】，把单场事件的氛围、交锋与高光细节写透。",
            "  - 中长篇多幕剧情（包含 2~4 个明显的发展阶段或转折事件）：【不少于 2000~4000 字】，按阶段或幕次清晰铺陈，每一幕的起因、博弈与高潮细节均不得缩水。",
            "  - 超长篇史诗/百轮乃至千轮级完整长线：【至少 4000 字以上，上不封顶（可写至 6000~10000+ 字）】。面对长篇故事，必须在第 3 项「发展经过与交锋博弈」与第 4 项「高潮转折与细节高亮点」中【按时间线划分「第一幕/第一阶段、第二幕/第二阶段……」逐幕展开详述】，完整保留每一阶段的背景信息、人物过往揭秘、伏笔回收与名场面细节，严禁将几十轮的剧情压缩成一两句话带过！",
            "【规范原则】：以生动而严谨客观的第三人称史官叙述，按时间与因果逻辑从头到尾完整铺陈。默认只输出唯一一个 <story title=\"…\">…</story> 标签块本身。"
        ].join('\n');
        const memToolsExtract = reactive({
            running: '', error: '', notice: '', loading: false,
            entries: [], savedAt: 0
        });
        let _memToolsExtractAbort = null;
        // ═══════════ 记忆工具 · 载入外部对话文件（批次 3 / 2.8.76） ═══════════
        // 设计来源：工坊「导入对话」（_mw-payload-0.html #619 入口 / #1567 readFile /
        // #1487 normalizePayload）。只搬解析，不搬它的「数据源整体替换 + 导入版本库」
        // —— 我们只要一份轮次原文喂提炼；建第二套存储与批次 1/2「不碰官网存储之外的
        // 东西」的定调冲突。宿主自己也有「导入聊天记录」（工坊 #8184 注释对照过
        // RP-Hub 源码：整体替换目标角色的分支结构），那条路会动角色的聊天；这里纯
        // 内存态，只影响提炼请求的来源，关浮层即清。
        // 砍掉两项（用户已确认）：.png 角色卡图（多半只有 first_mes，为一条开场白背
        // 40 行二进制解析不划算）；文件内 classicMemories（提炼只消费对话原文）。
        // 三条硬线：
        //   ① 纯内存态：不写任何 IDB 键
        //   ② 读文件用 FileReader —— 官网既有 8 处同款；file.text() 是桌面 API，
        //      WebView 老内核未必有
        //   ③ 轮次配对直接调宿主 buildConversationTurnSnapshot —— 工坊 #1370/#1407
        //      两大段注释明写就是为对齐它而重写的，我们有真身
        const MEM_TOOLS_IMPORT_MAX_BYTES = 8 * 1024 * 1024;
        const MEM_TOOLS_IMPORT_MAX_TURNS = 300;
        const MEM_TOOLS_IMPORT_MAX_CHARS = 300000;
        const memToolsImport = reactive({
            name: '', turns: [], turnsText: '', chars: 0, busy: false, error: ''
        });
        let _memToolsImportToken = 0;
        const clearMemToolsImport = () => {
            // 递增 token：读取中的文件落地时发现已过期，不再写回状态
            _memToolsImportToken++;
            memToolsImport.name = '';
            memToolsImport.turns = [];
            memToolsImport.turnsText = '';
            memToolsImport.chars = 0;
            memToolsImport.error = '';
            memToolsImport.busy = false;
        };
        const memToolsImportLabel = computed(() => {
            if (memToolsImport.busy) return '正在读取对话文件…';
            if (memToolsImport.error) return memToolsImport.error;
            if (memToolsImport.name) {
                return `来源：导入文件 ${memToolsImport.name} · ${memToolsImport.turns.length} 轮 · ${memToolsImport.chars} 字`;
            }
            return '来源：当前角色记忆';
        });
        // 容错 JSON：工坊 parseJson 原文（#1174）—— 失败返 null，由调用方退下一个候选
        const parseMemToolsImportJson = text => {
            try { return JSON.parse(text); } catch (error) { return null; }
        };
        // 按扩展名分流（工坊 readFile #1571–1577 同款判据；.png 分支已砍）
        const parseMemToolsImportFile = (fileName, text) => {
            const name = String(fileName || '').toLowerCase();
            if (name.endsWith('.jsonl')) {
                const records = text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
                const first = records[0];
                if (first && first.type === 'rp-hub-branch-chat') {
                    return { manifest: first, records: records.slice(1) };
                }
                return records;
            }
            if (name.endsWith('.html') || name.endsWith('.htm')) {
                // 官网导出的对话页：数据在某个 <script> 里的对象字面量中。贪婪正则
                // 可能截错边界，所以每个候选单独试解析，失败退下一个（工坊
                // #1573–1575 的「尝试–失败–回落」结构）。
                const scripts = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
                for (const script of scripts) {
                    const candidate = script.match(/(?:window\.[A-Za-z0-9_]+\s*=|const\s+[A-Za-z0-9_]+\s*=)\s*(\{[\s\S]*\})\s*;?/)?.[1];
                    const parsed = candidate ? parseMemToolsImportJson(candidate) : null;
                    if (parsed) return parsed;
                }
                return { name: fileName.replace(/\.html?$/i, ''), first_mes: text.replace(/<[^>]+>/g, ' ').slice(0, 1000), chat_history: [] };
            }
            // .json / .txt：整体试完再按 JSONL 逐行试。纯文本对话没有角色标记，
            // 两条路都失败会走到 normalize 的「没有识别到对话」报错。
            return parseMemToolsImportJson(text) || (() => {
                const records = text.split(/\r?\n/).filter(Boolean)
                    .map(line => parseMemToolsImportJson(line)).filter(Boolean);
                return records;
            })();
        };
        // 形状识别（工坊 normalizePayload #1487–1519 同款判据，砍掉记忆相关分支）
        const normalizeMemToolsImport = (payload, fileName) => {
            let branches = [];
            let card = null;
            if (Array.isArray(payload)) {
                branches = [{ messages: payload }];
            } else if (payload && typeof payload === 'object') {
                if (payload.type === 'rp-hub-branch-chat'
                    || (payload.manifest && payload.manifest.type === 'rp-hub-branch-chat')) {
                    // 自家格式：manifest 行 + 每条分支一行 {branchId, messages}
                    const rawBranches = payload.records || payload.branchesData || [];
                    branches = rawBranches.map(item => ({ messages: item.messages || [] }));
                }
                if (!branches.length && Array.isArray(payload.branches)) {
                    branches = payload.branches.map(b => ({ messages: b.messages || b.chat || [] }));
                }
                if (!branches.length && Array.isArray(payload.messages)) branches = [{ messages: payload.messages }];
                if (!branches.length && Array.isArray(payload.chat)) branches = [{ messages: payload.chat }];
                if (payload.character && typeof payload.character === 'object') card = payload.character;
                else if (payload.data && typeof payload.data === 'object') card = payload.data;
                else if (payload.name || payload.first_mes || payload.description) card = card || payload;
                if (!branches.length && card && Array.isArray(card.chat_history) && card.chat_history.length) {
                    branches = [{ messages: card.chat_history }];
                }
            }
            if (!branches.length && card && card.first_mes) {
                branches = [{ messages: [{ role: 'assistant', content: card.first_mes }] }];
            }
            if (!branches.length) {
                throw new Error('没有识别到 user/assistant 对话消息。支持 .jsonl / .json / .txt / .html 四种 RP-Hub 或 SillyTavern 导出的对话文件');
            }
            return { branches };
        };
        const applyMemToolsImportPayload = (payload, fileName) => {
            const normalized = normalizeMemToolsImport(payload, fileName);
            // 多分支取第一个有消息的分支，不做分支下拉 —— 移动端浮层里再嵌一层选择太深
            const withMessages = normalized.branches
                .filter(b => Array.isArray(b.messages) && b.messages.length);
            if (!withMessages.length) {
                throw new Error('文件里没有对话消息。支持 .jsonl / .json / .txt / .html 四种 RP-Hub 或 SillyTavern 导出的对话文件');
            }
            const snapshot = buildConversationTurnSnapshot(withMessages[0].messages, { includeSystem: false });
            const turns = (snapshot && Array.isArray(snapshot.turns) ? snapshot.turns : []);
            if (!turns.length) throw new Error('没有识别到 user/assistant 对话消息');
            if (turns.length > MEM_TOOLS_IMPORT_MAX_TURNS) {
                throw new Error(`这份对话有 ${turns.length} 轮，超过 ${MEM_TOOLS_IMPORT_MAX_TURNS} 轮上限，请分批或裁短后再载入`);
            }
            // 块格式与默认来源的原文块一致（【第 N 轮 · 原文】玩家/角色），
            // 只把「最近两轮」放开为全量
            const blocks = turns.map(turnInfo => {
                const userText = String(getMemoryMessageText(turnInfo.user) || '').trim();
                const replyText = String(getMemoryMessageText(turnInfo.assistant) || '').trim();
                return `【第 ${turnInfo.turn} 轮 · 原文】\n玩家：${userText}\n角色：${replyText}`;
            });
            const turnsText = blocks.join('\n\n');
            const chars = memToolsTextLength(turnsText);
            if (chars > MEM_TOOLS_IMPORT_MAX_CHARS) {
                throw new Error(`这份对话有 ${chars} 字，超过 ${MEM_TOOLS_IMPORT_MAX_CHARS} 字上限，请分批或裁短后再载入`);
            }
            memToolsImport.name = fileName;
            memToolsImport.turns = turns;
            memToolsImport.turnsText = turnsText;
            memToolsImport.chars = chars;
            memToolsImport.error = '';
        };
        const pickMemToolsImportFile = () => {
            if (memToolsImport.busy) return;
            const input = document.getElementById('rphub-memtools-import-file');
            if (input) input.click();
        };
        const readMemToolsImportFile = event => {
            const input = event && event.target;
            const file = input && input.files && input.files[0];
            // 同一个文件允许再选一次：不重置 value 的话第二次选同一文件不触发 change
            if (input) input.value = '';
            if (!file) return;
            if (file.size > MEM_TOOLS_IMPORT_MAX_BYTES) {
                memToolsImport.error = `文件 ${(file.size / 1048576).toFixed(1)} MB 超过 8 MB 上限，请分批或改用更短的对话`;
                return;
            }
            // 读文件是异步的：连着选两个文件时，只有最后选中的那个结果应该落地
            // （工坊 #8258 selectionToken 同款防竞态）
            const token = ++_memToolsImportToken;
            memToolsImport.busy = true;
            memToolsImport.error = '';
            const reader = new FileReader();
            reader.onload = () => {
                if (token !== _memToolsImportToken) return;
                memToolsImport.busy = false;
                try {
                    applyMemToolsImportPayload(
                        parseMemToolsImportFile(file.name, String(reader.result || '')), file.name);
                } catch (error) {
                    memToolsImport.error = `载入失败：${error && error.message ? error.message : error}`;
                }
            };
            reader.onerror = () => {
                if (token !== _memToolsImportToken) return;
                memToolsImport.busy = false;
                memToolsImport.error = '文件读取失败，请重试';
            };
            reader.readAsText(file);
        };
        // 上下文 = 全部启用记忆的总结（按区间升序）。补最近两轮原文是因为 8 维要求大量
        // 「原声台词 / 生理信号」，总结是第三人称转述，里面根本没有原声。
        const memToolsExtractSource = computed(() => {
            const list = (Array.isArray(classicMemories.value) ? classicMemories.value : [])
                .filter(memory => memory && memory.enabled !== false)
                .map(memory => ({ memory, range: memToolsRange(memory) }))
                .sort((a, b) => a.range.start - b.range.start);
            const blocks = list.map(({ memory, range }) => {
                const span = range.end > range.start ? `${range.start}–${range.end}` : `${range.start}`;
                return `【第 ${span} 轮】\n${String(memory.summary || '').trim()}`;
            });
            const text = blocks.join('\n\n');
            return { count: list.length, chars: memToolsTextLength(text), blocks };
        });
        const memToolsExtractTotal = computed(() => (memToolsExtract.entries || [])
            .reduce((sum, entry) => sum + memToolsTextLength(entry?.text), 0));
        const buildMemToolsExtractMessages = kind => {
            const parts = [];
            // 批次 3：载入外部对话文件后整份替换默认来源。外部文件只有原文、没有
            // 总结，块格式就是全量「第 N 轮 · 原文」；最近两轮原文也不再追加——
            // 导入的已是全量原文，再拼一份只关于最近两轮的说明是重复的。
            if (memToolsImport.turnsText) {
                parts.push(memToolsImport.turnsText);
            } else {
                const source = memToolsExtractSource.value;
                if (source.blocks.length) parts.push(source.blocks.join('\n\n'));
                try {
                    const snapshot = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false });
                    const turns = (snapshot && Array.isArray(snapshot.turns) ? snapshot.turns : []).slice(-2);
                    const raw = turns.map(turnInfo => {
                        const userText = String(getMemoryMessageText(turnInfo.user) || '').slice(0, 4000).trim();
                        const replyText = String(getMemoryMessageText(turnInfo.assistant) || '').slice(0, 4000).trim();
                        if (!userText && !replyText) return '';
                        return `【第 ${turnInfo.turn} 轮 · 原文】\n玩家：${userText}\n角色：${replyText}`;
                    }).filter(Boolean);
                    if (raw.length) {
                        parts.push(`【以下是最近几轮原文，只用来提取原声台词与现场细节，不要重复概述】\n${raw.join('\n\n')}`);
                    }
                } catch (error) {
                    // 原文取不到不影响主流程，总结本身已经够用
                }
            }
            return [
                { role: 'system', content: memToolsExtractPromptFor(kind) },
                { role: 'user', content: parts.join('\n\n') }
            ];
        };
        // 标签解析：模型被 max_tokens 截断时没有闭合标签，剩下的一律算作最后一条，别整份丢掉
        const parseMemToolsExtract = (text, kind) => {
            const spec = MEM_TOOLS_EXTRACT_TAGS[kind];
            const raw = String(text || '');
            const open = new RegExp(`<${spec.tag}\\s+${spec.attr}\\s*=\\s*(["'])([\\s\\S]*?)\\1\\s*>`, 'gi');
            const entries = [];
            let match;
            while ((match = open.exec(raw)) !== null) {
                const bodyStart = open.lastIndex;
                const closeIndex = raw.toLowerCase().indexOf(`</${spec.tag}>`, bodyStart);
                const body = String(closeIndex >= 0 ? raw.slice(bodyStart, closeIndex) : raw.slice(bodyStart)).trim();
                if (closeIndex >= 0) open.lastIndex = closeIndex + spec.tag.length + 3;
                if (body) {
                    entries.push({
                        id: generateUUID(),
                        kind,
                        label: String(match[2] || '').trim() || spec.fallback,
                        text: body
                    });
                }
                if (closeIndex < 0) break;
            }
            return entries;
        };
        const runMemToolsExtract = async kind => {
            const spec = MEM_TOOLS_EXTRACT_TAGS[kind];
            memToolsExtract.error = '';
            memToolsExtract.notice = '';
            if (!spec || memToolsExtract.running) return;
            const scopeId = memToolsScopeId.value;
            if (!scopeId) { memToolsExtract.error = '先选一个角色'; return; }
            if (!_classicMemoriesLoaded) { memToolsExtract.error = '记忆还没加载完，稍后再试'; return; }
            if (!String(memorySettings.classicModel || '').trim()) { memToolsExtract.error = '请先在记忆设置里选总结模型'; return; }
            // 批次 3：有外部对话文件时不该被「这个角色还没有记忆」拦住
            if (!memToolsExtractSource.value.count && !memToolsImport.turns.length) {
                memToolsExtract.error = '这个角色还没有记忆，先攒几轮再来，或先载入一份对话文件';
                return;
            }
            memToolsExtract.running = kind;
            _memToolsExtractAbort = new AbortController();
            try {
                const requestMessages = buildMemToolsExtractMessages(kind);
                // 首次的 user 内容留着：续写要把它原样当上下文，不能事后重新拼 ——
                // 用户中途改了记忆，重新拼出来的和模型上轮看到的就不是一回事了。
                memToolsExtractRawUser[kind] = String(requestMessages[1] && requestMessages[1].content || '');
                memToolsExtractRaw[kind] = '';
                memToolsExtractContinueRound[kind] = 0;
                const text = await requestClassicMemoryCompletion(
                    requestMessages, _memToolsExtractAbort.signal
                );
                if (memToolsScopeMoved(scopeId)) {
                    memToolsExtract.error = '角色或分支已经切换，本次提炼结果已丢弃';
                    return;
                }
                // 原始输出留着：被截断时靠它当 assistant 消息续写
                memToolsExtractRaw[kind] = String(text || '');
                const parsed = parseMemToolsExtract(text, kind);
                if (!parsed.length) {
                    memToolsExtract.error = `模型没有按 <${spec.tag} ${spec.attr}="…"> 标签输出，这次结果拆不出条目`;
                    return;
                }
                // 只替换同类型的旧条目：重生成人物档案不该把已经好的故事纪事冲掉
                const kept = (memToolsExtract.entries || []).filter(entry => entry.kind !== kind);
                memToolsExtract.entries = [...kept, ...parsed];
                memToolsExtract.notice = `已拆出 ${parsed.length} 条${spec.label}，改完记得保存`;
            } catch (error) {
                if (error && error.name === 'AbortError') memToolsExtract.error = '已取消';
                else memToolsExtract.error = `提炼失败：${error?.message || error}`;
            } finally {
                memToolsExtract.running = '';
                _memToolsExtractAbort = null;
            }
        };
        const abortMemToolsExtract = () => {
            if (_memToolsExtractAbort) _memToolsExtractAbort.abort();
        };
        const loadMemToolsExtract = async () => {
            const scopeId = memToolsScopeId.value;
            memToolsExtract.loading = true;
            memToolsExtract.error = '';
            try {
                if (!scopeId) { memToolsExtract.entries = []; memToolsExtract.savedAt = 0; return; }
                const raw = await getScopedStoredValue(MEM_TOOLS_EXTRACT_KEY, scopeId);
                if (memToolsScopeMoved(scopeId)) return;
                const list = raw && Array.isArray(raw.entries) ? raw.entries : [];
                memToolsExtract.entries = list
                    .filter(entry => entry && String(entry.text || '').trim())
                    .map(entry => ({
                        id: String(entry.id || generateUUID()),
                        kind: entry.kind === 'story' ? 'story' : 'character',
                        label: String(entry.label || ''),
                        text: String(entry.text || '')
                    }));
                memToolsExtract.savedAt = Number(raw && raw.updatedAt) || 0;
            } catch (error) {
                memToolsExtract.error = `读取提炼结果失败：${error?.message || error}`;
            } finally {
                memToolsExtract.loading = false;
            }
        };
        const saveMemToolsExtract = async () => {
            memToolsExtract.error = '';
            memToolsExtract.notice = '';
            const scopeId = memToolsScopeId.value;
            if (!scopeId) { memToolsExtract.error = '先选一个角色'; return; }
            const entries = (memToolsExtract.entries || [])
                .map(entry => ({
                    id: String(entry.id || ''),
                    kind: entry.kind === 'story' ? 'story' : 'character',
                    label: String(entry.label || '').trim(),
                    text: String(entry.text || '').trim()
                }))
                .filter(entry => entry.text);
            if (!entries.length) { memToolsExtract.error = '没有可保存的条目'; return; }
            try {
                await setScopedStoredValue(MEM_TOOLS_EXTRACT_KEY, scopeId, { entries, updatedAt: Date.now() }, { clone: false });
                if (memToolsScopeMoved(scopeId)) {
                    memToolsExtract.error = '角色或分支已经切换，本次保存已写入原角色，请刷新后确认';
                    return;
                }
                memToolsExtract.savedAt = Date.now();
                memToolsExtract.notice = `已保存 ${entries.length} 条，不会自动进上下文`;
                showToast(`已保存 ${entries.length} 条提炼结果`);
            } catch (error) {
                memToolsExtract.error = `保存失败：${error?.message || error}`;
            }
        };
        const clearMemToolsExtract = async () => {
            const scopeId = memToolsScopeId.value;
            if (!scopeId) return;
            if (!(memToolsExtract.entries || []).length && !memToolsExtract.savedAt) return;
            const confirmed = await showVueConfirmModal('清空提炼结果', '删掉这个角色的全部提炼条目？记忆本身不受影响。');
            if (!confirmed) return;
            try {
                await setScopedStoredValue(MEM_TOOLS_EXTRACT_KEY, scopeId, { entries: [], updatedAt: Date.now() }, { clone: false });
                memToolsExtract.entries = [];
                memToolsExtract.savedAt = 0;
                memToolsExtract.error = '';
                memToolsExtract.notice = '';
                showToast('已清空提炼结果');
            } catch (error) {
                memToolsExtract.error = `清空失败：${error?.message || error}`;
            }
        };
        const removeMemToolsExtractEntry = id => {
            memToolsExtract.entries = (memToolsExtract.entries || []).filter(entry => entry.id !== id);
            memToolsExtract.notice = '';
        };
        const copyMemToolsExtract = entry => {
            const text = String(entry && entry.text || '');
            if (!text) return;
            navigator.clipboard.writeText(text)
                .then(() => showToast('已复制，去粘到世界书或人设里'))
                .catch(() => showToast('复制失败，请长按文本框手动复制', 'error'));
        };
        // ═══════════ 记忆工具 · 导出与存档版本操作（2.8.72） ═══════════
        // 导出走 AndroidBridge.saveFile（MediaStore 落盘），浏览器端退回 blob 下载。
        // 不能靠 assets/download-hook.js：它只注入灯塔独立窗口；主 WebView 的
        // DownloadListener 明确跳过 blob:/data:（字节在渲染进程，DownloadManager 拿不到）。
        // 也不能直接复用 cardUtils.downloadBlob：它非 App 环境直接 return，浏览器里静默无输出。
        const MEM_TOOLS_EXPORT_MAX_BYTES = 8 * 1024 * 1024;
        const memToolsExportFileName = (base, ext) => {
            const name = String(currentCharacter.value?.name || '').trim() || '角色';
            const now = new Date();
            const pad = value => String(value).padStart(2, '0');
            const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
                + `-${pad(now.getHours())}${pad(now.getMinutes())}`;
            // 文件名里带 / \ : * ? " < > | 或空白都可能被系统拒绝，一律压成下划线
            const safe = `${base}-${name}-${stamp}`.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 80);
            return `${safe}.${ext}`;
        };
        const memToolsDownload = (fileName, mimeType, text) => {
            const body = String(text || '');
            if (!body) { showToast('没有可导出的内容', 'error'); return false; }
            const size = new Blob([body]).size;
            if (size > MEM_TOOLS_EXPORT_MAX_BYTES) {
                showToast(`内容约 ${(size / 1048576).toFixed(1)}MB，超过 8MB 上限，先精简再导出`, 'error');
                return false;
            }
            const bridge = window.AndroidBridge;
            if (bridge && typeof bridge.saveFile === 'function') {
                try {
                    // MIME 不带 charset：MediaStore 只认标准类型，参数部分可能被拒
                    bridge.saveFile(cardUtils.encodeBase64Utf8(body), fileName, mimeType);
                    showToast(`已保存到下载目录：${fileName}`);
                    return true;
                } catch (error) {
                    // 桥抛错就往下走浏览器路径，别让用户什么也拿不到
                }
            }
            try {
                const blob = new Blob([body], { type: `${mimeType};charset=utf-8` });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 3000);
                showToast(`已开始下载：${fileName}`);
                return true;
            } catch (error) {
                showToast(`导出失败：${error?.message || error}`, 'error');
                return false;
            }
        };
        // 同一份「记忆数组 → 可读文本」既给导出用、也给版本查看用，避免两处格式跑偏
        const memToolsMemoriesText = memories => {
            const list = (Array.isArray(memories) ? memories : [])
                .filter(memory => memory && memory.enabled !== false)
                .map(memory => ({ memory, range: memToolsRange(memory) }))
                .sort((a, b) => a.range.start - b.range.start);
            return list.map(({ memory, range }) => {
                const span = range.end > range.start ? `${range.start}–${range.end}` : `${range.start}`;
                return `【第 ${span} 轮】\n${String(memory.summary || '').trim()}`;
            }).join('\n\n');
        };
        const memToolsExportEntries = () => {
            const entries = (memToolsExtract.entries || []).map(entry => ({
                kind: entry.kind === 'story' ? 'story' : 'character',
                label: String(entry.label || '').trim(),
                text: String(entry.text || '')
            }));
            if (!entries.length) { showToast('还没有提炼结果', 'error'); return; }
            memToolsDownload(memToolsExportFileName('提炼结果', 'json'), 'application/json',
                JSON.stringify({
                    type: 'rphub-mem-tools-extract',
                    character: String(currentCharacter.value?.name || ''),
                    exportedAt: new Date().toISOString(),
                    entries
                }, null, 2));
        };
        const memToolsExportConversation = () => {
            const text = memToolsMemoriesText(classicMemories.value);
            if (!text) { showToast('这个角色还没有记忆', 'error'); return; }
            memToolsDownload(memToolsExportFileName('记忆', 'txt'), 'text/plain', text);
        };
        const memToolsExportVersion = version => {
            const text = memToolsMemoriesText(version && version.memories);
            if (!text) { showToast('这一版没有内容', 'error'); return; }
            memToolsDownload(memToolsExportFileName('记忆存档', 'txt'), 'text/plain', text);
        };
        const copyMemToolsVersion = version => {
            const text = memToolsMemoriesText(version && version.memories);
            if (!text) { showToast('这一版没有内容', 'error'); return; }
            navigator.clipboard.writeText(text)
                .then(() => showToast('已复制这一版的全部记忆'))
                .catch(() => showToast('复制失败，可以点「查看」后长按选', 'error'));
        };
        // 查看面板：点开才拼文本，列表渲染不做无用功
        const memToolsVersionView = reactive({ open: false, title: '', text: '' });
        const memToolsVersionOpenId = ref('');
        const toggleMemToolsVersionOpen = versionId => {
            const id = String(versionId || '');
            memToolsVersionOpenId.value = memToolsVersionOpenId.value === id ? '' : id;
        };
        const memToolsVersionFind = versionId => {
            const id = String(versionId || '');
            if (!id) return null;
            return (memToolsVersions.list || [])
                .find(item => String(item.versionId || item.id || '') === id) || null;
        };
        const openMemToolsVersionView = (versionId, mode) => {
            const node = memToolsVersionFind(versionId);
            if (!node) { showToast('找不到这一版存档', 'error'); return; }
            const parent = mode === 'parent' ? memToolsVersionFind(node.parentVersionId) : null;
            if (mode === 'parent' && !parent) { showToast('这一版没有父版本', 'error'); return; }
            const target = parent || node;
            memToolsVersionView.title = parent ? '上一版（父版本）' : '这一版';
            memToolsVersionView.text = memToolsMemoriesText(target.memories) || '（这一版是空的）';
            memToolsVersionView.open = true;
        };
        const closeMemToolsVersionView = () => { memToolsVersionView.open = false; };
        const copyMemToolsVersionView = () => {
            const text = String(memToolsVersionView.text || '');
            if (!text) return;
            navigator.clipboard.writeText(text)
                .then(() => showToast('已复制'))
                .catch(() => showToast('复制失败，请长按文本手动复制', 'error'));
        };
        // ═══════════ 记忆工具 · 自由提问（2.8.72） ═══════════
        // 只保留最近几轮问答：requestClassicMemoryCompletion 传不了 max_tokens，
        // 我们也没有 token 估算工具，输入越长越容易被截断。宁可丢早的问答，
        // 也不让整次请求超长 —— 这是相对工坊按 token 预算裁剪的降级实现。
        const MEM_TOOLS_ASK_KEEP_ROUNDS = 3;
        const MEM_TOOLS_ASK_SYSTEM = '你是记忆检索助手。下面会给出一段角色记忆条目和最近几轮对话原文，'
            + '请只根据这些内容回答问题：能查到就照原文说，查不到就明确说记忆里没有，不要编造。'
            + '回答用简体中文，简洁直接，不要复述问题，不要加标题，不要输出 Markdown 表格。';
        const memToolsAsk = reactive({ open: false, question: '', running: false, error: '', rounds: [] });
        let _memToolsAskAbort = null;
        const openMemToolsAsk = () => { memToolsAsk.open = true; };
        const closeMemToolsAsk = () => {
            if (memToolsAsk.running) abortMemToolsAsk();
            memToolsAsk.open = false;
        };
        const buildMemToolsAskMessages = question => {
            const parts = [];
            const source = memToolsExtractSource.value;
            if (source.blocks.length) parts.push(source.blocks.join('\n\n'));
            try {
                const snapshot = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false });
                const turns = (snapshot && Array.isArray(snapshot.turns) ? snapshot.turns : []).slice(-2);
                const raw = turns.map(turnInfo => {
                    const userText = String(getMemoryMessageText(turnInfo.user) || '').slice(0, 4000).trim();
                    const replyText = String(getMemoryMessageText(turnInfo.assistant) || '').slice(0, 4000).trim();
                    if (!userText && !replyText) return '';
                    return `【第 ${turnInfo.turn} 轮 · 原文】\n玩家：${userText}\n角色：${replyText}`;
                }).filter(Boolean);
                if (raw.length) parts.push(`【最近几轮原文】\n${raw.join('\n\n')}`);
            } catch (error) {
                // 原文取不到不影响问答，记忆条目本身已经够用
            }
            // 上下文塞进 system，历史问答只留裸 Q/A —— 否则每轮都要重发一遍整段记忆
            const history = (memToolsAsk.rounds || [])
                .filter(item => item && item.answer && !item.pending)
                .slice(-MEM_TOOLS_ASK_KEEP_ROUNDS);
            const messages = [{
                role: 'system',
                content: `${MEM_TOOLS_ASK_SYSTEM}\n\n【记忆条目与最近原文】\n${parts.join('\n\n')}`
            }];
            history.forEach(item => {
                messages.push({ role: 'user', content: String(item.question || '') });
                messages.push({ role: 'assistant', content: String(item.answer || '') });
            });
            messages.push({ role: 'user', content: String(question || '') });
            return messages;
        };
        const runMemToolsAsk = async () => {
            const question = String(memToolsAsk.question || '').trim();
            memToolsAsk.error = '';
            if (!question) { memToolsAsk.error = '先写要问什么'; return; }
            if (memToolsAsk.running) return;
            const scopeId = memToolsScopeId.value;
            if (!scopeId) { memToolsAsk.error = '先选一个角色'; return; }
            if (!_classicMemoriesLoaded) { memToolsAsk.error = '记忆还没加载完，稍后再试'; return; }
            if (!String(memorySettings.classicModel || '').trim()) { memToolsAsk.error = '请先在记忆设置里选总结模型'; return; }
            if (!memToolsExtractSource.value.count) { memToolsAsk.error = '这个角色还没有记忆，先攒几轮再来'; return; }
            memToolsAsk.running = true;
            _memToolsAskAbort = new AbortController();
            const item = { id: generateUUID(), question, answer: '', pending: true };
            memToolsAsk.rounds = [...(memToolsAsk.rounds || []), item];
            memToolsAsk.question = '';
            try {
                const text = await requestClassicMemoryCompletion(
                    buildMemToolsAskMessages(question), _memToolsAskAbort.signal
                );
                if (memToolsScopeMoved(scopeId)) {
                    memToolsAsk.rounds = (memToolsAsk.rounds || []).filter(row => row.id !== item.id);
                    memToolsAsk.error = '角色或分支已经切换，本次回答已丢弃';
                    return;
                }
                const answer = String(text || '').trim();
                memToolsAsk.rounds = (memToolsAsk.rounds || []).map(row => row.id === item.id
                    ? { ...row, answer: answer || '（模型没有返回内容）', pending: false }
                    : row);
            } catch (error) {
                memToolsAsk.rounds = (memToolsAsk.rounds || []).filter(row => row.id !== item.id);
                // 把问题放回输入框：失败不该让用户重打一遍
                memToolsAsk.question = question;
                if (error && error.name === 'AbortError') memToolsAsk.error = '已取消';
                else memToolsAsk.error = `提问失败：${error?.message || error}`;
            } finally {
                memToolsAsk.running = false;
                _memToolsAskAbort = null;
            }
        };
        const abortMemToolsAsk = () => {
            if (_memToolsAskAbort) _memToolsAskAbort.abort();
        };
        const clearMemToolsAsk = () => {
            if (memToolsAsk.running) return;
            memToolsAsk.rounds = [];
            memToolsAsk.error = '';
        };
        const copyMemToolsAskAnswer = item => {
            const text = String(item && item.answer || '');
            if (!text) return;
            navigator.clipboard.writeText(text)
                .then(() => showToast('已复制回答'))
                .catch(() => showToast('复制失败，请长按文本手动复制', 'error'));
        };
        // ═══════════ 记忆工具 · 版本树 / 续写 / 提示词（2.8.71） ═══════════
        // 版本树只加元数据，不做增量补丁。三条理由：
        //   ① 官网存 chainPatches 是被「同一批轮次反复重新总结」逼的，全量存会按版本数 × 轮次膨胀；
        //      我们上限 10 份全量快照，200 条 × 300 字 ≈ 60KB/份，总量可忽略。
        //   ② rebase 补丁是官网最脆的一环（removeSyncVersion 里三处 try/catch 全为兜它）。
        //      全量快照的子节点内容自包含，删父节点只需改指针，一个字节的内容都不用重算。
        //   ③ memories 每条是 summary 自由文本，没有稳定主键，patch 的 diff 粒度根本定不出来。
        // 树也不需要嵌套结构 —— 「数组 + 每条的 parentVersionId」本身就是树。
        const MEM_TOOLS_VERSIONS_CURRENT_KEY = 'rphub_mem_tools_versions_current';
        const MEM_TOOLS_EXTRACT_PROMPT_KEY = 'rphub_mem_tools_extract_prompt';
        const MEM_TOOLS_EXTRACT_MAX_CONTINUE = 3;

        // 当前记忆内容落在哪个节点上。不能拿「列表里最新那份」顶替：
        // 用户回滚到老节点后再存档，父指针该指向「我这份是从哪来的」，而不是「最新的是谁」。
        const memToolsVersionsCurrentId = ref('');
        const readMemToolsVersionsCurrent = async scopeId => {
            if (!scopeId) return '';
            try {
                const raw = await getScopedStoredValue(MEM_TOOLS_VERSIONS_CURRENT_KEY, scopeId);
                return String(raw && raw.versionId || '');
            } catch (error) {
                return '';
            }
        };
        // 老存档（2.8.70 及以前）没有 versionId / parentVersionId / type。
        // 只在内存里归一化、不写回 —— 打开页面就触发一次写库没有意义，下次存档自然落成新格式。
        const normalizeMemToolsVersions = list => {
            const arr = (Array.isArray(list) ? list : [])
                .filter(version => version && Array.isArray(version.memories));
            const asc = arr.slice().sort((a, b) => (Number(a && a.createdAt) || 0) - (Number(b && b.createdAt) || 0));
            const parentOf = new Map();
            let prevId = '';
            asc.forEach(version => {
                const vid = String(version.versionId || version.id || '');
                parentOf.set(vid, prevId);
                prevId = vid;
            });
            return arr.map(version => {
                const vid = String(version.versionId || version.id || '');
                const legacy = !version.versionId;
                const rawType = String(version.type || '');
                return {
                    ...version,
                    id: String(version.id || vid),
                    versionId: vid,
                    // 老数据按 createdAt 升序串成一条线性链 —— 它们本来就是「一路存下来」的
                    parentVersionId: legacy ? (parentOf.get(vid) || null) : (version.parentVersionId || null),
                    type: rawType === 'auto' || rawType === 'manual'
                        ? rawType
                        : (String(version.label || '').indexOf('自动存档') >= 0 ? 'auto' : 'manual')
                };
            });
        };
        const loadMemToolsVersionsCurrent = async () => {
            const scopeId = memToolsScopeId.value;
            if (!scopeId) { memToolsVersionsCurrentId.value = ''; return; }
            if (memToolsScopeMoved(scopeId)) return;
            memToolsVersions.list = normalizeMemToolsVersions(memToolsVersions.list);
            const stored = await readMemToolsVersionsCurrent(scopeId);
            if (memToolsScopeMoved(scopeId)) return;
            const list = memToolsVersions.list || [];
            let current = stored;
            if (!current || !list.some(version => String(version.versionId) === current)) {
                const latest = list.slice()
                    .sort((a, b) => (Number(b && b.createdAt) || 0) - (Number(a && a.createdAt) || 0))[0];
                current = latest ? String(latest.versionId || '') : '';
            }
            memToolsVersionsCurrentId.value = current;
        };
        // 删节点 / 淘汰时，把它的子节点挂到它的父上。子节点内容自包含，只改指针，不重算。
        const memToolsVersionsRebaseChildren = (list, removedId, parentId) => {
            const stamp = Date.now();
            return (Array.isArray(list) ? list : []).map(version => {
                if (!version || String(version.parentVersionId || '') !== String(removedId)) return version;
                return {
                    ...version,
                    parentVersionId: parentId ? String(parentId) : null,
                    rebasedFromVersionId: String(removedId),
                    rebasedAt: stamp
                };
            });
        };
        const memToolsVersionsRemoveNode = (list, removedId) => {
            const arr = Array.isArray(list) ? list : [];
            const target = arr.find(version => version
                && String(version.versionId || version.id || '') === String(removedId));
            const rest = arr.filter(version => !(version
                && String(version.versionId || version.id || '') === String(removedId)));
            return memToolsVersionsRebaseChildren(rest, removedId, target && target.parentVersionId);
        };
        // 上限淘汰：按 createdAt 找最老的砍，砍之前先 rebase 它的子节点。
        // 老实现是 slice(0, MAX) 直接截断 —— 树形下那会砍出孤儿。
        // B1: 当前所在节点受保护，否则淘汰完「当前」指针指向一个已不存在的版本。
        const memToolsVersionsPrune = (list, max, protectedId = '') => {
            const limit = Math.max(1, Number(max) || 10);
            const keepId = String(protectedId || '');
            let arr = Array.isArray(list) ? list.slice() : [];
            let guard = 0;
            while (arr.length > limit && guard < 64) {
                guard += 1;
                // createdAt 只有毫秒精度，连着存两份会打平。打平时不能靠 sort 的稳定性：
                // 列表是新→旧排的，稳定排序会把「最新那份」当成最老的先砍掉。
                // 所以同 createdAt 时以「数组位置更靠后 = 更老」兜底，判据完全确定。
                let victimIndex = -1;
                let victimAt = 0;
                for (let i = 0; i < arr.length; i += 1) {
                    const id = String(arr[i] && (arr[i].versionId || arr[i].id) || '');
                    if (keepId && id === keepId) continue;
                    const at = Number(arr[i] && arr[i].createdAt) || 0;
                    if (victimIndex < 0 || at <= victimAt) { victimAt = at; victimIndex = i; }
                }
                const victim = victimIndex >= 0 ? arr[victimIndex] : null;
                if (!victim) break;
                arr = memToolsVersionsRemoveNode(arr, String(victim.versionId || victim.id || ''));
            }
            return arr;
        };
        // 树深度：沿 parentVersionId 往上数。加环保护 —— 老数据万一被手改成环，这里不能死循环。
        const memToolsNodeDepth = version => {
            const list = memToolsVersions.list || [];
            const byId = new Map(list.map(item => [String(item.versionId || item.id || ''), item]));
            let depth = 0;
            let cursor = version;
            const seen = new Set();
            while (cursor && cursor.parentVersionId && depth < 20) {
                const pid = String(cursor.parentVersionId);
                if (seen.has(pid)) break;
                seen.add(pid);
                const parent = byId.get(pid);
                if (!parent) break;
                depth += 1;
                cursor = parent;
            }
            return depth;
        };
        const memToolsVersionsCurrent = computed(() => {
            const id = String(memToolsVersionsCurrentId.value || '');
            if (!id) return null;
            return (memToolsVersions.list || [])
                .find(version => String(version.versionId || version.id || '') === id) || null;
        });
        // 「已偏离」：当前记忆内容已经不等于所在节点了。不监听编辑事件，渲染时比一次字段指纹。
        const memToolsVersionsDrifted = computed(() => {
            const node = memToolsVersionsCurrent.value;
            if (!node || !Array.isArray(node.memories)) return false;
            return memToolsMemorySignature(classicMemories.value) !== memToolsMemorySignature(node.memories);
        });

        // ── 续写：模型被长度上限截断时，把上轮原始输出当 assistant 消息接下去写 ──
        // 不能事后重新拼一份上下文：用户中途改了记忆，重新拼出来的和模型上轮看到的就不是一回事了。
        const memToolsExtractRaw = reactive({ character: '', story: '' });
        const memToolsExtractRawUser = reactive({ character: '', story: '' });
        const memToolsExtractContinueRound = reactive({ character: 0, story: 0 });
        const memToolsExtractHasUnclosed = (text, kind) => {
            const spec = MEM_TOOLS_EXTRACT_TAGS[kind] || MEM_TOOLS_EXTRACT_TAGS.character;
            const s = String(text || '').toLowerCase();
            const tag = spec.tag.toLowerCase();
            const open = (s.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
            const close = (s.match(new RegExp('</' + tag + '>', 'g')) || []).length;
            return open > close;
        };
        const memToolsExtractNeedsContinue = kind => {
            const key = kind === 'story' ? 'story' : 'character';
            return !!String(memToolsExtractRaw[key] || '')
                && memToolsExtractHasUnclosed(memToolsExtractRaw[key], key);
        };
        const memToolsExtractContinueLeft = kind => {
            const key = kind === 'story' ? 'story' : 'character';
            return Math.max(0, MEM_TOOLS_EXTRACT_MAX_CONTINUE - (Number(memToolsExtractContinueRound[key]) || 0));
        };
        // 续写会重复输出上一个已完成的条目（模型习惯「接上」而不是「接着写」），
        // 同名条目按「正文更长者胜」合并，避免同一个人物出现两条。
        const memToolsExtractDedupe = entries => {
            const order = [];
            const byName = new Map();
            (Array.isArray(entries) ? entries : []).forEach(entry => {
                const key = String(entry && entry.label || '').replace(/\s+/g, '');
                const prev = byName.get(key);
                if (!prev) { byName.set(key, entry); order.push(key); return; }
                if (String(entry.text || '').length > String(prev.text || '').length) byName.set(key, entry);
            });
            return order.map(key => byName.get(key));
        };
        const buildMemToolsExtractContinueMessages = (kind, collected) => {
            const spec = MEM_TOOLS_EXTRACT_TAGS[kind] || MEM_TOOLS_EXTRACT_TAGS.character;
            const messages = [
                { role: 'system', content: memToolsExtractPromptFor(kind) },
                { role: 'user', content: String(memToolsExtractRawUser[kind] || '') },
                { role: 'assistant', content: String(collected || '') }
            ];
            if (memToolsExtractHasUnclosed(collected, kind)) {
                const tail = String(collected || '').slice(-120).replace(/\s+/g, ' ');
                messages.push({
                    role: 'user',
                    content: '你的上一轮输出在标签尚未闭合处被长度上限截断（断点末尾为：「…' + tail + '」）。请直接紧接在断点最后一个字之后继续往下写剩余正文（严禁重新输出开头的 <' + spec.tag + '> 标签或重复前文），写完后务必输出闭合标签 </' + spec.tag + '>' + (kind === 'character' ? '，并继续输出尚未列出的其他人物标签块' : '') + '。'
                });
            } else {
                messages.push({
                    role: 'user',
                    content: '继续输出尚未列出的' + spec.label + '。只输出新的 <' + spec.tag + ' ' + spec.attr + '="…">…</' + spec.tag + '> 标签块，不要重复已输出的内容，也不要写任何解释。'
                });
            }
            return messages;
        };
        const continueMemToolsExtract = async kind => {
            const spec = MEM_TOOLS_EXTRACT_TAGS[kind];
            if (!spec || memToolsExtract.running) return;
            const key = kind === 'story' ? 'story' : 'character';
            const collected = String(memToolsExtractRaw[key] || '');
            memToolsExtract.error = '';
            memToolsExtract.notice = '';
            if (!collected) { memToolsExtract.error = '这一份还没有生成结果，先点生成'; return; }
            if (!memToolsExtractContinueLeft(key)) {
                memToolsExtract.error = '已经续写 ' + MEM_TOOLS_EXTRACT_MAX_CONTINUE + ' 轮了，再写下去容易跑偏，建议直接改正文';
                return;
            }
            const scopeId = memToolsScopeId.value;
            if (!scopeId) { memToolsExtract.error = '先选一个角色'; return; }
            memToolsExtract.running = key;
            _memToolsExtractAbort = new AbortController();
            try {
                const chunk = await requestClassicMemoryCompletion(
                    buildMemToolsExtractContinueMessages(key, collected), _memToolsExtractAbort.signal
                );
                if (memToolsScopeMoved(scopeId)) {
                    memToolsExtract.error = '角色或分支已经切换，本次续写结果已丢弃';
                    return;
                }
                // 停在标签内部：无缝拼（模型若重复了开头标签先剥掉）；停在标签之间：换行拼
                const inTag = memToolsExtractHasUnclosed(collected, key);
                const nextText = String(chunk || '');
                const stripped = inTag
                    ? nextText.replace(new RegExp('^\\s*<' + spec.tag + '\\b[^>]*>', 'i'), '')
                    : nextText;
                const merged = inTag ? (collected + stripped) : (collected + '\n\n' + stripped);
                memToolsExtractRaw[key] = merged;
                memToolsExtractContinueRound[key] = (Number(memToolsExtractContinueRound[key]) || 0) + 1;
                const parsed = memToolsExtractDedupe(parseMemToolsExtract(merged, key));
                const kept = (memToolsExtract.entries || []).filter(entry => entry.kind !== key);
                memToolsExtract.entries = [...kept, ...parsed];
                memToolsExtract.notice = memToolsExtractHasUnclosed(merged, key)
                    ? ('续写后仍有标签没闭合，已拆出 ' + parsed.length + ' 条' + spec.label + '，可以再补一轮')
                    : ('已续写完成，共 ' + parsed.length + ' 条' + spec.label + '，改完记得保存');
            } catch (error) {
                if (error && error.name === 'AbortError') memToolsExtract.error = '已取消';
                else memToolsExtract.error = '续写失败：' + (error && error.message ? error.message : error);
            } finally {
                memToolsExtract.running = '';
                _memToolsExtractAbort = null;
            }
        };

        // ── 提示词可编辑：override 存 localStorage，全局一份，空串表示用默认 ──
        // 走 localStorage 而不是按 scopeId 的 IDB，是跟 memToolsConfig 保持一致：
        // 提示词是对「提炼方法」的调校，跟具体角色无关。
        const memToolsExtractPrompt = reactive({ character: '', story: '' });
        const readMemToolsExtractPromptOverride = () => {
            try {
                const raw = JSON.parse(localStorage.getItem(MEM_TOOLS_EXTRACT_PROMPT_KEY) || '{}');
                return raw && typeof raw === 'object' ? raw : {};
            } catch (error) {
                return {};
            }
        };
        const loadMemToolsExtractPrompt = () => {
            const stored = readMemToolsExtractPromptOverride();
            memToolsExtractPrompt.character = String(stored.character || '');
            memToolsExtractPrompt.story = String(stored.story || '');
        };
        const memToolsExtractPromptFor = kind => {
            const raw = kind === 'story' ? memToolsExtractPrompt.story : memToolsExtractPrompt.character;
            const override = String(raw || '').trim();
            if (override) return override;
            return kind === 'story' ? MEM_TOOLS_EXTRACT_PROMPT_STORY : MEM_TOOLS_EXTRACT_PROMPT_CHARACTER;
        };
        const saveMemToolsExtractPrompt = kind => {
            const key = kind === 'story' ? 'story' : 'character';
            const text = String(memToolsExtractPrompt[key] || '').trim();
            if (!text) { showToast('内容为空，想用默认就点「恢复默认」', 'error'); return; }
            try {
                const next = { ...readMemToolsExtractPromptOverride(), [key]: text };
                localStorage.setItem(MEM_TOOLS_EXTRACT_PROMPT_KEY, JSON.stringify(next));
                showToast('提示词已保存，下次生成就用这份');
            } catch (error) {
                showToast('保存失败：本地存储写不进去', 'error');
            }
        };
        const resetMemToolsExtractPrompt = kind => {
            const key = kind === 'story' ? 'story' : 'character';
            try {
                const next = { ...readMemToolsExtractPromptOverride() };
                delete next[key];
                localStorage.setItem(MEM_TOOLS_EXTRACT_PROMPT_KEY, JSON.stringify(next));
            } catch (error) {
                // 存不下也不影响内存里恢复默认
            }
            memToolsExtractPrompt[key] = '';
            showToast('已恢复默认提示词');
        };
        // ═══════════ 记忆工具 · 单条重试（批次 1，2.8.74） ═══════════
        // 不用官网的 requestClassicMemorySummary：它的收尾句写死「只总结第 N 轮」，
        // 多轮范围会把范围外的内容丢掉。这里自己写收尾句，system 仍用官网原文。
        const requestMemToolsRangeSummary = async (job, signal) => {
            const messages = [{
                role: 'system',
                content: BUILTIN_PROMPTS.buildClassicSummarySystemPrompt({
                    userName: user.name,
                    characterName: currentCharacter.value?.name
                })
            }];
            job.contextTurns.forEach(turnInfo => {
                if (!turnInfo) return;
                const marker = turnInfo.isTarget
                    ? `【最新对话：唯一总结目标｜第 ${turnInfo.turn} 轮】`
                    : `【历史背景：仅供理解，不得作为总结目标｜第 ${turnInfo.turn} 轮】`;
                if (turnInfo.userContent) {
                    messages.push({ role: 'user', content: `${marker}\n${turnInfo.userContent}` });
                }
                if (turnInfo.assistantContent) {
                    messages.push({ role: 'assistant', content: `${marker}\n${turnInfo.assistantContent}` });
                }
            });
            messages.push({
                role: 'user',
                content: `上方内容是待整理资料。请只总结标记为“最新对话：唯一总结目标”的全部内容（第 ${job.start}${job.end !== job.start ? `–${job.end}` : ''} 轮），逐项核对有效事实与变化，压缩重复表达，只输出总结正文。`
            });
            return requestClassicMemoryCompletion(messages, signal);
        };
        // 组装重试用的 job：目标段整段，外加目标段前最多 3 轮当背景。
        // 目标段内每一轮都标 isTarget，所以收尾句说的是「全部内容」而不是最后一轮。
        const memToolsRetryJob = row => {
            const start = Number(row && row.start) || 1;
            const end = Math.max(start, Number(row && row.end) || start);
            const snapshot = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false });
            const turns = Array.isArray(snapshot && snapshot.turns) ? snapshot.turns : [];
            const targets = turns.filter(turnInfo => Number(turnInfo && turnInfo.turn) >= start
                && Number(turnInfo && turnInfo.turn) <= end);
            // 原文已被裁掉：宁可让用户知道只能手动改，也不静默写空
            if (!targets.length) return null;
            const firstIndex = turns.indexOf(targets[0]);
            const context = turns.slice(Math.max(0, firstIndex - 3), firstIndex + targets.length);
            return {
                start, end,
                contextTurns: context.map(turnInfo => {
                    const turn = Number(turnInfo && turnInfo.turn) || 0;
                    return {
                        turn,
                        userContent: getMemoryMessageText(turnInfo.user),
                        assistantContent: getMemoryMessageText(turnInfo.assistant),
                        isTarget: turn >= start && turn <= end
                    };
                })
            };
        };
        // ═══════════ 记忆工具结束 ═══════════
        const memoryBackfillProgress = ref({ status: 'idle', message: '', phase: '', stages: [] });
        const retryingClassicMemoryId = ref('');
        let _isApplyingCharacterScopedData = false;
        let _classicMemoriesLoaded = false;
        let _characterSwitchEpoch = 0;
        let _characterSwitchSavePromise = Promise.resolve();
        let _initComplete = false; // 守卫标志：防止 onMounted 初始化阶段写入默认值覆盖服务端数据

        // --- Active Tool System State ---
        const normalizeActiveToolAggressiveness = (value) => (
            ACTIVE_TOOL_AGGRESSIVENESS_OPTIONS.some(option => option.value === value)
                ? value
                : ACTIVE_TOOL_AGGRESSIVENESS_ADAPTIVE
        );
        const getActiveToolAggressiveness = () => {
            const normalized = normalizeActiveToolAggressiveness(settings.activeToolAggressiveness);
            if (settings.activeToolAggressiveness !== normalized) {
                settings.activeToolAggressiveness = normalized;
            }
            return normalized;
        };
        const getActiveToolAggressivenessLabel = () => (
            ACTIVE_TOOL_AGGRESSIVENESS_OPTIONS.find(option => option.value === getActiveToolAggressiveness())?.label || '自适应'
        );
        const getActiveToolLatestUserReminder = () => ACTIVE_TOOL_REMINDERS[getActiveToolAggressiveness()];
        const normalizeActiveToolAggressivenessSettings = () => {
            settings.activeToolAggressiveness = normalizeActiveToolAggressiveness(settings.activeToolAggressiveness);
            delete settings.activeToolAggressivenessVersion;
        };
        const activeTools = ref(getDefaultActiveToolDefinitions());
        // loadData 是否真的从库里读过 active_tools。整段 loadData 只有一个 try，
        // 前面任何一步读失败都会跳过 active_tools 那两行；此时内存里只剩默认工具（空 Tavily 密钥），
        // 启动那次 saveData 若照常写回，就等于把用户配好的密钥永久抹掉。
        let _activeToolsLoaded = false;

        const normalizeKeepFloors = (value, min, max, fallback) => {
            const floors = Number(value);
            if (!Number.isFinite(floors)) return fallback;
            return Math.max(min, Math.min(max, Math.round(floors / 2) * 2));
        };

        const normalizeClassicMemoryConcurrency = (value) => {
            const concurrency = Number(value);
            if (!Number.isFinite(concurrency)) return CLASSIC_MEMORY_DEFAULT_CONCURRENCY;
            return Math.max(CLASSIC_MEMORY_MIN_CONCURRENCY, Math.min(CLASSIC_MEMORY_MAX_CONCURRENCY, Math.round(concurrency)));
        };

        const normalizeMemorySettings = () => {
            if (!memorySettings.classicModel && memorySettings.model) {
                memorySettings.classicModel = String(memorySettings.model).trim();
            }
            const fields = new Set(['enabled', 'mode', 'embeddingModel', 'classicModel', 'summaryKeepFloors', 'classicConcurrency', 'memoryApiUrl', 'memoryApiKey',
                // 2.7.82：防误触锁必须在白名单里，否则 normalizeMemorySettings 会把这两个键 delete 掉，锁定状态重启即丢。
                'keepFloorsLocked', 'concurrencyLocked']);
            Object.keys(memorySettings).forEach(key => {
                if (!fields.has(key)) delete memorySettings[key];
            });
            // 只迁移旧模式选择，不读取旧分片。
            memorySettings.mode = [MEMORY_MODE_ENHANCED, 'vector'].includes(memorySettings.mode)
                ? MEMORY_MODE_ENHANCED : MEMORY_MODE_CLASSIC;
            memorySettings.classicModel = String(memorySettings.classicModel || '').trim();
            memorySettings.embeddingModel = String(memorySettings.embeddingModel || '').trim();
            memorySettings.summaryKeepFloors = normalizeKeepFloors(
                memorySettings.summaryKeepFloors,
                SUMMARY_KEEP_FLOORS_MIN,
                SUMMARY_KEEP_FLOORS_MAX,
                SUMMARY_KEEP_FLOORS_DEFAULT
            );
            memorySettings.classicConcurrency = normalizeClassicMemoryConcurrency(memorySettings.classicConcurrency);
            memorySettings.memoryApiUrl = String(memorySettings.memoryApiUrl || '').trim();
            memorySettings.memoryApiKey = String(memorySettings.memoryApiKey || '').trim();
        };

        const normalizeActiveToolCallName = (value) => {
            const raw = String(value || '').trim();
            const matched = raw.match(/^<\s*([^:\s>]+)\s*:/);
            const source = matched ? matched[1] : raw;
            return source
                .replace(/[<>：:]/g, '')
                .replace(/\s+/g, '_')
                .trim() || 'tool_grep';
        };

        const normalizeActiveToolBaseCallName = (value) => normalizeActiveToolCallName(value)
            .replace(/_(?:add|cover)$/i, '');

        const getActiveToolResultCountMin = () => ACTIVE_TOOL_MIN_RESULT_COUNT;

        const getActiveToolResultCountMax = () => ACTIVE_TOOL_MAX_RESULT_COUNT;

        const normalizeActiveTool = (tool = {}) => {
            // 默认参数只吃 undefined，不吃 null ⇒ 数组里混进 null 时 tool.resultCount 直接抛 TypeError，
            // 而这个函数在 loadData 的大 try 里被调用，一抛就把它后面的所有键一起带走（active_tools 首当其冲）。
            if (!tool || typeof tool !== 'object') return null;
            const resultCount = Number(tool.resultCount);
            const rawCallName = normalizeActiveToolBaseCallName(tool.callName || tool.callPattern || 'tool_grep');
            const isLegacyWebTool = rawCallName === 'tool_web'
                || ['web_search', 'tavily', 'tavily_search'].includes(tool.type)
                || ['tool_web', 'tool_web_add', 'tool_web_cover'].includes(tool.id)
                || /tavily|联网搜索/i.test(String(tool.name || ''));
            const callName = isLegacyWebTool ? 'tool_web' : rawCallName;
            const defaultTool = getDefaultActiveToolDefinitions()
                .find(item => item.id === (isLegacyWebTool ? 'tool_web' : tool.id) || item.callName === callName);
            if (!defaultTool) return null;
            const fallback = defaultTool;
            if (fallback.type === ACTIVE_TOOL_RANDOM_TYPE) return { ...fallback, enabled: tool.enabled !== false };
            const normalizedCallName = fallback.callName;
            const resultCountVersion = Number(tool.resultCountVersion) || 1;
            const normalizedType = fallback.type;
            const countMin = getActiveToolResultCountMin();
            const countMax = getActiveToolResultCountMax();
            let normalizedResultCount = Number.isFinite(resultCount)
                ? Math.max(countMin, Math.min(countMax, Math.round(resultCount)))
                : (fallback.resultCount || ACTIVE_TOOL_DEFAULT_RESULT_COUNT);
            if (resultCountVersion < ACTIVE_TOOL_RESULT_COUNT_VERSION
                && normalizedType !== ACTIVE_TOOL_WEB_TYPE
                && (!Number.isFinite(resultCount) || Math.round(resultCount) <= ACTIVE_TOOL_MIN_RESULT_COUNT || Math.round(resultCount) === 10)) {
                normalizedResultCount = ACTIVE_TOOL_DEFAULT_RESULT_COUNT;
            }
            const normalized = {
                id: fallback.id,
                name: fallback.name,
                enabled: tool.enabled !== false,
                type: normalizedType,
                callName: normalizedCallName,
                resultCount: normalizedResultCount,
                resultCountVersion: ACTIVE_TOOL_RESULT_COUNT_VERSION,
                description: fallback.description,
                displayDescription: fallback.displayDescription
            };
            if (normalizedType === ACTIVE_TOOL_WEB_TYPE) {
                normalized.tavilyApiKey = String(tool.tavilyApiKey || tool.apiKey || fallback.tavilyApiKey || '').trim();
            }
            return normalized;
        };

        const normalizeActiveTools = (items = activeTools.value) => {
            const normalized = [];
            (Array.isArray(items) ? items : [])
                .map(normalizeActiveTool)
                .filter(tool => tool)
                .forEach(tool => {
                    const duplicateIndex = normalized.findIndex(item => item.id === tool.id || item.callName === tool.callName);
                    if (duplicateIndex >= 0) {
                        normalized[duplicateIndex] = {
                            ...normalized[duplicateIndex],
                            enabled: normalized[duplicateIndex].enabled || tool.enabled
                        };
                        return;
                    }
                    normalized.push(tool);
                });
            getDefaultActiveToolDefinitions().forEach(defaultTool => {
                const hasDefaultTool = normalized.some(tool => tool.id === defaultTool.id || tool.callName === defaultTool.callName);
                if (!hasDefaultTool) normalized.push(defaultTool);
            });
            if (JSON.stringify(activeTools.value) !== JSON.stringify(normalized)) {
                activeTools.value = normalized;
            }
            return normalized;
        };

        const estimatedGenerationTime = computed(() => {
            if (recentGenerationTimes.value.length === 0) return null;
            const total = recentGenerationTimes.value.reduce((sum, item) => {
                // Compatibility: handle both number and object
                const duration = typeof item === 'number' ? item : item.duration;
                return sum + duration;
            }, 0);
            return (total / recentGenerationTimes.value.length / 1000).toFixed(1);
        });

        const showWorldInfoSettings = ref(false);
        const showMemorySettings = ref(true);
        const settingsHelpTopic = ref('');
        // 工具页「工具全局设置」折叠状态：纯 UI 状态，用 localStorage（同步读写，没有初始化竞态）。
        // 原来是裸 ref(false)，每次重进工具页都重新折叠，配好设置再进来还得再展开一次。
        const ACTIVE_TOOL_SETTINGS_OPEN_KEY = 'rphub_active_tool_settings_open';
        const showActiveToolSettings = ref((() => {
            try { return localStorage.getItem(ACTIVE_TOOL_SETTINGS_OPEN_KEY) === '1'; } catch (e) { return false; }
        })());
        watch(showActiveToolSettings, (open) => {
            try { localStorage.setItem(ACTIVE_TOOL_SETTINGS_OPEN_KEY, open ? '1' : '0'); } catch (e) { /* 写不进去就算了 */ }
        });
        const showUiTemplateSettings = ref(false);
        const worldInfoSettings = reactive({
            scanDepth: 2,
            maxDepth: 0,
        });

        // Editing States
        const editingCharacter = reactive({ id: undefined, data: {} });
        const editorTab = ref('basic'); // 'basic', 'description', 'personality', 'first_mes'
        const isBatchDeleteMode = ref(false);
        const characterGridView = ref(localStorage.getItem('rp-character-layout') !== 'deck');
        watch(characterGridView, value => localStorage.setItem('rp-character-layout', value ? 'grid' : 'deck'));
        const characterDeck = ref(null);
        const useCharacterDeck = computed(() => !isBatchDeleteMode.value && !characterGridView.value);
        const selectedCharacterIndices = ref(new Set());
        const editingPreset = reactive({ id: undefined, data: {} });
        const editingUiTemplate = reactive({ id: undefined, data: {}, tab: 'history' });
        const editingRegex = reactive({ id: undefined, data: {} });
        const editingWorldInfo = reactive({ id: undefined, data: {} });
        const worldInfoKeysText = ref('');
        const editingActiveTool = reactive({ id: undefined, data: {} });

        const showContextViewerModal = ref(false);
        const showStoryBranchModal = ref(false);
        const showStoryBranchNameEditor = ref(false);
        const storyBranchNameDraft = ref('');
        const storyBranches = ref([]);
        const activeStoryBranchId = ref('main');
        const storyBranchSwitching = ref(false);
        const selectedStoryBranchId = ref('main');
        const storyRouteMapDragging = ref(false);
        let storyRouteDragState = null;
        let suppressStoryRouteNodeClick = false;
        const lastContextMessages = ref([]);
        const lastTriggeredWorldInfos = ref([]);
        const lastContextTotalLength = computed(() => lastContextMessages.value.reduce(
            (total, message) => total + String(message?.content || '').length,
            0
        ));
        const CHARACTER_SCOPED_STORAGE_NAMES = ['chat', 'classic_memories', 'branches'];
        const {
            clearTokenUsageHistory,
            displayedTokenUsageHistory,
            filteredTokenUsageHistory,
            formatTokenAggregate,
            formatLatestTokenCount,
            formatTokenCount,
            formatTokenUsageTime,
            getTokenUsageCategory,
            getUncachedInputTokens,
            recordApiUsage,
            showTokenUsageTimeFilter,
            tokenUsageFilter,
            tokenUsageHistory,
            tokenUsagePage,
            tokenUsagePageCount,
            tokenUsageStats,
            tokenUsageTimeFilter,
            tokenUsageTimeFilterLabel,
            tokenUsageTimeFilterOptions,
            latestMainTokenUsage
        } = useTokenUsage({
            pageSize: LIST_PAGE_SIZE,
            cloneForStorage,
            getTokenUsageLimit: () => Number(settings.tokenUsageRetentionLimit) || 1000,
            confirm: (...args) => confirmAction(...args),
            ensureStorage: async () => {
                if (!getMainDb()) await initDB();
            },
            generateUUID,
            getApiKey: () => settings.apiKey,
            getApiUrl: () => settings.apiUrl,
            normalizeApiUsage,
            saveStoredValue: setStoredValue,
            toast: (...args) => showToast(...args)
        });
        const requestTrackedChatCompletion = (options, type) => {
            const apiUrl = settings.apiUrl;
            const request = { url: buildApiEndpoint(apiUrl, 'chat/completions'), apiKey: settings.apiKey, ...options };
            // 2.7.87：url 被 options 覆盖成模板专用站后，统计口径要跟着走，
        // 否则变量分析这条用量会挂到聊天站名下。取 url 末段前的站点根。
        const usageApiUrl = String(request.url || apiUrl)
            .replace(/\/+$/, '')
            .replace(/\/(?:chat\/completions|models|embeddings)$/i, '') || apiUrl;
        return requestChatCompletion({ ...request, onUsage: (usage, metrics) => recordApiUsage(usage, {
                type, model: request.model, apiUrl: usageApiUrl, apiKey: request.apiKey, ...metrics
            }) });
        };
        const {
            cloudBackup,
            closeCloudBackup,
            copyCloudBackupKey,
            formatCloudBackupTime,
            openCloudBackup,
            startCloudBackup,
            startCloudRestore
        } = window.RPHubCloudBackup.useCloudBackup({
            saveAll: async () => {
                if (isConversationBusy.value || isClassicBatchExtracting.value) throw new Error('请先停止当前生成或记忆补录，再进行备份');
                await flushPendingChatHistorySave();
                return saveData({ saveMemories: !!currentCharacter.value });
            },
            decode: value => restoreRphubBinaryDeep(value),
            toast: (...args) => showToast(...args),
            transfer: {
                start: beginBackupTask,
                progress: value => Object.assign(backupTask, { percent: value.percent, message: value.label, detail: value.detail }),
                finish: () => { backupTask.active = false; },
                fail: error => Object.assign(backupTask, { locked: !!error.recoveryRequired, recovery: !!error.recoveryRequired,
                    error: error.message || String(error), message: error.recoveryRequired ? '需要恢复原数据' : '操作未完成，请重试' })
            }
        });
        // Export Modal State
        const backupScope = ref({
            chat: true,
            summary: true,
            uiRuntime: true,
            tokenUsage: true,
            localData: true
        });
        // 2.7.85：备份范围开关此前是纯 ref，不落盘 ⇒ 刷新/重启后回到全 true，
        // 用户「关掉省空间」等于没关，且无提示。改为独立键 backup_scope 持久化。
        const BACKUP_SCOPE_KEY = 'backup_scope';
        const BACKUP_SCOPE_DEFAULTS = {
            chat: true, summary: true, uiRuntime: true, tokenUsage: true, localData: true
        };
        // 只落合法布尔键：防止旧文件/手改文件里的多余键污染 backupScope.value。
        const normalizeBackupScope = (raw) => {
            const source = raw && typeof raw === 'object' ? raw : {};
            const next = { ...BACKUP_SCOPE_DEFAULTS };
            Object.keys(BACKUP_SCOPE_DEFAULTS).forEach(key => {
                if (typeof source[key] === 'boolean') next[key] = source[key];
            });
            return next;
        };
        let _backupScopeSaveTimer = null;
        watch(backupScope, () => {
            if (_backupScopeSaveTimer) clearTimeout(_backupScopeSaveTimer);
            _backupScopeSaveTimer = setTimeout(() => {
                _backupScopeSaveTimer = null;
                if (!getMainDb()) return;   // 初始化前不写，避免把默认值覆盖到已有数据
                const payload = {};
                Object.keys(BACKUP_SCOPE_DEFAULTS).forEach(key => {
                    payload[key] = backupScope.value[key] !== false;
                });
                setStoredValue(BACKUP_SCOPE_KEY, payload).catch(error =>
                    console.warn('保存备份范围开关失败:', error));
            }, 400);
        }, { deep: true });
        // ---- 每日自动备份（首启后台自动轮转备份 - 真实本地文件版）----
        const AUTO_BACKUP_CONFIG_KEY = 'auto_backup_config';
        // 2.8.14：后台备份体积闸门与退避常量；2.8.19 起闸门口径由「渲染进程堆余量」改为
        // 「单份备份文件体积上限」。写入已改单遍流式（峰值堆 O(1 条)），堆不再是瓶颈；
        // 原来按 performance.memory / deviceMemory 动态收紧的逻辑，正是「数据涨过阈值后
        // 自动备份永久跳过」的成因，故移除。手动触发不受闸门限制（与全量导出一致）。
        const AUTO_BACKUP_SIZE_LIMIT_BYTES = 250 * 1024 * 1024;
        // [rphub 2.8.97] 闸门放宽后的硬顶：再大的单份备份在手机上还原本身就不现实。
        const AUTO_BACKUP_SIZE_CEILING_BYTES = 1024 * 1024 * 1024;
        const AUTO_BACKUP_SKIP_BACKOFF_MS = 6 * 60 * 60 * 1000; // 超限跳过后 6 小时内不重试
        const AUTO_BACKUP_FAIL_BACKOFF_MS = 30 * 60 * 1000;     // 失败后 30 分钟内不重试
        const AUTO_BACKUP_BUSY_DELAY_MS = 30 * 1000;            // 正在出卡时顺延
        // [rphub 2.8.102] 顺延次数上限。旧实现是无上限递归重排：一直忙就一直排，
        //   既不放弃也不留痕，用户只会看到「自动备份从来没跑过」。
        const AUTO_BACKUP_BUSY_MAX_DEFER = 10;                  // ≈5 分钟后放弃
        let _backupBusyDeferCount = 0;
        // 2.8.19：不再按堆余量动态收紧 —— 写入已流式化，内存不再是约束。
        // 这里只是一个纯粹的文件体积 sanity ceiling（等「流式恢复」落地后可再抬高）。
        // [rphub 2.8.97] 上面这条仍然成立，本条只补「放宽」的另一半：
        //   250MB 是 2.8.14 按「还原还没流式化」的时代定的兜底。用户实测堆 2222MB /
        //   可还原 816MB，256MB 的库被 250MB 卡住 ⇒ 自动备份长期停摆，而设备吃得下。
        //   所以闸门跟还原上限走：max(250MB, 还原上限 × 0.9)。
        //   **只取 max，绝不取 min** —— 按堆收紧正是 2.8.19 之前「数据涨过阈值后自动
        //   备份永久跳过」的成因，那条路不能重走；小内存设备闸门仍是不变的 250MB。
        //   getRestoreBudget 定义在本函数之后，靠调用时机求值；万一有人在它之前调用，
        //   try/catch 会静默退回 250MB，不会抛 ReferenceError。
        const getAutoBackupSizeLimit = () => {
            try {
                const byBudget = Math.floor(getRestoreBudget().maxFileBytes * 0.9);
                if (byBudget > AUTO_BACKUP_SIZE_LIMIT_BYTES) {
                    return Math.min(byBudget, AUTO_BACKUP_SIZE_CEILING_BYTES);
                }
            } catch (_) {}
            return AUTO_BACKUP_SIZE_LIMIT_BYTES;
        };

        // [rphub 2.8.94] 备份体积归桶：纯诊断，不参与任何写入决策。
        //   目的：把「数据量较大」这句零信息量的提示，换成「到底是哪一类数据撑爆的」。
        //   不改变备份内容、顺序、字节数，只在写入过程中顺手累加一份账。
        const backupBucketOf = (logicalKey) => {
            const key = String(logicalKey || '');
            if (key.startsWith('chat_')) return '聊天记录';
            if (key === 'characters') return '角色卡';
            if (key.startsWith('classic_memories_') || key.startsWith('b1_memory_state_')) return '记忆';
            if (key.startsWith('memories_')) return '旧记忆';
            if (key === 'worldinfo' || key === 'global_worldinfo') return '世界书';
            if (key === 'global_ui_templates') return 'UI 模板';
            if (key === 'branches' || key.startsWith('branches_')) return '分支';
            if (key === 'token_usage_history') return '用量记录';
            if (key === 'presets' || key === 'preset_groups') return '预设';
            if (key === 'regex' || key === 'global_regex') return '正则';
            if (key === 'settings' || key === 'worldinfo_settings' || key === 'memory_settings') return '设置';
            if (key === 'user' || key === 'user_profiles' || key === 'active_profile_id') return '个人设定';
            return '其他';
        };
        const fmtBackupMB = (bytes) => (Math.round((Number(bytes) || 0) / 1048576 * 10) / 10) + 'MB';
        // 按体积降序取前 N 个桶，附带每桶条目数
        const rankBackupBuckets = (bucketStat, topN) => [...bucketStat.entries()]
            .map(([name, stat]) => ({ name, bytes: stat.bytes, entries: stat.entries }))
            .sort((a, b) => b.bytes - a.bytes)
            .slice(0, Math.max(1, Number(topN) || 5));
        // 一句话摘要：「聊天记录 chat_* 152MB · 角色卡 characters 71MB · …」
        const describeBackupBuckets = (bucketStat, topN) => rankBackupBuckets(bucketStat, topN)
            .map(item => item.name + ' ' + fmtBackupMB(item.bytes))
            .join(' · ');

        // ---- 2.8.19：还原体积预检 ----
        // 2.8.78：系数由实测校准，5 降为 2。用 30.8MB 真实结构样本（中文正文 + base64 头像 +
        // 4200 轮聊天 + 世界书）逐阶段强制 gc 后读存活堆：整份读成字符串占 0.77× 文件字节，
        // JSON.parse 出对象图再占 0.74×，两者在 parse 返回那一刻同时存活，峰值 1.51×；
        // 写库时单条 cloneForStorage 的瞬时增量只再抬 0.07×。原注释写的 4~6× 不成立：
        // V8 的字符串不可变且共享，深拷贝只复制对象头与数组头，不复制字符串内容，
        // 所以「多一层拷贝就多一倍内存」在这里是错的。取 2 是给 Android WebView 的
        // IndexedDB 序列化与堆碎片留约 30% 余量。
        const RESTORE_BYTES_PER_FILE_BYTE = 2;
        // [rphub 2.8.100] 本次会话观测到的最低已用堆。体积分析要逐条 stringify 量字节，
        //   一次分析就在堆上留下几百 MB 临时对象；下一次分析读到的 usedJSHeapSize 里含着
        //   这些垃圾，于是「可还原上限」显示得比真实值低一半，用户会误以为自己的备份还原不了。
        //   拿它当基线，才判得出这次读数是不是被上一次污染了。
        let _minHeapUsedSeen = 0;
        const getRestoreBudget = () => {
            let limit = 0, used = 0, source = '保守兜底';
            try {
                const mem = performance.memory;
                if (mem && typeof mem.jsHeapSizeLimit === 'number' && mem.jsHeapSizeLimit > 0) {
                    limit = mem.jsHeapSizeLimit;
                    used = typeof mem.usedJSHeapSize === 'number' ? mem.usedJSHeapSize : 0;
                    source = 'performance.memory';
                }
            } catch (_) {}
            if (!limit) {
                try {
                    const ram = navigator.deviceMemory; // GiB
                    if (typeof ram === 'number' && ram > 0) {
                        limit = (ram >= 4 ? 384 : (ram >= 2 ? 256 : 128)) * 1048576;
                        source = 'deviceMemory 档位';
                    }
                } catch (_) {}
            }
            if (!limit) limit = 128 * 1048576;
            // [rphub 2.8.100] 只降不升：每次调用顺手记下本次会话见过的最低已用堆。
            if (used > 0 && (!_minHeapUsedSeen || used < _minHeapUsedSeen)) _minHeapUsedSeen = used;
            // 2.8.78：0.5 改为 0.85。perByte 系数已经表达了「导入期间堆会涨到文件的几倍」，
            // 再对预算砍半属于重复打折 —— 实测后果是 used 一旦超过堆上限的一半，预算立刻塌到 0，
            // 只剩下面 8MB 的兜底值，于是十几 MB 以上的备份全部被判「有风险」。
            // 现在按「峰值 = used + 文件字节 × perByte ≤ 上限 × 0.85」反解，
            // 0.85 留给堆碎片与 IndexedDB 序列化的余量。
            const budget = Math.max(0, limit * 0.85 - used);
            const maxFileBytes = Math.max(8 * 1048576, Math.floor(budget / RESTORE_BYTES_PER_FILE_BYTE));
            return { limit, used, maxFileBytes, source, perByte: RESTORE_BYTES_PER_FILE_BYTE };
        };
        const fmtMB = (n) => (Math.round((Number(n) || 0) / 1048576 * 10) / 10) + 'MB';
        // 返回 'ok' | 'confirm' | 'refuse'
        const checkRestoreSize = (fileBytes, label) => {
            const est = getRestoreBudget();
            const size = Number(fileBytes) || 0;
            const line = '[RestoreGuard] ' + (label || '(未命名)') + ' | 文件 ' + fmtMB(size)
                + ' | 堆上限 ' + fmtMB(est.limit) + ' | 已用 ' + fmtMB(est.used)
                + ' | 预检可还原 ' + fmtMB(est.maxFileBytes) + ' | 判据 ' + est.source
                + ' | 系数 ×' + est.perByte;
            if (!size) { console.log(line + ' ⇒ 未知体积，放行'); return 'ok'; }
            if (size <= est.maxFileBytes) { console.log(line + ' ⇒ 放行'); return 'ok'; }
            if (size > est.maxFileBytes * 3) { console.warn(line + ' ⇒ 拒绝（超预检值 3 倍）'); return 'refuse'; }
            console.warn(line + ' ⇒ 需用户确认');
            return 'confirm';
        };
        const autoBackupConfig = ref({
            enabled: true,
            triggerMode: 'remind',
            retentionDays: 7, // 保留天数: 3, 7, 14, 30, 0(不限)
            maxCopies: 5,     // 历史保留份数: 3, 5, 10, 20, 0(不限)
            lastBackupDate: '',
            lastRemindDate: '', // [rphub 2.8.102] 最近一次弹窗提醒的日期（YYYY-MM-DD）
            lastSkipAt: 0,    // 2.8.14：最近一次因体积超限跳过的 Unix ms
            lastFailAt: 0     // 2.8.14：最近一次备份失败的 Unix ms
        });
        const autoBackupHistory = ref([]);
        const isAutoBackingUp = ref(false);
        const isRestoringAutoBackup = ref(false);
        // [rphub 2.8.95] 体积分析结果：theme.css 的 .toast-text 是 nowrap + 42px 定高，
        //   单行胶囊永远装不下桶表（上一版把 Top3 塞进 toast，用户只看到一串省略号）。
        //   明细改由弹窗承载，toast 只留一句结论。
        const showBackupSizeModal = ref(false);
        const backupSizeReport = ref(null);
        const autoBackupFolderPath = ref('');

        const normalizeAutoBackupConfig = (raw) => {
            const cfg = raw && typeof raw === 'object' ? raw : {};
            return {
                enabled: cfg.enabled !== false,
                triggerMode: cfg.triggerMode === 'auto' ? 'auto' : 'remind',
                retentionDays: typeof cfg.retentionDays === 'number' ? cfg.retentionDays : 7,
                maxCopies: typeof cfg.maxCopies === 'number' ? cfg.maxCopies : 5,
                lastBackupDate: typeof cfg.lastBackupDate === 'string' ? cfg.lastBackupDate : '',
                lastRemindDate: typeof cfg.lastRemindDate === 'string' ? cfg.lastRemindDate : '',
                lastSkipAt: typeof cfg.lastSkipAt === 'number' ? cfg.lastSkipAt : 0,
                lastFailAt: typeof cfg.lastFailAt === 'number' ? cfg.lastFailAt : 0
            };
        };

        const saveAutoBackupConfig = async () => {
            if (!getMainDb()) return;
            try {
                await setStoredValue(AUTO_BACKUP_CONFIG_KEY, { ...autoBackupConfig.value });
            } catch (err) {
                console.warn('保存自动备份设置失败:', err);
            }
        };

        watch(autoBackupConfig, () => {
            saveAutoBackupConfig();
        }, { deep: true });

        // 刷新当前备份目录路径与物理文件历史列表
        const loadAutoBackupHistory = async () => {
            const bridge = window.AndroidBridge;
            if (bridge?.isNativeApp?.()) {
                const customFolder = String(bridge.getBackupFolder?.() || '').trim();
                const defaultFolder = String(bridge.getDefaultBackupFolderPath?.() || '').trim();
                autoBackupFolderPath.value = customFolder ? '自定义目录 (SAF)' : (defaultFolder || '内部存储/backups');
                try {
                    const rawJson = String(bridge.listBackupFiles?.() || '[]');
                    const list = JSON.parse(rawJson);
                    // 仅筛选自动备份文件：rp-hub-autobackup-*.json
                    const autobackups = list.filter(item => item && typeof item.name === 'string' && item.name.startsWith('rp-hub-autobackup-'));
                    autobackups.sort((a, b) => (b.time || 0) - (a.time || 0));
                    autoBackupHistory.value = autobackups.map(item => {
                        // 解析日期与展示名
                        const dateMatch = item.name.match(/rp-hub-autobackup-(\d{4}-\d{2}-\d{2})[-_]?(\d{4})?/);
                        let displayName = item.name;
                        let dateStr = '';
                        if (dateMatch) {
                            dateStr = dateMatch[1];
                            const timePart = dateMatch[2] ? (dateMatch[2].slice(0, 2) + ':' + dateMatch[2].slice(2, 4)) : '';
                            const m = parseInt(dateStr.slice(5, 7), 10);
                            const d = parseInt(dateStr.slice(8, 10), 10);
                            displayName = m + '月' + d + '日备份' + (timePart ? ' (' + timePart + ')' : '');
                        }
                        return {
                            id: item.id,
                            name: displayName,
                            fileName: item.name,
                            date: dateStr,
                            timestamp: item.time || Date.now(),
                            sizeBytes: item.size || 0,
                            isTreeDoc: Boolean(item.isTreeDoc)
                        };
                    });
                } catch (e) {
                    console.warn('[AutoBackup] 加载本地备份文件列表失败:', e);
                    autoBackupHistory.value = [];
                }
            } else {
                autoBackupFolderPath.value = '浏览器环境 (模拟)';
                autoBackupHistory.value = [];
            }
        };

        // 物理清理轮转逻辑 (按保留天数与最大份数删除过期物理文件)
        const cleanupExpiredAutoBackups = async () => {
            const bridge = window.AndroidBridge;
            if (!bridge?.isNativeApp?.() || typeof bridge.deleteBackupFile !== 'function') return;
            await loadAutoBackupHistory();
            const retentionDays = Number(autoBackupConfig.value.retentionDays) || 0;
            const maxCopies = Number(autoBackupConfig.value.maxCopies) || 0;
            const now = Date.now();
            const list = autoBackupHistory.value; // 已按时间降序
            const toDelete = [];

            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                let isExpired = false;
                // 1. 超出最大保留份数 (若不为 0)
                if (maxCopies > 0 && i >= maxCopies) {
                    isExpired = true;
                }
                // 2. 超出保留天数 (若不为 0)
                if (!isExpired && retentionDays > 0) {
                    const ageDays = (now - item.timestamp) / (1000 * 60 * 60 * 24);
                    if (ageDays > retentionDays) {
                        isExpired = true;
                    }
                }
                if (isExpired) {
                    toDelete.push(item);
                }
            }

            for (const item of toDelete) {
                try {
                    bridge.deleteBackupFile(item.id, item.isTreeDoc);
                    console.log('[AutoBackup] 轮转清理过期备份文件:', item.fileName);
                } catch (e) {
                    console.warn('[AutoBackup] 清理文件异常:', e);
                }
            }
            if (toDelete.length > 0) {
                await loadAutoBackupHistory();
            }
        };

        // Backup readers reconstruct full cards on demand and omit private storage records.
        const readMainDbEntriesSlim = async (onEntry, shouldStop) => {
            const targetDb = getMainDb();
            if (!targetDb) return;
            await window.RPHubStorage.eachStoredEntry(targetDb, entry => {
                if (shouldIncludeBackupEntry(entry)) onEntry(slimBackupEntry(entry));
            }, shouldStop);
        };

        // 执行单次全量物理流式自动备份（2.8.14 重修，详见 readMainDbEntriesSlim 注释）
        // [rphub 2.8.102] 每天提醒。
        //   触发点只有两个：loadData 里的 6 秒定时器、回到前台的 visibilitychange。
        //   两者都调这一个函数，条件全在里面判，谁先到谁生效，天然不会重复弹。
        const getLocalDateStr = () => {
            const d = new Date();
            return d.getFullYear() + '-'
                + String(d.getMonth() + 1).padStart(2, '0') + '-'
                + String(d.getDate()).padStart(2, '0');
        };
        // 距上次备份的天数；-1 = 从未备份。日期算术只在 JS 里做，模板只做展示。
        const backupOverdueDays = computed(() => {
            const last = String(autoBackupConfig.value.lastBackupDate || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(last)) return -1;
            const parts = last.split('-').map(Number);
            const lastDay = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
            if (!Number.isFinite(lastDay)) return -1;
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            return Math.max(0, Math.round((today - lastDay) / 86400000));
        });
        const maybeRemindDailyBackup = async () => {
            if (backupTask.active || streamImportPanel.value?.isOpen || cloudBackup.busy) return;
            const cfg = autoBackupConfig.value;
            if (!cfg.enabled) return;
            if (cfg.triggerMode !== 'remind') return;
            if (isAutoBackingUp.value || isRestoringAutoBackup.value) return;
            if (showConfirmModal.value) return;   // 已经有确认弹窗在，不叠加
            if (isConversationBusy.value) return; // 出卡时不打断；不重排，等下一个检查点
            const todayStr = getLocalDateStr();
            if (cfg.lastBackupDate === todayStr) return; // 今天已经备过
            if (cfg.lastRemindDate === todayStr) return; // 今天已经问过一次
            // 先落盘再弹：用户直接杀进程也不会导致下次启动重复问。
            autoBackupConfig.value.lastRemindDate = todayStr;
            await saveAutoBackupConfig();
            markHeap('backup-remind');
            const days = backupOverdueDays.value;
            const when = days < 0 ? '还没有任何备份'
                : (days === 0 ? '上次备份是今天' : ('上次备份是 ' + days + ' 天前'));
            confirmAction(
                '今天还没有备份。' + when + '。现在备份吗？',
                () => { performDailyAutoBackup(true); }
            );
        };
        const performDailyAutoBackup = async (isManualTrigger = false) => {
            if (backupTask.active || streamImportPanel.value?.isOpen || cloudBackup.busy) return;
            if (isAutoBackingUp.value) return;
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            const todayStr = year + '-' + month + '-' + day;
            const timeCode = hours + mins;
            const nowMs = Date.now();

            // ---- 非手动触发的三重早退：今日已完成 / 超限退避 / 失败退避 ----
            // 旧实现只有「今日已完成」一条，备份从未成功时每次冷启动都全量重跑，是重启循环的一环。
            if (!isManualTrigger) {
                const cfgNow = autoBackupConfig.value;
                // [rphub 2.8.102] 三种早退各留一条采样。没有它们，「没跑」和「跑了被跳过」
                //   在堆采样里长得一模一样 —— 2.8.101 就是因此只能定位到「没进函数体」。
                if (cfgNow.lastBackupDate === todayStr) {
                    markHeap('backup-skip:done');
                    return; // 今天已完成自动备份
                }
                if (Number(cfgNow.lastSkipAt) && nowMs - Number(cfgNow.lastSkipAt) < AUTO_BACKUP_SKIP_BACKOFF_MS) {
                    markHeap('backup-skip:size');
                    return; // 体积超限退避期内
                }
                if (Number(cfgNow.lastFailAt) && nowMs - Number(cfgNow.lastFailAt) < AUTO_BACKUP_FAIL_BACKOFF_MS) {
                    markHeap('backup-skip:fail');
                    return; // 失败退避期内
                }
                // 正在出卡时顺延，避免和生成抢主线程（旧实现启动 6s 后无条件开跑）
                // 2.8.63：官网已删 isRemoteGenerating 符号（isConversationBusy 现为
                // isGenerating || hasActiveToolInlineWork，已覆盖出卡状态）。原条件在此抛
                // ReferenceError，落在 setTimeout 的 async 调用里没人 catch ⇒ 自动备份静默不跑。
                if (isConversationBusy.value) {
                    // [rphub 2.8.102] 顺延加上限。原来无限递归重排，一直忙就一直排，
                    //   既不放弃也不留痕；现在最多 10 次（≈5 分钟）后放弃，等下次启动
                    //   或回到前台再试，并留一条采样让用户看得见。
                    _backupBusyDeferCount += 1;
                    markHeap('backup-busy-defer');
                    if (_backupBusyDeferCount > AUTO_BACKUP_BUSY_MAX_DEFER) {
                        console.warn('[AutoBackup] 连续 ' + AUTO_BACKUP_BUSY_MAX_DEFER
                            + ' 次因出卡顺延，本次放弃；下次启动或回到前台再试');
                        return;
                    }
                    setTimeout(() => { performDailyAutoBackup(false); }, AUTO_BACKUP_BUSY_DELAY_MS);
                    return;
                }
                _backupBusyDeferCount = 0;
            }

            isAutoBackingUp.value = true;
            // [rphub 2.8.101] 备份要逐条 stringify 整库，峰值就在这之间
            markHeap('backup-begin');
            let session = null;
            try {
                if (isManualTrigger) showToast('正在执行全量自动备份...', 'info');
                await flushPendingChatHistorySave();
                if (!getMainDb()) await initDB();

                const fileName = 'rp-hub-autobackup-' + todayStr + '-' + timeCode + '.json';
                const bridge = window.AndroidBridge;

                if (!bridge?.isNativeApp?.()) {
                    // 网页环境兜底（保持旧行为：全量收集后一次性下载）
                    const allEntries = await readMainDbEntries(getMainDb());
                    let entries = allEntries.filter(shouldIncludeBackupEntry).map(slimBackupEntry);
                    if (backupScope.value.localData) {
                        entries = entries.concat(collectLocalStorageEntries());
                    }
                    const legacyEntries = await collectLegacyBackupEntries(entries);
                    if (legacyEntries.length) {
                        entries = entries.concat(legacyEntries);
                    }
                    const backupPayload = {
                        type: 'rp-hub-complete-backup',
                        version: 1,
                        exportedAt: new Date().toISOString(),
                        entries: entries.map(entry => ({ key: entry.key, value: unwrapForStorage(entry.value) }))
                    };
                    downloadJsonFile(backupPayload, fileName);
                    autoBackupConfig.value.lastBackupDate = todayStr;
                    await saveAutoBackupConfig();
                    if (isManualTrigger) {
                        showToast('已完成自动备份并保存至本地文件 (' + entries.length + '项)', 'success', 3500);
                    }
                    return;
                }

                // ---- 原生流式路径：单遍「读一条 → 写一条 → 丢一条」 ----
                // 2.8.19：旧实现先把全库瘦身结果攒进 entries[] 再整份写一遍，峰值堆 ≈1.4×数据、
                // 序列化 2 遍（投影测量 + 写入）。这里把写入搬进游标回调：写完即丢，
                // 峰值堆降到 O(1 条)；投影测量取消 —— 闸门直接用 writeBackupText 返回的真实字节数。
                session = startChunkedBackup(fileName);
                if (!session) throw new Error('无法创建备份文件会话');
                const sizeLimit = isManualTrigger ? Infinity : getAutoBackupSizeLimit();
                const writeStat = { bytes: 0, entries: 0 };
                const mainLogicalKeys = new Set();
                let gateTripped = false;
                let firstEntry = true;
                const bucketStat = new Map();
                const addBackupBucket = (logicalKey, bytes) => {
                    const name = backupBucketOf(logicalKey);
                    const prev = bucketStat.get(name) || { bytes: 0, entries: 0 };
                    prev.bytes += bytes;
                    prev.entries += 1;
                    bucketStat.set(name, prev);
                };
                const writePart = (text) => {
                    // [rphub 2.8.94] 返回本次真实写入的 UTF-8 字节数，供按条归桶
                    const written = writeBackupText(session, text);
                    writeStat.bytes += written;
                    if (writeStat.bytes > sizeLimit) gateTripped = true;
                    return written;
                };
                const writeEntry = (entry) => {
                    if (gateTripped) return;
                    const written = writePart((firstEntry ? '' : ',') + jsonChunkStringifyEntry(entry));
                    firstEntry = false;
                    writeStat.entries++;
                    // [rphub 2.8.94] 只累加账目，不改写入顺序与内容
                    addBackupBucket(entry && entry.key !== undefined
                        ? getStorageLogicalKey(String(entry.key)) : '', written);
                };

                writePart('{"type":"rp-hub-complete-backup","__rphub_backup__":1,"version":8,"exportedAt":"' + new Date().toISOString() + '","entries":[');
                await readMainDbEntriesSlim((slim) => {
                    // 只留逻辑键（O(键数)），供遗留库去重；不保留条目本体
                    if (slim && slim.key !== undefined) mainLogicalKeys.add(getStorageLogicalKey(String(slim.key)));
                    // slim.value 已由 slimBackupEntry 深克隆过，直接复用，不再重复 unwrapForStorage
                    writeEntry(slim);
                }, () => gateTripped);

                if (gateTripped) {
                    // 文件会话已开 ⇒ 必须删掉半成品（2.8.14 起 abortChunkedBackup 会删文件）
                    abortChunkedBackup(session);
                    session = null;
                    autoBackupConfig.value.lastSkipAt = Date.now();
                    await saveAutoBackupConfig();
                    // [rphub 2.8.94] 中止时必须说清「是谁撑爆的」，否则用户无从下手
                    const bucketFull = rankBackupBuckets(bucketStat, 10)
                        .map((item, i) => (i + 1) + '. ' + item.name + ' ' + fmtBackupMB(item.bytes)
                            + '（' + item.entries + ' 条）')
                        .join('\n');
                    console.warn('[AutoBackup] 备份体积已超上限（已写 ' + fmtBackupMB(writeStat.bytes)
                        + '，上限 ' + fmtBackupMB(sizeLimit) + '），本次中止。体积构成：\n' + bucketFull);
                    // [rphub 2.8.95] toast 只有一行：这里只说结论，明细交给「体积分析」弹窗。
                    //   字数受 .toast-item 的 max-width 约束（360dp 下正文可用约 262px ≈ 18 个汉字），
                    //   16 字是能留出余量的上限，再长就又变成省略号了。
                    showToast('备份已中止，点「体积分析」看明细', 'warning', 5000);
                    return;
                }

                if (backupScope.value.localData) {
                    collectLocalStorageEntries().forEach(writeEntry);
                }
                // 旧版遗留库：主库已有同逻辑键的跳过（主库为准）⇒ 只需传主库键集合
                const legacyEntries = await collectLegacyBackupEntries(mainLogicalKeys);
                if (legacyEntries.length) legacyEntries.forEach(writeEntry);

                writePart('],"databases":{');
                const companionDbs = await collectCompanionDatabasesDump();
                const lsDump = {};
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k) lsDump[k] = localStorage.getItem(k);
                    }
                } catch (_) {}
                let firstDb = true;
                Object.keys(companionDbs).forEach(dbName => {
                    writePart((firstDb ? '' : ',') + '"' + dbName + '":' + JSON.stringify(companionDbs[dbName]));
                    firstDb = false;
                });
                writePart('},"webStorage":{"localStorage":' + JSON.stringify(lsDump) + '}}');
                const finished = String(bridge.finishBackupWrite(session.token) || '');
                if (finished !== 'OK') {
                    throw new Error(finished.startsWith('ERR:') ? finished.slice(4) : '完成备份写入失败');
                }

                // 更新配置与最后备份日期（同时清零退避戳）
                autoBackupConfig.value.lastBackupDate = todayStr;
                autoBackupConfig.value.lastFailAt = 0;
                autoBackupConfig.value.lastSkipAt = 0;
                await saveAutoBackupConfig();

                // 执行物理文件清理轮转
                await cleanupExpiredAutoBackups();

                if (isManualTrigger) {
                    showToast('已完成自动备份并保存至本地文件 (' + writeStat.entries + '项)', 'success', 3500);
                } else {
                    console.log('[AutoBackup] 每日后台物理自动备份完成:', fileName);
                }
            } catch (err) {
                console.error('[AutoBackup] 备份异常:', err);
                if (session) abortChunkedBackup(session);
                // 2.8.14：失败记 lastFailAt，非手动触发 30 分钟内不重试（旧实现无退避，每次冷启动全量重跑）
                try {
                    autoBackupConfig.value.lastFailAt = Date.now();
                    await saveAutoBackupConfig();
                } catch (_) {}
                if (isManualTrigger) {
                    showToast('自动备份失败: ' + (err.message || err), 'error', 5000);
                }
            } finally {
                isAutoBackingUp.value = false;
                // [rphub 2.8.101] 与 backup-begin 的差值 = 本次备份留下的临时占用
                markHeap('backup-end');
            }
        };

        // [rphub 2.8.94] 只读体积分析：走与自动备份完全相同的「游标逐条读 → 瘦身 → 量体积」
        //   路径（含 shouldIncludeBackupEntry 过滤），但一个字节都不落盘。
        //   纯 ASCII 条目（base64 头像）直接用 length，含中文才走 TextEncoder，避免无谓分配。
        //   目的是定位「哪一类数据撑爆了备份」，不追求精确到字节。
        // [rphub 2.8.99] 还原峰值采样。performance.memory 只有 Chromium 内核有，且被量化
        //   （约 100KB 粒度、GC 后才更新），所以读数只能当量级参考，不能当精确值。
        //   它的用途是校准 getRestoreBudget() 里「每 1 字节文件占 2 字节内存」那个假设 ——
        //   2.8.98 把峰值压到 443MB 是按代码推算的，没有实测过。
        //   每抬高 8MB 落一次 localStorage：万一还原中途闪退，最后一次读数也留得下来。
        const RESTORE_PEAK_KEY = 'rphub_restore_peak_v1';
        const RESTORE_PEAK_STEP_BYTES = 8 * 1024 * 1024;
        let _restorePeak = null;
        const readHeapUsed = () => {
            try {
                const mem = typeof performance !== 'undefined' ? performance.memory : null;
                const used = mem ? Number(mem.usedJSHeapSize) : 0;
                return used > 0 ? used : 0;
            } catch (_) { return 0; }
        };
        // [rphub 2.8.101] 堆采样。用途单一：回答「谁把 usedJSHeapSize 抬上去的」。
        //   静态读代码算不出峰值 —— 游标是逐条的、瘦身是浅拷贝、编码是 512KB 切片，
        //   三项加起来对不上用户实测的 1020MB。只能在关键节点各记一条，看曲线在哪一步跳。
        //   上限 40 条、落 localStorage：跨会话保留，下次打开还能看到上一次启动的形状。
        const HEAP_MARK_KEY = 'rphub_heap_marks_v1';
        const HEAP_MARK_MAX = 40;
        // 加载完成时的堆 = 应用常驻占用。之后任何读数跟它比，多出来的才是临时对象。
        let _loadEndHeapUsed = 0;
        const readHeapMarks = () => {
            try {
                const raw = localStorage.getItem(HEAP_MARK_KEY);
                const list = raw ? JSON.parse(raw) : null;
                if (Array.isArray(list)) return list.filter(m => m && typeof m === 'object');
            } catch (_) {}
            return [];
        };
        const _heapMarks = readHeapMarks();
        const markHeap = (tag) => {
            const used = readHeapUsed();
            if (!used) return 0;
            try {
                _heapMarks.push({ tag: String(tag), used, at: Date.now() });
                while (_heapMarks.length > HEAP_MARK_MAX) _heapMarks.shift();
                localStorage.setItem(HEAP_MARK_KEY, JSON.stringify(_heapMarks));
            } catch (_) {}
            return used;
        };
        const writeRestorePeak = (payload) => {
            try { localStorage.setItem(RESTORE_PEAK_KEY, JSON.stringify(payload)); } catch (_) {}
        };
        const restorePeakStart = (fileBytes) => {
            const used = readHeapUsed();
            _restorePeak = used > 0
                ? { fileBytes: Number(fileBytes) || 0, peak: used, written: used }
                : null;
        };
        const restorePeakTick = () => {
            if (!_restorePeak) return;
            const used = readHeapUsed();
            if (!used || used <= _restorePeak.peak) return;
            _restorePeak.peak = used;
            if (used - _restorePeak.written < RESTORE_PEAK_STEP_BYTES) return;
            _restorePeak.written = used;
            writeRestorePeak({
                fileBytes: _restorePeak.fileBytes, peakBytes: used,
                at: Date.now(), done: false
            });
        };
        const restorePeakDone = (ok) => {
            if (!_restorePeak) return;
            const peakBytes = _restorePeak.peak;
            const fileBytes = _restorePeak.fileBytes;
            writeRestorePeak({ fileBytes, peakBytes, at: Date.now(), done: !!ok });
            const ratio = fileBytes > 0 ? Math.round(peakBytes / fileBytes * 100) / 100 : 0;
            console.warn('[RestorePeak] 文件 ' + fmtMB(fileBytes) + ' / 峰值 ' + fmtMB(peakBytes)
                + ' / ' + ratio + ' 倍（预检按 ' + RESTORE_BYTES_PER_FILE_BYTE + ' 倍算）'
                + (ok ? '' : ' / 还原未完成'));
            _restorePeak = null;
        };
        // [rphub 2.8.103] 体积分析并进数据体检后，这个函数只剩「跑一次扫描并把体积弹窗打开」的作用。
        //   保留它是为了「清完遗留键原地刷新」那条路径（purgeLegacyBackups 里 await analyzeBackupSize()），
        //   以及任何仍按老名字调用的地方。界面上的「体积分析」按钮已删除，改由体检结果区的
        //   「体积明细」走 openBackupSizeModal（只开弹窗不重扫）。
        const analyzeBackupSize = async () => {
            await performDataHealthScan({ openSizeModal: true });
        };
        // [rphub 2.8.103] 只把已有的体积报告弹出来，不重新扫库。
        const openBackupSizeModal = () => {
            if (!backupSizeReport.value || !backupSizeReport.value.checkedAt) {
                showToast('先点一次「开始体检」', 'info');
                return;
            }
            showBackupSizeModal.value = true;
        };

        // [rphub 2.8.99] 遗留键的导出与清理。删之前先给一条退路 —— 这些键当前版本
        //   读不到，但里面是完整的历史备份快照，删掉就没有第二份了。
        const exportLegacyBackups = async () => {
            const report = backupSizeReport.value || {};
            const keys = report.legacyBackupKeys || [];
            if (!keys.length) { showToast('没有可导出的遗留备份', 'info'); return; }
            try {
                const payload = {};
                for (const key of keys) {
                    payload[key] = await getStoredValue(key);
                }
                const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                downloadJsonFile(payload, '遗留备份-' + stamp + '.json');
                showToast('已导出 ' + keys.length + ' 条遗留备份', 'success');
            } catch (error) {
                console.error('[LegacyBackup] 导出失败:', error);
                showToast('导出失败: ' + (error.message || error), 'error', 5000);
            }
        };
        const purgeLegacyBackups = async () => {
            const report = backupSizeReport.value || {};
            const keys = report.legacyBackupKeys || [];
            if (!keys.length) { showToast('没有可清理的遗留备份', 'info'); return; }
            const confirmed = await showVueConfirmModal('清理遗留备份',
                '将删除 ' + keys.length + ' 条旧版遗留备份，共 '
                + formatDataHealthSize(report.legacyBackupBytes) + '。'
                + '这些数据当前版本已不读取，删除后无法从应用内找回。'
                + '建议先点「导出」留一份。仍要删除吗？',
                { confirmText: '确认删除' });
            if (!confirmed) return;
            try {
                let done = 0;
                for (const key of keys) {
                    await deleteStoredValue(key);
                    done += 1;
                }
                console.warn('[LegacyBackup] 已清理 ' + done + ' 条 / '
                    + formatDataHealthSize(report.legacyBackupBytes));
                showToast('已清理 ' + done + ' 条遗留备份', 'success');
                await analyzeBackupSize();
            } catch (error) {
                console.error('[LegacyBackup] 清理失败:', error);
                showToast('清理失败: ' + (error.message || error), 'error', 5000);
            }
        };

        // 还原物理自动备份文件
        // ★ 2.8.58：柳贯一插件 20.4.x 的备份把二进制字段包成
        //   { __rphub_bin__: base64, __rphub_type__: 'Blob' | 'ArrayBuffer', __rphub_mime__ }。
        //   原样写库时它会以普通对象身份落进 IndexedDB，头像/图片/封面在界面上就是 [object Object]。
        //   还原必须发生在 cloneForStorage **之后**：cloneForStorage 走 unwrapForStorage，
        //   那里对 Blob 走的是通用对象分支（Object.keys(blob) 为 []），会把 Blob 变成 {}。
        const restoreRphubBinaryDeep = (node, depth = 0) => {
            if (depth > 16 || node === null || typeof node !== 'object') return node;
            if (node instanceof Date || node instanceof Blob) return node;
            if (ArrayBuffer.isView(node) || node instanceof ArrayBuffer) return node;
            if (Array.isArray(node)) return node.map(item => restoreRphubBinaryDeep(item, depth + 1));
            if (typeof node.__rphub_bin__ === 'string') {
                try {
                    const binary = atob(node.__rphub_bin__);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
                    if (String(node.__rphub_type__ || '') === 'ArrayBuffer') return bytes.buffer;
                    return new Blob([bytes], { type: node.__rphub_mime__ || 'application/octet-stream' });
                } catch (_) {
                    return node;
                }
            }
            const restored = {};
            Object.keys(node).forEach(key => { restored[key] = restoreRphubBinaryDeep(node[key], depth + 1); });
            return restored;
        };

        // [rphub 2.8.105] 读一个本地自动备份文件，返回已解析的对象。
        //
        // 为什么要换：旧路径 bridge.readBackupFileText 把整份文件读成 Java String
        //   （ByteArrayOutputStream 翻倍扩容 + toByteArray 再复制一份 + UTF-8→UTF-16 展开，
        //   219MB 的文件峰值 ≈700MB），largeHeap 也扛不住，报 "Failed to allocate ..."。
        //   而外部「导入全部数据」走 <input type="file"> + FileReader，字符串建在渲染进程
        //   的 V8 堆里，同一份文件就能过 —— 这就是「外面能导入、里面还原失败」的全部原因。
        //
        // 现在优先走 prepareBackupFileRead + fetch 的流式通道：Java 侧只登记 Uri 不读内容，
        //   字节由 WebView 自己的网络栈流式取，内存落点与外部导入一致。
        //   只有小文件（≤64MB）且流式通道不可用时才回退老路径。
        const LOCAL_BACKUP_READ_SAFE_BYTES = 64 * 1024 * 1024;
        const putBackupEntry = (store, entry) => {
            store.delete('__rp_local_mirror_revision');
            if (entry.key === '__rp_local_mirror_revision') return;
            if (entry.key.startsWith('rp_hub_b1_memory_state_') && entry.value?.deleted === true) {
                store.delete(entry.key.replace('rp_hub_b1_memory_state_', 'rp_hub_classic_memories_'));
            }
            return window.RPHubStorage.putStoredRecord(store, restoreRphubBinaryDeep(entry.value), entry.key);
        };
        const pauseBackupWrites = async () => {
            if (isConversationBusy.value) throw new Error('请先停止当前生成再恢复数据');
            await flushPendingChatHistorySave();
            debouncedSave.cancel();
            debouncedCharacterSave.cancel();
            await window.RPLocalStore?.flush();
            window.RPHubStorage.setWritesPaused(true);
            window.RPLocalStore?.setWebWritesPaused(true);
        };
        const resumeBackupWrites = () => {
            window.RPHubStorage.setWritesPaused(false);
            window.RPLocalStore?.setWebWritesPaused(false);
        };
        const readLocalBackupJson = async (bridge, record) => {
            const sizeBytes = Number(record?.sizeBytes || 0);
            const reader = typeof window.RPLocalFiles?.prepareBackupFileRead === 'function'
                ? window.RPLocalFiles : bridge;
            if (bridge?.isNativeApp?.() && typeof reader?.prepareBackupFileRead === 'function') {
                const token = String(reader.prepareBackupFileRead(record.id, !!record.isTreeDoc) || '');
                if (token.startsWith('ERR:')) throw new Error(token.slice(4));
                if (token) {
                    const resp = await fetch('__rphub_backup_read__?t=' + encodeURIComponent(token), { cache: 'no-store' });
                    if (!resp.ok) throw new Error('读取本地备份失败（HTTP ' + resp.status + '）');
                    const data = await resp.json();
                    if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
                        throw new Error(String(data.error));
                    }
                    return data;
                }
            }
            if (bridge?.isNativeApp?.() && typeof bridge.readBackupFileText === 'function') {
                // 大文件走老路径必然 OOM。与其让用户再等一次失败，不如直接给能执行的做法。
                if (sizeBytes > LOCAL_BACKUP_READ_SAFE_BYTES) {
                    throw new Error('这个备份有 ' + fmtMB(sizeBytes)
                        + '，无法直接读取。请改用「导入全部数据」选择同一个文件。');
                }
                const rawText = bridge.readBackupFileText(record.id, record.isTreeDoc);
                if (rawText.startsWith('ERR:')) throw new Error(rawText.slice(4));
                return JSON.parse(rawText);
            }
            throw new Error('当前环境不支持直接读取本地文件');
        };

        const restoreAutoBackupRecord = async (record) => {
            if (!record?.id || isRestoringAutoBackup.value) return;
            const bridge = window.AndroidBridge;
            const reader = typeof window.RPLocalFiles?.prepareBackupFileRead === 'function' ? window.RPLocalFiles : bridge;
            if (bridge?.isNativeApp?.() && typeof reader?.prepareBackupFileRead === 'function') {
                try {
                    const token = String(reader.prepareBackupFileRead(record.id, !!record.isTreeDoc) || '');
                    if (!token || token.startsWith('ERR:')) throw new Error(token.slice(4) || '读取备份失败');
                    await streamImportPanel.value.startUrl(new URL('__rphub_backup_read__?t=' + encodeURIComponent(token), location.href).href,
                        record.fileName || record.name || '备份.json', Number(record.sizeBytes) || 0);
                } catch (error) { showToast(error.message || '读取备份失败', 'error'); }
                return;
            }
            const confirmed = await showVueConfirmModal(
                '还原自动备份',
                '确认还原「' + record.name + '」吗？将覆盖当前全部软件数据，建议先导出当前备份。',
                { confirmText: '确认还原' }
            );
            if (!confirmed) return;

            // 2.8.19：读之前先量体积，超了就拦。
            // 2.8.105：读法已改成流式（内容走 WebView 自己的网络栈，不进 Java 堆），
            //   于是这里量体积对应的「可还原上限」口径终于对上了 —— 它算的正是渲染进程的堆。
            const restoreVerdict = checkRestoreSize(record.sizeBytes, record.fileName || record.name || '');
            if (restoreVerdict === 'refuse') {
                showToast('这个备份有 ' + fmtMB(record.sizeBytes) + '，超过当前设备可还原的上限（约 '
                    + fmtMB(getRestoreBudget().maxFileBytes) + '）。直接还原会把应用内存撑爆，'
                    + '建议先导出当前数据，或换用更小的备份。', 'error', 7000);
                return;
            }
            if (restoreVerdict === 'confirm') {
                const goOn = await showVueConfirmModal('备份较大，还原可能失败',
                    '这个备份有 ' + fmtMB(record.sizeBytes) + '，当前设备内存偏紧（预检上限约 '
                    + fmtMB(getRestoreBudget().maxFileBytes) + '）。继续还原有失败甚至闪退的风险，'
                    + '建议先导出当前数据再试。仍要尝试吗？',
                    { confirmText: '仍然还原' });
                if (!goOn) return;
            }

            isRestoringAutoBackup.value = true;
            let writesPausedForRestore = false;
            let restoreCommitted = false;
            // [rphub 2.8.99] 从这里开始采峰值，采样点都放在 await 边界上 ——
            //   同步代码块里 performance.memory 基本不会更新。
            restorePeakStart(record.sizeBytes);
            try {
                showToast('正在读取本地备份文件...', 'info');
                const bridge = window.AndroidBridge;
                // [rphub 2.8.105] 改走流式通道，内容不再进 Java 堆（见 readLocalBackupJson）。
                //   2.8.98 那段「rawText 用完手动置空」随之作废 —— 现在已经没有整份字符串了。
                const backupData = await readLocalBackupJson(bridge, record);
                const pack = await parseUniversalBackupPackage(backupData);
                restorePeakTick();
                if (!pack.entries || !pack.entries.length) {
                    throw new Error('不是有效的 RP-Hub 全量或扩展备份文件');
                }

                if (!getMainDb()) await initDB();
                await pauseBackupWrites();
                writesPausedForRestore = true;

                // 瘦身与写入主库
                const report = await slimFullBackupImportEntries(pack.entries);
                // 瘦身这一步会对最大一条整份 stringify，是峰值的主要来源之一
                restorePeakTick();
                // 记忆正文与版本键成对入账：旧备份补 revision，删除只留墓碑，冲突则整体拒绝
                const restoredEntries = window.RPHubStorage.prepareRestoredMemoryEntries(report.entries);
                const transaction = getMainDb().transaction(['store'], 'readwrite');
                const store = transaction.objectStore('store');
                restoredEntries.forEach(entry => {
                    // [rphub 2.8.98] 去掉这里的 cloneForStorage。value 全部来自 JSON.parse，
                    //   既不是响应式代理，也不含 Date / ArrayBuffer，clone 只是白复制一份 ——
                    //   characters 那一条 187MB 因此被复制两遍（clone 一遍 + restore 一遍）。
                    //   2.8.58 那条「还原必须发生在 clone 之后」的约束，针对的是「先 restore
                    //   再 clone」的顺序；clone 整个不存在时，Blob 只会在 restore 这一步产生，
                    //   没有任何 unwrap 会碰到它。restoreRphubBinaryDeep 自己重建对象，
                    //   代理同样进不了 IDB。
                    putBackupEntry(store, entry);
                    restorePeakTick();
                });
                await new Promise((resolve, reject) => {
                    transaction.oncomplete = resolve;
                    transaction.onerror = () => reject(transaction.error);
                    transaction.onabort = () => reject(transaction.error || new Error('恢复写入已取消'));
                });
                restoreCommitted = true;

                // 恢复 localStorage 记忆
                (pack.entries || []).filter(entry => entry && typeof entry.key === 'string' && entry.key.indexOf(LOCAL_BACKUP_PREFIX) === 0).forEach(entry => {
                    try {
                        localStorage.setItem(entry.key.slice(LOCAL_BACKUP_PREFIX.length), String(entry.value));
                    } catch (e) {}
                });

                await restoreCompanionDatabases(pack.extraDatabases);
                showToast('数据还原成功，正在刷新应用', 'success');
                // 必须在 reload 之前落盘，否则这次读数就丢了
                restorePeakDone(true);
                setTimeout(() => window.location.reload(), 600);
            } catch (err) {
                if (writesPausedForRestore && !restoreCommitted) resumeBackupWrites();
                if (restoreCommitted) setTimeout(() => window.location.reload(), 1500);
                console.error('还原备份失败:', err);
                showToast('还原备份失败: ' + (err.message || err), 'error', 5000);
                // 失败路径也要落一次：失败时的峰值往往才是最有信息量的那个
                restorePeakDone(false);
                isRestoringAutoBackup.value = false;
            }
        };

        // ---- 备份文件管理（重命名 / 删除 / 另存 备份文件夹内的备份，2.8.11）----
        // 历史页展示全部 JSON；每日轮转仍只处理原来的自动备份文件。
        const backupManagerFiles = ref([]);
        const backupManagerLoading = ref(false);
        const backupRenameId = ref('');
        const backupRenameDraft = ref('');

        const formatBackupFileTime = (timestamp) => {
            const value = Number(timestamp) || 0;
            if (!value) return '';
            const date = new Date(value);
            const pad = (n) => String(n).padStart(2, '0');
            return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
                + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
        };

        // 读取备份文件夹内全部 .json 备份（含自动备份与手动导出）
        const loadBackupManagerFiles = async () => {
            const bridge = window.AndroidBridge;
            if (!bridge?.isNativeApp?.() || typeof bridge.listBackupFiles !== 'function') {
                backupManagerFiles.value = [];
                return;
            }
            backupManagerLoading.value = true;
            backupListError.value = '';
            try {
                const parsed = JSON.parse(String(bridge.listBackupFiles() || '[]'));
                backupManagerFiles.value = (Array.isArray(parsed) ? parsed : [])
                    .filter(item => item && typeof item.name === 'string' && /\.json$/i.test(item.name))
                    .map(item => ({
                        id: item.id,
                        fileName: item.name,
                        sizeBytes: Number(item.size) || 0,
                        timestamp: Number(item.time) || 0,
                        isTreeDoc: Boolean(item.isTreeDoc)
                    }))
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            } catch (error) {
                console.warn('读取备份文件夹失败:', error);
                backupListError.value = '备份列表读取失败：' + error.message;
                backupManagerFiles.value = [];
            } finally {
                backupManagerLoading.value = false;
            }
        };

        const startRenameBackupFile = (record) => {
            if (!record || !record.id) return;
            backupRenameId.value = record.id;
            backupRenameDraft.value = record.fileName;
        };

        const cancelRenameBackupFile = () => {
            backupRenameId.value = '';
            backupRenameDraft.value = '';
        };

        const commitRenameBackupFile = async (record) => {
            if (!record || !record.id) return;
            const bridge = window.AndroidBridge;
            const next = String(backupRenameDraft.value || '').trim();
            if (!next) { showToast('文件名不能为空', 'error'); return; }
            if (next === record.fileName) { cancelRenameBackupFile(); return; }
            if (!/\.json$/i.test(next)) { showToast('文件名必须以 .json 结尾', 'error'); return; }
            if (/[\\/]/.test(next)) { showToast('文件名不能包含路径分隔符', 'error'); return; }
            if (typeof bridge?.renameBackupFile !== 'function') { showToast('当前版本不支持重命名备份文件', 'error'); return; }
            let result = '';
            try {
                result = String(bridge.renameBackupFile(record.id, record.isTreeDoc, next) || '');
            } catch (error) {
                result = 'ERR:' + (error?.message || error);
            }
            if (result !== 'OK') {
                showToast('重命名失败：' + (result.indexOf('ERR:') === 0 ? result.slice(4) : result), 'error', 4000);
                return;
            }
            cancelRenameBackupFile();
            await loadBackupManagerFiles();
            await loadAutoBackupHistory();
            showToast('已重命名为 ' + next, 'success');
        };

        const deleteBackupManagerFile = async (record) => {
            if (!record || !record.id) return;
            const confirmed = await showVueConfirmModal('删除备份文件',
                '确认删除「' + record.fileName + '」吗？该文件会从备份文件夹里永久移除，删掉后无法找回。',
                { confirmText: '确认删除' });
            if (!confirmed) return;
            const bridge = window.AndroidBridge;
            if (!bridge?.isNativeApp?.() || typeof bridge.deleteBackupFile !== 'function') {
                showToast('当前环境不支持删除本地文件', 'error');
                return;
            }
            try {
                const ok = bridge.deleteBackupFile(record.id, record.isTreeDoc);
                if (!ok) throw new Error('底层删除未生效');
                await loadBackupManagerFiles();
                await loadAutoBackupHistory();
                showToast('已删除 ' + record.fileName, 'success');
            } catch (error) {
                showToast('删除失败：' + (error?.message || error), 'error', 4000);
            }
        };

        const exportBackupManagerFile = async (record) => {
            if (!record?.id || streamImportPanel.value?.isOpen) return;
            const bridge = window.AndroidBridge;
            const reader = typeof window.RPLocalFiles?.prepareBackupFileRead === 'function' ? window.RPLocalFiles : bridge;
            beginBackupTask('导出备份');
            let session, timer;
            const controller = new AbortController();
            const resetTimeout = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), 45000); };
            try {
                const fileName = record.fileName || 'RP本地版-数据备份.json';
                session = await openBackupPicker(fileName);
                if (!session) {
                    if (Number(record.sizeBytes) > LOCAL_BACKUP_READ_SAFE_BYTES) throw new Error('当前环境不支持大文件另存，请使用本地版');
                    const data = await readLocalBackupJson(bridge, record);
                    downloadJsonFile(data, fileName);
                } else if (typeof reader?.prepareBackupFileRead === 'function') {
                    const token = String(reader.prepareBackupFileRead(record.id, !!record.isTreeDoc) || '');
                    if (!token || token.startsWith('ERR:')) throw new Error(token.slice(4) || '读取备份失败');
                    resetTimeout();
                    const response = await fetch('__rphub_backup_read__?t=' + encodeURIComponent(token), { cache: 'no-store', signal: controller.signal });
                    if (!response.ok) throw new Error('读取备份失败');
                    const stream = response.body?.getReader?.(), decoder = new TextDecoder('utf-8', { fatal: true });
                    const total = Number(response.headers.get('content-length')) || Number(record.sizeBytes) || 0;
                    let bytes = 0;
                    try {
                        for (;;) {
                            const part = stream ? await stream.read() : { done: false, value: new Uint8Array(await response.arrayBuffer()) };
                            if (part.done) break;
                            writeBackupText(session, decoder.decode(part.value, { stream: true }));
                            bytes += part.value.byteLength;
                            Object.assign(backupTask, { percent: total ? Math.min(99, bytes / total * 100) : 0,
                                message: '正在另存备份文件', detail: '已写 ' + fmtMB(bytes) });
                            resetTimeout();
                            await new Promise(resolve => setTimeout(resolve, 0));
                            if (!stream) break;
                        }
                        writeBackupText(session, decoder.decode());
                    } finally { await stream?.cancel().catch(() => {}); }
                    await finishChunkedBackup(session, 1);
                } else {
                    if (Number(record.sizeBytes) > LOCAL_BACKUP_READ_SAFE_BYTES) throw new Error('请改用支持大文件读取的本地版');
                    const text = String(bridge.readBackupFileText(record.id, !!record.isTreeDoc) || '');
                    if (text.startsWith('ERR:')) throw new Error(text.slice(4));
                    writeBackupText(session, text);
                    await finishChunkedBackup(session, 1);
                }
                Object.assign(backupTask, { locked: false, percent: 100, message: '备份已另存' });
            } catch (error) {
                abortChunkedBackup(session);
                Object.assign(backupTask, { locked: false, error: error.name === 'AbortError' ? '读取超时，请重试' : error.message || String(error),
                    message: '另存未完成，请重试' });
            } finally { clearTimeout(timer); }
        };

        const backupScopeOptions = [
            { key: 'chat', label: '聊天记录' },
            { key: 'summary', label: '总结记忆' },
            { key: 'uiRuntime', label: 'UI变量' },
            { key: 'tokenUsage', label: '用量记录' },
            { key: 'localData', label: '本地状态与偏好' }
        ];
        const resetBackupScope = () => {
            backupScope.value = { ...BACKUP_SCOPE_DEFAULTS };
            showToast('备份范围已恢复全开', 'info');
        };
        // ---- 本地记忆（localStorage）----
        // 卡片 UI 存档、外观档位、留声机等只写 localStorage，不在 IndexedDB 里。
        // 全量备份必须单独收集这一份，否则换机/重装后这些数据不可恢复。
        // 条目 key 加 __ls__: 前缀以区分。
        const LOCAL_BACKUP_PREFIX = '__ls__:';
        const LOCAL_BACKUP_SKIP = ['rphub-web-error', 'roleplay_hub_update_id', window.RPReleaseNotes.marker];
        const collectLocalStorageEntries = () => {
            const list = [];
            try {
                for (let index = 0; index < localStorage.length; index++) {
                    const key = localStorage.key(index);
                    if (!key || key.startsWith(LOCAL_BACKUP_PREFIX)) continue;
                    if (LOCAL_BACKUP_SKIP.indexOf(key) !== -1) continue;
                    const raw = localStorage.getItem(key);
                    if (raw === null) continue;
                    list.push({ key: LOCAL_BACKUP_PREFIX + key, value: raw });
                }
            } catch (error) {
                console.warn('收集本地记忆失败:', error);
            }
            return list;
        };
        // ---- 旧版遗留数据（legacy 库 SillyTavernDB）----
        // 官方对改名前的旧数据走「读时惰性迁移」：主库读不到才去 legacy 库取，取到再写回主库
        // （data-services.js dbGetWithLegacy）。因此「从未被读过」的旧键会一直留在 legacy 库里，
        // 而备份只扫主库 ⇒ 会漏（老版本升级用户、从未打开过的角色聊天记录）。
        // 修法：扫 legacy 库 → 主库已有同逻辑键的跳过（主库为准，避免旧值覆盖新值）→
        //       其余统一改写成现行前缀 rp_hub_ 输出，恢复后即可被官方直接读到（无需改导入分支）。
        //       ⚠️ 不能原样保留 silly_tavern_ 前缀：导入只写主库，那样写回去官方永远读不到。
        const LEGACY_BACKUP_PREFIX = 'silly_tavern_';
        const LEGACY_BACKUP_MODERN_PREFIX = 'rp_hub_';
        const collectLegacyBackupEntries = async (currentEntries = []) => {
            const legacyDb = getLegacyDb();
            if (!legacyDb) return [];
            // 2.8.19：允许直接传逻辑键 Set —— 自动备份改流式后不再保留全量条目数组，
            // 只需要「主库已有哪些逻辑键」这一份 O(键数) 的信息。
            const existingLogicalKeys = currentEntries instanceof Set
                ? currentEntries
                : new Set((currentEntries || []).map(entry => getStorageLogicalKey(entry.key)));
            let legacyEntries = [];
            try {
                legacyEntries = await readMainDbEntries(legacyDb);
            } catch (error) {
                console.warn('读取旧版遗留数据失败:', error);
                return [];
            }
            const result = [];
            legacyEntries.forEach(entry => {
                if (!entry || typeof entry.key !== 'string') return;
                if (entry.key.indexOf(LEGACY_BACKUP_PREFIX) !== 0) return;
                const logicalKey = getStorageLogicalKey(entry.key);
                if (!logicalKey) return;
                if (existingLogicalKeys.has(logicalKey)) return;
                const modernEntry = { key: LEGACY_BACKUP_MODERN_PREFIX + logicalKey, value: entry.value };
                if (!shouldIncludeBackupEntry(modernEntry)) return;
                result.push(slimBackupEntry(modernEntry));
            });
            return result;
        };
        const slimUiTemplatesForBackup = (templates, includeRuntime) => Array.isArray(templates) ? templates.map(template => {
            const item = cloneForStorage(template);
            if (!includeRuntime) {
                delete item.runtimeByCharacter;
                delete item.changeLog;
            }
            return item;
        }) : templates;
        const slimBackupEntry = (entry, raw = false) => {
            const logicalKey = getStorageLogicalKey(entry.key);
            const value = raw === true ? entry.value : unwrapForStorage(entry.value);
            if (logicalKey === 'global_ui_templates') {
                return { key: entry.key, value: slimUiTemplatesForBackup(value, backupScope.value.uiRuntime) };
            }
            if (logicalKey === 'characters' && Array.isArray(value)) {
                return {
                    key: entry.key,
                    value: value.map(character => ({
                        ...character,
                        uiTemplates: slimUiTemplatesForBackup(character?.uiTemplates, backupScope.value.uiRuntime)
                    }))
                };
            }
            return { key: entry.key, value };
        };
        const isCoreBackupKey = (logicalKey) => [
            'active_profile_id', 'active_tools', 'branches', 'characters', 'global_regex',
            'global_ui_templates', 'global_worldinfo', 'last_active_char', 'memory_settings',
            'presets', 'preset_groups', 'regex', 'settings', 'user', 'user_profiles', 'worldinfo', 'worldinfo_settings'
        ].includes(logicalKey);
        const shouldIncludeBackupEntry = (entry) => {
            const logicalKey = getStorageLogicalKey(entry.key);
            if (logicalKey.startsWith('b1_memory_state_')) return backupScope.value.summary;
            if (isCoreBackupKey(logicalKey)) return true;
            if (logicalKey.startsWith('chat_')) return backupScope.value.chat;
            // 旧正文分片向量库（memories_）官方已停用，且 isOrphanedEntry 无条件判为孤儿数据；
            // 无恢复价值 ⇒ 硬排除，永不进备份（要释放空间请用官方「空间管理 → 清理无用残留」）。
            if (logicalKey.startsWith('memories_')) return false;
            if (logicalKey.startsWith('classic_memories_')) return backupScope.value.summary;
            if (logicalKey === 'token_usage_history') return backupScope.value.tokenUsage;
            return true;
        };

        const appBackupFolder = ref('');
        const defaultBackupFolder = computed(() => window.AndroidBridge?.isNativeApp?.()
            ? '下载 / RP本地版 / 数据备份' : '浏览器下载目录（由浏览器设置决定）');
        const isExportingAllData = ref(false);
        const backupFileName = ref('');
        const buildBackupFileName = () => {
            const date = new Date().toISOString().slice(0, 10);
            const rawName = String(backupFileName.value || '').trim() || ('RP本地版-数据备份-' + date);
            const safeName = rawName
                .replace(new RegExp('[' + String.fromCharCode(92) + '/:*?"<>|]', 'g'), '_')
                .replace(new RegExp(String.fromCharCode(92) + 's+', 'g'), '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 100) || ('RP本地版-数据备份-' + date);
            return /[.]json$/i.test(safeName) ? safeName : safeName + '.json';
        };
        const backupFileNamePreview = computed(() => buildBackupFileName());
        const syncAppBackupFolderBridge = () => {
            if (!window.AndroidBridge?.isNativeApp?.()) return;
            appBackupFolder.value = String(window.AndroidBridge.getBackupFolder?.() || '');
        };
        const chooseAppBackupFolder = () => {
            if (window.AndroidBridge?.isNativeApp?.() && typeof window.AndroidBridge.chooseBackupFolder === 'function') {
                window.AndroidBridge.chooseBackupFolder();
                return;
            }
            showToast('当前环境不支持选择默认保存文件夹', 'warning');
        };
        window.rphubBackupFolderChanged = (folderUri) => {
            appBackupFolder.value = String(folderUri || '');
            showToast(appBackupFolder.value ? '默认保存文件夹已更新' : '已清除默认保存文件夹', 'success');
        };
        const encodeBackupChunk = (text) => {
            const bytes = new TextEncoder().encode(text);
            let binary = '';
            const sliceSize = 0x8000;
            for (let index = 0; index < bytes.length; index += sliceSize) {
                binary += String.fromCharCode.apply(null, bytes.subarray(index, index + sliceSize));
            }
            return btoa(binary);
        };
        const jsonChunkStringifyEntry = (entry) => JSON.stringify(entry);
        // 2.8.19：返回本次实际写入的 UTF-8 字节数（由 base64 长度反推，±2 字节）。
        // 体积闸门需要按「文件真实字节」计量，而这里已经是唯一知道编码后长度的地方。
        const writeBackupText = (session, text) => {
            if (!text) return 0;
            let bytes = 0;
            const pieceSize = 0x80000;
            for (let start = 0; start < text.length;) {
                let end = Math.min(start + pieceSize, text.length);
                if (end < text.length) {
                    const tail = text.charCodeAt(end - 1);
                    if (tail >= 0xD800 && tail <= 0xDBFF) end += 1;
                }
                const encoded = encodeBackupChunk(text.slice(start, end));
                const result = String(session.bridge.writeBackupChunk(session.token, encoded) || '');
                if (result !== 'OK') {
                    throw new Error(result.startsWith('ERR:') ? result.slice(4) : '写入备份失败');
                }
                // btoa 输出长度恒为 4 的倍数，减去填充位即为原始字节数
                bytes += (encoded.length / 4) * 3 - (encoded.endsWith('==') ? 2 : (encoded.endsWith('=') ? 1 : 0));
                start = end;
            }
            return bytes;
        };
        // 2.8.78：落点参数。target 为 'downloads' 时走系统「下载」目录的创建接口，
        // 其余（含不传）走原来的默认备份文件夹。两个接口的流式协议完全一致
        // （create → writeBackupChunk → finishBackupWrite / abortBackupWrite），
        // 所以只在创建这一步分流，后续写入与收尾代码不用分叉。
        const startChunkedBackup = (fileName, target) => {
            const bridge = window.AndroidBridge;
            const toDownloads = target === 'downloads';
            const creatorName = toDownloads ? 'createBackupFileToDownloads' : 'createBackupFile';
            if (!bridge?.isNativeApp?.() || typeof bridge[creatorName] !== 'function' || typeof bridge.writeBackupChunk !== 'function' || typeof bridge.finishBackupWrite !== 'function') {
                return null;
            }
            const created = String(bridge[creatorName](fileName, 'application/json') || '');
            if (!created.startsWith('OK:')) {
                throw new Error(created.startsWith('ERR:') ? created.slice(4) : '创建备份文件失败');
            }
            return { bridge, token: created.slice(3), target: toDownloads ? 'downloads' : 'folder' };
        };
        const finishChunkedBackup = async (session, entryCount) => {
            try {
                const finished = String(session.bridge.finishBackupWrite(session.token) || '');
                if (finished !== 'OK') {
                    throw new Error(finished.startsWith('ERR:') ? finished.slice(4) : '完成备份写入失败');
                }
                // 2.8.78：按落点给不同提示。下载目录那份不在 App 的备份历史列表里
                // （历史只扫自定义文件夹与应用专属目录），所以必须说清楚去哪儿找。
                showToast(session.target === 'downloads'
                    ? `已保存到 下载 / RP本地版 / 数据备份（${entryCount} 项）`
                    : `已保存到默认备份文件夹（${entryCount} 项）`, 'success', 3000);
            } catch (error) {
                abortChunkedBackup(session);
                throw error;
            } finally {
                session.token = '';
            }
        };
        const abortChunkedBackup = (session) => {
            if (!session?.token) return;
            try {
                session.bridge.abortBackupWrite?.(session.token);
            } catch (error) {
                console.warn(error);
            } finally {
                session.token = '';
            }
        };
        const dataHealthResult = ref({ checkedAt: '', totalBytes: 0, items: [] });
        const dataHealthError = ref('');
        const isCheckingDataHealth = ref(false);
        const isCleaningDataHealth = ref(false);
        const getTokenUsageHealthLimit = () => Math.max(100, Number(settings.tokenUsageRetentionLimit) || 1000);
        const estimateDataHealthSize = (value) => {
            try {
                const text = JSON.stringify(value ?? null);
                // [rphub 2.8.103] 原来返回 text.length —— 那是 UTF-16 码元数，不是字节数。
                //   中文一个字算 1 个码元、实际 3 个字节，于是体检的「总占用」比真实体积小
                //   约 3 倍，和体积弹窗的「共 N 条 / X MB」对不上。改成 UTF-8 字节，两处一致。
                //   用 Blob.size 而不是 TextEncoder().encode().length：后者会造出等长
                //   Uint8Array 进堆（2.8.100 的教训）。纯 ASCII 时两者相同，走快路径。
                return /[^\x00-\x7f]/.test(text) ? new Blob([text]).size : text.length;
            } catch (error) {
                return 0;
            }
        };
        const formatDataHealthSize = (bytes) => {
            const size = Math.max(0, Number(bytes) || 0);
            if (size < 1024) return size + ' B';
            if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
            return (size / 1024 / 1024).toFixed(2) + ' MB';
        };
        const hashDataHealthString = (value) => {
            let hash = 2166136261;
            for (let index = 0; index < value.length; index += 1) {
                hash ^= value.charCodeAt(index);
                hash = Math.imul(hash, 16777619) >>> 0;
            }
            return hash.toString(36);
        };
        const getDataHealthUiSignature = (template) => {
            const item = template && typeof template === 'object' ? template : {};
            return JSON.stringify({ ...item, id: undefined });
        };
        const dedupeUiTemplatesForHealth = (templates) => {
            if (!Array.isArray(templates)) return { templates, removedCount: 0, savedBytes: 0 };
            const seen = new Set();
            const result = [];
            let removedCount = 0;
            let savedBytes = 0;
            templates.forEach(template => {
                const signature = getDataHealthUiSignature(template);
                if (seen.has(signature)) {
                    removedCount += 1;
                    savedBytes += estimateDataHealthSize(template);
                    return;
                }
                seen.add(signature);
                result.push(template);
            });
            return { templates: result, removedCount, savedBytes };
        };
        const slimChatHistoryForHealth = (history) => {
            if (!Array.isArray(history)) return { history, changed: false, savedBytes: 0, cleanedCount: 0 };
            const retention = getMobileUiTemplateRetention(history);
            let changed = false;
            let savedBytes = 0;
            let cleanedCount = 0;
            const result = history.map((message, index) => {
                if (retention.keptIndexes.has(index) || message?.role !== 'assistant') return message;
                const hasRenderCache = typeof message.renderedContent === 'string' && message.renderedContent.length > 0;
                if (!hasRenderCache) return message;
                savedBytes += hasRenderCache ? estimateDataHealthSize(message.renderedContent) : 0;
                cleanedCount += 1;
                const nextMessage = { ...message };
                delete nextMessage.renderedContent;
                changed = true;
                return nextMessage;
            });
            return { history: result, changed, savedBytes, cleanedCount };
        };
        const performDataHealthScan = async (options) => {
            const opts = options || {};
            const openSizeModal = opts.openSizeModal === true;
            if (isAutoBackingUp.value) {
                showToast('正在备份，请稍后再试', 'info');
                return;
            }
            isCheckingDataHealth.value = true;
            // [rphub 2.8.103] 体检要逐条 stringify 整库（角色卡一条就 187MB），期间必须挡住备份与
            //   每日提醒，否则两条路径同时持有整库副本，峰值直接翻倍。
            isAutoBackingUp.value = true;
            dataHealthError.value = '';
            try {
                await flushPendingChatHistorySave();
                if (!getMainDb()) await initDB();
                // [rphub 2.8.96] 还原预算必须在遍历之前取：遍历会把最大的一条（角色卡，用户实测
                //   186.93MB / 1 条）整份 stringify 出来，usedJSHeapSize 会被短暂抬高；此时再取
                //   budget = limit*0.85 - used 会把「可还原上限」算小一大截，显示出来就是错的。
                const restoreBudget = getRestoreBudget();
                // [rphub 2.8.101] 这个数就是弹窗里的「已用」：它在遍历之前取，
                //   所以不含本次分析的分配。它高，说明分析之前堆就已经高了。
                markHeap('analyze-begin');
                const items = [];
                let totalBytes = 0;
                let duplicateUiCount = 0;
                let duplicateUiBytes = 0;
                const duplicateUiTargets = [];
                let oldUiCacheCount = 0;
                let oldUiCacheBytes = 0;
                const oldUiCacheKeys = [];
                const imageDataUrls = new Map();
                const dataUrlPattern = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g;
                const tokenUsageLimit = getTokenUsageHealthLimit();
                // ---- 口径二（备份体积）的累加器：字段与 2.8.94 起逐字一致 ----
                let backupTotalBytes = 0;
                let backupCount = 0;
                const bucketStat = new Map();
                const characterSizes = [];
                let legacyBackupCount = 0;
                let legacyBackupBytes = 0;
                const legacyBackupKeys = [];

                // [rphub 2.8.103] 一次 cursor 遍历算两套口径：
                //   ① 体检：全部条目，estimateDataHealthSize 估算（含不进备份的条目）；
                //   ② 备份体积：只算 shouldIncludeBackupEntry 放行的条目，量的是 slimBackupEntry
                //      瘦身后 jsonChunkStringifyEntry 的 UTF-8 字节 —— 与真正写出去的文件同源。
                //   两套口径的条目集不同（backupScope 勾选项、memories_ 硬排除），所以不能并成一个数；
                //   但必须共用同一次遍历，否则 187MB 的角色卡要被 stringify 两遍。
                await readMainDbEntriesStream((entry) => {
                    const logicalKey = getStorageLogicalKey(entry.key);
                    const value = unwrapForStorage(entry.value);
                    totalBytes += estimateDataHealthSize(value);

                    if (logicalKey === 'characters' && Array.isArray(value)) {
                        value.forEach(character => {
                            const result = dedupeUiTemplatesForHealth(character?.uiTemplates);
                            if (result.removedCount > 0) {
                                duplicateUiCount += result.removedCount;
                                duplicateUiBytes += result.savedBytes;
                                duplicateUiTargets.push(character?.name || '未命名角色');
                            }
                        });
                    }
                    if (logicalKey === 'global_ui_templates' && Array.isArray(value)) {
                        const result = dedupeUiTemplatesForHealth(value);
                        if (result.removedCount > 0) {
                            duplicateUiCount += result.removedCount;
                            duplicateUiBytes += result.savedBytes;
                            duplicateUiTargets.push('全局 UI 模板');
                        }
                    }
                    if (logicalKey.startsWith('chat_') && Array.isArray(value)) {
                        const retention = getMobileUiTemplateRetention(value);
                        let entryOldCacheCount = 0;
                        value.forEach((message, index) => {
                            if (retention.keptIndexes.has(index) || message?.role !== 'assistant') return;
                            if (typeof message.renderedContent === 'string' && message.renderedContent.length > 0) {
                                entryOldCacheCount += 1;
                                oldUiCacheBytes += estimateDataHealthSize(message.renderedContent);
                            }
                        });
                        if (entryOldCacheCount > 0) {
                            oldUiCacheCount += entryOldCacheCount;
                            oldUiCacheKeys.push(entry.key);
                        }
                    }
                    if (logicalKey === 'token_usage_history' && Array.isArray(value) && value.length > tokenUsageLimit) {
                        const excess = value.slice(tokenUsageLimit);
                        items.push({
                            id: 'token-usage',
                            label: '用量记录超限',
                            detail: `保留最近 ${tokenUsageLimit} 条，可清理 ${value.length - tokenUsageLimit} 条。`,
                            bytes: estimateDataHealthSize(excess),
                            count: value.length - tokenUsageLimit,
                            cleanable: true,
                            action: 'trim-token-usage'
                        });
                    }

                    if (logicalKey === 'characters' || logicalKey === 'global_ui_templates') {
                        const serialized = JSON.stringify(value ?? null);
                        serialized.match(dataUrlPattern)?.forEach(dataUrl => {
                            const key = dataUrl.length + ':' + hashDataHealthString(dataUrl);
                            const info = imageDataUrls.get(key) || { count: 0, sampleLength: dataUrl.length };
                            info.count += 1;
                            imageDataUrls.set(key, info);
                        });
                    }

                    // ===== 口径二：只算会进备份的条目 =====
                    if (!shouldIncludeBackupEntry(entry)) return;
                    const slim = slimBackupEntry(entry);
                    const text = jsonChunkStringifyEntry(slim);
                    // [rphub 2.8.100] 数一个数字不该复制一整份数据：Blob 的字节落在 blob 存储里、
                    //   不进 JS 堆，Blob.size 就是同一个 UTF-8 字节数。
                    const bytes = /[^\x00-\x7f]/.test(text) ? new Blob([text]).size : text.length;
                    backupTotalBytes += bytes + 1;
                    backupCount += 1;
                    const bucketName = backupBucketOf(logicalKey);
                    const prevBucket = bucketStat.get(bucketName) || { bytes: 0, entries: 0 };
                    prevBucket.bytes += bytes + 1;
                    prevBucket.entries += 1;
                    bucketStat.set(bucketName, prevBucket);
                    // [rphub 2.8.96] 角色卡整库存在一条记录里，桶表只能告诉你「角色卡 187MB」，
                    //   告诉不了你是哪张卡。逐卡量一遍，才定位得到该删/该换封面的那张。
                    if (logicalKey === 'characters' && Array.isArray(slim.value)) {
                        slim.value.forEach((character) => {
                            if (!character || typeof character !== 'object') return;
                            let cardText = '';
                            try { cardText = JSON.stringify(character); } catch (_) { return; }
                            const cardBytes = /[^\x00-\x7f]/.test(cardText)
                                ? new Blob([cardText]).size : cardText.length;
                            const avatar = typeof character.avatar === 'string' ? character.avatar : '';
                            const avatarBytes = /[^\x00-\x7f]/.test(avatar)
                                ? new Blob([avatar]).size : avatar.length;
                            characterSizes.push({
                                name: String(character.name || character.characterName || '未命名角色'),
                                bytes: cardBytes,
                                avatarBytes
                            });
                        });
                    }
                    // [rphub 2.8.96/2.8.99] 旧版把整份备份再 setStoredValue 回主库，键名
                    //   auto_backup_<日期>_<ts>；当前版本只认 auto_backup_config，这类键没有读取路径。
                    if (logicalKey.indexOf('auto_backup_') === 0 && logicalKey !== 'auto_backup_config') {
                        legacyBackupCount += 1;
                        legacyBackupBytes += bytes + 1;
                        legacyBackupKeys.push(logicalKey);
                    }
                });

                if (duplicateUiCount > 0) {
                    items.push({
                        id: 'duplicate-ui',
                        label: '重复 UI 模板',
                        detail: '仅移除内容完全一致的模板副本，保留第一份。',
                        bytes: duplicateUiBytes,
                        count: duplicateUiCount,
                        cleanable: true,
                        action: 'dedupe-ui',
                        targets: duplicateUiTargets.slice(0, 5)
                    });
                }
                if (oldUiCacheCount > 0) {
                    items.push({
                        id: 'old-ui-cache',
                        label: '旧楼正文显示缓存',
                        detail: '清理重复的正文显示缓存，保留历史 UI 和变量。',
                        bytes: oldUiCacheBytes,
                        count: oldUiCacheCount,
                        cleanable: true,
                        action: 'slim-chat-ui',
                        keys: oldUiCacheKeys
                    });
                }
                let duplicateImageCount = 0;
                let duplicateImageBytes = 0;
                imageDataUrls.forEach(info => {
                    if (info.count <= 1) return;
                    duplicateImageCount += info.count - 1;
                    duplicateImageBytes += (info.count - 1) * info.sampleLength;
                });
                if (duplicateImageCount > 0) {
                    items.push({
                        id: 'duplicate-images',
                        label: '重复 Base64 图片',
                        detail: '当前为只读提示；直接改写引用有显示失败风险，暂不自动清理。',
                        bytes: duplicateImageBytes,
                        count: duplicateImageCount,
                        cleanable: false,
                        action: ''
                    });
                }

                // ---- 体积报告（口径二），字段与 2.8.101 逐字一致 ----
                // [rphub 2.8.95] 占比条宽度在 JS 里算好，模板不做算术
                const buckets = rankBackupBuckets(bucketStat, 12).map((item) => ({
                    name: item.name,
                    bytes: item.bytes,
                    entries: item.entries,
                    percent: backupTotalBytes > 0
                        ? Math.round(item.bytes / backupTotalBytes * 1000) / 10 : 0
                }));
                const bucketFull = buckets
                    .map((item, i) => (i + 1) + '. ' + item.name + ' ' + fmtBackupMB(item.bytes)
                        + '（' + item.entries + ' 条）')
                    .join('\n');
                console.log('[BackupAnalyze] 共 ' + backupCount + ' 条 / 约 ' + fmtBackupMB(backupTotalBytes)
                    + '\n摘要：' + (describeBackupBuckets(bucketStat, 3) || '未知')
                    + '\n' + bucketFull);
                characterSizes.sort((a, b) => b.bytes - a.bytes);
                const topCharacters = characterSizes.slice(0, 8).map((item) => ({
                    name: item.name,
                    bytes: item.bytes,
                    avatarBytes: item.avatarBytes,
                    percent: backupTotalBytes > 0
                        ? Math.round(item.bytes / backupTotalBytes * 1000) / 10 : 0
                }));
                const sizeLimit = getAutoBackupSizeLimit();
                // [rphub 2.8.96] 三档判定与 checkRestoreSize 完全同源，避免弹窗与还原提示打架。
                // [rphub 2.8.97] 闸门自该版起按还原上限放宽（基础 250MB，封顶 1GB）。
                const restoreLevel = backupTotalBytes <= restoreBudget.maxFileBytes
                    ? 'ok'
                    : (backupTotalBytes > restoreBudget.maxFileBytes * 3 ? 'refuse' : 'confirm');
                if (legacyBackupCount > 0) {
                    console.warn('[BackupAnalyze] 旧版遗留备份记录 ' + legacyBackupCount + ' 条 / 共 '
                        + fmtBackupMB(legacyBackupBytes) + '：当前版本不读取，也不参与还原');
                }
                // [rphub 2.8.99] 上一次还原的实测峰值（由 restorePeakDone 写入）。
                let lastRestorePeak = null;
                try {
                    lastRestorePeak = JSON.parse(localStorage.getItem(RESTORE_PEAK_KEY) || 'null');
                } catch (_) { lastRestorePeak = null; }
                const lastRestorePeakBytes = lastRestorePeak && lastRestorePeak.peakBytes > 0
                    ? Number(lastRestorePeak.peakBytes) : 0;
                const lastRestoreFileBytes = lastRestorePeak && lastRestorePeak.fileBytes > 0
                    ? Number(lastRestorePeak.fileBytes) : 0;
                const lastRestoreRatio = lastRestoreFileBytes > 0
                    ? Math.round(lastRestorePeakBytes / lastRestoreFileBytes * 100) / 100 : 0;
                const lastRestoreAtText = lastRestorePeak && lastRestorePeak.at
                    ? new Date(lastRestorePeak.at).toLocaleString() : '';
                const lastRestoreOverBudget = lastRestoreFileBytes > 0
                    && lastRestorePeakBytes > lastRestoreFileBytes * restoreBudget.perByte;
                // [rphub 2.8.101] 干完活时的堆：与 analyze-begin 的差值才是「分析自己造的」
                markHeap('analyze-end');
                // [rphub 2.8.101] 乐观上限：假设内存回到「加载完成时」的水平能还原多大。
                //   只用于显示，实际判据仍是 restoreMaxBytes（按当前已用），保守是对的。
                const _restoreBaseline = _loadEndHeapUsed || _minHeapUsedSeen;
                const restoreMaxBytesOptimistic = Math.max(8 * 1048576,
                    Math.floor(Math.max(0, restoreBudget.limit * 0.85 - _restoreBaseline)
                        / restoreBudget.perByte));
                backupSizeReport.value = {
                    checkedAt: new Date().toLocaleString(),
                    totalBytes: backupTotalBytes,
                    count: backupCount,
                    limitBytes: sizeLimit,
                    overLimit: backupTotalBytes > sizeLimit,
                    gateBaseBytes: AUTO_BACKUP_SIZE_LIMIT_BYTES,
                    gateCeilingBytes: AUTO_BACKUP_SIZE_CEILING_BYTES,
                    restoreMaxBytes: restoreBudget.maxFileBytes,
                    restoreLimit: restoreBudget.limit,
                    restoreUsed: restoreBudget.used,
                    restoreSource: restoreBudget.source,
                    restorePerByte: restoreBudget.perByte,
                    restoreLevel,
                    characters: topCharacters,
                    legacyBackupCount,
                    legacyBackupBytes,
                    legacyBackupKeys,
                    lastRestorePeakBytes,
                    lastRestoreFileBytes,
                    lastRestoreRatio,
                    lastRestoreAtText,
                    lastRestoreOverBudget,
                    restoreUsedBaselineBytes: _restoreBaseline,
                    restoreMaxBytesOptimistic,
                    restoreUsedPolluted: restoreBudget.used > 0 && _restoreBaseline > 0
                        && restoreBudget.used - _restoreBaseline > 256 * 1048576
                        && restoreBudget.used > backupTotalBytes * 2,
                    heapMarks: readHeapMarks().map((m) => ({
                        tag: String(m.tag || ''),
                        usedText: fmtMB(m.used),
                        atText: new Date(Number(m.at) || 0).toLocaleTimeString()
                    })),
                    buckets
                };

                dataHealthResult.value = {
                    checkedAt: new Date().toLocaleString(),
                    totalBytes,
                    items: items.sort((a, b) => b.bytes - a.bytes)
                };
                // [rphub 2.8.103] 体检默认只出内联结果；只有「清完遗留键原地刷新」那条路径
                //   （analyzeBackupSize）才顺带把体积弹窗打开。
                if (openSizeModal) showBackupSizeModal.value = true;
                showToast(openSizeModal ? '体积分析完成' : '数据体检完成', 'success');
            } catch (error) {
                console.error('Data health scan failed:', error);
                dataHealthError.value = error?.message || String(error);
                showToast('数据体检失败：' + (error?.message || error), 'error', 5000);
            } finally {
                isAutoBackingUp.value = false;
                isCheckingDataHealth.value = false;
            }
        };
        const scanDataHealth = async () => {
            if (isCheckingDataHealth.value || isCleaningDataHealth.value) return;
            await performDataHealthScan();
        };
        const cleanDataHealthItem = async (item) => {
            if (!item?.cleanable || isCleaningDataHealth.value) return;
            isCleaningDataHealth.value = true;
            try {
                if (item.action === 'dedupe-ui') {
                    let changed = false;
                    for (let index = 0; index < characters.value.length; index++) {
                        const character = await window.RPHubStorage.readCharacter(characters.value[index]);
                        const result = dedupeUiTemplatesForHealth(character?.uiTemplates);
                        if (result.removedCount > 0) {
                            character.uiTemplates = result.templates;
                            const library = characters.value.slice();
                            library[index] = character;
                            await window.RPHubStorage.saveCharacterLibrary(library);
                            characters.value[index] = index === currentCharacterIndex.value
                                ? character : await window.RPHubStorage.toCharacterStub(character);
                            changed = true;
                        }
                    }
                    const globalResult = dedupeUiTemplatesForHealth(globalUiTemplates.value);
                    if (globalResult.removedCount > 0) {
                        globalUiTemplates.value = globalResult.templates;
                        changed = true;
                    }
                    if (changed) {
                        await setStoredValue('global_ui_templates', globalUiTemplates.value);
                    }
                } else if (item.action === 'slim-chat-ui') {
                    if (!getMainDb()) await initDB();
                    const entries = await readMainDbEntries(getMainDb());
                    for (const entry of entries) {
                        if (!item.keys?.includes(entry.key)) continue;
                        const result = slimChatHistoryForHealth(unwrapForStorage(entry.value));
                        if (!result.changed) continue;
                        const logicalKey = getStorageLogicalKey(entry.key);
                        const scopeId = logicalKey.slice('chat_'.length);
                        await setScopedStoredValue('chat', scopeId, result.history, { clone: false });
                    }
                } else if (item.action === 'trim-token-usage') {
                    tokenUsageHistory.value = tokenUsageHistory.value.slice(0, getTokenUsageHealthLimit());
                    await saveTokenUsageHistoryNow();
                } else {
                    return;
                }
                showToast('清理完成', 'success');
                await performDataHealthScan();
            } catch (error) {
                console.error('Data health cleanup failed:', error);
                showToast('清理失败：' + (error?.message || error), 'error', 5000);
            } finally {
                isCleaningDataHealth.value = false;
            }
        };

        const showExportModal = ref(false);
        const exportType = ref(null); // 'presets', 'regex', 'worldinfo', 'uitemplates'
        const readMainDbEntries = async (targetDb) => {
            const entries = [];
            if (targetDb) await window.RPHubStorage.eachStoredEntry(targetDb, entry => entries.push(entry));
            return entries;
        };

        // [rphub 2.8.103] 不筛条目、逐条回调的流式读取。
        //   数据体检原本用 readMainDbEntries 把**全部条目一次性读进数组**，153 条里含 187MB 的
        //   characters，数组一直活到 forEach 结束，等于把整库钉在堆上。体积分析早就用流式
        //   （readMainDbEntriesSlim），但它会按 shouldIncludeBackupEntry 过滤，体检要全量，两者
        //   条目集不同。这里补一个不筛的流式版本，让体检也能逐条算完就丢。
        const readMainDbEntriesStream = async (onEntry) => {
            const targetDb = getMainDb();
            if (!targetDb) return;
            await window.RPHubStorage.eachStoredEntry(targetDb, onEntry);
        };
                // 2.8.14：indexedDB.open 对不存在的库会**创建空库**——没装插件的用户也会被留下
        // sf_moments_db 空库 litter。现代 WebView 有
        // indexedDB.databases() 时先探存在性；探测不可用按旧行为打开（打不开自然 resolve）。
        const companionDbExists = async (name) => {
            try {
                if (typeof indexedDB.databases === 'function') {
                    const list = await indexedDB.databases();
                    if (Array.isArray(list)) return list.some(db => db && db.name === name);
                }
            } catch (_) {}
            return true;
        };
        // 收集名场面手记数据库条目（2.8.19：留声机已下线，不再进备份）。
        const collectCompanionDatabasesDump = async () => {
            const dbs = {};
            // 2.8.19：留声机功能已下线（用户决定），不再随备份导出。
            // 注意：不删 sakura_gramophone_db 里的数据 —— 该库名与本机柳贯一插件同名同 store，
            // 删数据会连带影响插件一侧；这里只是停止「我们」读写它。
            // 1. 名场面手记
            try {
                const momentsExists = await companionDbExists('sf_moments_db');
                await new Promise(resolve => {
                    if (!momentsExists) return resolve();
                    const req = indexedDB.open('sf_moments_db', 1);
                    req.onsuccess = e => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains('moments')) { db.close(); return resolve(); }
                        const tx = db.transaction(['moments'], 'readonly');
                        const getReq = tx.objectStore('moments').get('list');
                        getReq.onsuccess = () => {
                            const list = getReq.result;
                            if (Array.isArray(list) && list.length) {
                                const records = list.map(m => ({ k: m.id || ('m_' + Date.now()), v: m }));
                                dbs.sf_moments_db = { moments: records };
                                dbs.SakuraMomentsDB = { moments: records };
                            }
                            db.close();
                            resolve();
                        };
                        getReq.onerror = () => { db.close(); resolve(); };
                    };
                    req.onerror = () => resolve();
                });
            } catch (e) {
                console.warn('收集名场面手记失败:', e);
            }

            return dbs;
        };

        const openBackupPicker = async (backupFileName) => {
            const bridge = window.AndroidBridge;
            if (!(bridge?.isNativeApp?.() && typeof bridge.beginPickerSave === 'function' && typeof bridge.writeBackupChunk === 'function' && typeof bridge.finishBackupWrite === 'function')) return false;
            const pickedToken = await new Promise((resolve) => {
                let settled = false;
                const finish = (value) => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
                const timer = setTimeout(() => finish(null), 180000);
                window.rphubPickerSaveReady = (token) => {
                    const value = String(token || '');
                    if (settled) { try { bridge.abortBackupWrite?.(value); } catch (_) {} return; }
                    finish(value);
                };
                window.rphubPickerSaveCancelled = () => finish(null);
                try {
                    bridge.beginPickerSave(backupFileName, 'application/json');
                    showToast('正在打开系统保存位置，请选择文件保存', 'info', 3000);
                } catch (error) {
                    finish(null);
                }
            });
            if (!pickedToken) throw new Error('已取消保存，原数据未改动');
            return { bridge, token: pickedToken };
        };
        const exportAllData = async (pickLocation = false) => {
            if (isExportingAllData.value) {
                showToast('正在导出，请稍候', 'info');
                return;
            }
            isExportingAllData.value = true;
            beginBackupTask('导出备份');
            let session = null;
            let browserWriter;
            try {
                if (isConversationBusy.value || isClassicBatchExtracting.value) throw new Error('请先停止当前生成或记忆补录，再进行备份');
                await flushPendingChatHistorySave();
                if (!getMainDb()) await initDB();
                const fileName = buildBackupFileName();
                const nativeBridge = window.AndroidBridge;
                const nativeExportTarget = nativeBridge?.isNativeApp?.()
                    ? (String(appBackupFolder.value || nativeBridge.getBackupFolder?.() || '').trim()
                        ? 'folder'
                        : (typeof nativeBridge.createBackupFileToDownloads === 'function' ? 'downloads' : ''))
                    : '';
                if (pickLocation === true) session = await openBackupPicker(fileName);
                if (!session && nativeExportTarget) {
                    session = startChunkedBackup(fileName, nativeExportTarget);
                }
                if (!session) session = await openBackupPicker(fileName);
                if (!session && !nativeBridge?.isNativeApp?.() && window.showSaveFilePicker) {
                    browserWriter = await (await window.showSaveFilePicker({ suggestedName: fileName,
                        types: [{ description: 'JSON 备份', accept: { 'application/json': ['.json'] } }] })).createWritable();
                }
                const sources = [getMainDb(), getLegacyDb()].filter(Boolean);
                const keys = await Promise.all(sources.map(db => window.RPHubStorage.readStorageKeys(db)));
                const seen = new Set(), local = backupScope.value.localData ? collectLocalStorageEntries() : [];
                const entries = async function* () {
                    for (const db of sources) {
                        for await (const entry of window.RPHubStorage.iterateStoredEntries(db, false,
                            key => !seen.has(getStorageLogicalKey(key)) && shouldIncludeBackupEntry({ key }))) {
                            const logical = getStorageLogicalKey(entry.key);
                            if (seen.has(logical)) continue;
                            seen.add(logical);
                            const item = { key: 'rp_hub_' + logical, value: entry.value };
                            if (shouldIncludeBackupEntry(item)) yield item;
                        }
                    }
                    yield* local;
                };
                const parts = [];
                let fallbackBytes = 0;
                const result = await window.RPBackupTransfer.writeBackup({
                    profile: backupProfile.value,
                    entries: entries(), total: new Set(keys.flat().filter(key => !key.startsWith('__rp_')
                        && shouldIncludeBackupEntry({ key })).map(getStorageLogicalKey)).size + local.length,
                    readCharacter: window.RPHubStorage.readCharacter,
                    transform: entry => slimBackupEntry(entry, true), companions: collectCompanionDatabasesDump,
                    webStorage: () => Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
                        .filter(Boolean).map(key => [key, localStorage.getItem(key)])),
                    progress: value => Object.assign(backupTask, { percent: value.percent, message: value.message,
                        detail: value.done + ' / ' + value.total + ' 项 · 已写 ' + fmtMB(value.bytes) }),
                    write: async text => {
                        if (session) writeBackupText(session, text);
                        else if (browserWriter) await browserWriter.write(text);
                        else {
                            fallbackBytes += text.length * 2;
                            if (fallbackBytes > 64 * 1048576) throw new Error('当前环境不支持大文件直接保存，请在本地版或支持文件保存的浏览器中导出');
                            parts.push(text);
                        }
                    }
                });
                if (session) await finishChunkedBackup(session, result.count);
                else if (browserWriter) await browserWriter.close();
                else {
                    const blob = new Blob(parts, { type: 'application/json' });
                    if (nativeBridge?.isNativeApp?.()) cardUtils.downloadBlob(blob, fileName);
                    else {
                        const url = URL.createObjectURL(blob), link = document.createElement('a');
                        link.href = url; link.download = fileName; link.click();
                        setTimeout(() => URL.revokeObjectURL(url), 3000);
                    }
                }
                Object.assign(backupTask, { percent: 100, locked: false, message: '备份已导出' });
                showToast(`已导出全部软件数据（${result.count} 项）`, 'success');
            } catch (error) {
                console.error('Full backup failed:', error);
                abortChunkedBackup(session);
                await browserWriter?.abort().catch(() => {});
                Object.assign(backupTask, { locked: false, error: error.message || String(error), message: '导出未完成，请重新尝试' });
            } finally {
                isExportingAllData.value = false;
            }
        };

        const slimFullBackupImportEntries = async (entries = []) => {
            let duplicateUiCount = 0;
            let oldCacheCount = 0;
            let trimmedUsageCount = 0;
            const usageLimit = Math.max(100, Number(settings.tokenUsageRetentionLimit) || 1000);
            const prepared = [];

            for (const entry of entries) {
                if (!entry || typeof entry.key !== 'string' || entry.key.indexOf(LOCAL_BACKUP_PREFIX) === 0) {
                    continue;
                }
                const logicalKey = getStorageLogicalKey(entry.key);
                const value = unwrapForStorage(entry.value);

                if (logicalKey === 'characters' && Array.isArray(value)) {
                    let removed = 0;
                    const nextValue = [];
                    for (const character of value) {
                        if (!character || typeof character !== 'object') {
                            nextValue.push(character);
                            continue;
                        }
                        const result = dedupeUiTemplatesForHealth(character.uiTemplates);
                        removed += result.removedCount;
                        let nextChar = result.removedCount > 0 ? { ...character, uiTemplates: result.templates } : { ...character };

                        // 2.8.19：此处曾把「data:image 且长度 > 1000000」的角色头像重编码为
                        // JPEG（最长边 512 / 质量 0.82）并把结果写回本地库 ⇒ 每轮「导出→导入」
                        // 再编一次，封面图逐轮变糊（PNG 封面最容易被选中）。恢复的语义应是
                        // 原样还原，故整段移除（含 compressAvatarDataUrl 函数）。
                        nextValue.push(nextChar);
                    }
                    duplicateUiCount += removed;
                    prepared.push({ key: entry.key, value: nextValue });
                    continue;
                }

                if (logicalKey === 'global_ui_templates' && Array.isArray(value)) {
                    const result = dedupeUiTemplatesForHealth(value);
                    duplicateUiCount += result.removedCount;
                    prepared.push(result.removedCount > 0 ? { key: entry.key, value: result.templates } : entry);
                    continue;
                }

                if (logicalKey.startsWith('chat_') && Array.isArray(value)) {
                    const result = slimChatHistoryForHealth(value);
                    oldCacheCount += result.cleanedCount;
                    prepared.push(result.changed ? { key: entry.key, value: result.history } : entry);
                    continue;
                }

                if (logicalKey === 'token_usage_history' && Array.isArray(value) && value.length > usageLimit) {
                    trimmedUsageCount += value.length - usageLimit;
                    prepared.push({ key: entry.key, value: value.slice(0, usageLimit) });
                    continue;
                }

                prepared.push(entry);
            }
            return { entries: prepared, duplicateUiCount, oldCacheCount, trimmedUsageCount };
        };
        // 辅助：智能解析并转换外部/插件备份包为标准 entries 与附加表数据
        const parseUniversalBackupPackage = async (data) => {
            return window.RPBackupFormat.normalizePackage(data);
        };

        // 辅助：将备份中携带的名场面库还原到本地对应 IndexedDB（2.8.19：留声机已下线）
        const restoreCompanionDatabases = async (extraDbs) => {
            if (!extraDbs || typeof extraDbs !== 'object') return;
            // 2.8.19：留声机功能已下线（用户决定），备份不再携带其数据；这里也不再还原。
            // 旧备份里若含 sakura_gramophone_db 会被静默忽略（该库的数据本身不动）。
            // 1. 名场面手记 (支持 sf_moments_db / moments 与 SakuraMomentsDB / moments)
            const mmData = (extraDbs.sf_moments_db && extraDbs.sf_moments_db.moments)
                        || (extraDbs.SakuraMomentsDB && extraDbs.SakuraMomentsDB.moments)
                        || (extraDbs.moments && extraDbs.moments.list);
            if (mmData) {
                try {
                    let list = [];
                    if (Array.isArray(mmData)) {
                        list = mmData.map(item => (item && typeof item === 'object' && item.v !== undefined ? item.v : item));
                    } else if (typeof mmData === 'object' && Array.isArray(mmData.list)) {
                        list = mmData.list;
                    }
                    if (list.length) {
                        await new Promise((resolve) => {
                            const req = indexedDB.open('sf_moments_db', 1);
                            req.onupgradeneeded = e => {
                                const db = e.target.result;
                                if (!db.objectStoreNames.contains('moments')) db.createObjectStore('moments');
                            };
                            req.onsuccess = e => {
                                const db = e.target.result;
                                const tx = db.transaction(['moments'], 'readwrite');
                                tx.objectStore('moments').put(list, 'list');
                                tx.oncomplete = () => { db.close(); resolve(); };
                                tx.onerror = () => { db.close(); resolve(); };
                            };
                            req.onerror = () => resolve();
                        });
                    }
                } catch (e) {
                    console.warn('[CompanionDB] 恢复名场面手记失败:', e);
                }
            }
        };

                // 辅助：从 ZIP 中解析所有 chunk 数据
        const parseUniversalZipPackage = async (file) => {
            if (!window.JSZip) throw new Error('ZIP 组件尚未加载完成，请稍候重试');
            const data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onprogress = event => { if (event.lengthComputable) backupTask.percent = event.loaded / event.total * 15; };
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
                reader.readAsArrayBuffer(file);
            });
            const zip = await window.JSZip.loadAsync(data);
            const mfEntry = zip.file('manifest.json');
            if (!mfEntry) throw new Error('不是有效的 ZIP 备份：缺少 manifest.json');
            const manifest = JSON.parse(await mfEntry.async('string'));

            let entries = [];
            let extraDatabases = {};
            let webStorage = {};

            // 1. 读取网页存储
            const lsEntry = zip.file('storage/localStorage.json');
            if (lsEntry) {
                try {
                    const lsData = JSON.parse(await lsEntry.async('string') || '{}');
                    webStorage.localStorage = lsData;
                    Object.keys(lsData).forEach(k => {
                        entries.push({ key: LOCAL_BACKUP_PREFIX + k, value: lsData[k] });
                    });
                } catch (e) {
                    console.warn('[ZIP Import] 解析 localStorage.json 失败:', e);
                }
            }

            // 2. 遍历各数据库及其分块 chunk
            const databases = manifest.databases || [];
            const totalChunks = databases.reduce((sum, db) => sum + (db.stores || []).reduce((n, store) => n + (store.chunks || []).length, 0), 0);
            let readChunks = 0;
            for (const dbm of databases) {
                const dbName = dbm.name;
                extraDatabases[dbName] = extraDatabases[dbName] || {};
                for (const stm of (dbm.stores || [])) {
                    const storeName = stm.store;
                    const records = [];
                    for (const path of (stm.chunks || [])) {
                        const chunkEntry = zip.file(path);
                        if (!chunkEntry) continue;
                        const text = await chunkEntry.async('string');
                        if (!text) continue;
                        text.split(String.fromCharCode(10)).forEach(line => {
                            if (line && line.trim()) {
                                try { records.push(JSON.parse(line)); } catch (_) {}
                            }
                        });
                        backupTask.percent = 15 + ++readChunks / Math.max(1, totalChunks) * 40;
                        backupTask.message = '正在解压与校验';
                        backupTask.detail = readChunks + ' / ' + totalChunks + ' 块';
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                    extraDatabases[dbName][storeName] = records;

                    // 若为主库 RPHubDB 的 store，则填充到 entries
                    if ((dbName === 'RPHubDB' || dbName === 'main') && storeName === 'store') {
                        records.forEach(rec => {
                            if (rec && typeof rec === 'object') {
                                const k = rec.k !== undefined ? rec.k : rec.key;
                                const v = rec.v !== undefined ? rec.v : rec.value;
                                if (k !== undefined) entries.push({ key: String(k), value: v });
                            }
                        });
                    }
                }
            }

            return {
                entries,
                extraDatabases,
                webStorage,
                isPluginFormat: true,
                isZipFormat: true,
                manifest
            };
        };

        const importAllData = (event) => {
            const input = event.target;
            const file = input.files?.[0];
            if (!file) return;
            if (streamImportPanel.value?.isOpen) return;
            if (!/\.zip$/i.test(file.name)) return streamImportPanel.value.start(event);
            beginBackupTask('导入备份');

            const handleSuccess = async (pack) => {
                try {
                    if (!pack.entries || !pack.entries.length) throw new Error('备份文件中未找到有效的应用数据条目');
                    pack.entries = window.RPBackupFormat.prepareMemoryEntries(pack.entries);
                    const confirmed = await confirmBackupTask('导入备份', '备份已读取。将覆盖对应的现有数据，请先保留当前备份，再确认导入。');
                    if (!confirmed) { backupTask.message = '已取消，原数据未改动'; return; }
                    await flushPendingChatHistorySave();
                    if (!getMainDb()) await initDB();

                    const report = await slimFullBackupImportEntries(pack.entries);

                    // ================= 2.8.51：导入预校验 =================
                    // 原实现有三处会静默丢数据，且都在「写库之后」：
                    //   ① parseUniversalZipPackage 遇到缺失 chunk 是 `continue`、单行 JSON 坏了是空 catch；
                    //   ② localStorage 恢复是 try/catch 静默吞，配额打满时前几个键写进去、后面全丢；
                    //   ③ 原先的附加清理步骤会抛错，且排在 IDB 事务提交之后
                    //      ⇒ 库已被覆盖、页面报"导入失败"，用户看到的是半导入。
                    // 这里把校验全部提到动数据之前：只在内存里算，一旦不过就一格不写。
                    const preflight = (() => {
                        const problems = [];
                        const warnings = [];
                        const seenKeys = new Set();
                        const idbEntries = [];
                        let duplicatedKeys = 0;

                        for (const entry of report.entries) {
                            if (!entry || typeof entry.key !== 'string' || !entry.key) {
                                warnings.push('有 1 个条目缺少存储键，已跳过');
                                continue;
                            }
                            if (seenKeys.has(entry.key)) duplicatedKeys += 1;
                            seenKeys.add(entry.key);
                            if (entry.value === undefined) {
                                warnings.push('条目值为空，已跳过：' + entry.key);
                                continue;
                            }
                            try {
                                IDBKeyRange.only(entry.key);
                            } catch (_) {
                                warnings.push('存储键类型非法，已跳过：' + entry.key);
                                continue;
                            }
                            idbEntries.push(entry);
                        }
                        if (duplicatedKeys > 0) warnings.push('有 ' + duplicatedKeys + ' 个重复存储键，以最后一条为准');

                        // localStorage 那一份走 pack.entries —— slimFullBackupImportEntries 已经把
                        // __ls__: 前缀的条目从 report.entries 里剔掉了，这里必须回原始包取。
                        const lsItems = [];
                        let lsBytes = 0;
                        for (const entry of (pack.entries || [])) {
                            if (!entry || typeof entry.key !== 'string') continue;
                            if (entry.key.indexOf(LOCAL_BACKUP_PREFIX) !== 0) continue;
                            const text = String(entry.value === null || entry.value === undefined ? '' : entry.value);
                            lsItems.push({ key: entry.key.slice(LOCAL_BACKUP_PREFIX.length), text: text });
                            lsBytes += (entry.key.length + text.length) * 2;
                        }

                        // 插件 ZIP 的 manifest 里带每张表的声明条数。缺 chunk / 坏行会被解析器
                        // 静默跳过，只有拿声明数和实际解出数对账才抓得住。
                        const manifest = pack.manifest;
                        if (manifest && Array.isArray(manifest.databases)) {
                            manifest.databases.forEach(function (db) {
                                const dbDump = pack.extraDatabases && pack.extraDatabases[db && db.name];
                                const stores = (db && Array.isArray(db.stores)) ? db.stores : [];
                                stores.forEach(function (stm) {
                                    const storeName = stm && stm.store;
                                    const actual = (dbDump && Array.isArray(dbDump[storeName])) ? dbDump[storeName].length : 0;
                                    const declared = Number(stm && stm.records) || 0;
                                    if (actual !== declared) {
                                        problems.push('数据块不完整：' + (db.name || '?') + '/' + (storeName || '?')
                                            + ' 应有 ' + declared + ' 条，实际 ' + actual + ' 条');
                                    }
                                });
                            });
                        }
                        const declaredLs = manifest && manifest.webStorage && manifest.webStorage.localStorage;
                        if (typeof declaredLs === 'number' && declaredLs !== lsItems.length) {
                            problems.push('网页存储不完整：应有 ' + declaredLs + ' 项，实际 ' + lsItems.length + ' 项');
                        }

                        return {
                            problems: problems,
                            warnings: warnings,
                            idbEntries: idbEntries,
                            lsItems: lsItems,
                            lsBytes: lsBytes
                        };
                    })();

                    if (!preflight.idbEntries.length && !preflight.lsItems.length) {
                        throw new Error('备份里没有任何可导入的数据，已中止（未改动任何数据）');
                    }
                    if (preflight.problems.length) {
                        const head = preflight.problems.slice(0, 3).join('；');
                        const more = preflight.problems.length > 3 ? ' 等 ' + preflight.problems.length + ' 项' : '';
                        throw new Error('备份内容不完整，已中止（未改动任何数据）：' + head + more);
                    }
                    if (preflight.warnings.length) {
                        const head = preflight.warnings.slice(0, 3).join('；');
                        const more = preflight.warnings.length > 3 ? ' 等 ' + preflight.warnings.length + ' 项' : '';
                        const goOn = await confirmBackupTask('备份有异常条目',
                            '校验发现：' + head + more + '。继续导入会缺少这部分数据。仍要继续吗？',
                            { confirmText: '仍然导入' });
                        if (!goOn) return;
                    }

                    // 配额预检：localStorage 写满时的表现是「前面几个键成功、后面静默失败」，
                    // 事后无法分辨，所以必须在写之前拦住。拿不到 estimate 就放行，不误伤。
                    try {
                        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
                            const est = await navigator.storage.estimate();
                            const quota = Number(est && est.quota) || 0;
                            const usage = Number(est && est.usage) || 0;
                            if (quota > 0) {
                                const reserve = Math.max(quota * 0.08, 4 * 1048576);
                                const room = Math.max(0, quota - usage);
                                if (preflight.lsBytes + reserve > room) {
                                    throw new Error('浏览器存储空间不足：网页存储需约 ' + fmtMB(preflight.lsBytes)
                                        + '，当前可用约 ' + fmtMB(room) + '。请先在设置里清理缓存或删除部分聊天记录后重试。'
                                        + '本次导入未改动任何数据。');
                                }
                            }
                        }
                    } catch (quotaError) {
                        if (quotaError && /存储空间不足/.test(String(quotaError.message || ''))) throw quotaError;
                    }

                    // ---- 写：快照 → 严格写 → 失败整体回滚 ----
                    const snapshotWebStorage = () => {
                        const map = new Map();
                        try {
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (key == null) continue;
                                map.set(key, localStorage.getItem(key));
                            }
                        } catch (_) { }
                        return map;
                    };
                    const rollbackWebStorage = (snap) => {
                        const failed = [];
                        try {
                            const current = [];
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (key != null) current.push(key);
                            }
                            current.forEach(key => {
                                if (snap.has(key)) return;
                                try { localStorage.removeItem(key); } catch (_) { failed.push(key); }
                            });
                            snap.forEach((value, key) => {
                                try {
                                    if (localStorage.getItem(key) !== value) localStorage.setItem(key, value);
                                } catch (_) { failed.push(key); }
                            });
                        } catch (_) {
                            failed.push('(扫描失败)');
                        }
                        return failed;
                    };
                    const writeWebStorageStrict = (items) => {
                        items.forEach(item => { localStorage.setItem(item.key, item.text); });
                        const mismatched = [];
                        items.forEach(item => {
                            if (localStorage.getItem(item.key) !== item.text) mismatched.push(item.key);
                        });
                        if (mismatched.length) {
                            throw new Error('网页存储写入后校验不一致：' + mismatched.slice(0, 3).join('、'));
                        }
                    };

                    const webStorageSnapshot = snapshotWebStorage();
                    let storageTouched = false;
                    let databaseCommitted = false;
                    try {
                        await pauseBackupWrites();
                        // 旧总纲清理自己会抛错，必须排在写库之前，否则就是「库已覆盖 + 报失败」。
                        storageTouched = true;
                        writeWebStorageStrict(preflight.lsItems);

                        // 同一道恢复屏障：放在建事务之前，损坏的版本记录不会写进半个库
                        const restoredEntries = window.RPHubStorage.prepareRestoredMemoryEntries(preflight.idbEntries);
                        const transaction = getMainDb().transaction(['store'], 'readwrite');
                        const store = transaction.objectStore('store');
                        backupTask.message = '正在写入备份';
                        let written = 0;
                        restoredEntries.forEach(entry => {
                            // [rphub 2.8.98] 同自动备份还原那条：去掉多余 clone。
                            //   preflight.idbEntries 同样来自 slimFullBackupImportEntries，
                            //   即 JSON.parse 的纯对象，不含代理 / Date / ArrayBuffer。
                            //   __rphub_bin__ 仍在 restore 这一步转 Blob，语义不变。
                            const request = putBackupEntry(store, entry);
                            if (request) request.onsuccess = () => {
                                backupTask.percent = 60 + ++written / restoredEntries.length * 35;
                                backupTask.detail = written + ' / ' + restoredEntries.length + ' 项';
                            };
                        });
                        await new Promise((resolve, reject) => {
                            transaction.oncomplete = resolve;
                            transaction.onerror = () => reject(transaction.error);
                            transaction.onabort = () => reject(transaction.error);
                        });
                        databaseCommitted = true;

                        await restoreCompanionDatabases(pack.extraDatabases);
                    } catch (writeError) {
                        const rollbackFailed = storageTouched ? rollbackWebStorage(webStorageSnapshot) : [];
                        if (!databaseCommitted) resumeBackupWrites();
                        else setTimeout(() => window.location.reload(), 1500);
                        const stage = databaseCommitted
                            ? '（数据库已写入新数据，网页存储已回滚；请重新导入以补齐）'
                            : '（已回滚，数据保持导入前的状态）';
                        const tail = rollbackFailed.length
                            ? '；回滚未完全成功（' + rollbackFailed.length + ' 项），请保留备份文件'
                            : '';
                        const reason = (writeError && writeError.message) ? writeError.message : String(writeError);
                        throw new Error(reason + stage + tail);
                    }

                    showToast('全量数据导入成功，正在刷新页面', 'success');
                    Object.assign(backupTask, { percent: 100, message: '导入完成，正在重新打开' });
                    try {
                        if (window.AndroidBridge && typeof window.AndroidBridge.clearPatchCacheBeforeReload === 'function') {
                            window.AndroidBridge.clearPatchCacheBeforeReload();
                        }
                    } catch (cacheError) {
                        console.warn('清补丁缓存失败，仍继续刷新:', cacheError);
                    }
                    setTimeout(() => window.location.reload(), 500);
                } catch (err) {
                    Object.assign(backupTask, { locked: false, error: err.message || String(err), message: '导入未完成' });
                } finally {
                    input.value = '';
                    if (backupTask.percent < 100) backupTask.locked = false;
                }
            };

            const handleError = (error) => {
                input.value = '';
                Object.assign(backupTask, { locked: false, error: error.message || String(error), message: '读取失败，原数据未改动' });
            };

            const fileName = (file.name || '').toLowerCase();
            if (fileName.endsWith('.zip')) {
                // 2.8.78：ZIP 路径此前完全没有体积闸门。JSZip 的 loadAsync 会把整包读进内存，
                // 且每个条目 async('string') 的解压结果会被缓存，峰值远高于压缩包本身。
                // 这里按压缩包体积 × 4 折算成等效 JSON 字节，走与 JSON 路径同一套判据：
                // 文本类数据 ZIP 一般压到 1/3~1/4，解压后还要再 JSON.parse 成对象图。
                const ZIP_PEAK_FACTOR = 4;
                const zipBytes = file.size * ZIP_PEAK_FACTOR;
                const startZipRead = () => parseUniversalZipPackage(file).then(handleSuccess).catch(handleError);
                const zipVerdict = checkRestoreSize(zipBytes, file.name || '');
                if (zipVerdict === 'refuse') {
                    confirmBackupTask('备份远超设备上限',
                        '这个 ZIP 备份有 ' + fmtMB(file.size) + '，解压后约 ' + fmtMB(zipBytes)
                        + '，超过当前设备预检上限（约 ' + fmtMB(getRestoreBudget().maxFileBytes)
                        + '）的 3 倍以上。继续导入很可能直接闪退，且不会改动任何现有数据。'
                        + '建议先在电脑上解压整理或换用更小的备份。仍要强行尝试吗？',
                        { confirmText: '强行导入' }).then(function (goOn) {
                            if (goOn) { startZipRead(); } else { input.value = ''; backupTask.locked = false; backupTask.message = '已取消'; }
                        });
                } else if (zipVerdict === 'confirm') {
                    confirmBackupTask('备份较大，导入可能失败',
                        '这个 ZIP 有 ' + fmtMB(file.size) + '，解压后约 ' + fmtMB(zipBytes)
                        + '，当前设备内存偏紧（预检上限约 ' + fmtMB(getRestoreBudget().maxFileBytes)
                        + '）。继续导入有失败甚至闪退的风险。仍要尝试吗？',
                        { confirmText: '仍然导入' }).then(function (goOn) {
                            if (goOn) { startZipRead(); } else { input.value = ''; backupTask.locked = false; backupTask.message = '已取消'; }
                        });
                } else {
                    startZipRead();
                }
            }
        };
        const exportItems = ref([]);
        const prepareStreamImport = async () => {
            if (isConversationBusy.value) throw new Error('请先停止当前生成再导入数据');
            await flushPendingChatHistorySave();
        };
        const selectedExportIndices = ref(new Set());

        // Character Export Modal State
        const showCharacterExportModal = ref(false);
        const characterToExportIndex = ref(null);

        const openCharacterExportModal = (index) => {
            characterToExportIndex.value = index;
            showCharacterExportModal.value = true;
        };

        const confirmCharacterExport = (type) => {
            showCharacterExportModal.value = false;
            if (characterToExportIndex.value !== null) {
                if (type === 'json') {
                    exportCharacterJson(characterToExportIndex.value);
                } else if (type === 'chat') {
                    // [RP-Hub 2.8.43] 先选导出内容再导出。index 必须在清空前取出，
                    // 否则回调触发时它已经是 null。
                    const rphubChatExportIndex = characterToExportIndex.value;
                    openChatExportPanel(characters.value[rphubChatExportIndex], () => exportCharacterChat(rphubChatExportIndex));
                } else {
                    exportCharacterPng(characterToExportIndex.value);
                }
                characterToExportIndex.value = null;
            }
        };

        // Generator State
        const isGeneratorLoading = ref(true);
        const generatorUrl = ref('./character/index.html');

        const onGeneratorLoad = () => {
            isGeneratorLoading.value = false;
            syncSettingsToGenerator();
        };

        // Square State
        const isSquareLoading = ref(true);
        const squareUrl = ref('https://rphforum.zeabur.app/');

        // [RP-Hub 2.8.46] native 接管 target="_blank" 后，指向广场的链接转到这里：
        // 直接在 App 内的万相广场打开，而不是另起浏览器、更不是原来的「点了没反应」。
        window.rphubOpenSquare = (url) => {
            if (typeof url === 'string' && url) squareUrl.value = url;
            isSquareLoading.value = true;
            navigateWorkspace('square');
        };

        const onSquareLoad = () => {
            isSquareLoading.value = false;
            getSquareFrame()?.contentWindow.postMessage({ type: 'RPHUB_IMPORT_READY' }, new URL(squareUrl.value).origin);
        };

        // Novel State
        const isNovelLoading = ref(true);
        const novelUrl = ref('./novel/index.html');

        // [RP-Hub 2.8.44] 灯塔：走官方 embedded-view-content 加载外部站点，
        // 与「万相广场」完全同构（沙箱已放开 scripts/forms/popups/modals/downloads）。
        const isLighthouseLoading = ref(true);
        const lighthouseUrl = ref('https://wxdt.duckdns.org/');

        // [RP-Hub 2.8.48] 灯塔登录兜底。
        // 灯塔的登录态只存在服务端 cookie 里（/api/state 响应头 Vary: Cookie），
        // iframe 嵌入属第三方上下文；2.8.47 放行第三方 cookie 后仍有用户
        // 「提示登录成功、实际未登录」（站点 accountSubmit 先弹成功文案再判 ownerUid），
        // 说明该放行在其机型/WebView 版本上并未真正生效。
        // 这里给一个原生独立窗口入口：Java 侧用独立 WebView 以**顶层文档**加载灯塔
        // ⇒ 第一方上下文，cookie 的存储与发送都不再受第三方策略影响。
        const openLighthouseWindow = () => {
            try {
                if (window.AndroidBridge && window.AndroidBridge.openLighthouse) {
                    window.AndroidBridge.openLighthouse(lighthouseUrl.value);
                    return;
                }
            } catch (e) {
                // 落到下面的兜底
            }
            try {
                window.open(lighthouseUrl.value, '_blank');
            } catch (e) {
                // ignore
            }
        };
        const onLighthouseLoad = () => {
            isLighthouseLoading.value = false;
        };

        const onNovelLoad = () => {
            isNovelLoading.value = false;
        };

        // 排序只改变位置，不改变条目的渲染身份，也不向导出数据添加内部字段。
        const sortableItemKeys = new WeakMap();
        let sortableItemSequence = 0;
        const getSortableItemKey = (item) => {
            if (!sortableItemKeys.has(item)) sortableItemKeys.set(item, ++sortableItemSequence);
            return sortableItemKeys.get(item);
        };
        let activeSortable = null;
        const initializeSortableList = (elementId, items) => {
            nextTick(() => {
                const element = document.getElementById(elementId);
                if (!element || typeof Sortable === 'undefined') return;
                activeSortable?.destroy();
                activeSortable = new Sortable(element, {
                    disabled: resourceBatch.active,
                    handle: '.sortable-list-handle',
                    draggable: '.sortable-list-item',
                    direction: 'vertical',
                    animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    forceFallback: true,
                    fallbackOnBody: true,
                    fallbackTolerance: 4,
                    ghostClass: 'sortable-list-placeholder',
                    chosenClass: 'sortable-list-chosen',
                    fallbackClass: 'sortable-list-preview',
                    onMove: ({ dragged, related }) => (items.value[Number(dragged.dataset.resourceIndex)]?.scope || 'character')
                        === (items.value[Number(related.dataset.resourceIndex)]?.scope || 'character'),
                    onEnd: ({ item: movedElement, oldIndex, newIndex }) => {
                        if (!Number.isInteger(oldIndex) || !Number.isInteger(newIndex) || oldIndex === newIndex) return;
                        // 先还原 Sortable 移动过的 DOM，再让 Vue 按稳定 key 更新顺序。
                        element.insertBefore(
                            movedElement,
                            element.children[oldIndex < newIndex ? oldIndex : oldIndex + 1]
                        );
                        const visible = [...element.children].map(node => Number(node.dataset.resourceIndex));
                        const slots = visible;
                        if (visible.some(index => !Number.isInteger(index) || index < 0 || index >= items.value.length)) return;
                        const reordered = visible.map(index => items.value[index]);
                        const moved = reordered.splice(oldIndex, 1)[0];
                        reordered.splice(newIndex, 0, moved);
                        slots.forEach((index, offset) => { items.value[index] = reordered[offset]; });
                        saveData();
                    }
                });
            });
        };

        watch(() => resourceBatch.active, active => activeSortable?.option('disabled', active));
        // --- 预设分组的拖拽排序 ---
        // Sortable 默认 draggable = '>*'，即「容器的直接子元素」。分组后 #presets-list 的直接
        // 子元素是分组 div，所以挂在它上面的 Sortable 报出的 oldIndex/newIndex 是分组下标，
        // 而原代码拿它去 splice 扁平的 presets 数组 —— 两套下标对不上，拖拽排序是坏的。
        // 现在改成每组各挂一个 Sortable（draggable 限定为带 data-preset-index 的行），
        // 只允许组内排序，顺序直接从拖完之后的 DOM 反推，不依赖 Sortable 给的下标。
        const applyPresetGroupOrder = (groupEl) => {
            const rows = Array.from(groupEl.children).filter(el => el.dataset && el.dataset.presetIndex !== undefined);
            const order = rows.map(el => Number(el.dataset.presetIndex));
            if (!order.length) return;
            if (order.some(n => !Number.isInteger(n) || n < 0 || n >= presets.value.length)) return;
            // 该组占用的「全局槽位」是固定的（就是这些下标的升序），变的只是槽位里装的预设。
            // 先确认成员集合没变 —— 万一真发生了跨组移动，直接放弃，不动数据（宁可不排，不能错位）。
            const key = groupEl.dataset ? groupEl.dataset.presetGroup : '';
            const group = presetGroups.value.find(g => String(g.key) === String(key));
            if (!group) return;
            const expected = group.items.map(item => item.index).sort((a, b) => a - b);
            const slots = order.slice().sort((a, b) => a - b);
            if (expected.length !== slots.length || expected.some((v, i) => v !== slots[i])) return;
            const items = order.map(i => presets.value[i]);
            if (items.some(item => !item)) return;
            slots.forEach((slot, k) => { presets.value[slot] = items[k]; });
            saveData();
        };
        const initializePresetGroupSortables = () => {
            nextTick(() => {
                presetSortables.forEach(sortable => sortable.destroy());
                presetSortables.length = 0;
                const root = document.getElementById('presets-list');
                if (!root || typeof Sortable === 'undefined') return;
                root.querySelectorAll('[data-preset-group]').forEach((groupEl) => {
                    presetSortables.push(new Sortable(groupEl, {
                        handle: '.sortable-list-handle',
                        animation: 150,
                        draggable: '[data-preset-index]',
                        // 锁死在组内：不允许拖出去，也不允许别的组拖进来
                        group: { name: 'rphub-presets', pull: false, put: false },
                        onEnd: () => applyPresetGroupOrder(groupEl)
                    }));
                });
            });
        };
        const presetSortables = [];
        watch([activePresetGroupName, currentView], initializePresetGroupSortables, { flush: 'post' });

        // Watch view change to refresh embedded pages and sortable lists
        watch(currentView, (newView) => {
            if (newView === 'chat') hasOpenedChat.value = true;
            activeSortable?.destroy();
            activeSortable = null;
            if (newView !== 'presets' && activePresetGroupName.value) openPresetGroup(null);
            settingsHelpTopic.value = '';
            if (newView === 'characters') {
                isBatchDeleteMode.value = false;
                selectedCharacterIndices.value.clear();
                hasOpenedCharacterManager.value = true;
            } else if (newView === 'generator') {
                isGeneratorLoading.value = true;
                generatorUrl.value = `./character/index.html?t=${Date.now()}`;
            } else if (newView === 'square') {
                isSquareLoading.value = true;
                squareUrl.value = `https://rphforum.zeabur.app/?t=${Date.now()}`;
            } else if (newView === 'novel') {
                isNovelLoading.value = true;
                novelUrl.value = `./novel/index.html?t=${Date.now()}`;
            } else {
                const sortable = {
                    regex: ['regex-list', regexScripts],
                    worldinfo: ['worldinfo-list', worldInfo]
                }[newView];
                if (sortable) initializeSortableList(...sortable);
            }
        });


        // --- Character-scoped persistence ---
        const getStoryBranchScopeId = (characterId, branchId = activeStoryBranchId.value) => (
            buildStoryBranchScopeId(characterId, branchId)
        );
        const getCurrentStoryBranchScopeId = () => getStoryBranchScopeId(currentCharacter.value?.uuid);
        const readerSession = window.RPLocalWorkspace.createReaderSession({
            getScope: getCurrentStoryBranchScopeId,
            getContainer: () => chatContainer.value,
            getHistory: () => chatHistory.value,
            getLimit: () => chatRenderLimit.value,
            setLimit: value => { chatRenderLimit.value = Math.min(value, getChatRenderMessageLimit()); },
            isChat: () => currentView.value === 'chat'
        });
        watch(currentView, (view, previous) => {
            if (previous === 'chat') {
                readerSession.capture(true);
            }
            if (view === 'chat') nextTick(() => readerSession.restore());
        }, { flush: 'pre' });

        let chatHistorySaveTimer = null;
        let chatHistorySaveQueue = Promise.resolve(true);
        let lastChatSaveErrorToastAt = 0;
        let _b1ScopeEpoch = 0;
        // [rphub 2.8.92] 这里原本有一句 watch(getCurrentStoryBranchScopeId, ...)，是 B1 那批加的作用域监听。
        //   问题：watch 的「函数型 source」在注册时会**立即求值一次**，而 currentCharacter
        //   的 computed 声明在本文件后面约 1300 行处 ⇒ 撞上 const 的 TDZ：
        //     ReferenceError: Cannot access 'currentCharacter' before initialization
        //   本地复现（2.8.90 与 2.8.91 都复现）：异常被 Vue 的 effect 错误处理吞掉，
        //   页面照常 mount、DOM 52KB 正常渲染，但 **watcher 从未注册成功** ——
        //   于是切换角色/分支时 _b1ScopeEpoch 不递增、_classicMemoriesLoaded 不重置，
        //   记忆页可能沿用上一个作用域的「已加载」状态；每次启动还会往 console.error
        //   刷一条（真机日志累计 36 条）。
        //   修法：把这句 watch 挪到 currentCharacter 声明之后（见本文件下方 2.8.92 那条规则）。
        const chatWriteIntents = new Map();

        const notifyChatSaveFailure = (error) => {
            console.error('Failed to save chat history after retries:', error);
            const now = Date.now();
            if (now - lastChatSaveErrorToastAt < 5000) return;
            lastChatSaveErrorToastAt = now;
            const message = error?.name === 'QuotaExceededError'
                ? '存储空间不足，聊天记录未能保存，请先释放浏览器存储空间'
                : error?.name === 'StorageConflictError' || error?.name === 'StoragePausedError'
                    ? '聊天记录保存已暂停或来源已变化，本次旧候选未提交，请检查当前记录'
                    : '聊天记录未能完成保存，请保留当前内容并检查存储状态';
            showToast(message, 'error', 5000);
        };

        // [rphub 2.8.93] 「读到空」的 scope 集合，用于阻止开场白被自动回写固化。
        //   见 loadStoredChatHistory：undefined 与 [] 都返回 createInitialChatHistory(char)，
        //   与 clearChat 写入的 [{role:'assistant',content:first_mes}] 完全同形，无法区分。
        const _chatScopePristineRead = new Set();
        // 2.8.110: 聊天是否已经至少从库里 hydrate 过一次。
        //   启动窗口内 saveData 的聊天段可能先于 loadStoredChatHistory 执行，那时 chatHistory 还是
        //   初始的空数组，写进库就是「用空覆盖 N 条」。2.8.109 只挡住了 startupConfigOnly 那一支，
        //   挡不住启动窗口里的全量 saveData（debouncedSave / 各处显式调用）。
        let _chatHydrated = false;
        const saveChatHistoryNow = (storyScopeId = getCurrentStoryBranchScopeId(), history = chatHistory.value) => {
            if (chatHistorySaveTimer) {
                clearTimeout(chatHistorySaveTimer);
                chatHistorySaveTimer = null;
            }
            if (!storyScopeId) return Promise.resolve(false);

            // [rphub 2.8.93] 写入闸门：本 scope 这一轮读到的是「空」，而历史仍是开场白原形 ⇒ 不回写。
            //   不拦的话，一次读取异常会被随后的自动保存固化成「本来就没有」，且全程无日志。
            //   返回 true 而非 false：跳过不是失败，切卡 / 切分支 / flush 都不能被它阻断。
            if (_chatScopePristineRead.has(storyScopeId) && Array.isArray(history) && (
                history.length === 0
                || (history.length === 1 && history[0] && history[0].role === 'assistant'
                    && typeof history[0].content === 'string')
            )) {
                console.warn('[ChatScope] 跳过回写：该 scope 读取为空且历史仍是开场白原形 | scope=' + storyScopeId
                    + ' | len=' + history.length);
                return Promise.resolve(true);
            }
            if (_chatScopePristineRead.has(storyScopeId)) _chatScopePristineRead.delete(storyScopeId);

            try {
                const storage = window.RPHubStorage;
                const writeState = storage.getStorageWriteState();
                if (writeState.paused) throw Object.assign(new Error('存储维护期间不接收聊天保存'), { name: 'StoragePausedError' });
                // A requested character switch must still flush the old active scope before loading the new one.
                const scopeEpoch = _b1ScopeEpoch;
                const intentId = (chatWriteIntents.get(storyScopeId) || 0) + 1;
                chatWriteIntents.set(storyScopeId, intentId);
                const historyToSave = cloneForStorage(history);
                const guard = () => !storage.getStorageWriteState().paused
                    && storage.getStorageWriteState().epoch === writeState.epoch
                    && _b1ScopeEpoch === scopeEpoch
                    && getCurrentStoryBranchScopeId() === storyScopeId
                    && chatWriteIntents.get(storyScopeId) === intentId;
                const saveTask = async () => {
                    try {
                        if (!guard()) throw Object.assign(new Error('聊天写入意图已过期'), { name: 'StorageConflictError' });
                        // [rphub 2.8.106] 空数组不许覆盖非空记录。
                        //   判据必须是「要写空 + 库里已有内容」两条同时成立：
                        //   空数组本身是合法初始态（角色卡没有 first_mes 时 createInitialChatHistory 就返回 []），
                        //   只判空会把没有开场白的卡永久锁死写不进去。
                        if (Array.isArray(historyToSave) && historyToSave.length === 0) {
                            let keptCount = 0;
                            try {
                                const existingChat = await getScopedStoredValue('chat', storyScopeId);
                                if (Array.isArray(existingChat)) keptCount = existingChat.length;
                            } catch (probeError) {
                                // 读不到旧值按「不拦」处理：宁可放过一次，也不能把正常保存变成假报错
                                console.warn('[ChatScope] 探测旧记录失败，本次不拦 | scope=' + storyScopeId, probeError);
                            }
                            if (keptCount > 0) {
                                console.warn('[ChatScope] 拒绝用空数组覆盖 ' + keptCount + ' 条记录 | scope=' + storyScopeId);
                                // 节流状态挂在函数对象上：补丁只能改一段文本，另开顶层变量得再加一条补丁
                                const lastRefuseAt = saveChatHistoryNow.__lastEmptyRefuseAt || 0;
                                if (Date.now() - lastRefuseAt > 8000) {
                                    saveChatHistoryNow.__lastEmptyRefuseAt = Date.now();
                                    showToast('当前对话为空，已保留原有 ' + keptCount + ' 条记录未覆盖', 'warning', 6000);
                                }
                                return true;
                            }
                        }
                        await setScopedStoredValue('chat', storyScopeId, historyToSave, { clone: false, writeEpoch: writeState.epoch, guard });
                        return true;
                    } catch (error) {
                        // Only dbSet may retry a closing connection, with the original intent guard.
                        if (_b1ScopeEpoch === scopeEpoch
                            && chatWriteIntents.get(storyScopeId) === intentId) notifyChatSaveFailure(error);
                        return false;
                    }
                };

                chatHistorySaveQueue = chatHistorySaveQueue.then(saveTask, saveTask);
                return chatHistorySaveQueue;
            } catch (error) {
                notifyChatSaveFailure(error);
                return Promise.resolve(false);
            }
        };

        const scheduleChatHistorySave = () => {
            if (chatHistorySaveTimer) clearTimeout(chatHistorySaveTimer);
            const delay = isGenerating.value ? 1500 : 300;
            chatHistorySaveTimer = setTimeout(() => {
                chatHistorySaveTimer = null;
                saveChatHistoryNow();
            }, delay);
        };

        const flushPendingChatHistorySave = async () => {
            let saved = chatHistorySaveTimer ? await saveChatHistoryNow() : await chatHistorySaveQueue;
            if (saved !== true) saved = await saveChatHistoryNow();
            if (saved !== true) throw Object.assign(new Error('聊天记录未保存，已停止后续操作'), { name: 'ChatSaveError' });
            return true;
        };

        const saveMemorySettingsNow = async () => {
            if (!_initComplete) return;
            if (!getMainDb()) await initDB();
            await setStoredValue('memory_settings', cloneForStorage(memorySettings), { clone: false });
        };

        // B1 memory coordinator: only adopted, committed state may be used as a new intent baseline.
        let _b1MemoryState = null;
        let _b1MemoryViewKey = '';
        let _b1MemoryQueue = Promise.resolve();
        const memoryContentKey = value => window.RPHubStorage.storageContentKey(value);
        // 与 getSummarySources 内部的 keyOf 同一口径：向量回写按这个键定位顶层来源。
        const summarySourceKey = memory => memory && memory.id ? 'id:' + String(memory.id)
            : 't:' + Number(memory.turn || memory.turnEnd || 0) + '#' + String(memory.summary || '').slice(0, 64);
        const memoryOperationError = (name, message, details = {}) => Object.assign(new Error(message), { name, ...details });
        const adoptMemoryState = (state, runtimeList = null) => {
            if (!state || state.scopeId !== getCurrentStoryBranchScopeId()) throw memoryOperationError('MemoryScopeError', '加载作用域已变化');
            const list = runtimeList || numberClassicMemories(prepareClassicMemoriesForRuntime(state.list));
            _b1MemoryState = state;
            _b1MemoryViewKey = memoryContentKey(list);
            classicMemories.value = list;
            _classicMemoriesLoaded = true;
        };
        // 维护代次推进后，已提交基线失效。允许在「意图起点」重读：此时 payload 还没算，
        // 用新基线不构成旧结果覆盖；只有视图与基线逐字一致才换，否则要求重载。
        const refreshMemoryBaseline = async scopeId => {
            const writeState = window.RPHubStorage.getStorageWriteState();
            if (writeState.paused) throw memoryOperationError('StoragePausedError', '存储维护期间不接收记忆写入');
            if (_b1MemoryState && _b1MemoryState.writeEpoch === writeState.epoch) return _b1MemoryState;
            if (memoryContentKey(classicMemories.value) !== _b1MemoryViewKey) {
                throw memoryOperationError('MemoryProtocolError', '检测到未经提交的记忆改动，已阻止覆盖');
            }
            const viewKey = _b1MemoryViewKey;
            const next = await window.RPHubStorage.readMemoryState(scopeId);
            if (next.scopeId !== scopeId || getCurrentStoryBranchScopeId() !== scopeId) {
                throw memoryOperationError('MemoryScopeError', '记忆作用域已变化');
            }
            if (memoryContentKey(next.list) !== viewKey) {
                _classicMemoriesLoaded = false;
                throw memoryOperationError('StorageConflictError', '库内记忆已被其他窗口修改，请重新载入');
            }
            _b1MemoryState = next;
            return next;
        };
        const beginMemoryIntent = async (label = '记忆操作') => {
            const scopeId = getCurrentStoryBranchScopeId();
            // 先判未加载：此时作用域可能还没解析出来，报"未加载"比报"作用域不存在"更贴近真实原因
            if (!_classicMemoriesLoaded || !_b1MemoryState) throw memoryOperationError('MemoryNotLoadedError', '记忆尚未加载完成，请重新载入');
            if (!scopeId) throw memoryOperationError('MemoryScopeError', '记忆作用域不存在，未执行保存');
            if (_b1MemoryState.scopeId !== scopeId) throw memoryOperationError('MemoryNotLoadedError', '记忆尚未加载完成，请重新载入');
            if (memoryContentKey(classicMemories.value) !== _b1MemoryViewKey) throw memoryOperationError('MemoryProtocolError', '检测到未经提交的记忆改动，已阻止覆盖');
            const state = await refreshMemoryBaseline(scopeId);
            const writeState = window.RPHubStorage.getStorageWriteState();
            if (writeState.paused || writeState.epoch !== state.writeEpoch) throw memoryOperationError('StoragePausedError', '存储维护后需要重新载入记忆');
            return Object.freeze({ label, scopeId, scopeEpoch: _b1ScopeEpoch, state,
                viewKey: _b1MemoryViewKey, source: cloneForStorage(classicMemories.value), writeEpoch: state.writeEpoch });
        };
        const memoryIntentActive = intent => !!intent && _classicMemoriesLoaded
            && intent.scopeId === getCurrentStoryBranchScopeId() && intent.scopeEpoch === _b1ScopeEpoch
            && window.RPHubStorage.getStorageWriteState().epoch === intent.writeEpoch
            && !window.RPHubStorage.getStorageWriteState().paused;
        const commitMemoryTransform = (intent, transform, options = {}) => {
            const task = async () => {
                const guard = () => memoryIntentActive(intent) && !options.signal?.aborted
                    && (!options.guard || options.guard() === true)
                    && memoryContentKey(classicMemories.value) === _b1MemoryViewKey;
                if (!guard()) throw memoryOperationError('StorageConflictError', '记忆操作已过期，未提交旧结果');
                if (options.validate) {
                    if (options.validate(classicMemories.value, intent.source) !== true) throw memoryOperationError('StorageConflictError', '原始来源已变化，未套用旧结果');
                } else if (_b1MemoryState !== intent.state) throw memoryOperationError('StorageConflictError', '其他记忆操作已提交，请重新检查');
                const state = _b1MemoryState;
                const next = numberClassicMemories(prepareClassicMemoriesForRuntime(transform(cloneForStorage(classicMemories.value))));
                const result = await window.RPHubStorage.commitMemoryState(state, next, {
                    guard: () => guard() && _b1MemoryState === state,
                    signal: options.signal, expected: options.expected, changes: options.changes
                });
                if (result.status !== 'committed' && result.status !== 'unchanged') {
                    if (result.status === 'committed_unverified' || result.status === 'conflict') {
                        if (memoryIntentActive(intent)) _classicMemoriesLoaded = false;
                    }
                    throw memoryOperationError(result.error?.name || 'MemoryCommitError', result.committed
                        ? '记忆已提交但未完成核对，请重新载入；不会自动回滚旧副本'
                        : (result.error?.message || '记忆未提交'), { committed: result.committed, status: result.status });
                }
                const published = memoryIntentActive(intent) && _b1MemoryState === state;
                if (published) adoptMemoryState(result.state, next);
                return { ...result, list: next, published };
            };
            const pending = _b1MemoryQueue.then(task, task);
            _b1MemoryQueue = pending.catch(() => {});
            return pending;
        };
        const commitMemoryDraft = (intent, nextList, options = {}) => {
            const frozen = cloneForStorage(nextList);
            return commitMemoryTransform(intent, () => frozen, options);
        };
        const requireMemoryPublished = result => {
            if (!result.published) throw memoryOperationError('MemoryScopeError', '结果已提交原作用域，但当前界面已切换', { committed: true });
            return result;
        };
        const sameMemorySources = (current, before, ids) => ids.every(id => {
            const left = current.find(item => String(item.id) === String(id));
            const right = before.find(item => String(item.id) === String(id));
            return !!left && !!right && memoryContentKey(left) === memoryContentKey(right);
        });
        const saveClassicMemoriesNow = async (storyScopeId = getCurrentStoryBranchScopeId(), memorySource = classicMemories.value, intent = null) => {
            if (!storyScopeId) throw memoryOperationError('MemoryScopeError', '记忆作用域不存在，未执行保存');
            const captured = intent || await beginMemoryIntent('保存记忆');
            if (captured.scopeId !== storyScopeId) throw memoryOperationError('MemoryScopeError', '记忆与作用域不匹配');
            return requireMemoryPublished(await commitMemoryDraft(captured, memorySource));
        };

        // The import barrier defers ordinary saves; a departing card must be saved before release.
        let _characterWriteBarrier = 0;
        const saveCharactersNow = async (options = {}) => {
            if (_characterWriteBarrier > 0 && options.force !== true) {
                return;
            }
            if (!getMainDb()) await initDB();
            await window.RPHubStorage.saveCharacterLibrary(characters.value);
        };

        // B1: three explicit groups instead of one long chain of independent puts.
        // config = one transaction (all or nothing); chat = its own intent queue; memory = revision protocol.
        // The returned object reports each group separately, so a partial save is never reported as success.
        const saveData = async (options = {}) => {
            const { saveMemories = true, saveCharacters = true, startupConfigOnly = false } = options;
            const outcome = { ok: true, config: 'skipped', chat: 'skipped', memory: 'skipped', error: null };
            const failed = (group, error) => {
                outcome.ok = false;
                outcome[group] = error?.name === 'QuotaExceededError' ? 'quota' : (error?.name || 'error');
                if (!outcome.error) outcome.error = error;
                console.error(`Save failed (${group}):`, error);
                if (error?.name === 'QuotaExceededError') showToast('存储空间不足，无法保存', 'error');
                else if (group === 'config') showToast('设置保存失败，请重试', 'error');
                return outcome;
            };
            try {
                if (!getMainDb()) await initDB();
                settings.contextSize = MAX_CONTEXT_SIZE;
                normalizeActiveToolAggressivenessSettings();
                const writes = [];
                const keyOf = name => window.RPHubStorage.storageKeyFor(name);
                if (saveCharacters && _characterWriteBarrier === 0) {
                    await saveCharactersNow();
                }
                if (startupConfigOnly) {
                    // 2.8.84: 启动那次只为落强制默认值（contextSize 归一化、工具强度归一化）。
                    // 世界书/预设/正则体积大且内容未变，经分组 CAS 提交要多付一遍内容哈希与提交后回读；
                    // 这些键在任一用户改动后的全量 saveData() 里仍会写回，不落库只影响"下次启动再归一化一次"。
                    writes.push({ key: keyOf('settings'), value: { ...retainedSettingsExtras, ...settings } });
                    // 只有本次启动真读到过 active_tools 才写回：读失败时内存里是默认工具（空 Tavily 密钥），
                    // 写回去等于用默认值覆盖用户已配好的密钥。
                    if (_activeToolsLoaded) writes.push({ key: keyOf('active_tools'), value: normalizeActiveTools() });
                } else {
                    writes.push(
                        { key: keyOf('settings'), value: { ...retainedSettingsExtras, ...settings } },
                        { key: keyOf('presets'), value: presets.value },
                        { key: keyOf('preset_groups'), value: presetGroupNames.value },
                        { key: keyOf('worldinfo_settings'), value: worldInfoSettings },
                        { key: keyOf('global_ui_templates'), value: globalUiTemplates.value }
                    );
                    // [rphub 2.8.115] 初始化完成前不写这四键。
                    //   故障现场：loadData 里 settings 先于 global_worldinfo / worldinfo 加载，
                    //   settings.imageGenKey 赋值触发 watch -> enforceSpecialRules()（此刻表为空，
                    //   按 enabled:false 重建「自动生图」「NAI画图正则」）-> 紧随其后的无参
                    //   saveData() 把这份默认值写进库，覆盖掉刚导入的存档。
                    //   症状：每次导入后自动生图被关，手动打开才恢复图片。
                    //   同函数下方 user / user_profiles / memory_settings 早已有同样的守卫，
                    //   这四键属于遗漏：初始化期间的正文 / 世界书 / 正则一律不落库。
                    if (_initComplete) {
                        writes.push(
                            { key: keyOf('regex'), value: regexScripts.value },
                            { key: keyOf('global_regex'), value: globalRegexScripts.value },
                            { key: keyOf('worldinfo'), value: worldInfo.value },
                            { key: keyOf('global_worldinfo'), value: globalWorldInfo.value }
                        );
                    }
                    // 2.8.109: 全量保存同样不能无条件写 active_tools。
                    // 启动那次（startupConfigOnly）有 _activeToolsLoaded 闸门，但用户之后只要动任何一个设置，
                    // 就会走到这里把内存里的 active_tools 整份写回库。读失败时内存是默认定义（三个工具全关、
                    // 密钥为空），于是「动一下设置」就把全关永久固化 —— 这才是「一重启工具全关了」的正解。
                    // 判据：读到过（_activeToolsLoaded）或内存已偏离默认（用户确实改过）才写。
                    const activeToolsForSave = normalizeActiveTools();
                    if (_activeToolsLoaded || JSON.stringify(activeToolsForSave) !== JSON.stringify(getDefaultActiveToolDefinitions())) {
                        writes.push({ key: keyOf('active_tools'), value: activeToolsForSave });
                    }
                }
                // 守卫：初始化完成前不写入用户/记忆数据，防止默认值覆盖服务端已有数据
                if (_initComplete) {
                    writes.push(
                        { key: keyOf('user'), value: user },
                        { key: keyOf('user_profiles'), value: userProfiles.value },
                        { key: keyOf('memory_settings'), value: cloneForStorage(memorySettings) }
                    );
                    if (activeProfileId.value) writes.push({ key: keyOf('active_profile_id'), value: activeProfileId.value });
                }
                if (currentCharacterIndex.value >= 0) {
                    writes.push({ key: keyOf('last_active_char'), value: currentCharacterIndex.value });
                }
                const config = await window.RPHubStorage.commitStoredValueBatch({ writes });
                if (config.status !== 'committed' && config.status !== 'unchanged') {
                    return failed('config', config.error || Object.assign(new Error('设置分组未提交'), { name: config.status }));
                }
                outcome.config = config.status;

                // 2.8.109: startupConfigOnly 那次调用只为落强制默认值，不该碰聊天。
                // 它没有 await，执行到这里时主流程早已把 currentCharacterIndex 恢复成有效值，
                // 而 chatHistory 可能还没从库里读回来（仍是空数组）⇒ 拿空记录去写当前 scope。
                // 空聊天闸门能拦住（321 条记录不会丢），但每次启动都会弹一条「已保留原有 N 条」。
                // 2.8.110: 再加一道 _chatHydrated。启动那次 saveData 没有 await，它内部的
                //   normalizeActiveToolAggressivenessSettings() 会改 settings，进而排上一个 1000ms 的
                //   debouncedSave()；那个 timer 走的是全量分支，到点时大归档（几百条）可能还没读完。
                //   只判 startupConfigOnly 挡不住它 —— 这就是 2.8.109 出包后仍然每次启动弹提示的原因。
                if (!startupConfigOnly && _chatHydrated && currentCharacterIndex.value >= 0) {
                    const chatOk = await saveChatHistoryNow();
                    outcome.chat = chatOk ? 'committed' : 'error';
                    if (!chatOk) {
                        outcome.ok = false;
                        if (!outcome.error) outcome.error = Object.assign(new Error('聊天记录未保存'), { name: 'ChatSaveError' });
                    }
                }
                if (saveMemories) {
                    try {
                        await saveClassicMemoriesNow();
                        outcome.memory = 'committed';
                    } catch (error) {
                        failed('memory', error);
                    }
                }
            } catch (error) {
                if (!outcome.error) failed('config', error);
            }
            return outcome;
        };

        // 记忆尚未加载（例如关掉记忆系统）时，对话变更只写聊天，不凭空造一份记忆。
        const tryBeginMemoryIntent = async (label) => {
            try { return await beginMemoryIntent(label); }
            catch (error) {
                if (error?.name === 'MemoryScopeError' || error?.name === 'MemoryNotLoadedError') return null;
                throw error;
            }
        };
        // 聊天与记忆放进同一个事务：任一侧基线被别的写者改过，就整体不提交，不留半套数据。
        const commitConversationState = async ({ storyScopeId, history, intent, memories, saveTemplateRuntime = false }) => {
            if (!intent) {
                const ok = await saveChatHistoryNow(storyScopeId, history);
                return { ok, published: true };
            }
            try {
                if (saveTemplateRuntime) saveGlobalUiTemplateRuntimeForCharacter(currentCharacter.value, activeStoryBranchId.value);
                if (!getMainDb()) await initDB();
                // 先让排在队列里的旧聊天写失效，否则它稍后仍会按自己的 guard 把旧文本盖回来
                chatWriteIntents.set(storyScopeId, (chatWriteIntents.get(storyScopeId) || 0) + 1);
                const chatKey = 'rp_hub_chat_' + storyScopeId;
                const chatRecords = await window.RPHubStorage.readStoredValueSet([chatKey]);
                const chatPayload = cloneForStorage(history);
                // [rphub 2.8.106] 同一个不变量在事务路径上再拦一次：空数组不许覆盖非空。
                //   4 个调用点共用这里，其中「重新生成第 1 条」必然传 []（chatHistory.slice(0, 0)）。
                //   返回 ok:false 之后调用方会在 chatHistory.value = nextHistory 之前 return，
                //   于是内存和库都停在原值 —— 这是唯一能做到「零改动退出」的位置。
                if (Array.isArray(chatPayload) && chatPayload.length === 0) {
                    const existingChat = chatRecords[0] ? chatRecords[0].value : undefined;
                    const keptCount = Array.isArray(existingChat) ? existingChat.length : 0;
                    if (keptCount > 0) {
                        console.warn('[ChatScope] 拒绝提交空聊天（事务路径） | key=' + chatKey + ' | 现有=' + keptCount + ' 条');
                        showToast('第 1 条消息前面没有内容，重建会让整段记录变空，已取消。若要重来请先新建分支再操作', 'warning', 8000);
                        return { ok: false, published: false, refusedEmpty: true };
                    }
                }
                const result = await commitMemoryTransform(intent, () => memories, {
                    expected: [{ key: chatKey, value: chatRecords[0].value }],
                    changes: [{ key: chatKey, operation: 'set', value: chatPayload }]
                });
                if (!result.published) return { ok: false, published: false };
                if (saveTemplateRuntime) {
                    await saveCharactersNow();
                    await setStoredValue('global_ui_templates', globalUiTemplates.value);
                }
                return { ok: true, published: true };
            } catch (error) {
                console.error('Commit conversation state failed:', error);
                return { ok: false, published: false, error };
            }
        };

        // Auto-save memory settings when changed (debounced to avoid lag on slider drag)
        let _memorySettingsSaveTimer = null;
        watch(memorySettings, () => {
            clearTimeout(_memorySettingsSaveTimer);
            _memorySettingsSaveTimer = setTimeout(() => {
                saveMemorySettingsNow().catch(e => console.error('Save memory settings failed:', e));
            }, 500);
        }, { deep: true });

        const loadData = async () => {
            // [rphub 2.8.101] 启动即采一条，并顺手让 getRestoreBudget() 跑一次 ——
            //   否则第一次体积分析的基线会被它自己赋值（差值恒 0），污染判据永远不生效。
            markHeap('boot');
            getRestoreBudget();
            try {
                await initDB();
                // 2.7.85：读回备份范围开关（必须在 initDB 之后，否则主库还没开）。
                try {
                    backupScope.value = normalizeBackupScope(await getStoredValue(BACKUP_SCOPE_KEY));
                } catch (error) {
                    console.warn('读取备份范围开关失败，使用默认全开:', error);
                }
                // 2.8.4：读回自动备份配置并启动每日避峰检测
                // [rphub 2.8.102] 定时器必须**先挂**，历史列表后加载。
                //   2.8.101 实测：设置页显示「已启用」、上次备份仍是 2 号手动点的、
                //   堆采样里没有 backup-begin ⇒ 说明 loadAutoBackupHistory() 抛异常把
                //   setTimeout 一起带走了（它内部只给 JSON.parse 包了 try，
                //   getBackupFolder / getDefaultBackupFolderPath 两个桥调用在 try 之外），
                //   而外层 catch 只留一条 console.warn，用户端零可见。
                //   一个「只用于显示历史列表」的加载，不该有权限阻止备份启动。
                try {
                    autoBackupConfig.value = normalizeAutoBackupConfig(await getStoredValue(AUTO_BACKUP_CONFIG_KEY));
                    if (autoBackupConfig.value.enabled) {
                        setTimeout(() => {
                            if (autoBackupConfig.value.triggerMode === 'remind') maybeRemindDailyBackup();
                            else performDailyAutoBackup(false);
                        }, 6000);
                    } else {
                        markHeap('backup-no-timer:disabled');
                    }
                } catch (autoBackupErr) {
                    markHeap('backup-no-timer:config-error');
                    console.warn('加载自动备份状态失败:', autoBackupErr);
                }
                try {
                    await loadAutoBackupHistory();
                } catch (historyErr) {
                    console.warn('[AutoBackup] 加载备份历史失败（不影响备份启动）:', historyErr);
                }


                // Load from DB
                const savedChars = await window.RPHubStorage.readCharacterDirectory();
                if (savedChars) {
                    // Migration: Ensure all characters have a UUID and createdAt
                    let migrated = false;
                    const legacyChatMigrations = [];
                    characters.value = savedChars.filter(char => char).map((char, index) => {
                        if (!char.uuid) {
                            char.uuid = generateUUID();
                            migrated = true;
                            // Try to migrate old index-based chat history to UUID-based
                            legacyChatMigrations.push(getScopedStoredValue('chat', index).then(async oldChat => {
                                if (!oldChat) return;
                                // B1: the old index key is removed only after the new key's transaction
                                // completes. A failed copy must leave the source intact instead of
                                // trading a duplicate for a lost conversation.
                                await setScopedStoredValue('chat', char.uuid, oldChat);
                                await deleteScopedStoredValue('chat', index); // Clean up old key
                            }).catch(error => {
                                console.warn('旧索引聊天迁移未完成，已保留源键:', error);
                            }));
                        }
                        if (!char.createdAt) {
                            // Use a slightly offset timestamp based on index to preserve some order for old cards
                            char.createdAt = Date.now() - (savedChars.length - index) * 1000;
                            migrated = true;
                        }
                        if (Object.prototype.hasOwnProperty.call(char, 'scenario')) {
                            delete char.scenario;
                            migrated = true;
                        }
                        return char;
                    });
                    if (migrated) {
                        await saveCharactersNow();
                    }
                    // 迁移在后台跑，但初始化收尾要等它落定，否则用户可能在旧键已删前就切角色。
                    if (legacyChatMigrations.length) await Promise.allSettled(legacyChatMigrations);
                }
                // [rphub 2.8.101] 角色卡是最大的一条（用户实测 186.93MB / 3 张卡挤一条）
                markHeap('characters-loaded');

                const savedSettings = await getStoredValue('settings');
                if (savedSettings) {
                    retainedSettingsExtras = Object.fromEntries(Object.entries(savedSettings).filter(([key]) =>
                        !Object.prototype.hasOwnProperty.call(settings, key)
                        && !['__proto__', 'constructor', 'prototype'].includes(key)));
                    Object.keys(savedSettings).forEach(key => {
                        if (Object.prototype.hasOwnProperty.call(settings, key)) {
                            settings[key] = savedSettings[key];
                        }
                    });
                    if (!Object.prototype.hasOwnProperty.call(savedSettings, 'apiProviderId')) {
                        const legacyProvider = getApiProviderByUrl(savedSettings.apiUrl);
                        settings.apiProviderId = legacyProvider?.id || (savedSettings.apiUrl ? 'custom' : DEFAULT_API_PROVIDER_ID);
                        if (!legacyProvider && savedSettings.apiUrl) settings.customApiUrl = savedSettings.apiUrl;
                    }
                    normalizeApiProviderSettings(savedSettings);
                } else {
                    normalizeApiProviderSettings();
                }
                settings.fontSize = normalizeFontSize(settings.fontSize);
                if (settings.reasoningEffort === 'xhigh') settings.reasoningEffort = 'max';
                if (!imageModelOptions.some(option => option.value === settings.imageModel)) {
                    settings.imageModel = imageModelOptions[0].value;
                }
                if (!imageSizeOptions.some(option => option.value === settings.imageSize)) {
                    const legacySize = String(settings.imageSize || '');
                    settings.imageSize = legacySize.includes('横') ? '横图' : legacySize.includes('方') ? '方图' : '竖图';
                }
                settings.imageGenCount = Math.min(8, Math.max(2, Math.round(Number(settings.imageGenCount) || 2)));
                settings.chatRenderMessageLimit = normalizeChatRenderMessageLimit(settings.chatRenderMessageLimit);
                settings.uiTemplateKeepFloors = normalizeUiTemplateKeepFloors(settings.uiTemplateKeepFloors);
                if (typeof settings.customImageArtists === 'string') {
                    settings.customImageArtists = settings.customImageArtists.trim() ? [settings.customImageArtists] : [];
                }
                if (!Array.isArray(settings.customImageArtists)) settings.customImageArtists = [];
                settings.customImageArtists = settings.customImageArtists.map(item => {
                    if (item && typeof item === 'object') {
                        return { name: String(item.name == null ? '' : item.name), artists: String(item.artists == null ? '' : item.artists), negative: String(item.negative == null ? '' : item.negative), selected: item.selected === true };
                    }
                    return { name: '', artists: String(item == null ? '' : item), negative: '', selected: false };
                });
                if (!settings.customImageArtists.length) settings.customImageArtists = [{ name: '', artists: '', negative: '', selected: true }];
                if (typeof settings.negativeImagePrompt === 'string' && settings.negativeImagePrompt.trim() && !settings.customImageArtists[0].negative) {
                    settings.customImageArtists[0].negative = settings.negativeImagePrompt.trim();
                }
                if ('negativeImagePrompt' in settings) delete settings.negativeImagePrompt;
                {
                    const activeIdx = settings.customImageArtists.findIndex(item => item.selected);
                    const keepIdx = activeIdx >= 0 ? activeIdx : 0;
                    settings.customImageArtists.forEach((item, idx) => { item.selected = idx === keepIdx; });
                }
                // Fonts are chosen per context now; drop the retired global font setting.
                delete settings.fontFamily;
                delete settings.fontFamilyVersion;
                delete settings.renderLayerLimit;
                settings.contextSize = MAX_CONTEXT_SIZE;
                // [rphub 2.8.12] 官网自 09-15 起在设置加载路径里无条件写 settings.stream = true，
                //   把用户保存的 false 覆盖掉 ⇒ 设置页「流式输出」关掉后每次重进都被重置。
                //   改为尊重已保存的选择；键缺失时仍默认开启（与官网默认值一致）。
                settings.stream = settings.stream !== false;
                ensureSlotTemperatures();
                applyModelSlotTemperature(currentModelMode.value);
                normalizeActiveToolAggressivenessSettings();

                const savedPresets = await getStoredValue('presets');
                if (savedPresets) presets.value = savedPresets.map(normalizePreset);
                const savedPresetGroups = await getStoredValue('preset_groups');
                presetGroupNames.value = presetLibrary.names(presets.value,
                    Array.isArray(savedPresetGroups) ? savedPresetGroups : []);

                const savedGlobalRegex = await getStoredValue('global_regex');
                if (savedGlobalRegex) globalRegexScripts.value = savedGlobalRegex.map(script => normalizeRegexScript(script, 'global'));

                const savedRegex = savedGlobalRegex ? null : await getStoredValue('regex');
                if (savedGlobalRegex) {
                    regexScripts.value = JSON.parse(JSON.stringify(globalRegexScripts.value)).map(script => normalizeRegexScript(script, 'global'));
                } else if (savedRegex) {
                    regexScripts.value = savedRegex.map(script => normalizeRegexScript(script, 'character'));
                }

                const savedGlobalWI = await getStoredValue('global_worldinfo');
                if (savedGlobalWI) globalWorldInfo.value = savedGlobalWI.map(entry => normalizeWorldInfoEntry({ ...entry, scope: 'global' }));

                const savedWI = savedGlobalWI ? null : await getStoredValue('worldinfo');
                if (savedGlobalWI) {
                    worldInfo.value = JSON.parse(JSON.stringify(globalWorldInfo.value)).map(entry => normalizeWorldInfoEntry({ ...entry, scope: 'global' }));
                } else if (savedWI) {
                    worldInfo.value = savedWI.map(normalizeWorldInfoEntry);
                }

                const savedGlobalUiTemplates = await getStoredValue('global_ui_templates');
                if (savedGlobalUiTemplates) globalUiTemplates.value = savedGlobalUiTemplates.map(template => normalizeUiTemplate({ ...template, scope: 'global' }));

                const savedActiveTools = await getStoredValue('active_tools');
                // 只有读到「非空数组」才算读成功。
                // 原写法 `savedActiveTools || activeTools.value` 里 [] 是 truthy ⇒ 空数组被当成有效值，
                // normalizeActiveTools 拿它补默认定义（三个工具 enabled 全 false）⇒ 界面全关；
                // 更糟的是随后 _activeToolsLoaded = true 会让启动那次 saveData 把这份默认值写回库，
                // 等于用默认值永久覆盖用户配置。读不到有效值就什么都不做：不覆盖内存、不标记已加载。
                if (Array.isArray(savedActiveTools) && savedActiveTools.length) {
                    normalizeActiveTools(savedActiveTools);
                    _activeToolsLoaded = true;
                } else {
                    console.warn('[ActiveTools] 库里的 active_tools 不是非空数组，本次不覆盖内存也不写回', savedActiveTools);
                }

                const savedWISettings = await getStoredValue('worldinfo_settings');
                if (savedWISettings) {
                    ['scanDepth', 'maxDepth'].forEach(key => {
                        if (savedWISettings[key] !== undefined) worldInfoSettings[key] = savedWISettings[key];
                    });
                }

                const savedUser = await getStoredValue('user');
                if (savedUser) Object.assign(user, savedUser);
                if (!user.uuid) user.uuid = generateUUID(); // Ensure UUID

                const savedProfiles = await getStoredValue('user_profiles');
                const savedActiveId = await getStoredValue('active_profile_id');

                if (savedProfiles && savedProfiles.length > 0) {
                    userProfiles.value = savedProfiles.map(profile => ({ ...profile, preferences: String(profile?.preferences || '') }));
                    activeProfileId.value = savedActiveId || savedProfiles[0].uuid;
                    const activeProfile = userProfiles.value.find(p => p.uuid === activeProfileId.value);
                    if (activeProfile) {
                        Object.assign(user, activeProfile);
                        if (!user.uuid) user.uuid = activeProfileId.value;
                    }
                } else {
                    // Migrate single user to profiles
                    const firstProfile = JSON.parse(JSON.stringify(user));
                    if (!firstProfile.uuid) firstProfile.uuid = generateUUID();
                    user.uuid = firstProfile.uuid;
                    userProfiles.value = [firstProfile];
                    activeProfileId.value = firstProfile.uuid;
                }

                // Load Last Active Character Index
                const lastCharIndex = await getStoredValue('last_active_char');
                if (lastCharIndex !== undefined) {
                    lastActiveCharacterId.value = lastCharIndex;
                }
                const lastCharId = await getStoredValue('last_active_char_id');
                if (lastCharId) {
                    const savedIndex = characters.value.findIndex(card => card.uuid === lastCharId);
                    if (savedIndex >= 0) lastActiveCharacterId.value = savedIndex;
                }

                // Load Memory Settings
                const savedMemorySettings = await getStoredValue('memory_settings');
                if (savedMemorySettings) Object.assign(memorySettings, savedMemorySettings);
                normalizeMemorySettings();

                const savedTokenUsageHistory = await getStoredValue('token_usage_history');
                if (Array.isArray(savedTokenUsageHistory)) {
                    const usageLimit = Math.max(1, Number(settings.tokenUsageRetentionLimit) || 1000);
                    tokenUsageHistory.value = savedTokenUsageHistory
                        .filter(record => record && typeof record === 'object')
                        .map(record => ({
                            ...record,
                            cacheWriteTokens: Number.isFinite(record.cacheWriteTokens) ? record.cacheWriteTokens : 0
                        }))
                        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                        .slice(0, usageLimit);
                }

                return true;
            } catch (e) {
                console.error('Failed to load saved data', e);
                window.__rpDataErrorDetail = String(e?.message || '读取中断，请重试').slice(0, 160);
                // 大 try 一旦在中途抛错，排在后面的键全部读不到。active_tools 排在读取序列末尾附近、
                // 又没有独立兜底 ⇒ 每次冷启动都回默认（三个工具全关），表现为「工具设置不保存」。
                // 这里补一次独立读取：读到非空数组就恢复；读不到就不动内存、也不标记已加载。
                try {
                    const rescueActiveTools = await getStoredValue('active_tools');
                    if (Array.isArray(rescueActiveTools) && rescueActiveTools.length) {
                        normalizeActiveTools(rescueActiveTools);
                        _activeToolsLoaded = true;
                        console.warn('[ActiveTools] loadData 中途失败，已单独恢复 ' + rescueActiveTools.length + ' 个工具配置');
                    }
                } catch (rescueError) {
                    console.warn('[ActiveTools] 单独恢复也失败，本次保持默认且不写回', rescueError);
                }
                showToast('加载保存的数据失败', 'error');
                return false;
            }
            // [rphub 2.8.101] 加载完成时的堆 = 应用常驻占用。之后任何读数跟它比，
            //   多出来的部分才是「临时对象」，不是「数据本来就占这么多」。
            _loadEndHeapUsed = markHeap('load-end') || _loadEndHeapUsed;
        };

        // Sync World Info and Regex to Current Character
        watch(worldInfo, (newVal) => {
            // 切换或加载角色时世界书本就是“全局 + 该角色”拼出来的，无需反向同步，省下整份世界书的几轮序列化。
            if (_isApplyingCharacterScopedData) return;
            const normalized = JSON.parse(JSON.stringify(newVal)).map(normalizeWorldInfoEntry);
            const globalEntries = normalized.filter(entry => entry.scope === 'global');
            if (JSON.stringify(globalWorldInfo.value) !== JSON.stringify(globalEntries)) {
                globalWorldInfo.value = globalEntries;
            }
            if (currentCharacterIndex.value !== -1 && characters.value[currentCharacterIndex.value]) {
                // Only update if different to avoid infinite loops or unnecessary updates
                const char = characters.value[currentCharacterIndex.value];
                const characterEntries = normalized.filter(entry => entry.scope !== 'global');
                if (JSON.stringify(char.worldInfo) !== JSON.stringify(characterEntries)) {
                    char.worldInfo = characterEntries;
                }
            }
        }, { deep: true });

        watch(regexScripts, (newVal) => {
            if (_isApplyingCharacterScopedData) return;
            const normalized = JSON.parse(JSON.stringify(newVal)).map(script => normalizeRegexScript(script));
            const globalScripts = normalized.filter(script => script.scope === 'global');
            if (JSON.stringify(globalRegexScripts.value) !== JSON.stringify(globalScripts)) {
                globalRegexScripts.value = globalScripts;
            }
            if (currentCharacterIndex.value !== -1 && characters.value[currentCharacterIndex.value]) {
                const char = characters.value[currentCharacterIndex.value];
                const characterScripts = normalized.filter(script => script.scope !== 'global');
                if (JSON.stringify(char.regexScripts) !== JSON.stringify(characterScripts)) {
                    char.regexScripts = characterScripts;
                }
            }
        }, { deep: true });

        watch(recentGenerationTimes, (newVal) => {
            if (currentCharacterIndex.value !== -1 && characters.value[currentCharacterIndex.value]) {
                const char = characters.value[currentCharacterIndex.value];
                if (JSON.stringify(char.recentGenerationTimes) !== JSON.stringify(newVal)) {
                    char.recentGenerationTimes = JSON.parse(JSON.stringify(newVal));
                }
            }
        }, { deep: true });

        // Auto Image Gen & Stream Linkage
        const isAutoImageGenEnabled = computed({
            get: () => {
                const entry = worldInfo.value.find(w => w.comment === '自动生图');
                return entry ? entry.enabled : false;
            },
            set: (val) => {
                const entry = worldInfo.value.find(w => w.comment === '自动生图');
                if (entry) {
                    entry.enabled = val;
                } else {
                    showToast('未找到“自动生图”世界书条目，请确认配置', 'warning');
                }
            }
        });

        const showAutoImageGenToggleToast = (enabled) => {
            showToast(enabled ? '自动生图已开启' : '自动生图已关闭', enabled ? 'success' : 'info');
        };

        const setAutoImageGenEnabled = (enabled) => {
            isAutoImageGenEnabled.value = enabled;
            const changed = isAutoImageGenEnabled.value === enabled;
            if (changed) showAutoImageGenToggleToast(enabled);
            return changed;
        };

        const toggleAutoImageGen = () => {
            setAutoImageGenEnabled(!isAutoImageGenEnabled.value);
        };

        const setWorldInfoEnabled = (entry, enabled, event) => {
            if (entry?.comment === '自动生图') {
                const changed = setAutoImageGenEnabled(enabled);
                if (!changed && event?.target) event.target.checked = isAutoImageGenEnabled.value;
                return;
            }

            if (entry) entry.enabled = enabled;
        };

        const generatedImageTasks = new Map();
        let generatedImageObserver = null;

        // [rphub 2.7.70 / 2.7.72] 生图固定（设置页可开关）。
        //   根因：画师串 / 生图风格一变，生图正则的 artist= 被重写 ⇒ 所有消息重渲染 ⇒
        //   卡片上的 data-imageJobState 是 DOM 属性、随重渲染丢失 ⇒ hydrateGeneratedImages()
        //   把整屏旧图重新 POST 一遍。这就是「一换画师串全部重新生成」。
        //   做法：开启后把「已生成完成的图」按身份记入 localStorage；重渲染命中就直接复用旧图
        //   的 src，不再发请求。记录里存 tag 做二次校验：reroll 会改 tag ⇒ 视为新图，
        //   重新生成并覆盖记录，所以 reroll 依旧可用。
        //   2.7.72 修身份：原用「正文哈希 + 图序」，但官方 handleGeneratedImageReroll 收尾会把
        //   改过 tag 顺序的 token 写回 message.content（seed app.js:2155）⇒ 同一条回复里所有图的
        //   身份一起变 ⇒ 点一张、同层别的图跟着重新生成（被点那张还会被生成两次）。
        //   现改为：优先用官方持久唯一字段 message.id（createAssistantMessage 里的 generateUUID），
        //   拿不到才退到「归一化正文哈希」——把图片 token 整体换成占位符，token 内的变化不影响哈希。
        const IMAGE_FREEZE_LS_PREFIX = 'rphub-image-freeze::';
        const IMAGE_FREEZE_MAX_ENTRIES = 1000;
        const imageFreezeScopeKey = () => {
            try { return getCurrentStoryBranchScopeId() || currentCharacter.value?.uuid || 'default'; }
            catch (e) { return 'default'; }
        };
        const imageFreezeHash = (text) => {
            const str = String(text === undefined || text === null ? '' : text);
            let h = 5381;
            for (let i = 0; i < str.length; i += 1) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
            return h.toString(36) + '.' + str.length.toString(36);
        };
        // 归一化：图片 token 整体换占位符。必须复用官方 getImageTagRegex()（core-utils.js），
        //   它的 token 允许没有闭合 ###（以换行 / 结尾终止），自己写 image###[^#]*### 会漏掉那一类。
        const imageFreezeNormalize = (content) => {
            const raw = String(content === undefined || content === null ? '' : content);
            try { return raw.replace(getImageTagRegex(), '<image>'); } catch (e) { return raw; }
        };
        const readImageFreezeTable = () => {
            try {
                const parsed = JSON.parse(localStorage.getItem(IMAGE_FREEZE_LS_PREFIX + imageFreezeScopeKey()) || '{}');
                return parsed && typeof parsed === 'object' ? parsed : {};
            } catch (e) { return {}; }
        };
        const writeImageFreezeTable = (table) => {
            try {
                const keys = Object.keys(table);
                if (keys.length > IMAGE_FREEZE_MAX_ENTRIES) {
                    keys.map(k => [k, Number(table[k]?.ts) || 0])
                        .sort((a, b) => a[1] - b[1])
                        .slice(0, keys.length - IMAGE_FREEZE_MAX_ENTRIES)
                        .forEach(pair => { delete table[pair[0]]; });
                }
                localStorage.setItem(IMAGE_FREEZE_LS_PREFIX + imageFreezeScopeKey(), JSON.stringify(table));
            } catch (e) { /* 存储配额已满：固定失效，但不影响正常生图 */ }
        };
        // [rphub 2.8.64] 三态判定：用户没点过开关就按「开启」算。
        //   原因：settings 会整体序列化进存档，老用户存档里早就有 freezeGeneratedImages: false
        //   （默认值被一起写进去的），单纯改默认值救不了他们 ⇒ 「默认关着」等于没有防护。
        //   迁移只做一次并回写 settings，所以设置页那句 {{ settings.freezeGeneratedImages ? ... }}
        //   不用改也能显示正确的状态。
        let imageFreezeMigrated = false;
        const isImageFreezeEnabled = () => {
            if (!imageFreezeMigrated) {
                imageFreezeMigrated = true;
                if (settings.freezeGeneratedImagesExplicit !== true) settings.freezeGeneratedImages = true;
            }
            return settings.freezeGeneratedImages === true;
        };
        // 启动即迁移一次：否则用户没有历史图片时，设置页会拿 settings 里的旧 false
        //   显示成「已关闭」，而实际是开着的。
        try { isImageFreezeEnabled(); } catch (e) { /* settings 还没就绪就等首次 hydrate */ }
        const imageFreezeTagOf = (requestUrl) => {
            try { return new URL(requestUrl, window.location.href).searchParams.get('tag') || ''; }
            catch (e) { return ''; }
        };
        // 一张图对应多个候选键（按优先级）：
        //   m: 官方 message.id —— 最稳，正文怎么改都不受影响（含 reroll 回写正文）；
        //   c: 归一化正文哈希 —— 老存档缺 id 时兜底；内容哈希的兼容形态（token 内变化不影响）；
        //   第三个是 2.7.70/71 写下的旧键（裸正文哈希），只读不写，用于升级兼容。
        const imageFreezeKeysOf = (card) => {
            const messageEl = card?.closest?.('[data-chat-index]');
            if (!messageEl || !messageEl.dataset.chatIndex) return [];
            const index = Number(messageEl.dataset.chatIndex);
            const message = Number.isFinite(index) ? chatHistory.value[index] : null;
            if (!message) return [];
            const cards = [...messageEl.querySelectorAll('.generated-image-card')];
            const position = cards.indexOf(card);
            if (position < 0) return [];
            const keys = [];
            if (message.id) keys.push('m:' + message.id + '#' + position);
            keys.push('c:' + imageFreezeHash(imageFreezeNormalize(message.content)) + '#' + position);
            keys.push(imageFreezeHash(message.content) + '#' + position);
            return keys;
        };
        // 复用旧图时把 token 换成当前请求的 token：记录里存的是生成当时的生图 key，
        //   用户之后换 key 会让旧 URL 失效（裂图）。
        const imageFreezeRefreshUrl = (storedUrl, requestUrl) => {
            try {
                const out = new URL(storedUrl, window.location.href);
                const request = new URL(requestUrl, window.location.href);
                if (out.origin !== request.origin) return out.href;
                const token = request.searchParams.get('token');
                if (token) out.searchParams.set('token', token);
                return out.href;
            } catch (e) { return storedUrl; }
        };
        const captureImageFreezeEntry = (card, requestUrl, table) => {
            const keys = imageFreezeKeysOf(card);
            if (!keys.length) return false;
            const imageUrl = card?.querySelector?.('img')?.getAttribute('src') || '';
            if (!imageUrl) return false;
            // [rphub 2.8.64] 本地仓库会把 src 换成 blob:，那种 URL 活不过一次重载。
            //   若此时写进固定表，等于把「可用的远端 URL」覆盖成「必然失效的死链」
            //   （freezeExistingImagesNow 在用户打开开关时就会走到这里）。跳过不记，
            //   原本生成时记下的那条远端 URL 就保住了。
            if (/^(blob|data):/i.test(imageUrl)) return false;
            const entry = { tag: imageFreezeTagOf(requestUrl), url: imageUrl, ts: Date.now() };
            // 只写前两个键；第三个（旧版裸哈希）只读不写，避免白占配额
            keys.slice(0, 2).forEach(key => { table[key] = entry; });
            return true;
        };
        const imageOwnerOf = card => {
            const char = currentCharacter.value;
            if (!char) return null;
            if (!char.storageFolder) window.RPLocalStore?.assignFolders(characters.value);
            return {
                uuid: char.uuid, importedName: char.importedName || char.name,
                storageFolder: char.storageFolder,
                identity: imageFreezeScopeKey() + '::' + (imageFreezeKeysOf(card)[0] || ''),
            };
        };
        const recordImageFreezeEntry = (card, requestUrl) => {
            // [rphub 2.8.64] 去掉 isImageFreezeEnabled() 门控。
            //   原实现「关着就一条不记」，导致用户事后再打开开关也救不回历史图
            //   （freezeExistingImagesNow 只能扫当前 DOM，没渲染过的消息扫不到）。
            //   只写 URL 成本极低，开关只该决定「命中时复不复用」。
            const table = readImageFreezeTable();
            if (captureImageFreezeEntry(card, requestUrl, table)) writeImageFreezeTable(table);
            // 顺带把原图落到本地仓库：远端 URL 一旦失效，还能靠它顶替。
            try {
                const vault = window.RPHubImageVault;
                const src = card?.querySelector?.('img')?.getAttribute('src') || '';
                const owner = card.__imageOwner || imageOwnerOf(card);
                if (vault && src) vault.remember(requestUrl, src, owner).then(saved => {
                    if (saved?.url && card.isConnected && card.querySelector('img')?.getAttribute('src') === src) {
                        card.querySelector('img').src = saved.url;
                    }
                }).catch(error => showToast('图片本地保存失败，未重新生图：' + error.message, 'warning'));
            } catch (e) { /* 落盘失败不影响固定 */ }
        };
        const applyFrozenImage = async (card, requestUrl) => {
            if (!isImageFreezeEnabled()) return false;
            card.__imageOwner = imageOwnerOf(card);
            try {
                if (await window.RPHubImageVault?.restore(card, requestUrl, card.__imageOwner)) return true;
            } catch (error) {
                ensureGeneratedImageProgressUi(card);
                card.dataset.imageJobState = 'storage-error';
                card.classList.add('is-generation-error');
                card.querySelector('.generated-image-progress-label').textContent = '本地图片读取失败，未自动重新生图';
                console.warn('本地图片读取失败:', error);
                return true;
            }
            const keys = imageFreezeKeysOf(card);
            if (!keys.length) return false;
            const table = readImageFreezeTable();
            let entry = null;
            for (let i = 0; i < keys.length; i += 1) {
                if (table[keys[i]]) { entry = table[keys[i]]; break; }
            }
            if (!entry || !entry.url || entry.tag !== imageFreezeTagOf(requestUrl)) return false;
            try {
                const size = new URL(requestUrl, window.location.href).searchParams.get('size');
                // [rphub 2.8.65] 冻结表命中时同样要按 includes 判比例，否则 2K横图 会被当成竖图。
                card.style.aspectRatio = size && size.includes('横') ? '1216 / 832'
                    : size && size.includes('方') ? '1'
                    : '832 / 1216';
            } catch (e) { /* 尺寸读不到就不设比例 */ }
            const image = card.querySelector('img');
            if (image) image.src = imageFreezeRefreshUrl(entry.url, requestUrl);
            card.classList.remove('is-generating', 'is-waiting', 'is-generation-error');
            card.dataset.imageJobState = 'frozen';
            // [rphub 2.8.64] 本地有原图就换成本地图，远端已死也能立刻出图。
            try {
                const vault = window.RPHubImageVault;
                if (vault) vault.remember(requestUrl, image.src, card.__imageOwner).then(saved => {
                    if (saved?.url && card.isConnected) image.src = saved.url;
                }).catch(() => {});
            } catch (e) { /* 仓库没装上就照旧用远端图 */ }
            return true;
        };
        const freezeExistingImagesNow = () => {
            if (!isImageFreezeEnabled()) return 0;
            const root = chatContainer.value;
            if (!root) return 0;
            const table = readImageFreezeTable();
            let count = 0;
            root.querySelectorAll('.generated-image-card[data-image-request]').forEach(card => {
                if (captureImageFreezeEntry(card, card.dataset.imageRequest, table)) count += 1;
            });
            if (count) writeImageFreezeTable(table);
            return count;
        };
        const toggleFreezeGeneratedImages = () => {
            // [rphub 2.8.64] 用户点过开关就记下来：之后完全听他的，不再被「默认开启」覆盖。
            settings.freezeGeneratedImagesExplicit = true;
            settings.freezeGeneratedImages = !isImageFreezeEnabled();
            if (settings.freezeGeneratedImages) {
                const count = freezeExistingImagesNow();
                showToast(count > 0
                    ? '已固定当前 ' + count + ' 张图片：切换画师串 / 生图风格不再重新生成'
                    : '已开启生图固定：之后生成完成的图片都会被固定', 'success');
            } else {
                showToast('已关闭生图固定：切换画师串 / 生图风格会重新生成图片', 'info');
            }
            return settings.freezeGeneratedImages;
        };

        // ==================== 生图请求参数自定义（2.8.65） ====================
        // 官网把 steps/scale/cfg/sampler/noise_schedule 写死在 NAI画图正则的 URL 里，
        //   只有 model/artist/size/negative 能被设置项覆盖。这里给前五项开自定义。
        // 存储走 localStorage 独立键：不塞 settings，避免被「恢复默认」清掉、不污染存档。
        const IMAGE_GEN_PARAM_STORAGE_KEY = 'rphub_image_gen_params';
        const IMAGE_GEN_PARAM_SPEC = Object.freeze({
            steps: { min: 1, max: 50, def: 28, site: 40, label: '迭代步数' },
            scale: { min: 1, max: 20, def: 6, site: 6, label: '提示词引导强度' },
            cfg: { min: 0, max: 1, def: 0, site: 0, label: '引导重缩放' },
            sampler: { def: 'k_dpmpp_2m_sde', site: 'k_dpmpp_2m_sde', label: '采样器' },
            noise_schedule: { def: 'karras', site: 'karras', label: '噪声调度' }
        });
        const IMAGE_GEN_SAMPLER_OPTIONS = Object.freeze([
            { value: 'k_dpmpp_2m_sde', label: 'DPM++ 2M SDE' },
            { value: 'k_dpmpp_2m', label: 'DPM++ 2M' },
            { value: 'k_dpmpp_sde', label: 'DPM++ SDE' },
            { value: 'k_dpmpp_2s_ancestral', label: 'DPM++ 2S Ancestral' },
            { value: 'k_euler_ancestral', label: 'Euler Ancestral' },
            { value: 'k_euler', label: 'Euler' }
        ]);
        const IMAGE_GEN_NOISE_OPTIONS = Object.freeze([
            { value: 'karras', label: 'Karras（官网默认）' },
            { value: 'native', label: 'Native' },
            { value: 'exponential', label: 'Exponential' }
        ]);
        const clampImageGenParam = (name, value) => {
            const spec = IMAGE_GEN_PARAM_SPEC[name];
            if (!spec) return value;
            if (spec.min === undefined) return String(value == null ? '' : value) || spec.def;
            const num = Number(value);
            if (!Number.isFinite(num)) return spec.def;
            return Math.min(spec.max, Math.max(spec.min, num));
        };
        const readImageGenParams = () => {
            let raw = {};
            try { raw = JSON.parse(localStorage.getItem(IMAGE_GEN_PARAM_STORAGE_KEY) || '{}') || {}; } catch (e) { raw = {}; }
            const out = {};
            Object.keys(IMAGE_GEN_PARAM_SPEC).forEach((name) => {
                const value = raw[name];
                out[name] = (value === undefined || value === null || value === '')
                    ? IMAGE_GEN_PARAM_SPEC[name].def
                    : clampImageGenParam(name, value);
            });
            return out;
        };
        const imageGenParams = ref(readImageGenParams());
        const saveImageGenParams = () => {
            try {
                localStorage.setItem(IMAGE_GEN_PARAM_STORAGE_KEY, JSON.stringify(imageGenParams.value));
            } catch (e) { /* 存不下就只在本会话生效 */ }
        };
        let imageStepsConfirmationPending = false;
        const setImageGenParam = async (name, value, input) => {
            if (!IMAGE_GEN_PARAM_SPEC[name]) return;
            const normalized = clampImageGenParam(name, value);
            if (name === 'steps' && normalized > 28 && normalized !== imageGenParams.value.steps) {
                if (input) input.value = imageGenParams.value.steps;
                if (imageStepsConfirmationPending) return;
                imageStepsConfirmationPending = true;
                let confirmed;
                try {
                    confirmed = await showVueConfirmModal('提高迭代步数？',
                        '超过 28 步通常需要更长时间，也可能消耗更多额度，画质不一定提升。继续使用这个步数吗？',
                        { confirmText: '继续使用', cancelText: '保持原步数' });
                } finally { imageStepsConfirmationPending = false; }
                if (!confirmed) return;
            }
            const next = Object.assign({}, imageGenParams.value);
            next[name] = normalized;
            imageGenParams.value = next;
            saveImageGenParams();
        };
        const resetImageGenParams = () => {
            const fresh = {};
            Object.keys(IMAGE_GEN_PARAM_SPEC).forEach((name) => {
                fresh[name] = IMAGE_GEN_PARAM_SPEC[name].def;
            });
            imageGenParams.value = fresh;
            try { localStorage.removeItem(IMAGE_GEN_PARAM_STORAGE_KEY); } catch (e) { /* 清不掉就算了 */ }
        };
        // 把用户设定写进请求 URL 的 query。所有生图请求（冷启动 hydrate / 重渲染 /
        //   reroll / 角色卡自带 URL）都经过 startGeneratedImageTask，在那里调一次即全覆盖。
        const applyImageGenParams = (params) => {
            const values = imageGenParams.value || {};
            Object.keys(IMAGE_GEN_PARAM_SPEC).forEach((name) => {
                const value = clampImageGenParam(name, values[name]);
                params.set(name, String(value));
            });
        };

        // ===== 2.8.79：生图任务接口补超时与正文上限 =====
        // 原来是无超时的裸 fetch，两个真症状：
        // ① POST 卡住时卡片永远停在「等待生成」，进度条不动、没有任何失败提示，用户只能刷新；
        // ② 轮询里那句「连续 5 次失败才抛」形同虚设 —— 它只在快速失败（连接被拒、立刻 5xx）
        //    时生效。卡住时 fetch 一直 pending，循环吊在那一次 await 上，pollFailures 根本
        //    不会自增，while 也就永远不退出。
        // 另外 response.text() 无上限，中转站返回的 HTML 错误页会整段进 payload.error
        // 再显示到卡片上。
        const IMAGE_JOB_CREATE_TIMEOUT_MS = 30000;   // 创建任务：服务端可能排队
        const IMAGE_JOB_POLL_TIMEOUT_MS = 15000;     // 轮询：正常响应应在 1s 内
        const IMAGE_JOB_BODY_LIMIT = 65536;          // 任务 JSON 很小，64KB 足够
        // 卡片上只放一行提示（renderGeneratedImageJob 直接写进 label.textContent），
        // 64KB 的 HTML 错误页整段塞进去等于把卡片变成日志窗口。
        const IMAGE_JOB_MESSAGE_LIMIT = 300;
        const readImageJobBody = async (response, limit = IMAGE_JOB_BODY_LIMIT) => {
            if (!response.body || typeof response.body.getReader !== 'function') {
                const raw = String((await response.text()) || '');
                return raw.length > limit ? raw.slice(0, limit) : raw;
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let text = '';
            let bytes = 0;
            try {
                while (bytes < limit) {
                    const chunk = await reader.read();
                    if (chunk.done) { text += decoder.decode(); break; }
                    const take = chunk.value.subarray(0, limit - bytes);
                    bytes += take.byteLength;
                    text += decoder.decode(take, { stream: true });
                }
            } finally {
                try { reader.releaseLock(); } catch (_) { }
            }
            return text;
        };
        const fetchImageJobJson = async (url, options = {}) => {
            const isCreate = String(options.method || 'GET').toUpperCase() === 'POST';
            const timeoutMs = Number(options.timeoutMs) || (isCreate ? IMAGE_JOB_CREATE_TIMEOUT_MS : IMAGE_JOB_POLL_TIMEOUT_MS);
            const controller = new AbortController();
            const outer = options.signal;
            const onOuterAbort = () => { try { controller.abort(); } catch (_) { } };
            if (outer) {
                if (outer.aborted) controller.abort();
                else outer.addEventListener('abort', onOuterAbort, { once: true });
            }
            let timedOut = false;
            const timer = setTimeout(() => { timedOut = true; try { controller.abort(); } catch (_) { } }, timeoutMs);
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                const text = await readImageJobBody(response, options.bodyLimit);
                let payload = {};
                try { payload = text ? JSON.parse(text) : {}; } catch { /* 交给下方统一报错 */ }
                if (!response.ok) {
                    const detail = String(payload.error?.message || payload.error || text || `HTTP ${response.status}`);
                    throw new Error(detail.length > IMAGE_JOB_MESSAGE_LIMIT
                        ? detail.slice(0, IMAGE_JOB_MESSAGE_LIMIT) + '…'
                        : detail);
                }
                return payload;
            } catch (error) {
                // 超时必须换成明确文案：裸 AbortError 的 message 是
                // "The user aborted a request."，直接显示到卡片上等于没说。
                if (timedOut) throw new Error(`生图任务请求超时（${Math.round(timeoutMs / 1000)} 秒无响应）`);
                throw error;
            } finally {
                clearTimeout(timer);
                if (outer) outer.removeEventListener('abort', onOuterAbort);
            }
        };

        const renderGeneratedImageJob = (card, task, job) => {
            if (!card.isConnected) return task.cards.delete(card);
            task.job = job;
            card.dataset.imageJobId = job.id || '';
            const progress = Math.max(0, Math.min(100, Number(job.generationProgress?.percent || 0)));
            const label = card.querySelector('.generated-image-progress-label');
            const bar = card.querySelector('.generated-image-progress-bar');
            card.classList.toggle('is-waiting', job.status === 'queued');
            if (bar) bar.style.width = `${progress}%`;

            if (job.status === 'queued') {
                if (label) label.textContent = job.queuePosition
                    ? `排队中 · 第 ${job.queuePosition} / ${job.queuedCount || job.queuePosition} 个`
                    : '排队中';
                return;
            }
            if (job.status === 'running') {
                if (label) label.textContent = `生成中 ${Math.round(progress)}%`;
                return;
            }

            const imageUrl = job.imageUrl
                ? new URL(job.imageUrl, task.baseUrl).href
                : job.id
                    ? `${task.baseUrl}/api/jobs/${encodeURIComponent(job.id)}/content?token=${encodeURIComponent(task.token)}`
                    : '';
            if (!imageUrl) {
                card.classList.remove('is-generating');
                card.classList.add('is-generation-error');
                if (label) label.textContent = job.error || '生成失败';
                return;
            }

            const image = card.querySelector('img');
            if (task.protocol !== 'jobs') image.addEventListener('load', () => {
                if (image.naturalWidth && image.naturalHeight)
                    card.style.aspectRatio = image.naturalWidth + ' / ' + image.naturalHeight;
            }, { once: true });
            image.style.height = '100%';
            image.src = imageUrl;
            card.classList.remove('is-generating', 'is-generation-error', 'is-waiting');
            card.dataset.imageJobState = job.status;
            // [rphub 2.7.70] 生成完成：若开着固定，记下这张图，供切换画师串后复用。
            if (job.status === 'done') recordImageFreezeEntry(card, task.requestUrl);
        };

        const startGeneratedImageTask = (requestUrl, fresh = false) => {
            const request = new URL(requestUrl, window.location.href);
            const provider = { ...imageApi.current };
            const token = provider.id === 'builtin'
                ? settings.imageGenKey.trim() || request.searchParams.get('token') || '' : provider.key.trim();
            request.searchParams.set('token', token);
            // [rphub 2.8.65] 生图参数自定义：在唯一终局闸门处覆盖 query，
            //   这样 hydrate / reroll / 角色卡自带 URL 全部生效。
            try { applyImageGenParams(request.searchParams); } catch (e) { /* 参数覆盖失败不能阻断生图 */ }
            const taskIdentity = url => JSON.stringify([provider.id, provider.protocol, provider.url, provider.model, provider.size, url]);
            const requestKey = taskIdentity(request.href);
            const key = fresh ? `${requestKey}#${Date.now()}-${Math.random()}` : requestKey;
            if (generatedImageTasks.has(key)) return generatedImageTasks.get(key);
            const task = { key, requestUrl: request.href, baseUrl: '', protocol: provider.protocol, token, cards: new Set(), job: null };
            const publish = (job) => {
                task.job = job;
                [...task.cards].forEach(card => renderGeneratedImageJob(card, task, job));
            };
            task.promise = (async () => {
                task.baseUrl = imageApi.endpoint(provider);
                if (provider.protocol === 'novelai') {
                    publish({ status: 'running' });
                    const imageUrl = await window.RPImageProviders.generateNovelImage({ ...provider, endpoint: task.baseUrl },
                        Object.fromEntries(request.searchParams.entries()));
                    const job = { status: 'done', imageUrl };
                    publish(job);
                    return job;
                }
                if (provider.protocol === 'openai') {
                    if (!provider.model.trim()) throw new Error('请在生图设置中填写此接口的模型名称');
                    publish({ status: 'running' });
                    const payload = await fetchImageJobJson(task.baseUrl, {
                        method: 'POST', timeoutMs: 180000, bodyLimit: 32 * 1024 * 1024,
                        headers: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
                        body: JSON.stringify({ model: provider.model.trim(), n: 1, size: provider.size.trim() || 'auto',
                            prompt: [request.searchParams.get('tag'), request.searchParams.get('artist')].filter(Boolean).join(', ') })
                    });
                    const image = payload.data?.[0];
                    let imageUrl = image?.url;
                    if (image?.b64_json) {
                        const mime = image.b64_json.startsWith('/9j/') ? 'image/jpeg'
                            : image.b64_json.startsWith('UklGR') ? 'image/webp' : 'image/png';
                        imageUrl = 'data:' + mime + ';base64,' + image.b64_json;
                    }
                    if (!imageUrl) throw new Error(payload.error?.message || '生图接口未返回图片，请检查接口格式和模型');
                    const job = { status: 'done', imageUrl };
                    publish(job);
                    return job;
                }
                let job = await fetchImageJobJson(`${task.baseUrl}/api/jobs`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(request.searchParams.entries()))
                });
                publish(job);
                let pollFailures = 0;
                while (!['done', 'failed'].includes(job.status)) {
                    await new Promise(resolve => setTimeout(resolve, 150));
                    try {
                        job = await fetchImageJobJson(`${task.baseUrl}/api/jobs/${encodeURIComponent(job.id)}?token=${encodeURIComponent(task.token)}`);
                        pollFailures = 0;
                    } catch (error) {
                        if (++pollFailures < 5) continue;
                        throw error;
                    }
                    publish(job);
                }
                if (fresh && job.status === 'done') {
                    const reusableRequest = new URL(task.requestUrl);
                    reusableRequest.searchParams.set('nocache', '0');
                    generatedImageTasks.delete(task.key);
                    task.key = taskIdentity(reusableRequest.href);
                    generatedImageTasks.set(task.key, task);
                }
                return job;
            })().catch((error) => {
                const job = { status: 'failed', error: error.message || '生成失败' };
                publish(job);
                return job;
            });
            generatedImageTasks.set(key, task);
            return task;
        };

        const ensureGeneratedImageProgressUi = (card) => {
            if (card.querySelector('.generated-image-progress')) return;
            const progress = document.createElement('div');
            progress.className = 'generated-image-progress';
            progress.setAttribute('aria-live', 'polite');
            progress.innerHTML = '<svg class="generated-image-spinner" viewBox="0 0 50 50" aria-hidden="true"><circle class="generated-image-spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="2"></circle></svg><span class="generated-image-progress-label">等待生成</span><span class="generated-image-progress-track"><i class="generated-image-progress-bar"></i></span>';
            card.appendChild(progress);
        };

        const loadGeneratedImageCard = async (card, requestUrl = card.dataset.imageRequest, options = {}) => {
            if (!requestUrl) return Promise.resolve({ status: 'failed' });
            // [rphub 2.7.70] 生图固定：命中固定记录 ⇒ 直接复用旧图，不再请求生成。
            //   options.fresh（reroll）时跳过固定，保证 reroll 仍能生成新图并覆盖记录。
            card.__imageOwner = imageOwnerOf(card);
            card.dataset.imageJobState = 'restoring';
            if (options.fresh !== true && await applyFrozenImage(card, requestUrl)) {
                generatedImageTasks.forEach(task => task.cards.delete(card));
                return Promise.resolve({ status: 'done', frozen: true });
            }
            if (!card.isConnected) return { status: 'failed', cancelled: true };
            ensureGeneratedImageProgressUi(card);
            generatedImageTasks.forEach(task => task.cards.delete(card));
            card.querySelector('img')?.setAttribute('alt', '');
            const animationTime = performance.now();
            card.querySelector('.generated-image-spinner')?.style.setProperty('animation-delay', `-${animationTime % 2000}ms`);
            card.querySelector('.generated-image-spinner-path')?.style.setProperty('animation-delay', `-${animationTime % 1500}ms`);
            const label = card.querySelector('.generated-image-progress-label');
            const bar = card.querySelector('.generated-image-progress-bar');
            const task = startGeneratedImageTask(requestUrl, options.fresh === true);
            if (!task.job) {
            if (label) label.textContent = '等待生成';
                if (bar) bar.style.width = '0%';
            }
            task.cards.add(card);
            card.dataset.imageRequest = requestUrl;
            card.dataset.imageJobState = 'loading';
            card.classList.add('is-generating');
            card.classList.remove('is-generation-error');
            const size = new URL(requestUrl, window.location.href).searchParams.get('size');
            // [rphub 2.8.65] 尺寸档位扩到 9 档后不能再用全等匹配：2K横图 / 4K方图 等
            //   会落到 else 分支拿到竖图比例，占位框先竖后横，图一到就跳。
            card.style.aspectRatio = size && size.includes('横') ? '1216 / 832'
                : size && size.includes('方') ? '1'
                : '832 / 1216';
            if (task.job) renderGeneratedImageJob(card, task, task.job);
            return task.promise;
        };

        const hydrateGeneratedImages = (root) => {
            if (currentView.value !== 'chat' || !root) return;
            const cards = root.matches('.generated-image-card[data-image-request]')
                ? [root]
                : [...root.querySelectorAll('.generated-image-card[data-image-request]')];
            cards.forEach(card => {
                if (!card.dataset.imageJobState) loadGeneratedImageCard(card);
            });
        };
        watch(currentView, view => {
            if (view === 'chat') nextTick(() => hydrateGeneratedImages(chatContainer.value));
        });

        watch(chatContainer, (container) => {
            generatedImageObserver?.disconnect();
            if (!container) return;
            generatedImageObserver = new MutationObserver(records => {
                records.forEach(record => record.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) hydrateGeneratedImages(node);
                }));
            });
            generatedImageObserver.observe(container, { childList: true, subtree: true });
            hydrateGeneratedImages(container);
        });
        const releaseCharacterRuntime = async () => {
            clearMessageRenderCaches();
            styleFilteredContentCache.clear();
            window.RPHubUtils.clearParseCache();
            await nextTick();
            generatedImageTasks.forEach(task => {
                task.cards.forEach(card => { if (!card.isConnected) task.cards.delete(card); });
            });
        };

        const handleGeneratedImageReroll = async (event, messageIndex) => {
            const button = event.target.closest('.generated-image-reroll');
            if (!button) return;
            event.preventDefault();
            event.stopPropagation();
            if (isConversationBusy.value) {
                showToast('请等待当前回复完成后再重新生成图片', 'warning');
                return;
            }

            const card = button.closest('.generated-image-card');
            const cards = [...event.currentTarget.querySelectorAll('.generated-image-card')];
            const imageIndex = cards.indexOf(card);
            const message = chatHistory.value[messageIndex];
            const sourceText = String(message?.content || '');
            const imageMatches = cardUtils.findUnprotectedMatches(sourceText, getImageTagRegex());
            const imageMatch = imageMatches[imageIndex];
            if (!message || imageIndex < 0 || !imageMatch) return;
            if (card.classList.contains('is-rerolling')) return;

            const tags = imageMatch[1].split(',').map(tag => tag.trim()).filter(Boolean);
            if (tags.length < 2) {
                showToast('提示词太短，无法重新生成', 'warning');
                return;
            }
            const swapIndex = Math.floor(Math.random() * (tags.length - 1));
            [tags[swapIndex], tags[swapIndex + 1]] = [tags[swapIndex + 1], tags[swapIndex]];
            const updatedToken = `image###${tags.join(', ')}###`;
            const updatedContent = sourceText.slice(0, imageMatch.index)
                + updatedToken
                + sourceText.slice(imageMatch.index + imageMatch[0].length);
            const sourceUrl = card.dataset.imageRequest || card.querySelector('img')?.getAttribute('src');
            if (!sourceUrl) return;
            const nextImageUrl = new URL(sourceUrl, window.location.href);
            nextImageUrl.searchParams.set('tag', tags.join(', '));
            nextImageUrl.searchParams.set('nocache', '1');

            const originalContent = message.content;
            const finishLoading = () => {
                card.classList.remove('is-rerolling');
                button.disabled = false;
            };
            card.classList.add('is-rerolling');
            button.disabled = true;

            const job = await loadGeneratedImageCard(card, nextImageUrl.href, { fresh: true });
            if (job.status === 'done') {
                if (chatHistory.value[messageIndex] !== message || message.content !== originalContent) {
                    finishLoading();
                    return;
                }
                message.content = updatedContent;
                message.shouldAnimate = false;
                scheduleChatHistorySave();
                showToast('已重新生成图片', 'success');
                nextTick(finishLoading);
                return;
            }
            finishLoading();
        };

        const updateImageGenRegexState = ({ enableRegex = false } = {}) => {
            const imageGenRegexName = 'NAI画图正则';
            let regex = regexScripts.value.find(r => r.name === imageGenRegexName);
            if (!regex) {
                enforceSpecialRules();
                regex = regexScripts.value.find(r => r.name === imageGenRegexName);
                if (!regex) return [];
            }

            const targetArtists = cardUtils.getImageStyleArtists(settings.imageStyle, settings.customImageArtists);
            const styleName = imageStyleOptions.find(option => option.value === settings.imageStyle)?.label
                || imageStyleOptions[0].label;
            const modelName = getImageModelName(settings.imageModel);

            // 动态替换 URL 中的 model、artist 和 size 参数
            const encodedTargetArtists = encodeURIComponent(targetArtists);
            const oldReplacement = regex.replacement;
            let newReplacement = oldReplacement.replace(/artist=[\s\S]*?(&size=)/, 'artist=' + encodedTargetArtists + '$1');
            if (newReplacement === oldReplacement) {
                newReplacement = oldReplacement.replace(/artist=[^&]+/, 'artist=' + encodedTargetArtists);
            }
            newReplacement = newReplacement.replace(/model=[^&]+/, 'model=' + settings.imageModel);
            newReplacement = newReplacement.replace(/size=[^&]+/, 'size=' + settings.imageSize);
            newReplacement = newReplacement.replace(/negative=([\s\S]*?)&nocache=/, (match, rawNegative) => {
                const negativeMarker = '{{{{bad anatomy}}}}';
                const markerIndex = rawNegative.indexOf(negativeMarker);
                const baseNegative = markerIndex === -1 ? rawNegative : rawNegative.slice(markerIndex);
                const userNegative = cardUtils.normalizeCustomNegatives(settings.customImageArtists);
                return 'negative=' + (userNegative ? encodeURIComponent(userNegative) + ',' + baseNegative : baseNegative) + '&nocache=';
            });
            regex.replacement = newReplacement;

            let messages = [];
            // 检查 Artist 变化
            const oldArtist = oldReplacement.match(/artist=([\s\S]*?)&size=/)?.[1] || oldReplacement.match(/artist=([^&]+)/)?.[1];
            if (oldArtist !== encodedTargetArtists) {
                messages.push(styleName);
            }
            const oldModel = oldReplacement.match(/model=([^&]+)/)?.[1];
            if (oldModel !== settings.imageModel) {
                messages.push(modelName);
            }
            // 检查 Size 变化
            const oldSize = oldReplacement.match(/size=([^&]+)/)?.[1];
            if (oldSize !== settings.imageSize) {
                messages.push(`比例: ${settings.imageSize}`);
            }

            if (enableRegex && !regex.enabled) {
                regex.enabled = true;
                messages.push(`${imageGenRegexName} 已启用`);
            }

            return messages;
        };

        watch(isAutoImageGenEnabled, (newVal) => {
            if (newVal) {
                const messages = updateImageGenRegexState({ enableRegex: true });
                if (messages.length > 0) {
                    showToast('为适配生图：' + messages.join('，'), 'info');
                }
            }
        });

        watch(() => settings.imageStyle, () => {
            const messages = updateImageGenRegexState({ enableRegex: isAutoImageGenEnabled.value });
            if (isAutoImageGenEnabled.value && messages.length > 0) {
                showToast('生图风格已切换：' + messages.join('，'), 'success');
            }
        });

        watch(() => settings.customImageArtists, () => {
            if (settings.imageStyle === 'custom') {
                updateImageGenRegexState({ enableRegex: isAutoImageGenEnabled.value });
            }
            syncSettingsToGenerator();
        }, { deep: true });

        watch(() => settings.imageModel, (imageModel) => {
            if (imageModel === 'nai-diffusion-5-full' && v5UnsupportedImageStyles.has(settings.imageStyle)) {
                settings.imageStyle = 'vertical';
            }
            const messages = updateImageGenRegexState({ enableRegex: isAutoImageGenEnabled.value });
            if (isAutoImageGenEnabled.value && messages.length > 0) {
                showToast(`生图版本已切换：${getImageModelName(imageModel)}`, 'success');
            }
        }, { flush: 'sync' });

        watch(() => settings.imageSize, () => {
            const messages = updateImageGenRegexState({ enableRegex: isAutoImageGenEnabled.value });
            if (isAutoImageGenEnabled.value && messages.length > 0) {
                showToast('生图比例已切换：' + messages.join('，'), 'success');
            }
        });

        watch(() => settings.imageGenCount, () => {
            enforceSpecialRules();
        });

        // Debounce function
        const debounce = (fn, delay) => {
            let timeoutId = null;
            const wrapped = (...args) => {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => { timeoutId = null; fn(...args); }, delay);
            };
            // [rphub 2.8.117] 导入收尾要能取消排队中的自动保存：屏障释放后它若再触发一次，
            //   等于白省一遍整库写。
            wrapped.cancel = () => {
                if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
            };
            return wrapped;
        };

        // Debounced Save
        const debouncedSave = debounce(() => {
            saveData({ saveMemories: false, saveCharacters: false });
        }, 1000);
        const debouncedCharacterSave = debounce(() => {
            saveCharactersNow().catch(error => console.error('Save characters failed:', error));
        }, 1000);
        let suspendCharacterAutoSave = false;

        // Watch for changes to auto-save
        watch(() => characters.value.map(char => [
            char,
            char?.uuid,
            char?.favoriteAt,
            char?.worldInfo,
            char?.regexScripts,
            char?.uiTemplates,
            char?.recentGenerationTimes
        ]), () => {
            if (_initComplete && !suspendCharacterAutoSave && !_isApplyingCharacterScopedData) debouncedCharacterSave();
        });
        watch([settings, presets, presetGroupNames, regexScripts, globalRegexScripts, worldInfo, globalWorldInfo, globalUiTemplates, activeTools, user, recentGenerationTimes], () => {
            if (!_initComplete) return;
            debouncedSave();
        }, { deep: true });

        // Watch chat history length only so large histories do not get traversed on load.
        // Message edits and generation completion still call saveData/saveChatHistoryNow directly.
        watch(() => chatHistory.value.length, () => {
            if (_isApplyingCharacterScopedData) return;
            scheduleChatHistorySave();
        });

        // --- Computed ---
        const currentCharacter = computed(() => {
            return currentCharacterIndex.value >= 0 ? characters.value[currentCharacterIndex.value] : null;
        });
        watch(() => currentCharacter.value?.uuid, id => window.RPCardNight.select(id), { immediate: true, flush: 'sync' });
        // [rphub 2.8.92] 作用域 watcher 的正确位置：必须在 currentCharacter 声明**之后**。
        //   原位置（let chatHistorySaveTimer 那一带）在 currentCharacter 之前约 1300 行，
        //   函数型 source 会立即求值 ⇒ TDZ ReferenceError ⇒ watcher 静默不注册。
        //   挪到这里后首次求值可以正常执行：此刻 currentCharacterIndex(1248)、
        //   characters(1246)、activeStoryBranchId(4344)、_classicMemoriesLoaded(4152)、
        //   _b1ScopeEpoch(6642)、getCurrentStoryBranchScopeId(6637) 全部已初始化。
        watch(getCurrentStoryBranchScopeId, () => { _b1ScopeEpoch++; _classicMemoriesLoaded = false; }, { flush: 'sync' });
        // PNG 角色卡的头像连同整张卡的数据一起保存，可达十几 MB。界面显示改用短的 blob 地址，
        // 否则每次重绘背景样式、每新建一个消息头像，浏览器都要重新解析整段 data URL。
        let avatarDisplayCache = { source: '', url: '' };
        const currentCharacterAvatar = computed(() => {
            const source = currentCharacter.value?.avatar || '';
            const comma = source.indexOf(',');
            if (avatarDisplayCache.source !== source && avatarDisplayCache.url) {
                if (avatarDisplayCache.url.startsWith('blob:')) URL.revokeObjectURL(avatarDisplayCache.url);
                avatarDisplayCache = { source: '', url: '' };
            }
            // 2.8.79：阈值原为 1e6。1e6 是 base64 字符数，按 4:3 折算约 750KB 二进制，
            // 而典型 PNG 角色卡头像落在 200KB~800KB —— 正好卡在悬崖下面，这段 blob 化对
            // 绝大多数真实头像从未生效，每次重绘仍在反复解析整段 data URL。
            // 降到 64K 字符（≈48KB 二进制）。atob + 建 Blob 的成本只在 source 变化时付一次，
            // 之后命中 avatarDisplayCache，比重绘时重新解码 base64 便宜。
            if (source.length < 65536 || !/^data:[^,]*;base64$/.test(source.slice(0, comma))) return source;
            if (avatarDisplayCache.source !== source) {
                if (avatarDisplayCache.url) URL.revokeObjectURL(avatarDisplayCache.url);
                try {
                    const binary = atob(source.slice(comma + 1));
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    const type = source.slice(5, comma).split(';')[0];
                    avatarDisplayCache = { source, url: URL.createObjectURL(new Blob([bytes], { type })) };
                } catch (_) {
                    avatarDisplayCache = { source, url: source };
                }
            }
            return avatarDisplayCache.url;
        });
        const scopeOptions = computed(() => [
            { value: 'character', label: '绑定当前角色卡', disabled: !currentCharacter.value },
            { value: 'global', label: '全局生效' }
        ]);

        const normalizeRegexScript = (script = {}, fallbackScope = 'character') => (
            cardUtils.normalizeRegexScript(script, { fallbackScope, systemNames: systemRegexNames })
        );

        const toRegexExportEntry = (script = {}, fallbackScope = 'character') => (
            cardUtils.toRegexExportEntry(normalizeRegexScript(script, fallbackScope))
        );

        const combineRegexScriptsForCharacter = (char = currentCharacter.value) => {
            const globalScripts = JSON.parse(JSON.stringify(globalRegexScripts.value))
                .map(script => normalizeRegexScript(script, 'global'));
            const characterScripts = Array.isArray(char?.regexScripts)
                ? JSON.parse(JSON.stringify(char.regexScripts)).map(script => normalizeRegexScript(script, 'character')).filter(script => script.scope !== 'global')
                : [];
            regexScripts.value = [...globalScripts, ...characterScripts];
        };

        const finishApplyingCharacterScopedData = () => {
            nextTick(() => {
                _isApplyingCharacterScopedData = false;
            });
        };

        const toUiTemplateExportEntry = (template = {}) => {
            const normalized = normalizeUiTemplate(template);
            return cardUtils.toUiTemplateExportEntry(normalized);
        };

        const ensureCurrentUiTemplates = () => {
            if (!currentCharacter.value) return [];
            if (!Array.isArray(currentCharacter.value.uiTemplates)) currentCharacter.value.uiTemplates = [];
            if (currentCharacter.value.uiTemplates.some(template => template.scope !== 'character' || !template.id)) {
                currentCharacter.value.uiTemplates = currentCharacter.value.uiTemplates.map(template => normalizeUiTemplate({ ...template, scope: 'character' }));
            }
            return currentCharacter.value.uiTemplates;
        };

        const ensureGlobalUiTemplates = () => {
            if (globalUiTemplates.value.some(template => template.scope !== 'global' || !template.id)) {
                globalUiTemplates.value = globalUiTemplates.value.map(template => normalizeUiTemplate({ ...template, scope: 'global' }));
            }
            return globalUiTemplates.value;
        };

        const getUiTemplateListByScope = (scope) => scope === 'global' ? ensureGlobalUiTemplates() : ensureCurrentUiTemplates();

        const currentUiTemplates = computed(() => [
            ...ensureGlobalUiTemplates(),
            ...ensureCurrentUiTemplates()
        ].map((template, index) => ({ template, index }))
            .sort((a, b) => (Number(b.template.order) || 0) - (Number(a.template.order) || 0) || a.index - b.index)
            .map(item => item.template));
        const activeUiTemplates = computed(() => currentUiTemplates.value.filter(t => t.enabled !== false));
        const managedUiTemplates = computed(() => currentUiTemplates.value.slice().sort(globalFirst));
        const isUiTemplateAnalysisEnabled = () => settings.uiTemplateEnabled
            && settings.uiTemplateMainModelAnalysis
            && activeUiTemplates.value.length > 0;

        const handleUiTemplateClick = (event) => {
            const trigger = event.target?.closest?.('[data-slash]');
            if (!trigger) return;
            const command = trigger.getAttribute('data-slash');
            if (!command) return;
            event.preventDefault();
            event.stopPropagation();
            window.triggerSlash(command);
        };

        const renderEditingUiTemplatePreview = () => {
            let variableState = editingUiTemplate.data.previewVariableState || {};
            try {
                variableState = JSON.parse(editingUiTemplate.data.variableStateText || '{}');
            } catch (e) {
                // 预览里 JSON 写错时，先沿用打开弹窗时的变量，避免整个弹窗空掉。
            }
            return renderUiTemplateHtml({
                htmlTemplate: editingUiTemplate.data.htmlTemplate,
                variableState
            });
        };

        const getLastAssistantMessage = () => [...chatHistory.value].reverse().find(msg => msg && msg.role === 'assistant');
        const summarizeUiTemplateFailure = (reason) => {
            const text = String(reason || 'UI模板变量校验失败').replace(/\s+/g, ' ').trim();
            return text.length > 800 ? `${text.slice(0, 797)}...` : text;
        };
        const buildMainModelUiTemplateUpdatePrompt = () => {
            if (!settings.uiTemplateEnabled || !settings.uiTemplateMainModelAnalysis) return '';
            const templates = activeUiTemplates.value;
            if (!templates.length) return '';

            const templatePayload = templates.map(template => ({
                id: template.id,
                name: template.name || 'UI模板',
                currentVariables: template.variableState || {},
                variableSchema: template.variableSchema || ''
            }));

            return replaceUserNamePlaceholder(BUILTIN_PROMPTS.buildMainModelUiTemplatePrompt({
                templatePayload,
                userName: user.name
            }));
        };

        const applyMainModelUiTemplateUpdates = (targetMessage, model = settings.model) => {
            const templates = activeUiTemplates.value;
            if (!settings.uiTemplateEnabled || !settings.uiTemplateMainModelAnalysis || !targetMessage || !templates.length) {
                return { handled: false, changed: false };
            }
            delete targetMessage.uiTemplateAnalysisFailure;
            const recordFailure = (reason) => {
                const summary = summarizeUiTemplateFailure(reason);
                targetMessage.uiTemplateAnalysisFailure = {
                    summary,
                    reason: summary,
                    sourceMessageId: targetMessage.id || null
                };
                failUiTemplateAnalysis('变量分析失败，下次请求将自动修正', targetMessage.id || null);
                console.warn('[UI模板] 主模型变量分析失败:', summary);
                return { handled: true, changed: false };
            };
            const match = findUiTemplateUpdateBlock(targetMessage.content);
            if (!match) {
                const missingTemplates = templates
                    .map(template => `模板“${template.name || '未命名'}”（ID：${template.id}）`)
                    .join('；');
                return recordFailure(`未输出UI模板变量块：${missingTemplates}`);
            }

            let updates = [];
            try {
                const updateContent = match[1];
                const parsed = parseUiTemplateUpdates(updateContent, templates);
                updates = normalizeUiTemplateUpdateList(parsed, templates);
            } catch (e) {
                const reason = e instanceof SyntaxError
                    ? `变量块格式错误：${e.message}`
                    : e.message;
                return recordFailure(reason);
            }

            const targetMessageIndex = chatHistory.value.findIndex(msg => msg === targetMessage || (targetMessage.id && msg.id === targetMessage.id));
            const turn = targetMessageIndex >= 0 ? getAssistantTurnAtIndex(targetMessageIndex) : null;
            let changedFieldCount = 0;
            updates.forEach(update => {
                const targets = update?.id
                    ? activeUiTemplates.value.filter(template => template.id === update.id)
                    : (activeUiTemplates.value.length === 1 ? [activeUiTemplates.value[0]] : []);
                targets.forEach(template => {
                    const result = applyUiTemplateUpdateListToTemplate(template, [update], { model, turn, source: 'main_model' });
                    if (result.changed) {
                        changedFieldCount += result.fieldCount;
                    }
                });
            });

            attachUiTemplateBlocksToLastAssistant({ targetMessageId: targetMessage.id });

            if (changedFieldCount > 0) {
                saveGlobalUiTemplateRuntimeForCharacter();
                saveData({ saveMemories: false });
                markUiTemplateStatus('success', `更新 ${changedFieldCount} 项`, targetMessage.id || null);
                return { handled: true, changed: true };
            }

            markUiTemplateStatus('skipped', '无变化', targetMessage.id || null);
            return { handled: true, changed: false };
        };

        const appendPendingUiTemplateCorrection = (messageList) => {
            if (!settings.uiTemplateEnabled || !settings.uiTemplateMainModelAnalysis) return;

            let failureMessage = null;
            let failureIndex = -1;
            for (let index = chatHistory.value.length - 1; index >= 0; index--) {
                const message = chatHistory.value[index];
                if (message?.role === 'assistant' && message.uiTemplateAnalysisFailure) {
                    failureMessage = message;
                    failureIndex = index;
                    break;
                }
            }
            if (!failureMessage) return;

            let userIndex = -1;
            for (let index = chatHistory.value.length - 1; index > failureIndex; index--) {
                if (chatHistory.value[index]?.role === 'user') {
                    userIndex = index;
                    break;
                }
            }
            if (userIndex < 0) return;

            const target = [...messageList].reverse().find(message => (
                message?.role === 'user'
                && Array.isArray(message._sourceIndexes)
                && message._sourceIndexes.includes(userIndex)
            ));
            if (!target) return;

            const userMessage = chatHistory.value[userIndex];
            const failure = failureMessage.uiTemplateAnalysisFailure;
            const correctionPrompt = BUILTIN_PROMPTS.buildMainModelUiTemplateCorrectionPrompt({
                failureSummary: failure.summary || summarizeUiTemplateFailure(failure.reason),
                failureReason: failure.reason
            });
            userMessage.uiTemplateCorrection = {
                summary: failure.summary || summarizeUiTemplateFailure(failure.reason),
                sourceMessageId: failure.sourceMessageId || failureMessage.id || null
            };
            delete failureMessage.uiTemplateAnalysisFailure;
            scheduleChatHistorySave();
            target.content = `${correctionPrompt}\n\n${String(target.content || '').trimStart()}`;
        };

        const removeOrphanedUiTemplateCorrections = () => {
            const messageIds = new Set(chatHistory.value.map(message => message?.id).filter(Boolean));
            chatHistory.value.forEach(message => {
                const sourceMessageId = message?.uiTemplateCorrection?.sourceMessageId;
                if (sourceMessageId && !messageIds.has(sourceMessageId)) {
                    delete message.uiTemplateCorrection;
                }
            });
        };

        const attachUiTemplateBlocksToLastAssistant = ({ excludeTemplateIds = new Set(), targetMessageId = null } = {}) => {
            const targetMessage = targetMessageId
                ? chatHistory.value.find(msg => msg && msg.role === 'assistant' && msg.id === targetMessageId)
                : getLastAssistantMessage();
            if (!targetMessage) return false;
            const top = activeUiTemplates.value
                .filter(template => template.placement === 'top' && !excludeTemplateIds.has(template.id))
                .map(renderUiTemplateHtml)
                .filter(Boolean);
            const bottom = activeUiTemplates.value
                .filter(template => template.placement === 'bottom' && !excludeTemplateIds.has(template.id))
                .map(renderUiTemplateHtml)
                .filter(Boolean);
            targetMessage.uiTemplateBlocks = {
                top,
                bottom,
                updatedAt: Date.now()
            };
            return top.length > 0 || bottom.length > 0;
        };

        const getAssistantTurnAtIndex = (index) => {
            const normalizedIndex = Math.max(0, Math.min(index, chatHistory.value.length - 1));
            return getConversationTurnAtIndex(normalizedIndex);
        };

        const buildUiTemplateStateAtTurn = (template, turn) => {
            let state = cloneUiObject(inferInitialUiTemplateState(template));
            const logs = Array.isArray(template.changeLog)
                ? template.changeLog
                    .filter(log => Number(log.turn || 0) <= turn)
                    .sort((a, b) => (a.turn || 0) - (b.turn || 0) || (a.time || 0) - (b.time || 0))
                : [];
            logs.forEach(log => {
                Object.entries(log.changes || {}).forEach(([key, change]) => {
                    if (change && Object.prototype.hasOwnProperty.call(change, 'to')) {
                        state = setUiTemplateValue(state, key, change.to);
                    }
                });
            });
            return state;
        };

        const UI_TEMPLATE_CONTEXT_OPEN_TAG = '<ui_template_state_context>';
        const UI_TEMPLATE_CONTEXT_CLOSE_TAG = '</ui_template_state_context>';

        const stripUiTemplateContextInjection = (text) => String(text || '')
            .replace(/<ui_template_state_context>[\s\S]*?<\/ui_template_state_context>/gi, '')
            .replace(/<ui_template_state_context>[\s\S]*$/gi, '');

        const stripNextResponsePrompt = (text) => String(text || '')
            .replace(/<next_response>[\s\S]*?<\/next_response>/gi, '')
            .replace(/<next_response>[\s\S]*$/gi, '');
        // 正文里的记忆引用 [M12] 只给界面展示，发回模型、做总结、检索和复制时去掉。
        const stripMemoryCitations = (text) => String(text || '').replace(/\[M\d{1,6}\]/g, '');

        const buildUiTemplateContextSystemPrompt = () => {
            if (!settings.uiTemplateEnabled || !settings.uiTemplateInjectContext || settings.uiTemplateMainModelAnalysis) return '';
            const turn = getLatestCompleteConversationTurn()?.turn;
            const referenceTurn = Number(turn) || 0;
            if (referenceTurn <= 0) return '';

            const sections = activeUiTemplates.value
                .map(template => {
                    const state = buildUiTemplateStateAtTurn(template, referenceTurn);
                    if (!state || Object.keys(state).length === 0) return null;
                    const title = escapeXmlAttribute(template.name || template.id || 'UI模板');
                    return [
                        `  <template_state name="${title}">`,
                        indentXmlText(JSON.stringify(state, null, 2), 4),
                        '  </template_state>'
                    ].join('\n');
                })
                .filter(Boolean);

            if (!sections.length) return '';
            return [
                UI_TEMPLATE_CONTEXT_OPEN_TAG,
                `  <description>${BUILTIN_PROMPTS.uiTemplateContextDescription}</description>`,
                ...sections,
                UI_TEMPLATE_CONTEXT_CLOSE_TAG
            ].join('\n');
        };

        const rebuildUiTemplateStateFromLogs = (template, remainingLogs) => {
            let rebuilt = cloneUiObject(inferInitialUiTemplateState(template));
            [...remainingLogs]
                .sort((a, b) => (a.turn || 0) - (b.turn || 0) || (a.time || 0) - (b.time || 0))
                .forEach(log => {
                    Object.entries(log.changes || {}).forEach(([key, change]) => {
                        if (change && Object.prototype.hasOwnProperty.call(change, 'to')) {
                            rebuilt = setUiTemplateValue(rebuilt, key, change.to);
                        }
                    });
                });
            template.variableState = rebuilt;
        };

        const pruneUiTemplateChangesFromTurn = (turn) => {
            if (!Number.isFinite(turn) || turn < 1) return { logs: 0, blocks: 0 };
            let removedLogs = 0;
            currentUiTemplates.value.forEach(template => {
                const allLogs = Array.isArray(template.changeLog) ? template.changeLog : [];
                const remainingLogs = allLogs.filter(log => (log.turn || 0) < turn);
                removedLogs += allLogs.length - remainingLogs.length;
                if (allLogs.length !== remainingLogs.length) {
                    rebuildUiTemplateStateFromLogs(template, remainingLogs);
                    template.changeLog = remainingLogs;
                }
            });

            let removedBlocks = 0;
            const snapshot = buildConversationTurnSnapshot();
            const blockMessageIndexes = new Set();
            snapshot.turns.forEach(turnInfo => {
                if ((turnInfo.turn || 0) < turn) return;
                turnInfo.sourceIndexes.forEach(sourceIndex => blockMessageIndexes.add(sourceIndex));
            });
            blockMessageIndexes.forEach(msgIndex => {
                const msg = chatHistory.value[msgIndex];
                if (msg?.role === 'assistant' && msg.uiTemplateBlocks) {
                    delete msg.uiTemplateBlocks;
                    removedBlocks++;
                }
            });

            if (uiTemplateUpdateStatus.targetMessageId) {
                const targetStillExists = chatHistory.value.some(msg => msg.id === uiTemplateUpdateStatus.targetMessageId);
                if (!targetStillExists) {
                    abortUiTemplateUpdate(uiTemplateUpdateStatus.targetMessageId);
                }
            }

            return { logs: removedLogs, blocks: removedBlocks };
        };

        const resetUiTemplateRuntimeState = () => {
            abortUiTemplateUpdate();
            currentUiTemplates.value.forEach(template => {
                template.variableState = cloneUiObject(template.initialVariableState || {});
                template.changeLog = [];
            });
            saveGlobalUiTemplateRuntimeForCharacter();
            chatHistory.value.forEach(msg => {
                if (msg.uiTemplateBlocks) delete msg.uiTemplateBlocks;
            });
            markUiTemplateStatus('idle', '待命');
        };

        const getUiTemplateRuntimeKey = (char = currentCharacter.value, branchId = activeStoryBranchId.value) => (
            getStoryBranchScopeId(char?.uuid, branchId)
        );

        const getUiTemplatesForRuntime = (char = currentCharacter.value) => [
            ...ensureGlobalUiTemplates(),
            ...(Array.isArray(char?.uiTemplates) ? char.uiTemplates : [])
        ];

        const saveGlobalUiTemplateRuntimeForCharacter = (
            char = currentCharacter.value,
            branchId = activeStoryBranchId.value
        ) => {
            const key = getUiTemplateRuntimeKey(char, branchId);
            if (!key) return;
            getUiTemplatesForRuntime(char).forEach(template => {
                if (!template.runtimeByCharacter || typeof template.runtimeByCharacter !== 'object') {
                    template.runtimeByCharacter = {};
                }
                template.runtimeByCharacter[key] = {
                    variableState: cloneUiObject(template.variableState || template.initialVariableState || {}),
                    changeLog: Array.isArray(template.changeLog) ? JSON.parse(JSON.stringify(template.changeLog)) : []
                };
            });
        };

        const loadGlobalUiTemplateRuntimeForCharacter = (char = currentCharacter.value) => {
            const key = getUiTemplateRuntimeKey(char);
            getUiTemplatesForRuntime(char).forEach(template => {
                const runtime = key && template.runtimeByCharacter ? template.runtimeByCharacter[key] : null;
                const legacyCharacterState = activeStoryBranchId.value === STORY_BRANCH_MAIN_ID && template.scope === 'character';
                template.variableState = cloneUiObject(runtime?.variableState
                    || (legacyCharacterState ? template.variableState : null)
                    || template.initialVariableState
                    || {});
                const changeLog = runtime?.changeLog || (legacyCharacterState ? template.changeLog : []);
                template.changeLog = Array.isArray(changeLog) ? JSON.parse(JSON.stringify(changeLog)) : [];
            });
            markUiTemplateStatus('idle', '待命');
        };

        // 2.7.86：导入分支聊天记录时还原 UI 模板变量。
        // exportCharacterChat 的 manifest 里带了 uiVariables，但导入侧一直没消费，
        // 导致 1.0 的记录导进 1.1 卡后是「旧面板 HTML + 新变量初值」的错位组合。
        // 这里按 template.id 匹配（回退 name），把变量状态与变更流水写回，
        // 并同步落到 runtimeByCharacter[当前分支]，保证刷新/切分支后仍然有效。
        const findUiTemplateForImport = (templates, snapshot) => {
            if (!snapshot) return null;
            const id = String(snapshot.id || '').trim();
            if (id) {
                const byId = templates.find(template => String(template?.id || '') === id);
                if (byId) return byId;
            }
            const name = String(snapshot.name || '').trim();
            if (name) {
                const byName = templates.find(template => String(template?.name || '').trim() === name);
                if (byName) return byName;
            }
            return null;
        };
        // 只回填 1.1 模板里**依然存在**的变量：新增变量保留自己的初值，
        // 已删除变量直接丢弃，绝不用旧值污染新模板。
        const pickKnownUiVariables = (incoming, template) => {
            const source = incoming && typeof incoming === 'object' ? incoming : {};
            const known = template?.initialVariableState && typeof template.initialVariableState === 'object'
                ? Object.keys(template.initialVariableState)
                : Object.keys(source);
            const result = {};
            known.forEach(key => {
                if (!Object.prototype.hasOwnProperty.call(source, key)) return;
                if (source[key] === undefined) return;
                result[key] = cloneUiObject(source[key]);
            });
            return result;
        };
        const restoreUiVariablesFromChatImport = (uiVariables, char = currentCharacter.value) => {
            try {
                const list = Array.isArray(uiVariables?.templates) ? uiVariables.templates : [];
                if (!list.length) return 0;
                const runtimeKey = getUiTemplateRuntimeKey(char);
                let restored = 0;
                getUiTemplatesForRuntime(char).forEach(template => {
                    const snapshot = list.find(item => findUiTemplateForImport([item], template));
                    if (!snapshot) return;
                    const baseState = template.variableState && typeof template.variableState === 'object'
                        ? template.variableState
                        : (template.initialVariableState || {});
                    const picked = pickKnownUiVariables(snapshot.currentVariableState, template);
                    const merged = { ...cloneUiObject(baseState), ...picked };
                    template.variableState = merged;
                    // changeLog 必须同时落在模板本体：loadGlobalUiTemplateRuntimeForCharacter
                    // 读的是 runtime.changeLog || template.changeLog，只写 runtime 的话，
                    // 一旦 runtime 键对不上（换分支/换角色后重载），变更历史就丢了。
                    const logs = Array.isArray(snapshot.changeLog)
                        ? JSON.parse(JSON.stringify(snapshot.changeLog))
                        : (Array.isArray(template.changeLog) ? JSON.parse(JSON.stringify(template.changeLog)) : []);
                    template.changeLog = logs;
                    if (!template.runtimeByCharacter || typeof template.runtimeByCharacter !== 'object') {
                        template.runtimeByCharacter = {};
                    }
                    if (runtimeKey) {
                        template.runtimeByCharacter[runtimeKey] = {
                            variableState: cloneUiObject(merged),
                            changeLog: JSON.parse(JSON.stringify(logs))
                        };
                    }
                    restored += 1;
                });
                return restored;
            } catch (error) {
                // 变量还原是锦上添花，绝不能因为它打断聊天记录导入。
                console.warn('还原 UI 模板变量失败，已保留新卡初值:', error);
                return 0;
            }
        };

        const getCharacterFavoriteTime = (char) => {
            const time = Number(char?.favoriteAt || 0);
            return Number.isFinite(time) && time > 0 ? time : 0;
        };

        const isCharacterFavorite = (char) => getCharacterFavoriteTime(char) > 0;

        // [rphub 2.8.91] 角色卡列表头像 blob 化（多槽缓存，不再是单槽）。
        // 列表 :src 原本直接吃原始 data URL，DOM 属性里挂的是几百 KB 到 1MB 的 base64 串；
        // 这里换成 64 字符的 blob 地址，同一张卡的地址只建一次。
        // 键用「长度 + 首 64 + 末 32」，避免把整串塞进 Map 当 key 反复算哈希。
        // 刻意不做容量驱逐、也不 revokeObjectURL：卡片滚出屏幕后仍留在 DOM 里
        // （列表容器有 content-visibility:auto），此时 revoke 会让它滚回来时直接裂图。
        // blob 地址随页面重载一起释放，生命周期与 characters 里的原始 data URL 同阶。
        const listAvatarCache = new Map();
        const listAvatarUrl = (source) => {
            const raw = String(source || '');
            const comma = raw.indexOf(',');
            if (raw.length < 65536 || comma < 0 || !/^data:[^,]*;base64$/.test(raw.slice(0, comma))) return raw;
            const key = raw.length + ':' + raw.slice(0, 64) + ':' + raw.slice(-32);
            const cached = listAvatarCache.get(key);
            if (cached) return cached;
            let url = raw;
            try {
                const binary = atob(raw.slice(comma + 1));
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                url = URL.createObjectURL(new Blob([bytes], { type: raw.slice(5, comma).split(';')[0] }));
            } catch (_) {
                url = raw;
            }
            listAvatarCache.set(key, url);
            return url;
        };

        const filteredCharacters = computed(() => {
            // [rphub 2.8.91] 排序键在这里算一次。原来比较函数里每条都比较一次
            // getCharacterFavoriteTime()，排序要 O(n log n) 次比较，卡多时纯重复计算。
            let result = characters.value.map((char, originalIndex) => ({
                char,
                originalIndex,
                _favTime: getCharacterFavoriteTime(char),
                _createdAt: char.createdAt || 0,
                _uuid: char.uuid || ''
            }));

            if (characterSearchQueryApplied.value) {
                const query = characterSearchQueryApplied.value.toLowerCase();
                result = result.filter(({ char }) =>
                    String(char.name || '').toLowerCase().includes(query) ||
                    String(char.description || '').toLowerCase().includes(query)
                );
            }

            // Favorites stay on top, with the most recently favorited first.
            // 与改动前完全等价：先比收藏时间，再比创建时间，最后用 uuid 兜底。
            result.sort((a, b) => {
                if (b._favTime !== a._favTime) return b._favTime - a._favTime;
                if (b._createdAt !== a._createdAt) return b._createdAt - a._createdAt;
                return b._uuid.localeCompare(a._uuid);
            });

            return result;
        });

        const displayedCharacters = computed(() => {
            return filteredCharacters.value.slice(0, characterDisplayLimit.value).map(({ char, originalIndex }) => ({
                originalIndex,
                uuid: char.uuid,
                name: char.name,
                avatar: listAvatarUrl(window.RPHubStorage.characterPreviewUrl(char)),
                favoriteAt: char.favoriteAt,
                worldInfoCount: getCharacterWICount(char),
                regexCount: getCharacterRegexCount(char)
            }));
        });

        const loadMoreCharacters = () => {
            characterDisplayLimit.value += 8;
        };

        const resetChatRenderWindow = () => {
            chatRenderLimit.value = CHAT_RENDER_INITIAL_LIMIT;
            isChatTopUnlockArmed = true;
        };

        // [rphub 2.8.107] 只读运行环境探测：不改任何行为，只把「这台机器跑的是什么内核、
        //   多少内存、堆上限多大、渲染窗口多宽」摆到设置页上，让兼容性问题可观测。
        //   判定口径来自产物实测：?. 出现 437 处（语法，内核 <80 整份解析失败）、
        //   structuredClone 2 处（运行时，内核 <98 才缺）、Array.at 1 处（<92）。
        const runtimeEnv = ref(null);
        const refreshRuntimeEnv = () => {
            const pick = (fn, fallback) => {
                try {
                    const value = fn();
                    return (value === undefined || value === null || value === '') ? fallback : value;
                } catch (_) {
                    return fallback;
                }
            };
            const ua = pick(() => String(navigator.userAgent || ''), '');
            // Android 4.4 时代的 WebView UA 里是 Version/4.0，没有 Chrome/ 字样
            //   ⇒ 解析失败不报「未知版本」，直接把 UA 原文摆出来，原文比结论有用。
            const chromeMatch = ua.match(/Chrome\/(\d+)/);
            const chromeMajor = chromeMatch ? Number(chromeMatch[1]) : 0;
            let engineVerdict;
            if (!chromeMajor) engineVerdict = '内核版本未识别，请把下面的 UA 原文发出来';
            else if (chromeMajor < 80) engineVerdict = '内核低于 80：脚本可能整份解析失败（白屏）';
            else if (chromeMajor < 98) engineVerdict = '内核 80-97：缺少 structuredClone，个别功能会报错';
            else engineVerdict = '内核满足全部语法与 API 要求';
            // performance.memory 不是标准 API，非 Chromium 内核没有 ⇒ 显示「不可用」而不是抛错
            const mem = pick(() => performance.memory, null);
            const heapLimit = mem && Number(mem.jsHeapSizeLimit) > 0 ? Number(mem.jsHeapSizeLimit) : 0;
            const heapUsed = mem && Number(mem.usedJSHeapSize) > 0 ? Number(mem.usedJSHeapSize) : 0;
            const deviceRam = pick(() => Number(navigator.deviceMemory) || 0, 0);
            const toMb = (bytes) => (bytes > 0 ? Math.round(bytes / 1048576) + ' MB' : '不可用');
            runtimeEnv.value = {
                ua: ua || '不可用',
                chrome: chromeMajor ? String(chromeMajor) : '未识别',
                engineVerdict: engineVerdict,
                deviceRam: deviceRam > 0 ? deviceRam + ' GiB（浏览器上报值，精度被降档）' : '不可用',
                heapLimit: toMb(heapLimit),
                heapUsed: toMb(heapUsed),
                heapRatio: (heapLimit > 0 && heapUsed > 0) ? Math.round(heapUsed / heapLimit * 100) + '%' : '不可用',
                renderWindow: CHAT_RENDER_INITIAL_LIMIT + ' 条起，上限 ' + (Number(settings.chatRenderMessageLimit) || 0) + ' 条',
                charPage: characterDisplayLimit.value + ' 张起，每次 +8'
            };
        };
        const copyRuntimeEnv = () => {
            const env = runtimeEnv.value;
            if (!env) { showToast('还没有读到环境信息', 'error'); return; }
            const lines = [
                'RP-Hub 运行环境',
                'WebView 内核: ' + env.chrome,
                '判定: ' + env.engineVerdict,
                '设备内存: ' + env.deviceRam,
                'JS 堆上限: ' + env.heapLimit,
                'JS 堆已用: ' + env.heapUsed + ' (' + env.heapRatio + ')',
                '聊天渲染: ' + env.renderWindow,
                '角色列表: ' + env.charPage,
                'UA: ' + env.ua
            ];
            // 这条路径已被 AndroidBridge.copyText 全局包装成同步 ClipboardManager，
            //   不会撞 WebView 的 NotAllowedError（那是「点了没反应」的老病根）
            navigator.clipboard.writeText(lines.join('\n'))
                .then(() => showToast('已复制运行环境'))
                .catch(() => showToast('复制失败，请长按选择文本', 'error'));
        };
        refreshRuntimeEnv();

        const hasMobileUiTemplateBlocks = (message) => Boolean(
            message?.role === 'assistant'
            && message.uiTemplateBlocks
            && ((Array.isArray(message.uiTemplateBlocks.top) && message.uiTemplateBlocks.top.length)
                || (Array.isArray(message.uiTemplateBlocks.bottom) && message.uiTemplateBlocks.bottom.length))
        );

        const buildMobileUiTemplateDisplayMessage = (message, index, retention) => {
            if (retention?.keptIndexes?.has(index)) return message;
            if (!hasMobileUiTemplateBlocks(message) || activeUiTemplates.value.length === 0) return message;
            return {
                ...message,
                uiTemplateBlocks: {
                    top: [buildMobileUiLazyBlock(index, 'top')],
                    bottom: [buildMobileUiLazyBlock(index, 'bottom')],
                    lazy: true,
                    updatedAt: Date.now()
                }
            };
        };

        const processMobileLazyUiTemplates = () => {
            const container = chatContainer.value;
            if (!container) return;
            const retention = getMobileUiTemplateRetention(chatHistory.value);
            const nearViewport = (node) => {
                const rect = node.getBoundingClientRect();
                return rect.bottom > -420 && rect.top < window.innerHeight + 420;
            };

            container.querySelectorAll('.ui-template-render').forEach(node => {
                if (node.dataset.rphubUiLazy) return;
                const messageNode = node.closest('[data-chat-index]');
                const index = Number(messageNode?.dataset.chatIndex);
                if (!Number.isFinite(index) || retention.keptIndexes.has(index)) return;
                if (nearViewport(node)) return;
                const placement = node.dataset.rphubUiPlacement
                    || (node.classList.contains('ui-template-message-block-top') ? 'top' : 'bottom');
                node.dataset.rphubUiLazy = String(index);
                node.dataset.rphubUiPlacement = placement;
                node.innerHTML = buildMobileUiLazyBlock(index, placement);
            });

            container.querySelectorAll('[data-rphub-ui-lazy]').forEach(marker => {
                const node = marker.closest('.ui-template-render') || marker;
                const index = Number(node.dataset.rphubUiLazy);
                const placement = node.dataset.rphubUiPlacement === 'bottom' ? 'bottom' : 'top';
                if (!Number.isFinite(index) || !nearViewport(node)) return;
                const source = chatHistory.value[index];
                if (!source || source.role !== 'assistant') {
                    node.innerHTML = '<div class="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-center">此楼没有 UI 状态</div>';
                    node.removeAttribute('data-rphub-ui-lazy');
                    return;
                }
                const turnInfo = getConversationTurnAtIndex(index);
                const turn = Number(turnInfo?.turn) || 0;
                const savedBlocks = source.uiTemplateBlocks?.lazy !== true && source.uiTemplateBlocks?.[placement];
                const html = Array.isArray(savedBlocks) ? savedBlocks.join('') : activeUiTemplates.value
                    .filter(template => template.placement === placement)
                    .map(template => renderUiTemplateHtml({
                        htmlTemplate: template.htmlTemplate,
                        variableState: buildUiTemplateStateAtTurn(template, turn)
                    }))
                    .filter(Boolean)
                    .join('');
                node.innerHTML = html || '<div class="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-center">此楼没有 UI 状态</div>';
                node.dataset.rphubUiPlacement = placement;
                node.dataset.rphubUiLoaded = 'true';
                node.removeAttribute('data-rphub-ui-lazy');
            });
        };

        let mobileUiLazyTimer = null;
        const scheduleMobileLazyUiTemplates = () => {
            if (mobileUiLazyTimer) clearTimeout(mobileUiLazyTimer);
            mobileUiLazyTimer = setTimeout(() => {
                mobileUiLazyTimer = null;
                requestAnimationFrame(processMobileLazyUiTemplates);
            }, 40);
        };

        watch(() => settings.chatRenderMessageLimit, value => {
            const normalized = normalizeChatRenderMessageLimit(value);
            if (Number(settings.chatRenderMessageLimit) !== normalized) settings.chatRenderMessageLimit = normalized;
            if (chatRenderLimit.value > normalized) chatRenderLimit.value = normalized;
        });

        watch(() => settings.uiTemplateKeepFloors, value => {
            const normalized = normalizeUiTemplateKeepFloors(value);
            if (Number(settings.uiTemplateKeepFloors) !== normalized) settings.uiTemplateKeepFloors = normalized;
        });

        const hiddenChatMessageCount = computed(() => Math.max(0, chatHistory.value.length - chatRenderLimit.value));

        const displayedChatMessages = computed(() => {
            const startIndex = Math.max(0, chatHistory.value.length - chatRenderLimit.value);
            const uiTemplateRetention = getMobileUiTemplateRetention(chatHistory.value);
            return chatHistory.value.slice(startIndex).map((msg, offset) => ({
                msg: buildMobileUiTemplateDisplayMessage(msg, startIndex + offset, uiTemplateRetention),
                index: startIndex + offset
            }));
        });

        const getChatScrollAnchor = () => {
            const container = chatContainer.value;
            const elements = (messageElements.value || [])
                .filter(el => el && el.dataset && el.dataset.chatIndex)
                .sort((a, b) => Number(a.dataset.chatIndex) - Number(b.dataset.chatIndex));
            if (!container || elements.length === 0) return null;

            const containerTop = container.getBoundingClientRect().top;
            const anchorElement = elements.find(el => el.getBoundingClientRect().bottom >= containerTop + 8) || elements[0];

            return {
                index: anchorElement.dataset.chatIndex,
                topOffset: anchorElement.getBoundingClientRect().top - containerTop
            };
        };

        const restoreChatScrollAnchor = async (anchor, scrollSnapshot = null) => {
            const container = chatContainer.value;
            if (!container) return;

            await nextTick();

            const restoreByHeight = () => {
                if (!scrollSnapshot) return;
                container.scrollTop = scrollSnapshot.scrollTop + (container.scrollHeight - scrollSnapshot.scrollHeight);
            };

            if (!anchor) {
                restoreByHeight();
                return;
            }

            const anchorElement = container.querySelector(`[data-chat-index="${anchor.index}"]`);
            if (!anchorElement) {
                restoreByHeight();
                return;
            }

            const containerTop = container.getBoundingClientRect().top;
            const newTopOffset = anchorElement.getBoundingClientRect().top - containerTop;
            container.scrollTop += newTopOffset - anchor.topOffset;
        };

        const loadEarlierChatMessages = async (batchSize = CHAT_RENDER_BATCH_SIZE) => {
            if (hiddenChatMessageCount.value <= 0 || isLoadingEarlierChatMessages) return;
            isLoadingEarlierChatMessages = true;
            const anchor = getChatScrollAnchor();
            const container = chatContainer.value;
            const scrollSnapshot = container ? {
                scrollTop: container.scrollTop,
                scrollHeight: container.scrollHeight
            } : null;
            const previousStartIndex = Math.max(0, chatHistory.value.length - chatRenderLimit.value);
            const nextRenderLimit = Math.min(
                chatHistory.value.length,
                chatRenderLimit.value + batchSize,
                getChatRenderMessageLimit()
            );
            const nextStartIndex = Math.max(0, chatHistory.value.length - nextRenderLimit);

            for (let i = nextStartIndex; i < previousStartIndex; i++) {
                const message = chatHistory.value[i];
                if (!message || !['user', 'assistant'].includes(message.role)) continue;
                message.skipReveal = true;
                message.shouldAnimate = false;
            }

            chatRenderLimit.value = nextRenderLimit;

            await restoreChatScrollAnchor(anchor, scrollSnapshot);
            scheduleMobileLazyUiTemplates();
            isLoadingEarlierChatMessages = false;
        };

        const handleChatScroll = () => {
            const container = chatContainer.value;
            if (!container) {
                return;
            }
            readerSession.schedule();
            scheduleMobileLazyUiTemplates();
            if (hiddenChatMessageCount.value <= 0) return;
            if (container.scrollTop > 160) {
                isChatTopUnlockArmed = true;
                return;
            }
            if (isChatTopUnlockArmed && container.scrollTop <= 80) {
                isChatTopUnlockArmed = false;
                loadEarlierChatMessages();
            }
        };

        // Reset limit when search query changes
        // [rphub 2.8.91] 改为防抖 180ms 后再生效。原来每敲一个字符就重算全量
        // filteredCharacters 并把 characterDisplayLimit 打回 8；卡越多这一步越贵。
        watch(characterSearchQuery, (value) => {
            clearTimeout(characterSearchDebounceTimer);
            characterSearchDebounceTimer = setTimeout(() => {
                characterSearchQueryApplied.value = value;
                characterDisplayLimit.value = 8;
            }, 180);
        }, { immediate: true });

        const conversationBodyLength = computed(() => getConversationBodyLength(chatHistory.value));
        // 楼层数只看条数，不必给每条回复跑文风过滤。
        // [rphub 2.8.73] 楼层数 = 相邻同角色合并后的条数。它只取决于 role 序列与
        //   _preventContextMerge，与正文内容无关 —— 原来走 mergeConsecutiveRoleMessages，
        //   那里每条都要 toPlainContextMessage（String(content) 复制一遍正文）、合并时
        //   再 join 一遍，流式生成期间每个 chunk 都全量复制整段对话。
        //   等价性由 _countfloors-parity.js 随机对拍验证，不靠推理。
        const countChatFloors = history => {
            const list = Array.isArray(history) ? history : [];
            let floors = 0;
            let lastRole = '';
            let lastMergeable = false;
            for (let index = 0; index < list.length; index += 1) {
                const message = list[index];
                if (!message || typeof message !== 'object') continue;
                const role = message.role;
                // includeSystem: false
                if (role === 'system') continue;
                // 只有 user / assistant 会合并；_preventContextMerge 为 true 的既不并别人也不被并
                const mergeable = (role === 'user' || role === 'assistant')
                    && message._preventContextMerge !== true;
                // 上一块首条允许合并、当前条也允许、且同角色 ⇒ 计入上一块
                if (floors > 0 && lastRole === role && lastMergeable && mergeable) continue;
                floors += 1;
                lastRole = role;
                lastMergeable = mergeable;
            }
            return floors;
        };
        const chatRoundStats = computed(() => ({
            floors: countChatFloors(chatHistory.value)
        }));
        const currentStoryBranch = computed(() => (
            storyBranches.value.find(branch => branch.id === activeStoryBranchId.value) || null
        ));
        const storyRouteMap = computed(() => createStoryRouteMap({
            branches: storyBranches.value,
            activeBranchId: activeStoryBranchId.value,
            selectedBranchId: selectedStoryBranchId.value,
            activeWordCount: conversationBodyLength.value,
            activeFloorCount: chatRoundStats.value.floors
        }));
        const selectedStoryRouteNode = computed(() => (
            storyRouteMap.value.nodes.find(node => node.id === selectedStoryBranchId.value)
            || null
        ));
        const selectedStoryRouteCanDelete = computed(() => (
            Boolean(selectedStoryRouteNode.value && selectedStoryRouteNode.value.id !== STORY_BRANCH_MAIN_ID)
        ));
        const startStoryRouteDrag = (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            const container = event.currentTarget;
            storyRouteDragState = {
                container,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                scrollLeft: container.scrollLeft,
                scrollTop: container.scrollTop,
                moved: false
            };
            if (!event.target?.closest?.('.story-route-node')) {
                container.setPointerCapture?.(event.pointerId);
            }
        };
        const moveStoryRouteDrag = (event) => {
            const state = storyRouteDragState;
            if (!state || state.pointerId !== event.pointerId) return;
            const container = state.container;
            const deltaX = event.clientX - state.startX;
            const deltaY = event.clientY - state.startY;
            if (!state.moved) {
                if (Math.hypot(deltaX, deltaY) < 4) return;
                state.moved = true;
                storyRouteMapDragging.value = true;
                container.setPointerCapture?.(event.pointerId);
            }
            container.scrollLeft = state.scrollLeft - deltaX;
            container.scrollTop = state.scrollTop - deltaY;
            event.preventDefault();
        };
        const endStoryRouteDrag = (event) => {
            const state = storyRouteDragState;
            if (!state || state.pointerId !== event.pointerId) return;
            storyRouteDragState = null;
            storyRouteMapDragging.value = false;
            if (state.container.hasPointerCapture?.(event.pointerId)) {
                state.container.releasePointerCapture(event.pointerId);
            }
            if (state.moved) {
                suppressStoryRouteNodeClick = true;
                setTimeout(() => { suppressStoryRouteNodeClick = false; }, 0);
            }
        };
        const handleStoryRouteNodeClick = (branchId) => {
            if (suppressStoryRouteNodeClick) return;
            selectStoryBranchNode(branchId);
        };

        const isSecondaryClassicMemory = (memory) => memory?.secondaryCompressed === true;
        const getClassicMemoryTurnRange = (memory) => {
            const fallbackTurn = Math.max(1, Number(memory?.turn) || 1);
            const start = Math.max(1, Number(memory?.turnStart) || fallbackTurn);
            const end = Math.max(start, Number(memory?.turnEnd) || fallbackTurn);
            return { start, end };
        };
        // 压缩总结覆盖的轮次集合必须递归到基础总结：三级结构里孙节点的轮次不在父节点的一层来源上，
        // 只看一层会让「这条总结管哪几轮」的引用/召回判断错位。
        // 定义位置要早于任何 computed 求值，否则 const 的暂时性死区会在首屏就抛错。
        const collectClassicMemoryTurns = (memory, out = new Set()) => {
            if (!memory || typeof memory !== 'object') return out;
            if (isSecondaryClassicMemory(memory)) {
                const sources = Array.isArray(memory.sourceMemories) ? memory.sourceMemories : [];
                if (sources.length) sources.forEach(item => collectClassicMemoryTurns(item, out));
                else {
                    const range = getClassicMemoryTurnRange(memory);
                    for (let t = range.start; t <= range.end; t++) out.add(t);
                }
                return out;
            }
            const turn = Number(memory.turn);
            if (turn > 0) out.add(turn);
            if (Array.isArray(memory.sourceMemories)) {
                memory.sourceMemories.forEach(item => collectClassicMemoryTurns(item, out));
            }
            return out;
        };
        const getClassicSecondaryMemoryMarker = (memory) => {
            const range = getClassicMemoryTurnRange(memory);
            return `总结记忆 第 ${range.start}-${range.end} 轮`;
        };

        const buildClassicMemoryLookup = () => {
            const byAssistantId = new Map();
            const byTurn = new Map();
            const secondaryByAssistantId = new Map();
            const secondaryRanges = [];
            classicMemories.value.filter(memory => memory.enabled !== false).forEach(memory => {
                if (isSecondaryClassicMemory(memory)) {
                    (memory.sourceAssistantIds || []).forEach(id => secondaryByAssistantId.set(id, memory));
                    secondaryRanges.push({
                        memory, ...getClassicMemoryTurnRange(memory),
                        turns: memory.sourceMemories?.length
                            ? collectClassicMemoryTurns(memory)
                            : null
                    });
                    return;
                }
                (memory.sourceAssistantIds || []).forEach(id => byAssistantId.set(id, memory));
                if (memory.turn > 0 && !byTurn.has(memory.turn)) byTurn.set(memory.turn, memory);
            });
            return { byAssistantId, byTurn, secondaryByAssistantId, secondaryRanges };
        };

        const findClassicMemoryForTurn = (turnInfo, lookup) => {
            const sourceIds = (turnInfo.assistant?._sourceIndexes || [])
                .map(index => chatHistory.value[index]?.id)
                .filter(Boolean);
            return sourceIds.map(id => lookup.byAssistantId.get(id)).find(Boolean)
                || lookup.byTurn.get(turnInfo.turn);
        };

        const findSecondaryClassicMemoryForTurn = (turnInfo, lookup) => {
            const sourceIds = (turnInfo.assistant?._sourceIndexes || [])
                .map(index => chatHistory.value[index]?.id)
                .filter(Boolean);
            return sourceIds.map(id => lookup.secondaryByAssistantId.get(id)).find(Boolean)
                || lookup.secondaryRanges.find(range => range.turns
                    ? range.turns.has(turnInfo.turn)
                    : turnInfo.turn >= range.start && turnInfo.turn <= range.end)?.memory;
        };

        const summaryCompressedBodyLength = computed(() => {
            let predictedLength = conversationBodyLength.value;
            if (!memorySettings.enabled
                || classicMemories.value.length === 0) return predictedLength;

            const messages = getPostprocessedChatMessages(chatHistory.value, { includeSystem: false });
            const candidateCount = Math.max(0, messages.length - memorySettings.summaryKeepFloors);
            if (candidateCount === 0) return predictedLength;

            const lookup = buildClassicMemoryLookup();
            const snapshot = buildConversationTurnSnapshot(messages, { alreadyPostprocessed: true });
            const eligibleTurns = snapshot.turns.filter(turnInfo => turnInfo.messageIndexes[1] < candidateCount);
            const getRoleLength = (turnInfo, role) => {
                const sourceMessages = (turnInfo[role]?._sourceIndexes || [])
                    .map(index => chatHistory.value[index])
                    .filter(message => message?.role === role);
                const originalMessages = sourceMessages.length > 0 ? sourceMessages : [turnInfo[role]];
                return originalMessages.reduce(
                    (total, message) => total + parseCot(message?.content || '').main.length,
                    0
                );
            };
            const secondaryGroups = new Map();
            eligibleTurns.forEach(turnInfo => {
                const memory = findSecondaryClassicMemoryForTurn(turnInfo, lookup);
                if (!memory) return;
                if (!secondaryGroups.has(memory.id)) secondaryGroups.set(memory.id, { memory, turns: [] });
                secondaryGroups.get(memory.id).turns.push(turnInfo);
            });
            const secondaryTurnSet = new Set();
            secondaryGroups.forEach(({ memory, turns }) => {
                const originalLength = turns.reduce(
                    (total, turnInfo) => total + getRoleLength(turnInfo, 'user') + getRoleLength(turnInfo, 'assistant'),
                    0
                );
                predictedLength += getClassicSecondaryMemoryMarker(memory).length
                    + parseCot(memory.summary || '').main.length
                    - originalLength;
                turns.forEach(turnInfo => secondaryTurnSet.add(turnInfo.turn));
            });

            eligibleTurns.forEach(turnInfo => {
                if (secondaryTurnSet.has(turnInfo.turn)) return;
                const memory = findClassicMemoryForTurn(turnInfo, lookup);
                if (!memory?.summary) return;
                const originalLength = getRoleLength(turnInfo, 'assistant');
                predictedLength += parseCot(memory.summary).main.length - originalLength;
            });
            return Math.max(0, predictedLength);
        });
        const summaryCompressionRate = computed(() => {
            const floorCount = countChatFloors(chatHistory.value);
            if (floorCount <= memorySettings.summaryKeepFloors) return null;
            return conversationBodyLength.value > 0
                ? Math.max(0, Math.round((1 - summaryCompressedBodyLength.value / conversationBodyLength.value) * 100))
                : 0;
        });

        // Chat, summary and analysis models must write text, so embedding models are left out of their lists, and one
        // already saved as the summary or analysis model (picked earlier, or brought in with old settings) is cleared.
        const isEmbeddingModelId = id => /embedding/i.test(String(id || ''));
        // [rphub 2.7.89] 官网新增 selectableModels 统一按 target 取模型列表，
        // 但它把 uiTemplateModel 也落到聊天站列表（availableModels），
        // 且没处理 memoryEmbeddingModel，这里补齐：
        //   uiTemplateModel      → 模板副模型站列表（走专用 API）
        //   memoryEmbeddingModel → 记忆站列表（官网的记忆站分支不含 embedding）
        const selectableModels = computed(() => {
            if (modelSelectionTarget.value === 'uiTemplateModel') return uiTemplateAvailableModels.value;
            if (modelSelectionTarget.value === 'memoryEmbeddingModel'
                || modelSelectionTarget.value === 'memoryClassicModel') return memoryAvailableModels.value;
            return ['quickModels'].includes(modelSelectionTarget.value)
                ? availableModels.value.filter(model => !isEmbeddingModelId(model.id))
                : availableModels.value;
        });
        watch(() => [memorySettings.classicModel, settings.uiTemplateModel], ([classicModel, analysisModel]) => {
            if (isEmbeddingModelId(classicModel)) memorySettings.classicModel = '';
            if (isEmbeddingModelId(analysisModel)) settings.uiTemplateModel = '';
        }, { immediate: true });

        const modelTags = computed(() => {
            const counts = { all: selectableModels.value.length, other: 0 };
            const tags = new Set();

            selectableModels.value.forEach(m => {
                const id = m.id.toLowerCase();
                let found = false;
                for (const family of popularModelFamilies) {
                    if (id.includes(family)) {
                        tags.add(family);
                        counts[family] = (counts[family] || 0) + 1;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    counts.other++;
                }
            });
            const result = [{ name: 'all', count: counts.all }];
            Array.from(tags).sort().forEach(t => result.push({ name: t, count: counts[t] }));
            if (counts.other > 0) result.push({ name: 'other', count: counts.other });
            return result;
        });

        const filteredModels = computed(() => {
            let result = selectableModels.value;

            if (activeModelTag.value && activeModelTag.value !== 'all') {
                if (activeModelTag.value === 'other') {
                    result = result.filter(m => {
                        const id = m.id.toLowerCase();
                        return !popularModelFamilies.some(family => id.includes(family));
                    });
                } else {
                    result = result.filter(m => m.id.toLowerCase().includes(activeModelTag.value));
                }
            }

            const searchQuery = modelSelectionTarget.value === 'memoryEmbeddingModel' ? 'embedding' : modelSearchQuery.value;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                result = result.filter(m => m.id.toLowerCase().includes(query));
            }

            return [...result].sort((a, b) => a.id.localeCompare(b.id));
        });

        const getCharacterWICount = (char) => {
            if (!char.worldInfo) return (char.worldInfoNames || []).filter(name => !systemWorldInfoNames.includes(name)).length;
            return char.worldInfo.reduce((count, entry) => (
                count + (systemWorldInfoNames.includes(entry.comment) ? 0 : 1)
            ), 0);
        };

        const getCharacterRegexCount = (char) => {
            if (!char.regexScripts) return (char.regexNames || []).filter(name => !systemRegexNames.includes(name)).length;
            return char.regexScripts.reduce((count, script) => (
                count + (systemRegexNames.includes(script.name || script.scriptName) ? 0 : 1)
            ), 0);
        };

        // --- Methods ---

        // Toast Notification
        // 2.8.112：多行 toast 离场时按真实高度折叠。
        // 原实现（theme.css:358）用固定单行高 --toast-height 折叠 margin-bottom，
        // 两行以上只折掉一行的高度，剩下的那截在过渡结束瞬间消失 ⇒ 收尾跳一下。
        // 这里在 leave 开始前把实际高度写成内联 height，样式侧再把 height 压到 0，
        // 起点终点都是确定值，过渡自然、收尾不跳。
        const onToastBeforeLeave = (el) => {
            if (!el || !el.style) return;
            try {
                el.style.height = el.offsetHeight + 'px';
                el.style.marginBottom = '0px';
            } catch (error) {
                // 拿不到高度就退回原行为，不影响离场本身
            }
        };
        const showToast = (message, type = 'info', duration = 2000) => {
            const id = `${Date.now()}-${toastIdSeed++}`;
            if (type === 'error' && window.RP_LOCAL_VERSION && !String(message).includes(window.RP_LOCAL_VERSION))
                message = `${message} · ${window.RP_LOCAL_VERSION}`;
            toasts.value.push({ id, message, type, icon: getToastIcon(message, type) });
            setTimeout(() => {
                toasts.value = toasts.value.filter(t => t.id !== id);
            }, duration);
        };

        // Confirmation Dialog
        const yieldToUi = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

        const confirmAction = (message, callback) => {
            confirmMessage.value = message;
            confirmCallback.value = callback;
            showConfirmModal.value = true;
        };

        const runConfirmCallback = async (callback) => {
            try {
                await yieldToUi();
                await callback();
            } catch (error) {
                console.error('Confirm action failed:', error);
                showToast(error?.message || '操作失败', 'error');
            }
        };

        const handleConfirm = () => {
            const callback = confirmCallback.value;
            showConfirmModal.value = false;
            confirmCallback.value = null;
            document.activeElement?.blur?.();
            if (callback) runConfirmCallback(callback);
        };

        const handleCancel = () => {
            showConfirmModal.value = false;
            confirmCallback.value = null;
            document.activeElement?.blur?.();
        };

        // Regex Processing
        // 辅助函数：当自动生图关闭时，只从发送给模型的上下文里移除可生图替换的内容
        const stripDisabledImageGenContext = (text) => {
            if (!text) return text;
            if (isAutoImageGenEnabled.value) return text; // 生图开启时保留
            return String(text)
                .replace(/<image\b[^>]*>[\s\S]*?<\/image>/gi, '')
                .replace(getImageTagRegex(), '')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        };
        // 先确认能匹配再替换：全局替换不论命中与否都会先解析整段替换文本，
        // 卡里几百 KB 的界面模板会在每条消息的每个片段上被重复解析。
        const replaceMatched = (text, re, replacement) => {
            re.lastIndex = 0;
            const matched = re.test(text);
            re.lastIndex = 0;
            return matched ? text.replace(re, replacement) : text;
        };
        const processRegex = (text, options = {}) => {
            if (!text) return '';
            // options: { isDisplay, isPrompt, role, depth }
            const { isDisplay = false, isPrompt = false, role = null, depth = 0 } = options;
            let result = replaceUserNamePlaceholder(text);
            if (role === 'system') return result;
            const orderedScripts = [...regexScripts.value].sort((a, b) => {
                const aIsImageGen = (a.name || a.scriptName) === 'NAI画图正则';
                const bIsImageGen = (b.name || b.scriptName) === 'NAI画图正则';
                return aIsImageGen === bIsImageGen ? 0 : (aIsImageGen ? 1 : -1);
            });

            orderedScripts.forEach(script => {
                // 明确检查 enabled 字段：只有显式设置为 false 才跳过
                if (script.enabled === false) return;

                // Placement Check (1=User, 2=AI)
                // 如果 placement 未定义，默认为全部生效 (兼容旧数据)
                const placement = script.placement || [1, 2];
                if (role === 'user' && !placement.includes(1)) return;
                if (role === 'assistant' && !placement.includes(2)) return;

                // Mode Check
                const userOnly = script.markdownOnly || (!script.markdownOnly && !script.promptOnly);
                if (isDisplay && script.promptOnly) return; // 显示模式下，跳过仅AI可见的正则
                if (isPrompt && userOnly) return; // 发送给AI前，跳过仅用户可见的正则；两项都没勾也按仅用户可见处理

                // Depth Check
                if (script.minDepth !== null && script.minDepth !== undefined && depth < script.minDepth) return;
                if (script.maxDepth !== null && script.maxDepth !== undefined && depth > script.maxDepth) return;

                try {
                    // 兼容外部正则字段：findRegex/regex, replaceString/replacement
                    let regexPattern = script.regex || script.findRegex;
                    let flags = script.flags || script.regexFlags || 'g';
                    const replacement = script.hasOwnProperty('replacement')
                        ? script.replacement
                        : (script.replaceString || '');

                    if (!regexPattern) return;
                    const isImageGenScript = (script.name || script.scriptName) === 'NAI画图正则';

                    // 解析 /pattern/flags 格式
                    if (regexPattern.startsWith('/') && regexPattern.lastIndexOf('/') > 0) {
                        const lastSlash = regexPattern.lastIndexOf('/');
                        const potentialFlags = regexPattern.substring(lastSlash + 1);
                        // 简单的 flags 验证
                        if (/^[gimsuy]*$/.test(potentialFlags)) {
                            flags = potentialFlags;
                            regexPattern = regexPattern.substring(1, lastSlash);
                        }
                    }

                    ({ pattern: regexPattern, flags } = cardUtils.normalizeRegexModifiers(regexPattern, flags));
                    const re = isImageGenScript
                        ? getImageTagRegex()
                        : new RegExp(regexPattern, flags);

                    // 普通正则保护 HTML/代码；明确匹配标签或代码围栏的规则仍直接执行。
                    if (!/[<>]/.test(regexPattern) && !regexPattern.includes('```')) {
                        const wholeMatch = re.exec(result);
                        re.lastIndex = 0;
                        const wrapped = wholeMatch?.[0] === result ? result.replace(re, replacement) : null;
                        re.lastIndex = 0;
                        // 完整保留原文的整条包裹只执行一次，避免给面板内每段文字重复套壳。
                        result = wrapped !== null && wrapped.includes(result)
                            ? wrapped
                            : cardUtils.transformUnprotectedText(result, part => replaceMatched(part, re, replacement));
                    } else {
                        result = replaceMatched(result, re, replacement);
                    }

                } catch (e) {
                    console.error(`Regex error in script "${script.name || 'Unnamed'}":`, e.message);
                }
            });
            return role === 'assistant' ? filterBlockedStyleText(result) : result;
        };
        // 记忆编号对应的轮次（单轮 3，合并总结 1-5），正文角标和判断依据弹窗都显示轮次。
        const memoryCitationLabels = computed(() => new Map(flattenClassicMemories(classicMemories.value)
            .filter(memory => Number.isInteger(memory.no))
            .map(memory => {
                const range = getClassicMemoryTurnRange(memory);
                return [memory.no, range.start === range.end ? String(range.start) : `${range.start}-${range.end}`];
            })));
        const memoryCitationVersion = computed(() => [...memoryCitationLabels.value].map(entry => entry.join(':')).join(','));
        const {
            clearCaches: clearMessageRenderCaches,
            contentUsesHtmlFrame,
            decorateMemoryCitations,
            renderMarkdown
        } = createMessageRenderer({
            processRegex,
            replaceUserPlaceholder: replaceUserNamePlaceholder,
            createExecutableHtmlIframe,
            marked,
            DOMPurify,
            getMemoryCitationLabel: no => memoryCitationLabels.value.get(no),
            getMemoryCitationVersion: () => memoryCitationVersion.value
        });
        watch(() => [settings.styleFilterEnabled, regexScripts.value, user.name], () => {
            clearMessageRenderCaches();
        }, { deep: true });

        const messageUsesHtmlFrame = (msg) => {
            if (!msg || !msg.content) return false;
            if (msg.isTriggered) return msg.showRaw && contentUsesHtmlFrame(msg.content, msg.role);
            const parsed = parseCot(msg.content);
            return contentUsesHtmlFrame(parsed.main || msg.content, msg.role);
        };

        const messageHasUiTemplateBlocks = (msg) => {
            const blocks = msg?.uiTemplateBlocks;
            if (!blocks) return false;
            return (Array.isArray(blocks.top) && blocks.top.length > 0)
                || (Array.isArray(blocks.bottom) && blocks.bottom.length > 0);
        };

        const messageHasPendingUiTemplate = (msg) => (
            !!msg
            && uiTemplateUpdateStatus.state === 'running'
            && uiTemplateUpdateStatus.targetMessageId === msg.id
            && activeUiTemplates.value.length > 0
        );

        const messageUsesWideLayout = (msg) => {
            if (!msg) return false;
            return !!(
                msg.reasoning
                || parseCot(msg.content || '').cot
                || (Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0)
                || messageUsesHtmlFrame(msg)
                || messageHasUiTemplateBlocks(msg)
                || messageHasPendingUiTemplate(msg)
            );
        };

        const collapseNativeReasoning = (message) => {
            if (message && message.role === 'assistant' && typeof message.reasoning === 'string' && message.reasoning.trim()) {
                if (message.isReasoningUserToggled || message.isReasoningAutoCollapsed) return;
                message.isReasoningOpen = false;
                message.isReasoningAutoCollapsed = true;
            }
        };

        const appendAssistantResponseError = (message, errorMessage) => {
            message.responseError = [
                message.responseError,
                String(errorMessage || '生成失败')
            ].filter(Boolean).join('\n\n');
            message.shouldAnimate = false;
            collapseNativeReasoning(message);
        };

        const collapseActiveNativeReasoning = () => {
            collapseNativeReasoning(chatHistory.value[chatHistory.value.length - 1]);
        };

        // API & Models
        const getMemoryApiEndpoint = (path) => {
            const configured = String(memorySettings.memoryApiUrl || '').trim().replace(/\/+$/, '');
            const fallback = String(settings.apiUrl || '').trim().replace(/\/+$/, '');
            const target = String(path || 'chat/completions').replace(/^\/+/, '');
            const normalize = (baseUrl) => {
                const base = String(baseUrl || '').replace(/\/(?:chat\/completions|embeddings|models)$/i, '');
                return /\/v\d+$/i.test(base) ? base + '/' + target : base + '/v1/' + target;
            };
            if (configured) return normalize(configured);
            if (fallback) return normalize(fallback);
            return '';
        };
        const getMemoryApiKey = () => {
            const url = String(memorySettings.memoryApiUrl || '').trim();
            return url ? String(memorySettings.memoryApiKey || '').trim() : String(settings.apiKey || '').trim();
        };
        const requestMemoryJson = (options) => requestChatCompletion({
            ...options,
            url: getMemoryApiEndpoint(options.path || 'chat/completions'),
            apiKey: getMemoryApiKey()
        });
        const fetchMemoryModels = async (isManual = false) => {
            const apiKey = getMemoryApiKey();
            if (!apiKey) {
                if (isManual) showToast('请先填写 API Key（聊天或记忆专用）', 'info');
                return;
            }
            try {
                if (isManual) showToast('正在获取记忆站模型列表...', 'info');
                isFetchingMemoryModels.value = true;
                const url = getMemoryApiEndpoint('models');
                if (!url) throw new Error('未配置 API 地址');
                const data = await requestJson({ url, apiKey });
                memoryAvailableModels.value = data.data || [];
                if (isManual) showToast('成功获取 ' + memoryAvailableModels.value.length + ' 个模型', 'success');
            } catch (error) {
                console.error(error);
                showToast('获取记忆站模型失败: ' + error.message, 'error');
            } finally {
                isFetchingMemoryModels.value = false;
            }
        };
        const normalizeExternalApiEndpoint = (baseUrl, target) => {
            const clean = String(baseUrl || '').trim().replace(/\/+$/, '').replace(/\/(?:chat\/completions|models|embeddings)$/i, '');
            if (!clean) return '';
            return /\/v\d+$/i.test(clean) ? clean + '/' + target : clean + '/v1/' + target;
        };
        const getUiTemplateApiEndpoint = (target) => normalizeExternalApiEndpoint(
            settings.uiTemplateApiUrl || settings.apiUrl,
            target || 'chat/completions'
        );
        // 2.7.87：原来只要填了专用 URL 就完全用专用 Key，Key 留空必然 401。
        // 改为「专用 Key 优先，留空回退聊天 Key」——多数中转站同一把 Key 通用。
        const getUiTemplateApiKey = () => String(
            settings.uiTemplateApiUrl
                ? (settings.uiTemplateApiKey || settings.apiKey || '')
                : (settings.apiKey || '')
        ).trim();
        const fetchUiTemplateModels = async (isManual = false) => {
            const apiKey = getUiTemplateApiKey();
// 2.7.87：原来专用 URL 为空时直接拿聊天站列表冒充模板站列表，还提示「成功」，
            // 用户会以为专用站已生效。改为手动获取时明确区分两者。
            if (!settings.uiTemplateApiUrl && availableModels.value.length) {
                uiTemplateAvailableModels.value = availableModels.value;
                if (isManual) {
                    showToast('未填写模板专用 API，以下是聊天站模型（副模型分析也会走聊天站）', 'info');
                }
                return;
            }
            if (!apiKey) {
                if (isManual) showToast('请先填写 API Key', 'info');
                return;
            }
            try {
                if (isManual) showToast('正在获取模板站模型列表...', 'info');
                isFetchingUiTemplateModels.value = true;
                const url = getUiTemplateApiEndpoint('models');
                const data = await requestJson({ url, apiKey });
                uiTemplateAvailableModels.value = Array.isArray(data.data) ? data.data : [];
                if (isManual) showToast('成功获取 ' + uiTemplateAvailableModels.value.length + ' 个模型', 'success');
            } catch (error) {
                console.error(error);
                showToast('获取模板站模型失败: ' + error.message, 'error');
            } finally {
                isFetchingUiTemplateModels.value = false;
            }
        };
        const fetchModels = async (isManual = false) => {
            const apiKey = String(settings.apiKey || '').trim();
            if (!apiKey) {
                if (isManual) showToast('请先填写当前 API 预设的 Key', 'info');
                return;
            }
            try {
                if (isManual) showToast('正在获取模型列表...', 'info');
                const url = buildApiEndpoint(settings.apiUrl, 'models');
                const data = await requestJson({ url, apiKey });
                availableModels.value = data.data || [];
                if (isManual) showToast(`成功获取 ${availableModels.value.length} 个模型`, 'success');
            } catch (error) {
                console.error(error);
                showToast('获取模型失败: ' + error.message, 'error');
            }
        };

        const openModelSelector = (target) => {
            modelSelectionTarget.value = target;
            if (target === 'uiTemplateModel' && !uiTemplateAvailableModels.value.length) fetchUiTemplateModels(false);
            if (target === 'memoryEmbeddingModel') {
                modelSearchQuery.value = 'embedding';
                activeModelTag.value = 'all';
            } else if (modelSearchQuery.value === 'embedding') {
                modelSearchQuery.value = '';
            }
            showModelSelector.value = true;
        };

        const selectQuickModels = (models) => {
            const previousModel = settings.model;
            const [qualityModel, balancedModel, fastModel] = models;
            settings.qualityModel = qualityModel || '';
            settings.balancedModel = balancedModel || '';
            settings.fastModel = fastModel || '';
            const activeSlot = chatModelSlots.value.find(slot => slot.mode === currentModelMode.value && slot.model)
                || chatModelSlots.value.find(slot => slot.model);
            if (activeSlot) {
                currentModelMode.value = activeSlot.mode;
                settings.model = activeSlot.model;
            } else {
                settings.model = previousModel;
            }
        };

        const selectModel = (modelId) => {
            if (modelSelectionTarget.value === 'memoryEmbeddingModel') {
                memorySettings.embeddingModel = modelId;
                showModelSelector.value = false;
                return;
            }
            if (modelSelectionTarget.value === 'memoryClassicModel') {
                memorySettings.classicModel = modelId;
                showModelSelector.value = false;
                return;
            }

            settings[modelSelectionTarget.value] = modelId;

            if (
                (modelSelectionTarget.value === 'qualityModel' && currentModelMode.value === 'quality') ||
                (modelSelectionTarget.value === 'balancedModel' && currentModelMode.value === 'balanced') ||
                (modelSelectionTarget.value === 'fastModel' && currentModelMode.value === 'fast')
            ) {
                settings.model = modelId;
            }

            showModelSelector.value = false;
        };

        const checkConnectionStatus = async (status, latency, label, request) => {
            status.value = 'checking';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const startTime = performance.now();
            try {
                await request(controller.signal);
                status.value = 'connected';
                latency.value = Math.round(performance.now() - startTime);
            } catch (error) {
                console.warn(`${label} Status Check Failed:`, error);
                status.value = 'error';
            } finally {
                clearTimeout(timeoutId);
            }
        };

        const checkApiStatus = async () => {
            if (!settings.apiUrl || !settings.apiKey) {
                apiStatus.value = 'error';
                return;
            }
            await checkConnectionStatus(apiStatus, apiLatency, 'API', signal => (
                requestJson({ url: buildApiEndpoint(settings.apiUrl, 'models'), apiKey: settings.apiKey, signal })
            ));
        };

        const checkImageGenStatus = async () => {
            let address;
            try { address = imageApi.endpoint(); }
            catch (_) { imageGenStatus.value = 'error'; return; }
            await checkConnectionStatus(imageGenStatus, imageGenLatency, 'Image API', signal => (
                fetch(address, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal
                })
            ));
        };

        const checkAllStatuses = () => {
            checkApiStatus();
            checkImageGenStatus();
            fetchQuota();
        };

        const createAbortReason = (message = 'Operation aborted') => new DOMException(message, 'AbortError');
        const abortSafely = (controller, message) => {
            if (!controller || controller.signal.aborted) return;
            controller.abort(createAbortReason(message));
        };

        // Chat Logic
        const markActiveToolInlineWorkCancelled = () => {
            let changed = false;
            chatHistory.value.forEach(msg => {
                if (!msg || msg.role !== 'assistant' || !Array.isArray(msg.toolCalls)) return;
                msg.toolCalls.forEach(toolCall => {
                    if (!toolCall || !['receiving', 'queued', 'running', 'continuing'].includes(toolCall.status)) return;
                    toolCall.status = 'error';
                    toolCall.error = '生成已中止';
                    toolCall.resultText = toolCall.resultText || toolCall.error;
                    changed = true;
                });
            });
            if (changed) {
                activeToolContinuationMessageId.value = null;
                activeToolContinuationToolCallId.value = null;
                activeToolContinuationHasResponse.value = false;
                activeToolHandoffPending.value = false;
                activeToolContinuationPending.value = false;
                saveChatHistoryNow();
            }
        };

        if (!window.__rphubStopGenerationCaptureAdded) {
            window.__rphubStopGenerationCaptureAdded = true;
            document.addEventListener('click', event => {
                const target = event.target instanceof Element ? event.target.closest('button[title="中止生成"]') : null;
                if (!target) return;
                event.preventDefault();
                event.stopPropagation();
                stopGeneration();
            }, { capture: true, passive: false });
        }

        const stopGeneration = () => {
            window.RPHubChatAbortRequested = true;
            try { window.RPHubAbortChatRequests?.(); } catch (error) {}
            abortUiTemplateUpdate();
            abortSafely(abortController.value, 'Generation cancelled by user');
            abortSafely(activeToolQueueAbortController, 'Generation cancelled by user');
            if (hasActiveToolInlineWork.value) {
                markActiveToolInlineWorkCancelled();
            }
        };

        const waitForConversationIdle = async (timeoutMs = 3000) => {
            const startedAt = Date.now();
            while (isConversationBusy.value && Date.now() - startedAt < timeoutMs) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            return !isConversationBusy.value;
        };

        const MAX_CHAT_IMAGES = 3;
        const getMessageImages = (message) => {
            if (message?.role !== 'user') return [];
            const sources = Array.isArray(message._sourceIndexes) && message._sourceIndexes.length > 0
                ? message._sourceIndexes.map(index => chatHistory.value[index]).filter(source => source?.role === 'user')
                : [message];
            return sources.flatMap(source => Array.isArray(source?.imageAttachments) ? source.imageAttachments : []);
        };
        const appendMessageImageDescriptions = (message, content) => {
            const descriptions = getMessageImages(message).map((image, index) =>
                `图片 ${index + 1}：${image?.description?.trim() || '用户上传的图片'}`
            );
            return [String(content || '').trim(), ...descriptions].filter(Boolean).join('\n\n');
        };
        // 图片随消息直接交给聊天主模型识别，不再单独调用识图模型。
        const buildChatMessageContent = (message, content) => {
            const images = getMessageImages(message).filter(image => image?.dataUrl);
            if (!images.length) return content;
            return [
                ...(content ? [{ type: 'text', text: content }] : []),
                ...images.map(image => ({ type: 'image_url', image_url: { url: image.dataUrl, detail: 'high' } }))
            ];
        };
        const clearPendingChatImages = () => {
            chatImageSelectionEpoch++;
            pendingChatImages.value = [];
        };
        const clearPendingCardInteraction = () => {
            pendingCardInteraction.value = '';
        };
        const removePendingChatImage = (id) => {
            pendingChatImages.value = pendingChatImages.value.filter(image => image.id !== id);
        };
        const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('图片读取失败'));
            reader.readAsDataURL(file);
        });
        const requestChatImageSelection = (input) => {
            if (pendingChatImages.value.length + pendingChatImageReadCount.value >= MAX_CHAT_IMAGES) {
                showToast(`单次最多上传 ${MAX_CHAT_IMAGES} 张图片`, 'warning');
                return;
            }
            input?.click();
        };
        const handleChatImageSelection = async (event) => {
            const input = event.target;
            const availableSlots = MAX_CHAT_IMAGES - pendingChatImages.value.length - pendingChatImageReadCount.value;
            const selectedFiles = Array.from(input.files || []);
            input.value = '';
            if (selectedFiles.length === 0 || availableSlots <= 0) return;

            const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/') && file.size <= 20 * 1024 * 1024);
            const files = imageFiles.slice(0, availableSlots);
            if (files.length < selectedFiles.length) {
                showToast(`单次最多发送 ${MAX_CHAT_IMAGES} 张图片，且每张不能超过 20 MB`, 'warning');
            }
            if (files.length === 0) return;

            const selectionEpoch = chatImageSelectionEpoch;
            pendingChatImageReadCount.value += files.length;
            try {
                const images = await Promise.all(files.map(async file => ({
                    id: generateUUID(),
                    name: file.name,
                    dataUrl: await compressImage(await readFileAsDataUrl(file), 1600, 0.86)
                })));
                if (selectionEpoch !== chatImageSelectionEpoch) return;
                pendingChatImages.value.push(...images);
            } catch (error) {
                console.error('Image selection failed:', error);
                showToast(error.message || '图片读取失败', 'error');
            } finally {
                pendingChatImageReadCount.value -= files.length;
            }
        };

        const handleChatInputEnter = (event) => {
            if (!event || event.key !== 'Enter') return;
            if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.isComposing || event.keyCode === 229) return;
            event?.preventDefault?.();
            if (!rphubEnterNewline.value) {
                sendMessage();
                return;
            }
            const el = inputBox.value;
            const current = el ? (el.value || '') : (userInput.value || '');
            const start = el && Number.isFinite(el.selectionStart) ? el.selectionStart : current.length;
            const end = el && Number.isFinite(el.selectionEnd) ? el.selectionEnd : current.length;
            const next = current.slice(0, start) + '\n' + current.slice(end);
            userInput.value = next;
            if (el) {
                el.value = next;
                el.selectionStart = el.selectionEnd = start + 1;
            }
            nextTick(() => { autoResizeInput(); el?.focus(); });
        };

        const sendMessage = async () => {
            flushChatInput();
            if ((!userInput.value.trim() && pendingChatImages.value.length === 0 && !pendingCardInteraction.value) || isConversationBusy.value || pendingChatImageReadCount.value > 0) return;

            const content = userInput.value.trim();
            const cardInteraction = pendingCardInteraction.value;
            const imageAttachments = pendingChatImages.value.map(({ dataUrl }) => ({ dataUrl }));
            const startTime = Date.now(); // Record click time
            userInput.value = '';
            clearPendingCardInteraction();
            clearPendingChatImages();

            let finalContent = content;
            if (cardInteraction) {
                chatHistory.value.push({
                    id: generateUUID(),
                    role: 'user',
                    content: cardInteraction,
                    isSelf: true,
                    isTriggered: true,
                    shouldAnimate: true,
                    skipReveal: true
                });
            }
            if (finalContent || imageAttachments.length) {
                // Add user message locally with NAME
                chatHistory.value.push({
                    id: generateUUID(),
                    role: 'user',
                    name: user.name,
                    content: finalContent,
                    shouldAnimate: true,
                    skipReveal: true,
                    isSelf: true,
                    avatar: user.avatar,
                    imageAttachments
                });
            }
            await nextTick();

            await generateResponse(startTime);
        };

        const scrollChatToBottom = async () => {
            await nextTick();
            const container = chatContainer.value;
            if (!container) return;
            container.scrollTop = chatHistory.value.length > 1 ? container.scrollHeight : 0;
        };

        const clearChat = () => {
            confirmAction('确定要清空聊天记录吗？记忆也将一并清空，此操作无法撤销。', async () => {
                clearPendingChatImages();
                clearPendingCardInteraction();
                abortConversationBackgroundWork();
                resetChatRenderWindow();
                const nextHistory = [];
                if (currentCharacter.value && currentCharacter.value.first_mes) {
                    nextHistory.push({
                        role: 'assistant',
                        name: currentCharacter.value.name,
                        content: currentCharacter.value.first_mes
                    });
                }
                const storyScopeId = getCurrentStoryBranchScopeId();
                // [rphub 2.8.93] 清空是用户显式意图，先解除「读到空」保护，否则这次清空写不进库
                if (storyScopeId) _chatScopePristineRead.delete(storyScopeId);
                if (storyScopeId) {
                    let committed;
                    try {
                        committed = await commitConversationState({
                            storyScopeId,
                            history: nextHistory,
                            intent: await tryBeginMemoryIntent('清空对话'),
                            memories: []
                        });
                    } catch (error) {
                        console.error('Clear chat failed:', error);
                        committed = { ok: false, error };
                    }
                    if (!committed.ok) {
                        showToast(`清空未完整保存：${committed.error?.message || '请重试'}`, 'error');
                        return;
                    }
                }
                chatHistory.value = nextHistory;
                resetUiTemplateRuntimeState();
                await saveData({ saveMemories: false, saveCharacters: false });
                showToast('聊天记录、记忆和变量记录已清空', 'success');
            });
        };

        const getNativeFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
        const requestNativeFullscreen = (element) => {
            if (element.requestFullscreen) return element.requestFullscreen();
            if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
        };
        const exitNativeFullscreen = () => {
            if (document.exitFullscreen) return document.exitFullscreen();
            if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
            return Promise.resolve();
        };

        const toggleChatFullscreen = async () => {
            try {
                if (getNativeFullscreenElement()) {
                    isChatFullscreen.value = false;
                    await exitNativeFullscreen();
                    return;
                }
                const fullscreenTarget = document.documentElement;
                if (!fullscreenTarget.requestFullscreen && !fullscreenTarget.webkitRequestFullscreen) {
                    showToast('当前浏览器不支持全屏', 'warning');
                    return;
                }
                closeNavigation();
                isChatFullscreen.value = true;
                await requestNativeFullscreen(fullscreenTarget);
            } catch (err) {
                isChatFullscreen.value = !!getNativeFullscreenElement();
                console.error('Toggle fullscreen failed:', err);
                showToast('全屏失败', 'error');
            }
        };

        const syncChatFullscreenState = () => {
            isChatFullscreen.value = !!getNativeFullscreenElement();
        };

        // ═══════════ 剪贴板 · 原生桥优先（2.8.82） ═══════════
        // 官网 copyMessage 直接调 navigator.clipboard.writeText，失败只弹「复制失败」，
        // 没有任何兜底。而 WebView 里这个 API 会以 NotAllowedError 被拒 ——
        // 真机日志实测：Copy failed: NotAllowedError: Write permission denied.
        // 成因是 clipboard-write 的权限态为 ASK，浏览器会弹权限提示、WebView 没得弹，
        // 直接降级成 deny；无头 Edge 148 同引擎复现出同样的报错，与机型无关。
        // 更麻烦的是它有时既不 resolve 也不 reject（挂在原地），那种情况下
        // 官网那个 .catch 永远不触发，用户看到的是「点了没反应」。
        // ⇒ 不依赖异步剪贴板 API，App 内改走 AndroidBridge.copyText（ClipboardManager，同步）。
        // 做成包装而不是改 copyMessage：一次覆盖全部调用点（消息复制、云备份密钥复制），
        // 且失败时把原错误原样抛回，官网的提示文案与逻辑一个字都不用动。
        (function () {
            var clip = navigator.clipboard;
            if (!clip || typeof clip.writeText !== 'function') return;
            if (clip.writeText.__rphubWrapped) return;
            var bridge = window.AndroidBridge;
            if (!bridge || typeof bridge.copyText !== 'function') return;
            var raw = clip.writeText.bind(clip);
            var wrapped = function (text) {
                var plain = String(text == null ? '' : text);
                try {
                    if (bridge.copyText(plain)) return Promise.resolve();
                } catch (e) {
                }
                return raw(text);
            };
            wrapped.__rphubWrapped = 1;
            try {
                clip.writeText = wrapped;
            } catch (e) {
            }
        })();
        const copyMessage = (content) => {
            navigator.clipboard.writeText(stripMemoryCitations(stripUiTemplateUpdateBlock(content))).then(() => {
                showToast('已复制到剪贴板', 'success');
            }).catch(err => {
                console.error('Copy failed:', err);
                showToast('复制失败', 'error');
            });
        };

        // 编辑块滚进可视区：键盘占用底部 --keyboard-inset 像素，编辑块底部不能越过这条线
        const keepEditBlockVisible = (event) => {
            const target = event && event.target;
            if (!target || !target.closest) return;
            const run = () => {
                const containerEl = chatContainer.value;
                const block = target.closest('.message-edit-group');
                if (!containerEl || !block) return;
                const inset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard-inset')) || 0;
                const cRect = containerEl.getBoundingClientRect();
                const bRect = block.getBoundingClientRect();
                const overflow = bRect.bottom - (cRect.bottom - inset) + 16;
                if (overflow <= 0) return;
                const maxScroll = bRect.top - cRect.top - 8;
                const delta = Math.max(0, Math.min(overflow, maxScroll));
                if (delta <= 0) return;
                containerEl.scrollTo({ top: containerEl.scrollTop + delta, behavior: 'smooth' });
            };
            nextTick(run);
            setTimeout(run, 360);
        };

        const editMessage = (index) => {
            const msg = chatHistory.value[index];
            if (msg) {
                const messageEl = chatContainer.value?.querySelector(`[data-chat-index="${index}"] .message-content-wrapper`);
                const messageHeight = messageEl?.getBoundingClientRect?.().height || 0;
                msg.isEditing_Message = true;
                const cotInfo = parseCot(msg.content);
                const uiTemplateUpdateMatch = findUiTemplateUpdateBlock(msg.content);
                msg.originalCot = cotInfo.ranges.map(({ start, end }) => msg.content.slice(start, end)).join('\n\n')
                    + cotInfo.closingTags;
                msg.originalUiTemplateUpdate = uiTemplateUpdateMatch ? uiTemplateUpdateMatch[0] : '';
                msg.originalEditMessageContent = stripUiTemplateUpdateBlock(cotInfo.main);
                msg.editMessageContent = msg.originalEditMessageContent;
                msg.editMessageHeight = Math.min(0.7 * window.innerHeight, Math.max(88, Math.round(messageHeight || 160)));
            }
        };

        const clearMessageEditState = (message) => {
            message.isEditing_Message = false;
            delete message.editMessageContent;
            delete message.editMessageHeight;
            delete message.originalCot;
            delete message.originalUiTemplateUpdate;
            delete message.originalEditMessageContent;
        };

        const saveEditMessage = async (index) => {
            const msg = chatHistory.value[index];
            if (msg) {
                const contentChanged = String(msg.editMessageContent || '') !== String(msg.originalEditMessageContent || '');
                if (!contentChanged) {
                    clearMessageEditState(msg);
                    await saveChatHistoryNow();
                    showToast('消息未改动', 'success');
                    return;
                }
                let finalContent = msg.editMessageContent;
                if (msg.originalUiTemplateUpdate) {
                    finalContent = finalContent.trimEnd() + '\n\n' + msg.originalUiTemplateUpdate;
                }
                if (msg.originalCot) {
                    finalContent = msg.originalCot + '\n\n' + finalContent;
                }
                msg.content = finalContent;
                delete msg.styleFilterHits;
                openStyleFilterMessageKey.value = '';
                clearMessageEditState(msg);
                abortConversationBackgroundWork();
                const snapshot = await ensureConversationMessageIds();
                const affectedTurn = snapshot.turns.find(turnInfo =>
                    turnInfo.sourceIndexes.includes(index)
                )?.turn || null;
                let committed;
                try {
                    const intent = await tryBeginMemoryIntent('编辑消息');
                    let nextMemories = intent ? syncMemoryConversationBindings(snapshot, { backfill: true }, intent.source) : [];
                    if (intent && affectedTurn) {
                        nextMemories = await removeClassicMemoriesForConversationTurn(snapshot, affectedTurn, nextMemories);
                    }
                    committed = await commitConversationState({
                        storyScopeId: intent ? intent.scopeId : getCurrentStoryBranchScopeId(),
                        history: chatHistory.value,
                        intent,
                        memories: nextMemories
                    });
                } catch (error) {
                    console.error('Save edited message failed:', error);
                    committed = { ok: false, error };
                }
                if (!committed.ok) { showToast('消息尚未完整保存，请保留当前内容并重试', 'error'); return; }
                await saveMemorySettingsNow();
                if (affectedTurn && memorySettings.enabled) {
                    nextTick(startAutomaticMemoryPatrol);
                }
                showToast('消息已保存', 'success');
            }
        };

        const cancelEditMessage = (index) => {
            const msg = chatHistory.value[index];
            if (msg) {
                clearMessageEditState(msg);
            }
        };

        const markUiTemplateStatus = (state, message, targetMessageId = null, detail = '') => {
            // 2.7.87：透传 detail，失败原因才能从 console 走到 UI 标签上。
            uiTemplateUpdateStatus.detail = String(detail || '');
            uiTemplateUpdateStatus.state = state;
            uiTemplateUpdateStatus.message = message;
            uiTemplateUpdateStatus.targetMessageId = targetMessageId;
        };

        const failUiTemplateAnalysis = (message, targetMessageId = null, detail = '') => {
            // 2.7.87：补传 detail，否则状态标签的 title 永远为空。
            markUiTemplateStatus('error', message, targetMessageId, detail || message);
            showToast(message, 'error');
        };

        const startUiTemplateUpdateRun = () => {
            if (uiTemplateUpdateAbortController) {
                uiTemplateUpdateAbortController.abort();
            }
            uiTemplateUpdateAbortController = new AbortController();
            const seq = ++uiTemplateUpdateSeq;
            return { seq, signal: uiTemplateUpdateAbortController.signal };
        };

        const isUiTemplateUpdateRunCurrent = (seq, targetMessageId) => (
            seq === uiTemplateUpdateSeq
            && uiTemplateUpdateAbortController
            && !uiTemplateUpdateAbortController.signal.aborted
            && (!targetMessageId || chatHistory.value.some(msg => msg && msg.id === targetMessageId))
        );

        const abortUiTemplateUpdate = (targetMessageId = null) => {
            if (targetMessageId && uiTemplateUpdateStatus.targetMessageId && uiTemplateUpdateStatus.targetMessageId !== targetMessageId) return;
            if (uiTemplateUpdateAbortController) {
                uiTemplateUpdateAbortController.abort();
                uiTemplateUpdateAbortController = null;
            }
            uiTemplateUpdateSeq++;
            if (!targetMessageId || uiTemplateUpdateStatus.targetMessageId === targetMessageId) {
                markUiTemplateStatus('idle', '待命');
            }
        };

        const updateUiTemplatesFromChat = async ({ targetMessageId = null } = {}) => {
            if (!settings.uiTemplateEnabled) {
                markUiTemplateStatus('skipped', '未开启');
                return false;
            }
            if (!currentCharacter.value) {
                markUiTemplateStatus('skipped', '未选择角色卡');
                return false;
            }
            const templates = activeUiTemplates.value;
            if (!templates.length) {
                markUiTemplateStatus('skipped', '无启用模板');
                return false;
            }
            if (buildConversationTurnSnapshot().turns.length < 1) {
                markUiTemplateStatus('skipped', '对话不足');
                return false;
            }

            const targetMessage = targetMessageId
                ? chatHistory.value.find(msg => msg && msg.role === 'assistant' && msg.id === targetMessageId)
                : getLastAssistantMessage();
            if (!targetMessage) {
                markUiTemplateStatus('skipped', '无AI回复');
                return false;
            }
            if (!targetMessage.id) targetMessage.id = generateUUID();
            const lockedTargetMessageId = targetMessage.id;
            const targetMessageIndex = chatHistory.value.findIndex(msg => msg === targetMessage || msg.id === lockedTargetMessageId);
            const contextMessages = targetMessageIndex >= 0 ? chatHistory.value.slice(0, targetMessageIndex + 1) : chatHistory.value;

            const uiTemplateAnalysisDepth = Number(settings.uiTemplateAnalysisDepth);
            const normalizedUiTemplateAnalysisDepth = Number.isFinite(uiTemplateAnalysisDepth)
                ? Math.max(4, Math.min(10, uiTemplateAnalysisDepth))
                : 4;
            const sourceMessages = getPostprocessedChatMessages(contextMessages, { includeSystem: false })
                .map(m => ({
                    role: m.role,
                    name: m.role === 'user' ? user.name : (m.name || currentCharacter.value.name),
                    content: replaceUserNamePlaceholder(appendMessageImageDescriptions(
                        m,
                        parseCot(stripUiTemplateUpdateBlock(m.content || '')).main
                    ))
                }));
            const recentMessages = sourceMessages.slice(-normalizedUiTemplateAnalysisDepth);

            const fallbackModel = (settings.uiTemplateModel || '').trim();
            if (!fallbackModel) {
                markUiTemplateStatus('skipped', '未选模型');
                return false;
            }
            try {
                const updateRun = startUiTemplateUpdateRun();
                const isCurrentRun = () => isUiTemplateUpdateRunCurrent(updateRun.seq, lockedTargetMessageId);
                markUiTemplateStatus('running', '分析中', lockedTargetMessageId);
                const turn = getAssistantTurnAtIndex(targetMessageIndex);
                let hasChanges = false;
                let changedFieldCount = 0;
                let failedTemplateCount = 0;
                const failedTemplateIds = new Set();
                // 2.7.87：收集每个模板的失败原文，供状态标签展示。
                const failedTemplateErrors = [];
                const pendingTemplateUpdates = [];

                const applyTemplateUpdates = (template, updates, model) => {
                    updates.forEach(update => {
                        const result = applyUiTemplateUpdateListToTemplate(template, [update], { model, turn });
                        if (result.changed) {
                            changedFieldCount += result.fieldCount;
                            hasChanges = true;
                        }
                    });
                };

                await Promise.all(templates.map(async (template) => {
                    const model = fallbackModel;
                    try {
                        const currentVariableJson = JSON.stringify(template.variableState || {}, null, 2);
                        const variableSchemaText = stringifyUiSchema(template.variableSchema).trim();
                        const result = await requestTrackedChatCompletion({
                            url: getUiTemplateApiEndpoint('chat/completions'),
                            apiKey: getUiTemplateApiKey(),
                            model, temperature: 0.4, stream: false,
                            messages: [
                                {
                                    role: 'system',
                                    content: replaceUserNamePlaceholder(BUILTIN_PROMPTS.buildUiTemplateAnalysisSystemPrompt({
                                        templateId: template.id,
                                        userInfo: buildUserInfoPrompt(),
                                        currentVariableJson,
                                        variableSchemaText,
                                        userName: user.name
                                    }))
                                },
                                { role: 'user', content: JSON.stringify({ recentMessages }, null, 2) }
                            ],
                            signal: updateRun.signal
                        }, 'ui_template');
                        if (!isCurrentRun()) return;
                        const content = parseCot(result.content).main;
                        const latestUiTemplateAnalysis = {
                            time: new Date().toISOString(),
                            model,
                            templateId: template.id,
                            templateName: template.name || template.id,
                            content: String(content)
                        };
                        window.__RPHubLastUiTemplateAnalysis = latestUiTemplateAnalysis;
                        console.info('[UI模板][副模型] 最新一次变量输出：', latestUiTemplateAnalysis);
                        const updateBlock = findUiTemplateUpdateBlock(content);
                        const parsed = parseUiTemplateUpdates(updateBlock ? updateBlock[1] : content, [template]);
                        const updates = normalizeUiTemplateUpdateList(parsed, [template]);
                        pendingTemplateUpdates.push({ template, updates, model });
                    } catch (e) {
                        if (updateRun.signal.aborted || !isCurrentRun()) return;
                        failedTemplateCount++;
                        failedTemplateIds.add(template.id);
                        failedTemplateErrors.push(`${template.name || template.id}：${e.message}`);
                        console.warn(`[UI模板] ${template.name || template.id} 未成功:`, e.message);
                    }
                }));

                if (!isCurrentRun()) {
                    if (uiTemplateUpdateSeq === updateRun.seq) {
                        uiTemplateUpdateAbortController = null;
                        markUiTemplateStatus('idle', '待命');
                    }
                    return false;
                }
                pendingTemplateUpdates.forEach(({ template, updates, model }) => {
                    applyTemplateUpdates(template, updates, model);
                });

                const inserted = attachUiTemplateBlocksToLastAssistant({ excludeTemplateIds: failedTemplateIds, targetMessageId: lockedTargetMessageId });

                if (hasChanges) {
                    saveGlobalUiTemplateRuntimeForCharacter();
                    saveData({ saveMemories: false });
                    await saveChatHistoryNow();
                } else if (inserted) {
                    await saveChatHistoryNow();
                }
                if (failedTemplateCount) {
                    // 2.7.87：把失败原文带进状态标签，否则 UI 上只有「N 个失败」无法定位。
                    const reasonHint = failedTemplateErrors.length
                        ? `：${failedTemplateErrors[0].slice(0, 120)}` : '';
                    failUiTemplateAnalysis(`${failedTemplateCount} 个失败${reasonHint}`, lockedTargetMessageId);
                } else if (hasChanges) {
                    markUiTemplateStatus('success', `更新 ${changedFieldCount} 项`, lockedTargetMessageId);
                } else {
                    markUiTemplateStatus('skipped', '无变化', lockedTargetMessageId);
                }
                if (uiTemplateUpdateSeq === updateRun.seq) {
                    uiTemplateUpdateAbortController = null;
                }
                return failedTemplateCount < templates.length;
            } catch (e) {
                if (e?.name === 'AbortError') {
                    return false;
                }
                uiTemplateUpdateAbortController = null;
                console.warn('[UI模板] 未成功:', e.message);
                const failedCount = templates.length;
                const message = `${failedCount} 个失败`;
                failUiTemplateAnalysis(message, lockedTargetMessageId);
                return false;
            }
        };



        // 这些函数不再就地改共享数组：返回新列表，由调用方提交成功后再发布。
        // 删轮：覆盖该轮的记忆要么整块作废、要么拆到子层继续判断。
        // 只展开一层再整体过滤，在三级结构里会把子块连同它的孙一起抹掉。
        const removeClassicMemoriesForConversationTurn = async (snapshot, turn, source = classicMemories.value) => {
            if (!Number.isFinite(turn) || turn <= 0) return source;
            const turnInfo = snapshot.turns.find(item => item.turn === turn);
            const assistantIds = new Set(getClassicTurnSourceIds(turnInfo, 'assistant'));
            const hitsTurn = memory => (memory.sourceAssistantIds || []).some(id => assistantIds.has(id));
            const drop = memory => {
                if (isSecondaryClassicMemory(memory)) {
                    const range = getClassicMemoryTurnRange(memory);
                    if (!hitsTurn(memory) && (turn < range.start || turn > range.end)) return [memory];
                    const sources = getSecondaryClassicSourceMemories(memory);
                    if (!sources.length) return [];
                    return sources.flatMap(drop);
                }
                return hitsTurn(memory) || Number(memory.turn) === turn ? [] : [memory];
            };
            const kept = [];
            const list = (Array.isArray(source) ? source : []).flatMap(drop);
            // 大列表仍分段让出主线程，避免几千条时冻住界面。
            for (let i = 0; i < list.length; i++) {
                kept.push(list[i]);
                if (i > 0 && i % 512 === 0) await yieldToUi();
            }
            return kept;
        };

        // 返回重新绑定后的副本；不再改写传入对象（那些对象可能是已提交基线的克隆）。
        const syncMemoryConversationBindings = (snapshot, { backfill = false } = {}, source = classicMemories.value) => {
            const turns = snapshot.turns;
            const turnByMessageId = new Map();
            const sourcesByTurn = new Map();
            turns.forEach(turnInfo => {
                const userIds = getClassicTurnSourceIds(turnInfo, 'user');
                const assistantIds = getClassicTurnSourceIds(turnInfo, 'assistant');
                const messageIds = [...new Set([...userIds, ...assistantIds])];
                sourcesByTurn.set(Number(turnInfo.turn), { userIds, assistantIds });
                messageIds.forEach(id => turnByMessageId.set(id, Number(turnInfo.turn)));
            });

            const rebind = memory => {
                const next = { ...memory };
                if (Array.isArray(memory?.sourceMemories)) {
                    next.sourceMemories = memory.sourceMemories.map(rebind);
                }
                if (backfill && !(next.sourceUserIds || []).length && !(next.sourceAssistantIds || []).length) {
                    const sources = sourcesByTurn.get(Number(next.turn));
                    if (sources) {
                        next.sourceUserIds = [...sources.userIds];
                        next.sourceAssistantIds = [...sources.assistantIds];
                    }
                }
                const sourceIds = (next.sourceAssistantIds || []).length
                    ? next.sourceAssistantIds
                    : (next.sourceUserIds || []);
                const liveTurns = sourceIds.map(id => turnByMessageId.get(id)).filter(Number.isFinite);
                if (!liveTurns.length) return next;
                if (isSecondaryClassicMemory(next)) {
                    next.turnStart = Math.min(...liveTurns);
                    next.turnEnd = Math.max(...liveTurns);
                    next.turn = next.turnEnd;
                } else {
                    next.turn = liveTurns[0];
                }
                return next;
            };
            return source.map(rebind);
        };

        const playMessageActionFeedback = (event) => {
            const button = event?.currentTarget;
            if (!button) return;
            button.classList.remove('is-tapped');
            void button.offsetWidth;
            button.classList.add('is-tapped');
            setTimeout(() => {
                button.classList.remove('is-tapped');
                button.blur();
            }, 280);
        };

        const removeClassicMemoriesFromTurn = (firstRemovedTurn, source = classicMemories.value) =>
            trimClassicMemoriesToTurn(source, firstRemovedTurn - 1);

        const deleteMessage = (index) => {
            const targetMessage = chatHistory.value[index];
            if (!targetMessage || !canDeleteMessage(index)) return;
            const deletesUserTurn = targetMessage.role === 'user';
            const message = deletesUserTurn
                ? '确定要删除该轮次吗？该轮的相关项也将一并删除。'
                : '确定要删除这条 AI 消息吗？该轮的相关项也将一并删除。';
            confirmAction(message, async () => {
                abortConversationBackgroundWork();
                const snapshot = await ensureConversationMessageIds();
                const removedIndexes = new Set([index]);
                if (deletesUserTurn) {
                    for (let nextIndex = index + 1; nextIndex < chatHistory.value.length; nextIndex++) {
                        const role = chatHistory.value[nextIndex]?.role;
                        if (role === 'user') break;
                        if (role === 'assistant' || role === 'system') removedIndexes.add(nextIndex);
                    }
                }
                const affectedTurnInfo = snapshot.turns.find(turnInfo =>
                    turnInfo.sourceIndexes.some(sourceIndex => removedIndexes.has(sourceIndex))
                );
                const affectedTurn = affectedTurnInfo?.turn || null;
                const removedMessageIds = new Set([...removedIndexes]
                    .map(messageIndex => chatHistory.value[messageIndex]?.id)
                    .filter(Boolean));
                recentGenerationTimes.value = recentGenerationTimes.value.filter(t => !removedMessageIds.has(t.id || t));
                const nextHistory = chatHistory.value.filter((_, messageIndex) => !removedIndexes.has(messageIndex));
                const uiCleanup = pruneUiTemplateChangesFromTurn(affectedTurn);
                let committed;
                try {
                    const intent = await tryBeginMemoryIntent('删除对话轮次');
                    let nextMemories = intent ? syncMemoryConversationBindings(snapshot, { backfill: true }, intent.source) : [];
                    if (intent && affectedTurn) {
                        nextMemories = await removeClassicMemoriesForConversationTurn(snapshot, affectedTurn, nextMemories);
                    }
                    if (intent) {
                        nextMemories = restoreSecondaryClassicMemoriesForTurnCount(
                            buildConversationTurnSnapshot(nextHistory, { includeSystem: false }).turns.length,
                            nextMemories
                        );
                    }
                    committed = await commitConversationState({
                        storyScopeId: intent ? intent.scopeId : getCurrentStoryBranchScopeId(),
                        history: nextHistory,
                        intent,
                        memories: nextMemories,
                        saveTemplateRuntime: uiCleanup.logs > 0 || uiCleanup.blocks > 0
                    });
                } catch (error) {
                    console.error('Delete message commit failed:', error);
                    committed = { ok: false, error };
                }
                if (!committed.ok) { showToast(`删除失败：${committed.error?.message || '对话变更尚未完整保存，请重试'}`, 'error'); return; }
                chatHistory.value = nextHistory;
                await saveMemorySettingsNow();
                const deletedLabel = deletesUserTurn ? '该轮次' : 'AI 消息';
                showToast(`${deletedLabel}已删除，相关项已一并清除`, 'success');
            });
        };

        const regenerateMessage = async (index) => {
            if (isGenerating.value) return;

            const startTime = Date.now(); // Record click time
            const startRegenerationStatus = () => {
                isGenerating.value = true;
                isReceiving.value = false;
                isThinking.value = false;
                currentWaitTime.value = '0.0';
            };

            const msg = chatHistory.value[index];

            if (msg.role === 'user') {
                startRegenerationStatus();
                // 如果是用户消息，直接基于当前上下文生成（重试/继续）
                abortConversationBackgroundWork();
                // 只删除最新一轮的记忆，保留之前的
                const snapshot = await ensureConversationMessageIds();
                try {
                    const intent = await tryBeginMemoryIntent('重试轮次');
                    if (intent) {
                        const bound = syncMemoryConversationBindings(snapshot, { backfill: true }, intent.source);
                        const nextMemories = removeClassicMemoriesFromTurn(snapshot.turns.length, bound);
                        const result = await commitMemoryTransform(intent, () => nextMemories);
                        if (!result.published) {
                            showToast('记忆已写入原角色，但界面已切换，已停止重试', 'warning');
                            return;
                        }
                    }
                } catch (error) {
                    showToast(`记忆更新失败：${error?.message || error}，已停止重试`, 'error');
                    return;
                }
                await saveMemorySettingsNow();
                await generateResponse(startTime, { reuseGeneratingState: true });
            } else {
                // 如果是 AI 消息，删除它（及之后）然后重新生成
                confirmAction('确定要重新生成这条消息吗？该楼层的记忆将被清除。', async () => {
                    startRegenerationStatus();
                abortConversationBackgroundWork();
                    // 计算被删除区间的 assistant 轮次，只删除 >= 该轮次的记忆
                    const snapshot = await ensureConversationMessageIds();
                    const turnAtIndex = getConversationTurnAtIndexFromSnapshot(snapshot, index);
                    const uiTurnAtIndex = turnAtIndex;
                    const uiCleanup = pruneUiTemplateChangesFromTurn(uiTurnAtIndex);
                    // Remove timing record for the message being regenerated
                    if (msg.id) {
                        recentGenerationTimes.value = recentGenerationTimes.value.filter(t => (t.id || t) !== msg.id);
                    }
                    const nextHistory = chatHistory.value.slice(0, index);
                    let committed;
                    try {
                        const intent = await tryBeginMemoryIntent('重新生成消息');
                        let nextMemories = intent ? intent.source : [];
                        if (intent) {
                            const bound = syncMemoryConversationBindings(snapshot, { backfill: true }, nextMemories);
                            nextMemories = removeClassicMemoriesFromTurn(turnAtIndex, bound);
                            nextMemories = syncMemoryConversationBindings(buildConversationTurnSnapshot(nextHistory), {}, nextMemories);
                        }
                        committed = await commitConversationState({
                            storyScopeId: intent ? intent.scopeId : getCurrentStoryBranchScopeId(),
                            history: nextHistory,
                            intent,
                            memories: nextMemories,
                            saveTemplateRuntime: uiCleanup.logs > 0 || uiCleanup.blocks > 0
                        });
                    } catch (error) {
                        console.error('Regenerate commit failed:', error);
                        committed = { ok: false, error };
                    }
                    if (!committed.ok) { showToast('对话变更尚未完整保存，已停止后续操作', 'error'); return; }
                    chatHistory.value = nextHistory;
                    removeOrphanedUiTemplateCorrections();
                    await saveMemorySettingsNow();
                    await generateResponse(startTime, { reuseGeneratingState: true });
                });
            }
        };

        const getEnabledActiveTools = () => normalizeActiveTools()
            .filter(tool => tool.enabled !== false);

        const isWebActiveTool = (tool) => tool?.type === ACTIVE_TOOL_WEB_TYPE;

        const getActiveToolDisplayDescription = (tool) => tool?.displayDescription || '暂无说明';

        const appendActiveToolReminderToLatestUserMessage = (msgArray) => {
            if (getEnabledActiveTools().length === 0) return msgArray;
            const reminder = getActiveToolLatestUserReminder();
            const latestUserMessage = [...msgArray].reverse().find(message => {
                const content = String(message?.content || '');
                return message?.role === 'user'
                    && content.trim()
                    && !isRoleMemoryContextContent(content);
            });
            if (!latestUserMessage) return msgArray;

            const currentContent = String(latestUserMessage.content || '').trimEnd();
            if (!currentContent.includes(reminder)) {
                latestUserMessage.content = currentContent
                    ? `${currentContent}\n${reminder}`
                    : reminder;
            }
            return msgArray;
        };

        const buildActiveToolDefinitions = (tools) => tools.map(tool => ({
            type: 'function',
            function: {
                name: tool.callName,
                description: tool.resultCount ? `${tool.description} 每次最多返回 ${tool.resultCount} 条。` : tool.description,
                parameters: tool.type === ACTIVE_TOOL_RANDOM_TYPE ? {
                    type: 'object',
                    properties: {
                        min: { type: 'integer', minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER, description: '随机整数的下限，包含该值。' },
                        max: { type: 'integer', minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER, description: '随机整数的上限，包含该值，不小于 min。' },
                        choices: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1, description: '自定义候选名称，从中等概率抽取一项；与 min、max 二选一，不可同时传入。' },
                        reason: { type: 'string', description: '可选，一句话说明随机判定的用途。' }
                    },
                    additionalProperties: false
                } : {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: isWebActiveTool(tool) ? '具体搜索词，或需要读取的真实网页 URL。' : '前文原文中可能出现的关键词。' },
                        reason: { type: 'string', description: '可选，一句话说明检索用途。' }
                    },
                    required: ['query'],
                    additionalProperties: false
                }
            }
        }));

        const buildActiveToolSystemPrompt = (tools) => {
            if (tools.length === 0) return '';
            return BUILTIN_PROMPTS.buildActiveToolSystemPrompt({
                tools,
                reminder: getActiveToolLatestUserReminder(),
                aggressivenessLabel: getActiveToolAggressivenessLabel(),
                maxRounds: ACTIVE_TOOL_MAX_AUTO_CONTINUE
            });
        };
        const usesThinkingCotTag = (model) => /(?:deepseek|glm|kimi)/i.test(String(model || ''));
        const getMessageThinkingText = (message, includeNativeReasoning = true) => {
            const parts = includeNativeReasoning ? [String(message?.reasoning || '').trim()] : [];
            parts.push(parseCot(message?.content || '').rawCot);
            return [...new Set(parts)].filter(Boolean).join('\n\n');
        };
        const wrapAnalysis = (tag, text) => text
            ? `<${tag}>\n${text.replace(/<\s*\/?\s*(?:thinking|think|cot)\s*>/gi, '')}\n</${tag}>\n`
            : '';
        const appendNextResponsePrompt = (messageList, { cotEnabled = false, useThinkingTag = false, writingStylePrompt = '' } = {}) => {
            const target = [...messageList].reverse().find(message => (
                message?.role === 'user'
                && Array.isArray(message._sourceIndexes)
                && message._sourceIndexes.length > 0
            ));
            if (!target) return;

            const prompt = BUILTIN_PROMPTS.buildNextResponsePrompt({
                autoImageGenEnabled: isAutoImageGenEnabled.value,
                cotEnabled,
                imageGenCount: settings.imageGenCount,
                memoryEnabled: memorySettings.enabled,
                useThinkingTag,
                writingStylePrompt,
                storyPanelsEnabled: isStoryPanelsEnabled.value,
                uiTemplateEnabled: isUiTemplateAnalysisEnabled()
            });
            const replyToolReminder = isTruncationEnabled.value
                ? `(${BUILTIN_PROMPTS.replyToolInstruction.replace(/。$/, '')})` : '';
            target.content = `${String(target.content || '').trimEnd()}${replyToolReminder}\n\n${prompt}`;
        };
        const generateResponse = async (startTime = null, options = {}) => {
            const reuseGeneratingState = options.reuseGeneratingState === true;
            if (isGenerating.value && !reuseGeneratingState) return;
            const activeToolDepth = Number(options.activeToolDepth) || 0;
            const continueAssistantMessageId = options.continueAssistantMessageId || null;
            const continuationToolCallId = options.continuationToolCallId || null;
            const requestModel = settings.model;
            const obfuscateInput = /gemini/i.test(String(requestModel || '')) && settings.inputObfuscation === true;
            const latestUserMessage = [...chatHistory.value].reverse().find(message => message?.role === 'user');
            const latestUserIndex = chatHistory.value.indexOf(latestUserMessage);
            const requestTools = activeToolDepth < ACTIVE_TOOL_MAX_AUTO_CONTINUE ? getEnabledActiveTools() : [];

            if (!currentCharacter.value) {
                showToast('请先选择一个角色', 'error');
                return;
            }

            const continuationTargetMessage = continueAssistantMessageId
                ? chatHistory.value.find(msg => msg && msg.role === 'assistant' && msg.id === continueAssistantMessageId) || null
                : null;
            if (!continuationTargetMessage && activeToolDepth === 0) {
                resetActiveToolResultContext();
            }

            isGenerating.value = true;
            // 工具续写时内容会回填到旧气泡里，这里先占住“已在接收”的状态，
            // 避免底部全局 typing 占位气泡冒出来。
            isReceiving.value = !!continuationTargetMessage;
            isThinking.value = false;
            const isToolContinuation = !!(continuationTargetMessage && continuationToolCallId);
            activeToolContinuationMessageId.value = isToolContinuation ? continuationTargetMessage.id : null;
            activeToolContinuationToolCallId.value = isToolContinuation ? continuationToolCallId : null;
            activeToolContinuationHasResponse.value = false;
            abortController.value = new AbortController();
            window.RPHubChatAbortRequested = false;
            let generationStartTime = startTime || Date.now();

            // Start Timer
            const startTimer = () => {
                if (waitTimer) clearInterval(waitTimer);
                currentWaitTime.value = '0.0';
                waitTimer = setInterval(() => {
                    const now = Date.now();
                    currentWaitTime.value = ((now - generationStartTime) / 1000).toFixed(1);
                }, 100);
            };
            startTimer(); // Start timer immediately upon request initiation
            // 组装上下文是一段较长的同步计算，先让刚发出的气泡和等待动画画到屏幕上。
            await yieldToUi();


            // --- Advanced World Info Processing ---

            // 中途检索的 assistant 已由原生调用消息携带，不能再作为普通聊天重复注入。
            const postprocessedChatHistory = getPostprocessedChatMessages(chatHistory.value.map(message => (
                message === continuationTargetMessage ? null : message
            )), { includeSystem: false });
            const {
                entries: budgetedEntries,
                groups: wiGroups,
                triggerMap: triggeredEntries
            } = resolveWorldInfoEntries(worldInfo.value, postprocessedChatHistory, worldInfoSettings);

            // Construct Prompt Parts
            const enabledPresets = presets.value
                .map(normalizePreset)
                .filter(p => isPresetEnabled(p) && p.content.trim());
            const writingStylePresets = enabledPresets.filter(p => p.name === BUILTIN_PRESETS.writingStyle.name);
            const cotPresets = enabledPresets.filter(p => p.name === 'COT');
            const systemPresets = enabledPresets.filter(p => p.name !== 'COT'
                && (p.role === 'system' || p.name === BUILTIN_PRESETS.writingStyle.name));
            const messagePresets = enabledPresets.filter(p => p.name !== 'COT'
                && p.name !== BUILTIN_PRESETS.writingStyle.name
                && (p.role === 'user' || p.role === 'assistant'));
            const systemPresetPrompt = systemPresets
                .filter(p => p.name === '破限')
                .map(p => p.content)
                .join('\n\n');
            const otherPresets = systemPresets.filter(p => p.name !== '破限');

            const charPrompt = getCurrentCharacterPrompt();
            const mesExample = currentCharacter.value.mes_example;

            let userPrompt = buildUserInfoPrompt();

            // Helper to join content with comments
            const joinContent = (entries) => entries.map(e => `[${e.comment || 'Entry'}]\n${e.content}`).join('\n\n');
            // Build System Prompt
            let systemPromptParts = [];

            // 1. Presets (只有设定环境的破限预设保留在 system 中)
            if (systemPresetPrompt) systemPromptParts.push(systemPresetPrompt);

            // 2. System Top WI
            if (wiGroups.system_top.length > 0) systemPromptParts.push(joinContent(wiGroups.system_top));

            // 3. Global Notes
            if (wiGroups.global_note.length > 0) systemPromptParts.push(joinContent(wiGroups.global_note));

            // 4. Other Presets (辅助约束 - 提前于角色设定)
            if (otherPresets.length > 0) {
                systemPromptParts.push(`[System Presets]\n${otherPresets.map(p => p.content).join('\n\n---\n\n')}`);
            }

            // 5. Character pre-dialogue context (user side)
            const characterPreludeParts = [];
            if (wiGroups.before_char.length > 0) {
                characterPreludeParts.push(joinContent(wiGroups.before_char));
            }
            let charDefinitionParts = [`[Character]`, charPrompt];
            if (mesExample && mesExample.trim()) {
                charDefinitionParts.push(mesExample);
            }
            characterPreludeParts.push(charDefinitionParts.join('\n\n'));
            if (wiGroups.after_char.length > 0) {
                characterPreludeParts.push(joinContent(wiGroups.after_char));
            }
            const characterPreludePrompt = characterPreludeParts.join('\n\n');

            // 6. User Info (Moved to end)
            systemPromptParts.push(userPrompt);

            // 7. 记忆引用：正文承接某条总结记忆时在句末标注编号，界面据此展示判断依据。
            // 聊天还没超过保留楼层时上下文里没有总结记忆，不发送引用要求。
            const memoryCitationEnabled = memorySettings.enabled && classicMemories.value.length > 0
                && postprocessedChatHistory.length > memorySettings.summaryKeepFloors;
            if (memoryCitationEnabled) systemPromptParts.push(BUILTIN_PROMPTS.memoryCitationInstruction);

            const activeToolPrompt = buildActiveToolSystemPrompt(requestTools);
            if (activeToolPrompt) systemPromptParts.push(activeToolPrompt);
            else if (activeToolDepth > 0) systemPromptParts.push('本轮工具调用已结束，请依据已有结果完成回复，不再调用工具；无法确认的信息明确说明。');

            const uiTemplateContextPrompt = buildUiTemplateContextSystemPrompt();
            if (uiTemplateContextPrompt) systemPromptParts.push(uiTemplateContextPrompt);

            const mainModelUiTemplatePrompt = buildMainModelUiTemplateUpdatePrompt();
            if (mainModelUiTemplatePrompt) systemPromptParts.push(mainModelUiTemplatePrompt);

            if (cotPresets.length > 0) {
                const cotContent = cotPresets.map(p => p.content).join('\n\n---\n\n');
                systemPromptParts.push(memoryCitationEnabled ? cotContent : cotContent.replace(`${BUILTIN_PROMPTS.memoryCitationCotLine}\n`, ''));
            }

            const systemPrompt = systemPromptParts.join('\n\n');
            const systemWorldInfo = [
                ...wiGroups.system_top,
                ...wiGroups.global_note
            ];

            // Base Messages
            let messages = [
                {
                    role: 'system',
                    content: systemPrompt,
                    _worldInfoEntries: systemWorldInfo
                }
            ];

            let safeTargetLimit = 1;
            messagePresets.forEach(preset => {
                messages.push({
                    role: preset.role,
                    content: preset.content
                });
            });
            safeTargetLimit += messagePresets.length;

            if (characterPreludePrompt) {
                messages.push({
                    role: 'user',
                    content: characterPreludePrompt,
                    _worldInfoEntries: [
                        ...wiGroups.before_char,
                        ...wiGroups.after_char
                    ]
                });
                safeTargetLimit += 1;
            }

            // 确保开场白存在 (Double check for First Message)
            // 如果聊天记录为空，或者第一条不是开场白，且角色有开场白，则手动添加
            // 注意：通常 chatHistory 会包含开场白，这里是为了响应用户反馈的强制保险
            const hasFirstMesInHistory = chatHistory.value.length > 0 &&
                chatHistory.value[0].role === 'assistant' &&
                chatHistory.value[0].content === currentCharacter.value.first_mes;

            const useThinkingTag = usesThinkingCotTag(requestModel);
            const retainedThinkingTag = useThinkingTag ? 'thinking' : 'cot';
            const openingText = String(currentCharacter.value.first_mes || '').trim();
            const openingSourceMessage = openingText
                ? chatHistory.value.find(source => source?.role === 'assistant'
                    && parseCot(source.content || '').main.trim() === openingText)
                : null;
            const openingThinking = cotPresets.length > 0
                ? wrapAnalysis(retainedThinkingTag, BUILTIN_PROMPTS.buildOpeningAnalysisContent({
                    memoryEnabled: memorySettings.enabled,
                    uiTemplateEnabled: isUiTemplateAnalysisEnabled(),
                    characterName: currentCharacter.value.name
                }))
                : '';

            if (!hasFirstMesInHistory && currentCharacter.value.first_mes) {
                messages.push({
                    role: 'assistant',
                    name: currentCharacter.value.name,
                    content: `${openingThinking}${currentCharacter.value.first_mes}`
                });
            }

            // 记忆压缩：一次总结替换旧 AI 消息；二次总结合并每五轮中有效的记忆。
            const recentThinkingByMessage = new Map();
            if (cotPresets.length > 0) {
                for (let index = chatHistory.value.length - 1; index >= 0 && recentThinkingByMessage.size < 2; index--) {
                    const source = chatHistory.value[index];
                    if (source?.role !== 'assistant' || source === openingSourceMessage || source === continuationTargetMessage) continue;
                    const thinking = getMessageThinkingText(source, useThinkingTag);
                    if (thinking) recentThinkingByMessage.set(source, thinking);
                }
            }
            let chatHistoryForContext = postprocessedChatHistory.map((message, index) => ({
                ...message,
                _contextFloor: index + 1
            }));
            const suppressedUiTemplateCorrectionIndexes = new Set();

            if (memorySettings.enabled
                && classicMemories.value.length > 0) {
                const candidateCount = Math.max(0, chatHistoryForContext.length - memorySettings.summaryKeepFloors);
                if (candidateCount > 0) {
                    const lookup = buildClassicMemoryLookup();
                    const contextSnapshot = buildConversationTurnSnapshot(chatHistoryForContext, { alreadyPostprocessed: true });
                    const secondaryGroups = new Map();
                    contextSnapshot.turns.forEach(turnInfo => {
                        const assistantIndex = turnInfo.messageIndexes[1];
                        if (assistantIndex >= candidateCount) return;
                        const secondaryMemory = findSecondaryClassicMemoryForTurn(turnInfo, lookup);
                        if (secondaryMemory) {
                            if (!secondaryGroups.has(secondaryMemory.id)) {
                                secondaryGroups.set(secondaryMemory.id, { memory: secondaryMemory, turns: [] });
                            }
                            secondaryGroups.get(secondaryMemory.id).turns.push(turnInfo);
                        }
                    });

                    const secondaryTurnSet = new Set();
                    const removableIndices = new Set();
                    secondaryGroups.forEach(({ memory, turns }) => {
                        const orderedTurns = [...turns].sort((a, b) => a.turn - b.turn);
                        const retainedIndexes = orderedTurns[orderedTurns.length - 1]?.messageIndexes || [];
                        const retainedUserIndex = retainedIndexes[0];
                        const retainedAssistantIndex = retainedIndexes[1];
                        if (!Number.isFinite(retainedUserIndex) || !Number.isFinite(retainedAssistantIndex)) return;
                        orderedTurns.forEach(turnInfo => {
                            secondaryTurnSet.add(turnInfo.turn);
                            turnInfo.messageIndexes.forEach(messageIndex => {
                                if (messageIndex !== retainedUserIndex && messageIndex !== retainedAssistantIndex) {
                                    removableIndices.add(messageIndex);
                                }
                            });
                        });
                        chatHistoryForContext[retainedUserIndex] = {
                            ...chatHistoryForContext[retainedUserIndex],
                            content: getClassicSecondaryMemoryMarker(memory),
                            _sourceIndexes: [],
                            _preventContextMerge: true,
                            _classicMemory: true,
                            _suppressUiTemplateCorrection: true
                        };
                        chatHistoryForContext[retainedAssistantIndex] = {
                            ...chatHistoryForContext[retainedAssistantIndex],
                            content: memory.summary,
                            _memoryNo: memory.no,
                            _classicMemory: true,
                            _sourceIndexes: []
                        };
                    });

                    contextSnapshot.turns.forEach(turnInfo => {
                        if (secondaryTurnSet.has(turnInfo.turn)) return;
                        const assistantIndex = turnInfo.messageIndexes[1];
                        if (assistantIndex >= candidateCount) return;
                        const memory = findClassicMemoryForTurn(turnInfo, lookup);
                        if (!memory?.summary) return;
                        suppressedUiTemplateCorrectionIndexes.add(turnInfo.messageIndexes[0]);
                        chatHistoryForContext[turnInfo.messageIndexes[0]] = {
                            ...chatHistoryForContext[turnInfo.messageIndexes[0]],
                            _suppressUiTemplateCorrection: true
                        };
                        chatHistoryForContext[assistantIndex] = {
                            ...chatHistoryForContext[assistantIndex],
                            content: memory.summary,
                            _memoryNo: memory.no,
                            _classicMemory: true,
                            _sourceIndexes: []
                        };
                    });
                    if (removableIndices.size > 0) {
                        chatHistoryForContext = chatHistoryForContext.filter((_, index) => !removableIndices.has(index));
                    }
                }
            }

            // 添加聊天记录
            messages = messages.concat(chatHistoryForContext
                .map((m, messageIndex) => {
                    const sourceIndexes = Array.isArray(m._sourceIndexes) ? m._sourceIndexes : [];
                    const suppressUiTemplateCorrection = m._suppressUiTemplateCorrection === true
                        || suppressedUiTemplateCorrectionIndexes.has(messageIndex);
                    const sourceMessages = sourceIndexes.length > 0
                        ? sourceIndexes.map(sourceIndex => chatHistory.value[sourceIndex]).filter(source => source && source.role === m.role)
                        : [m];
                    const cleanSourceContent = (source) => {
                        // Remove internal thinking/COT from history before sending, then restore only the retained recent blocks.
                        const parsedData = parseCot(source.content || '');
                        let content = stripUiTemplateContextInjection(parsedData.main);
                        if (!settings.uiTemplateEnabled || !settings.uiTemplateMainModelAnalysis) content = stripUiTemplateUpdateBlock(content);
                        content = stripMemoryCitations(stripDisabledImageGenContext(stripNextResponsePrompt(content)));
                        const recentThinking = source.role === 'assistant' ? recentThinkingByMessage.get(source) : '';
                        if (recentThinking) content = `${wrapAnalysis(retainedThinkingTag, recentThinking)}${content}`;
                        if (source === openingSourceMessage && openingThinking) content = `${openingThinking}${content}`;
                        if (source.role === 'user') content = appendMessageImageDescriptions(source, content);
                        if (settings.uiTemplateEnabled
                            && settings.uiTemplateMainModelAnalysis
                            && source.role === 'user'
                            && !suppressUiTemplateCorrection
                            && source.uiTemplateCorrection) {
                            content = `${BUILTIN_PROMPTS.buildMainModelUiTemplateCorrectionPrompt({
                                failureSummary: source.uiTemplateCorrection.summary,
                                failureReason: source.uiTemplateCorrection.reason
                            })}\n\n${content.trimStart()}`;
                        }
                        return content.trim();
                    };
                    const cleanContent = sourceMessages
                        .map(cleanSourceContent)
                        .filter(Boolean)
                        .join('\n\n');

                    return {
                        role: m.role === 'user' ? 'user' : 'assistant',
                        name: m.name || (m.role === 'user' ? user.name : currentCharacter.value.name),
                        // 总结前带上编号（清理引用标记之后再加），召回片段用同一编号，模型才能在正文里引用。
                        content: Number.isInteger(m._memoryNo) ? `[M${m._memoryNo}]\n${cleanContent}` : cleanContent,
                        _sourceIndexes: sourceIndexes,
                        _contextFloor: m._contextFloor,
                        _preventContextMerge: m._preventContextMerge === true,
                        // 被记忆替换的楼层（总结和合并标记），查看器把它们算作记忆而不是原文。
                        _classicMemory: m._classicMemory === true
                    };
                })
                .filter(m => String(m.content || '').trim())
            );
            appendPendingUiTemplateCorrection(messages);
            appendNextResponsePrompt(messages, {
                cotEnabled: cotPresets.length > 0,
                useThinkingTag,
                writingStylePrompt: writingStylePresets
                    .map(preset => preset.content
                        .replace(/^\s*<writing_style>\s*/i, '')
                        .replace(/\s*<\/writing_style>\s*$/i, ''))
                .concat(/deepseek/i.test(requestModel) ? '正文最少700字。' : [])
                    .join('\n\n')
            });

            // 世界书与其他提示处理完成后，再把召回附在最新用户消息末尾。
            messages = injectContextMessages({
                messages,
                worldInfoGroups: wiGroups,
                safeTargetLimit
            });
            if (activeToolDepth === 0) messages = appendActiveToolReminderToLatestUserMessage(messages);
            messages = postprocessContextMessages(messages).map((message, index, array) => ({
                ...message,
                content: processRegex(message.content || '', {
                    isPrompt: true,
                    role: message.role,
                    depth: array.length - 1 - index
                })
            }));

            let generatedAssistantMessageId = null;
            let assistantMessage = null;
            let continuingAssistantMessage = continuationTargetMessage;
            let continuationToolCall = null;
            let continuationContentStarted = false;
            let continuationReasoningStarted = false;
            let generationFailed = false;
            let wasCancelled = false;
            let toolResponse = null;
            const requestToolUis = new Map();
            const requestSignal = abortController.value.signal;

            if (continuingAssistantMessage && continuationToolCallId && Array.isArray(continuingAssistantMessage.toolCalls)) {
                continuationToolCall = continuingAssistantMessage.toolCalls.find(call => call && call.id === continuationToolCallId) || null;
                if (continuationToolCall && typeof continuationToolCall.reasoning !== 'string') continuationToolCall.reasoning = '';
            }

            const prepareAssistantMessageForAppend = (message) => {
                delete message.responseError;
                if (!message.id) message.id = generateUUID();
                if (typeof message.content !== 'string') message.content = '';
                if (typeof message.reasoning !== 'string') message.reasoning = '';
                if (message.isCotOpen === undefined) message.isCotOpen = false;
                if (message.isReasoningOpen === undefined) message.isReasoningOpen = true;
                if (message.isReasoningUserToggled === undefined) message.isReasoningUserToggled = false;
                if (message.isReasoningAutoCollapsed === undefined) message.isReasoningAutoCollapsed = false;
                message.shouldAnimate = !continuingAssistantMessage;
                return message;
            };

            const appendAssistantText = (message, field, text) => {
                const isContinuation = continuingAssistantMessage && message.id === continuingAssistantMessage.id;
                const startedKey = field === 'reasoning' ? 'continuationReasoningStarted' : 'continuationContentStarted';
                const hasStarted = field === 'reasoning' ? continuationReasoningStarted : continuationContentStarted;

                const existing = String(message[field] || '');
                const appendValue = isContinuation && field === 'content' && !hasStarted
                    ? String(text).replace(/^\s+/, '')
                    : text;
                if (!appendValue) return;

                if (isContinuation && !hasStarted && existing.trim()) {
                    message[field] = existing.replace(/\s+$/, '') + '\n\n' + appendValue;
                } else {
                    message[field] = existing + appendValue;
                }

                if (isContinuation && !hasStarted) {
                    if (startedKey === 'continuationReasoningStarted') continuationReasoningStarted = true;
                    else continuationContentStarted = true;
                }
                if (isContinuation) activeToolContinuationHasResponse.value = true;
            };

            const createAssistantMessage = (content = '', reasoning = '') => reactive({
                role: 'assistant',
                name: currentCharacter.value.name,
                content: content || '',
                reasoning: reasoning || '',
                id: generateUUID(),
                shouldAnimate: true,
                isCotOpen: false,
                isReasoningOpen: true,
                isReasoningUserToggled: false,
                isReasoningAutoCollapsed: false
            });

            const ensureAssistantMessage = (content = '', reasoning = '') => {
                if (assistantMessage) return assistantMessage;
                if (continuingAssistantMessage) {
                    assistantMessage = prepareAssistantMessageForAppend(continuingAssistantMessage);
                    if (reasoning) appendAssistantText(assistantMessage, 'reasoning', reasoning);
                    if (content) appendAssistantText(assistantMessage, 'content', content);
                    isReceiving.value = true;
                    return assistantMessage;
                }

                assistantMessage = createAssistantMessage(content, reasoning);
                chatHistory.value.push(assistantMessage);
                isReceiving.value = true;
                return assistantMessage;
            };

            try {
                // 召回与主请求共用取消处理，避免停止时遗漏状态和计时器的清理。
                if (memorySettings.enabled && memorySettings.mode === MEMORY_MODE_ENHANCED) {
                    const recalled = await selectEnhancedMemories(requestSignal);
                    messages = appendEnhancedMemoryRecall(messages, recalled);
                }
                if (requestSignal.aborted) throw createAbortReason();

                // 最后再搬移整条用户消息，连同世界书、召回和本轮附加要求一起交给工具。
                const inputIndex = obfuscateInput ? messages.findIndex(message => message.role === 'user'
                    && message._sourceIndexes?.includes(latestUserIndex)
                    && getMessageImages(message).length === 0) : -1;
                if (inputIndex >= 0) {
                    const inputMessage = messages[inputIndex];
                    const [inputCall, inputResult] = buildUserInputToolMessages(inputMessage.content, `call_${generateUUID()}`);
                    inputMessage.content = '读取 read_user_input 的返回内容，作为本轮用户输入继续回复。'
                        + (isTruncationEnabled.value ? `(${BUILTIN_PROMPTS.replyToolInstruction.replace(/。$/, '')})` : '');
                    for (const key of ['_worldInfoEntries', '_enhancedMemoryRecallCount']) {
                        inputResult[key] = inputMessage[key];
                        delete inputMessage[key];
                    }
                    messages.splice(inputIndex + 1, 0, inputCall, inputResult);
                }

                // 必须在正则、角色合并和记忆处理之后追加，保留 tool_call_id 及服务端签名。
                messages.push(...activeToolMessages);
                // 上下文查看器的数据只给弹窗用，长对话里整理一次要上百毫秒，等请求发出后再做。
                const contextViewerInput = { messages, budgetedEntries, triggeredEntries, postprocessedChatHistory, worldInfoSettings };
                const inputPrompt = inputIndex >= 0 ? messages[inputIndex].content : '';
                const apiMessages = messages.map(({ role, name, content, _sourceIndexes, tool_calls, tool_call_id, reasoning_content, reasoning, reasoning_details, extra_content }) => ({
                    role,
                    name,
                    content: buildChatMessageContent({ role, _sourceIndexes }, content),
                    ...(tool_calls ? { tool_calls } : {}),
                    ...(tool_call_id ? { tool_call_id } : {}),
                    ...(reasoning_content ? { reasoning_content } : {}),
                    ...(reasoning ? { reasoning } : {}),
                    ...(reasoning_details ? { reasoning_details } : {}),
                    ...(extra_content ? { extra_content } : {})
                }));
                const prepareRequest = () => {
                    if (inputIndex >= 0) {
                        // UUID 转成零宽字符，每次实际请求（含自动重试）生成新的前缀。
                        const alphabet = '\u200B\u200C\u200D\u2060';
                        const prefix = [...generateUUID().replace(/-/g, '')].map(char => {
                            const value = parseInt(char, 16);
                            return alphabet[value >> 2] + alphabet[value & 3];
                        }).join('');
                        messages[inputIndex].content = apiMessages[inputIndex].content = prefix + inputPrompt;
                    }
                    setTimeout(() => {
                        const contextViewerState = buildContextViewerState(contextViewerInput);
                        lastContextMessages.value = contextViewerState.contextMessages;
                        lastTriggeredWorldInfos.value = contextViewerState.triggeredWorldInfos;
                    }, 0);
                };
                const responseResult = await requestTrackedChatCompletion({
                    model: requestModel,
                    messages: apiMessages,
                    onBeforeRequest: prepareRequest,
                    logResponse: true,
                    replyInTool: isTruncationEnabled.value,
                    tools: buildActiveToolDefinitions(requestTools),
                    requireTool: activeToolDepth === 0 && requestTools.length > 0 && getActiveToolAggressiveness() === 'force',
                    temperature: settings.temperature,
                    reasoningEffort: settings.reasoningEffort,
                    stream: settings.stream,
                    signal: requestSignal,
                    onDelta: async ({ content: rawContent, reasoning, toolCalls }) => {
                        const content = (!assistantMessage && !String(rawContent).trim()) ? '' : rawContent;
                        if (!content && !reasoning && !toolCalls?.length) return;

                        let seededContent = false;
                        let seededReasoning = false;
                        if (!assistantMessage) {
                            assistantMessage = ensureAssistantMessage(content, reasoning);
                            seededContent = !!content;
                            seededReasoning = !!reasoning;
                            if (seededReasoning) {
                                isThinking.value = true;
                            }
                            if (seededContent && !reasoning) {
                                isThinking.value = false;
                                collapseNativeReasoning(assistantMessage);
                            }
                            await nextTick();
                        }
                        if (reasoning && !seededReasoning) {
                            // 原生思考中的文字标签不能改变 API 已指定的通道。
                            appendAssistantText(assistantMessage, 'reasoning', reasoning);
                            isThinking.value = true;
                        }
                        if (content && !seededContent) {
                            appendAssistantText(assistantMessage, 'content', content);
                            isThinking.value = false;
                            collapseNativeReasoning(assistantMessage);
                        }
                        if (toolCalls?.length) syncNativeActiveToolUis(assistantMessage, toolCalls, requestToolUis, requestTools);
                    }
                }, activeToolDepth > 0 ? 'tool_continuation' : 'chat');
                if (requestSignal.aborted) throw createAbortReason();
                if (activeToolDepth > 0 && !responseResult.toolCalls.length && !responseResult.content.trim()) {
                    throw new Error('工具调用完成，但 API 未返回正文，请重新尝试。');
                }
                if (!responseResult.isStream) {
                    const { content, reasoning } = responseResult;
                    isThinking.value = !!(reasoning && !content);
                    if (content || reasoning) {
                        assistantMessage = ensureAssistantMessage(content, reasoning);
                        const hasReasoning = !!String(assistantMessage.reasoning || '').trim();
                        const hasContent = !!String(assistantMessage.content || '').trim();
                        isThinking.value = hasReasoning && !hasContent;
                        const hasReasoningAndContent = hasReasoning && hasContent;
                        if (!continuingAssistantMessage) {
                            assistantMessage.isReasoningOpen = !hasReasoningAndContent;
                            assistantMessage.isReasoningAutoCollapsed = hasReasoningAndContent;
                        } else if (hasReasoningAndContent) {
                            collapseNativeReasoning(assistantMessage);
                        }
                    }
                }
                if (responseResult.toolCalls.length) {
                    assistantMessage = ensureAssistantMessage();
                    syncNativeActiveToolUis(assistantMessage, responseResult.toolCalls, requestToolUis, requestTools, true);
                    toolResponse = responseResult;
                    activeToolHandoffPending.value = true;
                }
                const duration = Date.now() - generationStartTime;

                if (assistantMessage) {
                    generatedAssistantMessageId = assistantMessage.id;
                    if (!toolResponse && settings.uiTemplateEnabled && settings.uiTemplateMainModelAnalysis) {
                        applyMainModelUiTemplateUpdates(assistantMessage, requestModel);
                    }

                    recentGenerationTimes.value.push({ id: assistantMessage.id, duration });
                    if (recentGenerationTimes.value.length > 5) recentGenerationTimes.value.shift();
                }
            } catch (error) {
                generationFailed = true;
                for (const toolUi of requestToolUis.values()) {
                    toolUi.status = 'error';
                    toolUi.error = error.name === 'AbortError' ? '生成已中止' : (error.message || '工具调用未完整返回');
                }
                const cancelled = error.name === 'AbortError';
                const errorMessage = cancelled ? '生成已中止' : (error.message || '生成失败');
                const targetMessage = assistantMessage || continuingAssistantMessage;
                if (cancelled) {
                    wasCancelled = true;
                    showToast('生成已中止', 'info');
                    isGenerating.value = false;
                    isThinking.value = false;
                }
                if (targetMessage) {
                    appendAssistantResponseError(targetMessage, errorMessage);
                    if (continuingAssistantMessage) activeToolContinuationHasResponse.value = true;
                } else {
                    chatHistory.value.push({ role: 'system', name: currentCharacter.value.name, content: errorMessage, skipReveal: true, shouldAnimate: true });
                }
            } finally {
                if (assistantMessage?.content) {
                    const styleFilterHits = [];
                    assistantMessage.content = filterBlockedStyleText(assistantMessage.content, {
                        log: true,
                        collect: styleFilterHits
                    });
                    const previousHits = continuingAssistantMessage && Array.isArray(assistantMessage.styleFilterHits)
                        ? assistantMessage.styleFilterHits
                        : [];
                    const combinedHits = [...previousHits, ...styleFilterHits]
                        .map(normalizeStyleFilterHit)
                        .filter(Boolean);
                    if (combinedHits.length) assistantMessage.styleFilterHits = combinedHits;
                    else delete assistantMessage.styleFilterHits;
                }
                if (continuationToolCall && continuationToolCall.status === 'continuing') {
                    continuationToolCall.status = 'done';
                }
                collapseActiveNativeReasoning();
                await saveChatHistoryNow();
                isThinking.value = false;
                isGenerating.value = false;
                isReceiving.value = false;
                if (!continueAssistantMessageId || activeToolContinuationMessageId.value === continueAssistantMessageId) {
                    activeToolContinuationMessageId.value = null;
                    activeToolContinuationToolCallId.value = null;
                    activeToolContinuationHasResponse.value = false;
                }
                abortController.value = null;
                if (waitTimer) {
                    clearInterval(waitTimer);
                    waitTimer = null;
                }

                wasCancelled ||= requestSignal.aborted;
                const activeToolContinued = !wasCancelled && !generationFailed && toolResponse
                    ? await handleActiveToolCallFromAssistant(assistantMessage, toolResponse, requestToolUis, requestTools, activeToolDepth)
                    : false;
                if (!activeToolContinued) {
                    resetActiveToolResultContext();
                    activeToolHandoffPending.value = false;
                }
                const needsPostGenerationTurns = !wasCancelled && !generationFailed
                    && !toolResponse
                    && ((settings.uiTemplateEnabled && generatedAssistantMessageId)
                        || memorySettings.enabled);
                const hasCompletedTurns = !activeToolContinued && needsPostGenerationTurns && buildConversationTurnSnapshot().turns.length > 0;

                if (hasCompletedTurns && settings.uiTemplateEnabled && generatedAssistantMessageId && !settings.uiTemplateMainModelAnalysis) {
                    nextTick(() => {
                        updateUiTemplatesFromChat({ targetMessageId: generatedAssistantMessageId });
                    });
                }

                // 记忆提取：在对话正常完成后异步提取记忆（用户取消时不触发）
                if (hasCompletedTurns && memorySettings.enabled) {
                    nextTick(startAutomaticMemoryPatrol);
                }
            }
        };

        // --- Memory Extraction ---
        let _classicBatchExtractAbort = null;
        let _classicExtractionEpoch = 0;
        let _classicBatchRescanRequested = false;
        const _classicSummaryInFlightKeys = new Set();

        const getMemoryEmbeddingModel = () => String(memorySettings.embeddingModel || '').trim();
        const getMemoryMessageText = message => {
            if (!message) return '';
            const indexes = message._sourceIndexes || [];
            const sources = indexes.length
                ? indexes.map(index => chatHistory.value[index]).filter(source => source?.role === message.role)
                : [message];
            return sources.map(source => appendMessageImageDescriptions(source,
                stripMemoryCitations(stripNextResponsePrompt(stripUiTemplateContextInjection(parseCot(source.content || '').main)))
            )).filter(Boolean).join('\n\n');
        };

        const getClassicTurnSourceIds = (turnInfo, role) => {
            const sourceIndexes = turnInfo?.[role]?._sourceIndexes || [];
            return sourceIndexes
                .map(index => chatHistory.value[index])
                .filter(message => message?.role === role && message.id)
                .map(message => message.id);
        };

        const ensureConversationMessageIds = async () => {
            const snapshot = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false });
            let changed = false;
            snapshot.turns.forEach(turnInfo => {
                turnInfo.sourceIndexes.forEach(index => {
                    const message = chatHistory.value[index];
                    if (!message || !['user', 'assistant'].includes(message.role) || message.id) return;
                    message.id = generateUUID();
                    changed = true;
                });
            });
            if (changed) await saveChatHistoryNow();
            return changed
                ? buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false })
                : snapshot;
        };

        const hasClassicMemoryForJob = (job) => {
            const targetIds = new Set(job.sourceAssistantIds);
            return classicMemories.value.some(memory => {
                const memoryIds = memory.sourceAssistantIds || [];
                if (targetIds.size > 0 && memoryIds.some(id => targetIds.has(id))) return true;
                return targetIds.size === 0 && Number(memory.turn) === Number(job.turn);
            });
        };

        const buildClassicSummaryJob = (snapshot, targetIndex, includeText = true) => {
            const turns = snapshot.turns;
            const targetTurn = turns[targetIndex];
            if (!targetTurn || !currentCharacter.value?.uuid) return null;
            const sourceUserIds = getClassicTurnSourceIds(targetTurn, 'user');
            const sourceAssistantIds = getClassicTurnSourceIds(targetTurn, 'assistant');
            const key = getClassicMemoryKey(sourceAssistantIds, targetTurn.turn);
            if (!includeText) return { index: targetIndex, turn: targetTurn.turn, sourceAssistantIds, key };

            const contextTurns = turns.slice(Math.max(0, targetIndex - 3), targetIndex + 1).map(turnInfo => ({
                turn: turnInfo.turn,
                userContent: getMemoryMessageText(turnInfo.user),
                assistantContent: getMemoryMessageText(turnInfo.assistant),
                isTarget: turnInfo === targetTurn
            }));
            const targetContext = contextTurns[contextTurns.length - 1];
            if (!targetContext?.userContent || !targetContext?.assistantContent) return null;

            return {
                characterId: currentCharacter.value.uuid,
                storyScopeId: getCurrentStoryBranchScopeId(),
                epoch: _classicExtractionEpoch,
                turn: targetTurn.turn,
                contextTurns,
                sourceUserIds,
                sourceAssistantIds,
                sourceUserText: (targetTurn.user?._sourceIndexes || [])
                    .map(index => chatHistory.value[index])
                    .filter(message => message?.role === 'user')
                    .map(message => String(message.content || ''))
                    .join('\n\n') || String(targetTurn.user?.content || ''),
                sourceAssistantText: targetContext.assistantContent,
                key
            };
        };

        const requestClassicMemoryCompletion = async (requestMessages, signal) => {
            const model = String(memorySettings.classicModel || '').trim();
            if (!getMemoryApiEndpoint('chat/completions') || !getMemoryApiKey()) throw new Error('请先配置 API 地址和 Key');
            if (!model) throw new Error('请先选择总结模型');

            const result = await requestMemoryJson({
                model, temperature: 0.2, stream: false, messages: requestMessages, signal
            });
            const summary = parseCot(result.content).main
                .replace(/^```(?:text|markdown)?\s*/i, '')
                .replace(/\s*```$/, '')
                .replace(/^(?:最新对话总结|总结)[:：]\s*/i, '')
                .trim();
            if (!summary) throw new Error('副模型没有返回有效总结');
            return summary.replace(/\n{3,}/g, '\n\n');
        };

        const requestClassicMemorySummary = async (job, signal) => {
            const requestMessages = [{
                role: 'system',
                content: BUILTIN_PROMPTS.buildClassicSummarySystemPrompt({
                    userName: user.name,
                    characterName: currentCharacter.value?.name
                })
            }];

            job.contextTurns.forEach(turnInfo => {
                const marker = turnInfo.isTarget
                    ? `【最新对话：唯一总结目标｜第 ${turnInfo.turn} 轮】`
                    : `【历史背景：仅供理解，不得作为总结目标｜第 ${turnInfo.turn} 轮】`;
                requestMessages.push({ role: 'user', content: `${marker}\n${turnInfo.userContent}` });
                requestMessages.push({ role: 'assistant', content: `${marker}\n${turnInfo.assistantContent}` });
            });
            requestMessages.push({
                role: 'user',
                content: BUILTIN_PROMPTS.buildClassicSummaryFinalInstruction(job.turn)
            });
            return requestClassicMemoryCompletion(requestMessages, signal);
        };

        const requestClassicSecondarySummary = async (group, signal) => {
            const ordered = [...group].sort((a, b) => Number(a.turn) - Number(b.turn));
            const startTurn = Number(ordered[0]?.turn) || 1;
            const endTurn = Number(ordered[ordered.length - 1]?.turn) || startTurn;
            const requestMessages = [{
                role: 'system',
                content: BUILTIN_PROMPTS.buildClassicSecondarySummaryPrompt({
                    userName: user.name,
                    characterName: currentCharacter.value?.name,
                    startTurn,
                    endTurn
                })
            }, {
                role: 'user',
                content: ordered.map(memory => `【第 ${memory.turn} 轮】\n${memory.summary}`).join('\n\n')
            }];
            return requestClassicMemoryCompletion(requestMessages, signal);
        };

        // 拆父/裁剪要的是「这一层的来源」。过去这里 filter 掉同为压缩总结的子节点，
        // 三级结构里那等于把整棵子树连根丢掉；损坏与过深由 prepareClassicMemoriesForRuntime 抛出，不静默截断。
        const getSecondaryClassicSourceMemories = (memory) => prepareClassicMemoriesForRuntime(
            Array.isArray(memory?.sourceMemories) ? memory.sourceMemories : []
        );

        const trimClassicMemoriesToTurn = (items, lastTurn) => {
            const limit = Number(lastTurn);
            if (!Number.isFinite(limit)) return Array.isArray(items) ? items.slice() : [];
            const trimOne = memory => {
                if (!isSecondaryClassicMemory(memory)) {
                    return Number(memory?.turn) <= limit ? [memory] : [];
                }
                const range = getClassicMemoryTurnRange(memory);
                if (range.end <= limit) return [memory];
                if (range.start > limit) return [];
                // 跨越裁剪线才拆。拆出来的子节点可能仍是压缩总结，继续按同一判据递归，
                // 不能只展开一层后按粗粒度条件过滤——那会把仍在范围内的子块连带删掉。
                return getSecondaryClassicSourceMemories(memory).flatMap(trimOne);
            };
            return (Array.isArray(items) ? items : []).flatMap(trimOne);
        };

        const getEligibleClassicSecondaryGroups = (totalTurns, memories = classicMemories.value) => {
            const compressionLimit = Math.max(0, Number(totalTurns) - CLASSIC_SECONDARY_KEEP_TURNS);
            if (compressionLimit < CLASSIC_SECONDARY_GROUP_SIZE) return [];
            const { turns } = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false });
            const byTurn = new Map();
            memories.forEach(memory => {
                const turn = Number(memory?.turn);
                if (!isSecondaryClassicMemory(memory) && turn > 0 && turn <= compressionLimit) byTurn.set(turn, memory);
            });
            const groups = [];
            for (let start = 1; start + CLASSIC_SECONDARY_GROUP_SIZE - 1 <= compressionLimit; start += CLASSIC_SECONDARY_GROUP_SIZE) {
                const group = Array.from({ length: CLASSIC_SECONDARY_GROUP_SIZE }, (_, offset) => byTurn.get(start + offset));
                // 仅跳过确认没有正文的空轮；有正文却缺总结的轮次必须先补录。
                const complete = group.every((memory, offset) => {
                    const turnInfo = turns[start + offset - 1];
                    return memory || (turnInfo && !getMemoryMessageText(turnInfo.assistant).trim());
                });
                const summaries = group.filter(Boolean);
                if (complete && summaries.length > 1) groups.push(summaries);
            }
            return groups;
        };

        const compressEligibleClassicMemories = async (totalTurns, signal, interactive = false, onProgress) => {
            const groups = getEligibleClassicSecondaryGroups(totalTurns);
            if (!groups.length) return;
            const characterId = currentCharacter.value?.uuid;
            const storyScopeId = getCurrentStoryBranchScopeId();
            const epoch = _classicExtractionEpoch;
            const concurrency = normalizeClassicMemoryConcurrency(memorySettings.classicConcurrency);
            let completed = 0;
            onProgress?.(0, groups.length);
            try {
                for (let offset = 0; offset < groups.length; offset += concurrency) {
                    if (signal?.aborted || epoch !== _classicExtractionEpoch
                        || currentCharacter.value?.uuid !== characterId
                        || getCurrentStoryBranchScopeId() !== storyScopeId) break;
                    const results = await Promise.all(groups.slice(offset, offset + concurrency).map(async group => {
                        try {
                            return { group, summary: await requestClassicSecondarySummary(group, signal) };
                        } catch (error) {
                            return { group, error };
                        }
                    }));
                    if (signal?.aborted || epoch !== _classicExtractionEpoch
                        || currentCharacter.value?.uuid !== characterId
                        || getCurrentStoryBranchScopeId() !== storyScopeId) break;
                    let failed = false;
                    for (let result of results) {
                        if (result.error) {
                            if (result.error.name === 'AbortError') throw result.error;
                            if (interactive) {
                                let retryError = result.error;
                                const range = `${result.group[0].turn}-${result.group[result.group.length - 1].turn}`;
                                while (true) {
                                    const retry = await showVueConfirmModal(
                                        '基础模式补录遇到错误',
                                        `第 ${range} 轮二次压缩失败：\n${retryError.message}\n\n是否立即重试？`
                                    );
                                    if (signal?.aborted || epoch !== _classicExtractionEpoch) throw createAbortReason();
                                    if (!retry) {
                                        const abortError = new Error('用户取消了重试并中止了二次压缩');
                                        abortError.name = 'AbortError';
                                        throw abortError;
                                    }
                                    try {
                                        result = {
                                            group: result.group,
                                            summary: await requestClassicSecondarySummary(result.group, signal)
                                        };
                                        break;
                                    } catch (error) {
                                        if (error.name === 'AbortError') throw error;
                                        retryError = error;
                                    }
                                }
                            } else {
                                console.warn('Classic memory secondary compression failed:', result.error);
                                failed = true;
                                continue;
                            }
                        }
                        const { group, summary } = result;
                        const sourceIds = new Set(group.map(memory => String(memory.id)));
                        if (!group.every(memory => classicMemories.value.some(item => item.id === memory.id))) continue;
                        const startTurn = Number(group[0].turn);
                        const endTurn = Number(group[group.length - 1].turn);
                        const sourceMemories = group.map(memory => cloneForStorage(memory));
                        const mergedMemory = markRuntimeRaw({
                            id: generateUUID(),
                            no: getNextClassicMemoryNo(classicMemories.value),
                            timestamp: Date.now(),
                            turn: endTurn,
                            turnStart: startTurn,
                            turnEnd: endTurn,
                            summary,
                            enabled: true,
                            classicMemory: true,
                            secondaryCompressed: true,
                            summaryModel: String(memorySettings.classicModel || '').trim(),
                            sourceUserIds: [...new Set(group.flatMap(memory => memory.sourceUserIds || []))],
                            sourceAssistantIds: [...new Set(group.flatMap(memory => memory.sourceAssistantIds || []))],
                            sourceMemories
                        });
                        // 逐组合并：每条都走版本协议，成功后才能真正算完成
                        const intent = await tryBeginMemoryIntent('二次压缩');
                        if (!intent) break;
                        const merged = await commitMemoryTransform(intent, list => [
                            ...list.filter(memory => !sourceIds.has(String(memory && memory.id || ''))),
                            mergedMemory
                        ], {
                            validate: (current, before) => [...sourceIds].every(id => sameMemorySources(current, before, [id]))
                        });
                        if (!merged.published) break;
                        completed++;
                        onProgress?.(completed, groups.length);
                    }
                    if (failed) break;
                }
            } finally {
                // 每组已在提交成功时就落盘，不再需要整表补写
            }
        };

        const restoreSecondaryClassicMemoriesForTurnCount = (totalTurns, source = classicMemories.value) => {
            const compressionLimit = Math.max(0, Number(totalTurns) - CLASSIC_SECONDARY_KEEP_TURNS);
            const restore = memory => {
                if (!isSecondaryClassicMemory(memory) || getClassicMemoryTurnRange(memory).end <= compressionLimit) return [memory];
                const sourceMemories = getSecondaryClassicSourceMemories(memory);
                if (!sourceMemories.length) return [memory];
                // 子节点可能仍是压缩总结且同样越界，继续展开；只展开一层会漏掉更深的块。
                return sourceMemories.flatMap(restore);
            };
            return (Array.isArray(source) ? source : []).flatMap(restore);
        };

        // [rphub 2.8.65] 经典记忆单条编辑。
        // displayedClassicMemories 是 {...memory, ...} 的副本，改它不落库，
        // 必须按 id 回源 classicMemories.value 改，再走 saveClassicMemoriesNow 落盘。
        const editingClassicMemoryId = ref('');
        const editingClassicMemoryText = ref('');
        const savingClassicMemoryId = ref('');
        const startEditClassicMemory = (memory) => {
            if (!memory || !memory.id || savingClassicMemoryId.value) return;
            editingClassicMemoryId.value = memory.id;
            editingClassicMemoryText.value = String(memory.summary || '');
        };
        const cancelEditClassicMemory = () => {
            editingClassicMemoryId.value = '';
            editingClassicMemoryText.value = '';
        };
        const saveEditClassicMemory = async () => {
            const memoryId = editingClassicMemoryId.value;
            if (!memoryId || savingClassicMemoryId.value) return;
            const text = String(editingClassicMemoryText.value || '').trim();
            if (!text) { showToast('总结内容不能为空', 'warning'); return; }
            const intent = await beginMemoryIntent('编辑总结');
            const memoryIndex = intent.source.findIndex(item => item.id === memoryId);
            if (memoryIndex < 0) {
                showToast('找不到这条记忆，可能已被重新生成', 'warning');
                cancelEditClassicMemory();
                return;
            }
            const previous = intent.source[memoryIndex];
            if (String(previous.summary || '') === text) { cancelEditClassicMemory(); return; }
            savingClassicMemoryId.value = memoryId;
            try {
                const updated = markRuntimeRaw({ ...previous, summary: text });
                // 文案改了，旧坐标就废了：清 6 个 embedding 字段，交给下次补录重建。
                if (!isSecondaryClassicMemory(updated)) ['embeddingQ', 'embeddingScale', 'embeddingDims', 'embeddingEncoding', 'embeddingModel', 'embeddingApiUrl', 'embeddingInputFingerprint']
                    .forEach(key => delete updated[key]);
                requireMemoryPublished(await commitMemoryTransform(intent, list => list.map(item => item.id === memoryId ? updated : item), {
                    validate: (list, before) => sameMemorySources(list, before, [memoryId])
                }));
                cancelEditClassicMemory();
                showToast(memorySettings.mode === MEMORY_MODE_ENHANCED
                    ? '已保存，向量坐标将在下次补录时重建'
                    : '已保存', 'success');
            } catch (error) {
                console.error('Edit classic memory failed:', error);
                if (memoryIntentActive(intent)) showToast(`保存失败：${error.message}`, 'error');
            } finally {
                if (savingClassicMemoryId.value === memoryId) savingClassicMemoryId.value = '';
            }
        };

        const retryClassicMemory = async (memory) => {
            if (!memory?.id || retryingClassicMemoryId.value) return;
            if (memorySettings.mode === MEMORY_MODE_ENHANCED && !getMemoryEmbeddingModel()) {
                showToast('请先选择向量模型', 'warning');
                return;
            }
            if (isClassicBatchExtracting.value) {
                showToast('请先等待补录完成', 'warning');
                return;
            }

            const memoryId = memory.id;
            const retryEpoch = _classicExtractionEpoch;
            const retryCharacterId = currentCharacter.value?.uuid;
            const retryStoryScopeId = getCurrentStoryBranchScopeId();
            retryingClassicMemoryId.value = memoryId;
            try {
                if (isSecondaryClassicMemory(memory)) {
                    // 重算要用最底层的基础总结：三级结构里一层来源可能只有 1 个压缩节点，
                    // 按「长度等于分组大小」判断会把合法结构误判成「找不到原始总结」。
                    const leafMemories = flattenClassicMemories([memory])
                        .filter(item => !isSecondaryClassicMemory(item));
                    if (leafMemories.length !== CLASSIC_SECONDARY_GROUP_SIZE) {
                        showToast('找不到这条二次压缩记忆的原始总结', 'warning');
                        return;
                    }
                    const summary = await requestClassicSecondarySummary(leafMemories);
                    if (retryEpoch !== _classicExtractionEpoch || currentCharacter.value?.uuid !== retryCharacterId
                        || getCurrentStoryBranchScopeId() !== retryStoryScopeId) return;
                    const intent = await tryBeginMemoryIntent('重试二次总结');
                    if (!intent || !intent.source.some(item => String(item && item.id) === String(memoryId))) return;
                    const summaryModel = String(memorySettings.classicModel || '').trim();
                    const committed = await commitMemoryTransform(intent, list => list.map(item =>
                        String(item && item.id) === String(memoryId)
                            ? markRuntimeRaw({ ...item, summary, summaryModel })
                            : item));
                    if (!committed.published) return;
                    const range = getClassicMemoryTurnRange(memory);
                    showToast(`第 ${range.start}-${range.end} 轮总结已重新生成`, 'success');
                    return;
                }
                const snapshot = await ensureConversationMessageIds();
                const sourceAssistantIds = new Set((memory.sourceAssistantIds || []).filter(Boolean));
                const targetIndex = snapshot.turns.findIndex(turnInfo => {
                    if (sourceAssistantIds.size > 0) {
                        return getClassicTurnSourceIds(turnInfo, 'assistant')
                            .some(id => sourceAssistantIds.has(id));
                    }
                    return Number(turnInfo.turn) === Number(memory.displayTurn || memory.turn);
                });
                const job = buildClassicSummaryJob(snapshot, targetIndex);
                if (!job) {
                    showToast('找不到这条记忆对应的原始对话', 'warning');
                    return;
                }
                const summary = await requestClassicMemorySummary(job);
                if (retryEpoch !== _classicExtractionEpoch || currentCharacter.value?.uuid !== job.characterId || getCurrentStoryBranchScopeId() !== job.storyScopeId) return;

                const intent = await tryBeginMemoryIntent('重试总结');
                if (!intent || !intent.source.some(item => String(item && item.id) === String(memoryId))) return;
                const committed = await commitMemoryTransform(intent, list => list.map(item => {
                    if (String(item && item.id) !== String(memoryId)) return item;
                    const updated = markRuntimeRaw({
                        ...item,
                        turn: job.turn,
                        summary,
                        summaryModel: String(memorySettings.classicModel || '').trim(),
                        sourceUserIds: job.sourceUserIds,
                        sourceAssistantIds: job.sourceAssistantIds,
                        sourceUserText: job.sourceUserText,
                        sourceAssistantText: job.sourceAssistantText
                    });
                    ['embeddingQ', 'embeddingScale', 'embeddingDims', 'embeddingEncoding', 'embeddingModel', 'embeddingApiUrl', 'embeddingInputFingerprint']
                        .forEach(key => delete updated[key]);
                    return updated;
                }));
                if (!committed.published) return;
                const updated = committed.list.find(item => String(item && item.id) === String(memoryId));
                // 正文在上面已经提交。向量再失败也不能把这次操作报成「重试失败」——
                // 那会让用户以为这一轮总结没了。单独说明，口径与记忆工具编辑一致。
                let vectorWarning = '';
                if (memorySettings.mode === MEMORY_MODE_ENHANCED && updated) {
                    try {
                        const indexed = await indexSummaryMemories(snapshot, undefined, [updated]);
                        if (indexed.cancelled) vectorWarning = '，但向量重建被中断';
                        else if (indexed.skippedNoSource) vectorWarning = '，但找不到这一轮的原文，向量没重建';
                        else if (indexed.requested && indexed.written < indexed.requested) vectorWarning = '，但向量没重建';
                    } catch (error) {
                        console.error('Rebuild embedding after retry failed:', error);
                        vectorWarning = `，但向量没重建（${error?.message || error}）`;
                    }
                }
                showToast(`第 ${job.turn} 轮总结已重新生成${vectorWarning}`,
                    vectorWarning ? 'warning' : 'success', vectorWarning ? 5000 : 2000);
            } catch (error) {
                console.error('Retry classic memory failed:', error);
                showToast(`重试失败：${error.message}`, 'error');
            } finally {
                if (retryingClassicMemoryId.value === memoryId) retryingClassicMemoryId.value = '';
            }
        };

        const generateAndStoreClassicMemory = async (job, signal) => {
            if (!job || job.epoch !== _classicExtractionEpoch) return false;
            if (currentCharacter.value?.uuid !== job.characterId || getCurrentStoryBranchScopeId() !== job.storyScopeId || hasClassicMemoryForJob(job)) return false;
            const inFlightKey = `${job.epoch}:${job.key}`;
            if (_classicSummaryInFlightKeys.has(inFlightKey)) return false;

            _classicSummaryInFlightKeys.add(inFlightKey);
            try {
                const summary = await requestClassicMemorySummary(job, signal);
                if (signal?.aborted || job.epoch !== _classicExtractionEpoch) return false;
                if (currentCharacter.value?.uuid !== job.characterId || getCurrentStoryBranchScopeId() !== job.storyScopeId || hasClassicMemoryForJob(job)) return false;
                const intent = await tryBeginMemoryIntent('生成总结');
                if (!intent) return false;
                const targetIds = new Set(job.sourceAssistantIds || []);
                const alreadyStored = list => list.some(memory => {
                    const memoryIds = memory?.sourceAssistantIds || [];
                    if (targetIds.size > 0 && memoryIds.some(id => targetIds.has(id))) return true;
                    return targetIds.size === 0 && Number(memory?.turn) === Number(job.turn);
                });
                if (alreadyStored(intent.source)) return false;
                const created = markRuntimeRaw({
                    id: generateUUID(),
                    timestamp: Date.now(),
                    turn: job.turn,
                    summary,
                    enabled: true,
                    classicMemory: true,
                    summaryModel: String(memorySettings.classicModel || '').trim(),
                    sourceUserIds: job.sourceUserIds,
                    sourceAssistantIds: job.sourceAssistantIds,
                    sourceUserText: job.sourceUserText,
                    sourceAssistantText: job.sourceAssistantText
                });
                // 追加式变换：并发任务各自提交时按最新列表合并，不覆盖别人刚写的条目
                const committed = await commitMemoryTransform(intent, list => (alreadyStored(list)
                    ? list
                    : [...list, markRuntimeRaw({ ...created, no: getNextClassicMemoryNo(list) })]),
                { validate: () => true });
                return committed.published;
            } finally {
                _classicSummaryInFlightKeys.delete(inFlightKey);
            }
        };

        const requestMemoryEmbeddings = async (inputs, signal, model = getMemoryEmbeddingModel()) => {
            if (!getMemoryApiEndpoint('embeddings') || !getMemoryApiKey()) throw new Error('请先配置 API 地址和 Key');
            if (!model) throw new Error('请先选择向量模型');

            const normalizedInputs = inputs.map(input => String(input || '').trim());
            if (normalizedInputs.some(input => !input)) throw new Error('嵌入内容不能为空');

            const requestStartedAt = Date.now();
            const apiUrl = getMemoryApiEndpoint('embeddings');
            const apiKey = getMemoryApiKey();
            const data = await requestJson({
                url: apiUrl, apiKey, signal,
                body: { model, input: normalizedInputs.length === 1 ? normalizedInputs[0] : normalizedInputs },
                // 2.7.84：pool:false 让嵌入请求不进聊天共享池，
                // 中止生成只停聊天，不再连带打断召回；timeoutMs 给足批量嵌入时间。
                pool: false, timeoutMs: 60000
            });
            recordApiUsage(getApiUsagePayload(data), {
                type: 'embedding', model, apiUrl, apiKey, isStream: false,
                durationMs: Date.now() - requestStartedAt, outputCharacters: 0
            });
            const rows = Array.isArray(data.data) ? [...data.data] : [];
            rows.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
            const vectors = rows.map(row => normalizeEmbedding(row.embedding));

            if (signal?.aborted) {
                const abortError = new Error('Aborted');
                abortError.name = 'AbortError';
                throw abortError;
            }
            if (vectors.length !== normalizedInputs.length || vectors.some(vector => vector.length === 0 || vector.length !== vectors[0].length)) {
                throw new Error('嵌入接口返回的数据不完整');
            }

            return vectors;
        };

        // 2.7.84：默认值原来取 settings.apiUrl（聊天站），但嵌入请求实际发往
        // getMemoryApiEndpoint('embeddings')（优先 memorySettings.memoryApiUrl）。
        // 用户单独配了记忆接口时两者不等，坐标「是否当前」的判据完全失效。
        const hasCurrentSummaryEmbedding = (memory, model = getMemoryEmbeddingModel(), apiUrl = getMemoryApiEndpoint('embeddings')) =>
            memory.embeddingModel === model && memory.embeddingApiUrl === apiUrl
            && getSummaryEmbedding(memory).length > 0;

        // 坐标是否「脏」：只有带指纹且与当前文本不符才判定为脏。
        // 旧条目没有指纹，无法反推它算的是哪段文本，按批准的策略保留原样、不自动批量重建。
        const hasStaleSummaryEmbedding = (memory, sourceUserText = memory?.sourceUserText) =>
            typeof memory?.embeddingInputFingerprint === 'string'
            && memory.embeddingInputFingerprint !== summaryEmbeddingFingerprint({
                summary: memory.summary, sourceUserText
            });

        // 向量状态分类器：任务筛选与各类计数共用同一份判据。
        // 分开写两份判据的后果是计划数、实际任务数、召回口径各说一套，进度里出现永远跑不完的任务。
        const classifySummaryEmbedding = (memory, sourceUserText, model, apiUrl) => {
            if (!String(sourceUserText || '').trim()) return 'noSource';
            if (hasStaleSummaryEmbedding(memory, sourceUserText)) return 'stale';
            if (!hasCurrentSummaryEmbedding(memory, model, apiUrl)
                || sourceUserText !== memory.sourceUserText) return 'broken';
            return typeof memory.embeddingInputFingerprint === 'string' ? 'current' : 'unverified';
        };
        const createSummarySourceResolver = snapshot => {
            const messagesById = new Map(chatHistory.value.filter(message => message.id).map(message => [message.id, message]));
            const turnsByNumber = new Map(snapshot.turns.map(turn => [turn.turn, turn]));
            return memory => {
                const inputs = (memory.sourceUserIds || []).map(id => messagesById.get(id))
                    .filter(message => message?.role === 'user').map(message => String(message.content || ''));
                if (inputs.length) return inputs.join('\n\n');
                const turn = turnsByNumber.get(Number(memory.turn));
                return memory.sourceUserText || String(turn?.user?.content || '');
            };
        };
        // 五态互斥计数：待补 / 脏 / 破损 / 待验证 / 当前。
        // 「待验证」是旧条目没有指纹、无法反推算的是哪段文本：它参与召回但不占待办名额，
        // 与「需重建」分开报，才不会把历史数据算成一批注定跑不完的任务。
        const summarizeSummaryEmbeddingCoverage = (snapshot, sources = getSummarySources(classicMemories.value),
            model = getMemoryEmbeddingModel(), apiUrl = getMemoryApiEndpoint('embeddings')) => {
            const resolve = createSummarySourceResolver(snapshot);
            const counts = { total: sources.length, current: 0, unverified: 0, stale: 0, broken: 0, noSource: 0, parents: 0 };
            sources.forEach(memory => {
                // 压缩父条目本身不参与索引：它没有坐标，也不该有。单独一桶，
                // 否则会被算进 broken，让「计划数 = stale + broken」这条等式失真。
                if (isSecondaryClassicMemory(memory)) { counts.parents++; return; }
                counts[classifySummaryEmbedding(memory, resolve(memory), model, apiUrl)]++;
            });
            return counts;
        };
        const getSummaryEmbeddingJobs = (snapshot, sources = getSummarySources(classicMemories.value)) => {
            const model = getMemoryEmbeddingModel();
            // 2.7.84：本行的 apiUrl 会显式传给 hasCurrentMemoryEmbedding 覆盖其默认值，
            // 必须与写入侧同源，否则「坐标是否需重算」的判定仍用聊天站口径。
            const apiUrl = getMemoryApiEndpoint('embeddings');
            const resolve = createSummarySourceResolver(snapshot);
            // 父条目永不进任务表：记忆工具会把父摘要也列出来，直接把它交给索引会发一次
            // 注定写不回的请求（它不在 getSummarySources 的结果里，写回身份检查必然拦下）。
            return sources.filter(memory => !isSecondaryClassicMemory(memory)).map(memory => {
                const sourceUserText = resolve(memory);
                return { memory, sourceUserText, state: classifySummaryEmbedding(memory, sourceUserText, model, apiUrl) };
            })
                // 缺坐标、原文变了、或指纹与当前文本不符 ⇒ 需要重算。
                // 指纹不符这条专治「文案改了但坐标没清」：过去只有 sourceUserText 变才重算，
                // 编辑总结正文的路径不会触发，召回就一直拿旧坐标打分。
                // 缺原文（noSource）不进任务表：它发不出请求，占住名额只会让进度永远差一截。
                .filter(job => job.state === 'stale' || job.state === 'broken');
        };

        const indexSummaryMemories = async (snapshot, signal, sources, onProgress) => {
            const model = getMemoryEmbeddingModel();
            // 2.7.84：与下面 requestMemoryEmbeddings 实际请求的端点保持一致，
            // 也与 hasCurrentSummaryEmbedding 的比对口径同源。
            const apiUrl = getMemoryApiEndpoint('embeddings');
            const epoch = _classicExtractionEpoch;
            const scopeId = getCurrentStoryBranchScopeId();
            const isCurrent = () => !signal?.aborted && epoch === _classicExtractionEpoch
                && scopeId === getCurrentStoryBranchScopeId()
                && memorySettings.mode === MEMORY_MODE_ENHANCED;
            // 缺原文的条目根本不进 jobs：既不该发请求，也不该占进度名额。
            // 计数单独报给调用方，由它提示「待补」，避免一条缺来源把整批带停。
            const coverage = summarizeSummaryEmbeddingCoverage(snapshot, sources, model, apiUrl);
            const jobs = getSummaryEmbeddingJobs(snapshot, sources);
            let written = 0, skippedChanged = 0, cancelled = false;
            // 返回值把「请求了几条 / 写成几条 / 缺几条原文 / 几条在请求期间变了 / 是否被取消」
            // 分开报：调用方据此区分正常跳过、过期丢弃与失败，不把正文已提交的操作报成失败。
            const settle = () => ({
                requested: jobs.length, written,
                skippedNoSource: coverage.noSource, skippedParent: coverage.parents,
                skippedChanged, cancelled
            });
            if (!jobs.length) return settle();
            if (!model) throw new Error('请先选择向量模型');
            onProgress?.(0, jobs.length);
            for (let offset = 0; offset < jobs.length; offset += SUMMARY_EMBEDDING_BATCH_SIZE) {
                if (!isCurrent()) { cancelled = true; return settle(); }
                const batch = jobs.slice(offset, offset + SUMMARY_EMBEDDING_BATCH_SIZE);
                const vectors = await requestMemoryEmbeddings(batch.map(job => buildSummaryEmbeddingText({
                    ...job.memory, sourceUserText: job.sourceUserText
                })), signal, model);
                if (!isCurrent()) { cancelled = true; return settle(); }
                const packed = vectors.map(quantizeEmbeddingForStorage);
                if (packed.some(value => !value)) throw new Error('嵌入接口返回了无效坐标');
                const currentSources = new Set(getSummarySources(classicMemories.value));
                const updateByKey = new Map();
                batch.forEach((job, index) => {
                    if (!currentSources.has(job.memory)) return;
                    updateByKey.set(summarySourceKey(job.memory), {
                        packed: packed[index],
                        sourceUserText: job.sourceUserText,
                        summary: job.memory.summary
                    });
                });
                let batchWritten = 0;
                const intent = await tryBeginMemoryIntent('建立向量索引');
                if (!intent || !updateByKey.size) { skippedChanged += batch.length; continue; }
                const applyVectorUpdates = list => list.map(item => {
                    const update = updateByKey.get(summarySourceKey(item));
                    if (!update) {
                        // 压缩父条目下的基础叶才是真正被索引的对象。只映射顶层会让嵌套叶的任务
                        // 「请求成功、写不进去」，下一轮又判脏，变成永远空转的重建。
                        if (!Array.isArray(item.sourceMemories) || !item.sourceMemories.length) return item;
                        const children = applyVectorUpdates(item.sourceMemories);
                        return children.every((child, index) => child === item.sourceMemories[index])
                            ? item : { ...item, sourceMemories: children };
                    }
                    // 过期结果不写回：请求发出后这条正文已经变了，坐标对应的是旧文本。
                    // 正常路径下任何正文改动都会推进基线、让上面的 intent 先失败；这里是第二道闸，
                    // 专门挡「基线没动但对象被就地改过」的情形，避免写出坐标与指纹对不上的记录。
                    if (String(item.summary || '') !== String(update.summary || '')) return item;
                    batchWritten++;
                    // 指纹按「实际送进模型的那段文本」算：summary 取请求时的快照，
                    // sourceUserText 取同一份 job。用提交时的 next.summary 会在正文已变时
                    // 写出「坐标对应 A、指纹对应 B」的自相矛盾记录。
                    const next = {
                        ...item, ...update.packed,
                        embeddingModel: model,
                        embeddingApiUrl: apiUrl,
                        sourceUserText: update.sourceUserText,
                        embeddingInputFingerprint: summaryEmbeddingFingerprint({
                            summary: update.summary, sourceUserText: update.sourceUserText
                        })
                    };
                    return next;
                });
                const result = await commitMemoryTransform(intent, applyVectorUpdates);
                // 过期不写回：既不算失败也不算成功，单独计成「请求期间已变」。
                skippedChanged += batch.length - batchWritten;
                if (!result.published) return settle();
                written += batchWritten;
                if (isCurrent()) onProgress?.(written, jobs.length);
            }
            return settle();
        };

        const selectEnhancedMemories = async signal => {
            // 这次查询用的模型与端点：请求发出后一律按它们比对，不按「当下的设置」比对，
            // 否则查询期间换端点会把旧端点算出的查询向量和新坐标混在一起打分。
            const model = getMemoryEmbeddingModel();
            const apiUrl = getMemoryApiEndpoint('embeddings');
            // 脏坐标（指纹与当前正文不符）不参与打分：宁可不召回，也不拿一段别的文本的向量冒充相似度。
            const sources = getSummarySources(classicMemories.value)
                .filter(memory => hasCurrentSummaryEmbedding(memory, model, apiUrl))
                .filter(memory => !hasStaleSummaryEmbedding(memory));
            if (!sources.length) return [];
            const latestUser = [...chatHistory.value].reverse().find(message => message.role === 'user');
            const query = String(latestUser?.content || '').trim();
            if (!query) return [];
            const epoch = _classicExtractionEpoch;
            const scopeId = getCurrentStoryBranchScopeId();
            const isCurrent = () => !signal?.aborted && epoch === _classicExtractionEpoch
                && scopeId === getCurrentStoryBranchScopeId() && memorySettings.enabled
                && memorySettings.mode === MEMORY_MODE_ENHANCED;
            // 冻结每条候选的输入指纹。查询要等网络，返回时可能已经删条目、改正文、换端点；
            // 代次只看抽取与分支，删条目不推进它，所以必须逐条比对指纹。
            const frozen = new Map(sources.map(memory => [summarySourceKey(memory), summaryEmbeddingFingerprint(memory)]));
            try {
                const [queryVector] = await requestMemoryEmbeddings([query], signal);
                if (!isCurrent()) return [];
                if (getMemoryEmbeddingModel() !== model || getMemoryApiEndpoint('embeddings') !== apiUrl) return [];
                const liveByKey = new Map(getSummarySources(classicMemories.value)
                    .map(memory => [summarySourceKey(memory), memory]));
                const selected = [];
                for (let index = 0; index < sources.length; index++) {
                    const memory = sources[index];
                    const key = summarySourceKey(memory);
                    const live = liveByKey.get(key);
                    // 三项都要过：条目还在、正文与来源没变、坐标仍是这次请求用的模型与端点。
                    if (!live || frozen.get(key) !== summaryEmbeddingFingerprint(live)) continue;
                    if (!hasCurrentSummaryEmbedding(live, model, apiUrl) || hasStaleSummaryEmbedding(live)) continue;
                    const score = cosineSimilarity(queryVector, getSummaryEmbedding(live));
                    if (score >= SUMMARY_RECALL_MIN_SIMILARITY) selected.push({ ...live, score });
                    if (index > 0 && index % 256 === 0) {
                        await yieldToUi();
                        if (!isCurrent()) return [];
                    }
                }
                return selected.sort((a, b) => b.score - a.score || a.turn - b.turn)
                    .slice(0, SUMMARY_RECALL_LIMIT).sort((a, b) => a.turn - b.turn);
            } catch (error) {
                if (signal?.aborted || error.name === 'AbortError') throw error;
                if (isCurrent()) {
                    console.warn('[增强记忆] 召回失败：', error.message);
                    showToast('记忆召回失败，本次仍使用总结上下文', 'warning');
                }
                return [];
            }
        };

        const extractKeywordToolTerms = (query) => {
            const cleanQuery = trimMemoryText(query, 300);
            if (!cleanQuery) return [];
            const parts = cleanQuery
                .split(/[\s,，、;；|｜/\\]+/u)
                .map(term => term.trim())
                .filter(Boolean);
            return Array.from(new Set([cleanQuery, ...parts]))
                .filter(term => term.length > 0)
                .slice(0, 12);
        };

        const getKeywordToolMessageText = (message) => {
            if (!message || typeof message.content !== 'string') return '';
            const parsedData = parseCot(message.content || '');
            const cleanMain = stripUiTemplateContextInjection(parsedData.main || '');
            return trimMemoryText(stripMemoryCitations(stripDisabledImageGenContext(stripNextResponsePrompt(stripUiTemplateUpdateBlock(cleanMain)))), 5000);
        };

        const buildKeywordToolSnippet = (text, matchedTerms) => {
            const source = String(text || '').trim();
            if (source.length <= 1400) return source;
            const lowerSource = source.toLowerCase();
            const firstIndex = matchedTerms
                .map(term => lowerSource.indexOf(String(term || '').toLowerCase()))
                .filter(index => index >= 0)
                .sort((a, b) => a - b)[0] ?? 0;
            const start = Math.max(0, firstIndex - 420);
            const end = Math.min(source.length, firstIndex + 900);
            return `${start > 0 ? '...' : ''}${source.slice(start, end).trim()}${end < source.length ? '...' : ''}`;
        };

        const searchDialogueByKeywordForTool = (query, limit, options = {}) => {
            const terms = extractKeywordToolTerms(query);
            if (terms.length === 0) return [];
            const lowerTerms = terms.map(term => term.toLowerCase());
            const messages = getPostprocessedChatMessages(chatHistory.value, { includeSystem: false });
            const snapshot = buildConversationTurnSnapshot(messages, { alreadyPostprocessed: true });
            const turnByMessageIndex = new Map();
            snapshot.turns.forEach(turnInfo => {
                turnInfo.messageIndexes.forEach(messageIndex => {
                    turnByMessageIndex.set(messageIndex, turnInfo.turn);
                });
            });

            const scored = [];
            messages.forEach((message, index) => {
                if (!message || message.role === 'system') return;
                if (options.excludeMessageId && message.id === options.excludeMessageId) return;
                const text = getKeywordToolMessageText(message);
                if (!text || isRoleMemoryContextContent(text)) return;

                const lowerText = text.toLowerCase();
                const matchedTerms = terms.filter((term, termIndex) => lowerText.includes(lowerTerms[termIndex]));
                if (matchedTerms.length === 0) return;

                const fullQueryMatched = lowerText.includes(lowerTerms[0]);
                const roleLabel = message.role === 'user' ? '用户' : '角色卡';
                const speaker = message.name || (message.role === 'user' ? user.name : currentCharacter.value?.name) || roleLabel;
                scored.push({
                    turn: turnByMessageIndex.get(index) || getConversationTurnAtIndexFromSnapshot(snapshot, index) || '?',
                    role: message.role,
                    speaker,
                    matchedTerms,
                    score: (fullQueryMatched ? 100 : 0) + matchedTerms.length,
                    messageIndex: index,
                    dialogueText: `${roleLabel}：${buildKeywordToolSnippet(text, matchedTerms)}`
                });
            });

            return scored
                .sort((a, b) => {
                    const scoreDiff = b.score - a.score;
                    if (scoreDiff !== 0) return scoreDiff;
                    return b.messageIndex - a.messageIndex;
                })
                .slice(0, Math.max(ACTIVE_TOOL_MIN_RESULT_COUNT, Math.min(ACTIVE_TOOL_MAX_RESULT_COUNT, Number(limit) || ACTIVE_TOOL_DEFAULT_RESULT_COUNT)))
                .sort((a, b) => a.messageIndex - b.messageIndex);
        };

        const getTavilyErrorDetailText = (detail) => {
            if (detail === null || detail === undefined) return '';
            if (typeof detail === 'string') return detail.trim();
            if (typeof detail === 'number' || typeof detail === 'boolean') return String(detail);
            if (Array.isArray(detail)) {
                return detail
                    .map(item => getTavilyErrorDetailText(item))
                    .filter(Boolean)
                    .join('；');
            }
            if (typeof detail === 'object') {
                const directKeys = ['msg', 'message', 'error_message', 'error', 'detail', 'reason', 'description'];
                for (const key of directKeys) {
                    const text = getTavilyErrorDetailText(detail[key]);
                    if (text) return text;
                }
                return stringifyErrorDetail(detail).trim();
            }
            return String(detail).trim();
        };

        const buildTavilyErrorMessage = (response, data) => {
            const detail = data?.detail ?? data?.message ?? data?.error ?? data?.error_message;
            const message = getTavilyErrorDetailText(detail);
            if (response.status === 401) return 'Tavily API Key 无效，请检查工具设置里的 API Key。';
            if (response.status === 429) return 'Tavily 请求太频繁或额度不足，请稍后再试。';
            if (response.status === 432 || response.status === 433) return message || 'Tavily 账户额度或权限不足。';
            return message || `Tavily 搜索失败：HTTP ${response.status}`;
        };

        const requestTavily = async (endpoint, apiKey, body, signal) => {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal
            });
            const data = await response.json().catch(() => ({}));
            return { response, data };
        };

        const normalizeTavilyExtractUrl = (value) => {
            let text = String(value || '').trim().replace(/[，。；、）)\].,;]+$/g, '');
            if (!text) return '';
            if (/^www\./i.test(text)) text = `https://${text}`;
            try {
                const url = new URL(text);
                if (!['http:', 'https:'].includes(url.protocol)) return '';
                return url.href;
            } catch (err) {
                return '';
            }
        };

        const extractWebUrlsFromToolQuery = (query) => {
            const matches = String(query || '').match(/https?:\/\/[^\s<>"'，。；、）)\]]+|www\.[^\s<>"'，。；、）)\]]+/gi) || [];
            const urls = matches
                .map(normalizeTavilyExtractUrl)
                .filter(Boolean);
            return [...new Set(urls)].slice(0, ACTIVE_TOOL_TAVILY_EXTRACT_MAX_URLS);
        };

        const getWebTitleFromUrl = (url) => {
            try {
                return new URL(url).hostname || url;
            } catch (err) {
                return url || '网页';
            }
        };

        const extractWebPagesByTavilyForTool = async (urls, tool, signal) => {
            const apiKey = String(tool?.tavilyApiKey || '').trim();
            if (!apiKey) {
                throw new Error('请先在工具设置里填写 Tavily API Key。');
            }

            const body = {
                urls: urls.length === 1 ? urls[0] : urls,
                extract_depth: ACTIVE_TOOL_TAVILY_SEARCH_DEPTH,
                format: 'markdown',
                include_favicon: true,
                timeout: 30
            };

            const { response, data } = await requestTavily(ACTIVE_TOOL_TAVILY_EXTRACT_ENDPOINT, apiKey, body, signal);
            if (!response.ok) {
                throw new Error(buildTavilyErrorMessage(response, data).replace('搜索失败', '网页读取失败'));
            }

            const results = (Array.isArray(data.results) ? data.results : [])
                .map((item, index) => {
                    const url = String(item?.url || urls[index] || '').trim();
                    return {
                        index: index + 1,
                        title: String(item?.title || getWebTitleFromUrl(url)).trim(),
                        url,
                        content: trimMemoryText(item?.raw_content || item?.content || '', 6000),
                        favicon: item?.favicon || '',
                        sourceType: 'extract'
                    };
                })
                .filter(item => item.url || item.content);
            results.tavilyMode = 'extract';
            results.tavilyResponseTime = data.response_time || '';
            results.tavilyFailedResults = Array.isArray(data.failed_results)
                ? data.failed_results.map(item => ({
                    url: String(item?.url || '').trim(),
                    error: getTavilyErrorDetailText(item?.error ?? item?.message ?? item?.detail)
                }))
                : [];
            return results;
        };

        const searchWebByTavilyForTool = async (query, tool, signal) => {
            const cleanQuery = trimMemoryText(query, 800);
            if (!cleanQuery) return [];
            const extractUrls = extractWebUrlsFromToolQuery(cleanQuery);
            if (extractUrls.length > 0) {
                return extractWebPagesByTavilyForTool(extractUrls, tool, signal);
            }

            const apiKey = String(tool?.tavilyApiKey || '').trim();
            if (!apiKey) {
                throw new Error('请先在工具设置里填写 Tavily API Key。');
            }

            const maxResults = Math.max(ACTIVE_TOOL_MIN_RESULT_COUNT, Math.min(ACTIVE_TOOL_MAX_RESULT_COUNT, Number(tool?.resultCount) || ACTIVE_TOOL_DEFAULT_RESULT_COUNT));
            const body = {
                query: cleanQuery,
                search_depth: ACTIVE_TOOL_TAVILY_SEARCH_DEPTH,
                max_results: maxResults,
                topic: 'general',
                include_favicon: true
            };

            const { response, data } = await requestTavily(ACTIVE_TOOL_TAVILY_ENDPOINT, apiKey, body, signal);
            if (!response.ok) {
                throw new Error(buildTavilyErrorMessage(response, data));
            }

            const results = (Array.isArray(data.results) ? data.results : [])
                .slice(0, maxResults)
                .map((item, index) => ({
                    index: index + 1,
                    title: String(item?.title || '未命名网页').trim(),
                    url: String(item?.url || '').trim(),
                    content: trimMemoryText(item?.content || '', 1800),
                    score: Number(item?.score),
                    publishedDate: item?.published_date || item?.publishedDate || '',
                    favicon: item?.favicon || '',
                    sourceType: 'search'
                }));
            results.tavilyMode = 'search';
            results.tavilyResponseTime = data.response_time || '';
            return results;
        };

        const resetActiveToolResultContext = () => {
            activeToolMessages.length = 0;
        };

        const appendActiveToolResult = (callId, payload) => {
            activeToolMessages.push({ role: 'tool', tool_call_id: callId, content: JSON.stringify(payload) });
        };

        const getRandomToolRangeSize = (min, max) => {
            const size = max - min + 1;
            if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max || !Number.isSafeInteger(size)) {
                throw new Error('min 和 max 必须为安全整数，min 不大于 max，范围内整数个数不能超过 9007199254740991');
            }
            return size;
        };

        const generateRandomResultForTool = ({ min, max, choices }) => {
            const size = choices ? choices.length : getRandomToolRangeSize(min, max);
            // 丢弃不能均分到范围内的尾部，避免取余后某些数字更容易出现。
            const sampleSpace = 2 ** 53;
            const limit = sampleSpace - (sampleSpace % size);
            const words = new Uint32Array(2);
            let sample;
            do {
                crypto.getRandomValues(words);
                sample = (words[0] & 0x1fffff) * 2 ** 32 + words[1];
            } while (sample >= limit);
            return choices
                ? { choices, value: choices[sample % size] }
                : { min, max, value: min + sample % size };
        };

        const parseNativeActiveToolCall = (call, tools) => {
            const tool = tools.find(item => item.callName === call.function.name);
            const parsed = { tool, callLabel: call.function.name, query: '', reason: '', raw: call.function.arguments };
            try {
                if (!tool) throw new Error('该工具未开启或不存在');
                const args = JSON.parse(call.function.arguments);
                if (!args || typeof args !== 'object' || Array.isArray(args)
                    || (args.reason !== undefined && typeof args.reason !== 'string')) {
                    throw new Error('工具参数必须为 JSON 对象，reason 为可选字符串');
                }
                if (tool.type === ACTIVE_TOOL_RANDOM_TYPE) {
                    if (Object.keys(args).some(key => !['min', 'max', 'choices', 'reason'].includes(key))) {
                        throw new Error('随机生成仅接受 min、max 或 choices，以及可选的 reason');
                    }
                    if (args.choices !== undefined) {
                        if (args.min !== undefined || args.max !== undefined) {
                            throw new Error('choices 与 min、max 只能选择一种方式');
                        }
                        if (!Array.isArray(args.choices) || !args.choices.length
                            || args.choices.some(item => typeof item !== 'string' || !item.trim())) {
                            throw new Error('choices 必须是至少包含一个非空名称的数组');
                        }
                        parsed.choices = [...new Set(args.choices.map(item => item.trim()))];
                        parsed.query = parsed.choices.join('、');
                    } else {
                        getRandomToolRangeSize(args.min, args.max);
                        Object.assign(parsed, { min: args.min, max: args.max, query: `${args.min} ～ ${args.max}` });
                    }
                    parsed.reason = (args.reason || '').trim();
                } else {
                    if (Object.keys(args).some(key => !['query', 'reason'].includes(key))
                        || typeof args.query !== 'string' || !args.query.trim()) {
                        throw new Error('检索工具仅接受非空 query 字符串和可选的 reason');
                    }
                    Object.assign(parsed, { query: args.query.trim(), reason: (args.reason || '').trim() });
                }
            } catch (error) {
                parsed.error = error instanceof SyntaxError ? '工具参数不是完整有效的 JSON 对象' : error.message;
            }
            return parsed;
        };

        const syncNativeActiveToolUis = (message, calls, requestUis, tools, complete = false) => {
            if (!Array.isArray(message.toolCalls)) message.toolCalls = [];
            calls.forEach((call, position) => {
                const key = call.index ?? position;
                const parsed = parseNativeActiveToolCall(call, tools);
                let ui = requestUis.get(key);
                if (!ui) {
                    ui = reactive(createActiveToolUi(parsed, 'receiving'));
                    requestUis.set(key, ui);
                    message.toolCalls.push(ui);
                }
                Object.assign(ui, {
                    toolId: parsed.tool?.id || '',
                    toolType: parsed.tool?.type || '',
                    name: parsed.tool?.name || call.function.name || '工具调用',
                    callName: call.function.name,
                    baseCallName: call.function.name,
                    query: parsed.query || (complete ? '无有效参数' : '正在接收工具参数…'),
                    raw: parsed.raw,
                    reason: parsed.reason,
                    status: complete ? 'queued' : 'receiving'
                });
            });
        };

        const cleanActiveToolCallReason = (value) => String(value || '').trim();

        const createActiveToolUi = (toolCall, initialStatus = 'queued') => ({
            id: generateUUID(),
            toolId: toolCall.tool?.id || '',
            toolType: toolCall.tool?.type || '',
            name: toolCall.tool?.name || '工具调用',
            callName: toolCall.callLabel || toolCall.tool?.callName || '',
            baseCallName: toolCall.tool?.callName || toolCall.callLabel || '',
            query: toolCall.query || '',
            raw: toolCall.raw,
            reason: cleanActiveToolCallReason(toolCall.reason),
            status: initialStatus,
            isOpen: false,
            reasoning: '',
            isReasoningOpen: false,
            resultCount: 0,
            resultText: '',
            error: ''
        });

        const getActiveToolUiGroupKey = (toolCall) => {
            const baseCallName = normalizeActiveToolBaseCallName(
                toolCall?.baseCallName
                || toolCall?.callName
                || ''
            );
            if (toolCall?.toolType === ACTIVE_TOOL_WEB_TYPE || baseCallName === 'tool_web') {
                return ACTIVE_TOOL_WEB_TYPE;
            }
            if (toolCall?.toolType === ACTIVE_TOOL_KEYWORD_TYPE || baseCallName === 'tool_grep') {
                return ACTIVE_TOOL_KEYWORD_TYPE;
            }
            if (toolCall?.toolType === ACTIVE_TOOL_RANDOM_TYPE || baseCallName === 'tool_random') {
                return ACTIVE_TOOL_RANDOM_TYPE;
            }
            return '';
        };

        const getToolCallDisplayName = (toolCall) => {
            const groupKey = getActiveToolUiGroupKey(toolCall);
            if (groupKey === ACTIVE_TOOL_WEB_TYPE) return 'Tavily 联网搜索';
            if (groupKey === ACTIVE_TOOL_KEYWORD_TYPE) return '关键词检索';
            if (groupKey === ACTIVE_TOOL_RANDOM_TYPE) return '随机生成';
            return toolCall?.name || '工具调用';
        };

        const getToolCallModeText = (toolCall) => {
            const groupKey = getActiveToolUiGroupKey(toolCall);
            const query = String(toolCall?.query || '');

            if (groupKey === ACTIVE_TOOL_WEB_TYPE) {
                const hasUrl = extractWebUrlsFromToolQuery(query).length > 0;
                return hasUrl ? '读取网页' : '联网搜索';
            }

            if (groupKey === ACTIVE_TOOL_KEYWORD_TYPE) {
                return '关键词检索';
            }
            if (groupKey === ACTIVE_TOOL_RANDOM_TYPE) return '随机生成';
            return '工具调用';
        };

        const TOOL_CALL_RUNNING_STATUSES = ['running', 'receiving', 'queued'];
        const getToolCallEffectiveStatus = (toolCall) => (
            toolCall?.status === 'continuing' ? 'done' : (toolCall?.status || 'queued')
        );

        const getCurrentThinkingToolCall = (message) => {
            const toolCalls = Array.isArray(message?.toolCalls) ? message.toolCalls : [];
            const runningToolCall = toolCalls.find(toolCall => TOOL_CALL_RUNNING_STATUSES.includes(getToolCallEffectiveStatus(toolCall)));
            if (runningToolCall) return runningToolCall;
            if (
                activeToolContinuationMessageId.value === message?.id
                && !activeToolContinuationHasResponse.value
                && (isGenerating.value || activeToolContinuationPending.value)
            ) {
                return toolCalls.find(toolCall => toolCall?.id === activeToolContinuationToolCallId.value) || null;
            }
            return null;
        };

        const getToolCallReasoningParts = (toolCalls) => (Array.isArray(toolCalls) ? toolCalls : [])
            .map(item => String(item?.reasoning || '').trim())
            .filter(Boolean)
            .filter((text, index, items) => items.indexOf(text) === index);

        const getAssistantReasoningText = (message) => {
            const parts = [];
            const seen = new Set();
            const appendPart = (value) => {
                const text = String(value || '').trim();
                if (!text || seen.has(text)) return;
                seen.add(text);
                parts.push(text);
            };

            appendPart(message?.reasoning);
            getToolCallReasoningParts(message?.toolCalls).forEach(appendPart);
            return parts.join('\n\n');
        };

        const hasThinkingOrTools = (message) => {
            if (!message) return false;
            return !!(
                getAssistantReasoningText(message)
                || (Array.isArray(message.toolCalls) && message.toolCalls.length > 0)
                || (parseCot(message.content || '').cot)
            );
        };

        const isMessageThinkingOrRunning = (message) => {
            const isLast = chatHistory.value[chatHistory.value.length - 1] === message;
            if (isLast && isThinking.value) return true;
            if (getCurrentThinkingToolCall(message)) return true;
            const cotInfo = parseCot(message.content || '');
            if (isLast && isGenerating.value && cotInfo.cot && !cotInfo.isFinished) {
                return true;
            }
            return false;
        };

        const isThinkingSummaryOpen = (message) => {
            if (message?.isSummaryOpen !== undefined) return message.isSummaryOpen !== false;
            return isMessageThinkingOrRunning(message);
        };

        const toggleThinkingSummary = (message) => {
            if (!message) return;
            message.isSummaryOpen = !isThinkingSummaryOpen(message);
            saveChatHistoryNow();
        };

        const markThinkingSummaryDetailOpened = (message, event) => {
            if (!message || !event?.target?.open) return;
            message.hasOpenedSummaryDetail = true;
            if (message.isSummaryOpen === undefined && isMessageThinkingOrRunning(message)) {
                message.isSummaryOpen = true;
            }
            saveChatHistoryNow();
        };

        const getToolCallStepText = (toolCall) => {
            const modeText = getToolCallModeText(toolCall);
            return `${modeText}: ${toolCall.query}`;
        };

        const getTimelineCharCount = (text) => Array.from(String(text || '')).length;

        const getTimelineSteps = (message) => {
            const steps = [];
            const isLastMessage = chatHistory.value[chatHistory.value.length - 1] === message;
            const isGeneratingMessage = isLastMessage && isGenerating.value;
            const cotInfo = parseCot(message.content || '');

            // 1. 初始原生思考
            const reasoningText = getAssistantReasoningText(message);
            if (reasoningText) {
                steps.push({
                    id: 'init-reasoning',
                    type: 'thinking',
                    text: reasoningText,
                    title: '原生思考',
                    charCount: getTimelineCharCount(reasoningText),
                    isLive: isLastMessage && isThinking.value
                });
            }

            // 2. 工具调用列表
            if (Array.isArray(message.toolCalls) && message.toolCalls.length > 0) {
                message.toolCalls.forEach((toolCall, idx) => {
                    const status = getToolCallEffectiveStatus(toolCall);
                    const reason = cleanActiveToolCallReason(toolCall?.reason);
                    if (reason) {
                        steps.push({
                            id: `tool-reason-${toolCall.id || idx}`,
                            type: 'thinking',
                            text: reason,
                            title: reason,
                            isReason: true
                        });
                    }
                    steps.push({
                        id: `tool-call-${toolCall.id || idx}`,
                        type: 'tool',
                        toolCall: toolCall,
                        title: getToolCallDisplayName(toolCall),
                        text: getToolCallStepText(toolCall),
                        status
                    });
                });
            }

            // 3. 分析过程 (CoT)
            const cotText = String(cotInfo.rawCot || '').trim();
            if (cotText) {
                steps.push({
                    id: 'cot-reasoning',
                    type: 'thinking',
                    text: cotText,
                    title: '分析过程',
                    charCount: getTimelineCharCount(cotText),
                    isLive: isGeneratingMessage && !cotInfo.isFinished
                });
            }

            return steps;
        };

        const handleActiveToolCallFromAssistant = async (assistantMessage, response, requestUis, requestTools, activeToolDepth) => {
            const toolAbort = new AbortController();
            activeToolQueueAbortController = toolAbort;
            activeToolQueueRunning.value = true;
            activeToolHandoffPending.value = false;
            const toolUis = [...requestUis.values()];
            try {
                if (activeToolDepth >= ACTIVE_TOOL_MAX_AUTO_CONTINUE) throw new Error('已达到本轮工具调用次数上限');
                activeToolMessages.push(response.assistantMessage);
                // 即使接口一次返回多个调用，也逐一配对结果；并发执行，按原始调用顺序追加。
                const records = await Promise.all(response.toolCalls.map(async (call, position) => {
                    const toolUi = requestUis.get(call.index ?? position);
                    const toolCall = parseNativeActiveToolCall(call, requestTools);
                    let payload;
                    try {
                        if (toolAbort.signal.aborted) throw createAbortReason();
                        if (position >= 5) throw new Error('单次最多执行 5 项工具调用');
                        if (toolCall.error) throw new Error(toolCall.error);
                        if (!getEnabledActiveTools().some(tool => tool.callName === call.function.name)) throw new Error('该工具已关闭');
                        toolUi.status = 'running';
                        const isRandom = toolCall.tool.type === ACTIVE_TOOL_RANDOM_TYPE;
                        const results = isRandom
                            ? [generateRandomResultForTool(toolCall)]
                            : isWebActiveTool(toolCall.tool)
                                ? await searchWebByTavilyForTool(toolCall.query, toolCall.tool, toolAbort.signal)
                                : searchDialogueByKeywordForTool(toolCall.query, toolCall.tool.resultCount, { excludeMessageId: assistantMessage.id });
                        if (toolAbort.signal.aborted) throw createAbortReason();
                        payload = {
                            status: results.length ? 'ok' : 'empty',
                            query: toolCall.query,
                            results,
                            ...(isRandom ? { operation: 'random' } : {}),
                            ...(results.tavilyMode ? { operation: results.tavilyMode } : {}),
                            ...(results.tavilyFailedResults?.length ? { failed_sources: results.tavilyFailedResults } : {})
                        };
                        toolUi.status = 'done';
                        toolUi.resultCount = results.length;
                    } catch (error) {
                        if (error.name === 'AbortError') throw error;
                        payload = { status: 'error', query: toolCall.query, error: error.message || '工具执行失败' };
                        toolUi.status = 'error';
                        toolUi.error = payload.error;
                    }
                    toolUi.resultText = JSON.stringify(payload, null, 2);
                    console.info('[工具调用]', { 工具: call.function.name, 状态: payload.status, 条数: toolUi.resultCount, ...(payload.error ? { 错误: payload.error } : {}) });
                    return { callId: call.id, payload };
                }));
                if (toolAbort.signal.aborted) throw createAbortReason();
                records.forEach(record => appendActiveToolResult(record.callId, record.payload));
                const continuationToolUi = toolUis[toolUis.length - 1];
                if (continuationToolUi.status !== 'error') continuationToolUi.status = 'continuing';
                activeToolQueueRunning.value = false;
                activeToolContinuationPending.value = true;
                await saveChatHistoryNow();
                if (toolAbort.signal.aborted) throw createAbortReason();
                await generateResponse(Date.now(), {
                    activeToolDepth: activeToolDepth + 1,
                    continueAssistantMessageId: assistantMessage.id,
                    continuationToolCallId: continuationToolUi.id
                });
                if (continuationToolUi.status === 'continuing') continuationToolUi.status = 'done';
                return true;
            } catch (error) {
                if (error.name === 'AbortError') {
                    markActiveToolInlineWorkCancelled();
                } else {
                    toolUis.filter(ui => TOOL_CALL_RUNNING_STATUSES.includes(ui.status)).forEach(ui => {
                        ui.status = 'error';
                        ui.error = error.message || '工具处理失败';
                    });
                    appendAssistantResponseError(assistantMessage, error.message || '工具处理失败');
                }
                return false;
            } finally {
                if (activeToolQueueAbortController === toolAbort) activeToolQueueAbortController = null;
                activeToolHandoffPending.value = false;
                activeToolQueueRunning.value = false;
                activeToolContinuationPending.value = false;
                await saveChatHistoryNow();
            }
        };

        const waitForMemoryConversationIdle = (signal) => new Promise(resolve => {
            if (!isConversationBusy.value || signal?.aborted) {
                resolve();
                return;
            }
            let stopWatching = () => { };
            const finish = () => {
                stopWatching();
                signal?.removeEventListener('abort', finish);
                resolve();
            };
            stopWatching = watch(isConversationBusy, busy => {
                if (!busy) finish();
            });
            signal?.addEventListener('abort', finish, { once: true });
        });

        const abortClassicBatchExtraction = () => {
            _classicExtractionEpoch++;
            if (_classicBatchExtractAbort) _classicBatchExtractAbort.abort();
            _classicBatchExtractAbort = null;
            _classicBatchRescanRequested = false;
            isClassicBatchExtracting.value = false;
            if (memoryBackfillProgress.value.status === 'running') {
                memoryBackfillProgress.value.status = 'stopped';
                memoryBackfillProgress.value.message = '已停止补录，已完成的记忆已保留。';
            }
        };

        const abortConversationBackgroundWork = () => {
            abortUiTemplateUpdate();
            abortClassicBatchExtraction();
        };

        const startClassicBatchMemoryExtraction = async (options = {}) => {
            const { manual = true } = options;
            if (isClassicBatchExtracting.value) return;
            memoryBackfillProgress.value = { status: 'running', message: '正在检查待补录记忆…', phase: '', stages: [] };
            const progress = memoryBackfillProgress.value;
            if (!currentCharacter.value || chatHistory.value.length === 0) {
                progress.status = 'done';
                progress.message = '当前没有可补录的对话。';
                return;
            }
            if (memorySettings.mode === MEMORY_MODE_ENHANCED && !getMemoryEmbeddingModel()) {
                progress.status = 'error';
                progress.message = '请先在记忆系统设置中选择向量模型。';
                return;
            }
            if (!String(memorySettings.classicModel || '').trim()) {
                progress.status = 'error';
                progress.message = '请先在记忆系统设置中选择总结模型。';
                return;
            }

            const batchController = new AbortController();
            _classicBatchExtractAbort = batchController;
            _classicBatchRescanRequested = false;
            isClassicBatchExtracting.value = true;
            progress.stages = [
                { key: 'summary', title: '逐轮总结', unit: '轮' },
                { key: 'vector', title: '向量记忆', unit: '条' },
                { key: 'secondary', title: '二次压缩', unit: '组' }
            ].map(stage => ({ ...stage, current: 0, total: 0, elapsedMs: 0 }));
            const stageProgress = key => {
                const stage = progress.stages.find(item => item.key === key);
                const previous = stage.current;
                const previousElapsed = stage.elapsedMs;
                const startedAt = Date.now();
                return (current, total) => {
                    if (!total || _classicBatchExtractAbort !== batchController || batchController.signal.aborted) return;
                    progress.phase = key;
                    progress.message = '';
                    stage.current = previous + current;
                    stage.total = previous + total;
                    stage.elapsedMs = previousElapsed + Date.now() - startedAt;
                };
            };

            let vectorSkippedNoSource = 0;
            const emptyTargets = new Set();
            try {
                while (_classicBatchExtractAbort === batchController && !batchController.signal.aborted) {
                    _classicBatchRescanRequested = false;
                    const snapshot = await ensureConversationMessageIds();
                    if (_classicBatchExtractAbort !== batchController || batchController.signal.aborted) return;
                    const safeTurnCount = isConversationBusy.value
                        ? Math.max(0, snapshot.turns.length - 1)
                        : snapshot.turns.length;
                    const coveredIds = new Set(classicMemories.value.flatMap(memory => memory.sourceAssistantIds || []));
                    const coveredTurns = new Set(classicMemories.value.map(memory => Number(memory.turn)));
                    const jobs = [];
                    for (let index = 0; index < safeTurnCount; index++) {
                        const job = buildClassicSummaryJob(snapshot, index, false);
                        if (job && !emptyTargets.has(job.key) && !(job.sourceAssistantIds.length
                            ? job.sourceAssistantIds.some(id => coveredIds.has(id)) : coveredTurns.has(job.turn))) jobs.push(job);
                        if (index % 128 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 0));
                            if (_classicBatchExtractAbort !== batchController || batchController.signal.aborted) return;
                        }
                    }
                    const remaining = {
                        summary: jobs.length,
                        vector: memorySettings.mode === MEMORY_MODE_ENHANCED
                            ? getSummaryEmbeddingJobs(snapshot).length + jobs.length : 0,
                        secondary: getEligibleClassicSecondaryGroups(safeTurnCount, [...classicMemories.value, ...jobs]).length
                    };
                    progress.stages.forEach(stage => { stage.total = stage.current + remaining[stage.key]; });
                    const reportSummary = stageProgress('summary');
                    let summarized = 0;
                    reportSummary(0, jobs.length);

                    const runClassicJob = async target => {
                        const job = buildClassicSummaryJob(snapshot, target.index);
                        if (!job) {
                            emptyTargets.add(target.key);
                            reportSummary(++summarized, jobs.length);
                            return { job: target, added: false };
                        }
                        try {
                            const added = await generateAndStoreClassicMemory(job, batchController.signal);
                            if (added || hasClassicMemoryForJob(job)) reportSummary(++summarized, jobs.length);
                            return { job, added };
                        } catch (error) {
                            return { job: { ...job, index: target.index }, error };
                        }
                    };
                    const concurrency = normalizeClassicMemoryConcurrency(memorySettings.classicConcurrency);
                    for (let offset = 0; offset < jobs.length; offset += concurrency) {
                        if (_classicBatchExtractAbort !== batchController || batchController.signal.aborted) break;
                        const group = jobs.slice(offset, offset + concurrency);
                        const results = await Promise.all(group.map(runClassicJob));
                        if (_classicBatchExtractAbort !== batchController || batchController.signal.aborted) break;

                        if (results.some(result => result.added)) await saveClassicMemoriesNow();
                        for (const failed of results.filter(result => result.error)) {
                            if (!manual) throw failed.error;
                            let retryError = failed.error;
                            while (true) {
                                if (retryError.name === 'AbortError') throw retryError;
                                const retry = await showVueConfirmModal(
                                    '基础模式补录遇到错误',
                                    `第 ${failed.job.turn} 轮生成失败：\n${retryError.message}\n\n是否立即重试？`
                                );
                                if (_classicBatchExtractAbort !== batchController || batchController.signal.aborted) return;
                                if (!retry) throw retryError;
                                const retryResult = await runClassicJob(failed.job);
                                if (!retryResult.error) {
                                    if (retryResult.added) {
                                        await saveClassicMemoriesNow();
                                    }
                                    break;
                                }
                                retryError = retryResult.error;
                            }
                        }
                    }

                    if (isConversationBusy.value) {
                        progress.message = '等待当前回复结束后继续补录。';
                        await waitForMemoryConversationIdle(batchController.signal);
                        continue;
                    }
                    const currentTurnCount = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false }).turns.length;
                    if (jobs.length > 0 || _classicBatchRescanRequested || currentTurnCount !== safeTurnCount) continue;
                    if (memorySettings.mode === MEMORY_MODE_ENHANCED) {
                        const indexed = await indexSummaryMemories(snapshot, batchController.signal, undefined,
                            stageProgress('vector'));
                        // 缺原文的条目不占任务名额，也不该无声消失：累计后在收尾里单独说一句。
                        vectorSkippedNoSource = indexed.skippedNoSource;
                    }
                    if (_classicBatchExtractAbort !== batchController || batchController.signal.aborted) break;
                    await compressEligibleClassicMemories(
                        currentTurnCount,
                        batchController.signal,
                        manual,
                        stageProgress('secondary')
                    );
                    if (_classicBatchExtractAbort !== batchController || batchController.signal.aborted) break;
                    if (isConversationBusy.value) {
                        progress.message = '等待当前回复结束后继续补录。';
                        await waitForMemoryConversationIdle(batchController.signal);
                        continue;
                    }
                    const finalTurnCount = buildConversationTurnSnapshot(
                        chatHistory.value,
                        { includeSystem: false }
                    ).turns.length;
                    if (_classicBatchRescanRequested || finalTurnCount !== currentTurnCount) continue;
                    break;
                }

                if (_classicBatchExtractAbort === batchController) {
                    const incomplete = progress.stages.some(stage => stage.current < stage.total);
                    progress.status = incomplete ? 'error' : 'done';
                    const noSourceNote = vectorSkippedNoSource > 0
                        ? `${vectorSkippedNoSource} 条总结找不到对应原文，未建立向量；补齐对话后可再次补录。` : '';
                    progress.message = incomplete ? '部分任务未完成，已完成的记忆已保留，可再次补录。'
                        : noSourceNote || (progress.stages.some(stage => stage.total > 0) ? '' : '当前没有需要补录的记忆。');
                }
            } catch (error) {
                if (_classicBatchExtractAbort !== batchController) return;
                progress.status = error.name === 'AbortError' ? 'stopped' : 'error';
                progress.message = error.name === 'AbortError' ? '已停止补录，已完成的记忆已保留。'
                    : `补录未完成：${error.message}。已完成的记忆已保留。`;
                if (error.name !== 'AbortError') console.error('[记忆补录] 失败：', error.message);
            } finally {
                if (_classicBatchExtractAbort === batchController) {
                    _classicBatchExtractAbort = null;
                    isClassicBatchExtracting.value = false;
                }
            }
        };

        const startAutomaticMemoryPatrol = () => {
            if (!memorySettings.enabled || !currentCharacter.value || !_classicMemoriesLoaded) return Promise.resolve(false);
            if (isClassicBatchExtracting.value) {
                _classicBatchRescanRequested = true;
                return Promise.resolve(false);
            }
            return startClassicBatchMemoryExtraction({ manual: false });
        };

        const startBatchMemoryExtraction = () => {
            showMemoryBackfillModal.value = true;
            return startClassicBatchMemoryExtraction({ manual: true });
        };

        watch(() => [memorySettings.enabled, memorySettings.mode, memorySettings.classicModel, memorySettings.embeddingModel, settings.apiUrl], () => {
            abortClassicBatchExtraction();
        });

        // Character Management
        const createNewCharacter = () => {
            editingCharacter.id = undefined;
            editingCharacter.data = {
                name: 'New Character',
                description: '',
                first_mes: 'Hello!',
                avatar: defaultAvatar,
                personality: '',
                mes_example: '',
                uuid: generateUUID(),
                createdAt: Date.now(),
                uiTemplates: []
            };
            editorTab.value = 'basic';
            showCharacterEditor.value = true;
        };

        const editCharacter = async (index) => {
            let char = characters.value[index];
            if (!char) {
                console.error('Invalid character index:', index);
                return;
            }
            try {
                char = await window.RPHubStorage.readCharacter(char);
                editingCharacter.id = index;
                editingCharacter.data = JSON.parse(JSON.stringify(char));
                editorTab.value = 'basic';
                showCharacterEditor.value = true;
            } catch (error) { showToast(error.message, 'error'); }
        };
        watch(showCharacterEditor, opened => {
            if (!opened) editingCharacter.data = {};
        });
        watch(showUiTemplateEditor, opened => {
            if (!opened) editingUiTemplate.data = {};
        });

        const saveCharacter = async () => {
            const characterRegexScripts = (editingCharacter.data.regexScripts || [])
                .map(script => normalizeRegexScript({ ...script, scope: 'character' }, 'character'))
                .filter(script => script.scope !== 'global');
            const normalizedCharacterData = {
                ...editingCharacter.data,
                regexScripts: characterRegexScripts,
                uiTemplates: (editingCharacter.data.uiTemplates || []).map(template => normalizeUiTemplate({ ...template, scope: 'character' }))
            };
            delete normalizedCharacterData.scenario;
            const previous = characters.value.slice();
            try {
                const index = editingCharacter.id ?? characters.value.length;
                characters.value[index] = normalizedCharacterData;
                await saveCharactersNow();
                if (index !== currentCharacterIndex.value)
                    characters.value[index] = await window.RPHubStorage.toCharacterStub(normalizedCharacterData);
                showCharacterEditor.value = false;
                showToast('角色已保存', 'success');
            } catch (error) {
                if (!error.committed) characters.value = previous;
                showToast('角色保存未完成，请重试：' + error.message, 'error');
            }
        };

        const createUiTemplate = () => {
            editingUiTemplate.id = undefined;
            editingUiTemplate.tab = 'edit';
            const data = normalizeUiTemplate({ scope: resourceScope.value });
            editingUiTemplate.data = {
                ...data,
                previewVariableState: cloneUiObject(data.initialVariableState || data.variableState),
                variableStateText: JSON.stringify(data.initialVariableState || data.variableState, null, 2),
                variableSchemaText: stringifyUiSchema(data.variableSchema)
            };
            showUiTemplateEditor.value = true;
        };

        const editUiTemplate = (index) => {
            const template = currentUiTemplates.value[index];
            if (!template) return;
            editingUiTemplate.id = template.id;
            editingUiTemplate.tab = 'history';
            const data = normalizeUiTemplate(JSON.parse(JSON.stringify(template)));
            editingUiTemplate.data = {
                ...data,
                previewVariableState: cloneUiObject(data.initialVariableState || data.variableState),
                variableStateText: JSON.stringify(data.initialVariableState || data.variableState || {}, null, 2),
                variableSchemaText: stringifyUiSchema(data.variableSchema)
            };
            showUiTemplateEditor.value = true;
        };

        const saveUiTemplate = () => {
            if (!currentCharacter.value && editingUiTemplate.data.scope !== 'global') return;
            let initialVariableState = {};
            try {
                initialVariableState = JSON.parse(editingUiTemplate.data.variableStateText || '{}');
            } catch (e) {
                showToast('变量 JSON 格式不正确', 'error');
                return;
            }
            let variableSchema = '';
            const schemaText = (editingUiTemplate.data.variableSchemaText || '').trim();
            if (schemaText) {
                try {
                    variableSchema = JSON.parse(schemaText);
                } catch (e) {
                    variableSchema = schemaText;
                }
            }
            const existingTemplate = editingUiTemplate.id !== undefined ? currentUiTemplates.value.find(template => template.id === editingUiTemplate.id) : null;
            const runtimeVariableState = existingTemplate ? cloneUiObject(existingTemplate.variableState || initialVariableState) : initialVariableState;
            const template = normalizeUiTemplate({
                ...editingUiTemplate.data,
                initialVariableState,
                variableState: runtimeVariableState,
                variableSchema
            });
            delete template.variableStateText;
            delete template.variableSchemaText;
            delete template.previewVariableState;
            if (editingUiTemplate.id !== undefined) {
                const oldScope = existingTemplate?.scope || 'character';
                const oldList = getUiTemplateListByScope(oldScope);
                const oldIndex = oldList.findIndex(item => item.id === editingUiTemplate.id);
                if (oldIndex !== -1) oldList.splice(oldIndex, 1);
            }
            const list = getUiTemplateListByScope(template.scope);
            const targetIndex = list.findIndex(item => item.id === template.id);
            if (targetIndex !== -1) {
                list[targetIndex] = template;
            } else {
                list.push(template);
            }
            showUiTemplateEditor.value = false;
            saveData({ saveMemories: false });
            showToast('UI模板已保存', 'success');
        };

        const deleteUiTemplate = (index) => {
            confirmAction('确定要删除这个UI模板吗？此操作无法撤销。', () => {
                const template = currentUiTemplates.value[index];
                const list = getUiTemplateListByScope(template?.scope);
                const targetIndex = list.findIndex(item => item.id === template?.id);
                if (targetIndex !== -1) list.splice(targetIndex, 1);
                saveData();
                showToast('UI模板已删除', 'success');
            });
        };

        const downloadJsonFile = (data, fileName) => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
            cardUtils.downloadBlob(blob, fileName);
        };

        const readJsonFileInput = (event, handleData, handleError) => {
            const input = event.target;
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async ({ target }) => {
                try {
                    await handleData(JSON.parse(target.result));
                } catch (error) {
                    handleError(error);
                } finally {
                    input.value = '';
                }
            };
            reader.onerror = () => {
                handleError(reader.error || new Error('读取文件失败'));
                input.value = '';
            };
            reader.readAsText(file);
        };

        const importUiTemplates = (event) => readJsonFileInput(event, data => {
            const templates = Array.isArray(data) ? data : (Array.isArray(data.templates) ? data.templates : []);
            if (!templates.length) throw new Error('未找到模板数组');
            const normalized = templates.map(t => {
                const cleanTemplate = sanitizeUiTemplateImportEntry(t);
                return normalizeUiTemplate({ ...cleanTemplate, scope: resourceScope.value, id: generateUUID(), enabled: cleanTemplate.enabled === true });
            });
            const globalTemplates = normalized.filter(template => template.scope === 'global');
            const characterTemplates = normalized.filter(template => template.scope !== 'global');
            if (characterTemplates.length && !currentCharacter.value) {
                showToast('绑定角色卡的模板需要先选择角色卡', 'warning');
                return;
            }
            ensureGlobalUiTemplates().push(...globalTemplates);
            ensureCurrentUiTemplates().push(...characterTemplates);
            saveData();
            showToast(`成功导入 ${normalized.length} 个UI模板`, 'success');
        }, error => showToast(`UI模板导入失败: ${error.message}`, 'error'));

        const deleteCharacterData = async (char, legacyIndex, knownStorageKeys = null) => {
            if (!getMainDb()) await initDB();
            let savedBranches = null;
            if (char.uuid) {
                try { savedBranches = await getScopedStoredValue('branches', char.uuid); } catch (_) { }
            }
            const branchList = currentCharacter.value?.uuid === char.uuid
                ? storyBranches.value
                : (Array.isArray(savedBranches?.branches) ? savedBranches.branches : []);
            const branchScopeIds = new Set(branchList
                .filter(branch => branch?.id && branch.id !== STORY_BRANCH_MAIN_ID)
                .map(branch => getStoryBranchScopeId(char.uuid, branch.id)));
            if (char.uuid) {
                const storageKeys = knownStorageKeys || (await Promise.all([
                    readStorageKeys(getMainDb()),
                    readStorageKeys(getLegacyDb())
                ])).flat();
                storageKeys.forEach(key => {
                    const logicalKey = getStorageLogicalKey(key);
                    const storageName = CHARACTER_SCOPED_STORAGE_NAMES
                        .find(name => logicalKey.startsWith(`${name}_`));
                    const scopeId = storageName ? logicalKey.slice(storageName.length + 1) : '';
                    if (scopeId && getStoryBranchOwnerId(scopeId) === char.uuid && scopeId !== char.uuid) {
                        branchScopeIds.add(scopeId);
                    }
                });
            }
            const allBranchScopeIds = [...branchScopeIds];
            const ids = [...new Set([char.uuid, legacyIndex, ...allBranchScopeIds].filter(id => id !== undefined && id !== null))];
            await Promise.all(ids.flatMap(id => CHARACTER_SCOPED_STORAGE_NAMES
                .map(name => deleteScopedStoredValue(name, id))));

            if (!char.uuid) return;
            ensureGlobalUiTemplates().forEach(template => {
                if (!template.runtimeByCharacter) return;
                [char.uuid, ...allBranchScopeIds].forEach(scopeId => delete template.runtimeByCharacter[scopeId]);
            });
        };

        const finishCharacterDeletion = async () => {
            await Promise.all([
                saveCharactersNow(),
                saveMemorySettingsNow(),
                setStoredValue('global_ui_templates', globalUiTemplates.value),
                currentCharacterIndex.value >= 0
                    ? setStoredValue('last_active_char', currentCharacterIndex.value)
                    : deleteStoredValue('last_active_char')
            ]);
        };

        const stopCurrentCharacterWork = async () => {
            if (isConversationBusy.value) {
                stopGeneration();
                if (!await waitForConversationIdle()) {
                    showToast('正在停止生成，请稍后再删除角色', 'warning');
                    return false;
                }
            }
            await flushPendingChatHistorySave();
            abortConversationBackgroundWork();
            return true;
        };

        const clearCurrentCharacterData = () => {
            _characterSwitchEpoch++;
            currentCharacterIndex.value = -1;
            chatHistory.value = [];
            classicMemories.value = [];
            storyBranches.value = [];
            activeStoryBranchId.value = STORY_BRANCH_MAIN_ID;
            selectedStoryBranchId.value = STORY_BRANCH_MAIN_ID;
            storyRouteDragState = null;
            storyRouteMapDragging.value = false;
            suppressStoryRouteNodeClick = false;
            showStoryBranchModal.value = false;
            _classicMemoriesLoaded = false;
            // 角色上下文已卸载：连同已提交基线一起清掉，避免下次加载前被当成可用基线
            _b1MemoryState = null;
            _b1MemoryViewKey = '';
            releaseCharacterRuntime();
        };

        const deleteCharacter = (index) => {
            confirmAction('确定要删除这个角色吗？此操作无法撤销。', async () => {
                try {
                    const char = characters.value[index];
                    if (!char) return;
                    const isCurrent = currentCharacterIndex.value === index;
                    if (isCurrent && !await stopCurrentCharacterWork()) return;

                    await deleteCharacterData(char, index);

                    suspendCharacterAutoSave = true;
                    characters.value.splice(index, 1);
                    if (isCurrent) {
                        clearCurrentCharacterData();
                    } else if (currentCharacterIndex.value > index) {
                        currentCharacterIndex.value--;
                    }
                    await finishCharacterDeletion();
                    showToast('角色已删除', 'success');
                } catch (err) {
                    console.error('Failed to delete character or associated data:', err);
                    showToast('删除角色失败', 'error');
                } finally {
                    suspendCharacterAutoSave = false;
                }
            });
        };

        const toggleCharacterFavorite = (index) => {
            const char = characters.value[index];
            if (!char) return;

            if (isCharacterFavorite(char)) {
                const { favoriteAt, ...characterData } = char;
                characters.value[index] = characterData;
                showToast('已取消收藏', 'info');
            } else {
                characters.value[index] = {
                    ...char,
                    favoriteAt: Date.now()
                };
                showToast('已收藏角色卡', 'success');
            }
            saveCharactersNow().catch(error => {
                console.error('Save character favorite failed:', error);
                showToast('收藏状态保存失败', 'error');
            });
        };

        const toggleBatchDeleteMode = () => {
            isBatchDeleteMode.value = !isBatchDeleteMode.value;
            selectedCharacterIndices.value.clear();
        };

        const toggleCharacterSelection = (index) => {
            if (selectedCharacterIndices.value.has(index)) {
                selectedCharacterIndices.value.delete(index);
            } else {
                selectedCharacterIndices.value.add(index);
            }
        };

        const batchDeleteCharacters = () => {
            if (selectedCharacterIndices.value.size === 0) return;

            confirmAction(`确定要删除选中的 ${selectedCharacterIndices.value.size} 个角色吗？此操作无法撤销。`, async () => {
                try {
                    const currentUUID = currentCharacter.value ? currentCharacter.value.uuid : null;
                    const indices = Array.from(selectedCharacterIndices.value).sort((a, b) => b - a);
                    const deletingCurrent = indices.includes(currentCharacterIndex.value);
                    if (deletingCurrent && !await stopCurrentCharacterWork()) return;
                    if (!getMainDb()) await initDB();
                    const storageKeys = (await Promise.all([
                        readStorageKeys(getMainDb()),
                        readStorageKeys(getLegacyDb())
                    ])).flat();

                    suspendCharacterAutoSave = true;
                    for (const index of indices) {
                        const char = characters.value[index];
                        if (!char) continue;
                        await deleteCharacterData(char, index, storageKeys);
                        characters.value.splice(index, 1);
                    }

                    if (deletingCurrent) {
                        clearCurrentCharacterData();
                    } else if (currentUUID) {
                        const newIndex = characters.value.findIndex(c => c.uuid === currentUUID);
                        currentCharacterIndex.value = newIndex;
                    } else {
                        currentCharacterIndex.value = -1;
                    }

                    await finishCharacterDeletion();
                    showToast('删除成功', 'success');
                    toggleBatchDeleteMode();
                } catch (err) {
                    console.error('Batch delete failed:', err);
                    showToast('删除失败', 'error');
                } finally {
                    suspendCharacterAutoSave = false;
                }
            });
        };

        const enforceSpecialRules = () => {
            const imageGenToken = imageApi.selectedId === 'builtin' ? settings.imageGenKey.trim() : '';
            const baseUrl = IMAGE_GEN_BASE_URL;

            // 1. NAI画图正则 (统一版本)
            const imageGenRegexName = 'NAI画图正则';
            const targetArtists = cardUtils.getImageStyleArtists(settings.imageStyle, settings.customImageArtists);

            const userNegativePrompt = cardUtils.normalizeCustomNegatives(settings.customImageArtists);
            const encodedUserNegativePrefix = userNegativePrompt ? encodeURIComponent(userNegativePrompt) + ',' : '';

            const encodedTargetArtists = encodeURIComponent(targetArtists);
            const imageRequestUrl = `${baseUrl}/generate?tag=$1&token=${encodeURIComponent(imageGenToken)}&model=${settings.imageModel}&artist=${encodedTargetArtists}&size=${settings.imageSize}&steps=40&scale=6&cfg=0&sampler=k_dpmpp_2m_sde&negative=${encodedUserNegativePrefix}{{{{bad anatomy}}}},{bad feet},bad hands,{{{bad proportions}}},{blurry},cloned face,cropped,{{{deformed}}},{{{disfigured}}},error,{{{extra arms}}},{extra digit},{{{extra legs}}},extra limbs,{{extra limbs}},{fewer digits},{{{fused fingers}}},gross proportions,ink eyes,ink hair,jpeg artifacts,{{{{long neck}}}},low quality,{malformed limbs},{{missing arms}},{missing fingers}},{{missing legs}},{{{more than 2 nipples}}},mutated hands,{{{mutation}}},normal quality,owres,{{poorly drawn face}},{{poorly drawn hands}},reen eyes,signature,text,{{too many fingers}},{{{ugly}}},username,uta,watermark,worst quality,{{{more than 2 legs}}},awkward hand sign,weird hand gesture,contorted hand,unnatural finger pose,deformed hand gesture,{shaka},{hang loose},{{rock on}},{shaka sign}&nocache=0&noise_schedule=karras`;
            const imageGenRegexContent = {
                name: imageGenRegexName,
                regex: getImageTagRegex().toString(),
            replacement: `<div class="generated-image-card is-generating" data-image-request="${imageRequestUrl}" style="width:100%;height:auto;max-width:100%;box-sizing:border-box;padding:2px;border:1px solid rgba(255,255,255,.58);background:transparent;position:relative;border-radius:12px;overflow:hidden;display:flex;justify-content:center;align-items:center;box-shadow:0 4px 14px rgba(148,163,184,.06)"><img alt="" style="max-width:100%;height:100%;width:100%;display:block;object-fit:contain;border-radius:9px;transition:transform .3s ease"><div class="generated-image-progress" aria-live="polite"><svg class="generated-image-spinner" viewBox="0 0 50 50" aria-hidden="true"><circle class="generated-image-spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="2"></circle></svg><span class="generated-image-progress-label">等待生成</span><span class="generated-image-progress-track"><i class="generated-image-progress-bar"></i></span></div><button type="button" class="generated-image-reroll" title="重新生成图片" aria-label="重新生成图片"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div>`,
                placement: [2],
                markdownOnly: true,
                promptOnly: false,
                scope: 'global',
                enabled: false // Default closed
            };
            // 查找当前是否已存在新命名的正则
            const newRegexIndex = regexScripts.value.findIndex(r => r.name === imageGenRegexName);

            if (newRegexIndex !== -1) {
                // 如果已存在，保留目前的启用状态并更新内容
                imageGenRegexContent.enabled = regexScripts.value[newRegexIndex].enabled;
                regexScripts.value.splice(newRegexIndex, 1);
            }

            // 添加新的到首位
            regexScripts.value.unshift(imageGenRegexContent);

            // 2. 自动生图世界书
            const autoImageGenWIName = '自动生图';
            const imageGenCount = Math.min(8, Math.max(2, Number(settings.imageGenCount) || 2));
            const autoImageGenWIContent = {
                comment: autoImageGenWIName,
                keys: [],
                content: BUILTIN_PROMPTS.buildAutoImageGenPrompt(imageGenCount),
                constant: true,
                enabled: false, // Default closed
                scope: 'global',
                position: 'at_depth',
                depth: 4,
                order: 100,
                useProbability: false,
                probability: 100
            };

            const wiIndex = worldInfo.value.findIndex(w => w.comment === autoImageGenWIName);
            if (wiIndex !== -1) {
                const existing = worldInfo.value[wiIndex];
                if (existing.customContent !== true) existing.content = autoImageGenWIContent.content;
            } else {
                worldInfo.value.unshift(autoImageGenWIContent);
            }

        };

        watch(() => settings.imageGenKey, () => {
            enforceSpecialRules();
            if (isAutoImageGenEnabled.value) {
                updateImageGenRegexState({ enableRegex: true });
            }
            // [rphub 2.8.115] 初始化窗口内只重建内存态，不落库。
            //   此刻 worldInfo 还没从库加载，enforceSpecialRules() 会在空表上重建
            //   默认关闭的两条规则；这里若调 saveData()（无参 = 全量）就会把它写进库。
            //   内存里这份重建随后会被 loadData 的 worldInfo 赋值整体替换，无需清理。
            //   保留 enforceSpecialRules 调用是为了新装用户也能拿到这两个条目，
            //   只是不让它在初始化期间污染存档。
            if (!_initComplete) return;
            if (imageApi.ready && imageApi.current.key !== settings.imageGenKey)
                imageApi.update('key', settings.imageGenKey);
            fetchQuota();
        });

        const prepareLoadedChatHistoryForDisplay = (messages = []) => messages
            .filter(msg => msg !== null && msg !== undefined)
            .map(msg => {
                // [rphub 2.8.16] 编辑态是瞬态 UI 状态，不该跨会话存活。
                // 官网 saveChatHistoryNow 用 cloneForStorage(history) 全量落库、不剥离 isEditing_Message，
                // 本函数加载时也不清理 ⇒ 一旦落库，isAnyMessageEditing 恒为 true，
                // 输入栏被 v-show 永久隐藏且用户找不到自救入口（用户实测只能删聊天记录）。
                // 在加载路径做复位，历史库里已存在的脏标志也能被清掉。
                if (msg.isEditing_Message) {
                    delete msg.isEditing_Message;
                    delete msg.editMessageContent;
                    delete msg.editMessageHeight;
                    delete msg.originalCot;
                    delete msg.originalUiTemplateUpdate;
                    delete msg.originalEditMessageContent;
                }
                if (msg.isSelf === undefined) {
                    msg.isSelf = msg.role === 'user';
                }
                if (msg.role === 'user' || msg.role === 'assistant') {
                    delete msg.skipReveal;
                    msg.shouldAnimate = true;
                }
                if (msg.role === 'assistant' && msg.isSummaryOpen === undefined && hasThinkingOrTools(msg)) {
                    msg.isSummaryOpen = false;
                }
                if (msg.role === 'assistant' && Array.isArray(msg.styleFilterHits)) {
                    msg.styleFilterHits = msg.styleFilterHits
                        .map(normalizeStyleFilterHit)
                        .filter(Boolean);
                    if (!msg.styleFilterHits.length) delete msg.styleFilterHits;
                } else {
                    delete msg.styleFilterHits;
                }
                return msg;
            });

        const createInitialChatHistory = (char) => char?.first_mes ? [{
            role: 'assistant',
            name: char.name,
            content: char.first_mes
        }] : [];

        const getStoredChatHistoryWithRetry = async (id) => {
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    return await getScopedStoredValue('chat', id);
                } catch (error) {
                    if (attempt === 3 || !isRetryableChatStorageError(error)) throw error;
                    await new Promise(resolve => setTimeout(resolve, attempt * 250));
                }
            }
        };

        const loadStoredChatHistory = async (char, fallbackIndex = null, storyScopeId = char?.uuid) => {
            let savedChat = await getStoredChatHistoryWithRetry(storyScopeId);
            if (savedChat === undefined && storyScopeId === char?.uuid && Number.isInteger(fallbackIndex)) {
                savedChat = await getStoredChatHistoryWithRetry(fallbackIndex);
            }
            if (savedChat === undefined) {
                // [rphub 2.8.93] 记下「本 scope 读到空」，禁止后续自动保存把开场白写回库
                _chatScopePristineRead.add(storyScopeId);
                console.warn('[ChatScope] 读取为空（无条目），已阻止自动回写 | scope=' + storyScopeId);
                return createInitialChatHistory(char);
            }
            if (!Array.isArray(savedChat)) {
                throw new TypeError('保存的聊天记录格式不是数组');
            }
            if (savedChat.some(message => message !== null && (typeof message !== 'object' || Array.isArray(message)))) {
                throw new TypeError('保存的聊天记录包含无效消息');
            }
            if (savedChat.length > 0) {
                _chatScopePristineRead.delete(storyScopeId);
                return prepareLoadedChatHistoryForDisplay(savedChat);
            }
            // [rphub 2.8.93] 有条目但为空数组：与「无条目」同等对待，登记后禁止回写
            _chatScopePristineRead.add(storyScopeId);
            console.warn('[ChatScope] 读取为空（空数组），已阻止自动回写 | scope=' + storyScopeId);
            return createInitialChatHistory(char);
        };

        const saveStoryBranchesForCharacter = async (char = currentCharacter.value, branchState = {}) => {
            if (!char?.uuid) return;
            if (!getMainDb()) await initDB();
            await setScopedStoredValue('branches', char.uuid, {
                version: 1,
                activeBranchId: branchState.activeBranchId ?? activeStoryBranchId.value,
                branches: cloneForStorage(branchState.branches ?? storyBranches.value)
            }, { clone: false });
        };

        const saveStoryBranchesAndRuntime = (char, branchState) => Promise.all([
            saveStoryBranchesForCharacter(char, branchState),
            saveMemorySettingsNow(),
            setStoredValue('global_ui_templates', globalUiTemplates.value),
            saveCharactersNow()
        ]);

        const readStoryBranchesForCharacter = async (char) => {
            if (!getMainDb()) await initDB();
            const saved = await getScopedStoredValue('branches', char.uuid);
            const branches = normalizeStoryBranches(char, saved);
            const requestedActiveId = String(saved?.activeBranchId || STORY_BRANCH_MAIN_ID);
            // [rphub 2.8.106] 回退主线过去是完全静默的：分支被删或键损坏时表现就是「记录没了」。
            //   这里只加日志不改行为，但当这类事故再发生时，日志能直接看到请求了哪个 id、现有哪几个。
            const requestedBranchExists = branches.some(branch => branch.id === requestedActiveId);
            if (!requestedBranchExists) {
                console.warn('[StoryBranch] activeBranchId 指向不存在的分支，已回退主线 | char=' + (char && char.uuid)
                    + ' | 请求=' + requestedActiveId
                    + ' | 现有=' + branches.map(branch => branch.id).join(','));
            }
            const activeBranchId = requestedBranchExists ? requestedActiveId : STORY_BRANCH_MAIN_ID;
            const mainNameWasChanged = saved?.branches?.some(branch => (
                String(branch?.id) === STORY_BRANCH_MAIN_ID && branch?.name !== '主线'
            ));
            if (!saved || mainNameWasChanged) {
                await saveStoryBranchesForCharacter(char, { activeBranchId, branches });
            }
            return { activeBranchId, branches };
        };

        // [rphub 2.8.106] 当前分支读出来是空的，就看看别的分支还有没有记录。
        //   存在的理由：樱见学园那次 183 条一直躺在分支 1，界面打开却是空的，
        //   全应用没有任何一处告诉用户「东西还在，只是不在当前分支」。
        //   只读分支摘要（messageCount / floorCount，由 updateCurrentStoryBranchSummary 写入），
        //   不去读聊天本体 —— getScopedStoredValue('chat', ...) 会把整份聊天反序列化进内存，
        //   而这里只需要一个「有没有内容」。摘要滞后只会让条数偏小，不会把有读成无，
        //   最坏情况是少一次提示，等于现状。
        const findRecoverableBranchHistory = async (char, branchState, loadedHistory) => {
            if (Array.isArray(loadedHistory) && loadedHistory.length > 0) return null;
            if (!char || !char.uuid || !Array.isArray(branchState && branchState.branches)) return null;
            const candidates = branchState.branches.filter(branch => branch && branch.id && branch.id !== branchState.activeBranchId);
            let best = null;
            for (let i = 0; i < candidates.length; i++) {
                const branch = candidates[i];
                const count = Math.max(Number(branch.messageCount) || 0, Number(branch.floorCount) || 0);
                if (count > 0 && (!best || count > best.count)) {
                    best = { branchId: branch.id, name: branch.name || branch.id, count };
                }
            }
            return best;
        };

        const loadStoryBranchesForCharacter = async (char) => {
            const branchState = await readStoryBranchesForCharacter(char);
            storyBranches.value = branchState.branches;
            activeStoryBranchId.value = branchState.activeBranchId;
        };

        const updateCurrentStoryBranchSummary = () => {
            const branch = storyBranches.value.find(item => item.id === activeStoryBranchId.value);
            if (!branch) return;
            branch.updatedAt = Date.now();
            branch.floorCount = countChatFloors(chatHistory.value);
            branch.messageCount = chatHistory.value.filter(message => ['user', 'assistant'].includes(message?.role)).length;
            branch.wordCount = getConversationBodyLength(chatHistory.value);
        };

        const clearStoryBranchTransientContext = () => {
            lastContextMessages.value = [];
            lastTriggeredWorldInfos.value = [];
            resetActiveToolResultContext();
        };

        const saveCurrentStoryBranchState = async (switchEpoch = null) => {
            readerSession.capture();
            const char = currentCharacter.value;
            const storyScopeId = getCurrentStoryBranchScopeId();
            if (!char?.uuid || !storyScopeId) return true;
            const isCurrentRequest = () => switchEpoch === null || switchEpoch === _characterSwitchEpoch;
            if (retryingClassicMemoryId.value) {
                showToast('请等待当前总结记忆重试完成后再切换分支', 'warning');
                return false;
            }
            if (isConversationBusy.value) {
                stopGeneration();
                const stopped = await waitForConversationIdle();
                if (!stopped) {
                    showToast('正在停止生成，请稍后再切换分支', 'warning');
                    return false;
                }
            }
            if (!isCurrentRequest()) return false;
            abortConversationBackgroundWork();
            await flushPendingChatHistorySave();
            if (!isCurrentRequest()) return false;
            updateCurrentStoryBranchSummary();
            const historySource = chatHistory.value;
            const classicMemorySource = classicMemories.value;
            const branchState = {
                activeBranchId: activeStoryBranchId.value,
                branches: cloneForStorage(storyBranches.value)
            };
            saveGlobalUiTemplateRuntimeForCharacter();
            if (!await saveChatHistoryNow(storyScopeId, historySource)) return false;
            await saveClassicMemoriesNow(storyScopeId, classicMemorySource);
            if (!isCurrentRequest()) return false;
            await saveStoryBranchesAndRuntime(char, branchState);
            return true;
        };

        const selectStoryBranchNode = (branchId) => {
            if (!storyBranches.value.some(branch => branch.id === branchId)) return;
            selectedStoryBranchId.value = branchId;
        };

        const openStoryBranchNameEditor = () => {
            const target = storyBranches.value.find(branch => branch.id === selectedStoryBranchId.value);
            if (!target || storyBranchSwitching.value) return;
            if (target.id === STORY_BRANCH_MAIN_ID) {
                showToast('主线名称不可修改', 'warning');
                return;
            }
            storyBranchNameDraft.value = target.name;
            showStoryBranchNameEditor.value = true;
        };

        const saveStoryBranchName = async () => {
            const target = storyBranches.value.find(branch => branch.id === selectedStoryBranchId.value);
            const name = storyBranchNameDraft.value.trim().replace(/\s+/g, ' ').slice(0, 30);
            if (!target || storyBranchSwitching.value) return;
            if (target.id === STORY_BRANCH_MAIN_ID) {
                showStoryBranchNameEditor.value = false;
                showToast('主线名称不可修改', 'warning');
                return;
            }
            if (!name) {
                showToast('分支名称不能为空', 'warning');
                return;
            }
            if (name === target.name) {
                showStoryBranchNameEditor.value = false;
                return;
            }
            const previousName = target.name;
            const previousUpdatedAt = target.updatedAt;
            storyBranchSwitching.value = true;
            try {
                target.name = name;
                target.updatedAt = Date.now();
                await saveStoryBranchesForCharacter();
                showStoryBranchNameEditor.value = false;
                showToast(`已将“${previousName}”改名为“${name}”`, 'success');
            } catch (error) {
                target.name = previousName;
                target.updatedAt = previousUpdatedAt;
                console.error('Failed to rename story branch:', error);
                showToast(`修改分支名称失败：${error.message || '请稍后重试'}`, 'error');
            } finally {
                storyBranchSwitching.value = false;
            }
        };

        const deleteSelectedStoryBranch = () => {
            const target = storyBranches.value.find(branch => branch.id === selectedStoryBranchId.value);
            const char = currentCharacter.value;
            if (!target || !char?.uuid) return;
            if (!selectedStoryRouteCanDelete.value) {
                showToast('请选择需要删除的分支，主线不能删除', 'warning');
                return;
            }
            const parentId = storyBranches.value.some(branch => branch.id === target.parentId)
                ? target.parentId
                : STORY_BRANCH_MAIN_ID;
            const parent = storyBranches.value.find(branch => branch.id === parentId);
            const hasChildren = storyBranches.value.some(branch => branch.parentId === target.id);
            confirmAction(
                `确定要删除“${target.name}”吗？${hasChildren ? `下级分支会顺延到“${parent?.name || '主线'}”下，` : ''}该分支的聊天、记忆和 UI 状态会被删除，此操作无法撤销。`,
                async () => {
                    try {
                        if (target.id === activeStoryBranchId.value) {
                            await switchStoryBranch(parentId, { closeModal: false, notify: false });
                            if (activeStoryBranchId.value !== parentId) {
                                throw new Error(`无法切换到“${parent?.name || '主线'}”`);
                            }
                        }
                        storyBranchSwitching.value = true;
                        if (!getMainDb()) await initDB();
                        const scopeId = getStoryBranchScopeId(char.uuid, target.id);
                        await Promise.all([
                            deleteScopedStoredValue('chat', scopeId),
                            deleteScopedStoredValue('classic_memories', scopeId)
                        ]);
                        getUiTemplatesForRuntime(char).forEach(template => {
                            if (!template.runtimeByCharacter) return;
                            delete template.runtimeByCharacter[scopeId];
                        });
                        storyBranches.value.forEach(branch => {
                            if (branch.parentId === target.id) branch.parentId = parentId;
                        });
                        storyBranches.value = storyBranches.value.filter(branch => branch.id !== target.id);
                        selectedStoryBranchId.value = parentId;
                        await saveStoryBranchesAndRuntime(char);
                        showToast(`已删除“${target.name}”${hasChildren ? '，下级分支已顺延保留' : ''}`, 'success');
                    } catch (error) {
                        console.error('Failed to delete story branch:', error);
                        showToast(`删除分支失败：${error.message || '请稍后重试'}`, 'error');
                    } finally {
                        storyBranchSwitching.value = false;
                    }
                }
            );
        };

        const createStoryBranch = async (forkMessageIndex = null) => {
            const char = currentCharacter.value;
            if (!char?.uuid || storyBranchSwitching.value) return;
            const forkFromMessage = Number.isInteger(forkMessageIndex);
            const forkMessage = forkFromMessage ? chatHistory.value[forkMessageIndex] : null;
            if (forkFromMessage && forkMessage?.role !== 'assistant') return;
            const forkMessageId = forkMessage?.id;
            const parent = forkFromMessage
                ? currentStoryBranch.value
                : storyBranches.value.find(branch => branch.id === selectedStoryBranchId.value)
                || currentStoryBranch.value;
            if (!parent) return;
            storyBranchSwitching.value = true;
            let createdBranch = null;
            const previousState = {
                activeId: activeStoryBranchId.value,
                chatHistory: chatHistory.value,
                classicMemories: classicMemories.value,
                memoryState: _b1MemoryState
            };
            try {
                if (!await saveCurrentStoryBranchState()) return;
                const parentId = parent.id;
                const parentScopeId = getStoryBranchScopeId(char.uuid, parentId);
                const branchId = generateUUID();
                const branchScopeId = getStoryBranchScopeId(char.uuid, branchId);
                createdBranch = { branchId, branchScopeId, parentId };
                const branchNumber = storyBranches.value.filter(branch => branch.id !== STORY_BRANCH_MAIN_ID).length + 1;
                const branchName = `分支 ${branchNumber}`;
                const now = Date.now();
                const [loadedChatHistory, sourceClassicMemories] = await Promise.all([
                    loadStoredChatHistory(char, null, parentScopeId),
                    getScopedStoredValue('classic_memories', parentScopeId)
                ]);
                const storedClassicMemories = Array.isArray(sourceClassicMemories) ? sourceClassicMemories : [];
                let sourceChatHistory = loadedChatHistory;
                let branchClassicMemories = storedClassicMemories;
                let forkTurn = null;
                if (forkFromMessage) {
                    const sourceIndex = forkMessageId
                        ? loadedChatHistory.findIndex(message => message?.id === forkMessageId)
                        : forkMessageIndex;
                    if (sourceIndex < 0 || loadedChatHistory[sourceIndex]?.role !== 'assistant') {
                        throw new Error('目标消息已发生变化，请重试');
                    }
                    sourceChatHistory = loadedChatHistory.slice(0, sourceIndex + 1);
                    forkTurn = buildConversationTurnSnapshot(sourceChatHistory, { includeSystem: false }).turns.length;
                    branchClassicMemories = trimClassicMemoriesToTurn(storedClassicMemories, forkTurn);
                }
                const floorCount = postprocessChatHistory(sourceChatHistory, { includeSystem: false }).length;
                const wordCount = getConversationBodyLength(sourceChatHistory);

                const newMemoryState = await window.RPHubStorage.readMemoryState(branchScopeId, { migrate: false });
                const newChatKey = 'rp_hub_chat_' + branchScopeId;
                const branchCommit = await window.RPHubStorage.commitMemoryState(newMemoryState, branchClassicMemories, {
                    expected: [{ key: newChatKey, value: undefined }],
                    changes: [{ key: newChatKey, operation: 'set', value: cloneForStorage(sourceChatHistory) }],
                    guard: () => currentCharacter.value?.uuid === char.uuid && activeStoryBranchId.value === previousState.activeId
                });
                if (branchCommit.status !== 'committed') throw memoryOperationError('MemoryCommitError', '新分支未完整提交，请检查存储', { committed: branchCommit.committed });
                createdBranch.memoryState = branchCommit.state;

                getUiTemplatesForRuntime(char).forEach(template => {
                    if (!template.runtimeByCharacter || typeof template.runtimeByCharacter !== 'object') {
                        template.runtimeByCharacter = {};
                    }
                    const sourceRuntime = template.runtimeByCharacter[parentScopeId] || {
                        variableState: template.variableState || template.initialVariableState || {},
                        changeLog: template.changeLog || []
                    };
                    if (forkFromMessage) {
                        const changeLog = Array.isArray(sourceRuntime.changeLog) ? sourceRuntime.changeLog : [];
                        template.runtimeByCharacter[branchScopeId] = {
                            variableState: buildUiTemplateStateAtTurn({ ...template, changeLog }, forkTurn),
                            changeLog: cloneForStorage(changeLog.filter(log => Number(log?.turn || 0) <= forkTurn))
                        };
                    } else {
                        template.runtimeByCharacter[branchScopeId] = cloneForStorage(sourceRuntime);
                    }
                });

                storyBranches.value.push({
                    id: branchId,
                    name: branchName,
                    parentId,
                    createdAt: now,
                    updatedAt: now,
                    forkFloor: floorCount,
                    floorCount,
                    messageCount: sourceChatHistory.filter(message => ['user', 'assistant'].includes(message?.role)).length,
                    wordCount
                });
                activeStoryBranchId.value = branchId;
                await saveStoryBranchesAndRuntime(char);
                loadGlobalUiTemplateRuntimeForCharacter(char);
                _isApplyingCharacterScopedData = true;
                resetChatRenderWindow();
                chatHistory.value = sourceChatHistory;
                adoptMemoryState(createdBranch.memoryState);
                clearStoryBranchTransientContext();
                finishApplyingCharacterScopedData();
                selectedStoryBranchId.value = branchId;
                showToast(`已创建并进入“${branchName}”`, 'success');
            } catch (error) {
                _isApplyingCharacterScopedData = false;
                if (createdBranch) {
                    storyBranches.value = storyBranches.value.filter(branch => branch.id !== createdBranch.branchId);
                    activeStoryBranchId.value = previousState.activeId;
                    chatHistory.value = previousState.chatHistory;
                    if (previousState.memoryState) adoptMemoryState(previousState.memoryState, previousState.classicMemories);
                    getUiTemplatesForRuntime(char).forEach(template => {
                        if (template.runtimeByCharacter) delete template.runtimeByCharacter[createdBranch.branchScopeId];
                    });
                    loadGlobalUiTemplateRuntimeForCharacter(char);
                    await Promise.allSettled([
                        deleteScopedStoredValue('chat', createdBranch.branchScopeId),
                        deleteScopedStoredValue('classic_memories', createdBranch.branchScopeId),
                        saveStoryBranchesForCharacter(char),
                        saveMemorySettingsNow(),
                        setStoredValue('global_ui_templates', globalUiTemplates.value),
                        saveCharactersNow()
                    ]);
                }
                console.error('Failed to create story branch:', error);
                showToast(`创建分支失败：${error.message || '请稍后重试'}`, 'error');
            } finally {
                storyBranchSwitching.value = false;
            }
        };

        const switchStoryBranch = async (branchId, options = {}) => {
            const { closeModal = true, notify = true } = options;
            const char = currentCharacter.value;
            const target = storyBranches.value.find(branch => branch.id === branchId);
            if (!char?.uuid || !target || branchId === activeStoryBranchId.value || storyBranchSwitching.value) return;
            clearPendingChatImages();
            clearPendingCardInteraction();
            storyBranchSwitching.value = true;
            try {
                if (!await saveCurrentStoryBranchState()) return;
                const targetScopeId = getStoryBranchScopeId(char.uuid, branchId);
                const [loadedChatHistory, savedClassicMemories] = await Promise.all([
                    loadStoredChatHistory(char, null, targetScopeId),
                    readCharacterMemories(targetScopeId)
                ]);

                _isApplyingCharacterScopedData = true;
                activeStoryBranchId.value = branchId;
                resetChatRenderWindow();
                chatHistory.value = loadedChatHistory;
                adoptMemoryState(savedClassicMemories.memoryState, savedClassicMemories.summaryMemories);
                loadGlobalUiTemplateRuntimeForCharacter(char);
                clearStoryBranchTransientContext();
                updateCurrentStoryBranchSummary();
                finishApplyingCharacterScopedData();
                await saveStoryBranchesForCharacter(char);
                currentView.value = 'chat';
                if (!await readerSession.restore()) await scrollChatToBottom();
                selectedStoryBranchId.value = branchId;
                if (closeModal) showStoryBranchModal.value = false;
                if (notify) showToast(`已进入“${target.name}”`, 'success');
            } catch (error) {
                _isApplyingCharacterScopedData = false;
                console.error('Failed to switch story branch:', error);
                showToast(`切换分支失败：${error.message || '原分支未被覆盖'}`, 'error');
            } finally {
                storyBranchSwitching.value = false;
            }
        };

        const openStoryBranchModal = () => {
            if (!currentCharacter.value) {
                showToast('请先选择角色卡', 'warning');
                return;
            }
            selectedStoryBranchId.value = activeStoryBranchId.value;
            storyRouteDragState = null;
            storyRouteMapDragging.value = false;
            suppressStoryRouteNodeClick = false;
            showStoryBranchModal.value = true;
        };

        const readCharacterMemories = async (characterId, errorContext = '') => {
            const memoryState = await window.RPHubStorage.readMemoryState(characterId);
            const summaryMemories = numberClassicMemories(prepareClassicMemoriesForRuntime(memoryState.list));
            return { summaryMemories, summaryLoaded: true, memoryState };
        };

        const loadCharacterMemories = async (characterId, errorContext = '') => {
            const loadEpoch = _characterSwitchEpoch;
            _classicMemoriesLoaded = false;
            const loaded = await readCharacterMemories(characterId, errorContext);
            if (loadEpoch !== _characterSwitchEpoch || getCurrentStoryBranchScopeId() !== characterId) {
                return;
            }
            adoptMemoryState(loaded.memoryState, loaded.summaryMemories);
        };

        const selectCharacter = async (index, isNewImport = false, { silent = false } = {}) => {
            let char = characters.value[index];
            if (!char) {
                showToast('角色不存在，无法读取聊天记录', 'error');
                return;
            }
            if (!isNewImport && currentCharacterIndex.value === index) {
                if (!silent) {
                    currentView.value = 'chat';
                    if (!await readerSession.restore()) await scrollChatToBottom();
                }
                return true;
            }
            clearPendingChatImages();
            clearPendingCardInteraction();
            const switchEpoch = ++_characterSwitchEpoch;
            const isLatestSwitch = () => switchEpoch === _characterSwitchEpoch;
            switchingCharacterIndex.value = index;
            try {
            await _characterSwitchSavePromise;
            if (!isLatestSwitch()) return;

            if (isConversationBusy.value) {
                stopGeneration();
                const stopped = await waitForConversationIdle();
                if (!isLatestSwitch()) return;
                await saveChatHistoryNow(getCurrentStoryBranchScopeId(), chatHistory.value);
                if (!isLatestSwitch()) return;
                if (!stopped) {
                    showToast('正在停止生成，请稍后再切换角色卡', 'warning');
                    return;
                }
            }
            await flushPendingChatHistorySave();
            if (!isLatestSwitch()) return;
            abortUiTemplateUpdate();
            const previousCharacterIndex = currentCharacterIndex.value;
            abortClassicBatchExtraction();
            if (previousCharacterIndex !== -1 && !await saveCurrentStoryBranchState(switchEpoch)) return;
            if (previousCharacterIndex !== -1 && _characterWriteBarrier > 0)
                await window.RPHubStorage.saveCharacterLibrary(characters.value.filter(card => card.uuid !== char.uuid));
            if (!isLatestSwitch()) return;

            let branchState;
            let loadedChatHistory;
            let loadedMemories;
            let previousStub;
            try {
                char = await window.RPHubStorage.readCharacter(char);
                if (!isLatestSwitch()) return;
                if (previousCharacterIndex >= 0 && previousCharacterIndex !== index)
                    previousStub = await window.RPHubStorage.toCharacterStub(characters.value[previousCharacterIndex]);
                if (!isLatestSwitch()) return;
                if (!char.uuid) {
                    char.uuid = generateUUID();
                    await saveCharactersNow();
                    if (!isLatestSwitch()) return;
                }
                branchState = await readStoryBranchesForCharacter(char);
                if (!isLatestSwitch()) return;
                const storyScopeId = getStoryBranchScopeId(char.uuid, branchState.activeBranchId);
                [loadedChatHistory, loadedMemories] = await Promise.all([
                    loadStoredChatHistory(char, index, storyScopeId),
                    readCharacterMemories(storyScopeId)
                ]);
                if (!isLatestSwitch()) return;
                // [rphub 2.8.106] 当前分支空、别的分支有 ⇒ 直接问要不要切过去。
                //   放在 setTimeout 0 里：先让本次载入把界面状态铺完，模态框不跟载入抢同一帧。
                //   只在非 silent 载入时弹，后台切卡不该打断用户手上的事。
                if (!silent) {
                    const recoverable = await findRecoverableBranchHistory(char, branchState, loadedChatHistory);
                    if (recoverable && isLatestSwitch()) {
                        setTimeout(() => {
                            confirmAction(
                                '当前分支没有记录，但「' + recoverable.name + '」里有 ' + recoverable.count + ' 条，要切过去吗？',
                                () => switchStoryBranch(recoverable.branchId, { closeModal: true })
                            );
                        }, 0);
                    }
                }
            } catch (error) {
                if (!isLatestSwitch()) return;
                console.error('Error loading chat history:', error);
                showToast('聊天记录读取失败，已保留当前会话且不会覆盖原记录，请稍后重试', 'error', 5000);
                return;
            }

            _isApplyingCharacterScopedData = true;
            if (previousStub) characters.value[previousCharacterIndex] = previousStub;
            characters.value[index] = char;
            currentCharacterIndex.value = index;
            storyBranches.value = branchState.branches;
            activeStoryBranchId.value = branchState.activeBranchId;
            selectedStoryBranchId.value = branchState.activeBranchId;
            resetChatRenderWindow();
            if (previousCharacterIndex !== index) {
                loadGlobalUiTemplateRuntimeForCharacter(char);
            }
            chatHistory.value = loadedChatHistory;
            adoptMemoryState(loadedMemories.memoryState, loadedMemories.summaryMemories);

            // Load Character Specific Data
            applyCharacterScopedResources(char);
            clearStoryBranchTransientContext();
            finishApplyingCharacterScopedData();
            await releaseCharacterRuntime();

            if (char.recentGenerationTimes) {
                recentGenerationTimes.value = JSON.parse(JSON.stringify(char.recentGenerationTimes));
            } else {
                recentGenerationTimes.value = [];
            }

            // Enforce special rules (Nai画图正则 & 自动生图)
            enforceSpecialRules();

            // Sync image style rules
            if (isAutoImageGenEnabled.value) {
                const messages = updateImageGenRegexState({ enableRegex: true });
                if (!silent && messages.length > 0) {
                    showToast('已同步生图风格：' + messages.join('，'), 'success');
                }
            }

            if (!silent) {
                currentView.value = 'chat';
                if (!await readerSession.restore()) await scrollChatToBottom();
                if (!isLatestSwitch()) return;
                showToast(`已切换到角色: ${char.name}`, 'success');

                // 弹出自动生图询问 (仅在导入新卡时)
                if (isNewImport) showAutoImageGenModal.value = true;
            }

            const selectionSave = setStoredValue('last_active_char', index);
            _characterSwitchSavePromise = selectionSave.catch(() => {});
            await selectionSave;
            await setStoredValue('last_active_char_id', char.uuid);
            return isLatestSwitch();
            } finally {
                if (isLatestSwitch()) switchingCharacterIndex.value = -1;
            }
        };

        const handleAvatarUpload = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        editingCharacter.data.avatar = await compressImage(e.target.result, 1600, 0.92);
                    } catch (err) {
                        editingCharacter.data.avatar = e.target.result;
                    }
                };
                reader.readAsDataURL(file);
            }
        };

        // Import/Export Logic

        const normalizeWorldInfoEntry = (entry) => ({
            ...cardUtils.normalizeWorldInfoEntry(entry, { systemNames: systemWorldInfoNames }),
            ...(entry?.customContent === true ? { customContent: true } : {})
        });

        const toWorldInfoExportEntry = (entry) => {
            const normalized = normalizeWorldInfoEntry(entry);
            return cardUtils.toWorldInfoExportEntry(normalized);
        };

        const getCombinedWorldInfo = (char) => {
            const characterEntries = Array.isArray(char.worldInfo)
                ? JSON.parse(JSON.stringify(char.worldInfo))
                    .map(entry => normalizeWorldInfoEntry({ ...entry, scope: 'character' }))
                    .filter(entry => entry.scope !== 'global')
                : [];
            return [
                ...JSON.parse(JSON.stringify(globalWorldInfo.value))
                    .map(entry => normalizeWorldInfoEntry({ ...entry, scope: 'global' })),
                ...characterEntries
            ];
        };

        const applyCharacterScopedResources = (char) => {
            worldInfo.value = getCombinedWorldInfo(char);
            combineRegexScriptsForCharacter(char);
        };

        const syncWorldInfoToCurrentCharacter = () => {
            const char = characters.value[currentCharacterIndex.value];
            if (char) char.worldInfo = JSON.parse(JSON.stringify(worldInfo.value.filter(entry => entry.scope !== 'global')));
        };

        const parseWorldInfoKeysText = cardUtils.parseWorldInfoKeysText;

        const setWorldInfoKeysText = (keys = []) => {
            worldInfoKeysText.value = (Array.isArray(keys) ? keys : [])
                .map(key => String(key || '').trim())
                .filter(Boolean)
                .join(', ');
        };

        const updateEditingWorldInfoKeys = (text) => {
            worldInfoKeysText.value = String(text || '');
            editingWorldInfo.data.keys = parseWorldInfoKeysText(worldInfoKeysText.value, editingWorldInfo.data.useRegex);
        };

        const importCharacterData = async (rawData, avatarUrl, { askImageGeneration = true, activate = true, sourceBytes = 0 } = {}) => {
                    const imported = cardUtils.parseImportedCharacterCard(rawData);
            // [rphub 2.8.117] 体积用文件自身字节数，不再为体检把整张卡 stringify 一遍
            inspectImportedCharacterCard(imported, avatarUrl, sourceBytes);
            const char = {
                name: imported.name,
                importedName: imported.name,
                description: imported.description,
                first_mes: imported.first_mes,
                avatar: avatarUrl || defaultAvatar,
                personality: imported.personality,
                creator_notes: imported.creator_notes,
                worldInfo: imported.worldInfoEntries
                    .map(entry => normalizeWorldInfoEntry({ ...entry, scope: 'character' }))
                    .filter(entry => entry.scope !== 'global'),
                regexScripts: imported.regexScripts
                    .map(script => cardUtils.normalizeImportedRegexScript(
                        { ...script, scope: 'character' },
                        { fallbackScope: 'character', systemNames: systemRegexNames }
                    ))
                    .filter(script => script.scope !== 'global'),
                        uiTemplates: dedupeImportedUiTemplates(imported.uiTemplates).map(template => normalizeUiTemplate({
                    ...sanitizeUiTemplateImportEntry(template),
                    id: generateUUID(),
                    scope: 'character'
                })),
                recentGenerationTimes: [],
                uuid: generateUUID(),
                createdAt: Date.now()
            };

            // A failed switch does not remove an imported card; an uncommitted save does.
            characters.value.push(char);
            _characterWriteBarrier++;
            let _importError = null;
            try {
                try {
                    if (activate) {
                        showAddCharacterMenu.value = false;
                        if (currentView.value === 'characters' && useCharacterDeck.value) {
                            characterSearchQuery.value = '';
                            await nextTick();
                            await characterDeck.value?.revealImportedCard(char.uuid);
                        }
                        const newCharacterIndex = characters.value.findIndex(item => item.uuid === char.uuid);
                        await selectCharacter(newCharacterIndex, askImageGeneration);
                    }
                } catch (error) {
                    // 切卡失败不等于导入失败：只记下来，等落盘之后再抛，不删卡
                    _importError = error;
                }
                // Persist the imported card and its initial runtime before releasing inactive content.
                await saveCharactersNow({ force: true });
                const savedIndex = characters.value.findIndex(item => item.uuid === char.uuid);
                if (savedIndex !== currentCharacterIndex.value && savedIndex >= 0)
                    characters.value[savedIndex] = await window.RPHubStorage.toCharacterStub(char);
            } catch (saveError) {
                const index = characters.value.findIndex(item => item.uuid === char.uuid);
                if (index >= 0 && saveError.committed !== true) characters.value.splice(index, 1);
                throw saveError;
            } finally {
                _characterWriteBarrier--;
                // 收尾那次无论成败，脏标记与排队中的自动保存都没有意义了：
                //   成功 = 库已是最新；失败 = 已 splice 回滚，内存与库同为旧状态。
                debouncedCharacterSave.cancel();
            }
            if (_importError) throw _importError;
            return char;
        };

        // [rphub 2.8.117] 原实现把整张卡 JSON.stringify 一遍，只为算体积和找重复图。
        //   一张 20MB 的卡因此白造一份 20MB 字符串，再对这根巨串跑一遍全局正则 —— 纯诊断开销。
        //   现在体积用文件自身字节数（调用方传入），图片只扫真正可能内嵌 base64 的三处：
        //   头像、UI 模板的 htmlTemplate、世界书正文。不再生成整卡副本。
        const inspectImportedCharacterCard = (imported = {}, avatarUrl = '', sourceBytes = 0) => {
            const sizeMb = Number(sourceBytes) > 0 ? Number(sourceBytes) / 1048576 : 0;
            const imageSources = [avatarUrl || ''];
            (Array.isArray(imported.uiTemplates) ? imported.uiTemplates : []).forEach(template => {
                if (template && typeof template.htmlTemplate === 'string') imageSources.push(template.htmlTemplate);
            });
            (Array.isArray(imported.worldInfoEntries) ? imported.worldInfoEntries : []).forEach(entry => {
                if (entry && typeof entry.content === 'string') imageSources.push(entry.content);
            });
            const imageRe = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g;
            const seenImages = new Map();
            let duplicateImageCount = 0;
            imageSources.forEach(source => {
                const matches = source.match(imageRe) || [];
                matches.forEach(dataUrl => {
                    const key = dataUrl.length + ':' + dataUrl.slice(-64);
                    seenImages.set(key, (seenImages.get(key) || 0) + 1);
                });
            });
            seenImages.forEach(count => {
                duplicateImageCount += Math.max(0, count - 1);
            });
            const notices = [];
            if (sizeMb >= 8) notices.push('体积 ' + sizeMb.toFixed(1) + ' MB');
            if (duplicateImageCount > 0) notices.push(duplicateImageCount + ' 处重复图片引用');
            if (notices.length) showToast('导入体检：' + notices.join('，'), 'info', 4000);
        };

        const getImportedUiTemplateSignature = (template = {}) => JSON.stringify({
            name: template.name || '',
            order: Number(template.order) || 100,
            placement: ['top', 'bottom'].includes(template.placement) ? template.placement : 'bottom',
            htmlTemplate: template.htmlTemplate || template.template || '',
            initialVariableState: template.initialVariableState || template.variables || template.variableState || {},
            variableSchema: typeof template.variableSchema === 'string' || typeof template.variableSchema === 'object' ? template.variableSchema : '',
            updateMode: template.updateMode || 'merge'
        });

        const dedupeImportedUiTemplates = (templates = []) => {
            if (!Array.isArray(templates)) return [];
            const seen = new Set();
            const removed = templates.filter(template => {
                if (!template || typeof template !== 'object') return false;
                const signature = getImportedUiTemplateSignature(template);
                if (seen.has(signature)) return false;
                seen.add(signature);
                return true;
            });
            const savedCount = templates.length - removed.length;
            if (savedCount > 0) showToast(`已无损去重 ${savedCount} 个重复 UI 模板`, 'success');
            return removed;
        };

        const importCharacter = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            showAddCharacterMenu.value = false;

            // Reset file input
            event.target.value = '';

            if (file.name.toLowerCase().endsWith('.jsonl')) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const records = String(e.target.result || '')
                            .split(/\r?\n/)
                            .filter(line => line.trim())
                            .map(line => JSON.parse(line));
                        if (!records.length) throw new Error('文件中没有有效的聊天记录');
                        if (currentCharacterIndex.value < 0) {
                            showToast('请先选择一个角色才能导入聊天记录', 'warning');
                            return;
                        }

                        const char = currentCharacter.value;
                        if (!char?.uuid) throw new Error('当前角色缺少有效标识');

                        if (records[0]?.type === STORY_BRANCH_CHAT_EXPORT_TYPE) {
                            const manifest = records[0];
                            if (Number(manifest.version) !== STORY_BRANCH_CHAT_EXPORT_VERSION) {
                                throw new Error(`不支持的分支聊天版本：${manifest.version}`);
                            }
                            if (!Array.isArray(manifest.branches) || !manifest.branches.length) {
                                throw new Error('文件中没有分支信息');
                            }

                            const chatByBranch = new Map();
                            records.slice(1).forEach(record => {
                                const branchId = String(record?.branchId || '').trim();
                                if (!branchId || !Array.isArray(record?.messages)) {
                                    throw new Error('分支聊天数据不完整');
                                }
                                if (record.messages.some(message => !message || typeof message !== 'object' || Array.isArray(message))) {
                                    throw new Error(`分支“${branchId}”包含无效消息`);
                                }
                                if (chatByBranch.has(branchId)) throw new Error(`分支“${branchId}”重复`);
                                chatByBranch.set(branchId, cloneForStorage(record.messages));
                            });

                            const importedBranches = normalizeStoryBranches(char, { branches: manifest.branches });
                            importedBranches.forEach(branch => {
                                if (!chatByBranch.has(branch.id)) throw new Error(`缺少分支“${branch.name}”的聊天记录`);
                                const messages = chatByBranch.get(branch.id);
                                branch.floorCount = postprocessChatHistory(messages, { includeSystem: false }).length;
                                branch.messageCount = messages.filter(message => ['user', 'assistant'].includes(message.role)).length;
                                branch.wordCount = getConversationBodyLength(messages);
                            });
                            const importedIds = new Set(importedBranches.map(branch => branch.id));
                            if ([...chatByBranch.keys()].some(branchId => !importedIds.has(branchId))) {
                                throw new Error('聊天记录中包含未知分支');
                            }
                            const importedActiveId = importedIds.has(String(manifest.activeBranchId))
                                ? String(manifest.activeBranchId)
                                : STORY_BRANCH_MAIN_ID;

                            if (!await stopCurrentCharacterWork()) return;
                            if (!getMainDb()) await initDB();
                            await Promise.all([
                                ...importedBranches.map(branch => setScopedStoredValue(
                                    'chat',
                                    getStoryBranchScopeId(char.uuid, branch.id),
                                    chatByBranch.get(branch.id),
                                    { clone: false }
                                )),
                                setScopedStoredValue('branches', char.uuid, {
                                    version: 1,
                                    activeBranchId: importedActiveId,
                                    branches: cloneForStorage(importedBranches)
                                }, { clone: false })
                            ]);

                            _isApplyingCharacterScopedData = true;
                            storyBranches.value = importedBranches;
                            activeStoryBranchId.value = importedActiveId;
                            selectedStoryBranchId.value = importedActiveId;
                            resetChatRenderWindow();
                            const activeChat = chatByBranch.get(importedActiveId);
                            chatHistory.value = activeChat.length
                                ? prepareLoadedChatHistoryForDisplay(activeChat)
                                : createInitialChatHistory(char);
                            await loadCharacterMemories(getStoryBranchScopeId(char.uuid, importedActiveId), ' during branch chat import');
                            loadGlobalUiTemplateRuntimeForCharacter(char);
                            // 2.7.86：必须在 loadGlobalUiTemplateRuntimeForCharacter 之后——
                            // 那一步会把 variableState 重置为本卡初值，先还原就会被覆盖。
                            let restoredUiTemplates = 0;
                            if (manifest.uiVariables) {
                                restoredUiTemplates = restoreUiVariablesFromChatImport(manifest.uiVariables, char);
                                if (restoredUiTemplates > 0) {
                                    await Promise.all([
                                        saveCharactersNow(),
                                        setStoredValue('global_ui_templates', globalUiTemplates.value)
                                    ]);
                                }
                            }

                            // [RP-Hub 2.8.43] 记忆还原：文件里带了记忆就按分支写回。
                            // 逐轮总结走 classic_memories（分支级 scope）。
                            let restoredMemoryBranches = 0;
                            if (manifest.memory && manifest.memory.branches) {
                                for (const branch of importedBranches) {
                                    const savedMemory = manifest.memory.branches[branch.id];
                                    if (!savedMemory) continue;
                                    const memoryScopeId = getStoryBranchScopeId(char.uuid, branch.id);
                                    if (Array.isArray(savedMemory.classicMemories) && savedMemory.classicMemories.length) {
                                        await window.RPHubStorage.replaceMemoryScopeList(
                                            memoryScopeId,
                                            cloneForStorage(savedMemory.classicMemories)
                                        );
                                        restoredMemoryBranches++;
                                    }
                                }
                                // 当前分支的记忆在上面已经被 loadCharacterMemories 读过一次，
                                // 这里改的是库，内存态要重新拉一遍才生效。
                                if (restoredMemoryBranches) {
                                    await loadCharacterMemories(
                                        getStoryBranchScopeId(char.uuid, activeStoryBranchId.value),
                                        ' after chat export restore'
                                    );
                                }
                                if (restoredMemoryBranches) {
                                    const restoredParts = [];
                                    if (restoredMemoryBranches) restoredParts.push(`逐轮总结 ${restoredMemoryBranches} 个分支`);
                                    setTimeout(() => showToast(`已还原 ${restoredParts.join(' · ')}`, 'success'), 900);
                                }
                            }
                            clearStoryBranchTransientContext();
                            finishApplyingCharacterScopedData();
                            currentView.value = 'chat';
                            await scrollChatToBottom();

                            const messageCount = [...chatByBranch.values()].reduce((sum, messages) => sum + messages.length, 0);
                            showToast(restoredUiTemplates > 0
                                ? `成功导入 ${importedBranches.length} 个分支、${messageCount} 条记录，并还原 ${restoredUiTemplates} 个模板变量`
                                : `成功导入 ${importedBranches.length} 个分支，共 ${messageCount} 条聊天记录`, 'success');
                            return;
                        }

                        if (records.some(message => !message || typeof message !== 'object' || Array.isArray(message))) {
                            throw new Error('聊天记录包含无效消息');
                        }
                        const importedChat = cloneForStorage(records);
                        if (!await stopCurrentCharacterWork()) return;
                        _isApplyingCharacterScopedData = true;
                        chatHistory.value = prepareLoadedChatHistoryForDisplay(importedChat);
                        await setScopedStoredValue('chat', getCurrentStoryBranchScopeId(), importedChat, { clone: false });
                        updateCurrentStoryBranchSummary();
                        await saveStoryBranchesForCharacter(char);
                        finishApplyingCharacterScopedData();
                        showToast(`成功为 ${char.name} 导入 ${importedChat.length} 条聊天记录`, 'success');
                    } catch (err) {
                        _isApplyingCharacterScopedData = false;
                        console.error('Chat import error:', err);
                        showToast('聊天记录解析失败: ' + err.message, 'error');
                    }
                };
                reader.readAsText(file);
            } else if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        await importCharacterData(data, null, { sourceBytes: file.size });
                    } catch (err) {
                        showToast('JSON解析失败: ' + err.message, 'error');
                    }
                };
                reader.readAsText(file);
            } else if (file.type === 'image/png' || file.name.endsWith('.png')) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const buffer = e.target.result;
                        const { data } = cardUtils.parsePngCharacterData(buffer);
                        const blob = new Blob([buffer], { type: 'image/png' });
                        const avatarUrl = await cardUtils.blobToDataUrl(blob);
                        await importCharacterData(data, avatarUrl, { sourceBytes: file.size });
                    } catch (err) {
                        if (err.chunks) console.warn("Available chunks:", Object.keys(err.chunks));
                        console.error(err);
                        showToast('PNG解析失败: ' + err.message, 'error');
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                showToast('不支持的文件格式', 'error');
            }
        };

        const buildCharacterExportData = (char) => cardUtils.buildCharacterCardData(char, {
            worldInfoMapper: (entry) => toWorldInfoExportEntry({ ...entry, scope: 'character' }),
            uiTemplateMapper: (template) => toUiTemplateExportEntry({ ...template, scope: 'character' }),
            regexScriptMapper: (script) => toRegexExportEntry({ ...script, scope: 'character' }, 'character')
        });

        const exportCharacterJson = async (index) => {
            let char = characters.value[index];
            if (!char) return;

            try {
                char = await window.RPHubStorage.readCharacter(char);
                const v2Data = buildCharacterExportData(char);
                const blob = new Blob([JSON.stringify(v2Data, null, 2)], { type: 'application/json' });
                cardUtils.downloadBlob(blob, (char.name || 'character') + '.json');
                showToast('角色卡 JSON 导出成功', 'success');
            } catch (e) {
                console.error('JSON export error:', e);
                showToast('JSON 导出失败: ' + e.message, 'error');
            }
        };

        // [RP-Hub 2.8.43] 聊天记录导出选项：消息本体锁定必选，UI 变量与记忆系统按需勾选。
        // 面板用原生 DOM 而不是 Vue 弹窗：导出入口在角色卡菜单里，走 Vue 要动状态与模板，
        // 这里只加一个浮层，官方改版最多丢样式，不会牵连主流程。
        const chatExportOptions = reactive({ uiVariables: false, memory: false });

        const collectMemoryExport = async (char, branches) => {
            if (!char || !char.uuid) return null;
            const snapshot = {
                type: 'rp-hub-memory-snapshot',
                version: 1,
                exportedAt: new Date().toISOString(),
                characterUuid: char.uuid,
                branches: {}
            };
            let hasAny = false;
            for (const branch of branches) {
                const scopeId = getStoryBranchScopeId(char.uuid, branch.id);
                let memories = null;
                try {
                    memories = await getScopedStoredValue('classic_memories', scopeId);
                } catch (error) {
                    memories = null;
                }
                const entries = Array.isArray(memories) ? cloneForStorage(memories) : [];
                if (entries.length) hasAny = true;
                snapshot.branches[branch.id] = {
                    classicMemories: entries
                };
            }
            return hasAny ? snapshot : null;
        };

        const openChatExportPanel = (char, onConfirm) => {
            const previous = document.getElementById('rphub-chat-export-panel');
            previous?.dispatchEvent(new Event('rp:close'));
            const previousFocus = document.activeElement;
            const app = document.getElementById('app');
            const previousInert = app.inert;
            const previousOverflow = document.body.style.overflow;
            const mask = document.createElement('div');
            mask.id = 'rphub-chat-export-panel';
            mask.className = 'stream-import-overlay';
            mask.setAttribute('role', 'dialog');
            mask.setAttribute('aria-modal', 'true');
            mask.setAttribute('aria-label', '导出聊天记录');
            const row = (key, title, desc, locked) => [
                '<label class="transfer-option"><input type="checkbox" data-key="', key, '"',
                locked ? ' checked disabled' : chatExportOptions[key] ? ' checked' : '',
                '><span><strong>', title, locked ? '（必选）' : '',
                '</strong><small>', desc, '</small></span></label>'
            ].join('');
            const box = document.createElement('div');
            box.className = 'transfer-dialog';
            box.tabIndex = -1;
            box.innerHTML = [
                '<img class="transfer-mascot" src="', window.RPThemePacks.asset('transfer'), '" alt="" aria-hidden="true">',
                '<h3>导出聊天记录</h3><p class="transfer-filename">',
                String((char && char.name) || '当前角色').replace(/[<>&]/g, ''),
                '</p>',
                row('chat', '聊天记录', '消息本体与全部分支', true),
                row('uiVariables', 'UI 变量记录', '模板初始值、当前值与变更日志', false),
                row('memory', '记忆系统', '逐轮总结', false),
                '<div class="transfer-actions">',
                '<button type="button" data-act="cancel" class="shell-button">取消</button>',
                '<button type="button" data-act="ok" class="shell-button transfer-primary">开始导出</button>',
                '</div>'
            ].join('');
            mask.appendChild(box);
            document.body.appendChild(mask);
            app.inert = true;
            document.body.style.overflow = 'hidden';
            box.focus();
            const close = () => {
                mask.remove();
                app.inert = previousInert;
                document.body.style.overflow = previousOverflow;
                if (previousFocus?.isConnected) previousFocus.focus();
            };
            mask.addEventListener('rp:close', close, { once: true });
            mask.addEventListener('keydown', event => {
                if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
                if (event.key !== 'Tab') return;
                const items = [...box.querySelectorAll('button,input:not(:disabled)')];
                if (event.shiftKey && [box, items[0]].includes(document.activeElement)) {
                    event.preventDefault(); items.at(-1).focus();
                } else if (!event.shiftKey && [box, items.at(-1)].includes(document.activeElement)) {
                    event.preventDefault(); items[0].focus();
                }
            });
            mask.addEventListener('click', (event) => {
                if (event.target === mask) { close(); return; }
                const act = event.target && event.target.dataset ? event.target.dataset.act : '';
                if (act === 'cancel') { close(); return; }
                if (act !== 'ok') return;
                mask.querySelectorAll('input[data-key]').forEach(input => {
                    if (input.disabled) return;
                    chatExportOptions[input.dataset.key] = input.checked === true;
                });
                close();
                onConfirm();
            });
        };

        const exportCharacterChat = async (index) => {
            let char = characters.value[index];
            if (!char) return;

            try {
                char = await window.RPHubStorage.readCharacter(char);
                if (!getMainDb()) await initDB();
                const isCurrentCharacter = currentCharacterIndex.value === index;
                if (isCurrentCharacter) await flushPendingChatHistorySave();
                const savedBranches = char.uuid ? await getScopedStoredValue('branches', char.uuid) : null;
                const branches = isCurrentCharacter
                    ? cloneForStorage(storyBranches.value)
                    : normalizeStoryBranches(char, savedBranches);
                const activeBranchId = isCurrentCharacter
                    ? activeStoryBranchId.value
                    : String(savedBranches?.activeBranchId || STORY_BRANCH_MAIN_ID);

                const branchChats = await Promise.all(branches.map(async branch => {
                    let messages;
                    if (isCurrentCharacter && branch.id === activeStoryBranchId.value) {
                        messages = cloneForStorage(chatHistory.value);
                    } else if (char.uuid) {
                        messages = await getScopedStoredValue('chat', getStoryBranchScopeId(char.uuid, branch.id));
                    }
                    if (messages === undefined && branch.id === STORY_BRANCH_MAIN_ID) {
                        messages = await getScopedStoredValue('chat', index);
                    }
                    return {
                        branchId: branch.id,
                        messages: Array.isArray(messages) ? cloneForStorage(messages) : []
                    };
                }));
                const totalMessages = branchChats.reduce((sum, branch) => sum + branch.messages.length, 0);
                if (!totalMessages) {
                    showToast('当前角色没有可导出的聊天记录', 'warning');
                    return;
                }

                const chatByBranch = new Map(branchChats.map(branch => [branch.branchId, branch.messages]));
                const branchMetadata = branches.map(branch => {
                    const messages = chatByBranch.get(branch.id);
                    return {
                        ...branch,
                        floorCount: postprocessChatHistory(messages, { includeSystem: false }).length,
                        messageCount: messages.filter(message => ['user', 'assistant'].includes(message?.role)).length,
                        wordCount: getConversationBodyLength(messages)
                    };
                });
                const rphubMemorySnapshot = chatExportOptions.memory
                    ? await collectMemoryExport(char, branches)
                    : null;
                const manifest = {
                    type: STORY_BRANCH_CHAT_EXPORT_TYPE,
                    version: STORY_BRANCH_CHAT_EXPORT_VERSION,
                    characterName: char.name || '',
                    exportedAt: new Date().toISOString(),
                    activeBranchId: branchMetadata.some(branch => branch.id === activeBranchId)
                        ? activeBranchId
                        : STORY_BRANCH_MAIN_ID,
                    branches: branchMetadata,
                    ...(chatExportOptions.uiVariables ? {
                        uiVariables: {
                            type: 'rp-hub-ui-template-variables',
                            version: 1,
                            exportedAt: new Date().toISOString(),
                            // 按被导出的角色取模板：原来固定用 currentUiTemplates（当前角色），
                            // 导出别的角色时会串成当前角色的变量。
                            templates: getUiTemplatesForRuntime(char).map(template => ({
                                id: template.id,
                                name: template.name || 'UI模板',
                                enabled: template.enabled !== false,
                                placement: template.placement || 'bottom',
                                scope: template.scope || 'character',
                                initialVariableState: cloneForStorage(template.initialVariableState || {}),
                                currentVariableState: cloneForStorage(template.variableState || template.initialVariableState || {}),
                                variableSchema: cloneForStorage(template.variableSchema || ''),
                                changeLog: cloneForStorage(template.changeLog || [])
                            }))
                        }
                    } : {}),
                    ...(rphubMemorySnapshot ? { memory: rphubMemorySnapshot } : {})
                };
                const chatLines = [manifest, ...branchChats].map(record => JSON.stringify(record)).join('\n');
                const chatBlob = new Blob([chatLines], { type: 'application/x-ndjson;charset=utf-8' });
                cardUtils.downloadBlob(chatBlob, (char.name || 'character') + '_全部分支_chat.jsonl');
                showToast(`已导出 ${branches.length} 个分支，共 ${totalMessages} 条聊天记录`, 'success');
            } catch (chatExpError) {
                console.error('Chat export error:', chatExpError);
                showToast('聊天记录导出失败: ' + chatExpError.message, 'error');
            }
        };

        const exportCharacterPng = async (index) => {
            let char = characters.value[index];
            if (!char) return;

            try {
                char = await window.RPHubStorage.readCharacter(char);
                const v2Data = buildCharacterExportData(char);
                const pngBytes = await cardUtils.imageUrlToPngBytes(char.avatar, { crossOrigin: "Anonymous" });
                const finalPng = cardUtils.injectPngTextChunk(
                    pngBytes,
                    'chara',
                    cardUtils.encodeBase64Utf8(JSON.stringify(v2Data))
                );
                cardUtils.downloadBlob(new Blob([finalPng], { type: 'image/png' }), (char.name || 'character') + '.png');
                showToast('角色卡 PNG 导出成功', 'success');
            } catch (e) {
                console.error('PNG export error:', e);
                showToast('PNG 导出失败: ' + e.message, 'error');
            }
        };

        // Preset Management
        const createPreset = () => {
            editingPreset.id = undefined;
            editingPreset.data = { name: 'New Preset', content: '', enabled: false, role: 'system', group: activePresetGroupName.value || presetLibrary.defaultGroup };
            showPresetEditor.value = true;
        };

        const editPreset = (index) => {
            openPresetGroup(presetLibrary.groupOf(presets.value[index]));
            editingPreset.id = index;
            editingPreset.data = normalizePreset(JSON.parse(JSON.stringify(presets.value[index])));
            showPresetEditor.value = true;
        };

        const savePreset = () => {
            const normalizedPreset = normalizePreset(editingPreset.data);
            if (!normalizePresetGroup(editingPreset.data.group)) normalizedPreset.group = presetLibrary.defaultGroup;
            presetGroupNames.value = presetLibrary.names(presets.value, [...presetGroupNames.value, normalizedPreset.group]);
            if (editingPreset.id !== undefined) {
                if (normalizedPreset.content !== presets.value[editingPreset.id]?.content) normalizedPreset.customContent = true;
                presets.value[editingPreset.id] = normalizedPreset;
            } else {
                presets.value.push(normalizedPreset);
            }
            showPresetEditor.value = false;
        };
        const exportPresetGroups = (groupName) => {
            const groups = typeof groupName === 'string' ? [groupName] : presetGroups.value.map(group => group.key);
            const label = groups.length === 1 ? '预设分组-' + window.RPLocalStore.safeName(groups[0]) : '全部预设分组';
            downloadJsonFile(presetLibrary.exportGroups(presets.value, groups), 'RP本地版-' + label + '.json');
            showToast(`成功导出 ${groups.length} 个分组`, 'success');
        };
        const importPresets = (event, targetGroup = activePresetGroupName.value) => {
            return readJsonFileInput(event, data => {
                const groups = presetLibrary.readImport(data, targetGroup);
                const imported = groups.flatMap(group => group.presets.map(preset => normalizePreset({ ...preset, group: group.name })));
                presetGroupNames.value = [...new Set([...presetGroupNames.value, ...groups.map(group => group.name)])];
                presets.value = [...presets.value, ...imported];
                saveData();
                showToast(`成功导入 ${imported.length} 条预设`, 'success');
            }, error => showToast('导入失败：' + error.message, 'error'));
        };

        const deletePreset = (index) => {
            confirmAction('确定要删除这个预设吗？此操作无法撤销。', () => {
                presets.value.splice(index, 1);
                showToast('预设已删除', 'success');
            });
        };

        // Expose triggerSlash for character cards (Defined early)
        window.triggerSlash = async (text) => {
            const command = String(text || '').trim();
            if (!command) return;

            if (isConversationBusy.value) {
                showToast('正在生成中，请稍后...', 'warning');
                return;
            }

            pendingCardInteraction.value = command;
            await nextTick();
            inputBox.value?.focus();
        };

        // Lifecycle
        onMounted(async () => {
            nextTick(scheduleMobileLazyUiTemplates);
            document.addEventListener('fullscreenchange', syncChatFullscreenState);
            document.addEventListener('webkitfullscreenchange', syncChatFullscreenState);
            // [rphub 2.8.102] 回到前台再检查一次。loadData 里那个 6 秒定时器只在启动时挂
            //   一次，页面重载或进程被杀就永久丢失（2.8.101 实测正是这种情形）。
            //   1.5 秒延迟是让切回后的首帧渲染先跑完，别在回来的瞬间弹窗。
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState !== 'visible') return;
                setTimeout(() => {
                    if (autoBackupConfig.value.triggerMode === 'remind') maybeRemindDailyBackup();
                    else performDailyAutoBackup(false);
                }, 1500);
            });

            if (!await loadData()) {
                window.__rpDataError = true;
                return;
            }
            await imageApi.load(settings.imageGenKey);
            if (imageApi.ready) settings.imageGenKey = imageApi.current.key;
            syncAppBackupFolderBridge();
            fetchQuota(); // Fetch quota after saved settings are loaded


            // Check for default username
            if (user.name === '请前往设置自定义你的名称') {
                tempUserSetup.name = '';
                tempUserSetup.description = user.description;
                tempUserSetup.person = user.person || 'second';
                showUserSetupModal.value = true;
            }

            ensureSlotTemperatures();
            applyModelSlotTemperature(currentModelMode.value);

            // --- Enforce Defaults ---

            // 1. Enforce Default Preset (破限)
            BUILTIN_CORE_PRESETS.forEach(preset => {
                if (!presets.value.some(existing => existing?.name === preset.name)) {
                    presets.value.push(normalizePreset(preset));
                }
            });
            // 1.6 Enforce Default Preset (防抢话)
            syncBuiltinPreset(BUILTIN_PRESETS.antiRobbery);

            // 1.6.1 Enforce Default Preset (防神化)
            syncBuiltinPreset(BUILTIN_PRESETS.antiDeification);
            // 1.7 Enforce Default Preset (防重复)
            syncBuiltinPreset(BUILTIN_PRESETS.antiRepeat);

            // 1.7.2 Enforce Default Preset (人格内核)
            syncBuiltinPreset(BUILTIN_PRESETS.personalityCore);

            // 1.7.3 Enforce Default Preset (去User中心化)
            syncBuiltinPreset(BUILTIN_PRESETS.deUserCentric);

            // 1.7.5 Enforce Default Preset (文风（抗八股）)
            syncBuiltinPreset(BUILTIN_PRESETS.writingStyle);
            syncBuiltinPreset(BUILTIN_PRESETS.storyPanels);
            syncBuiltinPreset(BUILTIN_PRESETS.lifelike);

            // 1.7.5.1 固定 NSFW增强在文风预设之后
            syncBuiltinPreset(BUILTIN_PRESETS.nsfw);

            // 1.7.6 Enforce Default Preset (时间戳)
            syncBuiltinPreset(BUILTIN_PRESETS.timestamp);

            // 1.8 Enforce Default Preset (第二人称)
            syncBuiltinPreset({
                ...BUILTIN_PRESETS.secondPerson,
                enabled: user.person !== 'third',
                syncEnabled: true
            });

            // 1.7 Enforce Default Preset (第三人称)
            syncBuiltinPreset({
                ...BUILTIN_PRESETS.thirdPerson,
                enabled: user.person === 'third',
                syncEnabled: true
            });

            // 1.9 Enforce Default Preset (禁止规则)
            syncBuiltinPreset(BUILTIN_PRESETS.prohibited);

            // 1.10 Enforce Default Preset (COT)
            const cotPresetName = 'COT';
            const syncDynamicPresetContent = () => {
                const useThinkingOpening = usesThinkingCotTag(settings.model);
                const uiTemplateAnalysisEnabled = isUiTemplateAnalysisEnabled();
                const cotPresetContent = buildCotPresetContent({
                    memoryEnabled: memorySettings.enabled,
                    uiTemplateAnalysisEnabled,
                    storyPanelsEnabled: isStoryPanelsEnabled.value,
                    useThinkingOpening
                });
                let existingCotPreset = presets.value.find(p => p.name === cotPresetName);
                if (!existingCotPreset) {
                    presets.value.push(normalizePreset({
                        name: cotPresetName,
                        content: cotPresetContent,
                        enabled: true
                    }));
                    existingCotPreset = presets.value.find(p => p.name === cotPresetName);
                } else if (existingCotPreset.customContent !== true && existingCotPreset.content !== cotPresetContent) {
                    existingCotPreset.content = cotPresetContent;
                }

                const prefillEnabled = isPresetEnabled(existingCotPreset);
                BUILTIN_CORE_PRESETS.forEach(preset => {
                    const prefillPhase = preset.name === '破限预注入 · AI 1' ? 1
                        : preset.name === '破限预注入 · AI 2' ? 2
                            : 0;
                    if (!prefillPhase) return;
                    const existingPreset = presets.value.find(item => item.name === preset.name);
                    if (!existingPreset || existingPreset.customContent === true) return;
                    existingPreset.content = buildCotPresetContent({
                        memoryEnabled: memorySettings.enabled,
                        uiTemplateAnalysisEnabled,
                        useThinkingOpening,
                        prefillPhase,
                        prefillEnabled,
                        prefillBaseContent: preset.content
                    });
                });
            };
            syncDynamicPresetContent();
            watch([
                () => memorySettings.enabled,
                () => settings.uiTemplateEnabled,
                () => settings.uiTemplateMainModelAnalysis,
                () => activeUiTemplates.value.length,
                isStoryPanelsEnabled,
                () => settings.model,
                isTruncationEnabled,
                () => presets.value.find(preset => preset.name === cotPresetName)?.enabled
            ], syncDynamicPresetContent);
            removeLegacyUserRegex();

            // Save enforced defaults immediately (2.8.84: 只提交 settings / active_tools，大件世界书留给后续全量保存)
            saveData({ saveMemories: false, saveCharacters: false, startupConfigOnly: true });

            // Restore Last Active Session
            if (lastActiveCharacterId.value !== null && characters.value[lastActiveCharacterId.value]) {
                // Restore character selection without clearing chat history (we load it from DB)
                _isApplyingCharacterScopedData = true;
                currentCharacterIndex.value = lastActiveCharacterId.value;
                resetChatRenderWindow();
                let char = characters.value[currentCharacterIndex.value];

                // Load Chat History for this character
                try {
                    char = await window.RPHubStorage.readCharacter(char);
                    characters.value[currentCharacterIndex.value] = char;
                    if (!char.uuid) {
                        char.uuid = generateUUID();
                        await saveCharactersNow();
                    }
                    await loadStoryBranchesForCharacter(char);
                    chatHistory.value = await loadStoredChatHistory(
                        char,
                        currentCharacterIndex.value,
                        getStoryBranchScopeId(char.uuid)
                    );
                    // 2.8.110: 到这一步聊天才算真正装载完毕，此前任何 saveData 都不该写聊天。
                    _chatHydrated = true;
                } catch (error) {
                    console.error('Error loading chat history on restore:', error);
                    currentCharacterIndex.value = -1;
                    _isApplyingCharacterScopedData = false;
                    showToast('聊天记录恢复失败，原记录未被覆盖，请重新选择角色重试', 'error', 5000);
                    return;
                }
                loadGlobalUiTemplateRuntimeForCharacter(char);

                // Load Char Specifics
                applyCharacterScopedResources(char);
                finishApplyingCharacterScopedData();

                if (char.recentGenerationTimes) recentGenerationTimes.value = JSON.parse(JSON.stringify(char.recentGenerationTimes));
                else recentGenerationTimes.value = [];

                await loadCharacterMemories(getStoryBranchScopeId(char.uuid), ' on restore');

                // Enforce special rules (Nai画图正则 & 自动生图)
                enforceSpecialRules();

                // Sync image style rules
                if (isAutoImageGenEnabled.value) {
                    updateImageGenRegexState({ enableRegex: true });
                }

            }
            currentView.value = currentCharacter.value && chatHistory.value.length ? 'chat' : 'characters';
            if (currentView.value === 'characters') hasOpenedCharacterManager.value = true;
            // Drain hydration watchers before enabling user-change autosaves.
            await nextTick();
            _initComplete = true;
            window.rphubHandleBack = shellGoBack;
            window.addEventListener('rp:notice', shellNotice);
            window.addEventListener('rp:startup-finished', finishStartup, { once: true });
            window.__rpHasSavedChat = !!(currentCharacter.value && chatHistory.value.length);
            window.__rpDataReady = true;

            fetchModels();

            // Initial Status Check
            checkAllStatuses();

            // --- Mobile Keyboard Adaptation (VisualViewport) ---
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', handleMobileViewportResize, { passive: true });
                window.visualViewport.addEventListener('scroll', handleMobileViewportResize, { passive: true });
            }
            window.addEventListener('orientationchange', handleMobileOrientationChange, { passive: true });
            window.addEventListener('resize', handleMobileViewportResize, { passive: true });
            scheduleMobileVisualViewportSync({ force: true });

            // --- 全局点击外部区域收起面板 ---
            document.addEventListener('click', (e) => {
                if (settingsHelpTopic.value
                    && !e.target.closest('.settings-help-trigger')
                    && !e.target.closest('.settings-help-popover')) {
                    settingsHelpTopic.value = '';
                }
                if (showTokenUsageTimeFilter.value && !e.target.closest('.token-usage-time-filter-container')) {
                    showTokenUsageTimeFilter.value = false;
                }
                if (showProfileDropdown.value && !e.target.closest('.profile-dropdown-container')) {
                    showProfileDropdown.value = false;
                }
                if (showApiProviderSelector.value && !e.target.closest('.api-provider-selector-container')) {
                    showApiProviderSelector.value = false;
                }
                if (showCustomArtistEditor.value && !e.target.closest('.custom-artist-editor-container')) {
                    showCustomArtistEditor.value = false;
                }
                if (showCustomApiSites.value && !e.target.closest('.custom-api-sites-container')) {
                    showCustomApiSites.value = false;
                }
            });
        });

        onBeforeUnmount(() => {
            window.removeEventListener('rp:startup-finished', finishStartup);
            window.removeEventListener('rp:notice', shellNotice);
            if (window.rphubHandleBack === shellGoBack) delete window.rphubHandleBack;
            activeSortable?.destroy();
            presetSortables.forEach(sortable => sortable.destroy());
            generatedImageObserver?.disconnect();
            generatedImageTasks.clear();
            closeNavigation();
            document.removeEventListener('fullscreenchange', syncChatFullscreenState);
            document.removeEventListener('webkitfullscreenchange', syncChatFullscreenState);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleMobileViewportResize);
                window.visualViewport.removeEventListener('scroll', handleMobileViewportResize);
            }
            window.removeEventListener('orientationchange', handleMobileOrientationChange);
            window.removeEventListener('resize', handleMobileViewportResize);
            if (mobileViewportRaf) cancelAnimationFrame(mobileViewportRaf);
            clearTimeout(mobileKeyboardBlurTimer);
        });
        // 解析并截断生成的包含 HTML UI 的正文，避免闪屏问题
        const processMainContent = (mainText, isGeneratingState) => {
            mainText = stripUiTemplateUpdateBlock(mainText);
            if (!isGeneratingState) return { text: mainText, showSpinner: false };
            const imageStart = cardUtils.findLastUnprotectedMatch(mainText, /image###/gi)?.index ?? -1;
            if (imageStart !== -1) {
                const imageTail = mainText.slice(imageStart + 'image###'.length);
                if (!imageTail.includes('###') && !/[\r\n]/.test(imageTail)) mainText = mainText.slice(0, imageStart);
            }
            // 只暂存未闭合的 UI；完整面板及其后的正文可以继续流式展示。
            const uiTokens = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\r\n]*`|<!--[\s\S]*?(?:-->|$)|<(script|style)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>[\s\S]*?(?:<\/\1\s*>|$)|<!doctype\b[^>]*(?:>|$)|<\/?[a-z][\w:-]*(?:[^"'<>]|"[^"]*(?:"|$)|'[^']*(?:'|$))*(>|$)/gi;
            const openTags = [];
            let pendingStart = -1;
            const waitForUi = index => ({ text: mainText.slice(0, pendingStart < 0 ? index : pendingStart), showSpinner: true });
            for (const match of mainText.matchAll(uiTokens)) {
                const token = match[0];
                const fence = token.startsWith('```') ? '```' : token.startsWith('~~~') ? '~~~' : '';
                if (fence) {
                    const isHtml = /^(?:```|~~~)[ \t]*(?:html|xml|vue)\b|^(?:```|~~~)[^\n]*\n\s*<(?:!doctype|html|head|body|div|span|style|script|table|img)\b/i.test(token);
                    if (isHtml && (token.length < 6 || !token.endsWith(fence))) return waitForUi(match.index);
                    continue;
                }
                if (token.startsWith('`') || token.startsWith('<!--')) continue;
                if (match[1]) {
                    if (!/<\/(?:script|style)\s*>$/i.test(token)) return waitForUi(match.index);
                    continue;
                }
                if (/^<!doctype\b/i.test(token)) {
                    if (pendingStart < 0) pendingStart = match.index;
                    continue;
                }
                const tag = token.match(/^<(\/?)(html|div|script|style)(?=[\s/>]|$)/i);
                if (!tag) continue;
                if (match[2] !== '>') return waitForUi(match.index);
                const name = tag[2].toLowerCase();
                if (!tag[1]) {
                    if (pendingStart < 0) pendingStart = match.index;
                    openTags.push(name);
                } else {
                    const openIndex = openTags.lastIndexOf(name);
                    if (openIndex < 0) continue;
                    openTags.splice(openIndex);
                    if (!openTags.length) pendingStart = -1;
                }
            }
            return pendingStart < 0 ? { text: mainText, showSpinner: false } : waitForUi(pendingStart);
        };

        const switchProfile = (id) => {
            const profile = userProfiles.value.find(p => p.uuid === id);
            if (profile) {
                activeProfileId.value = id;
                Object.assign(user, { preferences: '', ...JSON.parse(JSON.stringify(profile)) });
                saveData();
                showToast(`已切换为人设: ${user.name}`, 'success');
            }
        };

        const createNewProfile = () => {
            const newProfile = {
                uuid: generateUUID(),
                name: '新人设',
                description: '',
                preferences: '',
                avatar: null,
                person: 'second'
            };
            userProfiles.value.push(newProfile);
            switchProfile(newProfile.uuid);
        };



        const deleteProfile = (id) => {
            if (userProfiles.value.length <= 1) {
                showToast('无法删除唯一的人设', 'error');
                return;
            }

            confirmAction('确定要删除此人设吗？此操作不可逆。', () => {
                const index = userProfiles.value.findIndex(p => p.uuid === id);
                if (index !== -1) {
                    userProfiles.value.splice(index, 1);
                    if (activeProfileId.value === id) {
                        switchProfile(userProfiles.value[0].uuid);
                    } else {
                        saveData();
                    }
                    showToast('人设已删除', 'success');
                }
            });
        };

        const activeKeepFloors = computed(() => memorySettings.summaryKeepFloors);
        const keepFloorsSliderMin = SUMMARY_KEEP_FLOORS_MIN;
        const keepFloorsSliderMax = SUMMARY_KEEP_FLOORS_MAX;
        // 2.7.82：防误触锁的交互实现。锁定后滑块 disabled，需显式点锁按钮才可再改。
        // 状态存在 memorySettings 上，由既有 watch(memorySettings,{deep:true}) 自动落盘。
        const toggleMemorySettingLock = (key) => {
            if (key !== 'keepFloorsLocked' && key !== 'concurrencyLocked') return;
            memorySettings[key] = !memorySettings[key];
            showToast(memorySettings[key] ? '已锁定，避免误触；要改请先解锁' : '已解锁，可调整', 'info');
        };
        // 2.7.82：保留楼层 >= 当前对话总楼层数 时等于完全不压缩。这是用户把滑块拖过头后的典型后果。
        // 2.8.26：口径对齐官方 —— 「保留楼层」按**消息条数**计（官网 UI 写 activeKeepFloors + ' 楼'，
        // 官方 4 处读取全用 messages.length）。原先按轮数判断，与官方差一倍：
        // F 落在 [T, 2T)（T=轮数、F=滑块值）时会误报「已覆盖全部对话」，而官方此时仍在正常压缩。
        const keepFloorsNoCompressionWarning = computed(() => {
            const floorCount = countChatFloors(chatHistory.value);
            if (!floorCount) return '';
            const floors = Number(memorySettings.summaryKeepFloors) || 0;
            if (floors < floorCount) return '';
            return '当前对话 ' + floorCount + ' 楼，保留楼层 ' + floors
                + ' 楼已覆盖全部对话，等于不做压缩；建议调低到 ' + Math.max(keepFloorsSliderMin, Math.floor(floorCount / 2)) + ' 楼左右。';
        });
        const keepFloorsSlider = computed({
            get: () => memorySettings.summaryKeepFloors,
            set: value => {
                memorySettings.summaryKeepFloors = normalizeKeepFloors(
                    value, SUMMARY_KEEP_FLOORS_MIN, SUMMARY_KEEP_FLOORS_MAX, SUMMARY_KEEP_FLOORS_DEFAULT
                );
            }
        });
        const classicMemoryPageCount = computed(() => Math.max(1, Math.ceil(classicMemories.value.length / LIST_PAGE_SIZE)));
        watch(classicMemoryPageCount, pageCount => { classicMemoryPage.value = Math.min(classicMemoryPage.value, pageCount); });
        watch(() => currentCharacter.value?.uuid, () => { classicMemoryPage.value = 1; });
        const displayedClassicMemories = computed(() => {
            const messagesById = new Map(
                chatHistory.value.filter(message => message?.id).map(message => [message.id, message])
            );
            const currentTurnsByAssistantId = new Map();
            const snapshot = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false });
            snapshot.turns.forEach(turnInfo => {
                getClassicTurnSourceIds(turnInfo, 'assistant').forEach(id => currentTurnsByAssistantId.set(id, turnInfo.turn));
            });
            const getLiveLength = (ids, fallback) => {
                const texts = (ids || [])
                    .map(id => messagesById.get(id))
                    .filter(Boolean)
                    .map(message => parseCot(message.content || '').main);
                return texts.length
                    ? texts.reduce((total, text) => total + text.length, 0)
                    : parseCot(fallback || '').main.length;
            };
            const sortedMemories = [...classicMemories.value]
                .map(memory => {
                    // 用最底层基础总结的原文做兜底：三级结构里父节点的一层来源仍是压缩总结，
                    // 那些节点没有逐轮原文，只取一层会算成「原文 0 字」。
                    const sourceMemories = isSecondaryClassicMemory(memory)
                        ? flattenClassicMemories([memory]).filter(item => !isSecondaryClassicMemory(item))
                        : [];
                    const userFallback = memory.sourceUserText
                        || sourceMemories.map(item => item.sourceUserText || '').filter(Boolean).join('\n\n');
                    const assistantFallback = memory.sourceAssistantText
                        || sourceMemories.map(item => item.sourceAssistantText || '').filter(Boolean).join('\n\n');
                    const userChars = getLiveLength(memory.sourceUserIds, userFallback);
                    const assistantChars = getLiveLength(memory.sourceAssistantIds, assistantFallback);
                    const summaryChars = parseCot(memory.summary || '').main.length;
                    const liveTurns = (memory.sourceAssistantIds || [])
                        .map(id => currentTurnsByAssistantId.get(id))
                        .filter(Number.isFinite);
                    const storedRange = getClassicMemoryTurnRange(memory);
                    const displayTurnStart = isSecondaryClassicMemory(memory)
                        ? (liveTurns.length ? Math.min(...liveTurns) : storedRange.start)
                        : (liveTurns[0] || Number(memory.turn) || 1);
                    const displayTurnEnd = isSecondaryClassicMemory(memory)
                        ? (liveTurns.length ? Math.max(...liveTurns) : storedRange.end)
                        : displayTurnStart;
                    return {
                        ...memory,
                        displayTurn: displayTurnEnd,
                        displayTurnStart,
                        displayTurnEnd,
                        originalChars: userChars + assistantChars,
                        compressedChars: isSecondaryClassicMemory(memory)
                            ? getClassicSecondaryMemoryMarker(memory).length + summaryChars
                            : userChars + summaryChars
                    };
                })
                .sort((a, b) => (b.displayTurnEnd || 0) - (a.displayTurnEnd || 0));
            const start = (classicMemoryPage.value - 1) * LIST_PAGE_SIZE;
            return sortedMemories.slice(start, start + LIST_PAGE_SIZE);
        });
        const memoryStats = computed(() => ({ activeTotal: classicMemories.value.length }));

        // 点正文里的记忆引用，查看 AI 当时依据的总结记忆；按编号在当前分支的记忆（含已合并的原始总结）里查找。
        const memoryCitationNos = ref([]);
        const memoryCitationItems = computed(() => {
            if (!memoryCitationNos.value.length) return [];
            const byNo = new Map(flattenClassicMemories(classicMemories.value).map(memory => [memory.no, memory]));
            return memoryCitationNos.value.map(no => {
                const memory = byNo.get(no);
                if (!memory) return { no, missing: true };
                return {
                    no,
                    turnLabel: `第 ${memoryCitationLabels.value.get(no)} 轮`,
                    summary: memory.summary
                };
            });
        });
        const showMemoryCitation = (nos) => {
            const numbers = [...new Set(String(nos || '').split(',').map(Number).filter(no => Number.isInteger(no) && no > 0))];
            if (numbers.length) memoryCitationNos.value = numbers;
        };
        const openMemoryCitation = (event) => showMemoryCitation(event.target.closest?.('.memory-cite, .memory-cite-text')?.dataset.memoryNos);
        // HTML 卡片在 iframe 里渲染，卡片脚本借这里的处理给引用加角标，点击后在这里打开判断依据。
        window.RPHubMemoryCitations = {
            decorate: decorateMemoryCitations,
            open: showMemoryCitation,
            frameStyle: () => {
                const tone = getComputedStyle(document.documentElement).getPropertyValue('--primary-500').trim() || '99 102 241';
                return `.memory-cite-text{text-decoration:underline dotted rgb(${tone} / .75);text-decoration-thickness:1.5px;text-underline-offset:.3em;cursor:pointer}`
                    + `.memory-cite{display:inline-flex;align-items:center;justify-content:center;min-width:1.4em;height:1.4em;margin:0 .15em;padding:0 .35em;border:0;border-radius:999px;background:rgb(${tone} / .14);color:rgb(${tone});font:700 .75em/1 system-ui,sans-serif;vertical-align:.4em;cursor:pointer}`;
            }
        };

        const applyPersonPresetSelection = (person) => {
            user.person = person === 'third' ? 'third' : 'second';
            const secondPersonPreset = presets.value.find(preset => preset.name === '第二人称');
            const thirdPersonPreset = presets.value.find(preset => preset.name === '第三人称');
            if (secondPersonPreset) secondPersonPreset.enabled = user.person === 'second';
            if (thirdPersonPreset) thirdPersonPreset.enabled = user.person === 'third';
        };

        const backupUi = reactive({
            cloud: cloudBackup, openCloud: openCloudBackup,
            create: () => exportAllData(true),
            back: shellGoBack, source: backupSource, menu: backupMenu,
            files: computed(() => backupManagerFiles.value.filter(record => backupSource.value === 'all'
                || /^rp-hub-autobackup-.*\.json$/i.test(record.fileName) === (backupSource.value === 'daily'))),
            listError: backupListError, loading: backupManagerLoading, refresh: loadBackupManagerFiles,
            renameId: backupRenameId, renameDraft: backupRenameDraft,
            rename: startRenameBackupFile, cancelRename: cancelRenameBackupFile, commitRename: commitRenameBackupFile,
            remove: deleteBackupManagerFile, saveAs: exportBackupManagerFile,
            restore: record => restoreAutoBackupRecord({ ...record, name: record.fileName }),
            time: formatBackupFileTime, size: formatDataHealthSize, restoring: isRestoringAutoBackup,
            folder: appBackupFolder, defaultFolder: defaultBackupFolder, chooseFolder: chooseAppBackupFolder,
            filename: backupFileName, filenamePreview: backupFileNamePreview,
            exportJson: exportAllData, importJson: importAllData, exporting: isExportingAllData,
            profile: backupProfile, profiles: backupProfiles, scope: backupScope, scopes: backupScopeOptions,
            resetScope: resetBackupScope, config: autoBackupConfig, overdue: backupOverdueDays,
            daily: performDailyAutoBackup, working: isAutoBackingUp, checking: isCheckingDataHealth
        });
        return {
            backupUi,
            switchProfile, createNewProfile, deleteProfile, userProfiles, activeProfileId, showProfileDropdown,
            processMainContent, replaceUserNamePlaceholder,
            currentView, showDescriptionPanel, showModelSelector, modelSelectionTarget, openModelSelector, showChatModelSelector, showCharacterEditor, showAddCharacterMenu, showPresetEditor, showUiTemplateEditor,
            showActiveToolEditor,
            showExportModal, exportItems, selectedExportIndices, // Export Modal
            showContextViewerModal, lastContextMessages, lastTriggeredWorldInfos,
            lastContextTotalLength, // Context Viewer
            showStoryBranchModal, showStoryBranchNameEditor, storyBranchNameDraft,
            storyBranches, storyRouteMap, currentStoryBranch, selectedStoryRouteNode,
            storyBranchSwitching, storyRouteMapDragging,
            selectedStoryRouteCanDelete,
            openStoryBranchModal, openStoryBranchNameEditor, saveStoryBranchName,
            createStoryBranch, deleteSelectedStoryBranch,
            switchStoryBranch, handleStoryRouteNodeClick,
            startStoryRouteDrag, moveStoryRouteDrag, endStoryRouteDrag,
            tokenUsageHistory, tokenUsagePage, tokenUsagePageCount, tokenUsageFilter, tokenUsageTimeFilter,
            showTokenUsageTimeFilter, tokenUsageTimeFilterOptions, tokenUsageTimeFilterLabel, tokenUsageRetentionOptions,
            filteredTokenUsageHistory, tokenUsageStats, displayedTokenUsageHistory,
            latestMainTokenUsage, formatLatestTokenCount,
            getUncachedInputTokens, formatTokenCount, formatTokenAggregate, formatTokenUsageTime, getTokenUsageCategory, clearTokenUsageHistory,
            cloudBackup, openCloudBackup, closeCloudBackup, startCloudBackup, startCloudRestore, copyCloudBackupKey, formatCloudBackupTime,
            showCharacterExportModal, openCharacterExportModal, confirmCharacterExport, // Character Export Modal
            showConfirmModal, confirmMessage, modelMode, isGeminiModel, isTruncationEnabled, isPresetEnabled, chatModelSlots, selectChatModelSlot, slotTemperature, reasoningEffortSlider, reasoningEffortLabel, // Export for template
            isGenerating, isReceiving, isThinking, hasActiveToolInlineWork, isConversationBusy, activeToolContinuationMessageId, activeToolContinuationHasResponse, userInput, pendingCardInteraction, clearPendingCardInteraction, pendingChatImages, pendingChatImageReadCount, requestChatImageSelection, handleChatImageSelection, removePendingChatImage, modelSearchQuery, activeModelTag, modelTags, characterSearchQuery, filteredModels, filteredCharacters,
            user, settings, apiProviderOptions, selectedApiProvider, isCustomApiProvider, customApiProviderOptions, showApiProviderSelector, selectApiProvider, createCustomApiProvider, removeCustomApiProvider, updateCustomApiProvider, updateCustomApiKey, showCustomArtistEditor, showCustomApiSites, activeCustomArtist, selectCustomArtist, removeCustomArtist, toggleFreezeGeneratedImages, characters, currentCharacter, currentCharacterAvatar, currentCharacterIndex, switchingCharacterIndex, chatHistory, displayedChatMessages, runtimeEnv, refreshRuntimeEnv, copyRuntimeEnv, handleChatScroll, presets, presetRoleOptions, fontSizeOptions, availableImageStyleOptions, imageModelOptions, imageSizeOptions, imageGenCountOptions, imageGenParams, setImageGenParam, resetImageGenParams, imageGenSamplerOptions: IMAGE_GEN_SAMPLER_OPTIONS, imageGenNoiseOptions: IMAGE_GEN_NOISE_OPTIONS, scopeOptions, uiTemplatePlacementOptions, worldInfoPositionOptions, getPresetRoleLabel, getPresetRoleDisplayLabel, getPresetRoleBadgeClass, getSortableItemKey, regexScripts, worldInfo,
            activeTools, activeToolAggressivenessOptions: ACTIVE_TOOL_AGGRESSIVENESS_OPTIONS, editingActiveTool, normalizeActiveTools, isWebActiveTool, getActiveToolDisplayDescription, getActiveToolResultCountMin, getActiveToolResultCountMax,
            getToolCallModeText, hasThinkingOrTools, isMessageThinkingOrRunning, isThinkingSummaryOpen, toggleThinkingSummary, markThinkingSummaryDetailOpened, getTimelineSteps,
            isStyleFilterDetailsOpen, toggleStyleFilterDetails, getStyleFilterHitSegments,
            chatRoundStats, conversationBodyLength, summaryCompressedBodyLength, summaryCompressionRate,
            editingCharacter, editingPreset, editingUiTemplate, toasts, onToastBeforeLeave, chatContainer, isChatFullscreen, isInputBarHidden, toggleInputBarVisibility, isAnyMessageEditing, keepEditBlockVisible, isMobileKeyboardOpen, inputBox, messageElements,
            isGeneratorLoading, generatorUrl, onGeneratorLoad, // Generator exports
            isSquareLoading, squareUrl, onSquareLoad, // Square exports
            isNovelLoading, novelUrl, onNovelLoad, // Novel exports
            isLighthouseLoading, lighthouseUrl, onLighthouseLoad, // Lighthouse exports
            openLighthouseWindow,
            editorTab, characterDisplayLimit, hasOpenedCharacterManager, hasOpenedChat, isDesktopCharacterLayout, characterGridView, characterDeck, useCharacterDeck, displayedCharacters, loadMoreCharacters, getCharacterWICount, getCharacterRegexCount,
            isAutoImageGenEnabled,
            apiStatus, apiLatency, imageGenStatus, imageGenLatency, checkAllStatuses, // Status Exports
            toggleAutoImageGen, setWorldInfoEnabled, handleGeneratedImageReroll,
            quotaValue, quotaLoading, quotaError, quotaLabel, fetchQuota, imageApi, removeImageProvider,
            // Memory System Exports
            classicMemoryPage, classicMemoryPageCount, memorySettings, retryingClassicMemoryId, retryClassicMemory,
            editingClassicMemoryId, editingClassicMemoryText, savingClassicMemoryId,
            startEditClassicMemory, cancelEditClassicMemory, saveEditClassicMemory,
            isActiveBatchExtracting: isClassicBatchExtracting,
            showMemoryBackfillModal, memoryBackfillProgress,
            startBatchMemoryExtraction, abortBatchExtraction: abortClassicBatchExtraction,
            activeKeepFloors, keepFloorsSlider, keepFloorsSliderMin, keepFloorsSliderMax,
            // 2.7.82：防误触锁 —— 模板里的锁按钮与失效提示要用。
            toggleMemorySettingLock, keepFloorsNoCompressionWarning,
            // 滑块值映射：4-10 为变量分析消息层数。
            uiTemplateAnalysisDepthSlider: computed({
                get: () => Math.max(4, Math.min(10, Number(settings.uiTemplateAnalysisDepth) || 4)),
                set: (val) => { settings.uiTemplateAnalysisDepth = Math.max(4, Math.min(10, Number(val) || 4)); }
            }),
            displayedClassicMemories,
            memoryStats, memoryCitationNos, memoryCitationItems, openMemoryCitation,
            clearAllMemories: () => {
                confirmAction('确定要清空所有总结记忆及其向量吗？两个模式共享这些记忆，此操作无法撤销。', async () => {
                    abortClassicBatchExtraction();
                    try {
                        const intent = await beginMemoryIntent('清空全部记忆');
                        const result = await commitMemoryDraft(intent, []);
                        if (!result.published) {
                            showToast('记忆已清空原角色，但界面已切换，请刷新确认', 'warning');
                            return;
                        }
                    } catch (error) {
                        showToast(`清空失败：${error?.message || error}`, 'error');
                        return;
                    }
                    showToast('记忆已清空', 'success');
                });
            },
            toggleNavigation, closeNavigation, navigateWorkspace, shellRoot, shellParent, selectedCompetition, openCompetition, classicUi,
            onlineOpen, dockFolded, foldDock, galleryPage, shellGoBack, streamImportPanel, backupTask, backupProfiles, backupProfile,
            showAnnouncement, openAnnouncement, closeAnnouncement,
            prepareStreamImport, restoreRphubBinaryDeep, showVueConfirmModal,
            settingsSection, settingTitles, openSettingsSection,
            downloadJsonFile,
            fetchModels, fetchMemoryModels, isFetchingMemoryModels, exportAllData, importAllData, selectModel, selectQuickModels, sendMessage,
            fetchUiTemplateModels, isFetchingUiTemplateModels,
            appBackupFolder, defaultBackupFolder, chooseAppBackupFolder, isExportingAllData,
            backupFileName, backupFileNamePreview, buildBackupFileName,
            backupScope, backupScopeOptions, resetBackupScope,
            dataHealthResult, dataHealthError, isCheckingDataHealth, isCleaningDataHealth,
            scanDataHealth, cleanDataHealthItem, formatDataHealthSize,
            showApiQuickSelector, quickApiProviders, toggleApiQuickSelector, selectQuickApiProvider, rphubEnterNewline, toggleRphubEnterNewline, autoResizeInput, onChatInput, flushChatInput, handleChatInputEnter, handleChatInputFocus, handleChatInputBlur, stopGeneration, clearChat, toggleChatFullscreen,
            handleConfirm, handleCancel, // Export handlers
            copyMessage, playMessageActionFeedback, canDeleteMessage, deleteMessage, regenerateMessage,
            editMessage, saveEditMessage, cancelEditMessage,
            createNewCharacter, editCharacter, saveCharacter, deleteCharacter, selectCharacter, toggleCharacterFavorite, isCharacterFavorite,
            currentUiTemplates, managedUiTemplates, activeUiTemplates, uiTemplateUpdateStatus, createUiTemplate, editUiTemplate, saveUiTemplate, deleteUiTemplate, importUiTemplates, updateUiTemplatesFromChat, renderEditingUiTemplatePreview, handleUiTemplateClick,
            isBatchDeleteMode, isNavigationOpen, selectedCharacterIndices, toggleBatchDeleteMode, toggleCharacterSelection, batchDeleteCharacters,
            handleAvatarUpload, importCharacter,
            showMemTools, openMemTools, closeMemTools, memToolsScopeId, memToolsAudit, memToolsConfig, runMemToolsAudit, saveMemToolsConfig,
            memToolsVersions, loadMemToolsVersions, saveMemToolsSnapshot, restoreMemToolsSnapshot, deleteMemToolsSnapshot, memToolsTimeText,
            memToolsMerge, memToolsMergePickable, memToolsMergePickedList, memToolsMergeGap, memToolsMergeCanRun,
            openMemToolsMergePick, closeMemToolsMergePick, runMemToolsMerge, abortMemToolsMerge,
            cancelMemToolsMergePreview, confirmMemToolsMergeWrite,
            memToolsVersionsCurrentId, memToolsVersionsCurrent, memToolsVersionsDrifted, memToolsNodeDepth,
            memToolsExtractRaw, memToolsExtractContinueRound, memToolsExtractNeedsContinue,
            memToolsExtractContinueLeft, continueMemToolsExtract,
            memToolsExtractPrompt, saveMemToolsExtractPrompt, resetMemToolsExtractPrompt,
            memToolsExtract, memToolsExtractSource, memToolsExtractTotal, runMemToolsExtract, abortMemToolsExtract,
            saveMemToolsExtract, clearMemToolsExtract, removeMemToolsExtractEntry, copyMemToolsExtract,
            memToolsExportEntries, memToolsExportConversation, memToolsExportVersion,
            copyMemToolsVersion, memToolsVersionView, memToolsVersionOpenId, toggleMemToolsVersionOpen,
            openMemToolsVersionView, closeMemToolsVersionView, copyMemToolsVersionView,
            memToolsAsk, openMemToolsAsk, closeMemToolsAsk, runMemToolsAsk, abortMemToolsAsk,
            clearMemToolsAsk, copyMemToolsAskAnswer,
            memToolsEdit, memToolsEditPreview, memToolsRows, memToolsParentMemories, memToolsRevertRange,
            openMemToolsMemoryEdit, cancelMemToolsMemoryEdit, saveMemToolsMemoryEdit,
            retryMemToolsMemory, abortMemToolsEdit, undoMemToolsMemory,
            memToolsPinned, memToolsRangePinned, toggleMemToolsPin,
            memToolsImport, memToolsImportLabel, clearMemToolsImport, pickMemToolsImportFile, readMemToolsImportFile,
            memToolsAuto, memToolsAutoPlan, saveMemToolsAuto, runMemToolsAuto, abortMemToolsAuto,
            createPreset, editPreset, autoBackupConfig, autoBackupFolderPath, autoBackupHistory, isAutoBackingUp, isRestoringAutoBackup, performDailyAutoBackup, backupOverdueDays, maybeRemindDailyBackup, analyzeBackupSize, openBackupSizeModal, backupSizeReport, showBackupSizeModal, exportLegacyBackups, purgeLegacyBackups, restoreAutoBackupRecord, backupManagerFiles, backupManagerLoading, backupRenameId, backupRenameDraft, formatBackupFileTime, loadBackupManagerFiles, startRenameBackupFile, cancelRenameBackupFile, commitRenameBackupFile, deleteBackupManagerFile, exportBackupManagerFile, savePreset, deletePreset, presetGroups, isPresetGroupAllEnabled, togglePresetGroupEnabled, isPresetBatchManaging, selectedPresetIndices, showPresetBatchMoveModal, presetBatchTargetGroup, togglePresetBatchMode, toggleSelectPreset, isPresetSelected, toggleSelectGroupPresets, isPresetGroupAllSelected, selectAllPresets, clearSelectedPresets, openPresetBatchMoveModal, applyPresetBatchMove, batchTogglePresetsEnabled, batchDeletePresets, deletePresetGroup,
            activePresetGroupName, activePresetGroup, visiblePresetGroups, openPresetGroup, showPresetGroupForm,
            presetGroupDraft, presetGroupEditing, presetGroupError, openPresetGroupForm, savePresetGroup, exportPresetGroups, importPresets,
            renderMarkdown, messageUsesWideLayout, parseCot, closeCharacterEditor: () => showCharacterEditor.value = false,
            openExportModal: (type) => {
                exportType.value = type;
                selectedExportIndices.value.clear();

                if (type === 'presets') {
                    exportItems.value = presets.value.filter(preset => presetLibrary.groupOf(preset) === activePresetGroupName.value);
                } else if (type === 'regex') {
                    exportItems.value = managedRegexScripts.value.map(item => item.script);
                } else if (type === 'worldinfo') {
                    exportItems.value = worldInfo.value.slice().sort(globalFirst);
                } else if (type === 'uitemplates') {
                    exportItems.value = managedUiTemplates.value;
                }

                showExportModal.value = true;
            },
            toggleExportSelection: (index) => {
                if (selectedExportIndices.value.has(index)) {
                    selectedExportIndices.value.delete(index);
                } else {
                    selectedExportIndices.value.add(index);
                }
            },
            selectAllExportItems: () => {
                exportItems.value.forEach((_, index) => selectedExportIndices.value.add(index));
            },
            deselectAllExportItems: () => {
                selectedExportIndices.value.clear();
            },
            confirmExport: () => {
                const indices = Array.from(selectedExportIndices.value).sort((a, b) => a - b);
                const items = indices.map(i => exportItems.value[i]);

                if (items.length === 0) return;

                let fileName = 'export.json';
                let dataToExport = items;

                if (exportType.value === 'presets') {
                    fileName = window.RPLocalStore.safeName(activePresetGroupName.value) + '-预设.json';
                    // Presets are exported as a direct array of objects
                } else if (exportType.value === 'regex') {
                    fileName = 'regex_scripts.json';
                    dataToExport = items.map(script => toRegexExportEntry(script));
                } else if (exportType.value === 'worldinfo') {
                    fileName = 'world_info.json';
                    // World Info should be wrapped in entries object
                    dataToExport = { entries: items.map(toWorldInfoExportEntry) };
                } else if (exportType.value === 'uitemplates') {
                    fileName = `${currentCharacter.value?.name || 'global'}_ui_templates.json`;
                    dataToExport = {
                        type: 'rp-hub-ui-templates',
                        templates: items.map(toUiTemplateExportEntry)
                    };
                }

                downloadJsonFile(dataToExport, fileName);

                showExportModal.value = false;
                showToast(`成功导出 ${items.length} 个项目`, 'success');
            },

            // Regex Methods
            importRegex: (event) => readJsonFileInput(event, data => {
                const items = Array.isArray(data) ? data : [data];
                const fallbackScope = resourceScope.value;
                const normalized = items.map(script => {
                    const scope = fallbackScope;
                    const result = cardUtils.normalizeImportedRegexScript(
                        { ...script, scope },
                        { fallbackScope: scope, systemNames: systemRegexNames }
                    );
                    if (Object.prototype.hasOwnProperty.call(script || {}, 'name')) result.name = script.name;
                    else if (!script?.scriptName) delete result.name;
                    if (!Object.prototype.hasOwnProperty.call(script || {}, 'regex') && !script?.findRegex) delete result.regex;
                    return result;
                });

                regexScripts.value = [...regexScripts.value, ...normalized];
                showToast(`成功导入 ${normalized.length} 个正则脚本`, 'success');
            }, error => showToast(`导入失败: ${error.message}`, 'error')),
            createRegex: () => {
                editingRegex.id = undefined;
                editingRegex.data = {
                    name: 'New Script',
                    regex: '',
                    flags: 'g',
                    replacement: '',
                    placement: [1, 2],
                    scope: resourceScope.value,
                    markdownOnly: false,
                    promptOnly: false,
                    runOnEdit: false,
                    minDepth: null,
                    maxDepth: null
                };
                showRegexEditor.value = true;
            },
            editRegex: (index) => {
                editingRegex.id = index;
                editingRegex.data = normalizeRegexScript({ ...regexScripts.value[index] });
                showRegexEditor.value = true;
            },
            saveRegex: () => {
                const data = normalizeRegexScript(editingRegex.data, editingRegex.data.scope);
                if (editingRegex.id !== undefined) {
                    regexScripts.value[editingRegex.id] = data;
                } else {
                    regexScripts.value.push(data);
                }
                showRegexEditor.value = false;
                resourceScope.value = data.scope;
            },
            deleteRegex: (index) => {
                confirmAction('确定要删除这个正则脚本吗？此操作无法撤销。', () => {
                    regexScripts.value.splice(index, 1);
                    showToast('正则脚本已删除', 'success');
                });
            },

            editActiveTool: (index) => {
                const tool = activeTools.value[index];
                if (!tool) return;
                editingActiveTool.id = index;
                editingActiveTool.data = normalizeActiveTool(JSON.parse(JSON.stringify(tool)));
                showActiveToolEditor.value = true;
            },
            saveActiveTool: () => {
                const index = editingActiveTool.id;
                if (index === undefined || !activeTools.value[index]) {
                    showActiveToolEditor.value = false;
                    return;
                }
                const previous = activeTools.value[index];
                const data = normalizeActiveTool({
                    ...previous,
                    resultCount: editingActiveTool.data.resultCount,
                    resultCountVersion: ACTIVE_TOOL_RESULT_COUNT_VERSION,
                    // 只有编辑器确实给出字符串时才覆盖：undefined 会被 unwrapForStorage 直接丢掉，
                    // 落库读回就是空串，等于把已配好的密钥清掉。
                    tavilyApiKey: typeof editingActiveTool.data.tavilyApiKey === 'string'
                        ? editingActiveTool.data.tavilyApiKey
                        : previous.tavilyApiKey
                });
                activeTools.value[index] = data;
                normalizeActiveTools();
                showActiveToolEditor.value = false;
                showToast('工具设置已保存', 'success');
            },

            // World Info Methods
            importWorldInfo: (event) => readJsonFileInput(event, data => {
                let entries = [];
                if (Array.isArray(data)) {
                    entries = data;
                } else if (Array.isArray(data?.entries)) {
                    entries = data.entries;
                } else if (data?.entries && typeof data.entries === 'object') {
                    entries = Object.values(data.entries);
                }
                if (entries.length > 0) {
                    const normalizedEntries = entries.map(entry => {
                        const result = normalizeWorldInfoEntry(entry);
                        if (!systemWorldInfoNames.includes(result.comment)) result.scope = resourceScope.value;
                        return result;
                    });
                    worldInfo.value = [...worldInfo.value, ...normalizedEntries];
                    syncWorldInfoToCurrentCharacter();
                    showToast('世界书导入成功', 'success');
                }
            }, () => showToast('导入失败: 格式错误', 'error')),
            createWorldInfo: () => {
                editingWorldInfo.id = undefined;
                editingWorldInfo.data = {
                    // Basic
                    comment: '',
                    keys: [],
                    content: '',
                    enabled: true,
                    scope: resourceScope.value,

                    // Position & Order
                    position: 'global_note',
                    depth: 4,
                    order: 100,

                    // Matching Strategy
                    useRegex: false,
                    scanDepth: 2,
                    probability: 100,
                    useProbability: true,

                    constant: false
                };
                setWorldInfoKeysText(editingWorldInfo.data.keys);
                showWorldInfoEditor.value = true;
            },
            editWorldInfo: (index) => {
                editingWorldInfo.id = index;
                const data = JSON.parse(JSON.stringify(worldInfo.value[index]));
                // Ensure defaults
                if (!data.position) data.position = 'at_depth';
                if (data.depth === undefined) data.depth = 4;
                if (data.order === undefined) data.order = 100;
                if (data.probability === undefined) data.probability = 100;
                if (data.useProbability === undefined) data.useProbability = true;
                if (!data.comment) data.comment = '';
                if (!data.scope) data.scope = 'character';

                // New fields defaults
                if (data.useRegex === undefined) data.useRegex = false;
                if (data.scanDepth === undefined) data.scanDepth = 2;
                if (data.constant === undefined) data.constant = false;

                editingWorldInfo.data = normalizeWorldInfoEntry(data);
                setWorldInfoKeysText(editingWorldInfo.data.keys);
                showWorldInfoEditor.value = true;
            },
            saveWorldInfo: () => {
                editingWorldInfo.data.keys = parseWorldInfoKeysText(worldInfoKeysText.value, editingWorldInfo.data.useRegex);
                const data = normalizeWorldInfoEntry(editingWorldInfo.data);
                if (editingWorldInfo.id !== undefined) {
                    if (data.content !== worldInfo.value[editingWorldInfo.id]?.content) data.customContent = true;
                    worldInfo.value[editingWorldInfo.id] = data;
                } else {
                    worldInfo.value.push(data);
                }
                syncWorldInfoToCurrentCharacter();
                resourceScope.value = data.scope;
                showWorldInfoEditor.value = false;

            },
            deleteWorldInfo: (index) => {
                confirmAction('确定要删除这个世界书条目吗？此操作无法撤销。', () => {
                    worldInfo.value.splice(index, 1);
                    syncWorldInfoToCurrentCharacter();
                    showToast('世界书条目已删除', 'success');
                });
            },

            showRegexEditor, showWorldInfoEditor, editingRegex, editingWorldInfo, worldInfoKeysText, updateEditingWorldInfoKeys,
            resourceBatch, resourceTap, visibleWorldInfo, worldInfoViewport, worldInfoScrolled, onWorldInfoScroll, scrollWorldInfoTop, resourceScope, managedRegexScripts,
            worldInfoSettings, showWorldInfoSettings, showMemorySettings, settingsHelpTopic, showActiveToolSettings, showUiTemplateSettings, estimatedGenerationTime, currentWaitTime,
            globalConfirmModal,

            // User Setup Method
            showUserSetupModal, tempUserSetup,
            handleUserAvatarUpload: (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            user.avatar = await compressImage(e.target.result, 200, 0.6);
                        } catch (err) {
                            user.avatar = e.target.result;
                        }
                        saveData();
                    };
                    reader.readAsDataURL(file);
                }
            },
            saveUserSetup: () => {
                if (!tempUserSetup.name || tempUserSetup.name === '请前往设置自定义你的名称') {
                    showToast('请输入有效的名称', 'error');
                    return;
                }
                user.name = tempUserSetup.name;
                applyPersonPresetSelection(tempUserSetup.person);

                showUserSetupModal.value = false;
                saveData();
                showToast('用户信息已保存', 'success');
            },

            // Person Toggle Logic
            isSecondPerson: computed(() => user.person !== 'third'),
            togglePerson: (person) => {
                applyPersonPresetSelection(person);
                showToast(user.person === 'second' ? '已切换至第二人称视角' : '已切换至第三人称视角', 'success');
                saveData();
            },

            // Auto Image Gen Inquiry
            showAutoImageGenModal,

            setAutoImageGen: (enabled) => {
                const autoImageGenWIName = '自动生图';
                const entry = worldInfo.value.find(w => w.comment === autoImageGenWIName);
                if (entry) {
                    entry.enabled = enabled;
                    showToast(enabled ? '自动生图已开启' : '已保持关闭状态', enabled ? 'success' : 'info');
                }
                showAutoImageGenModal.value = false;
                saveData();
            }
        };
    }
});

// 公共弹窗部件需要全局注册，供其他弹窗组件内部直接复用。
app.component('ModalShell', ModalShell);
app.component('ModalHeader', ModalHeader);
app.component('LocalFilesPanel', window.RPLocalPanel);
app.component('ShellIcon', window.RPAppShell.Icon);
app.component('MascotHeader', window.RPAppShell.MascotHeader);
app.component('ThemeMascot', window.RPAppShell.ThemeMascot);
app.component('PersonaAvatar', window.RPAppShell.PersonaAvatar);
app.component('PokeMascot', window.RPAppShell.PokeMascot);
app.component('ShellDock', window.RPAppShell.Dock);
app.component('ShellChatMenu', window.RPAppShell.ChatMenu);
app.component('ImageDownloadSheet', window.RPAppShell.ImageDownloadSheet);
app.component('CardNightSelect', window.RPAppShell.CardNightSelect);
app.component('ImageProviderSettings', window.RPAppShell.ImageProviderSettings);
app.component('BackupPage', window.RPAppShell.BackupPage);
app.component('ResourceBatchActions', window.RPAppShell.ResourceBatchActions);
app.component('ShellAdvanced', window.RPAppShell.Advanced);
app.component('ShellSettings', window.RPAppShell.Settings);
app.component('ShellUtilities', window.RPAppShell.Utilities);
app.component('CompetitionDetail', window.RPAppShell.CompetitionDetail);
app.component('GalleryPage', window.RPGalleryPage);
app.component('ReleaseAnnouncement', window.RPAppShell.ReleaseAnnouncement);
app.mount('#app');
