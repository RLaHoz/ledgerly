import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, pricetagOutline, sparklesOutline } from 'ionicons/icons';
import { RulesQuickTemplateItem } from '../../models/rules.models';

type QuickCreateTone = 'auto' | 'alert' | 'anomaly';

interface RulesQuickCreateCard extends RulesQuickTemplateItem {
  tone: QuickCreateTone;
}

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

  readonly cards = computed<readonly RulesQuickCreateCard[]>(() =>
    this.items().map((item) => ({
      ...item,
      tone: item.id === 'auto-classification' ? 'auto' : item.id === 'threshold-alert' ? 'alert' : 'anomaly',
    })),
  );

  constructor() {
    addIcons({
      'pricetag-outline': pricetagOutline,
      'notifications-outline': notificationsOutline,
      'sparkles-outline': sparklesOutline,
    });
  }

  iconName(tone: QuickCreateTone): string {
    if (tone === 'auto') {
      return 'pricetag-outline';
    }

    if (tone === 'alert') {
      return 'notifications-outline';
    }

    return 'sparkles-outline';
  }

  onSelect(itemId: string): void {
    this.selected.emit(itemId);
  }
}
