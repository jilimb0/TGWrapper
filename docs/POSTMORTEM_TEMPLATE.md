# Incident Postmortem Template

**Incident ID:** [e.g. SEV1-2026-06-04-REDIS]  
**Severity:** [Sev 1 / Sev 2]  
**Owner / Lead:** [Name]  
**Date:** [YYYY-MM-DD]  

---

## 📝 1. Executive Summary

Provide a 3-sentence summary of what happened, user impact, and the resolution path.

---

## 📊 2. User & System Impact

- **Affected Features:** [e.g. Session Persistence, Incoming Updates Ingestion]
- **Outage Duration:** [e.g. 42 minutes]
- **Approximate Users Affected:** [e.g. ~1,500 active bot users]
- **Symptom Metrics:** [e.g. `updates_errors_total` spiked to 450/sec, `session_conflict_total` rose to 80%]

---

## 🕒 3. Incident Timeline

List key detection, mitigation, and recovery events:
- **12:00 UTC** — Incident triggered; anomalies detected in metrics.
- **12:10 UTC** — Alerts fired on Slack channel.
- **12:15 UTC** — Incident commander assigned; log diagnostics trace trace ID correlation failures.
- **12:30 UTC** — Hotfix deployed to main.
- **12:42 UTC** — Metrics return to baseline; system fully operational.

---

## 🔬 4. Root Cause Analysis (5 Whys)

1. **Why did the bot fail to respond?** Because the webhook ingestion endpoints returned HTTP 500 errors.
2. **Why did the endpoints return HTTP 500 errors?** Because the session adapter failed to connect to Redis.
3. **Why did the session adapter fail to connect to Redis?** [Provide details...]
4. **Why...**

---

## 🛠️ 5. Corrective Action Items

List action items to prevent future occurrences:

| Action Item | Owner | Target Date | Status |
| :--- | :--- | :--- | :--- |
| [e.g. Add TCP Keep-Alive flags to Redis client settings] | [Name] | [YYYY-MM-DD] | `Pending` |
| [e.g. Set up alerting rules for connection pool saturation] | [Name] | [YYYY-MM-DD] | `Pending` |
