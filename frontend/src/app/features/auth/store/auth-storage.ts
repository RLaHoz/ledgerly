import { AuthState, BankConnectionState } from '../models/auth.models';

export const LS_ACCESS_TOKEN_KEY = 'ledgerly_access_token';
export const LS_PENDING_GOOGLE_STATE_KEY = 'ledgerly_pending_google_state';
export const LS_PENDING_CONSENT_STATE_KEY = 'ledgerly_pending_consent_state';
export const LS_BANK_CONNECTION_STATE_KEY = 'ledgerly_bank_connection_state';
export const LS_HAS_CONNECTED_BANK_KEY = 'ledgerly_has_connected_bank';
export const LS_ONBOARDING_COMPLETED_KEY = 'ledgerly_onboarding_completed';
export const LS_ONBOARDING_CURRENT_STEP_KEY = 'ledgerly_onboarding_current_step';
export const LEGACY_LS_REFRESH_TOKEN_KEY = 'ledgerly_refresh_token';
const LS_LEGACY_IS_FIRST_BANK_CONNECTION_KEY =
  'ledgerly_is_first_bank_connection';

export function createInitialAuthState(): AuthState {
  return {
    status: 'booting',
    user: null,
    accessToken: localStorage.getItem(LS_ACCESS_TOKEN_KEY),
    googleAuthorizeUrl: null,
    pendingGoogleState: localStorage.getItem(LS_PENDING_GOOGLE_STATE_KEY),
    bankConnectionState: readBankConnectionStateFromStorage(),
    onboardingCompleted: readBooleanFromStorage(LS_ONBOARDING_COMPLETED_KEY, false),
    onboardingCurrentStep: readOnboardingStepFromStorage(),
    bankAuthorizeUrl: null,
    pendingConsentState: localStorage.getItem(LS_PENDING_CONSENT_STATE_KEY),
    isCompletingOnboarding: false,
    onboardingCompletionError: null,
    error: null,
  };
}

export function persistBankConnectionState(
  value: BankConnectionState | null,
): void {
  if (value === null) {
    localStorage.removeItem(LS_BANK_CONNECTION_STATE_KEY);
    localStorage.removeItem(LS_HAS_CONNECTED_BANK_KEY);
    return;
  }

  localStorage.setItem(LS_BANK_CONNECTION_STATE_KEY, value);
  localStorage.removeItem(LS_HAS_CONNECTED_BANK_KEY);
}

export function persistBoolean(key: string, value: boolean): void {
  localStorage.setItem(key, value ? 'true' : 'false');
}

export function persistOnboardingStep(step: string | null): void {
  if (!step) {
    localStorage.removeItem(LS_ONBOARDING_CURRENT_STEP_KEY);
    return;
  }

  localStorage.setItem(LS_ONBOARDING_CURRENT_STEP_KEY, step);
}

export function clearLedgerlyStorage(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('ledgerly')) {
      localStorage.removeItem(key);
    }
  }
}

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

function readBankConnectionStateFromStorage(): BankConnectionState | null {
  const currentValue = localStorage.getItem(LS_BANK_CONNECTION_STATE_KEY);
  if (
    currentValue === 'connected' ||
    currentValue === 'never_connected' ||
    currentValue === 'reconnect_required'
  ) {
    return currentValue;
  }

  const legacyBooleanValue = readNullableBooleanFromStorage(LS_HAS_CONNECTED_BANK_KEY);
  if (legacyBooleanValue === true) {
    return 'connected';
  }

  if (legacyBooleanValue === false) {
    return null;
  }

  const legacyValue = readNullableBooleanFromStorage(
    LS_LEGACY_IS_FIRST_BANK_CONNECTION_KEY,
  );
  if (legacyValue === null) {
    return null;
  }

  return legacyValue ? 'never_connected' : 'connected';
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
