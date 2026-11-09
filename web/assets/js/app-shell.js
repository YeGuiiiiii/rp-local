(function () {
    'use strict';
    const { ref, computed, onMounted, onBeforeUnmount, watch, h, nextTick } = Vue;
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
                { view: 'square', name: '万象广场', icon: 'Globe2', dx: -108, dy: -54 }
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
                { label: '数据存储', key: 'storage', icon: 'HardDrive' },
                { label: '备份与导入导出', view: 'backup', icon: 'Download' },
                { label: '用量统计', view: 'usage', icon: 'ChartNoAxesCombined' },
                { label: '关于与鸣谢', view: 'patchlist', icon: 'Info' }
            ];
            return { groups: [
                { title: '对话与创作', rows: rows.slice(0, 4) },
                { title: '空间与存档', rows: rows.slice(4, 8) },
                { title: '记录与支持', rows: rows.slice(8) }
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
    window.RPAppShell = Object.freeze({ Icon, ThemeMascot, PersonaAvatar, PokeMascot, MascotHeader, Dock, ChatMenu, CardNightSelect, CompetitionList, CompetitionDetail, Advanced, Settings, Utilities, ImageDownloadSheet, ReleaseAnnouncement });
})();
