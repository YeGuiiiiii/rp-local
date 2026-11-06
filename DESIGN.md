---
name: "RP 本地版 · 白昼手账与夜蔷薇"
description: "UI 关联昼夜与配色，共用清楚的玻璃画廊与细腻控件。"
colors:
  night-canvas: "#141216"
  night-paper: "#211d23"
  night-field: "#19161b"
  night-line: "#57434e"
  night-text: "#f2e9eb"
  night-muted: "#c5b7bf"
  night-rose: "#e7acbb"
  night-wine: "#442732"
  day-canvas: "#f4f1f7"
  day-paper: "#fffefa"
typography:
  title:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", sans-serif'
    fontSize: "24px"
    fontWeight: 750
    lineHeight: 1.45
    letterSpacing: "0"
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 500
    letterSpacing: "0"
  label:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    letterSpacing: "0"
  composer:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", sans-serif'
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  control: "6px"
  panel: "8px"
  badge: "4px"
  dock: "30px"
spacing:
  compact: "6px"
  small: "8px"
  action-gap: "10px"
  control-gap: "12px"
  section: "16px"
  page-mobile: "20px"
  group: "24px"
  page-desktop: "32px"
components:
  resource-button:
    backgroundColor: "{colors.night-paper}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.control}"
    padding: "16px 12px"
  resource-button-hover:
    backgroundColor: "#3b2632"
  settings-row:
    textColor: "#eee2e7"
    padding: "12px 8px"
  settings-field:
    backgroundColor: "{colors.night-field}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.control}"
  composer:
    backgroundColor: "{colors.night-paper}"
    textColor: "{colors.night-text}"
    typography: "{typography.composer}"
    rounded: "{rounded.panel}"
    padding: "10px 8px 6px"
  button-send:
    backgroundColor: "#853e59"
    textColor: "#fff1f6"
    rounded: "{rounded.control}"
    height: "42px"
    width: "42px"
  button-send-disabled:
    backgroundColor: "{colors.night-field}"
    textColor: "{colors.night-muted}"
  theme-pack:
    backgroundColor: "{colors.night-paper}"
    rounded: "{rounded.panel}"
  mode-badge:
    rounded: "{rounded.badge}"
    padding: "3px 7px"
---

# Design System: RP 本地版 · 白昼手账与夜蔷薇

## Overview

**Creative North Star: "月下手账"**

白昼手账与夜蔷薇分别拥有日间、夜间模式和配套颜色。夜间使用炭黑书布、酒红内衬、珍珠色文字与银月配饰；控件带细腻亮边，画廊使用随倾斜变化的玻璃反光，保持适合长时间阅读与操作的安静密度。

软件美术与角色卡正文各有边界。玥玥陪伴菜单、页面标题、空状态和操作区域，正文继续按角色卡自身内容渲染。图案负责气氛，文字、输入框、选项和点击区域保持真实控件。

**Key Characteristics:**

- 白昼手账对应日间，夜蔷薇对应夜间；切换 UI 同步模式和配色。
- 紧凑标题、分组列表、明确的资源按钮和低干扰聊天输入栏。
- 炭黑层次、酒红操作色、柔和亮文字与银色小配饰。
- 玻璃反光默认开启，只在外观提供独立开关；反光移动，原图保持不动。
- 玥玥保留圆脸、黑发、暗红瞳和角色自身左右不同的配饰。

本文记录 `web/` 在版本 1.10 的已实现界面。主要依据为 `web/assets/css/materials.css`、`web/assets/themes/catalog.js`、`web/assets/js/theme-packs.js`、`web/assets/js/gallery-glass.js`、`web/assets/themes/vampire/theme.css`、`web/assets/js/app-shell.js`、`web/assets/js/release-notes.js` 与 `web/assets/css/release-notes.css`；角色外貌以 `陈玥-视觉规范.md` 为准。

## Colors

颜色的精确值以本文前置 token 与对应 CSS 为准；每套 UI 自带显示模式和强调色。

### Primary

- **夜蔷薇**（`night-rose`）：页面小图标、选中提示、输入光标与焦点轮廓。
- **酒红内衬**（`night-wine`）：选中底色、工具激活态、关闭按钮和人物头像占位。
- **发送酒红**（`button-send`）：聊天发送按钮；禁用时使用单独的低亮底色和文字。

### Neutral

