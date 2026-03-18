import { SettingsSnapshot, SettingsTabItem } from '../models/settings.models';

export interface SettingsState extends SettingsSnapshot {}

export const SETTINGS_TABS: readonly SettingsTabItem[] = [
  { id: 'account', label: 'Account', icon: 'person-outline' },
  { id: 'preferences', label: 'Preferences', icon: 'settings-outline' },
  { id: 'couple', label: 'Couple', icon: 'people-outline' },
] as const;

export const initialSettingsState: SettingsState = {
  activeTab: 'account',
  profile: {
    firstName: 'Jordan',
    lastName: 'Davis',
    email: 'jordan@example.com',
    phone: '+1 (555) 123-4567',
  },
  appPreferences: {
    currencyCode: 'USD',
    monthlyBudget: 2700,
    budgetStartLabel: '1st',
    defaultSplitLabel: 'Shared',
    compactMode: false,
  },
  security: {
    passwordChangedLabel: 'Changed 3 months ago',
    twoFactorEnabled: false,
    biometricEnabled: true,
    sessionTimeoutLabel: '30 min',
  },
  notifications: {
    budgetAlerts: true,
    dailySummary: false,
    weeklyReport: true,
    largeTransactions: false,
    splitReminders: false,
    ruleMatches: false,
  },
  couplePartner: {
    initials: 'JP',
    fullName: 'Jordan Park',
    email: 'jordan.park@email.com',
    statusLabel: 'Connected',
  },
  couplePreferences: {
    splitRatioLabel: '50/50',
    autoSettleLabel: 'Monthly',
    shareInsights: false,
  },
  coupleBalance: {
    title: 'Current Balance',
    amountLabel: 'You owe $124.35',
    detail: '12 unsettled shared expenses',
    actionLabel: 'Settle',
  },
};
