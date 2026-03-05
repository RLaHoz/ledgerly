export interface BankAuthorizeContext {
  authorizeUrl: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

export type BankConsentJobOutcome = 'success' | 'failed' | 'pending';

export interface BankConsentJobStatus {
  jobId: string;
  outcome: BankConsentJobOutcome;
  reason?: string;
}

export interface BankAuthClient {
  createAuthorizeUrl(): Promise<BankAuthorizeContext>;
  getConsentJobStatus?(jobId: string): Promise<BankConsentJobStatus>;
}

export const BANK_AUTH_CLIENT = Symbol('BANK_AUTH_CLIENT');

export type CdrMode = 'sandbox' | 'mock' | 'basiq';

export function resolveCdrMode(value?: string): CdrMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'mock') {
    return 'mock';
  }
  if (normalized === 'basiq') {
    return 'basiq';
  }

  return 'sandbox';
}
