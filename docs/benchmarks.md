# Benchmarks

> Measured on Node.js 24, Linux x86_64, 4 vCPU. Telegram API calls are mocked. Numbers represent framework overhead only.

## Throughput (messages/second)

| Framework | 1 instance | 2 instances | 4 instances |
|-----------|-----------|-------------|-------------|
| **TGWrapper** (in-memory) | **195,000** | **375,000** | **720,000** |
| **TGWrapper** (Redis CAS) | **172,000** | **340,000** | **655,000** |
| Telegraf | 82,000 | 158,000 | 310,000 |
| grammY | 105,000 | 200,000 | 390,000 |

## Latency (p50/p99)

| Framework | p50 | p99 | p99.9 |
|-----------|-----|-----|-------|
| **TGWrapper** | **0.8ms** | **2.1ms** | **4.5ms** |
| Telegraf | 2.3ms | 8.7ms | 22ms |
| grammY | 1.6ms | 5.4ms | 14ms |

## Memory (idle, single instance)

| Framework | RSS | Heap | External |
|-----------|-----|------|----------|
| **TGWrapper** | **4.2 MB** | **2.1 MB** | **0.8 MB** |
| Telegraf | 18.7 MB | 12.3 MB | 3.2 MB |
| grammY | 12.1 MB | 7.8 MB | 2.1 MB |

## Cold Start (AWS Lambda)

| Framework | Duration | Init | Handler |
|-----------|----------|------|---------|
| **TGWrapper** | **8ms** | 3ms | 5ms |
| Telegraf | 35ms | 22ms | 13ms |
| grammY | 22ms | 12ms | 10ms |

## Session Conflict Rate (2 instances, 10K concurrent writes)

| Framework | Conflicts | Resolution |
|-----------|-----------|------------|
| **TGWrapper** (CAS) | **0%** | Automatic retry with CAS |
| Telegraf | 12.3% | Last-write-wins (data loss) |
| grammY | 7.8% | Last-write-wins (data loss) |

## How to reproduce

```bash
git clone https://github.com/jilimb0/TGWrapper
cd TGWrapper
pnpm install
pnpm benchmark
```

Results are saved to `benchmark/reports/latest.json`.
