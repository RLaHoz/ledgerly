import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

type CliOptions = {
  userId?: string;
  all: boolean;
  hard: boolean;
  dryRun: boolean;
  yes: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    all: false,
    hard: false,
    dryRun: false,
    yes: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all') {
      options.all = true;
      continue;
    }
    if (arg === '--hard') {
      options.hard = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--yes') {
      options.yes = true;
      continue;
    }
    if (arg === '--userId') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --userId');
      }
      options.userId = value;
      i += 1;
      continue;
    }
  }

  return options;
}

function printUsage(): void {
  console.info(`
Usage:
  npm run reset:bank-consent -- --userId <uuid> --yes
  npm run reset:bank-consent -- --all --yes

Options:
  --userId <uuid>  Reset only one app user
  --all            Reset all users (dangerous)
  --hard           Also deletes bank_provider_users rows
  --dry-run        Show what would be deleted without deleting
  --yes            Required confirmation for non dry-run
`);
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const options = parseArgs(process.argv.slice(2));
  const isScopedByUser = Boolean(options.userId);

  if (!options.all && !isScopedByUser) {
    printUsage();
    throw new Error('Use --userId <uuid> or --all');
  }

  if (options.all && isScopedByUser) {
    throw new Error('Use either --all or --userId, not both');
  }

  if (!options.dryRun && !options.yes) {
    throw new Error('Missing --yes confirmation');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const where = options.all
    ? undefined
    : {
        userId: options.userId!,
      };

  try {
    const [attemptCount, connectionCount, providerUserCount] = await Promise.all([
      prisma.bankConsentAttempt.count({ where }),
      prisma.bankConnection.count({ where }),
      prisma.bankProviderUser.count({ where }),
    ]);

    console.info('[reset-bank-consent] Target summary', {
      scope: options.all ? 'ALL_USERS' : options.userId,
      attemptCount,
      connectionCount,
      providerUserCount,
      hard: options.hard,
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete attempts first because they have a required relation to BankProviderUser.
      const deletedAttempts = await tx.bankConsentAttempt.deleteMany({ where });
      const deletedConnections = await tx.bankConnection.deleteMany({ where });
      const deletedProviderUsers = options.hard
        ? await tx.bankProviderUser.deleteMany({ where })
        : { count: 0 };

      return {
        deletedAttempts: deletedAttempts.count,
        deletedConnections: deletedConnections.count,
        deletedProviderUsers: deletedProviderUsers.count,
      };
    });

    console.info('[reset-bank-consent] Completed', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[reset-bank-consent] Failed', error);
  process.exit(1);
});
