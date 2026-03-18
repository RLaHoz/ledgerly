import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

export type DashboardTone = 'success' | 'warning' | 'critical';

@Component({
  selector: 'app-budget-card',
  standalone: true,
  templateUrl: './budget-card.component.html',
  styleUrls: ['./budget-card.component.scss'],
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetCardComponent {
  readonly heroSpentLabel = input.required<string>();
  readonly heroBudgetLabel = input.required<string>();
  readonly heroPercentageLabel = input.required<string>();
  readonly heroPercentageTone = input<DashboardTone>('warning');
  readonly heroProgressPercent = input.required<number>();
  readonly heroRemainingLabel = input.required<string>();
  readonly heroDaysRemainingLabel = input.required<string>();
  readonly heroForecastValueLabel = input.required<string>();
  readonly heroForecastSecondaryLabel = input.required<string>();
  readonly heroForecastValueTone = input<DashboardTone>('success');
  readonly heroForecastActionLabel = input.required<string>();
  readonly forecastAdjust = output<void>();

  readonly progressPercent = computed(() => Math.min(100, Math.max(0, this.heroProgressPercent())));
  readonly percentageClass = computed(() => `dashboard-hero-percentage-${this.heroPercentageTone()}`);
  readonly progressFillClass = computed(
    () => `dashboard-hero-progress-fill-${this.heroPercentageTone()}`,
  );
  readonly forecastValueClass = computed(
    () => `dashboard-hero-forecast-value-${this.heroForecastValueTone()}`,
  );

  constructor() {
    addIcons({ 'chevron-forward-outline': chevronForwardOutline });
  }

  onForecastAdjust(): void {
    this.forecastAdjust.emit();
  }
}
