import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import type {
  AppSessionResponse,
  AuthUser,
  IssuedSessionResponse,
  RequestWithUser,
  VerifyBankConsentResponse,
  VerifyBankConsentResult,
} from './interfaces/auth-user.interface';
import type { Response } from 'express';
import { AuthService } from './services/auth.service';
import { Public } from './decorators/public.decorator';
import { VerifyBankConsentDto } from './dto/verify-bank-consent.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import {
  AuthClientSource,
  StartBankConsentDto,
} from './dto/start-bank-consent.dto';
import { StartGoogleAuthDto } from './dto/start-google-auth.dto';
import { CompleteGoogleAuthDto } from './dto/complete-google-auth.dto';
import {
  clearRefreshSessionCookie,
  readRefreshSessionCookie,
  setRefreshSessionCookie,
} from './refresh-session-cookie';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('session/refresh')
  async refreshSession(
    @Body() dto: RefreshSessionDto,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AppSessionResponse> {
    const session = await this.authService.refreshSession({
      refreshToken: resolveRefreshToken(dto, req),
      userAgent: req.headers?.['user-agent'] as string | undefined,
      ipAddress: (req as unknown as { ip?: string }).ip,
    });

    setRefreshSessionCookie(res, session.refreshToken);
    return toPublicSessionResponse(session);
  }

  @Post('session/logout')
  async logout(
    @Body() dto: RefreshSessionDto,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    const refreshToken = resolveOptionalRefreshToken(dto, req);
    if (refreshToken) {
      await this.authService.revokeSession(refreshToken);
    }
    clearRefreshSessionCookie(res);
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return {
      authenticated: true,
      user: { id: user.id, roles: user.roles },
    };
  }

  @Public()
  @Post('google/start')
  startGoogleAuth(
    @Body() body: StartGoogleAuthDto,
    @Req() req: RequestWithUser,
  ) {
    return this.authService.startGoogleAuth({
      client: resolveAuthClient(body.client, req),
      origin: resolveRequestOrigin(req),
    });
  }

  @Public()
  @Get('google/callback')
  async googleCallbackBridge(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Query() query: Record<string, unknown>,
  ): Promise<void> {
    const targetBaseUrl = await resolveGoogleBridgeTarget(query, this.authService);
    const redirectUrl = appendQueryToTarget(
      targetBaseUrl ?? resolveFallbackGoogleBridgeTarget(req),
      query,
    );

    res.redirect(302, redirectUrl);
  }

  @Public()
  @Post('google/complete')
  async completeGoogleAuth(
    @Body() dto: CompleteGoogleAuthDto,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AppSessionResponse> {
    const session = await this.authService.completeGoogleAuth({
      state: dto.state,
      code: dto.code,
      error: dto.error,
      errorDescription: dto.errorDescription,
      userAgent: req.headers?.['user-agent'] as string | undefined,
      ipAddress: (req as unknown as { ip?: string }).ip,
    });

    setRefreshSessionCookie(res, session.refreshToken);
    return toPublicSessionResponse(session);
  }

  @Post('bank-consent/start')
  startBankConsent(
    @CurrentUser() user: AuthUser,
    @Body() body: StartBankConsentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.authService.startBankConsent({
      userId: user.id,
      client: resolveAuthClient(body.client, req),
    });
  }

  @Public()
  @Get('callback')
  async callbackBridge(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Query() query: Record<string, unknown>,
  ): Promise<void> {
    const userAgentHeader = req.headers?.['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : '';
    const client = await resolveCallbackClient(
      query,
      userAgent,
      this.authService,
    );
    const targetBaseUrl =
      client === 'native'
        ? resolveNativeBridgeTarget()
        : resolveWebBridgeTarget();
    const redirectUrl = appendQueryToTarget(targetBaseUrl, query);

    res.redirect(302, redirectUrl);
  }

  @Post('bank-consent/verify')
  async verifyBankConsent(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyBankConsentDto,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VerifyBankConsentResponse> {
    const result = await this.authService.verifyBankConsent({
      userId: user.id,
      sessionId: user.sessionId,
      state: dto.state,
      jobIds: dto.jobIds,
      userAgent: req.headers?.['user-agent'] as string | undefined,
      ipAddress: (req as unknown as { ip?: string }).ip,
    });

    if (result.session) {
      setRefreshSessionCookie(res, result.session.refreshToken);
    }

    return toPublicBankConsentResponse(result);
  }

  @Post('onboarding/complete')
  completeOnboarding(@CurrentUser() user: AuthUser) {
    return this.authService.completeOnboarding(user.id);
  }
}

function resolveRequestOrigin(req: RequestWithUser): string | null {
  const originHeader = req.headers?.origin;
  if (typeof originHeader !== 'string') {
    return null;
  }

  try {
    return new URL(originHeader).origin;
  } catch {
    return null;
  }
}

function resolveRefreshToken(
  dto: RefreshSessionDto,
  req: RequestWithUser,
): string {
  const refreshToken = resolveOptionalRefreshToken(dto, req);
  if (!refreshToken) {
    throw new UnauthorizedException('Refresh token is required');
  }

  return refreshToken;
}

function resolveOptionalRefreshToken(
  dto: RefreshSessionDto,
  req: RequestWithUser,
): string | null {
  const bodyToken = dto.refreshToken?.trim();
  if (bodyToken) {
    return bodyToken;
  }

  return readRefreshSessionCookie(req.headers?.cookie);
}

function resolveAuthClient(
  declaredClient: AuthClientSource | undefined,
  req: RequestWithUser,
): AuthClientSource {
  const origin = resolveRequestOrigin(req) ?? '';
  const isNativeOrigin = /^(capacitor|ionic):\/\/localhost$/i.test(origin);
  const sourceHeader = req.headers?.['x-client-source'];
  const source =
    typeof sourceHeader === 'string' ? sourceHeader.trim().toLowerCase() : '';
  const userAgentHeader = req.headers?.['user-agent'];
  const userAgent =
    typeof userAgentHeader === 'string' ? userAgentHeader : '';
  const isLikelyIosWebView =
    /AppleWebKit/i.test(userAgent) &&
    /Mobile\//i.test(userAgent) &&
    !/^https?:\/\//i.test(origin);

  return source === 'native' ||
    declaredClient === 'native' ||
    isNativeOrigin ||
    isLikelyIosWebView
    ? 'native'
    : 'web';
}

async function resolveGoogleBridgeTarget(
  query: Record<string, unknown>,
  authService: AuthService,
): Promise<string | null> {
  const rawState = query['state'];
  const state = typeof rawState === 'string' ? rawState : undefined;
  return authService.resolveGoogleAuthAttemptBridgeTarget(state);
}

function resolveFallbackGoogleBridgeTarget(req: RequestWithUser): string {
  const client = resolveAuthClient(undefined, req);
  if (client === 'native') {
    return normalizeRedirectBase(
      process.env.GOOGLE_CALLBACK_BRIDGE_NATIVE_URL,
      'ledgerly://auth/google/callback',
    );
  }

  return normalizeRedirectBase(
    process.env.GOOGLE_CALLBACK_BRIDGE_WEB_URL,
    'http://localhost:4200/auth/google/callback',
  );
}

function isMobileUserAgent(userAgent: string): boolean {
  return /iphone|ipad|ipod|android|mobile/i.test(userAgent);
}

async function resolveCallbackClient(
  query: Record<string, unknown>,
  userAgent: string,
  authService: AuthService,
): Promise<AuthClientSource> {
  const rawClient = query['client'];
  const client =
    typeof rawClient === 'string' ? rawClient.trim().toLowerCase() : '';

  if (client === 'web' || client === 'native') {
    return client;
  }

  const rawState = query['state'];
  const state = typeof rawState === 'string' ? rawState : undefined;
  const persistedClient = await authService.resolveConsentAttemptClient(state);
  if (persistedClient) {
    return persistedClient;
  }

  return isMobileUserAgent(userAgent) ? 'native' : 'web';
}

function resolveWebBridgeTarget(): string {
  return normalizeRedirectBase(
    process.env.BASIQ_CALLBACK_BRIDGE_WEB_URL ??
      process.env.BASIQ_CONSENT_REDIRECT_URI_WEB,
    'http://localhost:8100/auth/callback',
  );
}

function resolveNativeBridgeTarget(): string {
  return normalizeRedirectBase(
    process.env.BASIQ_CALLBACK_BRIDGE_NATIVE_URL ??
      process.env.BASIQ_CONSENT_REDIRECT_URI_NATIVE,
    'ledgerly://auth/callback',
  );
}

function normalizeRedirectBase(
  value: string | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return fallback;
  }
}

function appendQueryToTarget(
  baseUrl: string,
  query: Record<string, unknown>,
): string {
  const target = new URL(baseUrl);
  for (const [key, rawValue] of Object.entries(query)) {
    if (key === 'client') {
      continue;
    }

    if (typeof rawValue === 'string') {
      target.searchParams.append(key, rawValue);
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        if (typeof value === 'string') {
          target.searchParams.append(key, value);
        }
      }
    }
  }

  return target.toString();
}

function toPublicSessionResponse(
  session: IssuedSessionResponse,
): AppSessionResponse {
  const { refreshToken: _refreshToken, ...publicSession } = session;
  return publicSession;
}

function toPublicBankConsentResponse(
  result: VerifyBankConsentResult,
): VerifyBankConsentResponse {
  if (!result.session) {
    return result;
  }

  return {
    ...result,
    session: toPublicSessionResponse(result.session),
  };
}
