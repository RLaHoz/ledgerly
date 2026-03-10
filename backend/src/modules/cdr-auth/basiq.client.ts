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
  CreateAuthorizeUrlInput,
  CreateProviderUserResult,
} from './bank-auth.types';
import type {
  BankAccountRecord,
  BankDataClient,
  BankTransactionRecord,
  ListConnectionAccountsInput,
  ListConnectionTransactionsInput,
  ListConnectionTransactionsResult,
} from './bank-data.types';

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
    href?: string;
    url?: string;
  };
};

type BasiqLinkValue = string | { href?: string; url?: string } | undefined;

type BasiqJobResponse = {
  id: string;
  status?: string;
  steps?: BasiqJobStep[];
  links?: {
    source?: BasiqLinkValue;
  };
  _links?: {
    source?: BasiqLinkValue;
  };
};

type BasiqLinkContainer = {
  next?: BasiqLinkValue;
};

type BasiqListResponse<T> = {
  data?: T[];
  links?: BasiqLinkContainer;
  _links?: BasiqLinkContainer;
};

@Injectable()
export class BasiqClient implements BankAuthClient, BankDataClient {
  private cachedServerAccessToken:
    | { token: string; expiresAtEpochMs: number }
    | undefined;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async createAuthorizeUrl(
    input: CreateAuthorizeUrlInput,
  ): Promise<BankAuthorizeContext> {
    const state = input.state;
    const nonce = randomUUID();
    const codeVerifier = randomUUID().replaceAll('-', '');

    const userId = input.providerUserId?.trim() || (await this.resolveUserId());
    const clientAccessToken = await this.createClientAccessToken(userId);
    const consentUrl = this.createConsentUrl(clientAccessToken, state);

    return {
      authorizeUrl: consentUrl,
      state,
      nonce,
      codeVerifier,
    };
  }

