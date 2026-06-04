# Operations Runbook

This runbook provides step-by-step diagnostic procedures and mitigation strategies for production incidents on TGWrapper deployments.

---

## 🚨 Incident Index

- [Incident 1: Bot Stopped Responding / Downtime](#incident-1-bot-stopped-responding--downtime)
- [Incident 2: Duplicate Messages Loop](#incident-2-duplicate-messages-loop)
- [Incident 3: Webhook Delivery Failures (HTTP 5xx)](#incident-3-webhook-delivery-failures-http-5xx)
- [Incident 4: Redis Unavailable](#incident-4-redis-unavailable)
- [Incident 5: Memory Growth & Event Loop Lag](#incident-5-memory-growth--event-loop-lag)
- [Incident 6: Tracing / Log Export Broken](#incident-6-tracing--log-export-broken)
- [Incident 7: AI / LLM Model Timeouts](#incident-7-ai--llm-model-timeouts)
- [Incident 8: AI Tool Call Hangs](#incident-8-ai-tool-call-hangs)
- [Incident 9: AI Context Overgrowth](#incident-9-ai-context-overgrowth)
- [Incident 10: AI Cost Spike](#incident-10-ai-cost-spike)
- [Incident 11: Wrong AI Tool Sequence](#incident-11-wrong-ai-tool-sequence)
- [Incident 12: Partial AI Response Generation](#incident-12-partial-ai-response-generation)
- [Incident 13: Emergency Release Rollback](#incident-13-emergency-release-rollback)

---

## Incident 1: Bot Stopped Responding / Downtime

### Symptoms
- Users report no responses from the bot.
- `updates_received_total` metric is flat or zero.

### Diagnostic Actions
1. **Check process logs:** Look for startup failures or unhandled exceptions.
2. **Verify Telegram Connection:** Run a simple curl command to verify token validity:
   ```bash
   curl -s https://api.telegram.org/bot<TOKEN>/getMe
   ```
3. **Verify webhooks status:** Check the active webhook config:
   ```bash
   curl -s https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

---

## Incident 2: Duplicate Messages Loop

### Symptoms
- Users receive duplicate replies for a single button tap or query.
- High rates of `session_conflict_total` metrics in dashboards.

### Diagnostic Actions
1. **Check webhook response latency:** Ensure the webhook server returns a `200 OK` status to Telegram within **5 seconds**. If latency is > 5s, Telegram retries delivery.
2. **Review handler task delegators:** If tasks (e.g. AI processing) take longer than 5s, ensure they run asynchronously in the background while the handler returns a `200 OK` immediately.

---

## Incident 3: Webhook Delivery Failures (HTTP 5xx)

### Symptoms
- Telegram `getWebhookInfo` outputs high `has_custom_certificate_errors` or `last_error_date`.
- Webhook ingest servers return HTTP `500` or `502` status codes.

### Diagnostic Actions
1. **Verify SSL Configuration:** Ensure your server supports TLS >= 1.2 with valid trusted certificates.
2. **Inspect payload parser logs:** Look for JSON serialization errors or invalid request bodies.

---

## Incident 4: Redis Unavailable

### Symptoms
- Handlers throw connection timeout or node isolation exceptions.
- Observability logs emit `session.error` or `ratelimit.error` events.

### Mitigation Actions
1. **Verify Redis status:** Ping the instance using `redis-cli ping`.
2. **Check cluster configuration:** Ensure your node connections do not exceed limits.
3. **Check failover progress:** If using Redis Sentinel, verify that a new master node was promoted correctly.

---

## Incident 5: Memory Growth & Event Loop Lag

### Symptoms
- Worker memory consumption grows linearly.
- Event loop lag metrics exceed 100ms.

### Diagnostic Actions
1. **Check telemetry spans:** Ensure all custom spans started via `Tracer.startSpan()` are closed with a matching `Tracer.endSpan()`. Open, unclosed spans will leak memory.
2. **Inspect telemetry buffers:** Check that OTel exporters are not buffering events indefinitely due to connection failures.

---

## Incident 6: Tracing / Log Export Broken

### Symptoms
- Dashboards and trace UIs show no new spans or show gaps for recent requests.
- Structured logs are absent or contain only startup messages.
- `tgwrapper.trace_id` fields are missing or blank across log lines.

### Where to Look First
1. **Check exporter connectivity:** Verify the OTLP or Prometheus endpoint is reachable from the bot process.
2. **Inspect exporter error logs:** Most OTel exporters log export failures to stderr. Look for `Failed to export spans` or `ECONNREFUSED`.
3. **Validate `AsyncLocalStorage` propagation:** If using custom async boundaries (`setTimeout`, raw callbacks), context may not propagate. Verify that all async paths run inside `tracer.withSpan()`.

### Probable Causes
| Cause | Signal |
| :--- | :--- |
| OTLP collector unreachable | Export errors in stderr |
| Exporter buffer full | Spans dropped silently after queue limit |
| Context lost at async boundary | `traceId` blank on downstream logs |
| Span never closed | Memory growth + missing span end event |

### Immediate Mitigation
1. If collector is down, exporter will drop spans silently. Fix connectivity or restart collector sidecar.
2. If `AsyncLocalStorage` is the cause, add `tracer.withSpan` wrapper at each async re-entry point.
3. If spans are leaking (never closed), add `tracer.endSpan()` in all error paths and `finally` blocks.

### Follow-up
- Add an alerting rule on `span_export_error_total > 0` to catch this earlier.
- Review all `setTimeout`/`setInterval` usages to ensure context propagation.

---

## Incident 7: AI / LLM Model Timeouts

### Symptoms
- Users experience long delays when waiting for conversational AI replies.
- Observability traces display incomplete `ai_generation` spans.

### Mitigation Actions
1. **Set request timeouts:** Ensure your LLM fetch calls use explicit timeouts (e.g. 10s) and link to the update context's `AbortSignal`:
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000);
   ```
2. **Configure fallback responses:** When a timeout occurs, return a friendly message to the user ("The AI assistant is taking longer than usual. Please try again.") to close the interaction flow.

---

## Incident 8: AI Tool Call Hangs

### Symptoms
- Bot hangs while resolving external tool calls (e.g., database queries or search APIs).
- The `update_processing` trace span duration extends past 15s.

### Mitigation Actions
1. **Wrap tool calls in timeouts:** Do not allow custom tools to run indefinitely. Apply timeout wrappers to tool execution loops.
2. **Implement circuit breakers:** If a tool dependency fails repeatedly, temporarily disable the tool and fall back to pure language generation.

---

## Incident 9: AI Context Overgrowth

### Symptoms
- LLM API calls begin failing with `context_length_exceeded` or `413` errors.
- `ai.prompt_tokens` metric grows unbounded across a conversation session.
- Response quality degrades as older context is truncated by the model.

### Where to Look First
1. Check `ai.prompt_tokens` in the `ai_generation` span attributes.
2. Inspect session state size: large tool-call transcripts accumulate quickly.

### Immediate Mitigation
1. Implement a sliding window on conversation history: keep last N turns only.
2. Summarize prior context using a cheap model call before the main generation step.
3. Set a hard token budget guard before submitting to the model:
   ```typescript
   if (estimatedTokens(messages) > CONTEXT_LIMIT * 0.85) {
     messages = trimHistory(messages);
   }
   ```

### Follow-up
- Add `ai.prompt_tokens` alert at 80% of your model's context window.
- Document per-session history retention policy in your bot's operational docs.

---

## Incident 10: AI Cost Spike

### Symptoms
- LLM provider billing dashboard shows unexpected surge.
- `ai.total_tokens` metric shows a step-change increase.
- No corresponding increase in user activity.

### Where to Look First
1. Check `ai.total_tokens` per-conversation in traces — identify conversations generating disproportionate token counts.
2. Look for loops: a tool returning an error may be retried infinitely without a retry cap.
3. Check for missing abort signals on long-running generation chains.

### Immediate Mitigation
1. Enforce a maximum retry count (e.g. `maxRetries: 2`) on AI step loops.
2. Add a per-conversation token budget cap and hard-stop when exceeded.
3. If the spike is ongoing: temporarily disable AI features via a feature flag while investigating.

### Follow-up
- Alert on `ai.total_tokens` rate-of-change > 3x baseline.
- Audit all AI tool chains for unbounded retry patterns.

---

## Incident 11: Wrong AI Tool Sequence

### Symptoms
- Bot calls tools in an unexpected order, producing incorrect or nonsensical results.
- Traces show tool spans executing out of the expected dependency graph order.
- Users receive partially coherent responses referencing unavailable context.

### Where to Look First
1. Inspect the full `tool_call` span sequence in the trace for the affected update.
2. Compare against the expected tool graph defined in your agent prompt.
3. Check if the model received a malformed or truncated system prompt.

### Immediate Mitigation
1. Validate tool outputs before passing to the next step — reject unexpected tool responses.
2. Add a guard asserting required tool preconditions before execution:
   ```typescript
   if (!context.state.userVerified) throw new Error('user_verification_required');
   ```
3. Reduce model temperature or add explicit tool-ordering instructions to the system prompt.

### Follow-up
- Log `tool_call_sequence` as a span attribute to make ordering auditable.
- Add integration tests covering the expected tool execution order for critical flows.

---

## Incident 12: Partial AI Response Generation

### Symptoms
- Bot sends a truncated message that ends mid-sentence.
- LLM API response shows `finish_reason: length` instead of `stop`.
- `ai.completion_tokens` is exactly at the model's `max_tokens` limit.

### Where to Look First
1. Check `ai.completion_tokens` vs configured `max_tokens` in the `ai_generation` span.
2. Look for `finish_reason: "length"` in the raw API response log.

### Immediate Mitigation
1. Increase `max_tokens` if the response type legitimately requires more output.
2. If token budget is a constraint, restructure the prompt to produce shorter outputs or stream responses progressively.
3. Detect and handle partial responses gracefully:
   ```typescript
   if (response.finishReason === 'length') {
     await bot.sendMessage(chatId, '[Response was cut off. Please ask again with a shorter question.]');
   }
   ```

### Follow-up
- Set an alert on `finish_reason == 'length'` rate > 5% of completions.
- Review whether your prompt design pushes completions near the token limit by default.

---

## Incident 13: Emergency Release Rollback

### Step-by-Step Rollback Plan
1. **Identify the working revision:** Locate the last working git tag or commit SHA.
2. **Revert package publication:** If a broken version was published to npm, deploy the previous working version using:
   ```bash
   pnpm publish --tag rollback
   ```
3. **Rollback environment deploys:** Revert edge workers or serverless tasks to use the previous stable container or bundle.
4. **Postmortem Logging:** Create an incident log detailing the root cause and mitigation steps to prevent regression.
