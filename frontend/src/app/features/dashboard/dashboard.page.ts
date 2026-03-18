import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { BudgetCardComponent } from './components/budget-card/budget-card.component';
import {
  BudgetCategoriesTrackingComponent,
  BudgetTrackingItemViewModel,
} from './components/budget-categories-tracking/budget-categories-tracking.component';
import {
  CategoriesOnTrackBudgetComponent,
  OnTrackCategoryViewModel,
} from './components/categories-ontrack-budget/categories-ontrack-budget.component';
import {
  CategoriesOverBudgetComponent,
  OverBudgetCategoryViewModel,
} from './components/categories-over-budget/categories-over-budget.component';
import { DailySpendCardComponent } from './components/daily-spend-card/daily-spend-card.component';
import { DashboardMonthSelectorComponent } from './components/dashboard-month-selector/dashboard-month-selector.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  imports: [
    IonContent,
    DashboardMonthSelectorComponent,
    CategoriesOverBudgetComponent,
    CategoriesOnTrackBudgetComponent,
    BudgetCardComponent,
    DailySpendCardComponent,
    BudgetCategoriesTrackingComponent,
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
  readonly monthLabel = computed(() => this.formatMonthLabel(this.selectedMonthDate()));

  readonly overBudgetCategories: readonly OverBudgetCategoryViewModel[] = [
    { id: 'home', name: 'Home', overBudgetAmount: 0 },
    { id: 'gym', name: 'Gym', overBudgetAmount: 0 },
  ];

  readonly heroSpentLabel = '$3,246';
  readonly heroBudgetLabel = '$3,920';
  readonly heroPercentageLabel = '83%';
  readonly heroPercentageTone = 'warning' as const;
  readonly heroProgressPercent = 83;
  readonly heroRemainingLabel = '$674 left';
  readonly heroDaysRemainingLabel = '3 days remaining';
  readonly heroForecastValueLabel = '+$284 under';
  readonly heroForecastValueTone = 'success' as const;
  readonly heroForecastSecondaryLabel = 'Safe to spend $225/day';
  readonly heroForecastActionLabel = 'Details';

  readonly dailySpendLabel = 'Safe daily spend';
  readonly dailySpendValueLabel = '$225';
  readonly currentPaceLabel = 'Current pace';
  readonly currentPaceValueLabel = '$130/day';
  readonly currentPaceTone = 'success' as const;

  readonly categoryItems: readonly BudgetTrackingItemViewModel[] = [
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
      detailSummary: 'Budget fully used',
      detailRecommendation: 'Increase budget by $50 or review spending',
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
      detailSummary: 'Budget fully used',
      detailRecommendation: 'Increase budget by $15 or review spending',
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
      detailSummary: 'At current rate, exceeds in 2 days',
      detailRecommendation: 'Reduce by $23/week to stay on track',
    },
    {
      id: 'transport',
      name: 'Transport',
      spentLabel: '$289',
      limitLabel: '$350',
      leftLabel: '$61 left',
      status: 'high-risk',
      progressPercent: 83,
      iconName: 'car-sport-outline',
      iconTone: 'transport',
      detailSummary: 'At current rate, exceeds in 4 days',
      detailRecommendation: 'Reduce by $14/week to stay on track',
    },
    {
      id: 'baby',
      name: 'Baby',
      spentLabel: '$312',
      limitLabel: '$400',
      leftLabel: '$88 left',
      status: 'on-track',
      progressPercent: 78,
      iconName: 'happy-outline',
      iconTone: 'baby',
      detailSummary: 'On pace to finish within budget',
      detailRecommendation: '',
    },
    {
      id: 'groceries',
      name: 'Groceries',
      spentLabel: '$624',
      limitLabel: '$800',
      leftLabel: '$176 left',
      status: 'on-track',
      progressPercent: 78,
      iconName: 'cart-outline',
      iconTone: 'groceries',
      detailSummary: 'On pace to finish within budget',
      detailRecommendation: '',
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      spentLabel: '$145',
      limitLabel: '$300',
      leftLabel: '$155 left',
      status: 'on-track',
      progressPercent: 48,
      iconName: 'business-outline',
      iconTone: 'entertainment',
      detailSummary: 'On pace to finish within budget',
      detailRecommendation: '',
    },
  ];

  readonly onTrackCategories: readonly OnTrackCategoryViewModel[] = this.categoryItems
    .filter((item) => item.status === 'on-track')
    .map((item) => ({ id: item.id, name: item.name }));

  onPreviousMonth(): void {
    this.selectedMonthDate.update((currentMonth) => this.shiftMonth(currentMonth, -1));
  }

  onNextMonth(): void {
    this.selectedMonthDate.update((currentMonth) => this.shiftMonth(currentMonth, 1));
  }

  onSeeAll(): void {
    // UI-only placeholder.
  }

  onForecastAdjust(): void {
    // UI-only placeholder.
  }

  onUrgentCta(): void {
    // UI-only placeholder.
  }

  private shiftMonth(isoMonthDate: string, delta: number): string {
    const [year, month] = isoMonthDate.split('-').map((part) => Number.parseInt(part, 10));
    const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
    return this.toMonthDate(shifted);
  }

  private formatMonthLabel(isoMonthDate: string): string {
    const [year, month] = isoMonthDate.split('-').map((part) => Number.parseInt(part, 10));
    const date = new Date(Date.UTC(year, month - 1, 1));
    return this.monthFormatter.format(date);
  }

  private toMonthDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}-01`;
  }
}
