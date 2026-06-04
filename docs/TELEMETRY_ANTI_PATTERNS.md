# Telemetry Anti-Patterns & Best Practices

This guide highlights common telemetry instrumentation anti-patterns to avoid when using `@tgwrapper/observability`.

---

## 🚫 Telemetry Anti-Patterns

### 1. High-Cardinality Metric Labels
- **Anti-Pattern:** Adding unique identifiers (e.g. `userId`, `chatId`, `messageText`, or UUIDs) as labels inside Prometheus custom counters.
- **Consequence:** Prometheus memory exhaustion due to the exponential growth of metric series.
- **Best Practice:** Keep metric labels restricted to finite, low-cardinality keys (e.g., `update_type`, `error_class`, `mode`). Put high-cardinality values inside trace span attributes or structured log fields instead.

### 2. Large Data Payloads in Span Attributes
- **Anti-Pattern:** Saving large JSON bodies, files, or complete database schemas as attributes in trace spans.
- **Consequence:** Telemetry shipping queues slow down, triggering memory allocation spikes in edge runtimes.
- **Best Practice:** Only capture indexing metadata keys (e.g., `session.id`, `user.hash`) inside span attributes.

### 3. Log Duplication inside Spans
- **Anti-Pattern:** Logging the same event info as both a stdout structured JSON log and a trace span event within the same execution path.
- **Consequence:** Redundant telemetry payload sizes that increase ingestion billing costs.
- **Best Practice:** Use traces to analyze execution timelines and duration bottlenecks, and structured logs to track operational milestones and warn signatures.
