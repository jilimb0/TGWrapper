# Support Queue Routing Bot Template

This example demonstrates how to build a stateful support queue routing bot using **TGWrapper**.

---

## ✨ Features Demonstrated

- **Support Routing Engine:** Connects users atomically to available support agents.
- **Optimistic State Updates:** Prevents assigning multiple agents to the same user concurrent queue request.
- **Trace logs:** Telemetry logs matching user messages forward paths.

---

## 🚀 Running Locally

### Installation
```bash
pnpm install
```

### Run
```bash
export BOT_TOKEN="your_bot_token"
export REDIS_URL="redis://localhost:6379"
pnpm start
```

---

## 🔗 Next Steps & Team Evaluation

- **Evaluation checklist:** Review the [Team Evaluation Checklist](../../docs/champion/TEAM_EVALUATION_CHECKLIST.md) to audit this blueprint against your production standards.
- **Convince your team:** Share the [Convince Your Team Guide](../../docs/champion/CONVINCE_YOUR_TEAM.md) showing why Compare-and-Swap prevents session races.
- **Run a pilot:** Walk through the [Internal Pilot Playbook](../../docs/champion/PILOT_PLAYBOOK.md) to run a POC migration.
- **Proof of viability:** Test this bot with simulated concurrency by reading the [Proof of Viability Guide](../../docs/PROOF_OF_VIABILITY.md).
