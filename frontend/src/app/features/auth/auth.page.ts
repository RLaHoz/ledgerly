import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BankLinkCoordinatorService } from './services/banking/bank-link-coordinator.service';
import { GoogleAuthCoordinatorService } from './services/google/google-auth-coordinator.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPage {
  private readonly bankLinkCoordinator = inject(BankLinkCoordinatorService);
  private readonly googleAuthCoordinator = inject(GoogleAuthCoordinatorService);

  constructor() {
    this.bankLinkCoordinator.init();
    this.googleAuthCoordinator.init();
  }
}
