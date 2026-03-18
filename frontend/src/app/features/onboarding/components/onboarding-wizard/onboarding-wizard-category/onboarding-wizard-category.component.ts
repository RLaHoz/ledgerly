import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonButton, IonCheckbox, IonIcon } from '@ionic/angular/standalone';
import { CategoryFilter } from '../../../models/onboarding.models';
import { OnboardingWizardStore } from '../../../store/onboarding-wizard.store';
import { OnboardingCategorySheetComponent } from '../onboarding-category-sheet.component';

@Component({
  selector: 'app-onboarding-wizard-category',
  standalone: true,
  imports: [IonButton, IonCheckbox, IonIcon, OnboardingCategorySheetComponent],
  templateUrl: './onboarding-wizard-category.component.html',
  styleUrl: './onboarding-wizard-category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardCategoryComponent {
  readonly wizard = inject(OnboardingWizardStore);
  readonly transactionRows = this.wizard.filteredTransactionRows;

  onFilterChange(filter: CategoryFilter): void {
    this.wizard.setFilter(filter);
  }

  onCategorySearchInput(value: string | number | null | undefined): void {
    this.wizard.setCategorySearch(String(value ?? ''));
  }

  onCategoryTap(categoryId: string): void {
    const nextCategoryId = this.isCategoryExpanded(categoryId) ? null : categoryId;
    this.wizard.setCategorySheetCategory(nextCategoryId);
  }

  isCategoryExpanded(categoryId: string): boolean {
    return this.wizard.categorySheetCategoryId() === categoryId;
  }
}
