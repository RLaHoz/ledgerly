import { Injectable, computed, signal } from '@angular/core';
import {
  AssignmentType,
  CategoryFilter,
  OnboardingCategory,
  OnboardingTransaction,
  ParsedImportPreviewRow,
  ParsedImportSummary,
  StarterRule,
} from '../models/onboarding.models';

const CATEGORY_CATALOG: ReadonlyArray<Omit<OnboardingCategory, 'plannedAmount'>> = [
  { slug: 'baby', name: 'Baby', iconName: 'happy-outline', colorHex: '#E57AB1' },
  { slug: 'groceries', name: 'Groceries', iconName: 'cart-outline', colorHex: '#29BF68' },
  { slug: 'home', name: 'Home', iconName: 'home-outline', colorHex: '#3F83EF' },
  { slug: 'transport', name: 'Transport', iconName: 'car-outline', colorHex: '#EB9D12' },
  { slug: 'gym', name: 'Gym', iconName: 'barbell-outline', colorHex: '#6060FF' },
  { slug: 'shopping', name: 'Shopping', iconName: 'bag-handle-outline', colorHex: '#EF4AA8' },
  { slug: 'entertainment', name: 'Entertainment', iconName: 'film-outline', colorHex: '#FF810F' },
  { slug: 'health', name: 'Health', iconName: 'heart-outline', colorHex: '#F45F66' },
];

const STARTER_RULES: ReadonlyArray<StarterRule> = [
  { id: 'auto-recurring', label: 'Auto-categorize recurring merchants', iconName: 'sparkles-outline', enabled: true },
  { id: 'warning-75', label: 'Alert at 75% budget used', iconName: 'warning-outline', enabled: true },
  { id: 'critical-100', label: 'Critical alert at 100%', iconName: 'shield-outline', enabled: true },
];

@Injectable({ providedIn: 'root' })
export class OnboardingWizardStore {
  readonly isParsing = signal(false);
  readonly isImportReady = signal(false);
  readonly fileName = signal('');
  readonly importSummary = signal<ParsedImportSummary | null>(null);
  readonly importPreviewRows = signal<readonly ParsedImportPreviewRow[]>([]);
  readonly transactions = signal<readonly OnboardingTransaction[]>([]);
  readonly activeFilter = signal<CategoryFilter>('auto');
  readonly isCategorySheetOpen = signal(false);
  readonly categorySheetTxIds = signal<readonly string[]>([]);
  readonly categorySearch = signal('');
  readonly monthlyTarget = signal<number | null>(null);
  readonly categories = signal<readonly OnboardingCategory[]>([]);
  readonly starterRules = signal<readonly StarterRule[]>(STARTER_RULES);
  readonly confirmAccepted = signal(false);

  readonly autoAssignedCount = computed(() =>
    this.transactions().filter((tx) => tx.assignment === 'auto').length,
  );

  readonly manualAssignedCount = computed(() =>
    this.transactions().filter((tx) => tx.assignment === 'manual').length,
  );

  readonly uncategorizedCount = computed(() =>
    this.transactions().filter((tx) => tx.assignment === 'uncategorized').length,
  );

  readonly selectedCount = computed(() =>
    this.transactions().filter((tx) => tx.isSelected).length,
  );

  readonly filteredTransactions = computed(() => {
    const filter = this.activeFilter();

    return this.transactions().filter((tx) => {
      if (filter === 'uncategorized') {
        return tx.assignment === 'uncategorized';
      }

      return tx.assignment === filter;
    });
  });

  readonly availableCategories = computed(() => {
    const term = this.categorySearch().trim().toLowerCase();

    const fullList = this.categories().map((category) => ({
      ...category,
      plannedAmount: this.categoryBudgetBySlug(category.slug),
    }));

    if (!term) {
      return fullList;
    }

    return fullList.filter((category) => category.name.toLowerCase().includes(term));
  });

  readonly usedCategories = computed(() =>
    this.categories().filter((category) => this.importedAmountBySlug(category.slug) > 0),
  );

  readonly assignedTotal = computed(() =>
    this.usedCategories().reduce(
      (sum, category) => sum + this.categoryBudgetBySlug(category.slug),
      0,
    ),
  );

  readonly importTotal = computed(() =>
    this.transactions().reduce((sum, tx) => sum + tx.amount, 0),
  );

  readonly allTransactionsProcessed = computed(() => this.transactions().length);

