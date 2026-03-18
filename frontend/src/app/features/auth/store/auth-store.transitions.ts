import { AuthState, BankConnectionState, SessionResponse } from '../models/auth.models';
import { resolveAuthSessionSnapshot } from './auth-session-state';

type AuthStateSubset = Pick<
  AuthState,
  | 'user'
  | 'accessToken'
  | 'bankConnectionState'
  | 'onboardingCompleted'
  | 'onboardingCurrentStep'
  | 'isCompletingOnboarding'
  | 'onboardingCompletionError'
  | 'status'
  | 'error'
>;

export function buildAuthenticatedState(
  session: SessionResponse,
  currentStep: string | null,
): AuthStateSubset {
  const snapshot = resolveAuthSessionSnapshot({
    bankConnectionState: session.bankConnectionState,
    onboardingCompleted: session.onboardingCompleted,
    currentStep,
  });

  return {
    user: session.user,
    accessToken: session.accessToken,
    bankConnectionState: session.bankConnectionState,
    onboardingCompleted: session.onboardingCompleted,
    onboardingCurrentStep: snapshot.onboardingCurrentStep,
    isCompletingOnboarding: false,
    onboardingCompletionError: null,
    status: 'idle',
    error: null,
  };
}

export function buildBankConnectionPatch(input: {
  hasSession: boolean;
  bankConnectionState: BankConnectionState | null;
  onboardingCompleted: boolean;
  onboardingCurrentStep: string | null;
}): Pick<
  AuthState,
  | 'status'
  | 'bankConnectionState'
  | 'onboardingCompleted'
  | 'onboardingCurrentStep'
  | 'error'
> & { persistedOnboardingCurrentStep: string | null } {
  const snapshot = resolveAuthSessionSnapshot({
    bankConnectionState: input.bankConnectionState,
    onboardingCompleted: input.onboardingCompleted,
    currentStep: input.onboardingCurrentStep,
  });

  return {
    status: input.hasSession ? 'authenticated' : 'idle',
    bankConnectionState: input.bankConnectionState,
    onboardingCompleted: input.onboardingCompleted,
    onboardingCurrentStep: snapshot.onboardingCurrentStep,
    persistedOnboardingCurrentStep: snapshot.persistedOnboardingCurrentStep,
    error: null,
  };
}

export function buildOnboardingPatch(input: {
  completed: boolean;
  bankConnectionState: BankConnectionState | null;
  onboardingCurrentStep: string | null;
}): Pick<
  AuthState,
  | 'onboardingCompleted'
  | 'onboardingCurrentStep'
  | 'onboardingCompletionError'
> & { persistedOnboardingCurrentStep: string | null } {
  if (input.completed) {
    return {
      onboardingCompleted: true,
      onboardingCurrentStep: null,
      onboardingCompletionError: null,
      persistedOnboardingCurrentStep: null,
    };
  }

  const snapshot = resolveAuthSessionSnapshot({
    bankConnectionState: input.bankConnectionState,
    onboardingCompleted: false,
    currentStep: input.onboardingCurrentStep,
  });

  return {
    onboardingCompleted: false,
    onboardingCurrentStep: snapshot.onboardingCurrentStep,
    onboardingCompletionError: null,
    persistedOnboardingCurrentStep: snapshot.persistedOnboardingCurrentStep,
  };
}

export function buildClearedSessionState(
  status: 'idle' | 'error',
  error: string | null,
): AuthStateSubset {
  return {
    user: null,
    accessToken: null,
    bankConnectionState: null,
    onboardingCompleted: false,
    onboardingCurrentStep: null,
    isCompletingOnboarding: false,
    onboardingCompletionError: null,
    status,
    error,
  };
}
