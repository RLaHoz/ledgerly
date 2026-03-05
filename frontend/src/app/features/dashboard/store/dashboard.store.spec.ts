import { TestBed } from '@angular/core/testing';
import { DashboardStore } from './dashboard.store';

describe('DashboardStore', () => {
  let store: InstanceType<typeof DashboardStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(DashboardStore);
  });

  it('should expose february 2026 by default', () => {
    expect(store.selectedDate()).toBe('2026-02-18');
    expect(store.monthLabel()).toBe('Feb 2026');
    expect(store.metricCards()).toHaveSize(4);
    expect(store.chartData().values.length).toBeGreaterThan(0);
    expect(store.categoryBreakdown().categories.length).toBe(5);
    expect(store.coupleSplit().segments.length).toBe(3);
    expect(store.recentTransactions().transactions.length).toBe(4);
  });

  it('should preserve day and move to previous month', () => {
    store.setSelectedDate('2026-03-18');
    store.previousMonth();

    expect(store.selectedDate()).toBe('2026-02-18');
    expect(store.monthLabel()).toBe('Feb 2026');
  });

  it('should ignore invalid selected date values', () => {
    const previousDate = store.selectedDate();

    store.setSelectedDate('invalid-date');

    expect(store.selectedDate()).toBe(previousDate);
  });
});
