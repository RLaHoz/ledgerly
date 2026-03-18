import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedAppCatalog } from './lib/app-catalog-seed';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const resetExistingData = process.argv.includes('--reset');

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const { categoryCount, subcategoryCount } = await seedAppCatalog(prisma, {
      resetExistingData,
    });

    console.log(`Seed completed: ${categoryCount} categories, ${subcategoryCount} subcategories.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
