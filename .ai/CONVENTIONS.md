# Engineering Conventions: TGWrapper

## 1. Code Standards & TypeScript
- Strict TypeScript: no `any`, no unhandled promises, explicit return types on public APIs.
- Clean ESM imports with file extensions where required by module resolution.
- Format and lint enforced via Biome.

## 2. Error Handling & Resilience
- Errors must be typed and mapped to domain exceptions at boundary layers.
- Do not suppress unexpected errors with empty `catch` blocks.
- External API integrations require exponential backoff and timeout budgets.

## 3. Logging & Privacy Baseline
- Zero PII (Personally Identifiable Information) in application logs.
- Redact authorization tokens, API keys, and sensitive payload parameters.
- Use structured JSON logging in production environments.

## 4. Testing & Anti-Patterns
- TDD-first: new features and bug fixes must be accompanied by unit or integration tests.
- Do not mock what you do not own without contract verification.
- Avoid speculative architectural abstractions; keep components single-purpose.
