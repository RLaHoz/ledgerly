# Data Model Baseline (Offline Core)

## Transaction
```ts
export interface Transaction {
  id: string;
  amount: number;
  date: Date;
  description: string;
  ruleId: string;
  owner: 'self' | 'partner' | 'joint';
  type: 'expense' | 'income';
  createdAt: Date;
}
```

## Rule
```ts
export interface Rule {
  id: string;
  name: string;
  color: string;
  owner: 'self' | 'partner' | 'joint';
  matchKeywords: string[];
}
```

## Budget
```ts
export interface Budget {
  id: string;
  ruleId: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
}
```

## Settings (recommended)
```ts
export interface Settings {
  id: string;
  themeMode: 'light' | 'dark' | 'system';
  splitModeEnabled: boolean;
  splitType: 'equal' | 'proportional';
  currency: string;
  locale: string;
}
```

## Future Cloud Fields (planned)
- `updatedAt: Date`
- `deletedAt?: Date` (soft delete)
- `version: number` (optimistic sync)
- `source: 'local' | 'cloud'`

## Indexing Guidance (Dexie)
Recommended indexes:
- transactions: `[date+owner]`, `ruleId`, `type`, `createdAt`
- rules: `owner`, `name`
- budgets: `[ruleId+period]`
