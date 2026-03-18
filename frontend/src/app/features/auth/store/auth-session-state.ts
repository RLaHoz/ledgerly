import { BankConnectionState } from '../models/auth.models';

export const ONBOARDING_STEPS = ['import', 'categories', 'budgets', 'confirm'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface AuthSessionSnapshot {
  onboardingCurrentStep: OnboardingStep | null;
  persistedOnboardingCurrentStep: OnboardingStep | null;
}

export function resolveAuthSessionSnapshot(input: {
  bankConnectionState: BankConnectionState | null;
  onboardingCompleted: boolean;
  currentStep: string | null;
}): AuthSessionSnapshot {
  if (input.onboardingCompleted) {
    return {
      onboardingCurrentStep: null,
      persistedOnboardingCurrentStep: null,
    };
  }

  const normalizedCurrentStep = isOnboardingStep(input.currentStep)
    ? input.currentStep
    : null;

  if (input.bankConnectionState === 'connected') {
    const onboardingCurrentStep = normalizedCurrentStep ?? 'import';
    return {
      onboardingCurrentStep,
      persistedOnboardingCurrentStep: onboardingCurrentStep,
    };
  }

  if (input.bankConnectionState === 'reconnect_required') {
    return {
      onboardingCurrentStep: normalizedCurrentStep ?? 'import',
      persistedOnboardingCurrentStep: normalizedCurrentStep ?? 'import',
    };
  }

  return {
    onboardingCurrentStep: null,
    persistedOnboardingCurrentStep: null,
  };
}

export function isOnboardingStep(step: string | null): step is OnboardingStep {
  return ONBOARDING_STEPS.some((value) => value === step);
}
