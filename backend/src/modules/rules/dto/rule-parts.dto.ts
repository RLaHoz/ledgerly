import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const RULE_MATCH_MODES = [
  'KEYWORD_ONLY',
  'REGEX_ONLY',
  'KEYWORD_REGEX_HYBRID',
] as const;

const RULE_DIRECTIONS = ['debit', 'credit'] as const;

function normalizeKeywordArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item).trim().toLowerCase()))]
    .filter((item) => item.length > 0)
    .slice(0, 40);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item).trim().toLowerCase()))]
    .filter((item) => item.length > 0)
    .slice(0, 20);
}

export class RuleConditionDto {
  @IsString()
  @MaxLength(64)
  kind!: 'merchant_text_match';

  @IsEnum(RULE_MATCH_MODES)
  matchMode!: (typeof RULE_MATCH_MODES)[number];

  @IsEnum(RULE_DIRECTIONS)
  direction!: (typeof RULE_DIRECTIONS)[number];

  @Transform(({ value }) => normalizeKeywordArray(value))
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  keywords!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(256)
  regex?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(10)
  minKeywordHits?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  amountMin?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  amountMax?: number;

  @Transform(({ value }) => normalizeStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  excludeMerchants?: string[];

  @IsOptional()
  @IsBoolean()
  recurringOnly?: boolean;
}

export class RuleActionDto {
  @IsString()
  @MaxLength(32)
  action!: 'set_category';

  @IsUUID('4')
  categoryId!: string;

  @IsOptional()
  @IsUUID('4')
  subcategoryId?: string;

  @IsOptional()
  @IsEnum(['user-rule-v1', 'system-rules-v2'] as const)
  classifier?: 'user-rule-v1' | 'system-rules-v2';
}

export class RuleTransactionCandidateDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  amountSigned!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  merchant?: string;

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsBoolean()
  isPending?: boolean;

  @IsOptional()
  @IsBoolean()
  isTransfer?: boolean;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}

export class RuleDateRangeDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  to?: string;

  @ValidateIf((value) => value.limit !== undefined)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(100)
  limit?: number;
}
