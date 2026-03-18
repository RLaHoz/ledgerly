import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';

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
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileInfoComponent {
  readonly model = input.required<UserProfileInfoModel>();
  readonly logoutClicked = output<void>();

  constructor() {
    addIcons({
      'log-out-outline': logOutOutline,
    });
  }

  onLogoutClick(): void {
    this.logoutClicked.emit();
  }
}
