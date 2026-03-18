import { DestroyRef, Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, timer } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  expand,
  filter,
  last,
  map,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { AuthStore } from '../../store/auth.store';
import { BasiqConsentUiService } from './basiq-consent-ui.service';
import { AuthService } from '../auth.service';
import { AuthFlowLoggerService } from '../auth-flow-logger.service';
import {
  isPendingVerificationResult,
  validateConsentCallbackEvent,
} from './bank-link-coordinator.util';
import {
  BankConsentVerificationResponse,
  BasiqConsentCallbackEvent,
} from '../../models/bank.models';
import { AUTH_CONNECT_BANK_ROUTE } from '../../store/auth-route.constants';

const CONSENT_VERIFY_RETRY_DELAY_MS = 1500;
const CONSENT_VERIFY_MAX_ATTEMPTS = 20;

@Injectable({ providedIn: 'root' })
export class BankLinkCoordinatorService {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly consentUi = inject(BasiqConsentUiService);
  private readonly logger = inject(AuthFlowLoggerService);

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

  private processConsentCallback(event: BasiqConsentCallbackEvent): void {
    const expectedState = this.authStore.pendingConsentState();
    const allowNativeStateRecovery = Capacitor.isNativePlatform() && !expectedState;
    const validation = validateConsentCallbackEvent(
      event,
      expectedState,
      allowNativeStateRecovery,
    );

    if (!validation.ok) {
      this.failConsentFlow(validation.message);
      return;
    }

    if (allowNativeStateRecovery) {
      this.logger.info('Proceeding with native callback despite missing local pending state', {
        callbackState: event.state,
      });
    }

    if (Capacitor.isNativePlatform()) {
      this.closeNativeConsentUi();
    }

    this.verifyBankConsentUntilSettled(validation.state, validation.jobIds)
      .pipe(
        take(1),
        tap((result) =>
          this.handleConsentVerificationResult(result, validation.state, validation.jobIds),
        ),
        catchError((error) => {
          this.logger.error('Consent verification request failed', {
            state: validation.state,
            jobIds: validation.jobIds,
            error,
          });
          this.failConsentFlow('Unable to verify consent');
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

  private verifyBankConsentUntilSettled(state: string, jobIds: string[]) {
    const payload = { state, jobIds };

    return this.authService.verifyBankConsent(payload).pipe(
      expand((result, attemptIndex) => {
        const shouldRetry =
          isPendingVerificationResult(result) &&
          attemptIndex + 1 < CONSENT_VERIFY_MAX_ATTEMPTS;

        if (!shouldRetry) {
          return EMPTY;
        }

        return timer(CONSENT_VERIFY_RETRY_DELAY_MS).pipe(
          switchMap(() => this.authService.verifyBankConsent(payload)),
        );
      }),
      last(),
      map((result) => {
        if (!isPendingVerificationResult(result)) {
          return result;
        }

        return {
          ...result,
          message:
            'Consent verification is taking longer than expected. Please retry in a moment.',
        };
      }),
    );
  }

  private handleConsentVerificationResult(
    result: BankConsentVerificationResponse,
    state: string,
    jobIds: string[],
  ): void {
    if (!result.success) {
      this.logger.warn('Consent verification failed', {
        state,
        jobIds,
        failedJobIds: result.failedJobIds,
        pendingJobIds: result.pendingJobIds,
        message: result.message,
      });
      this.failConsentFlow(result.message);
      return;
    }

    this.logger.info('Consent verification succeeded', {
      state,
      jobIds,
      appUserId: result.session?.user.id ?? result.context?.appUserId,
      providerCode: result.context?.providerCode,
      providerUserId: result.context?.providerUserId,
      providerConnectionIds: result.context?.providerConnectionIds ?? [],
      isFirstSuccessfulConsentForUser:
        result.context?.isFirstSuccessfulConsentForUser ?? false,
      wasFirstSuccessfulBankConnection:
        result.context?.wasFirstSuccessfulBankConnection ?? false,
      hasConnectedBank: result.context?.hasConnectedBank ?? false,
      bankConnectionState:
        result.session?.bankConnectionState ?? result.context?.bankConnectionState ?? null,
      userConsentProfile:
        result.context?.isFirstSuccessfulConsentForUser
          ? 'first_time_user'
          : 'returning_user',
      onboardingCompleted: result.session?.onboardingCompleted ?? null,
      transactionApiContext: result.context,
    });

    if (!result.session) {
      this.failConsentFlow('Consent verification did not return a session');
      return;
    }

    this.authStore.adoptSession(result.session);
    this.lastOpenedAuthorizeUrl = null;

    const targetRoute = this.authStore.getPostAuthTargetRoute();
    void this.router.navigateByUrl(targetRoute, { replaceUrl: true });
  }

  private failConsentFlow(message: string): void {
    this.authStore.setBankLinkError(message);
    this.lastOpenedAuthorizeUrl = null;
    void this.router.navigateByUrl(AUTH_CONNECT_BANK_ROUTE, { replaceUrl: true });
  }

  private closeNativeConsentUi(): void {
    this.consentUi
      .closeConsent()
      .pipe(
        take(1),
        catchError(() => EMPTY),
      )
      .subscribe();
  }
}
