import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { randomUUID } from 'node:crypto';
import { firstValueFrom } from 'rxjs';
import {
  BankAuthClient,
  BankAuthorizeContext,
  BankConsentJobOutcome,
  BankConsentJobStatus,
} from './bank-auth.types';

type BasiqTokenResponse = {
  access_token: string;
  expires_in: number;
};

type BasiqUserResponse = {
  id: string;
};

type BasiqJobStep = {
  title?: string;
  status?: string;
  result?: {
    type?: string;
    reason?: string;
    message?: string;
    description?: string;
  };
};

type BasiqJobResponse = {
  id: string;
  status?: string;
  steps?: BasiqJobStep[];
};

@Injectable()
export class BasiqClient implements BankAuthClient {
  private cachedServerAccessToken:
    | { token: string; expiresAtEpochMs: number }
    | undefined;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async createAuthorizeUrl(): Promise<BankAuthorizeContext> {
    const state = randomUUID();
    const nonce = randomUUID();
    const codeVerifier = randomUUID().replaceAll('-', '');

    const userId = await this.resolveUserId();
    const clientAccessToken = await this.createClientAccessToken(userId);
    const consentUrl = this.createConsentUrl(clientAccessToken, state);

    return {
      authorizeUrl: consentUrl,
      state,
      nonce,
      codeVerifier,
    };
  }

  async getConsentJobStatus(jobId: string): Promise<BankConsentJobStatus> {
    const serverToken = await this.getServerAccessToken();
    const baseUrl = this.resolveBasiqBaseUrl();
    const basiqVersion = this.resolveBasiqVersion();

    try {
      const response = await firstValueFrom(
        this.http.get<BasiqJobResponse>(`${baseUrl}/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${serverToken}`,
            'basiq-version': basiqVersion,
          },
        }),
      );

