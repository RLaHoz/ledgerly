/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/sourceDB/database/prisma.service';
// auth.service.ts
import { BANK_AUTH_CLIENT } from 'src/modules/cdr-auth/bank-auth.types';
import type {
  BankAuthClient,
  BankConsentJobStatus,
} from 'src/modules/cdr-auth/bank-auth.types';
import { SessionService } from './session.service';
import {
  AppSessionResponse,
  BankAuthorizeUrlResponse,
  CompleteOnboardingResponse,
  VerifyBankConsentResponse,
} from '../interfaces/auth-user.interface';
import { RuleProvisioningService } from 'src/modules/rules/services/rule-provisioning.service';
import { CategoryManagementService } from 'src/modules/categories/services/category-management.service';

@Injectable()
export class AuthService {
  private static readonly BASIQ_PROVIDER_CODE = 'BASIQ';
  private static readonly CONSENT_TTL_MS = 15 * 60 * 1000;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly ruleProvisioningService: RuleProvisioningService,
    private readonly categoryManagementService: CategoryManagementService,
    @Inject(BANK_AUTH_CLIENT) private readonly bankAuth: BankAuthClient,
  ) {}

  createAnonymousSession(input: {
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AppSessionResponse> {
    return this.sessionService.createAnonymousSession(input);
  }

  refreshSession(input: {
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AppSessionResponse> {
    return this.sessionService.refreshSession(input);
  }

  revokeSession(refreshToken: string): Promise<void> {
    return this.sessionService.revokeSession(refreshToken);
  }

  async completeOnboarding(userId: string): Promise<CompleteOnboardingResponse> {
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

  async createBankAuthorizeUrl(
    userId: string,
  ): Promise<BankAuthorizeUrlResponse> {
    const provider = await this.getOrCreateBasiqProvider();
    const bankProviderUser = await this.getOrCreateBankProviderUser(
      userId,
      provider.id,
    );

    const state = randomUUID();

    const authContext = await this.bankAuth.createAuthorizeUrl({
      state,
      providerUserId: bankProviderUser.providerUserId,
    });

    await this.prisma.bankConsentAttempt.create({
      data: {
        userId,
        providerId: provider.id,
        bankProviderUserId: bankProviderUser.id,
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

  async verifyBankConsent(input: {
    userId: string;
    state: string;
    jobIds: string[];
  }): Promise<VerifyBankConsentResponse> {
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
        userId: input.userId,
        state: input.state,
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

    const [previousVerifiedAttemptsCount, existingConnectionsCount] =
      await Promise.all([
        this.prisma.bankConsentAttempt.count({
          where: {
            userId: input.userId,
            status: 'VERIFIED',
          },
        }),
        this.prisma.bankConnection.count({
          where: {
            userId: input.userId,
            providerId: attempt.providerId,
          },
        }),
      ]);

    const isFirstSuccessfulConsentForUser = previousVerifiedAttemptsCount === 0;
    const isFirstBankConnectionForUser = existingConnectionsCount === 0;

    await this.upsertConnectionsFromJobs({
      userId: input.userId,
      providerId: attempt.providerId,
      bankProviderUserId: attempt.bankProviderUserId,
      statuses,
    });

    const providerConnectionIds = [
      ...new Set(
        statuses
          .map((status) => status.sourceConnectionId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    await this.prisma.bankConsentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'VERIFIED',
        completedAt: new Date(),
        jobIdsJson: normalizedJobIds,
        errorMessage: null,
      },
    });

    await this.bootstrapUserDefaults(input.userId);

    return {
      success: true,
      failedJobIds: [],
      pendingJobIds: [],
      message: 'Bank consent verified successfully',
      context: {
        appUserId: input.userId,
        providerCode: AuthService.BASIQ_PROVIDER_CODE,
        providerUserId: attempt.bankProviderUser.providerUserId,
        providerConnectionIds,
        jobIds: normalizedJobIds,
        isFirstSuccessfulConsentForUser,
        isFirstBankConnectionForUser,
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

  // auth.service.ts
  private async getOrCreateBankProviderUser(
    userId: string,
    providerId: string,
  ): Promise<{ id: string; providerUserId: string }> {
    const existing = await this.prisma.bankProviderUser.findUnique({
      where: {
        userId_providerId: {
          userId,
          providerId,
        },
      },
      select: {
        id: true,
        providerUserId: true,
      },
    });

    if (existing) {
      return existing;
    }

    if (!this.bankAuth.createProviderUser) {
      throw new BadRequestException(
        'Provider user creation is not supported in this CDR mode',
      );
    }

    const created = await this.bankAuth.createProviderUser();

    return this.prisma.bankProviderUser.create({
      data: {
        userId,
        providerId,
        providerUserId: created.providerUserId,
      },
      select: {
        id: true,
        providerUserId: true,
      },
    });
  }

  // auth.service.ts
  private async upsertConnectionsFromJobs(input: {
    userId: string;
    providerId: string;
    bankProviderUserId: string;
    statuses: BankConsentJobStatus[];
  }): Promise<void> {
    const connectionIds = [
      ...new Set(
        input.statuses
          .map((s) => s.sourceConnectionId)
          .filter((v): v is string => Boolean(v)),
      ),
    ];

    for (const connectionId of connectionIds) {
      await this.prisma.bankConnection.upsert({
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
          encryptedAccessToken: null, // requires nullable field in schema
          encryptedRefreshToken: null,
          tokenExpiresAt: null,
          consentScopesJson: {},
          status: 'CONNECTED',
          consentedAt: new Date(),
        },
        update: {
          userId: input.userId,
          bankProviderUserId: input.bankProviderUserId,
          status: 'CONNECTED',
          consentedAt: new Date(),
          revokedAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
    }
  }
}
