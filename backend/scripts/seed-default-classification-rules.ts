import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { Prisma } from '../src/generated/prisma/client';

type RuleDirection = 'debit' | 'credit';

type KeywordRegexMatcher = {
  keyword: string;
  regex: string;
};

type RuleSeedInput = {
  userId?: string;
  reset: boolean;
  dryRun: boolean;
};

type AppSubcategoryRecord = {
  categorySlug: string;
  categoryName: string;
  subcategorySlug: string;
  subcategoryName: string;
};

const EXCLUDED_SUBCATEGORY_SLUGS = new Set(['general', 'unexpected']);

const INCOME_RULES: Array<{
  targetSubcategorySlug: string;
  keyword: string;
  regex: string;
}> = [
  {
    targetSubcategorySlug: 'salary',
    keyword: 'payroll salary wages',
    regex: '\\b(payroll|salary|wages?)\\b',
  },
  {
    targetSubcategorySlug: 'freelance',
    keyword: 'freelance contractor invoice paid',
    regex:
      '\\b(freelance|contract(or)?|invoice\\s?paid|client\\s?payment)\\b',
  },
  {
    targetSubcategorySlug: 'interest',
    keyword: 'interest paid interest credit',
    regex:
      '\\b(interest\\s?(paid|credit)|savings\\s?interest|deposit\\s?interest)\\b',
  },
  {
    targetSubcategorySlug: 'refunds',
    keyword: 'tax refund merchant refund',
    regex:
      '\\b(tax\\s?refund|merchant\\s?refund|refund\\s?(processed|received))\\b',
  },
  {
    targetSubcategorySlug: 'other-income',
    keyword: 'bonus commission incentive',
    regex: '\\b(bonus|commission|performance\\s?pay|incentive)\\b',
  },
  {
    targetSubcategorySlug: 'other-income',
    keyword: 'payment received deposit received',
    regex:
      '\\b(payment\\s?received|deposit\\s?received|incoming\\s?transfer|credit\\s?transfer)\\b',
  },
];

const CATEGORY_CONTEXT_TERMS: Record<string, string[]> = {
  housing: ['property', 'home', 'lease', 'residential', 'landlord', 'tenant'],
  utilities: ['utility', 'bill', 'account', 'service', 'monthly', 'provider'],
  groceries: ['supermarket', 'grocery', 'food', 'market', 'fresh', 'household'],
  dining: ['restaurant', 'cafe', 'food', 'meal', 'eat', 'delivery'],
  transport: ['transport', 'commute', 'vehicle', 'road', 'fare', 'trip'],
  'health-medical': ['medical', 'health', 'clinic', 'pharmacy', 'care', 'treatment'],
  insurance: ['policy', 'premium', 'cover', 'insurer', 'insurance', 'renewal'],
  shopping: ['retail', 'store', 'purchase', 'online', 'shop', 'order'],
  entertainment: ['entertainment', 'event', 'leisure', 'media', 'ticket', 'streaming'],
  travel: ['travel', 'trip', 'booking', 'itinerary', 'flight', 'accommodation'],
  education: ['education', 'course', 'learning', 'school', 'study', 'tuition'],
  'family-kids': ['family', 'kids', 'child', 'parent', 'school', 'care'],
  pets: ['pet', 'animal', 'vet', 'grooming', 'food', 'care'],
  subscriptions: ['subscription', 'recurring', 'membership', 'plan', 'monthly', 'auto'],
  'debt-loans': ['loan', 'debt', 'repayment', 'credit', 'interest', 'instalment'],
  'savings-investments': ['savings', 'investment', 'fund', 'deposit', 'portfolio', 'wealth'],
  'personal-care': ['care', 'beauty', 'wellness', 'hygiene', 'salon', 'personal'],
  'taxes-fees': ['tax', 'fee', 'charge', 'government', 'service', 'levy'],
  'gifts-donations': ['gift', 'donation', 'charity', 'occasion', 'present', 'support'],
  'business-expenses': ['business', 'office', 'client', 'professional', 'company', 'work'],
};

