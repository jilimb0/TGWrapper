# TGWrapper vs. python-telegram-bot

This document provides a comparison guide mapping features, operations models, and code vocabularies between TGWrapper and `python-telegram-bot` (PTB) for developers evaluating frameworks or transitioning between ecosystems.

---

## 📊 Feature Comparison Matrix

| Feature / Metric | **TGWrapper** (TypeScript) | **python-telegram-bot** (Python) |
| :--- | :--- | :--- |
| **Language Paradigm** | TypeScript / JavaScript (Strict typing) | Python (Asyncio / Type-annotated) |
| **Runtime Platforms** | Node.js, AWS Lambda, Cloudflare Workers | Server processes (VPS, Kubernetes) |
| **Edge / Serverless Fit** | **Excellent** (No Node-specific dependencies) | Poor (Python startup overhead + asyncio loop costs) |
| **Session Model** | Distributed (Redis version CAS) or Local | Local dict or raw Redis hashes (Last write wins) |
| **Telemetry Support** | OpenTelemetry spans + Structured logs | Standard Python `logging` module |

---

## 🎯 Architecture & Execution Models

### 1. Concurrent Execution & Event Loop
- **python-telegram-bot:** Relies on Python's native `asyncio` event loop. Under heavy workloads, blocking CPU-bound operations in handlers can easily freeze update processing loops.
- **TGWrapper:** Leverages JavaScript's high-throughput event loop. Portability builds ensure handlers run cleanly in event-driven serverless contexts like Cloudflare Workers.

### 2. State & Persistence Guard
- **python-telegram-bot:** Session data inside `user_data` or `chat_data` dictionary hashes lacks built-in atomic validation locks. High concurrency update flows can cause state drift.
- **TGWrapper:** Explicitly integrates version-controlled optimistic locking on database persistence hooks to guard state context.

---

## 🛠️ Code Vocabulary Map

| Pattern | **python-telegram-bot** | **TGWrapper** |
| :--- | :--- | :--- |
| **Client Initiation** | `Application.builder().token(TOKEN).build()` | `createBotClient({ token: TOKEN, mode: 'polling' })` |
| **Update Router** | `application.add_handler(CommandHandler("start", start))` | `bot.on('message', async (ctx) => { ... })` |
| **Send Message** | `await context.bot.send_message(chat_id=X, text=Y)` | `await bot.sendMessage(chatId, text)` |
| **State Storage** | `context.user_data["counter"] += 1` | `await bot.updateSession(chatId, (s) => s.counter++)` |
