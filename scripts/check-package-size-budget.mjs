import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = process.cwd();

const budgets = [
  {
    dir: '.',
    name: '@tgwrapper/core',
    maxPackageSizeBytes: 60_000,
    maxUnpackedSizeBytes: 260_000
  },
  {
    dir: 'packages/adapter-redis',
    name: '@tgwrapper/adapter-redis',
    maxPackageSizeBytes: 10_000,
    maxUnpackedSizeBytes: 48_000
  },
  {
    dir: 'packages/observability',
    name: '@tgwrapper/observability',
    maxPackageSizeBytes: 28_000,
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

  let parsed;
  let buffer = '';
  for (const line of pack.stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('[WARN')) {
      continue;
    }
    buffer += `${line}\n`;
    try {
      parsed = JSON.parse(buffer);
      break;
    } catch {
      // keep accumulating until valid JSON
    }
  }
  if (!parsed) {
    console.error(`No JSON output from npm pack for ${budget.name}`);
    console.error(pack.stdout);
    process.exit(1);
  }
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
