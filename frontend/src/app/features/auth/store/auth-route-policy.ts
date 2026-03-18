import { AuthStatus, BankConnectionState } from '../models/auth.models';
import {
  AUTH_BANK_CALLBACK_ROUTE,
  AUTH_CONNECT_BANK_ROUTE,
  AUTH_ENTRY_ROUTE,
  AUTH_GOOGLE_CALLBACK_ROUTE,
  DASHBOARD_ROUTE,
} from './auth-route.constants';

export interface AuthRoutePolicyInput {
  status: AuthStatus;
  hasSession: boolean;
  pendingGoogleState: string | null;
  pendingConsentState: string | null;
  bankConnectionState: BankConnectionState | null;
  onboardingCompleted: boolean;
  onboardingCurrentStep: string | null;
}

export function resolvePostAuthTargetRoute(
  input: Pick<
    AuthRoutePolicyInput,
    'hasSession' | 'bankConnectionState' | 'onboardingCompleted' | 'onboardingCurrentStep'
  >,
): string {
  if (!input.hasSession) {
    return AUTH_ENTRY_ROUTE;
  }

  if (input.bankConnectionState !== 'connected') {
    return AUTH_CONNECT_BANK_ROUTE;
  }

  if (!input.onboardingCompleted) {
    return `/onboarding/${input.onboardingCurrentStep ?? 'import'}`;
  }

  return DASHBOARD_ROUTE;
}

export function resolveBootstrapTargetRoute(
  input: AuthRoutePolicyInput & { currentUrl: string },
): string | null {
  const normalizedUrl = normalizePath(input.currentUrl);
  if (
    normalizedUrl === AUTH_BANK_CALLBACK_ROUTE ||
    normalizedUrl === AUTH_GOOGLE_CALLBACK_ROUTE
  ) {
    return null;
  }

  if (input.status === 'booting') {
    return null;
  }

  if (input.pendingGoogleState || input.pendingConsentState) {
    return null;
  }

  if (input.status === 'loading' && normalizedUrl.startsWith('/auth')) {
    return null;
  }

  if (!input.hasSession) {
    if (normalizedUrl === AUTH_ENTRY_ROUTE || normalizedUrl.startsWith('/auth/')) {
      return null;
    }

    return AUTH_ENTRY_ROUTE;
  }

  const targetRoute = resolvePostAuthTargetRoute(input);
  return normalizedUrl === targetRoute ? null : targetRoute;
}

export function normalizePath(url: string): string {
  const [path] = url.split('?');
  const normalized = path.split('#')[0] ?? '/';
  return normalized.endsWith('/') && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}
