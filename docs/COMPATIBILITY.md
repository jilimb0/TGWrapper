# Support & Compatibility Matrix

This document defines the official support window, runtime environment compatibility, module standards, and infrastructure dependencies for all packages within the TGWrapper ecosystem.

> For capability-level runtime truth, use [COMPATIBILITY_MATRIX.md](./COMPATIBILITY_MATRIX.md). This page is a broad support-window overview; it does not mean every package feature works identically in every runtime.

---

## 💻 Node.js Engine Support

TGWrapper requires Node.js `>=22.13`.

| Node.js Version     | Support Level | CI Verification | Notes                                                            |
| :------------------ | :------------ | :-------------- | :--------------------------------------------------------------- |
| **Node.js < 22.13** | `Unsupported` | ❌ No           | The workspace `package.json` enforces `engines.node: ">=22.13"`. |
| **Node.js 22.13+**  | `Supported`   | ✅ Yes          | Required runtime for all TGWrapper packages and examples.        |

---

## 🌐 JavaScript Runtimes & Serverless Platforms

TGWrapper's core webhook path is designed for long-lived server processes and ephemeral edge environments. Capability support differs by package:

| Runtime Environment           | Webhook Mode       | Polling Mode       | Context Propagation (`AsyncLocalStorage`) | Support Level          |
| :---------------------------- | :----------------- | :----------------- | :---------------------------------------- | :--------------------- |
| **Node.js Standard Process**  | ✅ Fully Supported | ✅ Fully Supported | ✅ Supported                              | `Primary`              |
| **Cloudflare Workers (Edge)** | ✅ Core Supported  | ❌ Unsupported     | ⚠️ Fallback Behavior                      | `Capability-specific`  |
| **AWS Lambda (Serverless)**   | ✅ Core Supported  | ❌ Unsupported     | ⚠️ Fallback Behavior                      | `Capability-specific`  |
| **Bun**                       | ⚠️ Compatible      | ⚠️ Compatible      | ⚠️ Runtime-dependent                      | `Community-compatible` |
| **Deno**                      | ⚠️ Compatible      | ⚠️ Compatible      | ⚠️ Runtime-dependent                      | `Community-compatible` |

### Edge Runtimes Support Details

- **No Long-Polling:** Edge and Serverless execution environments enforce rigid request timeouts. Long-polling (`mode: 'polling'`) is strictly blocked in these environments. You must configure `mode: 'webhook'`.
- **AsyncLocalStorage Fallbacks:** In edge engines where `AsyncLocalStorage` is not fully supported or is disabled, the `@tgwrapper/observability` context propagation behaves as a global fallback trace holder. Spans are still captured but trace propagation through nested async limits may be degraded.

---

## 📦 Module Delivery Formats

All official packages are distributed with dual-format builds supporting both JavaScript module resolution models:

- **ES Modules (ESM):** Native standard module structure (`import`/`export`).
- **CommonJS (CJS):** Legacy standard (`require`/`module.exports`).

We run automated bundle audits during releases to guarantee correct export entry declarations in `package.json` configurations.

---

## 🗄️ Redis Infrastructure Compatibility

The `@tgwrapper/adapter-redis` package is tested against official Redis releases:

| Redis Server Version | Support Level | Notes / Rationale                                                    |
| :------------------- | :------------ | :------------------------------------------------------------------- |
| **Redis < 6.2**      | `Unsupported` | Lack of core Lua script primitives and specific sorted set commands. |
| **Redis 6.2.x**      | `Supported`   | Baseline compatibility level.                                        |
| **Redis 7.x**        | `Supported`   | Recommended production engine.                                       |
| **KeyDB / Valkey**   | `Compatible`  | Drop-in replacements verified with standard commands.                |

### Topology Support Scope

- **Standalone:** Full native support.
- **Managed Redis (ElastiCache / MemoryDB):** Full support. We recommend tuning client-side TCP `keepAlive` keepalives to prevent connection drop timeouts.
- **Redis Sentinel:** Supported by injecting sentinel-ready client configurations.
- **Redis Cluster:** Supported with slot routing restrictions (session keys must configure `{hash-tags}`).
- **Read-Replica Partitioning:** Not recommended due to read-after-write consistency lag risks in distributed FSM session evaluations.
