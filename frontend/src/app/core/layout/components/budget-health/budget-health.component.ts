import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

export interface BudgetHealthStatViewModel {
  id: string;
  tone: 'danger' | 'warning' | 'moderate';
  count: number;
  label: string;
}

@Component({
  selector: 'app-budget-health',
  standalone: true,
  templateUrl: './budget-health.component.html',
  styleUrls: ['./budget-health.component.scss'],
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetHealthComponent {
  readonly monthLabel = input.required<string>();
  readonly healthLabel = input.required<string>();
  readonly updatedLabel = input.required<string>();
  readonly trendLabel = input.required<string>();
  readonly stats = input.required<readonly BudgetHealthStatViewModel[]>();

  readonly previousRequested = output<void>();
  readonly nextRequested = output<void>();

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
    });
  }
}
