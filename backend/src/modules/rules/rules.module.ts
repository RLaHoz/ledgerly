import { Module } from '@nestjs/common';
import { RulesController } from './rules.controller';
import { RuleEvaluatorService } from './services/rule-evaluator.service';
import { RulePreviewService } from './services/rule-preview.service';
import { RuleProvisioningService } from './services/rule-provisioning.service';
import { RulesService } from './services/rules.service';

@Module({
  controllers: [RulesController],
  providers: [
    RulesService,
    RuleEvaluatorService,
    RulePreviewService,
    RuleProvisioningService,
  ],
  exports: [RulesService, RuleEvaluatorService, RuleProvisioningService],
})
export class RulesModule {}
