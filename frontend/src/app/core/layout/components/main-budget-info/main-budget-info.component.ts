import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface MainBudgetInfoViewModel {
  monthLabel: string;
  spentLabel: string;
  totalLabel: string;
  usagePercentLabel: string;
  remainingLabel: string;
  daysLeftLabel: string;
  projectionLabel: string;
  actionLabel: string;
  paceLabel: string;
  varianceLabel: string;
  progressPercent: number;
}

@Component({
  selector: 'app-main-budget-info',
  standalone: true,
  templateUrl: './main-budget-info.component.html',
  styleUrls: ['./main-budget-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainBudgetInfoComponent {
  readonly model = input.required<MainBudgetInfoViewModel>();

  readonly progressPercent = computed(() => clamp(this.model().progressPercent, 0, 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
