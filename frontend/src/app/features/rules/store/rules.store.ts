import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { RulesActiveItem, RulesAddDraft } from '../models/rules.models';
import { initialRulesState } from './rules.state';

const defaultDraft: RulesAddDraft = {
  ruleName: '',
  ruleType: 'Auto-classification',
  conditionField: 'merchant contains',
  conditionValue: '',
  actionType: 'set category to',
  actionValue: 'Category',
};

export const RulesStore = signalStore(
  { providedIn: 'root' },
  withState(initialRulesState),
  withComputed((store) => ({
    triggeredCount: computed(() => store.triggeredAlerts().length),
    canCreateRule: computed(() => {
      const draft = store.addDraft();

      return Boolean(draft.ruleName.trim() && draft.conditionValue.trim() && draft.actionValue.trim());
    }),
  })),
  withMethods((store) => ({
    openAddRuleModal(): void {
      patchState(store, { isAddRuleModalOpen: true });
    },

    closeAddRuleModal(): void {
      patchState(store, {
        isAddRuleModalOpen: false,
        addDraft: { ...defaultDraft },
      });
    },

    setAddRuleName(value: string): void {
      patchState(store, {
        addDraft: {
          ...store.addDraft(),
          ruleName: value,
        },
      });
    },

    setAddRuleType(value: string): void {
      patchState(store, {
        addDraft: {
          ...store.addDraft(),
          ruleType: value,
        },
      });
    },

    setConditionField(value: string): void {
      patchState(store, {
        addDraft: {
          ...store.addDraft(),
          conditionField: value,
        },
      });
    },

    setConditionValue(value: string): void {
      patchState(store, {
        addDraft: {
          ...store.addDraft(),
          conditionValue: value,
        },
      });
    },

    setActionType(value: string): void {
      patchState(store, {
        addDraft: {
          ...store.addDraft(),
          actionType: value,
        },
      });
    },

    setActionValue(value: string): void {
      patchState(store, {
        addDraft: {
          ...store.addDraft(),
          actionValue: value,
        },
      });
    },

    toggleActiveRule(ruleId: string, enabled: boolean): void {
      patchState(store, {
        activeRules: store.activeRules().map((rule) => (rule.id === ruleId ? { ...rule, enabled } : rule)),
      });
    },

    createRule(): void {
      if (!store.canCreateRule()) {
        return;
      }

      const draft = store.addDraft();
      const normalizedName = draft.ruleName.trim();
      const isAnomaly = draft.ruleType === 'Anomaly detection' || draft.actionType === 'flag as anomaly';
      const isAlert = draft.ruleType === 'Threshold alert' || draft.actionType === 'send notification';
      const newRule: RulesActiveItem = {
        id: buildRuleId(normalizedName, store.activeRules().length),
        icon: isAnomaly ? 'warning' : isAlert ? 'bell' : 'tag',
        title: normalizedName,
        tone: isAnomaly ? 'anomaly' : isAlert ? 'alert' : 'auto',
        statusLabel: isAnomaly ? 'ANOMALY' : isAlert ? 'ALERT' : 'AUTO',
        condition: `Condition: ${draft.conditionField} "${draft.conditionValue.trim()}"`,
        activity: isAlert ? 'Triggered 0 times this month' : 'Applied to 0 transactions this month',
        enabled: true,
      };

      patchState(store, {
        isAddRuleModalOpen: false,
        addDraft: { ...defaultDraft },
        activeRules: [newRule, ...store.activeRules()],
      });
    },
  })),
);

function buildRuleId(value: string, index: number): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return `rule-${slug || 'custom'}-${index + 1}`;
}
