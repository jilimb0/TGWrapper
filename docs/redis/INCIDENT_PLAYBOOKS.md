# Redis Incident Playbooks

Use these playbooks when a TGWrapper bot depends on `@tgwrapper/adapter-redis` for sessions, distributed limits, or shared runtime state. They are operational guides, not guarantees; always confirm behavior against your Redis provider and deployment profile.

## Redis Unavailable

**Symptoms**
- Startup fails while connecting to Redis.
- Session reads or writes fail with network, timeout, or authentication errors.
- Distributed rate limit checks fail or become inconsistent.

**Immediate actions**
1. Check Redis provider health, DNS, TLS settings, credentials, and firewall rules.
2. Decide whether this bot should fail closed or degrade. For bots with money, identity, or irreversible actions, prefer fail closed.
3. Reduce instance churn. Restart loops can amplify provider connection pressure.
4. Inspect application logs for Redis command timeouts and connection reconnect loops.

**Recovery**
- Restore Redis reachability.
- Confirm session CAS writes succeed.
- Confirm rate limiter keys are being updated.
- Run a small canary flow before restoring full traffic.

## Clock Drift

**Symptoms**
- Rate limiter windows feel too strict or too loose.
- Time-based keys expire earlier or later than expected.
- Logs from application nodes and Redis provider disagree.

**Immediate actions**
1. Verify NTP status on long-running Node.js hosts.
2. Prefer Redis server time for distributed limiter logic when available.
3. Check whether serverless or edge runtimes are mixing regions with different latency profiles.

**Recovery**
- Fix host time sync.
- Lower reliance on client-side wall-clock assumptions in custom logic.
- Watch limiter metrics for at least one full traffic cycle.

## Hotspot Key Contention

**Symptoms**
- CAS conflicts spike for a small number of users, chats, or tenants.
- Redis CPU increases while total bot traffic is not unusually high.
- A single workflow repeatedly retries the same session key.

**Immediate actions**
1. Identify top contended keys from logs and metrics.
2. Confirm whether the workflow can merge updates or should serialize user actions.
3. Add bounded retry with jitter; do not retry forever.

**Recovery**
- Split large session records if unrelated workflows share one key.
- Add idempotency keys for user actions that may be retried.
- Consider queueing per hot chat/user when business correctness matters more than latency.

## Eviction Misconfiguration

**Symptoms**
- Sessions disappear under memory pressure.
- Redis reports evicted keys.
- Users unexpectedly restart flows.

**Immediate actions**
1. Check `maxmemory` and eviction policy.
2. Confirm session keys have intended TTLs.
3. Separate cache-like data from correctness-critical session data when possible.

**Recovery**
- Use a Redis memory policy suitable for durable session state.
- Increase memory or reduce key cardinality.
- Add alerts for evictions before they affect user-visible flows.

## Cluster Slot Issues

**Symptoms**
- Lua scripts fail in Redis Cluster because keys span slots.
- CAS or limiter operations fail only in cluster mode.
- Errors mention cross-slot keys.

**Immediate actions**
1. Confirm key prefix hash-tags are configured for multi-key operations.
2. Keep session CAS operations scoped to one Redis key when possible.
3. Review [Redis Topologies](../REDIS_TOPOLOGIES.md) before changing prefixes in production.

**Recovery**
- Migrate to a prefix strategy that keeps related keys in the same slot.
- Test the Redis integration suite against cluster-like staging before rollout.
- Record the prefix decision in deployment docs so future services do not reintroduce cross-slot behavior.
