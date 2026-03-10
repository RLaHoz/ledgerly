import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RuleActionDto, RuleConditionDto } from './rule-parts.dto';

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(100000)
  priority?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConditionDto)
  condition?: RuleConditionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RuleActionDto)
  action?: RuleActionDto;
}
