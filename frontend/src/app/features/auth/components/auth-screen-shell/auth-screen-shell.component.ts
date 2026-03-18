import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthBrandMarkComponent } from '../auth-brand-mark/auth-brand-mark.component';
import { AUTH_ENTRY_ROUTE } from '../../store/auth-route.constants';

@Component({
  selector: 'app-auth-screen-shell',
  standalone: true,
  imports: [RouterLink, AuthBrandMarkComponent],
  templateUrl: './auth-screen-shell.component.html',
  styleUrl: './auth-screen-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthScreenShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly showBackButton = input(false);
  readonly backLink = input(AUTH_ENTRY_ROUTE);
  readonly brandMarginBottom = input('40px');
  readonly compactTopBar = input(false);

  readonly back = output<void>();

  onBack(): void {
    this.back.emit();
  }
}
