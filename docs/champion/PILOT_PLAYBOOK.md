# Internal Pilot Playbook

This playbook provides a structured template for running a low-risk internal Proof of Concept (POC) pilot of TGWrapper in your team.

---

## 🏃 Step 1: Candidate Selection (Risk Minimization)

Do not migrate your primary, business-critical bot on Day 1. Select a candidate meeting these criteria:
- **Low-impact utility bot** (e.g. staging test utility, alert forwarding bot, or support queue router).
- **Uses session state** (needs multi-turn conversations so you can evaluate the Redis adapter's Compare-and-Swap safety).
- **Suffers from known bugs** (e.g. rate limit overflows, webhook retry duplicates, or missing log correlation).

---

## 🎯 Step 2: Establish Success Criteria

Define clear targets before starting the pilot:

| Target Area | Baseline (Old Stack) | Success Criteria (TGWrapper Pilot) |
| :--- | :--- | :--- |
| **Data Integrity** | Occasional session state loss / overwrites | Zero lost session states during concurrent stress |
| **Observability** | Multi-server grep required for debugs | Locate full lifecycle of an update in <60 seconds via `trace_id` |
| **Resource Efficiency** | Slow cold start / High CPU usage | <50ms edge cold start / Zero rate-limiting memory leaks |
| **Developer DX** | Loose types, implicit `any` contexts | Clean lint builds with zero compiler type overrides |

---

## 🛠️ Step 3: Run the 2-Week Sprint

1. **Week 1 (Implementation):**
   - Fork the existing bot repository.
   - Use the [Migration Starter Template](../../examples/migration-starter/) to port core logic.
   - Attach Redis and observability modules.
   - Run unit and integration tests locally.
2. **Week 2 (Staging Validation & Fuzzing):**
   - Point the POC to a staging bot token.
   - Simulate concurrency: write a script to send 20 requests per second from multiple user accounts.
   - Kill the Redis primary node to verify fail-closed auto-reconnect behaviors.

---

## 📊 Step 4: Measurement & Rollout Review

At the end of the sprint, present the findings to your team:
- Compare old code complexity vs. TGWrapper routes.
- Show the telemetry dashboard logs grouping incoming messages by trace context.
- Decide whether to roll out the framework across all production bots.
