import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, IonLabel, IonTabBar, IonTabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { flashOutline, gridOutline, settingsOutline, walletOutline } from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-layout-tabs-footer',
  templateUrl: './layout-tabs-footer.component.html',
  styleUrls: ['./layout-tabs-footer.component.scss'],
  imports: [RouterLink, RouterLinkActive, IonTabBar, IonTabButton, IonIcon, IonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutTabsFooterComponent {
  private readonly router = inject(Router);

  constructor() {
    addIcons({
      'flash-outline': flashOutline,
      'grid-outline': gridOutline,
      'settings-outline': settingsOutline,
      'wallet-outline': walletOutline,
    });
  }

  navigateTo(path: '/dashboard' | '/budgets' | '/rules' | '/settings', event?: Event): void {
    event?.preventDefault();
    void this.router.navigateByUrl(path);
  }
}
