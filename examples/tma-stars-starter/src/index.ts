import { serve } from '@hono/node-server';
import { ApiClient } from '@tgwrapper/core';
import { createStarsInvoiceLink } from '@tgwrapper/core/payments';
import { tmaHonoMiddleware } from '@tgwrapper/core/tma';
import type { TelegramUser } from '@tgwrapper/core/tma';
import { Hono } from 'hono';

const botToken = process.env.BOT_TOKEN || '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
const apiClient = new ApiClient({ token: botToken });
const app = new Hono();

// 1. Authenticate Telegram Mini App requests via HMAC-SHA256 initData
app.use('/api/*', tmaHonoMiddleware(botToken));

// 2. Fetch authenticated TMA user profile
app.get('/api/me', (c) => {
  const user = c.get('telegramUser') as TelegramUser | undefined;
  return c.json({ ok: true, user });
});

// 3. Create Telegram Stars invoice link for TMA checkout
app.post('/api/checkout-stars', async (c) => {
  const user = c.get('telegramUser') as TelegramUser | undefined;
  const { starsPrice = 50, item = 'Pro Pass' } = await c.req.json().catch(() => ({}));

  const invoiceUrl = await createStarsInvoiceLink(apiClient, {
    title: item,
    description: `Upgrade to ${item} for user ${user?.first_name ?? 'Guest'}`,
    payload: `order_${user?.id}_${Date.now()}`,
    starsPrice: Number(starsPrice),
  });

  return c.json({ ok: true, invoiceUrl });
});

const port = Number(process.env.PORT || 3000);
console.log(`Telegram Mini App + Stars API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
