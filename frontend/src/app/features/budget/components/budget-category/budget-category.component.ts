import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BudgetItemComponent, BudgetItemViewModel } from '../../../../shared/components/budget-item/budget-item.component';

@Component({
  selector: 'app-budget-category',
  standalone: true,
  imports: [BudgetItemComponent],
  templateUrl: './budget-category.component.html',
  styleUrl: './budget-category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetCategoryComponent {
  readonly title = input.required<string>();
  readonly editLabel = input.required<string>();
  readonly items = input.required<readonly BudgetItemViewModel[]>();

  readonly editRequested = output<void>();
  readonly itemAction = output<string>();

  onItemAction(itemId: string): void {
    this.itemAction.emit(itemId);
  }
}
