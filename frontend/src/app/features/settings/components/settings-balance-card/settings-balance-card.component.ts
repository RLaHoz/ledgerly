import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { paperPlaneOutline } from 'ionicons/icons';
import { CoupleBalanceSettings } from '../../models/settings.models';

@Component({
  selector: 'app-settings-balance-card',
  standalone: true,
  imports: [IonButton, IonIcon],
  templateUrl: './settings-balance-card.component.html',
  styleUrl: './settings-balance-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsBalanceCardComponent {
  readonly balance = input.required<CoupleBalanceSettings>();

  readonly settleClicked = output<void>();

  constructor() {
    addIcons({
      'paper-plane-outline': paperPlaneOutline,
    });
  }

  onSettleClick(): void {
    this.settleClicked.emit();
  }
}
