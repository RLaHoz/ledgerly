import { DestroyRef, Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { catchError, distinctUntilChanged, filter, switchMap, take, tap } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { AuthFlowLoggerService } from '../auth-flow-logger.service';
import { AuthStore } from '../../store/auth.store';
import { GoogleAuthCallbackEvent } from '../../models/google-auth.models';
import { GoogleAuthUiService } from './google-auth-ui.service';
import { AUTH_ENTRY_ROUTE } from '../../store/auth-route.constants';

@Injectable({ providedIn: 'root' })
export class GoogleAuthCoordinatorService {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly googleAuthUi = inject(GoogleAuthUiService);
  private readonly logger = inject(AuthFlowLoggerService);

  private initialized = false;
  private lastOpenedAuthorizeUrl: string | null = null;

  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.googleAuthUi.initialize().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.listenGoogleAuthorizeUrl();
    this.listenCallbackStream();
    this.listenCancelledStream();
  }

  startGoogleAuth(): void {
    if (this.authStore.isLoading()) {
      return;
    }

    this.authStore.requestGoogleAuthorizeUrl();
  }

  consumeCallbackUrl(rawUrl: string): boolean {
    const event = this.googleAuthUi.parseCallbackFromUrl(rawUrl);
    if (!event) {
      return false;
    }

    this.processCallback(event);
    return true;
  }

  private listenGoogleAuthorizeUrl(): void {
    toObservable(this.authStore.googleAuthorizeUrl, { injector: this.injector })
      .pipe(
        filter((url): url is string => Boolean(url)),
        distinctUntilChanged(),
        filter((url) => url !== this.lastOpenedAuthorizeUrl),
        tap((url) => {
          this.lastOpenedAuthorizeUrl = url;
        }),
        switchMap((url) =>
          this.googleAuthUi.openAuth(url).pipe(
            catchError((error) => {
              this.logger.error('Failed to open Google auth UI', { error });
              this.authStore.resetGoogleAuthFlow();
              this.lastOpenedAuthorizeUrl = null;
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private listenCallbackStream(): void {
    this.googleAuthUi.callback$
      .pipe(
        tap((event) => this.processCallback(event)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private listenCancelledStream(): void {
    this.googleAuthUi.cancelled$
      .pipe(
        tap(() => {
          this.authStore.resetGoogleAuthFlow();
          this.lastOpenedAuthorizeUrl = null;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private processCallback(event: GoogleAuthCallbackEvent): void {
    const validation = this.validateCallbackEvent(event);
    if (!validation.ok) {
      this.failGoogleFlow(validation.message);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      this.googleAuthUi
        .closeAuth()
        .pipe(
          take(1),
          catchError(() => EMPTY),
        )
        .subscribe();
    }

    this.authService
      .completeGoogleAuth({
        state: validation.state,
        code: validation.code,
        error: validation.error,
        errorDescription: validation.errorDescription,
      })
      .pipe(
        take(1),
        tap((session) => {
          this.logger.info('Google authentication completed', {
            userId: session.user.id,
            email: session.user.email,
            bankConnectionState: session.bankConnectionState,
            onboardingCompleted: session.onboardingCompleted,
          });
          this.authStore.adoptSession(session);
          this.lastOpenedAuthorizeUrl = null;
          const targetRoute = this.authStore.getPostAuthTargetRoute();
          void this.router.navigateByUrl(targetRoute, { replaceUrl: true });
        }),
        catchError((error) => {
          this.logger.error('Google authentication completion failed', { error });
          this.failGoogleFlow(
            error instanceof Error && error.message.trim().length > 0
              ? error.message
              : 'Unable to complete Google sign in',
          );
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private validateCallbackEvent(event: GoogleAuthCallbackEvent):
    | { ok: true; state: string; code?: string; error?: string; errorDescription?: string }
    | { ok: false; message: string } {
    const callbackState = event.state?.trim();
    const expectedState = this.authStore.pendingGoogleState();

    if (!callbackState) {
      return { ok: false, message: 'Missing Google auth state' };
    }

    const allowNativeStateRecovery = Capacitor.isNativePlatform() && !expectedState;
    if (!allowNativeStateRecovery && callbackState !== expectedState) {
      return { ok: false, message: 'Google auth state mismatch' };
    }

    if (event.error) {
      return {
        ok: true,
        state: callbackState,
        error: event.error,
        errorDescription: event.errorDescription ?? undefined,
      };
    }

    const code = event.code?.trim();
    if (!code) {
      return { ok: false, message: 'Missing Google authorization code' };
    }

    return {
      ok: true,
      state: callbackState,
      code,
    };
  }

  private failGoogleFlow(message: string): void {
    this.authStore.setGoogleAuthError(message);
    this.lastOpenedAuthorizeUrl = null;
    void this.router.navigateByUrl(AUTH_ENTRY_ROUTE, { replaceUrl: true });
  }
}
