export interface ListConnectionAccountsInput {
  providerUserId: string;
  providerConnectionId: string;
}

export interface BankAccountRecord {
  providerAccountId: string;
  name: string;
  mask?: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'LOAN' | 'OTHER';
  currency: string;
  isActive: boolean;
  payload?: unknown;
}

export interface ListConnectionTransactionsInput {
  providerUserId: string;
  providerConnectionId: string;
  from: Date;
  to: Date;
  cursor?: string;
  limit?: number;
}

export interface BankTransactionRecord {
  providerTxId: string;
  providerAccountId: string;
  occurredAt: Date;
  bookingDate?: Date;
  amountSigned: number;
  currency: string;
  merchant?: string;
  description: string;
  isPending: boolean;
  isTransfer: boolean;
  payload: unknown;
}

export interface ListConnectionTransactionsResult {
  items: BankTransactionRecord[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface BankDataClient {
  listConnectionAccounts(
    input: ListConnectionAccountsInput,
  ): Promise<BankAccountRecord[]>;
  listConnectionTransactions(
    input: ListConnectionTransactionsInput,
  ): Promise<ListConnectionTransactionsResult>;
}

export const BANK_DATA_CLIENT = Symbol('BANK_DATA_CLIENT');
