(function () {
    'use strict';
    const { ref, reactive, onMounted, onBeforeUnmount } = Vue;
    function createReaderSession({ getScope, getContainer, getHistory, getLimit, setLimit, isChat }) {
        let restoring = false;
        let timer;
        const key = () => 'rp-reading::' + getScope();
        const read = () => {
            if (!getScope()) return null;
            try { return JSON.parse(localStorage.getItem(key()) || 'null'); } catch (_) { return null; }
        };
        const capture = (force = false) => {
            if (restoring || (!isChat() && force !== true) || !getScope()) return;
            const container = getContainer();
            if (!container || !container.clientHeight) return;
            const top = container.getBoundingClientRect().top;
            const node = [...container.querySelectorAll('[data-chat-index]')]
                .find(element => element.getBoundingClientRect().bottom > top + 8);
            const index = Number(node?.dataset.chatIndex);
            const value = {
                messageId: Number.isFinite(index) ? getHistory()[index]?.id : null,
                index: Number.isFinite(index) ? index : 0,
                offset: node ? node.getBoundingClientRect().top - top : 0,
                top: container.scrollTop,
                bottom: container.scrollHeight - container.clientHeight - container.scrollTop < 40,
                limit: getLimit(),
            };
            try { localStorage.setItem(key(), JSON.stringify(value)); }
            catch (error) { console.warn('阅读位置保存失败:', error.message); }
        };
        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(capture, 250);
        };
        const restore = async () => {
            const saved = read();
            if (!saved) return false;
            restoring = true;
            try {
                const history = getHistory();
                const index = saved.messageId ? history.findIndex(message => message?.id === saved.messageId) : saved.index;
                if (index >= 0) setLimit(Math.max(saved.limit || 20, history.length - index + 2));
                await Vue.nextTick();
                await new Promise(resolve => requestAnimationFrame(resolve));
                const container = getContainer();
                if (!container) return false;
                const node = container.querySelector(`[data-chat-index="${Math.max(0, index)}"]`);
                if (saved.bottom) container.scrollTop = container.scrollHeight;
                else if (node) container.scrollTop += node.getBoundingClientRect().top - container.getBoundingClientRect().top - (Number(saved.offset) || 0);
                else container.scrollTop = Number(saved.top) || 0;
                return true;
            } finally { restoring = false; }
        };
        const visibility = () => { if (document.hidden) capture(); };
        onMounted(() => {
            window.addEventListener('pagehide', capture);
            document.addEventListener('visibilitychange', visibility);
        });
        onBeforeUnmount(() => {
            clearTimeout(timer);
            capture();
            window.removeEventListener('pagehide', capture);
            document.removeEventListener('visibilitychange', visibility);
        });
        return { capture, restore, schedule };
    }
    const FloatingNavigation = {
        emits: ['open'],
        setup(_, { emit }) {
            let saved = {};
            try { saved = JSON.parse(localStorage.getItem('rp-floating-navigation') || '{}'); } catch (_) {}
            const folded = ref(saved.folded === true);
            const position = reactive({ side: saved.side === 'left' ? 'left' : 'right', ratio: Math.max(.08, Math.min(.85, Number(saved.ratio) || .4)), x: 0, y: 0 });
            let drag = null;
            let suppressClick = false;
            const height = () => window.visualViewport?.height || innerHeight;
            const resize = () => {
                position.x = position.side === 'left' ? 8 : Math.max(8, innerWidth - 52);
                position.y = Math.max(8, Math.min(height() - 60, height() * position.ratio));
            };
            const persist = () => {
                try {
                    localStorage.setItem('rp-floating-navigation', JSON.stringify({ side: position.side, ratio: position.ratio, folded: folded.value }));
                } catch (error) { console.warn('悬浮入口位置保存失败:', error.message); }
            };
            const fold = () => { folded.value = true; persist(); };
            const show = () => { folded.value = false; resize(); persist(); };
            const down = event => {
                if (event.button && event.button !== 0) return;
                drag = { x: event.clientX, y: event.clientY, left: position.x, top: position.y, moved: false };
                event.currentTarget.setPointerCapture(event.pointerId);
                suppressClick = false;
            };
            const move = event => {
                if (!drag) return;
                const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
                if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
                if (!drag.moved) return;
                position.x = Math.max(0, Math.min(innerWidth - 44, drag.left + dx));
                position.y = Math.max(8, Math.min(height() - 60, drag.top + dy));
            };
            const up = () => {
                if (!drag) return;
                suppressClick = drag.moved;
                position.side = position.x + 22 < innerWidth / 2 ? 'left' : 'right';
                position.ratio = position.y / height();
                drag = null;
                resize();
                persist();
            };
            const activate = () => {
                if (suppressClick) { suppressClick = false; return; }
                emit('open');
            };
            onMounted(() => {
                resize();
                window.addEventListener('resize', resize);
                window.visualViewport?.addEventListener('resize', resize);
                window.addEventListener('rp:show-floating', show);
                window.addEventListener('rp:hide-floating', fold);
            });
            onBeforeUnmount(() => {
                window.removeEventListener('resize', resize);
                window.visualViewport?.removeEventListener('resize', resize);
                window.removeEventListener('rp:show-floating', show);
                window.removeEventListener('rp:hide-floating', fold);
            });
            return { position, folded, down, move, up, activate, show };
        },
        template: `
          <button v-if="!folded" type="button" class="workspace-floating app-nav-trigger"
            :style="{left:position.x+'px',top:position.y+'px'}"
            @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @click="activate"
            aria-label="打开悬浮导航" title="打开导航，可拖动" aria-haspopup="dialog" aria-controls="app-navigation-panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><use href="#icon-menu"></use></svg>
          </button>
          <button v-else type="button" class="workspace-floating-tab"
            :class="'workspace-floating-tab--'+position.side"
            :style="{top:position.y+'px'}" @click="show" title="展开悬浮入口" aria-label="展开悬浮入口">
            <span aria-hidden="true">{{position.side==='left'?'›':'‹'}}</span>
          </button>`
    };
    const WorkspaceSettings = {
        emits: ['navigate'],
        setup() {
            const scheme = ref(window.RPHubThemeKit?.scheme || 'auto');
            const accent = ref(window.RPHubThemeKit?.accent || '#5a6ff0');
            return {
                scheme, accent,
                setScheme: () => window.RPHubThemeKit?.setScheme(scheme.value),
                setAccent: () => window.RPHubThemeKit?.setAccent(accent.value),
                showFloating: () => window.dispatchEvent(new Event('rp:show-floating')),
                hideFloating: () => window.dispatchEvent(new Event('rp:hide-floating')),
            };
        },
        template: `
          <section class="settings-card workspace-settings">
            <h3 class="settings-card__title">软件配置</h3>
            <div class="workspace-links">
              <button type="button" class="settings-action" @click="$emit('navigate','presets')">预设</button>
              <button type="button" class="settings-action" @click="$emit('navigate','tools')">工具</button>
              <button type="button" class="settings-action" @click="$emit('navigate','usage')">用量统计</button>
              <button type="button" class="settings-action" @click="$emit('navigate','backup')">数据备份</button>
              <button type="button" class="settings-action" @click="$emit('navigate','patchlist')">关于与鸣谢</button>
              <button type="button" class="settings-action" @click="$emit('navigate','novel')">小说生成</button>
            </div>
            <details class="workspace-appearance">
              <summary>外观与悬浮入口</summary>
              <label>显示模式
                <select v-model="scheme" @change="setScheme">
                  <option value="auto">跟随系统</option><option value="day">日间</option>
                  <option value="night">夜间</option><option value="eye">护眼</option><option value="eyeNight">暗色护眼</option>
                </select>
              </label>
              <label>主色<input type="color" v-model="accent" @input="setAccent"></label>
              <div class="workspace-links">
                <button type="button" class="settings-action" @click="showFloating">显示悬浮入口</button>
                <button type="button" class="settings-action" @click="hideFloating">收起至屏幕边缘</button>
              </div>
            </details>
            <details class="workspace-appearance">
              <summary>旧版共享配置</summary>
              <div class="workspace-links">
                <button type="button" class="settings-action" @click="$emit('navigate',{view:'worldinfo',scope:'global'})">共享世界书</button>
                <button type="button" class="settings-action" @click="$emit('navigate',{view:'regex',scope:'global'})">共享正则</button>
                <button type="button" class="settings-action" @click="$emit('navigate',{view:'uitemplates',scope:'global'})">共享 UI</button>
              </div>
            </details>
          </section>`
    };
    const RoleMemoryManager = {
        props: {
            character: { type: Object, required: true },
            busy: Boolean
        },
        emits: ['close', 'saved', 'export'],
        setup(props, { emit }) {
            const entries = ref([]);
            const branches = ref([]);
            const branchId = ref('main');
            const error = ref('');
            const status = ref('');
            const loading = ref(false);
            const limit = ref(20);
            const dirty = ref(false);
            const panel = ref(null);
            const previousFocus = document.activeElement;
            let memoryState = null;
            let epoch = 0;
            let scope = '';
            const storage = window.RPHubStorage;
            const branchScope = id => window.RPHubStoryBranches.getStoryBranchScopeId(props.character.uuid, id);
            const clone = value => storage.cloneForStorage(value);
            const validate = value => {
                if (!Array.isArray(value) || value.some(item => !item || item.classicMemory !== true
                    || typeof item.summary !== 'string' || !item.summary.trim())) {
                    throw new Error('记忆格式无效：每条需要 classicMemory 与非空 summary');
                }
                return clone(value);
            };
            const load = async id => {
                if (dirty.value && !confirm('放弃尚未保存的记忆修改？')) return;
                const token = ++epoch;
                loading.value = true;
                error.value = '';
                status.value = '';
                try {
                    const targetScope = branchScope(id);
                    const state = await storage.readMemoryState(targetScope);
                    const raw = state.list;
                    if (token !== epoch) return;
                    const loaded = validate(raw);
                    scope = targetScope;
                    branchId.value = id;
                    memoryState = state;
                    entries.value = loaded;
                    dirty.value = false;
                    limit.value = 20;
                } catch (failure) { error.value = failure.message; }
                finally { if (token === epoch) loading.value = false; }
            };
            const save = async () => {
                if (props.busy || loading.value || !scope) return;
                loading.value = true;
                error.value = '';
                try {
                    const result = validate(entries.value);
                    const saved = await storage.commitMemoryState(memoryState, result);
                    if (!['committed', 'unchanged'].includes(saved.status)) {
                        throw new Error(saved.status === 'conflict' ? '这份记忆已有更新，请重新打开后再编辑'
                            : saved.error?.message || '记忆保存失败，请重新打开后核对');
                    }
                    memoryState = saved.state;
                    entries.value = result;
                    dirty.value = false;
                    status.value = '记忆已保存';
                    emit('saved', { scope, memories: result, state: saved.state });
                } catch (failure) { error.value = failure.message; }
                finally { loading.value = false; }
            };
            const edit = entry => {
                dirty.value = true;
                status.value = '';
                ['embeddingQ', 'embeddingScale', 'embeddingDims', 'embeddingEncoding', 'embeddingModel', 'embeddingApiUrl']
                    .forEach(key => delete entry[key]);
            };
            const importFile = async event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file || props.busy || !scope) return;
                try {
                    if (file.size > 20 * 1024 * 1024) throw new Error('记忆文件超过 20 MB');
                    const data = JSON.parse(await file.text());
                    if (data.type !== 'rp-local-character-memory' || data.version !== 1) throw new Error('请选择导出的角色记忆 JSON 文件');
                    entries.value = validate(data.memories);
                    dirty.value = true;
                    status.value = `已载入${data.characterName || '角色'}的记忆，点击保存后写入当前角色与分支`;
                    error.value = '';
                } catch (failure) { error.value = failure.message; }
            };
            const exportFile = () => emit('export', {
                type: 'rp-local-character-memory', version: 1,
                characterId: props.character.uuid, characterName: props.character.name,
                branchId: branchId.value, exportedAt: new Date().toISOString(), memories: clone(entries.value)
            }, window.RPLocalStore.safeName(props.character.importedName || props.character.name) + '-记忆-' + branchId.value + '.json');
            const close = () => {
                if (!dirty.value || confirm('放弃尚未保存的记忆修改？')) emit('close');
            };
            const trapFocus = event => {
                if (event.key !== 'Tab') return;
                const items = [...panel.value.querySelectorAll('button:not(:disabled),select:not(:disabled),textarea:not(:disabled),input:not(:disabled)')]
                    .filter(item => item.getClientRects().length);
                const first = items[0], last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault(); last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault(); first?.focus();
                }
            };
            onMounted(async () => {
                window.addEventListener('rp:close-memory', close);
                panel.value?.querySelector('button')?.focus();
                loading.value = true;
                try {
                    const state = await storage.getScopedStoredValue('branches', props.character.uuid);
                    branches.value = [{ id: 'main', name: '主线' }, ...(state?.branches || []).filter(branch => branch.id !== 'main')];
                    branchId.value = branches.value.some(branch => branch.id === state?.activeBranchId) ? state.activeBranchId : 'main';
                    await load(branchId.value);
                } catch (failure) { error.value = failure.message; loading.value = false; }
            });
            onBeforeUnmount(() => {
                window.removeEventListener('rp:close-memory', close);
                epoch++;
                if (previousFocus?.isConnected) previousFocus.focus();
            });
            return { panel, trapFocus, entries, branches, branchId, error, status, loading, dirty, limit, load, save, edit, importFile, exportFile, close };
        },
        template: `
          <teleport to="body">
            <div class="workspace-memory-dialog" role="dialog" aria-modal="true" aria-label="角色卡记忆管理" @keydown.esc.stop="close" @keydown="trapFocus">
              <section ref="panel" class="workspace-memory">
                <header><h2>{{character.name}} · 记忆</h2>
                  <button type="button" aria-label="关闭记忆管理" @click="close">×</button>
                </header>
                <select :value="branchId" @change="load($event.target.value);$event.target.value=branchId" :disabled="loading || busy" aria-label="记忆分支">
                  <option v-for="branch in branches" :key="branch.id" :value="branch.id">{{branch.name}}</option>
                </select>
                <p v-if="busy" role="status">当前角色正在生成或处理记忆，完成后可保存。</p>
                <p v-if="loading" role="status">正在读取或保存…</p>
                <p v-if="error" role="alert" class="workspace-memory-error">{{error}}</p>
                <p v-if="status" role="status">{{status}}</p>
                <div class="workspace-links">
                  <label class="settings-action workspace-memory-file">导入记忆
                    <input type="file" accept=".json" @change="importFile" :disabled="loading || busy">
                  </label>
                  <button type="button" class="settings-action" @click="exportFile" :disabled="loading">导出记忆</button>
                  <button type="button" class="settings-action" @click="save" :disabled="loading || busy || !dirty">保存记忆</button>
                </div>
                <p v-if="!entries.length && !loading" class="text-gray-500">这张角色卡的当前分支暂无记忆。</p>
                <div v-for="(entry,index) in entries.slice(0,limit)" :key="index" class="my-3">
                  <label :for="'managed-memory-'+index">第 {{entry.turn || index+1}} 轮</label>
                  <textarea :id="'managed-memory-'+index" v-model="entry.summary" @input="edit(entry)" :disabled="busy || loading"></textarea>
                </div>
                <button v-if="entries.length>limit" type="button" class="settings-action" @click="limit+=20">加载更多记忆</button>
              </section>
            </div>
          </teleport>`
    };
    window.RPLocalWorkspace = Object.freeze({ FloatingNavigation, WorkspaceSettings, createReaderSession, RoleMemoryManager });
})();
