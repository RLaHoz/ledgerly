import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../sourceDB/database/prisma.service';
import { CreateRuleDto } from '../dto/create-rule.dto';
import { ListRulesQueryDto } from '../dto/list-rules-query.dto';
import { ReorderRulesDto } from '../dto/reorder-rules.dto';
import { ToggleRuleDto } from '../dto/toggle-rule.dto';
import { UpdateRuleDto } from '../dto/update-rule.dto';
import { RuleEvaluatorService } from './rule-evaluator.service';

@Injectable()
export class RulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEvaluator: RuleEvaluatorService,
  ) {}

  async createRule(userId: string, dto: CreateRuleDto) {
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

    const created = await this.prisma.rule.create({
      data: {
        userId,
        name: dto.name?.trim() || this.generateFallbackRuleName(),
        type: 'AUTO_CLASSIFICATION',
        enabled: true,
        priority: dto.priority ?? 100,
        matchMode: condition.matchMode,
        conditionJson: condition as unknown as Prisma.InputJsonValue,
        actionJson: action as unknown as Prisma.InputJsonValue,
        targetCategoryId: action.categoryId,
        targetSubcategoryId: action.subcategoryId,
        createdBy: 'USER',
        isSystemManaged: false,
      },
    });

    this.ruleEvaluator.invalidateUserRulesCache(userId);

    return created;
  }

  async listRules(userId: string, query: ListRulesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.RuleWhereInput = {
      userId,
      deletedAt: null,
      type: 'AUTO_CLASSIFICATION',
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(query.categoryId ? { targetCategoryId: query.categoryId } : {}),
      ...(query.subcategoryId ? { targetSubcategoryId: query.subcategoryId } : {}),
      ...(query.q
        ? {
            name: {
              contains: query.q,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.rule.count({ where }),
      this.prisma.rule.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }

  async getRuleById(userId: string, ruleId: string) {
    return this.getOwnedRuleOrThrow(userId, ruleId);
  }

  async updateRule(userId: string, ruleId: string, dto: UpdateRuleDto) {
    const existing = await this.getOwnedRuleOrThrow(userId, ruleId);
    this.assertEditable(existing.createdBy);

    let conditionJson: Prisma.InputJsonValue | undefined;
    let actionJson: Prisma.InputJsonValue | undefined;
    let matchMode: string | undefined;
    let targetCategoryId: string | undefined;
    let targetSubcategoryId: string | null | undefined;

    if (dto.condition) {
      const parsedCondition = this.ruleEvaluator.parseAndValidateCondition(
        dto.condition,
        true,
      );
      conditionJson = parsedCondition as unknown as Prisma.InputJsonValue;
      matchMode = parsedCondition.matchMode;
    }

    if (dto.action) {
      const parsedAction = this.ruleEvaluator.parseAndValidateAction(
        {
          ...dto.action,
          classifier: dto.action.classifier ?? 'user-rule-v1',
        },
        true,
      );

      await this.assertActionTargetsBelongToUser(
        userId,
        parsedAction.categoryId,
        parsedAction.subcategoryId,
      );

      actionJson = parsedAction as unknown as Prisma.InputJsonValue;
      targetCategoryId = parsedAction.categoryId;
      targetSubcategoryId = parsedAction.subcategoryId ?? null;
    }

    const updated = await this.prisma.rule.update({
      where: { id: ruleId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(conditionJson ? { conditionJson } : {}),
        ...(actionJson ? { actionJson } : {}),
        ...(matchMode ? { matchMode: matchMode as 'KEYWORD_ONLY' | 'REGEX_ONLY' | 'KEYWORD_REGEX_HYBRID' } : {}),
        ...(targetCategoryId !== undefined ? { targetCategoryId } : {}),
        ...(targetSubcategoryId !== undefined
          ? { targetSubcategoryId }
          : {}),
      },
    });

    this.ruleEvaluator.invalidateUserRulesCache(userId);

    return updated;
  }

  async toggleRule(userId: string, ruleId: string, dto: ToggleRuleDto) {
    const existing = await this.getOwnedRuleOrThrow(userId, ruleId);
    this.assertEditable(existing.createdBy);

    const updated = await this.prisma.rule.update({
      where: { id: ruleId },
      data: { enabled: dto.enabled },
    });

    this.ruleEvaluator.invalidateUserRulesCache(userId);

    return updated;
  }

  async reorderRules(userId: string, dto: ReorderRulesDto) {
    const ruleIds = dto.items.map((item) => item.id);

    const rules = await this.prisma.rule.findMany({
      where: {
        id: { in: ruleIds },
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        createdBy: true,
      },
    });

    if (rules.length !== ruleIds.length) {
      throw new NotFoundException('One or more rules were not found');
    }

    if (rules.some((rule) => rule.createdBy === 'SYSTEM')) {
      throw new ForbiddenException('System rules cannot be reordered');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.rule.update({
          where: { id: item.id },
          data: { priority: item.priority },
        }),
      ),
    );

    this.ruleEvaluator.invalidateUserRulesCache(userId);

    return { success: true };
  }

  async softDeleteRule(userId: string, ruleId: string) {
    const existing = await this.getOwnedRuleOrThrow(userId, ruleId);
    this.assertEditable(existing.createdBy);

    await this.prisma.rule.update({
      where: { id: ruleId },
      data: {
        deletedAt: new Date(),
        enabled: false,
      },
    });

    this.ruleEvaluator.invalidateUserRulesCache(userId);

    return { success: true };
  }

  async listDefaultTemplates() {
    return this.prisma.appRuleTemplate.findMany({
      where: {
        status: 'ACTIVE',
        enabled: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        code: true,
        version: true,
        name: true,
        type: true,
        priority: true,
        matchMode: true,
        conditionJson: true,
        actionJson: true,
        targetAppCategoryId: true,
        targetAppSubcategoryId: true,
        isDefaultForNewUsers: true,
      },
    });
  }

  private async getOwnedRuleOrThrow(userId: string, ruleId: string) {
    const rule = await this.prisma.rule.findFirst({
      where: {
        id: ruleId,
        userId,
        deletedAt: null,
      },
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    return rule;
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

  private assertEditable(createdBy: 'USER' | 'SYSTEM'): void {
    if (createdBy === 'SYSTEM') {
      throw new ForbiddenException(
        'System rules are read-only. Clone to create a custom rule.',
      );
    }
  }

  private generateFallbackRuleName(): string {
    return `Auto rule ${new Date().toISOString()}`;
  }
}
