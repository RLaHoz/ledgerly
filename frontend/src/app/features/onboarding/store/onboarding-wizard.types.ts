import {
  AssignmentType,
  OnboardingCategory,
  OnboardingSubcategory,
  ParsedImportPreviewRow,
  ParsedImportSummary,
  StarterRule,
} from '../models/onboarding.models';

export type MockCatalogCategory = {
  id: string;
  slug: string;
  name: string;
  iconName: string;
  colorHex: string;
};

export const CATEGORY_CATALOG: ReadonlyArray<MockCatalogCategory> = [
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

export const STARTER_RULES: ReadonlyArray<StarterRule> = [
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

export const DEFAULT_CATEGORY_ICON = 'pricetag-outline';
export const DEFAULT_SUBCATEGORY_ICON = 'ellipse-outline';
export const DEFAULT_COLOR_HEX = '#64748B';
export const ALLOWED_ONBOARDING_ICONS = new Set<string>([
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

export type ParsedCsvTransaction = {
  id: string;
  description: string;
  occurredAt: Date;
  amount: number;
};

export type TransactionStats = {
  autoAssignedCount: number;
  manualAssignedCount: number;
  uncategorizedCount: number;
  selectedCount: number;
  totalAmount: number;
};

export type BackendClassificationStatus = 'AUTO' | 'MANUAL' | 'UNCLASSIFIED';

export type BackendTransactionListItem = {
  id: string;
  occurredAt: string;
  amountSigned: number;
  merchant?: string;
  description: string;
  classificationStatus: BackendClassificationStatus;
  categoryId: string | null;
  subcategoryId: string | null;
};

export type BackendGroupedSubcategoryBucket = {
  subcategoryId: string | null;
  name: string;
  transactions: readonly BackendTransactionListItem[];
};

export type BackendGroupedCategoryBucket = {
  categoryId: string | null;
  name: string;
  subcategories: readonly BackendGroupedSubcategoryBucket[];
};

export type BackendCurrentMonthGroupedResponse = {
  sync?: {
    reason?: string;
  };
  categories: readonly BackendGroupedCategoryBucket[];
};

export type BackendUserSubcategory = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  ionIcon: string;
  colorHex: string;
};

export type BackendUserCategory = {
  id: string;
  slug: string;
  name: string;
  ionIcon: string;
  colorHex: string;
  subcategories: readonly BackendUserSubcategory[];
};

export type BackendUserCategoriesResponse = {
  categories: readonly BackendUserCategory[];
};

export type TransactionClassificationSnapshot = {
  categoryId: string | null;
  subcategoryId: string | null;
  assignment: AssignmentType;
};

export type BackendAssignTransactionsItem = {
  transactionId: string;
  categoryId: string;
  subcategoryId: string;
};

export type BackendAssignBudgetCategoryItem = {
  categoryId: string;
  plannedAmount: number;
};

export type BackendAssignBudgetSubcategoryItem = {
  subcategoryId: string;
  plannedAmount: number;
};

export type BackendAssignBudgetPlan = {
  monthlyTarget?: number | null;
  categoryBudgets: readonly BackendAssignBudgetCategoryItem[];
  subcategoryBudgets: readonly BackendAssignBudgetSubcategoryItem[];
};

export type BackendAssignTransactionsRequest = {
  items: readonly BackendAssignTransactionsItem[];
  options: {
    atomic: boolean;
    requireSubcategory: boolean;
  };
  budgetPlan?: BackendAssignBudgetPlan;
};

export type BackendAssignTransactionsResponse = {
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

export type OnboardingWizardState = {
  isParsing: boolean;
  isImportReady: boolean;
  loadUserTransactionsError: string | null;
  bankReconnectionRequired: boolean;
  fileName: string;
  importSummary: ParsedImportSummary | null;
  importPreviewRows: readonly ParsedImportPreviewRow[];
  transactions: readonly import('../models/onboarding.models').OnboardingTransaction[];
  activeFilter: import('../models/onboarding.models').CategoryFilter;
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

export type OnboardingTransactionRow = {
  id: string;
  description: string;
  dateLabel: string;
  amountLabel: string;
  categoryName: string;
  categoryIcon: string;
  assignment: AssignmentType;
  isSelected: boolean;
};

export type OnboardingSubcategoryBudgetRow = {
  id: string;
  name: string;
  iconName: string;
  colorHex: string;
  importedAmount: number;
  importedAmountLabel: string;
  budgetValue: number;
};

export type OnboardingCategoryBudgetSection = {
  id: string;
  slug: string;
  name: string;
  iconName: string;
  colorHex: string;
  importedAmount: number;
  importedAmountLabel: string;
  budgetValue: number;
  subcategories: readonly OnboardingSubcategoryBudgetRow[];
};
