import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonButton, IonCheckbox, IonIcon, IonInput, IonItem, IonList } from '@ionic/angular/standalone';
import { CategoryFilter, OnboardingTransaction } from '../../../models/onboarding.models';
import { OnboardingWizardStore } from '../../../store/onboarding-wizard.store';
import {
  formatDateShort,
  formatMoney as formatMoneyValue,
} from '../onboarding-wizard-format.util';

@Component({
  selector: 'app-onboarding-wizard-category',
  standalone: true,
  imports: [IonButton, IonCheckbox, IonIcon, IonInput, IonItem, IonList],
  templateUrl: './onboarding-wizard-category.component.html',
  styleUrl: './onboarding-wizard-category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardCategoryComponent {
  readonly wizard = inject(OnboardingWizardStore);

  onFilterChange(filter: CategoryFilter): void {
    this.wizard.setFilter(filter);
  }

  formatMoney(value: number): string {
    return formatMoneyValue(value);
  }

  formatDate(value: Date): string {
    return formatDateShort(value);
  }

  categoryName(tx: OnboardingTransaction): string {
    return (
      this.wizard.subcategoryById(tx.subcategoryId)?.name ??
      this.wizard.categoryById(tx.categoryId)?.name ??
      this.wizard.categoryBySlug(tx.categorySlug)?.name ??
      'Uncategorized'
    );
  }

  categoryIcon(tx: OnboardingTransaction): string {
    return (
      this.wizard.subcategoryById(tx.subcategoryId)?.iconName ??
      this.wizard.categoryById(tx.categoryId)?.iconName ??
      this.wizard.categoryBySlug(tx.categorySlug)?.iconName ??
      'alert-circle-outline'
    );
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
