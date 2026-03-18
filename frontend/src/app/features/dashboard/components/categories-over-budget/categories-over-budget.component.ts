import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertOutline, chevronForwardOutline } from 'ionicons/icons';

export interface OverBudgetCategoryViewModel {
  id: string;
  name: string;
  overBudgetAmount: number;
}

@Component({
  selector: 'app-categories-over-budget',
  standalone: true,
  templateUrl: './categories-over-budget.component.html',
  styleUrls: ['./categories-over-budget.component.scss'],
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesOverBudgetComponent {
  readonly categories = input.required<readonly OverBudgetCategoryViewModel[]>();
  readonly urgentCta = output<void>();

  readonly message = computed(() => {
    const categories = this.categories();
    const count = categories.length;
    const total = categories.reduce((sum, item) => sum + item.overBudgetAmount, 0);
    const formattedTotal = formatDashboardCurrency(total);
    const noun = count === 1 ? 'category is' : 'categories are';
    return `${count} ${noun} ${formattedTotal} over budget`;
  });

  constructor() {
    addIcons({
      'alert-outline': alertOutline,
      'chevron-forward-outline': chevronForwardOutline,
    });
  }

  onClick(): void {
    this.urgentCta.emit();
  }
}

function formatDashboardCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
