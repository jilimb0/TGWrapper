# Redis Topology & Deployment Reference

This guide details support levels, configuration guidelines, and trade-offs for deploying the `@jilimb0/tgwrapper-adapter-redis` package across various Redis topology modes.

---

## 🗺️ Topology Compatibility Overview

| Topology Mode | Support Level | Implementation Notes |
| :--- | :--- | :--- |
| **Standalone Redis** | `Full` | Supported out of the box with standard TCP connections. |
| **Managed Redis (ElastiCache, etc.)** | `Full` | Supported. Recommended to enable `keepAlive` in client options. |
| **Redis Sentinel** | `Full` | Supported by passing a pre-configured Sentinel-aware `ioredis` client. |
| **Redis Cluster** | `Limited` | Supported with hash-tagging. All session keys must reside on the same cluster slot. |
| **Read Replicas** | `Not Recommended` | Replication lag causes stale reads, leading to CAS session lock failures. |
| **Serverless Ephemeral Redis** | `Not Recommended` | Connection establishment overhead on every call degrades execution budgets. |

---

## 1. Standalone Redis

Best suited for single-server setups, development environments, and small-to-medium scale applications.

### Configuration
```typescript
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';

const sessionAdapter = new RedisSessionAdapter({
  redisUrl: 'redis://127.0.0.1:6379/0',
  ttlSeconds: 86400
});
```

---

## 2. Managed Redis (e.g., AWS ElastiCache, Redis Cloud, Upstash)

Recommended for enterprise production. These environments typically configure short TCP connection idle timeout thresholds.

### Configuration Rules
- **Enable TCP Keep-Alive:** Always pass configurations to keep connections open.
- **Enable TLS:** Most managed providers require secure connections.

```typescript
import Redis from 'ioredis';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';

const client = new Redis(process.env.REDIS_URL!, {
  tls: {},
  keepAlive: 10000, // 10 seconds keep-alive ping
  connectTimeout: 5000
});

const sessionAdapter = new RedisSessionAdapter({ redis: client });
```

---

## 3. Redis Sentinel

Designed for high-availability setups where failover handling is automated via Sentinel nodes.

### Configuration
Inject a custom pre-configured sentinel client:
```typescript
import Redis from 'ioredis';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';

const client = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 }
  ],
  name: 'mymaster',
  keepAlive: 10000
});

const sessionAdapter = new RedisSessionAdapter({ redis: client });
```

---

## 4. Redis Cluster

Redis Cluster splits data slots across multiple shards.

### ⚠️ Hash-Tags Requirement
Because the session adapter executes atomic operations via multi-key Lua scripts (comparing and updating session states), **all keys referenced in a script execution must reside in the same data slot**.

To guarantee this, configure a custom prefix using **hash-tags** `{}`:
```typescript
import Redis from 'ioredis';
import { RedisSessionAdapter } from '@jilimb0/tgwrapper-adapter-redis';

// All keys will be mapped to the same slot using the hash tag prefix
const sessionAdapter = new RedisSessionAdapter({
  redisUrl: 'redis://cluster-seed:6379',
  prefix: '{tgbot}:session' // Enforces slot hashing on "{tgbot}"
});
```

---

## 5. Read Replicas (Read/Write Splitting Caveat)

We **strictly recommend against** executing read queries for session state on replicas while routing write commands to primary nodes.

### Rationale
The core session model depends on Read-After-Write Consistency:
1. An update is received.
2. The session is read, evaluated, and updated using the CAS loop.
3. A subsequent webhook retry or fast user tap arrives.
4. If the replica suffers from replication lag (even <50ms), step 2 reads stale data, causing a CAS mismatch conflict (`ok: false`) and throwing a transaction error.
