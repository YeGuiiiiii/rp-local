(function () {
    'use strict';
    const marker = 'rp-local-release-shown';
    const sections = [
        { title: '鸣谢与更新', text: '特别鸣谢红花铃🔔老师、启元老师。软件更新将在 QQ 群 472441481、132292045 发布。' },
        { title: '灯塔赛事', events: true },
        { title: '2.9.020 · 启动存档修复', text: '大角色卡同步到本地文件时改为分块传输和写入，减少整份数据反复复制造成的启动失败。传输中断时保留原文件。首页与错误提示增加版本号，方便反馈问题。' },
        { title: '2.9.019 · 大备份恢复', text: '云端和流式 JSON 备份逐张恢复角色卡，保留完整封面与设定，不再把所有角色卡拼成一个大存档。保存完成后再重新打开；本地整理计入导入进度。' },
        { title: '数据与备份', text: '数据存储与备份恢复合为一页，本地图片、创建与导入、云端备份、每日备份和传输档位集中设置。创建直接命名保存，导入直接选择文件。' },
        { title: '世界书与正则批量删除', text: '列表顶部新增全选和批量删除。进入选择后，左侧大选择框负责勾选，点击名称仍可查看条目；全选包含尚未显示的条目，删除前确认数量。向下滑动不会误开条目。' },
        { title: 'NovelAI 生图设置', text: 'NovelAI 兼容接口沿用生图版本与生图比例，去掉重复的模型名称和尺寸填写，不用记模型代码。OpenAI 兼容接口仍可读取模型列表。' }
    ];
    const notes = Object.freeze({
        version: window.RP_LOCAL_VERSION,
        baseline: 'RP 本地版 2.9.019',
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
