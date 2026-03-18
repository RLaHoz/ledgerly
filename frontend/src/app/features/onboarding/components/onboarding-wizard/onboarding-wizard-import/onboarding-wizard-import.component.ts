import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { OnboardingPreviewComponent } from '../../onboarding-preview/onboarding-preview.component';
import { OnboardingWizardStore } from '../../../store/onboarding-wizard.store';
import { TransactionsResumenComponent } from '../../transactions-resumen/transactions-resumen.component';

@Component({
  selector: 'app-onboarding-wizard-import',
  standalone: true,
  imports: [IonIcon, TransactionsResumenComponent, OnboardingPreviewComponent],
  templateUrl: './onboarding-wizard-import.component.html',
  styleUrl: './onboarding-wizard-import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardImportComponent {
  readonly fileInputId = input.required<string>();

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
