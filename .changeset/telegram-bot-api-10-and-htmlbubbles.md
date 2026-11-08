---
"@tgwrapper/core": minor
---

Add support for Telegram Bot API 10.x and HTMLBubbles:
- Streaming draft engine via `sendMessageDraft` and `sendRichMessageDraft` with adaptive throttler and `ActiveDraftRegistry`
- Structured `RichMessageBuilder` with tables, expandable block quotes, and rich blocks up to 32,768 characters
- `HTMLBubbles` subsystem in `./tma` with bundle minification, 32 KB sandbox byte limit, security scanner, and HMAC state verification
- Routing for `guest_message` with `ephemeralGuestSessions`, `stopped_message_generation`, `subscription`, and `managed_bot`
- Telegram Stars & Gifts: `getMyStarBalance`, `createChatSubscriptionInviteLink`, `sendGift` with signatures, and `convertGiftToStars`
