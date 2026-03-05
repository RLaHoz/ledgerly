import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { initialAuthState } from './auth.state';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, exhaustMap, pipe, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const AuthStore = signalStore(
  { providedIn: 'root' },

  withState(initialAuthState),

  withComputed((store) => ({
    isIdle: computed(() => store.status() === 'idle'),

    isLoading: computed(() => store.status() === 'loading'),

    isSuccess: computed(() => store.status() === 'authenticated'),

    isError: computed(() => store.status() === 'error'),
  })),
  withMethods((store) => {
    const authService = inject(AuthService);

    const requestBankAuthorizeUrl = rxMethod<void>(
      pipe(
        tap(() => {
          if (store.status() === 'loading') return;
          patchState(store, { status: 'loading', error: null });
        }),
        exhaustMap(() =>
          authService.getBankAuthorizeUrl().pipe(
            tap(({ authorizeUrl }) =>
              patchState(store, {
                status: 'loading',
                bankAuthorizeUrl: authorizeUrl,
                error: null,
              }),
            ),
            catchError((err: unknown) => {
              patchState(store, {
                status: 'error',
                bankAuthorizeUrl: null,
                pendingConsentState: null,
                error: err instanceof Error ? err.message : 'Unknown error',
              });
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    const setPendingConsentState = (state: string | null) =>
      patchState(store, { pendingConsentState: state });

    const clearPendingConsentState = () =>
      patchState(store, { pendingConsentState: null });

    const markBankConnected = () =>
      patchState(store, {
        status: 'authenticated',
        bankAuthorizeUrl: null,
        pendingConsentState: null,
        error: null,
      });

    const setBankLinkError = (message: string) =>
      patchState(store, {
        status: 'error',
        bankAuthorizeUrl: null,
        pendingConsentState: null,
        error: message,
      });

    const resetBankLinkFlow = () =>
      patchState(store, {
        status: 'idle',
        bankAuthorizeUrl: null,
        pendingConsentState: null,
        error: null,
      });

    return {
      requestBankAuthorizeUrl,
      setPendingConsentState,
      clearPendingConsentState,
      markBankConnected,
      setBankLinkError,
      resetBankLinkFlow,
    };
  }),
);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeNumberInput(value: string): string {
  return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function parseCurrencyValue(value: string): number {
  const normalized = value.replace(/[^\d.]/g, '');
  const amount = Number.parseFloat(normalized);

  return Number.isFinite(amount) ? amount : 0;
}

function resolveStatus(spent: number, limit: number): 'on-track' | 'watch' | 'over' {
  if (spent >= limit) {
    return 'over';
  }

  if (limit > 0 && spent / limit >= 0.75) {
    return 'watch';
  }

  return 'on-track';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function slugify(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : `category-${Date.now()}`;
}
