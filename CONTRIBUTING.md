# 协作说明

开始排查或修改前，先读本文件和 [维护问题清单](MAINTENANCE.md)。先检查分支、清单状态和现有改动，再认领尚未完成的项目；不要并行重复修同一问题。

本文沿用远程 `hh/contributing`（`8076c6d`）已审阅的协作约定，补充问题认领、修复记录和统一测试依赖入口。构建与版本号规则分别见 [BUILDING.md](BUILDING.md) 和 [版本编号规则.md](版本编号规则.md)。

涉及打包、版本标签、GitHub 发布或更新服务器时，维护者及其 AI 必须先读 [发布与更新维护必读](RELEASING.md)，分别核验发布页和软件内更新源。

## 当前维护者

**红花铃🔔是本软件贡献最多的主要贡献者，承担了大部分开发与内容贡献。** 下表仅说明当前仓库的协作分工，不是贡献排名；提交数量不能反映增强版及历史开发的全部工作。保留 Roleplay Hub / STA1N156 的原作者署名及启元等贡献者的鸣谢。

| 账号 | 负责范围 |
| --- | --- |
| `YeGuiiiiii` | 主线开发与正式发版 |
| `RFLinggg` | 网页界面、卡牌与文档 |
| `AKkzzzz` | Mac / iOS 方向的实验分支 |

发布页安装包只由持有原签名私钥的人打。其他人打出的包签名不同，不能覆盖正式版。

## 分支与合并

- `main` 始终对应可发布状态。
- 日常改动放在 `hh/<主题>` 或 `feat/<主题>`，完成后再合回 `main`。
- 涉及 `web/` 的结构性改动、原生类改动或版本号变更，先确认再合并。
- 更新 `MAINTENANCE.md`：修复完成时附上测试或验证依据并划线；现场/真机待验证项不要标成已修复。
- 不强制 Pull Request，跨人协作的分支建议保留评审记录。

## 提交前自检

```sh
git status --short
node scripts/build-stream.cjs
node scripts/compile-ui.cjs
git status --short
```

- 修改 `web/` 的模板、组件或经典布局后必须重编译，生成的 `main-render.js` 随源码提交。
- 不要运行 `scripts/prepare.mjs`，它用于最初从参考 APK 提取页面，会覆盖现有网页。
- `scripts/ui-build/node_modules/`、`verification/`、`.tools/`、`.signing/` 均不入库，不强行加入测试数据、工具或 APK。
- 原生类改动需重新编译 Java 并打包才生效，网页预览看不到效果。

## 测试环境

- 浏览器测试优先使用仓库可解析到的本地 `playwright`。也可通过 `RPHUB_PLAYWRIGHT_PATH` 指定模块路径。
- 保留原 iOS 测试的 `PLAYWRIGHT_MODULE` 环境变量兼容；安装相应浏览器后再运行 WebKit 检查。测试文件与缓存放 D 盘，Java 设置 `java.io.tmpdir`。
- 浏览器安装包需要的历史参考 APK、签名材料和私有凭据不进入 Git。
- Android 真机行为需在真实设备验证；桌面浏览器和模拟器不能替代缺口、文件授权或覆盖升级测试。
- 提交前按 [BUILDING.md](BUILDING.md) 执行对应检查。不要运行 `scripts/prepare.mjs`。

## 提交身份

提交使用真实邮箱或 GitHub noreply 邮箱。Windows 长路径可执行 `git config core.longpaths true`。

noreply 邮箱格式为 `<用户ID>+<login>@users.noreply.github.com`，账号信息可在 GitHub 的用户设置或用户 API 查看。

Git Credential Manager 的 .NET 登录程序不支持 socks5 代理。若拉取正常而推送卡在登录，使用现有代理的 HTTP 入口。首次 OAuth 登录需普通交互终端完成，不在后台忽略登录窗口。

## 许可

沿用 CC BY-NC 4.0，保留 Roleplay Hub / STA1N156 及原增强版署名。第三方资源遵循各自许可。引入或升级随包组件时，请核对该版本的版权、许可及 NOTICE 文件，在 [web/NOTICES.txt](web/NOTICES.txt) 更新声明。引入他人素材时请记录权利人、来源与允许的使用范围。
