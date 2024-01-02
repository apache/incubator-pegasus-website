---
permalink: api/ttl
---

# 原理
Pegasus支持TTL（Time-To-Live）功能，即在写入数据的时候，可以指定数据的过期时间。一旦过期，数据对用户就是不可见的，通过get/multiGet等接口都不再能访问到数据。

设置的时候，用户通常都是提供`ttl_seconds`参数，表示从当前时间开始计算，多少秒之后数据过期。如果为0，则表示不设置TTL，即数据永不过期。

用户通常有疑问，数据过期后对用户不可见是怎么实现的呢？数据会被立即删除吗？下面来讲讲TTL的实现原理。

简单来说，Pegasus的TTL是通过在写数据时记录数据的过期时间，在查询时对过期时间进行检查来实现的。如下图：

![pegasus-ttl.png](/assets/images/pegasus-ttl.png){:class="img-responsive"}

**写入过程：**
* 在写入数据时，用户在客户端通过`ttl_seconds`参数设置TTL时间，客户端先计算数据的过期时间`ExpireTime = CurrentTime + ttl_seconds`，然后通过RPC将数据和`ExpireTime`一起传给ReplicaServer端执行。
* ReplicaServer收到写请求后，经过各种处理（包括写WAL、replication复制等），最后将数据存储到RocksDB中。在存储value的时候，会将`ExpireTime`放在value头部。

**读取过程：**
* 用户通过客户端查询指定key对应的value数据
* ReplicaServer收到读请求后，先从RocksDB获取到key对应的value，然后从value头部提取出`ExpireTime`：
  * 如果ExpireTime == 0，表示数据没有设置TTL，是有效的。
  * 如果ExpireTime > 0，表示数据设置了TTL，则进一步比较：
    * 如果ExpireTime > CurrentTime，则数据没有过期，返回value中的用户数据
    * 如果ExpireTime <= CurrentTime，则数据已经过期，返回`NotFound`

**数据删除：**
* 数据过期后，并不是立即从RocksDB中消失，而是通过[compaction](https://github.com/facebook/rocksdb/wiki/Compaction)来进行过期数据清理的。
* Pegasus使用了自定义的RocksDB[CompactionFilter](https://github.com/facebook/rocksdb/wiki/Compaction-Filter)，使其在compaction过程中检查数据value头部的`ExpireTime`，如果已经过期，则将数据丢弃，它将不会出现在新生成的文件中。
* 因为过期数据的删除过程是异步的，与compaction的执行时机和频率有关，所以数据过期与数据删除通常不是同时发生的，唯一能保证的是数据删除肯定发生在数据过期之后。
* 已过期但未删除的数据依然会占用据磁盘空间。

# 接口
我们在客户端和Shell工具都提供了设置和查询TTL的接口。

Pegasus Java Client中以下接口可以查询和设置TTL：
* [ttl](/clients/java-client#ttl)：获取指定数据的TTL信息。
* [set](/clients/java-client#set)和[batchSet](/clients/java-client#batchset)：都提供了设置TTL的参数，其中batchSet是在SetItem中设置的。
* [multiSet](/clients/java-client#multiset)和[batchMultiSet](/clients/java-client#batchmultiset)：都提供了设置TTL的参数。
* [incr](/clients/java-client#batchmultiset)：从v1.11.1版本开始，incr接口也提供了修改TTL的功能。
* [checkAndSet](/clients/java-client#checkandset)：在CheckAndSetOptions中提供了设置TTL的参数。

Shell工具中以下命令可以查询和设置TTL：
* [ttl](/docs/tools/shell/#ttl)命令：获取指定数据的TTL信息。
* [set](/docs/tools/shell/#set)和[multi_set](/docs/tools/shell/#multi_set)命令：都提供了设置TTL的参数。

# 表级TTL
从v1.11.2版本开始，Pegasus支持表级TTL功能。

## 实现原理
* 用户在[Table环境变量](/administration/table-env)中设置`default_ttl`环境变量。
* MetaServer将环境变量异步地同步到到各个ReplicaServer，使该表的每个replica都获取到该环境变量
* replica获得环境变量后，解析获得`default_ttl`配置，并立即生效。此后：
  * 用户新写入的数据，如果`ExpireTime` = 0，则将数据的实际`ExpireTime`设置为`default_ttl`
  * RocksDB在进行compaction的时候，如果compact输入文件的原数据**没有**`ExpireTime`，则将compact输出文件的新数据的`ExpireTime`设置为`default_ttl`
  * 由于后台compaction执行时机的不确定性，未设置TTL的数据被设置TTL为`default_ttl`的时机也是是不确定的
  * 如果想快速设置所有数据的TTL，则可以执行[Manual Compact](/administration/manual-compact)。那么所有数据都会被compaction处理，未设置TTL的数据都会被被设置TTL为`default_ttl`

## 应用场景
- 数据表占用的磁盘空间越来越大。想降低磁盘空间占用，或通过清理数据来提升查询速度，降低磁盘、CPU等资源消耗
- 数据表中的所有数据或部分数据没有设置TTL
- 未设置TTL的数据的有效性跟写入时间相关，比如写入时间超过一个月的数据就不再会有查询需求了，可以丢弃
同时满足以上3个条件的场景，就可以通过`表级TTL`和`Manual Compact`的功能实现清理磁盘释放资源的目的。

# 通过TTL计算数据写入时间
如果数据写入时设置了TTL，则可以通过TTL计算出数据写入的时间。
由于：
```
ExpireTime = InsertTime + TTLSeconds = now + TTLRemainingSeconds
```
因此：
```
InsertTime = now + TTLRemainingSeconds - TTLSeconds
```
其中：
* now：执行Shell ttl命令时的时间。
* TTLRemainingSeconds：通过[Shell的ttl命令](/overview/shell#ttl)获取。
* TTLSeconds：用户写入数据时设置的TTL。
