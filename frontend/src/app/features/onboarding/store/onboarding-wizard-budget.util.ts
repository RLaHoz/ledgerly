import { OnboardingCategory, OnboardingTransaction } from '../models/onboarding.models';
import {
  BackendAssignBudgetPlan,
  BackendAssignBudgetSubcategoryItem,
  BackendAssignTransactionsItem,
  TransactionClassificationSnapshot,
} from './onboarding-wizard.types';

export function buildImportedAmountBySlug(
  transactions: readonly OnboardingTransaction[],
): ReadonlyMap<string, number> {
  const totalsBySlug = new Map<string, number>();

  for (const transaction of transactions) {
    if (!transaction.categorySlug) {
      continue;
    }

    totalsBySlug.set(
      transaction.categorySlug,
      (totalsBySlug.get(transaction.categorySlug) ?? 0) + transaction.amount,
    );
  }

  return totalsBySlug;
}

export function buildImportedAmountBySubcategoryId(
  transactions: readonly OnboardingTransaction[],
): ReadonlyMap<string, number> {
  const totalsBySubcategoryId = new Map<string, number>();

  for (const transaction of transactions) {
    if (!transaction.subcategoryId) {
      continue;
    }

    totalsBySubcategoryId.set(
      transaction.subcategoryId,
      (totalsBySubcategoryId.get(transaction.subcategoryId) ?? 0) + transaction.amount,
    );
  }

  return totalsBySubcategoryId;
}

export function buildSubcategoryBudgetMapFromTransactions(
  transactions: readonly OnboardingTransaction[],
): Readonly<Record<string, number>> {
  const budgetsBySubcategoryId: Record<string, number> = {};

  for (const transaction of transactions) {
    if (!transaction.subcategoryId) {
      continue;
    }

    budgetsBySubcategoryId[transaction.subcategoryId] =
      (budgetsBySubcategoryId[transaction.subcategoryId] ?? 0) + transaction.amount;
  }

  return budgetsBySubcategoryId;
}

export function buildClassificationBaselineByTxId(
  transactions: readonly OnboardingTransaction[],
): Readonly<Record<string, TransactionClassificationSnapshot>> {
  const baselineByTxId: Record<string, TransactionClassificationSnapshot> = {};

  for (const transaction of transactions) {
    baselineByTxId[transaction.id] = {
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
      assignment: transaction.assignment,
    };
  }

  return baselineByTxId;
}

export function buildChangedManualAssignmentItems(
  transactions: readonly OnboardingTransaction[],
  baselineByTxId: Readonly<Record<string, TransactionClassificationSnapshot>>,
): readonly BackendAssignTransactionsItem[] {
  const items: BackendAssignTransactionsItem[] = [];

  for (const transaction of transactions) {
    if (transaction.assignment !== 'manual') {
      continue;
    }

    if (!transaction.categoryId || !transaction.subcategoryId) {
      continue;
    }

    const baseline = baselineByTxId[transaction.id];
    if (
      baseline &&
      baseline.categoryId === transaction.categoryId &&
      baseline.subcategoryId === transaction.subcategoryId
    ) {
      continue;
    }

    items.push({
      transactionId: transaction.id,
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
    });
  }

  return items;
}

export function buildAssignBudgetPlanPayload(input: {
  monthlyTarget: number | null;
  usedCategories: readonly OnboardingCategory[];
  subcategoryBudgetsById: Readonly<Record<string, number>>;
  importedTotalsBySubcategoryId: ReadonlyMap<string, number>;
}): BackendAssignBudgetPlan {
  const categoryBudgets = input.usedCategories.map((category) => ({
    categoryId: category.id,
    plannedAmount: normalizeBudgetAmount(category.plannedAmount),
  }));

  const subcategoryBudgets: BackendAssignBudgetSubcategoryItem[] = [];
  for (const category of input.usedCategories) {
    for (const subcategory of category.subcategories) {
      const explicitBudget = input.subcategoryBudgetsById[subcategory.id];
      const fallbackBudget = input.importedTotalsBySubcategoryId.get(subcategory.id) ?? 0;
      const resolvedBudget =
        Number.isFinite(explicitBudget) && explicitBudget >= 0 ? explicitBudget : fallbackBudget;

      subcategoryBudgets.push({
        subcategoryId: subcategory.id,
        plannedAmount: normalizeBudgetAmount(resolvedBudget),
      });
    }
  }

  return {
    monthlyTarget:
      typeof input.monthlyTarget === 'number' && Number.isFinite(input.monthlyTarget)
        ? normalizeBudgetAmount(input.monthlyTarget)
        : null,
    categoryBudgets,
    subcategoryBudgets,
  };
}

export function normalizeBudgetAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

export function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function createCategoryMaps(categories: readonly OnboardingCategory[]): {
  categoriesById: ReadonlyMap<string, OnboardingCategory>;
  categoriesBySlug: ReadonlyMap<string, OnboardingCategory>;
  subcategoriesById: ReadonlyMap<string, import('../models/onboarding.models').OnboardingSubcategory>;
} {
  const categoriesById = new Map<string, OnboardingCategory>();
  const categoriesBySlug = new Map<string, OnboardingCategory>();
  const subcategoriesById = new Map<string, import('../models/onboarding.models').OnboardingSubcategory>();

  for (const category of categories) {
    categoriesById.set(category.id, category);
    categoriesBySlug.set(category.slug, category);

    for (const subcategory of category.subcategories) {
      subcategoriesById.set(subcategory.id, subcategory);
    }
  }

  return {
    categoriesById,
    categoriesBySlug,
    subcategoriesById,
  };
}
