import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { SpendClassificationService } from '../../spend-classification/services/spend-classification.service';
import { PrismaService } from '../../../sourceDB/database/prisma.service';
import { CategoryTransactionCsvIngestResponseDto } from '../dto/category-transaction-csv-ingest-response.dto';
import { CategoryCsvParserService } from './category-csv-parser.service';
import { RuleEvaluatorService } from '../../rules/services/rule-evaluator.service';

/**
 * Handles CSV -> transactions ingestion and initial category classification.
 */
@Injectable()
export class CategoryTransactionImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryCsvParser: CategoryCsvParserService,
    private readonly spendClassificationService: SpendClassificationService,
    private readonly ruleEvaluatorService: RuleEvaluatorService,
  ) {}

  async ingestCsv(
    userId: string,
    fileBuffer: Buffer,
  ): Promise<CategoryTransactionCsvIngestResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, baseCurrency: true, onboardingCompletedAt: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isFirstOnboardingFlow = !user.onboardingCompletedAt;

    const importRun = await this.prisma.importRun.create({
      data: {
        userId,
        source: 'csv',
        status: 'RUNNING',
      },
      select: { id: true },
    });

    let receivedCount = 0;
    let insertedCount = 0;
    let duplicatedCount = 0;
    let classifiedCount = 0;
    let unclassifiedCount = 0;
    let suggestionsCreated = 0;

    try {
      const rows = this.categoryCsvParser.parseAndNormalize(fileBuffer);
      receivedCount = rows.length;

      const appCategoryCatalog = await this.prisma.appCategoryList.findMany({
        where: { isActive: true },
        select: { slug: true, name: true, ionIcon: true, colorHex: true },
      });

      const shouldAttemptRules = !isFirstOnboardingFlow;
      const [hasActiveRules, compiledRules] = shouldAttemptRules
        ? await Promise.all([
            this.ruleEvaluatorService.hasActiveRules(userId),
            this.ruleEvaluatorService.getCompiledRulesForUser(userId),
          ])
        : [false, []];

      const userCategoryIdBySlug = new Map<string, string>();
      if (!isFirstOnboardingFlow) {
        const userCategories = await this.prisma.budgetCategory.findMany({
          where: { userId, isArchived: false },
          select: { id: true, slug: true },
        });

        for (const category of userCategories) {
          userCategoryIdBySlug.set(category.slug, category.id);
        }
      }

      for (const row of rows) {
        const dedupeHash = this.buildDedupeHash(
          userId,
          row.occurredAt.toISOString(),
          row.amountSigned,
          row.description,
        );

        const existingTransaction = await this.prisma.transaction.findUnique({
          where: {
            userId_dedupeHash: { userId, dedupeHash },
          },
          select: { id: true },
        });

        if (existingTransaction) {
          duplicatedCount += 1;
          continue;
        }

        let categoryId: string | null = null;
        let subcategoryId: string | null = null;
        let classifiedByRuleId: string | null = null;
        let classifiedAt: Date | null = null;
        let classificationStatus: 'AUTO' | 'UNCLASSIFIED' = 'UNCLASSIFIED';
        let confidenceScore: number | null = null;
        let fallbackClassificationSlug: string | null = null;
        let fallbackClassificationReason: string | null = null;

        if (hasActiveRules && compiledRules.length > 0) {
          const evaluation =
            this.ruleEvaluatorService.evaluateWithCompiledRules(
              {
                merchant: row.merchant,
                description: row.description,
                amountSigned: row.amountSigned,
                isPending: false,
                isTransfer: false,
              },
              compiledRules,
            );

          if (evaluation.matched && evaluation.categoryId) {
            categoryId = evaluation.categoryId;
            subcategoryId = evaluation.subcategoryId ?? null;
            classifiedByRuleId = evaluation.appliedRuleId ?? null;
            classifiedAt = new Date();
            classificationStatus = 'AUTO';
            confidenceScore = 1;
          }
        }

        if (!categoryId) {
          const classificationMatch = this.spendClassificationService.classify(
            `${row.merchant} ${row.description}`,
            appCategoryCatalog.map((item) => ({
              slug: item.slug,
              name: item.name,
            })),
          );

          fallbackClassificationSlug = classificationMatch.slug;
          fallbackClassificationReason = classificationMatch.reason;
          confidenceScore = classificationMatch.confidence;

          const canAutoAssignWithFallback =
            classificationMatch.slug !== null &&
            classificationMatch.confidence >= 0.9 &&
            !isFirstOnboardingFlow &&
            !hasActiveRules;

          categoryId =
            canAutoAssignWithFallback && classificationMatch.slug
              ? (userCategoryIdBySlug.get(classificationMatch.slug) ?? null)
              : null;
          classificationStatus = categoryId ? 'AUTO' : 'UNCLASSIFIED';
        }

        const createdTransaction = await this.prisma.transaction.create({
          data: {
            userId,
            importRunId: importRun.id,
            sourceType: 'CSV',
            occurredAt: row.occurredAt,
            amountSigned: row.amountSigned,
            currency: user.baseCurrency,
            merchant: row.merchant,
            description: row.description,
            dedupeHash,
            classificationStatus,
            confidenceScore,
            categoryId,
            subcategoryId,
            classifiedByRuleId,
            classifiedAt,
          },
          select: { id: true },
        });

        insertedCount += 1;

        if (categoryId) {
          classifiedCount += 1;

          if (classifiedByRuleId) {
            await this.prisma.ruleExecution.create({
              data: {
                ruleId: classifiedByRuleId,
                transactionId: createdTransaction.id,
                outcome: 'APPLIED',
                message: 'Rule applied during CSV import',
                matchDetailsJson: {
                  source: 'csv-import',
                },
              },
            });
          }

          continue;
        }

        unclassifiedCount += 1;

        const suggestedCategory = appCategoryCatalog.find(
          (item) => item.slug === fallbackClassificationSlug,
        );

        await this.prisma.categorySuggestion.create({
          data: {
            userId,
            transactionId: createdTransaction.id,
            suggestedName: suggestedCategory?.name ?? 'Uncategorized Candidate',
            suggestedSlug: suggestedCategory?.slug ?? 'uncategorized',
            ionIcon: suggestedCategory?.ionIcon ?? 'help-circle-outline',
            colorHex: suggestedCategory?.colorHex ?? '#64748B',
            reason:
              fallbackClassificationReason ??
              'No automatic rule matched this transaction',
            confidenceScore: confidenceScore ?? 0,
            status: 'PENDING',
          },
        });

        suggestionsCreated += 1;
      }

      await this.prisma.importRun.update({
        where: { id: importRun.id },
        data: {
          status: 'SUCCESS',
          receivedCount,
          insertedCount,
          duplicatedCount,
          classifiedCount,
          unclassifiedCount,
          finishedAt: new Date(),
        },
      });

      return {
        importRunId: importRun.id,
        firstTimeUser: isFirstOnboardingFlow,
        receivedCount,
        insertedCount,
        duplicatedCount,
        classifiedCount,
        unclassifiedCount,
        suggestionsCreated,
      };
    } catch (error) {
      await this.prisma.importRun.update({
        where: { id: importRun.id },
        data: {
          status: 'FAILED',
          receivedCount,
          insertedCount,
          duplicatedCount,
          classifiedCount,
          unclassifiedCount,
          finishedAt: new Date(),
          errorSummary:
            error instanceof Error ? error.message : 'CSV ingestion failed',
        },
      });

      throw error;
    }
  }

  private buildDedupeHash(
    userId: string,
    occurredAtIso: string,
    amountSigned: number,
    description: string,
  ): string {
    const key = `${userId}|${occurredAtIso}|${amountSigned.toFixed(2)}|${description.toLowerCase()}`;
    return createHash('sha256').update(key).digest('hex');
  }
}
