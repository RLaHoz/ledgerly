// frontend/src/app/features/auth/services/bank-link-consent-coordinator.service.ts
import { DestroyRef, Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { catchError, distinctUntilChanged, filter, switchMap, take, tap } from 'rxjs/operators';

import { AuthStore } from '../../store/auth.store';
import { BasiqConsentUiService } from './basiq-consent-ui.service';
import { BasiqConsentCallbackEvent } from '../../models/bank.models';
import { BankLinkTelemetryService } from './bank-link-telemetry.service';
import { AuthService } from '../auth.service';


@Injectable({ providedIn: 'root' })
export class BankLinkCoordinatorService {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly consentUi = inject(BasiqConsentUiService);
  private readonly telemetry = inject(BankLinkTelemetryService);

  // Guards duplicate opening in rare replay/re-emission scenarios.
  private lastOpenedAuthorizeUrl: string | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.listenConsentSdkEvents();
    this.listenBankAuthorizeUrl();
    this.listenCallbackStream();
    this.listenConsentCancelledStream();
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

  private listenConsentSdkEvents(): void {
    this.consentUi
      .initialize()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private listenBankAuthorizeUrl(): void {
    toObservable(this.authStore.bankAuthorizeUrl, { injector: this.injector })
      .pipe(
        filter((url): url is string => !!url),
        distinctUntilChanged(),
        filter((url) => url !== this.lastOpenedAuthorizeUrl),
        tap((url) => {
          this.lastOpenedAuthorizeUrl = url;
          this.authStore.setPendingConsentState(this.extractState(url));
          this.telemetry.emit('consent_open_requested', { hasState: !!this.extractState(url) });
        }),
        switchMap((url) =>
          this.consentUi.openConsent(url).pipe(
            tap(() => this.telemetry.emit('consent_open_succeeded')),
            catchError((err) => {
              this.telemetry.emit('consent_open_failed', {
                message: err instanceof Error ? err.message : 'unknown',
              });
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
    this.telemetry.emit('consent_callback_received', {
      hasJobId: !!event.jobId,
      jobIdsCount: event.jobIds.length,
    });

    if (!this.isValidState(event)) {
      return;
    }

    const jobIds = this.resolveCallbackJobIds(event);
    if (jobIds.length === 0) {
      this.telemetry.emit('consent_verification_failed', {
        reason: 'missing_job_ids',
      });
      this.authStore.setBankLinkError(
        'We could not verify the bank connection. Please try again.',
      );
      this.lastOpenedAuthorizeUrl = null;
      void this.router.navigateByUrl('/auth', { replaceUrl: true });
      return;
    }

    this.authService
      .verifyBankConsent(jobIds)
      .pipe(
        take(1),
        tap((verification) => {
          if (!verification.success) {
            this.telemetry.emit('consent_verification_failed', {
              failedJobIds: verification.failedJobIds,
              pendingJobIds: verification.pendingJobIds,
              message: verification.message,
            });
            this.authStore.setBankLinkError(verification.message);
            this.lastOpenedAuthorizeUrl = null;
            void this.router.navigateByUrl('/auth', { replaceUrl: true });
            return;
          }

          this.telemetry.emit('consent_verification_succeeded', {
            verifiedJobs: jobIds.length,
          });
          this.authStore.markBankConnected();
          this.authStore.clearPendingConsentState();
          this.lastOpenedAuthorizeUrl = null;
          this.telemetry.emit('consent_completed');
          this.consentUi
            .closeConsent()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();

          void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        }),
        catchError((error: unknown) => {
          this.telemetry.emit('consent_verification_failed', {
            reason: 'verification_request_failed',
            message: error instanceof Error ? error.message : 'unknown',
          });
          this.authStore.setBankLinkError(
            'Unable to verify consent result. Please try again.',
          );
          this.lastOpenedAuthorizeUrl = null;
          void this.router.navigateByUrl('/auth', { replaceUrl: true });
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private listenConsentCancelledStream(): void {
    this.consentUi.cancelled$
      .pipe(
        tap(() => {
          this.telemetry.emit('consent_cancelled');
          if (!this.authStore.isLoading()) return;
          this.authStore.resetBankLinkFlow();
          this.lastOpenedAuthorizeUrl = null;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private isValidState(event: BasiqConsentCallbackEvent): boolean {
    const expected = this.authStore.pendingConsentState();
    if (!expected) return true;

    const valid = event.state === expected;
    if (!valid) {
      this.telemetry.emit('consent_state_mismatch', {
        expectedState: expected,
        receivedState: event.state,
      });
    }
    return valid;
  }

  private extractState(authorizeUrl: string): string | null {
    try {
      return new URL(authorizeUrl).searchParams.get('state');
    } catch {
      return null;
    }
  }

  private resolveCallbackJobIds(event: BasiqConsentCallbackEvent): string[] {
    const normalized = [...event.jobIds];
    if (event.jobId) {
      normalized.push(event.jobId);
    }

    return [...new Set(normalized.map((value) => value.trim()))].filter(
      Boolean,
    );
  }
}
