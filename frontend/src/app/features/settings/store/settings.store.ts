import { Injector, computed, inject } from '@angular/core';
import { patchState, signalStore, watchState, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  AppPreferencesSettings,
  NotificationSettings,
  ProfileSettings,
  SecuritySettings,
  SettingsListRow,
  SettingsSnapshot,
  SettingsTabKey,
} from '../models/settings.models';
import { SettingsService } from '../services/settings.service';
import { SETTINGS_TABS, initialSettingsState } from './settings.state';

export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialSettingsState),
  withComputed((store) => ({
    tabs: computed(() => SETTINGS_TABS),
    profileFullName: computed(() => `${store.profile().firstName} ${store.profile().lastName}`.trim()),
    profileInitials: computed(() => toInitials(store.profile().firstName, store.profile().lastName)),
    appSettingsRows: computed<SettingsListRow[]>(() => {
      const appPreferences = store.appPreferences();

      return [
        {
          id: 'currency',
          type: 'select',
          label: 'Currency',
          description: 'Display currency',
          value: appPreferences.currencyCode,
          options: [
            { label: 'AUD (A$)', value: 'AUD' },
            { label: 'USD ($)', value: 'USD' },
            { label: 'EUR (€)', value: 'EUR' },
          ],
        },
        {
          id: 'monthlyBudget',
          type: 'value',
          label: 'Monthly Budget',
          description: 'Spending target',
          value: formatCurrency(appPreferences.monthlyBudget, appPreferences.currencyCode),
        },
        {
          id: 'budgetStart',
          type: 'value',
          label: 'Budget Start',
          description: 'Reset day',
          value: appPreferences.budgetStartLabel,
        },
        {
          id: 'defaultSplit',
          type: 'value',
          label: 'Default Split',
          description: 'New transactions',
          value: appPreferences.defaultSplitLabel,
        },
        {
          id: 'compactMode',
          type: 'toggle',
          label: 'Compact Mode',
          description: 'Denser layout on all screens',
          checked: appPreferences.compactMode,
        },
      ];
    }),
    securityRows: computed<SettingsListRow[]>(() => {
      const security = store.security();

      return [
        {
          id: 'password',
          type: 'action',
          label: 'Password',
          description: security.passwordChangedLabel,
          actionLabel: 'Change',
          tone: 'accent',
        },
        {
          id: 'twoFactorEnabled',
          type: 'toggle',
          label: 'Two-Factor Auth',
          description: 'Extra security layer',
          checked: security.twoFactorEnabled,
        },
        {
          id: 'biometricEnabled',
          type: 'toggle',
          label: 'Biometric Login',
          description: 'Face ID / fingerprint',
          checked: security.biometricEnabled,
        },
        {
          id: 'sessionTimeout',
          type: 'value',
          label: 'Session Timeout',
          description: 'Auto-lock after inactivity',
          value: security.sessionTimeoutLabel,
        },
      ];
    }),
    notificationRows: computed<SettingsListRow[]>(() => {
      const notifications = store.notifications();

      return [
        {
          id: 'budgetAlerts',
          type: 'toggle',
          label: 'Budget Alerts',
          description: 'At 75% and 100%',
          checked: notifications.budgetAlerts,
        },
        {
          id: 'dailySummary',
          type: 'toggle',
          label: 'Daily Summary',
          description: 'Daily spending digest',
          checked: notifications.dailySummary,
        },
        {
          id: 'weeklyReport',
          type: 'toggle',
          label: 'Weekly Report',
          description: 'Weekly spending patterns',
          checked: notifications.weeklyReport,
        },
        {
          id: 'largeTransactions',
          type: 'toggle',
          label: 'Large Transactions',
          description: 'Notify over $200',
          checked: notifications.largeTransactions,
        },
        {
          id: 'splitReminders',
          type: 'toggle',
          label: 'Split Reminders',
          description: 'Unsettled shared expenses',
          checked: notifications.splitReminders,
        },
        {
          id: 'ruleMatches',
          type: 'toggle',
          label: 'Rule Matches',
          description: 'Auto-categorization alerts',
          checked: notifications.ruleMatches,
        },
      ];
    }),
    coupleRows: computed<SettingsListRow[]>(() => {
      const couplePreferences = store.couplePreferences();

      return [
        {
          id: 'splitRatio',
          type: 'value',
          label: 'Split Ratio',
          value: couplePreferences.splitRatioLabel,
        },
        {
          id: 'autoSettle',
          type: 'value',
          label: 'Auto-Settle',
          value: couplePreferences.autoSettleLabel,
        },
        {
          id: 'shareInsights',
          type: 'toggle',
          label: 'Share Insights',
          checked: couplePreferences.shareInsights,
        },
      ];
    }),
  })),
  withMethods((store) => ({
    selectTab(tab: SettingsTabKey): void {
      if (tab !== 'account' && tab !== 'preferences' && tab !== 'couple') {
        return;
      }

      patchState(store, { activeTab: tab });
    },
    saveProfile(profile: ProfileSettings): void {
      patchState(store, { profile: { ...profile } });
    },
    toggleAppPreference(key: keyof Pick<AppPreferencesSettings, 'compactMode'>, checked: boolean): void {
      patchState(store, {
        appPreferences: {
          ...store.appPreferences(),
          [key]: checked,
        },
      });
    },
    setCurrencyCode(currencyCode: AppPreferencesSettings['currencyCode']): void {
      patchState(store, {
        appPreferences: {
          ...store.appPreferences(),
          currencyCode,
        },
      });
    },
    toggleSecurity(key: keyof Pick<SecuritySettings, 'twoFactorEnabled' | 'biometricEnabled'>, checked: boolean): void {
      patchState(store, {
        security: {
          ...store.security(),
          [key]: checked,
        },
      });
    },
    toggleNotification(key: keyof NotificationSettings, checked: boolean): void {
      patchState(store, {
        notifications: {
          ...store.notifications(),
          [key]: checked,
        },
      });
    },
    toggleCoupleShareInsights(checked: boolean): void {
      patchState(store, {
        couplePreferences: {
          ...store.couplePreferences(),
          shareInsights: checked,
        },
      });
    },
  })),
  withHooks((store, service = inject(SettingsService), injector = inject(Injector)) => ({
    onInit(): void {
      patchState(store, service.read());

      // Keep settings in localStorage in sync with current SignalStore state.
      watchState(
        store,
        (state) => {
          service.write(toSnapshot(state));
        },
        { injector },
      );
    },
  })),
);

function toSnapshot(state: SettingsSnapshot): SettingsSnapshot {
  return {
    activeTab: state.activeTab,
    profile: { ...state.profile },
    appPreferences: { ...state.appPreferences },
    security: { ...state.security },
    notifications: { ...state.notifications },
    couplePartner: { ...state.couplePartner },
    couplePreferences: { ...state.couplePreferences },
    coupleBalance: { ...state.coupleBalance },
  };
}

function toInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || 'NA';
}

function formatCurrency(value: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
