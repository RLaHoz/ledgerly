export type RuleStatusTone = 'auto' | 'alert' | 'anomaly';

export type RuleIconKind = 'tag' | 'bell' | 'warning';

export type TriggeredAlertSeverity = 'warning' | 'critical';

export interface RulesQuickTemplateItem {
  id: string;
  title: string;
  subtitle: string;
}

export interface RulesActiveItem {
  id: string;
  icon: RuleIconKind;
  title: string;
  tone: RuleStatusTone;
  statusLabel: string;
  condition: string;
  activity: string;
  enabled: boolean;
  stateLabel?: string;
}

export interface RulesTriggeredAlertItem {
  id: string;
  title: string;
  severity: TriggeredAlertSeverity;
  severityLabel: string;
  ageLabel: string;
}

export interface RulesAddDraft {
  ruleName: string;
  ruleType: string;
  conditionField: string;
  conditionValue: string;
  actionType: string;
  actionValue: string;
}

export interface RulesState {
  description: string;
  quickTemplatesTitle: string;
  quickTemplates: readonly RulesQuickTemplateItem[];
  activeTitle: string;
  activeSummary: string;
  addLabel: string;
  activeRules: readonly RulesActiveItem[];
  triggeredTitle: string;
  triggeredSummary: string;
  triggeredAlerts: readonly RulesTriggeredAlertItem[];
  isAddRuleModalOpen: boolean;
  addDraft: RulesAddDraft;
  ruleTypeOptions: readonly string[];
  conditionFieldOptions: readonly string[];
  actionTypeOptions: readonly string[];
  actionValueOptions: readonly string[];
}
