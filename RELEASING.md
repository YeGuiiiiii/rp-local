# 发布与更新维护必读

**维护者及其 AI：涉及打包、版本标签、GitHub 发布、Actions 或更新服务器时，先读本文件。**
先遵守 `AGENTS.md`、`MAINTENANCE.md`、`CONTRIBUTING.md` 和 `BUILDING.md`；本文件补充发布约定。

## 开工前

1. `git fetch origin --tags`，检查当前分支、`git status --short` 和维护清单。认领问题并推送后再改代码；已有认领先协调。
2. 保留未提交改动，先确认它们与本次任务的关系。服务器已部署的改动也必须核对，不能拿仓库旧文件直接覆盖线上。
3. 发布分支先合入最新 `origin/main`。修复合回主线后，再从包含修复的提交建立新版本标签。
4. 分清四个对象：主线代码、版本标签对应代码、GitHub 安装包、软件内更新源。它们需要分别核验。

## 两种发布方式

### 维护者手动上传

可以继续按原方式打包、推送标签并上传 GitHub Release。必须使用原签名，附件齐备后再公开正式版：

- `RP-local-<版本>.apk`
- `SHA256SUMS-<版本>.txt`，其中记录上述 APK 的 SHA256 与准确文件名

当前 `android-release.yml` **仅允许手动运行**，正常推送分支或新标签不触发本流程。
新标签必须包含这项流程改动。旧标签仍保存其历史脚本：重新运行旧任务可能继续失败，不能靠移动旧标签消除红叉。

### 使用仓库上传流程

此流程上传已经打好并校验过的原签名 APK，不负责在 Actions 中重新打包。

1. APK 放在 `codex/download-<版本>` 分支的 `dist/`。
2. `dist/SHA256SUMS-<版本>.txt` 和非空的 `dist/RELEASE-<版本>.md` 随源码合入主线。
3. 推送对应 `v<版本>` 标签；确认该标签已合入 `origin/main`，且包含主线当前的发布工作流和 `scripts/check-release.py`。
4. 在 Actions 的 `Publish verified Android APK` 中选 **main**，填写版本，先保留 `verify_only=true`。也可使用下列命令。
5. 核验通过后，对同一版本运行 `verify_only=false`，才会创建/更新草稿并在附件回读校验通过后公开。

以下 `2.9.134` 仅为命令示例，不表示该版本已经发布：

```sh
gh workflow run android-release.yml --ref main -f version=2.9.134 -f verify_only=true
gh workflow run android-release.yml --ref main -f version=2.9.134 -f verify_only=false
```

检查由 `scripts/check-release.py` 复用，拒绝未合入主线、缺少最新发布规则、缺说明、校验文件指向其他 APK 或低于当前正式版的准备包。
传入版本通过环境变量读取，不直接拼接到 shell 脚本。不要把这些检查改成忽略错误。

若该版本已经公开，流程只下载其 APK 和校验文件进行核验，然后成功结束；不会覆盖正式附件，也不会把历史版本重新设为最新版。
GitHub Release 上传成功与某条 Actions 任务失败可以同时发生。先查任务、标签和发布页的对应关系，再判断是否需要处理。
`Check release maintenance` 会在相关脚本修改时自动运行专项测试，并以只读权限执行实际发布脚本的正式包核验路径；它不上传附件。

## 软件内更新源

公开下载源为 `https://121.40.147.125/updates/stable/latest.json`。
服务器定时器 `rp-update-sync.timer` 每约 15 分钟启动一次同步；运行中的下载会延后下一次检查。
GitHub 发布成功不等于此接口已经切到新版本。

服务器文件与仓库对应关系：

| 服务器 | 仓库 |
| --- | --- |
| `/opt/rp-updates/sync.py` | `scripts/update-server/sync.py` |
| `rp-update-sync.service` / `.timer` | `scripts/update-server/` 下同名文件 |
| `/srv/rp-updates/updates/stable/` | 正式下载目录，不直接在此改版本信息 |

通过已有的授权服务器连接查看：

```sh
systemctl status rp-update-sync.service rp-update-sync.timer --no-pager
journalctl -u rp-update-sync.service -n 100 --no-pager
```

日志显示当前阶段、正在下载的文件、收到的字节数和尝试次数。网络短暂失败最多尝试三次；404、校验错误等不会靠无限重试掩盖。
单次读取保留超时，二进制下载保留原有一小时总时限，重试共用总时限；系统服务保留已有 65 分钟上限。
下载较慢时先看字节数是否增长；服务处于运行中不等于失败，过去一次的 `Result=success` 也不能证明本次已经成功。

部署前比较现有文件，备份后替换；同步运行时不要直接覆盖脚本。修改服务配置后执行 `systemctl daemon-reload`。
测试通过后重启同步并检查日志和定时器。无需为更新发布脚本而重装手机软件。

必须保留 `sync.publish` 的附件长度、SHA256、包名、安装序号防回退与原子切换检查。
新包完整下载并验证之前，旧版继续提供下载。禁止手改 `latest.json` 冒充完成，也不能用其他网站或未经校验的包替代正式附件。

## 验收与交接

本轮修改的专项检查：

```sh
python -B -m unittest discover -s scripts -p test_release_preflight.py -v
python -B -m unittest discover -s scripts/update-server -p test_sync.py -v
git diff --check
```

涉及网页时仍按 `BUILDING.md` 重编译并运行对应网页测试。Windows 的临时文件、缓存、测试输出放 D 盘，Java 设置 `java.io.tmpdir`。

发布完成必须核对：

1. GitHub 版本、发布状态及两个附件正确；回读 APK 校验通过，签名与原正式包一致。
2. 公网 `latest.json` 的版本、安装序号、字节数、SHA256，与实际 APK 和 GitHub 附件一致。
3. 软件更新控制器能检查到同一版本；手机安装与覆盖升级是否验证另行注明。
4. 在 `MAINTENANCE.md` 写出修复提交、验证命令与结果、主线状态和线上状态，实际完成的项目才划线。旧记录保留。

历史记录：2026-11-17 的 `v2.9.133` 标签来自未包含后续发布修复的提交，旧自动任务因缺准备文件失败，维护者另行上传的 133 已成功。
服务器于北京时间 00:26 完成其同步，下载约九分钟。这是历史证据，后续交接必须重新查实时状态。

给下一位 AI 的任务开头可直接写：

> 先读 AGENTS.md、MAINTENANCE.md、CONTRIBUTING.md、BUILDING.md 和 RELEASING.md。同步远程，保留未提交改动，认领并推送后再动手。保留其他维护者代码、原签名和已发布标签；分别验证源码、发布页、更新源和真机状态，不能只看 Actions 红绿判断是否发版成功。
