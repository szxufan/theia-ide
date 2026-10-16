# Eclipse Theia IDE 发布指南

本文档提供了一套统一、结构化的指南，用于发布新版本的 Theia IDE。内容涵盖从更新软件包版本、预览测试、发布、晋升到稳定通道，以及其他发布后活动的全部流程。

## 目录

1. [概述](#1-概述)
2. [更新软件包版本与 Theia](#2-更新软件包版本与-theia)
   - [2.0 补丁发布分支（可选）](#20-补丁发布分支可选)
   - [2.1 安装构建依赖](#21-安装构建依赖)
   - [2.2 更新版本](#22-更新版本)
   - [2.3 检查必需的代码变更](#23-检查必需的代码变更)
   - [2.4 准备发布 PR](#24-准备发布-pr)
   - [2.5 Mac 产物](#25-mac-产物)
   - [2.6 合并发布 PR 并触发 Jenkins 构建](#26-合并发布-pr-并触发-jenkins-构建)
3. [预览、测试与发布流程](#3-预览测试与发布流程)
   - [3.1 确认新的预览版本已发布](#31-确认新的预览版本已发布不要晋升为稳定版)
   - [3.2 宣布预览测试阶段](#32-宣布预览测试阶段)
   - [3.3 补丁发布](#33-补丁发布)
4. [将 IDE 从预览通道晋升到稳定通道](#4-将-ide-从预览通道晋升到稳定通道)
5. [为发布提交打标签](#5-为发布提交打标签)
6. [发布 Docker 镜像](#6-发布-docker-镜像)
7. [Snap 更新](#7-snap-更新)
8. [升级依赖](#8-升级依赖)

## 1. 概述
<!-- release: both -->

每次向 master 分支的提交都会自动发布为预览版本。官方更新需要变更版本号。

本指南区分两种版本号：

- **THEIA_VERSION**：（使用的变量：{{version}}）本次发布所使用的 Theia 版本。
- **THEIA_IDE_VERSION**：（使用的变量：{{ideVersion}}）Theia IDE 的发布版本。视上下文而定：
  - 如果**没有**新的 Theia 发布，则将补丁版本号加 1（例如 1.47.0 -> 1.47.1 或 1.47.100 -> 1.47.101）。
  - 对于 Theia 新的 *minor* 发布（例如 1.48.0），使用与 Theia 相同的版本号。
  - 对于 Theia 新的 *patch* 发布（例如 1.48.1），使用 Theia 的补丁版本号乘以 100（例如 1.48.100）。

## 2. 更新软件包版本与 Theia
<!-- release: both -->

按照以下步骤更新依赖与软件包版本：

### 2.0. 补丁发布分支（可选）
<!-- release: patch -->

如果自上次 minor 发布以来已有提交合入 `master`，而这些提交**不应**包含在补丁中，请使用专门的发布分支，而不是直接在 `master` 上操作：

1. 从 minor 发布提交创建并推送一个分支，命名遵循 `release/{{version}}` 约定：

   ```sh
   git checkout <sha-of-minor-release> -b release/{{version}}
   git push origin release/{{version}}
   ```

2. 直接在该分支上提交你的补丁变更 —— **无需 PR**。

使用此方式时，请参阅 [2.5 Mac 产物](#25-mac-产物)和 [2.6 合并发布 PR 并触发 Jenkins 构建](#26-合并发布-pr-并触发-jenkins-构建)中调整后的说明。

### 2.1. 安装构建依赖
<!-- release: both -->

```sh
pnpm install
```

### 2.2. 更新版本
<!-- release: both -->

按照 [1. 概述](#1-概述)中描述的方式确定 **THEIA_IDE_VERSION**，然后使用两个版本号运行发布准备脚本：

```sh
pnpm release:prepare --theia {{version}} --ide {{ideVersion}}
```

它会更新 monorepo 版本、所有软件包版本、Theia 依赖、带版本号的 `@theia` 补丁文件名以及 pnpm 锁文件。它从不自行推导版本，两个版本号都严格按传入值使用。

- 如果没有要使用的新 Theia 发布，可省略 `--theia`，`--ide` 则始终必填。
- 添加 `--dry-run` 可只打印版本号和命令而不实际执行。

继续之前请检查生成的 diff，它应该只包含版本变更。

可选：手动执行的步骤为：

1. 将 monorepo 版本更新为 **THEIA_IDE_VERSION**（不创建 Git 标签）：

   ```sh
   pnpm version {{ideVersion}} --no-git-tag-version
   ```

2. 可选：如果有要使用的新 Theia 发布，将 Theia 依赖更新为 **THEIA_VERSION**：

   ```sh
   pnpm update:theia {{version}} && pnpm update:theia:children {{version}}
   ```

3. 将所有软件包版本更新为 **THEIA_IDE_VERSION**（在输入提示中选择）：

   ```sh
   pnpm lerna version --exact --no-push --no-git-tag-version
   ```

4. 更新 pnpm 锁文件：

   ```sh
   pnpm install
   ```

### 2.3. 检查必需的代码变更
<!-- release: both -->

更新代码，纳入所有应包含在本次发布中的内容：

- 实现位于此处的所有工单：<https://github.com/eclipse-theia/theia-ide/labels/toDoWithRelease>
- 如果有 Theia 发布：
  - 审查破坏性变更
  - 检查新的内置插件
  - 检查示例应用的变更
  - 按需更新代码
  - 检查示例应用中要使用的新的 Theia 软件包（如果没有相关工单）

### 2.4. 准备发布 PR
<!-- release: both -->

完成步骤 2.3 后，带着你的变更打开一个 PR <https://github.com/eclipse-theia/theia-ide/compare>

   PR 标题：

   ```md
   Update to Theia v{{version}}
   ```

   或（如果只是纯粹的 Theia IDE 版本更新）：

   ```md
   Publish Theia IDE {{ideVersion}}
   ```

### 2.5. Mac 产物
<!-- release: both -->

Jenkins 构建不会自行构建 mac 应用，它会从此预发布中下载未签名的 dmg 并进行签名：<https://github.com/eclipse-theia/theia-ide/releases/tag/pre-release>。因此它的 `mac-x64.zip` 和 `mac-arm64.zip` 资产必须替换为发布构建的产物。

在发布分支（发布 PR 的 head 分支，补丁发布则为 `release/{{version}}`）上触发 [Build, package and test](https://github.com/eclipse-theia/theia-ide/actions/workflows/build.yml) 工作流，并启用 **Upload the mac artifacts to the rolling 'pre-release'** 选项。一旦构建在所有平台上变绿，它就会原地替换这两个资产。

可选：手动执行的步骤是从该次运行中下载两个 zip 文件（在 PR 构建中构建也会将其作为普通工作流产物上传），然后手动替换两个预发布资产。

### 2.6. 合并发布 PR 并触发 Jenkins 构建
<!-- release: both -->

1. 合并 PR

2. ==> 必须先完成步骤 2.4 和 2.5 才能继续！

3. 一旦[合并到 master 后的 CI 检查完成](https://github.com/eclipse-theia/theia-ide/actions)，不带参数触发 Jenkins Release Preview <https://ci.eclipse.org/theia/job/theia-ide-release/> 任务。

4. 一旦第 3 步成功，公证任务 <https://ci.eclipse.org/theia/job/theia-ide-sign-notarize/> 会自动启动。

5. 一旦第 4 步成功，它会启动上传任务 <https://ci.eclipse.org/theia/job/theia-ide-upload/>

  *注意*：如果上传失败超过 5 次请报告，我们需要调查！

> **补丁发布分支：** 如果使用 `release/{{version}}` 分支：
>
> - 跳过第 1 步（无需合并 PR）。发布分支上的 CI 检查完成后即可继续。
> - 在触发 Jenkins 任务之前，将所有三个任务的分支标识符从 `master` 改为 `release/{{version}}`：
>   - <https://ci.eclipse.org/theia/job/theia-ide-release/>
>   - <https://ci.eclipse.org/theia/job/theia-ide-sign-notarize/>
>   - <https://ci.eclipse.org/theia/job/theia-ide-upload/>
> - ⚠️ **提醒：** 预览构建完成后，将所有三个 Jenkins 任务的分支标识符改回 `master`。

## 3. 预览、测试与发布流程
<!-- release: both -->

PR 合并并创建预览构建后，按照以下步骤进行测试和最终发布：

### 3.1 确认新的预览版本已发布（不要晋升为稳定版）
<!-- release: both -->

- 检查下载目录 <https://download.eclipse.org/theia/ide-preview/{{ideVersion}}/> 中已上传的版本是否完整
  - 例如检查最新的文件是否正确、产物是否齐全（如有疑问，可与之前的版本对比）

### 3.2 宣布预览测试阶段
<!-- release: minor -->

### 3.2.1 GH Discussions
<!-- release: minor -->

- 使用 GitHub Discussions 在 [Release Announcements 分类](https://github.com/eclipse-theia/theia/discussions/new?category=release-announcements)发布公告。

   标题：

   ```md
   Theia IDE {{majorMinor}}.x Preview Testing
   ```

   正文：

   ```md
   The new version {{ideVersion}} of the Theia IDE is available on the preview channel now. Please join the preview testing!

   You can download it here:

   - [Linux](https://download.eclipse.org/theia/ide-preview/{{ideVersion}}/linux/TheiaIDE.AppImage)
   - [Mac x86](https://download.eclipse.org/theia/ide-preview/{{ideVersion}}/macos/TheiaIDE.dmg)
   - [Mac ARM](https://download.eclipse.org/theia/ide-preview/{{ideVersion}}/macos-arm/TheiaIDE.dmg)
   - [Windows](https://download.eclipse.org/theia/ide-preview/{{ideVersion}}/windows/TheiaIDESetup.exe)

   Update your existing installation by setting the preference `updates.channel` to `preview`.

   Please respond here when you can test the preview without finding blockers, by commenting with a ✔️.
   If you find any issues, please mention them in this thread and report them as an issue once confirmed by other testers.

   | Phase | Target | Status |
   |:---|:---|:---|
   | {{ideVersion}} preview available | {{releaseDate}} | :white_check_mark: |
   | {{ideVersion}} community preview window | {{previewStart}} → {{previewEnd}} | :hourglass_flowing_sand: |
   | Theia IDE {{majorMinor}}.x Promoted to Stable | {{previewEnd}} + 1 business day |  |
   | Docker image Publish | {{previewEnd}} + 1 business day |  |
   | Snap updated | {{previewEnd}} + 1 business day |  |
   ```

- 将该讨论置顶到 Release Announcement 分类

### 3.2.2 theia-dev 邮件列表
<!-- release: minor -->

- 通过电子邮件向 [the `theia-dev` 邮件列表](mailto:theia-dev@eclipse.org)宣布预览发布，使用以下模板：

   主题：

   ```md
   Theia IDE {{majorMinor}}.x preview phase
   ```

   正文：

   ```md
   Hi everyone,

   Version {{ideVersion}} of the Theia IDE is now available on the preview channel. Please join the preview test and help us stabilize the release.
   Visit the preview discussion for more information and coordination: https://github.com/eclipse-theia/theia/discussions/{{discussionNumber}}
   ```

### 3.2.3 Eclipse Theia Release 讨论
<!-- release: minor -->

- 在 Theia Release 公告（`Eclipse Theia v{{version}}`）讨论中宣布 Theia IDE 预览测试阶段的开始（参见 <https://github.com/eclipse-theia/theia/discussions/categories/release-announcements>）：

   ```md
   The preview test phase for the Theia IDE {{ideVersion}} has started. You can find the details here: 
   
   - https://github.com/eclipse-theia/theia/discussions/{{discussionNumber}}
   ```

### 3.2.4 可选：向 Theia IDE 预览测试者发布公告
<!-- release: minor -->

- 可选：向你的测试者宣布 Theia IDE 预览测试阶段的开始（例如通过 Slack、Teams、电子邮件）：

   ```md
   :theia: The Theia IDE preview {{ideVersion}} for Theia version {{version}} is now available!
   Please take a moment to test it and provide feedback - whether you've run into issues or everything works as expected. {{linkToNewPreviewComment}}

   To help us get a quick overview, please react with the emoji for your OS (:ubuntu:, :windows:, :mac_arm:, :mac_x64:) once you updated to the new version.
   Thanks!
   ```

### 3.3 补丁发布
<!-- release: patch -->

- 处理报告的阻断问题并发布补丁版本（此过程可能需要 1–2 周）。

   **注意：** 如果问题持续存在，或资源不足，发布可能推迟到下一个版本。

- 如果发现了阻断问题，在相应的预览窗口中添加此状态：

   ```md
    :no_entry:  blocker was found 
   ```

### 3.3.1 在预览讨论中更新新的预览版本
<!-- release: patch -->

- 对于补丁发布，使用[预览讨论](#32-宣布预览测试阶段)并发表评论，宣布 Theia IDE 的补丁发布：<https://github.com/eclipse-theia/theia/discussions/{{discussionNumber}}>

   ```md
   The new version {{ideVersion}} of the Theia IDE is available on the preview channel now. Please join the preview testing!

   You can download it here:

   - [Linux](https://download.eclipse.org/theia/ide-preview/{{ideVersion}}/linux/TheiaIDE.AppImage)
   - [Mac x86](https://download.eclipse.org/theia/ide-preview/{{ideVersion}}/macos/TheiaIDE.dmg)
   - [Mac ARM](https://download.eclipse.org/theia/ide-preview/{{ideVersion}}/macos-arm/TheiaIDE.dmg)
   - [Windows](https://download.eclipse.org/theia/ide-preview/{{ideVersion}}/windows/TheiaIDESetup.exe)

   Update your existing installation by setting the preference `updates.channel` to `preview`.

   Please respond here when you can test the preview without finding blockers, by commenting with a ✔️.
   If you find any issues, please mention them in this thread and report them as an issue once confirmed by other testers.
   ```

### 3.3.2 更新预览讨论状态表
<!-- release: patch -->

- 将目标日期调整为计划中的新预览窗口和最终发布日期
- 如有需要在状态中添加评论
- 示例公告参见：<https://github.com/eclipse-theia/theia/discussions/16109>

- 在讨论的状态表中为当前补丁发布添加两行：

   ```md
   | [{{ideVersion}} preview available]({{linkToNewPreviewComment}}) | {{previewStart}} | :white_check_mark: |
   | {{ideVersion}} community preview window | {{previewStart}} → {{previewEnd}} | :hourglass_flowing_sand: |
   ```

- 同时调整表中其余条目的目标日期（如果尚未晋升）

### 3.3.3 可选：内部 Slack 公告
<!-- release: patch -->

- 可选：在你的内部 Slack 频道中宣布 Theia IDE 预览测试阶段的开始：

   ```md
   :theia: The Theia IDE preview {{ideVersion}} for Theia version {{version}} is now available!
   Please take a moment to test it and provide feedback - whether you've run into issues or everything works as expected. {{linkToNewPreviewComment}}

   To help us get a quick overview, please react with the emoji for your OS (:ubuntu:, :windows:, :mac_arm:, :mac_x64:) once you updated to the new version.
   Thanks!
   ```

## 3.4 可选：内部 Slack — 反馈提醒
<!-- release: both -->

- 可选：在预览期临近结束时安排一条 Slack 提醒：

```md
Quick reminder: We're planning to promote the new IDE version (e.g., tomorrow/on Monday), please share your feedback for the preview {{ideVersion}}!
:point_right: https://github.com/eclipse-theia/theia/discussions/{{discussionNumber}}
Thanks! :thx:
```

## 4. 将 IDE 从预览通道晋升到稳定通道
<!-- release: both -->

使用 [Build Job](https://ci.eclipse.org/theia/job/Theia%20-%20Promote%20IDE/) 晋升 IDE。

- 在 `VERSION` 参数中指定发布版本（例如 1.48.0），对应从 <https://download.eclipse.org/theia/ide-preview/> 复制来的 **THEIA_IDE_VERSION**。

- 发表评论，宣布 Theia IDE 正式发布：

   ```md
   [{{ideVersion}} has been promoted to stable](https://download.eclipse.org/theia/ide/{{ideVersion}}/)
   ```

  - 在[预览讨论](#32-宣布预览测试阶段)状态表中更新勾选标记和已发布的版本。

   ```md
   | [Theia IDE {{ideVersion}} Promoted to Stable](https://download.eclipse.org/theia/ide/{{ideVersion}}/) | {{today}} | :white_check_mark: |
   ```

  - 将该消息标记为答案。

  - 将讨论从 Release Announcement 分类中取消置顶。

## 5. 为发布提交打标签
<!-- release: both -->

晋升发布后，按如下方式为发布提交打标签：

1. 创建标签：

   ```bash
   git tag v{{ideVersion}} ${SHA of release commit}
   ```

2. 将标签推送到仓库：

   ```bash
   git push origin v{{ideVersion}}
   ```

## 6. 发布 Docker 镜像
<!-- release: both -->

通过从 `master` 分支或发布标签运行[工作流](https://github.com/eclipse-theia/theia-ide/actions/workflows/publish-theia-ide-img.yml)来发布 Docker 镜像。
使用 **${THEIA_IDE_VERSION}** 作为版本号。当前在这种情况下我们**不**使用 v 前缀。

- 在 GH 软件包页面检查镜像是否正确发布：<https://github.com/eclipse-theia/theia-ide/pkgs/container/theia-ide%2Ftheia-ide>

- 更新[预览讨论](#32-宣布预览测试阶段)状态表

   ```md
   | [Docker image {{ideVersion}} published](https://github.com/eclipse-theia/theia-ide/pkgs/container/theia-ide%2Ftheia-ide) | {{today}} | :white_check_mark: |
   ```

## 7. Snap 更新
<!-- release: both -->

可与步骤 6 并行进行。
IDE 晋升到稳定版后，执行以下步骤进行 snap 更新：

1. 从 `master` 分支运行[此工作流](https://github.com/eclipse-theia/theia-ide-snap/actions/workflows/update.yml)。
2. 构建成功后，访问 <https://github.com/eclipse-theia/theia-ide-snap/pulls> 找到更新到 **${THEIA_IDE_VERSION}** 的 PR。
3. 检出对应的分支。
4. 使用你的作者信息修正（amend）最新提交：

   ```bash
   git commit --amend --author="Your Name <name@example.com>"
   ```

5. 强制推送该分支。
6. 确认所有检查通过，然后执行 `rebase and merge`。
7. 确认 master 分支构建（Store Publishing）成功。
8. 检查 snap 是否可用 <https://snapcraft.io/theia-ide>
9. 更新[预览讨论](#32-宣布预览测试阶段)状态表

   ```md
   | [Snap latest/stable updated to {{ideVersion}}](https://snapcraft.io/theia-ide) | {{today}} | :white_check_mark: |
   ```

## 8. 升级依赖
<!-- release: both -->

每次发布后，运行以下命令升级依赖：

请将此升级流程放在单独的 PR 中进行，因为它可能需要 Eclipse Foundation 的 IP 审查以及额外时间。此外，请核对 `pnpm-lock.yaml` 中的 `electron` 版本，如有变化则调整 `applications/electron/electron-builder.yml` 中的 `electronVersion`。

执行升级的步骤：

- 在仓库根目录运行 `pnpm update -r`。
- 修复所有编译错误、类型错误和失败的测试。
- 带着变更打开一个 PR（[示例](https://github.com/eclipse-theia/theia-ide/pull/568)）。
- 许可证检查审查通过 CI 完成。
- 等待 "IP Check" 完成（[示例](https://gitlab.eclipse.org/eclipsefdn/emo-team/iplab/-/issues/22828)）。

在发布后执行此操作有助于我们发现新依赖的问题，并为依赖的许可证检查留出时间。
