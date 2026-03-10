export type TransactionsSyncReason =
  | 'forced'
  | 'stale_ttl'
  | 'ttl_fresh'
  | 'no_connections';

export interface TransactionsSyncSummary {
  performed: boolean;
  reason: TransactionsSyncReason;
  syncRunIds: string[];
  syncedAt?: string;
}

export interface TransactionListItem {
  id: string;
  occurredAt: string;
  bookingDate?: string;
  amountSigned: number;
  currency: string;
  merchant?: string;
  description: string;
  isPending: boolean;
  classificationStatus: 'AUTO' | 'MANUAL' | 'UNCLASSIFIED';
  categoryId: string | null;
  subcategoryId: string | null;
  classifiedByRuleId: string | null;
}

export interface GroupedSubcategoryBucket {
  subcategoryId: string | null;
  name: string;
  txCount: number;
  debitTotal: number;
  creditTotal: number;
  transactions: TransactionListItem[];
}

export interface GroupedCategoryBucket {
  categoryId: string | null;
  name: string;
  txCount: number;
  debitTotal: number;
  creditTotal: number;
  subcategories: GroupedSubcategoryBucket[];
}

export interface CurrentMonthGroupedResponse {
  range: {
    from: string;
    to: string;
    userTimeZone: string;
  };
  sync: TransactionsSyncSummary;
  totals: {
    txCount: number;
    debitTotal: number;
    creditTotal: number;
    net: number;
  };
  categories: GroupedCategoryBucket[];
}

export interface NormalizedSyncedTransaction {
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
