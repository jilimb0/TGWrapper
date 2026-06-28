# Case Study: MyPersFin Bot

**Company:** Personal project
**Industry:** Personal finance
**Stack:** TGWrapper + Expo (React Native) + TypeORM + BullMQ

## The Problem

A multi-platform personal finance tracker with voice transcription for expenses. Required a Telegram bot that could:

- Guide users through a multi-step expense recording flow (amount → category → currency → confirm)
- Handle voice messages for hands-free expense logging
- Integrate with a backend API for persistence across mobile and bot surfaces
- Scale to support premium gating via Telegram Stars

## Why TGWrapper

| Requirement | TGWrapper feature used |
|-------------|----------------------|
| Multi-step expense flow | SessionManager FSM with state persistence |
| Voice message handling | Incoming voice → Transcription → FSM state machine |
| Cross-surface state | RedisSessionStorage for shared sessions between bot and API |
| Premium gating | TreeRouter guards for paid vs free features |

## Architecture

```
Telegram → Webhook → TGWrapper → SessionManager (Redis) → BullMQ → Transcription → API
                              ↕
                         TreeRouter
                        /          \
                  Free routes    Premium routes
```

## Results

- Seamless expense recording: start on mobile, finish on bot (shared Redis sessions)
- Voice transcription integrated into the FSM flow: voice → transcribed → amount extracted → saved
- Premium gating enforced at the router level with zero overhead in handler code
- ~1,000+ expenses logged through the bot interface

## Key Takeaway

The combination of FSM sessions and TreeRouter made the multi-platform architecture tractable. Shared Redis session storage meant the user could switch between mobile app and bot mid-flow without losing state.
