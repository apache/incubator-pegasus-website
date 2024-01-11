---
permalink: api/redis
---

# Redis adaptation

## Architecture

After deploying Redis Proxy to Pegasus, users can directly access the proxy through the Redis protocol, thereby indirectly accessing Pegasus services. The overall architecture is as follows:

![redis_proxy_arch.png](/assets/images/redis_proxy_arch.png){:class="img-responsive"}

Using the [Redis Protocol](https://redis.io/topics/protocol) between Redis Client and Redis Proxy. Currently, thr proxy supports all [RESP2 protocols](https://redis.io/docs/reference/protocol-spec/) data types (i.e. Simple Strings, Errors, Integers, Bulk Strings and Arrays).

Redis Proxy uses the Pegasus protocol to communicate with the Pegasus cluster. Here, the proxy acts as a regular Pegasus client, querying routing table from Meta Server and reading and writing user data with Replica Server.

## The form of providing services

Like the Redis service, the proxy instances are provided in the form of `host:port`. If the service pressure is high, multiple proxy instances can be provided to improve service throughput through horizontal scaling.

Proxy is stateless, and multiple proxy instances share the same backend Pegasus service. Load balancing can be achieved through methods such as round-robin or hash.

> The executable binary of Proxy is named `pegasus_rproxy`, [packed](/docs/build/compile-by-docker/#packaging) by `./run.sh pack_tools` 。

## Configuration

The configuration file rules for Redis Proxy follow [Configurations](/administration/config), refer to the [example](https://github.com/apache/incubator-pegasus/blob/master/src/redis_protocol/proxy/config.ini).

There are several unique configuration items in Proxy that need to be noted:

```
[apps.proxy]
name = proxy
type = proxy
; which pegasus cluster and table dose this proxy redirect to
; - 'onebox': the cluster name which will be used in the next section
; - 'temp': the table name in the cluster 

arguments = onebox temp
; if using GEO APIs, an extra table name which will store geo index data
; should be appended, i.e.
; arguments = onebox temp temp_geo

; port serve for redis clients
ports = 6379
pools = THREAD_POOL_DEFAULT
run = true

[pegasus.clusters]
; meta serer list the proxy redirect to
onebox = 127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603
```

## APIs

The native commands for Redis can be found [here](https://redis.io/commands) 。

The following interfaces are compatible with Redis native commands, but may support fewer parameters than Redis.

> The following documents provide all the parameters currently supported by Pegasus Redis Proxy, and those that are not provided are currently not supported.

### Protocol

#### Strings API

For Redis [strings](https://redis.io/docs/data-types/strings/) commands, the key corresponds to the hashkey in Pegasus, while the sortkey in Pegasus is set to an empty string `""`.

The supported commands are `SET`,  `GET`, `TTL`, `INCR`, etc.

#### GEO API

[The Implementation Principle of GEO Commands](geo)

In Redis, the data operated by [GEO](https://redis.io/docs/data-types/geospatial/) commands are added by [GEOADD](https://redis.io/commands/geoadd/) commands, i.e. `GEOADD key longitude latitude member`. Here, the `key` has a "namespace" concept, but not the `key` operated by `SET` command.

In Pegasus Proxy, due to the difference of underlying implementation principles，the data operated by `GEO*` commands are added by `SET` command instead. The `key` of `SET` command corresponds to the `member` of `GEO*` commands, and the `key` of `GEO*` must be empty string `""`.

That is to say, in Pegasus's Redis GEO data, there is no longer the concept of "namespace", and all data is in the same space. To distinguish namespaces, a new table can be created in the Pegasus to achieve this.

The format of the `value` of `SET` commands refers to [Value Extrator](/api/geo#value-extrator)。

### SET

```
SET key value [EX seconds]
```

### GET

```
GET key
```

### DEL

```
DEL key
```

**Note:**

When a key does not exist, the return value of Pegasus Proxy is slightly different from Redis:
- Redis: The interface returns 0, indicating that no valid data has been deleted this time
- Pegasus Proxy: Since there is no distinction between non-existent and successfully deleted, return a unified 1 in both cases

### SETEX

```
SETEX key seconds value
```

### TTL

```
TTL key
```

### PTTL

```
PTTL key
```

### INCR

```
INCR key
```

### INCRBY

```
INCRBY key increment
```

### DECR

```
DECR key
```

### DECRBY

```
DECRBY key decrement
```

### GEODIST

```
GEODIST key member1 member2 [unit]
```

**Note:**

- The key rule follows the key rule of the Pegasus Proxy `GEO*` commands, which means that the `key` can only be an empty string `""`, and here the `member` corresponds to the `key` during the `SET` command

### GEORADIUS

```
GEORADIUS key longitude latitude radius m|km|ft|mi [WITHCOORD][WITHDIST] [WITHHASH][COUNT count] [ASC|DESC]
```

**Note:**
- The key rule follows the key rule of the Pegasus Proxy `GEO*` commands, which means that the `key` can only be an empty string `""`, and here the `member` corresponds to the `key` during the `SET` command
- Pegasus Proxy has modified the mean of `WITHHASH` parameter of Redis, using it will return the `value` of that `member`

### GEORADIUSBYMEMBER

```
GEORADIUSBYMEMBER key member radius m|km|ft|mi [WITHCOORD][WITHDIST] [WITHHASH][COUNT count] [ASC|DESC]
```

**Note:**
- The key rule follows the key rule of the Pegasus Proxy `GEO*` commands, which means that the `key` can only be an empty string `""`, and here the `member` corresponds to the `key` during the `SET` command
- Pegasus Proxy has modified the mean of `WITHHASH` parameter of Redis, using it will return the `value` of that `member`

## Sample

```
// Strings commands sample
127.0.0.1:6379> SET abc 1 EX 60
OK

127.0.0.1:6379> GET abc
"1"

127.0.0.1:6379> TTL abc
(integer) 52

127.0.0.1:6379> INCR abc
(integer) 2

// GEO commands sample
127.0.0.1:6379> SET 1cc0001000010290050356f "1cc0001000010290050356f|2018-06-10 23:59:59|2018-06-11 13:00:00|wx5j5ff05|116.886447|40.269031|4.863045|20.563248|0|-1"
OK

127.0.0.1:6379> SET 2cc0001000010290050356f "2cc0001000010290050356f|2018-06-10 23:59:59|2018-06-11 13:00:00|wx5j5ff05|115.886447|41.269031|4.863045|20.563248|0|-1"
OK

127.0.0.1:6379> GEORADIUS "" 116.889137 40.261774 1000 m COUNT 100 ASC WITHDIST WITHCOORD
1) 1) "1cc0001000010290050356f"
   2) "838.600772"
   3) 1) "116.886447"
      2) "40.269031"
   4) "1cc0001000010290050356f|2018-06-10 23:59:59|2018-06-11 13:00:00|wx5j5ff05|116.886447|40.269031|4.863045|20.563248|0|-1"

127.0.0.1:6379> GEORADIUSBYMEMBER "" 1cc0001000010290050356f 1000 m WITHCOORD WITHDIST WITHHASH
1) 1) "1cc0001000010290050356f"
   2) "0.000000"
   3) 1) "116.886447"
      2) "40.269031"
   4) "1cc0001000010290050356f|2018-06-10 23:59:59|2018-06-11 13:00:00|wx5j5ff05|116.886447|40.269031|4.863045|20.563248|0|-1"

127.0.0.1:6379> GEODIST "" 1cc0001000010290050356f 2cc0001000010290050356f m
"139483.293598"
```
