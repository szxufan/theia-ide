# AGENTS.md

本文件面向 AI 代理与开发者，概述本仓库的基本情况、构建方式与注意事项。

## 项目定位

本仓库是 [Eclipse Theia IDE](https://github.com/eclipse-theia/theia-ide) 的定制 fork，用于构建基于 Theia 框架的桌面（Electron）与浏览器 IDE 产品。

关键特征：

- **Theia 框架以 git 子模块形式内嵌**：`theia/` 目录指向 fork 仓库 [szxufan/theia](https://github.com/szxufan/theia)，而非上游 npm 发布的 `@theia/*` 包。所有 `@theia/*` 依赖通过 pnpm workspace 的 `workspace:*` 协议直接解析到该子模块的源码。
- **包管理器为 pnpm**（不是 yarn/npm）。所有脚本、文档、CI 之外的本地命令一律使用 pnpm。锁文件为 `pnpm-lock.yaml`。
- Node.js 要求 `>=24`。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `theia/` | Theia 框架 fork（git 子模块）。修改框架代码在这里进行 |
| `applications/browser` | 浏览器版 IDE 应用 |
| `applications/electron` | 桌面版 IDE 应用（Electron，稳定通道） |
| `applications/electron-next` | 桌面版 next 通道（跟踪 Theia 主分支） |
| `theia-extensions/launcher` | 启动器扩展（欢迎页等） |
| `theia-extensions/product` | 产品品牌化扩展（图标、名称、关于对话框） |
| `theia-extensions/updater` | 自动更新扩展（Electron） |
| `scripts/` | 构建与发布脚本（见下） |
| `configs/` | eslint、license-check 等共享配置 |
| `plugins/` | 下载的 VS Code 插件（vsix），由 `download:plugins` 生成 |
| `docs/` | 开发文档 |
| `next/`、`releng/` | next 通道与发布流水线（Jenkins CI，上游基础设施） |

## 常用命令（全部使用 pnpm）

```bash
# 首次准备
git submodule update --init --recursive theia   # 或 pnpm theia:init
pnpm install                                     # 含 postinstall：patch + 链接本地 theia

# 构建（基于本地 theia 子模块，推荐）
pnpm build:dev                                   # 开发构建（stable 应用）
pnpm build                                       # 生产构建（stable 应用）
pnpm build:local-theia --prod --package          # 生产构建 + 打包安装包

# 仅重建 / 运行某个应用
pnpm browser build:prod                          # 重建浏览器应用
pnpm browser start                               # 启动浏览器应用（localhost:3000）
pnpm electron start                              # 启动桌面应用

# 插件与打包
pnpm download:plugins                            # 下载 theiaPlugins 声明的 vsix 到 plugins/
pnpm package:applications                        # 打包 stable 应用
pnpm electron package:preview                    # 打包桌面预览版（不签名）

# 测试与检查
pnpm test                                        # lerna 跑各包测试
pnpm lint                                        # eslint（scripts + 各包）
pnpm license:check                               # Eclipse Dash 许可证检查

# theia 子模块管理
pnpm theia:sync                                  # 同步上游 eclipse-theia/theia
pnpm theia:update                                # 子模块更新到远端跟踪分支
```

## 构建机制

- 根构建走 `scripts/build-with-local-theia.js`（`pnpm build:local-theia`），负责：编译 theia 子模块、构建 theia-extensions、链接 workspace、构建并可选打包应用。`--postinstall` 模式在 `pnpm install` 后自动执行链接逻辑。
- 多包编排用 lerna（`lerna run --scope=...`），但包管理始终是 pnpm。
- 版本升级用 `pnpm release:prepare`（`scripts/prepare-release.ts`）。

## 插件机制

根 `package.json` 的 `theiaPlugins` 字段声明要内置的 VS Code 插件（URL → vsix），`pnpm download:plugins` 下载到 `plugins/` 目录，打包时随应用分发。`theiaPluginsExcludeIds` 声明要从 builtin 包中排除的插件。当前内置插件包括 vscode-builtin-extensions、Java 扩展包与简体中文语言包。

## theia 子模块（fork）自定义点

fork（szxufan/theia）相对上游的定制，详见 [docs/developing-with-local-theia.md](docs/developing-with-local-theia.md) 的 "Fork Customizations in the Submodule" 一节：

1. **自动中文界面**：`packages/core/src/browser/preload/i18n-preload-contribution.ts` 在系统语言为中文时自动设置 `nls.locale = 'zh-cn'`。
2. **本地化加载韧性**：
   - 前端 preload 对 `loadLocalization` 增加 10s 超时，超时/失败回退默认语言，避免白屏。
   - 后端 `packages/plugin-ext/src/hosted/node/hosted-plugin-localization-service.ts` 的缓存目录清理失败（如被运行中的实例锁定导致 EPERM）时降级到进程级临时目录，且保证 `ready` 永远 resolve，不阻塞插件部署。
   - 回归测试：同目录下的 `*.spec.ts`（`hosted-plugin-localization-service.spec.ts`、`i18n-preload-contribution.spec.ts`）。

修改子模块代码后，需在 `theia/` 目录内重新编译对应包（如在 theia 根目录 `npx tsc -b packages/core`），再重建应用。

## 约定与注意事项

- **不要使用 yarn 或 npm**：安装、脚本运行、版本操作一律 pnpm（`pnpm install`、`pnpm <script>`、`pnpm version`、`pnpm update -r`）。
- 修改代码时同步更新文档与测试。
- `theia/` 子模块内的上游文档仍保留 yarn 表述（上游框架本身用 yarn），**不要**为了统一而改动子模块内的上游文件，避免同步冲突。
- `releng/`、`next/`、`cleanup/` 下的 Jenkinsfile 是 Eclipse 基金会上游 CI 配置，仍使用 yarn，本地开发不涉及。
- `.npmrc` 配置了扁平化 hoisting，使 theia build、esbuild、原生模块重建等遍历 node_modules 的工具正常工作，不要随意改动。
- Windows 上调试可使用 `THEIA_CONFIG_DIR` 环境变量隔离配置目录，避免与已安装的 Theia IDE 实例互相锁定文件。