  async createProviderUser(): Promise<CreateProviderUserResult> {
    const providerUserId = await this.createUser();
    return { providerUserId };
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
      const source = this.extractSourceIdentifiers(response.data);
      return {
        jobId,
        outcome,
        reason:
          outcome === 'failed'
            ? this.extractFailureReason(response.data)
            : undefined,
        sourceUserId: source.sourceUserId,
        sourceConnectionId: source.sourceConnectionId,
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

  async listConnectionAccounts(
    input: ListConnectionAccountsInput,
  ): Promise<BankAccountRecord[]> {
    const serverToken = await this.getServerAccessToken();
    const baseUrl = this.resolveBasiqBaseUrl();
    const basiqVersion = this.resolveBasiqVersion();

    try {
      const response = await firstValueFrom(
        this.http.get<BasiqListResponse<Record<string, unknown>>>(
          `${baseUrl}/users/${encodeURIComponent(input.providerUserId)}/accounts`,
          {
            headers: {
              Authorization: `Bearer ${serverToken}`,
              'basiq-version': basiqVersion,
            },
          },
        ),
      );

      return (response.data.data ?? [])
        .filter((item) =>
          this.matchesConnectionId(item, input.providerConnectionId),
        )
        .map((item) => this.normalizeAccount(item))
        .filter((item): item is BankAccountRecord => item !== null);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        throw new UnauthorizedException(
          'Basiq authentication failed while fetching accounts.',
        );
      }

      throw new ServiceUnavailableException(
        `Unable to load accounts for Basiq connection "${input.providerConnectionId}".`,
      );
    }
  }

  async listConnectionTransactions(
    input: ListConnectionTransactionsInput,
  ): Promise<ListConnectionTransactionsResult> {
    const serverToken = await this.getServerAccessToken();
    const baseUrl = this.resolveBasiqBaseUrl();
    const basiqVersion = this.resolveBasiqVersion();
    const queryLimit = Math.max(1, Math.min(input.limit ?? 200, 500));

    const params: Record<string, string | number> = {
      from: input.from.toISOString(),
      to: input.to.toISOString(),
      limit: queryLimit,
    };
    if (input.cursor) {
      params.cursor = input.cursor;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<BasiqListResponse<Record<string, unknown>>>(
          `${baseUrl}/users/${encodeURIComponent(input.providerUserId)}/transactions`,
          {
            headers: {
              Authorization: `Bearer ${serverToken}`,
              'basiq-version': basiqVersion,
            },
            params,
          },
        ),
      );

      const items = (response.data.data ?? [])
        .filter((item) =>
          this.matchesConnectionId(item, input.providerConnectionId),
        )
        .map((item) => this.normalizeTransaction(item))
        .filter((item): item is BankTransactionRecord => item !== null);

      const nextCursor =
        this.extractCursorFromLink(response.data.links?.next) ??
        this.extractCursorFromLink(response.data._links?.next);

      return {
        items,
        nextCursor,
        hasMore: Boolean(nextCursor),
      };
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        throw new UnauthorizedException(
          'Basiq authentication failed while fetching transactions.',
        );
      }

      throw new ServiceUnavailableException(
        `Unable to load transactions for Basiq connection "${input.providerConnectionId}".`,
      );
    }
  }

  private matchesConnectionId(
    value: Record<string, unknown>,
    providerConnectionId: string,
  ): boolean {
    const valueConnectionId =
      this.readString(value.connection) ??
      this.readString(value.connectionId) ??
      this.readNestedString(value, ['links', 'connection']);

    // Keep backward-compatibility when the payload does not expose connection id.
    if (!valueConnectionId) {
      return true;
    }

    return valueConnectionId === providerConnectionId;
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

  private extractSourceIdentifiers(job: BasiqJobResponse): {
    sourceUserId?: string;
    sourceConnectionId?: string;
  } {
    const candidates: string[] = [];

    const sourceLink =
      this.normalizeLinkValue(job.links?.source) ??
      this.normalizeLinkValue(job._links?.source);
    if (sourceLink) candidates.push(sourceLink);

    for (const step of job.steps ?? []) {
      const stepLink =
        this.normalizeLinkValue(step.result?.href) ??
        this.normalizeLinkValue(step.result?.url);
      if (stepLink) candidates.push(stepLink);
    }

    for (const candidate of candidates) {
      const parsed = this.parseSourcePath(candidate);
      if (parsed) return parsed;
    }

    return {};
  }

  private normalizeLinkValue(link: BasiqLinkValue): string | undefined {
    if (!link) return undefined;
    if (typeof link === 'string') return link;
    return link.href ?? link.url;
  }

  private parseSourcePath(path: string): {
    sourceUserId: string;
    sourceConnectionId: string;
  } | null {
    const match = path.match(/\/users\/([^/\s?#]+)\/connections\/([^/\s?#]+)/i);
    if (!match) return null;

    return {
      sourceUserId: match[1],
      sourceConnectionId: match[2],
    };
  }

  private normalizeAccount(
    value: Record<string, unknown>,
  ): BankAccountRecord | null {
    const providerAccountId = this.readString(value.id);
    if (!providerAccountId) {
      return null;
    }

    const name = this.readString(value.name) ?? 'Bank account';
    const mask =
      this.readString(value.mask) ??
      this.readString(value.last4) ??
      this.readString(value.accountNo);
    const accountType = this.normalizeAccountType(value);
    const currency =
      this.normalizeCurrency(this.readString(value.currency)) ?? 'AUD';
    const isActive = this.readBoolean(value.isActive) ?? true;

    return {
      providerAccountId,
      name,
      mask,
      type: accountType,
      currency,
      isActive,
      payload: value,
    };
  }

  private normalizeTransaction(
    value: Record<string, unknown>,
  ): BankTransactionRecord | null {
    const providerTxId = this.readString(value.id);
    if (!providerTxId) {
      return null;
    }

    const providerAccountId =
      this.readString(value.account) ??
      this.readString(value.accountId) ??
      this.readNestedString(value, ['account', 'id']);

    if (!providerAccountId) {
      return null;
    }

    const occurredAt =
      this.readDate(value.transactionDate) ??
      this.readDate(value.postDate) ??
      this.readDate(value.date) ??
      this.readDate(value.created) ??
      new Date();

    const bookingDate =
      this.readDate(value.postDate) ??
      this.readDate(value.transactionDate) ??
      undefined;

    const amountSigned = this.normalizeAmountSigned(value);
    const currency =
      this.normalizeCurrency(
        this.readString(value.currency) ??
          this.readNestedString(value, ['amount', 'currency']),
      ) ?? 'AUD';
    const merchant = this.normalizeMerchant(
      this.readNestedString(value, ['merchant', 'name']) ??
        this.readString(value.merchant),
    );
    const description =
      this.readString(value.description) ??
      this.readString(value.reference) ??
      this.readString(value.narrative) ??
      'Bank transaction';

    const pendingStatus =
      this.readString(value.status)?.toLowerCase() ??
      this.readString(value.state)?.toLowerCase();
    const isPending =
      pendingStatus === 'pending' || pendingStatus === 'in_progress';

    const textBlob = `${merchant ?? ''} ${description}`.toLowerCase();
    const isTransfer =
      textBlob.includes('transfer') ||
      textBlob.includes('xfer') ||
      textBlob.includes('osko');

    return {
      providerTxId,
      providerAccountId,
      occurredAt,
      bookingDate,
      amountSigned,
      currency,
      merchant: merchant ?? undefined,
      description,
      isPending,
      isTransfer,
      payload: value,
    };
  }

  private normalizeAmountSigned(value: Record<string, unknown>): number {
    const raw =
      this.readNumber(value.amount) ??
      this.readNumber(value.amountSigned) ??
      this.readNumber(value.value) ??
      this.readNestedNumber(value, ['amount', 'value']) ??
      0;

    const directionHints = [
      this.readString(value.class),
      this.readString(value.subClass),
      this.readString(value.type),
      this.readString(value.direction),
      this.readString(value.creditDebitIndicator),
      this.readNestedString(value, ['amount', 'type']),
    ]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.toLowerCase());

    const isDebit = directionHints.some((hint) =>
      ['debit', 'expense', 'withdrawal', 'purchase', 'payment', 'fee'].includes(
        hint,
      ),
    );
    const isCredit = directionHints.some((hint) =>
      ['credit', 'income', 'deposit', 'refund'].includes(hint),
    );

    if (isDebit && raw > 0) return -Math.abs(raw);
    if (isCredit && raw < 0) return Math.abs(raw);

    return raw;
  }

  private normalizeAccountType(
    value: Record<string, unknown>,
  ): 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'LOAN' | 'OTHER' {
    const type = (
      this.readString(value.type) ??
      this.readString(value.subType) ??
      this.readString(value.class)
    )
      ?.trim()
      .toLowerCase();

    if (!type) return 'OTHER';
    if (type.includes('checking') || type.includes('transaction')) {
      return 'CHECKING';
    }
    if (type.includes('saving')) return 'SAVINGS';
    if (type.includes('credit')) return 'CREDIT';
    if (type.includes('loan') || type.includes('mortgage')) return 'LOAN';
    return 'OTHER';
  }

  private normalizeCurrency(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
  }

  private normalizeMerchant(value: string | undefined): string | undefined {
    const merchant = this.readString(value);
    if (!merchant) {
      return undefined;
    }

    const compact = merchant.replace(/\s+/g, '');
    if (/^[A-Z]{2}\d{5,}$/.test(compact)) {
      return undefined;
    }

    if (/^\d{6,}$/.test(compact)) {
      return undefined;
    }

    return merchant;
  }

  private extractCursorFromLink(link: BasiqLinkValue): string | undefined {
    const raw = this.normalizeLinkValue(link);
    if (!raw) return undefined;

    try {
      const parsed = new URL(raw);
      return parsed.searchParams.get('cursor') ?? undefined;
    } catch {
      const cursorMatch = raw.match(/[?&]cursor=([^&]+)/i);
      if (!cursorMatch) return undefined;
      return decodeURIComponent(cursorMatch[1]);
    }
  }

  private readString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private readBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return undefined;
  }

  private readNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }

  private readDate(value: unknown): Date | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    if (typeof value !== 'string') return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
  }

  private readNestedString(
    value: Record<string, unknown>,
    path: string[],
  ): string | undefined {
    const nested = this.readNestedValue(value, path);
    return this.readString(nested);
  }

  private readNestedNumber(
    value: Record<string, unknown>,
    path: string[],
  ): number | undefined {
    const nested = this.readNestedValue(value, path);
    return this.readNumber(nested);
  }

  private readNestedValue(
    value: Record<string, unknown>,
    path: string[],
  ): unknown {
    let current: unknown = value;
    for (const key of path) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }
}
