import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  EMPTY,
  exhaustMap,
  of,
  pipe,
  tap,
  timeout,
} from 'rxjs';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { AuthService } from '../services/auth.service';
import { BankConnectionState, SessionResponse } from '../models/auth.models';
import { SessionTokenService } from '../services/session-token.service';
import {
  initialAuthState,
  LS_ONBOARDING_COMPLETED_KEY,
  LS_PENDING_CONSENT_STATE_KEY,
  LS_PENDING_GOOGLE_STATE_KEY,
} from './auth.state';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';
import {
  resolveBootstrapTargetRoute,
  resolvePostAuthTargetRoute,
} from './auth-route-policy';
import {
  clearLedgerlyStorage,
  persistBankConnectionState,
  persistBoolean,
  persistOnboardingStep,
} from './auth-storage';
import { isOnboardingStep } from './auth-session-state';
import {
  buildAuthenticatedState,
  buildBankConnectionPatch,
  buildClearedSessionState,
  buildOnboardingPatch,
} from './auth-store.transitions';
import {
  isUnauthorizedHttpError,
  resolveAuthErrorMessage,
} from './auth-store.errors';
const AUTH_REQUEST_TIMEOUT_MS = 15000;

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withDevtools('AuthStore'),
  withState(initialAuthState),
  withComputed((store) => ({
    isBooting: computed(() => store.status() === 'booting'),
    isIdle: computed(() => store.status() === 'idle'),
    isLoading: computed(() => store.status() === 'loading'),
    isSuccess: computed(() => store.status() === 'authenticated'),
    isError: computed(() => store.status() === 'error'),
    hasSession: computed(() => store.user() !== null && typeof store.accessToken() === 'string'),
    hasConnectedBank: computed(() => store.bankConnectionState() === 'connected'),
    requiresBankLogin: computed(
      () =>
        store.user() !== null &&
        typeof store.accessToken() === 'string' &&
        store.bankConnectionState() !== 'connected',
    ),
    canAccessDashboard: computed(
      () =>
        store.user() !== null &&
        typeof store.accessToken() === 'string' &&
        store.bankConnectionState() === 'connected' &&
        store.onboardingCompleted(),
    ),
  })),
  withMethods((store) => {
    const authService = inject(AuthService);
    const tokenService = inject(SessionTokenService);
    const runtimeConfig = inject(RuntimeConfigService);

    const clearPendingGoogleState = (): void => {
      localStorage.removeItem(LS_PENDING_GOOGLE_STATE_KEY);
    };

    const clearPendingConsentState = (): void => {
      localStorage.removeItem(LS_PENDING_CONSENT_STATE_KEY);
    };

    const buildRoutePolicyState = () => ({
      status: store.status(),
      hasSession: store.hasSession(),
      pendingGoogleState: store.pendingGoogleState(),
      pendingConsentState: store.pendingConsentState(),
      bankConnectionState: store.bankConnectionState(),
      onboardingCompleted: store.onboardingCompleted(),
      onboardingCurrentStep: store.onboardingCurrentStep(),
    });

    const applySession = (session: SessionResponse): void => {
      tokenService.setTokens(session);
      const authenticatedState = buildAuthenticatedState(
        session,
        store.onboardingCurrentStep(),
      );

      persistBankConnectionState(session.bankConnectionState);
      persistBoolean(LS_ONBOARDING_COMPLETED_KEY, session.onboardingCompleted);
      persistOnboardingStep(authenticatedState.onboardingCurrentStep);

      patchState(store, {
        ...authenticatedState,
      });
    };

    const adoptSession = (session: SessionResponse): void => {
      clearPendingGoogleState();
      clearPendingConsentState();
      applySession(session);
      patchState(store, {
        googleAuthorizeUrl: null,
        pendingGoogleState: null,
        bankAuthorizeUrl: null,
        pendingConsentState: null,
        status: 'authenticated',
      });
    };

    const handleSessionInitializationFailure = (
      err: unknown,
      fallback: string,
    ): void => {
      if (isUnauthorizedHttpError(err)) {
        clearSessionState('idle', null, true);
        return;
      }

      tokenService.clearTokens();
      clearPendingGoogleState();
      clearPendingConsentState();
      patchState(store, {
        ...buildClearedSessionState(
          'error',
          resolveAuthErrorMessage({
            error: err,
            fallback,
            timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
            apiUrl: runtimeConfig.getApiUrl(),
            isLocalhostApiUrl: runtimeConfig.isLocalhostApiUrl(),
          }),
        ),
        googleAuthorizeUrl: null,
        pendingGoogleState: null,
        bankAuthorizeUrl: null,
        pendingConsentState: null,
      });
    };

    const clearSessionState = (
      status: 'idle' | 'error',
      error: string | null,
      preservePendingFlows = false,
    ): void => {
      tokenService.clearTokens();
      if (!preservePendingFlows) {
        clearPendingGoogleState();
        clearPendingConsentState();
      }
      patchState(store, {
        ...buildClearedSessionState(status, error),
        googleAuthorizeUrl: null,
        bankAuthorizeUrl: null,
        pendingGoogleState: preservePendingFlows
          ? store.pendingGoogleState()
          : null,
        pendingConsentState: preservePendingFlows
          ? store.pendingConsentState()
          : null,
      });
    };

    const ensureSession = rxMethod<void>(
      pipe(
        exhaustMap(() => {
          return authService.refreshSession().pipe(
            timeout(AUTH_REQUEST_TIMEOUT_MS),
            tap((session) => applySession(session)),
            catchError((err: unknown) => {
              handleSessionInitializationFailure(err, 'Unable to restore session');
              return EMPTY;
            }),
          );
        }),
      ),
    );

    const requestGoogleAuthorizeUrl = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { status: 'loading', error: null })),
        exhaustMap(() =>
          authService.startGoogleAuth().pipe(
            timeout(AUTH_REQUEST_TIMEOUT_MS),
            tap(({ authorizeUrl, state }) => {
              localStorage.setItem(LS_PENDING_GOOGLE_STATE_KEY, state);
              patchState(store, {
                status: 'loading',
                googleAuthorizeUrl: authorizeUrl,
                pendingGoogleState: state,
                error: null,
              });
            }),
            catchError((err: unknown) => {
              const errorMessage = resolveAuthErrorMessage({
                error: err,
                fallback: 'Failed to start Google authentication',
                timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
                apiUrl: runtimeConfig.getApiUrl(),
                isLocalhostApiUrl: runtimeConfig.isLocalhostApiUrl(),
              });
              clearPendingGoogleState();
              patchState(store, {
                status: 'error',
                googleAuthorizeUrl: null,
                pendingGoogleState: null,
                error: errorMessage,
              });
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    const requestBankAuthorizeUrl = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { status: 'loading', error: null })),
        exhaustMap(() =>
          authService.startBankConsent().pipe(
            timeout(AUTH_REQUEST_TIMEOUT_MS),
            tap(({ authorizeUrl, state }) => {
              localStorage.setItem(LS_PENDING_CONSENT_STATE_KEY, state);
              patchState(store, {
                status: 'loading',
                bankAuthorizeUrl: authorizeUrl,
                pendingConsentState: state,
                error: null,
              });
            }),
            catchError((err: unknown) => {
              const errorMessage = resolveAuthErrorMessage({
                error: err,
                fallback: 'Failed to start bank consent',
                timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
                apiUrl: runtimeConfig.getApiUrl(),
                isLocalhostApiUrl: runtimeConfig.isLocalhostApiUrl(),
              });
              clearPendingConsentState();
              patchState(store, {
                status: 'error',
                bankAuthorizeUrl: null,
                pendingConsentState: null,
                error: errorMessage,
              });
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    const setBankConnectionState = (
      bankConnectionState: BankConnectionState | null,
    ): void => {
      if (!store.pendingConsentState()) {
        clearPendingConsentState();
      }
      const patch = buildBankConnectionPatch({
        hasSession: store.hasSession(),
        bankConnectionState,
        onboardingCompleted: store.onboardingCompleted(),
        onboardingCurrentStep: store.onboardingCurrentStep(),
      });

      persistBankConnectionState(bankConnectionState);
      persistBoolean(LS_ONBOARDING_COMPLETED_KEY, store.onboardingCompleted());
      persistOnboardingStep(patch.persistedOnboardingCurrentStep);

      patchState(store, {
        status: patch.status,
        bankConnectionState: patch.bankConnectionState,
        onboardingCompleted: patch.onboardingCompleted,
        onboardingCurrentStep: patch.onboardingCurrentStep,
        error: patch.error,
      });
    };

    const setOnboardingCompleted = (completed: boolean): void => {
      persistBoolean(LS_ONBOARDING_COMPLETED_KEY, completed);
      const patch = buildOnboardingPatch({
        completed,
        bankConnectionState: store.bankConnectionState(),
        onboardingCurrentStep: store.onboardingCurrentStep(),
      });
      persistOnboardingStep(patch.persistedOnboardingCurrentStep);
      patchState(store, {
        onboardingCompleted: patch.onboardingCompleted,
        onboardingCurrentStep: patch.onboardingCurrentStep,
        onboardingCompletionError: patch.onboardingCompletionError,
      });
    };

    const completeOnboarding = rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, {
            isCompletingOnboarding: true,
            onboardingCompletionError: null,
          }),
        ),
        exhaustMap(() =>
          authService.completeOnboarding().pipe(
            tap(() => {
              persistBoolean(LS_ONBOARDING_COMPLETED_KEY, true);
              persistOnboardingStep(null);
              patchState(store, {
                onboardingCompleted: true,
                onboardingCurrentStep: null,
                isCompletingOnboarding: false,
                onboardingCompletionError: null,
              });
            }),
            catchError((err: unknown) => {
              patchState(store, {
                isCompletingOnboarding: false,
                onboardingCompletionError:
                  err instanceof Error
                    ? err.message
                    : 'Unable to complete onboarding.',
              });
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    const setOnboardingCurrentStep = (step: string): void => {
      if (store.onboardingCompleted() || !isOnboardingStep(step)) {
        return;
      }

      persistOnboardingStep(step);
      patchState(store, { onboardingCurrentStep: step });
    };

    const getBootstrapTargetRoute = (currentUrl: string): string | null => {
      return resolveBootstrapTargetRoute({
        currentUrl,
        ...buildRoutePolicyState(),
      });
    };

    const getPostAuthTargetRoute = (): string =>
      resolvePostAuthTargetRoute(buildRoutePolicyState());

    const setGoogleAuthError = (message: string): void => {
      clearPendingGoogleState();
      patchState(store, {
        status: 'error',
        googleAuthorizeUrl: null,
        pendingGoogleState: null,
        error: message,
      });
    };

    const resetGoogleAuthFlow = (): void => {
      clearPendingGoogleState();
      patchState(store, {
        status: 'idle',
        googleAuthorizeUrl: null,
        pendingGoogleState: null,
        error: null,
      });
    };

    const setBankLinkError = (message: string): void => {
      clearPendingConsentState();
      patchState(store, {
        status: 'error',
        bankAuthorizeUrl: null,
        pendingConsentState: null,
        isCompletingOnboarding: false,
        onboardingCompletionError: null,
        error: message,
      });
    };

    const resetBankLinkFlow = (): void => {
      clearPendingConsentState();
      patchState(store, {
        status: 'idle',
        bankAuthorizeUrl: null,
        pendingConsentState: null,
        onboardingCompletionError: null,
        error: null,
      });
    };

    const clearSession = (): void => {
      tokenService.clearTokens();
      clearLedgerlyStorage();
      patchState(store, {
        ...buildClearedSessionState('idle', null),
        googleAuthorizeUrl: null,
        pendingGoogleState: null,
        bankAuthorizeUrl: null,
        pendingConsentState: null,
      });
    };

    const expireSessionByInactivity = rxMethod<void>(
      pipe(
        exhaustMap(() =>
          authService.logoutSession().pipe(
            catchError(() => of({ success: true as const })),
            tap(() => {
              clearSession();
            }),
          ),
        ),
      ),
    );

    const logout = rxMethod<void>(
      pipe(
        exhaustMap(() =>
          authService.logoutSession().pipe(
            catchError(() => of({ success: true as const })),
            tap(() => {
              clearSession();
            }),
          ),
        ),
      ),
    );

    return {
      ensureSession,
      requestGoogleAuthorizeUrl,
      requestBankAuthorizeUrl,
      adoptSession,
      setBankConnectionState,
      setOnboardingCompleted,
      completeOnboarding,
      setOnboardingCurrentStep,
      getBootstrapTargetRoute,
      getPostAuthTargetRoute,
      setGoogleAuthError,
      resetGoogleAuthFlow,
      setBankLinkError,
      resetBankLinkFlow,
      clearSession,
      logout,
      expireSessionByInactivity,
    };
  }),
);
