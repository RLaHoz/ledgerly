import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardCategoryItem } from '../../models/dashboard.models';

interface CategoryBarVm {
  id: string;
  label: string;
  amountLabel: string;
  color: string;
  percent: number;
}

@Component({
  selector: 'app-category-breakdown-card',
  standalone: true,
  templateUrl: './category-breakdown-card.component.html',
  styleUrl: './category-breakdown-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBreakdownCardComponent {
  readonly title = input.required<string>();
  readonly totalLabel = input.required<string>();
  readonly totalAmountLabel = input.required<string>();
  readonly categories = input.required<DashboardCategoryItem[]>();

  readonly categoryBars = computed<readonly CategoryBarVm[]>(() => {
    const categories = this.categories();
    const total = categories.reduce((sum, category) => sum + category.amount, 0);
    if (total <= 0) {
      return categories.map((category) => ({
        id: category.id,
        label: category.label,
        amountLabel: category.amountLabel,
        color: category.color,
        percent: 0,
      }));
    }

    return categories.map((category) => ({
      id: category.id,
      label: category.label,
      amountLabel: category.amountLabel,
      color: category.color,
      percent: Math.round((category.amount / total) * 100),
    }));
  });
}
