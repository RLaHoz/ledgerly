import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel, IonRouterOutlet } from '@ionic/angular/standalone';
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
  imports: [IonRouterOutlet,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
  ]
})
export class LayoutTabsFooterComponent  implements OnInit {

  constructor() {
    addIcons({
      'grid-outline': gridOutline,
      'swap-horizontal-outline': swapHorizontalOutline,
      'download-outline': downloadOutline,
      'funnel-outline': funnelOutline,
      'settings-outline': settingsOutline,
    });
  }

  ngOnInit() {
    console.log('INit');
  }

}
