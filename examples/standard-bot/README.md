# Standard Bot Template (Production Blueprint)

This directory provides the recommended production blueprint for building a Telegram bot with **TGWrapper**. It integrates:
- Core Telegram Bot Client
- Redis-backed distributed session adapters with CAS integrity
- Redis sorted set distributed rate limiters
- Structured JSON logging & metrics telemetry

---

## 📁 Project Structure

- `src/bot.ts` — The main entry point initializing Redis, telemetry adapters, and update handlers.
- `package.json` — Workspace dependency configurations.
- `tsconfig.json` — Strict compiler targets.

---

## 🚀 Running Locally

### Prerequisites
1. Node.js >= 18
2. Redis Server running locally on `redis://localhost:6379`
3. A Telegram Bot Token from [@BotFather](https://t.me/BotFather)

### Installation
```bash
pnpm install
```

### Start Development Server
```bash
export BOT_TOKEN="your_bot_token_here"
export REDIS_URL="redis://localhost:6379"

pnpm start
```

---

## 🐳 Scaling to Production

When migrating from local polling to production environments:
1. **Switch to Webhooks:** Set `mode: 'webhook'` in the `createBotClient` configuration block.
2. **Export Handlers:** Wrap the HTTP server integration using native handlers for AWS Lambda or Cloudflare Workers. Refer to the serverless starter templates for details.
3. **Telemetry Dashboard:** Pipe the stdout structured JSON logs to Logstash, Datadog, or Grafana Loki.

---

## 🔗 Next Steps & Team Evaluation

- **Evaluation checklist:** Review the [Team Evaluation Checklist](../../docs/champion/TEAM_EVALUATION_CHECKLIST.md) to audit this blueprint against your production standards.
- **Convince your team:** Share the [Convince Your Team Guide](../../docs/champion/CONVINCE_YOUR_TEAM.md) showing why Compare-and-Swap prevents session races.
- **Run a pilot:** Walk through the [Internal Pilot Playbook](../../docs/champion/PILOT_PLAYBOOK.md) to run a POC migration.
- **Proof of viability:** Test this bot with simulated concurrency by reading the [Proof of Viability Guide](../../docs/PROOF_OF_VIABILITY.md).
