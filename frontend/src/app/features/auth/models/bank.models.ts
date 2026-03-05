export interface BankConsentCallbackEvent {
  rawUrl: string;
  state: string | null;
  jobId: string | null;
  jobIds: string[];
}

export interface BasiqConsentCallbackEvent {
  rawUrl: string;
  state: string | null;
  jobId: string | null;
  jobIds: string[];
}

export interface BankConsentVerificationResponse {
  success: boolean;
  failedJobIds: string[];
  pendingJobIds: string[];
  message: string;
}

export type BankLinkTelemetryEventName =
  | 'consent_open_requested'
  | 'consent_open_succeeded'
  | 'consent_open_failed'
  | 'consent_callback_received'
  | 'consent_verification_succeeded'
  | 'consent_verification_failed'
  | 'consent_state_mismatch'
  | 'consent_cancelled'
  | 'consent_completed';
