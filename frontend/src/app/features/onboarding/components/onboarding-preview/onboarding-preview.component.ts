import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ParsedImportPreviewRow } from '../../models/onboarding.models';

@Component({
  selector: 'app-onboarding-preview',
  standalone: true,
  templateUrl: './onboarding-preview.component.html',
  styleUrl: './onboarding-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPreviewComponent {
  readonly rows = input.required<readonly ParsedImportPreviewRow[]>();
}
