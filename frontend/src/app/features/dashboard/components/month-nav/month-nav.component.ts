import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IonButton, IonDatetime, IonIcon, IonPopover } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-month-nav',
  standalone: true,
  imports: [IonButton, IonIcon, IonDatetime, IonPopover],
  templateUrl: './month-nav.component.html',
  styleUrl: './month-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthNavComponent {
  readonly label = input.required<string>();
  readonly selectedDate = input.required<string>();
  readonly minDate = input.required<string>();
  readonly maxDate = input.required<string>();

  readonly previousRequested = output<void>();
  readonly nextRequested = output<void>();
  readonly dateSelected = output<string>();

  readonly accessibilityLabel = computed(() => `Choose date for ${this.label()}`);
  readonly pickerEvent = signal<Event | undefined>(undefined);
  readonly isPickerOpen = signal(false);

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'calendar-outline': calendarOutline,
    });
  }

  onPreviousClick(): void {
    this.previousRequested.emit();
  }

  onNextClick(): void {
    this.nextRequested.emit();
  }

  openDatePicker(event: Event): void {
    this.pickerEvent.set(event);
    this.isPickerOpen.set(true);
  }

  closeDatePicker(): void {
    this.pickerEvent.set(undefined);
    this.isPickerOpen.set(false);
  }

  onDateChange(event: Event): void {
    const customEvent = event as CustomEvent<{ value: string | string[] | null }>;
    const rawValue = customEvent.detail?.value ?? null;
    if (!rawValue) {
      return;
    }

    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (!value) {
      return;
    }

    this.dateSelected.emit(value.slice(0, 10));
    this.closeDatePicker();
  }
}
