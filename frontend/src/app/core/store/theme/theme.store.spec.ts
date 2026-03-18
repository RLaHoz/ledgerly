import { TestBed } from '@angular/core/testing';
import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
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

  it('loads mode from localStorage and persists when toggling', () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue('dark');
    const setItemSpy = spyOn(Storage.prototype, 'setItem').and.stub();
    spyOn(window, 'matchMedia').and.returnValue(createMatchMedia(false));

    TestBed.configureTestingModule({});
    const store = TestBed.inject(ThemeStore);

    expect(store.mode()).toBe('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBeTrue();
    expect(setItemSpy).toHaveBeenCalledWith('ledgerly:theme-mode', 'dark');

    store.toggleMode();

    expect(store.mode()).toBe('light');
    expect(document.documentElement.classList.contains('theme-light')).toBeTrue();
    expect(setItemSpy).toHaveBeenCalledWith('ledgerly:theme-mode', 'light');
  });

  it('falls back to system preference when stored value is invalid', () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue('sepia');
    spyOn(Storage.prototype, 'setItem').and.stub();
    spyOn(window, 'matchMedia').and.returnValue(createMatchMedia(true));

    TestBed.configureTestingModule({});
    const store = TestBed.inject(ThemeStore);

    expect(store.mode()).toBe('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBeTrue();
  });

  it('handles localStorage errors and still initializes from system preference', () => {
    spyOn(Storage.prototype, 'getItem').and.callFake(() => {
      throw new Error('storage unavailable');
    });
    spyOn(Storage.prototype, 'setItem').and.stub();
    spyOn(window, 'matchMedia').and.returnValue(createMatchMedia(false));

    TestBed.configureTestingModule({});

    expect(() => TestBed.inject(ThemeStore)).not.toThrow();
    expect(document.documentElement.classList.contains('theme-light')).toBeTrue();
  });
});
