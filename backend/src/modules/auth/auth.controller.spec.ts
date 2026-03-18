import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

jest.mock('./services/auth.service', () => {
  class MockAuthService {}
  return { AuthService: MockAuthService };
});

import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

describe('AuthController', () => {
  let controller: AuthController;
  const authServiceMock = {
    startGoogleAuth: jest.fn(),
    resolveGoogleAuthAttemptBridgeTarget: jest.fn(),
    completeGoogleAuth: jest.fn(),
    startBankConsent: jest.fn(),
    resolveConsentAttemptClient: jest.fn(),
    verifyBankConsent: jest.fn(),
    completeOnboarding: jest.fn(),
    refreshSession: jest.fn(),
    revokeSession: jest.fn(),
  };
  const originalEnv = {
    BASIQ_CALLBACK_BRIDGE_WEB_URL: process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL,
    BASIQ_CALLBACK_BRIDGE_NATIVE_URL: process.env.BASIQ_CALLBACK_BRIDGE_NATIVE_URL,
    GOOGLE_CALLBACK_BRIDGE_WEB_URL: process.env.GOOGLE_CALLBACK_BRIDGE_WEB_URL,
    GOOGLE_CALLBACK_BRIDGE_NATIVE_URL: process.env.GOOGLE_CALLBACK_BRIDGE_NATIVE_URL,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL = originalEnv.BASIQ_CALLBACK_BRIDGE_WEB_URL;
    process.env.BASIQ_CALLBACK_BRIDGE_NATIVE_URL = originalEnv.BASIQ_CALLBACK_BRIDGE_NATIVE_URL;
    process.env.GOOGLE_CALLBACK_BRIDGE_WEB_URL = originalEnv.GOOGLE_CALLBACK_BRIDGE_WEB_URL;
    process.env.GOOGLE_CALLBACK_BRIDGE_NATIVE_URL = originalEnv.GOOGLE_CALLBACK_BRIDGE_NATIVE_URL;
    jest.clearAllMocks();
  });

  it('redirects Google callback bridge to persisted target when state is known', async () => {
    authServiceMock.resolveGoogleAuthAttemptBridgeTarget.mockResolvedValue(
      'http://localhost:8100/auth/google/callback',
    );
    const req = {
      headers: { origin: 'http://localhost:8100' },
    } as const;
    const res = { redirect: jest.fn() } as const;

    await controller.googleCallbackBridge(req as never, res as never, {
      state: 'google-state-1',
      code: 'auth-code-1',
    });

    expect(res.redirect).toHaveBeenCalledTimes(1);
    const [statusCode, target] = res.redirect.mock.calls[0] as [number, string];
    expect(statusCode).toBe(302);
    const parsed = new URL(target);
    expect(parsed.origin).toBe('http://localhost:8100');
    expect(parsed.pathname).toBe('/auth/google/callback');
    expect(parsed.searchParams.get('state')).toBe('google-state-1');
    expect(parsed.searchParams.get('code')).toBe('auth-code-1');
  });

  it('sets the refresh cookie and strips the refresh token from refresh responses', async () => {
    authServiceMock.refreshSession.mockResolvedValue({
      user: {
        id: 'user-1',
        roles: [],
        email: 'user@example.com',
        fullName: 'User Example',
        avatarUrl: null,
      },
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      accessTokenExpiresInSeconds: 900,
      onboardingCompleted: false,
      bankConnectionState: 'never_connected',
      hasConnectedBank: false,
    });
    const req = {
      headers: {
        cookie: 'ledgerly_refresh_token=refresh-cookie-1',
        'user-agent': 'Mozilla/5.0',
      },
      ip: '127.0.0.1',
    } as const;
    const res = { cookie: jest.fn() } as const;

    const response = await controller.refreshSession(
      {} as never,
      req as never,
      res as never,
    );

    expect(authServiceMock.refreshSession).toHaveBeenCalledWith({
      refreshToken: 'refresh-cookie-1',
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
    });
    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(response).not.toHaveProperty('refreshToken');
  });

  it('clears the refresh cookie on logout even when no refresh token is sent in the body', async () => {
    const req = {
      headers: {
        cookie: 'ledgerly_refresh_token=refresh-cookie-1',
      },
    } as const;
    const res = { clearCookie: jest.fn() } as const;

    const response = await controller.logout(
      {} as never,
      req as never,
      res as never,
    );

    expect(authServiceMock.revokeSession).toHaveBeenCalledWith('refresh-cookie-1');
    expect(res.clearCookie).toHaveBeenCalledTimes(1);
    expect(response).toEqual({ success: true });
  });

  it('redirects desktop bank callback user-agents to configured web callback target', async () => {
    process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL = 'http://localhost:8100/auth/callback';
    authServiceMock.resolveConsentAttemptClient.mockResolvedValue(null);
    const req = {
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' },
    } as const;
    const res = { redirect: jest.fn() } as const;

    await controller.callbackBridge(req as never, res as never, {
      state: 'state-1',
      jobId: 'job-1',
      jobIds: ['job-2', 'job-3'],
    });

    const [statusCode, target] = res.redirect.mock.calls[0] as [number, string];
    expect(statusCode).toBe(302);
    const parsed = new URL(target);
    expect(parsed.origin).toBe('http://localhost:8100');
    expect(parsed.pathname).toBe('/auth/callback');
    expect(parsed.searchParams.get('state')).toBe('state-1');
  });

  it('marks Google auth endpoints as public', () => {
    const reflector = new Reflector();

    expect(
      reflector.get<boolean>(IS_PUBLIC_KEY, AuthController.prototype.startGoogleAuth),
    ).toBe(true);
    expect(
      reflector.get<boolean>(IS_PUBLIC_KEY, AuthController.prototype.googleCallbackBridge),
    ).toBe(true);
    expect(
      reflector.get<boolean>(IS_PUBLIC_KEY, AuthController.prototype.completeGoogleAuth),
    ).toBe(true);
  });

  it('keeps bank-consent verify protected', () => {
    const reflector = new Reflector();
    const isPublic = reflector.get<boolean>(
      IS_PUBLIC_KEY,
      AuthController.prototype.verifyBankConsent,
    );

    expect(isPublic).toBeUndefined();
  });
});
