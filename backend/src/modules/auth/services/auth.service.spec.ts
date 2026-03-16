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
    );

    return {
      service,
      categoryManagementService,
      ruleProvisioningService,
    };
  };

  it('provisions categories and rules and logs when data is created', async () => {
    const { service, categoryManagementService, ruleProvisioningService } =
      makeService();

    categoryManagementService.bootstrapUserCategoriesFromApp.mockResolvedValue({
      createdCategories: 10,
      createdSubcategories: 30,
    });
    ruleProvisioningService.installDefaultTemplatesForUser.mockResolvedValue({
      templatesFound: 20,
      createdRules: 20,
      skippedRules: 0,
    });

    const logSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);

    await (service as any).bootstrapUserDefaults('user-1');

    expect(
      categoryManagementService.bootstrapUserCategoriesFromApp,
    ).toHaveBeenCalledWith('user-1');
    expect(
      ruleProvisioningService.installDefaultTemplatesForUser,
    ).toHaveBeenCalledWith('user-1');
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('does not log success when no new categories/subcategories/rules are created', async () => {
    const { service, categoryManagementService, ruleProvisioningService } =
      makeService();

    categoryManagementService.bootstrapUserCategoriesFromApp.mockResolvedValue({
      createdCategories: 0,
      createdSubcategories: 0,
    });
    ruleProvisioningService.installDefaultTemplatesForUser.mockResolvedValue({
      templatesFound: 20,
      createdRules: 0,
      skippedRules: 20,
    });

    const logSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);

    await (service as any).bootstrapUserDefaults('user-2');

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('swallows provisioning errors and logs them', async () => {
    const { service, categoryManagementService, ruleProvisioningService } =
      makeService();

    categoryManagementService.bootstrapUserCategoriesFromApp.mockRejectedValue(
      new Error('bootstrap failed'),
    );

    const errorSpy = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);

    await expect(
      (service as any).bootstrapUserDefaults('user-3'),
    ).resolves.toBeUndefined();

    expect(
      ruleProvisioningService.installDefaultTemplatesForUser,
    ).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('AuthService.completeOnboarding', () => {
  const makeService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn<
          Promise<{ onboardingCompletedAt: Date | null } | null>,
          [unknown]
        >(),
        update: jest.fn<
          Promise<{ onboardingCompletedAt: Date | null }>,
          [unknown]
        >(),
      },
    };

    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return {
      service,
      prisma,
    };
  };

  it('sets onboardingCompletedAt for first completion', async () => {
    const { service, prisma } = makeService();

    prisma.user.findUnique.mockResolvedValue({ onboardingCompletedAt: null });
    prisma.user.update.mockResolvedValue({ onboardingCompletedAt: new Date() });

    const result = await service.completeOnboarding('user-1');

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.onboardingCompleted).toBe(true);
    expect(typeof result.onboardingCompletedAt).toBe('string');
  });

  it('returns existing onboarding completion when already completed', async () => {
    const { service, prisma } = makeService();
    const completedAt = new Date('2026-03-10T00:00:00.000Z');

    prisma.user.findUnique.mockResolvedValue({
      onboardingCompletedAt: completedAt,
    });

    const result = await service.completeOnboarding('user-2');

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      onboardingCompleted: true,
      onboardingCompletedAt: completedAt.toISOString(),
    });
  });

  it('throws when user does not exist', async () => {
    const { service, prisma } = makeService();

    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.completeOnboarding('missing-user')).rejects.toThrow(
      'Invalid user',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('AuthService consent redirect routing', () => {
  const originalEnv = {
    BASIQ_CONSENT_REDIRECT_URI: process.env.BASIQ_CONSENT_REDIRECT_URI,
    BASIQ_CONSENT_REDIRECT_URI_WEB: process.env.BASIQ_CONSENT_REDIRECT_URI_WEB,
    BASIQ_CONSENT_REDIRECT_URI_NATIVE:
      process.env.BASIQ_CONSENT_REDIRECT_URI_NATIVE,
  };

  const makeService = () =>
    new AuthService(
      {
        bankConsentAttempt: {
          findUnique: jest.fn(),
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

  afterEach(() => {
    process.env.BASIQ_CONSENT_REDIRECT_URI =
      originalEnv.BASIQ_CONSENT_REDIRECT_URI;
    process.env.BASIQ_CONSENT_REDIRECT_URI_WEB =
      originalEnv.BASIQ_CONSENT_REDIRECT_URI_WEB;
    process.env.BASIQ_CONSENT_REDIRECT_URI_NATIVE =
      originalEnv.BASIQ_CONSENT_REDIRECT_URI_NATIVE;
  });

  it('adds explicit web client query to public callback bridge redirect', () => {
    process.env.BASIQ_CONSENT_REDIRECT_URI =
      'https://example.ngrok-free.dev/api/auth/callback';
    const service = makeService();

    const redirectUri = (service as any).resolveConsentRedirectUri('web');

    expect(redirectUri).toBe(
      'https://example.ngrok-free.dev/api/auth/callback?client=web',
    );
  });

  it('adds explicit native client query to native redirect uri', () => {
    delete process.env.BASIQ_CONSENT_REDIRECT_URI;
    process.env.BASIQ_CONSENT_REDIRECT_URI_NATIVE = 'ledgerly://auth/callback';
    const service = makeService();

    const redirectUri = (service as any).resolveConsentRedirectUri('native');

    expect(redirectUri).toBe('ledgerly://auth/callback?client=native');
  });

  it('resolves persisted client from authorize url redirect_uri query', async () => {
    const prisma = {
      bankConsentAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          authorizeUrl:
            'https://consent.basiq.io/home?token=abc&state=s1&redirect_uri=' +
            encodeURIComponent(
              'https://example.ngrok-free.dev/api/auth/callback?client=web',
            ),
        }),
      },
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const client = await service.resolveConsentAttemptClient('state-1');

    expect(client).toBe('web');
  });

  it('falls back to native when persisted redirect uri uses ledgerly scheme', async () => {
    const prisma = {
      bankConsentAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          authorizeUrl:
            'https://consent.basiq.io/home?token=abc&state=s2&redirect_uri=' +
            encodeURIComponent('ledgerly://auth/callback'),
        }),
      },
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const client = await service.resolveConsentAttemptClient('state-2');

    expect(client).toBe('native');
  });
});
