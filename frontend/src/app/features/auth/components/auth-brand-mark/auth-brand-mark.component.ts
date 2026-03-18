import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-auth-brand-mark',
  standalone: true,
  template: `
    <svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="0" y="0" width="40" height="40" rx="10" class="brand-mark__tile"></rect>
      <path d="M13.333 10.667h4.667V24h8v4.667H13.333V10.667Z" class="brand-mark__glyph"></path>
      <rect x="26" y="10.667" width="6" height="4.667" rx="1.5" class="brand-mark__accent"></rect>
    </svg>
  `,
  styleUrl: './auth-brand-mark.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthBrandMarkComponent {}