const CATEGORY_MERCHANT_TERMS: Record<string, string[]> = {
  housing: ['ray white', 'lj hooker', 'domain', 'realestate', 'rent'],
  utilities: ['origin', 'agl', 'energy australia', 'telstra', 'optus'],
  groceries: ['woolworths', 'coles', 'aldi', 'iga', 'costco'],
  dining: ['uber eats', 'doordash', 'menu log', 'mcdonalds', 'kfc'],
  transport: ['uber', 'didi', 'translink', 'myki', 'opal'],
  'health-medical': ['chemist warehouse', 'terrywhite', 'priceline', 'medibank', 'bupa'],
  insurance: ['aami', 'allianz', 'nrma', 'suncorp', 'qbe'],
  shopping: ['amazon', 'ebay', 'kmart', 'target', 'big w'],
  entertainment: ['netflix', 'spotify', 'event cinemas', 'ticketek', 'foxtel'],
  travel: ['qantas', 'jetstar', 'booking.com', 'expedia', 'airbnb'],
  education: ['udemy', 'coursera', 'tafensw', 'pearson', 'campus'],
  'family-kids': ['childcare', 'kindy', 'school', 'toyworld', 'baby bunting'],
  pets: ['petbarn', 'greencross', 'vet', 'pet circle', 'my pet'],
  subscriptions: ['apple', 'google', 'microsoft', 'adobe', 'canva'],
  'debt-loans': ['visa', 'mastercard', 'anz', 'nab', 'commbank'],
  'savings-investments': ['vanguard', 'betashares', 'stake', 'commsec', 'raiz'],
  'personal-care': ['sephora', 'mecca', 'chemist', 'hairhouse', 'barber'],
  'taxes-fees': ['ato', 'revenue', 'council', 'gov', 'service nsw'],
  'gifts-donations': ['gofundme', 'charity', 'salvation army', 'red cross', 'donation'],
  'business-expenses': ['officeworks', 'xero', 'atlassian', 'aws', 'google workspace'],
};

const SUBCATEGORY_TERM_OVERRIDES: Record<string, string[]> = {
  'hoa-fees': ['hoa', 'strata', 'body corporate', 'levy', 'owners corp'],
  'home-maintenance': ['maintenance', 'repair', 'plumber', 'electrician', 'handyman'],
  'home-supplies': ['hardware', 'supplies', 'tools', 'diy', 'home improvement'],
  'property-taxes': ['property tax', 'council rates', 'land tax', 'rates', 'municipal'],
  'home-insurance': ['home insurance', 'building insurance', 'contents insurance', 'policy', 'premium'],
  'credit-card-payment': ['credit card payment', 'card repayment', 'credit repayment', 'card bill', 'card due'],
  'personal-loan': ['personal loan', 'loan repayment', 'loan instalment', 'lender payment', 'loan due'],
  'mortgage-payment': ['mortgage payment', 'home loan', 'mortgage repayment', 'principal interest', 'loan repayment'],
  'car-loan': ['car loan', 'auto loan', 'vehicle loan', 'car finance', 'loan repayment'],
  'student-loan': ['student loan', 'education loan', 'hecs', 'study loan', 'loan repayment'],
  'interest-charges': ['interest charge', 'finance charge', 'interest fee', 'interest payment', 'interest debit'],
  'late-fees': ['late fee', 'overdue fee', 'penalty fee', 'default fee', 'late charge'],
  'debt-consolidation': ['debt consolidation', 'consolidation loan', 'debt refinance', 'refinance', 'consolidated payment'],
  'high-yield-savings': ['high yield savings', 'high interest savings', 'savings account', 'interest savings', 'deposit savings'],
  'term-deposit': ['term deposit', 'fixed deposit', 'time deposit', 'maturity', 'deposit term'],
  'micro-investing': ['micro investing', 'round up', 'roundup', 'fractional', 'small investment'],
  'investment-fees': ['investment fee', 'brokerage fee', 'management fee', 'platform fee', 'admin fee'],
  'office-supplies': ['office supplies', 'stationery', 'printer', 'paper', 'toner'],
  'business-software': ['business software', 'software subscription', 'saas', 'license', 'cloud software'],
  'business-travel': ['business travel', 'work travel', 'flight', 'hotel', 'trip'],
  'client-meals': ['client meal', 'business lunch', 'business dinner', 'entertainment expense', 'meal'],
  hosting: ['hosting', 'domain', 'dns', 'server', 'cloud host'],
};

function parseArgs(argv: string[]): RuleSeedInput {
  const options: RuleSeedInput = {
    reset: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--userId' || arg === '--user-id') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --userId');
      options.userId = value;
      index += 1;
      continue;
    }

    if (arg === '--reset') {
      options.reset = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
  }

  return options;
}

