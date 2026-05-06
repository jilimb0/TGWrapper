# Why TGWrapper

TGWrapper is built for teams shipping serious Telegram bots in TypeScript where uptime, debuggability, and rollout confidence matter more than demo-level speed.

## Core Value
- Serverless-first architecture
- Typed Telegram API contracts
- Runtime resilience primitives (retry, circuit breaker, queue, rate limit)
- Production deployment portability (Node HTTP, AWS Lambda, Cloudflare Worker)

## Who It Is For
- Teams running bots in cloud/serverless environments
- Projects with compliance and observability requirements
- Bots with complex routing/session lifecycle needs

## What Is Different
- Compatibility gates and baseline checks for Telegram API drift
- Explicit release policy and CI gates
- Redis + observability packages as first-party ecosystem modules
