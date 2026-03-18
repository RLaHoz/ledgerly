import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, warningOutline } from 'ionicons/icons';
import { BudgetSignalVm } from '../../models/budget.models';

@Component({
  selector: 'app-budget-signals',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './budget-signals.component.html',
  styleUrl: './budget-signals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetSignalsComponent {
  readonly items = input.required<readonly BudgetSignalVm[]>();

  constructor() {
    addIcons({
      'checkmark-circle-outline': checkmarkCircleOutline,
      'close-circle-outline': closeCircleOutline,
      'warning-outline': warningOutline,
    });
  }

  trackById(_: number, item: BudgetSignalVm): string {
    return item.id;
  }
}
