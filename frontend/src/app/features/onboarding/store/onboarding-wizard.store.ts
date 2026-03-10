import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, exhaustMap, forkJoin, pipe, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AssignmentType,
  CategoryFilter,
  OnboardingCategory,
  OnboardingSubcategory,
  OnboardingTransaction,
  ParsedImportPreviewRow,
  ParsedImportSummary,
  StarterRule,
} from '../models/onboarding.models';

type MockCatalogCategory = {
  id: string;
  slug: string;
  name: string;
  iconName: string;
  colorHex: string;
};

const CATEGORY_CATALOG: ReadonlyArray<MockCatalogCategory> = [
  {
    id: 'mock-category-baby',
    slug: 'baby',
    name: 'Baby',
    iconName: 'happy-outline',
    colorHex: '#E57AB1',
  },
  {
    id: 'mock-category-groceries',
    slug: 'groceries',
    name: 'Groceries',
    iconName: 'cart-outline',
    colorHex: '#29BF68',
  },
  {
    id: 'mock-category-home',
    slug: 'home',
    name: 'Home',
    iconName: 'home-outline',
    colorHex: '#3F83EF',
  },
  {
    id: 'mock-category-transport',
    slug: 'transport',
    name: 'Transport',
    iconName: 'car-outline',
    colorHex: '#EB9D12',
  },
  {
    id: 'mock-category-gym',
    slug: 'gym',
    name: 'Gym',
    iconName: 'barbell-outline',
    colorHex: '#6060FF',
  },
  {
    id: 'mock-category-shopping',
    slug: 'shopping',
    name: 'Shopping',
    iconName: 'bag-handle-outline',
    colorHex: '#EF4AA8',
  },
  {
    id: 'mock-category-entertainment',
    slug: 'entertainment',
    name: 'Entertainment',
    iconName: 'film-outline',
    colorHex: '#FF810F',
  },
  {
    id: 'mock-category-health',
    slug: 'health',
    name: 'Health',
    iconName: 'heart-outline',
    colorHex: '#F45F66',
  },
];

const STARTER_RULES: ReadonlyArray<StarterRule> = [
  {
    id: 'auto-recurring',
    label: 'Auto-categorize recurring merchants',
    iconName: 'sparkles-outline',
    enabled: true,
  },
  {
    id: 'warning-75',
    label: 'Alert at 75% budget used',
    iconName: 'warning-outline',
    enabled: true,
  },
  {
    id: 'critical-100',
    label: 'Critical alert at 100%',
    iconName: 'shield-outline',
    enabled: true,
  },
];

const DEFAULT_CATEGORY_ICON = 'pricetag-outline';
const DEFAULT_SUBCATEGORY_ICON = 'ellipse-outline';
const DEFAULT_COLOR_HEX = '#64748B';
const ALLOWED_ONBOARDING_ICONS = new Set<string>([
  'airplane-outline',
  'alert-circle-outline',
  'bag-handle-outline',
  'barbell-outline',
  'body-outline',
  'briefcase-outline',
  'card-outline',
  'car-outline',
  'cash-outline',
  'cart-outline',
  'document-text-outline',
  'ellipse-outline',
  'film-outline',
  'flash-outline',
  'gift-outline',
  'happy-outline',
  'heart-outline',
  'home-outline',
  'medkit-outline',
  'paw-outline',
  'people-outline',
  'pricetag-outline',
  'repeat-outline',
  'school-outline',
  'shield-checkmark-outline',
]);

type ParsedCsvTransaction = {
  id: string;
  description: string;
  occurredAt: Date;
  amount: number;
};

type TransactionStats = {
  autoAssignedCount: number;
  manualAssignedCount: number;
  uncategorizedCount: number;
  selectedCount: number;
  totalAmount: number;
};

type BackendClassificationStatus = 'AUTO' | 'MANUAL' | 'UNCLASSIFIED';

type BackendTransactionListItem = {
  id: string;
  occurredAt: string;
  amountSigned: number;
  merchant?: string;
  description: string;
  classificationStatus: BackendClassificationStatus;
  categoryId: string | null;
  subcategoryId: string | null;
};

type BackendGroupedSubcategoryBucket = {
  subcategoryId: string | null;
  name: string;
  transactions: readonly BackendTransactionListItem[];
};

type BackendGroupedCategoryBucket = {
  categoryId: string | null;
  name: string;
  subcategories: readonly BackendGroupedSubcategoryBucket[];
};

type BackendCurrentMonthGroupedResponse = {
  sync?: {
    reason?: string;
  };
  categories: readonly BackendGroupedCategoryBucket[];
};

