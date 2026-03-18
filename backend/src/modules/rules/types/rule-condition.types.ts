export type RuleDirection = 'debit' | 'credit';

export type RuleMatchModeValue =
  | 'KEYWORD_ONLY'
  | 'REGEX_ONLY'
  | 'KEYWORD_REGEX_HYBRID';

export interface RuleConditionAutoClassification {
  kind: 'merchant_text_match';
  matchMode: RuleMatchModeValue;
  direction: RuleDirection;
  keywords: string[];
  regex?: string;
  minKeywordHits?: number;
  amountMin?: number;
  amountMax?: number;
  excludeMerchants?: string[];
  recurringOnly?: boolean;
}

export interface RuleActionSetCategory {
  action: 'set_category';
  categoryId: string;
  subcategoryId?: string;
  classifier: 'user-rule-v1' | 'system-rules-v2';
}

export interface RuleTransactionCandidate {
  id?: string;
  amountSigned: number;
  merchant?: string | null;
  description: string;
  isPending?: boolean;
  isTransfer?: boolean;
  isRecurring?: boolean;
}

export interface RuleMatchDebug {
  keywordHits: number;
  regexMatched: boolean;
  reason: string;
}

export interface RuleEvaluationResult {
  matched: boolean;
  appliedRuleId?: string;
  categoryId?: string;
  subcategoryId?: string;
  debug: RuleMatchDebug;
}

export interface CompiledRule {
  id: string;
  userId: string;
  priority: number;
  condition: RuleConditionAutoClassification;
  action: RuleActionSetCategory;
}
