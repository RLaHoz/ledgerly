import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, chevronForwardOutline } from 'ionicons/icons';

export interface OnTrackCategoryViewModel {
  id: string;
  name: string;
}

@Component({
  selector: 'app-categories-ontrack-budget',
  standalone: true,
  templateUrl: './categories-ontrack-budget.component.html',
  styleUrls: ['./categories-ontrack-budget.component.scss'],
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesOnTrackBudgetComponent {
  readonly categories = input.required<readonly OnTrackCategoryViewModel[]>();
  readonly urgentCta = output<void>();

  readonly message = computed(() => {
    const count = this.categories().length;
    const noun = count === 1 ? 'category is' : 'categories are';
    return `${count} ${noun} on track this month`;
  });

  constructor() {
    addIcons({
      'checkmark-circle-outline': checkmarkCircleOutline,
      'chevron-forward-outline': chevronForwardOutline,
    });
  }

  onClick(): void {
    this.urgentCta.emit();
  }
}
