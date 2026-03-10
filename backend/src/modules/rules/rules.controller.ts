import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { CreateRuleDto } from './dto/create-rule.dto';
import { ListRulesQueryDto } from './dto/list-rules-query.dto';
import { PreviewRuleDto } from './dto/preview-rule.dto';
import { ReorderRulesDto } from './dto/reorder-rules.dto';
import { TestRuleDto } from './dto/test-rule.dto';
import { ToggleRuleDto } from './dto/toggle-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RulePreviewService } from './services/rule-preview.service';
import { RulesService } from './services/rules.service';

@Controller('rules')
export class RulesController {
  constructor(
    private readonly rulesService: RulesService,
    private readonly rulePreviewService: RulePreviewService,
  ) {}

  @Post()
  createRule(@CurrentUserId() userId: string, @Body() dto: CreateRuleDto) {
    return this.rulesService.createRule(userId, dto);
  }

  @Get()
  listRules(@CurrentUserId() userId: string, @Query() query: ListRulesQueryDto) {
    return this.rulesService.listRules(userId, query);
  }

  @Get('templates/defaults')
  listDefaultTemplates() {
    return this.rulesService.listDefaultTemplates();
  }

  @Post('reorder')
  reorderRules(@CurrentUserId() userId: string, @Body() dto: ReorderRulesDto) {
    return this.rulesService.reorderRules(userId, dto);
  }

  @Post('preview')
  previewRule(@CurrentUserId() userId: string, @Body() dto: PreviewRuleDto) {
    return this.rulePreviewService.previewRule(userId, dto);
  }

  @Post('test')
  testRule(@Body() dto: TestRuleDto) {
    return this.rulePreviewService.testRule(dto);
  }

  @Get(':ruleId')
  getRuleById(
    @CurrentUserId() userId: string,
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
  ) {
    return this.rulesService.getRuleById(userId, ruleId);
  }

  @Patch(':ruleId')
  updateRule(
    @CurrentUserId() userId: string,
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.rulesService.updateRule(userId, ruleId, dto);
  }

  @Post(':ruleId/toggle')
  toggleRule(
    @CurrentUserId() userId: string,
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Body() dto: ToggleRuleDto,
  ) {
    return this.rulesService.toggleRule(userId, ruleId, dto);
  }

  @Delete(':ruleId')
  deleteRule(
    @CurrentUserId() userId: string,
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
  ) {
    return this.rulesService.softDeleteRule(userId, ruleId);
  }
}
