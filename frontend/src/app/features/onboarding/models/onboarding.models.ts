export type OnboardingStepKey = 'import' | 'categories' | 'budgets' | 'confirm';
export type AssignmentType = 'auto' | 'manual' | 'uncategorized';
export type CategoryFilter = 'auto' | 'manual' | 'uncategorized';

export interface OnboardingCategory {
  slug: string;
  name: string;
  iconName: string;
  colorHex: string;
  plannedAmount: number;
}

export interface OnboardingTransaction {
  id: string;
  description: string;
  occurredAt: Date;
  amount: number;
  categorySlug: string | null;
  assignment: AssignmentType;
  isSelected: boolean;
}

export interface ParsedImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  dateRangeLabel: string;
}

export interface ParsedImportPreviewRow {
  id: string;
  description: string;
  dateLabel: string;
  amountLabel: string;
}

export interface StarterRule {
  id: string;
  label: string;
  iconName: string;
  enabled: boolean;
}
