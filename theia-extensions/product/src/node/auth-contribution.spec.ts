/********************************************************************************
 * Copyright (C) 2026 Theia IDE contributors.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import 'reflect-metadata';
import { expect } from 'chai';
import * as crypto from 'crypto';
import * as http from 'http';
import { AuthBackendContribution, AUTH_SESSION_COOKIE_NAME, LOGIN_API_PATH, LOGIN_PAGE_PATH, parseAuthConfig }
    from './auth-contribution';
import { AuthSessionService } from './auth-session-service';

const TEST_USER: string = 'admin';
const TEST_PASSWORD: string = 's3cret-Passw0rd';
const TEST_HASH: string = crypto.createHash('sha256').update(TEST_PASSWORD, 'utf8').digest('hex');

describe('parseAuthConfig', () => {

    it('should parse a complete configuration', () => {
        const config = parseAuthConfig({
            THEIA_AUTH_USER: TEST_USER,
            THEIA_AUTH_PASSWORD_HASH: TEST_HASH
        });
        expect(config).to.deep.equal({ username: TEST_USER, passwordHash: TEST_HASH });
    });

    it('should accept uppercase hash and normalize to lowercase', () => {
        const config = parseAuthConfig({
            THEIA_AUTH_USER: TEST_USER,
            THEIA_AUTH_PASSWORD_HASH: TEST_HASH.toUpperCase()
        });
        expect(config?.passwordHash).to.equal(TEST_HASH);
    });

    it('should trim surrounding whitespace', () => {
        const config = parseAuthConfig({
            THEIA_AUTH_USER: `  ${TEST_USER}  `,
            THEIA_AUTH_PASSWORD_HASH: `  ${TEST_HASH}  `
        });
        expect(config).to.deep.equal({ username: TEST_USER, passwordHash: TEST_HASH });
    });

    it('should be disabled when username is missing', () => {
        expect(parseAuthConfig({ THEIA_AUTH_PASSWORD_HASH: TEST_HASH })).to.equal(undefined);
    });

    it('should be disabled when password hash is missing', () => {
        expect(parseAuthConfig({ THEIA_AUTH_USER: TEST_USER })).to.equal(undefined);
    });

    it('should be disabled when hash is malformed', () => {
        expect(parseAuthConfig({
            THEIA_AUTH_USER: TEST_USER,
            THEIA_AUTH_PASSWORD_HASH: 'not-a-hash'
        })).to.equal(undefined);
        expect(parseAuthConfig({
            THEIA_AUTH_USER: TEST_USER,
            THEIA_AUTH_PASSWORD_HASH: 'ZZZ'
        })).to.equal(undefined);
    });

    it('should be disabled when username is empty', () => {
        expect(parseAuthConfig({
            THEIA_AUTH_USER: '   ',
            THEIA_AUTH_PASSWORD_HASH: TEST_HASH
        })).to.equal(undefined);
    });
});

describe('AuthSessionService', () => {

    function createService(durationMs: number): AuthSessionService {
        const service = new AuthSessionService();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any)['sessionDurationMs'] = durationMs;
        return service;
    }

    it('should validate a freshly created session', () => {
        const service = new AuthSessionService();
        const session = service.createSession();
        expect(service.isSessionValid(session.token)).to.equal(true);
    });

    it('should reject unknown tokens', () => {
        const service = new AuthSessionService();
        expect(service.isSessionValid('forged-token')).to.equal(false);
    });

    it('should reject empty tokens', () => {
        const service = new AuthSessionService();
        expect(service.isSessionValid('')).to.equal(false);
    });

    it('should reject expired sessions', () => {
        const service = createService(-1);
        const session = service.createSession();
        expect(service.isSessionValid(session.token)).to.equal(false);
    });

    it('should generate distinct tokens', () => {
        const service = new AuthSessionService();
        expect(service.createSession().token).to.not.equal(service.createSession().token);
    });
});

describe('AuthBackendContribution', () => {

    function createContribution(sessionService: AuthSessionService = new AuthSessionService()):
        AuthBackendContribution {
        const contribution = new AuthBackendContribution();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (contribution as any)['sessionService'] = sessionService;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (contribution as any)['config'] = { username: TEST_USER, passwordHash: TEST_HASH };
        return contribution;
    }

    function createRequest(cookieValue?: string, accept?: string): http.IncomingMessage {
        const headers: http.IncomingHttpHeaders = {};
        if (cookieValue !== undefined) {
            headers.cookie = `${AUTH_SESSION_COOKIE_NAME}=${cookieValue}`;
        }
        if (accept !== undefined) {
            headers.accept = accept;
        }
        return { headers } as http.IncomingMessage;
    }

    function createResponse(): {
        res: {
            cookie: (name: string, value: string, options: Record<string, unknown>) => void;
            redirect: (target: string) => void;
            sendStatus: (status: number) => void;
            type: (value: string) => unknown;
            send: (body: string) => unknown;
        };
        cookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }>;
        redirects: string[];
        statuses: number[];
        bodies: string[];
    } {
        const cookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
        const redirects: string[] = [];
        const statuses: number[] = [];
        const bodies: string[] = [];
        const res = {
            cookie: (name: string, value: string, options: Record<string, unknown>) => {
                cookieCalls.push({ name, value, options });
            },
            redirect: (target: string) => { redirects.push(target); },
            sendStatus: (status: number) => { statuses.push(status); },
            type: () => undefined,
            send: (body: string) => { bodies.push(body); }
        };
        return { res, cookieCalls, redirects, statuses, bodies };
    }

    describe('allowWsUpgrade', () => {

        it('should allow WebSocket with valid session cookie', () => {
            const sessionService = new AuthSessionService();
            const contribution = createContribution(sessionService);
            const session = sessionService.createSession();
            expect(contribution.allowWsUpgrade(createRequest(session.token))).to.equal(true);
        });

        it('should reject WebSocket without cookie', () => {
            const contribution = createContribution();
            expect(contribution.allowWsUpgrade(createRequest())).to.equal(false);
        });

        it('should reject WebSocket with forged session', () => {
            const contribution = createContribution();
            expect(contribution.allowWsUpgrade(createRequest('forged-token'))).to.equal(false);
        });

        it('should allow WebSocket when auth is disabled', () => {
            const contribution = createContribution();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (contribution as any)['config'] = undefined;
            expect(contribution.allowWsUpgrade(createRequest())).to.equal(true);
        });
    });

    describe('handleRequest (login interception)', () => {

        function callHandleRequest(
            contribution: AuthBackendContribution,
            req: http.IncomingMessage
        ): ReturnType<typeof createResponse> {
            const result = createResponse();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (contribution as any).handleRequest(req, result.res, () => {
                result.statuses.push(0); // 0 表示 next() 被调用
            });
            return result;
        }

        it('should call next() with a valid session cookie', () => {
            const sessionService = new AuthSessionService();
            const contribution = createContribution(sessionService);
            const session = sessionService.createSession();
            const result = callHandleRequest(contribution, createRequest(session.token, 'text/html') as never);
            expect(result.statuses).to.deep.equal([0]);
        });

        it('should redirect page requests without session to the login page', () => {
            const contribution = createContribution();
            const req = createRequest(undefined, 'text/html') as never as { originalUrl?: string };
            req.originalUrl = '/';
            const result = callHandleRequest(contribution, req as never);
            expect(result.redirects).to.deep.equal([LOGIN_PAGE_PATH]);
        });

        it('should answer API requests without session with 401', () => {
            const contribution = createContribution();
            const req = createRequest(undefined, 'application/json') as never as { originalUrl?: string };
            req.originalUrl = '/api/some-endpoint';
            const result = callHandleRequest(contribution, req as never);
            expect(result.statuses).to.deep.equal([401]);
        });

        it('should let the login page through without a session', () => {
            const contribution = createContribution();
            const req = createRequest(undefined, 'text/html') as never as { originalUrl?: string };
            req.originalUrl = LOGIN_PAGE_PATH;
            const result = callHandleRequest(contribution, req as never);
            expect(result.statuses).to.deep.equal([0]);
            expect(result.redirects).to.have.length(0);
        });

        it('should let the login API through without a session', () => {
            const contribution = createContribution();
            const req = createRequest(undefined, 'application/json') as never as { originalUrl?: string };
            req.originalUrl = LOGIN_API_PATH;
            const result = callHandleRequest(contribution, req as never);
            expect(result.statuses).to.deep.equal([0]);
        });

        it('should reject forged session cookies with redirect for pages', () => {
            const contribution = createContribution();
            const req = createRequest('forged-token', 'text/html') as never as { originalUrl?: string };
            req.originalUrl = '/';
            const result = callHandleRequest(contribution, req as never);
            expect(result.redirects).to.deep.equal([LOGIN_PAGE_PATH]);
        });
    });

    describe('handleLogin (credentials check)', () => {

        function createFailureDelayedContribution(sessionService: AuthSessionService = new AuthSessionService()):
            AuthBackendContribution {
            const contribution = createContribution(sessionService);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (contribution as any)['failureDelayMs'] = 10;
            return contribution;
        }

        async function callHandleLogin(
            contribution: AuthBackendContribution,
            body: unknown
        ): Promise<ReturnType<typeof createResponse>> {
            const result = createResponse();
            const req = { body } as never;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (contribution as any).handleLogin(req, result.res);
            // 失败路径经 setTimeout 延迟响应，让出事件循环等待其完成。
            await new Promise<void>(resolve => setTimeout(resolve, 50));
            return result;
        }

        it('should set session cookie on correct credentials', async () => {
            const contribution = createContribution();
            const result = await callHandleLogin(contribution, { username: TEST_USER, password: TEST_PASSWORD });
            expect(result.statuses).to.deep.equal([200]);
            expect(result.cookieCalls).to.have.length(1);
            expect(result.cookieCalls[0].name).to.equal(AUTH_SESSION_COOKIE_NAME);
            expect(result.cookieCalls[0].options.httpOnly).to.equal(true);
            expect(result.cookieCalls[0].options.sameSite).to.equal('strict');
            expect(result.cookieCalls[0].options.path).to.equal('/');
        });

        it('should set a cookie usable as a valid session', async () => {
            const sessionService = new AuthSessionService();
            const contribution = createContribution(sessionService);
            const result = await callHandleLogin(contribution, { username: TEST_USER, password: TEST_PASSWORD });
            expect(sessionService.isSessionValid(result.cookieCalls[0].value)).to.equal(true);
        });

        it('should reject a wrong password with 401', async () => {
            const contribution = createFailureDelayedContribution();
            const result = await callHandleLogin(contribution, { username: TEST_USER, password: 'wrong-password' });
            expect(result.statuses).to.deep.equal([401]);
            expect(result.cookieCalls).to.have.length(0);
        });

        it('should reject a wrong username with 401', async () => {
            const contribution = createFailureDelayedContribution();
            const result = await callHandleLogin(contribution, { username: 'other-user', password: TEST_PASSWORD });
            expect(result.statuses).to.deep.equal([401]);
        });

        it('should reject non-string credentials with 401', async () => {
            const contribution = createFailureDelayedContribution();
            const result = await callHandleLogin(contribution, { username: 123, password: TEST_PASSWORD });
            expect(result.statuses).to.deep.equal([401]);
        });

        it('should reject a missing body with 401', async () => {
            const contribution = createFailureDelayedContribution();
            const result = await callHandleLogin(contribution, undefined);
            expect(result.statuses).to.deep.equal([401]);
        });
    });

    describe('initialize (configuration gating)', () => {

        function createContributionWithLogger(): AuthBackendContribution {
            const contribution = new AuthBackendContribution();
            const noopLogger: Record<string, unknown> = {};
            for (const level of ['debug', 'info', 'warn', 'error', 'fatal']) {
                noopLogger[level] = () => undefined;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (contribution as any)['logger'] = noopLogger;
            return contribution;
        }

        it('should stay disabled when environment variables are not set', () => {
            const originalUser = process.env['THEIA_AUTH_USER'];
            const originalHash = process.env['THEIA_AUTH_PASSWORD_HASH'];
            delete process.env['THEIA_AUTH_USER'];
            delete process.env['THEIA_AUTH_PASSWORD_HASH'];
            try {
                const contribution = createContributionWithLogger();
                contribution.initialize();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect((contribution as any)['config']).to.equal(undefined);
            } finally {
                if (originalUser !== undefined) {
                    process.env['THEIA_AUTH_USER'] = originalUser;
                }
                if (originalHash !== undefined) {
                    process.env['THEIA_AUTH_PASSWORD_HASH'] = originalHash;
                }
            }
        });
    });
});
