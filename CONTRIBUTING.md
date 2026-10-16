# 为 Eclipse Theia 做贡献

Theia 是一个架构模块化的年轻开源项目。其目标之一是确保我们可以通过扩展来定制和增强任何
Theia 应用。因此，虽然 Theia 主仓库包含了一些 IDE 类应用的通用功能，例如文件系统或导航器
视图，但大多数功能并不一定需要放入核心仓库，而是可以单独开发。

## 我可以如何贡献？

下面介绍了一些典型的贡献方式。

### 提问

通过在 Theia GitHub 仓库中提交 issue 来提问完全没有问题。一旦问题得到解答，我们会关闭它
并打上 'question' 标签。在此之前，请先检查该问题是否已经在那里或 [Stack
Overflow](https://stackoverflow.com) 上被问过。

### 报告缺陷

如果你发现了一个缺陷，应首先检查它是否已经被提交，甚至可能已被修复。如果你找到一个尚未解
决的既有 issue，请补充你的情况。如果没有找到既有的缺陷报告，请提交一份新的。无论如何，请
提供你能分享的所有信息，以便帮助复现和解决问题。

### 报告功能请求

你可能希望看到某个功能或有了某个想法。你可以提交一个请求，我们可以一起讨论。如果这样的功
能请求已经存在，请添加评论或其他形式的反馈，表明你也对此感兴趣。同样在这种情况下，任何具
体的用例场景都有助于理解其背后的动机，我们将不胜感激。

### Pull Request

在开始投入大量时间做某个你希望被合并并作为 Theia 一部分长期维护的内容之前，你应该先通过
issue 与团队沟通。只需选择你想要处理的 issue，并告诉大家你愿意去做以及你打算如何实现。团
队会很乐意为你提供指导和反馈。

我们遵循[这里](https://github.com/eclipse-theia/theia/blob/master/doc/pull-requests.md)
描述的贡献与 pull request 审查指南。

## 编码规范

我们遵循[这里](https://github.com/eclipse-theia/theia/wiki/Coding-Guidelines)描述的编码规范。

## Eclipse 贡献者协议

在你的贡献能被项目团队接受之前，贡献者必须以电子方式签署 Eclipse 贡献者协议（ECA）。

* https://www.eclipse.org/legal/ECA.php

非提交者（non-committer）提供的提交必须在页脚包含 Signed-off-by 字段，以表明作者知晓其向
本项目提供贡献所依据的条款。非提交者还必须拥有 Eclipse Foundation 账户，并已签署存档
Eclipse 贡献者协议（ECA）。

更多信息请参阅 Eclipse Committer Handbook：
https://www.eclipse.org/projects/handbook/#resources-commit

## 为你的工作签名

签署（sign-off）是补丁说明末尾的简单一行。你的签名证明你编写了该补丁，或以其他方式有权将
其作为开源补丁传递下去。规则非常简单：如果你能证实以下内容（来自
[developercertificate.org](https://developercertificate.org/)）：

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.
1 Letterman Drive
Suite D4700
San Francisco, CA, 94129

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.

Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

然后在每条 git 提交信息中添加一行：

    Signed-off-by: Joe Smith <joe.smith@email.com>

请使用你的真实姓名（抱歉，不允许使用化名或匿名贡献。）

如果你设置了 `user.name` 和 `user.email` git 配置，就可以使用 `git commit -s` 自动为提交签名。
