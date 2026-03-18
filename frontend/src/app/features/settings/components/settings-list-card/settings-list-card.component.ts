import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon, IonSelect, IonSelectOption, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldOutline } from 'ionicons/icons';
import { SettingsListRow } from '../../models/settings.models';

@Component({
  selector: 'app-settings-list-card',
  standalone: true,
  imports: [IonToggle, IonIcon, IonSelect, IonSelectOption],
  templateUrl: './settings-list-card.component.html',
  styleUrl: './settings-list-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsListCardComponent {
  readonly title = input<string>('');
  readonly rows = input.required<readonly SettingsListRow[]>();
  readonly leadingIcon = input<string>('');

  readonly toggleChanged = output<{ id: string; checked: boolean }>();
  readonly actionClicked = output<string>();
  readonly selectChanged = output<{ id: string; value: string }>();

  constructor() {
    addIcons({
      'shield-outline': shieldOutline,
    });
  }

  trackById(_: number, row: SettingsListRow): string {
    return row.id;
  }

  onToggleChange(rowId: string, event: Event): void {
    const customEvent = event as CustomEvent<{ checked?: boolean }>;
    this.toggleChanged.emit({
      id: rowId,
      checked: Boolean(customEvent.detail?.checked),
    });
  }

  onActionClick(rowId: string): void {
    this.actionClicked.emit(rowId);
  }

  onSelectChange(rowId: string, event: Event): void {
    const customEvent = event as CustomEvent<{ value?: string }>;
    const value = customEvent.detail?.value;

    if (typeof value !== 'string') {
      return;
    }

    this.selectChanged.emit({ id: rowId, value });
  }
}
