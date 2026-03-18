import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-settings-danger-card',
  standalone: true,
  imports: [IonButton, IonIcon],
  templateUrl: './settings-danger-card.component.html',
  styleUrl: './settings-danger-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDangerCardComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input.required<string>();

  readonly actionClicked = output<void>();

  constructor() {
    addIcons({
      'log-out-outline': logOutOutline,
    });
  }

  onActionClick(): void {
    this.actionClicked.emit();
  }
}
