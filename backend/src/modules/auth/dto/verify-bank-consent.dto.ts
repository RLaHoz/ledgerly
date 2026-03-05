import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class VerifyBankConsentDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  jobIds!: string[];
}
