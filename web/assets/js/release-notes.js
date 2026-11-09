(function () {
    'use strict';
    const marker = 'rp-local-release-shown';
    const sections = [
        { title: '鸣谢与更新', text: '特别鸣谢红花铃🔔老师、启元老师。软件更新将在 QQ 群 472441481、132292045 发布。' },
        { title: '灯塔赛事', events: true },
        { title: '图片下载', text: '聊天生成图片移除右上角下载按钮。长按图片后，底部弹出下载确认，点“下载图片”才保存；点击上方空白或取消即可回到聊天，滑动图片不触发下载。' },
        { title: '日夜配色', text: '确认栏沿用设置 → 外观中所选皮肤的日夜配色，适配经典、玥玥经典与冬至皮肤。' }
    ];
    const notes = Object.freeze({
        version: window.RP_LOCAL_VERSION,
        baseline: 'RP 本地版 2.9.012',
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
