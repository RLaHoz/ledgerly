import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BudgetOverviewMetricVm } from '../../models/budget.models';

export interface BudgetOverviewViewModel {
  title: string;
  metrics: readonly BudgetOverviewMetricVm[];
}

@Component({
  selector: 'app-budget-overview',
  standalone: true,
  templateUrl: './budget-overview.component.html',
  styleUrl: './budget-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetOverviewComponent {
  readonly model = input.required<BudgetOverviewViewModel>();

  trackById(_: number, metric: BudgetOverviewMetricVm): string {
    return metric.id;
  }
}
