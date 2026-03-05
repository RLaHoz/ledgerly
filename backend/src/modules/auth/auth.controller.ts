import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './interfaces/auth-user.interface';
import { AuthService } from './services/auth.service';
import { Public } from './decorators/public.decorator';
import type { Response } from 'express';
import { VerifyBankConsentDto } from './dto/verify-bank-consent.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): {
    authenticated: true;
    user: AuthUser;
  } {
    return {
      authenticated: true,
      user,
    };
  }

  @Public()
  @Get('bankLoginUrl')
  bankLoginUrl() {
    return this.authService.createBankAuthorizeUrl();
  }

  @Public()
  @Post('bank-consent/verify')
  verifyBankConsent(@Body() dto: VerifyBankConsentDto) {
    return this.authService.verifyBankConsent(dto.jobIds);
  }

  @Public()
  @Get('mock/authorize')
  mockAuthorize(
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string | undefined,
    @Res() response: Response,
  ) {
    const callbackUrl = this.authService.createMockAuthorizeRedirect(
      redirectUri,
      state,
    );
    return response.redirect(callbackUrl);
  }
}
