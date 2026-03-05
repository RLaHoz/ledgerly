import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  businessOutline,
  checkmarkCircleOutline,
  moonOutline,
  refreshOutline,
  shieldOutline,
  sunnyOutline,
} from 'ionicons/icons';
import { ThemeStore } from '../../../../core/store/theme/theme.store';

type BankAuthState = 'idle' | 'loading' | 'success';

@Component({
  selector: 'app-backing-authentication',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
  templateUrl: './backing-authentication.component.html',
  styleUrl: './backing-authentication.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackingAuthenticationComponent {
  readonly connectWithBank = output<void>();
  readonly chageTheme = output<void>();

  readonly isIdle = input.required<boolean>();
  readonly isLoading = input.required<boolean>();
  readonly isSuccess = input.required<boolean>();
  readonly isError = input.required<boolean>();
  readonly errorMessage = input<string | null>(null);
  readonly themeIcon = input.required<"sunny-outline" | "moon-outline">();




  constructor() {
    addIcons({
      'arrow-back-outline': arrowBackOutline,
      'business-outline': businessOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'refresh-outline': refreshOutline,
      'moon-outline': moonOutline,
      'sunny-outline': sunnyOutline,
      'shield-outline': shieldOutline,
    });
  }

  onBack(): void {

  }

  onToggleTheme(): void {
    this.chageTheme.emit();
  }

  onConnectWithBank(): void {
    this.connectWithBank.emit();
  }
}
