# Proof of Viability: The 90-Minute Evaluation Path

This document outlines a structured, 90-minute evaluation sprint to test TGWrapper against your production requirements.

---

## ⏱️ Timeline overview

```
[00-15m] Setup & Local Run  ──>  [15-45m] Core Logic Port  ──>  [45-75m] Concurrency & Telemetry  ──>  [75-90m] Architectural Audit
```

---

## 🎯 Phase 1: Setup & Local Run (Minutes 0–15)

Validate the basic update processing and loop in less than 15 minutes.

1. **Initialize Directory:**
   ```bash
   mkdir tgwrapper-poc && cd tgwrapper-poc
   pnpm init
   pnpm add @tgwrapper/core
   pnpm add -D typescript @types/node tsx
   npx tsc --init
   ```
2. **Create Entrypoint (`src/bot.ts`):**
   ```typescript
   import { createBotClient } from '@tgwrapper/core';
   
   const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'polling' });
   bot.on('message', async (msg) => {
     if ('text' in msg) await bot.sendMessage(msg.chat.id, `POC Echo: ${msg.text}`);
   });
   (async () => { await bot.start(); })();
   ```
3. **Execute:**
   ```bash
   BOT_TOKEN="your_token" npx tsx src/bot.ts
   ```
4. **Outcome Check:** Send a message to your bot. If it responds with "POC Echo," core routing is working.

---

## 🎯 Phase 2: Port a Stateful Flow (Minutes 15–45)

Port your most critical conversational path (e.g. register, inputs collection).

1. **Attach Redis Session Storage:**
   ```bash
   pnpm add @tgwrapper/adapter-redis ioredis
   ```
2. **Implement State Transition Route:**
   ```typescript
   import { RedisSessionAdapter } from '@tgwrapper/adapter-redis';
   import Redis from 'ioredis';
   
   interface UserState { version: number; stage: 'idle' | 'input'; text?: string; }
   
   const store = new RedisSessionAdapter<UserState>({ redis: new Redis() });
   // Inject session middleware into createBotClient config:
   const bot = createBotClient({
     token: process.env.BOT_TOKEN!, mode: 'polling',
     session: { store, initialState: () => ({ version: 1, stage: 'idle' }) }
   });
   ```
3. **Write Handler Transitions:**
   - Handle routing based on `session.stage` and update state with `bot.updateSession()`.
4. **Outcome Check:** Trigger the flow and verify state mutations in Redis (`redis-cli KEYS "*"`).

---

## 🎯 Phase 3: Stress Concurrency & Tracing (Minutes 45–75)

Test concurrent request state safety and structured log visibility.

1. **Plug in Telemetry:**
   ```bash
   pnpm add @tgwrapper/observability
   ```
2. **Attach Observability Hooks:**
   ```typescript
   import { attachBotObservability, MetricsRegistry } from '@tgwrapper/observability';
   attachBotObservability(bot, {
     metrics: new MetricsRegistry(),
     logger: { log: (e) => console.log(JSON.stringify(e)) },
     serviceName: 'poc-service'
   });
   ```
3. **Simulate Concurrency:**
   Trigger simultaneous messages from multiple test accounts. Verify that concurrent session transitions return `session.conflict` and are handled safely rather than silently overwriting.

---

## 🎯 Phase 4: Architectural Audit (Minutes 75–90)

Score TGWrapper against your long-term production requirements:

- **Type Contracts:** Verify that handlers and session structures contain no implicit `any` declarations.
- **Trace Propagation:** Review terminal JSON logs. Ensure that trace IDs propagate correctly across session commits and API call responses.
- **Infrastructure Impact:** Determine if your Redis setup can handle the Compare-and-Swap concurrency rate.
