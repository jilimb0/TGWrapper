# Security Policy

This document defines supported package versions, vulnerability reporting channels, expected response SLAs, and disclosure policies for the TGWrapper ecosystem.

---

## 🛡️ Supported Versions

Only security updates for major releases are officially supported. We backport critical fixes to active LTS lines:

| Version Line | Supported for Fixes | Notes |
| :--- | :--- | :--- |
| **0.14.x** | ✅ Yes | Current Active Release Branch. |
| **0.13.x** | ❌ No | Deprecated. Please upgrade to the latest minor version. |
| **< 0.13.0** | ❌ No | Deprecated. |

---

## 🚨 Reporting a Vulnerability

**Please do not open public GitHub issues for security vulnerabilities.** 

To report a vulnerability privately, email the maintainer group at [security@jilimb0.dev](mailto:security@jilimb0.dev). 

When reporting, please provide:
- A clear description of the vulnerability.
- A minimal, reproducible example (code block or update payload).
- The affected package names and version versions.
- Any potential mitigation steps or workarounds you have identified.

---

## 🕒 Expected Response SLA

We commit to the following response timeline for private reports:

- **Initial Acknowledgment:** Within **24 business hours** from initial reception.
- **Triage & Priority Assignment:** Within **3 business days**, indicating whether the issue is verified and outlining remediation timelines.
- **Patch Availability Target:** Critical severity vulnerabilities aim to be patched and published on npm within **7 business days** from verification.

---

## 🚫 Out of Scope Targets

The following scenarios are considered out of scope for security rewards or patches:

- **Third-Party Infrastructure Vulnerabilities:** Issues originating inside upstream Telegram API servers or standard Redis hosting providers.
- **Client Token Compromise:** Token extraction caused by exposed environment configurations on local developer machines or unencrypted server logs.
- **Denial of Service (DoS):** Volumetric spam attacks against bot endpoints (which should be mitigated at the reverse proxy, rate limiter, or network layer).

---

## 📢 Disclosure Policy

To protect production bot services running TGWrapper:
1. We request that you give us reasonable time to patch vulnerabilities before disclosing them publicly (Coordinated Vulnerability Disclosure).
2. Once a patch is released on npm, we publish a Security Advisory detailing the issue, impacts, and upgrade requirements.
3. Credit is explicitly given to security researchers who report issues responsibly.
