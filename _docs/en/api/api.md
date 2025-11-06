---
permalink: api/index.html
---

This page introduces the user interfaces provided by the Pegasus service. Clients can build secondary wrappers on top of these service interfaces.
In most cases, you only need to learn how to interact with Pegasus via the [Client Documentation](/clients).

Pegasus currently supports several interface protocols:

## Pegasus Protocol

This is the protocol used by our clients to interact with Pegasus servers. Through this protocol we expose:

- Single-row idempotent atomic operations, such as `set/get/del/ttl`...
- Single-row non-idempotent atomic operations, such as `check_and_mutate/incr`...
- Multi-row idempotent atomic operations, such as `multiset/multiget/multidel`...
- Scan operations with filtering, such as `hash_scan/unordered_scan`...

## Redis Protocol

We support the Redis protocol on top of the Pegasus protocol via the Pegasus Redis Proxy component.
You can read [Redis Adaptation](/redis) to learn more.

Since the Redis interface provides GEO support, we also support geospatial query capabilities through it.
You can read [GEO Support](/geo) to learn more.