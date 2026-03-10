import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const APP_CATEGORIES = [
  {
    slug: 'housing',
    name: 'Housing',
    ionIcon: 'home-outline',
    colorHex: '#3B82F6',
    sortOrder: 1,
  },
  {
    slug: 'utilities',
    name: 'Utilities',
    ionIcon: 'flash-outline',
    colorHex: '#14B8A6',
    sortOrder: 2,
  },
  {
    slug: 'groceries',
    name: 'Groceries',
    ionIcon: 'cart-outline',
    colorHex: '#22C55E',
    sortOrder: 3,
  },
  {
    slug: 'dining-cafes',
    name: 'Dining & Cafes',
    ionIcon: 'restaurant-outline',
    colorHex: '#F97316',
    sortOrder: 4,
  },
  {
    slug: 'transport',
    name: 'Transport',
    ionIcon: 'car-outline',
    colorHex: '#F59E0B',
    sortOrder: 5,
  },
  {
    slug: 'insurance',
    name: 'Insurance',
    ionIcon: 'shield-checkmark-outline',
    colorHex: '#0EA5E9',
    sortOrder: 6,
  },
  {
    slug: 'health-medical',
    name: 'Health & Medical',
    ionIcon: 'medkit-outline',
    colorHex: '#EF4444',
    sortOrder: 7,
  },
  {
    slug: 'fitness-sports',
    name: 'Fitness & Sports',
    ionIcon: 'barbell-outline',
    colorHex: '#8B5CF6',
    sortOrder: 8,
  },
  {
    slug: 'shopping',
    name: 'Shopping',
    ionIcon: 'bag-handle-outline',
    colorHex: '#EC4899',
    sortOrder: 9,
  },
  {
    slug: 'subscriptions',
    name: 'Subscriptions',
    ionIcon: 'repeat-outline',
    colorHex: '#6366F1',
    sortOrder: 10,
  },
  {
    slug: 'entertainment-leisure',
    name: 'Entertainment & Leisure',
    ionIcon: 'film-outline',
    colorHex: '#A855F7',
    sortOrder: 11,
  },
  {
    slug: 'travel',
    name: 'Travel',
    ionIcon: 'airplane-outline',
    colorHex: '#06B6D4',
    sortOrder: 12,
  },
  {
    slug: 'education',
    name: 'Education',
    ionIcon: 'school-outline',
    colorHex: '#2563EB',
    sortOrder: 13,
  },
  {
    slug: 'family-kids',
    name: 'Family & Kids',
    ionIcon: 'people-outline',
    colorHex: '#E11D48',
    sortOrder: 14,
  },
  {
    slug: 'debt-loans',
    name: 'Debt & Loans',
    ionIcon: 'card-outline',
    colorHex: '#DC2626',
    sortOrder: 15,
  },
  {
    slug: 'savings-investments',
    name: 'Savings & Investments',
    ionIcon: 'trending-up-outline',
    colorHex: '#10B981',
    sortOrder: 16,
  },
] as const;

const CATEGORY_ICON_BY_SLUG: Readonly<Record<string, string>> = {
  utilities: 'flash-outline',
  'health-medical': 'medkit-outline',
  insurance: 'shield-checkmark-outline',
  travel: 'airplane-outline',
  education: 'school-outline',
  'family-kids': 'people-outline',
  subscriptions: 'repeat-outline',
  'debt-loans': 'card-outline',
};

const APP_CATEGORIES_WITH_UPDATED_ICONS = APP_CATEGORIES.map((category) => ({
  ...category,
  ionIcon: CATEGORY_ICON_BY_SLUG[category.slug] ?? category.ionIcon,
}));

async function main(): Promise<void> {
  for (const c of APP_CATEGORIES_WITH_UPDATED_ICONS) {
    await prisma.appCategoryList.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        ionIcon: c.ionIcon,
        colorHex: c.colorHex,
        sortOrder: c.sortOrder,
        isActive: true,
      },
      create: {
        slug: c.slug,
        name: c.name,
        ionIcon: c.ionIcon,
        colorHex: c.colorHex,
        sortOrder: c.sortOrder,
        isActive: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
