const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parse } = require('./ui-build/node_modules/parse5');
const root = path.resolve(__dirname, '..');
const source = 'reference/original-2.8.118/patched/index.html';
const find = (node, test) => test(node) ? node : (node.childNodes || []).map(child => find(child, test)).find(Boolean);
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
const page = parse(fs.readFileSync(path.join(root, source), 'utf8'));
const view = find(page, node => node.attrs?.some(attr => attr.name === 'v-if' && attr.value === "currentView === 'patchlist'"));
const list = find(view, node => node.tagName === 'ol').childNodes.filter(node => node.tagName === 'li');
const rows = [
    ['本地版替换', '固定随包加载，保留原版补丁结果；不恢复官网动态覆盖。', 'web/index.html; android/smali/com/rphub/app/LocalAssets.smali', 'test-no-site-announcement'],
    ['保留', '等待数据就绪，超时可重载。', 'web/index.html; web/assets/css/local-splash.css', 'test-startup-home'],
    ['补齐', '经典导航高级标题右侧可进入补丁清单。', 'web/assets/js/ui-components.js; scripts/prepare-classic.cjs', 'test-classic-skin'],
    ['保留', '二次总结、五条合并和来源还原逻辑与母版一致。', 'web/assets/js/app.js:compressEligibleClassicMemories/trimClassicMemoriesToTurn', 'test-memory-system; test-upstream-storage'],
    ['保留', '分页、单条重试、压缩率与母版一致。', 'web/assets/js/app.js; web/assets/themes/classic/layout.html', 'test-memory-system'],
    ['保留', '记忆 API、模型读取与回退与母版一致。', 'web/assets/js/app.js:requestClassicMemoryCompletion; web/assets/js/api-utils.js', 'test-memory-system'],
    ['保留', '保留楼层、向量召回和上下文组装与母版一致。', 'web/assets/js/data-services.js:RPHubMemoryUtils/RPHubContextUtils', 'test-memory-system; test-original-backup'],
    ['保留', '自动检查、补录并发和中止与母版一致。', 'web/assets/js/app.js:startBatchMemoryExtraction/abortClassicBatchExtraction', 'test-memory-system'],
    ['补齐', '恢复经典设置页的缓存数量、命中率和清空入口；缓存请求主体与母版一致。', 'web/assets/native/rphub-embedding-cache.js', 'test-classic-skin'],
    ['保留', '多个站点分别保存地址、密钥。', 'web/assets/js/app.js:createCustomApiProvider/updateCustomApiProvider', 'test-original-backup'],
    ['保留', '快捷面板可切换 API 站。', 'web/assets/js/app.js; web/assets/themes/classic/layout.html', 'test-shell'],
    ['保留', '模型槽位按站点分别记录和恢复。', 'web/assets/js/app.js:selectApiProvider; web/assets/js/api-utils.js', 'test-original-backup'],
    ['保留', '模板副模型独立站点及回退。', 'web/assets/js/app.js; web/assets/js/api-utils.js', 'test-original-backup'],
    ['保留，待真机', '网页适配与原生键盘上报均在；实际软键盘需手机验证。', 'web/assets/js/app.js; android/smali/com/rphub/app/MainActivity.smali', 'test-shell'],
    ['保留', '回车切换按钮及保存生效。', 'web/assets/native/sakura-features.js; web/assets/js/app.js:RPHubEnterToggle', 'test-classic-skin'],
    ['保留', '编辑消息收起输入栏并定位。', 'web/assets/js/app.js:editMessage; web/assets/themes/classic/layout.html', 'test-shell'],
    ['保留', '眼睛按钮切换输入栏。', 'web/assets/themes/classic/layout.html; web/assets/js/app.js', 'test-shell'],
    ['保留', '多画师串、负面词、名称和当前项。', 'web/assets/js/core-utils.js:normalizeCustomArtists; web/assets/js/app.js', 'test-image-settings'],
    ['保留', '经典页面保留原版折叠布局。', 'web/assets/themes/classic/layout.html', 'test-classic-skin; test-image-settings'],
    ['保留并适配', '固定、防重复请求、单图重生保留；接入按角色保存的原图。', 'web/assets/js/app.js; web/assets/native/rphub-image-vault.js', 'test-images; test-image-settings'],
    ['保留，待真机', '原图保存、时间戳和扩展名保留；补上母版安卓复制接口。', 'web/assets/js/image-download.js; android/smali/com/rphub/app/MainActivity$6.smali', 'test-image-download'],
    ['保留并扩展', '保留分组选择、新建，增加空分组和组内导入导出。', 'web/assets/js/preset-library.js; web/assets/js/app.js', 'test-preset-groups'],
    ['保留', '展开收起、整组开关、组内排序。', 'web/index.html; web/assets/js/app.js', 'test-preset-groups'],
    ['保留', '多选启停、移动、删除和整组删除，操作收在更多菜单。', 'web/index.html; web/assets/js/app.js:batchDeletePresets/deletePresetGroup', 'test-preset-groups'],
    ['补齐', '经典设置底部恢复在线时长；其他皮肤保留阅读设置入口。', 'web/assets/native/sakura-features.js:mountPresenceCard', 'test-classic-skin'],
    ['保留，待真机', '经典导航恢复灯塔入口，安卓优先独立窗口；网页沿用内嵌回退。', 'web/assets/js/ui-components.js; android/smali/com/rphub/app/MainActivity.smali', 'test-ui-boundaries'],
    ['保留', '名场面创建、命名、存储与回看。', 'web/assets/native/sakura-features.js:momentsPanel', 'test-classic-skin'],
    ['补齐', '经典导航的数据备份前恢复图片管理，保留筛选、多选、原图保存、配方和打包。', 'web/assets/native/rphub-image-gallery.js', 'test-classic-skin; test-images'],
    ['补齐', '经典世界书恢复放大镜全文搜索；预设和正则保留，其他皮肤世界书保留常驻搜索。', 'web/assets/native/sakura-features.js; web/assets/js/app.js', 'test-classic-skin; test-worldbook'],
    ['保留并适配', '分块备份、命名、目录、还原与旧数据兼容；保留流式入口。', 'web/assets/js/app.js; web/assets/js/backup-format.js; native/com/rphub/app/LocalFiles.java', 'test-original-backup; test-stream-import'],
    ['对齐', '新用户默认每天提醒，保留已有自动模式；每日只问一次，取消不备份。', 'web/assets/js/app.js:normalizeAutoBackupConfig/maybeRemindDailyBackup', 'test-classic-skin; test-upstream-features'],
    ['保留，待真机', '目录列表、重命名、删除、另存、刷新及系统目录授权。', 'web/assets/js/app.js:loadBackupManagerFiles; android/smali/com/rphub/app/MainActivity$6.smali', 'test-upstream-features'],
    ['保留', 'ZIP 和流式 JSON 的兼容入口。', 'web/assets/js/app.js; web/assets/js/stream-import.js', 'test-original-backup; test-stream-import'],
    ['保留', '导入前体检与无损去重、瘦身。', 'web/assets/js/app.js:inspectImportedCharacterCard/slimFullBackupImportEntries', 'test-upstream-features'],
    ['保留', '重复模板、缓存和超量记录检查清理。', 'web/assets/js/app.js:checkDataHealth', 'test-original-backup'],
    ['保留', '保存用量时按上限裁剪。', 'web/assets/js/app.js; web/assets/js/data-services.js', 'test-original-backup; test-performance'],
    ['保留', '长聊天上限与模板屏外延迟渲染。', 'web/assets/js/app.js; web/assets/js/data-services.js', 'test-performance'],
    ['保留', '角色卡导入只写一次，UI 模板完全相同项去重。', 'web/assets/js/app.js:importCharacterData/dedupeImportedUiTemplates', 'test-upstream-features'],
    ['保留，待真机', '前台保活服务与母版一致；系统省电和锁屏结果需手机验证。', 'android/smali/com/rphub/app/KeepAliveService.smali; android/AndroidManifest.xml', 'test-native-recovery'],
    ['保留', '聊天导出可选附带 UI 与记忆。', 'web/assets/js/app.js:exportChat', 'test-original-backup'],
    ['保留并适配', '分支记忆导入保存，版本检查防止旧任务覆盖。', 'web/assets/js/app.js; web/assets/js/data-services.js:commitMemoryState', 'test-original-backup; test-upstream-storage'],
    ['保留，待真机', '广场下载接口与下载钩子保留，真实站点下载需手机验证。', 'web/assets/native/download-hook.js; android/smali/com/rphub/app/MainActivity.smali', 'test-ui-boundaries; test-image-download'],
    ['保留', '经典支持原版日夜模式；卡片正文不整体反相，另保留两套可选皮肤。', 'web/assets/js/theme.js; web/assets/native/rphub-native-theme.js; web/assets/js/theme-packs.js', 'test-classic-skin; test-theme-packs'],
    ['按要求替换', '使用我们的版本公告、鸣谢和皮肤切换指引，不恢复官网重复公告。', 'web/assets/js/release-notes.js; web/assets/js/app-shell.js', 'test-release-notes; test-no-site-announcement'],
];
assert.equal(list.length, 44);
assert.equal(rows.length, list.length);
const report = list.map((item, index) => {
    const [status, result, code, tests] = rows[index];
    return { number: index + 1, upstream: text(item).trim(), status, result, code, tests: tests.split('; ') };
});
fs.mkdirSync(path.join(root, 'verification/alignment-1.23'), { recursive: true });
fs.writeFileSync(path.join(root, 'verification/alignment-1.23/patch-checklist.json'), JSON.stringify(report, null, 2));
const lines = [
    '# 2.8.118 补丁逐项对照',
    '',
    '依据用户提供的 2.8.118 APK 中“补丁清单”的 44 条原文，按原顺序检查。表中的“保留”包含源码追踪，浏览器检查覆盖主要操作；“待真机”不能当作手机实测通过。',
    '',
    '生图默认明确采用 28 步。官网在线覆盖和官网公告按用户要求改为随安装包更新及本地公告，其余补丁能力保留；本地文件保存、流式导入、预设分组与可选皮肤继续兼容。',
    '',
    '| 项 | 2.8.118 清单 | 对照结果 | 代码与检查 |',
    '| --- | --- | --- | --- |',
    ...report.map(row => `| ${row.number} | ${row.upstream} | **${row.status}**：${row.result} | \`${row.code}\`；${row.tests.map(test => `\`${test}.cjs\``).join('、')} |`),
    '',
    '补丁清单外继续核对的修复：记忆版本检查、删除保护、向量来源校验、切换分支保存、大卡单次写入、备份恢复阻止旧写入，均保留。新增补齐安卓 copyText 复制桥与 Chrome/85 以下网页内核的启动提醒。原生备份读取使用已有受路径限制的文件流实现，不重复复制母版整套远程补丁引擎。',
    '',
    '细项差异见 `verification/alignment-1.23/comparison.json` 与同目录 diff；各检查完整输出见 `verification/alignment-1.23/suite/`。没有运行真实付费模型服务，没有读取或修改玩家数据。真实安卓剪贴板、WebView 更新入口、系统文件授权、后台省电和锁屏仍需真机验证。',
];
fs.writeFileSync(path.join(root, '2.8.118补丁逐项对照.md'), lines.join('\n') + '\n');
console.log('Audited all 44 original checklist entries; retained 28 steps and the explicitly requested local announcement.');
