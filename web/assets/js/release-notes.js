(function () {
    'use strict';
    const marker = 'rp-local-release-shown';
    const sections = [
        { title: '鸣谢与更新', text: '特别鸣谢红花铃🔔老师、启元老师。软件更新将在 QQ 群 472441481、132292045 发布。' },
        { title: '灯塔赛事', events: true },
        { title: '外观与皮肤', text: '经典设置中的“外观”移到高级设置内、文风过滤下方。点击整行即可打开皮肤页，选择经典皮肤、玥玥经典皮肤或冬至皮肤；倾斜反光下方可切换日夜。设置末尾重复的外观卡片已移除。' }
    ];
    const notes = Object.freeze({
        version: window.RP_LOCAL_VERSION,
        baseline: 'RP 本地版 2.9.008',
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
