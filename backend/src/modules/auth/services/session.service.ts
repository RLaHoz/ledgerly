import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from 'src/sourceDB/database/prisma.service';
import { AppSessionResponse } from '../interfaces/auth-user.interface';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async createAnonymousSession(input: {
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AppSessionResponse> {
    // Create a lightweight app identity.
    const user = await this.prisma.user.create({
      data: {
        email: `anon+${randomUUID()}@ledgerly.local`,
        fullName: 'Ledgerly User',
      },
      select: { id: true },
    });

    return this.createSessionForUser({
      userId: user.id,
      deviceId: input.deviceId,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });
  }

  async refreshSession(input: {
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AppSessionResponse> {
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

    const userFlags = await this.getUserSessionFlags(session.userId);

    return {
      user: { id: session.userId, roles: [] },
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      accessTokenExpiresInSeconds: rotated.accessTokenExpiresInSeconds,
      onboardingCompleted: userFlags.onboardingCompleted,
      isFirstBankConnectionForUser: userFlags.isFirstBankConnectionForUser,
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

  private async createSessionForUser(input: {
    userId: string;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AppSessionResponse> {
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

    const userFlags = await this.getUserSessionFlags(session.userId);

    return {
      user: { id: session.userId, roles: [] },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
      onboardingCompleted: userFlags.onboardingCompleted,
      isFirstBankConnectionForUser: userFlags.isFirstBankConnectionForUser,
    };
  }

  private async getUserSessionFlags(userId: string): Promise<{
    onboardingCompleted: boolean;
    isFirstBankConnectionForUser: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingCompletedAt: true,
        _count: {
          select: {
            bankConnections: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user session');
    }

    return {
      onboardingCompleted: Boolean(user.onboardingCompletedAt),
      isFirstBankConnectionForUser: user._count.bankConnections === 0,
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
