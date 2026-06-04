# Structured Logging Policy

This policy defines formatting standards, log level usage, and privacy guidelines for application logging across all TGWrapper codebases.

---

## 📝 1. Structured JSON Baseline

All emitted logs must output as single-line serialized JSON objects. Avoid printing unformatted multi-line stack traces or plain text to standard streams.

### Required Core Envelope
Every log line must include:
- `timestamp` (ISO 8601 string): Exact moment the event was emitted.
- `level` (string): Uppercase classification (`INFO`, `WARN`, `ERROR`, `DEBUG`).
- `traceId` (string, optional): Correlation trace identifier.
- `event` (string): Unique dot-separated name identifying the code location (e.g. `session.conflict`, `update.processed`).

---

## 🚫 2. Sensitive Data Redaction Policy

To comply with privacy standards, **never print sensitive personal user data or credentials** to production logging pipelines:

- **Tokens & Keys:** Never print active API keys (`BOT_TOKEN`, `OPENAI_API_KEY`, or access tokens). Redact them before logging request URLs or payloads.
- **Message Content:** Do not log raw message text bodies unless explicitly debug-flagged. Use message metadata (`updateId`, `chatId`, `messageLength`) instead.
- **User Information:** Avoid outputting full usernames or phone numbers. If user correlation is required, print a cryptographically hashed string representation (`userHash`).

---

## 📊 3. Log Level Guidelines

Ensure log levels match these semantic definitions:

- **`ERROR`:** Critical execution failures (e.g., database connection drops, unhandled code paths, client crashes). Triggers on-call alerts.
- **`WARN`:** Recoverable runtime issues (e.g., CAS session conflict encountered, rate limit blocks triggered, API 429 warnings).
- **`INFO`:** Key runtime progression events (e.g., service started, webhook route registration, update processed duration).
- **`DEBUG`:** Highly verbose execution flow details (e.g., raw payload inspection, DB query structures). Disabled by default in production.
