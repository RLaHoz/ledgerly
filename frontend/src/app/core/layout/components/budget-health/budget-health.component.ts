import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { IonDatetime, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

export interface BudgetHealthStatViewModel {
  id: string;
  tone: 'danger' | 'warning' | 'moderate';
  count: number;
  label: string;
}

@Component({
  selector: 'app-budget-health',
  standalone: true,
  templateUrl: './budget-health.component.html',
  styleUrls: ['./budget-health.component.scss'],
  imports: [IonIcon, IonDatetime],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetHealthComponent {
  readonly monthLabel = input.required<string>();
  readonly monthValue = input.required<string>();
  readonly minMonthDate = input.required<string>();
  readonly maxMonthDate = input.required<string>();
  readonly healthLabel = input.required<string>();
  readonly updatedLabel = input.required<string>();
  readonly trendLabel = input.required<string>();
  readonly stats = input.required<readonly BudgetHealthStatViewModel[]>();

  readonly previousRequested = output<void>();
  readonly nextRequested = output<void>();
  readonly monthSelected = output<string>();
  readonly isMonthPickerOpen = signal(false);

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
    });
  }

  onMonthPickerChanged(event: Event): void {
    const detail = (event as CustomEvent<{ value?: string | string[] | null }>).detail;
    const rawValue = detail?.value;
    if (!rawValue) {
      return;
    }

    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (!value) {
      return;
    }

    this.monthSelected.emit(value.slice(0, 10));
    this.onMonthPickerDismissed();
  }

  onMonthPickerDismissed(): void {
    this.isMonthPickerOpen.set(false);
  }

  openMonthPicker(): void {
    this.isMonthPickerOpen.update((isOpen) => !isOpen);
  }
}
