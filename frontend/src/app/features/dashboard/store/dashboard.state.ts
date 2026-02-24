import { DashboardMonthData } from '../models/dashboard.models';

const FIRST_YEAR = 2025;
const LAST_YEAR = 2027;
const MONTHS_IN_YEAR = 12;
const DEFAULT_SELECTED_DATE = '2026-02-18';

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['1', '3', '5', '7', '9', '11', '13', '15', '17', '18'];
const BASE_SERIES = [48, 130, 146, 172, 208, 262, 302, 228, 268, 148];

export interface DashboardState {
  selectedDate: string;
  months: readonly DashboardMonthData[];
}

export const initialDashboardState: DashboardState = {
  selectedDate: DEFAULT_SELECTED_DATE,
  months: buildMonths(),
};

function buildMonths(): readonly DashboardMonthData[] {
  const months: DashboardMonthData[] = [];

  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    for (let month = 0; month < MONTHS_IN_YEAR; month += 1) {
      const globalMonthIndex = (year - FIRST_YEAR) * MONTHS_IN_YEAR + month;
      const variation = (globalMonthIndex % 6) - 2;
      const totalSpent = 1781.73 + variation * 82.4;
      const budgetTotal = 2700;
      const budgetUsed = clamp(Math.round((totalSpent / budgetTotal) * 100), 44, 88);
      const remaining = budgetTotal - totalSpent;
      const savingsRate = clamp(Math.round(22 - variation * 1.1), 12, 34);
      const savedAmount = totalSpent * (savingsRate / 100);
      const daysLeft = clamp(18 - variation, 8, 26);
      const categoryAmounts = buildCategoryAmounts(totalSpent, globalMonthIndex);
      const categoryTotal = categoryAmounts.reduce((sum, category) => sum + category.amount, 0);
      const splitSegments = buildSplitSegments(globalMonthIndex);

      months.push({
        key: buildMonthKey(year, month),
        monthLabel: `${MONTH_SHORT_NAMES[month]} ${year}`,
        metrics: [
          {
            id: 'total-spent',
            title: 'Total Spent',
            value: formatCurrency(totalSpent),
            subtitle: `${variation <= 0 ? '-' : '+'}${Math.abs(variation) * 4}% MoM`,
            subtitleTone: variation <= 0 ? 'success' : 'muted',
            icon: 'cash-outline',
            iconTone: 'accent',
          },
          {
            id: 'budget-used',
            title: 'Budget Used',
            value: `${budgetUsed}%`,
            subtitle: `${formatCurrencyNoCents(totalSpent)} / ${formatCurrencyNoCents(budgetTotal)}`,
            subtitleTone: 'muted',
            icon: 'radio-button-on-outline',
            iconTone: 'success',
            progressPercent: budgetUsed,
          },
          {
            id: 'remaining',
            title: 'Remaining',
            value: formatCurrency(remaining),
            subtitle: `${daysLeft}d left`,
            subtitleTone: 'muted',
            icon: 'trending-up-outline',
            iconTone: 'success',
          },
          {
            id: 'savings-rate',
            title: 'Savings Rate',
            value: `${savingsRate}%`,
            subtitle: `${formatCurrencyNoCents(savedAmount)} saved`,
            subtitleTone: 'success',
            icon: 'leaf-outline',
            iconTone: 'success',
          },
        ],
        insight: {
          icon: 'analytics-outline',
          emphasis:
            variation > 0
              ? `Spending ${variation * 6}% higher`
              : `Spending ${Math.abs(variation * 5)}% lower`,
          detail:
            variation > 0
              ? 'than usual. Groceries budget may exceed in 6 days.'
              : 'than usual. Budget trend remains under control.',
        },
        chart: {
          title: 'Daily Spending',
          labels: DAY_LABELS,
          values: BASE_SERIES.map((value, index) => {
            const chartVariation = variation * 6 + (index % 3 === 0 ? 8 : 0);
            return Math.max(18, value + chartVariation);
          }),
        },
        categoryBreakdown: {
          title: 'By Category',
          totalLabel: 'Total',
          totalAmountLabel: formatCurrency(categoryTotal),
          categories: buildTopCategoryItems(categoryAmounts).map((category) => ({
            ...category,
            amountLabel: formatCurrency(category.amount),
          })),
        },
        coupleSplit: {
          title: 'Couple Split',
          periodLabel: 'This month',
          segments: splitSegments,
        },
        recentTransactions: {
          title: 'Recent Transactions',
          viewAllLabel: 'View all',
          transactions: buildRecentTransactions(globalMonthIndex),
        },
      });
    }
  }

  return months;
}

function buildMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyNoCents(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildCategoryAmounts(totalSpent: number, indexSeed: number): Array<{
  id: string;
  label: string;
  amount: number;
  color: string;
}> {
  const baseWeights = [
    { id: 'groceries', label: 'Groceries', weight: 0.22, color: '#3f93e7' },
    { id: 'shopping', label: 'Shopping', weight: 0.26, color: '#22b7a0' },
    { id: 'transport', label: 'Transport', weight: 0.14, color: '#d8ab4d' },
    { id: 'health', label: 'Health', weight: 0.12, color: '#8f7ac0' },
    { id: 'home', label: 'Home', weight: 0.19, color: '#cf5d73' },
    { id: 'dining', label: 'Dining', weight: 0.07, color: '#86c285' },
  ];

  const weighted = baseWeights.map((item, itemIndex) => {
    const variation = ((indexSeed + itemIndex) % 5) - 2;
    return {
      ...item,
      adjustedWeight: Math.max(0.04, item.weight + variation * 0.01),
    };
  });

  const totalWeight = weighted.reduce((sum, item) => sum + item.adjustedWeight, 0);
  return weighted.map((item) => ({
    id: item.id,
    label: item.label,
    amount: roundCurrency((totalSpent * item.adjustedWeight) / totalWeight),
    color: item.color,
  }));
}

function buildTopCategoryItems(categories: Array<{
  id: string;
  label: string;
  amount: number;
  color: string;
}>): Array<{
  id: string;
  label: string;
  amount: number;
  color: string;
}> {
  const sorted = [...categories].sort((left, right) => right.amount - left.amount);
  const topCategories = sorted.slice(0, 4);
  const remainingCategories = sorted.slice(4);

  if (remainingCategories.length === 0) {
    return topCategories;
  }

  const othersAmount = remainingCategories.reduce((sum, category) => sum + category.amount, 0);
  return [
    ...topCategories,
    {
      id: 'others',
      label: 'Others',
      amount: roundCurrency(othersAmount),
      color: '#64748b',
    },
  ];
}

function buildSplitSegments(indexSeed: number): Array<{
  id: string;
  label: string;
  percent: number;
  color: string;
}> {
  const mine = clamp(42 + ((indexSeed % 5) - 2) * 2, 34, 52);
  const partner = clamp(22 + ((indexSeed % 3) - 1) * 2, 16, 32);
  const shared = 100 - mine - partner;

  return [
    { id: 'mine', label: 'Mine', percent: mine, color: '#22b7a0' },
    { id: 'partner', label: 'Partner', percent: partner, color: '#8f7ac0' },
    { id: 'shared', label: 'Shared', percent: shared, color: '#3f93e7' },
  ];
}

function buildRecentTransactions(indexSeed: number): Array<{
  id: string;
  merchant: string;
  category: string;
  owner: string;
  ownerColor: string;
  dateLabel: string;
  icon: string;
  amountLabel: string;
  amountTone: 'income' | 'expense';
}> {
  const baseTransactions = [
    { merchant: 'Whole Foods Market', category: 'Groceries', owner: 'Shared', ownerColor: '#3f93e7', icon: '🛒', amount: -127.43, day: 18 },
    { merchant: 'Zara', category: 'Shopping', owner: 'Mine', ownerColor: '#22b7a0', icon: '🛍️', amount: -89.99, day: 17 },
    { merchant: 'Uber', category: 'Transport', owner: 'Mine', ownerColor: '#22b7a0', icon: '🚗', amount: -24.5, day: 17 },
    { merchant: 'Netflix', category: 'Entertainment', owner: 'Shared', ownerColor: '#3f93e7', icon: '🎬', amount: -15.99, day: 16 },
    { merchant: 'CVS Pharmacy', category: 'Health', owner: 'Partner', ownerColor: '#8f7ac0', icon: '💊', amount: -42.15, day: 16 },
    { merchant: 'Salary Deposit', category: 'Income', owner: 'Mine', ownerColor: '#22b7a0', icon: '💰', amount: 4250, day: 15 },
  ];

  return baseTransactions.map((item, itemIndex) => {
    const variationSign = item.amount < 0 ? -1 : 1;
    const variation = ((indexSeed + itemIndex) % 4) * 2.15;
    const amount = roundCurrency(item.amount + variation * variationSign);
    const dateDay = clamp(item.day - (indexSeed % 3), 1, 28);

    return {
      id: `${item.merchant}-${itemIndex}`,
      merchant: item.merchant,
      category: item.category,
      owner: item.owner,
      ownerColor: item.ownerColor,
      dateLabel: `Feb ${dateDay}`,
      icon: item.icon,
      amountLabel: formatCurrencySigned(amount),
      amountTone: amount >= 0 ? 'income' : 'expense',
    };
  });
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCurrencySigned(value: number): string {
  const absolute = formatCurrency(Math.abs(value));
  if (value > 0) {
    return `+${absolute}`;
  }

  if (value < 0) {
    return `-${absolute}`;
  }

  return absolute;
}
