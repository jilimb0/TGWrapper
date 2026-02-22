---
"@jilimb0/tgwrapper-observability": minor
---

Add APM-grade observability primitives:

- metrics registry with sampling, cardinality guard, and rate limiting
- Prometheus rendering/exporter and OTLP metrics exporter
- tracing API (`startSpan`, `endSpan`, `withSpan`) with correlation context propagation
- error taxonomy (`class`, `code`, `retryable`, `source`)
- runtime hook helpers for bot/api/queue/db events
- observability health probes (`dropped metrics`, `export lag`, `queue depth`)
- structured correlation ids in ECS logger output

This prepares the package for the `0.5.0` feature line.
