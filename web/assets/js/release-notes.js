(function () {
    'use strict';
    const marker = 'rp-local-release-shown';
    const sections = [
        { title: '世界书与生图次数', text: '世界书页可直接切换当前角色卡和全局生效，修改作用范围后自动转到对应列表。生图密钥下方新增剩余次数和刷新按钮，与 API 页面同步显示。' },
        { title: '在线快捷入口', text: '长按右下角入口，向左上方拖到灯塔或万象广场，松手即可进入。松在空白处取消，也可以轻点展开后直接选择。' },
        { title: '玥玥陪你', text: '戳戳页面上的玥玥，她会轻弹、换表情，还会按所在页面说不同的话。对白短暂出现后自动消散，日间和夜间都有配套表情。' },
        { title: '全新界面', text: '角色卡、画廊、高级、设置分为四个入口。新增白昼手账、夜蔷薇两套界面和配套玥玥表情。功能页返回上一页，万象广场和灯塔同步更换返回按钮。' },
        { title: '角色相簿', text: '图片按角色卡分别保存，相簿封面完整显示，不再拉伸或留白边。新增玻璃反光，随手机倾斜变化，可在外观中关闭。保存的仍是原图；软件装饰不再出现下载按钮。' },
        { title: '预设分组', text: '分组可直接展开、收起，展开后即可导入预设。支持新建、命名和保留空分组，也能单独导出预设或整个分组。官方预设归入“STA1N官方分组”；组外导入普通预设放入“默认分组”，组内导入放入当前组。' },
        { title: '数据导入与导出', text: '数据备份新增流式导入，可查看进度、暂停、继续和取消。保留原有导入方式，导出文件分别放入“数据备份”和“导出文件”文件夹。' },
        { title: '记忆系统', text: '恢复完整记忆系统入口，保留总结、向量、补录和记忆工具。角色卡的分支记忆可单独查看、编辑、导入和导出。' },
        { title: '修复与优化', text: '默认开启沉浸模式，隐藏消息旁的头像和名字；夜间输入栏装饰移到底部。修复手机端正则等列表滑到底仍看不全的问题，以及连续返回子页面时意外退出软件的问题。减少启动等待，修复采样器无法切换、本地图片保存失败，以及切换风格或重新打开页面后意外重复生图的问题。' },
        { title: '鸣谢与更新', text: '特别鸣谢红花铃🔔老师、启元老师。软件更新将在 QQ 群 472441481 发布。' }
    ];
    const notes = Object.freeze({
        version: window.RP_LOCAL_VERSION,
        baseline: 'RP-Hub 2.8.116',
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
