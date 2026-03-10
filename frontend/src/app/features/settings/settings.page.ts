import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { ThemeService } from '../../core/services/theme/theme.service';
import { ThemeStore } from '../../core/store/theme/theme.store';
import { DataSourceInfoComponent, DataSourceInfoModel } from './components/data-source-info/data-source-info.component';
import { NontificationItem, NontificationsComponent } from './components/nontifications/nontifications.component';
import { PreferencesComponent, PreferencesModel, PreferencesThemeMode } from './components/preferences/preferences.component';
import { UserProfileInfoComponent, UserProfileInfoModel } from './components/user-profile-info/user-profile-info.component';
import { NotificationSettings } from './models/settings.models';
import { SettingsStore } from './store/settings.store';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [IonContent, UserProfileInfoComponent, DataSourceInfoComponent, NontificationsComponent, PreferencesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  readonly store = inject(SettingsStore);
  private readonly router = inject(Router);
  private readonly themeStore = inject(ThemeStore);
  private readonly themeService = inject(ThemeService);

  private readonly themeMode = signal<PreferencesThemeMode>(this.themeStore.mode());
  private readonly syncFrequencyLabel = signal('15 min');
  private readonly monthStartValue = signal(readMonthStartValue(this.store.appPreferences().budgetStartLabel));

  readonly profileInfo = computed<UserProfileInfoModel>(() => ({
    initials: this.store.profileInitials(),
    fullName: this.store.profileFullName(),
    email: this.store.profile().email,
  }));

  readonly dataSourceInfo = computed<DataSourceInfoModel>(() => ({
    title: 'DATA SOURCES',
    items: [
      {
        id: 'bank-checking',
        iconName: 'business-outline',
        title: 'Chase Checking',
        subtitle: 'Bank \u00b7 2m ago',
        statusLabel: 'Connected',
      },
      {
        id: 'excel-budget',
        iconName: 'document-text-outline',
        title: 'Shared Budget.xlsx',
        subtitle: 'Excel \u00b7 5m ago',
        statusLabel: 'Connected',
      },
    ],
    connectBankLabel: 'Connect Bank',
    uploadLabel: 'Upload Excel',
    syncFrequencyLabel: 'Sync frequency',
    selectedFrequencyLabel: this.syncFrequencyLabel(),
    frequencyOptions: SYNC_FREQUENCY_OPTIONS,
  }));

  readonly nontifications = computed<readonly NontificationItem[]>(() => {
    const notifications = this.store.notifications();

    return [
      {
        id: 'budgetWarnings',
        title: 'Budget Warnings',
        description: '75 / 90 / 100% thresholds',
        enabled: notifications.budgetAlerts,
      },
      {
        id: 'criticalOnly',
        title: 'Critical Only',
        description: 'Only 100%+ alerts',
        enabled: notifications.largeTransactions,
      },
      {
        id: 'weeklyReport',
        title: 'Weekly Report',
        description: 'Spending summary',
        enabled: notifications.weeklyReport,
      },
      {
        id: 'unusualSpending',
        title: 'Unusual Spending',
        description: 'Off-pattern detection',
        enabled: notifications.ruleMatches,
      },
    ];
  });

  readonly preferencesInfo = computed<PreferencesModel>(() => ({
    title: 'PREFERENCES',
    currencyValue: this.store.appPreferences().currencyCode,
    monthStartValue: this.monthStartValue(),
    currencyOptions: CURRENCY_OPTIONS,
    monthStartOptions: MONTH_START_OPTIONS,
    familyModeEnabled: this.store.couplePreferences().shareInsights,
    themeMode:
      this.themeMode() === 'auto'
        ? 'auto'
        : this.themeStore.mode(),
  }));

  onConnectBank(): void {
    // Placeholder until integration with bank linking flow.
  }

  onUploadExcel(): void {
    void this.router.navigate(['/onboarding/import']);
  }

  onSyncFrequencyChange(value: string): void {
    if (!isSyncFrequency(value)) {
      return;
    }

    this.syncFrequencyLabel.set(value);
  }

  onNotificationToggle(event: { id: string; enabled: boolean }): void {
    const key = notificationKeyByItemId[event.id];
    if (!key) {
      return;
    }

    this.store.toggleNotification(key, event.enabled);
  }

  onCurrencyChange(value: string): void {
    if (isCurrencyCode(value)) {
      this.store.setCurrencyCode(value);
    }
  }

  onMonthStartChange(value: string): void {
    if (isMonthStart(value)) {
      this.monthStartValue.set(value);
    }
  }

  onThemeModeChange(mode: PreferencesThemeMode): void {
    this.themeMode.set(mode);

    if (mode === 'auto') {
      this.themeStore.setMode(this.themeService.resolveSystemMode());
      return;
    }

    this.themeStore.setMode(mode);
  }

  onFamilyModeToggle(enabled: boolean): void {
    this.store.toggleCoupleShareInsights(enabled);
  }
}

const notificationKeyByItemId: Record<string, keyof NotificationSettings> = {
  budgetWarnings: 'budgetAlerts',
  criticalOnly: 'largeTransactions',
  weeklyReport: 'weeklyReport',
  unusualSpending: 'ruleMatches',
};

function readMonthStartValue(value: string): string {
  return value === '1st' ? value : '1st';
}

const CURRENCY_OPTIONS = ['USD', 'EUR', 'AUD'] as const;
const MONTH_START_OPTIONS = ['1st', '15th'] as const;
const SYNC_FREQUENCY_OPTIONS = ['5 min', '15 min', '30 min', '1 hr'] as const;

function isCurrencyCode(value: string): value is 'AUD' | 'USD' | 'EUR' {
  return value === 'AUD' || value === 'USD' || value === 'EUR';
}

function isMonthStart(value: string): value is (typeof MONTH_START_OPTIONS)[number] {
  return MONTH_START_OPTIONS.includes(value as (typeof MONTH_START_OPTIONS)[number]);
}

function isSyncFrequency(value: string): value is (typeof SYNC_FREQUENCY_OPTIONS)[number] {
  return SYNC_FREQUENCY_OPTIONS.includes(value as (typeof SYNC_FREQUENCY_OPTIONS)[number]);
}
