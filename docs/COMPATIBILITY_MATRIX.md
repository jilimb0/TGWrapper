# TGWrapper Capability Compatibility Matrix

Status legend:

- `Full`: supported and recommended for production use in this runtime.
- `Partial`: supported with documented caveats or reduced behavior.
- `Experimental`: possible, but not a primary supported path.
- `Unsupported`: do not use this capability in this runtime.

| Capability | Node.js Process | AWS Lambda | Cloudflare Workers | Status Notes | Caveats |
| --- | --- | --- | --- | --- | --- |
| Polling mode | Full | Unsupported | Unsupported | Local/VPS long-running process only | Serverless/edge runtimes cannot hold long polling loops reliably. |
| Webhook mode | Full | Full | Full | Recommended production ingress for serverless/edge | Platform-specific adapter and timeout budgets still apply. |
| Core routing and handlers | Full | Full | Full | Fetch-first core design | Avoid Node-only APIs in handler code if targeting edge. |
| In-memory sessions | Full | Partial | Partial | Useful for local/single-process only | Ephemeral in serverless/edge; not a durable state layer. |
| Redis CAS sessions | Full | Partial | Partial | Strongest in Node.js with persistent Redis TCP clients | Lambda can use managed Redis with cold-start/connection caveats. Workers generally need HTTP-compatible Redis providers or separate adapter strategy. |
| Redis distributed rate limits | Full | Partial | Partial | Same caveats as Redis CAS | Atomicity depends on Redis availability and clock alignment. |
| Structured stdout logs | Full | Full | Full | Works anywhere console/stdout is collected | Log shipping and retention are infrastructure responsibilities. |
| AsyncLocalStorage trace propagation | Full | Partial | Partial | Strongest in Node.js | Edge/serverless may degrade depending on runtime support and async lifecycle. |
| OpenTelemetry Node SDK bridge | Full | Partial | Unsupported | Best fit for Node.js services | Serverless often requires push/export-before-timeout; Workers need edge-compatible exporters. |
| Prometheus pull exporter | Full | Partial | Unsupported | Good for VM/Kubernetes | Pull scraping is awkward in short-lived serverless functions and unsupported in Workers without custom routing. |
| AI/LLM tracing helpers | Full | Partial | Partial | Works when calls stay in supported async context | Token fields depend on provider response data; long calls must respect webhook/serverless timeout budgets. |
| Background tasks | Full | Partial | Unsupported | Use Node workers/queues in long-running processes | Lambda/Workers require platform-native queues or scheduled jobs. |
| Graceful shutdown | Full | Partial | Unsupported | `SIGINT`/`SIGTERM` meaningful in Node processes | Serverless/edge runtimes do not provide the same lifecycle hooks. |

## Canonical Runtime Truth

Core webhook handling is portable across Node.js, AWS Lambda, and Cloudflare Workers. Production features are not equally portable: Redis adapters, OpenTelemetry exporters, polling loops, and graceful shutdown semantics depend on the runtime shape. Public claims must name the capability, not just the runtime.

