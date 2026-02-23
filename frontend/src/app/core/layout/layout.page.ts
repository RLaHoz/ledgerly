import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader } from '@ionic/angular/standalone';
import { LayoutHeaderComponent } from './components/layout-header/layout-header.component';
import { LayoutTabsFooterComponent } from './components/layout-tabs-footer/layout-tabs-footer.component';
import { IonRouterOutlet, IonTabs } from '@ionic/angular/standalone';
import { LayoutUiStore } from '../store/layout/layout.store';
import { ThemeStore } from '../store/theme/theme.store';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, CommonModule, FormsModule, LayoutHeaderComponent, LayoutTabsFooterComponent, IonRouterOutlet, IonTabs ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutPage {
  readonly ui = inject(LayoutUiStore);
  readonly themeStore = inject(ThemeStore);

  constructor() {}

  onThemeToggle() {
    this.themeStore.toggleMode();
  }

  onNotificationsClick() {
    console.log('notifications');
  }

  onAvatarClick() {
    console.log('avatar');
  }

}
