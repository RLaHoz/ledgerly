import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  checkmarkOutline,
  chevronDownOutline,
  chevronUpOutline,
  documentTextOutline,
  refreshOutline,
} from 'ionicons/icons';

export interface DataSourceInfoItem {
  id: string;
  iconName: string;
  title: string;
  subtitle: string;
  statusLabel: string;
}

export interface DataSourceInfoModel {
  title: string;
  items: readonly DataSourceInfoItem[];
  connectBankLabel: string;
  uploadLabel: string;
  syncFrequencyLabel: string;
  selectedFrequencyLabel: string;
  frequencyOptions: readonly string[];
}

@Component({
  selector: 'app-data-source-info',
  standalone: true,
  imports: [IonIcon, IonItem, IonLabel, IonList],
  templateUrl: './data-source-info.component.html',
  styleUrl: './data-source-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataSourceInfoComponent {
  readonly model = input.required<DataSourceInfoModel>();

  readonly connectBankClicked = output<void>();
  readonly uploadClicked = output<void>();
  readonly frequencyChanged = output<string>();
  readonly isFrequencyMenuOpen = signal(false);

  constructor() {
    addIcons({
      'business-outline': businessOutline,
      'document-text-outline': documentTextOutline,
      'checkmark-outline': checkmarkOutline,
      'chevron-down-outline': chevronDownOutline,
      'chevron-up-outline': chevronUpOutline,
      'refresh-outline': refreshOutline,
    });
  }

  toggleFrequencyMenu(): void {
    this.isFrequencyMenuOpen.update((value) => !value);
  }

  onFrequencyChange(value: string): void {
    this.frequencyChanged.emit(value);
    this.isFrequencyMenuOpen.set(false);
  }
}
