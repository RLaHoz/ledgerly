import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface UserProfileInfoModel {
  initials: string;
  fullName: string;
  email: string;
}

@Component({
  selector: 'app-user-profile-info',
  standalone: true,
  templateUrl: './user-profile-info.component.html',
  styleUrl: './user-profile-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileInfoComponent {
  readonly model = input.required<UserProfileInfoModel>();
}