type BackendUserSubcategory = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  ionIcon: string;
  colorHex: string;
};

type BackendUserCategory = {
  id: string;
  slug: string;
  name: string;
  ionIcon: string;
  colorHex: string;
  subcategories: readonly BackendUserSubcategory[];
};

type BackendUserCategoriesResponse = {
  categories: readonly BackendUserCategory[];
};

type TransactionClassificationSnapshot = {
  categoryId: string | null;
  subcategoryId: string | null;
  assignment: AssignmentType;
};

type BackendAssignTransactionsItem = {
  transactionId: string;
  categoryId: string;
  subcategoryId: string;
};

type BackendAssignBudgetCategoryItem = {
  categoryId: string;
  plannedAmount: number;
};

type BackendAssignBudgetSubcategoryItem = {
  subcategoryId: string;
  plannedAmount: number;
};

type BackendAssignBudgetPlan = {
  monthlyTarget?: number | null;
  categoryBudgets: readonly BackendAssignBudgetCategoryItem[];
  subcategoryBudgets: readonly BackendAssignBudgetSubcategoryItem[];
};

type BackendAssignTransactionsRequest = {
  items: readonly BackendAssignTransactionsItem[];
  options: {
    atomic: boolean;
    requireSubcategory: boolean;
  };
  budgetPlan?: BackendAssignBudgetPlan;
};

type BackendAssignTransactionsResponse = {
  updatedCount: number;
  failedCount: number;
  updated: ReadonlyArray<{
    transactionId: string;
    categoryId: string | null;
    subcategoryId: string | null;
    classificationStatus: BackendClassificationStatus;
    updatedAt: string;
  }>;
  failed: ReadonlyArray<{ transactionId: string; message: string }>;
  budgetPlan?: {
    monthYm: string;
    plannedTotal: number;
    categoryBudgetsUpserted: number;
    subcategoryBudgetsUpserted: number;
  };
};

type OnboardingWizardState = {
  isParsing: boolean;
  isImportReady: boolean;
  loadUserTransactionsError: string | null;
  bankReconnectionRequired: boolean;
  fileName: string;
  importSummary: ParsedImportSummary | null;
  importPreviewRows: readonly ParsedImportPreviewRow[];
  transactions: readonly OnboardingTransaction[];
  activeFilter: CategoryFilter;
  isCategorySheetOpen: boolean;
  categorySheetTxIds: readonly string[];
  categorySheetCategoryId: string | null;
  categorySearch: string;
  monthlyTarget: number | null;
  categories: readonly OnboardingCategory[];
  subcategoryBudgetsById: Readonly<Record<string, number>>;
  classificationBaselineByTxId: Readonly<Record<string, TransactionClassificationSnapshot>>;
  isSavingClassifications: boolean;
  saveClassificationsError: string | null;
  saveCompletedAt: string | null;
  starterRules: readonly StarterRule[];
  confirmAccepted: boolean;
  directDataFromBankAccounts: boolean;
};

const initialOnboardingWizardState: OnboardingWizardState = {
  isParsing: false,
  isImportReady: false,
  loadUserTransactionsError: null,
  bankReconnectionRequired: false,
  fileName: '',
  importSummary: null,
  importPreviewRows: [],
  transactions: [],
  activeFilter: 'auto',
  isCategorySheetOpen: false,
  categorySheetTxIds: [],
  categorySheetCategoryId: null,
  categorySearch: '',
  monthlyTarget: null,
  categories: [],
  subcategoryBudgetsById: {},
  classificationBaselineByTxId: {},
  isSavingClassifications: false,
  saveClassificationsError: null,
  saveCompletedAt: null,
  starterRules: [...STARTER_RULES],
  confirmAccepted: false,
  directDataFromBankAccounts: false,
};

