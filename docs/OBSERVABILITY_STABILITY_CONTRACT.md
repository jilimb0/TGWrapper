# Observability Stability Contract

This document separates stable production-safe behavior from evolving telemetry surfaces.

## Stable Production-Safe

- Structured lifecycle event names for core update handling.
- `MetricsRegistry` counter/histogram storage behavior.
- JSON logger interface shape.
- Node.js `AsyncLocalStorage` trace context boundary.

## Beta With Caution

- OpenTelemetry span bridge details.
- AI/LLM token and latency attribute naming.
- Runtime behavior in serverless environments.
- Export recipes for third-party collectors.

## Experimental

- Any provider-specific LLM cost conventions.
- Edge-runtime tracing beyond structured events and explicit trace propagation.
- Automatic cross-runtime context propagation guarantees.

## Change Policy

Before 1.0, minor releases may refine telemetry attributes and exporter behavior. Breaking schema changes must be documented in package changelogs and reflected in [TELEMETRY_SCHEMA.md](./TELEMETRY_SCHEMA.md).

