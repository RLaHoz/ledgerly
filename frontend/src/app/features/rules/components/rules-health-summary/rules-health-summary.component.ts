import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline } from 'ionicons/icons';

export interface RulesHealthSummaryStat {
  id: string;
  label: string;
  value: string;
  subtext: string;
  tone?: 'default' | 'success';
}

@Component({
  selector: 'app-rules-health-summary',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './rules-health-summary.component.html',
  styleUrl: './rules-health-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesHealthSummaryComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly stats = input.required<readonly RulesHealthSummaryStat[]>();

  constructor() {
    addIcons({
      'shield-checkmark-outline': shieldCheckmarkOutline,
    });
  }
}
