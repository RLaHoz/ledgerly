import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/services/auth.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  const authServiceMock = {
    startGoogleAuth: jest.fn().mockResolvedValue({
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=google-state-1',
      state: 'google-state-1',
    }),
    resolveGoogleAuthAttemptBridgeTarget: jest
      .fn()
      .mockResolvedValue('http://localhost:8100/auth/google/callback'),
    completeGoogleAuth: jest.fn().mockResolvedValue({
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
    }),
    resolveConsentAttemptClient: jest.fn().mockResolvedValue('web'),
    refreshSession: jest.fn(),
    revokeSession: jest.fn(),
    startBankConsent: jest.fn(),
    verifyBankConsent: jest.fn(),
    completeOnboarding: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('starts and completes Google auth over HTTP', async () => {
    await request(app.getHttpServer())
      .post('/auth/google/start')
      .send({ client: 'web' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.state).toBe('google-state-1');
        expect(body.authorizeUrl).toContain('accounts.google.com');
      });

    await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ state: 'google-state-1', code: 'auth-code-1' })
      .expect(302)
      .expect('Location', /\/auth\/google\/callback\?state=google-state-1&code=auth-code-1/);

    await request(app.getHttpServer())
      .post('/auth/google/complete')
      .send({ state: 'google-state-1', code: 'auth-code-1' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.user.email).toBe('user@example.com');
        expect(body.hasConnectedBank).toBe(false);
      });
  });
});
