import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, IonLabel, IonTabBar, IonTabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  swapHorizontalOutline,
  downloadOutline,
  funnelOutline,
  settingsOutline
} from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-layout-tabs-footer',
  templateUrl: './layout-tabs-footer.component.html',
  styleUrls: ['./layout-tabs-footer.component.scss'],
  imports: [RouterLink, RouterLinkActive, IonTabBar, IonTabButton, IonIcon, IonLabel]
})
export class LayoutTabsFooterComponent {

  constructor() {
    addIcons({
      'grid-outline': gridOutline,
      'swap-horizontal-outline': swapHorizontalOutline,
      'download-outline': downloadOutline,
      'funnel-outline': funnelOutline,
      'settings-outline': settingsOutline,
    });
  }

}
