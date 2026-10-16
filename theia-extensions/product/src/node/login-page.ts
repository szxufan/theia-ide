/********************************************************************************
 * Copyright (C) 2026 Theia IDE contributors.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

/**
 * 独立中文登录页。单文件、无外部资源依赖，避免引入额外的静态目录与构建配置。
 * 提交后 POST /api/auth/login，成功后跳转回首页。
 */
export const LOGIN_PAGE_HTML: string = `<!DOCTYPE html>
<html lang="zh-cn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>登录</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #1e1e1e;
    display: flex;
    align-items: center;
    justify-content: center;
}
.card {
    width: 320px;
    padding: 32px;
    background: #252526;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
h1 {
    font-size: 20px;
    font-weight: 500;
    color: #cccccc;
    text-align: center;
    margin-bottom: 24px;
}
label {
    display: block;
    font-size: 13px;
    color: #cccccc;
    margin-bottom: 6px;
}
input {
    width: 100%;
    padding: 8px 10px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #cccccc;
    background: #3c3c3c;
    border: 1px solid #3c3c3c;
    border-radius: 4px;
    outline: none;
}
input:focus { border-color: #0e70c0; }
button {
    width: 100%;
    padding: 9px;
    font-size: 14px;
    color: #ffffff;
    background: #0e70c0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
button:hover { background: #1177bb; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.error {
    display: none;
    font-size: 13px;
    color: #f48771;
    text-align: center;
    margin-bottom: 16px;
}
</style>
</head>
<body>
<div class="card">
    <h1>登录到 IDE</h1>
    <div id="error" class="error">用户名或密码错误</div>
    <form id="login-form">
        <label for="username">用户名</label>
        <input id="username" name="username" type="text" autocomplete="username" autofocus required>
        <label for="password">密码</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        <button id="submit" type="submit">登 录</button>
    </form>
</div>
<script>
var form = document.getElementById('login-form');
var errorBox = document.getElementById('error');
var button = document.getElementById('submit');
form.addEventListener('submit', function (event) {
    event.preventDefault();
    errorBox.style.display = 'none';
    button.disabled = true;
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        })
    }).then(function (response) {
        if (response.ok) {
            window.location.href = '/';
        } else {
            errorBox.style.display = 'block';
            button.disabled = false;
        }
    }).catch(function () {
        errorBox.textContent = '网络错误，请重试';
        errorBox.style.display = 'block';
        button.disabled = false;
    });
});
</script>
</body>
</html>`;