- **炭黑书布**（`night-canvas`）：页面底色。
- **夜色纸页**（`night-paper`）：菜单、导航和各尺寸聊天输入栏。
- **深色笔槽**（`night-field`）：设置输入与选择控件。
- **灰玫瑰细线**（`night-line`）：字段边线、分隔线和页面标题下沿。
- **珍珠文字**（`night-text`）：主要文字；**灰银文字**（`night-muted`）用于次要信息。
- **白昼纸页**（`day-paper`）与**淡灰紫桌面**（`day-canvas`）：保留原日间手账。
**The Pack and Mode Rule.** 每套 UI 决定自己的显示模式、配色与美术；选择 UI 同步三者，外观不再提供独立模式和主色选择。

现有 `catalog.js` 中，`journal` 为白昼手账，`vampire` 为夜蔷薇。新增季节套装登记独立 ID、名称、说明、分类、模式、强调色、美术目录和预览，可附加样式表。旧套装 ID 按已保存的昼夜状态迁移；主题样式在基础材质之后加载，保证重新打开时配色一致。

## Typography

**Display / Body Font:** 本地系统无衬线字体，完整回退栈见前置 token。界面不要求下载字体。正文的书写字体、代码字体和角色卡样式继续使用原有规则。

### Hierarchy

- **Title**：页面主标题，使用 `title`；窄屏夜蔷薇在（400px）及以下降至（22px）。
- **Section**：夜蔷薇分组标题（15px，700），比主标题安静，方便扫描列表。
- **Body**：设置行与资源按钮文字通常（14px）；资源按钮使用（600）字重。
- **Label**：说明文字通常（12px）；底部主导航只展示图标，名称由提示与无障碍标签提供。
- **Field**：设置字段、搜索和聊天输入保持（16px），不依赖缩小文字容纳内容。
- **Composer**：聊天输入使用 `composer`，保留清楚的行距和输入空间。

现有界面标题字距为零；不要把阅读正文的衬线标题规则扩展到所有软件控件。

## Layout

页面独立滚动，底部为固定四入口导航。通用页面最大宽度（1100px），桌面高级与设置首页最大宽度（850px），设置详情最大宽度（1000px）。移动页面左右留白使用 `page-mobile`，桌面使用 `page-desktop`，底部留出导航与安全区空间。

高级资源操作默认双列、最小按钮高度（82px）；角色专用操作在（768px）及以上变为四列。设置分组使用连续横向列表，每行最小高度（58px），通过底部细线分隔。外观套装采用自适应网格，最小列宽（140px），选项间距（12px）。

夜蔷薇标题行最小高度（146px），角色图使用（136 × 118px）；（400px）及以下改为（116 × 104px），标题行最小高度（132px）。正文不为装饰扩大留白。

**The Composer Surface Rule.** 聊天输入栏在各尺寸使用对应 UI 的不透明底色和细亮边；移动端不启用实时背景模糊，保证输入清楚。

输入栏文本最小高度（44px），最大高度为（40vh）与（20rem）中的较小值。工具（36 × 36px），发送按钮（42 × 42px）。导航整体宽度为视口减（48px），最大（360px），胶囊高度（58px），右侧保留独立在线圆钮与安全区边距。

聊天默认使用沉浸模式，隐藏消息旁的头像与姓名，不改顶栏角色入口。旧版升级启用一次，之后保留玩家选择。夜间输入框装饰位于内部底边，底部留出（26px），工具行和文字不与装饰重叠。

## Elevation & Depth

深浅相邻的表面、细亮边、浅内阴影与小块酒红底色表达层次。按钮呈缎面珐琅质感，字段像浅凹槽，导航为轻薄胶囊。输入栏关闭背景模糊，使用上沿亮边与轻投影（`0 7px 18px -9px var(--ui-shadow)`）。菜单保留遮罩与（`0 20px 50px #0006`）投影，画廊玻璃使用内侧亮边与轻薄反光。

按钮背景与文字以（120ms ease）过渡，按下轻移（1px）；导航指示块以（200ms）移动。减少动态效果时使用代码已有的停用动画、取消位移或缩短过渡规则，不增加持续晃动。

**The Original Image Rule.** 倾斜只移动玻璃反光层，不位移、拉伸或修改原图；保存图片直接读取原始文件，不包含玻璃效果。

## Shapes

功能控件以 `control` 小圆角为主，菜单、套装卡和输入栏使用 `panel`。设置行保持平直，避免把每行都包成独立卡片。导航为 `dock` 胶囊，选中块圆角（24px），在线入口、拖选目标和关闭钮为正圆，人物头像保留圆形。

