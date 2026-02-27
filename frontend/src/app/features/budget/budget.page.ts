import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonModal } from '@ionic/angular/standalone';
import { BudgetCategoryComponent } from './components/budget-category/budget-category.component';
import { NewBudgetComponent } from './components/new-budget/new-budget.component';
import { BudgetOverviewComponent, BudgetOverviewViewModel } from './components/budget-overview/budget-overview.component';
import { BudgetSignalsComponent } from './components/budget-signals/budget-signals.component';
import { BudgetStore } from './store/budget.store';

@Component({
  selector: 'app-budget',
  templateUrl: './budget.page.html',
  styleUrls: ['./budget.page.scss'],
  standalone: true,
  imports: [IonContent, IonModal, BudgetOverviewComponent, BudgetSignalsComponent, BudgetCategoryComponent, NewBudgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetPage {
  readonly store = inject(BudgetStore);
  private readonly router = inject(Router);

  readonly overview = computed<BudgetOverviewViewModel>(() => ({
    title: this.store.overviewTitle(),
    metrics: this.store.overviewMetrics(),
  }));

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
