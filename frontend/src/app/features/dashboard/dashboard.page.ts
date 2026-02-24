import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { InsightBannerComponent } from './components/insight-banner/insight-banner.component';
import { MonthNavComponent } from './components/month-nav/month-nav.component';
import { SpendingChartCardComponent } from './components/spending-chart-card/spending-chart-card.component';
import { CategoryBreakdownCardComponent } from './components/category-breakdown-card/category-breakdown-card.component';
import { CoupleSplitCardComponent } from './components/couple-split-card/couple-split-card.component';
import { RecentTransactionsCardComponent } from './components/recent-transactions-card/recent-transactions-card.component';
import { DashboardStore } from './store/dashboard.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  imports: [
    IonContent,
    MonthNavComponent,
    KpiCardComponent,
    InsightBannerComponent,
    SpendingChartCardComponent,
    CategoryBreakdownCardComponent,
    CoupleSplitCardComponent,
    RecentTransactionsCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly store = inject(DashboardStore);

  onPreviousMonth(): void {
    this.store.previousMonth();
  }

  onNextMonth(): void {
    this.store.nextMonth();
  }

  onDateSelected(selectedDate: string): void {
    this.store.setSelectedDate(selectedDate);
  }
}
