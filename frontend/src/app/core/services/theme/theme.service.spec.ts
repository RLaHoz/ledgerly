import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('Service: Theme', () => {
  const createMatchMedia = (matches: boolean): MediaQueryList =>
    ({
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    }) as MediaQueryList;

  afterEach(() => {
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.style.removeProperty('color-scheme');
  });

  it('reads stored mode and applies dark theme class', () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue('dark');

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    const service = TestBed.inject(ThemeService);
    expect(service.readStoredMode()).toBe('dark');

    service.applyThemeClass('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBeTrue();
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('returns null for invalid stored mode and resolves system mode', () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue('sepia');
    const setItemSpy = spyOn(Storage.prototype, 'setItem').and.stub();
    spyOn(window, 'matchMedia').and.returnValue(createMatchMedia(true));

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    const service = TestBed.inject(ThemeService);

    expect(service.readStoredMode()).toBeNull();
    expect(service.resolveSystemMode()).toBe('dark');

    service.persistMode('light');
    expect(setItemSpy).toHaveBeenCalledWith('ledgerly:theme-mode', 'light');
  });

  it('handles storage read/write errors gracefully', () => {
    spyOn(Storage.prototype, 'getItem').and.callFake(() => {
      throw new Error('storage unavailable');
    });
    spyOn(Storage.prototype, 'setItem').and.callFake(() => {
      throw new Error('storage unavailable');
    });
    spyOn(window, 'matchMedia').and.returnValue(createMatchMedia(false));

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    const service = TestBed.inject(ThemeService);

    expect(service.readStoredMode()).toBeNull();
    expect(() => service.persistMode('dark')).not.toThrow();
    expect(service.resolveSystemMode()).toBe('light');
  });
});
