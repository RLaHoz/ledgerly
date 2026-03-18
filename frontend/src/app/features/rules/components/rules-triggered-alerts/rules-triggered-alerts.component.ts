import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, pricetagOutline } from 'ionicons/icons';
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
  readonly summary = input.required<string>();
  readonly items = input.required<readonly RulesTriggeredAlertItem[]>();

  constructor() {
    addIcons({
      'pricetag-outline': pricetagOutline,
      'notifications-outline': notificationsOutline,
    });
  }

  iconName(icon: RulesTriggeredAlertItem['icon']): string {
    return icon === 'tag' ? 'pricetag-outline' : 'notifications-outline';
  }
}
