import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-dashboard-month-selector',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './dashboard-month-selector.component.html',
  styleUrl: './dashboard-month-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardMonthSelectorComponent {
  readonly monthLabel = input.required<string>();

  readonly previousMonth = output<void>();
  readonly nextMonth = output<void>();

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
    });
  }
}
