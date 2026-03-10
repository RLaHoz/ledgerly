export type DashboardSubtitleTone = 'muted' | 'success';
export type DashboardIconTone = 'accent' | 'success';

export interface DashboardMetricCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  subtitleTone: DashboardSubtitleTone;
  icon: string;
  iconTone: DashboardIconTone;
  progressPercent?: number;
}

export interface DashboardInsight {
  icon: string;
  emphasis: string;
  detail: string;
}

export interface DashboardChartData {
  title: string;
  labels: string[];
  values: number[];
}

export interface DashboardCategoryItem {
  id: string;
  label: string;
  amount: number;
  amountLabel: string;
  color: string;
}

export interface DashboardCategoryBreakdown {
  title: string;
  totalLabel: string;
  totalAmountLabel: string;
  categories: DashboardCategoryItem[];
}

export interface DashboardSplitSegment {
  id: string;
  label: string;
  percent: number;
  color: string;
}

export interface DashboardCoupleSplit {
  title: string;
  periodLabel: string;
  segments: DashboardSplitSegment[];
}

export type DashboardTransactionAmountTone = 'income' | 'expense';

export interface DashboardRecentTransaction {
  id: string;
  merchant: string;
  category: string;
  owner: string;
  ownerColor: string;
  dateLabel: string;
  icon: string;
  amountLabel: string;
  amountTone: DashboardTransactionAmountTone;
}

export interface DashboardRecentTransactions {
  title: string;
  viewAllLabel: string;
  transactions: DashboardRecentTransaction[];
}

export interface DashboardMonthData {
  key: string;
  monthLabel: string;
  metrics: DashboardMetricCard[];
  insight: DashboardInsight;
  chart: DashboardChartData;
  categoryBreakdown: DashboardCategoryBreakdown;
  coupleSplit: DashboardCoupleSplit;
  recentTransactions: DashboardRecentTransactions;
}
