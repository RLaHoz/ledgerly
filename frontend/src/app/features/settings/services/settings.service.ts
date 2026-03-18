import { Injectable } from '@angular/core';
import { SettingsSnapshot } from '../models/settings.models';
import { initialSettingsState } from '../store/settings.state';

const SETTINGS_STORAGE_KEY = 'ledgerly.settings.v1';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  read(): SettingsSnapshot {
    const fallback = cloneSnapshot(initialSettingsState);

    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw) as unknown;
      return coerceSnapshot(parsed, fallback);
    } catch {
      return fallback;
    }
  }

  write(snapshot: SettingsSnapshot): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage errors (private mode / blocked storage).
    }
  }
}

function coerceSnapshot(value: unknown, fallback: SettingsSnapshot): SettingsSnapshot {
  if (!isRecord(value)) {
    return fallback;
  }

  const activeTab = value['activeTab'];

  return {
    activeTab: activeTab === 'account' || activeTab === 'preferences' || activeTab === 'couple' ? activeTab : fallback.activeTab,
    profile: {
      firstName: readString(value['profile'], 'firstName', fallback.profile.firstName),
      lastName: readString(value['profile'], 'lastName', fallback.profile.lastName),
      email: readString(value['profile'], 'email', fallback.profile.email),
      phone: readString(value['profile'], 'phone', fallback.profile.phone),
    },
    appPreferences: {
      currencyCode: readCurrencyCode(value['appPreferences'], 'currencyCode', fallback.appPreferences.currencyCode),
      monthlyBudget: readNumber(value['appPreferences'], 'monthlyBudget', fallback.appPreferences.monthlyBudget),
      budgetStartLabel: readString(value['appPreferences'], 'budgetStartLabel', fallback.appPreferences.budgetStartLabel),
      defaultSplitLabel: readSplitLabel(value['appPreferences'], 'defaultSplitLabel', fallback.appPreferences.defaultSplitLabel),
      compactMode: readBoolean(value['appPreferences'], 'compactMode', fallback.appPreferences.compactMode),
    },
    security: {
      passwordChangedLabel: readString(value['security'], 'passwordChangedLabel', fallback.security.passwordChangedLabel),
      twoFactorEnabled: readBoolean(value['security'], 'twoFactorEnabled', fallback.security.twoFactorEnabled),
      biometricEnabled: readBoolean(value['security'], 'biometricEnabled', fallback.security.biometricEnabled),
      sessionTimeoutLabel: readString(value['security'], 'sessionTimeoutLabel', fallback.security.sessionTimeoutLabel),
    },
    notifications: {
      budgetAlerts: readBoolean(value['notifications'], 'budgetAlerts', fallback.notifications.budgetAlerts),
      dailySummary: readBoolean(value['notifications'], 'dailySummary', fallback.notifications.dailySummary),
      weeklyReport: readBoolean(value['notifications'], 'weeklyReport', fallback.notifications.weeklyReport),
      largeTransactions: readBoolean(value['notifications'], 'largeTransactions', fallback.notifications.largeTransactions),
      splitReminders: readBoolean(value['notifications'], 'splitReminders', fallback.notifications.splitReminders),
      ruleMatches: readBoolean(value['notifications'], 'ruleMatches', fallback.notifications.ruleMatches),
    },
    couplePartner: {
      initials: readString(value['couplePartner'], 'initials', fallback.couplePartner.initials),
      fullName: readString(value['couplePartner'], 'fullName', fallback.couplePartner.fullName),
      email: readString(value['couplePartner'], 'email', fallback.couplePartner.email),
      statusLabel: readString(value['couplePartner'], 'statusLabel', fallback.couplePartner.statusLabel),
    },
    couplePreferences: {
      splitRatioLabel: readString(value['couplePreferences'], 'splitRatioLabel', fallback.couplePreferences.splitRatioLabel),
      autoSettleLabel: readString(value['couplePreferences'], 'autoSettleLabel', fallback.couplePreferences.autoSettleLabel),
      shareInsights: readBoolean(value['couplePreferences'], 'shareInsights', fallback.couplePreferences.shareInsights),
    },
    coupleBalance: {
      title: readString(value['coupleBalance'], 'title', fallback.coupleBalance.title),
      amountLabel: readString(value['coupleBalance'], 'amountLabel', fallback.coupleBalance.amountLabel),
      detail: readString(value['coupleBalance'], 'detail', fallback.coupleBalance.detail),
      actionLabel: readString(value['coupleBalance'], 'actionLabel', fallback.coupleBalance.actionLabel),
    },
  };
}

function cloneSnapshot(snapshot: SettingsSnapshot): SettingsSnapshot {
  return {
    activeTab: snapshot.activeTab,
    profile: { ...snapshot.profile },
    appPreferences: { ...snapshot.appPreferences },
    security: { ...snapshot.security },
    notifications: { ...snapshot.notifications },
    couplePartner: { ...snapshot.couplePartner },
    couplePreferences: { ...snapshot.couplePreferences },
    coupleBalance: { ...snapshot.coupleBalance },
  };
}

function readSplitLabel(recordValue: unknown, key: string, fallback: 'Shared' | 'Mine' | 'Partner'): 'Shared' | 'Mine' | 'Partner' {
  const value = readString(recordValue, key, fallback);
  if (value === 'Shared' || value === 'Mine' || value === 'Partner') {
    return value;
  }

  return fallback;
}

function readCurrencyCode(recordValue: unknown, key: string, fallback: 'AUD' | 'USD' | 'EUR'): 'AUD' | 'USD' | 'EUR' {
  const value = readString(recordValue, key, fallback);
  if (value === 'AUD' || value === 'USD' || value === 'EUR') {
    return value;
  }

  return fallback;
}

function readString(recordValue: unknown, key: string, fallback: string): string {
  if (!isRecord(recordValue)) {
    return fallback;
  }

  const value = recordValue[key];
  return typeof value === 'string' ? value : fallback;
}

function readBoolean(recordValue: unknown, key: string, fallback: boolean): boolean {
  if (!isRecord(recordValue)) {
    return fallback;
  }

  const value = recordValue[key];
  return typeof value === 'boolean' ? value : fallback;
}

function readNumber(recordValue: unknown, key: string, fallback: number): number {
  if (!isRecord(recordValue)) {
    return fallback;
  }

  const value = recordValue[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
