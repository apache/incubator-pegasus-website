---
title: Redis适配
layout: page
menubar: api_menu
---

# Redis适配

## 架构

在pegasus上添加了redis proxy后，用户可以通过redis协议直接访问proxy，从而间接访问pegasus服务。整体架构如下：

![redis proxy](https://github.com/acelyc111/pegasus/blob/a988aca5f525411fbc04f931e4a71e4207593ba2/docs/media-img/redis_proxy_arch.png)

redis客户端与redis proxy之间使用[redis协议](https://redis.io/topics/protocol)，目前proxy已支持所有redis 数据类型（Simple Strings、Errors、Integers、Bulk Strings、Arrays）。

redis proxy与pegasus集群之间使用pegasus的thrift协议，proxy在这里就类似一个普通的pegasus client，从meta server查询meta信息、与replica server进行用户数据的读写。

## 提供服务的形式

跟redis服务一样，以``host:port``形式提供，如果服务压力大，可以提供多个``host:port``来避免单点压力过大造成瓶颈。当提供多个redis proxy地址时，由于后端访问的都是同一个集群的同一张表，数据是完全相同的。用户可以round robin, hash等方式进行负载均衡。

## 配置

redis proxy的配置文件规则遵循[配置说明](https://github.com/XiaoMi/pegasus/wiki/%E9%85%8D%E7%BD%AE%E8%AF%B4%E6%98%8E)，参考[示例](https://github.com/XiaoMi/pegasus/blob/master/src/geo/bench/config.ini)

在redis proxy中有几项特有的配置项需要注意：

```
[apps.proxy]
name = proxy
type = proxy
; which pegasus cluster and table dose this proxy redirect to
; if using GEO APIs, an extra table name which store geo index data should be appened, i.e.
; arguments = redis_cluster temp temp_geo
arguments = redis_cluster temp
; port serve for redis clients
ports = 6379
pools = THREAD_POOL_DEFAULT
run = true
```

## APIs

redis的原生命令请见[这里](https://redis.io/commands) 

以下接口说明都兼容redis原生命令，但支持的参数可能少于redis，以下接口说明中都给出了目前Pegasus代理所支持的所有参数，未给出的目前不支持。

### KEY规则

#### KV API

对于redis的普通key-value操作，key对应到Pegasus中的hashkey，而Pegasus中的sortkey被设置为空串``""``。如`SET`,  `GET`, `TTL`, `INCR`等。

#### GEO API

在原生redis中，`GEO*`接口操作的数据是通过`GEOADD key longitude latitude member`添加到数据库中的，这时`key`是一个namespace的概念，而不是`SET`操作时的key。

而pegasus proxy的`GEO*`接口操作的数据是通过`SET`接口添加到数据库中的，`SET`的key对应于`GEO*`接口的member，而`GEO*`接口的key则只能是``""``。也就是说，在pegasus 的redis GEO数据中，不再有namespace的概念，全部数据在同一空间`""`下，若要区分key空间，则可以在pegasus层创建新的table实现。具体参考后面的示例。

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

[GEO接口的实现原理](https://github.com/XiaoMi/pegasus/wiki/GEO%E6%94%AF%E6%8C%81)

```
GEODIST key member1 member2 [unit]
```

注意：  

1. key规则遵循GEO AP的key规则：这里的key只能是``""``，而这里member对应于`SET`操作时的key。

### GEORADIUS

```
GEORADIUS key longitude latitude radius m|km|ft|mi [WITHCOORD][WITHDIST] [WITHHASH][COUNT count] [ASC|DESC]
```

注意：  
1. key规则遵循GEO AP的key规则：这里的key只能是``""``，而这里member对应于`SET`操作时的key。  
2. 我们对redis的``WITHHASH``参数进行了修改，使用它将会返回该member的value。

### GEORADIUSBYMEMBER

```
GEORADIUSBYMEMBER key member radius m|km|ft|mi [WITHCOORD][WITHDIST] [WITHHASH][COUNT count] [ASC|DESC]
```

注意：  
1. key规则同上，这里的key只能是``""``，而这里member对应于`SET`操作时的key。  
2. 我们对redis的``WITHHASH``参数进行了修改，使用它将会返回该member的value。

## 示例

```
127.0.0.1:6379> SET abc 1 EX 60
OK
127.0.0.1:6379> GET abc
"1"
127.0.0.1:6379> TTL abc
(integer) 52
127.0.0.1:6379> INCR abc
(integer) 2

// 以下是GEO API, 注意需要提前创建好geo表
127.0.0.1:6379> SET 1cc0001000010290050356f "1cc0001000010290050356f|2018-06-10 23:59:59|2018-06-11 13:00:00|wx5j5ff05|116.886447|40.269031|4.863045|20.563248|0|-1"
OK
127.0.0.1:6379> SET 2cc0001000010290050356f "2cc0001000010290050356f|2018-06-10 23:59:59|2018-06-11 13:00:00|wx5j5ff05|115.886447|41.269031|4.863045|20.563248|0|-1"
OK
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