相簿上下角使用同套银月与酒红饰件，底部导航使用配套彩绘徽章与收起月扣。素材按比例显示，透明边缘贴合，不截获点击。相簿开口保持绝对定位；预览玻璃框紧贴实际图像尺寸，横竖图与缩放均保持比例。

## Components

### Buttons

资源按钮是清楚的操作入口：小圆角、单线边框、左图标右文字，右上角保留银色短线。默认底色叠加浅缎面高光；禁用按钮降低透明度，继续沿用真实 `disabled` 状态。

聊天工具使用图标按钮，默认不填满强调色，激活与 hover 时出现酒红底色。发送按钮使用 `button-send`，禁用外观使用 `button-send-disabled`；生成中切换已有停止样式。焦点轮廓为（2px）夜蔷薇色，夜间主操作区外移（3px）。

### Cards / Containers

个人设定保留一块可点击资料区；高级功能使用重复的资源按钮；外观套装卡带预览、名称、说明、昼夜标记、配色色样与单选控件。套装卡选中时改变边框，焦点进入时出现轮廓。设置详情内部的设置分区保持无额外阴影和嵌套卡片的平面布局。

### Preset Groups

预设分组在同页展开、收起；收起行只显示箭头、名称、数量与整组开关。展开后显示“导入预设”、新建与“更多”；重命名、组内导出、整组导出和批量管理收进菜单。组内导入固定使用该组，顶部导入不跟随展开状态；预设内容、顺序与保存方式保留。此交互自版本 1.11 生效。

### Inputs / Fields

生图密钥下方展示剩余次数与独立刷新图标按钮，与 API 页共用查询状态。空密钥显示“未填写密钥”，查询时显示“查询中…”，失败显示“查询失败”，不保留旧密钥余额；刷新按钮触控区不小于（44 × 44px）。

设置字段使用浅凹槽、单线边框和小圆角，文本保持可编辑。搜索框最小高度（50px），提示字使用 `--shell-muted` 并保持完全不透明；下拉选择入口最小高度（46px），菜单选项最小高度（44px）。聊天输入栏内部文本背景透明、工具栏顶部有细分隔线，输入栏获得焦点时边框转为强调色。文本与状态不绘制进图片。

带多行说明的设置切换按钮允许内容撑高，最小高度（46px）；状态文字使用现有次要文字色，开启时使用强调文字色，避免说明被固定高度裁切。

### Navigation

底部四入口为角色卡、画廊、高级和设置。日间图标（26 × 26px），夜蔷薇彩绘徽章（28 × 28px），选中入口有圆润指示块。独立在线圆钮（54 × 54px）使用同套材质，每个入口至少（44 × 44px）可点。聊天菜单底部提供日间 / 夜间快速切换，切换对应 UI、配色与玥玥素材并保存选择，保留当前菜单、聊天与草稿。折叠、返回、弹出菜单和关闭操作保留原有行为与焦点入口。此导航形态自版本 1.12 生效。

在线入口自 1.15 改用就近拖选：长按 360ms 后覆盖全屏暗色蒙版，灯塔和广场各用一个（64 × 64px）圆钮，位于原入口左上方。图标下方只显示名称，拖近时用轮廓与颜色高亮，松手才进入；松在空白、手势取消、切后台或窗口变化时关闭。关闭钮（54 × 54px）与原入口重合。轻点和键盘同样可展开并点选，Escape 与安卓返回关闭，保留焦点循环。展开从入口伸出，减少动态效果时仅淡入淡出；不再保留中央大轮盘及其磨砂样式。

### Mode Badge

外观预览角落的“日间”或“夜间”为小型信息标签，使用 `badge`。它不是独立模式切换按钮；套装选择由带名称的单选控件完成。

### Gallery Glass / Tilt Switch

外观提供一行“倾斜反光”与原生开关，默认开启，关闭状态持久保存。画廊不另设启用按钮。关闭时保留静态玻璃；离开画廊、切后台或系统要求减少动态效果时停止监听并重置反光。

姿态传感器只保留一个共用监听，更新上限约（30fps）；按屏幕方向映射倾斜并限制幅度。桌面支持指针反光。需要授权的平台在画廊内首次实际点击或显式开启开关时请求；拒绝后保留静态玻璃。反光层不拦截预览、缩放、翻页和保存操作。

### Page Headers

世界书和正则顶部角色信息下提供“当前角色卡 / 全局生效”分段切换，直接访问两种作用范围。切换按钮至少 44px 高，修改条目作用范围后同步切换当前列表，原搜索、排序及数据归属保留。

