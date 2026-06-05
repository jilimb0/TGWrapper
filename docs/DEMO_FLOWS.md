# Demo Flows

TGWrapper has three canonical demo stories. Keep public demos focused on these paths so new users can map the platform to a concrete use case quickly.

## 1. Production-Safe Bot

**Audience:** New TypeScript Telegram bot teams.

**Path**
1. Create a starter with `pnpm create @tgwrapper my-bot --template standard`.
2. Set `BOT_TOKEN` and run local polling.
3. Trigger one command and one text handler.
4. Stop the process with `SIGINT` and confirm graceful shutdown logs.

**Confidence signal:** The user sees typed handlers, structured startup logs, env validation, and clean shutdown without learning Redis first.

## 2. Distributed Bot With Redis

**Audience:** Teams running multiple instances or stateful workflows.

**Path**
1. Create a starter with `pnpm create @tgwrapper my-bot --template standard`.
2. Set `BOT_TOKEN` and `REDIS_URL`.
3. Run two local processes against the same Redis.
4. Trigger repeated state updates for the same chat.
5. Inspect CAS behavior and Redis-backed rate limit logs.

**Confidence signal:** The user understands why Redis is used, how conflicts are surfaced, and what must be handled in application logic.

## 3. AI Bot With Observability

**Audience:** Teams building assistants or LLM-backed support flows.

**Path**
1. Start from the support starter or AI reference implementation.
2. Enable observability and structured logs.
3. Run a sample flow that calls an LLM/provider boundary.
4. Confirm the incoming Telegram update, session work, and external call share a correlation path.
5. Review timeout and failure behavior.

**Confidence signal:** The user sees how TGWrapper makes an AI incident debuggable: which update triggered the call, which session state was involved, how long the provider took, and how the failure was surfaced.

## Release Gate

Before using a demo in public launch material:

- The demo must run from a clean directory outside the monorepo.
- The README path must not require manual copying from `node_modules`.
- The expected logs must match the current starter output.
- The demo must link to the relevant truth docs: [Compatibility Matrix](./COMPATIBILITY_MATRIX.md), [Platform Guarantees](./PLATFORM_GUARANTEES.md), and [Proof Map](./PROOF_MAP.md).