export const OnboardingWizardStore = signalStore(
  { providedIn: 'root' },
  withState(initialOnboardingWizardState),
  withComputed((store) => ({
    transactionStats: computed(() =>
      store.transactions().reduce<TransactionStats>(
        (stats, transaction) => {
          if (transaction.assignment === 'auto') {
            stats.autoAssignedCount += 1;
          } else if (transaction.assignment === 'manual') {
            stats.manualAssignedCount += 1;
          } else {
            stats.uncategorizedCount += 1;
          }

          if (transaction.isSelected) {
            stats.selectedCount += 1;
          }

          stats.totalAmount += transaction.amount;
          return stats;
        },
        {
          autoAssignedCount: 0,
          manualAssignedCount: 0,
          uncategorizedCount: 0,
          selectedCount: 0,
          totalAmount: 0,
        },
      ),
    ),
    importedTotalsBySlug: computed(() =>
      buildImportedAmountBySlug(store.transactions()),
    ),
    importedTotalsBySubcategoryId: computed(() =>
      buildImportedAmountBySubcategoryId(store.transactions()),
    ),
  })),
  withComputed((store) => ({
    autoAssignedCount: computed(() => store.transactionStats().autoAssignedCount),
    manualAssignedCount: computed(() => store.transactionStats().manualAssignedCount),
    uncategorizedCount: computed(() => store.transactionStats().uncategorizedCount),
    selectedCount: computed(() => store.transactionStats().selectedCount),
    filteredTransactions: computed(() => {
      const activeFilter = store.activeFilter();

      return store.transactions().filter((tx) => {
        if (activeFilter === 'uncategorized') {
          return tx.assignment === 'uncategorized';
        }

        return tx.assignment === activeFilter;
      });
    }),
    availableCategories: computed(() => {
      const term = store.categorySearch().trim().toLowerCase();
      const categories = store
        .categories()
        .filter((category) => category.subcategories.length > 0);

      if (!term) {
        return categories;
      }

      return categories.filter(
        (category) =>
          category.name.toLowerCase().includes(term) ||
          category.subcategories.some((subcategory) =>
            subcategory.name.toLowerCase().includes(term),
          ),
      );
    }),
    categorySheetSelectedCategory: computed(() => {
      const selectedCategoryId = store.categorySheetCategoryId();
      if (!selectedCategoryId) {
        return null;
      }

      return (
        store.categories().find((category) => category.id === selectedCategoryId) ??
        null
      );
    }),
    availableSubcategoriesForSheet: computed(() => {
      const selectedCategoryId = store.categorySheetCategoryId();
      if (!selectedCategoryId) {
        return [];
      }

      const selectedCategory =
        store.categories().find((category) => category.id === selectedCategoryId) ??
        null;
      if (!selectedCategory) {
        return [];
      }

      const term = store.categorySearch().trim().toLowerCase();
      if (!term) {
        return selectedCategory.subcategories;
      }

      const selectedCategoryMatches = selectedCategory.name
        .toLowerCase()
        .includes(term);
      if (selectedCategoryMatches) {
        return selectedCategory.subcategories;
      }

      return selectedCategory.subcategories.filter((subcategory: OnboardingSubcategory) =>
        subcategory.name.toLowerCase().includes(term),
      );
    }),
    changedManualAssignmentItems: computed<readonly BackendAssignTransactionsItem[]>(() =>
      buildChangedManualAssignmentItems(
        store.transactions(),
        store.classificationBaselineByTxId(),
      ),
    ),
    hasPendingManualAssignmentChanges: computed(
      () =>
        buildChangedManualAssignmentItems(
          store.transactions(),
          store.classificationBaselineByTxId(),
        ).length > 0,
    ),
    usedCategories: computed(() => {
      const importedTotalsBySlug = store.importedTotalsBySlug();

      return store.categories().filter((category) =>
        importedTotalsBySlug.has(category.slug),
      );
    }),
    assignedTotal: computed(() => {
      const importedTotalsBySlug = store.importedTotalsBySlug();

      return store.categories().reduce((sum, category) => {
        if (!importedTotalsBySlug.has(category.slug)) {
          return sum;
        }

        return sum + category.plannedAmount;
      }, 0);
    }),
    importTotal: computed(() => store.transactionStats().totalAmount),
    allTransactionsProcessed: computed(() => store.transactions().length),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const baseUrl = environment.apiUrl;

    const loadUserTransactions = rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, {
            isParsing: true,
            loadUserTransactionsError: null,
            bankReconnectionRequired: false,
          }),
        ),
        exhaustMap(() =>
          forkJoin({
            transactions: http.get<BackendCurrentMonthGroupedResponse>(
              `${baseUrl}/transactions/current?forceSync=true`,
            ),
            userCategories: http.get<BackendUserCategoriesResponse>(
              `${baseUrl}/categories/user-categories`,
            ),
          })
            .pipe(
              tap(({ transactions: transactionsResponse, userCategories }) => {
                const categoriesFromBackend = mapBackendUserCategoriesToOnboarding(
                  userCategories.categories,
                );
                const categorizedTransactions = mapBackendTransactionsToOnboarding(
                  transactionsResponse.categories,
                  categoriesFromBackend,
                );
                const noActiveConnectionsDetected =
                  transactionsResponse.sync?.reason === 'no_connections' &&
                  categorizedTransactions.length === 0;

                if (noActiveConnectionsDetected) {
                  patchState(store, {
                    transactions: [],
                    importPreviewRows: [],
                    importSummary: null,
                    isParsing: false,
                    isImportReady: false,
                    directDataFromBankAccounts: false,
                    loadUserTransactionsError:
                      'Bank connection unavailable. Reconnect Basiq to continue with direct bank data.',
                    bankReconnectionRequired: true,
                  });
                  return;
                }

                const importedTotalsBySlug = buildImportedAmountBySlug(categorizedTransactions);

                patchState(store, {
                  transactions: categorizedTransactions,
                  importPreviewRows: categorizedTransactions.slice(0, 5).map((transaction) => ({
                    id: transaction.id,
                    description: transaction.description,
                    dateLabel: formatDateShort(transaction.occurredAt),
                    amountLabel: formatCurrency(transaction.amount),
                  })),
                  importSummary: {
                    totalRows: categorizedTransactions.length,
                    validRows: categorizedTransactions.length,
                    invalidRows: 0,
                    dateRangeLabel: buildDateRangeLabel(categorizedTransactions),
                  },
                  categories: applyPlannedAmountsToCategories(
                    categoriesFromBackend,
                    importedTotalsBySlug,
                  ),
                  subcategoryBudgetsById:
                    buildSubcategoryBudgetMapFromTransactions(categorizedTransactions),
                  classificationBaselineByTxId:
                    buildClassificationBaselineByTxId(categorizedTransactions),
                  isSavingClassifications: false,
                  saveClassificationsError: null,
                  saveCompletedAt: null,
                  isParsing: false,
                  isImportReady: categorizedTransactions.length > 0,
                  directDataFromBankAccounts: true,
                  loadUserTransactionsError: null,
                  bankReconnectionRequired: false,
                  activeFilter: 'auto',
                  confirmAccepted: false,
                });

                console.log(
                  '[OnboardingWizardStore] loaded user transactions:',
                  categorizedTransactions,
                );
              }),
              catchError((error: unknown) => {
                const loadError = resolveLoadUserTransactionsError(error);
                patchState(store, {
                  transactions: [],
                  importPreviewRows: [],
                  importSummary: null,
                  isParsing: false,
                  isImportReady: false,
                  directDataFromBankAccounts: false,
                  isSavingClassifications: false,
                  loadUserTransactionsError: loadError.message,
                  bankReconnectionRequired: loadError.requiresBankReconnect,
                });
                console.error(
                  '[OnboardingWizardStore] failed to load user transactions:',
                  error,
                );
                return EMPTY;
              }),
            ),
        ),
      ),
    );

    const saveTransactionAssignments = rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, {
            isSavingClassifications: true,
            saveClassificationsError: null,
            saveCompletedAt: null,
          }),
        ),
        exhaustMap(() => {
          if (!store.directDataFromBankAccounts()) {
            patchState(store, {
              isSavingClassifications: false,
              saveCompletedAt: new Date().toISOString(),
            });
            return EMPTY;
          }

          const changedItems = store.changedManualAssignmentItems();
          const assignableItems = changedItems.filter((item) =>
            looksLikeUuid(item.transactionId),
          );
          const budgetPlan = buildAssignBudgetPlanPayload({
            monthlyTarget: store.monthlyTarget(),
            usedCategories: store.usedCategories(),
            subcategoryBudgetsById: store.subcategoryBudgetsById(),
            importedTotalsBySubcategoryId: store.importedTotalsBySubcategoryId(),
          });
          const hasBudgetPayload =
            budgetPlan.monthlyTarget !== null ||
            budgetPlan.categoryBudgets.length > 0 ||
            budgetPlan.subcategoryBudgets.length > 0;

          if (changedItems.length > 0 && assignableItems.length !== changedItems.length) {
            patchState(store, {
              isSavingClassifications: false,
              saveClassificationsError:
                'Some transactions cannot be saved because they are not persisted bank transactions.',
            });
            return EMPTY;
          }

          if (!assignableItems.length && !hasBudgetPayload) {
            patchState(store, {
              isSavingClassifications: false,
              saveCompletedAt: new Date().toISOString(),
            });
            return EMPTY;
          }

          const requestPayload: BackendAssignTransactionsRequest = {
            items: assignableItems,
            options: {
              atomic: true,
              requireSubcategory: true,
            },
            ...(hasBudgetPayload ? { budgetPlan } : {}),
          };

          return http
            .patch<BackendAssignTransactionsResponse>(
              `${baseUrl}/categories/transactions/assign`,
              requestPayload,
            )
            .pipe(
              tap(() => {
                patchState(store, {
                  classificationBaselineByTxId: buildClassificationBaselineByTxId(
                    store.transactions(),
                  ),
                  isSavingClassifications: false,
                  saveClassificationsError: null,
                  saveCompletedAt: new Date().toISOString(),
                });
              }),
              catchError((error: unknown) => {
                patchState(store, {
                  isSavingClassifications: false,
                  saveClassificationsError: resolveSaveClassificationsErrorMessage(error),
                });
                return EMPTY;
              }),
            );
        }),
      ),
    );

    return {
      loadUserTransactions,
      saveTransactionAssignments,

      acknowledgeBankReconnectionRequired(): void {
        patchState(store, { bankReconnectionRequired: false });
      },

      resetSaveTransactionAssignmentsState(): void {
        patchState(store, {
          saveClassificationsError: null,
          saveCompletedAt: null,
        });
      },

      async parseFile(file: File): Promise<void> {
        patchState(store, {
          isParsing: true,
          isImportReady: false,
          loadUserTransactionsError: null,
          bankReconnectionRequired: false,
          fileName: file.name,
        });

        try {
          const fileText = await file.text();
          const parsed = parseCsvMock(fileText);
          const categorizedTransactions = parsed.validTransactions.map((tx, index) =>
            classifyTransaction(tx, index),
          );
          const importedTotalsBySlug = buildImportedAmountBySlug(categorizedTransactions);

          patchState(store, {
            transactions: categorizedTransactions,
            importPreviewRows: categorizedTransactions.slice(0, 5).map((tx) => ({
              id: tx.id,
              description: tx.description,
              dateLabel: formatDateShort(tx.occurredAt),
              amountLabel: formatCurrency(tx.amount),
            })),
            importSummary: {
              totalRows: parsed.totalRows,
              validRows: categorizedTransactions.length,
              invalidRows: parsed.invalidRows,
              dateRangeLabel: buildDateRangeLabel(categorizedTransactions),
            },
            categories: applyPlannedAmountsToCategories(
              buildMockCatalogCategories(),
              importedTotalsBySlug,
            ),
            subcategoryBudgetsById:
              buildSubcategoryBudgetMapFromTransactions(categorizedTransactions),
            classificationBaselineByTxId:
              buildClassificationBaselineByTxId(categorizedTransactions),
            isSavingClassifications: false,
            saveClassificationsError: null,
            saveCompletedAt: null,
            isParsing: false,
            isImportReady: true,
            loadUserTransactionsError: null,
            bankReconnectionRequired: false,
            activeFilter: 'auto',
            confirmAccepted: false,
            directDataFromBankAccounts: false,
          });
        } catch (error) {
          patchState(store, {
            isParsing: false,
            isImportReady: false,
            isSavingClassifications: false,
          });

          throw error;
        }
      },

      setFilter(filter: CategoryFilter): void {
        patchState(store, { activeFilter: filter });
      },

      toggleTransactionSelection(transactionId: string, selected: boolean): void {
        patchState(store, {
          transactions: store.transactions().map((transaction) =>
            transaction.id === transactionId
              ? { ...transaction, isSelected: selected }
              : transaction,
          ),
        });
      },

      clearSelection(): void {
        patchState(store, {
          transactions: store.transactions().map((transaction) => ({
            ...transaction,
            isSelected: false,
          })),
        });
      },

      openCategorySheetForTransaction(transactionId: string): void {
        const currentTransaction = store
          .transactions()
          .find((transaction) => transaction.id === transactionId);

        patchState(store, {
          categorySheetTxIds: [transactionId],
          categorySheetCategoryId: currentTransaction?.categoryId ?? null,
          categorySearch: '',
          isCategorySheetOpen: true,
        });
      },

      openCategorySheetForSelected(): void {
        const selectedIds = store
          .transactions()
          .filter((transaction) => transaction.isSelected)
          .map((transaction) => transaction.id);

        if (!selectedIds.length) {
          return;
        }

        patchState(store, {
          categorySheetTxIds: selectedIds,
          categorySheetCategoryId: null,
          categorySearch: '',
          isCategorySheetOpen: true,
        });
      },

      closeCategorySheet(): void {
        patchState(store, {
          isCategorySheetOpen: false,
          categorySheetTxIds: [],
          categorySheetCategoryId: null,
          categorySearch: '',
        });
      },

      setCategorySearch(value: string): void {
        patchState(store, { categorySearch: value });
      },

      setCategorySheetCategory(categoryId: string | null): void {
        patchState(store, { categorySheetCategoryId: categoryId });
      },

      assignSubcategoryToSheetSelection(subcategoryId: string): void {
        const selectedIds = new Set(store.categorySheetTxIds());
        if (!selectedIds.size) {
          return;
        }

        const selectedCategory = store
          .categories()
          .find((category) =>
            category.subcategories.some(
              (subcategory) => subcategory.id === subcategoryId,
            ),
          );
        const selectedSubcategory = selectedCategory?.subcategories.find(
          (subcategory) => subcategory.id === subcategoryId,
        );
        if (!selectedCategory || !selectedSubcategory) {
          return;
        }

        patchState(store, {
          transactions: store.transactions().map((transaction) => {
            if (!selectedIds.has(transaction.id)) {
              return transaction;
            }

            return {
              ...transaction,
              categoryId: selectedCategory.id,
              categorySlug: selectedCategory.slug,
              subcategoryId: selectedSubcategory.id,
              subcategorySlug: selectedSubcategory.slug,
              assignment: 'manual',
              isSelected: false,
            };
          }),
          isCategorySheetOpen: false,
          categorySheetTxIds: [],
          categorySheetCategoryId: null,
          categorySearch: '',
        });
      },

      setMonthlyTarget(value: string): void {
        const parsed = parseDecimalInput(value);
        patchState(store, {
          monthlyTarget: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
        });
      },

      setCategoryBudget(slug: string, value: string): void {
        const parsed = parseDecimalInput(value);

        patchState(store, {
          categories: store.categories().map((category) =>
            category.slug === slug
              ? {
                  ...category,
                  plannedAmount:
                    Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
                }
              : category,
          ),
        });
      },

      autoFillFromHistory(): void {
        const importedTotalsBySlug = store.importedTotalsBySlug();

        patchState(store, {
          categories: store.categories().map((category) => ({
            ...category,
            plannedAmount: Math.max(1, Math.round(importedTotalsBySlug.get(category.slug) ?? 0)),
          })),
          subcategoryBudgetsById:
            buildSubcategoryBudgetMapFromTransactions(store.transactions()),
        });
      },

      setSubcategoryBudget(subcategoryId: string, value: string): void {
        const parsed = parseDecimalInput(value);
        const nextValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

        patchState(store, {
          subcategoryBudgetsById: {
            ...store.subcategoryBudgetsById(),
            [subcategoryId]: nextValue,
          },
        });
      },

      distributeRemaining(): void {
        const target = store.monthlyTarget();
        if (target === null) {
          return;
        }

        const usedCategories = store.usedCategories();
        if (!usedCategories.length) {
          return;
        }

        const currentTotal = store.assignedTotal();
        const remaining = target - currentTotal;
        if (remaining <= 0) {
          return;
        }

        const importedTotalsBySlug = store.importedTotalsBySlug();
        const importedTotal = usedCategories.reduce((sum, category) => {
          return sum + (importedTotalsBySlug.get(category.slug) ?? 0);
        }, 0);
        if (importedTotal <= 0) {
          return;
        }

        const weightedSlugs = usedCategories.map((category) => category.slug);
        const weightedSlugSet = new Set(weightedSlugs);
        const lastWeightedSlug = weightedSlugs[weightedSlugs.length - 1];

        let distributed = 0;

        patchState(store, {
          categories: store.categories().map((category) => {
            if (!weightedSlugSet.has(category.slug)) {
              return category;
            }

            const weight = (importedTotalsBySlug.get(category.slug) ?? 0) / importedTotal;
            const add =
              category.slug === lastWeightedSlug
                ? remaining - distributed
                : Math.round(remaining * weight);

            distributed += add;

            return {
              ...category,
              plannedAmount: category.plannedAmount + add,
            };
          }),
        });
      },

      toggleRule(ruleId: string, enabled: boolean): void {
        patchState(store, {
          starterRules: store.starterRules().map((rule) =>
            rule.id === ruleId ? { ...rule, enabled } : rule,
          ),
        });
      },

      setConfirmAccepted(checked: boolean): void {
        patchState(store, { confirmAccepted: checked });
      },

      setDirectDataFromBankAccounts(checked: boolean): void {
        patchState(store, { directDataFromBankAccounts: checked });
      },

      categoryById(categoryId: string | null): OnboardingCategory | null {
        if (!categoryId) {
          return null;
        }

        return store.categories().find((category) => category.id === categoryId) ?? null;
      },

      categoryBySlug(slug: string | null): OnboardingCategory | null {
        if (!slug) {
          return null;
        }

        return store.categories().find((category) => category.slug === slug) ?? null;
      },

      subcategoryById(subcategoryId: string | null): OnboardingSubcategory | null {
        if (!subcategoryId) {
          return null;
        }

        for (const category of store.categories()) {
          const subcategory = category.subcategories.find((item) => item.id === subcategoryId);
          if (subcategory) {
            return subcategory;
          }
        }

        return null;
      },

      categoryBudgetBySlug(slug: string): number {
        return (
          store.categories().find((category) => category.slug === slug)?.plannedAmount ??
          0
        );
      },

      importedAmountBySlug(slug: string): number {
        return store.importedTotalsBySlug().get(slug) ?? 0;
      },

      subcategoryBudgetById(subcategoryId: string): number {
        const budgetFromState = store.subcategoryBudgetsById()[subcategoryId];
        if (typeof budgetFromState === 'number' && Number.isFinite(budgetFromState)) {
          return budgetFromState;
        }

        return store.importedTotalsBySubcategoryId().get(subcategoryId) ?? 0;
      },

      importedAmountBySubcategoryId(subcategoryId: string): number {
        return store.importedTotalsBySubcategoryId().get(subcategoryId) ?? 0;
      },
    };
  }),
);

