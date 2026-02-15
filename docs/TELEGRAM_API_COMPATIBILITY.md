# Telegram Bot API Compatibility (Target: 9.4)

## Compatibility Target

- Target baseline: **Telegram Bot API 9.4**.
- Type baseline: **local TGWrapper Telegram types** in `/Users/jilimbo/Documents/Personal/TGWrapper/src/types/telegram.ts`.
- Policy: compatibility is validated by release gates (`typecheck:compat` + contract tests).

## Supported

- Generic method invocation through `ApiClient.callApi(method, payload)` for any Telegram method name.
- Update intake for all Bot API update objects that include numeric `update_id`.
- Message-centric flows:
  - `message`
  - `edited_message`
  - `channel_post`
  - `edited_channel_post`
  - `business_message`
  - `edited_business_message`
- Callback flows:
  - `callback_query`
- Context chat/source fallback support for non-message updates:
  - `chat_join_request`
  - `chat_member`
  - `my_chat_member`
  - `message_reaction`
  - `message_reaction_count`
  - `removed_chat_boost`

## Limited

- `Context.reply` requires resolvable `chat_id`; updates without chat scope are intentionally rejected.
- `Context.editMessage` requires resolvable message target (`callback_query.message` or message-like update).
- Router command extraction is message-text centric and does not interpret non-message commands.

## Not Covered Yet

- Per-feature high-level helpers for every new 9.x object/method.
- Dedicated runtime handlers for every 9.x business/stars/gifts workflow.
- Auto-generated, version-pinned internal Telegram schema.

## Verification Gates

- Type-level compatibility checks: `test/types/telegram-api-compat.typecheck.ts`
- Contract tests: `test/telegram-api-compat.contract.test.ts`
- Release gate command: `pnpm verify:release`

## Upgrade Procedure

1. Review latest official Telegram Bot API changelog.
2. Update local types in `/Users/jilimbo/Documents/Personal/TGWrapper/src/types/telegram.ts` and related compatibility tests.
3. Run:
   - `pnpm typecheck:compat`
   - `pnpm test`
   - `pnpm verify:release`
4. If Telegram introduces new behavior used by TGWrapper, add/adjust:
   - runtime fallback logic,
   - compatibility tests,
   - this document.
