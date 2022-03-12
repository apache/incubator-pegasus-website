---
permalink: api/ttl
---

# 原理
Pegasus支持TTL（Time-To-Live）功能，即在写入数据的时候，可以指定数据的过期时间。一旦过期，数据对用户就是不可见的，通过get/multiGet等查询接口获取不到数据，就跟数据没有写入一样。

设置的时候，用户通常都是提供`ttl_seconds`参数，表示从当前时间开始计算，多少秒之后为过期时间。如果为0，表示不设置TTL，即数据用不过期。

用户通常有疑问，数据过期后对用户不可见是怎么做到的呢？数据会被立即删除吗？实际上不是这样的，这要从TTL的实现原理说起。

Pegasus的TTL是通过在RocksDB中存储数据时记录数据的过期时间，然后在查询时对过期时间进行检查和过滤来实现的。如下图：

![pegasus-ttl.png](/assets/images/pegasus-ttl.png){:class="img-responsive"}

**写入过程：**
* 在写入数据时，用户在客户端通过`ttl_seconds`参数设置TTL时间，客户端先计算数据的过期时间`ExpireTime = CurrentTime + ttl_seconds`，然后通过RPC将数据和ExpireTime一起传给ReplicaServer端执行。
* ReplicaServer收到写请求后，经过各种处理（包括写日志、replication复制等），最后将数据存储到RocksDB中。在存储value的时候，会将ExpireTime放在value头部固定的4个字节中。

**读取过程：**
* 用户通过客户端查询指定key对应的value数据。
* ReplicaServer收到读请求后，先从RocksDB获取到key对应的value，然后从value头部提取出ExpireTime：
  * 如果ExpireTime == 0，表示数据没有设置TTL，是有效的。
  * 如果ExpireTime > 0，表示数据设置了TTL，则将ExpireTime与当前时间进行对比：如果没有过期，则数据是有效的；如果已经过期，则数据是无效的，返回NotFound。

**数据删除：**
* 数据过期后，并不能立即从RocksDB中消失，而是通过compaction来进行删除的。我们定制了RocksDB的CompactionFilter，使其在compaction过程中检查数据value头部的ExpireTime，如果已经过期，则数据会被扔掉，不会出现在新生成的文件中。
* 因为删除过程是异步的，与compaction的执行时机和频率有关，所以数据过期与数据删除通常不是同时发生的，唯一能保证的是数据删除肯定发生在数据过期之后。未删除的过期数据会占据磁盘空间，这点是需要考虑到的。

# 接口
我们在客户端和Shell工具都提供了设置和查询TTL的接口。

Pegasus Java Client中以下接口可以查询和设置TTL：
* [ttl](/_docs/zh/clients/java-client.md#ttl)：获取指定数据的TTL信息。
* [set](/_docs/zh/clients/java-client.md#set)和[batchSet](/_docs/zh/clients/java-client.md#batchset)：都提供了设置TTL的参数，其中batchSet是在SetItem中设置的。
* [multiSet](/_docs/zh/clients/java-client.md#multiset)和[batchMultiSet](/_docs/zh/clients/java-client.md#batchmultiset)：都提供了设置TTL的参数。
* [incr](/_docs/zh/clients/java-client.md#batchmultiset)：从v1.11.1版本开始，incr接口也提供了修改TTL的功能。
* [checkAndSet](/_docs/zh/clients/java-client.md#checkandset)：在CheckAndSetOptions中提供了设置TTL的参数。

Shell工具中以下命令可以查询和设置TTL：
* [ttl](/_docs/zh/tools/shell.md#ttl)命令：获取指定数据的TTL信息。
* [set](/_docs/zh/tools/shell.md#set)和[multi_set](/_docs/zh/tools/shell.md#multi_set)命令：都提供了设置TTL的参数。

# 表级TTL
从v1.11.2版本开始，Pegasus支持表级TTL功能。

实现原理：
* 用户在[Table环境变量](/_docs/zh/administration/table-env.md)中设置`default_ttl`环境变量。
* MetaServer将环境变量异步地通知到各个ReplicaServer，使该表的每个replica都获取到该环境变量，这个过程大约有几秒到几十秒不等的延迟，但是不会超过一分钟。
* replica获得环境变量后，解析获得default_ttl配置，并立即开始生效。生效之后：
  * 用户新写入的数据，如果TTL=0（使用默认TTL=0或者显式设置TTL=0），则将数据的实际TTL设置为default_ttl。
  * RocksDB在进行compaction的时候，如果compact输入文件的原数据没有TTL，则将compact输出文件的新数据的TTL设置为default_ttl。这个过程依赖于compaction的触发时机，所以时间点是不确定的。
  * 如果执行[Manual Compact](/_docs/zh/administration/manual-compact.md)，那么所有文件都会经过compaction处理，原来没有TTL的数据都会设置TTL为default_ttl。

考虑这样的场景：业务方在初期写入数据时没有设置TTL，后来改变需求，希望所有数据都加TTL，并且以前没有设置TTL的数据从现在开始计算TTL，那么就可以通过`表级TTL`加上`Manual Compact`的功能实现这个目的。

# 通过TTL计算数据写入时间
如果数据写入时设置了TTL，就可以通过TTL计算出数据写入时间。依据的公式是：
```
TTLExpireTime = InsertTime + TTLSeconds = now + TTLRemainingSeconds

  ==>

InsertTime = now + TTLRemainingSeconds - TTLSeconds
```
其中：
* TTLRemainingSeconds：通过[Shell的ttl命令](/_docs/zh/tools/shell.md#ttl)获取。
* now：执行Shell ttl命令的时间。
* TTLSeconds：用户知道数据写入时设置的TTL。
