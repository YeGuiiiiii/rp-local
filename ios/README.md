# RP 本地版 iOS 初步移植

复用本仓库当前 `web/` 页面，增加独立的 Swift / WKWebView 外壳，不修改 Android 构建。
这是待苹果环境编译、真机验证的源码，不是已经能安装的 IPA。

## 已接入的接口

- 内置网页离线启动；固定本地地址和持久化 WebKit 数据库。
- 角色卡、聊天与设置沿用原有 JSON 文件镜像，图片沿用角色卡文件夹和索引。
- 文件分享菜单导出 JSON、角色卡和图片；系统文件选择器导入沿用 HTML 文件输入。
- 应用内分块备份、列表、读取、改名和删除；手动导出通过分享菜单另存到“文件”。
- URLSession 转发 HTTP(S) fetch，保留逐段响应、请求头、状态码与取消，供流式聊天和生图使用。
- 主页面之外的网页不获得文件桥。外部链接使用系统网页窗口。

iOS 内置图片保存当前通过分享菜单选择保存位置，不会直接写入相册。
灯塔在系统网页窗口打开，此窗口暂不注入安卓原有的站点下载、主题等脚本。
网页中原有依赖 Android 的其他能力需后续逐项核对。
后台执行受 iOS 管理，不保证切到后台后持续生成。

## 准备源码

在仓库根目录执行：

```powershell
node scripts/prepare-ios.cjs
```

它只替换 `ios/Resources/site/`，同步当前网页版本和图标。
更新共享界面模板后，先按原流程重新生成 `web/assets/js/main-render.js`，再准备 iOS。
准备后的 `ios/` 可以单独复制到 Mac，不依赖 Windows 上的工具路径。

## Mac 编译

需要完整 Xcode、对应 iOS SDK 和 XcodeGen：

```bash
brew install xcodegen
cd ios
bash build.sh
```

产物在 `build/RP-local-版本号-unsigned.ipa`，是供侧载工具签名的未签名包。
也可打开生成的 `RPLocal.xcodeproj`，在 Xcode 设置自己的 Team 后运行到手机。
初次启动 Xcode 后需完成它要求的组件安装和许可确认。
本项目不包含苹果账号、证书、描述文件、续签工具、越狱或永久签名实现。

仓库新增 `.github/workflows/ios-build.yml`，仅在手动触发时运行：
准备网页、执行桥接检查和模拟器原生测试，然后上传未签名 IPA 构建产物。
源码同步到 GitHub 后，可在仓库 Actions 中手动运行该流程。
推送源码不会自动启动云端构建；iOS 仍需苹果环境编译和验证。

覆盖更新时维持相同 Bundle ID 和签名身份，不要先卸载；正式迁移数据前另存备份。
Android 与 iOS 存档不自动共享，已有独立图片目录不在原有 JSON 备份内，需要另行迁移。

## 验证

Windows 可运行 `node --test scripts/test-ios-bridge.cjs`，检查网页桥的存储约定、
流式响应、UTF-8 分段、取消与错误。这不执行原生 Swift。
运行 `node scripts/test-ios-web.cjs` 可用 Playwright WebKit 检查准备后的页面、
重开存档、图片索引与备份导出，原生接口仍为模拟实现，证据在 `verification/ios/`。

Mac 上先用 `xcrun simctl list devices available` 找到模拟器 UUID，再运行：

```bash
IOS_TEST_DESTINATION="platform=iOS Simulator,id=实际UUID" bash build.sh test
```

原生单元测试覆盖文件重开、同内容跳过写入、图片读取及越界和软链接拒绝。
仍需真机检查：启动、键盘、真实 API 流式聊天、文件导入导出、图片、
旧备份恢复、重启保存和同包名覆盖更新后的数据保留。

## 署名

网页与原始功能来自 STA1N156 的 Roleplay Hub（RP-Hub）。
沿用仓库 CC BY-NC 4.0 许可与第三方依赖署名，详见内置 `RP-Hub-LICENSE.txt`。
