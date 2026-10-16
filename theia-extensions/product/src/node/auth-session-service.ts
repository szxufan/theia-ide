/********************************************************************************
 * Copyright (C) 2026 Theia IDE contributors.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as crypto from 'crypto';
import { injectable } from '@theia/core/shared/inversify';

/** 会话有效期：24 小时。 */
const DEFAULT_SESSION_DURATION_MS: number = 24 * 60 * 60 * 1000;

export interface AuthSession {
    /** 随机会话令牌，存放于 HttpOnly Cookie 中。 */
    token: string;
    /** 过期时间戳（毫秒）。 */
    expiresAt: number;
}

/**
 * 内存态单用户登录会话存储。
 * 服务重启后会话全部失效，用户需重新登录。
 */
@injectable()
export class AuthSessionService {

    protected readonly sessions: Map<string, number> = new Map<string, number>();

    /** 会话有效期，测试中可调整。 */
    protected sessionDurationMs: number = DEFAULT_SESSION_DURATION_MS;

    createSession(): AuthSession {
        const token: string = crypto.randomBytes(32).toString('base64url');
        const expiresAt: number = Date.now() + this.sessionDurationMs;
        this.sessions.set(token, expiresAt);
        return { token, expiresAt };
    }

    isSessionValid(token: string): boolean {
        const expiresAt = this.sessions.get(token);
        if (expiresAt === undefined) {
            return false;
        }
        if (expiresAt <= Date.now()) {
            this.sessions.delete(token);
            return false;
        }
        return true;
    }
}
