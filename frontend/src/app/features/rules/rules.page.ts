import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonModal } from '@ionic/angular/standalone';
import { RulesActiveComponent, RulesListItem } from './components/rules-active/rules-active.component';
import { RulesAddItemComponent } from './components/rules-add-item/rules-add-item.component';
import { RulesHealthSummaryComponent, RulesHealthSummaryStat } from './components/rules-health-summary/rules-health-summary.component';
import { RulesQuickTemplateComponent } from './components/rules-quick-template/rules-quick-template.component';
import { RulesTriggeredAlertsComponent } from './components/rules-triggered-alerts/rules-triggered-alerts.component';
import { RulesStore } from './store/rules.store';

type RulePresetKey = 'Auto-classification' | 'Threshold alert' | 'Anomaly detection';

@Component({
  selector: 'app-rules',
  standalone: true,
  templateUrl: './rules.page.html',
  styleUrls: ['./rules.page.scss'],
  imports: [
    IonContent,
    IonModal,
    RulesHealthSummaryComponent,
    RulesQuickTemplateComponent,
    RulesActiveComponent,
    RulesTriggeredAlertsComponent,
    RulesAddItemComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesPage {
  readonly store = inject(RulesStore);

  readonly showTypeSelector = signal(false);
  readonly summaryTitle = 'Automation Active';
  readonly summarySubtitle = computed(() => `${this.store.activeRules().filter((rule) => rule.enabled).length} of ${this.store.activeRules().length} rules running`);
  readonly summaryStats = computed<readonly RulesHealthSummaryStat[]>(() => [
    {
      id: 'auto-tagged',
      label: 'AUTO-TAGGED',
      value: '42',
      subtext: 'transactions this month',
    },
    {
      id: 'alerts-sent',
      label: 'ALERTS SENT',
      value: '7',
      subtext: '~$340 saved',
      tone: 'success',
    },
  ]);

  readonly rulesListItems = computed<readonly RulesListItem[]>(() =>
    this.store.activeRules().map((item) => ({
      id: item.id,
      icon: item.icon,
      title: item.title,
      activity: item.enabled ? item.activity : item.stateLabel ?? 'Paused',
      enabled: item.enabled,
    })),
  );

  onQuickCreateSelected(templateId: string): void {
    const preset: RulePresetKey =
      templateId === 'threshold-alert'
        ? 'Threshold alert'
        : templateId === 'anomaly-detection'
          ? 'Anomaly detection'
          : 'Auto-classification';

    this.showTypeSelector.set(false);
    this.applyRulePreset(preset);
    this.store.openAddRuleModal();
  }

  onOpenAddRule(): void {
    this.showTypeSelector.set(true);
    this.applyRulePreset(this.store.addDraft().ruleType as RulePresetKey);
    this.store.openAddRuleModal();
  }

  onCloseAddRule(): void {
    this.showTypeSelector.set(false);
    this.store.closeAddRuleModal();
  }

  onRuleToggle(event: { id: string; enabled: boolean }): void {
    this.store.toggleActiveRule(event.id, event.enabled);
  }

  onRuleNameChanged(value: string): void {
    this.store.setAddRuleName(value);
  }

  onRuleTypeChanged(value: string): void {
    this.applyRulePreset(value as RulePresetKey, { preserveName: true });
  }

  onConditionFieldChanged(value: string): void {
    this.store.setConditionField(value);
  }

  onConditionValueChanged(value: string): void {
    this.store.setConditionValue(value);
  }

  onActionTypeChanged(value: string): void {
    this.store.setActionType(value);
  }

  onActionValueChanged(value: string): void {
    this.store.setActionValue(value);
  }

  onCreateRule(): void {
    this.store.createRule();
  }

  private applyRulePreset(type: RulePresetKey, options?: { preserveName?: boolean }): void {
    const preserveName = options?.preserveName ?? false;
    const currentName = this.store.addDraft().ruleName;

    this.store.setAddRuleType(type);

    if (!preserveName) {
      this.store.setAddRuleName('');
    } else {
      this.store.setAddRuleName(currentName);
    }

    if (type === 'Threshold alert') {
      this.store.setConditionField('category reaches');
      this.store.setConditionValue('75%');
      this.store.setActionType('send notification');
      this.store.setActionValue('Groceries');
      return;
    }

    if (type === 'Anomaly detection') {
      this.store.setConditionField('spending exceeds');
      this.store.setConditionValue('Spending exceeds 150% of average');
      this.store.setActionType('flag as anomaly');
      this.store.setActionValue('Anomaly');
      return;
    }

    this.store.setConditionField('merchant contains');
    this.store.setConditionValue('');
    this.store.setActionType('set category to');
    this.store.setActionValue('Baby');
  }
}
