import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dir = resolve(root, '.changeset');
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.md') && name !== 'README.md')
  .sort();

if (files.length === 0) {
  console.log('No pending changesets.');
  process.exit(0);
}

const invalid = [];
const supportedScopes = ['@jilimb0/', '@tgwrapper/'];

for (const file of files) {
  const content = readFileSync(resolve(dir, file), 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    invalid.push({ file, reason: 'missing frontmatter block' });
    continue;
  }

  const frontmatter = match[1].trim();
  if (!frontmatter) {
    invalid.push({ file, reason: 'empty frontmatter (empty changeset is not allowed for release tags)' });
    continue;
  }

  const hasPackageBump = frontmatter
    .split('\n')
    .map((line) => line.trim())
    .some((line) => {
      const scopeMatch = line.match(/^"([^\"]+)"\s*:\s*("(major|minor|patch)"|(major|minor|patch))$/);
      if (!scopeMatch) return false;
      const packageName = scopeMatch[1];
      return packageName.startsWith('@')
        ? supportedScopes.some((scope) => packageName.startsWith(scope))
        : true;
    });

  if (!hasPackageBump) {
    invalid.push({ file, reason: 'frontmatter has no supported package semver bump entries' });
  }
}

if (invalid.length > 0) {
  console.error('Invalid changeset files detected:');
  for (const entry of invalid) {
    console.error(`- ${entry.file}: ${entry.reason}`);
  }
  process.exit(1);
}

console.log(`Changeset lint passed (${files.length} file(s)).`);
