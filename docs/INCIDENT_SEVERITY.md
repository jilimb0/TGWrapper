# Incident Severity Model & Response SLA

This model defines the severity classifications, response SLAs, communication rules, and rollback expectations for TGWrapper production incidents.

---

## 📊 1. Severity Classifications

We classify operational issues into four severity tiers based on user impact:

| Severity Level | Definition / Criteria | Expected Initial Response | Rollback Trigger |
| :--- | :--- | :--- | :--- |
| **Sev 1: Critical** | **Total Outage.** Bot does not respond to any update requests. Core session adapter crashes or database data corruption occurs. | **Within 30 Minutes** | **Immediate.** Revert to the last stable release or package tag. |
| **Sev 2: High** | **Degraded Service.** Key features (e.g. FSM ticket creation, distributed rate limits) fail, or response latency exceeds 5s. | **Within 2 Hours** | **Within 4 Hours** if no hotfix is verified. |
| **Sev 3: Medium** | **Partial Issue.** Specific non-critical commands fail, or telemetry metrics are degraded but user interactions remain functional. | **Within 24 Hours** | No automatic rollback required; deploy hotfix in standard CI cycle. |
| **Sev 4: Low** | **Minor Defect.** Documentation typos, minor metrics naming discrepancies, or formatting glitches. | **Within 3 Business Days** | Resolve in the next planned minor release. |

---

## 📞 2. Communication Policy

During active **Sev 1** or **Sev 2** incidents, the on-call team commits to:

- **Status Updates:** Update status dashboards or community channels every **30 minutes** for Sev 1, and every **2 hours** for Sev 2.
- **Incident Commander:** Appoint a single engineer to coordinate debugging efforts, preventing multiple developers from deploying conflicting hotfixes.
- **Postmortem Requirement:** Any Sev 1 or Sev 2 incident **must** document resolution steps in a formal [Incident Postmortem](./POSTMORTEM_TEMPLATE.md) within 5 business days of resolution.
