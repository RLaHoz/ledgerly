import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-onboarding-unassigned-modal',
  standalone: true,
  imports: [IonButton, IonIcon],
  templateUrl: './onboarding-unassigned-modal.component.html',
  styleUrl: './onboarding-unassigned-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingUnassignedModalComponent {
  @Output() readonly assignMissing = new EventEmitter<void>();
  @Output() readonly saveAsIs = new EventEmitter<void>();

  onAssignMissing(): void {
    this.assignMissing.emit();
  }

  onSaveAsIs(): void {
    this.saveAsIs.emit();
  }
}
