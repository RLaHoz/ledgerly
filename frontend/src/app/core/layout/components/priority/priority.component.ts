import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface PriorityItemViewModel {
  id: string;
  title: string;
  actionLabel: string;
  tone: 'danger' | 'warning';
}

@Component({
  selector: 'app-priority',
  standalone: true,
  templateUrl: './priority.component.html',
  styleUrls: ['./priority.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityComponent {
  readonly title = input<string>('PRIORITY');
  readonly items = input.required<readonly PriorityItemViewModel[]>();
}
