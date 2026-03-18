import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RulesPage } from './rules.page';
import { RulesStore } from './store/rules.store';

describe('RulesPage', () => {
  let component: RulesPage;
  let fixture: ComponentFixture<RulesPage>;
  let store: InstanceType<typeof RulesStore>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RulesPage);
    component = fixture.componentInstance;
    store = TestBed.inject(RulesStore);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open the modal with threshold alert preset when quick create is selected (happy path)', () => {
    component.onQuickCreateSelected('threshold-alert');

    expect(store.isAddRuleModalOpen()).toBeTrue();
    expect(store.addDraft().ruleType).toBe('Threshold alert');
    expect(store.addDraft().conditionValue).toBe('75%');
    expect(store.addDraft().actionValue).toBe('Groceries');
  });

  it('should preserve the current rule name when switching modal type (edge case)', () => {
    store.setAddRuleName('My custom rule');

    component.onRuleTypeChanged('Anomaly detection');

    expect(store.addDraft().ruleName).toBe('My custom rule');
    expect(store.addDraft().ruleType).toBe('Anomaly detection');
    expect(store.addDraft().conditionValue).toBe('Spending exceeds 150% of average');
  });
});
