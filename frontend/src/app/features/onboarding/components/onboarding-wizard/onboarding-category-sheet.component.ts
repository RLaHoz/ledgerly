import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton, IonIcon, IonInput, IonItem, IonList } from '@ionic/angular/standalone';
import { OnboardingCategory, OnboardingSubcategory } from '../../models/onboarding.models';

@Component({
  selector: 'app-onboarding-category-sheet',
  standalone: true,
  imports: [IonButton, IonIcon, IonInput, IonItem, IonList],
  templateUrl: './onboarding-category-sheet.component.html',
  styleUrl: './onboarding-category-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingCategorySheetComponent {
  readonly categories = input.required<readonly OnboardingCategory[]>();
  readonly availableSubcategories = input.required<readonly OnboardingSubcategory[]>();
  readonly searchValue = input('');
  readonly expandedCategoryId = input<string | null>(null);

  readonly close = output<void>();
  readonly searchChange = output<string>();
  readonly categoryToggle = output<string>();
  readonly subcategorySelect = output<string>();

  readonly onBackdropClick = output<void>();

  onSearchInput(value: string | number | null | undefined): void {
    this.searchChange.emit(String(value ?? ''));
  }

  onCategoryClick(categoryId: string): void {
    this.categoryToggle.emit(categoryId);
  }

  onSubcategoryClick(subcategoryId: string): void {
    this.subcategorySelect.emit(subcategoryId);
  }

  isExpanded(categoryId: string): boolean {
    return this.expandedCategoryId() === categoryId;
  }
}
