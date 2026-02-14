import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();

async function main() {
  const versions = await loadPublishedVersions();
  await assertPublishedVersionsExist(versions);
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
        `@jilimb0/tgwrapper@${versions.core}`,
        `@jilimb0/tgwrapper-adapter-redis@${versions.adapterRedis}`,
        `@jilimb0/tgwrapper-observability@${versions.observability}`,
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
} from '@jilimb0/tgwrapper';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';
import { EcsJsonLogger, InMemoryMetrics } from '@jilimb0/tgwrapper-observability';

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
    console.log('Published smoke passed.');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function loadPublishedVersions() {
  const [corePkg, redisPkg, obsPkg] = await Promise.all([
    readJson(join(rootDir, 'package.json')),
    readJson(join(rootDir, 'packages/adapter-redis/package.json')),
    readJson(join(rootDir, 'packages/observability/package.json'))
  ]);

  return {
    core: corePkg.version,
    adapterRedis: redisPkg.version,
    observability: obsPkg.version
  };
}

async function assertPublishedVersionsExist(versions) {
  const checks = [
    ['@jilimb0/tgwrapper', versions.core],
    ['@jilimb0/tgwrapper-adapter-redis', versions.adapterRedis],
    ['@jilimb0/tgwrapper-observability', versions.observability]
  ];

  for (const [name, version] of checks) {
    const target = `${name}@${version}`;
    try {
      await run('npm', ['view', target, 'version'], rootDir, {
        stdio: 'pipe',
        timeoutMs: 20_000
      });
    } catch {
      throw new Error(
        [
          `Published smoke target is not available in npm: ${target}`,
          'This usually means the workflow is checking out a commit whose package version is newer than what was published.',
          `Current commit: ${process.env.GITHUB_SHA ?? 'unknown'}`
        ].join('\n')
      );
    }
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function run(cmd, args, cwd, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: options.stdio ?? 'inherit',
      env: process.env
    });
    const timeoutMs = options.timeoutMs;
    const timeoutId =
      typeof timeoutMs === 'number'
        ? setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error(`Command timed out after ${timeoutMs}ms: ${cmd} ${args.join(' ')}`));
          }, timeoutMs)
        : undefined;

    child.on('exit', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code}): ${cmd} ${args.join(' ')}`));
    });

    child.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(error);
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
