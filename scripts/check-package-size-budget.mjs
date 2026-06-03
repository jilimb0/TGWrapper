import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = process.cwd();

const budgets = [
  {
    dir: '.',
    name: '@jilimb0/tgwrapper',
    maxPackageSizeBytes: 60_000,
    maxUnpackedSizeBytes: 260_000
  },
  {
    dir: 'packages/adapter-redis',
    name: '@jilimb0/tgwrapper-adapter-redis',
    maxPackageSizeBytes: 10_000,
    maxUnpackedSizeBytes: 42_000
  },
  {
    dir: 'packages/observability',
    name: '@jilimb0/tgwrapper-observability',
    maxPackageSizeBytes: 25_000,
    maxUnpackedSizeBytes: 120_000
  }
];

let failed = false;

for (const budget of budgets) {
  const cwd = resolve(repoRoot, budget.dir);
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      NPM_CONFIG_CACHE: resolve(repoRoot, '.npm-cache')
    }
  });

  if (pack.status !== 0) {
    console.error(`npm pack failed for ${budget.name}`);
    console.error(pack.stderr || pack.stdout);
    process.exit(1);
  }

  const parsed = JSON.parse(pack.stdout);
  const info = parsed[0];
  const packageSize = Number(info.size ?? 0);
  const unpackedSize = Number(info.unpackedSize ?? 0);
  const packageOk = packageSize <= budget.maxPackageSizeBytes;
  const unpackedOk = unpackedSize <= budget.maxUnpackedSizeBytes;

  console.log(
    JSON.stringify(
      {
        package: budget.name,
        packageSize,
        unpackedSize,
        packageBudget: budget.maxPackageSizeBytes,
        unpackedBudget: budget.maxUnpackedSizeBytes,
        status: packageOk && unpackedOk ? 'ok' : 'exceeded'
      },
      null,
      2
    )
  );

  if (!packageOk || !unpackedOk) {
    failed = true;
  }
}

if (failed) {
  console.error('Package size budget check failed.');
  process.exit(1);
}

console.log('Package size budget check passed.');
