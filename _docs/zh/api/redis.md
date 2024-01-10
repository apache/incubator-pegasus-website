---
permalink: api/redis
---

# Redis 适配

## 架构

在 Pegasus 集群中部署 Redis Proxy 组件后，用户可以通过 Redis 协议直接访问 Redis Proxy，从而间接访问 Pegasus 服务，从而实现使用 Redis 客户端访问 Pegasus 服务的目的。

整体架构如下：

![redis_proxy_arch.png](/assets/images/redis_proxy_arch.png){:class="img-responsive"}

Redis 客户端与 Redis Proxy 之间使用[redis协议](https://redis.io/topics/protocol)，目前 proxy 已支持所有的 RESP2 [协议](https://redis.io/docs/reference/protocol-spec/)数据类型（即：Simple Strings、Errors、Integers、Bulk Strings、Arrays）。

Redis Proxy 与 Pegasus 集群之间使用 Pegasus 的协议，proxy 在这里就类似一个普通的 Pegasus client，从 Meta Server 查询路由信息、与 Replica Server 进行用户数据的读写。

## 提供服务的形式

跟 Redis 服务一样，proxy 实例以 `host:port` 形式提供。如果服务压力大，可以提供多个 proxy 实例，通过水平扩展的方式来提升服务吞吐量。

Proxy 是无状态的，多个 proxy 实例共享同一个后端 Pegasus 服务。可以采用round robin, hash等方式进行负载均衡。

> proxy 的可执行文件为 `pegasus_rproxy`, 由 `./run.sh pack_tools` [打包](/docs/build/compile-by-docker/#packaging)生成。

## 配置

Redis Proxy 的配置文件规则遵循[配置说明](/administration/config)，参考[示例](https://github.com/apache/incubator-pegasus/blob/master/src/redis_protocol/proxy/config.ini)。

在 proxy 中有几项特有的配置项需要注意：

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

Redis 的原生命令请见[这里](https://redis.io/commands) 。

以下接口都兼容 Redis 原生命令，但支持的参数可能少于 Redis。

> 以下文档中都给出了目前 Pegasus Redis Proxy 所支持的所有参数，未给出的目前不支持。

### 协议

#### Strings API

对于 Redis 的 [strings](https://redis.io/docs/data-types/strings/) 操作，key 对应到 Pegasus 中的 hashkey，而 Pegasus 中的 sortkey 被设置为空串 `""`。

支持的命令如：`SET`,  `GET`, `TTL`, `INCR`等。

#### GEO API

在 Redis 中，[GEO](https://redis.io/docs/data-types/geospatial/) 接口操作的数据是通过 [GEOADD](https://redis.io/commands/geoadd/)，即 `GEOADD key longitude latitude member`，添加到数据库中的。此处的 `key` 是一个 namespace 的概念，而不是 `SET` 操作时的 key。

而在 Pegasus Proxy 中，由于底层的实现原理不同，他的 `GEO*` 接口操作的数据是通过 `SET` 接口添加到数据库中的，`SET` 的 key 对应于 `GEO*` 接口的 member，而 `GEO*` 接口的 key 则只能是空串 `""`。

也就是说，在 Pegasus 的 Redis GEO 数据中，不再有 namespace 的概念，全部数据在同一空间 `""` 下。若要区分 namespace，可以在 Pegasus 层创建新的表来实现。

`SET` 的 value 格式参考[这里](https://pegasus.apache.org/zh/api/geo#%E8%87%AA%E5%AE%9A%E4%B9%89extrator)。

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

**注意：**  

这里的接口返回值和 Redis 的定义略有不同：
- 当 key 不存在时，Redis 接口返回 0，表示本次没有删除有效数据
- Pegasus Proxy 由于没有对不存在和删除成功做区别，都统一返回的 1

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

[GEO接口的实现原理](geo)

```
GEODIST key member1 member2 [unit]
```

**注意：**  

- key 规则遵循 GEO API 的 key 规则，即 key 只能是空串 `""`，而这里 member 对应于 `SET` 操作时的 key

### GEORADIUS

```
GEORADIUS key longitude latitude radius m|km|ft|mi [WITHCOORD][WITHDIST] [WITHHASH][COUNT count] [ASC|DESC]
```

**注意：**
- key 规则遵循 GEO API 的 key 规则，即 key 只能是空串 `""`，而这里 member 对应于 `SET` 操作时的 key
- Pegasus 对 Redis 的 `WITHHASH` 参数进行了修改，使用它将会返回该 member 的 value 值

### GEORADIUSBYMEMBER

```
GEORADIUSBYMEMBER key member radius m|km|ft|mi [WITHCOORD][WITHDIST] [WITHHASH][COUNT count] [ASC|DESC]
```

**注意：**  
- key 规则遵循 GEO API 的 key 规则，即 key 只能是空串 `""`，而这里 member 对应于 `SET` 操作时的 key  
- Pegasus 对 Redis 的 `WITHHASH` 参数进行了修改，使用它将会返回该 member 的 value 值

## 示例

```
// Strings API 使用示例
127.0.0.1:6379> SET abc 1 EX 60
OK

127.0.0.1:6379> GET abc
"1"

127.0.0.1:6379> TTL abc
(integer) 52

127.0.0.1:6379> INCR abc
(integer) 2

// GEO API 使用示例
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
