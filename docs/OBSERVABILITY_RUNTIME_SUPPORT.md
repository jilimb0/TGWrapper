# Observability Runtime Support

`@tgwrapper/observability` is strongest in Node.js because it relies on `AsyncLocalStorage` for automatic async context propagation.

| Capability | Node.js Process | AWS Lambda | Cloudflare Workers | Notes |
| --- | --- | --- | --- | --- |
| Structured JSON events | Full | Full | Full | Console/stdout collection is platform-specific. |
| In-process counters | Full | Partial | Partial | Short-lived runtimes reset process-local counters. |
| AsyncLocalStorage trace propagation | Full | Partial | Partial | Degrades when runtime async context support differs from Node.js. |
| Prometheus pull exporter | Full | Partial | Unsupported | Pull scraping fits long-running services best. |
| OTLP JSON export | Full | Partial | Partial | Serverless/edge must push before timeout. |
| OpenTelemetry Node SDK bridge | Full | Partial | Unsupported | Depends on Node SDK support. |
| AI/LLM span helpers | Full | Partial | Partial | Provider token metadata and timeout budgets vary. |

## Recommended Rule

- Use full automatic tracing in Node.js services.
- Use explicit trace IDs across platform boundaries.
- Treat serverless/edge observability as "structured events first, exporters second".
- Benchmark telemetry overhead with your actual exporter and handler workload.

