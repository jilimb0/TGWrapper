# Supported Deployment Profiles

Use these profiles instead of reasoning about abstract runtime portability.

## 1. Single-Process Polling Bot

- Runtime: Node.js process on a laptop, VPS, container, or VM.
- Packages: `@tgwrapper/core`.
- State: in-memory or application-managed persistence.
- Observability: stdout logs; optional `@tgwrapper/observability`.
- Best for: local development, low-volume bots, early prototypes.
- Avoid when: multiple replicas share one bot token, state must survive restarts, or webhook/serverless is required.

## 2. Multi-Instance Node Bot With Redis

- Runtime: Node.js containers, Kubernetes, VM fleet, or process manager.
- Packages: `@tgwrapper/core`, `@tgwrapper/adapter-redis`, optional `@tgwrapper/observability`.
- State: Redis CAS sessions and Redis-backed distributed rate limits.
- Observability: JSON logs, Prometheus/OTLP in Node.js.
- Best for: production bots with shared state, horizontal scaling, explicit conflict handling.
- Caveats: Redis availability is a hard dependency; hotspot keys need retry/backoff strategy.

## 3. AWS Lambda Webhook Bot

- Runtime: AWS Lambda behind API Gateway or equivalent HTTP ingress.
- Packages: `@tgwrapper/core`; Redis and observability are possible with caveats.
- State: prefer external storage; Redis requires connection management and cold-start planning.
- Observability: platform logs plus push/export patterns.
- Best for: event-driven webhook bots with bursty traffic.
- Caveats: polling unsupported; long handlers should move work to queues.

## 4. Cloudflare Worker Lightweight Bot

- Runtime: Cloudflare Workers.
- Packages: `@tgwrapper/core`.
- State: Cloudflare-native storage or HTTP-accessible external services.
- Observability: console logs and edge-compatible exporters.
- Best for: lightweight webhook handlers close to users.
- Caveats: Node-specific APIs, TCP Redis, Node OpenTelemetry SDK, and graceful shutdown semantics are not first-class.

## 5. AI Bot With Observability

- Runtime: Node.js process or webhook deployment with explicit timeout budgets.
- Packages: `@tgwrapper/core`, `@tgwrapper/observability`, optional `@tgwrapper/adapter-redis`.
- State: Redis strongly recommended for multi-turn conversations across instances.
- Observability: trace IDs, LLM span timing, token usage attributes where providers expose them.
- Best for: tool-using bots, assistants, cost/latency-sensitive workflows.
- Caveats: provider latency can exceed webhook budgets; background queues may be required.

