import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';

export interface NontificationItem {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

@Component({
  selector: 'app-nontifications',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './nontifications.component.html',
  styleUrl: './nontifications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NontificationsComponent {
  readonly title = input<string>('NOTIFICATIONS');
  readonly items = input.required<readonly NontificationItem[]>();

  readonly toggled = output<{ id: string; enabled: boolean }>();

  constructor() {
    addIcons({
      'notifications-outline': notificationsOutline,
    });
  }

  trackById(_: number, item: NontificationItem): string {
    return item.id;
  }

  onToggle(item: NontificationItem): void {
    this.toggled.emit({
      id: item.id,
      enabled: !item.enabled,
    });
  }
}
