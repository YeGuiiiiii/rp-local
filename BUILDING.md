# 源码下载与构建

## 下载

```sh
git clone https://github.com/YeGuiiiiii/rp-local.git
cd rp-local
```

`main` 为已提交的开发内容。发布页的版本标签对应各次正式安装包，复现 2.9.022 可使用 `git checkout v2.9.022`。Windows 如果提示文件名过长，使用 `git -c core.longpaths=true clone https://github.com/YeGuiiiiii/rp-local.git` 下载。

## 网页预览

安装 Python 3 后，在仓库根目录运行：

```sh
python -m http.server 8080 --bind 127.0.0.1 --directory web
```

Windows 也可将 `python` 换成 `py`。浏览器打开 `http://127.0.0.1:8080`，按 `Ctrl+C` 停止。

`web` 可直接作为其他平台的静态站点目录。聊天、生图及在线服务仍需自行配置对应服务；网页预览无法验证 Android 文件接口、系统返回与覆盖升级。预览数据与已安装 APK 的数据分别保存。

## 修改网页

安装 Node.js 22 或更新版本，在仓库根目录执行：

```sh
npm ci --prefix scripts/ui-build
node scripts/build-stream.cjs
node scripts/compile-ui.cjs
```

编辑 `web/index.html`、组件模板或经典布局后重新执行 `compile-ui.cjs`；编辑 `scripts/stream-import/` 后重新执行 `build-stream.cjs`。生成文件随源码提交，下载者无需先编译即可预览。

不要为日常开发运行 `scripts/prepare.mjs`：它用于最初从参考 APK 提取页面，会重建网页文件。

## Android 打包

当前外壳使用 Apktool 与 smali，新增 Java 文件位于 `native/`，不是 Android Studio / Gradle 工程。现有打包脚本适用于 Windows PowerShell 7，另需 Node.js 和下列工具：

| 仓库中的工具路径 | 内容 |
| --- | --- |
| `.tools/java/<JRE目录>/bin/java.exe` | Java 17 运行环境，包含 `keytool.exe` |
| `.tools/apktool.jar` | Apktool 2.x |
| `.tools/signer.jar` | uber-apk-signer |
| `.tools/ecj.jar` | Eclipse Java 编译器 |
| `.tools/r8.jar` | 含 D8 的 Android R8 工具 |
| `.tools/android.jar` | Android SDK API 33 的 `android.jar` |

工具从各自官方项目或 Android SDK 获取，二进制工具和维护者签名不放入 Git。准备后先执行上面的网页编译命令，再在 PowerShell 中执行：

```powershell
New-Item -ItemType Directory -Force reference/RP-Hub | Out-Null
Copy-Item -LiteralPath LICENSE -Destination reference/RP-Hub/LICENSE
& ./scripts/build.ps1 -Version 2.9.022
```

输出为 `dist/RP-local-2.9.022.apk` 和对应的 `SHA256SUMS-2.9.022.txt`。首次构建自动在 `.signing/` 创建自己的签名；请自行妥善保留，后续用同一签名升级自己打出的包。

自行构建的签名与官方 Release 不同，不能覆盖官方安装包。需要切换时先导出备份；不要为试编译直接卸载正在使用的软件。官方 Release 沿用原有维护者签名，可以覆盖旧本地版。

现有 `build.ps1` 还会调用资源检查，与历史 `dist/RP-local-0.3.apk` 比较；打包前需要从维护者获取此参考包，放入 `dist/`，目前尚未提供从全新下载到 Android 打包的一键环境安装。上面的网页编译与预览不需要参考 APK。

本仓库提供已有的检查脚本；浏览器集成检查目前引用维护者本机 Playwright 路径，其他机器执行前需调整依赖路径。`check-apk.py` 还依赖历史安装包、androguard、Pillow 和 loguru，供维护者核对官方签名与资源。Android 真机行为仍需实际安装验证。

迁移到标准安卓工程的阶段与验收条件见 [存储改造路线-20261108.md](存储改造路线-20261108.md)。当前打包流程尚未切换到 Gradle。

## 许可

项目保留 Roleplay Hub / STA1N156 及原增强版的署名，沿用 CC BY-NC 4.0，完整文本在 `LICENSE`。下载、修改和分发应遵守署名与非商用条件；依赖库及美术资源保留各自的许可与来源说明。
