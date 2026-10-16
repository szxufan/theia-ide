/********************************************************************************
 * Copyright (C) 2026 Theia IDE contributors.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as cookie from 'cookie';
import * as crypto from 'crypto';
import * as express from 'express';
import * as http from 'http';
import { inject, injectable, named } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { environment } from '@theia/core/lib/common';
import { BackendApplicationContribution, EarlyExpressMiddleware } from '@theia/core/lib/node/backend-application';
import { WsRequestValidatorContribution } from '@theia/core/lib/node/ws-request-validators';
import { AuthSessionService } from './auth-session-service';
import { LOGIN_PAGE_HTML } from './login-page';

/** 会话 Cookie 名称。 */
export const AUTH_SESSION_COOKIE_NAME: string = 'theia-auth-session';

/** 登录接口路径。 */
export const LOGIN_API_PATH: string = '/api/auth/login';

/** 登录页路径。 */
export const LOGIN_PAGE_PATH: string = '/login.html';

/** 登录失败后的固定延迟（毫秒），用于缓解在线密码爆破。 */
const LOGIN_FAILURE_DELAY_MS: number = 1000;

export interface AuthConfig {
    username: string;
    /** 密码的 SHA-256 hex（小写）。 */
    passwordHash: string;
}

/**
 * 从环境变量解析认证配置：`THEIA_AUTH_USER` 与 `THEIA_AUTH_PASSWORD_HASH`（密码 SHA-256 hex）。
 * 任一未设置（或 hash 格式非法）时返回 `undefined`，表示登录功能不启用。
 */
export function parseAuthConfig(env: NodeJS.ProcessEnv): AuthConfig | undefined {
    const username: string | undefined = env['THEIA_AUTH_USER']?.trim();
    const passwordHash: string | undefined = env['THEIA_AUTH_PASSWORD_HASH']?.trim().toLowerCase();
    if (!username || !passwordHash || !/^[0-9a-f]{64}$/.test(passwordHash)) {
        return undefined;
    }
    return { username, passwordHash };
}

/**
 * 浏览器版单用户登录。
 *
 * - 未配置 `THEIA_AUTH_USER` / `THEIA_AUTH_PASSWORD_HASH` 或在 Electron 下运行时不启用，行为与无认证时完全一致。
 * - 启用后：未携带有效会话 Cookie 的页面请求重定向到独立中文登录页，API 请求返回 401，
 *   WebSocket 升级请求被直接拒绝。
 * - 与内置的 `theia-connection-token` Cookie 机制互不干扰（Cookie 名不同，且登录成功后的
 *   首页加载会让浏览器拿到连接 token）。
 */
@injectable()
export class AuthBackendContribution implements BackendApplicationContribution, WsRequestValidatorContribution {

    @inject(AuthSessionService)
    protected readonly sessionService: AuthSessionService;

    @inject(EarlyExpressMiddleware)
    protected readonly earlyMiddleware: EarlyExpressMiddleware;

    @inject(ILogger) @named('product:AuthBackendContribution')
    protected readonly logger: ILogger;

    protected config?: AuthConfig;

    /** 登录失败后的响应延迟（毫秒），缓解在线爆破；测试中可缩短。 */
    protected failureDelayMs: number = LOGIN_FAILURE_DELAY_MS;

    initialize(): void {
        if (environment.electron.is()) {
            return;
        }
        this.config = parseAuthConfig(process.env);
        if (!this.config) {
            this.logger.info('未配置 THEIA_AUTH_USER / THEIA_AUTH_PASSWORD_HASH，登录功能未启用。');
            return;
        }
        this.earlyMiddleware.handlers.push((req, res, next) => this.handleRequest(req, res, next));
        this.logger.info(`登录功能已启用（用户：${this.config.username}）。`);
    }

    configure(app: express.Application): void {
        if (!this.config) {
            return;
        }
        app.post(LOGIN_API_PATH, express.json(), (req, res) => this.handleLogin(req, res));
        app.get(LOGIN_PAGE_PATH, (_req, res) => {
            res.type('html').send(LOGIN_PAGE_HTML);
        });
    }

    /**
     * WebSocket 升级校验：登录启用时要求有效会话 Cookie。
     */
    allowWsUpgrade(request: http.IncomingMessage): boolean {
        if (!this.config) {
            return true;
        }
        const token: string | undefined = this.getSessionToken(request);
        return token !== undefined && this.sessionService.isSessionValid(token);
    }

    /**
     * 登录拦截中间件（早于静态文件服务，可拦截首页 index.html）。
     */
    protected handleRequest(req: express.Request, res: express.Response, next: express.NextFunction): void {
        const token: string | undefined = this.getSessionToken(req);
        if (token !== undefined && this.sessionService.isSessionValid(token)) {
            next();
            return;
        }
        // 放行登录页与登录接口自身，避免死循环。
        if (req.originalUrl === LOGIN_PAGE_PATH || req.originalUrl === LOGIN_API_PATH) {
            next();
            return;
        }
        if (this.wantsHtml(req)) {
            res.redirect(LOGIN_PAGE_PATH);
        } else {
            res.sendStatus(401);
        }
    }

    protected handleLogin(req: express.Request, res: express.Response): void {
        const config: AuthConfig | undefined = this.config;
        const body = req.body;
        const username: unknown = body?.['username'];
        const password: unknown = body?.['password'];
        if (!config || typeof username !== 'string' || typeof password !== 'string'
            || !this.matchesCredentials(config.username, config.passwordHash, username, password)) {
            // 固定延迟后再响应，缓解在线爆破。
            setTimeout(() => res.sendStatus(401), this.failureDelayMs);
            return;
        }
        const session = this.sessionService.createSession();
        res.cookie(AUTH_SESSION_COOKIE_NAME, session.token, {
            httpOnly: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.sendStatus(200);
    }

    /**
     * 恒定时间比较用户名与密码 hash，防止时序侧信道。
     */
    protected matchesCredentials(expectedUser: string, expectedHash: string, username: string, password: string): boolean {
        const userOk: boolean = this.timingSafeCompare(expectedUser, username);
        const hashOk: boolean = this.timingSafeCompare(expectedHash, this.sha256Hex(password));
        return userOk && hashOk;
    }

    protected timingSafeCompare(expected: string, actual: string): boolean {
        const expectedDigest: Buffer = crypto.createHash('sha256').update(expected).digest();
        const actualDigest: Buffer = crypto.createHash('sha256').update(actual).digest();
        return crypto.timingSafeEqual(expectedDigest, actualDigest);
    }

    protected sha256Hex(value: string): string {
        return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
    }

    protected wantsHtml(req: express.Request): boolean {
        const accept: string | undefined = req.headers.accept;
        return accept !== undefined && accept.includes('text/html');
    }

    protected getSessionToken(req: { headers: http.IncomingHttpHeaders }): string | undefined {
        const cookieHeader: string | undefined = req.headers.cookie;
        if (!cookieHeader) {
            return undefined;
        }
        return cookie.parse(cookieHeader)[AUTH_SESSION_COOKIE_NAME];
    }
}
