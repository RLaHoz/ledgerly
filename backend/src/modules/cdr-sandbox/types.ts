export class BankAuthorizeUrlResponse {
  authorizeUrl!: string;
}
export interface ParResponse {
  request_uri: string;
  expires_in: number;
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  method: 'S256';
}

export interface CdrAuthorizeResult {
  authorizeUrl: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}
