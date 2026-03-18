import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardTone } from '../budget-card/budget-card.component';

@Component({
  selector: 'app-daily-spend-card',
  standalone: true,
  templateUrl: './daily-spend-card.component.html',
  styleUrls: ['./daily-spend-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailySpendCardComponent {
  readonly dailySpendLabel = input.required<string>();
  readonly dailySpendValueLabel = input.required<string>();
  readonly currentPaceLabel = input.required<string>();
  readonly currentPaceValueLabel = input.required<string>();
  readonly currentPaceTone = input<DashboardTone>('success');

  readonly paceClass = computed(() => `dashboard-card-value-${this.currentPaceTone()}`);
}
