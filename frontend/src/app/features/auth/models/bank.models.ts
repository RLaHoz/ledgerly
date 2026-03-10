export interface BankAuthorizeUrlResponse {
  authorizeUrl: string;
  state: string;
}

export interface BasiqConsentCallbackEvent {
  rawUrl: string;
  state: string | null;
  jobId: string | null;
  jobIds: string[];
}

export interface VerifyBankConsentRequest {
  state: string;
  jobIds: string[];
}

export interface BankConsentVerificationResponse {
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
