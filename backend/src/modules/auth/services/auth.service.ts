import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/sourceDB/database/prisma.service';
import type { Prisma } from 'src/generated/prisma/client';
// auth.service.ts
import { BANK_AUTH_CLIENT } from 'src/modules/cdr-auth/bank-auth.types';
import type {
  BankAuthClient,
  BankConsentJobStatus,
} from 'src/modules/cdr-auth/bank-auth.types';
import { SessionService } from './session.service';
import {
  BankAuthorizeUrlResponse,
  CompleteOnboardingResponse,
  GoogleAuthorizeUrlResponse,
  IssuedSessionResponse,
  VerifyBankConsentResult,
} from '../interfaces/auth-user.interface';
import { RuleProvisioningService } from 'src/modules/rules/services/rule-provisioning.service';
import { CategoryManagementService } from 'src/modules/categories/services/category-management.service';
import { GoogleOidcService } from './google-oidc.service';

@Injectable()
export class AuthService {
  private static readonly BASIQ_PROVIDER_CODE = 'BASIQ';
  private static readonly CONSENT_TTL_MS = 15 * 60 * 1000;
  private static readonly GOOGLE_AUTH_TTL_MS = 10 * 60 * 1000;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly ruleProvisioningService: RuleProvisioningService,
    private readonly categoryManagementService: CategoryManagementService,
    private readonly googleOidc: GoogleOidcService,
    @Inject(BANK_AUTH_CLIENT) private readonly bankAuth: BankAuthClient,
  ) {}

  refreshSession(input: {
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<IssuedSessionResponse> {
    return this.sessionService.refreshSession(input);
  }

  revokeSession(refreshToken: string): Promise<void> {
    return this.sessionService.revokeSession(refreshToken);
  }

  async startGoogleAuth(input: {
    client: 'web' | 'native';
    origin: string | null;
  }): Promise<GoogleAuthorizeUrlResponse> {
    const state = randomUUID();
    const nonce = randomUUID();
    const redirectUri = this.resolveGoogleRedirectUri();
    const bridgeTargetUrl = this.resolveGoogleBridgeTarget({
      client: input.client,
      origin: input.origin,
    });
    const authContext = this.googleOidc.createAuthorizationContext({
      state,
      nonce,
      redirectUri,
    });

    await this.prisma.authAttempt.create({
      data: {
        provider: 'GOOGLE',
        client: input.client === 'native' ? 'NATIVE' : 'WEB',
        state,
        nonce,
        codeVerifier: authContext.codeVerifier,
        redirectUri,
        bridgeTargetUrl,
        expiresAt: new Date(Date.now() + AuthService.GOOGLE_AUTH_TTL_MS),
      },
    });

    return {
      authorizeUrl: authContext.authorizeUrl,
      state,
    };
  }

  async resolveGoogleAuthAttemptBridgeTarget(
    state: string | undefined,
  ): Promise<string | null> {
    const normalizedState = state?.trim();
    if (!normalizedState) {
      return null;
    }

    const attempt = await this.prisma.authAttempt.findUnique({
      where: { state: normalizedState },
      select: { bridgeTargetUrl: true },
    });

    return attempt?.bridgeTargetUrl ?? null;
  }

  async completeGoogleAuth(input: {
    state: string;
    code?: string;
    error?: string;
    errorDescription?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<IssuedSessionResponse> {
    const attempt = await this.prisma.authAttempt.findFirst({
      where: {
        state: input.state,
        provider: 'GOOGLE',
        status: 'PENDING',
      },
      select: {
        id: true,
        nonce: true,
        codeVerifier: true,
        redirectUri: true,
        expiresAt: true,
      },
    });

    if (!attempt) {
      throw new UnauthorizedException('Invalid Google auth state');
    }

    if (attempt.expiresAt <= new Date()) {
      await this.prisma.authAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'EXPIRED',
          completedAt: new Date(),
          errorMessage: 'Google authentication attempt expired',
        },
      });
      throw new UnauthorizedException('Google authentication expired');
    }

    if (input.error) {
      await this.prisma.authAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: input.errorDescription?.trim() || input.error,
        },
      });
      throw new UnauthorizedException(
        input.errorDescription?.trim() || 'Google authentication failed',
      );
    }

    if (!input.code) {
      throw new BadRequestException('Google authorization code is required');
    }

    const googleIdentity = await this.googleOidc.exchangeCodeForIdentity({
      code: input.code,
      codeVerifier: attempt.codeVerifier,
      redirectUri: attempt.redirectUri,
      expectedNonce: attempt.nonce,
    });

    const resolved = await this.prisma.$transaction(async (tx) => {
      const existingIdentity = await tx.userAuthIdentity.findUnique({
        where: {
          provider_providerSubject: {
            provider: 'GOOGLE',
            providerSubject: googleIdentity.subject,
          },
        },
        select: {
          userId: true,
        },
      });

      const existingUserByEmail =
        !existingIdentity && googleIdentity.emailVerified
          ? await tx.user.findUnique({
              where: { email: googleIdentity.email },
              select: { id: true },
            })
          : null;

      const isNewUser = !existingIdentity && !existingUserByEmail;
      const user =
        existingIdentity || existingUserByEmail
          ? await tx.user.update({
              where: {
                id: existingIdentity?.userId ?? existingUserByEmail!.id,
              },
              data: {
                email: googleIdentity.email,
                fullName: googleIdentity.fullName,
                avatarUrl: googleIdentity.avatarUrl,
              },
              select: { id: true },
            })
          : await tx.user.create({
              data: {
                email: googleIdentity.email,
                fullName: googleIdentity.fullName,
                avatarUrl: googleIdentity.avatarUrl,
              },
              select: { id: true },
            });

      await tx.userAuthIdentity.upsert({
        where: {
          provider_providerSubject: {
            provider: 'GOOGLE',
            providerSubject: googleIdentity.subject,
          },
        },
        create: {
          userId: user.id,
          provider: 'GOOGLE',
          providerSubject: googleIdentity.subject,
          email: googleIdentity.email,
          emailVerified: googleIdentity.emailVerified,
          displayName: googleIdentity.fullName,
          avatarUrl: googleIdentity.avatarUrl,
        },
        update: {
          userId: user.id,
          email: googleIdentity.email,
          emailVerified: googleIdentity.emailVerified,
          displayName: googleIdentity.fullName,
          avatarUrl: googleIdentity.avatarUrl,
        },
      });

      await tx.authAttempt.update({
        where: { id: attempt.id },
        data: {
          userId: user.id,
          status: 'COMPLETED',
          completedAt: new Date(),
          errorMessage: null,
        },
      });

      return {
        userId: user.id,
        isNewUser,
      };
    });

    if (resolved.isNewUser) {
      await this.bootstrapUserDefaults(resolved.userId);
    }

    return this.sessionService.issueSessionForUser({
      userId: resolved.userId,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });
  }

  async completeOnboarding(
    userId: string,
  ): Promise<CompleteOnboardingResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    if (user.onboardingCompletedAt) {
      return {
        success: true,
        onboardingCompleted: true,
        onboardingCompletedAt: user.onboardingCompletedAt.toISOString(),
      };
    }

    const completedAt = new Date();

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: completedAt },
    });

    return {
      success: true,
      onboardingCompleted: true,
      onboardingCompletedAt: completedAt.toISOString(),
    };
  }

  async startBankConsent(input: {
    userId: string;
    client: 'web' | 'native';
  },
  ): Promise<BankAuthorizeUrlResponse> {
    const provider = await this.getOrCreateBasiqProvider();
    const bankProviderUser = await this.getOrCreateBankProviderUserForUser({
      userId: input.userId,
      providerId: provider.id,
    });

    const state = randomUUID();
    const redirectUri = this.resolveConsentRedirectUri(input.client);

    const authContext = await this.bankAuth.createAuthorizeUrl({
      state,
      providerUserId: bankProviderUser.providerUserId,
      redirectUri,
    });

    await this.prisma.bankConsentAttempt.create({
      data: {
        userId: input.userId,
        providerId: provider.id,
        bankProviderUserId: bankProviderUser.id,
        client: input.client === 'native' ? 'NATIVE' : 'WEB',
        state,
        authorizeUrl: authContext.authorizeUrl,
        expiresAt: new Date(Date.now() + AuthService.CONSENT_TTL_MS),
      },
    });

    return {
      authorizeUrl: authContext.authorizeUrl,
      state,
    };
  }

  async resolveConsentAttemptClient(
    state: string | undefined,
  ): Promise<'web' | 'native' | null> {
    const normalizedState = state?.trim();
    if (!normalizedState) {
      return null;
    }

    const attempt = await this.prisma.bankConsentAttempt.findUnique({
      where: { state: normalizedState },
      select: { client: true },
    });

    if (!attempt) {
      return null;
    }

    if (attempt.client === 'WEB') {
      return 'web';
    }

    if (attempt.client === 'NATIVE') {
      return 'native';
    }

    return null;
  }

  private resolveConsentRedirectUri(
    client: 'web' | 'native',
  ): string | undefined {
    const normalize = (value?: string): string | undefined => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    };

    const bridgeRedirectUri = normalize(process.env.BASIQ_CONSENT_REDIRECT_URI);
    if (bridgeRedirectUri && /^https?:\/\//i.test(bridgeRedirectUri)) {
      return appendClientQueryParam(bridgeRedirectUri, client);
    }

    const legacyRedirectUri = normalize(process.env.BASIQ_CONSENT_REDIRECT_URI);
    const webRedirectUri = normalize(
      process.env.BASIQ_CONSENT_REDIRECT_URI_WEB,
    );
    const nativeRedirectUri = normalize(
      process.env.BASIQ_CONSENT_REDIRECT_URI_NATIVE,
    );

    if (client === 'native') {
      if (nativeRedirectUri) {
        return appendClientQueryParam(nativeRedirectUri, client);
      }

      if (legacyRedirectUri?.startsWith('ledgerly://')) {
        return appendClientQueryParam(legacyRedirectUri, client);
      }

      return appendClientQueryParam('ledgerly://auth/callback', client);
    }

    return appendClientQueryParam(webRedirectUri ?? legacyRedirectUri, client);
  }

  async verifyBankConsent(input: {
    userId: string;
    sessionId: string;
    state: string;
    jobIds: string[];
    userAgent?: string;
    ipAddress?: string;
  }): Promise<VerifyBankConsentResult> {
    const normalizedJobIds = [
      ...new Set(input.jobIds.map((v) => v.trim())),
    ].filter(Boolean);
    if (normalizedJobIds.length === 0) {
      throw new BadRequestException('At least one jobId is required');
    }

    if (!this.bankAuth.getConsentJobStatus) {
      throw new BadRequestException(
        'Consent verification is not supported in this CDR mode',
      );
    }

    const attempt = await this.prisma.bankConsentAttempt.findFirst({
      where: {
        state: input.state,
        userId: input.userId,
        status: 'PENDING',
      },
      select: {
        id: true,
        providerId: true,
        bankProviderUserId: true,
        expiresAt: true,
        bankProviderUser: {
          select: {
            providerUserId: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new UnauthorizedException('Invalid consent state');
    }

    if (attempt.expiresAt <= new Date()) {
      await this.prisma.bankConsentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'EXPIRED',
          completedAt: new Date(),
          errorMessage: 'Consent attempt expired',
        },
      });

      return {
        success: false,
        failedJobIds: [],
        pendingJobIds: [],
        message: 'Consent session expired. Please try again.',
      };
    }

    const statuses = await Promise.all(
      normalizedJobIds.map((jobId) =>
        this.bankAuth.getConsentJobStatus!(jobId),
      ),
    );

    const failed = statuses.filter((s) => s.outcome === 'failed');
    const pending = statuses.filter((s) => s.outcome === 'pending');

    if (failed.length > 0 || pending.length > 0) {
      await this.prisma.bankConsentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: failed.length > 0 ? 'FAILED' : 'PENDING',
          completedAt: failed.length > 0 ? new Date() : null,
          errorMessage: failed[0]?.reason ?? null,
          jobIdsJson: normalizedJobIds,
        },
      });

      return {
        success: false,
        failedJobIds: failed.map((f) => f.jobId),
        pendingJobIds: pending.map((p) => p.jobId),
        message:
          failed[0]?.reason ??
          (pending.length > 0
            ? 'Consent is still processing. Please retry in a moment.'
            : 'Consent failed'),
      };
    }

    // Security check: all jobs must belong to the same Basiq user mapped to this app user.
    const hasSourceMismatch = statuses.some(
      (job) =>
        job.sourceUserId &&
        job.sourceUserId !== attempt.bankProviderUser.providerUserId,
    );

    if (hasSourceMismatch) {
      await this.prisma.bankConsentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          jobIdsJson: normalizedJobIds,
          errorMessage: 'Consent job source user mismatch',
        },
      });

      return {
        success: false,
        failedJobIds: normalizedJobIds,
        pendingJobIds: [],
        message: 'Invalid consent source detected',
      };
    }

    const providerConnectionIds = [
      ...new Set(
        statuses
          .map((status) => status.sourceConnectionId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const resolved = await this.prisma.$transaction(async (tx) => {
      const [previousVerifiedAttemptsCount, existingConnectionsCount] =
        await Promise.all([
          tx.bankConsentAttempt.count({
            where: {
              userId: input.userId,
              status: 'VERIFIED',
            },
          }),
          tx.bankConnection.count({
            where: {
              userId: input.userId,
              providerId: attempt.providerId,
            },
          }),
        ]);

      await tx.bankProviderUser.update({
        where: { id: attempt.bankProviderUserId },
        data: { userId: input.userId },
      });

      await this.upsertConnectionsFromJobs(tx, {
        userId: input.userId,
        providerId: attempt.providerId,
        bankProviderUserId: attempt.bankProviderUserId,
        statuses,
      });

      await tx.bankConsentAttempt.update({
        where: { id: attempt.id },
        data: {
          userId: input.userId,
          status: 'VERIFIED',
          completedAt: new Date(),
          jobIdsJson: normalizedJobIds,
          errorMessage: null,
        },
      });

      return {
        previousVerifiedAttemptsCount,
        existingConnectionsCount,
      };
    });

    const session = await this.sessionService.reissueSessionForUser({
      sessionId: input.sessionId,
      userId: input.userId,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    const isFirstSuccessfulConsentForUser =
      resolved.previousVerifiedAttemptsCount === 0;
    const wasFirstSuccessfulBankConnection =
      resolved.existingConnectionsCount === 0;

    return {
      success: true,
      failedJobIds: [],
      pendingJobIds: [],
      message: 'Bank consent verified successfully',
      session,
      context: {
        appUserId: input.userId,
        providerCode: AuthService.BASIQ_PROVIDER_CODE,
        providerUserId: attempt.bankProviderUser.providerUserId,
        providerConnectionIds,
        jobIds: normalizedJobIds,
        isFirstSuccessfulConsentForUser,
        bankConnectionState: session.bankConnectionState,
        hasConnectedBank: session.hasConnectedBank,
        wasFirstSuccessfulBankConnection,
      },
    };
  }

  private async bootstrapUserDefaults(userId: string): Promise<void> {
    try {
      const bootstrapResult =
        await this.categoryManagementService.bootstrapUserCategoriesFromApp(
          userId,
        );

      const rulesResult =
        await this.ruleProvisioningService.installDefaultTemplatesForUser(
          userId,
        );

      if (
        bootstrapResult.createdCategories > 0 ||
        bootstrapResult.createdSubcategories > 0 ||
        rulesResult.createdRules > 0
      ) {
        this.logger.log(
          `Bootstrapped user defaults for ${userId}: categories=${bootstrapResult.createdCategories}, subcategories=${bootstrapResult.createdSubcategories}, rules=${rulesResult.createdRules}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to bootstrap defaults for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async getOrCreateBasiqProvider(): Promise<{ id: string }> {
    return this.prisma.bankProvider.upsert({
      where: { code: AuthService.BASIQ_PROVIDER_CODE },
      create: {
        code: AuthService.BASIQ_PROVIDER_CODE,
        name: 'Basiq',
        status: 'ACTIVE',
      },
      update: {
        name: 'Basiq',
        status: 'ACTIVE',
      },
      select: { id: true },
    });
  }

  private async getOrCreateBankProviderUserForUser(input: {
    userId: string;
    providerId: string;
  }): Promise<{ id: string; providerUserId: string }> {
    const existing = await this.prisma.bankProviderUser.findFirst({
      where: {
        userId: input.userId,
        providerId: input.providerId,
      },
      select: {
        id: true,
        providerUserId: true,
      },
    });

    if (existing) {
      return existing;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        email: true,
        fullName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const email = user.email.trim();
    const fullName = user.fullName.trim();
    if (!email || !fullName) {
      throw new BadRequestException(
        'Authenticated user must have an email and full name before starting bank consent.',
      );
    }

    const createdProviderUserId = this.bankAuth.createProviderUser
      ? (
          await this.bankAuth.createProviderUser({
            email,
            fullName,
          })
        ).providerUserId
      : `pending:${randomUUID()}`;

    return this.prisma.bankProviderUser.create({
      data: {
        userId: input.userId,
        providerId: input.providerId,
        providerUserId: createdProviderUserId,
      },
      select: {
        id: true,
        providerUserId: true,
      },
    });
  }

  // auth.service.ts
  private async upsertConnectionsFromJobs(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      providerId: string;
      bankProviderUserId: string;
      statuses: BankConsentJobStatus[];
    },
  ): Promise<void> {
    const connectionIds = [
      ...new Set(
        input.statuses
          .map((s) => s.sourceConnectionId)
          .filter((v): v is string => Boolean(v)),
      ),
    ];

    const consentedAt = new Date();

    await Promise.all(
      connectionIds.map((connectionId) =>
        tx.bankConnection.upsert({
          where: {
            providerId_providerConnectionId: {
              providerId: input.providerId,
              providerConnectionId: connectionId,
            },
          },
          create: {
            userId: input.userId,
            providerId: input.providerId,
            bankProviderUserId: input.bankProviderUserId,
            providerConnectionId: connectionId,
            encryptedAccessToken: null,
            encryptedRefreshToken: null,
            tokenExpiresAt: null,
            consentScopesJson: {},
            status: 'CONNECTED',
            consentedAt,
          },
          update: {
            userId: input.userId,
            bankProviderUserId: input.bankProviderUserId,
            status: 'CONNECTED',
            consentedAt,
            revokedAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        }),
      ),
    );
  }

  private resolveGoogleRedirectUri(): string {
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
    if (!redirectUri) {
      throw new BadRequestException(
        'Missing GOOGLE_OAUTH_REDIRECT_URI for Google authentication',
      );
    }

    return redirectUri;
  }

  private resolveGoogleBridgeTarget(input: {
    client: 'web' | 'native';
    origin: string | null;
  }): string {
    if (input.client === 'native') {
      return normalizeRedirectTarget(
        process.env.GOOGLE_CALLBACK_BRIDGE_NATIVE_URL,
        'ledgerly://auth/google/callback',
      );
    }

    const originTarget = input.origin
      ? `${input.origin}/auth/google/callback`
      : undefined;

    return normalizeRedirectTarget(
      originTarget ?? process.env.GOOGLE_CALLBACK_BRIDGE_WEB_URL,
      'http://localhost:4200/auth/google/callback',
    );
  }
}

function appendClientQueryParam(
  redirectUri: string | undefined,
  client: 'web' | 'native',
): string | undefined {
  if (!redirectUri) {
    return undefined;
  }

  try {
    const parsed = new URL(redirectUri);
    parsed.searchParams.set('client', client);
    return parsed.toString();
  } catch {
    return redirectUri;
  }
}

function normalizeRedirectTarget(
  value: string | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return fallback;
  }
}
