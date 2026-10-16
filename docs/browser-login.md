# 浏览器版单用户登录功能

浏览器版 IDE 支持可选的单用户登录保护。启用后，未登录的页面访问会重定向到中文登录页，未登录的 API 请求返回 401，WebSocket 连接被拒绝。功能完全由环境变量控制，未配置时行为与无认证版本完全一致。桌面（Electron）版不受影响。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `THEIA_AUTH_USER` | 登录用户名 |
| `THEIA_AUTH_PASSWORD_HASH` | 密码的 SHA-256 哈希（64 位十六进制字符串，大小写均可） |

**两个变量都设置时登录功能才会启用**，任一缺失则功能关闭。

## 生成密码 hash

密码以 SHA-256 哈希形式配置，**不要在环境变量中存放明文密码**。

Linux / macOS / Git Bash：

```bash
printf '你的密码' | sha256sum
```

Windows PowerShell：

```powershell
[BitConverter]::ToString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes('你的密码'))).Replace('-','').ToLower()
```

Node.js（跨平台）：

```bash
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1],'utf8').digest('hex'))" '你的密码'
```

> 注意：`printf`/`GetBytes` 不会带入换行符；若用 `echo` 请确认没有多余的换行，否则 hash 不匹配。

## 启动示例

本地启动：

```bash
export THEIA_AUTH_USER=admin
export THEIA_AUTH_PASSWORD_HASH=<64位hash>
pnpm browser start
```

Docker（`browser.Dockerfile` 镜像）：

```bash
docker run -d -p 3000:3000 \
  -e THEIA_AUTH_USER=admin \
  -e THEIA_AUTH_PASSWORD_HASH=<64位hash> \
  -v theia-data:/home/theia/data \
  -v theia-workspace:/home/project \
  theia-ide-browser
```

- `/home/project`：默认工作区（用户代码数据）
- `/home/theia/data`：用户主目录（`.theia` 配置/扩展、`.m2`/`.gradle` 缓存等），应用安装目录与用户数据已分离，挂这一个卷即可持久化全部用户数据
- 镜像内置 HEALTHCHECK：探测 `GET /` 并跟随重定向，**显式携带 `Accept: text/html` 头**。登录启用后未认证探测返回 302 → 200，状态正常。

  ⚠️ 不要用裸 `curl http://localhost:3000/` 做探测：curl 默认 `Accept: */*` 不含 `text/html`，登录启用后会被中间件按「非浏览器客户端」拒绝并返回 **401**（这是设计行为，避免脚本把登录页误当请求成功）。带 `-H "Accept: text/html"` 才会像浏览器一样收到 302。

## 行为说明

- **登录页**：未登录访问任意页面会重定向到 `/login.html`（中文界面）。登录成功后跳回首页。
- **API / 非 HTML 请求**：`Accept` 头不含 `text/html` 的请求（curl 默认、API 脚本）未登录时返回 401，前端会提示重新加载，浏览器刷新后进入登录页。
- **浏览器页面请求**：`Accept` 含 `text/html` 的请求未登录时返回 302 到 `/login.html`。
- **WebSocket**：未登录时升级请求直接被拒绝。
- **会话**：登录成功后种下 `theia-auth-session` Cookie（`HttpOnly; SameSite=Strict; path=/`，有效期 24 小时）。会话保存在后端内存中，**后端重启后所有会话失效，需要重新登录**。
- **防爆破**：登录失败固定延迟约 1 秒后响应；用户名与密码均使用恒定时间比较（timing-safe）。
- **统一错误提示**：用户名错误与密码错误返回相同的 401 与提示文案，不泄露具体哪一项错误。

## 与其他安全机制的关系

本功能与 Theia 内置的 `theia-connection-token` Cookie 机制互不干扰（Cookie 名不同，登录成功后的首页加载会自动拿到连接 token）。

**安全边界提醒**：

- 本功能仅提供单用户访问控制，**不提供传输加密**。密码虽以 hash 配置，但登录请求本身仍通过 HTTP 明文传输。公网或不可信网络部署时，请务必在外层配置 HTTPS 反向代理。
- 生产环境建议同时限制 `THEIA_HOSTS`（WebSocket Origin 白名单，见 `ws-origin-validator.ts`）。
- 如需多用户、SSO、审计日志等能力，应在反向代理层（如 OAuth2 Proxy、Keycloak）实现。

## 相关代码

- 后端模块：`theia-extensions/product/src/node/`
  - `auth-contribution.ts`：登录拦截中间件、登录接口、WebSocket 校验
  - `auth-session-service.ts`：内存会话存储
  - `login-page.ts`：内置登录页
  - `auth-contribution.spec.ts`：单元测试（`pnpm --filter theia-ide-product-ext test`）
- 配置来源：`applications/browser/package.json` 通过 `theiaExtensions.backend` 加载上述模块
