# TGWrapper Platform Roadmap

Current Version: **v0.21.1** · Node.js: **>=24.0** · Status: **Production Ready**

---

## 🚀 Shipped Milestones

### v0.21.x — Bot API 10.x/10.4, HTMLBubbles & Orchestration Security
- ✅ **Telegram Bot API 10.x & 10.4 Parity:** Streaming draft engine (`sendMessageDraft`, `sendRichMessageDraft`, `ActiveDraftRegistry`), `RichMessageBuilder` (tables, expandable block quotes up to 32 KB), `guest_message` / `stopped_message_generation` / `managed_bot` routing, and ephemeral button replies (`EphemeralMessageParameters`, `quote_rich_texts`).
- ✅ **HTMLBubbles (`./tma`):** Sub-package micro-app runtime with bundle minification, 32 KB sandbox byte limit, security scanner, and HMAC state verification.
- ✅ **Native HTML Widgets & Shared Widgets:** `sendWidget`, `sendSharedWidget`, `answerWidgetQuery`, `editMessageWidgetData`, `editSharedWidgetData`, `router.widgetQuery()`, `router.sharedWidgetQuery()`, and 1–32 KB / `<= 4 KB` zlib enforcement.
- ✅ **Telegram Stars, Gifts & TON Wallet:** `getMyStarBalance`, `createChatSubscriptionInviteLink`, `sendGift`, `convertGiftToStars`, plus `TonWalletCard`, `TonWalletTransfer`, `WidgetQueryWallet` transaction events and data signing.
- ✅ **CAS Approval Gates & Zero-Leakage Webhooks (`ADR-0005`):** `ApprovalGateBotBridge` wired to `SessionManager.compareAndSet` (`ag:<action>:<gateId>:<version>`), constant-time webhook secret verification (`crypto.timingSafeEqual`), and deep recursive PII + `bot[REDACTED]` token redaction in `@tgwrapper/observability`.

### v0.20.x — API Parity & Multi-Package Architecture
- ✅ **Telegram Bot API 8.x Sync:** Automated drift detection, ephemeral message methods, and updated payloads.
- ✅ **Telegram Mini Apps (`./tma`):** Cryptographic `initData` verification via `crypto.timingSafeEqual` and HMAC-SHA256.
- ✅ **Telegram Stars & Payments (`./payments`):** Invoice generation, pre-checkout query verification, and star transaction support.
- ✅ **Dual ESM/CommonJS Distribution:** Strict `dist/` (ESM) and `dist-cjs/` (CJS) dual builds with `sideEffects: false`.
- ✅ **OpenTelemetry SDK Integration:** `@tgwrapper/observability` package with standard semantic conventions, trace propagation, and Prometheus exporter.

### v0.19.x — Ecosystem Expansion
- ✅ **DynamoDB Session Storage:** `@tgwrapper/adapter-dynamodb` with atomic CAS via conditional attribute updates.
- ✅ **MongoDB Session Storage:** `@tgwrapper/adapter-mongodb` with atomic CAS via `findOneAndUpdate` versioning.
- ✅ **Built-in Middleware Pipeline:** Global and per-route before/after hooks via `useMiddleware()` and `Middleware<TContext>`.
- ✅ **Interactive Webhook Debugger:** In-memory ring buffer with live HTML inspection dashboard for local webhook testing.

### v0.18.x — Production Hardening
- ✅ **FailsafeSessionStorage:** Automatic in-memory fallback on Redis connectivity degradation.
- ✅ **API Stability Policy:** Documented SemVer guarantees and stability levels ([API Stability Policy](docs/API_STABILITY.md)).
- ✅ **Monolith Splitting:** Separated `@tgwrapper/adapter-redis` and `@tgwrapper/observability` into standalone workspace packages.
- ✅ **Testing & Coverage Thresholds:** Vitest test suite enforcing 70% line/function and 60% branch coverage minimums.
- ✅ **Biome v2.x Integration:** Standardized formatting and linting gates enforced in CI.
- ✅ **Migration Cookbook:** 12 enterprise migration patterns for Telegraf, Grammy, and Python bot developers.
- ✅ **Case Studies & Landing Page:** Published real-world case studies, benchmark dashboard, and GitHub Pages documentation site.

---

## 🎯 Active Milestone: v0.22.x / v1.0 — Performance Profiling & Launch Readiness (Current Focus)

- [ ] **Memory Profiling Hooks:** Standardized hooks for capturing heap snapshots and detecting memory leaks under sustained webhook loads.
- [ ] **Flamegraph Profiling Tooling:** Scripts and recipes to record CPU profiles and generate interactive flamegraphs during load tests.
- [ ] **Benchmark Trend Dashboard:** Automated tracking of updates-per-second (UPS) and memory footprints published to GitHub Pages on release.
- [ ] **Local Webhook Simulator:** CLI simulator to replay and fuzz webhook events locally without tunneling services (ngrok/localtunnel).
- [ ] **v1.0.0 Release Verification:** Formal API snapshot freeze, stability audit, and final package budget validation.

---

## 🔮 Upcoming Milestones

### v1.1 — Extended Storage & Edge Runtimes
- [ ] **PostgreSQL Session Adapter:** `@tgwrapper/adapter-postgres` utilizing `SELECT FOR UPDATE` or version-based CAS.
- [ ] **SQLite / LibSQL Session Adapter:** `@tgwrapper/adapter-sqlite` optimized for single-node edge or embedded environments.
- [ ] **Edge Runtime Presets:** Dedicated starter configurations for Deno Deploy, Fastly Compute, and Bun.
- [ ] **Distributed Sliding-Window Rate Limiter:** Redis-backed sliding-window rate limiting for per-user and per-chat quotas.

### v1.2+ — Tooling & Ecosystem
- [ ] **Visual FSM Flow Builder:** Interactive web-based or schema-driven state machine designer.
- [ ] **Bot Marketplace & Plugin Registry:** Discoverable modular plugins for common Telegram workflows (auth, subscriptions, admin tools).
- [ ] **Deno Runtime Direct Packaging:** First-class npm/jsr distribution targeting native Deno runtimes.
- [ ] **Local Emulation Suite:** High-fidelity Telegram Bot API mock server for comprehensive end-to-end testing.
