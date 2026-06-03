import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const changesetDir = resolve(root, '.changeset');
const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main';

const releaseRelevantPatterns = [
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^src\//,
  /^packages\/[^/]+\/src\//,
  /^packages\/[^/]+\/package\.json$/,
  /^scripts\//,
  /^docs\//,
  /^\.github\/workflows\//,
];

const ignoredPatterns = [
  /^\.changeset\//,
  /^README\.md$/,
  /^packages\/[^/]+\/README\.md$/,
  /^docs\/api\//,
  /^benchmark\/reports\//,
  /^test\//,
  /^packages\/[^/]+\/test\//,
];

function isIgnored(file) {
  return ignoredPatterns.some((pattern) => pattern.test(file));
}

function isReleaseRelevant(file) {
  return releaseRelevantPatterns.some((pattern) => pattern.test(file));
}

const diff = spawnSync('git', ['diff', '--name-only', `${baseRef}...HEAD`], {
  cwd: root,
  encoding: 'utf8',
});

if (diff.status !== 0) {
  console.error(`Failed to diff against ${baseRef}.`);
  console.error(diff.stderr || diff.stdout);
  process.exit(1);
}

const changedFiles = diff.stdout
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const releaseRelevantChangedFiles = changedFiles.filter((file) => !isIgnored(file) && isReleaseRelevant(file));

if (releaseRelevantChangedFiles.length === 0) {
  console.log('No release-relevant file changes detected; changeset not required.');
  process.exit(0);
}

if (!existsSync(changesetDir)) {
  console.error('Release-relevant changes detected, but .changeset directory is missing.');
  process.exit(1);
}

const changesetCheck = spawnSync('node', ['scripts/lint-changesets.mjs'], {
  cwd: root,
  encoding: 'utf8',
});

if (changesetCheck.status !== 0) {
  console.error('Release-relevant changes detected, but no valid changeset was found.');
  console.error('Changed files requiring a changeset:');
  for (const file of releaseRelevantChangedFiles) {
    console.error(`- ${file}`);
  }
  console.error('');
  console.error(changesetCheck.stderr || changesetCheck.stdout);
  console.error('Create one with: pnpm changeset');
  process.exit(1);
}

console.log('Release-relevant changes detected and a valid changeset is present.');
console.log('Files that triggered the requirement:');
for (const file of releaseRelevantChangedFiles) {
  console.log(`- ${file}`);
}