  async parseFile(file: File): Promise<void> {
    this.isParsing.set(true);
    this.isImportReady.set(false);
    this.fileName.set(file.name);

    const fileText = await file.text();
    const parsed = parseCsvMock(fileText);
    const categorizedTransactions = parsed.validTransactions.map((tx, index) =>
      this.classifyTransaction(tx, index),
    );

    this.transactions.set(categorizedTransactions);
    this.importPreviewRows.set(
      categorizedTransactions.slice(0, 5).map((tx) => ({
        id: tx.id,
        description: tx.description,
        dateLabel: formatDateShort(tx.occurredAt),
        amountLabel: formatCurrency(tx.amount),
      })),
    );

    this.importSummary.set({
      totalRows: parsed.totalRows,
      validRows: categorizedTransactions.length,
      invalidRows: parsed.invalidRows,
      dateRangeLabel: buildDateRangeLabel(categorizedTransactions),
    });

    this.categories.set(
      CATEGORY_CATALOG.map((category) => ({
        ...category,
        plannedAmount: Math.max(1, Math.round(this.importedAmountBySlugFromList(category.slug, categorizedTransactions))),
      })),
    );

    this.isParsing.set(false);
    this.isImportReady.set(true);
    this.activeFilter.set('auto');
    this.confirmAccepted.set(false);
  }

  setFilter(filter: CategoryFilter): void {
    this.activeFilter.set(filter);
  }

  toggleTransactionSelection(txId: string, selected: boolean): void {
    this.transactions.set(
      this.transactions().map((tx) =>
        tx.id === txId
          ? { ...tx, isSelected: selected }
          : tx,
      ),
    );
  }

  clearSelection(): void {
    this.transactions.set(this.transactions().map((tx) => ({ ...tx, isSelected: false })));
  }

  openCategorySheetForTransaction(txId: string): void {
    this.categorySheetTxIds.set([txId]);
    this.categorySearch.set('');
    this.isCategorySheetOpen.set(true);
  }

  openCategorySheetForSelected(): void {
    const selectedIds = this.transactions()
      .filter((tx) => tx.isSelected)
      .map((tx) => tx.id);

    if (!selectedIds.length) {
      return;
    }

    this.categorySheetTxIds.set(selectedIds);
    this.categorySearch.set('');
    this.isCategorySheetOpen.set(true);
  }

  closeCategorySheet(): void {
    this.isCategorySheetOpen.set(false);
    this.categorySheetTxIds.set([]);
    this.categorySearch.set('');
  }

  setCategorySearch(value: string): void {
    this.categorySearch.set(value);
  }

  assignCategoryToSheetSelection(slug: string | null): void {
    const ids = new Set(this.categorySheetTxIds());

    this.transactions.set(
      this.transactions().map((tx) => {
        if (!ids.has(tx.id)) {
          return tx;
        }

        const assignment: AssignmentType = slug ? 'manual' : 'uncategorized';

        return {
          ...tx,
          categorySlug: slug,
          assignment,
          isSelected: false,
        };
      }),
    );

    this.closeCategorySheet();
  }

  setMonthlyTarget(value: string): void {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    this.monthlyTarget.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }

