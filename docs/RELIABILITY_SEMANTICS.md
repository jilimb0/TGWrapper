# System Reliability Semantics & Contracts

This document defines the core execution constraints, retry patterns, idempotency assumptions, and runtime failure contracts enforced across the TGWrapper ecosystem.

---

## ⚡ 1. Update Ingestion & Delivery Contracts

TGWrapper processes incoming Telegram update streams using two main models:

### A. Long-Polling Mode (`mode: 'polling'`)
- **Delivery Guarantee:** At-least-once delivery.
- **Mechanism:** The client sends an HTTP request to Telegram. If the processing thread crashes mid-execution, the updates are not acknowledged. When the process restarts, Telegram will redeliver those updates.
- **Invariant:** Handlers must be prepared to process the same update ID multiple times in crash recovery scenarios.

### B. Webhook Mode (`mode: 'webhook'`)
- **Delivery Guarantee:** At-least-once delivery with Telegram-managed retries.
- **Mechanism:** Telegram delivers updates via HTTP POST to the configured webhook endpoint. 
- **Timeouts:** TGWrapper must return an HTTP `200 OK` status to Telegram within **5 seconds** of receiving the request. If the handler exceeds this execution budget, Telegram considers the request timed out and schedules retries.
- **Policy:** For long-running operations (such as multi-second AI text generation), you must hand off execution to a background worker or job queue and return a `200 OK` status to Telegram immediately.

---

## 🔒 2. Session Concurrency & State Invariants

State persistence utilizes versioned optimistic locking to handle concurrent updates cleanly.

```
  Worker 1 (Loads Session v1) ──────────( CAS: match v1 -> write v2 )─────────> Success
  
  Worker 2 (Loads Session v1) ───( Processing )───( CAS: expect v1, got v2 )──> Fail: version mismatch!
```

### Optimistic Lock Semantics
- **Operation:** When reading session state, the Redis adapter loads both the payload data and a version token (`{ value, version }`).
- **Commit:** When saving changes, the adapter runs a Lua script executing a Compare-and-Swap (CAS). If the version in Redis matches the expected version, the payload is updated and the version is incremented (`version + 1`).
- **Conflict Handling:** If the version does not match (due to a concurrent request modifying user state first), the CAS command returns `{ ok: false }`. The framework does **not** silently overwrite the state; instead, the application developer must catch this conflict and choose to retry or reject the change.

---

## ⏱️ 3. Execution Timeouts & Cancellation

- **Update Context Abort:** Each update context contains an `AbortSignal` object (`ctx.signal`).
- **Boundaries:** The client runtime triggers the abort signal if:
  - The webhook request reaches the processing limit (configured timeout).
  - The long-running loop is interrupted during process shutdown.
- **Integration:** Downstream integrations (such as database calls, fetch queries, or AI generation tasks) should respect the `AbortSignal` to terminate hung threads:
  ```typescript
  bot.on('message', async (ctx) => {
    const res = await fetch('https://api.example.com/data', { signal: ctx.signal });
  });
  ```

---

## 🛡️ 4. Graceful Degradation Principles

If external dependent infrastructure fails, the framework behaves as follows:

- **Redis Unreachable:** All session loads, writes, and rate limit evaluations fail immediately. The engine does **not** failover to in-memory caching to avoid diverging state partitions across instances.
- **OTel Exporter Down:** Telemetry spans are cached locally in memory up to a configured threshold. If the endpoint remains unreachable, oldest telemetry items are evicted, preserving application memory limits.
- **Telegram API Timeout:** If Telegram's servers are slow, outgoing requests time out after a default window (30 seconds), preventing worker process starvation.
