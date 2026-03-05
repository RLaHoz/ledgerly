import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type {
  BankAuthClient,
  BankAuthorizeContext,
} from './bank-auth.types';

@Injectable()
export class MockCdrClient implements BankAuthClient {
  constructor(private readonly config: ConfigService) {}

  async createAuthorizeUrl(): Promise<BankAuthorizeContext> {
    const clientId = this.config.getOrThrow<string>('CDR_CLIENT_ID');
    const redirectUri = this.config.getOrThrow<string>('CDR_REDIRECT_URI');
    const scope = this.config.getOrThrow<string>('CDR_SCOPE');
    const authorizeEndpoint =
      this.config.get<string>('CDR_MOCK_AUTHORIZE_ENDPOINT')?.trim() ||
      'http://localhost:3000/api/auth/mock/authorize';

    const state = randomUUID();
    const nonce = randomUUID();
    const codeVerifier = base64Url(randomBytes(32));
    const codeChallenge = base64Url(
      createHash('sha256').update(codeVerifier).digest(),
    );
    const requestUri = `urn:ledgerly:mock:par:${randomUUID()}`;

    const authorizeUrl = new URL(authorizeEndpoint);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', scope);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('nonce', nonce);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('request_uri', requestUri);

    return {
      authorizeUrl: authorizeUrl.toString(),
      state,
      nonce,
      codeVerifier,
    };
  }
}

function base64Url(input: Buffer): string {
  return input
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
