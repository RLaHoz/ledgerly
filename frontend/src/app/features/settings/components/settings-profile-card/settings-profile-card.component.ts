import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline } from 'ionicons/icons';
import { ProfileSettings } from '../../models/settings.models';

@Component({
  selector: 'app-settings-profile-card',
  standalone: true,
  imports: [ReactiveFormsModule, IonInput, IonButton, IonIcon],
  templateUrl: './settings-profile-card.component.html',
  styleUrl: './settings-profile-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsProfileCardComponent {
  readonly profile = input.required<ProfileSettings>();
  readonly profileName = input.required<string>();
  readonly profileInitials = input.required<string>();

  readonly profileSaved = output<ProfileSettings>();

  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    firstName: [''],
    lastName: [''],
    email: [''],
    phone: [''],
  });

  constructor() {
    addIcons({
      'settings-outline': settingsOutline,
    });

    effect(() => {
      const profile = this.profile();
      this.form.setValue(
        {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
        },
        { emitEvent: false },
      );
    });
  }

  onSubmit(): void {
    this.profileSaved.emit(this.form.getRawValue());
  }
}
