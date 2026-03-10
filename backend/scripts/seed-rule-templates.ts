import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { Prisma } from '../src/generated/prisma/client';

const EXCLUDED_SUBCATEGORY_SLUGS = new Set(['general', 'unexpected']);
const TEMPLATE_VERSION = 1;

type MerchantRuleSeed = {
  codeSuffix: string;
  categorySlug: string;
  subcategorySlug: string;
  name: string;
  merchants: string[];
};

const MERCHANT_RULE_SEEDS: MerchantRuleSeed[] = [
  {
    codeSuffix: 'uber-eats',
    categorySlug: 'dining',
    subcategorySlug: 'delivery',
    name: 'Auto Uber Eats',
    merchants: ['uber eats', 'ubereats'],
  },
  {
    codeSuffix: 'spotify',
    categorySlug: 'subscriptions',
    subcategorySlug: 'music',
    name: 'Auto Spotify',
    merchants: ['spotify'],
  },
  {
    codeSuffix: 'netflix',
    categorySlug: 'subscriptions',
    subcategorySlug: 'video-streaming',
    name: 'Auto Netflix',
    merchants: ['netflix'],
  },
  {
    codeSuffix: 'disney-plus',
    categorySlug: 'subscriptions',
    subcategorySlug: 'video-streaming',
    name: 'Auto Disney Plus',
    merchants: ['disney plus', 'disney+'],
  },
  {
    codeSuffix: 'kfc',
    categorySlug: 'dining',
    subcategorySlug: 'fast-food',
    name: 'Auto KFC',
    merchants: ['kfc'],
  },
  {
    codeSuffix: 'mcdonalds',
    categorySlug: 'dining',
    subcategorySlug: 'fast-food',
    name: 'Auto McDonalds',
    merchants: ['mcdonalds', "mcdonald's", 'mcdonald'],
  },
];

function parseArgs(argv: string[]): { reset: boolean } {
  return {
    reset: argv.includes('--reset'),
  };
}

function normalizeRegexTerm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
}

function buildRegexAlternation(terms: readonly string[]): string {
  return terms
    .map((term) => `\\b${normalizeRegexTerm(term)}\\b`)
    .join('|');
}

