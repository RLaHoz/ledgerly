import { HttpErrorResponse } from '@angular/common/http';
import {
  AssignmentType,
  OnboardingCategory,
  OnboardingSubcategory,
  OnboardingTransaction,
} from '../models/onboarding.models';
import {
  BackendClassificationStatus,
  BackendGroupedCategoryBucket,
  BackendTransactionListItem,
  BackendUserCategory,
  DEFAULT_CATEGORY_ICON,
  DEFAULT_SUBCATEGORY_ICON,
} from './onboarding-wizard.types';
import {
  normalizeCategoryName,
  normalizeColorHex,
  normalizeSlug,
  sanitizeIconName,
} from './onboarding-wizard-import.util';

export function resolveLoadUserTransactionsError(error: unknown): {
  message: string;
  requiresBankReconnect: boolean;
} {
  if (error instanceof HttpErrorResponse) {
    const rawMessage = extractBackendMessage(error);
    const normalizedMessage = rawMessage.toLowerCase();
    const hasBasiqSyncAuthFailure =
      normalizedMessage.includes('basiq') ||
      normalizedMessage.includes('sync bank transactions') ||
      normalizedMessage.includes('no_connections') ||
      normalizedMessage.includes('connection');

    if ([401, 403, 503].includes(error.status) && hasBasiqSyncAuthFailure) {
      return {
        message: 'Bank connection unavailable. Reconnect Basiq from Auth to continue onboarding.',
        requiresBankReconnect: true,
      };
    }

    if (error.status === 0) {
      return {
        message: 'Network unavailable while loading transactions. Please retry.',
        requiresBankReconnect: false,
      };
    }

    if (rawMessage.trim().length > 0) {
      return {
        message: rawMessage,
        requiresBankReconnect: false,
      };
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    const normalizedMessage = error.message.toLowerCase();
    if (
      normalizedMessage.includes('basiq') ||
      normalizedMessage.includes('sync bank transactions')
    ) {
      return {
        message: 'Bank connection unavailable. Reconnect Basiq from Auth to continue onboarding.',
        requiresBankReconnect: true,
      };
    }

    return {
      message: error.message,
      requiresBankReconnect: false,
    };
  }

  return {
    message: 'Failed to load bank transactions.',
    requiresBankReconnect: false,
  };
}

export function resolveSaveClassificationsErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'error' in error &&
    typeof (error as { error?: unknown }).error === 'object'
  ) {
    const payload = (error as { error?: { message?: unknown } }).error;
    if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Failed to save transaction assignments.';
}

export function mapBackendTransactionsToOnboarding(
  backendCategories: readonly BackendGroupedCategoryBucket[],
  onboardingCategories: readonly OnboardingCategory[],
): OnboardingTransaction[] {
  const categoryById = new Map(
    onboardingCategories.map((category) => [category.id, category] as const),
  );
  const subcategoryById = new Map<string, OnboardingSubcategory>();

  for (const category of onboardingCategories) {
    for (const subcategory of category.subcategories) {
      subcategoryById.set(subcategory.id, subcategory);
    }
  }

  const transactions: OnboardingTransaction[] = [];

  for (const category of backendCategories) {
    for (const subcategory of category.subcategories) {
      for (const transaction of subcategory.transactions) {
        if (transaction.amountSigned >= 0) {
          continue;
        }

        const occurredAt = parseDateValue(transaction.occurredAt);
        if (!occurredAt) {
          continue;
        }

        const resolvedCategory = transaction.categoryId
          ? (categoryById.get(transaction.categoryId) ?? null)
          : null;
        const resolvedSubcategory = transaction.subcategoryId
          ? (subcategoryById.get(transaction.subcategoryId) ?? null)
          : null;
        const categorySlug = resolvedCategory?.slug ?? null;
        const subcategorySlug = resolvedSubcategory?.slug ?? null;

        const assignment = mapClassificationStatusToAssignment(
          transaction.classificationStatus,
          resolvedCategory,
          resolvedSubcategory,
        );

        transactions.push({
          id: transaction.id,
          description: pickTransactionDescription(transaction),
          occurredAt,
          amount: Math.abs(transaction.amountSigned),
          categoryId: assignment === 'uncategorized' ? null : resolvedCategory?.id ?? null,
          categorySlug: assignment === 'uncategorized' ? null : categorySlug,
          subcategoryId: assignment === 'uncategorized' ? null : resolvedSubcategory?.id ?? null,
          subcategorySlug: assignment === 'uncategorized' ? null : subcategorySlug,
          assignment,
          isSelected: false,
        });
      }
    }
  }

  return transactions.sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}

export function mapBackendUserCategoriesToOnboarding(
  backendCategories: readonly BackendUserCategory[],
): readonly OnboardingCategory[] {
  return backendCategories.map((category) => ({
    id: category.id,
    slug: normalizeSlug(category.slug, category.name),
    name: normalizeCategoryName(category.name),
    iconName: sanitizeIconName(category.ionIcon, DEFAULT_CATEGORY_ICON),
    colorHex: normalizeColorHex(category.colorHex),
    subcategories: category.subcategories.map((subcategory) => ({
      id: subcategory.id,
      categoryId: subcategory.categoryId,
      slug: normalizeSlug(subcategory.slug, subcategory.name),
      name: normalizeCategoryName(subcategory.name),
      iconName: sanitizeIconName(subcategory.ionIcon, DEFAULT_SUBCATEGORY_ICON),
      colorHex: normalizeColorHex(subcategory.colorHex),
    })),
    plannedAmount: 0,
  }));
}

function extractBackendMessage(error: HttpErrorResponse): string {
  const payload = error.error as { message?: unknown } | null | undefined;

  if (typeof payload?.message === 'string') {
    return payload.message;
  }

  if (Array.isArray(payload?.message)) {
    return payload.message.filter((item): item is string => typeof item === 'string').join(', ');
  }

  if (typeof error.message === 'string') {
    return error.message;
  }

  return '';
}

function mapClassificationStatusToAssignment(
  status: BackendClassificationStatus,
  category: OnboardingCategory | null,
  subcategory: OnboardingSubcategory | null,
): AssignmentType {
  if (!category || !subcategory) {
    return 'uncategorized';
  }

  if (status === 'MANUAL') {
    return 'manual';
  }

  if (status === 'AUTO') {
    return 'auto';
  }

  return 'uncategorized';
}

function pickTransactionDescription(transaction: BackendTransactionListItem): string {
  const merchant = transaction.merchant?.trim();
  if (merchant && !looksGenericMerchant(merchant)) {
    return merchant;
  }

  const description = transaction.description.trim();
  return description.length ? description : 'Transaction';
}

function looksGenericMerchant(value: string): boolean {
  const compact = value.replace(/\s+/g, '');
  return /^[A-Z]{2}\d{5,}$/.test(compact) || /^\d{6,}$/.test(compact);
}

function parseDateValue(value: string): Date | null {
  const clean = value.trim();
  if (!clean) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const date = new Date(`${clean}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split('/').map(Number);
    return createValidatedUtcDate(year, month, day);
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split('-').map(Number);
    return createValidatedUtcDate(year, month, day);
  }

  const fallback = new Date(clean);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function createValidatedUtcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValidDate ? date : null;
}
