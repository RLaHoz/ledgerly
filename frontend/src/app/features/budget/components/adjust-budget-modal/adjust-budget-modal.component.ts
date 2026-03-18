import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon, IonModal } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

export interface AdjustBudgetModalSubcategoryVm {
  id: string;
  name: string;
  limitLabel: string;
}

@Component({
  selector: 'app-adjust-budget-modal',
  standalone: true,
  imports: [IonModal, IonIcon],
  templateUrl: './adjust-budget-modal.component.html',
  styleUrl: './adjust-budget-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdjustBudgetModalComponent {
  readonly isOpen = input(false);
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly currentBudgetLabel = input.required<string>();
  readonly adjustAmount = input.required<string>();
  readonly recommendedBudgetLabel = input.required<string>();
  readonly subcategories = input.required<readonly AdjustBudgetModalSubcategoryVm[]>();
  readonly balanceLabel = input.required<string>();
  readonly balanceStatusLabel = input.required<string>();
  readonly canSave = input(false);

  readonly dismissed = output<void>();
  readonly amountChanged = output<Event>();
  readonly recommendedSelected = output<void>();
  readonly canceled = output<void>();
  readonly saved = output<void>();

  constructor() {
    addIcons({
      'close-outline': closeOutline,
    });
  }
}
