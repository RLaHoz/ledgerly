import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OnboardingWizardComponent } from './components/onboarding-wizard/onboarding-wizard.component';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: true,
  imports: [OnboardingWizardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {}
