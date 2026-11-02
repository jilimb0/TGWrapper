# Changelog

## 0.2.0 - 2026-02-13
- Added serverless webhook stack: unified `WebhookHandler`, Node/AWS/Cloudflare adapters
- Added circuit breaker and structured core errors
- Added retry jitter and improved transport resilience
- Added CAS-capable `SessionStorage` contract
- Added `SessionManager.runInSession` atomic wrapper with optimistic locking retries
- Added Redis session storage adapter interface with optional encryption hooks
- Added scene lifecycle hooks and scene registration API
- Added integration, resilience, and fuzz tests
- Added CI workflow and benchmark harness
- Standardized project scripts around `pnpm`
