# Case Study: FormatFlow Converter Bot

**Company:** Personal project
**Industry:** Image conversion / Design tools
**Stack:** TGWrapper + sharp + resvg-js + potrace + tesseract.js

## The Problem

A multi-format image conversion bot supporting SVG ↔ raster, vectorization, and OCR. Needed a framework that could:

- Handle mixed file types (SVG, PNG, JPG, WebP, PDF, ZIP) with format-specific validation
- Enforce daily usage limits per user without storing state in the bot process
- Process files asynchronously without blocking the update loop
- Support both Telegram bot and web UI surfaces

## Why TGWrapper

| Requirement | TGWrapper feature used |
|-------------|----------------------|
| Daily usage limits | Redis distributed rate limiter (sliding window) |
| Async file processing | BoundedConcurrencyQueue with per-resource limits |
| Multi-surface state | RedisSessionStorage shared between bot and web |
| Format routing | TreeRouter with pattern matching on message content |

## Architecture

```
Telegram → PollingSource → TreeRouter → Format router → ConverterCore (sharp/resvg/potrace)
                                        ↕
                              RedisRateLimiter (daily quotas)
                                        ↕
                              RedisSessionStorage (user prefs)
```

## Results

- 37 tests across Core + Bot packages
- Daily quotas enforced with zero state loss on restart (Redis persistence)
- Concurrent file processing with per-user fairness via BoundedConcurrencyQueue
- SVG sanitization prevents XSS vectors in rendered output
- Users process ~500+ conversions per week through the bot

## Key Takeaway

TGWrapper's Redis rate limiter was the critical differentiator — the sliding-window Lua script made daily quotas trivial to implement correctly. No state management code needed beyond the config.
