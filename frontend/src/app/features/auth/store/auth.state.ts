import { AuthState } from "../models/auth.models";

export const LS_KEY = 'ledgerly_session_token';

export const initialAuthState: AuthState = {
  status: 'idle',
  user: null,
  sessionToken: null,
  bankAuthorizeUrl: null,
  pendingConsentState: null,
  error: null,
};

