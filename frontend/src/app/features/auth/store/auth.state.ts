import { AuthState } from '../models/auth.models';

export const LS_ACCESS_TOKEN_KEY = 'ledgerly_access_token';
export const LS_REFRESH_TOKEN_KEY = 'ledgerly_refresh_token';
export const LS_PENDING_CONSENT_STATE_KEY = 'ledgerly_pending_consent_state';
export const LS_IS_LOGGED_IN_KEY = 'ledgerly_is_logged_in';
export const LS_IS_FIRST_BANK_CONNECTION_KEY = 'ledgerly_is_first_bank_connection';
export const LS_ONBOARDING_COMPLETED_KEY = 'ledgerly_onboarding_completed';
export const LS_ONBOARDING_CURRENT_STEP_KEY = 'ledgerly_onboarding_current_step';

export const initialAuthState: AuthState = {
  status: 'booting',
  user: null,
  accessToken: localStorage.getItem(LS_ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(LS_REFRESH_TOKEN_KEY),
  isLoggedIn: readBooleanFromStorage(LS_IS_LOGGED_IN_KEY, false),
  isFirstBankConnectionForUser: readNullableBooleanFromStorage(
    LS_IS_FIRST_BANK_CONNECTION_KEY,
  ),
  onboardingCompleted: readBooleanFromStorage(LS_ONBOARDING_COMPLETED_KEY, false),
  onboardingCurrentStep: readOnboardingStepFromStorage(),
  bankAuthorizeUrl: null,
  pendingConsentState: localStorage.getItem(LS_PENDING_CONSENT_STATE_KEY),
  isCompletingOnboarding: false,
  onboardingCompletionError: null,
  error: null,
};

function readBooleanFromStorage(key: string, fallback: boolean): boolean {
  const value = localStorage.getItem(key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function readNullableBooleanFromStorage(key: string): boolean | null {
  const value = localStorage.getItem(key);
  if (value === null) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function readOnboardingStepFromStorage(): string | null {
  const value = localStorage.getItem(LS_ONBOARDING_CURRENT_STEP_KEY);
  if (!value) return null;

  if (
    value === 'import' ||
    value === 'categories' ||
    value === 'budgets' ||
    value === 'confirm'
  ) {
    return value;
  }

  return null;
}
