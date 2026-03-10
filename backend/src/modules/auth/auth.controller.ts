import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import type {
  AuthUser,
  RequestWithUser,
} from './interfaces/auth-user.interface';
import { AuthService } from './services/auth.service';
import { Public } from './decorators/public.decorator';
import { VerifyBankConsentDto } from './dto/verify-bank-consent.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { CreateAnonymousSessionDto } from './dto/create-anonymous-session.dto';

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
  bankLoginUrl(@CurrentUser() user: AuthUser) {
    return this.authService.createBankAuthorizeUrl(user.id);
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
