import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAnonymousSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string;
}
