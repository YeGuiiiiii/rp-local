(function () {
    'use strict';
    const { ref, computed, onMounted, onBeforeUnmount, watch, h, nextTick } = Vue;
    const ImageProviderSettings = {
        props: { api: Object },
        emits: ['remove'],
        setup: () => ({ fieldId: Vue.useId() }),
        template: `<div class="mb-4">
          <label class="settings-label" :for="'image-provider-' + fieldId">生图接口</label>
          <div class="flex items-center gap-2">
            <select :id="'image-provider-' + fieldId" class="settings-control min-w-0 flex-1" :value="api.selectedId" :disabled="!api.ready" @change="api.select($event.target.value)">
              <option v-for="item in api.profiles" :key="item.id" :value="item.id">{{item.name}}</option>
            </select>
            <button type="button" class="settings-icon-button" aria-label="添加生图接口" title="添加生图接口" :disabled="!api.ready" @click="api.add()"><shell-icon name="Plus"/></button>
            <button v-if="api.selectedId !== 'builtin'" type="button" class="settings-icon-button" aria-label="删除生图接口" title="删除生图接口" @click="$emit('remove')"><shell-icon name="Trash2"/></button>
          </div>
          <div v-if="api.selectedId !== 'builtin'" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="min-w-0"><span class="settings-label">接口名称</span>
              <input class="settings-control" aria-label="接口名称" :value="api.current.name" @input="api.update('name', $event.target.value)"></label>
            <label class="min-w-0"><span class="settings-label">接口格式</span>
              <select class="settings-control" aria-label="接口格式" :value="api.current.protocol" @change="api.update('protocol', $event.target.value)">
                <option value="openai">OpenAI 兼容</option><option value="novelai">NovelAI 兼容</option><option value="jobs">原站任务格式</option>
              </select></label>
            <label class="min-w-0 md:col-span-2"><span class="settings-label">API 地址</span>
              <input type="url" class="settings-control" aria-label="生图 API 地址" :placeholder="api.current.protocol === 'jobs' ? 'https://example.com' : api.current.protocol === 'novelai' ? 'https://example.com/ai/generate-image' : 'https://example.com/v1/images/generations'" autocomplete="off" autocapitalize="none" spellcheck="false" :value="api.current.url" @input="api.update('url', $event.target.value)"></label>
            <template v-if="api.current.protocol === 'openai'">
              <div class="min-w-0">
                <label class="settings-label" :for="'image-model-' + fieldId">生图模型</label>
                <div class="flex items-center gap-2">
                  <input :id="'image-model-' + fieldId" class="settings-control min-w-0 flex-1" aria-label="生图模型" placeholder="模型名称" :value="api.current.model" @input="api.update('model', $event.target.value)">
                  <button type="button" class="settings-icon-button" aria-label="读取生图模型列表" title="读取生图模型列表" :disabled="api.modelsLoading || !api.current.url.trim()" @click="api.fetchModels()"><shell-icon name="RefreshCw"/></button>
                </div>
                <select v-if="api.models.length" class="settings-control mt-2" aria-label="可用生图模型" :value="api.models.includes(api.current.model) ? api.current.model : ''" @change="$event.target.value && api.update('model', $event.target.value)">
                  <option value="" disabled>选择模型</option><option v-for="model in api.models" :key="model" :value="model">{{model}}</option>
                </select>
                <p v-if="api.modelsLoading || api.modelsError" class="mt-2 text-sm text-gray-500" role="status">{{api.modelsLoading ? '正在读取模型…' : api.modelsError}}</p>
              </div>
              <label class="min-w-0"><span class="settings-label">输出尺寸</span>
                <input class="settings-control" aria-label="输出尺寸" placeholder="auto" :value="api.current.size" @input="api.update('size', $event.target.value)"></label>
            </template>
          </div>
          <p v-if="api.error" class="mt-2 text-sm text-red-600" role="alert">{{api.error}}</p>
        </div>`
    };
    const useCardNight = () => {
        const cardNightEnabled = ref(window.RPCardNight.enabled), cardNightMode = ref(window.RPCardNight.mode);
        const sync = () => { cardNightEnabled.value = window.RPCardNight.enabled; cardNightMode.value = window.RPCardNight.mode; };
        window.addEventListener('rp-card-night-change', sync);
        onBeforeUnmount(() => window.removeEventListener('rp-card-night-change', sync));
        return { cardNightEnabled, cardNightMode,
            setCardNightEnabled: event => window.RPCardNight.setEnabled(event.target.checked),
            setCardNightMode: event => window.RPCardNight.setMode(event.target.value) };
    };
    const CardNightSelect = {
        props: { disabled: Boolean },
        setup: useCardNight,
        template: `<label class="shell-form-row shell-card-night"><span>当前卡片夜间显示</span>
          <select aria-label="当前卡片夜间显示" :value="cardNightMode" :disabled="disabled" @change="setCardNightMode">
            <option value="follow">跟随外观</option><option value="auto">自动变暗</option><option value="original">保留原色</option>
          </select>
        </label>`
    };
    const useThemePack = () => {
        const selected = ref(window.RPThemePacks.current);
        const night = ref(window.RPThemePacks.mode === 'night');
        const sync = () => { selected.value = window.RPThemePacks.current; night.value = window.RPThemePacks.mode === 'night'; };
        window.addEventListener('rp-ui-theme-change', sync);
        onBeforeUnmount(() => window.removeEventListener('rp-ui-theme-change', sync));
        return { selected, night, packs: window.RPThemePacks.catalog,
            variant: computed(() => { selected.value; night.value; return window.RPThemePacks.variant(); }),
            toggleDayNight: () => window.RPThemePacks.toggleMode(),
            preview: pack => pack.variants[night.value ? 'night' : 'day'].preview };
    };
    const ThemeMascot = {
        props: { pose: { type: String, default: 'welcome' }, alt: { type: String, default: '陈玥' } },
        setup(props) {
            const skin = ref(document.documentElement.dataset.uiPack + ':' + document.documentElement.dataset.uiSkin);
            const sync = () => { skin.value = document.documentElement.dataset.uiPack + ':' + document.documentElement.dataset.uiSkin; };
            window.addEventListener('rp-ui-theme-change', sync);
            onBeforeUnmount(() => window.removeEventListener('rp-ui-theme-change', sync));
            return { source: computed(() => { skin.value; return window.RPThemePacks.asset(props.pose); }) };
        },
        template: `<img :src="source" :alt="alt" data-rphub-no-save>`
    };
    const PokeMascot = {
        components: { ThemeMascot },
        props: { pose: { type: String, default: 'welcome' }, context: String, active: { type: Boolean, default: true } },
        setup(props) {
            const target = ref(null), speech = ref(''), emotion = ref(''), position = ref({});
            let timer, animation, anchor;
            const clear = () => {
                clearTimeout(timer);
                speech.value = ''; emotion.value = '';
                animation?.cancel();
            };
            const say = response => {
                if (!response || !props.active) return;
                clear();
                const bounds = target.value.getBoundingClientRect();
                anchor = { x: bounds.x, y: bounds.y };
                const width = Math.min(240, innerWidth - 24);
                position.value = {
                    width: width + 'px',
                    left: Math.max(12, Math.min(innerWidth - width - 12, bounds.x + bounds.width / 2 - width / 2)) + 'px',
                    ...(bounds.top >= 80 ? { bottom: innerHeight - bounds.top + 6 + 'px' } : { top: bounds.bottom + 6 + 'px' })
                };
                speech.value = response.text; emotion.value = response.emotion;
                timer = setTimeout(clear, 1500);
            };
            const poke = () => {
                say(window.RPMascotDialogue.poke(props.context));
                if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    animation = target.value.querySelector('img').animate([
                        { transform: 'translateY(0)' }, { transform: 'translateY(-9px)', offset: .35 },
                        { transform: 'translateY(2px)', offset: .72 }, { transform: 'translateY(0)' }
                    ], { duration: 340, easing: 'ease-out' });
                }
            };
            const greet = () => {
                if (props.context === 'characters' && props.active && window.__rpDataReady && !document.querySelector('.entry-transition')
                    && ![...document.querySelectorAll('[role="dialog"]')].some(el => el.getClientRects().length)) {
                    say(window.RPMascotDialogue.greeting());
                }
            };
            const hidden = () => { if (document.hidden) clear(); };
            const scroll = () => {
                const bounds = target.value?.getBoundingClientRect();
                if (speech.value && bounds && (bounds.x !== anchor.x || bounds.y !== anchor.y)) clear();
            };
            watch(() => props.active, active => { if (!active) clear(); else nextTick(greet); });
            onMounted(() => {
                greet();
                window.addEventListener('rp:startup-finished', greet);
                window.addEventListener('resize', clear);
                window.addEventListener('scroll', scroll, true);
                document.addEventListener('visibilitychange', hidden);
            });
            onBeforeUnmount(() => {
                clear();
                window.removeEventListener('rp:startup-finished', greet);
                window.removeEventListener('resize', clear);
                window.removeEventListener('scroll', scroll, true);
                document.removeEventListener('visibilitychange', hidden);
            });
            return { target, speech, emotion, position, poke };
        },
        template: `
          <button ref="target" type="button" class="yy-poke-mascot" aria-label="戳戳玥玥" title="戳戳玥玥" @click.stop="poke">
            <theme-mascot :pose="emotion ? 'poke-'+emotion : pose" alt=""></theme-mascot>
            <teleport to="body">
              <transition name="yy-speech">
                <p v-if="speech && active" class="yy-mascot-speech" role="status" aria-live="polite" :style="position">{{speech}}</p>
              </transition>
            </teleport>
          </button>`
    };
    function useDialogFocus(open, selector) {
        let previous;
        watch(open, async value => {
            if (value) {
                previous = document.activeElement;
                await nextTick();
                document.querySelector(selector)?.querySelector('button:not(:disabled)')?.focus();
            } else if (previous?.isConnected) previous.focus();
        });
        return event => {
            if (event.key !== 'Tab') return;
            const dialog = document.querySelector(selector);
            const buttons = [...(dialog?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || [])].filter(item => item.getClientRects().length);
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
    }
    const Icon = {
        props: { name: String },
        render() {
            return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8,
                'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'shell-icon' },
            (window.RPShellIcons[this.name] || window.RPShellIcons.CircleHelp).map(([tag, attrs]) => h(tag, attrs)));
        }
    };
    const ResourceBatchActions = {
        components: { Icon },
        props: { api: Object, label: String },
        template: `<div class="resource-batch-actions">
          <button type="button" class="settings-icon-button" :aria-label="(api.all?'全不选':'全选')+label" :title="api.all?'全不选':'全选'" :aria-pressed="api.all" :disabled="!api.total" @click="api.toggleAll()"><icon name="CheckCheck"/></button>
          <button type="button" class="settings-icon-button" :aria-label="(api.active?'删除所选':'批量删除')+label" :title="api.active?'删除所选':'批量删除'" :disabled="api.active && !api.count" @click="api.remove()"><icon name="Trash2"/></button>
        </div>`
    };
    const MascotHeader = {
        components: { PokeMascot },
        props: { title: String, count: String, pose: { type: String, default: 'welcome' }, active: { type: Boolean, default: true } },
        template: `
          <header class="yy-page-header">
            <div class="yy-page-heading"><h1>{{title}}<span v-if="count" class="yy-heading-count">{{count}}</span></h1></div>
            <poke-mascot :pose="pose" :active="active" :context="({'设置':'settings','高级功能':'advanced','画廊':'gallery','关于与鸣谢':'about'})[title]" class="yy-page-mascot"></poke-mascot>
          </header>`
    };
    const Dock = {
        components: { Icon },
        props: { active: String, folded: Boolean, online: Boolean },
        emits: ['navigate', 'fold', 'online', 'close-online'],
        setup(props, { emit }) {
            const theme = useThemePack();
            const trigger = ref(null), highlighted = ref(''), origin = ref({ x: 0, y: 0 });
            const destinations = [
                { view: 'lighthouse', name: '灯塔', icon: 'Lighthouse', dx: -22, dy: -116 },
                { view: 'square', name: '万相广场', icon: 'Globe2', dx: -108, dy: -54 }
            ];
            const choices = computed(() => destinations.map(item => ({
                ...item,
                x: Math.max(40, Math.min(innerWidth - 40, origin.value.x + item.dx)),
                y: Math.max(40, Math.min(innerHeight - 64, origin.value.y + item.dy))
            })));
            let timer, pointer, held = false, suppressClick = false;
            const reset = () => {
                clearTimeout(timer);
                pointer = null; held = false; highlighted.value = '';
            };
            const close = () => { reset(); emit('close-online'); };
            const locate = () => {
                const rect = trigger.value?.getBoundingClientRect();
                if (rect) origin.value = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            };
            const hit = event => choices.value.find(item => Math.hypot(event.clientX - item.x, event.clientY - item.y) <= 40)?.view || '';
            const press = event => {
                if (!event.isPrimary || event.button !== 0) return;
                reset(); suppressClick = false;
                pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
                timer = setTimeout(() => {
                    held = true; suppressClick = true;
                    locate(); emit('online');
                }, 360);
            };
            const move = event => {
                if (pointer?.id !== event.pointerId) return;
                if (held) highlighted.value = hit(event);
                else if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 12) {
                    clearTimeout(timer); suppressClick = true;
                }
            };
            const release = event => {
                if (pointer?.id !== event.pointerId) return;
                const destination = held && props.online ? hit(event) : '';
                const wasHeld = held;
                reset();
                if (destination) emit('navigate', destination);
                else if (wasHeld) emit('close-online');
            };
            const cancel = event => {
                if (pointer?.id !== event.pointerId) return;
                suppressClick = true; close();
            };
            const click = event => {
                if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
                locate(); emit('online');
            };
            const hidden = () => { if (document.hidden) close(); };
            watch(() => props.online, open => { if (open) locate(); else reset(); });
            watch(() => props.folded, folded => { if (folded) close(); });
            onMounted(() => {
                window.addEventListener('resize', close);
                window.addEventListener('blur', close);
                document.addEventListener('visibilitychange', hidden);
            });
            onBeforeUnmount(() => {
                reset();
                window.removeEventListener('resize', close);
                window.removeEventListener('blur', close);
                document.removeEventListener('visibilitychange', hidden);
            });
            return { trigger, highlighted, origin, choices, press, move, release, cancel, click, close,
                nightNavigation: computed(() => theme.variant.value.navigationNightArt),
                navigation: view => theme.variant.value.navigation + view + '.webp',
                trapFocus: useDialogFocus(() => props.online, '#shell-online-wheel'), tabs: [
                { view: 'characters', name: '角色卡', icon: 'Users' },
                { view: 'album', name: '画廊', icon: 'Images' },
                { view: 'advanced', name: '高级', icon: 'SlidersHorizontal' },
                { view: 'settings', name: '设置', icon: 'UserRound' }
            ] };
        },
        template: `
          <div class="shell-dock-wrap" :class="{'is-folded':folded}">
            <button type="button" class="shell-dock-fold" @click="$emit('fold',!folded)"
              :aria-label="folded?'展开底部快捷栏':'收起底部快捷栏'" :title="folded?'展开底部快捷栏':'收起底部快捷栏'">
              <icon :name="folded?'ChevronUp':'ChevronDown'"/>
            </button>
            <transition name="shell-dock-fold">
            <div v-if="!folded" class="shell-dock-row">
              <nav class="shell-dock" aria-label="主导航" :style="{'--dock-index':Math.max(0,tabs.findIndex(tab=>tab.view===active))}">
                <span class="shell-dock-indicator" aria-hidden="true"></span>
                <button v-for="tab in tabs" :key="tab.view" type="button"
                  :class="{'is-active':active===tab.view}" :aria-current="active===tab.view?'page':null"
                  :aria-label="tab.name" :title="tab.name" @click="$emit('navigate',tab.view)">
                  <img v-if="nightNavigation" :src="navigation(tab.view)" alt="" class="shell-dock-night-art" data-rphub-no-save>
                  <img v-else :src="navigation(tab.view)" alt="" class="shell-dock-art" data-rphub-no-save>
                  <icon :name="tab.icon" class="shell-dock-symbol"/><span>{{tab.name}}</span>
                </button>
              </nav>
              <button ref="trigger" type="button" class="shell-online-trigger" aria-label="在线入口" title="在线入口"
                :aria-expanded="online" aria-controls="shell-online-wheel" @click="click" @contextmenu.prevent
                @pointerdown="press" @pointermove="move" @pointerup="release" @pointercancel="cancel" @lostpointercapture="cancel">
                <icon :name="online?'X':'Globe2'"/>
              </button>
            </div>
            </transition>
          </div>
          <teleport to="body">
            <transition name="shell-online">
            <div v-if="online" class="shell-online-mask" @keydown.esc.stop.prevent="close" @keydown="trapFocus">
              <section id="shell-online-wheel" class="shell-online-wheel" role="dialog" aria-modal="true" aria-label="在线入口">
                <div class="shell-online-dismiss" @click="close"></div>
                <button type="button" class="shell-wheel-close" aria-label="关闭在线入口" @click="close"
                  :style="{left:(origin.x-27)+'px',top:(origin.y-27)+'px'}"><icon name="X"/></button>
                <button v-for="item in choices" :key="item.view" type="button" class="shell-online-choice"
                  :class="{'is-target':highlighted===item.view}" :aria-label="item.name" :title="item.name"
                  :style="{left:(item.x-32)+'px',top:(item.y-32)+'px','--from-x':(origin.x-item.x)+'px','--from-y':(origin.y-item.y)+'px'}"
                  @click="$emit('navigate',item.view)">
                  <icon :name="item.icon"/><span>{{item.name}}</span>
                </button>
              </section>
            </div>
            </transition>
          </teleport>`
    };
    const ChatMenu = {
        components: { Icon, PokeMascot },
        props: { show: Boolean, name: String },
        emits: ['close', 'navigate'],
        setup(props) {
            const theme = useThemePack();
            return {
                night: theme.night, toggleDayNight: theme.toggleDayNight,
                version: window.RP_LOCAL_VERSION,
                trapFocus: useDialogFocus(() => props.show, '.shell-chat-menu'),
                items: [
                    { view: 'worldinfo', name: '世界书', label: '当前角色世界书', icon: 'BookOpen' },
                    { view: 'regex', name: '正则', label: '当前角色正则', icon: 'Code2' },
                    { view: 'uitemplates', name: 'UI 模板', label: '当前角色 UI', icon: 'PanelsTopLeft' },
                    { view: 'memory', name: '记忆系统', label: '记忆系统', icon: 'Brain' }
                ]
            };
        },
        template: `
          <teleport to="body">
            <div v-if="show" class="shell-menu-mask" @click.self="$emit('close')" @keydown.esc.stop.prevent="$emit('close')" @keydown="trapFocus">
              <section class="shell-chat-menu" role="dialog" aria-modal="true" aria-label="聊天菜单">
                <header class="yy-menu-header">
                  <div><small>玥玥的快捷手账</small><strong>{{name || '聊天'}}</strong></div>
                  <poke-mascot pose="welcome" context="menu"></poke-mascot>
                  <button type="button" class="shell-icon-button yy-menu-close" aria-label="关闭聊天菜单" @click="$emit('close')"><icon name="X"/></button>
                </header>
                <button type="button" class="yy-menu-return" @click="$emit('navigate','characters')"><icon name="ArrowLeft"/><span>返回角色卡目录</span><icon name="FolderOpen"/></button>
                <p class="yy-menu-section">{{name?'当前角色':'尚未选择角色卡'}}</p>
                <div class="yy-menu-grid">
                  <button v-for="item in items" :key="item.view" type="button" :aria-label="item.label" :disabled="!name"
                    @click="$emit('navigate',item.view)">
                    <icon :name="item.icon"/><span>{{item.name}}</span>
                  </button>
                </div>
                <card-night-select :disabled="!name"></card-night-select>
                <div class="yy-menu-bottom">
                  <button type="button" @click="$emit('navigate','advanced')"><icon name="SlidersHorizontal"/><span>高级功能</span></button>
                  <button type="button" @click="toggleDayNight" :aria-label="night?'切换到日间模式':'切换到夜间模式'"
                    :title="night?'切换到日间模式':'切换到夜间模式'"><icon :name="night?'Sun':'Moon'"/><span>{{night?'日间':'夜间'}}</span></button>
                  <button type="button" @click="$emit('navigate','settings')"><icon name="Settings2"/><span>设置</span></button>
                </div>
                <p class="yy-menu-signature">RP 本地版 {{version}}</p>
              </section>
            </div>
          </teleport>`
    };
    function useCompetitionClock() {
        const now = ref(Date.now());
        const refresh = () => { now.value = Date.now(); };
        let timer;
        onMounted(() => {
            timer = setInterval(refresh, 60000);
            document.addEventListener('visibilitychange', refresh);
        });
        onBeforeUnmount(() => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', refresh);
        });
        return event => window.RPCompetitions.phase(event, now.value);
    }
    const competitionSlide = ref(0);
    const CompetitionList = {
        components: { Icon },
        props: { compact: Boolean },
        emits: ['select'],
        setup() {
            const events = window.RPCompetitions.events, selected = competitionSlide;
            const step = (direction, event) => {
                const track = event?.target.closest('.competition-entry--banner')?.parentElement;
                selected.value = (selected.value + direction + events.length) % events.length;
                if (track) nextTick(() => track.querySelectorAll('.competition-entry')[selected.value]?.focus({ preventScroll: true }));
            };
            return { events, selected, step, phase: useCompetitionClock() };
        },
        template: `
          <div class="competition-list" :class="{'competition-list--compact':compact,'competition-carousel':!compact}" role="group" aria-label="灯塔赛事">
            <div class="competition-slides" @keydown.left.prevent="step(-1,$event)" @keydown.right.prevent="step(1,$event)">
            <button v-for="(event,index) in events" v-show="compact || index===selected" :key="event.id" type="button" class="competition-entry"
              :class="compact?'':'competition-entry--banner competition-entry--'+event.id"
              :aria-label="event.name" @click="$emit('select',event.id)">
              <img v-if="!compact" :src="event.banner" alt="" width="1200" height="450" loading="lazy" data-rphub-no-save>
              <span class="competition-entry-copy"><strong>{{event.name}}</strong>
                <span v-if="!compact">{{event.reward}}</span>
                <small>{{phase(event)}} · {{event.deadline}} 截稿</small>
              </span><icon v-if="compact" name="ChevronRight"/>
            </button>
            <template v-if="!compact">
              <button type="button" class="competition-carousel-arrow competition-carousel-arrow--previous" aria-label="上一场赛事" title="上一场赛事" @click="step(-1)"><icon name="ChevronLeft"/></button>
              <button type="button" class="competition-carousel-arrow competition-carousel-arrow--next" aria-label="下一场赛事" title="下一场赛事" @click="step(1)"><icon name="ChevronRight"/></button>
            </template>
            </div>
            <div v-if="!compact" class="competition-carousel-dots" role="group" aria-label="选择赛事" @keydown.left.prevent="step(-1,$event)" @keydown.right.prevent="step(1,$event)">
              <button v-for="(event,index) in events" :key="event.id" type="button" :aria-label="'查看'+event.name"
                :title="event.name" :aria-pressed="index===selected" @click="selected=index"><span></span></button>
            </div>
          </div>`
    };
    const CompetitionDetail = {
        components: { Icon, SettingsPageHeader: window.RPHubComponents.SettingsPageHeader },
        props: { event: Object },
        emits: ['back', 'visit'],
        setup() { return { phase: useCompetitionClock() }; },
        template: `
          <main class="management-view competition-page" data-rphub-no-save>
            <settings-page-header :title="event.name" @menu="$emit('back')"></settings-page-header>
            <article class="competition-detail">
              <div class="competition-intro">
                <p class="competition-subtitle">{{event.subtitle}}</p>
                <p>{{event.introduction}}</p>
                <dl class="competition-facts"><div><dt>投稿状态</dt><dd>{{phase(event)}}</dd></div>
                  <div v-for="fact in event.facts" :key="fact[0]"><dt>{{fact[0]}}</dt><dd>{{fact[1]}}</dd></div></dl>
              </div>
              <section class="competition-section">
                <h2>赛事奖励</h2>
                <dl class="competition-prizes"><div v-for="prize in event.prizes" :key="prize[0]"><dt>{{prize[0]}}</dt><dd>{{prize[1]}}</dd></div></dl>
                <p v-if="event.extraPrize">{{event.extraPrize}}</p>
              </section>
              <section class="competition-section"><h2>参赛规则</h2><ul><li v-for="rule in event.rules" :key="rule">{{rule}}</li></ul></section>
              <details v-if="event.submission" class="competition-section">
                <summary>作品提交格式<icon name="ChevronDown"/></summary>
                <p>邮件标题：【科技杯】作品名 - 作者昵称</p>
                <pre class="competition-submission">{{event.submission}}</pre>
                <p>阅读参赛须知后，在邮件中填写是否同意，并署名、填写日期。作品文件需另行添加到邮件附件。</p>
                <a class="competition-mail" :href="event.mailto">打开投稿邮件草稿<icon name="ArrowUpRight"/></a>
              </details>
              <details v-if="event.notice" class="competition-section">
                <summary>参赛须知<icon name="ChevronDown"/></summary>
                <p>本人已阅读以下条款并承诺遵守：</p>
                <ol><li v-for="item in event.notice" :key="item">{{item}}</li></ol>
                <p>参赛者昵称：＿＿＿＿＿　日期：＿＿＿＿＿</p>
              </details>
              <details v-if="event.examples" class="competition-section">
                <summary>脑洞参考<icon name="ChevronDown"/></summary>
                <ul><li v-for="example in event.examples" :key="example">{{example}}</li></ul>
              </details>
              <img :src="event.poster" :alt="event.name+'赛事海报'" class="competition-poster" loading="lazy" data-rphub-no-save>
              <button type="button" class="competition-visit" @click="$emit('visit',event.url)">
                <icon name="Lighthouse"/><span>前往灯塔查看赛事</span><icon name="ArrowUpRight"/>
              </button>
            </article>
          </main>`
    };
    const Advanced = {
        components: { Icon, MascotHeader, CompetitionList },
        props: { characters: Array, selected: Number, busy: Boolean },
        emits: ['navigate', 'event'],
        setup(props) {
            const card = computed(() => props.characters?.[props.selected]);
            const plugins = computed(() => [
                { name: '图片本地保存', icon: 'Images', view: 'album', installed: !!window.RPHubImageVault },
                { name: '向量缓存', icon: 'Database', view: 'cache', installed: !!window.RPHubEmbeddingCache },
                { name: '用量统计', icon: 'ChartNoAxesCombined', view: 'usage', installed: true }
            ]);
            return { card, plugins, cardItems: [
                { label: '世界书', icon: 'BookOpen', view: 'worldinfo' },
                { label: '正则', icon: 'Code2', view: 'regex' },
                { label: 'UI 模板', icon: 'PanelsTopLeft', view: 'uitemplates' },
                { label: '记忆', icon: 'Brain', view: 'memory' }
            ] };
        },
        template: `
          <main class="shell-page shell-advanced">
            <mascot-header title="高级功能" pose="workshop"></mascot-header>
            <div class="shell-action-grid shell-character-actions">
              <button v-for="item in cardItems" :key="item.view" type="button" :disabled="!card || busy"
                @click="$emit('navigate',item.view)">
                <span class="shell-action-icon"><icon :name="item.icon"/></span><strong>{{item.label}}</strong>
              </button>
            </div>
            <div class="shell-section-heading"><h2>预设与工具</h2><span>软件通用</span></div>
            <div class="shell-action-grid">
              <button type="button" @click="$emit('navigate','presets')"><span class="shell-action-icon"><icon name="NotebookPen"/></span><strong>预设管理</strong></button>
              <button type="button" @click="$emit('navigate','tools')"><span class="shell-action-icon"><icon name="Wrench"/></span><strong>工具管理</strong></button>
            </div>
            <div class="shell-section-heading"><h2>灯塔赛事</h2>
              <button type="button" class="competition-lighthouse-link" @click="$emit('navigate','lighthouse')"><icon name="Lighthouse"/>逛灯塔<icon name="ArrowUpRight"/></button>
            </div>
            <competition-list @select="$emit('event',$event)"></competition-list>
            <div class="shell-section-heading"><h2>已接入功能</h2></div>
            <div class="shell-row-list">
              <button v-for="plugin in plugins" :key="plugin.view" type="button" :disabled="!plugin.installed" @click="$emit('navigate',plugin.view)">
                <span class="shell-row-icon"><icon :name="plugin.icon"/></span><span>{{plugin.name}}</span><small>{{plugin.installed?'已接入':'不可用'}}</small><icon name="ChevronRight"/>
              </button>
            </div>
          </main>`
    };
    const PersonaAvatar = {
        components: { ThemeMascot },
        props: { src: String },
        template: `
          <span class="persona-avatar" :class="{'persona-avatar--default':!src}" data-rphub-no-save>
            <img v-if="src" :src="src" alt="">
            <theme-mascot v-else pose="poke-happy" alt=""></theme-mascot>
          </span>`
    };
    const BackupPage = {
        components: { Icon },
        props: { state: { type: Object, required: true } },
        setup(props) {
            return { s: props.state };
        },
        template: `
          <div class="backup-page">
            <header class="backup-header">
              <button type="button" class="shell-icon-button" aria-label="返回" title="返回" @click="s.back"><icon name="ArrowLeft"/></button>
              <h1>数据与备份</h1>
            </header>
            <div class="backup-content">
                <section class="backup-section">
                  <p class="backup-muted">{{s.native?'包含本机存档与已保存的本地图片。':'包含角色卡、聊天、记忆与设置，独立图片文件夹需另行保留。'}}</p>
                  <div class="backup-actions">
                    <button type="button" class="backup-button backup-primary" :disabled="s.exporting" @click="s.create"><icon name="Save"/>创建备份</button>
                    <button v-if="s.native" type="button" class="backup-button" @click="s.archive('import')"><icon name="Upload"/>导入备份</button>
                    <label v-else class="backup-button backup-file-picker"><icon name="Upload"/>导入备份<input type="file" accept=".json,.zip,application/json,application/zip" aria-label="选择备份文件" @change="s.importJson"></label>
                  </div>
                  <label class="backup-field"><span>备份文件名</span><input type="text" aria-label="备份文件名" v-model="s.filename" placeholder="留空使用日期名称"></label>
                  <div class="backup-line backup-location"><span class="backup-path">{{s.folder || s.defaultFolder}}</span><button class="shell-icon-button" aria-label="更改备份目录" title="更改备份目录" @click="s.chooseFolder"><icon name="FolderOpen"/></button></div>
                  <label class="backup-field"><span>传输速度</span><select v-model="s.profile" aria-label="传输速度"><option v-for="profile in s.profiles" :key="profile.id" :value="profile.id">{{profile.name}}</option></select></label>
                  <details class="backup-details">
                    <summary>备份内容</summary><p v-if="s.native" class="backup-muted">以下为 JSON 导出选项；完整档案始终包含全部内容。</p>
                    <label v-for="option in s.scopes" :key="option.key" class="backup-check"><input type="checkbox" v-model="s.scope[option.key]">{{option.label}}</label>
                    <button type="button" class="backup-button" @click="s.resetScope"><icon name="CheckCheck"/>全部包含</button>
                    <button v-if="s.native" type="button" class="backup-button" :disabled="s.exporting" @click="s.exportJson"><icon name="Download"/>导出 JSON</button>
                  </details>
                </section>
                <section v-if="s.cloud.enabled" class="backup-section" aria-label="云端备份">
                  <h2>云端备份</h2>
                  <p class="backup-muted">与 RP 网页共用备份码，包含角色卡和聊天，不含记忆与设置。</p>
                  <div class="backup-actions">
                    <button type="button" class="backup-button" :disabled="s.cloud.busy" @click="s.openCloud('upload')"><icon name="Upload"/>云端上传</button>
                    <button type="button" class="backup-button" :disabled="s.cloud.busy" @click="s.openCloud('download')"><icon name="Download"/>云端下载</button>
                  </div>
                </section>
                <section class="backup-section">
                <label class="backup-line backup-switch"><span><strong>每日 JSON 备份</strong><small>{{s.config.enabled?'已开启':'已关闭'}}</small></span><span class="relative inline-flex"><input class="settings-toggle-input sr-only" type="checkbox" role="switch" aria-label="每日 JSON 备份" v-model="s.config.enabled"><span class="settings-toggle"></span></span></label>
                <template v-if="s.config.enabled">
                  <label class="backup-field"><span>备份方式</span><select v-model="s.config.triggerMode"><option value="remind">每天提醒我</option><option value="auto">全自动</option></select></label>
                  <div class="backup-settings-grid"><label class="backup-field"><span>保留天数</span><select v-model.number="s.config.retentionDays"><option :value="3">3 天</option><option :value="7">7 天</option><option :value="14">14 天</option><option :value="30">30 天</option><option :value="0">永久保留</option></select></label>
                  <label class="backup-field"><span>最多保留</span><select v-model.number="s.config.maxCopies"><option :value="3">3 份</option><option :value="5">5 份</option><option :value="10">10 份</option><option :value="20">20 份</option><option :value="0">不限份数</option></select></label></div>
                </template>
                <p class="backup-muted backup-note">{{s.overdue<0?'尚未完成每日备份':s.overdue===0?'今天已完成每日备份':'已 '+s.overdue+' 天未完成每日备份'}} · 不含独立图片文件</p>
                <button class="backup-button backup-primary" :disabled="s.working || s.checking" @click="s.daily(true)"><icon name="Save"/>{{s.working?'正在备份…':'立即备份'}}</button>
                <template v-if="s.native">
                  <div class="backup-line backup-location"><span class="backup-path">{{s.location || '完整档案自动保存目录未设置'}}</span><button class="shell-icon-button" aria-label="选择完整档案目录" title="选择完整档案目录" @click="s.archive('folder')"><icon name="FolderOpen"/></button></div>
                </template>
                </section>
                <section class="backup-section">
                  <h2>本地数据</h2>
                  <local-files-panel compact></local-files-panel>
                  <button v-if="s.tasks" type="button" class="backup-button" @click="s.tasks"><icon name="ListTodo"/>查看运行中的任务</button>
                </section>
                <details class="backup-details" @toggle="$event.target.open && s.refresh()">
                    <summary>历史备份</summary>
                    <button v-if="s.native" type="button" class="backup-button" @click="s.archive('history')"><icon name="History"/>恢复文件夹档案</button>
                    <div class="backup-line"><label class="backup-filter"><span>来源</span><select v-model="s.source" aria-label="备份来源"><option value="all">全部</option><option value="manual">手动</option><option value="daily">每日</option></select></label>
                      <button class="shell-icon-button" aria-label="刷新备份列表" title="刷新备份列表" :disabled="s.loading" @click="s.refresh"><icon name="RefreshCw"/></button></div>
                    <p v-if="s.listError" class="shell-error" role="alert">{{s.listError}}</p>
                    <p v-else-if="s.loading" class="backup-muted" role="status">正在读取备份目录…</p>
                    <p v-else-if="!s.files.length" class="backup-empty">此目录暂无{{s.source==='daily'?'每日':s.source==='manual'?'手动':''}} JSON 备份。</p>
                    <article v-for="record in s.files" :key="record.id" class="backup-file">
                      <form v-if="s.renameId===record.id" class="backup-rename" @submit.prevent="s.commitRename(record)">
                        <input v-model="s.renameDraft" aria-label="新文件名"><button type="submit" class="backup-button">确定</button><button type="button" class="backup-button" @click="s.cancelRename">取消</button>
                      </form>
                      <template v-else>
                        <div class="backup-line"><div class="backup-file-info"><strong>{{record.fileName}}</strong><small>{{s.time(record.timestamp)}} · {{s.size(record.sizeBytes)}}</small></div>
                          <button class="shell-icon-button" :aria-label="record.fileName+' 的操作'" title="备份操作" :aria-expanded="s.menu===record.id" @click="s.menu=s.menu===record.id?'':record.id"><icon name="Ellipsis"/></button></div>
                        <div v-if="s.menu===record.id" class="backup-file-actions">
                          <button class="backup-button" :disabled="s.restoring" @click="s.restore(record)"><icon name="RotateCcw"/>恢复</button>
                          <button class="backup-button" @click="s.rename(record)"><icon name="Pencil"/>重命名</button>
                          <button class="backup-button" @click="s.saveAs(record)"><icon name="Download"/>另存</button>
                          <button class="backup-button backup-danger" @click="s.remove(record)"><icon name="Trash2"/>删除</button>
                        </div>
                      </template>
                    </article>
                </details>
                <details class="backup-details"><summary>数据整理</summary><slot name="maintenance"></slot>
                </details>
            </div>
          </div>`
    };
    const Settings = {
        components: { Icon, MascotHeader, PersonaAvatar },
        props: { user: Object },
        emits: ['section', 'navigate'],
        setup() {
            const rows = [
                { label: 'API 连接与服务', key: 'api', icon: 'KeyRound' },
                { label: '生图设置', key: 'image', icon: 'Image' },
                { label: '阅读与性能', key: 'reading', icon: 'Settings2' },
                { label: '记忆系统', view: 'memory', icon: 'Brain' },
                { label: '外观', key: 'appearance', icon: 'Palette' },
                { label: '向量缓存', view: 'cache', icon: 'Database' },
                { label: '数据与备份', view: 'backup', icon: 'HardDrive' },
                { label: '用量统计', view: 'usage', icon: 'ChartNoAxesCombined' },
                { label: '关于与鸣谢', view: 'patchlist', icon: 'Info' }
            ];
            return { groups: [
                { title: '对话与创作', rows: rows.slice(0, 4) },
                { title: '空间与存档', rows: rows.slice(4, 7) },
                { title: '记录与支持', rows: rows.slice(7) }
            ] };
        },
        template: `
          <main class="shell-page shell-settings-home">
            <mascot-header title="设置" pose="peek"></mascot-header>
            <button type="button" class="shell-profile" @click="$emit('section','persona')">
              <persona-avatar :src="user.avatar"></persona-avatar>
              <span><small>个人设定</small><strong>{{user.name==='请前往设置自定义你的名称'?'设置你的人设':user.name}}</strong></span><icon name="ChevronRight"/>
            </button>
            <section v-for="group in groups" :key="group.title" class="shell-settings-group">
            <div class="shell-section-heading"><h2>{{group.title}}</h2></div>
            <div class="shell-row-list">
              <button v-for="row in group.rows" :key="row.key || row.view" type="button" @click="row.key?$emit('section',row.key):$emit('navigate',row.view)">
                <span class="shell-row-icon"><icon :name="row.icon"/></span><span>{{row.label}}</span><icon name="ChevronRight"/>
              </button>
            </div>
            </section>
            <details class="shell-compat"><summary>其他功能</summary><div class="shell-row-list">
              <button type="button" @click="$emit('navigate','generator')"><icon name="Wand2"/><span>角色卡生成</span><icon name="ChevronRight"/></button>
              <button type="button" @click="$emit('navigate','novel')"><icon name="BookOpen"/><span>小说生成</span><icon name="ChevronRight"/></button>
              <button type="button" @click="$emit('section','legacy')"><icon name="FolderOpen"/><span>旧版共享配置</span><icon name="ChevronRight"/></button>
            </div></details>
          </main>`
    };
    const Utilities = {
        components: { Icon },
        props: { section: String },
        emits: ['navigate'],
        setup(props) {
            const themePack = useThemePack();
            const error = ref('');
            const info = ref(null);
            const loading = ref(false);
            const tiltEnabled = ref(window.RPGalleryMotion.enabled);
            const syncTilt = () => { tiltEnabled.value = window.RPGalleryMotion.enabled; };
            window.addEventListener('rp-gallery-motion-change', syncTilt);
            onBeforeUnmount(() => window.removeEventListener('rp-gallery-motion-change', syncTilt));
            const load = async () => {
                loading.value = true;
                try { info.value = await window.RPHubEmbeddingCache?.stats(); error.value = ''; }
                catch (failure) { error.value = failure.message; }
                finally { loading.value = false; }
            };
            const clear = async () => {
                if (!confirm('清空向量缓存？角色卡、聊天和记忆不会删除。')) return;
                loading.value = true;
                try {
                    if (!await window.RPHubEmbeddingCache.clear()) throw new Error('缓存清理失败');
                    await load();
                } catch (failure) { error.value = failure.message; }
                finally { loading.value = false; }
            };
            onMounted(() => {
                if (props.section === 'cache') load();
                if (props.section === 'runtime' && typeof window.RPLocalFiles?.runtimeInfo === 'function') {
                    try { info.value = window.RPLocalStore.call('runtimeInfo'); }
                    catch (failure) { error.value = failure.message; }
                }
            });
            return {
                info, error, loading, load, clear, tiltEnabled, ...themePack, ...useCardNight(),
                setTilt: event => window.RPGalleryMotion.set(event.target.checked),
                selectPack: id => window.RPThemePacks.set(id),
                version: window.RP_LOCAL_VERSION
            };
        },
        template: `
          <div class="shell-utility">
            <template v-if="section==='runtime'">
              <dl class="shell-runtime-info">
                <div><dt>页面版本</dt><dd>{{version}}</dd></div>
                <div><dt>安装包版本</dt><dd>{{info?.version || '未检测到新版安卓壳'}}</dd></div>
                <div v-if="info?.packageName"><dt>包名</dt><dd>{{info.packageName}}</dd></div>
                <div v-if="info?.android"><dt>Android</dt><dd>{{info.android}}</dd></div>
                <div v-if="info?.webView"><dt>网页引擎</dt><dd>{{info.webView}}</dd></div>
              </dl>
              <p v-if="error" role="alert" class="shell-error">{{error}}</p>
            </template>
            <template v-if="section==='cache'">
              <dl class="shell-facts"><div><dt>已缓存向量</dt><dd>{{info?.count || 0}}</dd></div><div><dt>占用空间</dt><dd>{{((info?.bytes || 0)/1024/1024).toFixed(2)}} MB</dd></div></dl>
              <p class="shell-muted">清理仅影响重复请求缓存，不删除角色记忆。</p>
              <div class="workspace-links"><button type="button" class="shell-button" :disabled="loading" @click="load"><icon name="RefreshCw"/>刷新统计</button><button type="button" class="shell-button" :disabled="loading" @click="clear"><icon name="Trash2"/>清空缓存</button></div>
              <p v-if="error" role="alert" class="shell-error">{{error}}</p>
            </template>
            <template v-if="section==='appearance'">
              <section class="theme-library" aria-labelledby="theme-library-title">
                <h3 id="theme-library-title">皮肤</h3>
                <div class="theme-pack-grid">
                  <label v-for="pack in packs" :key="pack.id" class="theme-pack" :class="{'is-selected':selected===pack.id}">
                    <div class="theme-pack-preview" :style="{'--preview-bg':preview(pack).background,'--preview-accent':preview(pack).accent}">
                      <img v-if="preview(pack).image" :src="preview(pack).image" alt="" data-rphub-no-save>
                      <span v-else class="theme-classic-preview" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                      <span class="theme-preview-lines" aria-hidden="true"><i></i><i></i><i></i></span>
                      <span class="theme-mode-badge">{{night?'夜间':'日间'}}</span>
                    </div>
                    <span class="theme-pack-name"><input type="radio" name="ui-pack" :value="pack.id" :aria-label="pack.name" :checked="selected===pack.id" @change="selectPack(pack.id)">{{pack.name}}</span>
                    <span class="theme-pack-subtitle">{{pack.subtitle}}</span>
                    <span class="theme-pack-palette" aria-hidden="true"><i :style="{background:preview(pack).background}"></i><i :style="{background:preview(pack).accent}"></i><i></i></span>
                  </label>
                </div>
              </section>
              <label class="shell-form-row"><span>倾斜反光</span>
                <span class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" role="switch" aria-label="倾斜反光" class="settings-toggle-input sr-only" :checked="tiltEnabled" @change="setTilt">
                  <span class="settings-toggle"></span>
                </span>
              </label>
              <label class="shell-form-row"><span>夜间模式</span>
                <span class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" role="switch" aria-label="夜间模式" class="settings-toggle-input sr-only" :checked="night" @change="toggleDayNight">
                  <span class="settings-toggle"></span>
                </span>
              </label>
              <label class="shell-form-row"><span>卡片自动变暗</span>
                <span class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" role="switch" aria-label="卡片自动变暗" class="settings-toggle-input sr-only" :checked="cardNightEnabled" @change="setCardNightEnabled">
                  <span class="settings-toggle"></span>
                </span>
              </label>
            </template>
            <template v-if="section==='legacy'">
              <div class="shell-row-list">
                <button type="button" @click="$emit('navigate',{view:'worldinfo',scope:'global'})"><icon name="BookOpen"/><span>共享世界书</span><icon name="ChevronRight"/></button>
                <button type="button" @click="$emit('navigate',{view:'regex',scope:'global'})"><icon name="Code2"/><span>共享正则</span><icon name="ChevronRight"/></button>
                <button type="button" @click="$emit('navigate',{view:'uitemplates',scope:'global'})"><icon name="PanelsTopLeft"/><span>共享 UI</span><icon name="ChevronRight"/></button>
              </div>
            </template>
          </div>`
    };
    const ImageDownloadSheet = {
        components: { Icon },
        setup() {
            const dialog = ref(null);
            let image = null, backdropPressed = false;
            const close = () => dialog.value.close();
            const request = event => {
                if (!(event.detail instanceof HTMLImageElement) || !event.detail.isConnected) return;
                image = event.detail;
                backdropPressed = false;
                dialog.value.showModal();
            };
            const download = () => {
                const selected = image;
                close();
                if (selected?.isConnected && window.RPImagePolicy.isContentImage(selected))
                    window.RPImageDownload.run(selected).catch(() => {});
            };
            const backdropDown = event => { backdropPressed = event.target === dialog.value; };
            const backdropClick = event => {
                if (!backdropPressed || event.target !== dialog.value) return;
                const box = dialog.value.getBoundingClientRect();
                if (event.clientY < box.top || event.clientY > box.bottom
                    || event.clientX < box.left || event.clientX > box.right) close();
                backdropPressed = false;
            };
            onMounted(() => window.addEventListener('rp:image-download', request));
            onBeforeUnmount(() => {
                window.removeEventListener('rp:image-download', request);
                if (dialog.value.open) close();
            });
            return { dialog, close, download, backdropDown, backdropClick,
                clear: () => { image = null; } };
        },
        template: `<teleport to="body">
          <dialog ref="dialog" class="image-download-sheet" aria-labelledby="image-download-title"
            @pointerdown="backdropDown" @click="backdropClick" @close="clear">
            <h2 id="image-download-title">下载这张图片？</h2>
            <button type="button" class="shell-button image-download-confirm" @click="download"><icon name="Download"/>下载图片</button>
            <button type="button" class="shell-button" @click="close">取消</button>
          </dialog>
        </teleport>`
    };
    const ReleaseAnnouncement = {
        components: { Icon, CompetitionList },
        props: { show: Boolean },
        emits: ['close', 'event'],
        setup(props) {
            watch(() => props.show, show => { document.getElementById('app').inert = show; });
            onBeforeUnmount(() => { document.getElementById('app').inert = false; });
            return {
                notes: window.RPReleaseNotes.notes,
                trapFocus: useDialogFocus(() => props.show, '.release-notice')
            };
        },
        template: `
          <teleport to="body">
            <transition name="release">
              <div v-if="show" class="release-overlay" data-rphub-no-save @click.self="$emit('close')"
                @keydown.esc.stop.prevent="$emit('close')" @keydown="trapFocus">
                <section class="release-notice" role="dialog" aria-modal="true" aria-labelledby="release-title">
                  <header class="release-header">
                    <div><h2 id="release-title">{{notes.title}}</h2><p>RP 本地版 {{notes.version}} <span>与 {{notes.baseline}} 对照</span></p></div>
                    <button type="button" class="release-close" aria-label="关闭更新公告" title="关闭更新公告" @click="$emit('close')"><icon name="X"/></button>
                  </header>
                  <div class="release-reading" tabindex="0" role="region" aria-label="更新内容">
                    <section v-for="section in notes.sections" :key="section.title" class="release-section">
                      <h3>{{section.title}}</h3><p v-if="section.text">{{section.text}}</p>
                      <competition-list v-if="section.events" compact @select="$emit('event',$event)"></competition-list>
                    </section>
                  </div>
                  <footer class="release-footer">
                    <img src="assets/images/announcements/secretary.webp" alt="戴圆眼镜的秘书装玥玥，拿教鞭指向上方公告" class="release-mascot" data-rphub-no-save>
                  </footer>
                </section>
              </div>
            </transition>
          </teleport>`
    };
    window.RPAppShell = Object.freeze({ Icon, ResourceBatchActions, ThemeMascot, PersonaAvatar, PokeMascot, MascotHeader, Dock, ChatMenu, CardNightSelect, ImageProviderSettings, BackupPage, CompetitionList, CompetitionDetail, Advanced, Settings, Utilities, ImageDownloadSheet, ReleaseAnnouncement });
})();
