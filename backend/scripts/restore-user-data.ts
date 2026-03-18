import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

type CliOptions = {
  dryRun: boolean;
  yes: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  return {
    dryRun: argv.includes('--dry-run'),
    yes: argv.includes('--yes'),
  };
}

function printUsage(): void {
  console.info(`
Usage:
  npm run db:restore -- --yes
  npm run db:restore -- --dry-run

Behavior:
  - Deletes all user data and all user-dependent data.
  - Preserves global seed data (app_category_list, app_subcategory_list, app_rule_templates).
`);
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const options = parseArgs(process.argv.slice(2));
  if (!options.dryRun && !options.yes) {
    printUsage();
    throw new Error('Missing --yes confirmation');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const before = await Promise.all([
      prisma.user.count(),
      prisma.appCategoryList.count(),
      prisma.appSubcategoryList.count(),
      prisma.appRuleTemplate.count(),
    ]);

    console.info('[db:restore] Before', {
      users: before[0],
      appCategories: before[1],
      appSubcategories: before[2],
      appRuleTemplates: before[3],
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      return;
    }

    const deleted = await prisma.$transaction(async (tx) => {
      // Keep explicit ordering for tables with restrictive FK chains.
      const deletedAttempts = await tx.bankConsentAttempt.deleteMany({});
      const deletedConnections = await tx.bankConnection.deleteMany({});
      const deletedProviderUsers = await tx.bankProviderUser.deleteMany({});
      const deletedSessions = await tx.userSession.deleteMany({});
      const deletedUsers = await tx.user.deleteMany({});

      return {
        deletedAttempts: deletedAttempts.count,
        deletedConnections: deletedConnections.count,
        deletedProviderUsers: deletedProviderUsers.count,
        deletedSessions: deletedSessions.count,
        deletedUsers: deletedUsers.count,
      };
    });

    const after = await Promise.all([
      prisma.user.count(),
      prisma.appCategoryList.count(),
      prisma.appSubcategoryList.count(),
      prisma.appRuleTemplate.count(),
    ]);

    console.info('[db:restore] Completed', {
      ...deleted,
      remainingUsers: after[0],
      appCategories: after[1],
      appSubcategories: after[2],
      appRuleTemplates: after[3],
      globalDataPreserved:
        before[1] === after[1] &&
        before[2] === after[2] &&
        before[3] === after[3],
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[db:restore] Failed', error);
  process.exit(1);
});
