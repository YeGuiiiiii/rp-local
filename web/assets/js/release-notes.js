(function () {
    'use strict';
    const marker = 'rp-local-release-shown';
    const sections = [
        { title: '鸣谢与更新', text: '特别鸣谢红花铃🔔老师、启元老师。软件更新将在 QQ 群 472441481、132292045 发布。' },
        { title: '灯塔赛事', events: true },
        { title: '备份操作精简', text: '创建与导入直接打开文件窗口，文件名、保存位置、自动备份和传输速度集中在同页。历史与数据整理就地展开，沿用各皮肤日夜配色。' },
        { title: '传输与重开', text: '导入和导出共用省内存、均衡、高速档位，减少导出时反复等待。修复导入成功后自动重开又弹出“确认离开”的问题。' }
    ];
    const notes = Object.freeze({
        version: window.RP_LOCAL_VERSION,
        baseline: 'RP 本地版 2.9.015',
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
