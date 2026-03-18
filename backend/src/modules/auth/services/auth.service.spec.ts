jest.mock('./session.service', () => ({
  SessionService: class SessionService {},
}));
jest.mock(
  'src/sourceDB/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);
jest.mock(
  'src/modules/cdr-auth/bank-auth.types',
  () => ({
    BANK_AUTH_CLIENT: 'BANK_AUTH_CLIENT',
  }),
  { virtual: true },
);
jest.mock(
  'src/modules/categories/services/category-management.service',
  () => ({
    CategoryManagementService: class CategoryManagementService {},
  }),
  { virtual: true },
);
jest.mock(
  'src/modules/rules/services/rule-provisioning.service',
  () => ({
    RuleProvisioningService: class RuleProvisioningService {},
  }),
  { virtual: true },
);
jest.mock(
  './google-oidc.service',
  () => ({
    GoogleOidcService: class GoogleOidcService {},
  }),
  { virtual: true },
);

import { AuthService } from './auth.service';

describe('AuthService.bootstrapUserDefaults', () => {
  const makeService = () => {
    const categoryManagementService = {
      bootstrapUserCategoriesFromApp: jest.fn<
        Promise<{ createdCategories: number; createdSubcategories: number }>,
        [string]
      >(),
    };
    const ruleProvisioningService = {
      installDefaultTemplatesForUser: jest.fn<
        Promise<{
          templatesFound: number;
          createdRules: number;
          skippedRules: number;
        }>,
        [string]
      >(),
    };

    const service = new AuthService(
      {} as never,
      {} as never,
      ruleProvisioningService as never,
      categoryManagementService as never,
      {} as never,
      {} as never,
    );

    return {
      service,
      categoryManagementService,
      ruleProvisioningService,
    };
  };

  it('provisions categories and rules and logs when data is created', async () => {
    const { service, categoryManagementService, ruleProvisioningService } = makeService();

    categoryManagementService.bootstrapUserCategoriesFromApp.mockResolvedValue({
      createdCategories: 10,
      createdSubcategories: 30,
    });
    ruleProvisioningService.installDefaultTemplatesForUser.mockResolvedValue({
      templatesFound: 20,
      createdRules: 20,
      skippedRules: 0,
    });

    const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

    await (service as any).bootstrapUserDefaults('user-1');

    expect(categoryManagementService.bootstrapUserCategoriesFromApp).toHaveBeenCalledWith('user-1');
    expect(ruleProvisioningService.installDefaultTemplatesForUser).toHaveBeenCalledWith('user-1');
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('swallows provisioning errors and logs them', async () => {
    const { service, categoryManagementService, ruleProvisioningService } = makeService();

    categoryManagementService.bootstrapUserCategoriesFromApp.mockRejectedValue(
      new Error('bootstrap failed'),
    );

    const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

    await expect((service as any).bootstrapUserDefaults('user-3')).resolves.toBeUndefined();

    expect(ruleProvisioningService.installDefaultTemplatesForUser).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('AuthService.completeOnboarding', () => {
  const makeService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn<Promise<{ onboardingCompletedAt: Date | null } | null>, [unknown]>(),
        update: jest.fn<Promise<{ onboardingCompletedAt: Date | null }>, [unknown]>(),
      },
    };

    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return { service, prisma };
  };

  it('sets onboardingCompletedAt for first completion', async () => {
    const { service, prisma } = makeService();

    prisma.user.findUnique.mockResolvedValue({ onboardingCompletedAt: null });
    prisma.user.update.mockResolvedValue({ onboardingCompletedAt: new Date() });

    const result = await service.completeOnboarding('user-1');

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('throws when user does not exist', async () => {
    const { service, prisma } = makeService();

    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.completeOnboarding('missing-user')).rejects.toThrow('Invalid user');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.startGoogleAuth', () => {
  const originalEnv = {
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    GOOGLE_CALLBACK_BRIDGE_WEB_URL: process.env.GOOGLE_CALLBACK_BRIDGE_WEB_URL,
  };

  afterEach(() => {
    process.env.GOOGLE_OAUTH_REDIRECT_URI = originalEnv.GOOGLE_OAUTH_REDIRECT_URI;
    process.env.GOOGLE_CALLBACK_BRIDGE_WEB_URL = originalEnv.GOOGLE_CALLBACK_BRIDGE_WEB_URL;
  });

  it('persists a Google auth attempt and returns the authorize URL', async () => {
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://api.example.com/api/auth/google/callback';
    const prisma = {
      authAttempt: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    const googleOidc = {
      createAuthorizationContext: jest.fn().mockReturnValue({
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=state-1',
        codeVerifier: 'code-verifier-1',
      }),
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      googleOidc as never,
      {} as never,
    );

    const result = await service.startGoogleAuth({
      client: 'web',
      origin: 'http://localhost:8100',
    });

    expect(googleOidc.createAuthorizationContext).toHaveBeenCalledTimes(1);
    expect(prisma.authAttempt.create).toHaveBeenCalledTimes(1);
    expect(result.authorizeUrl).toContain('accounts.google.com');
    expect(typeof result.state).toBe('string');
  });
});

describe('AuthService.startBankConsent', () => {
  it('creates the provider user with the authenticated user identity', async () => {
    const prisma = {
      bankProvider: {
        upsert: jest.fn().mockResolvedValue({ id: 'provider-1' }),
      },
      bankProviderUser: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'bank-provider-user-1',
          providerUserId: 'provider-user-1',
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          email: 'user@example.com',
          fullName: 'User Example',
        }),
      },
      bankConsentAttempt: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    const bankAuth = {
      createAuthorizeUrl: jest.fn().mockResolvedValue({
        authorizeUrl: 'https://consent.example.com',
        state: 'state-1',
        nonce: 'nonce-1',
        codeVerifier: 'verifier-1',
      }),
      createProviderUser: jest.fn().mockResolvedValue({
        providerUserId: 'provider-user-1',
      }),
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      bankAuth as never,
    );

    await service.startBankConsent({
      userId: 'user-1',
      client: 'web',
    });

    expect(bankAuth.createProviderUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      fullName: 'User Example',
    });
    expect(prisma.bankProviderUser.create).toHaveBeenCalledTimes(1);
    expect(prisma.bankConsentAttempt.create).toHaveBeenCalledTimes(1);
  });

  it('fails explicitly when the authenticated user profile is incomplete', async () => {
    const prisma = {
      bankProvider: {
        upsert: jest.fn().mockResolvedValue({ id: 'provider-1' }),
      },
      bankProviderUser: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          email: 'user@example.com',
          fullName: '   ',
        }),
      },
    };
    const bankAuth = {
      createAuthorizeUrl: jest.fn(),
      createProviderUser: jest.fn(),
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      bankAuth as never,
    );

    await expect(
      service.startBankConsent({
        userId: 'user-1',
        client: 'web',
      }),
    ).rejects.toThrow(
      'Authenticated user must have an email and full name before starting bank consent.',
    );
    expect(bankAuth.createProviderUser).not.toHaveBeenCalled();
  });
});
