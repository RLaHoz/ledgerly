import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

type CategoryBlueprint = {
  slug: string;
  name: string;
  ionIcon: string;
  colorHex: string;
  subcategories: string[];
};

const EXTRA_SUBCATEGORIES_PER_CATEGORY = ['General', 'Unexpected'];

const CATEGORY_BLUEPRINTS: CategoryBlueprint[] = [
  {
    slug: 'housing',
    name: 'Housing',
    ionIcon: 'home-outline',
    colorHex: '#3B82F6',
    subcategories: [
      'Rent',
      'Mortgage',
      'HOA Fees',
      'Home Maintenance',
      'Home Supplies',
      'Property Taxes',
      'Home Insurance',
      'Furniture',
    ],
  },
  {
    slug: 'utilities',
    name: 'Utilities',
    ionIcon: 'flash-outline',
    colorHex: '#14B8A6',
    subcategories: [
      'Electricity',
      'Gas',
      'Water',
      'Internet',
      'Mobile Phone',
      'Trash Collection',
      'Sewer',
      'Utility Setup Fees',
    ],
  },
  {
    slug: 'groceries',
    name: 'Groceries',
    ionIcon: 'cart-outline',
    colorHex: '#22C55E',
    subcategories: [
      'Supermarket',
      'Fresh Produce',
      'Butcher',
      'Bakery',
      'Household Goods',
      'Beverages',
      'Snacks',
      'Bulk Purchases',
    ],
  },
  {
    slug: 'dining',
    name: 'Dining',
    ionIcon: 'restaurant-outline',
    colorHex: '#F97316',
    subcategories: [
      'Coffee',
      'Lunch',
      'Dinner',
      'Fast Food',
      'Delivery',
      'Takeaway',
      'Brunch',
      'Work Meals',
    ],
  },
  {
    slug: 'transport',
    name: 'Transport',
    ionIcon: 'car-outline',
    colorHex: '#F59E0B',
    subcategories: [
      'Fuel',
      'Public Transport',
      'Ride Share',
      'Parking',
      'Tolls',
      'Car Service',
      'Car Registration',
      'Car Wash',
    ],
  },
  {
    slug: 'health-medical',
    name: 'Health & Medical',
    ionIcon: 'medkit-outline',
    colorHex: '#EF4444',
    subcategories: [
      'Doctor',
      'Dental',
      'Pharmacy',
      'Specialist',
      'Lab Tests',
      'Physiotherapy',
      'Mental Health',
      'Medical Devices',
    ],
  },
  {
    slug: 'insurance',
    name: 'Insurance',
    ionIcon: 'shield-checkmark-outline',
    colorHex: '#0EA5E9',
    subcategories: [
      'Health Insurance',
      'Car Insurance',
      'Home Insurance',
      'Life Insurance',
      'Travel Insurance',
      'Pet Insurance',
      'Income Protection',
      'Other Insurance',
    ],
  },
  {
    slug: 'shopping',
    name: 'Shopping',
    ionIcon: 'bag-handle-outline',
    colorHex: '#EC4899',
    subcategories: [
      'Clothing',
      'Shoes',
      'Electronics',
      'Home Decor',
      'Beauty',
      'Accessories',
      'Online Orders',
      'Department Store',
    ],
  },
  {
    slug: 'entertainment',
    name: 'Entertainment',
    ionIcon: 'film-outline',
    colorHex: '#A855F7',
    subcategories: [
      'Movies',
      'Concerts',
      'Games',
      'Events',
      'Streaming',
      'Books',
      'Hobbies',
      'Night Out',
    ],
  },
  {
    slug: 'travel',
    name: 'Travel',
    ionIcon: 'airplane-outline',
    colorHex: '#06B6D4',
    subcategories: [
      'Flights',
      'Hotels',
      'Car Rental',
      'Travel Food',
      'Travel Activities',
      'Travel Insurance',
      'Local Transport',
      'Luggage & Gear',
    ],
  },
  {
    slug: 'education',
    name: 'Education',
    ionIcon: 'school-outline',
    colorHex: '#2563EB',
    subcategories: [
      'Course Fees',
      'Books',
      'Supplies',
      'Workshops',
      'Certifications',
      'Online Learning',
      'Tutoring',
      'Software for Study',
    ],
  },
  {
    slug: 'family-kids',
    name: 'Family & Kids',
    ionIcon: 'people-outline',
    colorHex: '#E11D48',
    subcategories: [
      'Childcare',
      'School Costs',
      'Kids Activities',
      'Toys',
      'Baby Supplies',
      'Family Outings',
      'School Uniforms',
      'Allowances',
    ],
  },
  {
    slug: 'pets',
    name: 'Pets',
    ionIcon: 'paw-outline',
    colorHex: '#84CC16',
    subcategories: [
      'Pet Food',
      'Vet',
      'Grooming',
      'Pet Insurance',
      'Pet Toys',
      'Pet Boarding',
      'Pet Medication',
      'Pet Accessories',
    ],
  },
  {
    slug: 'subscriptions',
    name: 'Subscriptions',
    ionIcon: 'repeat-outline',
    colorHex: '#6366F1',
    subcategories: [
      'Music',
      'Video Streaming',
      'Cloud Storage',
      'Productivity Tools',
      'News',
      'Gym Membership',
      'Software Licenses',
      'App Subscriptions',
    ],
  },
  {
    slug: 'debt-loans',
    name: 'Debt & Loans',
    ionIcon: 'card-outline',
    colorHex: '#DC2626',
    subcategories: [
      'Credit Card Payment',
      'Personal Loan',
      'Mortgage Payment',
      'Car Loan',
      'Student Loan',
      'Interest Charges',
      'Late Fees',
      'Debt Consolidation',
    ],
  },
  {
    slug: 'savings-investments',
    name: 'Savings & Investments',
    ionIcon: 'trending-up-outline',
    colorHex: '#10B981',
    subcategories: [
      'Emergency Fund',
      'Retirement',
      'Brokerage',
      'Crypto',
      'High Yield Savings',
      'Term Deposit',
      'Micro Investing',
      'Investment Fees',
    ],
  },
  {
    slug: 'personal-care',
    name: 'Personal Care',
    ionIcon: 'body-outline',
    colorHex: '#F43F5E',
    subcategories: [
      'Haircut',
      'Skincare',
      'Cosmetics',
      'Spa',
      'Personal Hygiene',
      'Wellness Products',
      'Salon',
      'Supplements',
    ],
  },
  {
    slug: 'taxes-fees',
    name: 'Taxes & Fees',
    ionIcon: 'receipt-outline',
    colorHex: '#334155',
    subcategories: [
      'Income Tax',
      'Accounting Fees',
      'Government Fees',
      'Bank Fees',
      'Transfer Fees',
      'ATM Fees',
      'Late Payment Fees',
      'Service Charges',
    ],
  },
  {
    slug: 'gifts-donations',
    name: 'Gifts & Donations',
    ionIcon: 'gift-outline',
    colorHex: '#D946EF',
    subcategories: [
      'Birthday Gifts',
      'Holiday Gifts',
      'Charity',
      'Tips',
      'Wedding Gifts',
      'Family Support',
      'Community Donations',
      'Special Occasions',
    ],
  },
  {
    slug: 'business-expenses',
    name: 'Business Expenses',
    ionIcon: 'briefcase-outline',
    colorHex: '#0F766E',
    subcategories: [
      'Office Supplies',
      'Business Software',
      'Business Travel',
      'Client Meals',
      'Marketing',
      'Freelancers',
      'Hosting & Domains',
      'Professional Services',
    ],
  },
  {
    slug: 'income',
    name: 'Income',
    ionIcon: 'cash-outline',
    colorHex: '#16A34A',
    subcategories: [
      'Salary',
      'Freelance',
      'Interest',
      'Refunds',
      'Other Income',
    ],
  },
];

