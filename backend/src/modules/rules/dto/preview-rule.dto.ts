import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RuleActionDto, RuleConditionDto } from './rule-parts.dto';

export class PreviewRuleDto {
  @ValidateNested()
  @Type(() => RuleConditionDto)
  condition!: RuleConditionDto;

  @ValidateNested()
  @Type(() => RuleActionDto)
  action!: RuleActionDto;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
