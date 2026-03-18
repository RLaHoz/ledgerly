import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IonIcon, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, chevronDownOutline, closeOutline, notificationsOutline, pricetagOutline, sparklesOutline, trendingUpOutline } from 'ionicons/icons';

type DropdownKey = 'ruleType' | 'autoCategory' | 'alertCategory' | 'alertThreshold' | 'anomalyCondition';
type RuleVariant = 'auto' | 'alert' | 'anomaly';

@Component({
  selector: 'app-rules-add-item',
  standalone: true,
  imports: [IonIcon, IonToggle],
  templateUrl: './rules-add-item.component.html',
  styleUrl: './rules-add-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesAddItemComponent {
  readonly showTypeSelector = input(false);
  readonly ruleName = input.required<string>();
  readonly ruleType = input.required<string>();
  readonly conditionField = input.required<string>();
  readonly conditionValue = input.required<string>();
  readonly actionType = input.required<string>();
  readonly actionValue = input.required<string>();
  readonly ruleTypeOptions = input.required<readonly string[]>();
  readonly conditionFieldOptions = input.required<readonly string[]>();
  readonly actionTypeOptions = input.required<readonly string[]>();
  readonly actionValueOptions = input.required<readonly string[]>();
  readonly canCreate = input<boolean>(false);

  readonly closed = output<void>();
  readonly canceled = output<void>();
  readonly created = output<void>();
  readonly ruleNameChanged = output<string>();
  readonly ruleTypeChanged = output<string>();
  readonly conditionFieldChanged = output<string>();
  readonly conditionValueChanged = output<string>();
  readonly actionTypeChanged = output<string>();
  readonly actionValueChanged = output<string>();

  readonly openDropdown = signal<DropdownKey | null>(null);
  readonly advancedOpen = signal(false);
  readonly recurringOnly = signal(false);
  readonly excludeSmallAmounts = signal(false);

  readonly variant = computed<RuleVariant>(() => {
    if (this.ruleType() === 'Threshold alert') {
      return 'alert';
    }

    if (this.ruleType() === 'Anomaly detection') {
      return 'anomaly';
    }

    return 'auto';
  });

  readonly title = computed(() => {
    const variant = this.variant();

    if (variant === 'alert') {
      return 'Create alert rule';
    }

    if (variant === 'anomaly') {
      return 'Create anomaly rule';
    }

    return 'Create auto-tag rule';
  });

  readonly description = computed(() => {
    const variant = this.variant();

    if (variant === 'alert') {
      return 'Get notified when spending reaches a threshold.';
    }

    if (variant === 'anomaly') {
      return 'Detect unusual spending patterns automatically.';
    }

    return 'Automatically categorize transactions based on merchant name.';
  });


  readonly typeLabel = computed(() => {
    if (this.ruleType() === 'Threshold alert') {
      return 'Threshold alert';
    }

    if (this.ruleType() === 'Anomaly detection') {
      return 'Anomaly detection';
    }

    return 'Auto-tag';
  });

  readonly impactText = computed(() => {
    const variant = this.variant();

    if (variant === 'alert') {
      return 'Would have applied to ~12 transactions last month';
    }

    if (variant === 'anomaly') {
      return 'Would have flagged ~2 purchases last month';
    }

    return 'Would have applied to ~12 transactions last month';
  });

  readonly namePlaceholder = computed(() => {
    const variant = this.variant();

    if (variant === 'alert') {
      return 'e.g., Groceries at 75%';
    }

    if (variant === 'anomaly') {
      return 'e.g., Large purchase alert';
    }

    return 'e.g., Tag Starbucks as Food';
  });

  readonly autoMerchantPlaceholder = 'e.g., Uber, Starbucks, Amazon';
  readonly categoryOptions = computed(() => this.actionValueOptions());
  readonly thresholdOptions = ['75%', '90%', '100%'] as const;
  readonly anomalyOptions = [
    'Spending exceeds 120% of average',
    'Spending exceeds 150% of average',
    'Spending exceeds 200% of average',
    'Single transaction over $200',
  ] as const;

  constructor() {
    addIcons({
      'checkmark-outline': checkmarkOutline,
      'chevron-down-outline': chevronDownOutline,
      'close-outline': closeOutline,
      'notifications-outline': notificationsOutline,
      'pricetag-outline': pricetagOutline,
      'sparkles-outline': sparklesOutline,
      'trending-up-outline': trendingUpOutline,
    });
  }

  onTextInput(event: Event, emitter: { emit: (value: string) => void }): void {
    const target = event.target as HTMLInputElement | null;
    emitter.emit(target?.value ?? '');
  }

  toggleDropdown(key: DropdownKey): void {
    this.openDropdown.set(this.openDropdown() === key ? null : key);
  }

  isDropdownOpen(key: DropdownKey): boolean {
    return this.openDropdown() === key;
  }

  selectRuleType(value: string): void {
    this.ruleTypeChanged.emit(value);
    this.openDropdown.set(null);
  }

  selectAutoCategory(value: string): void {
    this.actionValueChanged.emit(value);
    this.openDropdown.set(null);
  }

  selectAlertCategory(value: string): void {
    this.actionValueChanged.emit(value);
    this.openDropdown.set(null);
  }

  selectAlertThreshold(value: string): void {
    this.conditionValueChanged.emit(value);
    this.openDropdown.set(null);
  }

  selectAnomalyCondition(value: string): void {
    this.conditionValueChanged.emit(value);
    this.openDropdown.set(null);
  }

  toggleAdvanced(): void {
    this.advancedOpen.update((value) => !value);
  }

  onRecurringToggle(event: Event): void {
    const customEvent = event as CustomEvent<{ checked: boolean }>;
    this.recurringOnly.set(customEvent.detail.checked);
  }

  onExcludeSmallAmountsToggle(event: Event): void {
    const customEvent = event as CustomEvent<{ checked: boolean }>;
    this.excludeSmallAmounts.set(customEvent.detail.checked);
  }

  typeIconName(value: string): string {
    if (value === 'Threshold alert') {
      return 'notifications-outline';
    }

    if (value === 'Anomaly detection') {
      return 'sparkles-outline';
    }

    return 'pricetag-outline';
  }
}
