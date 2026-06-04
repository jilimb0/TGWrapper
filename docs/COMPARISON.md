# TGWrapper Comparison Matrix & Positioning

TGWrapper is built for teams designing serverless, edge-native, or distributed Telegram bots in TypeScript where structured logging, request trace correlation, and type validation are priority requirements.

---

## 📊 Comparison Matrix

| Feature / Metric | **TGWrapper** | **grammY** | **Telegraf** |
| :--- | :--- | :--- | :--- |
| **Primary Focus** | Distributed scaling, serverless layouts, and telemetry | General developer ergonomics & extensive plugins | General-purpose setups, legacy JS/TS codebases |
| **Serverless Cold Starts** | **Low** (Built on native fetch APIs) | Moderate (Requires adapter translation shims) | Moderate (Includes standard Node.js server dependencies) |
| **API Type Updates** | Checked against Telegram schemas | Handled manually on major releases | Handled manually |
| **Redis Session Protection** | **Compare-And-Swap (CAS)** (Prevents state overwrite) | Default key overrides (Last write wins) | Default key overrides (Last write wins) |
| **Trace Propagation** | **Built-in AsyncLocalStorage contexts** | Requires manual middleware setup | Requires manual middleware setup |

---

## 🆚 TGWrapper vs. grammY

### When to stay on grammY:
- You are building hobby or simple standalone bots where state persistence constraints and distributed rate limits do not matter.
- You rely heavily on grammY's extensive ecosystem of community plugins (e.g. menus, conversations, inline queries wrappers).

### When to switch to TGWrapper:
- You need to scale horizontally across multiple instances (VPS or Serverless) where concurrent updates can trigger race conditions on user sessions.
- You require deep production visibility with metrics, distributed traces, and log correlation.

### What you gain:
- Atomic transaction-safe session writes via CAS Redis adapters.
- Out-of-the-box OpenTelemetry compatibility and structured telemetry signals.
- Low cold-start latency when running on Cloudflare Workers or AWS Lambda edge.

### What you lose:
- Access to grammY's specific community plugin ecosystem.
- High-level abstractions for UI menus (must return raw Telegram API button layouts).

### Code Shape Comparison:
**grammY Session Read/Write:**
```typescript
bot.use(session({
  storage: new RedisAdapter({ client: redis }) // Default overwrites on concurrency
}));
bot.command('increment', (ctx) => {
  ctx.session.counter++; // Race condition prone if multiple taps occur within 50ms
});
```

**TGWrapper Session Read/Write:**
```typescript
bot.on('message', async (ctx) => {
  // Uses atomic OCC/CAS to guarantee update safety
  const result = await bot.updateSession(ctx.chat.id, (state) => {
    state.counter = (state.counter || 0) + 1;
  });
  if (!result.ok) {
    // Handle write lock conflict explicitly (retry or alert)
  }
});
```

---

## 🆚 TGWrapper vs. Telegraf

### When to stay on Telegraf:
- You maintain legacy Node.js bots written in CommonJS that do not require state management and are running stable in production.
- Your infrastructure has no distributed state or telemetry requirements.

### When to switch to TGWrapper:
- You are migrating codebase templates to Edge/Serverless environments.
- You are converting codebases to modern TypeScript with strict compilation checks.

### What you gain:
- Dual-build (ESM + CommonJS) bundle without heavy middleware or Node server dependencies.
- Automatic verification against official Telegram Bot API schema types.
- Trace propagation across asynchronous function boundaries.

### What you lose:
- Compatibility with old Node.js runtimes (< v18).

---

## 🛠️ Transition Guides

- [Migration from grammY](./MIGRATION_FROM_GRMMY.md)
- [Migration from Telegraf](./MIGRATION_FROM_TELEGRAF.md)
- [Migration from Node Telegram Bot API](./MIGRATION_FROM_NODE_TELEGRAM_BOT_API.md)

