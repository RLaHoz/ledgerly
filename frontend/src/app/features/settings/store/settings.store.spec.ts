import { TestBed } from '@angular/core/testing';
import { SettingsStore } from './settings.store';
import { SettingsTabKey } from '../models/settings.models';

const STORAGE_KEY = 'ledgerly.settings.v1';

describe('SettingsStore', () => {
  let store: InstanceType<typeof SettingsStore>;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({});
    store = TestBed.inject(SettingsStore);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('should expose account tab and profile defaults', () => {
    expect(store.activeTab()).toBe('account');
    expect(store.profileFullName()).toBe('Jordan Davis');
    expect(store.appSettingsRows().length).toBe(5);
  });

  it('should update currency code', () => {
    store.setCurrencyCode('EUR');

    expect(store.appPreferences().currencyCode).toBe('EUR');
  });

  it('should ignore invalid tab selections', () => {
    const previousTab = store.activeTab();

    store.selectTab('unknown-tab' as SettingsTabKey);

    expect(store.activeTab()).toBe(previousTab);
  });

  it('should fallback to defaults when persisted payload is invalid', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid-json');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fallbackStore = TestBed.inject(SettingsStore);

    expect(fallbackStore.activeTab()).toBe('account');
    expect(fallbackStore.security().biometricEnabled).toBeTrue();
  });
});
