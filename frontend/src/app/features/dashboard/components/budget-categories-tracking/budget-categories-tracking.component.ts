import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import {
  BudgetItemComponent,
  BudgetItemViewModel,
} from '../../../../shared/components/budget-item/budget-item.component';

export interface BudgetTrackingItemViewModel extends BudgetItemViewModel {
  readonly detailSummary: string;
  readonly detailRecommendation?: string;
  readonly detailRoute?: string;
}

@Component({
  selector: 'app-budget-categories-tracking',
  standalone: true,
  templateUrl: './budget-categories-tracking.component.html',
  styleUrls: ['./budget-categories-tracking.component.scss'],
  imports: [IonIcon, BudgetItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetCategoriesTrackingComponent {
  private readonly router = inject(Router);

  readonly title = input<string>('Categories');
  readonly seeAllLabel = input<string>('See all');
  readonly items = input.required<readonly BudgetTrackingItemViewModel[]>();
  readonly seeAll = output<void>();
  readonly expandedItemId = signal<string | null>(null);
  readonly expandedItem = computed(() => {
    const expandedItemId = this.expandedItemId();
    return this.items().find((item) => item.id === expandedItemId) ?? null;
  });

  constructor() {
    addIcons({ 'chevron-forward-outline': chevronForwardOutline });
  }

  onSeeAll(): void {
    this.seeAll.emit();
  }

  onItemToggle(itemId: string): void {
    this.expandedItemId.update((currentItemId) => (currentItemId === itemId ? null : itemId));
  }

  onItemToggleKeydown(event: Event, itemId: string): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
    }

    this.onItemToggle(itemId);
  }

  async onViewDetails(event: Event, item: BudgetTrackingItemViewModel): Promise<void> {
    event.stopPropagation();
    await this.router.navigateByUrl(item.detailRoute ?? `/budgets/detail/${item.id}`);
  }
}
