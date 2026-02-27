import { TestBed } from '@angular/core/testing';
import { BudgetStore } from './budget.store';

describe('BudgetStore', () => {
  let store: InstanceType<typeof BudgetStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(BudgetStore);
  });

  it('should register edit requests and open existing item (happy path)', () => {
    expect(store.editRequests()).toBe(0);
    expect(store.lastOpenedItemId()).toBeNull();
    expect(store.isNewBudgetModalOpen()).toBeFalse();

    store.requestEditBudgets();
    store.openBudgetItem('home');

    expect(store.editRequests()).toBe(1);
    expect(store.isNewBudgetModalOpen()).toBeTrue();
    expect(store.lastOpenedItemId()).toBe('home');
  });

  it('should clamp category progress between 0 and 100 (edge case)', () => {
    store.setBudgetProgress('home', 125);
    expect(store.categories().find((item) => item.id === 'home')?.progressPercent).toBe(100);

    store.setBudgetProgress('home', -12);
    expect(store.categories().find((item) => item.id === 'home')?.progressPercent).toBe(0);
  });

  it('should ignore invalid item ids and invalid numbers (error case)', () => {
    const beforeId = store.lastOpenedItemId();
    const beforeProgress = store.categories().find((item) => item.id === 'home')?.progressPercent;

    store.openBudgetItem('missing');
    store.setBudgetProgress('home', Number.NaN);
    store.setBudgetProgress('missing', 44);

    expect(store.lastOpenedItemId()).toBe(beforeId);
    expect(store.categories().find((item) => item.id === 'home')?.progressPercent).toBe(beforeProgress);
  });

  it('should create a new budget category and close modal', () => {
    const beforeCount = store.categories().length;

    store.requestEditBudgets();
    store.setNewBudgetNameInput('Dining Out');
    store.setNewBudgetAmountInput('450');

    expect(store.canCreateNewBudget()).toBeTrue();

    store.addNewBudgetCategory();

    expect(store.categories().length).toBe(beforeCount + 1);
    expect(store.categories()[0].name).toBe('Dining Out');
    expect(store.categories()[0].limitLabel).toBe('$450');
    expect(store.categories()[0].leftLabel).toBe('$450 left');
    expect(store.isNewBudgetModalOpen()).toBeFalse();
  });

  it('should adjust budget limit and recalculate status fields (happy path)', () => {
    store.adjustBudgetLimit('entertainment', 260);

    const item = store.categories().find((category) => category.id === 'entertainment');

    expect(item?.limitLabel).toBe('$260');
    expect(item?.leftLabel).toBe('$115 left');
    expect(item?.status).toBe('on-track');
    expect(item?.noteLabel).toBe('Safe pace');
  });

  it('should mark adjusted budget as over when spent exceeds new limit (edge case)', () => {
    store.adjustBudgetLimit('entertainment', 120);

    const item = store.categories().find((category) => category.id === 'entertainment');

    expect(item?.status).toBe('over');
    expect(item?.leftLabel).toBe('$0 left');
    expect(item?.noteLabel).toBe('Exceeded');
  });

  it('should ignore adjust when amount is invalid (error case)', () => {
    const before = store.categories().find((category) => category.id === 'entertainment');

    store.adjustBudgetLimit('entertainment', Number.NaN);
    store.adjustBudgetLimit('entertainment', 0);
    store.adjustBudgetLimit('unknown', 350);

    const after = store.categories().find((category) => category.id === 'entertainment');

    expect(after?.limitLabel).toBe(before?.limitLabel);
    expect(after?.leftLabel).toBe(before?.leftLabel);
    expect(after?.status).toBe(before?.status);
  });
});
