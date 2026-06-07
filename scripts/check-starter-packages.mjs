#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const starters = [
  {
    dir: 'examples/migration-starter',
    name: '@tgwrapper/starter-migration',
    main: null,
    requiredFiles: [
      '.env.example',
      'CHANGELOG.md',
      'README.md',
      'src/bot-after.ts',
      'src/bot-before.ts',
      'tsconfig.json'
    ]
  },
  {
    dir: 'examples/standard-bot',
    name: '@tgwrapper/starter-standard-bot',
    main: null,
    requiredFiles: [
      '.env.example',
      'CHANGELOG.md',
      'README.md',
      'src/bot.ts',
      'tsconfig.json'
    ]
  },
  {
    dir: 'examples/support-bot',
    name: '@tgwrapper/starter-support-bot',
    main: null,
    requiredFiles: [
      '.env.example',
      'CHANGELOG.md',
      'README.md',
      'src/bot.ts',
      'tsconfig.json'
    ]
  }
];

const publishedVersions = JSON.parse(readFileSync('scripts/release-versions.json', 'utf8')).publishedVersions;

const expectedLibVersions = {
  '@tgwrapper/core': publishedVersions['@tgwrapper/core'],
  '@tgwrapper/adapter-redis': publishedVersions['@tgwrapper/adapter-redis'],
  '@tgwrapper/observability': publishedVersions['@tgwrapper/observability']
};

const expectedStarterVersions = {
  '@tgwrapper/starter-migration': publishedVersions['@tgwrapper/starter-migration'],
  '@tgwrapper/starter-standard-bot': publishedVersions['@tgwrapper/starter-standard-bot'],
  '@tgwrapper/starter-support-bot': publishedVersions['@tgwrapper/starter-support-bot']
};
let failed = false;

for (const starter of starters) {
  const pkg = JSON.parse(readFileSync(`${starter.dir}/package.json`, 'utf8'));
  const errors = [];

  if (pkg.name !== starter.name) errors.push(`expected name ${starter.name}, found ${pkg.name}`);
  if (pkg.private === true) errors.push('private must not be true');
  if (starter.main !== null && pkg.main !== starter.main) errors.push(`expected main ${starter.main}, found ${pkg.main}`);
  if (pkg.publishConfig?.access !== 'public') errors.push('publishConfig.access must be public');
  if (!pkg.license) errors.push('license is required');
  if (!pkg.repository?.url) errors.push('repository.url is required');
  if (!pkg.homepage) errors.push('homepage is required');
  if (!pkg.bugs?.url) errors.push('bugs.url is required');
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length === 0) errors.push('keywords are required');

  for (const [name, version] of Object.entries(expectedLibVersions)) {
    if (pkg.dependencies?.[name] && pkg.dependencies[name] !== version) {
      errors.push(`${name} must be ${version}, found ${pkg.dependencies[name]}`);
    }
  }

  const serialized = JSON.stringify(pkg);
  if (serialized.includes('workspace:*')) errors.push('package.json must not contain workspace:*');

  checkPackContents(starter.dir, ['package.json', ...starter.requiredFiles], errors);

  if (errors.length > 0) {
    failed = true;
    console.error(`\n${starter.name} is not publish-ready:`);
    for (const error of errors) console.error(`- ${error}`);
  } else {
    console.log(`✓ ${starter.name} package metadata and pack contents are publish-ready`);
  }
}

checkScaffolderPackage();
checkScaffolderTemplates();

if (failed) process.exit(1);

function checkScaffolderPackage() {
  const dir = 'examples/create-tgwrapper';
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'));
  const errors = [];

  if (pkg.name !== '@tgwrapper/create') errors.push(`expected name @tgwrapper/create, found ${pkg.name}`);
  if (pkg.bin?.['create-tgwrapper'] !== 'bin/create-tgwrapper.mjs') errors.push('bin.create-tgwrapper is required');
  if (pkg.publishConfig?.access !== 'public') errors.push('publishConfig.access must be public');
  for (const starter of starters) {
    const expected = expectedStarterVersions[starter.name];
    if (pkg.dependencies?.[starter.name] !== expected) {
      errors.push(`${starter.name} dependency must be ${expected}`);
    }
  }

  checkPackContents(dir, ['package.json', 'bin/create-tgwrapper.mjs', 'README.md', 'CHANGELOG.md'], errors);

  if (errors.length > 0) {
    failed = true;
    console.error('\n@tgwrapper/create is not publish-ready:');
    for (const error of errors) console.error(`- ${error}`);
  } else {
    console.log('✓ @tgwrapper/create package metadata and pack contents are publish-ready');
  }
}

function checkScaffolderTemplates() {
  const file = 'examples/create-tgwrapper/bin/create-tgwrapper.mjs';
  const source = readFileSync(file, 'utf8');
  const errors = [];

  for (const starter of starters) {
    if (!source.includes(starter.name)) {
      errors.push(`missing starter reference ${starter.name} in ${file}`);
    }
  }

  for (const [name, version] of Object.entries(expectedLibVersions)) {
    if (!source.includes(`'${name}': '${version}'`) && !source.includes(`\"${name}\": \"${version}\"`)) {
      errors.push(`missing published dependency version ${name}@${version} in ${file}`);
    }
  }

  if (errors.length > 0) {
    failed = true;
    console.error(`\ncreate-tgwrapper templates are out of sync:`);
    for (const error of errors) console.error(`- ${error}`);
  } else {
    console.log('✓ create-tgwrapper templates reference published starter packages and dependency versions');
  }
}

function checkPackContents(dir, requiredFiles, errors) {
  const safeName = dir.replace(/[^a-zA-Z0-9._-]/g, '-');
  const packDir = mkdtempSync(join(tmpdir(), `${safeName}-pack-`));
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20_000,
    env: {
      ...process.env,
      npm_config_cache: join(packDir, 'npm-cache'),
      npm_config_fund: 'false',
      npm_config_audit: 'false',
      npm_config_update_notifier: 'false'
    }
  });

  try {
    if (pack.error) {
      errors.push(`npm pack failed: ${pack.error.message}`);
      return;
    }

    if (pack.status !== 0) {
      errors.push(`npm pack failed: ${pack.stderr || pack.stdout}`);
      return;
    }

    const [packInfo] = JSON.parse(pack.stdout);
    const packedFiles = new Set(packInfo.files.map((file) => file.path));
    for (const file of requiredFiles) {
      if (!packedFiles.has(file)) errors.push(`packed tarball missing ${file}`);
    }
  } finally {
    rmSync(packDir, { recursive: true, force: true });
  }
}

function readPackageVersion(relativePath) {
  const pkg = JSON.parse(readFileSync(relativePath, 'utf8'));
  return pkg.version;
}

function withCaret(version) {
  return version.startsWith('^') ? version : `^${version}`;
}
