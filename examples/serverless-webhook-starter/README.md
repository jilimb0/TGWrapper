# TGWrapper Serverless Webhook Starter

A reference template showing how to handle Telegram updates via webhooks in serverless, edge, and event-driven computing environments.

---

## 🏗️ Architecture

Unlike polling bots, webhook bots are completely passive. They do not run a background polling loop, making them perfect for cost-effective scaling on Cloudflare Workers, AWS Lambda, or Vercel:

```mermaid
graph LR
    Telegram[Telegram Bot API] -- POST Update JSON -- Webhook[HTTP Request Intake]
    Webhook --> Ingest[BotClient.ingest]
    Ingest --> Route[TGWrapper Router & Handlers]
```

---

## 🛠️ Getting Started

### 1. Configuration
Set the mandatory environment variable:
```env
BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
```

### 2. Local Run
To test webhook endpoints locally, you can use tunneling utilities like `ngrok` or `localtunnel` to route traffic to a local server:

```bash
# Install dependencies
pnpm install

# Start local server entrypoint
pnpm start
```

---

## 🚀 Deploying to Production

When deploying to serverless platforms:

### 1. Cloudflare Workers
Export the runtime's standard `fetch` handler:
```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'webhook' });
await bot.start();

export default {
  async fetch(request: Request) {
    if (request.method === 'POST') {
      const update = await request.json();
      await bot.ingest(update);
      return new Response('OK', { status: 200 });
    }
    return new Response('Method Not Allowed', { status: 405 });
  }
};
```

### 2. AWS Lambda (API Gateway Integration)
```typescript
import { createBotClient } from '@jilimb0/tgwrapper';

const bot = createBotClient({ token: process.env.BOT_TOKEN!, mode: 'webhook' });
await bot.start();

export const handler = async (event: any) => {
  const body = JSON.parse(event.body || '{}');
  await bot.ingest(body);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success' })
  };
};
```

### 3. Registering the Webhook URL
To start receiving events, notify Telegram about your newly deployed URL:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_DEPLOYED_URL>"
```
