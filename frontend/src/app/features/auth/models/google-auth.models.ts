export interface GoogleAuthorizeUrlResponse {
  authorizeUrl: string;
  state: string;
}

export interface CompleteGoogleAuthRequest {
  state: string;
  code?: string;
  error?: string;
  errorDescription?: string;
}

export interface GoogleAuthCallbackEvent {
  rawUrl: string;
  state: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
}
