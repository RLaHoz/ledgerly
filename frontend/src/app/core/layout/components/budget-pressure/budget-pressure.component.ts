import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BudgetItemComponent, BudgetItemViewModel } from '../../../../shared/components/budget-item/budget-item.component';

@Component({
  selector: 'app-budget-pressure',
  standalone: true,
  templateUrl: './budget-pressure.component.html',
  styleUrls: ['./budget-pressure.component.scss'],
  imports: [BudgetItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetPressureComponent {
  readonly title = input<string>('BUDGET PRESSURE');
  readonly viewAllLabel = input<string>('View all');
  readonly items = input.required<readonly BudgetItemViewModel[]>();
  readonly editable = input<boolean>(false);

  readonly viewAllRequested = output<void>();
  readonly itemAction = output<string>();

  onItemAction(itemId: string): void {
    this.itemAction.emit(itemId);
  }
}
