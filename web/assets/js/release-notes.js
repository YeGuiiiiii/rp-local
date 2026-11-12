(function () {
    'use strict';
    const marker = 'rp-local-release-shown';
    const sections = [
        { title: '鸣谢与更新', text: '特别鸣谢红花铃🔔老师、启元老师。软件更新将在 QQ 群 472441481、132292045 发布。' },
        { title: '灯塔赛事', events: true },
        { title: '2.9.026 · 图片管理筛选与防误触', text: '设置页的聊天渲染上限、UI 模板保留楼数加了锁，锁上后滑块拖不动，解锁才能改，与记忆设置同一套交互。预设管理顶栏两个箭头的含义对调：朝下是导入，朝上是导出。万相广场、灯塔、角色卡工坊、小说生成在默认外观下去掉顶部标题条，整块屏幕让给网页，返回仍可用系统侧滑。默认布局的图片管理顶栏新增角色卡切换：下拉里按收录张数列出全部角色卡，选中只看这张卡的图，选「全部角色」恢复。预设分组的选中底色固定为默认外观的淡蓝，不再跟着强调色变粉。' },
        { title: '2.9.024 · 空预设分组自动清理', text: '分组里的预设删光、或整体移到别的分组后，这个空分组会自动从列表里消失，不再留下点不开的空壳。停在空分组里时按钮会变成「删除空分组」，可以直接移除；刚新建、还没来得及放预设的分组不会被误删。' },
        { title: '2.9.023 · 返回误触与批量删除', text: '万相广场、角色卡生成、小说生成等内嵌页面，侧滑返回不再直接退回正文，第一次会提示再返回一次才离开，两秒内不再返回则自动解除。世界书与正则列表工具栏去掉垃圾桶按钮，改为勾选后在列表顶部显示已选数量与「删除所选」，删除前仍会确认数量。内嵌页面名称统一为「万相广场」。' },
        { title: '2.9.022 · 导出位置修复', text: '导出和备份提示保留真实目录名 Download，避免与手机上独立的“下载”文件夹混淆。保存完成后显示实际目录和文件名，重名文件也能按提示找到；保存失败时不再提前提示成功。' },
        { title: '2.9.021 · 长聊天删除修复', text: '修复长聊天包含大量历史界面时，删除失败回复或后续消息无法保存的问题。大聊天分块保存，保留正文和历史界面；备份导出仍为原有通用格式，导入时自动处理。删除保存失败会显示具体原因。' },
        { title: '2.9.020 · 启动存档修复', text: '大角色卡同步到本地文件时改为分块传输和写入，减少整份数据反复复制造成的启动失败。传输中断时保留原文件。首页与错误提示增加版本号，方便反馈问题。' },
        { title: '2.9.019 · 大备份恢复', text: '云端和流式 JSON 备份逐张恢复角色卡，保留完整封面与设定，不再把所有角色卡拼成一个大存档。保存完成后再重新打开；本地整理计入导入进度。' },
        { title: '数据与备份', text: '数据存储与备份恢复合为一页，本地图片、创建与导入、云端备份、每日备份和传输档位集中设置。创建直接命名保存，导入直接选择文件。' },
        { title: '世界书与正则批量删除', text: '列表顶部新增全选和批量删除。进入选择后，左侧大选择框负责勾选，点击名称仍可查看条目；全选包含尚未显示的条目，删除前确认数量。向下滑动不会误开条目。' },
        { title: 'NovelAI 生图设置', text: 'NovelAI 兼容接口沿用生图版本与生图比例，去掉重复的模型名称和尺寸填写，不用记模型代码。OpenAI 兼容接口仍可读取模型列表。' }
    ];
    const notes = Object.freeze({
        version: window.RP_LOCAL_VERSION,
        baseline: 'RP 本地版 2.9.020',
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
