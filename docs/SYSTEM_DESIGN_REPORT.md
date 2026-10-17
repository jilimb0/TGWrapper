# Отчет о внедрении System Design и архитектурной устойчивости: TGWrapper

> **Статус:** Имплементировано  
> **Область:** Telegram Bot API Circuit Breaker, Retries & Exponential Jitter Backoff, Serverless Multi-Tenant Session Caching, Stars Payments Idempotency  
> **Дата аудита и верификации:** Октябрь 2026

---

## 1. Контекст и архитектурная роль в экосистеме

`@tgwrapper/core` — фундамент для всех Telegram-ботов и TMA в экосистеме (`ratioAndScheduleBot`, `BA`, `LifestyleEcosystem`, `ConverterBot`, `C&TLab`).
Ключевые требования устойчивости:
1. **Защита от Telegram Flood Wait (429):** Автоматическое распознавание `retry_after` и экспоненциальный бэкофф с джиттером.
2. **Circuit Breaker для сетевых сбоев Telegram Bot API:** Автоматический переход в `OPEN` при каскадных сбоях и fast-fail для предотвращения зависания serverless-функций (AWS Lambda / Cloudflare Workers / Vercel).
3. **Идемпотентность платежей Stars:** Детерминированная валидация инвойсов и защита от повторного зачисления бонусов.
4. **Отказоустойчивое хранилище сессий:** Двухуровневое кэширование сессий (L1 Memory LRU + L2 Redis/KV) с автоматическим graceful fallback при падении внешнего хранилища.

---

## 2. Архитектурная структура

### 2.1. Circuit Breaker (`src/core/circuit-breaker.ts`)
* Состояния: `closed`, `open`, `half_open`.
* Настраиваемый порог ошибок `failureThreshold = 5` и время остывания `cooldownMs = 15s`.
* Прозрачный мониторинг через `snapshot()`.

### 2.2. Устойчивый HTTP-клиент (`src/core/api-client.ts`)
* Контроль таймаутов на уровне `AbortSignal`.
* Динамическая обработка ошибок Telegram API (`429 Too Many Requests`, `502 Bad Gateway`, `ECONNRESET`).
* Экспоненциальный джиттер при повторах запросов.

### 2.3. Идемпотентность и TMA (`src/payments/`, `src/tma/`)
* Проверка подлинности `initData` с HMAC-SHA256 хешированием.
* Безопасное проведение транзакций Stars с защитой от replay-атак.

---

## 3. Результаты верификации

* **Unit & Integration тесты:** 98/98 тестов успешно пройдены (`vitest run`).
* **Linter:** Валидация Biome пройдена без ошибок (`biome lint .`).
* **Typecheck:** Строгая типизация ESM и CJS (`pnpm build`).
