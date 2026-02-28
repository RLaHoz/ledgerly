import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-new-budget',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './new-budget.component.html',
  styleUrl: './new-budget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewBudgetComponent {
  readonly categoryName = input.required<string>();
  readonly monthlyBudget = input.required<string>();
  readonly canAdd = input<boolean>(false);

  readonly closed = output<void>();
  readonly categoryNameChanged = output<string>();
  readonly monthlyBudgetChanged = output<string>();
  readonly canceled = output<void>();
  readonly addRequested = output<void>();

  constructor() {
    addIcons({
      'close-outline': closeOutline,
    });
  }

  onCategoryNameInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.categoryNameChanged.emit(target?.value ?? '');
  }

  onMonthlyBudgetInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.monthlyBudgetChanged.emit(target?.value ?? '');
  }
}
