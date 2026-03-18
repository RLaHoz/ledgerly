import { OnboardingStepKey } from '../../models/onboarding.models';

export const STEP_ORDER: readonly OnboardingStepKey[] = ['import', 'categories', 'budgets', 'confirm'];

export const STEP_LABELS: Record<OnboardingStepKey, string> = {
  import: 'Import',
  categories: 'Categories',
  budgets: 'Budgets',
  confirm: 'Confirm',
};

export function parseOnboardingStep(value: string | null): OnboardingStepKey | null {
  return value === 'import' || value === 'categories' || value === 'budgets' || value === 'confirm'
    ? value
    : null;
}

export function getNextOnboardingStep(currentStep: OnboardingStepKey): OnboardingStepKey | null {
  const index = STEP_ORDER.indexOf(currentStep);
  return STEP_ORDER[Math.min(index + 1, STEP_ORDER.length - 1)] ?? null;
}

export function getPreviousOnboardingStep(currentStep: OnboardingStepKey): OnboardingStepKey | null {
  const index = STEP_ORDER.indexOf(currentStep);
  return STEP_ORDER[Math.max(index - 1, 0)] ?? null;
}
