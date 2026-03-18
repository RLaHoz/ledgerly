import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import {
  RuleActionDto,
  RuleConditionDto,
  RuleTransactionCandidateDto,
} from './rule-parts.dto';

export class TestRuleDto {
  @ValidateNested()
  @Type(() => RuleConditionDto)
  condition!: RuleConditionDto;

  @ValidateNested()
  @Type(() => RuleActionDto)
  action!: RuleActionDto;

  @ValidateNested()
  @Type(() => RuleTransactionCandidateDto)
  transaction!: RuleTransactionCandidateDto;
}
