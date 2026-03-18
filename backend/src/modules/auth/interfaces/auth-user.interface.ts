export interface AuthUser {
  id: string;
  roles: string[];
  sessionId: string;
}

export type JwtTokenType = 'access' | 'refresh';

export interface ParResponse {
  request_uri: string;
  expires_in: number;
}

export type JwtClaims = {
  sub: string;
  sid: string;
  roles: string[];
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
};

export type RequestWithUser = {
  headers?: Record<string, string | string[] | undefined>;
  user?: AuthUser;
};

export type BankConnectionState =
  | 'never_connected'
  | 'connected'
  | 'reconnect_required';

interface SessionResponseBase {
  user: {
    id: string;
    roles: string[];
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  onboardingCompleted: boolean;
  bankConnectionState: BankConnectionState;
  hasConnectedBank: boolean;
}

export type AppSessionResponse = SessionResponseBase;

export interface IssuedSessionResponse extends SessionResponseBase {
  refreshToken: string;
}

export interface BankAuthorizeUrlResponse {
  authorizeUrl: string;
  state: string;
}

export interface GoogleAuthorizeUrlResponse {
  authorizeUrl: string;
  state: string;
}

export interface VerifyBankConsentResponse {
  success: boolean;
  failedJobIds: string[];
  pendingJobIds: string[];
  message: string;
  session?: AppSessionResponse;
  context?: {
    appUserId: string;
    providerCode: string;
    providerUserId: string;
    providerConnectionIds: string[];
    jobIds: string[];
    isFirstSuccessfulConsentForUser: boolean;
    bankConnectionState: BankConnectionState;
    hasConnectedBank: boolean;
    wasFirstSuccessfulBankConnection: boolean;
  };
}

export interface VerifyBankConsentResult
  extends Omit<VerifyBankConsentResponse, 'session'> {
  session?: IssuedSessionResponse;
}

export interface CompleteOnboardingResponse {
  success: true;
  onboardingCompleted: true;
  onboardingCompletedAt: string;
}
