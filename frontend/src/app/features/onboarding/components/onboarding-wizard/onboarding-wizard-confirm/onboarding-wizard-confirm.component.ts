import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonCheckbox, IonIcon, IonToggle } from '@ionic/angular/standalone';
import { OnboardingWizardStore } from '../../../store/onboarding-wizard.store';
import { formatMoney as formatMoneyValue } from '../onboarding-wizard-format.util';

@Component({
  selector: 'app-onboarding-wizard-confirm',
  standalone: true,
  imports: [IonIcon, IonToggle, IonCheckbox],
  templateUrl: './onboarding-wizard-confirm.component.html',
  styleUrl: './onboarding-wizard-confirm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardConfirmComponent {
  readonly wizard = inject(OnboardingWizardStore);
  readonly hasUncategorized = computed(() => this.wizard.uncategorizedCount() > 0);

  formatMoney(value: number): string {
    return formatMoneyValue(value);
  }
}
