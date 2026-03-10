import { computed, Component, input, output } from '@angular/core';
import { IonIcon, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { moonOutline, sunnyOutline, notificationsOutline } from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-layout-header',
  templateUrl: './layout-header.component.html',
  imports: [IonToolbar, IonIcon],
  styleUrls: ['./layout-header.component.scss'],
})
export class LayoutHeaderComponent {
  title = input<string>('Dashboard');
  periodLabel = input<string>('FEBRUARY 2026');
  avatarText = input<string>('AK');
  hasNotifications = input<boolean>(true);
  themeIcon = input<'moon-outline' | 'sunny-outline'>('moon-outline');

  themeToggle = output<void>();
  notificationsClick = output<void>();
  avatarClick = output<void>();

  readonly themeAriaLabel = computed(() =>
    this.themeIcon() === 'moon-outline' ? 'Switch to dark mode' : 'Switch to light mode',
  );

  constructor() {
    addIcons({
      'moon-outline': moonOutline,
      'sunny-outline': sunnyOutline,
      'notifications-outline': notificationsOutline,
    });
  }
}
