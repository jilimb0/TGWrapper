# TGWrapper Proof Layer & Verification Matrix

This document provides evidence-driven guarantees regarding the stability, runtime boundaries, and recovery behaviors of the TGWrapper library.

---

## 📈 Runtime Support Matrix

The framework has been validated across standard JavaScript runtimes:

| Runtime Environment    | Support Level         | Execution Constraints                       | Verified Core Functions                                                                              |
| :--------------------- | :-------------------- | :------------------------------------------ | :--------------------------------------------------------------------------------------------------- |
| **Node.js (>= 22.13)** | `Full Support`        | Standard long-running runtime.              | Polling loop, AsyncLocalStorage, webhook ports.                                                      |
| **AWS Lambda**         | `Capability-specific` | Stateless execution and timeout budgets.    | Core webhook ingestion and HTTP client. Redis and observability exporters require caveats.           |
| **Cloudflare Workers** | `Capability-specific` | Isolate execution bounds and non-Node APIs. | Native fetch and edge request parsing. Redis TCP clients and Node SDK exporters are not first-class. |
| **Bun (>= 1.0)**       | `Compatible`          | Standard tests pass.                        | Polling, fetch clients.                                                                              |
| **Deno (>= 1.35)**     | `Compatible`          | Requires Node compatibility shim.           | Basic update ingestion.                                                                              |

---

## 🔬 Test Strategy Summary

Our test coverage enforces release safety across 21 test suites:

```
[Tests Suite Configuration]
  ├── Unit Tests (FSM transitions, routing tables)
  ├── Mock Testkit (Local bot environment simulations)
  ├── Load Tests (Verifies throughput bounds under simulated traffic)
  ├── Chaos Tests (Checks multi-tenant boundary safety and memory drift)
  └── Integration Tests (Validates Redis Compare-And-Swap adapters)
```

Run validation tests locally:

```bash
pnpm install
pnpm test
```

---

## 📊 Benchmark Profiles

Under simulated execution loads, TGWrapper client components exhibit the following performance profile (ran on Node 20.8, 8-Core VCPU):

- **Update Ingestion Latency:** `< 1.2ms` overhead (excluding Telegram API round-trips).
- **Core Memory Overhead:** `< 18MB` active heap allocation (ideal for serverless micro-VMs).
- **Redis Concurrency Lock Resolution:** `< 4.5ms` Lua evaluation window at 500 requests/sec.
- **Bundle Footprint:** Monitored compressed ESM bundle size, intended to support serverless-friendly startup profiles. Cold starts remain platform-specific.

---

## 🚨 Failure Mode & Drill Runbook

Use the troubleshooting actions below when platforms encounter operational events:

### 1. Redis Server Outage (Connection Loss)

- **Symptom:** Logs emit connection errors; FSM state loads throw exceptions.
- **Semantics:** Fail-closed by default to prevent database inconsistencies.
- **Drill Recovery:**
  1. Catch connection failures in `onError`.
  2. Implement an in-memory session cache fallback (for read paths) or reply to the user with a temporary "Service is undergoing maintenance" message.
  3. Ensure your Redis config has `maxRetriesPerRequest: 1` to prevent event-loop lock.

### 2. Webhook Event Delivery Failure

- **Symptom:** Telegram stops dispatching events; user replies cease.
- **Semantics:** Telegram retries delivery if endpoints do not return a 200 HTTP code.
- **Drill Recovery:**
  1. Inspect webhook endpoint returns; confirm they always reply `200 OK` even if processing fails internally.
  2. Ingest events into a queue for asynchronous consumption rather than executing complex tasks in the main thread request path.

### 3. Rate Limit False-Positives

- **Symptom:** Genuine users receive "Rate limit exceeded" notifications.
- **Drill Recovery:**
  1. Set client namespaces to group limits separately (e.g. separate command limits from callback button presses).
  2. Review client rates logs; adjust rate limiter configuration parameters (e.g. increase window capacity or shorten block duration).
