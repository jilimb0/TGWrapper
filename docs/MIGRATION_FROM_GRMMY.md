# Migration from grammY

## Mapping
- `bot.command('start', fn)` -> `router.command('/start', fn)` or `bot.on('message', ...)` with command parsing
- `bot.on('message:text', fn)` -> `bot.on('message', fn)` and text guard
- grammY session middleware -> TGWrapper `SessionManager` + storage adapters

## Steps
1. Move transport setup to `createBotClient`.
2. Move update handlers to typed `bot.on(...)` callbacks.
3. Replace ad-hoc API calls with typed TGWrapper client methods.
4. Add Redis-backed storage and distributed limiter for production.
5. Run `pnpm verify:release` before rollout.
