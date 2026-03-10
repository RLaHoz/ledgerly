import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonHeader, IonIcon, IonToolbar } from '@ionic/angular/standalone';
import { IonRouterOutlet } from '@ionic/angular/standalone';
import { NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LayoutUiStore } from '../store/layout/layout.store';
import { LayoutTabsFooterComponent } from './components/layout-tabs-footer/layout-tabs-footer.component';
import { addIcons } from 'ionicons';
import { chevronBackOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonIcon, IonRouterOutlet, LayoutTabsFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutPage {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly ui = inject(LayoutUiStore);
  readonly currentUrl = signal<string>(this.router.url);

  readonly isDetailRoute = computed(() => this.currentUrl().includes('/detail/'));
  readonly pageTitle = computed(() => resolvePageTitle(this.currentUrl()));
  readonly syncLabel = computed(() => this.ui.headerVm().syncLabel);

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'refresh-outline': refreshOutline,
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.currentUrl.set(this.router.url);
      });
  }

  onSyncClick(): void {
    void this.router.navigateByUrl('/auth');
  }

  onBackClick(): void {
    this.location.back();
  }

}

function resolvePageTitle(url: string): string {
  if (url.startsWith('/settings')) {
    return 'Settings';
  }

  if (url.startsWith('/rules')) {
    return 'Rules';
  }

  if (url.startsWith('/budget') || url.startsWith('/budgets')) {
    return 'Budgets';
  }

  return 'Home';
}
