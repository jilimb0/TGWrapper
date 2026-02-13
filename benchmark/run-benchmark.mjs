import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { ApiClient, BotKernel, MemorySessionStorage, SessionManager, TreeRouter } from '../dist/index.js';

const updates = Number(process.env.UPDATES ?? 20_000);

const apiClient = new ApiClient({
  token: 'TEST',
  mockResponder: async () => ({ ok: true })
});

const storage = new MemorySessionStorage();
const sessionManager = new SessionManager({
  storage,
  initialData: () => ({ count: 0 }),
  conflictRetries: 5
});

const router = new TreeRouter();
router.use(async (ctx) => {
  const current = Number(ctx.session.data.count ?? 0);
  ctx.session.data.count = current + 1;
});

const kernel = new BotKernel({
  apiClient,
  sessionManager,
  router,
  resolveSessionKey: (update) => String(update.message?.from?.id ?? '0')
});

const update = {
  update_id: 1,
  message: {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: { id: 1, type: 'private' },
    from: { id: 1, is_bot: false, first_name: 'u' },
    text: 'x'
  }
};

const started = performance.now();
for (let index = 0; index < updates; index += 1) {
  update.update_id = index;
  await kernel.handleUpdate(update);
}
const elapsedMs = performance.now() - started;
const perSecond = Math.round((updates / elapsedMs) * 1000);

const report = {
  timestamp: new Date().toISOString(),
  updates,
  elapsed_ms: Math.round(elapsedMs),
  updates_per_sec: perSecond
};

mkdirSync('benchmark/reports', { recursive: true });
writeFileSync('benchmark/reports/latest.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
