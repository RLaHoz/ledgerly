import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { initialDashboardState } from './dashboard.state';

const MIN_DATE = '2025-01-01';
const MAX_DATE = '2027-12-31';

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialDashboardState),
  withComputed((store) => ({
    monthKey: computed(() => store.selectedDate().slice(0, 7)),
    currentMonth: computed(() => {
      const current = store.months().find((month) => month.key === store.selectedDate().slice(0, 7));
      return current ?? store.months()[0];
    }),
    monthLabel: computed(() => {
      const current = store.months().find((month) => month.key === store.selectedDate().slice(0, 7));
      return (current ?? store.months()[0]).monthLabel;
    }),
    metricCards: computed(() => {
      const current = store.months().find((month) => month.key === store.selectedDate().slice(0, 7));
      return (current ?? store.months()[0]).metrics;
    }),
    insight: computed(() => {
      const current = store.months().find((month) => month.key === store.selectedDate().slice(0, 7));
      return (current ?? store.months()[0]).insight;
    }),
    chartData: computed(() => {
      const current = store.months().find((month) => month.key === store.selectedDate().slice(0, 7));
      return (current ?? store.months()[0]).chart;
    }),
    categoryBreakdown: computed(() => {
      const current = store.months().find((month) => month.key === store.selectedDate().slice(0, 7));
      return (current ?? store.months()[0]).categoryBreakdown;
    }),
    coupleSplit: computed(() => {
      const current = store.months().find((month) => month.key === store.selectedDate().slice(0, 7));
      return (current ?? store.months()[0]).coupleSplit;
    }),
    recentTransactions: computed(() => {
      const current = store.months().find((month) => month.key === store.selectedDate().slice(0, 7));
      const recentTransactions = (current ?? store.months()[0]).recentTransactions;
      return {
        ...recentTransactions,
        transactions: recentTransactions.transactions.slice(0, 4),
      };
    }),
    minDate: computed(() => MIN_DATE),
    maxDate: computed(() => MAX_DATE),
  })),
  withMethods((store) => ({
    previousMonth(): void {
      const nextDate = shiftMonth(store.selectedDate(), -1);
      patchState(store, { selectedDate: clampDate(nextDate) });
    },
    nextMonth(): void {
      const nextDate = shiftMonth(store.selectedDate(), 1);
      patchState(store, { selectedDate: clampDate(nextDate) });
    },
    setSelectedDate(selectedDate: string): void {
      if (!isValidDateValue(selectedDate)) {
        return;
      }

      patchState(store, { selectedDate: clampDate(selectedDate) });
    },
  })),
);

function clampDate(value: string): string {
  if (value < MIN_DATE) {
    return MIN_DATE;
  }

  if (value > MAX_DATE) {
    return MAX_DATE;
  }

  return value;
}

function isValidDateValue(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return toIsoDate(parsed) === value;
}

function shiftMonth(value: string, amount: number): string {
  const [yearPart, monthPart, dayPart] = value.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return value;
  }

  const baseDate = new Date(year, month - 1, 1);
  baseDate.setMonth(baseDate.getMonth() + amount);

  const maxDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  baseDate.setDate(Math.min(day, maxDay));

  return toIsoDate(baseDate);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
