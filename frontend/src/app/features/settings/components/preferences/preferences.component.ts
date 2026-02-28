import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  checkmarkOutline,
  chevronDownOutline,
  chevronUpOutline,
  desktopOutline,
  globeOutline,
  moonOutline,
  peopleOutline,
  sunnyOutline,
} from 'ionicons/icons';

export type PreferencesThemeMode = 'light' | 'dark' | 'auto';
type DropdownKey = 'currency' | 'monthStart';

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
  imports: [IonIcon, IonItem, IonLabel, IonList],
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
  readonly openDropdown = signal<DropdownKey | null>(null);

  constructor() {
    addIcons({
      'globe-outline': globeOutline,
      'calendar-outline': calendarOutline,
      'people-outline': peopleOutline,
      'checkmark-outline': checkmarkOutline,
      'chevron-down-outline': chevronDownOutline,
      'chevron-up-outline': chevronUpOutline,
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

  toggleDropdown(key: DropdownKey): void {
    this.openDropdown.set(this.openDropdown() === key ? null : key);
  }

  isDropdownOpen(key: DropdownKey): boolean {
    return this.openDropdown() === key;
  }

  onCurrencyChange(value: string): void {
    this.currencyChanged.emit(value);
    this.openDropdown.set(null);
  }

  onMonthStartChange(value: string): void {
    this.monthStartChanged.emit(value);
    this.openDropdown.set(null);
  }
}
