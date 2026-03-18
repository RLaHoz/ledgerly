import { BudgetItemViewModel } from '../../../shared/components/budget-item/budget-item.component';

export type BudgetSignalTone = 'on-track' | 'watch' | 'over';

export interface BudgetOverviewMetricVm {
  id: 'planned' | 'spent' | 'remaining';
  label: string;
  value: string;
}

export interface BudgetSignalVm {
  id: string;
  count: number;
  label: string;
  tone: BudgetSignalTone;
}

export interface BudgetState {
  overviewTitle: string;
  overviewMetrics: readonly BudgetOverviewMetricVm[];
  signals: readonly BudgetSignalVm[];
  categoryTitle: string;
  editBudgetsLabel: string;
  categories: readonly BudgetItemViewModel[];
  editRequests: number;
  lastOpenedItemId: string | null;
  isNewBudgetModalOpen: boolean;
  newBudgetNameInput: string;
  newBudgetAmountInput: string;
}
