import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { analyticsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-insight-banner',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './insight-banner.component.html',
  styleUrl: './insight-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightBannerComponent {
  readonly icon = input.required<string>();
  readonly emphasis = input.required<string>();
  readonly detail = input.required<string>();

  constructor() {
    addIcons({
      'analytics-outline': analyticsOutline,
    });
  }
}
