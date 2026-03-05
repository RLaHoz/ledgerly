import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  cloudOfflineOutline,
  eyeOffOutline,
  eyeOutline,
  fingerPrintOutline,
  logoFacebook,
  moonOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  sunnyOutline,
} from 'ionicons/icons';
import { fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThemeStore } from '../../../../core/store/theme/theme.store';

type AuthMode = 'signin' | 'signup';
type StatusType = 'none' | 'error' | 'offline' | 'success';

interface StatusBannerVm {
  icon: string;
  message: string;
  type: Exclude<StatusType, 'none'>;
}

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [IonContent, IonButton, IonInput, IonIcon, IonCheckbox, IonLabel, ReactiveFormsModule],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly themeStore = inject(ThemeStore);

  readonly mode = signal<AuthMode>('signin');
  readonly submitted = signal(false);
  readonly isSubmitting = signal(false);
  readonly isPasswordVisible = signal(false);
  readonly rememberDevice = signal(true);
  readonly status = signal<StatusType>('none');
  readonly isShaking = signal(false);
  readonly isOnline = signal(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
  });

  readonly isSignInMode = computed(() => this.mode() === 'signin');
  readonly title = computed(() =>
    this.isSignInMode() ? 'Welcome back' : 'Create your account',
  );
  readonly subtitle = computed(() =>
    this.isSignInMode()
      ? 'Your spending intelligence, secured.'
      : 'Set up your secure Ledgerly account.',
  );
  readonly primaryCta = computed(() =>
    this.isSignInMode() ? 'Sign in' : 'Create account',
  );
  readonly secondaryCta = computed(() =>
    this.isSignInMode() ? 'Create account' : 'Sign in',
  );
  readonly loadingLabel = computed(() =>
    this.isSignInMode() ? 'Signing in...' : 'Creating...',
  );
  readonly statusBanner = computed<StatusBannerVm | null>(() => {
    if (!this.isOnline()) {
      return {
        type: 'offline',
        icon: 'cloud-offline-outline',
        message: 'You are offline. Check your connection and try again.',
      };
    }

    if (this.status() === 'error') {
      return {
        type: 'error',
        icon: 'alert-circle-outline',
        message: 'Please fix highlighted fields and try again.',
      };
    }

    if (this.status() === 'success') {
      return {
        type: 'success',
        icon: 'checkmark-circle-outline',
        message: 'Authenticated successfully.',
      };
    }

    return null;
  });

  private shakeTimeoutId: number | null = null;
  private submitTimeoutId: number | null = null;

  constructor() {
    addIcons({
      'arrow-back-outline': arrowBackOutline,
      'moon-outline': moonOutline,
      'sunny-outline': sunnyOutline,
      'finger-print-outline': fingerPrintOutline,
      'eye-outline': eyeOutline,
      'eye-off-outline': eyeOffOutline,
      'checkmark-outline': checkmarkOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'logo-facebook': logoFacebook,
      'alert-circle-outline': alertCircleOutline,
      'cloud-offline-outline': cloudOfflineOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'refresh-outline': refreshOutline,
    });

    if (typeof window !== 'undefined') {
      fromEvent(window, 'online')
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.isOnline.set(true));

      fromEvent(window, 'offline')
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.isOnline.set(false));
    }

    this.destroyRef.onDestroy(() => {
      if (this.shakeTimeoutId !== null) {
        window.clearTimeout(this.shakeTimeoutId);
      }

      if (this.submitTimeoutId !== null) {
        window.clearTimeout(this.submitTimeoutId);
      }
    });
  }

  onBackClick(): void {
    this.location.back();
  }

  onThemeToggle(): void {
    this.themeStore.toggleMode();
  }

  setMode(mode: AuthMode): void {
    if (this.mode() === mode) {
      return;
    }

    this.mode.set(mode);
    this.status.set('none');
    this.submitted.set(false);
    this.form.controls.password.reset('');
  }

  onBiometricClick(): void {
    this.status.set('success');
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update((current) => !current);
  }

  onRememberChanged(checked: boolean): void {
    this.rememberDevice.set(checked);
  }

  onForgotPasswordClick(): void {
    this.status.set('none');
  }

  onSocialClick(provider: 'google' | 'facebook'): void {
    this.status.set('success');
    void provider;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.status.set('none');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.status.set('error');
      this.shakeForm();
      return;
    }

    this.isSubmitting.set(true);

    if (this.submitTimeoutId !== null) {
      window.clearTimeout(this.submitTimeoutId);
    }

    this.submitTimeoutId = window.setTimeout(() => {
      this.isSubmitting.set(false);
      this.status.set('success');
      void this.router.navigateByUrl('/dashboard');
    }, 750);
  }

  errorMessage(controlName: 'email' | 'password'): string {
    const control = this.form.controls[controlName];

    if (!this.shouldShowError(control)) {
      return '';
    }

    if (controlName === 'email') {
      if (control.hasError('required')) {
        return 'Email is required.';
      }

      if (control.hasError('email')) {
        return 'Enter a valid email.';
      }
    }

    if (controlName === 'password') {
      if (control.hasError('required')) {
        return 'Password is required.';
      }

      if (control.hasError('minlength')) {
        return 'Minimum 6 characters.';
      }
    }

    return 'Invalid value.';
  }

  hasControlError(controlName: 'email' | 'password'): boolean {
    return this.shouldShowError(this.form.controls[controlName]);
  }

  private shouldShowError(control: FormControl<string>): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  private shakeForm(): void {
    this.isShaking.set(true);

    if (this.shakeTimeoutId !== null) {
      window.clearTimeout(this.shakeTimeoutId);
    }

    this.shakeTimeoutId = window.setTimeout(() => {
      this.isShaking.set(false);
    }, 500);
  }
}
