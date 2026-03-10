import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../sourceDB/database/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';
import type {
  CompiledRule,
  RuleActionSetCategory,
  RuleConditionAutoClassification,
  RuleEvaluationResult,
  RuleTransactionCandidate,
} from '../types/rule-condition.types';

type PersistedRule = {
  id: string;
  userId: string;
  priority: number;
  conditionJson: Prisma.JsonValue;
  actionJson: Prisma.JsonValue;
};

@Injectable()
export class RuleEvaluatorService {
  private readonly logger = new Logger(RuleEvaluatorService.name);
  private readonly compiledRulesCache = new Map<string, CompiledRule[]>();

  constructor(private readonly prisma: PrismaService) {}

  invalidateUserRulesCache(userId: string): void {
    this.compiledRulesCache.delete(userId);
  }

  async hasActiveRules(userId: string): Promise<boolean> {
    const count = await this.prisma.rule.count({
      where: {
        userId,
        type: 'AUTO_CLASSIFICATION',
        enabled: true,
        deletedAt: null,
      },
    });

    return count > 0;
  }

  async getCompiledRulesForUser(userId: string): Promise<CompiledRule[]> {
    const cached = this.compiledRulesCache.get(userId);
    if (cached) {
      return cached;
    }

    const rules = await this.prisma.rule.findMany({
      where: {
        userId,
        type: 'AUTO_CLASSIFICATION',
        enabled: true,
        deletedAt: null,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        userId: true,
        priority: true,
        conditionJson: true,
        actionJson: true,
      },
    });

    const compiled = this.compilePersistedRules(rules);
    this.compiledRulesCache.set(userId, compiled);

    return compiled;
  }

  evaluateWithCompiledRules(
    candidate: RuleTransactionCandidate,
    rules: CompiledRule[],
  ): RuleEvaluationResult {
    for (const rule of rules) {
      const conditionResult = this.evaluateCondition(candidate, rule.condition);
      if (!conditionResult.matched) {
        continue;
      }

      return {
        matched: true,
        appliedRuleId: rule.id,
        categoryId: rule.action.categoryId,
        subcategoryId: rule.action.subcategoryId,
        debug: {
          keywordHits: conditionResult.keywordHits,
          regexMatched: conditionResult.regexMatched,
          reason: conditionResult.reason,
        },
      };
    }

    return {
      matched: false,
      debug: {
        keywordHits: 0,
        regexMatched: false,
        reason: 'No rule matched candidate transaction',
      },
    };
  }

  evaluateAdhocRule(input: {
    candidate: RuleTransactionCandidate;
    condition: RuleConditionAutoClassification;
    action: RuleActionSetCategory;
  }): RuleEvaluationResult {
    this.validateCondition(input.condition, true);
    this.validateAction(input.action, true);

    const conditionResult = this.evaluateCondition(
      input.candidate,
      input.condition,
    );

    if (!conditionResult.matched) {
      return {
        matched: false,
        debug: {
          keywordHits: conditionResult.keywordHits,
          regexMatched: conditionResult.regexMatched,
          reason: conditionResult.reason,
        },
      };
    }

    return {
      matched: true,
      categoryId: input.action.categoryId,
      subcategoryId: input.action.subcategoryId,
      debug: {
        keywordHits: conditionResult.keywordHits,
        regexMatched: conditionResult.regexMatched,
        reason: conditionResult.reason,
      },
    };
  }

  parseAndValidateCondition(
    conditionJson: unknown,
    strict = true,
  ): RuleConditionAutoClassification {
    const value = conditionJson as Partial<RuleConditionAutoClassification>;

    const normalized: RuleConditionAutoClassification = {
      kind: 'merchant_text_match',
      matchMode: value.matchMode ?? 'KEYWORD_REGEX_HYBRID',
      direction: value.direction ?? 'debit',
      keywords: this.normalizeKeywords(value.keywords ?? []),
      regex:
        typeof value.regex === 'string' && value.regex.trim().length > 0
          ? value.regex.trim()
          : undefined,
      minKeywordHits:
        typeof value.minKeywordHits === 'number'
          ? Math.trunc(value.minKeywordHits)
          : undefined,
      amountMin:
        typeof value.amountMin === 'number'
          ? Number(value.amountMin)
          : undefined,
      amountMax:
        typeof value.amountMax === 'number'
          ? Number(value.amountMax)
          : undefined,
      excludeMerchants: this.normalizeExclusions(value.excludeMerchants ?? []),
      recurringOnly: Boolean(value.recurringOnly),
    };

    this.validateCondition(normalized, strict);

    return normalized;
  }

  parseAndValidateAction(
    actionJson: unknown,
    strict = true,
  ): RuleActionSetCategory {
    const value = actionJson as Partial<RuleActionSetCategory>;

    const normalized: RuleActionSetCategory = {
      action: 'set_category',
      categoryId: value.categoryId ?? '',
      subcategoryId: value.subcategoryId,
      classifier: value.classifier ?? 'user-rule-v1',
    };

    this.validateAction(normalized, strict);

    return normalized;
  }

