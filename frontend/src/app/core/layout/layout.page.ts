import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonHeader, IonIcon, IonToolbar } from '@ionic/angular/standalone';
import { IonRouterOutlet } from '@ionic/angular/standalone';
import { LayoutUiStore } from '../store/layout/layout.store';
import { ThemeStore } from '../store/theme/theme.store';
import { LayoutTabsFooterComponent } from './components/layout-tabs-footer/layout-tabs-footer.component';
import { addIcons } from 'ionicons';
import { moonOutline, notificationsOutline, sunnyOutline } from 'ionicons/icons';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonIcon, IonRouterOutlet, LayoutTabsFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutPage {
  readonly ui = inject(LayoutUiStore);
  readonly themeStore = inject(ThemeStore);
  readonly headerVm = this.ui.headerVm;
  readonly themeAriaLabel = computed(() =>
    this.themeStore.themeIcon() === 'moon-outline' ? 'Switch to dark mode' : 'Switch to light mode',
  );

  constructor() {
    addIcons({
      'moon-outline': moonOutline,
      'notifications-outline': notificationsOutline,
      'sunny-outline': sunnyOutline,
    });
  }

  onThemeToggle(): void {
    this.themeStore.toggleMode();
  }

  onNotificationsClick(): void {
    console.log('notifications');
  }

  onAvatarClick(): void {
    console.log('avatar');
  }

}
