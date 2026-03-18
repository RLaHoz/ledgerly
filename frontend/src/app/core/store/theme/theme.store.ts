import { computed, inject, Injector } from '@angular/core';
import {
  patchState,
  signalStore,
  watchState,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { ThemeService } from '../../services/theme/theme.service';
import { initialThemeState, ThemeMode } from './theme.state';

export const ThemeStore = signalStore(
  { providedIn: 'root' },
  withState(initialThemeState),
  withComputed((store) => ({
    isDarkMode: computed(() => store.mode() === 'dark'),
    themeClass: computed<'theme-dark' | 'theme-light'>(() =>
      store.mode() === 'dark' ? 'theme-dark' : 'theme-light',
    ),
    themeIcon: computed<'sunny-outline' | 'moon-outline'>(() =>
      store.mode() === 'dark' ? 'sunny-outline' : 'moon-outline',
    ),
  })),
  withMethods((store) => ({
    setMode(mode: ThemeMode): void {
      patchState(store, { mode });
    },
    toggleMode(): void {
      patchState(store, { mode: store.mode() === 'dark' ? 'light' : 'dark' });
    },
  })),
  withHooks((store) => {
    const themeService = inject(ThemeService);
    const injector = inject(Injector);

    return {
      onInit(): void {
        // 1) Try stored user preference first.
        // 2) If missing/invalid, fallback to system preference via matchMedia.
        const storedMode = themeService.readStoredMode();
        const initialMode = storedMode ?? themeService.resolveSystemMode();
        patchState(store, { mode: initialMode });

        // watchState observes the store state and runs side effects whenever it changes.
        // We use it here (instead of effect) because this is NgRx SignalStore state orchestration:
        // - subscribe to store updates in one place
        // - auto-cleanup with Injector lifecycle
        // - deterministic behavior in store tests
        // Passing { injector } binds this watcher to Angular DI lifecycle.
        // Without it, cleanup can be fragile outside an active injection context.
        watchState(
          store,
          ({ mode }) => {
            themeService.applyThemeClass(mode);
            themeService.persistMode(mode);
          },
          { injector },
        );
      },
    };
  }),
);
