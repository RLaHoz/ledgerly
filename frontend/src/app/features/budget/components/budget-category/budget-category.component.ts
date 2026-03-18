import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  bagHandleOutline,
  barbellOutline,
  businessOutline,
  carSportOutline,
  chevronForwardOutline,
  heartOutline,
  homeOutline,
  trendingDownOutline,
  trendingUpOutline,
  happyOutline,
  cartOutline,
} from 'ionicons/icons';

export type BudgetCategoryTone = 'over' | 'watch' | 'on-track';
export type BudgetTrendTone = 'up' | 'down' | 'stable';
export type BudgetCategoryIconTone =
  | 'baby'
  | 'entertainment'
  | 'groceries'
  | 'gym'
  | 'health'
  | 'home'
  | 'shopping'
  | 'transport';

export interface BudgetCategoryCardViewModel {
  id: string;
  name: string;
  subCountLabel: string;
  statusLabel: string;
  statusTone: BudgetCategoryTone;
  spentLabel: string;
  limitLabel: string;
  leftLabel: string;
  progressPercent: number;
  trendLabel: string;
  trendTone: BudgetTrendTone;
  iconName: string;
  iconTone: BudgetCategoryIconTone;
}

@Component({
  selector: 'app-budget-category',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './budget-category.component.html',
  styleUrl: './budget-category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetCategoryComponent {
  readonly title = input.required<string>();
  readonly editLabel = input.required<string>();
  readonly items = input.required<readonly BudgetCategoryCardViewModel[]>();

  readonly editRequested = output<void>();
  readonly itemAction = output<string>();

  constructor() {
    addIcons({
      'add-outline': addOutline,
      'bag-handle-outline': bagHandleOutline,
      'barbell-outline': barbellOutline,
      'business-outline': businessOutline,
      'car-sport-outline': carSportOutline,
      'cart-outline': cartOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'happy-outline': happyOutline,
      'heart-outline': heartOutline,
      'home-outline': homeOutline,
      'trending-down-outline': trendingDownOutline,
      'trending-up-outline': trendingUpOutline,
    });
  }

  onItemAction(itemId: string): void {
    this.itemAction.emit(itemId);
  }
}
