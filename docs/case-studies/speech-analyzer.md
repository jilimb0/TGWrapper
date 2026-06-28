# Case Study: Speech Analyzer Bot

**Company:** Personal project
**Industry:** Communication / Self-improvement
**Stack:** TGWrapper + Fastify + Whisper STT + PostgreSQL

## The Problem

A Telegram Mini App that transcribes voice messages and analyzes filler word usage (Russian "ну", "как бы", "типа"). Needed a framework that could:

- Handle concurrent voice message uploads from multiple users
- Maintain per-user session state across transcription → analysis → feedback flow
- Provide structured logging for debugging transcription pipeline latency

## Why TGWrapper

| Requirement | TGWrapper feature used |
|-------------|----------------------|
| Concurrent file uploads | BoundedConcurrencyQueue with fair scheduling |
| Multi-step flow | SessionManager FSM with TreeRouter |
| Latency debugging | EcsJsonLogger with AsyncLocalStorage correlation IDs |
| Deployment | WebhookHandler on Fastify |

## Architecture

```
Telegram → Webhook → TGWrapper → SessionManager → Transcription service → Analysis engine → Response
                              ↕
                    EcsJsonLogger (structured logs)
```

## Results

- Zero session conflicts across concurrent uploads
- Full traceability: each voice message processing has a correlation ID visible across logs
- ~200ms median latency from upload to transcription start
- 3-week development time from zero to working prototype

## Key Takeaway

TGWrapper's explicit session model (CAS + FSM) eliminated the "which state is this user in" ambiguity that plagued earlier attempts with other frameworks.
