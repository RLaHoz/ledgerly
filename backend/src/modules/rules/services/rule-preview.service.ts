import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../sourceDB/database/prisma.service';
import { PreviewRuleDto } from '../dto/preview-rule.dto';
import { TestRuleDto } from '../dto/test-rule.dto';
import { RuleEvaluatorService } from './rule-evaluator.service';

@Injectable()
export class RulePreviewService {
  private static readonly DEFAULT_RANGE_DAYS = 30;
  private static readonly MAX_RANGE_DAYS = 90;
  private static readonly MAX_SCANNED_TRANSACTIONS = 5000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEvaluator: RuleEvaluatorService,
  ) {}

  async previewRule(userId: string, dto: PreviewRuleDto) {
    const condition = this.ruleEvaluator.parseAndValidateCondition(dto.condition, true);
    const action = this.ruleEvaluator.parseAndValidateAction(
      {
        ...dto.action,
        classifier: dto.action.classifier ?? 'user-rule-v1',
      },
      true,
    );

    await this.assertActionTargetsBelongToUser(
      userId,
      action.categoryId,
      action.subcategoryId,
    );

    const range = this.resolveDateRange(dto.from, dto.to);
    const sampleLimit = dto.limit ?? 20;

    const [scannedCount, transactions] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          userId,
          occurredAt: {
            gte: range.from,
            lte: range.to,
          },
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          occurredAt: {
            gte: range.from,
            lte: range.to,
          },
        },
        orderBy: { occurredAt: 'desc' },
        take: RulePreviewService.MAX_SCANNED_TRANSACTIONS,
        select: {
          id: true,
          merchant: true,
          description: true,
          amountSigned: true,
          occurredAt: true,
          isPending: true,
          isTransfer: true,
        },
      }),
    ]);

    const matches: Array<{
      transactionId: string;
      merchant: string | null;
      description: string;
      amountSigned: number;
      occurredAt: Date;
      debug: { reason: string; keywordHits: number; regexMatched: boolean };
    }> = [];

    for (const transaction of transactions) {
      const evaluation = this.ruleEvaluator.evaluateAdhocRule({
        candidate: {
          id: transaction.id,
          merchant: transaction.merchant,
          description: transaction.description,
          amountSigned: Number(transaction.amountSigned),
          isPending: transaction.isPending,
          isTransfer: transaction.isTransfer,
        },
        condition,
        action,
      });

      if (!evaluation.matched) {
        continue;
      }

      matches.push({
        transactionId: transaction.id,
        merchant: transaction.merchant,
        description: transaction.description,
        amountSigned: Number(transaction.amountSigned),
        occurredAt: transaction.occurredAt,
        debug: evaluation.debug,
      });
    }

    return {
      range,
      scannedCount,
      scannedCountCapped: Math.min(
        scannedCount,
        RulePreviewService.MAX_SCANNED_TRANSACTIONS,
      ),
      matchedCount: matches.length,
      sample: matches.slice(0, Math.min(sampleLimit, 100)),
      appliedAction: {
        categoryId: action.categoryId,
        subcategoryId: action.subcategoryId ?? null,
        classifier: action.classifier,
      },
    };
  }

  testRule(dto: TestRuleDto) {
    const condition = this.ruleEvaluator.parseAndValidateCondition(dto.condition, true);
    const action = this.ruleEvaluator.parseAndValidateAction(
      {
        ...dto.action,
        classifier: dto.action.classifier ?? 'user-rule-v1',
      },
      true,
    );

    const evaluation = this.ruleEvaluator.evaluateAdhocRule({
      candidate: {
        merchant: dto.transaction.merchant,
        description: dto.transaction.description,
        amountSigned: dto.transaction.amountSigned,
        isPending: dto.transaction.isPending,
        isTransfer: dto.transaction.isTransfer,
        isRecurring: dto.transaction.isRecurring,
      },
      condition,
      action,
    });

    return {
      matched: evaluation.matched,
      debug: evaluation.debug,
      appliedAction: evaluation.matched
        ? {
            categoryId: action.categoryId,
            subcategoryId: action.subcategoryId ?? null,
            classifier: action.classifier,
          }
        : null,
    };
  }

  private resolveDateRange(from?: string, to?: string): { from: Date; to: Date } {
    const now = new Date();
    const resolvedTo = to ? new Date(to) : now;
    const resolvedFrom =
      from ??
      new Date(
        now.getTime() - RulePreviewService.DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

    const parsedFrom = new Date(resolvedFrom);

    if (Number.isNaN(parsedFrom.getTime()) || Number.isNaN(resolvedTo.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    if (parsedFrom > resolvedTo) {
      throw new BadRequestException('Invalid range: from must be before to');
    }

    const daysDiff =
      (resolvedTo.getTime() - parsedFrom.getTime()) / (24 * 60 * 60 * 1000);

    if (daysDiff > RulePreviewService.MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${RulePreviewService.MAX_RANGE_DAYS} days`,
      );
    }

    return {
      from: parsedFrom,
      to: resolvedTo,
    };
  }

  private async assertActionTargetsBelongToUser(
    userId: string,
    categoryId: string,
    subcategoryId?: string,
  ): Promise<void> {
    const category = await this.prisma.budgetCategory.findFirst({
      where: {
        id: categoryId,
        userId,
        isArchived: false,
      },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException('Category does not belong to current user');
    }

    if (!subcategoryId) {
      return;
    }

    const subcategory = await this.prisma.budgetSubcategory.findFirst({
      where: {
        id: subcategoryId,
        userId,
        categoryId,
        isArchived: false,
      },
      select: { id: true },
    });

    if (!subcategory) {
      throw new BadRequestException(
        'Subcategory does not belong to current user/category',
      );
    }
  }
}