async function upsertTemplate(input: {
  prisma: PrismaClient;
  code: string;
  name: string;
  priority: number;
  conditionJson: Prisma.InputJsonValue;
  actionJson: Prisma.InputJsonValue;
  targetAppCategoryId: string;
  targetAppSubcategoryId: string;
}): Promise<'created' | 'updated'> {
  const existing = await input.prisma.appRuleTemplate.findUnique({
    where: {
      code_version: {
        code: input.code,
        version: TEMPLATE_VERSION,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await input.prisma.appRuleTemplate.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        type: 'AUTO_CLASSIFICATION',
        enabled: true,
        priority: input.priority,
        matchMode: 'KEYWORD_REGEX_HYBRID',
        conditionJson: input.conditionJson,
        actionJson: input.actionJson,
        targetAppCategoryId: input.targetAppCategoryId,
        targetAppSubcategoryId: input.targetAppSubcategoryId,
        isDefaultForNewUsers: true,
        status: 'ACTIVE',
      },
    });
    return 'updated';
  }

  await input.prisma.appRuleTemplate.create({
    data: {
      code: input.code,
      version: TEMPLATE_VERSION,
      name: input.name,
      type: 'AUTO_CLASSIFICATION',
      enabled: true,
      priority: input.priority,
      matchMode: 'KEYWORD_REGEX_HYBRID',
      conditionJson: input.conditionJson,
      actionJson: input.actionJson,
      targetAppCategoryId: input.targetAppCategoryId,
      targetAppSubcategoryId: input.targetAppSubcategoryId,
      isDefaultForNewUsers: true,
      status: 'ACTIVE',
    },
  });
  return 'created';
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const options = parseArgs(process.argv.slice(2));
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    if (options.reset) {
      await prisma.appRuleTemplate.deleteMany({
        where: {
          code: {
            startsWith: 'default.auto.',
          },
        },
      });
    }

    const appSubcategories = await prisma.appSubcategoryList.findMany({
      where: {
        isActive: true,
        slug: {
          notIn: Array.from(EXCLUDED_SUBCATEGORY_SLUGS),
        },
        appCategory: {
          isActive: true,
        },
      },
      orderBy: [{ appCategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        appCategory: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    let created = 0;
    let updated = 0;

    for (const subcategory of appSubcategories) {
      const code = `default.auto.${subcategory.appCategory.slug}.${subcategory.slug}.v${TEMPLATE_VERSION}`;
      const keyword = subcategory.name.toLowerCase();
      const regex = `\\b${normalizeRegexTerm(subcategory.name)}\\b`;

      const conditionJson: Prisma.InputJsonValue = {
        kind: 'merchant_text_match',
        matchMode: 'KEYWORD_REGEX_HYBRID',
        direction: subcategory.appCategory.slug === 'income' ? 'credit' : 'debit',
        keywords: [keyword],
        regex,
        minKeywordHits: 1,
        recurringOnly: false,
      };

      const actionJson: Prisma.InputJsonValue = {
        action: 'set_category',
        categoryId: subcategory.appCategory.id,
        subcategoryId: subcategory.id,
        classifier: 'system-rules-v2',
      };

      const status = await upsertTemplate({
        prisma,
        code,
        name: `Auto ${subcategory.name}`,
        priority: 100,
        conditionJson,
        actionJson,
        targetAppCategoryId: subcategory.appCategory.id,
        targetAppSubcategoryId: subcategory.id,
      });

      if (status === 'updated') {
        updated += 1;
      } else {
        created += 1;
      }
    }

    const subcategoryByKey = new Map(
      appSubcategories.map((subcategory) => [
        `${subcategory.appCategory.slug}:${subcategory.slug}`,
        subcategory,
      ]),
    );

    for (const merchantRule of MERCHANT_RULE_SEEDS) {
      const key = `${merchantRule.categorySlug}:${merchantRule.subcategorySlug}`;
      const targetSubcategory = subcategoryByKey.get(key);
      if (!targetSubcategory) {
        console.warn('[seed-rule-templates] Missing target subcategory for merchant rule', {
          key,
          codeSuffix: merchantRule.codeSuffix,
        });
        continue;
      }

      const normalizedKeywords = [...new Set(merchantRule.merchants.map((v) => v.toLowerCase()))];
      const regex = buildRegexAlternation(normalizedKeywords);
      const code = `default.auto.merchant.${merchantRule.codeSuffix}.v${TEMPLATE_VERSION}`;

      const conditionJson: Prisma.InputJsonValue = {
        kind: 'merchant_text_match',
        matchMode: 'KEYWORD_REGEX_HYBRID',
        direction: 'debit',
        keywords: normalizedKeywords,
        regex,
        minKeywordHits: 1,
        recurringOnly: false,
      };

      const actionJson: Prisma.InputJsonValue = {
        action: 'set_category',
        categoryId: targetSubcategory.appCategory.id,
        subcategoryId: targetSubcategory.id,
        classifier: 'system-rules-v2',
      };

      const status = await upsertTemplate({
        prisma,
        code,
        name: merchantRule.name,
        priority: 10,
        conditionJson,
        actionJson,
        targetAppCategoryId: targetSubcategory.appCategory.id,
        targetAppSubcategoryId: targetSubcategory.id,
      });

      if (status === 'updated') {
        updated += 1;
      } else {
        created += 1;
      }
    }

    console.info('[seed-rule-templates] Completed', {
      totalSubcategories: appSubcategories.length,
      merchantTemplates: MERCHANT_RULE_SEEDS.length,
      created,
      updated,
      reset: options.reset,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[seed-rule-templates] Failed', error);
  process.exit(1);
});