const CATEGORY_ICON_BY_SLUG: Readonly<Record<string, string>> = {
  utilities: 'flash-outline',
  'health-medical': 'medkit-outline',
  insurance: 'shield-checkmark-outline',
  travel: 'airplane-outline',
  education: 'school-outline',
  'family-kids': 'people-outline',
  pets: 'paw-outline',
  subscriptions: 'repeat-outline',
  'debt-loans': 'card-outline',
  'personal-care': 'body-outline',
  'gifts-donations': 'gift-outline',
  'business-expenses': 'briefcase-outline',
  income: 'cash-outline',
};

const CATEGORY_BLUEPRINTS_WITH_UPDATED_ICONS: CategoryBlueprint[] = CATEGORY_BLUEPRINTS.map(
  (category) => ({
    ...category,
    ionIcon: CATEGORY_ICON_BY_SLUG[category.slug] ?? category.ionIcon,
  }),
);

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const resetExistingData = process.argv.includes('--reset');

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    if (resetExistingData) {
      // Reset only app-level catalog tables.
      await prisma.appSubcategoryList.deleteMany({});
      await prisma.appCategoryList.deleteMany({});
      console.log('Reset completed: app_category_list and app_subcategory_list');
    }

    let categoryCount = 0;
    let subcategoryCount = 0;

    for (const [categoryIndex, category] of CATEGORY_BLUEPRINTS_WITH_UPDATED_ICONS.entries()) {
      const categoryRecord = await prisma.appCategoryList.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          ionIcon: category.ionIcon,
          colorHex: category.colorHex.toUpperCase(),
          sortOrder: categoryIndex + 1,
          isActive: true,
        },
        create: {
          slug: category.slug,
          name: category.name,
          ionIcon: category.ionIcon,
          colorHex: category.colorHex.toUpperCase(),
          sortOrder: categoryIndex + 1,
          isActive: true,
        },
      });

      categoryCount += 1;

      const subcategoryNames =
        category.slug === 'income'
          ? category.subcategories
          : [...category.subcategories, ...EXTRA_SUBCATEGORIES_PER_CATEGORY];

      const expectedSubcategoryCount = category.slug === 'income' ? 5 : 10;
      if (subcategoryNames.length !== expectedSubcategoryCount) {
        throw new Error(
          `Category "${category.slug}" must have exactly ${expectedSubcategoryCount} subcategories.`,
        );
      }

      for (const [subIndex, subName] of subcategoryNames.entries()) {
        await prisma.appSubcategoryList.upsert({
          where: {
            appCategoryId_slug: {
              appCategoryId: categoryRecord.id,
              slug: slugify(subName),
            },
          },
          update: {
            name: subName,
            ionIcon: category.ionIcon,
            colorHex: category.colorHex.toUpperCase(),
            sortOrder: subIndex + 1,
            isActive: true,
          },
          create: {
            appCategoryId: categoryRecord.id,
            slug: slugify(subName),
            name: subName,
            ionIcon: category.ionIcon,
            colorHex: category.colorHex.toUpperCase(),
            sortOrder: subIndex + 1,
            isActive: true,
          },
        });

        subcategoryCount += 1;
      }
    }

    console.log(`Seed completed: ${categoryCount} categories, ${subcategoryCount} subcategories.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
