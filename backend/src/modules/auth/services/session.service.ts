import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from 'src/sourceDB/database/prisma.service';
import {
  BankConnectionState,
  IssuedSessionResponse,
} from '../interfaces/auth-user.interface';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async refreshSession(input: {
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<IssuedSessionResponse> {
    const refreshTokenHash = this.hashToken(input.refreshToken);
    const now = new Date();

    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash },
      select: {
        id: true,
        userId: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.status !== 'ACTIVE' || session.expiresAt <= now) {
      throw new UnauthorizedException('Refresh session expired');
    }

    const rotated = await this.issueJwtPair({
      userId: session.userId,
      sessionId: session.id,
    });

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.hashToken(rotated.refreshToken),
        expiresAt: rotated.refreshExpiresAt,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      },
    });

    const sessionProfile = await this.getSessionProfile(session.userId);

    return {
      user: sessionProfile.user,
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      accessTokenExpiresInSeconds: rotated.accessTokenExpiresInSeconds,
      onboardingCompleted: sessionProfile.onboardingCompleted,
      bankConnectionState: sessionProfile.bankConnectionState,
      hasConnectedBank: sessionProfile.hasConnectedBank,
    };
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const refreshTokenHash = this.hashToken(refreshToken);

    await this.prisma.userSession.updateMany({
      where: {
        refreshTokenHash,
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });
  }

  async issueSessionForUser(input: {
    userId: string;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<IssuedSessionResponse> {
    return this.createSessionForUser(input);
  }

  async reissueSessionForUser(input: {
    sessionId: string;
    userId: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<IssuedSessionResponse> {
    const existingSession = await this.prisma.userSession.findUnique({
      where: { id: input.sessionId },
      select: { id: true, status: true },
    });

    if (!existingSession || existingSession.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid user session');
    }

    const tokens = await this.issueJwtPair({
      userId: input.userId,
      sessionId: input.sessionId,
    });

    await this.prisma.userSession.update({
      where: { id: input.sessionId },
      data: {
        userId: input.userId,
        refreshTokenHash: this.hashToken(tokens.refreshToken),
        expiresAt: tokens.refreshExpiresAt,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      },
    });

    const sessionProfile = await this.getSessionProfile(input.userId);

    return {
      user: sessionProfile.user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
      onboardingCompleted: sessionProfile.onboardingCompleted,
      bankConnectionState: sessionProfile.bankConnectionState,
      hasConnectedBank: sessionProfile.hasConnectedBank,
    };
  }

  private async createSessionForUser(input: {
    userId: string;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<IssuedSessionResponse> {
    const sessionId = randomUUID();

    const tokens = await this.issueJwtPair({
      userId: input.userId,
      sessionId,
    });

    const session = await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: input.userId,
        refreshTokenHash: this.hashToken(tokens.refreshToken),
        deviceId: input.deviceId,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: tokens.refreshExpiresAt,
        status: 'ACTIVE',
      },
      select: { id: true, userId: true },
    });

    const sessionProfile = await this.getSessionProfile(session.userId);

    return {
      user: sessionProfile.user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
      onboardingCompleted: sessionProfile.onboardingCompleted,
      bankConnectionState: sessionProfile.bankConnectionState,
      hasConnectedBank: sessionProfile.hasConnectedBank,
    };
  }

  private async getSessionProfile(userId: string): Promise<{
    user: {
      id: string;
      roles: string[];
      email: string;
      fullName: string;
      avatarUrl: string | null;
    };
    onboardingCompleted: boolean;
    bankConnectionState: BankConnectionState;
    hasConnectedBank: boolean;
  }> {
    const [user, activeConnectionsCount, totalConnectionsCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          onboardingCompletedAt: true,
        },
      }),
      this.prisma.bankConnection.count({
        where: {
          userId,
          status: {
            in: ['CONNECTED', 'SYNCING'],
          },
        },
      }),
      this.prisma.bankConnection.count({
        where: { userId },
      }),
    ]);

    if (!user) {
      throw new UnauthorizedException('Invalid user session');
    }

    const bankConnectionState = resolveBankConnectionState(
      activeConnectionsCount,
      totalConnectionsCount,
    );

    return {
      user: {
        id: user.id,
        roles: [],
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
      onboardingCompleted: Boolean(user.onboardingCompletedAt),
      bankConnectionState,
      hasConnectedBank: bankConnectionState === 'connected',
    };
  }

  private async issueJwtPair(input: {
    userId: string;
    sessionId: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshExpiresAt: Date;
    accessTokenExpiresInSeconds: number;
  }> {
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '30d';
    const accessTokenExpiresInSeconds = this.resolveTtlSeconds(accessTtl, 900);
    const refreshTokenExpiresInSeconds = this.resolveTtlSeconds(
      refreshTtl,
      60 * 60 * 24 * 30,
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: input.userId,
          sid: input.sessionId,
          roles: [],
          type: 'access',
        },
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessTokenExpiresInSeconds, // number
        },
      ),
      this.jwt.signAsync(
        {
          sub: input.userId,
          sid: input.sessionId,
          roles: [],
          type: 'refresh',
        },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshTokenExpiresInSeconds, // number
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: new Date(
        Date.now() + refreshTokenExpiresInSeconds * 1000,
      ),
      accessTokenExpiresInSeconds,
    };
  }

  private hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private resolveTtlSeconds(value: string, fallback: number): number {
    const v = value.trim().toLowerCase();
    const m = /^(\d+)([smhd])$/.exec(v);
    if (!m) return fallback;

    const amount = Number(m[1]);
    const unit = m[2];

    if (unit === 's') return amount;
    if (unit === 'm') return amount * 60;
    if (unit === 'h') return amount * 60 * 60;
    return amount * 60 * 60 * 24;
  }
}

function resolveBankConnectionState(
  activeConnectionsCount: number,
  totalConnectionsCount: number,
): BankConnectionState {
  if (activeConnectionsCount > 0) {
    return 'connected';
  }

  if (totalConnectionsCount > 0) {
    return 'reconnect_required';
  }

  return 'never_connected';
}
