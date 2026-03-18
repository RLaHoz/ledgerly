import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonModal } from '@ionic/angular/standalone';
import {
  BudgetCategoryCardViewModel,
  BudgetCategoryComponent,
} from './components/budget-category/budget-category.component';
import { NewBudgetComponent } from './components/new-budget/new-budget.component';
import { BudgetOverviewComponent, BudgetOverviewViewModel } from './components/budget-overview/budget-overview.component';
import { BudgetStore } from './store/budget.store';

@Component({
  selector: 'app-budget',
  templateUrl: './budget.page.html',
  styleUrls: ['./budget.page.scss'],
  standalone: true,
  imports: [IonContent, IonModal, BudgetOverviewComponent, BudgetCategoryComponent, NewBudgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetPage {
  readonly store = inject(BudgetStore);
  private readonly router = inject(Router);

  readonly overview = computed<BudgetOverviewViewModel>(() => ({
    title: 'FEBRUARY 2026 OVERVIEW',
    metrics: this.store.overviewMetrics(),
    footerLabel: '3 days remaining in February',
  }));

  readonly categoryCards = computed<readonly BudgetCategoryCardViewModel[]>(() =>
    this.store.categories().map((item) => {
      const seed = CATEGORY_UI_SEEDS[item.id] ?? DEFAULT_CATEGORY_UI_SEED;
      const statusTone = mapCategoryTone(item.status);

      return {
        id: item.id,
        name: item.name,
        subCountLabel: `${seed.subCount} sub`,
        statusLabel: mapBudgetStatusLabel(statusTone),
        statusTone,
        spentLabel: item.spentLabel,
        limitLabel: item.limitLabel,
        leftLabel: item.leftLabel,
        progressPercent: item.progressPercent,
        trendLabel: seed.trendLabel,
        trendTone: seed.trendTone,
        iconName: item.iconName,
        iconTone: item.iconTone,
      };
    }),
  );

  onEditBudgets(): void {
    this.store.requestEditBudgets();
  }

  onCloseNewBudget(): void {
    this.store.closeNewBudgetModal();
  }

  onNewBudgetNameInput(value: string): void {
    this.store.setNewBudgetNameInput(value);
  }

  onNewBudgetAmountInput(value: string): void {
    this.store.setNewBudgetAmountInput(value);
  }

  onAddNewBudget(): void {
    this.store.addNewBudgetCategory();
  }

  onCategoryItemAction(itemId: string): void {
    this.store.openBudgetItem(itemId);
    void this.router.navigate(['/budget/detail', itemId]);
  }
}

type BudgetCategorySeed = {
  subCount: number;
  trendLabel: string;
  trendTone: 'up' | 'down' | 'stable';
};

const DEFAULT_CATEGORY_UI_SEED: BudgetCategorySeed = {
  subCount: 3,
  trendLabel: 'Stable vs last month',
  trendTone: 'stable',
};

const CATEGORY_UI_SEEDS: Record<string, BudgetCategorySeed> = {
  home: { subCount: 3, trendLabel: 'Stable vs last month', trendTone: 'stable' },
  gym: { subCount: 2, trendLabel: 'Stable vs last month', trendTone: 'stable' },
  shopping: { subCount: 4, trendLabel: '+23% vs last month', trendTone: 'up' },
  transport: { subCount: 4, trendLabel: '-7% vs last month', trendTone: 'down' },
  baby: { subCount: 4, trendLabel: '+12% vs last month', trendTone: 'up' },
  groceries: { subCount: 5, trendLabel: '+6% vs last month', trendTone: 'up' },
  entertainment: { subCount: 3, trendLabel: '-34% vs last month', trendTone: 'down' },
  health: { subCount: 3, trendLabel: '-41% vs last month', trendTone: 'down' },
};

function mapCategoryTone(status: string): 'over' | 'watch' | 'on-track' {
  if (status === 'over' || status === 'exceeded') {
    return 'over';
  }

  if (status === 'watch' || status === 'high-risk') {
    return 'watch';
  }

  return 'on-track';
}

function mapBudgetStatusLabel(tone: 'over' | 'watch' | 'on-track'): string {
  if (tone === 'over') {
    return 'Over';
  }

  if (tone === 'watch') {
    return 'Watch';
  }

  return 'On Track';
}
