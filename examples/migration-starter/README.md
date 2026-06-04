# Migration Starter & Checklist

This starter directory demonstrates the step-by-step process of migrating a stateful Telegram bot from **Telegraf** (represented in [bot-before.ts](./src/bot-before.ts)) to **TGWrapper** (represented in [bot-after.ts](./src/bot-after.ts)).

---

## 📋 The Migration Checklist

Print or copy this checklist when migrating your production bots:

- [ ] **1. Dependencies setup**
  - Install core: `pnpm add @tgwrapper/core`
  - Install Redis session store: `pnpm add @tgwrapper/adapter-redis`
  - Install telemetry: `pnpm add @tgwrapper/observability`
- [ ] **2. Type definition**
  - Define a strict TypeScript interface for your user/chat session state.
  - Include the required `version: number` property for Compare-and-Swap (CAS) session operations.
- [ ] **3. Init Redis Adapter**
  - Create the `RedisSessionAdapter` instance pointing to your Redis cluster.
- [ ] **4. Initialize the Client**
  - Replace `new Telegraf()` or `new Bot()` with `createBotClient()`.
  - Pass the Redis adapter under the `session: { store, initialState }` configuration block.
- [ ] **5. Port Commands and Message Routing**
  - Change `bot.command('name', handler)` and `bot.on('text', handler)` into explicit guard statements inside a global `bot.on('message', handler)` callback.
  - Assert incoming update shapes using `if ('text' in message) { ... }`.
- [ ] **6. Replace Magic Contexts (`ctx`)**
  - Change `ctx.reply(...)` to `bot.sendMessage(message.chat.id, ...)`.
  - Replace `ctx.session.x = y` with `await bot.updateSession(chatId, (s) => s.x = y)`.
- [ ] **7. Connect Telemetry**
  - Run `attachBotObservability()` at startup.
- [ ] **8. Setup Graceful Shutdowns**
  - Catch `SIGINT` / `SIGTERM` and clean up connections.

---

## 🚀 Running the Comparison

### Prerequisites
1. Redis running locally on `redis://localhost:6379`.
2. A Telegram Bot Token from [@BotFather](https://t.me/BotFather).

### Setup
```bash
# Set your token
export BOT_TOKEN="your-bot-token"
export REDIS_URL="redis://localhost:6379"

# Install packages
pnpm install
```

### Run the Telegraf version (Before)
```bash
pnpm start:before
```

### Run the TGWrapper version (After)
```bash
pnpm start:after
```
Observe the structured JSON logging emitted in your terminal console as updates hit the TGWrapper version, and verify that user conversation state is correctly written to your local Redis instance.
