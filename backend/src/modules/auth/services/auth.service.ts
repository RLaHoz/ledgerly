/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  BankAuthorizeUrlResponse,
  VerifyBankConsentResponse,
} from '../interfaces/auth-user.interface';
import {
  BANK_AUTH_CLIENT,
  BankConsentJobStatus,
  type BankAuthClient,
} from 'src/modules/cdr-auth/bank-auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    @Inject(BANK_AUTH_CLIENT) private readonly bankAuth: BankAuthClient,
  ) {}

  async createBankAuthorizeUrl(): Promise<BankAuthorizeUrlResponse> {
    const { authorizeUrl /*, state, nonce, codeVerifier */ } =
      await this.bankAuth.createAuthorizeUrl();

    // En el siguiente paso (callback) vas a guardar state+codeVerifier en DB
    // asociado a tu user/session. Por ahora devolvemos solo la URL.
    return { authorizeUrl };
  }

  createMockAuthorizeRedirect(redirectUri: string, state?: string): string {
    if (!redirectUri) {
      throw new BadRequestException('Missing redirect_uri query param');
    }

    const expectedRedirectUri =
      this.config.getOrThrow<string>('CDR_REDIRECT_URI');
    if (redirectUri !== expectedRedirectUri) {
      throw new BadRequestException('Unexpected redirect_uri');
    }

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', 'mock-auth-code');
    if (state) {
      callbackUrl.searchParams.set('state', state);
    }

    return callbackUrl.toString();
  }

  async verifyBankConsent(
    jobIds: string[],
  ): Promise<VerifyBankConsentResponse> {
    const normalizedJobIds = [...new Set(jobIds.map((id) => id.trim()))].filter(
      Boolean,
    );
    if (normalizedJobIds.length === 0) {
      throw new BadRequestException('At least one jobId is required.');
    }

    if (!this.bankAuth.getConsentJobStatus) {
      throw new BadRequestException(
        'Consent job verification is not supported for the current CDR_MODE.',
      );
    }

    const results = await Promise.all(
      normalizedJobIds.map((jobId) =>
        this.bankAuth.getConsentJobStatus!(jobId),
      ),
    );

    return this.buildConsentVerificationResponse(results);
  }

  private buildConsentVerificationResponse(
    results: BankConsentJobStatus[],
  ): VerifyBankConsentResponse {
    const failedJobs = results.filter((job) => job.outcome === 'failed');
    const pendingJobs = results.filter((job) => job.outcome === 'pending');
    const success = failedJobs.length === 0 && pendingJobs.length === 0;

    if (success) {
      return {
        success: true,
        failedJobIds: [],
        pendingJobIds: [],
        message: 'Consent jobs completed successfully.',
      };
    }

    if (failedJobs.length > 0) {
      return {
        success: false,
        failedJobIds: failedJobs.map((job) => job.jobId),
        pendingJobIds: pendingJobs.map((job) => job.jobId),
        message:
          failedJobs[0].reason ??
          'Consent was not completed successfully. Please try again.',
      };
    }

    return {
      success: false,
      failedJobIds: [],
      pendingJobIds: pendingJobs.map((job) => job.jobId),
      message: 'Consent is still processing. Please wait and retry shortly.',
    };
  }
}
