import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { getLatestNpmVersion } from './shared-release-versions.mjs';

const rootDir = process.cwd();

async function main() {
  const strictMode = process.env.PUBLISHED_SMOKE_STRICT === 'true';
  const versions = await loadPublishedVersions({ strictMode });
  if (!versions) {
    console.log(
      'Published smoke skipped: target package latest versions are not available in npm yet (non-strict mode).'
    );
    return;
  }
  const allPublished = await assertPublishedVersionsExist(versions, { strictMode });
  if (!allPublished) {
    console.log(
      'Published smoke skipped: target versions are not available in npm yet (non-strict mode).'
    );
    return;
  }
  const tempDir = await mkdtemp(join(tmpdir(), 'tgwrapper-published-smoke-'));
  console.log(`Temp project: ${tempDir}`);
  console.log(`Target versions: ${JSON.stringify(versions)}`);
  if (process.env.GITHUB_SHA) {
    console.log(`GitHub SHA: ${process.env.GITHUB_SHA}`);
  }

  try {
    await run('npm', ['init', '-y'], tempDir);
    const tempPackageJsonPath = join(tempDir, 'package.json');
    const tempPackageJson = await readJson(tempPackageJsonPath);
    tempPackageJson.type = 'module';
    await writeFile(tempPackageJsonPath, JSON.stringify(tempPackageJson, null, 2));
    await run(
      'npm',
      [
        'i',
        `@tgwrapper/core@${versions.core}`,
        `@tgwrapper/adapter-redis@${versions.adapterRedis}`,
        `@tgwrapper/observability@${versions.observability}`,
        `@tgwrapper/starter-migration@${versions.starterMigration}`,
        `@tgwrapper/starter-standard-bot@${versions.starterStandardBot}`,
        `@tgwrapper/starter-support-bot@${versions.starterSupportBot}`,
        `@tgwrapper/create@${versions.createTgwrapper}`,
        'typescript@5.8.2'
      ],
      tempDir
    );

    await writeFile(
      join(tempDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            skipLibCheck: true,
            esModuleInterop: true,
            outDir: 'dist'
          },
          include: ['smoke.ts']
        },
        null,
        2
      )
    );

    await writeFile(
      join(tempDir, 'smoke.ts'),
      `import {
  ApiClient,
  BotKernel,
  MemorySessionStorage,
  SessionManager,
  TreeRouter,
  type Context,
  type Update
} from '@tgwrapper/core';
import { RedisSessionAdapter } from '@tgwrapper/adapter-redis';
import { EcsJsonLogger, InMemoryMetrics } from '@tgwrapper/observability';

type State = 'idle';
type Data = { seen: number };

const metrics = new InMemoryMetrics();
const logger = new EcsJsonLogger({ serviceName: 'published-smoke', tenantId: 'smoke', botId: 'bot' }, { write: () => {} });
const storage = new MemorySessionStorage<{ current_state: State | null; data: Data; version: number; encrypted: boolean; updated_at: string }>();
const sessionManager = new SessionManager<State, Data>({
  storage,
  initialData: () => ({ seen: 0 })
});

let calls = 0;
const apiClient = new ApiClient({
  token: 'TEST_TOKEN',
  metrics,
  logger,
  mockResponder: async () => {
    calls += 1;
    return { ok: true };
  }
});

const router = new TreeRouter<Context<State, Data>>();
router.command('/start', async (ctx) => {
  ctx.session.data.seen += 1;
  await ctx.reply('pong');
});

const kernel = new BotKernel<State, Data>({
  apiClient,
  sessionManager,
  router,
  resolveSessionKey: (update) => {
    const id = update.message?.from?.id;
    return typeof id === 'number' ? String(id) : null;
  }
});

const update: Update = {
  update_id: 1,
  message: {
    message_id: 1,
    date: 1,
    chat: { id: 1, type: 'private', first_name: 'Smoke' },
    from: { id: 1, is_bot: false, first_name: 'Smoke' },
    text: '/start',
    entities: [{ type: 'bot_command', offset: 0, length: 6 }]
  }
};

await kernel.handleUpdate(update);

if (calls !== 1) {
  throw new Error(\`Expected one API call, received \${calls}\`);
}

if (typeof RedisSessionAdapter !== 'function') {
  throw new Error('RedisSessionAdapter import failed');
}
`
    );

    await run('npx', ['tsc', '--noEmit'], tempDir);
    await run('npx', ['tsc'], tempDir);
    await run('node', ['dist/smoke.js'], tempDir);
    // Run create-tgwrapper from the locally installed binary so it can resolve
    // @tgwrapper/starter-* from the same node_modules (npm init @tgwrapper runs
    // from the npm cache and cannot find the sibling starter packages).
    const createBin = join(tempDir, 'node_modules', '.bin', 'create-tgwrapper');
    await run(createBin, ['smoke-standard', '--template', 'standard'], tempDir);
    await run(createBin, ['smoke-support', '--template', 'support'], tempDir);
    await run(createBin, ['smoke-migration', '--template', 'migration'], tempDir);
    console.log('Published smoke passed.');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function loadPublishedVersions(options) {
  const targets = [
    ['core', '@tgwrapper/core'],
    ['adapterRedis', '@tgwrapper/adapter-redis'],
    ['observability', '@tgwrapper/observability'],
    ['starterMigration', '@tgwrapper/starter-migration'],
    ['starterStandardBot', '@tgwrapper/starter-standard-bot'],
    ['starterSupportBot', '@tgwrapper/starter-support-bot'],
    ['createTgwrapper', '@tgwrapper/create']
  ];
  const versions = {};
  const missing = [];

  for (const [key, packageName] of targets) {
    try {
      versions[key] = getLatestNpmVersion(packageName);
    } catch (error) {
      missing.push(packageName);
      if (options.strictMode) {
        throw new Error(`Published smoke requires ${packageName} latest version to be available on npm.`, {
          cause: error
        });
      }
    }
  }

  if (missing.length > 0) {
    console.warn(`Skipping published smoke; missing latest versions: ${missing.join(', ')}`);
    return null;
  }

  return versions;
}

async function assertPublishedVersionsExist(versions, options) {
  const checks = [
    ['@tgwrapper/core', versions.core],
    ['@tgwrapper/adapter-redis', versions.adapterRedis],
    ['@tgwrapper/observability', versions.observability],
    ['@tgwrapper/starter-migration', versions.starterMigration],
    ['@tgwrapper/starter-standard-bot', versions.starterStandardBot],
    ['@tgwrapper/starter-support-bot', versions.starterSupportBot],
    ['@tgwrapper/create', versions.createTgwrapper]
  ];
  const missing = [];

  for (const [name, version] of checks) {
    const target = `${name}@${version}`;
    try {
      await run('npm', ['view', target, 'version'], rootDir, {
        stdio: 'pipe',
        timeoutMs: 20_000
      });
    } catch (error) {
      missing.push(target);
      if (options.strictMode) {
        throw new Error(`Published smoke requires ${target} to be available on npm.`, {
          cause: error
        });
      }
    }
  }

  if (missing.length > 0) {
    console.warn(`Skipping published smoke; missing versions: ${missing.join(', ')}`);
    return false;
  }

  return true;
}

async function run(command, args, cwd, options = {}) {
  const { stdio = 'inherit', timeoutMs = 120_000 } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio,
      env: process.env
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} ${args.join(' ')} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
      }
    });
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
