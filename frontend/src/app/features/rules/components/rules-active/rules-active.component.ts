import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, notificationsOutline, pricetagOutline, warningOutline } from 'ionicons/icons';
import { RuleIconKind, RulesActiveItem } from '../../models/rules.models';

@Component({
  selector: 'app-rules-active',
  standalone: true,
  imports: [IonIcon, IonToggle],
  templateUrl: './rules-active.component.html',
  styleUrl: './rules-active.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesActiveComponent {
  readonly title = input.required<string>();
  readonly summary = input.required<string>();
  readonly addLabel = input.required<string>();
  readonly items = input.required<readonly RulesActiveItem[]>();

  readonly addRequested = output<void>();
  readonly toggled = output<{ id: string; enabled: boolean }>();

  constructor() {
    addIcons({
      'add-outline': addOutline,
      'pricetag-outline': pricetagOutline,
      'notifications-outline': notificationsOutline,
      'warning-outline': warningOutline,
    });
  }

  iconName(kind: RuleIconKind): string {
    if (kind === 'tag') {
      return 'pricetag-outline';
    }

    if (kind === 'warning') {
      return 'warning-outline';
    }

    return 'notifications-outline';
  }

  onToggle(ruleId: string, event: Event): void {
    const customEvent = event as CustomEvent<{ checked: boolean }>;
    this.toggled.emit({ id: ruleId, enabled: customEvent.detail.checked });
  }
}
