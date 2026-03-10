import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonButton, IonIcon, IonInput } from '@ionic/angular/standalone';
import { OnboardingSubcategory } from '../../../models/onboarding.models';
import { OnboardingWizardStore } from '../../../store/onboarding-wizard.store';
import { formatMoney as formatMoneyValue } from '../onboarding-wizard-format.util';

type CategoryBudgetSection = {
  id: string;
  slug: string;
  name: string;
  iconName: string;
  colorHex: string;
  importedAmount: number;
  subcategories: ReadonlyArray<{
    id: string;
    name: string;
    iconName: string;
    colorHex: string;
    importedAmount: number;
  }>;
};

@Component({
  selector: 'app-onboarding-wizard-budget',
  standalone: true,
  imports: [IonButton, IonIcon, IonInput],
  templateUrl: './onboarding-wizard-budget.component.html',
  styleUrl: './onboarding-wizard-budget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardBudgetComponent {
  readonly wizard = inject(OnboardingWizardStore);

  readonly monthlyTargetInputValue = computed(() =>
    this.wizard.monthlyTarget() === null ? '' : String(Math.round(this.wizard.monthlyTarget()!)),
  );

  readonly monthlyDifference = computed(() =>
    (this.wizard.monthlyTarget() ?? this.wizard.assignedTotal()) - this.wizard.assignedTotal(),
  );

  readonly categoryBudgetSections = computed<readonly CategoryBudgetSection[]>(() =>
    this.wizard.usedCategories().map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      iconName: category.iconName,
      colorHex: category.colorHex,
      importedAmount: this.wizard.importedAmountBySlug(category.slug),
      subcategories: category.subcategories
        .map((subcategory: OnboardingSubcategory) => ({
          id: subcategory.id,
          name: subcategory.name,
          iconName: subcategory.iconName,
          colorHex: subcategory.colorHex,
          importedAmount: this.wizard.importedAmountBySubcategoryId(subcategory.id),
        }))
        .filter((subcategory) => subcategory.importedAmount > 0),
    })),
  );

  formatMoney(value: number): string {
    return formatMoneyValue(value);
  }

  onMonthlyTargetChange(value: string | number | null | undefined): void {
    this.wizard.setMonthlyTarget(String(value ?? ''));
  }

  onCategoryBudgetChange(slug: string, value: string | number | null | undefined): void {
    this.wizard.setCategoryBudget(slug, String(value ?? ''));
  }

  onSubcategoryBudgetChange(
    subcategoryId: string,
    value: string | number | null | undefined,
  ): void {
    this.wizard.setSubcategoryBudget(subcategoryId, String(value ?? ''));
  }
}
