import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { resolveCurrentMonthRangeForUser } from '../../../common/utils/date-range.util';
import { PrismaService } from '../../../sourceDB/database/prisma.service';
import {
  BANK_DATA_CLIENT,
  type BankDataClient,
  type BankTransactionRecord,
} from '../../cdr-auth/bank-data.types';
import { RuleEvaluatorService } from '../../rules/services/rule-evaluator.service';
import type { CompiledRule } from '../../rules/types/rule-condition.types';
import { TransactionsClassificationService } from './transactions-classification.service';
import type { TransactionsSyncSummary } from '../types/transactions.types';

@Injectable()
export class TransactionsSyncService {
  private static readonly DEFAULT_TTL_MINUTES = 10;
  private static readonly PAGE_SIZE = 250;
  private static readonly MAX_PAGES_PER_CONNECTION = 500;
  private readonly logger = new Logger(TransactionsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly ruleEvaluatorService: RuleEvaluatorService,
    private readonly classificationService: TransactionsClassificationService,
    @Inject(BANK_DATA_CLIENT) private readonly bankDataClient: BankDataClient,
  ) {}

  async syncCurrentMonthIfNeeded(input: {
    userId: string;
    includePending: boolean;
    forceSync: boolean;
    ttlMinutes?: number;
  }): Promise<TransactionsSyncSummary> {
    return this.syncCurrentMonth({
      ...input,
      forceSync: input.forceSync,
    });
  }

  async forceSyncCurrentMonth(input: {
    userId: string;
    includePending: boolean;
    ttlMinutes?: number;
  }): Promise<TransactionsSyncSummary> {
    return this.syncCurrentMonth({
      ...input,
      forceSync: true,
    });
  }

  private async syncCurrentMonth(input: {
    userId: string;
    includePending: boolean;
    forceSync: boolean;
    ttlMinutes?: number;
  }): Promise<TransactionsSyncSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        timeZone: true,
        baseCurrency: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const range = resolveCurrentMonthRangeForUser(user.timeZone);
    const now = new Date();
    const ttlMinutes = this.resolveTtlMinutes(input.ttlMinutes);

    const activeConnections = await this.prisma.bankConnection.findMany({
      where: {
        userId: input.userId,
        status: {
          in: ['CONNECTED', 'ERROR'],
        },
      },
      select: {
        id: true,
        userId: true,
        providerConnectionId: true,
        lastSyncedAt: true,
        bankProviderUser: {
          select: {
            providerUserId: true,
          },
        },
      },
      orderBy: { consentedAt: 'desc' },
    });

    const eligibleConnections = activeConnections
      .filter((connection) =>
        Boolean(connection.bankProviderUser?.providerUserId),
      )
      .map((connection) => ({
        id: connection.id,
        userId: connection.userId,
        providerConnectionId: connection.providerConnectionId,
        providerUserId: connection.bankProviderUser!.providerUserId,
        lastSyncedAt: connection.lastSyncedAt,
      }));

    if (eligibleConnections.length === 0) {
      return {
        performed: false,
        reason: 'no_connections',
        syncRunIds: [],
      };
    }

    const cutoff = new Date(now.getTime() - ttlMinutes * 60 * 1000);
    const connectionsToSync = input.forceSync
      ? eligibleConnections
      : eligibleConnections.filter(
          (connection) =>
            !connection.lastSyncedAt || connection.lastSyncedAt <= cutoff,
        );

    if (!input.forceSync && connectionsToSync.length === 0) {
      return {
        performed: false,
        reason: 'ttl_fresh',
        syncRunIds: [],
        syncedAt: now.toISOString(),
      };
    }

    const reason = input.forceSync ? 'forced' : 'stale_ttl';

    const compiledRules =
      await this.ruleEvaluatorService.getCompiledRulesForUser(input.userId);

    const syncRunIds: string[] = [];
    let successfulSyncs = 0;
    const errors: string[] = [];

