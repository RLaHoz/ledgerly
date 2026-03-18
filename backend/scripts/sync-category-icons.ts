import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

type CategoryIconUpdate = {
  label: string;
  slugs: readonly string[];
  names: readonly string[];
  ionIcon: string;
};

const CATEGORY_ICON_UPDATES: readonly CategoryIconUpdate[] = [
  {
    label: 'Utility',
    slugs: ['utility', 'utilities'],
    names: ['Utility', 'Utilities'],
    ionIcon: 'flash-outline',
  },
  {
    label: 'Health & Medical',
    slugs: ['health-medical'],
    names: ['Health & Medical', 'Health&Medical'],
    ionIcon: 'medkit-outline',
  },
  {
    label: 'Insurance',
    slugs: ['insurance'],
    names: ['Insurance'],
    ionIcon: 'shield-checkmark-outline',
  },
  {
    label: 'Travel',
    slugs: ['travel'],
    names: ['Travel'],
    ionIcon: 'airplane-outline',
  },
  {
    label: 'Education',
    slugs: ['education'],
    names: ['Education'],
    ionIcon: 'school-outline',
  },
  {
    label: 'Family & Kids',
    slugs: ['family-kids'],
    names: ['Family & Kids', 'Family&Kids'],
    ionIcon: 'people-outline',
  },
  {
    label: 'Pets',
    slugs: ['pets'],
    names: ['Pets'],
    ionIcon: 'paw-outline',
  },
  {
    label: 'Subscriptions',
    slugs: ['subscriptions'],
    names: ['Subscriptions'],
    ionIcon: 'repeat-outline',
  },
  {
    label: 'Debt & Loans',
    slugs: ['debt-loans'],
    names: ['Debt & Loans', 'Debt&Loans'],
    ionIcon: 'card-outline',
  },
  {
    label: 'Personal Care',
    slugs: ['personal-care'],
    names: ['Personal Care'],
    ionIcon: 'body-outline',
  },
  {
    label: 'Gift & Donations',
    slugs: ['gift-donations', 'gifts-donations'],
    names: ['Gift & Donations', 'Gifts & Donations', 'Gift&Donations'],
    ionIcon: 'gift-outline',
  },
  {
    label: 'Business Expenses',
    slugs: ['business-expenses'],
    names: ['Business Expenses'],
    ionIcon: 'briefcase-outline',
  },
  {
    label: 'Incomes',
    slugs: ['income', 'incomes'],
    names: ['Income', 'Incomes'],
    ionIcon: 'cash-outline',
  },
];

function buildCategoryFilter(update: CategoryIconUpdate) {
  return {
    OR: [
      { slug: { in: [...update.slugs] } },
      { name: { in: [...update.names] } },
    ],
  };
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const dryRun = process.argv.includes('--dry-run');

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    let totalAppCategories = 0;
    let totalUserCategories = 0;

    for (const update of CATEGORY_ICON_UPDATES) {
      const where = buildCategoryFilter(update);

      if (dryRun) {
        const [appCount, userCount] = await Promise.all([
          prisma.appCategoryList.count({ where }),
          prisma.budgetCategory.count({ where }),
        ]);

        console.info('[sync-category-icons] dry-run', {
          category: update.label,
          ionIcon: update.ionIcon,
          appCategoriesMatched: appCount,
          userCategoriesMatched: userCount,
        });
        continue;
      }

      const [appResult, userResult] = await Promise.all([
        prisma.appCategoryList.updateMany({
          where,
          data: { ionIcon: update.ionIcon },
        }),
        prisma.budgetCategory.updateMany({
          where,
          data: { ionIcon: update.ionIcon },
        }),
      ]);

      totalAppCategories += appResult.count;
      totalUserCategories += userResult.count;

      console.info('[sync-category-icons] updated', {
        category: update.label,
        ionIcon: update.ionIcon,
        appCategoriesUpdated: appResult.count,
        userCategoriesUpdated: userResult.count,
      });
    }

    if (!dryRun) {
      console.info('[sync-category-icons] completed', {
        totalAppCategoriesUpdated: totalAppCategories,
        totalUserCategoriesUpdated: totalUserCategories,
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[sync-category-icons] failed', error);
  process.exitCode = 1;
});
