import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RuleActionDto, RuleConditionDto } from './rule-parts.dto';

export class CreateRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(['AUTO_CLASSIFICATION'] as const)
  type?: 'AUTO_CLASSIFICATION';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(100000)
  priority?: number;

  @ValidateNested()
  @Type(() => RuleConditionDto)
  condition!: RuleConditionDto;

  @ValidateNested()
  @Type(() => RuleActionDto)
  action!: RuleActionDto;
}
