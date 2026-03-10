import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { PkceService } from './pkce.service';
import type {
  BankAuthClient,
  BankAuthorizeContext,
} from '../cdr-auth/bank-auth.types';

type ParResponse = { request_uri: string; expires_in?: number };

@Injectable()
export class CdrClient implements BankAuthClient {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly pkce: PkceService,
  ) {}

  async createAuthorizeUrl(): Promise<BankAuthorizeContext> {
    const clientId = this.config.getOrThrow<string>('CDR_CLIENT_ID');
    const redirectUri = this.config.getOrThrow<string>('CDR_REDIRECT_URI');
    const scope = this.config.getOrThrow<string>('CDR_SCOPE');
    const parEndpoint = this.config.getOrThrow<string>('CDR_PAR_ENDPOINT');
    const authorizeEndpoint = this.config.getOrThrow<string>(
      'CDR_AUTHORIZE_ENDPOINT',
    );
    const allowParFallback =
      this.config.get<string>('CDR_PAR_FALLBACK_TO_AUTHORIZE') === 'true';

    const state = randomUUID();
    const nonce = randomUUID();

    const codeVerifier = this.pkce.generateVerifier();
    const codeChallenge = this.pkce.challengeFromVerifier(codeVerifier);

    const body = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    let par: { data: ParResponse };
    try {
      par = await firstValueFrom(
        this.http.post<ParResponse>(parEndpoint, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const responseText =
        typeof axiosError.response?.data === 'string'
          ? axiosError.response.data
          : '';

      const missingClientCert =
        axiosError.response?.status === 400 &&
        /No required SSL certificate was sent/i.test(responseText);

      if (missingClientCert) {
        if (!allowParFallback) {
          throw new ServiceUnavailableException(
            'CDR PAR requires mTLS client certificate. Configure CDR_MTLS_PFX_PATH (or CDR_MTLS_CERT_PATH + CDR_MTLS_KEY_PATH).',
          );
        }

        const fallbackAuthorizeUrl =
          `${authorizeEndpoint}` +
          `?client_id=${encodeURIComponent(clientId)}` +
          '&response_type=code' +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent(scope)}` +
          `&state=${encodeURIComponent(state)}` +
          `&nonce=${encodeURIComponent(nonce)}` +
          `&code_challenge=${encodeURIComponent(codeChallenge)}` +
          '&code_challenge_method=S256';

        return {
          authorizeUrl: fallbackAuthorizeUrl,
          state,
          nonce,
          codeVerifier,
        };
      }

      const trustChainError = /certificate/i.test(
        `${axiosError.code ?? ''} ${responseText}`,
      );

      if (trustChainError) {
        throw new ServiceUnavailableException(
          'CDR TLS trust chain validation failed. Verify CDR_CA_BUNDLE_PATH points to the official sandbox root/intermediate bundle.',
        );
      }

      throw error;
    }

    const requestUri = par.data.request_uri;

    const authorizeUrl =
      `${authorizeEndpoint}` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&request_uri=${encodeURIComponent(requestUri)}`;

    return { authorizeUrl, state, nonce, codeVerifier };
  }
}
