---
"@tgwrapper/core": patch
---

Add support for Telegram Bot API 10.4:
- Native HTML Widgets & Shared Widgets (`sendWidget`, `sendSharedWidget`, `answerWidgetQuery`, `editMessageWidgetData`, `editSharedWidgetData`)
- Widget size & zlib compression limits enforcement (1-32 KB raw, <= 4 KB compressed)
- TON Wallet integration (`TonWalletCard`, `TonWalletTransfer`, `WidgetQueryWallet`, transaction events and data signing)
- Ephemeral button replies via `EphemeralMessageParameters` (`callback_query_id`, `replace_callback_query_message`)
- Rich message quoting in `ReplyParameters` (`quote_rich_texts`)
- Router matchers (`router.widgetQuery()`, `router.sharedWidgetQuery()`) and Context actions (`ctx.replyWidget()`, `ctx.replySharedWidget()`, `ctx.answerWidgetQuery()`, `ctx.editWidgetData()`, `ctx.editSharedWidget()`)
- Testkit update factories for widget queries and TON transfers
