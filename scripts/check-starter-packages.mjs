#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const starters = [
  {
    dir: 'examples/migration-starter',
    name: '@tgwrapper/starter-migration',
    main: 'dist/bot-after.js',
    requiredFiles: [
      '.env.example',
      'CHANGELOG.md',
      'README.md',
      'dist/bot-after.js',
      'dist/bot-before.js',
      'src/bot-after.ts',
      'src/bot-before.ts',
      'tsconfig.json'
    ]
  },
  {
    dir: 'examples/standard-bot',
    name: '@tgwrapper/starter-standard-bot',
    main: 'dist/bot.js',
    requiredFiles: [
      '.env.example',
      'CHANGELOG.md',
      'README.md',
      'dist/bot.js',
      'src/bot.ts',
      'tsconfig.json'
    ]
  },
  {
    dir: 'examples/support-bot',
    name: '@tgwrapper/starter-support-bot',
    main: 'dist/bot.js',
    requiredFiles: [
      '.env.example',
      'CHANGELOG.md',
      'README.md',
      'dist/bot.js',
      'src/bot.ts',
      'tsconfig.json'
    ]
  }
];

const expectedVersions = {
  '@tgwrapper/core': withCaret(readPackageVersion('package.json')),
  '@tgwrapper/adapter-redis': withCaret(readPackageVersion('packages/adapter-redis/package.json')),
  '@tgwrapper/observability': withCaret(readPackageVersion('packages/observability/package.json'))
};

const expectedStarterVersion = withWorkspaceCaret(readPackageVersion('examples/migration-starter/package.json'));

let failed = false;

for (const starter of starters) {
  const pkg = JSON.parse(readFileSync(`${starter.dir}/package.json`, 'utf8'));
  const errors = [];

  if (pkg.name !== starter.name) errors.push(`expected name ${starter.name}, found ${pkg.name}`);
  if (pkg.private === true) errors.push('private must not be true');
  if (pkg.main !== starter.main) errors.push(`expected main ${starter.main}, found ${pkg.main}`);
  if (pkg.publishConfig?.access !== 'public') errors.push('publishConfig.access must be public');
  if (!pkg.license) errors.push('license is required');
  if (!pkg.repository?.url) errors.push('repository.url is required');
  if (!pkg.homepage) errors.push('homepage is required');
  if (!pkg.bugs?.url) errors.push('bugs.url is required');
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length === 0) errors.push('keywords are required');

  for (const [name, version] of Object.entries(expectedVersions)) {
    if (pkg.dependencies?.[name] && pkg.dependencies[name] !== version) {
      errors.push(`${name} must be ${version}, found ${pkg.dependencies[name]}`);
    }
  }

  const serialized = JSON.stringify(pkg);
  if (serialized.includes('workspace:*')) errors.push('package.json must not contain workspace:*');

  const safeName = starter.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const packDir = mkdtempSync(join(tmpdir(), `${safeName}-pack-`));
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: starter.dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, npm_config_cache: join(packDir, 'npm-cache') }
  });

  try {
    if (pack.status !== 0) {
      errors.push(`npm pack failed: ${pack.stderr || pack.stdout}`);
    } else {
      const [packInfo] = JSON.parse(pack.stdout);
      const packedFiles = new Set(packInfo.files.map((file) => file.path));
      for (const file of ['package.json', ...starter.requiredFiles]) {
        if (!packedFiles.has(file)) errors.push(`packed tarball missing ${file}`);
      }
    }
  } finally {
    rmSync(packDir, { recursive: true, force: true });
  }

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
    if (pkg.dependencies?.[starter.name] !== expectedStarterVersion) {
      errors.push(`${starter.name} dependency must be ${expectedStarterVersion}`);
    }
  }

  const packDir = mkdtempSync(join(tmpdir(), 'create-tgwrapper-pack-'));
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, npm_config_cache: join(packDir, 'npm-cache') }
  });

  try {
    if (pack.status !== 0) {
      errors.push(`npm pack failed: ${pack.stderr || pack.stdout}`);
    } else {
      const [packInfo] = JSON.parse(pack.stdout);
      const packedFiles = new Set(packInfo.files.map((file) => file.path));
      for (const file of ['package.json', 'bin/create-tgwrapper.mjs', 'README.md']) {
        if (!packedFiles.has(file)) errors.push(`packed tarball missing ${file}`);
      }
    }
  } finally {
    rmSync(packDir, { recursive: true, force: true });
  }

  if (errors.length > 0) {
    failed = true;
    console.error('\n@tgwrapper/create is not publish-ready:');
    for (const error of errors) console.error(`- ${error}`);
  } else {
    console.log('✓ @tgwrapper/create package metadata and pack contents are publish-ready');
  }
}

function checkScaffolderTemplates() {
  const templatesDir = 'examples/create-tgwrapper/templates';
  const requiredTemplateFiles = [
    'migration-starter/package.json',
    'standard-bot/package.json',
    'support-bot/package.json'
  ];

  for (const relativePath of requiredTemplateFiles) {
    if (!existsSync(join(templatesDir, relativePath))) {
      failed = true;
      console.error(`Missing scaffolder template file: ${relativePath}`);
    }
  }
}

function readPackageVersion(path) {
  return JSON.parse(readFileSync(path, 'utf8')).version;
}

function withCaret(version) {
  return `^${version}`;
}

function withWorkspaceCaret(version) {
  return `workspace:^${version}`;
}
