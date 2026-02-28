import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardOutline } from 'ionicons/icons';
import { DashboardRecentTransaction } from '../../models/dashboard.models';

@Component({
  selector: 'app-recent-transactions-card',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './recent-transactions-card.component.html',
  styleUrl: './recent-transactions-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentTransactionsCardComponent {
  readonly title = input.required<string>();
  readonly viewAllLabel = input.required<string>();
  readonly transactions = input.required<DashboardRecentTransaction[]>();

  constructor() {
    addIcons({
      'arrow-forward-outline': arrowForwardOutline,
    });
  }
}
