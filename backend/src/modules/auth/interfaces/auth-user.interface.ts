export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

export class BankAuthorizeUrlResponse {
  authorizeUrl!: string;
}

export class VerifyBankConsentResponse {
  success!: boolean;
  failedJobIds!: string[];
  pendingJobIds!: string[];
  message!: string;
}

export interface ParResponse {
  request_uri: string;
  expires_in: number;
}
