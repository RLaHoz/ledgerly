import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface SafePlaceAlertsViewModel {
  safePaceLabel: string;
  dailyTargetLabel: string;
  paceChipLabel: string;
  currentPaceLabel: string;
  alertsTitle: string;
  criticalLabel: string;
  warningLabel: string;
}

@Component({
  selector: 'app-safe-place-alerts',
  standalone: true,
  templateUrl: './safe-place-alerts.component.html',
  styleUrls: ['./safe-place-alerts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafePlaceAlertsComponent {
  readonly model = input.required<SafePlaceAlertsViewModel>();
}
