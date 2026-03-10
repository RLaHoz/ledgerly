import { ArrayNotEmpty, IsArray, IsString, MinLength } from 'class-validator';

export class VerifyBankConsentDto {
  @IsString()
  @MinLength(10)
  state!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  jobIds!: string[];
}
