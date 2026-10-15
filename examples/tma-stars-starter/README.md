# Telegram Mini App + Stars Starter (`@tgwrapper/core`)

Minimal, production-ready backend for a Telegram Mini App with HMAC-SHA256 `initData` validation and native Telegram Stars (`XTR`) digital payments in under 35 lines of code.

## Features

- 🔐 **HMAC-SHA256 InitData Validation:** Middleware via `tmaHonoMiddleware` validates `initData` header and extracts user info.
- ⭐ **Telegram Stars Checkout:** Generates native invoice links (`https://t.me/$...`) using `createStarsInvoiceLink`.
- ⚡ **Hono / Node / Cloudflare Workers ready:** Ultra-lightweight and fast.

## Quick Start

```bash
# Set your Bot Token from @BotFather
export BOT_TOKEN="your_bot_token_here"

# Run development server
pnpm dev
```

## API Endpoints

- `GET /api/me` — Returns validated Telegram user details.
- `POST /api/checkout-stars` — Generates a Stars payment invoice link (`invoiceUrl`) for client-side `openInvoice` invocation.