大世界书每页最多显示 100 条，页码输入可直接跳转，搜索仍查完整作用范围。每页排序只调整该页条目的原数据位置。列表右侧保留细滚动条，向下滚动后显示圆形返回顶部按钮。API 与生图详情只保留页面主标题，删除内部重复标题。

管理页作为外层纵向布局的可滚动内容，最小高度为 0，使用顶部角色信息之外的剩余空间。手机样式不得将管理页的最小高度设为整屏，防止列表最后一条和操作按钮落到裁切区外。

画廊、高级、设置与关于页只保留标题，不附口号或装饰性副标题。画廊相簿数量并入标题同一行，仍保留主标题与数量的字级区别。

### Local Announcement

公告沿用当前日夜配色，采用细边、小圆角（8px）与连续分节正文。顶部固定标题、版本、对照来源和关闭图标；正文独立滚动，只列具体功能变化，不添加开场白、工程解释、测试说明、底部提示或弹出规则。

公告首条固定“鸣谢与更新”：鸣谢红花铃🔔老师、启元老师，注明软件更新在 QQ 群 472441481 发布。后续功能变化列在鸣谢之后，不改变版本展示频率。

秘书装玥玥戴圆眼镜、拿教鞭悬在右下，背后由底部向上渐变透明，不加厚底框或底部分隔线。人物与渐变不截获点击；正文底部留白（158px），滚到底后最后一段能完整停在人物上方。短横屏将人物缩至（76 × 76px），底部留白改为（112px）。

圆形关闭按钮始终可见，支持叉掉、点遮罩、Escape 和焦点循环；关闭后恢复原焦点。公告按安装版本仅自动展示一次，称呼初始化和启动加载结束后展示，关于页可手动回看；不设阅读或确认门槛。

### Yueyue Artwork

页面标题、角色目录与聊天菜单上的玥玥使用共用戳戳按钮。点击时轻弹一次，切换委屈、炸毛或开心表情；两套日夜形象各保留三张透明表情图，尺寸固定、等比显示，不改变布局。对白气泡避开屏幕边缘，显示 1.5 秒后用 0.2 秒淡出，不拦截操作；连续点击替换同一气泡。切页、关闭菜单、位置变化、切后台立即清理。减少动态效果时取消弹跳，文字淡出缩至 80ms。启动随机问候一次，页面词库和进度只存本次运行内存。

玥玥保持温和的吸血鬼形象和已确认的角色辨识度。菜单、设置、高级、相簿、输入相关情绪与错误状态使用对应姿态。具体发型、饰物左右、备用丝带位置等以 `陈玥-视觉规范.md` 为准，不根据单张预览自行改设定。

吸血鬼主题含（20）张 WebP，文件位于 `web/assets/themes/vampire/`；来源保留嵌入 XMP 与同名 `.webp.json`，新饰件源稿位于 `artwork/glass-ui-20261106/`，戳戳表情源稿位于 `artwork/mascot-poke-20261106/`。软件素材延续不可保存为生图结果的现有处理。

## Do's and Don'ts

### Do:

- **Do** 让 UI 选择同步对应的昼夜模式与配色，并保持重新打开时一致。
- **Do** 用真实文本、字段、单选和按钮承载功能，用玥玥与小配饰补充气氛。
- **Do** 让倾斜反光默认开启，只在外观用独立开关保存选择。
- **Do** 保持原图比例与保存字节，反光只作用于显示层。
- **Do** 按 `陈玥-视觉规范.md` 维护外貌与角色自身左右配饰。
- **Do** 区分浏览器界面检查与 Android 真机验证。

### Don't:

- **Don't** 把软件立绘或大面积装饰叠到角色卡阅读正文上。
- **Don't** 用惨白恐怖形象、亮红星星瞳或尖下巴替代玥玥的既定形象。
- **Don't** 为玻璃效果拉伸原图、扩大白边或阻挡图片操作。
- **Don't** 恢复与 UI 分离的模式、主色选择或画廊启用按钮。
- **Don't** 把尚未制作的季节套装写成已经可用的内容。

版本 1.09 的浏览器截图与报告位于 `verification/glass-ui-1.09/` 与 `verification/theme-linked-1.09/`，包含（360px、390px、1280px）两套 UI、开关、姿态事件模拟、原图保存与主题重开检查。截图与事件模拟不能证明 Android 真实传感器、授权、软键盘或真机显示效果；该轮未做 Android 真机验证。
