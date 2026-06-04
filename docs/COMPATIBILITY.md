# Support & Compatibility Matrix

This document defines the official support window, runtime environment compatibility, module standards, and infrastructure dependencies for all packages within the TGWrapper ecosystem.

---

## 💻 Node.js Engine Support

TGWrapper guarantees support for modern Node.js Long Term Support (LTS) releases:

| Node.js Version | Support Level | CI Verification | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js < 18** | `Unsupported` | ❌ No | Deprecated features, lack of modern Fetch API primitives. |
| **Node.js 18 (LTS)** | `Supported` | ✅ Yes | Baseline verification target. |
| **Node.js 20 (LTS)** | `Supported` | ✅ Yes | Recommended production environment. |
| **Node.js 22 (LTS)** | `Supported` | ✅ Yes | Fully validated. |

---

## 🌐 JavaScript Runtimes & Serverless Platforms

We compile TGWrapper to run seamlessly in both long-lived server processes and ephemeral edge environments:

| Runtime Environment | Webhook Mode | Polling Mode | Context Propagation (`AsyncLocalStorage`) | Support Level |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js Standard Process** | ✅ Fully Supported | ✅ Fully Supported | ✅ Supported | `Primary` |
| **Cloudflare Workers (Edge)** | ✅ Fully Supported | ❌ Unsupported | ⚠️ Fallback Behavior | `First-Class` |
| **AWS Lambda (Serverless)** | ✅ Fully Supported | ❌ Unsupported | ⚠️ Fallback Behavior | `First-Class` |
| **Bun** | ✅ Fully Supported | ✅ Fully Supported | ✅ Supported | `Compatible` |
| **Deno** | ✅ Fully Supported | ✅ Fully Supported | ✅ Supported | `Compatible` |

### Edge Runtimes Support Details
- **No Long-Polling:** Edge and Serverless execution environments enforce rigid request timeouts. Long-polling (`mode: 'polling'`) is strictly blocked in these environments. You must configure `mode: 'webhook'`.
- **AsyncLocalStorage Fallbacks:** In edge engines where `AsyncLocalStorage` is not fully supported or is disabled, the `@jilimb0/tgwrapper-observability` context propagation behaves as a global fallback trace holder. Spans are still captured but trace propagation through nested async limits may be degraded.

---

## 📦 Module Delivery Formats

All official packages are distributed with dual-format builds supporting both JavaScript module resolution models:

- **ES Modules (ESM):** Native standard module structure (`import`/`export`).
- **CommonJS (CJS):** Legacy standard (`require`/`module.exports`).

We run automated bundle audits during releases to guarantee correct export entry declarations in `package.json` configurations.

---

## 🗄️ Redis Infrastructure Compatibility

The `@jilimb0/tgwrapper-adapter-redis` package is tested against official Redis releases:

| Redis Server Version | Support Level | Notes / Rationale |
| :--- | :--- | :--- |
| **Redis < 6.2** | `Unsupported` | Lack of core Lua script primitives and specific sorted set commands. |
| **Redis 6.2.x** | `Supported` | Baseline compatibility level. |
| **Redis 7.x** | `Supported` | Recommended production engine. |
| **KeyDB / Valkey** | `Compatible` | Drop-in replacements verified with standard commands. |

### Topology Support Scope
- **Standalone:** Full native support.
- **Managed Redis (ElastiCache / MemoryDB):** Full support. We recommend tuning client-side TCP `keepAlive` keepalives to prevent connection drop timeouts.
- **Redis Sentinel:** Supported by injecting sentinel-ready client configurations.
- **Redis Cluster:** Supported with slot routing restrictions (session keys must configure `{hash-tags}`).
- **Read-Replica Partitioning:** Not recommended due to read-after-write consistency lag risks in distributed FSM session evaluations.
