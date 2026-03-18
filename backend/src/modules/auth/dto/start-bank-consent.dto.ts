import { IsIn, IsOptional } from 'class-validator';

export const AUTH_CLIENT_SOURCES = ['web', 'native'] as const;
export type AuthClientSource = (typeof AUTH_CLIENT_SOURCES)[number];

export class StartBankConsentDto {
  @IsOptional()
  @IsIn(AUTH_CLIENT_SOURCES)
  client?: AuthClientSource;
}
