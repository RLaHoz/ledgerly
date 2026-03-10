import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { ThemeStore } from './core/store/theme/theme.store';
import { AuthStore } from './features/auth/store/auth.store';
import { SessionIdleTimeoutService } from './features/auth/services/session-idle-timeout.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly sessionIdleTimeout = inject(SessionIdleTimeoutService);

  constructor() {
    inject(ThemeStore);
    document.body.classList.add(
      Capacitor.isNativePlatform() ? 'platform-native' : 'platform-web',
    );
    // Bootstrap app session on startup to keep user logged in.
    this.authStore.ensureSession();
    this.sessionIdleTimeout.init();
    this.initKeyboardUiGuard();

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

  private async initKeyboardUiGuard(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });

    const removeKeyboardOpenClass = () => {
      document.body.classList.remove('keyboard-open');
    };

    await Keyboard.addListener('keyboardWillHide', removeKeyboardOpenClass);
    await Keyboard.addListener('keyboardDidHide', removeKeyboardOpenClass);
  }
}

function isAlreadyInTarget(currentUrl: string, targetRoute: string): boolean {
  const normalizedCurrentUrl = normalizePath(currentUrl);
  return normalizedCurrentUrl === targetRoute;
}

function normalizePath(url: string): string {
  const [path] = url.split('?');
  const normalized = path.split('#')[0] ?? '/';
  return normalized.endsWith('/') && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}
