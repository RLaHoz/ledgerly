import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { GoogleAuthCoordinatorService } from '../services/google/google-auth-coordinator.service';
import { AUTH_ENTRY_ROUTE } from '../store/auth-route.constants';

@Component({
  selector: 'app-auth-google-callback',
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
export class AuthGoogleCallbackPage {
  private readonly coordinator = inject(GoogleAuthCoordinatorService);
  private readonly router = inject(Router);

  constructor() {
    this.coordinator.init();
    const handled = this.coordinator.consumeCallbackUrl(window.location.href);

    if (!handled) {
      void this.router.navigateByUrl(AUTH_ENTRY_ROUTE, { replaceUrl: true });
    }
  }
}