      const outcome = this.resolveJobOutcome(response.data);
      return {
        jobId,
        outcome,
        reason:
          outcome === 'failed'
            ? this.extractFailureReason(response.data)
            : undefined,
      };
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        throw new UnauthorizedException(
          'Basiq authentication failed while verifying consent job.',
        );
      }

      throw new ServiceUnavailableException(
        `Unable to verify Basiq consent job status for "${jobId}".`,
      );
    }
  }

  private async resolveUserId(): Promise<string> {
    const configuredUserId = this.config.get<string>('BASIQ_USER_ID')?.trim();
    if (configuredUserId) {
      return configuredUserId;
    }

    return this.createUser();
  }

  private async createUser(): Promise<string> {
    const serverToken = await this.getServerAccessToken();
    const email = this.resolveUserEmail();
    const mobile = this.config.get<string>('BASIQ_USER_MOBILE')?.trim();
    const baseUrl = this.resolveBasiqBaseUrl();
    const basiqVersion = this.resolveBasiqVersion();

    try {
      const response = await firstValueFrom(
        this.http.post<BasiqUserResponse>(
          `${baseUrl}/users`,
          {
            email,
            ...(mobile ? { mobile } : {}),
          },
          {
            headers: {
              Authorization: `Bearer ${serverToken}`,
              'Content-Type': 'application/json',
              'basiq-version': basiqVersion,
            },
          },
        ),
      );

      return response.data.id;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 409) {
        throw new ServiceUnavailableException(
          'Basiq user already exists. Set BASIQ_USER_ID or use a unique BASIQ_USER_EMAIL.',
        );
      }

      throw new ServiceUnavailableException(
        'Unable to create Basiq user for consent flow.',
      );
    }
  }

  private resolveUserEmail(): string {
    const configuredEmail = this.config.get<string>('BASIQ_USER_EMAIL')?.trim();
    if (configuredEmail) {
      return configuredEmail;
    }

    return `ledgerly+${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
  }

  private async getServerAccessToken(): Promise<string> {
    const now = Date.now();
    if (
      this.cachedServerAccessToken &&
      this.cachedServerAccessToken.expiresAtEpochMs > now
    ) {
      return this.cachedServerAccessToken.token;
    }

    const tokenResponse = await this.createToken('SERVER_ACCESS');
    const expiresAtEpochMs = now + tokenResponse.expires_in * 1000 - 30_000;
    this.cachedServerAccessToken = {
      token: tokenResponse.access_token,
      expiresAtEpochMs,
    };

    return tokenResponse.access_token;
  }

  private async createClientAccessToken(userId: string): Promise<string> {
    const tokenResponse = await this.createToken('CLIENT_ACCESS', userId);
    return tokenResponse.access_token;
  }

  private async createToken(
    scope: 'SERVER_ACCESS' | 'CLIENT_ACCESS',
    userId?: string,
  ): Promise<BasiqTokenResponse> {
    const apiKey = this.config.get<string>('BASIQ_API_KEY')?.trim();
    if (!apiKey) {
      throw new UnauthorizedException(
        'Missing BASIQ_API_KEY. Add your Basiq API key to backend/.env.',
      );
    }

    const baseUrl = this.resolveBasiqBaseUrl();
    const basiqVersion = this.resolveBasiqVersion();
    const body = new URLSearchParams({ scope });
    if (userId) {
      body.set('userId', userId);
    }

    try {
      const response = await firstValueFrom(
        this.http.post<BasiqTokenResponse>(
          `${baseUrl}/token`,
          body.toString(),
          {
            headers: {
              Authorization: `Basic ${apiKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'basiq-version': basiqVersion,
            },
          },
        ),
      );

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        throw new UnauthorizedException(
          'Basiq authentication failed. Verify BASIQ_API_KEY.',
        );
      }

      throw new ServiceUnavailableException(
        'Unable to obtain Basiq access token.',
      );
    }
  }

  private createConsentUrl(clientAccessToken: string, state: string): string {
    const consentBaseUrl =
      this.config.get<string>('BASIQ_CONSENT_UI_URL')?.trim() ??
      'https://consent.basiq.io/home';
    const action =
      this.config.get<string>('BASIQ_CONSENT_ACTION')?.trim() ?? 'add';

    const redirectUri = this.config
      .get<string>('BASIQ_CONSENT_REDIRECT_URI')
      ?.trim();

    const consentUrl = new URL(consentBaseUrl);
    consentUrl.searchParams.set('token', clientAccessToken);
    consentUrl.searchParams.set('action', action);
    consentUrl.searchParams.set('state', state);

    // Required for web/native return into your app after consent success.
    if (redirectUri) {
      consentUrl.searchParams.set('redirect_uri', redirectUri);
    }

    return consentUrl.toString();
  }

  private resolveBasiqBaseUrl(): string {
    return (
      this.config.get<string>('BASIQ_API_BASE_URL')?.trim() ??
      'https://au-api.basiq.io'
    );
  }

  private resolveBasiqVersion(): string {
    return this.config.get<string>('BASIQ_VERSION')?.trim() ?? '3.0';
  }

  private resolveJobOutcome(job: BasiqJobResponse): BankConsentJobOutcome {
    const topLevelStatus = this.normalizeStatus(job.status);
    if (topLevelStatus === 'failed') return 'failed';
    if (topLevelStatus === 'success') return 'success';
    if (topLevelStatus === 'pending') return 'pending';

    const steps = job.steps ?? [];
    if (steps.length === 0) {
      return 'pending';
    }

    const hasFailedStep = steps.some((step) => {
      const status = this.normalizeStatus(step.status);
      return (
        status === 'failed' ||
        step.result?.type?.toLowerCase() === 'error' ||
        step.result?.type?.toLowerCase() === 'failed'
      );
    });
    if (hasFailedStep) {
      return 'failed';
    }

    const allStepsSuccessful = steps.every(
      (step) => this.normalizeStatus(step.status) === 'success',
    );
    if (allStepsSuccessful) {
      return 'success';
    }

    return 'pending';
  }

  private normalizeStatus(
    rawStatus: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  ): BankConsentJobOutcome | null {
    const normalized = rawStatus?.trim().toLowerCase();
    if (!normalized) return null;

    if (
      normalized === 'success' ||
      normalized === 'succeeded' ||
      normalized === 'completed'
    ) {
      return 'success';
    }

    if (
      normalized === 'failed' ||
      normalized === 'error' ||
      normalized === 'cancelled'
    ) {
      return 'failed';
    }

    if (
      normalized === 'pending' ||
      normalized === 'processing' ||
      normalized === 'running' ||
      normalized === 'in_progress'
    ) {
      return 'pending';
    }

    return null;
  }

  private extractFailureReason(job: BasiqJobResponse): string {
    const failedStep = (job.steps ?? []).find((step) => {
      const status = this.normalizeStatus(step.status);
      return (
        status === 'failed' ||
        step.result?.type?.toLowerCase() === 'error' ||
        step.result?.type?.toLowerCase() === 'failed'
      );
    });

    if (!failedStep) {
      return 'Consent verification failed.';
    }

    return (
      failedStep.result?.reason ??
      failedStep.result?.message ??
      failedStep.result?.description ??
      `Consent step "${failedStep.title ?? 'unknown'}" failed.`
    );
  }
}
