import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { IonIcon, IonItem, IonLabel, IonList, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, chevronDownOutline, chevronUpOutline, closeOutline } from 'ionicons/icons';

type DropdownKey = 'ruleType' | 'conditionField' | 'actionType' | 'actionValue';

@Component({
  selector: 'app-rules-add-item',
  standalone: true,
  imports: [IonIcon, IonItem, IonLabel, IonList, IonToggle],
  templateUrl: './rules-add-item.component.html',
  styleUrl: './rules-add-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesAddItemComponent {
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

  constructor() {
    addIcons({
      'checkmark-outline': checkmarkOutline,
      'chevron-down-outline': chevronDownOutline,
      'chevron-up-outline': chevronUpOutline,
      'close-outline': closeOutline,
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

  selectConditionField(value: string): void {
    this.conditionFieldChanged.emit(value);
    this.openDropdown.set(null);
  }

  selectActionType(value: string): void {
    this.actionTypeChanged.emit(value);
    this.openDropdown.set(null);
  }

  selectActionValue(value: string): void {
    this.actionValueChanged.emit(value);
    this.openDropdown.set(null);
  }

  toggleAdvanced(): void {
    this.advancedOpen.update((value) => !value);
  }

  onRecurringToggle(event: Event): void {
    const customEvent = event as CustomEvent<{ checked: boolean }>;
    this.recurringOnly.set(customEvent.detail.checked);
  }
}
