# Observability Incident Guide

`@tgwrapper/observability` is easiest to adopt when it starts from incidents rather than dashboards. Use this guide to map common production symptoms to traces, metrics, and logs.

## Duplicate Updates

**Look for**
- Multiple spans with the same Telegram `update_id`.
- Repeated handler logs with different process IDs or deployment versions.
- Redis CAS conflicts around the same session key.

**Useful signals**
- `update_id`, `trace_id`, `tenant_id`, `bot_id`, handler name, session key, CAS result.

**Response**
- Confirm webhook retry behavior or polling ownership.
- Check whether the handler is idempotent.
- Use Redis CAS conflict logs to distinguish duplicate delivery from concurrent user actions.

## Missing Correlation

**Look for**
- Logs without `trace_id`.
- Downstream Redis or LLM calls that cannot be tied to an update.
- Runtime profile mismatch, especially serverless/edge paths.

**Useful signals**
- Runtime name, request entrypoint, `AsyncLocalStorage` availability, exporter status.

**Response**
- Verify the bot entrypoint calls `attachBotObservability()` before registering handlers.
- In non-Node runtimes, pass correlation IDs explicitly where async context is unavailable.
- Compare the target runtime against [Observability Runtime Support](./OBSERVABILITY_RUNTIME_SUPPORT.md).

## Slow Handlers

**Look for**
- Handler duration p95/p99 growth.
- Spans dominated by Telegram API, Redis, or LLM calls.
- Increased timeout/cancellation logs.

**Useful signals**
- Handler duration, external call duration, retry count, `AbortSignal` cancellation reason.

**Response**
- Split local CPU work from downstream calls in traces.
- Add explicit timeouts around slow external dependencies.
- Move long work to a queue when webhook response budgets are at risk.

## Failed AI Calls

**Look for**
- LLM spans with provider error codes.
- Token usage spikes or responses cut at max token limits.
- Missing prompt/session correlation.

**Useful signals**
- Provider, model, request timeout, completion status, token counts when available, user/session key.

**Response**
- Confirm provider status and quota.
- Log prompt metadata, not sensitive prompt content, unless your privacy policy allows it.
- Add fallback replies for transient provider failures.

## Retry Storms

**Look for**
- High duplicate error counts with short intervals.
- Webhook retries plus internal retries compounding.
- Redis or provider throttling after deployment.

**Useful signals**
- Retry attempt, retry source, error class, rate limiter result, webhook status code.

**Response**
- Add capped exponential backoff with jitter.
- Stop retrying non-retryable Telegram/provider errors.
- Prefer fail-fast for dependencies that are globally unavailable.
