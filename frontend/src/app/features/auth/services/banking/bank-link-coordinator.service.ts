import { DestroyRef, Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { catchError, distinctUntilChanged, filter, switchMap, take, tap } from 'rxjs/operators';
import { AuthStore } from '../../store/auth.store';
import { BasiqConsentUiService } from './basiq-consent-ui.service';
import { AuthService } from '../auth.service';

@Injectable({ providedIn: 'root' })
export class BankLinkCoordinatorService {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly consentUi = inject(BasiqConsentUiService);

  private initialized = false;
  private lastOpenedAuthorizeUrl: string | null = null;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.consentUi.initialize().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.listenBankAuthorizeUrl();
    this.listenCallbackStream();
    this.listenCancelledStream();
  }

  startBankLink(): void {
    if (this.authStore.isLoading()) return;
    this.authStore.requestBankAuthorizeUrl();
  }

  consumeCallbackUrl(rawUrl: string): boolean {
    const event = this.consentUi.parseCallbackFromUrl(rawUrl);
    if (!event) return false;
    this.processConsentCallback(event);
    return true;
  }

  private listenBankAuthorizeUrl(): void {
    toObservable(this.authStore.bankAuthorizeUrl, { injector: this.injector })
      .pipe(
        filter((url): url is string => !!url),
        distinctUntilChanged(),
        filter((url) => url !== this.lastOpenedAuthorizeUrl),
        tap((url) => {
          this.lastOpenedAuthorizeUrl = url;
        }),
        switchMap((url) =>
          this.consentUi.openConsent(url).pipe(
            catchError(() => {
              this.authStore.resetBankLinkFlow();
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
    this.consentUi.callback$
      .pipe(
        tap((event) => this.processConsentCallback(event)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private processConsentCallback(event: {
    state: string | null;
    jobId: string | null;
    jobIds: string[];
  }): void {
    const expectedState = this.authStore.pendingConsentState();

    if (!event.state || !expectedState || event.state !== expectedState) {
      console.warn('[BankLink] Invalid consent callback state', {
        callbackState: event.state,
        expectedState,
      });
      this.authStore.setBankLinkError('Invalid consent callback state');
      this.lastOpenedAuthorizeUrl = null;
      void this.router.navigateByUrl('/auth', { replaceUrl: true });
      return;
    }

    const jobIds = [...new Set([...(event.jobIds ?? []), ...(event.jobId ? [event.jobId] : [])])];

    if (jobIds.length === 0) {
      this.authStore.setBankLinkError('No consent jobs returned by provider');
      this.lastOpenedAuthorizeUrl = null;
      void this.router.navigateByUrl('/auth', { replaceUrl: true });
      return;
    }

    this.authService
      .verifyBankConsent({ state: event.state, jobIds })
      .pipe(
        take(1),
        tap((result) => {
          if (!result.success) {
            console.warn('[BankLink] Consent verification failed', {
              state: event.state,
              jobIds,
              failedJobIds: result.failedJobIds,
              pendingJobIds: result.pendingJobIds,
              message: result.message,
            });
            this.authStore.setBankLinkError(result.message);
            this.lastOpenedAuthorizeUrl = null;
            void this.router.navigateByUrl('/auth', { replaceUrl: true });
            return;
          }

          console.info('[BankLink] Consent verification succeeded', {
            state: event.state,
            jobIds,
            appUserId: result.context?.appUserId ?? this.authStore.user()?.id,
            providerCode: result.context?.providerCode,
            providerUserId: result.context?.providerUserId,
            providerConnectionIds: result.context?.providerConnectionIds ?? [],
            isFirstSuccessfulConsentForUser:
              result.context?.isFirstSuccessfulConsentForUser ?? false,
            isFirstBankConnectionForUser:
              result.context?.isFirstBankConnectionForUser ?? false,
            userConsentProfile:
              result.context?.isFirstSuccessfulConsentForUser
                ? 'first_time_user'
                : 'returning_user',
            // Use these IDs in your backend transaction sync/fetch endpoint.
            transactionApiContext: result.context,
          });

          this.authStore.markBankConnected({
            isFirstBankConnectionForUser:
              result.context?.isFirstBankConnectionForUser ?? null,
          });
          this.lastOpenedAuthorizeUrl = null;
          const targetRoute =
            this.authStore.getBootstrapTargetRoute('/auth') ?? '/auth';

          void this.router.navigateByUrl(targetRoute, { replaceUrl: true });
        }),
        catchError(() => {
          console.error('[BankLink] Consent verification request failed', {
            state: event.state,
            jobIds,
          });
          this.authStore.setBankLinkError('Unable to verify consent');
          this.lastOpenedAuthorizeUrl = null;
          void this.router.navigateByUrl('/auth', { replaceUrl: true });
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private listenCancelledStream(): void {
    this.consentUi.cancelled$
      .pipe(
        tap(() => {
          this.authStore.resetBankLinkFlow();
          this.lastOpenedAuthorizeUrl = null;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
