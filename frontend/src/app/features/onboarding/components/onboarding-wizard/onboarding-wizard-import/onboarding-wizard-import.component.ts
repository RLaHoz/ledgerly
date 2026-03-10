import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { IonCheckbox, IonIcon } from '@ionic/angular/standalone';
import { OnboardingWizardStore } from '../../../store/onboarding-wizard.store';

@Component({
  selector: 'app-onboarding-wizard-import',
  standalone: true,
  imports: [IonIcon, IonCheckbox],
  templateUrl: './onboarding-wizard-import.component.html',
  styleUrl: './onboarding-wizard-import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardImportComponent {
  @Input({ required: true }) fileInputId!: string;

  readonly wizard = inject(OnboardingWizardStore);

  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }

    const file = target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    await this.wizard.parseFile(file);
    target.value = '';
  }
}
