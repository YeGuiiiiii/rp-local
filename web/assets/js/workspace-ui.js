(function () {
    'use strict';
    const { ref, reactive, onMounted, onBeforeUnmount } = Vue;
    function createResourceBatch({ source, label, confirm, deleted }) {
        const state = reactive({
            active: false, selected: new Set(),
            get count() { return source().value.filter(item => state.selected.has(item)).length; },
            get total() { return source().value.length; },
            get all() { return state.total > 0 && state.count === state.total; },
            reset() { state.active = false; state.selected.clear(); },
            toggle(item) { state.selected.has(item) ? state.selected.delete(item) : state.selected.add(item); },
            toggleAll() {
                state.active = true;
                state.selected = state.all ? new Set() : new Set(source().value);
            },
            async remove() {
                if (!state.active) { state.active = true; return; }
                if (!state.count) return;
                const target = source(), items = new Set(state.selected);
                if (!await confirm('批量删除' + label(), '确定删除选中的 ' + state.count + ' 条' + label() + '？此操作无法撤销。')
                    || !state.active || source() !== target) return;
                target.value = target.value.filter(item => !items.has(item));
                state.selected.clear();
                deleted();
            }
        });
        return state;
    }
    function createTapGuard() {
        let x = 0, y = 0, moved = false;
        return {
            start(event) { x = event.clientX; y = event.clientY; moved = false; },
            move(event) { if (Math.hypot(event.clientX - x, event.clientY - y) > 10) moved = true; },
            cancel() { moved = true; },
            click(event) {
                if (moved && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); }
            }
        };
    }
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
              <button type="button" class="settings-action" @click="$emit('navigate','backup')">数据与备份</button>
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
    window.RPLocalWorkspace = Object.freeze({ FloatingNavigation, WorkspaceSettings, createReaderSession, createResourceBatch, createTapGuard });
})();
