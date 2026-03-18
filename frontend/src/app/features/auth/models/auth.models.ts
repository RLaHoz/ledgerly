export type AuthStatus = 'booting' | 'idle' | 'loading' | 'authenticated' | 'error';

export interface AuthUser {
  id: string;
  roles: string[];
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

export type BankConnectionState =
  | 'never_connected'
  | 'connected'
  | 'reconnect_required';

export interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  onboardingCompleted: boolean;
  bankConnectionState: BankConnectionState;
  hasConnectedBank: boolean;
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
  googleAuthorizeUrl: string | null;
  pendingGoogleState: string | null;
  bankConnectionState: BankConnectionState | null;
  onboardingCompleted: boolean;
  onboardingCurrentStep: string | null;
  bankAuthorizeUrl: string | null;
  pendingConsentState: string | null;
  isCompletingOnboarding: boolean;
  onboardingCompletionError: string | null;
  error: string | null;
}
