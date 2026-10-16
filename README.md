<br/>
<div id="theia-logo" align="center">
    <br />
    <img src="https://raw.githubusercontent.com/eclipse-theia/theia-ide/master/theia-extensions/product/src/browser/icons/TheiaIDE.png" alt="Theia Logo" width="300"/>
    <h3>Eclipse Theia IDE</h3>
</div>

<div id="badges" align="center">

Eclipse Theia IDE 由本项目构建。\
Eclipse Theia IDE 同时也作为一个模板，用于构建基于 Eclipse Theia 平台的桌面产品。

</div>

[![Installers](https://img.shields.io/badge/download-installers-blue.svg?style=flat-curved)](https://theia-ide.org/#theiaidedownload)
[![Build](https://github.com/eclipse-theia/theia-ide/actions/workflows/build.yml/badge.svg?event=schedule)](https://github.com/eclipse-theia/theia-ide/actions/workflows/build.yml?query=event%3Aschedule)
[![Next Build](https://github.com/eclipse-theia/theia-ide/actions/workflows/build-next-release.yml/badge.svg?branch=master)](https://github.com/eclipse-theia/theia-ide/actions/workflows/build-next-release.yml)

[Theia 主仓库](https://github.com/eclipse-theia/theia)

请访问 [Theia 网站](http://www.theia-ide.org)获取更多文档：[使用 Theia IDE](https://theia-ide.org/docs/user_getting_started/)、[将 Theia 打包为桌面产品](https://theia-ide.org/docs/blueprint_documentation/)。

## 许可证

- [MIT](LICENSE)

## 商标

"Theia" 是 Eclipse Foundation 的商标
<https://www.eclipse.org/theia>

## 这是什么？

Eclipse Theia IDE 是一款面向云端和桌面的现代开源 IDE。Theia IDE 基于 [Theia 平台](https://theia-ide.org)。
Theia IDE 提供[可下载的桌面应用](https://theia-ide.org/#theiaidedownload)。你也可以在线试用最新版本的 Theia IDE。在线测试版本每次会话限时 30 分钟，由 Theia.cloud 托管。最后，我们还提供了一个[实验性 Docker 镜像](#docker)，用于在线托管 Theia IDE。

Eclipse Theia IDE 同时也作为一个**模板**，用于构建基于 Eclipse Theia 平台的桌面产品，并展示 Eclipse Theia 的能力。它由现有 Eclipse Theia 功能与扩展的一个子集组成。[相关文档](https://theia-ide.org/docs/composing_applications/)可以帮助你定制并构建自己的基于 Eclipse Theia 的产品。

## Theia IDE 与 Theia Blueprint

Theia IDE 已从最初的名称 "Theia Blueprint" 更名而来。因此，你可以认为 "Theia IDE" 与 "Theia Blueprint" 这两个术语是同义词。

## 开发

### 环境要求

请查阅 Theia 的[前置条件](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites)，并保持 Theia IDE 的 Node 版本与所引用的 Theia 版本一致。

### 文档

关于如何将 Theia 打包为桌面产品的文档可在[这里](https://theia-ide.org/docs/blueprint_documentation/)找到。

对于基于此模板构建自己产品的采用者，请参阅[采用者指南](ADOPTER.md)了解其他注意事项。

### 仓库结构

- 根目录使用 lerna 配置 mono-repo 构建
- `applications` 汇集了不同的应用目标
  - `browser` 包含基于浏览器的 Eclipse Theia IDE 版本，可打包为 Docker 镜像
  - `electron` 包含要打包的 Electron 应用、打包配置以及 electron 目标的 E2E 测试。
- `theia-extensions` 汇集了 Eclipse Theia IDE 的各种自定义 Theia 扩展
  - `product` 包含一个提供产品品牌化的 Theia 扩展（关于对话框与欢迎页）。
  - `updater` 包含一个提供更新机制及相应 UI 元素的 Theia 扩展（基于 electron updater）。
  - `launcher` 包含一个 Theia 扩展，为 AppImage 应用提供创建脚本的选项，从而可以通过在命令行调用 'theia' 命令来启动 Eclipse Theia IDE。
- `patches` 包含应用于上游软件包的补丁

### 构建

对于 Eclipse Theia IDE 的开发和日常测试，可以以 "dev" 模式构建。这使得在资源较少的系统（如配备 4GB 内存的 Raspberry Pi 4B）上也能构建 IDE。

注意：如果在更新依赖或拉取到更新的提交后手动构建，请运行 `git clean -xfd` 以帮助避免运行时冲突。

```sh
# 构建应用的 "dev" 版本。速度更快，占用资源更少，
# 但前端应用不经过 "minify"（压缩混淆）
pnpm install && pnpm build:dev && pnpm download:plugins
```

生产版本应用：

```sh
# 构建 Eclipse Theia IDE 应用的生产版本
pnpm install && pnpm build && pnpm download:plugins
```

### 打包应用

目前我们只为 Electron 应用生成安装包。

_如果你正尝试在 ARM 机器上为 ARM 编译，可能需要提前遵循[这些步骤](https://github.com/eclipse-theia/theia-ide/issues/690#issuecomment-4157768849)。_

```sh
pnpm package:applications
# 或者
pnpm electron package
```

打包后的应用位于 `applications/electron/dist`。

### 创建预览版 Electron 应用（不打包）

```sh
pnpm electron package:preview
```

打包后的应用位于 `applications/electron/dist`。

### 在 Electron 上运行 E2E 测试

E2E 测试是针对实际应用的基础 UI 测试，针对打包应用的预览版运行。

```sh
pnpm electron package:preview
pnpm electron test
```

### 运行浏览器应用

浏览器应用可以通过以下命令启动：

```sh
pnpm browser start
```

然后连接到 <http://localhost:3000/>。

### 使用本地 Theia 框架进行开发

要针对本地开发版本的 Theia 框架构建和测试 Theia IDE，请参阅 [docs/developing-with-local-theia.md](docs/developing-with-local-theia.md)。

### 故障排查

- [_"Don't expect that you can build app for all platforms on one platform."_](https://www.electron.build/multi-platform-build)

### 报告功能请求与缺陷

Eclipse Theia IDE 中的功能基于 Theia 以及所包含的扩展/插件。对于 Theia 中的缺陷，请考虑在 [GitHub 上的 Theia 项目](https://github.com/eclipse-theia/theia/issues/new/choose)中提交 issue。
Eclipse Theia IDE 只是将现有功能打包成产品以及产品的安装程序。如果你认为打包有误、打包中需要添加某些内容，或者安装程序无法正常工作，请[在 GitHub 上提交 issue](https://github.com/eclipse-theia/theia-ide/issues/new/choose) 告知我们。

### Linux（AppImage）

Theia IDE 的 AppImage 发行版要求系统安装 FUSE（`libfuse2`）。这是 AppImage 格式的通用要求，并非 Theia IDE 特有。详情及各发行版的安装说明请参阅 [AppImage 文档](https://docs.appimage.org/user-guide/troubleshooting/fuse.html)。

### Docker

Theia IDE 的 Docker 镜像目前处于_实验状态_。它与桌面版本基于相同的源码和软件包构建，但不属于 [Theia IDE 的预览测试与发布流程](https://github.com/eclipse-theia/theia-ide/blob/master/PUBLISHING.md#preview-testing-and-release-process-for-the-theia-ide)的一部分。
你可以在[这里](https://github.com/eclipse-theia/theia-ide/pkgs/container/theia-ide%2Ftheia-ide)找到 IDE 预构建的 Docker 镜像。

你也可以使用以下构建命令，基于浏览器应用为 Eclipse Theia IDE 创建 Docker 镜像：

```sh
docker build -t theia-ide -f browser.Dockerfile .
```

然后可以通过以下命令运行：

```sh
docker run -p=3000:3000 --rm theia-ide
```

然后连接到 <http://localhost:3000/>。
