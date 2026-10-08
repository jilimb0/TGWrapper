# TGWrapper — План развития Telegram фреймворка и TMA платформы

> **Мировой бенчмарк:** Grammy / Telegraf / Botpress ($50M+ Val)  
> **Суть продукта:** Production Telegram бот-фреймворк на TypeScript с Redis стейтом, надежностью, rate-limiting, circuit-breaker и обсервабилити.  
> **Текущий статус:** 119 TS файлов, 34 теста, v0.19.0 на npm, 7 CI workflows, строгая типизация.  
> **Главная миссия:** Стать единым бэкенд-фундаментом для ВСЕХ Telegram-продуктов студии, обеспечивая мгновенный запуск Telegram Mini Apps и платежей Telegram Stars в одну строчку кода.

---

## 1. Технический бэклог доработок: Модуль `@tgwrapper/tma` (Telegram Mini Apps)

- [x] **Криптографическая валидация `initData`:**
  - Реализовать утилиту `validateInitData(initDataRaw: string, botToken: string): boolean` с проверкой HMAC-SHA256 подписи Telegram WebApp.
  - Безопасный парсинг данных пользователя: ID, username, firstName, lastName, languageCode, queryId.
  - Проверка срока давности хэша (защита от replay-атак, maxAge = 24 часа).
- [x] **Универсальные Middleware для бэкендов:**
  - `tmaAuthMiddleware` для **Express / Node HTTP** (`tmaExpressMiddleware`)
  - `tmaAuthMiddleware` для **Next.js App Router (Route Handlers)** (`validateNextJsTmaRequest`)
  - `tmaAuthMiddleware` для **Hono / Cloudflare Workers** (`tmaHonoMiddleware`)
  - Автоматическое внедрение типизированного объекта `req.telegramUser` в контекст запроса.
- [x] **Связка с сессиями TGWrapper:**
  - Автоматическая привязка `telegramUser.id` к Redis/Failsafe хранилищу сессий TGWrapper для сохранения состояния между ботом и Mini App (`TmaSessionBridge`).

---

## 2. Модуль платежей Telegram Stars (`@tgwrapper/payments`)

- [x] **Хелпер создания инвойсов Telegram Stars:**
  - Метод `createStarsInvoiceLink({ title, description, starsPrice, payload })` с валютой `XTR`.
- [x] **Обработчик вебхуков оплаты:**
  - Middleware валидации `pre_checkout_query` (мгновенный ответ `answerPreCheckoutQuery(true)`).
  - Обработка события `successful_payment` с триггером бизнес-логики (активация подписки, запись к мастеру, начисление баланса).
  - *Переиспользуется в:* `service-app` (предоплата брони), `Speech` (оплата минут), `ratioAndScheduleBot` (подписка).

---

## 3. Модель монетизации и внешнего использования

* **Core SDK:** Open Source на npm (`@tgwrapper/core`, `@tgwrapper/tma`).
* **Managed Bot Cloud:** Платный облачный хостинг для ботов с гарантией аптайма 99.99% и встроенным Redis стейтом ($9–$29/мес).

---

## 4. Пошаговые спринты реализации

### Спринт 1: Реализация криптографической валидации TMA
- [x] Написать `src/tma/validate-init-data.ts` с тестами на валидные и поддельные подписи
- [x] Написать парсер параметров `initData` с типизацией и безопасной валидацией
- [x] Добавить юнит-тесты на проверку replay-атак (auth_date)

### Спринт 2: Middleware для Express и Next.js
- [x] Реализовать `src/tma/middleware/express.ts`
- [x] Реализовать `src/tma/middleware/nextjs.ts`
- [x] Протестировать интеграцию на тестах Mini App (включая Hono и сессионный мост)

### Спринт 3: Модуль Telegram Stars платежей
- [x] Реализовать генератор ссылок на оплату звёздами (`XTR`)
- [x] Написать хэндлер `successful_payment` и `answerPreCheckoutQuery`
- [ ] Опубликовать мажорное обновление `@tgwrapper/core` (или `@tgwrapper/tma`) на npm

