import { Injectable } from '@nestjs/common';
import type { CompiledRule, RuleTransactionCandidate } from '../../rules/types/rule-condition.types';
import { RuleEvaluatorService } from '../../rules/services/rule-evaluator.service';
import { PrismaService } from '../../../sourceDB/database/prisma.service';

@Injectable()
export class TransactionsClassificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEvaluator: RuleEvaluatorService,
  ) {}

  async classifyIfNeeded(input: {
    userId: string;
    transactionId: string;
    currentClassificationStatus: 'AUTO' | 'MANUAL' | 'UNCLASSIFIED';
    currentCategoryId: string | null;
    currentSubcategoryId: string | null;
    currentClassifiedByRuleId: string | null;
    candidate: RuleTransactionCandidate;
    compiledRules: CompiledRule[];
  }): Promise<{ applied: boolean; reason: string }> {
    if (input.currentClassificationStatus === 'MANUAL') {
      return { applied: false, reason: 'manual_override' };
    }

    if (input.compiledRules.length === 0) {
      if (
        input.currentClassificationStatus === 'UNCLASSIFIED' &&
        input.currentCategoryId === null &&
        input.currentSubcategoryId === null
      ) {
        return { applied: false, reason: 'already_unclassified' };
      }

      await this.prisma.transaction.update({
        where: { id: input.transactionId },
        data: {
          classificationStatus: 'UNCLASSIFIED',
          categoryId: null,
          subcategoryId: null,
          classifiedByRuleId: null,
          classifiedAt: null,
        },
      });

      return { applied: true, reason: 'rules_empty_unclassified' };
    }

    const evaluation = this.ruleEvaluator.evaluateWithCompiledRules(
      input.candidate,
      input.compiledRules,
    );

    if (!evaluation.matched || !evaluation.categoryId) {
      if (
        input.currentClassificationStatus === 'UNCLASSIFIED' &&
        input.currentCategoryId === null &&
        input.currentSubcategoryId === null
      ) {
        return { applied: false, reason: 'no_rule_match_no_change' };
      }

      await this.prisma.transaction.update({
        where: { id: input.transactionId },
        data: {
          classificationStatus: 'UNCLASSIFIED',
          categoryId: null,
          subcategoryId: null,
          classifiedByRuleId: null,
          classifiedAt: null,
        },
      });

      return { applied: true, reason: 'no_rule_match_set_unclassified' };
    }

    const nextSubcategoryId = evaluation.subcategoryId ?? null;
    const nextRuleId = evaluation.appliedRuleId ?? null;

    const unchanged =
      input.currentClassificationStatus === 'AUTO' &&
      input.currentCategoryId === evaluation.categoryId &&
      input.currentSubcategoryId === nextSubcategoryId &&
      input.currentClassifiedByRuleId === nextRuleId;

    if (unchanged) {
      return { applied: false, reason: 'rule_match_no_change' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: input.transactionId },
        data: {
          classificationStatus: 'AUTO',
          categoryId: evaluation.categoryId,
          subcategoryId: nextSubcategoryId,
          classifiedByRuleId: nextRuleId,
          classifiedAt: new Date(),
          confidenceScore: 1,
        },
      });

      if (nextRuleId) {
        await tx.ruleExecution.create({
          data: {
            ruleId: nextRuleId,
            transactionId: input.transactionId,
            outcome: 'APPLIED',
            message: 'Rule applied during bank sync',
            matchDetailsJson: {
              keywordHits: evaluation.debug.keywordHits,
              regexMatched: evaluation.debug.regexMatched,
              reason: evaluation.debug.reason,
              source: 'bank-sync',
            },
          },
        });
      }
    });

    return { applied: true, reason: 'rule_applied' };
  }
}
