(function () {
    'use strict';
    const marker = 'rp-local-release-shown';
    const sections = [
        { title: '鸣谢与更新', text: '特别鸣谢红花铃🔔老师、启元老师。软件更新将在 QQ 群 472441481、132292045 发布。' },
        { title: '角色卡加载', text: '打开软件时只载入正在玩的角色卡，其他卡片保留封面预览。换卡前保存聊天、记忆和进度，回看旧剧情继续保留当时的 UI 画面。首次升级会整理已有角色卡，之后打开更轻快。' },
        { title: '返回与启动', text: '减少带数据打开时的等待，直接回到上次的聊天。首次导入或保存未完成时会重新核对存档。从公告查看赛事后，返回仍保留公告和阅读位置。' },
        { title: '灯塔赛事', events: true },
        { title: '经典皮肤与界面切换', text: '默认使用 RP-Hub 2.8.118 的经典布局。打开导航 → 设置 → 外观 → 界面主题，可切换经典、白昼手账或夜蔷薇。原版导航的“外观”入口也可直接进入。切换后保留角色卡、聊天和记忆。' },
        { title: '母版修复与记忆', text: '补丁与记忆功能按 2.8.118 对齐，保留总结、二次总结、向量召回、补录和记忆工具。减少大角色卡导入时的重复保存，避免切换分支或恢复备份时旧内容覆盖新修改。' },
        { title: '世界书与正则', text: '正则页新增当前角色卡与全局生效切换，可直接查看 NAI 画图正则。大世界书分页显示，搜索仍覆盖全部条目，支持跳页和一键返回顶部。' },
        { title: '世界书与生图次数', text: '世界书页可直接切换当前角色卡和全局生效，修改作用范围后自动转到对应列表。生图密钥下方新增剩余次数和刷新按钮，与 API 页面同步显示。' },
        { title: '在线快捷入口', text: '长按右下角入口，向左上方拖到灯塔或万象广场，松手即可进入。松在空白处取消，也可以轻点展开后直接选择。' },
        { title: '玥玥陪你', text: '戳戳页面上的玥玥，她会轻弹、换表情，还会按所在页面说不同的话。对白短暂出现后自动消散，日间和夜间都有配套表情。' },
        { title: '可选界面', text: '白昼手账、夜蔷薇保留角色卡、画廊、高级、设置四个入口和配套玥玥表情。功能页返回上一页，万象广场和灯塔使用配套返回按钮。' },
        { title: '角色相簿', text: '图片按角色卡分别保存，相簿封面完整显示，不再拉伸或留白边。新增玻璃反光，随手机倾斜变化，可在外观中关闭。保存的仍是原图；软件装饰不再出现下载按钮。' },
        { title: '预设分组', text: '分组可直接展开、收起，展开后即可导入预设。支持新建、命名和保留空分组，也能单独导出预设或整个分组。官方预设归入“STA1N官方分组”；组外导入普通预设放入“默认分组”，组内导入放入当前组。' },
        { title: '数据导入与导出', text: '数据备份新增流式导入，可查看进度、暂停、继续和取消。保留原有导入方式，导出文件分别放入“数据备份”和“导出文件”文件夹。' },
        { title: '记忆系统', text: '恢复完整记忆系统入口，保留总结、向量、补录和记忆工具。角色卡的分支记忆可单独查看、编辑、导入和导出。' },
        { title: '默认设置与修复', text: '生图默认 28 步，超过 28 步会提醒确认。备份默认每天提醒，已有手动设置继续保留。补齐经典导航的图片管理和补丁清单入口，保留列表滚动、图片保存和连续返回的修复。' }
    ];
    const notes = Object.freeze({
        version: window.RP_LOCAL_VERSION,
        baseline: 'RP-Hub 2.8.118',
        title: '玥玥的更新简报',
        sections
    });
    function consume() {
        if (typeof window.RPLocalFiles?.consumeReleaseNotice === 'function') {
            const result = JSON.parse(window.RPLocalFiles.consumeReleaseNotice());
            if (!result.ok) throw new Error(result.error);
            return result.value === true;
        }
        const version = Number(window.RP_LOCAL_RELEASE);
        if (Number(localStorage.getItem(marker)) >= version) return false;
        localStorage.setItem(marker, String(version));
        return true;
    }
    function use(blocked) {
        const { ref, onMounted, onBeforeUnmount, watch } = Vue;
        const show = ref(false), ready = ref(false);
        let attempted = false;
        const finish = () => { ready.value = true; };
        watch([ready, blocked], ([loaded, busy]) => {
            if (!loaded || busy || attempted) return;
            attempted = true;
            try { show.value = consume(); }
            catch (error) { console.warn('更新公告未自动展示：', error.message); }
        });
        onMounted(() => {
            if (window.__rpDataReady && !document.querySelector('.entry-transition')) finish();
            else window.addEventListener('rp:startup-finished', finish, { once: true });
        });
        onBeforeUnmount(() => window.removeEventListener('rp:startup-finished', finish));
        return { showAnnouncement: show, openAnnouncement: () => { show.value = true; }, closeAnnouncement: () => { show.value = false; } };
    }
    window.RPReleaseNotes = Object.freeze({ notes, marker, use });
})();
