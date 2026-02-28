import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
import { RulesQuickTemplateItem } from '../../models/rules.models';

@Component({
  selector: 'app-rules-quick-template',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './rules-quick-template.component.html',
  styleUrl: './rules-quick-template.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesQuickTemplateComponent {
  readonly title = input.required<string>();
  readonly items = input.required<readonly RulesQuickTemplateItem[]>();

  readonly selected = output<string>();

  constructor() {
    addIcons({
      'chevron-forward-outline': chevronForwardOutline,
    });
  }

  onSelect(itemId: string): void {
    this.selected.emit(itemId);
  }
}
