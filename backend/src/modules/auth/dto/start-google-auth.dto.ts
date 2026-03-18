import { IsIn, IsOptional } from 'class-validator';
import { AUTH_CLIENT_SOURCES } from './start-bank-consent.dto';
import type { AuthClientSource } from './start-bank-consent.dto';

export class StartGoogleAuthDto {
  @IsOptional()
  @IsIn(AUTH_CLIENT_SOURCES)
  client?: AuthClientSource;
}
