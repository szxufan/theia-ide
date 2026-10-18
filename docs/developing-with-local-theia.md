# 使用 Theia 框架子模块进行开发

本指南介绍如何针对 [Theia 框架](https://github.com/eclipse-theia/theia)的 git
子模块来构建和测试 Theia IDE。这在你需要以下场景时非常有用：

- 针对尚未发布的 Theia 功能测试 Theia IDE 的变更
- 调试同时横跨框架与 Theia IDE 的问题
- 开发新的 Theia 功能并立即在 Theia IDE 中进行测试

框架位于 `theia` 子模块中，它是
[eclipse-theia/theia](https://github.com/eclipse-theia/theia) 的一个 fork，
地址为 `https://github.com/szxufan/theia.git`。**基于子模块构建是默认方式**：
`pnpm build`、`pnpm build:dev`、`pnpm build:next` 和
`pnpm build:next:dev` 都会先编译子模块，并将其软件包链接到 IDE 构建中。

## 前置条件

- 已安装 Node.js 和 pnpm（参见 [Theia 前置条件](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites)）

克隆本仓库后，初始化子模块（构建脚本在子模块缺失时也会自动执行此操作）：

```sh
git submodule update --init theia   # 或者：pnpm theia:init
```

## 子模块的固定与版本

子模块固定在其源码被发布为本 IDE 所依赖的 `@theia/*` 版本的那个提交上
（例如 `1.77.0-next.25`）。注意，Theia 从 master 提交发布 `1.X.0-next.*`
预发布版本时**不为其打标签**，也不会把版本号变更提交回 master ——
master 上的 `package.json` 文件仍携带上一个稳定版本。要找到与已发布版本匹配
的提交，可以使用 npm 元数据：

```sh
npm view @theia/core@<version> gitHead
# 例如 1.77.0-next.25 -> 73f0462af513c55e6120fe0d759ff777160fafb2
git -C theia checkout <commit>
git add theia   # 在本仓库中记录新的固定提交
```

当检出的框架与 IDE 的依赖线明显不匹配时，构建会打印警告。

### 将 Fork 与上游同步

如果你想要固定的提交或标签在 fork（`szxufan/theia`）中缺失，请从上游同步：

```sh
pnpm theia:sync             # 将上游 master + 标签抓取到 ./theia
pnpm theia:sync --push      # 同时快进 fork 并推送缺失的标签
```

使用 `--push` 需要拥有对 fork 的推送权限。在 GitHub 只能通过 SSH 访问的网络
上，请将上游 URL 重写为 SSH 形式：

```sh
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

要将子模块移动到 fork 的最新 master：

```sh
pnpm theia:update           # git submodule update --remote theia
```

## 子模块中的 Fork 自定义

该 fork 在上游之上携带了少量改变运行时行为的提交。在与上游同步或调试启动问
题时，请牢记以下几点：

- **单语言（仅简体中文）改造**（本次大规模定制，涉及多个文件）：
  - 本 fork 是**仅简体中文**的产品：删除了全部多语言支持（包括英语语言数据
    与繁体中文），语言切换命令（Configure Display Language）及其 QuickPick、
    localStorage 语言持久化机制均已移除，`nls.locale` 固定为 `zh-cn`。
  - 关键实现点：
    - `packages/core/src/common/nls.ts`：`defaultLocale = 'zh-cn'`，
      `locale` 为固定常量；`setLocale`/`localeId` 已删除；
      `localizeByDefault` 不再输出「找不到翻译键」警告。
    - `packages/core/src/browser/preload/i18n-preload-contribution.ts`：
      启动时始终加载 `zh-cn` 本地化数据（保留 10 秒超时保护），失败时直接
      使用源码中的中文默认值，不再回退其他语言。
    - `packages/core/src/node/i18n/theia-localization-contribution.ts`：
      仅注册 `zh-cn`。语言数据文件只保留
      `packages/core/i18n/nls.zh-cn.json`，其余 14 个 `nls.*.json`
      （含 `nls.json` 英语与 `nls.zh-tw.json`）已删除。
    - 语言切换 UI：`packages/core/src/browser/i18n/language-quick-pick-service.ts`
      与 `packages/vsx-registry/src/browser/vsx-language-quick-pick-service.ts`
      已删除，`common-commands.ts` 中的 `CONFIGURE_DISPLAY_LANGUAGE` 命令
      及其在 `common-frontend-contribution.ts` 中的注册一并移除。
    - 插件宿主（`packages/plugin-ext`）：插件源码字符串为英文、由
      zh-cn 简体中文语言包插件翻译，因此 `localization-ext.ts` 的
      「默认语言跳过翻译」捷径被禁用（`isDefaultLanguage` 恒为 false），
      `getNlsConfig` 只要存在翻译配置就会下发给插件进程。
    - 源码中所有面向用户的字符串（约 500+ 文件）已直接翻译为中文，
      `nls.zh-cn.json` 与 zh-cn 语言包仅作为兜底。
    - AI 聊天代理的中文显示名：`Agent` 接口（`packages/ai-core/src/common/agent.ts`）
      新增可选 `displayName` 字段，`packages/ai-chat/src/common/chat-agents.ts`
      提供 `getAgentDisplayName()` 辅助函数（未设置时回退 `name`）。
      全部 UI 显示点（聊天输入框固定代理 chip、@补全列表、请求/响应气泡
      代理名、委派卡片、AI 配置页、会话列表与 tooltip、外部 API 的
      `agentName`）均渲染显示名；`name`/`id` 保持英文，@提及解析
      （`chat-request-parser.ts`）、偏好配置值与会话持久化不受影响，
      LLM 提示词中的代理名单也保持英文。内置代理显示名：编码（Coder）、
      架构（Architect）、通用（Universal）、编排（Orchestrator）、
      应用测试（AppTester）、命令（Command）、代码审查（Code Reviewer）、
      GitHub、会话摘要（Chat Session Summary）、Claude Code、Codex。
  - 应用层三个应用（browser/electron/electron-next）的
    `theia.frontend.config` 均设置了 `"defaultLocale": "zh-cn"`；
    根 `package.json` 的 `MS-CEINTL.vscode-language-pack-zh-hans`
    语言包插件**必须保留**（Monaco 编辑器与内置 VS Code 扩展中文文案的来源）。
  - **同步警告**：由于源码字符串与文档的大面积中文化，本 fork 与上游
    `eclipse-theia/theia` 已无法直接合并，`pnpm theia:sync` 的快进同步
    不再适用于本 fork 的自定义提交，同步后需手工解决大量冲突。
- **本地化的启动韧性**（
  `packages/plugin-ext/src/hosted/node/hosted-plugin-localization-service.ts`）：
  - 前端最多等待 10 秒（`localizationLoadTimeout`）来获取来自后端的本地化数
    据，因此行为异常的后端再也无法无限期地阻塞 preload 阶段（白屏窗口）。
  - 后端保证 `HostedPluginLocalizationService.ready` 一定会 resolve，即使共
    享的本地化缓存（`<config dir>/localization-cache`）无法清理——例如被另
    一个运行中的实例锁定（Windows 上的 EPERM）。此时它会回退到操作系统临时
    目录下的进程级缓存目录。

  回归测试位于被修改源码的旁边
  （`i18n-preload-contribution.spec.ts`、`hosted-plugin-localization-service.spec.ts`）。
- **偏好设置搜索改进**（`packages/preferences/src/browser/preference-tree-model.ts`）：
  设置搜索过滤器经过重构后已可用，尤其对中文输入友好：
  - 任何非空查询都会过滤列表（上游要求超过 2 个字符，因此 1–2 个字符的词
    —— 中文里很常见 —— 从不触发过滤）。
  - 除 `description` 外还会搜索 `markdownDescription`；两者均不区分大小写
    （上游只搜索 `description`，且区分大小写）。
  - 查询会被拆分为以空白分隔的词元，所有词元必须以任意顺序全部匹配（对偏
    好设置的 id 进行模糊子序列匹配，或对描述进行子串匹配），例如 `size font`
    能找到 `editor.fontSize`。
  - `@tag:` 词项会在分词前被剥离，且不会留下多余的空白。

  回归测试位于 `preference-tree-model.spec.ts`（"search matching"）。
- **AI 能力补齐（对照 ZCode / opencode 的十项差距）**：
  - **AGENTS.md 自动注入**（ai-ide）：`WorkspaceInstructionsVariableContribution`
    发现工作区根的 `AGENTS.md`/`AGENT.md`/`CLAUDE.md`（每根取最高优先级一个，
    32KB 截断，文件变更自动失效缓存），经 `workspace-instructions` 内置提示词
    片段注入 Coder/Universal/Architect 系统提示词（默认开启、可经能力开关关闭）。
  - **通用 Web 工具**（新包 `@theia/ai-web`）：模型无关的 `webFetch`（HTML→Markdown）
    与 `webSearch`（DuckDuckGo 免密钥默认，可配 Brave/SearXNG）；后端经
    `RequestService` 出网（遵循 `http.proxy`），前端工具带确认门槛；
    `web-access` 能力片段默认注入 Coder 代理模式与通用代理。
  - **会话级自主模式**（ai-chat/ai-chat-ui）：`CommonChatSessionSettings.autonomyMode`
    支持 `plan`（拒绝写工具并回传中文原因）与 `yolo`（自动放行确认，`confirmAlwaysAllow`
    工具除外），在会话设置对话框中选择，`AutonomyModeChatBanner` 横幅常显。
  - **客户端上下文压缩**（ai-chat）：`ClientCompactionService` 在估算上下文超过模型
    `maxInputTokens` 的阈值（默认 80%）时，用 `default/summarize` 别名模型把较早轮次
    压缩为摘要；压缩记录（`ClientCompactionRecord`）随会话持久化，`getMessages` 用
    摘要替换旧消息（UI 完整历史保留）。OpenAI/Anthropic 的服务端压缩启用时自动让位。
  - **消息排队**（ai-chat）：请求进行中再次提交不再取消当前请求，而是进入会话级
    FIFO 队列（上限 10 条），完成后自动按序发送；输入框上方渲染「已排队」气泡并可取消。
  - **Shell 后台任务**（ai-terminal）：`shellExecuteBackground` 工具（start/status/
    read/stop），输出按偏移增量读取；复用 ShellCommandPermissionService 的确认策略。
  - **后台代理委派**（ai-chat）：`delegateToAgent` 新增 `background` 参数，立即返回
    taskId；`getDelegationResult`/`stopDelegation` 轮询与停止；完成时向父会话注入
    信息性通知。
  - **工具调用 Hook**（ai-core）：`ToolCallHook` 贡献点（`beforeToolCall` 可拒绝并回传
    原因、`afterToolCall`）插入 `ToolCallExecutorImpl` 执行链；`ToolCallEventBus`
    广播每次调用前后事件（供外部 API/遥测消费）。
  - **自动记忆**（ai-ide，默认关闭）：`AutoMemoryService` 在会话空闲后用摘要模型提取
    值得长期记住的事实，哈希去重后写入记忆目录 `wiki/自动记忆.md` 并链接到
    `wiki/index.md`；偏好 `ai-features.autoMemory.enabled` 开启。
  - **崩溃恢复**（ai-chat）：保存时若仍有进行中的请求，会话元数据记 `hasInterrupted`；
    恢复时为这些响应追加「会话在此处被中断……编辑并重新发送即可重试」信息标记，
    保留已收到的部分内容。

  各项的回归测试与实现同目录（如 `client-compaction.spec.ts`、
  `chat-service-queue.spec.ts`、`tool-call-hook.spec.ts`、
  `auto-memory-service.spec.ts`、`chat-crash-recovery.spec.ts`、
  `workspace-instructions-variable-contribution.spec.ts`）。
- **交互增强（借鉴 Trae IDE 的七项）**：
  - **快照回滚**（ai-chat/ai-chat-ui）：`SessionRollbackService` 按请求汇总变更集
    元素（同文件取最早修改前内容，add 型删除文件），响应节点工具栏的
    「回滚到此轮修改之前」一键恢复；文件变更工具创建元素时显式透传
    `originalState`，重载后仍可回滚。仅覆盖 AI 文件工具的变更，shell 直接改盘不在此列。
  - **工具调用折叠**（ai-chat-ui/ai-core）：回复中连续 ≥2 次已完成的工具调用折叠为
    单行摘要（如「已执行 3 次工具调用 · writeFileContent、shellExecute ×2 · 拒绝 1」），
    进行中的调用保持展开；偏好 `ai-features.chat.collapseToolCalls`（默认开）。
  - **`#` 上下文增强**（ai-chat）：新增 `#workspace`（工作区两级目录树）与
    `#folder:<路径>`（文件夹三级目录树）上下文变量，均带参数选择器与内联补全，
    目录条目上限 500 截断；`#file:` 补全把当前打开的编辑器文件排到最前。
  - **AI 任务面板**（ai-chat-ui/ai-chat/ai-terminal）：`AiTaskProvider` 贡献点聚合
    后台委派、排队消息与后台命令三类任务，底部「AI 任务」视图分组展示（状态、
    查看输出、停止），每 5s 轮询拉取型数据源；`ShellExecutionServer.listTasks()`
    附带命令行，后台命令输出中检测到 `http://localhost:<端口>` 时提供「打开预览」。
  - **文档集 #Docs**（ai-web）：`DocSetService` 把 URL（抓取转 Markdown）或本地文件
    沉淀为工作区级参考文档（单篇 64K、总量 256K 上限），命令「AI 文档集：添加/管理」；
    `#docs` 变量附加清单或全文；`doc-set` 能力片段（`{{docSet}}`，无文档时为空）
    在 Universal/Coder 提示词中默认启用。
  - **实时预览**（ai-ide）：`AiPreviewWidget`（地址栏 + iframe）内嵌开发服务器页面，
    支持「自动刷新」（文件变化 800ms 防抖重载）；命令 `ai-ide.openPreview`（可带 url），
    任务面板的「打开预览」经此调起。已知限制：预览目标不得设置
    `X-Frame-Options`/`frame-ancestors`（常见 dev server 默认满足）。
  - **AI 代码审查**（ai-ide）：`GetGitChangesTool.getWorkingTreeChanges`（`git diff
    HEAD`）+ 「变更审查」agent（中文评审提示词、只读工具）+ 命令
    「AI 代码审查：审查未提交变更」一键发起（diff 超 100K 截断注明，未跟踪文件不在范围）。
  - **选中代码添加到聊天**（ai-editor）：编辑器右键菜单「将选中代码添加到聊天」
    （`ai-editor.addSelectionToChat`，启用 AI 后显示）——把点击时刻的选区以
    「引用 文件 第 a-b 行 + 语言围栏代码块」快照插入主聊天输入框光标处
    （轮询等待输入框 Monaco 挂载，最长 2s），可继续编辑后发送；
    与「Ask AI」（内联输入框、立即发送）互补并存。

  各项的回归测试与实现同目录（如 `session-rollback-service.spec.ts`、
  `tool-call-group.spec.tsx`、`workspace-chat-variable-contribution.spec.ts`、
  `ai-chat-task-providers.spec.ts`、`shell-task-provider.spec.ts`、
  `doc-set-service.spec.ts`、`ai-preview-widget.spec.tsx`、
  `working-changes-review-command-contribution.spec.ts`、
  `add-selection-to-chat-contribution.spec.ts`）。

## 重要说明

构建不会更新 `package.json` 文件中的 IDE 版本或 Theia 软件包版本。它使用两
个仓库的当前状态，并将子模块的 `@theia/*` 软件包符号链接到 IDE 的
`node_modules` 以覆盖这些依赖。如有需要，请在构建前单独运行版本管理命令
（例如 `pnpm update:theia <version>`）。

## 快速开始

```sh
git submodule update --init theia   # 仅在全新克隆时需要
pnpm build:dev                      # 构建框架 + stable 应用（dev 模式）
```

`pnpm build`、`pnpm build:dev`、`pnpm build:next` 和 `pnpm build:next:dev`
都委托给 `scripts/build-with-local-theia.js`：

| 脚本                | 构建内容（来自子模块）                            |
|---------------------|---------------------------------------------------|
| `pnpm build`        | 框架 + `browser` + `electron`（prod）             |
| `pnpm build:dev`    | 框架 + `browser` + `electron`（dev）              |
| `pnpm build:next`   | 框架 + `electron-next`（prod）                    |
| `pnpm build:next:dev` | 框架 + `electron-next`（dev）                   |

要改用 npm 发布的 `@theia/*` 软件包进行构建而非子模块（例如跟踪新发布的
`next` 版本时），请使用：

```sh
pnpm build:npm        # 旧的默认方式：build:extensions + build:applications
pnpm build:npm:dev
```

包含所有选项的通用入口是：

```sh
pnpm build:local-theia [-- options]
node scripts/build-with-local-theia.js [options]
```

## 脚本做了什么

1. 如果 `theia` 子模块缺失则初始化它
2. 当框架检出与 IDE 的依赖线不匹配时发出警告
3. 构建框架（在 `theia/` 内执行 `npm ci` + `npm run compile`）
4. 安装 IDE 依赖（`pnpm install`）
5. 将子模块中的所有 `@theia/*` 软件包符号链接到 IDE 的 `node_modules`
6. 复制被链接软件包需要但无法从检出中解析的传递依赖（参见[为什么要复制一些依赖](#为什么要复制一些依赖)）
7. 构建 Theia IDE 扩展和选定的应用（默认 `--apps stable`）
8. 下载所需的插件

这些符号链接明确指向已解析的 Theia 路径，因此构建始终使用该确切的检出。可
以通过 `--theia-path` 使用其他检出（包括 git worktree）。

## 用法

### 完整构建

```sh
pnpm build:local-theia                     # stable 应用，dev 模式
pnpm build:local-theia --prod              # stable 应用，prod 模式
pnpm build:local-theia --apps next         # electron-next，dev 模式
pnpm build:local-theia --apps all --prod   # 全部应用，prod 模式
```

### 使用不同的 Theia 位置

Theia 可以放在任何位置；通过 `--theia-path` 传入其路径。这同样适用于
git worktree，因为软件包是按你提供的精确路径进行符号链接的：

```sh
pnpm build:local-theia --theia-path /path/to/theia
```

### 增量开发

完成初始构建后，你可以更快地迭代：

```sh
# 仅重新构建 Theia IDE（框架未变更）
pnpm build:local-theia --skip-theia-build

# 仅重新构建 Theia 软件包，然后重新构建 IDE 应用
cd theia && npm run compile
cd .. && pnpm build:local-theia --skip-theia-build --skip-plugins
```

以上常用路径已封装为根 `package.json` 的快捷命令（详见 AGENTS.md「常用命令」）：

```sh
pnpm theia:compile <pkg>   # 增量编译子模块中的某个包（如 ai-editor），等价于 cd theia && npx tsc -b packages/<pkg>
pnpm build:quick <pkg>     # 编译该包后跳过 theia 重编重建应用（theia:compile + build:fast 一步完成）
pnpm build:fast            # theia 已编译时仅重建扩展与应用（跳过插件下载）
```

### 构建并打包

要创建可分发的应用：

```sh
pnpm build:local-theia --prod --package            # 打包 stable 应用
pnpm build:local-theia --apps next --package       # 打包 electron-next
```

打包后的应用位于 `applications/*/dist/`。

### 仅建立链接

如果你想手动管理构建：

```sh
pnpm build:local-theia --skip-theia-build --skip-ide-build
```

### 跳过插件下载

如果你已经有插件，或想跳过下载：

```sh
pnpm build:local-theia --skip-plugins
```

### 恢复正常依赖

使用子模块链接的框架完成测试后：

```sh
pnpm build:local-theia --unlink
```

这会移除 `@theia/*` 符号链接并从 npm 重新安装软件包。

### 干跑（Dry Run）

预览将要执行的命令：

```sh
pnpm build:local-theia --dry-run
```

## 运行 Theia IDE

构建完成后：

```sh
pnpm browser start                            # stable 浏览器应用
pnpm electron start                           # stable electron 应用
pnpm --dir applications/electron-next start   # next electron 应用
```

如果你用 `--package` 打包了应用，也可以直接从 `applications/*/dist/` 运行打
包后的版本。

## 开发工作流

典型的开发工作流如下：

1. **初始设置**：初始化子模块并运行完整构建

    ```sh
    git submodule update --init theia
    pnpm build:dev
    ```

2. **在 Theia 中修改代码**：编辑 `theia/` 中的文件

3. **重新构建框架**：

    ```sh
    cd theia && npm run compile
    ```

4. **重新构建并运行 Theia IDE**：

    ```sh
    cd ..
    pnpm build:local-theia --skip-theia-build --skip-plugins
    pnpm browser start
    ```

5. **提交框架变更**：在 `theia/` 内的分支上工作，将其推送到 fork，并在此处记
   录新的子模块固定提交：

    ```sh
    cd theia
    git checkout -b my-feature
    # ... 提交变更 ...
    git push origin my-feature
    cd ..
    git add theia
    ```

## 命令参考

| 选项                  | 说明                                                   |
|-----------------------|--------------------------------------------------------|
| `--theia-path <path>` | Theia 检出的路径（默认：`theia` 子模块）                |
| `--apps <target>`     | `stable`（browser + electron）、`next`（electron-next）或 `all`（默认：`stable`） |
| `--prod`              | 以生产模式构建应用（`build:prod`）                      |
| `--skip-theia-build`  | 跳过构建 Theia 软件包（若已构建则使用）                 |
| `--skip-ide-build`    | 跳过构建 Theia IDE（仅用于建立链接时）                  |
| `--skip-plugins`      | 跳过下载插件                                            |
| `--package`           | 构建后打包选定的应用                                    |
| `--unlink`            | 移除链接并恢复 npm 依赖                                 |
| `--dry-run`           | 只打印命令而不执行                                      |
| `--help`              | 显示帮助信息                                            |

## 为什么要复制一些依赖

使用 `npm` 安装 Theia 框架时，一些传递依赖最终会嵌套在某个软件包自己的
`node_modules` 中（例如 `packages/filesystem/node_modules/tar-stream`）。
这样的嵌套软件包可能依赖某个（如 `b4a`）在框架检出中任何可达位置都未安装的
依赖。由于构建打包器和打包工具是从符号链接的位置开始解析模块的，它们会报如
下错误：

```text
✘ [ERROR] Could not resolve "b4a"
    ../../../theia/packages/filesystem/node_modules/tar-stream/pack.js
```

为避免这种情况，脚本会扫描被链接的软件包，找出无法从检出中解析的依赖，并将
它们从 IDE 自己的 `node_modules` 复制到检出的 `node_modules` 中。这一机制对
依赖名称是通用的，并且在构建和打包两个阶段都会运行。

## 故障排查

### "Theia directory not found"

初始化子模块：

```sh
git submodule update --init theia   # 或者：pnpm theia:init
```

或者指定自定义的检出路径：

```sh
pnpm build:local-theia --theia-path /correct/path/to/theia
```

### "Package not found in local Theia"

Theia IDE 使用的某些 `@theia/*` 软件包在你的 Theia 检出中可能不存在。这可能发生在：

- 子模块检出的提交较旧，不包含较新的软件包
- 该软件包来自不同的源

脚本会对缺失的软件包发出警告，但会继续使用可用的软件包。
如果该提交在 fork 中确实缺失，请从上游同步
（参见[将 Fork 与上游同步](#将-fork-与上游同步)）。

### 版本不匹配警告

框架检出与 IDE 的 `@theia/*` 依赖不属于同一发布线。请对齐它们：

```sh
npm view @theia/core@<ide-version> gitHead
git -C theia checkout <that commit>
git add theia
```

或者更新 IDE 的依赖版本（`pnpm update:theia <version>`）以匹配更新的框架检出。

### 切换分支后出现构建错误

如果你在任一仓库中切换了分支或提交，请清理并重新构建：

```sh
# 在 theia-ide 中
git clean -xfd
pnpm build:dev

# 或者如果只有 Theia 软件包发生了变更
cd theia && git clean -xfd && npm ci && npm run compile
cd .. && pnpm build:local-theia --skip-theia-build --skip-plugins
```

### ffmpeg 原生模块构建失败（MSB8020：找不到 ClangCL）

`pnpm install` 触发 `theia/dev-packages/ffmpeg` 的 node-gyp 重建时，会生成 ClangCL
平台工具集工程（node-gyp v10 在 Windows 上的默认）；未安装对应 VS 组件的机器会报
MSB8020。**推荐修复**：用 Visual Studio Installer 安装单个组件
「适用于 Windows 的 C++ Clang 工具」（C++ Clang tools for Windows，
组件 ID `Microsoft.VisualStudio.Component.VC.Llvm.ClangToolset`；注意不是仅装
「C++ Clang 编译器」——那是 clang-cl 本体，MSBuild 工具集仍会缺失）。命令行等价：

```sh
"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe" modify ^
  --installPath "C:\Program Files\Microsoft Visual Studio\2022\Community" ^
  --add Microsoft.VisualStudio.Component.VC.Llvm.ClangToolset --passive --norestart
```

装好后删除 `theia/dev-packages/ffmpeg/build` 并重新 `pnpm install` 即可自动重建。
临时备选（无法装组件时）：把生成的 vcxproj 工具集改为 v143 手工构建——源码为纯 C，
不依赖 clang：

```sh
cd theia/dev-packages/ffmpeg
sed -i 's|<PlatformToolset>ClangCL</PlatformToolset>|<PlatformToolset>v143</PlatformToolset>|' build/ffmpeg.vcxproj
"C:/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" build/ffmpeg.vcxproj -p:Configuration=Release -p:Platform=x64
```

### 恢复干净状态

如果状态变得混乱：

```sh
# 解除链接并恢复 npm 软件包
pnpm build:local-theia --unlink

# 完整的干净重建
git clean -xfd
pnpm install && pnpm build:npm:dev && pnpm download:plugins
```
