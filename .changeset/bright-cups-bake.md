---
"@jilimb0/tgwrapper": minor
---

Finalize Telegram Bot API schema compatibility pipeline for 0.6.x:

- harden Telegram docs parser to extract stable method/update schema from `core.telegram.org`
- generate and lock schema-derived method/update unions in TypeScript types
- enforce schema completeness gate in release checks (remote source + min method/update counts)
- improve parser test coverage for heading/table/dl layout variations

This release improves API surface reliability and upgrade safety without introducing breaking changes.
