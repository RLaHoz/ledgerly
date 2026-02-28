import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardSplitSegment } from '../../models/dashboard.models';

@Component({
  selector: 'app-couple-split-card',
  standalone: true,
  templateUrl: './couple-split-card.component.html',
  styleUrl: './couple-split-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoupleSplitCardComponent {
  readonly title = input.required<string>();
  readonly periodLabel = input.required<string>();
  readonly segments = input.required<DashboardSplitSegment[]>();
}
