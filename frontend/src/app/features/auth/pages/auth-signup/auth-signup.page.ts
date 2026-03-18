import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthScreenShellComponent } from '../../components/auth-screen-shell/auth-screen-shell.component';
import { GoogleAuthCoordinatorService } from '../../services/google/google-auth-coordinator.service';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-auth-signup-page',
  standalone: true,
  imports: [AuthScreenShellComponent],
  templateUrl: './auth-signup.page.html',
  styleUrl: './auth-signup.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthSignupPage {
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