function printUsage(): void {
  console.info(`
Usage:
  npm run seed:rules:defaults -- --userId <uuid>
  npm run seed:rules:defaults -- --userId <uuid> --reset
  npm run seed:rules:defaults -- --userId <uuid> --dry-run
`);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRegexTerm(value: string): string {
  return escapeRegex(value.trim().toLowerCase())
    .replace(/\s+/g, '\\s+')
    .replace(/-/g, '[-\\s]?')
    .replace(/\//g, '[/\\s]?');
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function tokenCandidatesFromText(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function createLookaheadRegex(terms: string[]): string {
  const lookaheads = terms
    .map((term) => `(?=.*\\b${toRegexTerm(term)}\\b)`)
    .join('');
  return `${lookaheads}.*`;
}

function normalizeKeywords(rawKeyword: string): string[] {
  return uniq(
    rawKeyword
      .split(/\s+/)
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token.length >= 2),
  );
}

function trimRuleName(value: string): string {
  return value.length > 120 ? value.slice(0, 120) : value;
}

function addMatcher(
  target: KeywordRegexMatcher[],
  matcher: KeywordRegexMatcher,
): void {
  if (
    target.some(
      (item) => item.keyword === matcher.keyword && item.regex === matcher.regex,
    )
  ) {
    return;
  }
  target.push(matcher);
}

function generatedMatchersForSubcategory(input: {
  categorySlug: string;
  categoryName: string;
  subcategorySlug: string;
  subcategoryName: string;
}): KeywordRegexMatcher[] {
  const categoryContextTerms =
    CATEGORY_CONTEXT_TERMS[input.categorySlug] ??
    tokenCandidatesFromText(input.categoryName);

  const categoryMerchantTerms = CATEGORY_MERCHANT_TERMS[input.categorySlug] ?? [];

  const subcategoryOverrideTerms = SUBCATEGORY_TERM_OVERRIDES[input.subcategorySlug] ?? [];

  const subcategoryTerms = uniq([
    normalizeToken(input.subcategoryName),
    ...subcategoryOverrideTerms.map(normalizeToken),
    ...tokenCandidatesFromText(input.subcategoryName),
    ...tokenCandidatesFromText(input.subcategorySlug),
  ]).slice(0, 8);

  const primarySubcategoryTerm =
    subcategoryTerms[0] ?? normalizeToken(input.subcategoryName);

  const matchers: KeywordRegexMatcher[] = [];

  // Exact phrase matcher.
  addMatcher(matchers, {
    keyword: input.subcategoryName.toLowerCase(),
    regex: `\\b${toRegexTerm(input.subcategoryName)}\\b`,
  });

  // Core subcategory terms.
  for (const subTerm of subcategoryTerms.slice(0, 4)) {
    addMatcher(matchers, {
      keyword: subTerm,
      regex: `\\b${toRegexTerm(subTerm)}\\b`,
    });
  }

  // Subcategory + category context lookaheads.
  for (const contextTerm of categoryContextTerms.slice(0, 5)) {
    addMatcher(matchers, {
      keyword: `${primarySubcategoryTerm} ${contextTerm}`,
      regex: createLookaheadRegex([primarySubcategoryTerm, contextTerm]),
    });
  }

  // Merchant + subcategory precision lookaheads.
  for (const merchantTerm of categoryMerchantTerms.slice(0, 5)) {
    addMatcher(matchers, {
      keyword: `${merchantTerm} ${primarySubcategoryTerm}`,
      regex: createLookaheadRegex([merchantTerm, primarySubcategoryTerm]),
    });
  }

  // Fill deterministic variants if still below 15.
  const fillerTerms = uniq([
    ...subcategoryTerms,
    ...categoryContextTerms,
    ...categoryMerchantTerms,
    input.categorySlug,
  ]);

  let fillerIndex = 0;
  while (matchers.length < 15) {
    const left = fillerTerms[fillerIndex % fillerTerms.length] ?? primarySubcategoryTerm;
    const right =
      fillerTerms[(fillerIndex + 3) % fillerTerms.length] ?? input.categorySlug;

    addMatcher(matchers, {
      keyword: `${left} ${right}`,
      regex: createLookaheadRegex([left, right]),
    });

    fillerIndex += 1;

    if (fillerIndex > 200) {
      // Guaranteed escape hatch.
      addMatcher(matchers, {
        keyword: `${primarySubcategoryTerm} ${input.categorySlug}`,
        regex: createLookaheadRegex([primarySubcategoryTerm, input.categorySlug]),
      });
    }
  }

  return matchers.slice(0, 15);
}

async function fetchSpecificAppSubcategories(
  prisma: PrismaClient,
): Promise<AppSubcategoryRecord[]> {
  const rows = await prisma.appSubcategoryList.findMany({
    where: {
      isActive: true,
      slug: {
        notIn: Array.from(EXCLUDED_SUBCATEGORY_SLUGS),
      },
    },
    orderBy: [{ appCategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    select: {
      slug: true,
      name: true,
      appCategory: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    categorySlug: row.appCategory.slug,
    categoryName: row.appCategory.name,
    subcategorySlug: row.slug,
    subcategoryName: row.name,
  }));
}

function toSeedRules(input: {
  appSubcategories: AppSubcategoryRecord[];
}): Array<{
  name: string;
  priority: number;
  conditionJson: Prisma.InputJsonValue;
  actionJson: Prisma.InputJsonValue;
}> {
  const rules: Array<{
    name: string;
    priority: number;
    conditionJson: Prisma.InputJsonValue;
    actionJson: Prisma.InputJsonValue;
  }> = [];

  let priorityCursor = 1000;

  for (const appSubcategory of input.appSubcategories) {
    if (appSubcategory.categorySlug === 'income') {
      continue;
    }

    const generatedMatchers = generatedMatchersForSubcategory(appSubcategory);

    for (const [matcherIndex, matcher] of generatedMatchers.entries()) {
      const minKeywordHits = matcher.regex.includes('(?=') ? 2 : 1;
      const ruleName = trimRuleName(
        `[SYSTEM][${appSubcategory.categorySlug}/${appSubcategory.subcategorySlug}]#${String(
          matcherIndex + 1,
        ).padStart(2, '0')} ${matcher.keyword}`,
      );

      rules.push({
        name: ruleName,
        priority: priorityCursor,
        conditionJson: {
          kind: 'merchant_text_match',
          direction: 'debit',
          keywords: normalizeKeywords(matcher.keyword),
          regex: matcher.regex,
          minKeywordHits,
        },
        actionJson: {
          categorySlug: appSubcategory.categorySlug,
          subcategorySlug: appSubcategory.subcategorySlug,
          classifier: 'system-rules-v2',
        },
      });

      priorityCursor += 1;
    }
  }

  // Income explicitly capped at 6 rules as requested.
  for (const [index, incomeRule] of INCOME_RULES.entries()) {
    const ruleName = trimRuleName(
      `[SYSTEM][income/${incomeRule.targetSubcategorySlug}]#${String(index + 1).padStart(2, '0')} ${incomeRule.keyword}`,
    );

    rules.push({
      name: ruleName,
      priority: 10 + index,
      conditionJson: {
        kind: 'merchant_text_match',
        direction: 'credit',
        keywords: normalizeKeywords(incomeRule.keyword),
        regex: incomeRule.regex,
        minKeywordHits: 1,
      },
      actionJson: {
        categorySlug: 'income',
        subcategorySlug: incomeRule.targetSubcategorySlug,
        classifier: 'system-rules-v2',
      },
    });
  }

  return rules;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const options = parseArgs(process.argv.slice(2));
  if (!options.userId) {
    printUsage();
    throw new Error('Missing --userId');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const appSubcategories = await fetchSpecificAppSubcategories(prisma);
    const targetUserId = options.userId;
    const seedRules = toSeedRules({ appSubcategories });

    const nonIncomeSubcategoryCount = appSubcategories.filter(
      (sub) => sub.categorySlug !== 'income',
    ).length;

    const expectedGeneratedDebitRules = nonIncomeSubcategoryCount * 15;

    if (seedRules.length !== expectedGeneratedDebitRules + INCOME_RULES.length) {
      throw new Error(
        `Rule count mismatch. Expected ${
          expectedGeneratedDebitRules + INCOME_RULES.length
        }, got ${seedRules.length}.`,
      );
    }

    const existingRules = await prisma.rule.findMany({
      where: {
        userId: targetUserId,
        createdBy: 'SYSTEM',
        type: 'AUTO_CLASSIFICATION',
      },
      select: { id: true, name: true },
    });

    console.info('[seed-rules] Summary', {
      userId: targetUserId,
      subcategoriesTotal: appSubcategories.length,
      nonIncomeSubcategoryCount,
      generatedDebitRules: expectedGeneratedDebitRules,
      incomeRules: INCOME_RULES.length,
      totalSeedRules: seedRules.length,
      existingSystemRules: existingRules.length,
      reset: options.reset,
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (options.reset) {
        await tx.rule.deleteMany({
          where: {
            userId: targetUserId,
            createdBy: 'SYSTEM',
            type: 'AUTO_CLASSIFICATION',
            name: { startsWith: '[SYSTEM][' },
          },
        });
      }

      const existingAfterReset = await tx.rule.findMany({
        where: {
          userId: targetUserId,
          createdBy: 'SYSTEM',
          type: 'AUTO_CLASSIFICATION',
          name: { in: seedRules.map((rule) => rule.name) },
        },
        select: { id: true, name: true },
      });

      const existingByName = new Map(
        existingAfterReset.map((rule) => [rule.name, rule.id]),
      );

      for (const rule of seedRules) {
        const existingId = existingByName.get(rule.name);

        if (existingId) {
          await tx.rule.update({
            where: { id: existingId },
            data: {
              enabled: true,
              priority: rule.priority,
              conditionJson: rule.conditionJson,
              actionJson: rule.actionJson,
            },
          });
          continue;
        }

        await tx.rule.create({
          data: {
            userId: targetUserId,
            name: rule.name,
            type: 'AUTO_CLASSIFICATION',
            enabled: true,
            priority: rule.priority,
            conditionJson: rule.conditionJson,
            actionJson: rule.actionJson,
            createdBy: 'SYSTEM',
          },
        });
      }
    });

    console.info('[seed-rules] Completed successfully');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[seed-rules] Failed', error);
  process.exit(1);
});