function classifyTransaction(
  tx: ParsedCsvTransaction,
  index: number,
): OnboardingTransaction {
  const text = tx.description.toLowerCase();
  const matchedSlug = findCategorySlug(text);
  const matchedCategory = matchedSlug
    ? CATEGORY_CATALOG.find((category) => category.slug === matchedSlug) ?? null
    : null;
  const matchedSubcategorySlug = matchedSlug ? `${matchedSlug}-general` : null;

  return {
    id: `${tx.id}-${index}`,
    description: tx.description,
    occurredAt: tx.occurredAt,
    amount: tx.amount,
    categoryId: matchedCategory?.id ?? null,
    categorySlug: matchedSlug,
    subcategoryId: matchedCategory ? `mock-subcategory-${matchedSlug}-general` : null,
    subcategorySlug: matchedSubcategorySlug,
    assignment: matchedCategory ? 'auto' : 'uncategorized',
    isSelected: false,
  };
}

function buildImportedAmountBySlug(
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

function buildImportedAmountBySubcategoryId(
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

function buildSubcategoryBudgetMapFromTransactions(
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

function buildClassificationBaselineByTxId(
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

function buildChangedManualAssignmentItems(
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

function buildAssignBudgetPlanPayload(input: {
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
      const fallbackBudget =
        input.importedTotalsBySubcategoryId.get(subcategory.id) ?? 0;
      const resolvedBudget =
        Number.isFinite(explicitBudget) && explicitBudget >= 0
          ? explicitBudget
          : fallbackBudget;

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

function normalizeBudgetAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function resolveLoadUserTransactionsError(error: unknown): {
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
        message:
          'Bank connection unavailable. Reconnect Basiq from Auth to continue onboarding.',
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
        message:
          'Bank connection unavailable. Reconnect Basiq from Auth to continue onboarding.',
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

function extractBackendMessage(error: HttpErrorResponse): string {
  const payload = error.error as { message?: unknown } | null | undefined;

  if (typeof payload?.message === 'string') {
    return payload.message;
  }

  if (Array.isArray(payload?.message)) {
    return payload.message
      .filter((item): item is string => typeof item === 'string')
      .join(', ');
  }

  if (typeof error.message === 'string') {
    return error.message;
  }

  return '';
}

function resolveSaveClassificationsErrorMessage(error: unknown): string {
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

function mapBackendTransactionsToOnboarding(
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
          subcategoryId:
            assignment === 'uncategorized' ? null : resolvedSubcategory?.id ?? null,
          subcategorySlug: assignment === 'uncategorized' ? null : subcategorySlug,
          assignment,
          isSelected: false,
        });
      }
    }
  }

  return transactions.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

function mapBackendUserCategoriesToOnboarding(
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

function buildMockCatalogCategories(): readonly OnboardingCategory[] {
  return CATEGORY_CATALOG.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    iconName: category.iconName,
    colorHex: category.colorHex,
    subcategories: [
      {
        id: `mock-subcategory-${category.slug}-general`,
        categoryId: category.id,
        slug: `${category.slug}-general`,
        name: `${category.name} General`,
        iconName: DEFAULT_SUBCATEGORY_ICON,
        colorHex: category.colorHex,
      },
    ],
    plannedAmount: 0,
  }));
}

function applyPlannedAmountsToCategories(
  categories: readonly OnboardingCategory[],
  importedTotalsBySlug: ReadonlyMap<string, number>,
): readonly OnboardingCategory[] {
  return categories.map((category) => ({
    ...category,
    plannedAmount: Math.max(1, Math.round(importedTotalsBySlug.get(category.slug) ?? 0)),
  }));
}

function normalizeCategoryName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length ? trimmed : 'Other';
}

function normalizeSlug(slug: string, fallbackName: string): string {
  const normalizedSlug = slugify(slug);
  if (normalizedSlug.length > 0) {
    return normalizedSlug;
  }

  return slugify(fallbackName) || 'other';
}

function normalizeColorHex(value: string): string {
  const trimmed = value.trim();
  return /^#[A-Fa-f0-9]{6}$/.test(trimmed) ? trimmed : DEFAULT_COLOR_HEX;
}

function sanitizeIconName(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return fallback;
  }

  return ALLOWED_ONBOARDING_ICONS.has(trimmed) ? trimmed : fallback;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function parseCsvMock(content: string): {
  totalRows: number;
  invalidRows: number;
  validTransactions: ParsedCsvTransaction[];
} {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    return { totalRows: 0, invalidRows: 0, validTransactions: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => splitCsvLine(line, delimiter));
  const isHeader = looksLikeHeader(rows[0] ?? []);
  const dataRows = isHeader ? rows.slice(1) : rows;

  const validTransactions: ParsedCsvTransaction[] = [];
  let invalidRows = 0;

  for (const row of dataRows) {
    const date = parseDateValue(row[0] ?? '');
    const amount = parseMoneyValue(row[1] ?? '');
    const description = (row[2] ?? row[3] ?? '').trim();

    if (!date || !Number.isFinite(amount) || !description || amount >= 0) {
      invalidRows += 1;
      continue;
    }

    validTransactions.push({
      id: cryptoRandomId(),
      description,
      occurredAt: date,
      amount: Math.abs(amount),
    });
  }

  return {
    totalRows: dataRows.length,
    invalidRows,
    validTransactions: validTransactions.sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
    ),
  };
}

function looksLikeHeader(row: readonly string[]): boolean {
  const first = (row[0] ?? '').toLowerCase();
  const second = (row[1] ?? '').toLowerCase();
  return first.includes('date') || second.includes('amount');
}

function detectDelimiter(line: string): ',' | ';' | '\t' {
  const comma = (line.match(/,/g) ?? []).length;
  const semicolon = (line.match(/;/g) ?? []).length;
  const tab = (line.match(/\t/g) ?? []).length;

  if (tab > comma && tab > semicolon) {
    return '\t';
  }

  return semicolon > comma ? ';' : ',';
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseMoneyValue(value: string): number {
  const normalized = value
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .replace(/[()]/g, '');
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return value.includes('(') && value.includes(')') ? -Math.abs(parsed) : parsed;
}

function parseDecimalInput(value: string): number {
  return Number(value.replace(/[^0-9.]/g, ''));
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

function findCategorySlug(text: string): string | null {
  if (
    /(whole foods|costco|grocery|groceries|trader joe|coles|woolworth|market)/.test(
      text,
    )
  ) {
    return 'groceries';
  }

  if (/(uber|lyft|shell|gas|fuel|transport|taxi|ride)/.test(text)) {
    return 'transport';
  }

  if (/(rent|mortgage|home)/.test(text)) {
    return 'home';
  }

  if (/(gym|fitness|equinox|goodlife|barbell)/.test(text)) {
    return 'gym';
  }

  if (/(amazon|target|shopping|afterpay|zara|gap)/.test(text)) {
    return 'shopping';
  }

  if (/(netflix|spotify|youtube|cinema|movie|amc|entertainment)/.test(text)) {
    return 'entertainment';
  }

  if (/(baby|kids|child)/.test(text)) {
    return 'baby';
  }

  if (/(health|pharmacy|cvs|walgreens|doctor|medical)/.test(text)) {
    return 'health';
  }

  return null;
}

function buildDateRangeLabel(transactions: readonly OnboardingTransaction[]): string {
  if (!transactions.length) {
    return '-';
  }

  const sorted = [...transactions].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );
  const start = sorted[0]?.occurredAt;
  const end = sorted[sorted.length - 1]?.occurredAt;

  if (!start || !end) {
    return '-';
  }

  return `${formatDateShort(start)} - ${formatDateLong(end)}`;
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    date,
  );
}

function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `tx-${Math.random().toString(36).slice(2, 12)}`;
}
