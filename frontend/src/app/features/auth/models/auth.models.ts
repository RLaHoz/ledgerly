export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'error';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  sessionToken: string | null;
  error: string | null;
  bankAuthorizeUrl: string | null;
  // Persist expected callback state in store for replay/state-mismatch protection.
  pendingConsentState: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}