    for (const connection of connectionsToSync) {
      try {
        const syncRunId = await this.syncConnection({
          userId: input.userId,
          baseCurrency: user.baseCurrency,
          connection,
          range,
          includePending: input.includePending,
          compiledRules,
        });
        syncRunIds.push(syncRunId);
        successfulSyncs += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown sync error';
        errors.push(
          `connection=${connection.providerConnectionId} error=${message}`,
        );
        this.logger.error(
          `Failed to sync connection ${connection.providerConnectionId} for user ${input.userId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    if (successfulSyncs === 0) {
      throw new ServiceUnavailableException(
        `Unable to sync bank transactions at this time. ${errors.join(' | ')}`,
      );
    }

    return {
      performed: true,
      reason,
      syncRunIds,
      syncedAt: new Date().toISOString(),
    };
  }

  private async syncConnection(input: {
    userId: string;
    baseCurrency: string;
    connection: {
      id: string;
      userId: string;
      providerConnectionId: string;
      providerUserId: string;
      lastSyncedAt: Date | null;
    };
    range: {
      fromUtc: Date;
      toUtc: Date;
      timeZone: string;
    };
    includePending: boolean;
    compiledRules: CompiledRule[];
  }): Promise<string> {
    const syncRun = await this.prisma.syncRun.create({
      data: {
        userId: input.userId,
        source: 'BANK_PULL',
        bankConnectionId: input.connection.id,
        status: 'RUNNING',
      },
      select: { id: true },
    });

    let fetchedCount = 0;
    let insertedCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    let classificationAppliedCount = 0;

    try {
      const accountRows = await this.bankDataClient.listConnectionAccounts({
        providerUserId: input.connection.providerUserId,
        providerConnectionId: input.connection.providerConnectionId,
      });

      const bankAccountIdByProviderAccountId = new Map<string, string>();
      for (const account of accountRows) {
        const upsertedAccount = await this.upsertBankAccount({
          bankConnectionId: input.connection.id,
          account,
          baseCurrency: input.baseCurrency,
        });
        bankAccountIdByProviderAccountId.set(
          account.providerAccountId,
          upsertedAccount.id,
        );
      }

      let cursor: string | undefined;
      let pageNumber = 0;

      while (pageNumber < TransactionsSyncService.MAX_PAGES_PER_CONNECTION) {
        const response = await this.bankDataClient.listConnectionTransactions({
          providerUserId: input.connection.providerUserId,
          providerConnectionId: input.connection.providerConnectionId,
          from: input.range.fromUtc,
          to: input.range.toUtc,
          cursor,
          limit: TransactionsSyncService.PAGE_SIZE,
        });

        fetchedCount += response.items.length;

        for (const item of response.items) {
          if (!input.includePending && item.isPending) {
            skippedCount += 1;
            continue;
          }

          const bankAccountId = await this.resolveBankAccountId({
            bankConnectionId: input.connection.id,
            providerAccountId: item.providerAccountId,
            baseCurrency: input.baseCurrency,
            accountMap: bankAccountIdByProviderAccountId,
          });

          const rawResult = await this.upsertRawBankTransaction({
            bankConnectionId: input.connection.id,
            bankAccountId,
            item,
            baseCurrency: input.baseCurrency,
          });

          if (!rawResult.wasCreate) {
            duplicateCount += 1;
          }

          const normalizedResult = await this.upsertNormalizedTransaction({
            userId: input.userId,
            bankConnectionId: input.connection.id,
            bankAccountId,
            rawRefId: rawResult.id,
            item,
            baseCurrency: input.baseCurrency,
          });

          if (normalizedResult.wasCreate) {
            insertedCount += 1;
          } else {
            updatedCount += 1;
          }

          const classifyResult =
            await this.classificationService.classifyIfNeeded({
              userId: input.userId,
              transactionId: normalizedResult.transactionId,
              currentClassificationStatus:
                normalizedResult.currentClassificationStatus,
              currentCategoryId: normalizedResult.currentCategoryId,
              currentSubcategoryId: normalizedResult.currentSubcategoryId,
              currentClassifiedByRuleId:
                normalizedResult.currentClassifiedByRuleId,
              candidate: {
                id: normalizedResult.transactionId,
                amountSigned: item.amountSigned,
                merchant: item.merchant,
                description: item.description,
                isPending: item.isPending,
                isTransfer: item.isTransfer,
              },
              compiledRules: input.compiledRules,
            });

          if (classifyResult.applied) {
            classificationAppliedCount += 1;
          }
        }

        pageNumber += 1;

        if (!response.hasMore || !response.nextCursor) {
          cursor = undefined;
          break;
        }

        cursor = response.nextCursor;
      }

      await this.prisma.$transaction([
        this.prisma.bankSyncCursor.upsert({
          where: { bankConnectionId: input.connection.id },
          create: {
            bankConnectionId: input.connection.id,
            cursorValue: JSON.stringify({
              cursor: cursor ?? null,
              from: input.range.fromUtc.toISOString(),
              to: input.range.toUtc.toISOString(),
              syncedAt: new Date().toISOString(),
            }),
          },
          update: {
            cursorValue: JSON.stringify({
              cursor: cursor ?? null,
              from: input.range.fromUtc.toISOString(),
              to: input.range.toUtc.toISOString(),
              syncedAt: new Date().toISOString(),
            }),
          },
        }),
        this.prisma.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: 'SUCCESS',
            fetchedCount,
            insertedCount,
            updatedCount,
            duplicateCount,
            skippedCount,
            metadataJson: {
              classificationAppliedCount,
              userTimeZone: input.range.timeZone,
            },
            finishedAt: new Date(),
          },
        }),
        this.prisma.bankConnection.update({
          where: { id: input.connection.id },
          data: {
            status: 'CONNECTED',
            lastSyncedAt: new Date(),
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        }),
      ]);

      return syncRun.id;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Bank transaction sync failed';

      await this.prisma.$transaction([
        this.prisma.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: 'FAILED',
            fetchedCount,
            insertedCount,
            updatedCount,
            duplicateCount,
            skippedCount,
            errorSummary: message,
            finishedAt: new Date(),
          },
        }),
        this.prisma.bankConnection.update({
          where: { id: input.connection.id },
          data: {
            status: 'ERROR',
            lastErrorCode: 'SYNC_ERROR',
            lastErrorMessage: message,
          },
        }),
      ]);

      throw error;
    }
  }

  private resolveTtlMinutes(input?: number): number {
    if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
      return Math.trunc(input);
    }

    const fromEnv = Number(
      this.config.get<string>('TRANSACTIONS_SYNC_TTL_MINUTES') ??
        TransactionsSyncService.DEFAULT_TTL_MINUTES,
    );

    if (Number.isFinite(fromEnv) && fromEnv > 0) {
      return Math.trunc(fromEnv);
    }

    return TransactionsSyncService.DEFAULT_TTL_MINUTES;
  }

  private async upsertBankAccount(input: {
    bankConnectionId: string;
    baseCurrency: string;
    account: {
      providerAccountId: string;
      name: string;
      mask?: string;
      type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'LOAN' | 'OTHER';
      currency: string;
      isActive: boolean;
    };
  }): Promise<{ id: string }> {
    const currency = this.normalizeCurrency(
      input.account.currency,
      input.baseCurrency,
    );

    return this.prisma.bankAccount.upsert({
      where: {
        bankConnectionId_providerAccountId: {
          bankConnectionId: input.bankConnectionId,
          providerAccountId: input.account.providerAccountId,
        },
      },
      create: {
        bankConnectionId: input.bankConnectionId,
        providerAccountId: input.account.providerAccountId,
        name: input.account.name,
        mask: input.account.mask,
        type: input.account.type,
        currency,
        isActive: input.account.isActive,
      },
      update: {
        name: input.account.name,
        mask: input.account.mask,
        type: input.account.type,
        currency,
        isActive: input.account.isActive,
      },
      select: { id: true },
    });
  }

  private async resolveBankAccountId(input: {
    bankConnectionId: string;
    providerAccountId: string;
    baseCurrency: string;
    accountMap: Map<string, string>;
  }): Promise<string> {
    const cached = input.accountMap.get(input.providerAccountId);
    if (cached) {
      return cached;
    }

    const fallbackName = `Account ${input.providerAccountId.slice(-6)}`;

    const account = await this.prisma.bankAccount.upsert({
      where: {
        bankConnectionId_providerAccountId: {
          bankConnectionId: input.bankConnectionId,
          providerAccountId: input.providerAccountId,
        },
      },
      create: {
        bankConnectionId: input.bankConnectionId,
        providerAccountId: input.providerAccountId,
        name: fallbackName,
        type: 'OTHER',
        currency: this.normalizeCurrency(undefined, input.baseCurrency),
        isActive: true,
      },
      update: {
        name: fallbackName,
      },
      select: { id: true },
    });

    input.accountMap.set(input.providerAccountId, account.id);
    return account.id;
  }

  private async upsertRawBankTransaction(input: {
    bankConnectionId: string;
    bankAccountId: string;
    item: BankTransactionRecord;
    baseCurrency: string;
  }): Promise<{ id: string; wasCreate: boolean }> {
    const existing = await this.prisma.bankTransactionRaw.findUnique({
      where: {
        bankConnectionId_providerTxId: {
          bankConnectionId: input.bankConnectionId,
          providerTxId: input.item.providerTxId,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      const created = await this.prisma.bankTransactionRaw.create({
        data: {
          bankConnectionId: input.bankConnectionId,
          bankAccountId: input.bankAccountId,
          providerTxId: input.item.providerTxId,
          payloadJson: input.item.payload as never,
          bookedAt: input.item.bookingDate ?? input.item.occurredAt,
          amountSigned: input.item.amountSigned,
          currency: this.normalizeCurrency(
            input.item.currency,
            input.baseCurrency,
          ),
          merchantName: input.item.merchant,
          description: input.item.description,
          isPending: input.item.isPending,
        },
        select: { id: true },
      });

      return { id: created.id, wasCreate: true };
    }

    await this.prisma.bankTransactionRaw.update({
      where: { id: existing.id },
      data: {
        bankAccountId: input.bankAccountId,
        payloadJson: input.item.payload as never,
        bookedAt: input.item.bookingDate ?? input.item.occurredAt,
        amountSigned: input.item.amountSigned,
        currency: this.normalizeCurrency(
          input.item.currency,
          input.baseCurrency,
        ),
        merchantName: input.item.merchant,
        description: input.item.description,
        isPending: input.item.isPending,
      },
    });

    return { id: existing.id, wasCreate: false };
  }

  private async upsertNormalizedTransaction(input: {
    userId: string;
    bankConnectionId: string;
    bankAccountId: string;
    rawRefId: string;
    item: BankTransactionRecord;
    baseCurrency: string;
  }): Promise<{
    transactionId: string;
    wasCreate: boolean;
    currentClassificationStatus: 'AUTO' | 'MANUAL' | 'UNCLASSIFIED';
    currentCategoryId: string | null;
    currentSubcategoryId: string | null;
    currentClassifiedByRuleId: string | null;
  }> {
    const dedupeHash = this.buildDedupeHash(
      input.userId,
      input.bankConnectionId,
      input.item.providerTxId,
    );

    const existing = await this.prisma.transaction.findUnique({
      where: {
        userId_dedupeHash: {
          userId: input.userId,
          dedupeHash,
        },
      },
      select: {
        id: true,
        classificationStatus: true,
        categoryId: true,
        subcategoryId: true,
        classifiedByRuleId: true,
      },
    });

    if (!existing) {
      const created = await this.prisma.transaction.create({
        data: {
          userId: input.userId,
          bankAccountId: input.bankAccountId,
          sourceType: 'BANK_API',
          externalTxId: input.item.providerTxId,
          occurredAt: input.item.occurredAt,
          bookingDate: input.item.bookingDate,
          amountSigned: input.item.amountSigned,
          currency: this.normalizeCurrency(
            input.item.currency,
            input.baseCurrency,
          ),
          merchant: input.item.merchant,
          description: input.item.description,
          isPending: input.item.isPending,
          isTransfer: input.item.isTransfer,
          dedupeHash,
          rawRefId: input.rawRefId,
          classificationStatus: 'UNCLASSIFIED',
        },
        select: {
          id: true,
          classificationStatus: true,
          categoryId: true,
          subcategoryId: true,
          classifiedByRuleId: true,
        },
      });

      return {
        transactionId: created.id,
        wasCreate: true,
        currentClassificationStatus: created.classificationStatus,
        currentCategoryId: created.categoryId,
        currentSubcategoryId: created.subcategoryId,
        currentClassifiedByRuleId: created.classifiedByRuleId,
      };
    }

    await this.prisma.transaction.update({
      where: { id: existing.id },
      data: {
        bankAccountId: input.bankAccountId,
        externalTxId: input.item.providerTxId,
        occurredAt: input.item.occurredAt,
        bookingDate: input.item.bookingDate,
        amountSigned: input.item.amountSigned,
        currency: this.normalizeCurrency(
          input.item.currency,
          input.baseCurrency,
        ),
        merchant: input.item.merchant,
        description: input.item.description,
        isPending: input.item.isPending,
        isTransfer: input.item.isTransfer,
        rawRefId: input.rawRefId,
      },
    });

    return {
      transactionId: existing.id,
      wasCreate: false,
      currentClassificationStatus: existing.classificationStatus,
      currentCategoryId: existing.categoryId,
      currentSubcategoryId: existing.subcategoryId,
      currentClassifiedByRuleId: existing.classifiedByRuleId,
    };
  }

  private buildDedupeHash(
    userId: string,
    bankConnectionId: string,
    providerTxId: string,
  ): string {
    const key = `${userId}|BANK_API|${bankConnectionId}|${providerTxId}`;
    return createHash('sha256').update(key).digest('hex');
  }

  private normalizeCurrency(
    value: string | undefined,
    fallback: string,
  ): string {
    const candidate = value?.trim().toUpperCase();
    if (candidate && /^[A-Z]{3}$/.test(candidate)) {
      return candidate;
    }

    const fallbackNormalized = fallback.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(fallbackNormalized)) {
      return fallbackNormalized;
    }

    return 'AUD';
  }
}
