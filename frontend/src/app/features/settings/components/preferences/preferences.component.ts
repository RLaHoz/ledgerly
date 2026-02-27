import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  desktopOutline,
  globeOutline,
  moonOutline,
  peopleOutline,
  sunnyOutline,
} from 'ionicons/icons';

export type PreferencesThemeMode = 'light' | 'dark' | 'auto';

export interface PreferencesModel {
  title: string;
  currencyValue: string;
  monthStartValue: string;
  currencyOptions: readonly string[];
  monthStartOptions: readonly string[];
  familyModeEnabled: boolean;
  themeMode: PreferencesThemeMode;
}

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [IonIcon, IonSelect, IonSelectOption],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesComponent {
  readonly model = input.required<PreferencesModel>();

  readonly currencyChanged = output<string>();
  readonly monthStartChanged = output<string>();
  readonly familyModeChanged = output<boolean>();
  readonly themeModeChanged = output<PreferencesThemeMode>();

  constructor() {
    addIcons({
      'globe-outline': globeOutline,
      'calendar-outline': calendarOutline,
      'people-outline': peopleOutline,
      'sunny-outline': sunnyOutline,
      'moon-outline': moonOutline,
      'desktop-outline': desktopOutline,
    });
  }

  isThemeActive(mode: PreferencesThemeMode): boolean {
    return this.model().themeMode === mode;
  }

  onFamilyModeToggle(): void {
    this.familyModeChanged.emit(!this.model().familyModeEnabled);
  }

  onCurrencyChange(event: Event): void {
    const customEvent = event as CustomEvent<{ value?: string }>;
    const value = customEvent.detail?.value;

    if (typeof value !== 'string') {
      return;
    }

    this.currencyChanged.emit(value);
  }

  onMonthStartChange(event: Event): void {
    const customEvent = event as CustomEvent<{ value?: string }>;
    const value = customEvent.detail?.value;

    if (typeof value !== 'string') {
      return;
    }

    this.monthStartChanged.emit(value);
  }
}
