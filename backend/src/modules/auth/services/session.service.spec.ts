jest.mock(
  'src/sourceDB/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

import { SessionService } from './session.service';

describe('SessionService.issueSessionForUser', () => {
  const makeService = () => {
    const prisma = {
      userSession: {
        create: jest.fn<Promise<{ id: string; userId: string }>, [unknown]>(),
        findUnique: jest.fn<Promise<{ id: string; status: string } | null>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      bankConnection: {
        count: jest.fn<Promise<number>, [unknown]>(),
      },
      user: {
        findUnique: jest.fn<
          Promise<
            | {
                id: string;
                email: string;
                fullName: string;
                avatarUrl: string | null;
                onboardingCompletedAt: Date | null;
              }
            | null
          >,
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

    return { service, prisma };
  };

  it('creates a session for a canonical user and returns onboarding flags', async () => {
    const { service, prisma } = makeService();
    prisma.userSession.create.mockResolvedValue({ id: 'session-1', userId: 'user-1' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      fullName: 'User Example',
      avatarUrl: null,
      onboardingCompletedAt: new Date('2026-03-10T00:00:00.000Z'),
    });
    prisma.bankConnection.count.mockResolvedValueOnce(2).mockResolvedValueOnce(2);

    jest.spyOn(service as any, 'issueJwtPair').mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      refreshExpiresAt: new Date('2026-04-01T00:00:00.000Z'),
      accessTokenExpiresInSeconds: 900,
    });

    const result = await service.issueSessionForUser({ userId: 'user-1' });

    expect(result).toEqual({
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
      onboardingCompleted: true,
      bankConnectionState: 'connected',
      hasConnectedBank: true,
    });
  });

  it('reissues an existing active session for the same user', async () => {
    const { service, prisma } = makeService();
    prisma.userSession.findUnique.mockResolvedValue({ id: 'session-1', status: 'ACTIVE' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      fullName: 'User Example',
      avatarUrl: null,
      onboardingCompletedAt: null,
    });
    prisma.bankConnection.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    jest.spyOn(service as any, 'issueJwtPair').mockResolvedValue({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      refreshExpiresAt: new Date('2026-04-01T00:00:00.000Z'),
      accessTokenExpiresInSeconds: 900,
    });

    const result = await service.reissueSessionForUser({
      sessionId: 'session-1',
      userId: 'user-1',
    });

    expect(prisma.userSession.update).toHaveBeenCalledTimes(1);
    expect(result.hasConnectedBank).toBe(false);
    expect(result.bankConnectionState).toBe('never_connected');
    expect(result.onboardingCompleted).toBe(false);
  });

  it('marks sessions as reconnect required when only revoked/error bank links remain', async () => {
    const { service, prisma } = makeService();
    prisma.userSession.create.mockResolvedValue({ id: 'session-1', userId: 'user-1' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      fullName: 'User Example',
      avatarUrl: null,
      onboardingCompletedAt: null,
    });
    prisma.bankConnection.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    jest.spyOn(service as any, 'issueJwtPair').mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      refreshExpiresAt: new Date('2026-04-01T00:00:00.000Z'),
      accessTokenExpiresInSeconds: 900,
    });

    const result = await service.issueSessionForUser({ userId: 'user-1' });

    expect(result.hasConnectedBank).toBe(false);
    expect(result.bankConnectionState).toBe('reconnect_required');
  });

  it('throws when user cannot be found', async () => {
    const { service, prisma } = makeService();
    prisma.userSession.create.mockResolvedValue({ id: 'session-1', userId: 'missing-user' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.bankConnection.count.mockResolvedValue(0);

    jest.spyOn(service as any, 'issueJwtPair').mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      refreshExpiresAt: new Date('2026-04-01T00:00:00.000Z'),
      accessTokenExpiresInSeconds: 900,
    });

    await expect(service.issueSessionForUser({ userId: 'missing-user' })).rejects.toThrow(
      'Invalid user session',
    );
  });
});
