import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthScreenShellComponent } from '../../components/auth-screen-shell/auth-screen-shell.component';
import { GoogleAuthCoordinatorService } from '../../services/google/google-auth-coordinator.service';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-auth-login-page',
  standalone: true,
  imports: [RouterLink, AuthScreenShellComponent],
  templateUrl: './auth-login.page.html',
  styleUrl: './auth-login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLoginPage {
  readonly authStore = inject(AuthStore);
  private readonly googleAuthCoordinator = inject(GoogleAuthCoordinatorService);

  readonly isLoading = computed(() => this.authStore.isLoading());

  continueWithGoogle(): void {
    if (this.isLoading()) {
      return;
    }

    this.googleAuthCoordinator.startGoogleAuth();
  }
}
