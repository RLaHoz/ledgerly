import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import {
  BudgetHealthComponent,
  BudgetHealthStatViewModel,
} from '../../core/layout/components/budget-health/budget-health.component';
import {
  MainBudgetInfoComponent,
  MainBudgetInfoViewModel,
} from '../../core/layout/components/main-budget-info/main-budget-info.component';
import {
  SafePlaceAlertsComponent,
  SafePlaceAlertsViewModel,
} from '../../core/layout/components/safe-place-alerts/safe-place-alerts.component';
import {
  PriorityComponent,
  PriorityItemViewModel,
} from '../../core/layout/components/priority/priority.component';
import { BudgetPressureComponent } from '../../core/layout/components/budget-pressure/budget-pressure.component';
import { BudgetItemViewModel } from '../../shared/components/budget-item/budget-item.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  imports: [
    IonContent,
    BudgetHealthComponent,
    MainBudgetInfoComponent,
    SafePlaceAlertsComponent,
    PriorityComponent,
    BudgetPressureComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly monthFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  readonly selectedMonthDate = signal('2026-02-01');
  readonly minMonthDate = '2020-01-01';
  readonly maxMonthDate = '2035-12-01';
  readonly monthLabel = computed(() => this.formatMonthLabel(this.selectedMonthDate()));

  readonly budgetHealthLabel = 'Stable';
  readonly updatedLabel = 'Updated 2m ago';
  readonly trendLabel = 'Trend: unchanged vs last month';
  readonly budgetHealthStats: readonly BudgetHealthStatViewModel[] = [
    { id: 'exceeded', tone: 'danger', count: 2, label: 'exceeded' },
    { id: 'high-risk', tone: 'warning', count: 1, label: 'high risk' },
    { id: 'moderate', tone: 'moderate', count: 3, label: 'moderate' },
  ];

  readonly mainBudgetInfo = computed<MainBudgetInfoViewModel>(() => ({
    monthLabel: this.monthLabel(),
    spentLabel: '$3,246',
    totalLabel: '$3,920',
    usagePercentLabel: '83%',
    remainingLabel: '$674 remaining',
    daysLeftLabel: '3 days left',
    projectionLabel: 'Projected: +$284',
    actionLabel: 'Adjust \u2192',
    paceLabel: 'At current pace: finish +$284 above target',
    varianceLabel: 'Primary variance: Shopping (+$87 trend)',
    progressPercent: 83,
  }));

  readonly safePlaceAlerts: SafePlaceAlertsViewModel = {
    safePaceLabel: 'Safe pace',
    dailyTargetLabel: '$225/day',
    paceChipLabel: 'Under pace',
    currentPaceLabel: 'Currently: $130/day',
    alertsTitle: 'Alerts',
    criticalLabel: '2 critical',
    warningLabel: '6 warnings',
  };

  readonly priorityItems: readonly PriorityItemViewModel[] = [
    {
      id: 'home-gym',
      title: 'Home & Gym exceeded',
      actionLabel: 'Review \u2192',
      tone: 'danger',
    },
    {
      id: 'shopping',
      title: 'Shopping nearing limit',
      actionLabel: 'Adjust \u2192',
      tone: 'warning',
    },
  ];

  readonly budgetPressureItems: readonly BudgetItemViewModel[] = [
    {
      id: 'home',
      name: 'Home',
      spentLabel: '$1,200',
      limitLabel: '$1,200',
      leftLabel: '$0 left',
      status: 'exceeded',
      progressPercent: 100,
      iconName: 'home-outline',
      iconTone: 'home',
    },
    {
      id: 'gym',
      name: 'Gym',
      spentLabel: '$120',
      limitLabel: '$120',
      leftLabel: '$0 left',
      status: 'exceeded',
      progressPercent: 100,
      iconName: 'barbell-outline',
      iconTone: 'gym',
    },
    {
      id: 'shopping',
      name: 'Shopping',
      spentLabel: '$467',
      limitLabel: '$500',
      leftLabel: '$33 left',
      status: 'high-risk',
      progressPercent: 93,
      iconName: 'bag-handle-outline',
      iconTone: 'shopping',
    },
    {
      id: 'transport',
      name: 'Transport',
      spentLabel: '$289',
      limitLabel: '$350',
      leftLabel: '$61 left',
      status: 'moderate',
      progressPercent: 83,
      iconName: 'car-sport-outline',
      iconTone: 'transport',
    },
    {
      id: 'baby',
      name: 'Baby',
      spentLabel: '$312',
      limitLabel: '$400',
      leftLabel: '$88 left',
      status: 'moderate',
      progressPercent: 78,
      iconName: 'happy-outline',
      iconTone: 'baby',
    },
    {
      id: 'groceries',
      name: 'Groceries',
      spentLabel: '$624',
      limitLabel: '$800',
      leftLabel: '$176 left',
      status: 'moderate',
      progressPercent: 78,
      iconName: 'cart-outline',
      iconTone: 'groceries',
    },
  ];

  onPreviousMonth(): void {
    this.selectedMonthDate.update((currentMonth) => this.shiftMonth(currentMonth, -1));
  }

  onNextMonth(): void {
    this.selectedMonthDate.update((currentMonth) => this.shiftMonth(currentMonth, 1));
  }

  onMonthSelected(value: string): void {
    if (!value) {
      return;
    }

    this.selectedMonthDate.set(this.normalizeToMonthDate(value));
  }

  onBudgetPressureItemAction(itemId: string): void {
    void itemId;
  }

  onBudgetPressureViewAll(): void {
    // Placeholder for navigation to the full budget pressure list.
  }

  private shiftMonth(isoMonthDate: string, delta: number): string {
    const [year, month] = this.normalizeToMonthDate(isoMonthDate)
      .split('-')
      .map((part) => Number.parseInt(part, 10));
    const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
    return this.toMonthDate(shifted);
  }

  private formatMonthLabel(isoMonthDate: string): string {
    const [year, month] = this.normalizeToMonthDate(isoMonthDate)
      .split('-')
      .map((part) => Number.parseInt(part, 10));
    const date = new Date(Date.UTC(year, month - 1, 1));
    return this.monthFormatter.format(date);
  }

  private normalizeToMonthDate(value: string): string {
    if (/^\d{4}-\d{2}$/.test(value)) {
      return `${value}-01`;
    }

    return value.slice(0, 10);
  }

  private toMonthDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}-01`;
  }
}
