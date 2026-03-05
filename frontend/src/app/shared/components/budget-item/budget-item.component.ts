import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bagHandleOutline,
  barbellOutline,
  businessOutline,
  carSportOutline,
  cartOutline,
  chevronForwardOutline,
  heartOutline,
  happyOutline,
  homeOutline,
} from 'ionicons/icons';

export type BudgetItemStatus = 'exceeded' | 'high-risk' | 'moderate' | 'on-track' | 'watch' | 'over';
export type BudgetItemVariant = 'home' | 'budget';
export type BudgetItemIconTone =
  | 'home'
  | 'gym'
  | 'shopping'
  | 'transport'
  | 'baby'
  | 'groceries'
  | 'entertainment'
  | 'health';

export interface BudgetItemViewModel {
  id: string;
  name: string;
  spentLabel: string;
  limitLabel: string;
  leftLabel: string;
  status: BudgetItemStatus;
  progressPercent: number;
  iconName: string;
  iconTone: BudgetItemIconTone;
  noteLabel?: string;
}

@Component({
  selector: 'app-budget-item',
  standalone: true,
  templateUrl: './budget-item.component.html',
  styleUrls: ['./budget-item.component.scss'],
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetItemComponent {
  readonly item = input.required<BudgetItemViewModel>();
  readonly editable = input<boolean>(false);
  readonly variant = input<BudgetItemVariant>('home');

  readonly itemAction = output<string>();

  readonly amountLabel = computed(() => `${this.item().spentLabel} / ${this.item().limitLabel}`);
  readonly progressPercent = computed(() => clamp(this.item().progressPercent, 0, 100));
  readonly statusLabel = computed(() => mapStatusLabel(this.item().status));
  readonly statusClass = computed(() => `status-${mapStatusTone(this.item().status)}`);
  readonly noteClass = computed(() => `note-${mapStatusTone(this.item().status)}`);

  constructor() {
    addIcons({
      'bag-handle-outline': bagHandleOutline,
      'barbell-outline': barbellOutline,
      'business-outline': businessOutline,
      'car-sport-outline': carSportOutline,
      'cart-outline': cartOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'heart-outline': heartOutline,
      'happy-outline': happyOutline,
      'home-outline': homeOutline,
    });
  }

  onItemContainerAction(event?: Event): void {
    if (!this.editable()) {
      return;
    }

    if (event instanceof KeyboardEvent) {
      event.preventDefault();
    }

    this.itemAction.emit(this.item().id);
  }

  onItemAction(event: Event): void {
    event.stopPropagation();
    this.onItemContainerAction();
  }
}

function mapStatusLabel(status: BudgetItemStatus): string {
  switch (status) {
    case 'on-track':
      return 'On Track';
    case 'watch':
      return 'Watch';
    case 'over':
      return 'Over';
    case 'exceeded':
      return 'Exceeded';
    case 'high-risk':
      return 'High risk';
    case 'moderate':
      return 'Moderate';
    default:
      return 'Moderate';
  }
}

function mapStatusTone(status: BudgetItemStatus): 'on-track' | 'watch' | 'over' | 'moderate' {
  if (status === 'on-track') {
    return 'on-track';
  }

  if (status === 'watch' || status === 'high-risk') {
    return 'watch';
  }

  if (status === 'over' || status === 'exceeded') {
    return 'over';
  }

  return 'moderate';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
