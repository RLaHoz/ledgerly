import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../sourceDB/database/prisma.service';
import { RuleEvaluatorService } from './rule-evaluator.service';

@Injectable()
export class RuleProvisioningService {
  private readonly logger = new Logger(RuleProvisioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEvaluator: RuleEvaluatorService,
  ) {}

  async installDefaultTemplatesForUser(userId: string): Promise<{
    templatesFound: number;
    createdRules: number;
    skippedRules: number;
  }> {
    const templates = await this.prisma.appRuleTemplate.findMany({
      where: {
        status: 'ACTIVE',
        enabled: true,
        isDefaultForNewUsers: true,
        type: 'AUTO_CLASSIFICATION',
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        version: true,
        name: true,
        type: true,
        priority: true,
        matchMode: true,
        conditionJson: true,
        actionJson: true,
        targetAppCategoryId: true,
        targetAppSubcategoryId: true,
      },
    });

    if (!templates.length) {
      return { templatesFound: 0, createdRules: 0, skippedRules: 0 };
    }

    const [existingRules, userCategories, userSubcategories] = await Promise.all([
      this.prisma.rule.findMany({
        where: {
          userId,
          sourceTemplateId: { not: null },
          deletedAt: null,
        },
        select: {
          sourceTemplateId: true,
          sourceTemplateVersion: true,
        },
      }),
      this.prisma.budgetCategory.findMany({
        where: {
          userId,
          isArchived: false,
          appCategoryId: { not: null },
        },
        select: {
          id: true,
          appCategoryId: true,
        },
      }),
      this.prisma.budgetSubcategory.findMany({
        where: {
          userId,
          isArchived: false,
          appSubcategoryId: { not: null },
        },
        select: {
          id: true,
          categoryId: true,
          appSubcategoryId: true,
        },
      }),
    ]);

    const existingTemplateKeys = new Set(
      existingRules.map(
        (rule) => `${rule.sourceTemplateId ?? 'none'}::${rule.sourceTemplateVersion ?? 0}`,
      ),
    );

    const userCategoryByAppCategoryId = new Map<string, string>();
    for (const category of userCategories) {
      if (category.appCategoryId) {
        userCategoryByAppCategoryId.set(category.appCategoryId, category.id);
      }
    }

    const userSubcategoryByAppSubcategoryId = new Map<
      string,
      { id: string; categoryId: string }
    >();
    for (const subcategory of userSubcategories) {
      if (subcategory.appSubcategoryId) {
        userSubcategoryByAppSubcategoryId.set(subcategory.appSubcategoryId, {
          id: subcategory.id,
          categoryId: subcategory.categoryId,
        });
      }
    }

    let createdRules = 0;
    let skippedRules = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const template of templates) {
        const templateKey = `${template.id}::${template.version}`;

        if (existingTemplateKeys.has(templateKey)) {
          skippedRules += 1;
          continue;
        }

        const condition = this.ruleEvaluator.parseAndValidateCondition(
          template.conditionJson,
          false,
        );

        const action = this.ruleEvaluator.parseAndValidateAction(
          template.actionJson,
          false,
        );

        const mappedCategoryId = template.targetAppCategoryId
          ? userCategoryByAppCategoryId.get(template.targetAppCategoryId)
          : action.categoryId;

        if (!mappedCategoryId) {
          skippedRules += 1;
          continue;
        }

        const mappedSubcategory = template.targetAppSubcategoryId
          ? userSubcategoryByAppSubcategoryId.get(template.targetAppSubcategoryId)
          : undefined;

        const mappedSubcategoryId = mappedSubcategory?.id;

        const hydratedAction = {
          ...action,
          categoryId: mappedCategoryId,
          subcategoryId: mappedSubcategoryId,
          classifier: 'system-rules-v2' as const,
        };

        await tx.rule.create({
          data: {
            userId,
            sourceTemplateId: template.id,
            sourceTemplateVersion: template.version,
            isSystemManaged: true,
            name: template.name,
            type: template.type,
            enabled: true,
            priority: template.priority,
            matchMode: template.matchMode,
            conditionJson: condition as unknown as Prisma.InputJsonValue,
            actionJson: hydratedAction as unknown as Prisma.InputJsonValue,
            targetCategoryId: mappedCategoryId,
            targetSubcategoryId: mappedSubcategoryId,
            createdBy: 'SYSTEM',
          },
        });

        createdRules += 1;
      }
    });

    if (createdRules > 0) {
      this.ruleEvaluator.invalidateUserRulesCache(userId);
      this.logger.log(
        `Installed ${createdRules} default rules for user ${userId}. Skipped ${skippedRules}.`,
      );
    }

    return {
      templatesFound: templates.length,
      createdRules,
      skippedRules,
    };
  }
}
