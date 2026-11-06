/* RP-Hub 安卓外壳 · 夜间模式桥（2.7.59）
 *
 * 与 2.7.58 的区别：不只同步 WebView 底色，还要**解锁原生算法暗化**。
 * 与 2.7.47 的区别：不做整页 CSS 反相（反相会把用户自定义的深色正文容器、
 * 角色卡封面背景一并翻白/负片化），深色效果交给 WebView 原生 Force Dark
 * —— 与 Via 浏览器夜间模式同款能力：按语义只压暗「亮」背景，深色元素原样保留。
 *
 * 本脚本做两件事：
 *   ① 注入 `:root[data-app-theme="dark"]{color-scheme:light !important}`
 *      —— 这是**算法暗化能否生效的唯一开关**。
 *      Chromium 只要看到页面声明「自己支持深色」（官网 theme.css 深色档里的
 *      `color-scheme: dark`），就会认为页面已经处理好深色而**跳过**算法暗化。
 *      离线实测：不压这一行，纯白探针在 --force-dark-mode 下纹丝不动（L=255）；
 *      压掉后立刻降到 L=18。而官网本身覆盖不到的内容容器
 *      （.ui-template-render 角色卡 UI 模板、气泡里的自绘 HTML）正是靠算法暗化补齐。
 *   ② 读官网当前主题 → 调 RPHubNativeTheme.setBackground 回传原生壳
 *      （原生据此落盘、改底色、开关算法暗化）。
 *
 * 官网主题系统的对外契约（跟随它，不要另立一套）：
 *   - 状态键：localStorage['rphub-appearance']，取值 'dark' | 'light'
 *   - DOM 标记：document.documentElement.dataset.appTheme
 *   - 变更事件：window 上的 CustomEvent 'rphub-theme-change'（detail = 'dark' | 'light'）
 *   - 也可读 window.RPHubTheme.current
 *
 * ⚠️ 命名纪律（血泪教训）：桥对象名必须和官网全局名错开。官网已占用 window.RPHubTheme，
 *    我方用 RPHubNativeTheme。若撞名，官网脚本后跑会整体覆盖我方桥，且因为调用侧写了
 *    typeof 守卫 ⇒ 不报错、也不生效，比报错难查得多。
 *    新加任何全局名前，先 grep 官网源码有没有同名。
 *
 * 安全约束：本脚本不依赖任何原生桥（桌面浏览器里也必须能正常跑完不报错）；
 * 没有 RPHubNativeTheme 时静默跳过，页面保持官方原样。
 */
(function () {
    if (window.__rphubNativeThemeBound) return;
    window.__rphubNativeThemeBound = true;

    var KEY = 'rphub-appearance';
    var STYLE_ID = 'rphub-night-scheme';

    /* 压掉官网深色档的 color-scheme 声明，解锁算法暗化。
       用 !important：本样式注入时机早于官网 theme.css（document.write 在解析中段），
       若只靠「后加载覆盖」反而会输，所以必须靠 !important 压。 */
    var SCHEME_CSS = ':root[data-app-theme="dark"]{color-scheme:light !important}';

    function ensureSchemeOverride(doc) {
        if (!doc) return false;
        try {
            if (doc.getElementById && doc.getElementById(STYLE_ID)) return true;
            var style = doc.createElement('style');
            style.id = STYLE_ID;
            style.setAttribute('type', 'text/css');
            style.textContent = SCHEME_CSS;
            var host = doc.head || doc.documentElement;
            if (!host) return false;
            host.appendChild(style);
            return true;
        } catch (e) {
            return false; /* 跨源 iframe 等取不到 document 的情况，静默跳过 */
        }
    }

    /* 工坊（character/index.html）与书库（novel/index.html）是主文档的同源 iframe，
       各自也加载 theme.css，同样会被 color-scheme 顶掉 ⇒ 递归注入进去。
       跨源 iframe 取 contentDocument 会抛异常，已被上面的 try 吞掉。 */
    function ensureAllFrames() {
        ensureSchemeOverride(document);
        var frames;
        try {
            frames = document.querySelectorAll('iframe');
        } catch (e) {
            return;
        }
        for (var i = 0; i < frames.length; i++) {
            try {
                ensureSchemeOverride(frames[i].contentDocument);
            } catch (e) { /* ignore */ }
        }
    }

    function readTheme() {
        try {
            var attr = document.documentElement.dataset.appTheme;
            if (attr === 'dark' || attr === 'light') return attr;
        } catch (e) { /* ignore */ }
        try {
            var raw = localStorage.getItem(KEY);
            if (raw === 'dark' || raw === 'light') return raw;
        } catch (e) { /* ignore */ }
        return 'light';
    }

    var last = null;

    function push() {
        ensureAllFrames();
        var theme = readTheme();
        if (theme === last) return;
        last = theme;
        try {
            if (window.RPHubNativeTheme
                && typeof window.RPHubNativeTheme.setBackground === 'function') {
                window.RPHubNativeTheme.setBackground(theme === 'dark');
            }
        } catch (e) { /* ignore */ }
    }

    // 官网 theme.js 可能晚于本脚本执行，所以三重保险：
    //   ① 事件：官网切换主题时派发 rphub-theme-change
    //   ② 属性观察：<html data-app-theme> 变了就同步（覆盖 theme.js 初始化那一次）
    //   ③ 兜底定时：读完再各补一次，防止首次注入时机早于 theme.js
    try {
        window.addEventListener('rphub-theme-change', push);
        window.addEventListener('storage', function (event) {
            if (!event || event.key === KEY) push();
        });
        new MutationObserver(push).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-app-theme']
        });
        // iframe 是异步挂上来的（工坊/书库），挂上后再补注入一次
        document.addEventListener('load', function (event) {
            if (event.target && event.target.tagName === 'IFRAME') push();
        }, true);
    } catch (e) { /* ignore */ }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', push);
    }
    // 立即执行一次：注入时机在 onPageStarted，要赶在首屏之前把 color-scheme 压掉，
    // 否则首帧会先按官网深色渲染、算法暗化来不及介入。
    push();
    setTimeout(push, 300);
    setTimeout(push, 1500);

    window.__rphubNightScheme = { refresh: ensureAllFrames, css: SCHEME_CSS };
})();
