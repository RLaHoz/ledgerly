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

export interface AppSessionResponse {
  user: { id: string; roles: string[] };
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  onboardingCompleted: boolean;
  isFirstBankConnectionForUser: boolean;
}

export interface BankAuthorizeUrlResponse {
  authorizeUrl: string;
  state: string;
}

export interface VerifyBankConsentResponse {
  success: boolean;
  failedJobIds: string[];
  pendingJobIds: string[];
  message: string;
  context?: {
    appUserId: string;
    providerCode: string;
    providerUserId: string;
    providerConnectionIds: string[];
    jobIds: string[];
    isFirstSuccessfulConsentForUser: boolean;
    isFirstBankConnectionForUser: boolean;
  };
}

export interface CompleteOnboardingResponse {
  success: true;
  onboardingCompleted: true;
  onboardingCompletedAt: string;
}
