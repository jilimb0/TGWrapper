# Team Evaluation Checklist

Use this checklist with your engineering team to evaluate if TGWrapper matches your technical requirements and operational standards.

---

## 📋 Evaluation Categories

### 1. Functional & Architecture Fit
- [ ] **TypeScript Stack:** Is the codebase strictly Node.js, Bun, Deno, or edge JavaScript targets? (TGWrapper is TS-first).
- [ ] **Multi-Instance Deployment:** Do you run, or plan to run, 2+ container processes of your bot behind a load balancer? (If yes, Redis CAS sessions are a primary fit).
- [ ] **AI / Long-Running Calls:** Does your bot make LLM calls or complex database updates that exceed 5 seconds? (If yes, AbortSignals prevent duplicate sends).

### 2. Migration Cost Audit
- [ ] **Route Configuration:** Estimate time to convert `bot.command()` patterns into matching router/guard conditions inside a global `message` handler.
- [ ] **Context Dependencies:** Inspect how heavily handlers depend on framework magic context extensions (e.g. `ctx.reply`, custom session wrappers). Plan migration to explicit functions.
- [ ] **Session Model Transition:** Define the type interfaces for your user states. Verify they have version counters.

### 3. Operations & Infrastructure Impact
- [ ] **Redis Availability:** Is a Redis cluster >= 6.2 available in your production environments?
- [ ] **Monitoring Ecosystem:** Do you use Prometheus, Datadog, New Relic, or Grafana Loki? (If yes, `@tgwrapper/observability` parses directly).
- [ ] **Serverless/Edge Runtimes:** Are you deploying to AWS Lambda or Cloudflare Workers? (If yes, verify webhook configurations).

### 4. Maintenance Expectations
- [ ] **Upstream Bot API Updates:** Who monitors Bot API type modifications? (TGWrapper resolves this via weekly baseline drift checkers).
- [ ] **Support Bounds:** Read and agree with [Maintainer Support Guidelines](../MAINTAINER_SUPPORT.md) separating core library issues from custom app support.

---

## 🔄 Rollback & Fallback Path

- [ ] **Zero Data Lock-in:** Ensure session states are stored in standard JSON schemas inside Redis. If rolling back, standard tools can read/write the keys.
- [ ] **API Call Equivalence:** TGWrapper uses standard request payloads matching official Bot API calls. Porting calls back to other libraries is direct.