  setCategoryBudget(slug: string, value: string): void {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));

    this.categories.set(
      this.categories().map((category) =>
        category.slug === slug
          ? {
              ...category,
              plannedAmount: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
            }
          : category,
      ),
    );
  }

  autoFillFromHistory(): void {
    this.categories.set(
      this.categories().map((category) => ({
        ...category,
        plannedAmount: Math.max(1, Math.round(this.importedAmountBySlug(category.slug))),
      })),
    );
  }

  distributeRemaining(): void {
    const target = this.monthlyTarget();
    if (target === null) {
      return;
    }

    const used = this.usedCategories();
    if (!used.length) {
      return;
    }

    const currentTotal = this.assignedTotal();
    const remaining = target - currentTotal;
    if (remaining <= 0) {
      return;
    }

    const importedTotal = used.reduce((sum, c) => sum + this.importedAmountBySlug(c.slug), 0);
    if (importedTotal <= 0) {
      return;
    }

    let distributed = 0;

    this.categories.set(
      this.categories().map((category, index, source) => {
        if (!used.some((usedCategory) => usedCategory.slug === category.slug)) {
          return category;
        }

        const weight = this.importedAmountBySlug(category.slug) / importedTotal;
        const isLastWeighted = source
          .filter((c) => used.some((usedCategory) => usedCategory.slug === c.slug))
          .slice(-1)[0]?.slug === category.slug;

        const add = isLastWeighted
          ? remaining - distributed
          : Math.round(remaining * weight);

        distributed += add;

        return {
          ...category,
          plannedAmount: category.plannedAmount + add,
        };
      }),
    );
  }

  toggleRule(ruleId: string, enabled: boolean): void {
    this.starterRules.set(
      this.starterRules().map((rule) =>
        rule.id === ruleId
          ? { ...rule, enabled }
          : rule,
      ),
    );
  }

  setConfirmAccepted(checked: boolean): void {
    this.confirmAccepted.set(checked);
  }

  categoryBySlug(slug: string | null): OnboardingCategory | null {
    if (!slug) {
      return null;
    }

    return this.categories().find((category) => category.slug === slug) ?? null;
  }

  categoryBudgetBySlug(slug: string): number {
    return this.categories().find((category) => category.slug === slug)?.plannedAmount ?? 0;
  }

  importedAmountBySlug(slug: string): number {
    return this.transactions()
      .filter((tx) => tx.categorySlug === slug)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  private importedAmountBySlugFromList(slug: string, transactions: readonly OnboardingTransaction[]): number {
    return transactions
      .filter((tx) => tx.categorySlug === slug)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  private classifyTransaction(
    tx: {
      id: string;
      description: string;
      occurredAt: Date;
      amount: number;
    },
    index: number,
  ): OnboardingTransaction {
    const text = tx.description.toLowerCase();
    const matchedSlug = findCategorySlug(text);

    return {
      id: `${tx.id}-${index}`,
      description: tx.description,
      occurredAt: tx.occurredAt,
      amount: tx.amount,
      categorySlug: matchedSlug,
      assignment: matchedSlug ? 'auto' : 'uncategorized',
      isSelected: false,
    };
  }
}

function parseCsvMock(content: string): {
  totalRows: number;
  invalidRows: number;
  validTransactions: Array<{
    id: string;
    description: string;
    occurredAt: Date;
    amount: number;
  }>;
} {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    return { totalRows: 0, invalidRows: 0, validTransactions: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => splitCsvLine(line, delimiter));
  const isHeader = looksLikeHeader(rows[0] ?? []);
  const dataRows = isHeader ? rows.slice(1) : rows;

  const validTransactions: Array<{
    id: string;
    description: string;
    occurredAt: Date;
    amount: number;
  }> = [];
  let invalidRows = 0;

  for (const row of dataRows) {
    const date = parseDateValue(row[0] ?? '');
    const amount = parseMoneyValue(row[1] ?? '');
    const description = (row[2] ?? row[3] ?? '').trim();

    if (!date || !Number.isFinite(amount) || !description || amount >= 0) {
      invalidRows += 1;
      continue;
    }

    validTransactions.push({
      id: cryptoRandomId(),
      description,
      occurredAt: date,
      amount: Math.abs(amount),
    });
  }

  return {
    totalRows: dataRows.length,
    invalidRows,
    validTransactions: validTransactions.sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
    ),
  };
}

function looksLikeHeader(row: readonly string[]): boolean {
  const first = (row[0] ?? '').toLowerCase();
  const second = (row[1] ?? '').toLowerCase();
  return first.includes('date') || second.includes('amount');
}

function detectDelimiter(line: string): ',' | ';' | '\t' {
  const comma = (line.match(/,/g) ?? []).length;
  const semicolon = (line.match(/;/g) ?? []).length;
  const tab = (line.match(/\t/g) ?? []).length;

  if (tab > comma && tab > semicolon) {
    return '\t';
  }

  return semicolon > comma ? ';' : ',';
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseMoneyValue(value: string): number {
  const normalized = value
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '');

  return Number(normalized);
}

function parseDateValue(value: string): Date | null {
  const clean = value.trim();
  if (!clean) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const date = new Date(`${clean}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const fallback = new Date(clean);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function findCategorySlug(text: string): string | null {
  if (/(whole foods|costco|grocery|groceries|trader joe|coles|woolworth|market)/.test(text)) {
    return 'groceries';
  }

  if (/(uber|lyft|shell|gas|fuel|transport|taxi|ride)/.test(text)) {
    return 'transport';
  }

  if (/(rent|mortgage|home)/.test(text)) {
    return 'home';
  }

  if (/(gym|fitness|equinox|goodlife|barbell)/.test(text)) {
    return 'gym';
  }

  if (/(amazon|target|shopping|afterpay|zara|gap)/.test(text)) {
    return 'shopping';
  }

  if (/(netflix|spotify|youtube|cinema|movie|amc|entertainment)/.test(text)) {
    return 'entertainment';
  }

  if (/(baby|kids|child)/.test(text)) {
    return 'baby';
  }

  if (/(health|pharmacy|cvs|walgreens|doctor|medical)/.test(text)) {
    return 'health';
  }

  return null;
}

function buildDateRangeLabel(transactions: readonly OnboardingTransaction[]): string {
  if (!transactions.length) {
    return '-';
  }

  const sorted = [...transactions].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const start = sorted[0]?.occurredAt;
  const end = sorted[sorted.length - 1]?.occurredAt;

  if (!start || !end) {
    return '-';
  }

  return `${formatDateShort(start)} - ${formatDateLong(end)}`;
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `tx-${Math.random().toString(36).slice(2, 12)}`;
}
