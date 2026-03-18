import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class GoogleOidcService {
  private static readonly AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static readonly TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly tokenVerifier = new OAuth2Client();

  constructor(private readonly config: ConfigService) {}

  createAuthorizationContext(input: {
    state: string;
    nonce: string;
    redirectUri: string;
  }): {
    authorizeUrl: string;
    codeVerifier: string;
  } {
    const clientId = this.getClientId();
    const codeVerifier = createCodeVerifier();
    const codeChallenge = createCodeChallenge(codeVerifier);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: input.state,
      nonce: input.nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    });

    return {
      authorizeUrl: `${GoogleOidcService.AUTHORIZE_URL}?${params.toString()}`,
      codeVerifier,
    };
  }

  async exchangeCodeForIdentity(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    expectedNonce: string;
  }): Promise<GoogleIdentityPayload> {
    const body = new URLSearchParams({
      client_id: this.getClientId(),
      client_secret: this.getClientSecret(),
      code: input.code,
      code_verifier: input.codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: input.redirectUri,
    });

    const response = await fetch(GoogleOidcService.TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new UnauthorizedException('Google token exchange failed');
    }

    const payload = (await response.json()) as GoogleTokenResponse;
    if (!payload.id_token) {
      throw new UnauthorizedException('Google did not return an ID token');
    }

    const ticket = await this.tokenVerifier.verifyIdToken({
      idToken: payload.id_token,
      audience: this.getClientId(),
    });
    const claims = ticket.getPayload();
    if (!claims?.sub || !claims.email) {
      throw new UnauthorizedException('Google identity payload is incomplete');
    }

    if (claims.nonce !== input.expectedNonce) {
      throw new UnauthorizedException('Google nonce mismatch');
    }

    return {
      subject: claims.sub,
      email: claims.email,
      emailVerified: claims.email_verified ?? false,
      fullName: claims.name ?? claims.email,
      avatarUrl: claims.picture ?? null,
      givenName: claims.given_name ?? null,
      familyName: claims.family_name ?? null,
      rawClaims: claims,
    };
  }

  private getClientId(): string {
    return this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID').trim();
  }

  private getClientSecret(): string {
    return this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET').trim();
  }
}

export interface GoogleIdentityPayload {
  subject: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  avatarUrl: string | null;
  givenName: string | null;
  familyName: string | null;
  rawClaims: TokenPayload;
}

type GoogleTokenResponse = {
  id_token?: string;
};

function createCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

function createCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}
