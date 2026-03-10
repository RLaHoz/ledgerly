import { spawnSync } from 'node:child_process';

type CommandStep = {
  label: string;
  command: string;
  args: string[];
};

const dryRun = process.argv.includes('--dry-run');

const steps: CommandStep[] = [
  {
    label: 'Reset DB and re-apply migrations',
    command: 'npx',
    args: ['prisma', 'migrate', 'reset', '--force', '--skip-seed'],
  },
  {
    label: 'Seed default app categories/subcategories',
    command: 'npm',
    args: ['run', 'seed:app-categories'],
  },
  {
    label: 'Seed default rule templates',
    command: 'npm',
    args: ['run', 'seed:rules:templates', '--', '--reset'],
  },
];

function runStep(step: CommandStep): void {
  const pretty = `${step.command} ${step.args.join(' ')}`;
  console.info(`\n[reset-db-to-defaults] ${step.label}`);
  console.info(`[reset-db-to-defaults] $ ${pretty}`);

  if (dryRun) {
    return;
  }

  const result = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${pretty}`);
  }
}

function main(): void {
  if (dryRun) {
    console.info('[reset-db-to-defaults] Dry run mode enabled. No changes will be made.');
  } else {
    console.info('[reset-db-to-defaults] WARNING: This will DELETE existing DB data.');
  }

  for (const step of steps) {
    runStep(step);
  }

  console.info('\n[reset-db-to-defaults] Completed successfully.');
}

try {
  main();
} catch (error) {
  console.error('[reset-db-to-defaults] Failed', error);
  process.exit(1);
}
