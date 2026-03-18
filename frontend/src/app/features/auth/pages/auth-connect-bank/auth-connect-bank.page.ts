import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthStore } from '../../store/auth.store';
import { BankLinkCoordinatorService } from '../../services/banking/bank-link-coordinator.service';
import { AuthScreenShellComponent } from '../../components/auth-screen-shell/auth-screen-shell.component';

@Component({
  selector: 'app-auth-connect-bank-page',
  standalone: true,
  imports: [AuthScreenShellComponent],
  templateUrl: './auth-connect-bank.page.html',
  styleUrl: './auth-connect-bank.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthConnectBankPage {
  readonly authStore = inject(AuthStore);
  private readonly coordinator = inject(BankLinkCoordinatorService);

  readonly isLoading = computed(() => this.authStore.isLoading());
  readonly isConnected = computed(() => this.authStore.bankConnectionState() === 'connected');
  readonly isDisabled = computed(() => this.isLoading() || this.isConnected());

  connectBank(): void {
    if (this.isDisabled()) {
      return;
    }

    this.coordinator.startBankLink();
  }
}
