import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon, IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, personOutline, settingsOutline } from 'ionicons/icons';
import { SettingsTabItem, SettingsTabKey } from '../../models/settings.models';

@Component({
  selector: 'app-settings-tab-switcher',
  standalone: true,
  imports: [IonSegment, IonSegmentButton, IonIcon, IonLabel],
  templateUrl: './settings-tab-switcher.component.html',
  styleUrl: './settings-tab-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabSwitcherComponent {
  readonly tabs = input.required<readonly SettingsTabItem[]>();
  readonly activeTab = input.required<SettingsTabKey>();

  readonly tabSelected = output<SettingsTabKey>();

  constructor() {
    addIcons({
      'person-outline': personOutline,
      'settings-outline': settingsOutline,
      'people-outline': peopleOutline,
    });
  }

  onSegmentChange(event: Event): void {
    const customEvent = event as CustomEvent<{ value?: string }>;
    const value = customEvent.detail?.value;

    if (value === 'account' || value === 'preferences' || value === 'couple') {
      this.tabSelected.emit(value);
    }
  }
}
