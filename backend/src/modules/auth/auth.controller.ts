import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import type {
  AuthUser,
  RequestWithUser,
} from './interfaces/auth-user.interface';
import type { Response } from 'express';
import { AuthService } from './services/auth.service';
import { Public } from './decorators/public.decorator';
import { VerifyBankConsentDto } from './dto/verify-bank-consent.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { CreateAnonymousSessionDto } from './dto/create-anonymous-session.dto';
import {
  AuthClientSource,
  BankLoginSourceDto,
} from './dto/bank-login-source.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('session/anonymous')
  createAnonymousSession(
    @Body() dto: CreateAnonymousSessionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.authService.createAnonymousSession({
      deviceId: dto.deviceId,
      userAgent: req.headers?.['user-agent'] as string | undefined,
      ipAddress: (req as unknown as { ip?: string }).ip,
    });
  }

  @Public()
  @Post('session/refresh')
  refreshSession(@Body() dto: RefreshSessionDto, @Req() req: RequestWithUser) {
    return this.authService.refreshSession({
      refreshToken: dto.refreshToken,
      userAgent: req.headers?.['user-agent'] as string | undefined,
      ipAddress: (req as unknown as { ip?: string }).ip,
    });
  }

  @Post('session/logout')
  async logout(@Body() dto: RefreshSessionDto): Promise<{ success: true }> {
    await this.authService.revokeSession(dto.refreshToken);
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return {
      authenticated: true,
      user: { id: user.id, roles: user.roles },
    };
  }

  @Get('bankLoginUrl')
  bankLoginUrl(
    @CurrentUser() user: AuthUser,
    @Query() query: BankLoginSourceDto,
    @Req() req: RequestWithUser,
  ) {
    const originHeader = req.headers?.origin;
    const origin = typeof originHeader === 'string' ? originHeader : '';
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
    const isNativeRequest =
      source === 'native' ||
      query.client === 'native' ||
      isNativeOrigin ||
      isLikelyIosWebView;
    const client: AuthClientSource = isNativeRequest ? 'native' : 'web';
    return this.authService.createBankAuthorizeUrl(user.id, client);
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
  verifyBankConsent(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyBankConsentDto,
  ) {
    return this.authService.verifyBankConsent({
      userId: user.id,
      state: dto.state,
      jobIds: dto.jobIds,
    });
  }

  @Post('onboarding/complete')
  completeOnboarding(@CurrentUser() user: AuthUser) {
    return this.authService.completeOnboarding(user.id);
  }
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
