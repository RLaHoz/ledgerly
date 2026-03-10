export type AuthStatus = 'booting' | 'idle' | 'loading' | 'authenticated' | 'error';

export interface AuthUser {
  id: string;
  roles: string[];
}

export interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  onboardingCompleted: boolean;
  isFirstBankConnectionForUser: boolean;
}

export interface CompleteOnboardingResponse {
  success: true;
  onboardingCompleted: true;
  onboardingCompletedAt: string;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  isFirstBankConnectionForUser: boolean | null;
  onboardingCompleted: boolean;
  onboardingCurrentStep: string | null;
  bankAuthorizeUrl: string | null;
  pendingConsentState: string | null;
  isCompletingOnboarding: boolean;
  onboardingCompletionError: string | null;
  error: string | null;
}
