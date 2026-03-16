import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Capacitor } from '@capacitor/core';
import { catchError, EMPTY, exhaustMap, of, pipe, tap, timeout, TimeoutError } from 'rxjs';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { AuthService } from '../services/auth.service';
import { SessionResponse } from '../models/auth.models';
import { SessionTokenService } from '../services/session-token.service';
import {
  initialAuthState,
  LS_IS_FIRST_BANK_CONNECTION_KEY,
  LS_IS_LOGGED_IN_KEY,
  LS_ONBOARDING_COMPLETED_KEY,
  LS_ONBOARDING_CURRENT_STEP_KEY,
  LS_PENDING_CONSENT_STATE_KEY,
} from './auth.state';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';

const ONBOARDING_STEPS = ['import', 'categories', 'budgets', 'confirm'] as const;
type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
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
    hasConnectedBank: computed(
      () => store.isFirstBankConnectionForUser() !== null,
    ),
  })),

  withMethods((store) => {
    const authService = inject(AuthService);
    const tokenService = inject(SessionTokenService);
    const runtimeConfig = inject(RuntimeConfigService);
    const resolveNetworkAwareErrorMessage = (
      err: unknown,
      fallback: string,
    ): string => {
      if (err instanceof TimeoutError) {
        return `Request timed out after ${AUTH_REQUEST_TIMEOUT_MS / 1000}s. Check backend connectivity at ${runtimeConfig.getApiUrl()}.`;
      }

      const status =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        typeof err.status === 'number'
          ? err.status
          : null;

      if (status === 0 && Capacitor.isNativePlatform()) {
        if (runtimeConfig.isLocalhostApiUrl()) {
          return 'Cannot reach backend from native app using localhost. Set LEDGERLY_API_URL_NATIVE to your Mac LAN IP before build.';
        }

        return `Cannot reach backend at ${runtimeConfig.getApiUrl()}. Ensure iPhone and Mac are on the same Wi-Fi, backend is running, and port 3000 is reachable.`;
      }

      if (err instanceof Error && err.message.trim().length > 0) {
        return err.message;
      }

      return fallback;
    };

    const persistBoolean = (key: string, value: boolean): void => {
      localStorage.setItem(key, value ? 'true' : 'false');
    };

    const persistNullableBoolean = (
      key: string,
      value: boolean | null,
    ): void => {
      if (value === null) {
        localStorage.removeItem(key);
        return;
      }
      persistBoolean(key, value);
    };

    const persistOnboardingStep = (step: OnboardingStep | null): void => {
      if (!step) {
        localStorage.removeItem(LS_ONBOARDING_CURRENT_STEP_KEY);
        return;
      }

      localStorage.setItem(LS_ONBOARDING_CURRENT_STEP_KEY, step);
    };

    const applySession = (session: SessionResponse) => {
      tokenService.setTokens(session);
      // Session API returns true when user has zero bank connections.
      // For routing/bootstrap we represent "no bank connected yet" as null.
      const hasNoConnectedBank = session.isFirstBankConnectionForUser === true;
      const isFirstBankConnectionForUser = hasNoConnectedBank ? null : false;
      const onboardingCompleted = hasNoConnectedBank
        ? false
        : session.onboardingCompleted;
      const onboardingCurrentStep = hasNoConnectedBank
        ? null
        : onboardingCompleted
          ? null
          : (store.onboardingCurrentStep() as OnboardingStep | null) ?? 'import';

      persistBoolean(LS_IS_LOGGED_IN_KEY, true);
      persistNullableBoolean(
        LS_IS_FIRST_BANK_CONNECTION_KEY,
        isFirstBankConnectionForUser,
      );
      persistBoolean(LS_ONBOARDING_COMPLETED_KEY, onboardingCompleted);
      persistOnboardingStep(onboardingCurrentStep);
      patchState(store, {
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        isLoggedIn: true,
        isFirstBankConnectionForUser,
        onboardingCompleted,
        onboardingCurrentStep,
        isCompletingOnboarding: false,
        onboardingCompletionError: null,
        status: 'idle',
        error: null,
      });
    };

    const clearLedgerlyStorage = (): void => {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('ledgerly')) {
          localStorage.removeItem(key);
        }
      }
    };

    const ensureSession = rxMethod<void>(
      pipe(
        exhaustMap(() => {
          const refresh = store.refreshToken();
          const request$ = refresh
            ? authService.refreshSession(refresh)
            : authService.createAnonymousSession();

          return request$.pipe(
            timeout(AUTH_REQUEST_TIMEOUT_MS),
            tap((session) => applySession(session)),
            catchError(() => {
              return authService.createAnonymousSession().pipe(
                timeout(AUTH_REQUEST_TIMEOUT_MS),
                tap((session) => applySession(session)),
                catchError((err: unknown) => {
                  tokenService.clearTokens();
                  localStorage.removeItem(LS_IS_LOGGED_IN_KEY);
                  patchState(store, {
                    isLoggedIn: false,
                    status: 'error',
                    error: resolveNetworkAwareErrorMessage(
                      err,
                      'Unable to initialize session',
                    ),
                  });
                  return EMPTY;
                }),
              );
            }),
          );
        }),
      ),
    );

    const requestBankAuthorizeUrl = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { status: 'loading', error: null })),
        exhaustMap(() =>
          authService.getBankAuthorizeUrl().pipe(
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
              const errorMessage = resolveNetworkAwareErrorMessage(
                err,
                'Failed to start bank consent',
              );
              localStorage.removeItem(LS_PENDING_CONSENT_STATE_KEY);
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

    const markBankConnected = (input?: {
      isFirstBankConnectionForUser?: boolean | null;
    }) => {
      localStorage.removeItem(LS_PENDING_CONSENT_STATE_KEY);
      const isFirstBankConnectionForUser =
        input?.isFirstBankConnectionForUser ?? store.isFirstBankConnectionForUser();
      const onboardingCompleted =
        isFirstBankConnectionForUser === true ? false : store.onboardingCompleted();
      const onboardingCurrentStep = onboardingCompleted
        ? null
        : (store.onboardingCurrentStep() as OnboardingStep | null) ?? 'import';

      persistNullableBoolean(
        LS_IS_FIRST_BANK_CONNECTION_KEY,
        isFirstBankConnectionForUser,
      );
      persistBoolean(LS_ONBOARDING_COMPLETED_KEY, onboardingCompleted);
      persistOnboardingStep(onboardingCurrentStep);

      patchState(store, {
        status: 'authenticated',
        isLoggedIn: true,
        isFirstBankConnectionForUser,
        onboardingCompleted,
        onboardingCurrentStep,
        bankAuthorizeUrl: null,
        pendingConsentState: null,
        error: null,
      });
    };

    const setOnboardingCompleted = (completed: boolean) => {
      persistBoolean(LS_ONBOARDING_COMPLETED_KEY, completed);
      if (completed) {
        persistOnboardingStep(null);
        patchState(store, {
          onboardingCompleted: true,
          onboardingCurrentStep: null,
          onboardingCompletionError: null,
        });
        return;
      }

      const onboardingCurrentStep =
        (store.onboardingCurrentStep() as OnboardingStep | null) ?? 'import';
      persistOnboardingStep(onboardingCurrentStep);
      patchState(store, {
        onboardingCompleted: false,
        onboardingCurrentStep,
        onboardingCompletionError: null,
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

    const setOnboardingCurrentStep = (step: string) => {
      if (store.onboardingCompleted() || !isOnboardingStep(step)) {
        return;
      }

      persistOnboardingStep(step);
      patchState(store, { onboardingCurrentStep: step });
    };

    const getBootstrapTargetRoute = (currentUrl: string): string | null => {
      const normalizedUrl = normalizePath(currentUrl);
      if (normalizedUrl === '/auth/callback') {
        return null;
      }

      if (normalizedUrl === '/auth' && store.status() === 'loading') {
        return null;
      }

      if (store.status() === 'booting') {
        return null;
      }

      if (store.pendingConsentState()) {
        return null;
      }

      if (!store.isLoggedIn()) {
        return '/auth';
      }

      const onboardingTargetRoute = `/onboarding/${store.onboardingCurrentStep() ?? 'import'}`;
      const isFirstBankConnectionForUser = store.isFirstBankConnectionForUser();
      if (isFirstBankConnectionForUser === false) {
        return store.onboardingCompleted() ? '/dashboard' : onboardingTargetRoute;
      }

      if (isFirstBankConnectionForUser === true) {
        return onboardingTargetRoute;
      }

      return '/auth';
    };

    const setBankLinkError = (message: string) => {
      localStorage.removeItem(LS_PENDING_CONSENT_STATE_KEY);
      patchState(store, {
        status: 'error',
        bankAuthorizeUrl: null,
        pendingConsentState: null,
        isCompletingOnboarding: false,
        onboardingCompletionError: null,
        error: message,
      });
    };

    const resetBankLinkFlow = () => {
      localStorage.removeItem(LS_PENDING_CONSENT_STATE_KEY);
      patchState(store, {
        status: 'idle',
        bankAuthorizeUrl: null,
        pendingConsentState: null,
        onboardingCompletionError: null,
        error: null,
      });
    };

    const clearSession = () => {
      tokenService.clearTokens();
      clearLedgerlyStorage();
      patchState(store, {
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoggedIn: false,
        isFirstBankConnectionForUser: null,
        onboardingCompleted: false,
        onboardingCurrentStep: null,
        isCompletingOnboarding: false,
        onboardingCompletionError: null,
        status: 'idle',
      });
    };

    const expireSessionByInactivity = rxMethod<void>(
      pipe(
        exhaustMap(() => {
          const refreshToken = tokenService.refreshToken();
          const logout$ = refreshToken
            ? authService.logoutSession(refreshToken)
            : of({ success: true as const });

          return logout$.pipe(
            catchError(() => of({ success: true as const })),
            tap(() => {
              clearSession();
              ensureSession();
            }),
          );
        }),
      ),
    );

    return {
      ensureSession,
      requestBankAuthorizeUrl,
      markBankConnected,
      setOnboardingCompleted,
      completeOnboarding,
      setOnboardingCurrentStep,
      getBootstrapTargetRoute,
      setBankLinkError,
      resetBankLinkFlow,
      clearSession,
      expireSessionByInactivity,
    };
  }),
);

function normalizePath(url: string): string {
  const [path] = url.split('?');
  const normalized = path.split('#')[0] ?? '/';
  return normalized.endsWith('/') && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

function isOnboardingStep(step: string): step is OnboardingStep {
  return ONBOARDING_STEPS.some((value) => value === step);
}
