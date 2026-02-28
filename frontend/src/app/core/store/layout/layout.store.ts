import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';

export type TabKey = 'dashboard' | 'budgets' | 'rules' | 'settings';

export interface LayoutUiState {
  title: string;
  syncLabel: string;
  hasNotifications: boolean;
  activeTab: TabKey;
}

const initialState: LayoutUiState = {
  title: 'Home',
  syncLabel: 'Synced 2m ago',
  hasNotifications: false,
  activeTab: 'dashboard',
};

export const LayoutUiStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    headerVm: computed(() => ({
      title: state.title(),
      syncLabel: state.syncLabel(),
      hasNotifications: state.hasNotifications(),
    })),
  })),
  withMethods((state) => ({
    setTitle(title: string): void {
      patchState(state, { title });
    },
    setSyncLabel(syncLabel: string): void {
      patchState(state, { syncLabel });
    },
    setHasNotifications(hasNotifications: boolean): void {
      patchState(state, { hasNotifications });
    },
    setActiveTab(activeTab: TabKey): void {
      patchState(state, { activeTab });
    },
  })),
);
