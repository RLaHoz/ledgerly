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

      months.push({
        key: buildMonthKey(year, month),
        monthLabel: `${MONTH_SHORT_NAMES[month]} ${year}`,
        metrics: [
          {
            id: 'total-spent',
            title: 'Total Spent',
            value: formatCurrency(totalSpent),
            subtitle: `${variation <= 0 ? '-' : '+'}${Math.abs(variation) * 4}% vs last month`,
            subtitleTone: variation <= 0 ? 'success' : 'muted',
            icon: 'cash-outline',
            iconTone: 'accent',
          },
          {
            id: 'budget-used',
            title: 'Budget Used',
            value: `${budgetUsed}%`,
            subtitle: `${formatCurrency(totalSpent)} of ${formatCurrency(budgetTotal)}`,
            subtitleTone: 'muted',
            icon: 'radio-button-on-outline',
            iconTone: 'success',
            progressPercent: budgetUsed,
          },
          {
            id: 'remaining',
            title: 'Remaining',
            value: formatCurrency(remaining),
            subtitle: `${daysLeft} days left`,
            subtitleTone: 'muted',
            icon: 'trending-up-outline',
            iconTone: 'success',
          },
          {
            id: 'savings-rate',
            title: 'Savings Rate',
            value: `${savingsRate}%`,
            subtitle: `${formatCurrency(savedAmount)} saved`,
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
