import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { ThemeStore } from './core/store/theme/theme.store';
import { AuthStore } from './features/auth/store/auth.store';
import { SessionIdleTimeoutService } from './features/auth/services/session-idle-timeout.service';
import { NativeKeyboardUiGuardService } from './core/services/native-keyboard-ui-guard.service';
import { normalizePath } from './features/auth/store/auth-route-policy';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionIdleTimeout = inject(SessionIdleTimeoutService);
  private readonly keyboardUiGuard = inject(NativeKeyboardUiGuardService);

  constructor() {
    inject(ThemeStore);
    document.body.classList.add(
      Capacitor.isNativePlatform() ? 'platform-native' : 'platform-web',
    );
    // Bootstrap app session on startup to keep user logged in.
    this.authStore.ensureSession();
    this.sessionIdleTimeout.init();
    this.keyboardUiGuard.init(this.destroyRef);

    effect(() => {
      const currentUrl = this.router.url;
      const targetRoute = this.authStore.getBootstrapTargetRoute(currentUrl);
      if (!targetRoute) {
        return;
      }

      if (isAlreadyInTarget(currentUrl, targetRoute)) {
        return;
      }

      void this.router.navigateByUrl(targetRoute, { replaceUrl: true });
    });
  }
}

function isAlreadyInTarget(currentUrl: string, targetRoute: string): boolean {
  const normalizedCurrentUrl = normalizePath(currentUrl);
  return normalizedCurrentUrl === targetRoute;
}
