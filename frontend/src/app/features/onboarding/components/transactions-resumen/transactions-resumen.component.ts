import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonCheckbox, IonIcon } from '@ionic/angular/standalone';
import { ParsedImportSummary } from '../../models/onboarding.models';

@Component({
  selector: 'app-transactions-resumen',
  standalone: true,
  imports: [IonCheckbox, IonIcon],
  templateUrl: './transactions-resumen.component.html',
  styleUrl: './transactions-resumen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsResumenComponent {
  readonly directDataFromBankAccounts = input.required<boolean>();
  readonly isParsing = input.required<boolean>();
  readonly isImportReady = input.required<boolean>();
  readonly summary = input<ParsedImportSummary | null>(null);
  readonly fileName = input('');

  readonly directDataFromBankAccountsChange = output<boolean>();

  onDirectDataFromBankAccountsChange(checked: boolean): void {
    this.directDataFromBankAccountsChange.emit(checked);
  }
}
