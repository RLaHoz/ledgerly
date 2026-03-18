import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonButton, IonIcon, IonInput } from '@ionic/angular/standalone';
import { OnboardingWizardStore } from '../../../store/onboarding-wizard.store';
import { formatMoney as formatMoneyValue } from '../onboarding-wizard-format.util';

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
  readonly categoryBudgetSections = this.wizard.budgetSections;

  readonly monthlyTargetInputValue = computed(() =>
    this.wizard.monthlyTarget() === null ? '' : String(Math.round(this.wizard.monthlyTarget()!)),
  );

  readonly monthlyDifference = computed(() =>
    (this.wizard.monthlyTarget() ?? this.wizard.assignedTotal()) - this.wizard.assignedTotal(),
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
