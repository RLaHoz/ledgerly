import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from 'src/sourceDB/database/prisma.service';
import { CsvParserService } from './csv-parser.service';
import { SpendClassificationService } from 'src/modules/spend-classification/services/spend-classification.service';
import { IngestCsvResponseDto } from '../dto/ingest-csv-response.dto';

/**
 * Orchestrates CSV ingestion:
 * parse -> dedupe -> classify -> persist -> finalize import run.
 */
@Injectable()
export class FinancialDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParser: CsvParserService,
    private readonly spendClassification: SpendClassificationService,
  ) {}

  async ingestCsv(
    userId: string,
    fileBuffer: Buffer,
  ): Promise<IngestCsvResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, baseCurrency: true, onboardingCompletedAt: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const firstTimeUser = !user.onboardingCompletedAt;

    const run = await this.prisma.importRun.create({
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
      const rows = this.csvParser.parseAndNormalize(fileBuffer);
      receivedCount = rows.length;

      const appCatalog = await this.prisma.appCategoryList.findMany({
        where: { isActive: true },
        select: { slug: true, name: true, ionIcon: true, colorHex: true },
      });

      const userCategoryBySlug = new Map<string, string>();
      if (!firstTimeUser) {
        const userCategories = await this.prisma.budgetCategory.findMany({
          where: { userId, isArchived: false },
          select: { id: true, slug: true },
        });

        for (const c of userCategories) {
          userCategoryBySlug.set(c.slug, c.id);
        }
      }

      for (const row of rows) {
        const dedupeHash = this.buildDedupeHash(
          userId,
          row.occurredAt.toISOString(),
          row.amountSigned,
          row.description,
        );

        const existing = await this.prisma.transaction.findUnique({
          where: {
            userId_dedupeHash: { userId, dedupeHash },
          },
          select: { id: true },
        });

        if (existing) {
          duplicatedCount += 1;
          continue;
        }

        const match = this.spendClassification.classify(
          `${row.merchant} ${row.description}`,
          appCatalog.map((c) => ({ slug: c.slug, name: c.name })),
        );

        const canAutoAssign =
          match.slug !== null && match.confidence >= 0.9 && !firstTimeUser;
        const categoryId =
          canAutoAssign && match.slug
            ? (userCategoryBySlug.get(match.slug) ?? null)
            : null;

        const tx = await this.prisma.transaction.create({
          data: {
            userId,
            importRunId: run.id,
            sourceType: 'CSV',
            occurredAt: row.occurredAt,
            amountSigned: row.amountSigned,
            currency: user.baseCurrency,
            merchant: row.merchant,
            description: row.description,
            dedupeHash,
            classificationStatus: categoryId ? 'AUTO' : 'UNCLASSIFIED',
            confidenceScore: match.confidence,
            categoryId,
          },
          select: { id: true },
        });

        insertedCount += 1;

        if (categoryId) {
          classifiedCount += 1;
        } else {
          unclassifiedCount += 1;

          const suggested = appCatalog.find((c) => c.slug === match.slug);
          await this.prisma.categorySuggestion.create({
            data: {
              userId,
              transactionId: tx.id,
              suggestedName: suggested?.name ?? 'Uncategorized Candidate',
              suggestedSlug: suggested?.slug ?? 'uncategorized',
              ionIcon: suggested?.ionIcon ?? 'help-circle-outline',
              colorHex: suggested?.colorHex ?? '#64748B',
              reason: match.reason,
              confidenceScore: match.confidence,
              status: 'PENDING',
            },
          });

          suggestionsCreated += 1;
        }
      }

      await this.prisma.importRun.update({
        where: { id: run.id },
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
        importRunId: run.id,
        firstTimeUser,
        receivedCount,
        insertedCount,
        duplicatedCount,
        classifiedCount,
        unclassifiedCount,
        suggestionsCreated,
      };
    } catch (error) {
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          receivedCount,
          insertedCount,
          duplicatedCount,
          classifiedCount,
          unclassifiedCount,
          finishedAt: new Date(),
          errorSummary:
            error instanceof Error ? error.message : 'Ingestion failed',
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
