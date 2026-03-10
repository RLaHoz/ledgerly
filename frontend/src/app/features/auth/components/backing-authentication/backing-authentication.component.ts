import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
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
  private readonly isRequestSubmitting = signal(false);
  readonly isCtaLoading = computed(
    () => this.isLoading() || this.isRequestSubmitting(),
  );
  readonly isCtaDisabled = computed(
    () => this.isCtaLoading() || this.isSuccess(),
  );


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

    effect(() => {
      if (this.isLoading()) {
        this.isRequestSubmitting.set(true);
        return;
      }

      if (this.isIdle() || this.isError() || this.isSuccess()) {
        this.isRequestSubmitting.set(false);
      }
    });
  }

  onBack(): void {

  }

  onToggleTheme(): void {
    this.chageTheme.emit();
  }

  onConnectWithBank(): void {
    if (this.isCtaDisabled()) {
      return;
    }

    this.isRequestSubmitting.set(true);
    this.connectWithBank.emit();
  }
}