  private compilePersistedRules(rules: PersistedRule[]): CompiledRule[] {
    const compiled: CompiledRule[] = [];

    for (const rule of rules) {
      try {
        const condition = this.parseAndValidateCondition(
          rule.conditionJson,
          false,
        );
        const action = this.parseAndValidateAction(rule.actionJson, false);

        compiled.push({
          id: rule.id,
          userId: rule.userId,
          priority: rule.priority,
          condition,
          action,
        });
      } catch (error) {
        this.logger.warn(
          `Skipping invalid rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return compiled.sort((left, right) => left.priority - right.priority);
  }

  private evaluateCondition(
    candidate: RuleTransactionCandidate,
    condition: RuleConditionAutoClassification,
  ): {
    matched: boolean;
    keywordHits: number;
    regexMatched: boolean;
    reason: string;
  } {
    const candidateDirection = this.resolveDirection(candidate.amountSigned);
    if (candidateDirection !== condition.direction) {
      return {
        matched: false,
        keywordHits: 0,
        regexMatched: false,
        reason: `Direction mismatch (${candidateDirection} != ${condition.direction})`,
      };
    }

    if (condition.recurringOnly && !candidate.isRecurring) {
      return {
        matched: false,
        keywordHits: 0,
        regexMatched: false,
        reason: 'Rule applies only to recurring transactions',
      };
    }

    const absoluteAmount = Math.abs(candidate.amountSigned);
    if (
      typeof condition.amountMin === 'number' &&
      absoluteAmount < condition.amountMin
    ) {
      return {
        matched: false,
        keywordHits: 0,
        regexMatched: false,
        reason: `Amount ${absoluteAmount} is below minimum ${condition.amountMin}`,
      };
    }

    if (
      typeof condition.amountMax === 'number' &&
      absoluteAmount > condition.amountMax
    ) {
      return {
        matched: false,
        keywordHits: 0,
        regexMatched: false,
        reason: `Amount ${absoluteAmount} exceeds maximum ${condition.amountMax}`,
      };
    }

    const normalizedMerchant = this.normalizeText(candidate.merchant ?? '');
    if (
      condition.excludeMerchants?.some((excluded) =>
        normalizedMerchant.includes(excluded),
      )
    ) {
      return {
        matched: false,
        keywordHits: 0,
        regexMatched: false,
        reason: 'Merchant is excluded by rule',
      };
    }

    const searchableText = this.normalizeText(
      `${candidate.merchant ?? ''} ${candidate.description}`,
    );

    const keywordHits = this.countKeywordHits(
      searchableText,
      condition.keywords,
    );
    const regexMatched =
      typeof condition.regex === 'string' && condition.regex.length > 0
        ? new RegExp(condition.regex, 'i').test(searchableText)
        : false;

    const minKeywordHits = condition.minKeywordHits ?? 1;

    let matched = false;
    if (condition.matchMode === 'KEYWORD_ONLY') {
      matched = keywordHits >= minKeywordHits;
    } else if (condition.matchMode === 'REGEX_ONLY') {
      matched = regexMatched;
    } else {
      matched = regexMatched || keywordHits >= minKeywordHits;
    }

    return {
      matched,
      keywordHits,
      regexMatched,
      reason: matched
        ? `Matched (${condition.matchMode})`
        : `No textual match (${condition.matchMode})`,
    };
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private normalizeKeywords(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return [...new Set(value.map((item) => String(item).trim().toLowerCase()))]
      .filter((item) => item.length > 0)
      .slice(0, 40);
  }

  private normalizeExclusions(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return [...new Set(value.map((item) => String(item).trim().toLowerCase()))]
      .filter((item) => item.length > 0)
      .slice(0, 20);
  }

  private countKeywordHits(text: string, keywords: string[]): number {
    if (!keywords.length) {
      return 0;
    }

    let hits = 0;
    for (const keyword of keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matcher = new RegExp(`\\b${escaped}\\b`, 'i');
      if (matcher.test(text)) {
        hits += 1;
      }
    }

    return hits;
  }

  private resolveDirection(amountSigned: number): 'debit' | 'credit' {
    return amountSigned < 0 ? 'debit' : 'credit';
  }

  private validateCondition(
    condition: RuleConditionAutoClassification,
    strict: boolean,
  ): void {
    if (condition.kind !== 'merchant_text_match') {
      throw new BadRequestException('Unsupported condition kind');
    }

    if (
      !['KEYWORD_ONLY', 'REGEX_ONLY', 'KEYWORD_REGEX_HYBRID'].includes(
        condition.matchMode,
      )
    ) {
      throw new BadRequestException('Invalid matchMode');
    }

    if (!['debit', 'credit'].includes(condition.direction)) {
      throw new BadRequestException('Invalid direction');
    }

    if (
      condition.matchMode !== 'REGEX_ONLY' &&
      condition.keywords.length === 0
    ) {
      throw new BadRequestException('At least one keyword is required');
    }

    if (condition.matchMode !== 'KEYWORD_ONLY' && !condition.regex) {
      if (strict) {
        throw new BadRequestException(
          'Regex is required for current match mode',
        );
      }
    }

    if (condition.regex) {
      if (condition.regex.length > 256) {
        throw new BadRequestException('Regex exceeds 256 characters');
      }

      try {
        // Compile once to fail fast on invalid syntax.

        new RegExp(condition.regex, 'i');
      } catch {
        throw new BadRequestException('Invalid regex syntax');
      }
    }

    if (
      typeof condition.amountMin === 'number' &&
      typeof condition.amountMax === 'number' &&
      condition.amountMin > condition.amountMax
    ) {
      throw new BadRequestException(
        'amountMin cannot be greater than amountMax',
      );
    }
  }

  private validateAction(action: RuleActionSetCategory, strict: boolean): void {
    if (action.action !== 'set_category') {
      throw new BadRequestException('Unsupported action type');
    }

    if (!action.categoryId) {
      throw new BadRequestException('categoryId is required');
    }

    if (
      action.classifier &&
      !['user-rule-v1', 'system-rules-v2'].includes(action.classifier)
    ) {
      throw new BadRequestException('Invalid classifier');
    }

    if (!action.classifier && strict) {
      throw new BadRequestException('classifier is required');
    }
  }
}
