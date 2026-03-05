import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';

const STORAGE_KEY = 'ledgerly.settings.v1';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('should return defaults when storage is empty', () => {
    const snapshot = service.read();

    expect(snapshot.activeTab).toBe('account');
    expect(snapshot.profile.firstName).toBe('Jordan');
  });

  it('should keep defaults for unsupported persisted values', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeTab: 'preferences',
        appPreferences: { compactMode: true, currencyCode: 'AUD', defaultSplitLabel: 'Unknown' },
      }),
    );

    const snapshot = service.read();

    expect(snapshot.activeTab).toBe('preferences');
    expect(snapshot.appPreferences.compactMode).toBeTrue();
    expect(snapshot.appPreferences.currencyCode).toBe('AUD');
    expect(snapshot.appPreferences.defaultSplitLabel).toBe('Shared');
  });

  it('should return defaults when storage JSON is invalid', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid-json');

    const snapshot = service.read();

    expect(snapshot.activeTab).toBe('account');
    expect(snapshot.security.biometricEnabled).toBeTrue();
  });
});
