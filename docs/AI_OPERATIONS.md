# AI Operations & Observability Foundation

This document defines the metrics contracts, trace configurations, error mitigation rules, and tracing guidelines for building AI-native bots with TGWrapper.

---

## 🕵️ 1. LLM Tracing & Token Metrics

To measure API cost, latency, and performance of conversational assistants, wrap model invocations inside logical span blocks:

```
  [Tracer: withSpan("ai_generation")]
        │
        ├──> Span Attribute: llm.provider = "openai"
        ├──> Span Attribute: llm.model = "gpt-4o"
        │
        ├──> Call External LLM API
        │
        └──> Log usage metrics (prompt_tokens, completion_tokens)
```

### Standard Attribute Schema
All AI-related span events must capture these standard metadata fields:
- `llm.provider` (string): e.g., `openai`, `anthropic`.
- `llm.model` (string): e.g., `gpt-4o`, `claude-3-5-sonnet`.
- `llm.usage.prompt_tokens` (integer): Input count tokens.
- `llm.usage.completion_tokens` (integer): Output count tokens.
- `llm.usage.total_tokens` (integer): Total tokens cost.

---

## 🛠️ 2. Timeout Configurations & Retries

AI requests can execute for seconds. Enforce strict timeout boundaries:

- **Handler Timeouts:** Ensure AI-based message handlers use the context's `AbortSignal` to cancel queries if the user interface reaches execution limits.
- **Retry Limits:** Implement backoff-retry strategies for recoverable errors (such as HTTP 429 rate limits or transient 5xx server issues). Do **not** retry queries that fail due to token budget exhaustion.

---

## 🔗 3. Correlation Maps (Trace ID Passing)

To trace operations across systems, pass the active `traceId` as an HTTP header to external AI endpoints:

```typescript
import { ContextStore } from '@jilimb0/tgwrapper-observability';

const context = ContextStore.getStore();
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'X-Correlation-ID': context?.traceId || '' // Correlate trace in external dashboard
  },
  body: JSON.stringify({ ... })
});
```
This enables end-to-end trace mapping from user tap to model response.
