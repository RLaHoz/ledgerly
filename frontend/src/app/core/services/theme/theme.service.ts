import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { ThemeMode } from '../../store/theme/theme.state';
import { isThemeMode } from '../../store/theme/theme.updaters';

const THEME_STORAGE_KEY = 'ledgerly:theme-mode';
const DARK_THEME_CLASS = 'theme-dark';
const LIGHT_THEME_CLASS = 'theme-light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  constructor() {}

  readStoredMode(): ThemeMode | null {
    try {
      const storedMode = localStorage.getItem(THEME_STORAGE_KEY);
      return isThemeMode(storedMode) ? storedMode : null;
    } catch {
      return null;
    }
  }

  resolveSystemMode(): ThemeMode {
    try {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  persistMode(mode: ThemeMode): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage write errors (private mode / blocked storage).
    }
  }

  applyThemeClass(mode: ThemeMode): void {
    const root = this.document.documentElement;
    root.classList.remove(LIGHT_THEME_CLASS, DARK_THEME_CLASS);
    root.classList.add(mode === 'dark' ? DARK_THEME_CLASS : LIGHT_THEME_CLASS);
    root.style.colorScheme = mode;
  }
}
