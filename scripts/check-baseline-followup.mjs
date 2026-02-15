import { execSync } from 'node:child_process';

function getChangedFiles(baseRef) {
  const raw = execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: 'utf8' });
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) => {
    if (pattern.endsWith('/')) {
      return path.startsWith(pattern);
    }
    return path === pattern;
  });
}

const baseRef = process.argv[2] ?? 'origin/main';
const changedFiles = getChangedFiles(baseRef);

if (changedFiles.length === 0) {
  console.log('No changed files detected.');
  process.exit(0);
}

const baselineFile = 'docs/telegram-api-baseline.json';
const followupScope = [
  'src/types/telegram.ts',
  'test/types/telegram-api-compat.typecheck.ts',
  'test/telegram-api-compat.contract.test.ts',
  'test/context.compat.test.ts',
  'test/runtime.fallbacks.test.ts',
  'docs/TELEGRAM_API_COMPATIBILITY.md'
];

const touchesBaseline = changedFiles.includes(baselineFile);
const touchesFollowup = changedFiles.some((file) => matchesAny(file, followupScope));
const baselineOnly = changedFiles.every((file) => file === baselineFile);

if (touchesBaseline && (baselineOnly || !touchesFollowup)) {
  console.error(
    [
      'Baseline follow-up check failed.',
      `Changed files: ${changedFiles.join(', ')}`,
      'When docs/telegram-api-baseline.json changes, this PR must also include runtime/type compatibility follow-up in at least one of:',
      ...followupScope.map((entry) => `- ${entry}`)
    ].join('\n')
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: 'ok',
      base_ref: baseRef,
      changed_files: changedFiles
    },
    null,
    2
  )
);
