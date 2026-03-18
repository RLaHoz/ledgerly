import { IsOptional, IsString, MinLength } from 'class-validator';

export class CompleteGoogleAuthDto {
  @IsString()
  @MinLength(10)
  state!: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  code?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  errorDescription?: string;
}
