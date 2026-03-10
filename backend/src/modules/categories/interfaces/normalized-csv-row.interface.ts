export interface NormalizedCsvRow {
  occurredAt: Date;
  amountSigned: number;
  description: string;
  merchant: string;
  balance?: number;
}
