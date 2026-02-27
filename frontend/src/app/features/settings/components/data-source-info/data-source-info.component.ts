import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  checkmarkOutline,
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
  imports: [IonIcon, IonSelect, IonSelectOption],
  templateUrl: './data-source-info.component.html',
  styleUrl: './data-source-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataSourceInfoComponent {
  readonly model = input.required<DataSourceInfoModel>();

  readonly connectBankClicked = output<void>();
  readonly uploadClicked = output<void>();
  readonly frequencyChanged = output<string>();

  constructor() {
    addIcons({
      'business-outline': businessOutline,
      'document-text-outline': documentTextOutline,
      'checkmark-outline': checkmarkOutline,
      'refresh-outline': refreshOutline,
    });
  }

  onFrequencyChange(event: Event): void {
    const customEvent = event as CustomEvent<{ value?: string }>;
    const value = customEvent.detail?.value;

    if (typeof value !== 'string') {
      return;
    }

    this.frequencyChanged.emit(value);
  }
}
