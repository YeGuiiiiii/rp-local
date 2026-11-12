# 协作说明

本文只写 BUILDING.md 没覆盖的部分：谁在改、怎么提交、哪些坑会让人白忙一天。构建与打包细节见 [BUILDING.md](BUILDING.md)，版本号规则见 [版本编号规则.md](版本编号规则.md)。

## 当前维护者

| 账号 | 负责范围 |
| --- | --- |
| `YeGuiiiiii` | 主线开发与正式发版 |
| `RFLinggg` | 网页界面、卡牌与文档 |
| `AKkzzzz` | Mac / iOS 方向的实验分支 |

发布页的安装包只由持有原签名私钥的人打。其他人打出的包签名不同，装不上已发布的正式版。

## 提交身份

提交必须带真实邮箱或 GitHub 的 noreply 地址，否则在仓库里算不到自己头上。noreply 形式为 `<用户ID>+<login>@users.noreply.github.com`，可在 `https://api.github.com/users/<login>` 的 `id` 字段查到。

```sh
git config user.name  "你的 login"
git config user.email "你的ID+你的login@users.noreply.github.com"
```

三项常见环境问题：

- **文件名过长**：Windows 上执行 `git config core.longpaths true`，否则 `artwork/` 和部分 `smali` 路径会报错。
- **代理**：Git 本身支持 `socks5://`，但登录用的 Git Credential Manager 是 .NET 程序，遇到 socks5 会直接抛 `ServicePointManager 不支持具有 socks5 方案的代理`。表现为拉取正常、一推就卡在登录。此时把代理换成 `http://` 方案：`git config --global http.proxy http://127.0.0.1:<端口>`。
- **登录窗口被忽略**：后台进程或非交互终端里无法完成 OAuth 回调。首次推送请在普通终端窗口中执行，不要用脚本后台调用。

## 分支与合并

- `main` 始终对应可发布状态。
- 日常改动放在 `hh/<主题>` 或 `feat/<主题>`，完成后合回 `main`。
- 涉及 `web/` 的结构性改动、原生类改动、版本号变更，先确认再合并。
- 不强制走 Pull Request，但跨人协作的分支建议留 PR 记录，便于回溯。

## 提交前自检

```sh
git status --short          # 不应出现 node_modules、verification、.tools、.signing、dist/*.apk
node scripts/build-stream.cjs && node scripts/compile-ui.cjs
git status --short          # 若 main-render.js 有变化，说明确属本次改动
```

要点：

1. **改 `web/` 的模板、组件或经典布局后必须重编译**，否则 `main-render.js` 仍是旧内容，界面改动等于没做。生成文件随源码提交。
2. **不要运行 `scripts/prepare.mjs`**，它用于最初从参考 APK 提取页面，会覆盖现有网页。
3. `scripts/ui-build/node_modules/`、`verification/`、`.tools/`、`.signing/` 均已忽略，不要强行加入版本库。
4. 原生类改动后需重新编译 Java 并打包才会生效，网页预览看不到效果。

## 已知问题

- `scripts/test-*.cjs` 中有 49 个脚本硬编码了维护者本机的 Playwright 绝对路径，其他机器直接运行会报 `Cannot find module`。修法是把 require 改为本地解析并保留环境变量回退，尚未处理。
- 浏览器集成检查与 `check-apk.py` 依赖维护者本机的历史安装包与签名材料，非维护者无法完整复现。
- Android 真机行为（系统文件选择、目录授权、覆盖升级保留数据、页面崩溃恢复）无法用桌面浏览器或模拟器完全替代。

## 许可

沿用 CC BY-NC 4.0，保留 Roleplay Hub / STA1N156 及原增强版的署名。第三方资源遵循各自许可。
