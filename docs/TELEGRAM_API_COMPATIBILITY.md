# Telegram Bot API Compatibility (Target: 9.4)

## Compatibility Target

- Target baseline: **Telegram Bot API 9.4**
- Local type source: `src/types/telegram.ts`
- Baseline file: `docs/telegram-api-baseline.json`

Compatibility is release-gated by type checks, contract tests, schema checks, and release readiness workflows.

## Supported

- Generic API invocation via `ApiClient.callApi(method, payload)` for Telegram method names.
- Update intake for Telegram update objects with numeric `update_id`.
- Message-centric flows:
  - `message`
  - `edited_message`
  - `channel_post`
  - `edited_channel_post`
  - `business_message`
  - `edited_business_message`
  - `deleted_business_messages`
- Business connectivity flow: `business_connection`
- Callback flow: `callback_query`
- Context fallbacks for non-message updates:
  - `chat_join_request`
  - `chat_member`
  - `my_chat_member`
  - `message_reaction`
  - `message_reaction_count`
  - `removed_chat_boost`
  - `chat_boost`
  - `poll_answer.voter_chat`

## Limited

- `Context.reply` requires resolvable `chat_id`; updates without chat scope are rejected intentionally.
- `Context.editMessage` requires resolvable message target (`callback_query.message` or message-like update).
- Router command extraction is message-text centric.

## Not Covered as High-Level Helpers

- Dedicated helper methods for every Bot API object/method.
- Feature-specific runtime abstractions for every business/stars/gifts workflow.

These are still reachable through typed `callApi` contracts.

## Verification Gates

- Type-level compatibility checks: `test/types/telegram-api-compat.typecheck.ts`
- Contract tests: `test/telegram-api-compat.contract.test.ts`
- Baseline check: `pnpm telegram:baseline:check`
- Schema completeness check: `pnpm telegram:schema:completeness:check`
- Strict full-coverage check: `pnpm telegram:schema:coverage:full:check`
- Release checks: `pnpm verify:release` and `pnpm verify:1.0`

## Upgrade Procedure

1. Review latest Telegram Bot API changelog.
2. Run baseline/snapshot sync pipeline:
   - `pnpm telegram:baseline:latest`
   - `pnpm telegram:schema:fetch`
   - `pnpm telegram:schema:drift:report`
3. Update local types/runtime/tests as needed.
4. Regenerate schema-derived artifacts if required.
5. Re-run:
   - `pnpm verify:release`
   - `pnpm verify:1.0`
