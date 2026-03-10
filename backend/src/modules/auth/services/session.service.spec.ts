jest.mock(
  'src/sourceDB/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

import { SessionService } from './session.service';

describe('SessionService.createAnonymousSession', () => {
  const makeService = () => {
    const prisma = {
      user: {
        create: jest.fn<Promise<{ id: string }>, [unknown]>(),
      },
    };

    const service = new SessionService(
      prisma as never,
      {} as never,
      {
        get: jest.fn(),
        getOrThrow: jest.fn(),
      } as never,
    );

    return {
      service,
      prisma,
    };
  };

  it('creates anonymous user and then creates a session', async () => {
    const { service, prisma } = makeService();
    prisma.user.create.mockResolvedValue({ id: 'user-1' });

    const createSessionSpy = jest
      .spyOn(service as any, 'createSessionForUser')
      .mockResolvedValue({
        user: { id: 'user-1', roles: [] },
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresInSeconds: 900,
        onboardingCompleted: false,
        isFirstBankConnectionForUser: true,
      });

    await service.createAnonymousSession({
      deviceId: 'dev-1',
      userAgent: 'ua',
      ipAddress: '127.0.0.1',
    });

    expect(createSessionSpy).toHaveBeenCalledWith({
      userId: 'user-1',
      deviceId: 'dev-1',
      userAgent: 'ua',
      ipAddress: '127.0.0.1',
    });
  });

  it('supports anonymous session creation without optional metadata', async () => {
    const { service, prisma } = makeService();
    prisma.user.create.mockResolvedValue({ id: 'user-2' });

    const createSessionSpy = jest
      .spyOn(service as any, 'createSessionForUser')
      .mockResolvedValue({
        user: { id: 'user-2', roles: [] },
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresInSeconds: 900,
        onboardingCompleted: false,
        isFirstBankConnectionForUser: true,
      });

    await service.createAnonymousSession({});

    expect(createSessionSpy).toHaveBeenCalledWith({
      userId: 'user-2',
      deviceId: undefined,
      userAgent: undefined,
      ipAddress: undefined,
    });
  });

  it('propagates user creation errors and does not create a session', async () => {
    const { service, prisma } = makeService();
    prisma.user.create.mockRejectedValue(new Error('create user failed'));

    const createSessionSpy = jest
      .spyOn(service as any, 'createSessionForUser')
      .mockResolvedValue({
        user: { id: 'user-3', roles: [] },
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresInSeconds: 900,
        onboardingCompleted: false,
        isFirstBankConnectionForUser: true,
      });

    await expect(service.createAnonymousSession({})).rejects.toThrow(
      'create user failed',
    );
    expect(createSessionSpy).not.toHaveBeenCalled();
  });
});

describe('SessionService.getUserSessionFlags', () => {
  const makeService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn<
          Promise<{
            onboardingCompletedAt: Date | null;
            _count: { bankConnections: number };
          } | null>,
          [unknown]
        >(),
      },
    };

    const service = new SessionService(
      prisma as never,
      {} as never,
      {
        get: jest.fn(),
        getOrThrow: jest.fn(),
      } as never,
    );

    return {
      service,
      prisma,
    };
  };

  it('returns onboarding and bank-connection flags for existing users', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      onboardingCompletedAt: new Date('2026-03-10T00:00:00.000Z'),
      _count: { bankConnections: 2 },
    });

    const result = await (service as any).getUserSessionFlags('user-1');

    expect(result).toEqual({
      onboardingCompleted: true,
      isFirstBankConnectionForUser: false,
    });
  });

  it('marks user as first-bank-connection when no connections exist', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      onboardingCompletedAt: null,
      _count: { bankConnections: 0 },
    });

    const result = await (service as any).getUserSessionFlags('user-2');

    expect(result).toEqual({
      onboardingCompleted: false,
      isFirstBankConnectionForUser: true,
    });
  });

  it('throws when user cannot be found', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      (service as any).getUserSessionFlags('missing-user'),
    ).rejects.toThrow('Invalid user session');
  });
});
