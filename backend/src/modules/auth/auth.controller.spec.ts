import { Test, TestingModule } from '@nestjs/testing';

jest.mock('./services/auth.service', () => {
  class MockAuthService {}
  return { AuthService: MockAuthService };
});

import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authServiceMock = {
    createBankAuthorizeUrl: jest.fn(),
    resolveConsentAttemptClient: jest.fn(),
    verifyBankConsent: jest.fn(),
    completeOnboarding: jest.fn(),
    createAnonymousSession: jest.fn(),
    refreshSession: jest.fn(),
    revokeSession: jest.fn(),
  };
  const originalEnv = {
    BASIQ_CALLBACK_BRIDGE_WEB_URL: process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL,
    BASIQ_CALLBACK_BRIDGE_NATIVE_URL:
      process.env.BASIQ_CALLBACK_BRIDGE_NATIVE_URL,
    BASIQ_CONSENT_REDIRECT_URI_WEB: process.env.BASIQ_CONSENT_REDIRECT_URI_WEB,
    BASIQ_CONSENT_REDIRECT_URI_NATIVE:
      process.env.BASIQ_CONSENT_REDIRECT_URI_NATIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL =
      originalEnv.BASIQ_CALLBACK_BRIDGE_WEB_URL;
    process.env.BASIQ_CALLBACK_BRIDGE_NATIVE_URL =
      originalEnv.BASIQ_CALLBACK_BRIDGE_NATIVE_URL;
    process.env.BASIQ_CONSENT_REDIRECT_URI_WEB =
      originalEnv.BASIQ_CONSENT_REDIRECT_URI_WEB;
    process.env.BASIQ_CONSENT_REDIRECT_URI_NATIVE =
      originalEnv.BASIQ_CONSENT_REDIRECT_URI_NATIVE;
    authServiceMock.resolveConsentAttemptClient.mockReset();
    jest.clearAllMocks();
  });

  it('redirects desktop user-agents to configured web callback target', async () => {
    process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL =
      'http://localhost:8100/auth/callback';
    authServiceMock.resolveConsentAttemptClient.mockResolvedValue(null);
    const req = {
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' },
    } as const;
    const res = { redirect: jest.fn() } as const;

    await controller.callbackBridge(req as never, res as never, {
      state: 'state-1',
      jobId: 'job-1',
      jobIds: ['job-2', 'job-3'],
      invalid: { nested: true },
    });

    expect(res.redirect).toHaveBeenCalledTimes(1);
    const [statusCode, target] = res.redirect.mock.calls[0] as [number, string];
    expect(statusCode).toBe(302);

    const parsed = new URL(target);
    expect(parsed.origin).toBe('http://localhost:8100');
    expect(parsed.pathname).toBe('/auth/callback');
    expect(parsed.searchParams.get('state')).toBe('state-1');
    expect(parsed.searchParams.get('jobId')).toBe('job-1');
    expect(parsed.searchParams.getAll('jobIds')).toEqual(['job-2', 'job-3']);
    expect(parsed.searchParams.has('invalid')).toBe(false);
  });

  it('redirects mobile user-agents to native callback target', async () => {
    process.env.BASIQ_CALLBACK_BRIDGE_NATIVE_URL = 'ledgerly://auth/callback';
    authServiceMock.resolveConsentAttemptClient.mockResolvedValue(null);
    const req = {
      headers: {
        'user-agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    } as const;
    const res = { redirect: jest.fn() } as const;

    await controller.callbackBridge(req as never, res as never, {
      state: 'state-mobile',
      jobIds: 'job-mobile',
    });

    expect(res.redirect).toHaveBeenCalledTimes(1);
    const [statusCode, target] = res.redirect.mock.calls[0] as [number, string];
    expect(statusCode).toBe(302);

    const parsed = new URL(target);
    expect(parsed.protocol).toBe('ledgerly:');
    expect(parsed.hostname).toBe('auth');
    expect(parsed.pathname).toBe('/callback');
    expect(parsed.searchParams.get('state')).toBe('state-mobile');
    expect(parsed.searchParams.getAll('jobIds')).toEqual(['job-mobile']);
  });

  it('prefers explicit web client query over mobile user-agent', async () => {
    process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL =
      'http://localhost:8100/auth/callback';
    const req = {
      headers: {
        'user-agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    } as const;
    const res = { redirect: jest.fn() } as const;

    await controller.callbackBridge(req as never, res as never, {
      client: 'web',
      state: 'state-web',
      jobIds: 'job-web',
    });

    const [statusCode, target] = res.redirect.mock.calls[0] as [number, string];
    expect(statusCode).toBe(302);

    const parsed = new URL(target);
    expect(parsed.origin).toBe('http://localhost:8100');
    expect(parsed.pathname).toBe('/auth/callback');
    expect(parsed.searchParams.get('state')).toBe('state-web');
    expect(parsed.searchParams.getAll('jobIds')).toEqual(['job-web']);
    expect(parsed.searchParams.has('client')).toBe(false);
  });

  it('prefers persisted web client over mobile user-agent when callback query omits client', async () => {
    process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL =
      'http://localhost:8100/auth/callback';
    authServiceMock.resolveConsentAttemptClient.mockResolvedValue('web');
    const req = {
      headers: {
        'user-agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    } as const;
    const res = { redirect: jest.fn() } as const;

    await controller.callbackBridge(req as never, res as never, {
      state: 'state-persisted-web',
      jobIds: 'job-persisted-web',
    });

    const [statusCode, target] = res.redirect.mock.calls[0] as [number, string];
    expect(statusCode).toBe(302);

    const parsed = new URL(target);
    expect(parsed.origin).toBe('http://localhost:8100');
    expect(parsed.pathname).toBe('/auth/callback');
    expect(parsed.searchParams.get('state')).toBe('state-persisted-web');
  });

  it('falls back to safe default web callback when env target is invalid', async () => {
    process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL = ':not-a-url';
    authServiceMock.resolveConsentAttemptClient.mockResolvedValue(null);
    const req = {
      headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)' },
    } as const;
    const res = { redirect: jest.fn() } as const;

    await controller.callbackBridge(req as never, res as never, {
      state: 'state-fallback',
    });

    const [, target] = res.redirect.mock.calls[0] as [number, string];
    const parsed = new URL(target);
    expect(parsed.origin).toBe('http://localhost:8100');
    expect(parsed.pathname).toBe('/auth/callback');
    expect(parsed.searchParams.get('state')).toBe('state-fallback');
  });
});
