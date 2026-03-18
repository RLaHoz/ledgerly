import {
  OnboardingCategory,
  OnboardingSubcategory,
  OnboardingTransaction,
} from '../models/onboarding.models';
import { formatDateLong, formatDateShort, formatMoney } from '../utils/onboarding-format.util';
import {
  ALLOWED_ONBOARDING_ICONS,
  CATEGORY_CATALOG,
  DEFAULT_CATEGORY_ICON,
  DEFAULT_COLOR_HEX,
  DEFAULT_SUBCATEGORY_ICON,
  ParsedCsvTransaction,
} from './onboarding-wizard.types';

export function classifyTransaction(
  transaction: ParsedCsvTransaction,
  index: number,
): OnboardingTransaction {
  const text = transaction.description.toLowerCase();
  const matchedSlug = findCategorySlug(text);
  const matchedCategory = matchedSlug
    ? CATEGORY_CATALOG.find((category) => category.slug === matchedSlug) ?? null
    : null;
  const matchedSubcategorySlug = matchedSlug ? `${matchedSlug}-general` : null;

  return {
    id: `${transaction.id}-${index}`,
    description: transaction.description,
    occurredAt: transaction.occurredAt,
    amount: transaction.amount,
    categoryId: matchedCategory?.id ?? null,
    categorySlug: matchedSlug,
    subcategoryId: matchedCategory ? `mock-subcategory-${matchedSlug}-general` : null,
    subcategorySlug: matchedSubcategorySlug,
    assignment: matchedCategory ? 'auto' : 'uncategorized',
    isSelected: false,
  };
}

export function buildMockCatalogCategories(): readonly OnboardingCategory[] {
  return CATEGORY_CATALOG.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    iconName: category.iconName,
    colorHex: category.colorHex,
    subcategories: [
      {
        id: `mock-subcategory-${category.slug}-general`,
        categoryId: category.id,
        slug: `${category.slug}-general`,
        name: `${category.name} General`,
        iconName: DEFAULT_SUBCATEGORY_ICON,
        colorHex: category.colorHex,
      },
    ],
    plannedAmount: 0,
  }));
}

export function applyPlannedAmountsToCategories(
  categories: readonly OnboardingCategory[],
  importedTotalsBySlug: ReadonlyMap<string, number>,
): readonly OnboardingCategory[] {
  return categories.map((category) => ({
    ...category,
    plannedAmount: Math.max(1, Math.round(importedTotalsBySlug.get(category.slug) ?? 0)),
  }));
}

export function parseCsvMock(content: string): {
  totalRows: number;
  invalidRows: number;
  validTransactions: ParsedCsvTransaction[];
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

  const validTransactions: ParsedCsvTransaction[] = [];
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

export function buildDateRangeLabel(transactions: readonly OnboardingTransaction[]): string {
  if (!transactions.length) {
    return '-';
  }

  const sorted = [...transactions].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );
  const start = sorted[0]?.occurredAt;
  const end = sorted[sorted.length - 1]?.occurredAt;

  if (!start || !end) {
    return '-';
  }

  return `${formatDateShort(start)} - ${formatDateLong(end)}`;
}

export function buildTransactionRowPresentation(input: {
  transaction: OnboardingTransaction;
  categoriesById: ReadonlyMap<string, OnboardingCategory>;
  categoriesBySlug: ReadonlyMap<string, OnboardingCategory>;
  subcategoriesById: ReadonlyMap<string, OnboardingSubcategory>;
}): {
  dateLabel: string;
  amountLabel: string;
  categoryName: string;
  categoryIcon: string;
} {
  const subcategory = input.transaction.subcategoryId
    ? input.subcategoriesById.get(input.transaction.subcategoryId) ?? null
    : null;
  const category = input.transaction.categoryId
    ? input.categoriesById.get(input.transaction.categoryId) ?? null
    : null;
  const categoryBySlug = input.transaction.categorySlug
    ? input.categoriesBySlug.get(input.transaction.categorySlug) ?? null
    : null;

  return {
    dateLabel: formatDateShort(input.transaction.occurredAt),
    amountLabel: formatMoney(input.transaction.amount),
    categoryName: subcategory?.name ?? category?.name ?? categoryBySlug?.name ?? 'Uncategorized',
    categoryIcon:
      subcategory?.iconName ?? category?.iconName ?? categoryBySlug?.iconName ?? 'alert-circle-outline',
  };
}

export function normalizeCategoryName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length ? trimmed : 'Other';
}

export function normalizeSlug(slug: string, fallbackName: string): string {
  const normalizedSlug = slugify(slug);
  if (normalizedSlug.length > 0) {
    return normalizedSlug;
  }

  return slugify(fallbackName) || 'other';
}

export function normalizeColorHex(value: string): string {
  const trimmed = value.trim();
  return /^#[A-Fa-f0-9]{6}$/.test(trimmed) ? trimmed : DEFAULT_COLOR_HEX;
}

export function sanitizeIconName(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return fallback;
  }

  return ALLOWED_ONBOARDING_ICONS.has(trimmed) ? trimmed : fallback;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseMoneyValue(value: string): number {
  const normalized = value
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .replace(/[()]/g, '');
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return value.includes('(') && value.includes(')') ? -Math.abs(parsed) : parsed;
}

export function parseDecimalInput(value: string): number {
  return Number(value.replace(/[^0-9.]/g, ''));
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
    return createValidatedUtcDate(year, month, day);
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split('-').map(Number);
    return createValidatedUtcDate(year, month, day);
  }

  const fallback = new Date(clean);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function createValidatedUtcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValidDate ? date : null;
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

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `tx-${Math.random().toString(36).slice(2, 12)}`;
}
