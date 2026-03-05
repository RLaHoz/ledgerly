import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { BankLinkCoordinatorService } from '../services/banking/bank-link-coordinator.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [IonContent, IonSpinner],
  template: `
    <ion-content class="ion-padding">
      <div style="min-height:100%;display:grid;place-items:center;">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackPage {
  private readonly coordinator = inject(BankLinkCoordinatorService);
  private readonly router = inject(Router);

  constructor() {
    this.coordinator.init();
    const handled = this.coordinator.consumeCallbackUrl(window.location.href);

    if (!handled) {
      void this.router.navigateByUrl('/auth', { replaceUrl: true });
    }
  }
}
