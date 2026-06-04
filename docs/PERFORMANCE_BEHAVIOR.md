# Performance Degradation & Resource Model

This document outlines the performance profiles, memory budgets, telemetry execution costs, and resource consumption limits of the TGWrapper platform.

---

## ⚡ 1. Latency Overhead Profiles

The execution overhead of the core package is designed to be minimal:

- **Core Ingestion Loop:** `< 0.2ms` execution time overhead per update (excluding handler logic).
- **Telemetry Hook Overhead:** `< 0.05ms` per hook when logging JSON stdout.
- **OTel Span Processing:** `< 0.15ms` per standard span.
- **Redis Session CAS Roundtrip:** Typically `2ms` to `10ms` depending on network latency to the Redis instance.

---

## 📦 2. Memory Budgets & Footprint

TGWrapper is optimized for edge runtimes where memory allocations are strictly capped (e.g., 128MB on Cloudflare Workers):

- **Bundle Size Budget:** The core library builds to under **50KB** (gzipped), ensuring rapid cold starts.
- **In-Memory Telemetry Spans Cache:** The OpenTelemetry trace collector bridge caps active memory buffer queues at **1000 items**. If telemetry endpoints are offline, oldest items are dropped to prevent memory exhaustion (OOM).

---

## 🚨 3. Performance Degradation Warning Signs

Monitor these resource metrics to identify performance degradation:

- **Telemetry Buffer Evictions:** Spikes in telemetry drop alerts indicate trace collection pipeline blockages.
- **Update Duration Spikes:** Average duration values rising above 1000ms typically signal database locking issues or synchronous event loop blocks.
- **Redis Connection Failovers:** Rising reconnect numbers indicate resource exhaustion on Redis nodes.
- **CPU Spikes (>80%):** Indicates high rates of Redis Lua script execution (ZSET limit cleanup or CAS operations). Consider scale-out adjustments or shard partitions.
