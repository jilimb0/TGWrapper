# Segment-Specific Messaging Packs

This document provides tailored copywriting messaging packs for target user personas: **AI-Native Bot Teams**, **Production Ops Teams**, and **Migrating Teams (Node/Python)**.

---

## 🤖 Messaging Pack 1: AI-Native Bot Builders

- **Target Persona:** Engineers building LLM conversational assistants, customer service AI operators, or autonomous tool-calling bots.
- **Primary Pain Points:**
  - Token counts and latency tracking per user query.
  - Webhook duplicate executions caused by slow LLM inference.
  - Multi-turn conversation state losing version sync.

### 📢 Core Positioning Statement
> **"Build AI-native Telegram bots with timeout contracts, LLM span tracing, and thread safety built in."**

### ✍️ Value Propositions
- **OpenTelemetry AI Traces:** Wrap LLM API calls in trace spans that track input/output token usage alongside standard server logs.
- **Retry Abort Controls:** Retrieve the request's native `AbortSignal` to terminate OpenAI calls if the Telegram webhook 5-second budget runs out, preventing duplicate completions.
- **Race-Safe Conversation History:** Read and write chat history arrays atomically using Redis CAS adapters to prevent concurrent updates from corrupting state.

---

## 🚢 Messaging Pack 2: Production Ops & SRE Teams

- **Target Persona:** DevOps engineers, SREs, and architects running high-traffic bots (>50 updates/sec).
- **Primary Pain Points:**
  - Message duplication under webhook bursts.
  - Lack of trace propagation to correlate errors.
  - Memory leaks or single-process polling bottlenecks.

### 📢 Core Positioning Statement
> **"Scale your Telegram bots to multi-node clusters with zero session overwrites and complete structured telemetry."**

### ✍️ Value Propositions
- **Optimistic Session Locking (CAS):** Lua-driven Redis updates ensure only the correct version writes back, safely scaling update routing across multiple container instances.
- **Structured JSON Logging:** Native AsyncLocalStorage propagation attaches unique `trace_id` and `span_id` values to every update lifecycle log line.
- **Edge Deployment Portability:** The lightweight core runs directly on serverless runtimes (AWS Lambda, Cloudflare Workers) with sub-50ms cold starts.

---

## 🔀 Messaging Pack 3: Migrating JS/Python Teams

- **Target Persona:** TypeScript/Node.js or Python backend developers running Telegraf, grammY, or python-telegram-bot.
- **Primary Pain Points:**
  - Hard-to-maintain custom middleware wraps.
  - Data integrity issues in in-memory session states.
  - Python asyncio loop latency or loose TypeScript definitions.

### 📢 Core Positioning Statement
> **"Migrate from toy-bot wrappers to a typed, production-ready framework."**

### ✍️ Value Propositions
- **Pure TypeScript Contracts:** Clean, typed client payloads replace loose framework context objects (`ctx`).
- **Clear Migration Path:** Step-by-step blueprints and side-by-side comparisons translate commands, sessions, and error handlers directly.
- **Infrastructure-First Design:** Rate limits and session state are managed by first-party Redis adapters instead of custom application logic.
