import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  leafOutline,
  radioButtonOnOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import { DashboardIconTone, DashboardSubtitleTone } from '../../models/dashboard.models';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly subtitleTone = input<DashboardSubtitleTone>('muted');
  readonly icon = input.required<string>();
  readonly iconTone = input<DashboardIconTone>('accent');
  readonly progressPercent = input<number | undefined>(undefined);

  readonly hasProgress = computed(() => this.progressPercent() !== undefined);
  readonly safeProgress = computed(() => {
    const value = this.progressPercent();
    if (value === undefined) {
      return 0;
    }

    return Math.max(0, Math.min(100, value));
  });

  constructor() {
    addIcons({
      'cash-outline': cashOutline,
      'radio-button-on-outline': radioButtonOnOutline,
      'trending-up-outline': trendingUpOutline,
      'leaf-outline': leafOutline,
    });
  }
}
