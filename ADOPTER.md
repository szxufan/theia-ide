# 采用者指南

本仓库作为一个模板，用于在 [Eclipse Theia 平台](https://theia-ide.org)上构建桌面产品。本指南记录了构建你自己的基于 Theia 的应用时的打包注意事项。

## Electron 打包与 Asar

Electron 应用可以使用 [asar 归档](https://github.com/electron/asar)将应用源文件打包成单个只读归档。这可以提升启动性能，并避免 Windows 上的路径长度问题。

在本仓库中，asar 打包通过 `applications/electron/electron-builder.yml` 中的 `asar: true` 启用。当应用使用 `electron-builder` 打包时，应用目录的内容会被捆绑到打包后应用的 `resources/` 文件夹内的一个 `app.asar` 文件中。

使用 `__dirname` 访问文件的代码，或从文件系统执行脚本的代码，将会失败，因为 asar 归档并不是真实目录。在运行时，`__dirname` 会解析到 `app.asar` 内的路径，但 Node 的 `fs` 模块和操作系统无法将归档内的文件作为常规文件系统条目来访问。

通常受影响的有两类文件：

1. **原生二进制文件**、`.node` 文件或预构建的二进制文件
2. 必须在真实文件系统上可访问的**脚本与资源**

### 缓解策略

#### 1. asarUnpack（electron-builder.yml）

匹配 `asarUnpack` glob 模式的文件会在打包时自动解压到 asar 归档旁边。在运行时，这些文件位于 `app.asar.unpacked/` 下而不是 `app.asar/` 中。

例如：

```yaml
asarUnpack:
  - "**/lib/backend/native/**"
  - "**/lib/backend/shell-integrations/**"
  - "**/lib/build/Release/**"
  - "**/lib/prebuilds/**"
```

`asarUnpack` 只是将文件解压到真实文件系统。使用 `__dirname` 解析路径的代码仍然会得到一个包含 `app.asar` 的路径，因此它还必须处理 `.asar.unpacked` 路径段才能找到这些文件。

#### 2. patch-package

当 `node_modules` 中的上游代码需要修改时（例如调整路径），[patch-package](https://github.com/ds300/patch-package) 可以在 `pnpm install` 之后应用源码级补丁。

* 补丁存放在 `patches` 目录中（默认在仓库根目录）
* 补丁通过 `package.json` 中的 `postinstall` 脚本自动应用

Theia 本身就使用此机制来分发其自行维护的补丁，参见下文 [Theia 维护的依赖补丁](#theia-维护的依赖补丁)。如果你在此之外还需要自己的补丁，可以将第二个 `patch-package` 调用串联起来，使用单独的补丁目录：

```json
"postinstall": "theia-patch && patch-package --patch-dir patches"
```

#### 3. 打包器后处理

另一种选择是在打包器（bundler）中调整打包后的代码。

举个例子，`applications/electron/esbuild.mjs` 中曾经使用的 `asarRipgrepPlugin` 覆盖了上游 esbuild 原生插件的 ripgrep 替换逻辑，在打包时将 ripgrep 的路径解析从 `.asar` 重写为 `.asar.unpacked`：

```js
const asarRipgrepPlugin = {
    name: 'asar-ripgrep',
    setup(build) {
        build.onLoad({ filter: /@vscode[/\\]ripgrep[/\\]lib[/\\]index\.js$/ }, async () => ({
            contents: `
                const path = require("path");
                let rgPath = path.join(__dirname, \`./native/rg\${process.platform === "win32" ? ".exe" : ""}\`);
                if (rgPath.includes(".asar" + path.sep)) {
                    rgPath = rgPath.replace(".asar" + path.sep, ".asar.unpacked" + path.sep);
                }
                export { rgPath };
            `,
            loader: 'js'
        }));
    }
};
```

## Theia 维护的依赖补丁

一些 Theia 功能依赖于对第三方依赖的小幅补丁，而这些补丁在上游（尚未）被修复。它们由 Theia 团队维护，并随 `@theia/cli` 一起分发，因此采用者不需要自己的补丁文件。这些补丁通过 `theia-patch` 命令应用，由 `postinstall` 脚本运行：

```json
"postinstall": "theia-patch"
```

请保留这个钩子，以便你的应用始终应用当前 Theia 版本所需的补丁。目前这包括一个针对次级（分离）窗口菜单的 `@lumino/widgets` 修复。
