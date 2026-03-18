import { TestBed } from '@angular/core/testing';
import { RulesStore } from './rules.store';

describe('RulesStore', () => {
  let store: InstanceType<typeof RulesStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(RulesStore);
  });

  it('should create a new rule and close modal when form is valid (happy path)', () => {
    store.openAddRuleModal();
    store.setAddRuleName('Auto-categorize Starbucks');
    store.setConditionValue('Starbucks');
    store.setActionValue('Category');

    expect(store.canCreateRule()).toBeTrue();

    store.createRule();

    expect(store.isAddRuleModalOpen()).toBeFalse();
    expect(store.activeRules()[0]?.title).toBe('Auto-categorize Starbucks');
    expect(store.addDraft().ruleName).toBe('');
  });

  it('should keep create disabled with missing required fields (edge case)', () => {
    store.openAddRuleModal();
    store.setAddRuleName('');
    store.setConditionValue('');
    store.setActionValue('');

    expect(store.canCreateRule()).toBeFalse();
  });

  it('should not create or close modal when form is invalid (error path)', () => {
    const initialCount = store.activeRules().length;

    store.openAddRuleModal();
    store.setAddRuleName('Only title');

    expect(store.canCreateRule()).toBeFalse();

    store.createRule();

    expect(store.isAddRuleModalOpen()).toBeTrue();
    expect(store.activeRules().length).toBe(initialCount);
  });

  it('should toggle an active rule state', () => {
    const targetId = store.activeRules()[0]?.id;

    expect(targetId).toBeTruthy();

    store.toggleActiveRule(targetId!, false);
    expect(store.activeRules().find((item) => item.id === targetId)?.enabled).toBeFalse();

    store.toggleActiveRule(targetId!, true);
    expect(store.activeRules().find((item) => item.id === targetId)?.enabled).toBeTrue();
  });
});
