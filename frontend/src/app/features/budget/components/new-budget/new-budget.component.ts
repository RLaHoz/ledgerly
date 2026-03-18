import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, trashOutline } from 'ionicons/icons';

type DraftSubcategory = {
  id: number;
  name: string;
  amount: string;
};

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

  readonly subcategories = signal<readonly DraftSubcategory[]>([{ id: 1, name: '', amount: '' }]);

  constructor() {
    addIcons({
      'add-outline': addOutline,
      'close-outline': closeOutline,
      'trash-outline': trashOutline,
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

  onAddSubcategory(): void {
    const nextId = this.subcategories().reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
    this.subcategories.update((items) => [...items, { id: nextId, name: '', amount: '' }]);
  }

  onSubcategoryNameInput(id: number, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.subcategories.update((items) =>
      items.map((item) => (item.id === id ? { ...item, name: target?.value ?? '' } : item)),
    );
  }

  onSubcategoryAmountInput(id: number, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const nextAmount = (target?.value ?? '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

    this.subcategories.update((items) =>
      items.map((item) => (item.id === id ? { ...item, amount: nextAmount } : item)),
    );
  }

  onDeleteSubcategory(id: number): void {
    this.subcategories.update((items) => {
      const nextItems = items.filter((item) => item.id !== id);
      return nextItems.length > 0 ? nextItems : [{ id: Date.now(), name: '', amount: '' }];
    });
  }
}
