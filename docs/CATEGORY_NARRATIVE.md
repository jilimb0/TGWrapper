# Category Narrative: TGWrapper

This document serves as the messaging source-of-truth for TGWrapper, outlining our positioning strategy and how we address production requirements for scaled Telegram bot architectures.

---

## 💥 The Core Problem

Building simple Telegram bots is easy; maintaining production-grade Telegram services is difficult.

Most teams start with simple, single-process bots using basic wrappers (like grammY or Telegraf). However, once these services scale to millions of users or handle transaction-critical actions:
1. **Concurrency Clashes:** Concurrent user button taps trigger session write races, silently overwriting FSM (Finite State Machine) steps.
2. **Observability Black Boxes:** Troubleshooting execution bottlenecks (such as slow downstream LLM calls) becomes challenging due to a lack of request context propagation.
3. **Edge Portability Boundaries:** Moving standard Node.js bot codebases to lightweight, fast Edge/Serverless runtimes (like Cloudflare Workers) requires rewriting transport and adapter configurations.

---

## 🎯 The TGWrapper Wedge

TGWrapper is a dedicated Telegram bot platform designed for teams that require distributed state, edge portability, and production-grade telemetry out of the box.

```
  [Stateless Ingestion] + [Atomic Redis Session CAS] + [Structured Logs & OTel Spans]
                                      │
                                      ▼
                        "TGWrapper Production Engine"
```

### 1. Atomic Version-Locked Sessions
Instead of simple key-value overwrites, TGWrapper leverages Redis Lua-backed Compare-and-Swap (CAS) optimistic locks. If a write conflict is detected, it fails cleanly, ensuring state integrity.

### 2. Native Edge Portability
The core client library is built around web-standard APIs such as `fetch`, `Request`, and `Response`. Webhook-oriented handler architecture can be shared across Node.js processes, Cloudflare Workers, and AWS Lambda, while runtime-specific capabilities such as polling, Redis TCP clients, and observability exporters remain explicitly documented.

### 3. Built-in OpenTelemetry
Logging, tracing, and metrics are primary citizen hooks. Dynamic Trace ID propagation ensures every API call and database operation can be correlated on APM dashboards.
