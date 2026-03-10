import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CouplePartnerSettings } from '../../models/settings.models';

@Component({
  selector: 'app-settings-partner-card',
  standalone: true,
  templateUrl: './settings-partner-card.component.html',
  styleUrl: './settings-partner-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPartnerCardComponent {
  readonly partner = input.required<CouplePartnerSettings>();
}
