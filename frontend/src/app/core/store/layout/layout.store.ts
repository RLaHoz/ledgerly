import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';

export type TabKey = 'dashboard' | 'activity' | 'import' | 'rules' | 'settings';

export interface LayoutUiState {
  // Header
  title: string;
  periodLabel: string;      // e.g. 'FEBRUARY 2026'
  avatarText: string;       // e.g. 'AK'
  hasNotifications: boolean;
  activeTab: TabKey;
}

const initialState: LayoutUiState = {
  title: 'Dashboard',
  periodLabel: 'FEBRUARY 2026',
  avatarText: 'AK',
  hasNotifications: true,
  activeTab: 'dashboard',
};

export const LayoutUiStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((s) => ({
    headerVm: computed(() => ({
      title: s.title(),
      periodLabel: s.periodLabel(),
      avatarText: s.avatarText(),
      hasNotifications: s.hasNotifications(),
    })),
  })),

  withMethods((s) => ({
    // Header
    setTitle(title: string) {
      patchState(s, { title });
    },
    setPeriodLabel(periodLabel: string) {
      patchState(s, { periodLabel });
    },
    setAvatarText(avatarText: string) {
      patchState(s, { avatarText });
    },
    setHasNotifications(hasNotifications: boolean) {
      patchState(s, { hasNotifications });
    },
    setHeader(payload: Partial<Pick<LayoutUiState, 'title' | 'periodLabel' | 'avatarText' | 'hasNotifications'>>) {
      patchState(s, payload);
    },

    // Tabs
    setActiveTab(activeTab: TabKey) {
      patchState(s, { activeTab });
    },
  }))
);
