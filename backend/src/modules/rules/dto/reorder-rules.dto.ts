import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderRuleItemDto {
  @IsUUID('4')
  id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  priority!: number;
}

export class ReorderRulesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderRuleItemDto)
  items!: ReorderRuleItemDto[];
}
