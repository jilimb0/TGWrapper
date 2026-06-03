# Production Checklist

## Runtime and lifecycle

- Use explicit lifecycle: `await bot.start()` and graceful `await bot.stop()`.
- Register `bot.on('error', ...)` for fatal and recoverable runtime errors.
- Ensure process signal handling (`SIGTERM`, `SIGINT`) calls `stop()`.

## Security

- Store `BOT_TOKEN` in a secret manager.
- For webhook mode, validate secret token and enforce HTTPS.
- Never log raw payloads containing sensitive user data.

## Redis and data

- Use namespaced keys per environment (`prod`, `staging`).
- Use `RedisCacheStore` for JSON cache + TTL instead of ad-hoc string logic.
- Use `createRateLimiter(...)` for anti-spam and abuse control.

## Observability

- Attach bot telemetry with `attachBotObservability(...)`.
- Track and alert on:
  - runtime errors
  - API errors
  - update throughput
  - handler/API latency
- Keep tags low-cardinality (no user IDs in metric labels).

## API compatibility

- Keep baseline checks green:
  - `pnpm telegram:baseline:check`
  - `pnpm telegram:schema:types:check`
  - `pnpm telegram:schema:payloads:check`
  - `pnpm telegram:schema:results:check`

## Release gates

Run before every release:

```bash
pnpm verify:release
```

Optional deep gate:

```bash
pnpm benchmark
pnpm test:published-smoke
```
