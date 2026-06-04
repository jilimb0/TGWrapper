# API Stability Policy

This policy defines API surface classifications, backward compatibility guarantees, and deprecation schedules for the TGWrapper platform.

---

## 🚦 1. API Stability Classifications

We categorize exported exports and classes into three stability tiers:

| Tier | Stability Level | Compatibility Guarantee | Deprecation Path |
| :--- | :--- | :--- | :--- |
| **Stable** | Production-ready | Guaranteed across minor/patch releases. | Minimum 1 major release deprecation window. |
| **Experimental** | Active feedback loop | May change or be removed in any release. | Can be deprecated/removed in a minor release. |
| **Internal** | Private framework APIs | No compatibility guarantees. | Not public; subject to change without warning. |

### Core Stable Surface
- `createBotClient` options and client method signatures.
- Standard routing callbacks: `bot.on('message', handler)`.
- `RedisSessionAdapter` and CAS state contracts.
- Observability attachment hooks: `attachBotObservability`.

### Experimental Surface
- Advanced FSM scenes and wizard handlers.
- Beta telemetry exporters (such as experimental web UI registries).

---

## ⏳ 2. Deprecation Schedule

To ensure a smooth transition path for developers when APIs evolve:

1. **Marking Deprecated:** APIs slated for removal are marked with the `@deprecated` JSDoc tag and emit runtime warnings using `console.warn` once per process session.
2. **Transition Window:** A deprecated API is guaranteed to remain functional for at least one major release cycle (e.g., deprecated in `0.14.x` -> functional in `0.15.x` -> removed in `0.16.0`).
3. **Documentation:** Every deprecated API must include clear migration recommendations in the JSDoc comments and the release changesets.

---

## 📈 Versioning Strategy (Semantic Versioning)

TGWrapper follows strict Semantic Versioning (SemVer) rules:

- **Patch Releases (`x.y.Z`):** Only backward-compatible bug fixes and security patches.
- **Minor Releases (`x.Y.z`):** New backward-compatible features or API deprecation alerts.
- **Major Releases (`X.y.z`):** Breaking API changes or removals of deprecated code paths.
