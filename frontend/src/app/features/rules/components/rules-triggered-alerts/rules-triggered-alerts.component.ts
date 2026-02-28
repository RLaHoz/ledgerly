import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { RulesTriggeredAlertItem } from '../../models/rules.models';

@Component({
  selector: 'app-rules-triggered-alerts',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './rules-triggered-alerts.component.html',
  styleUrl: './rules-triggered-alerts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesTriggeredAlertsComponent {
  readonly title = input.required<string>();
  readonly count = input.required<number>();
  readonly summary = input.required<string>();
  readonly items = input.required<readonly RulesTriggeredAlertItem[]>();

  readonly selected = output<string>();

  constructor() {
    addIcons({
      'chevron-forward-outline': chevronForwardOutline,
    });
  }

  onSelect(itemId: string): void {
    this.selected.emit(itemId);
  }
}
