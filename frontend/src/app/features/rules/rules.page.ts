import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonContent, IonModal } from '@ionic/angular/standalone';
import { RulesAddItemComponent } from './components/rules-add-item/rules-add-item.component';
import { RulesActiveComponent } from './components/rules-active/rules-active.component';
import { RulesQuickTemplateComponent } from './components/rules-quick-template/rules-quick-template.component';
import { RulesTriggeredAlertsComponent } from './components/rules-triggered-alerts/rules-triggered-alerts.component';
import { RulesStore } from './store/rules.store';

@Component({
  selector: 'app-rules',
  standalone: true,
  templateUrl: './rules.page.html',
  styleUrls: ['./rules.page.scss'],
  imports: [
    IonContent,
    IonModal,
    RulesQuickTemplateComponent,
    RulesActiveComponent,
    RulesTriggeredAlertsComponent,
    RulesAddItemComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesPage {
  readonly store = inject(RulesStore);

  onOpenAddRule(): void {
    this.store.openAddRuleModal();
  }

  onCloseAddRule(): void {
    this.store.closeAddRuleModal();
  }

  onRuleToggle(event: { id: string; enabled: boolean }): void {
    this.store.toggleActiveRule(event.id, event.enabled);
  }

  onRuleNameChanged(value: string): void {
    this.store.setAddRuleName(value);
  }

  onRuleTypeChanged(value: string): void {
    this.store.setAddRuleType(value);
  }

  onConditionFieldChanged(value: string): void {
    this.store.setConditionField(value);
  }

  onConditionValueChanged(value: string): void {
    this.store.setConditionValue(value);
  }

  onActionTypeChanged(value: string): void {
    this.store.setActionType(value);
  }

  onActionValueChanged(value: string): void {
    this.store.setActionValue(value);
  }

  onCreateRule(): void {
    this.store.createRule();
  }
}
