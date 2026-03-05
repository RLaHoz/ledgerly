import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { BackingAuthenticationComponent } from './components/backing-authentication/backing-authentication.component';
import { Router } from '@angular/router';
import { ThemeStore } from 'src/app/core/store/theme/theme.store';
import { AuthStore } from './store/auth.store';
import { BasiqConsentUiService } from './services/banking/basiq-consent-ui.service';
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

  constructor() {
    this.coordinator.init();
  }

  onToggleTheme(): void {
    this.themeStore.toggleMode();
  }

  onConnectWithBank(): void {
    this.coordinator.startBankLink();
  }
}
