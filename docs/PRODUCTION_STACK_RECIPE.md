# TGWrapper Production Stack Recipe

## Stack
- `@jilimb0/tgwrapper` (core runtime)
- `@jilimb0/tgwrapper-adapter-redis` (sessions/cache/rate-limit)
- `@jilimb0/tgwrapper-observability` (logs/metrics hooks)

## Deployment Patterns
- Railway/Fly.io: Node HTTP webhook adapter
- AWS Lambda: Lambda webhook adapter
- Cloudflare Workers: Worker webhook adapter

## Baseline Checklist
1. Configure Redis and `REDIS_URL`.
2. Enable distributed rate limiter.
3. Enable observability hooks and structured logging.
4. Configure CI gates (`verify:release`).
5. Enforce branch protection and required checks.
