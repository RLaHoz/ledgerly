export type SettingsTabKey = 'account' | 'preferences' | 'couple';

export interface ProfileSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface AppPreferencesSettings {
  currencyCode: 'AUD' | 'USD' | 'EUR';
  monthlyBudget: number;
  budgetStartLabel: string;
  defaultSplitLabel: 'Shared' | 'Mine' | 'Partner';
  compactMode: boolean;
}

export interface SecuritySettings {
  passwordChangedLabel: string;
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  sessionTimeoutLabel: string;
}

export interface NotificationSettings {
  budgetAlerts: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  largeTransactions: boolean;
  splitReminders: boolean;
  ruleMatches: boolean;
}

export interface CouplePartnerSettings {
  initials: string;
  fullName: string;
  email: string;
  statusLabel: string;
}

export interface CouplePreferencesSettings {
  splitRatioLabel: string;
  autoSettleLabel: string;
  shareInsights: boolean;
}

export interface CoupleBalanceSettings {
  title: string;
  amountLabel: string;
  detail: string;
  actionLabel: string;
}

export interface SettingsSnapshot {
  activeTab: SettingsTabKey;
  profile: ProfileSettings;
  appPreferences: AppPreferencesSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  couplePartner: CouplePartnerSettings;
  couplePreferences: CouplePreferencesSettings;
  coupleBalance: CoupleBalanceSettings;
}

export type SettingsRowTone = 'default' | 'accent' | 'danger';

interface SettingsBaseRow {
  id: string;
  label: string;
  description?: string;
  tone?: SettingsRowTone;
}

export interface SettingsValueRow extends SettingsBaseRow {
  type: 'value';
  value: string;
}

export interface SettingsToggleRow extends SettingsBaseRow {
  type: 'toggle';
  checked: boolean;
}

export interface SettingsActionRow extends SettingsBaseRow {
  type: 'action';
  actionLabel: string;
}

export interface SettingsSelectOption {
  label: string;
  value: string;
}

export interface SettingsSelectRow extends SettingsBaseRow {
  type: 'select';
  value: string;
  options: readonly SettingsSelectOption[];
}

export type SettingsListRow = SettingsValueRow | SettingsToggleRow | SettingsActionRow | SettingsSelectRow;

export interface SettingsTabItem {
  id: SettingsTabKey;
  label: string;
  icon: string;
}
