import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, exhaustMap, forkJoin, pipe, tap } from 'rxjs';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';
import {
  CategoryFilter,
  OnboardingCategory,
  OnboardingSubcategory,
} from '../models/onboarding.models';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { formatDateShort, formatMoney } from '../utils/onboarding-format.util';
import {
  buildAssignBudgetPlanPayload,
  buildChangedManualAssignmentItems,
  buildClassificationBaselineByTxId,
  buildImportedAmountBySlug,
  buildImportedAmountBySubcategoryId,
  buildSubcategoryBudgetMapFromTransactions,
  createCategoryMaps,
  looksLikeUuid,
} from './onboarding-wizard-budget.util';
import {
  mapBackendTransactionsToOnboarding,
  mapBackendUserCategoriesToOnboarding,
  resolveLoadUserTransactionsError,
  resolveSaveClassificationsErrorMessage,
} from './onboarding-wizard-backend.util';
import {
  applyPlannedAmountsToCategories,
  buildDateRangeLabel,
  buildMockCatalogCategories,
  buildTransactionRowPresentation,
  classifyTransaction,
  parseCsvMock,
  parseDecimalInput,
} from './onboarding-wizard-import.util';
import {
  BackendAssignTransactionsItem,
  BackendAssignTransactionsRequest,
  BackendAssignTransactionsResponse,
  BackendCurrentMonthGroupedResponse,
  BackendUserCategoriesResponse,
  OnboardingCategoryBudgetSection,
  OnboardingSubcategoryBudgetRow,
  OnboardingTransactionRow,
  OnboardingWizardState,
  STARTER_RULES,
  TransactionStats,
} from './onboarding-wizard.types';

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
  withDevtools('Onboarding'),
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
    categoryIndexes: computed(() => createCategoryMaps(store.categories())),
    filteredTransactions: computed(() => {
      const activeFilter = store.activeFilter();

      return store.transactions().filter((transaction) => {
        if (activeFilter === 'uncategorized') {
          return transaction.assignment === 'uncategorized';
        }

        return transaction.assignment === activeFilter;
      });
    }),
  })),
  withComputed((store) => ({
    autoAssignedCount: computed(() => store.transactionStats().autoAssignedCount),
    manualAssignedCount: computed(() => store.transactionStats().manualAssignedCount),
    uncategorizedCount: computed(() => store.transactionStats().uncategorizedCount),
    selectedCount: computed(() => store.transactionStats().selectedCount),
    filteredTransactionRows: computed<readonly OnboardingTransactionRow[]>(() => {
      const { categoriesById, categoriesBySlug, subcategoriesById } = store.categoryIndexes();

      return store.filteredTransactions().map((transaction) => ({
        id: transaction.id,
        description: transaction.description,
        assignment: transaction.assignment,
        isSelected: transaction.isSelected,
        ...buildTransactionRowPresentation({
          transaction,
          categoriesById,
          categoriesBySlug,
          subcategoriesById,
        }),
      }));
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

      return store.categoryIndexes().categoriesById.get(selectedCategoryId) ?? null;
    }),
    availableSubcategoriesForSheet: computed(() => {
      const selectedCategoryId = store.categorySheetCategoryId();
      const selectedCategory = selectedCategoryId
        ? (store.categoryIndexes().categoriesById.get(selectedCategoryId) ?? null)
        : null;
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
    budgetSections: computed<readonly OnboardingCategoryBudgetSection[]>(() => {
      const importedTotalsBySlug = store.importedTotalsBySlug();
      const importedTotalsBySubcategoryId = store.importedTotalsBySubcategoryId();
      const subcategoryBudgetsById = store.subcategoryBudgetsById();
      const usedCategories = store.categories().filter((category) =>
        importedTotalsBySlug.has(category.slug),
      );

      return usedCategories.map((category) => {
        const importedAmount = importedTotalsBySlug.get(category.slug) ?? 0;

        return {
          id: category.id,
          slug: category.slug,
          name: category.name,
          iconName: category.iconName,
          colorHex: category.colorHex,
          importedAmount,
          importedAmountLabel: formatMoney(importedAmount),
          budgetValue: category.plannedAmount,
          subcategories: category.subcategories
            .map((subcategory): OnboardingSubcategoryBudgetRow => {
              const subcategoryImportedAmount =
                importedTotalsBySubcategoryId.get(subcategory.id) ?? 0;

              return {
                id: subcategory.id,
                name: subcategory.name,
                iconName: subcategory.iconName,
                colorHex: subcategory.colorHex,
                importedAmount: subcategoryImportedAmount,
                importedAmountLabel: formatMoney(subcategoryImportedAmount),
                budgetValue:
                  typeof subcategoryBudgetsById[subcategory.id] === 'number'
                    ? subcategoryBudgetsById[subcategory.id]
                    : subcategoryImportedAmount,
              };
            })
            .filter(
              (subcategory: OnboardingSubcategoryBudgetRow) =>
                subcategory.importedAmount > 0,
            ),
        };
      });
    }),
  })),
  withComputed((store) => ({
    categoriesById: computed(() => store.categoryIndexes().categoriesById),
    categoriesBySlug: computed(() => store.categoryIndexes().categoriesBySlug),
    subcategoriesById: computed(() => store.categoryIndexes().subcategoriesById),
    hasPendingManualAssignmentChanges: computed(
      () => store.changedManualAssignmentItems().length > 0,
    ),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const runtimeConfig = inject(RuntimeConfigService);
    const resolveBaseUrl = () => runtimeConfig.getApiUrl();

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
              `${resolveBaseUrl()}/transactions/current?forceSync=true`,
            ),
            userCategories: http.get<BackendUserCategoriesResponse>(
              `${resolveBaseUrl()}/categories/user-categories`,
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
                    amountLabel: formatMoney(transaction.amount),
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
              `${resolveBaseUrl()}/categories/transactions/assign`,
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

      loadUserTransactionsIfNeeded(): void {
        if (store.directDataFromBankAccounts() || store.isParsing()) {
          return;
        }

        loadUserTransactions();
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
              amountLabel: formatMoney(tx.amount),
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

        const selectedSubcategory = store.subcategoriesById().get(subcategoryId) ?? null;
        const selectedCategory = selectedSubcategory
          ? (store.categoriesById().get(selectedSubcategory.categoryId) ?? null)
          : null;
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

        return store.categoriesById().get(categoryId) ?? null;
      },

      categoryBySlug(slug: string | null): OnboardingCategory | null {
        if (!slug) {
          return null;
        }

        return store.categoriesBySlug().get(slug) ?? null;
      },

      subcategoryById(subcategoryId: string | null): OnboardingSubcategory | null {
        if (!subcategoryId) {
          return null;
        }

        return store.subcategoriesById().get(subcategoryId) ?? null;
      },

      categoryBudgetBySlug(slug: string): number {
        return store.categoriesBySlug().get(slug)?.plannedAmount ?? 0;
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
