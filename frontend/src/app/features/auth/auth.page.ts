import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { BackingAuthenticationComponent } from './components/backing-authentication/backing-authentication.component';
import { ThemeStore } from 'src/app/core/store/theme/theme.store';
import { AuthStore } from './store/auth.store';
import { BankLinkCoordinatorService } from './services/banking/bank-link-coordinator.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: true,
  imports: [BackingAuthenticationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPage {
  readonly themeStore = inject(ThemeStore);
  readonly authStore = inject(AuthStore);
  private readonly coordinator = inject(BankLinkCoordinatorService);
  private readonly pendingConnectAttempt = signal(false);
  readonly isBankLinkLoading = computed(
    () => this.authStore.isLoading() || this.pendingConnectAttempt(),
  );

  constructor() {
    this.coordinator.init();

    effect(() => {
      if (this.authStore.isLoading()) {
        this.pendingConnectAttempt.set(true);
        return;
      }

      if (this.authStore.isIdle() || this.authStore.isError() || this.authStore.isSuccess()) {
        this.pendingConnectAttempt.set(false);
      }
    });
  }

  onToggleTheme(): void {
    this.themeStore.toggleMode();
  }

  onConnectWithBank(): void {
    if (this.isBankLinkLoading()) {
      return;
    }

    this.pendingConnectAttempt.set(true);
    this.coordinator.startBankLink();
  }
}
