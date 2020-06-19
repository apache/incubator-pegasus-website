---
title: Partition Split设计文档
layout: post
author: 何昱晨
---

关于partition split的基本概念和操作示例可以参照 [administration/partition-split](https://pegasus-kv.github.io/administration/partition-split)，这里将主要描述partition split的设计和实现细节。

-----

## 功能简介

Pegasus在创建table时需要指定partition个数，且该个数为2的幂次。然而，在原有设计中，表的partition个数并不会随着数据量变化而动态变化。在用户的数据量和访问QPS增加，当前partition个数无法满足需求之前，我们需要人工地增加partition数目，避免阈值达到后的服务降级。

为了简化系统的设计和实现，我们这里要求增加后的partition个数必须是之前的2倍。若原partition个数为8，split后partition个数将变成16。具体来说，原partition序号为 [0, 7]，split后partition序号为 [0, 15]，0号partition将分裂为0号与8号，以此类推。

下图显示了表id为1，0号partition在split前后的示意图：

```txt
 +------+   +------+    +------+
 | 1.0  |   | 1.0  |    | 1.0  |
 +------+   +------+    +------+
 primary    secondary   secondary
                |
                |
 +------+   +------+    +------+
 | 1.0  |   | 1.0  |    | 1.0  |
 | 1.8  |   | 1.8  |    | 1.8  |
 +------+   +------+    +------+
 primary    secondary   secondary
                |
                |
 +------+   +------+    +------+   +------+   +------+    +------+
 | 1.0  |   | 1.0  |    | 1.0  |   | 1.8  |   | 1.8  |    | 1.8  |
 +------+   +------+    +------+   +------+   +------+    +------+ 
 primary    secondary   secondary  primary    secondary   secondary
```

## 整体流程

为了方便描述和画示意图，我们将整体流程分为下面3个部分：

- 开始partition split
- replica执行partition split
- 注册child partition

### Start partition split

```txt
  
+--------+  split   +------------+ partition_count*2 +-----------+  
| client ----------> meta_server --------------------> zookeeper |
+--------+          +------------+                   +-----------+
                          |
                          | on_config_sync
                          |
                 +--------v----------+
                 | primary partition |
                 +-------------------+

```

开始partition split的流程如上图所示：

1. client发送partition split请求给meta server；
2. meta_server收到请求后，将执行如下操作：
 - 检查请求的参数，如app是否存在、partition_count是否正确等，若参数检查正常则继续执行，否则返回错误给client;
 - 修改zookeeper以及meta内存中的partition_count为新partition_count；
 - 在meta_server内存中为新增的partition初始化数据结构partition_config，并将其ballot设为-1；
 - 返回ERR_OK给client
3. 每个partition的primary通过与meta server之间的config_sync发现meta_server同步的partition_count为本地partition_count的2倍，则开始执行本replica group的split

### Execute partition split

partition split是指replica group中的每个replica一分为二的过程。一般来说，一个replica group会包括一个primary和两个secondary共三个replica，分裂后，会新增三个replica，并分别对应前面的一主两备。我们称之前的三个replica为parent，新增的为child。

partition split的过程与learn比较类似，但也有一定的区别。learn是potential secondary从primary上拷贝数据，它们位于两台不同的机器；而split是三个child分别从它们对应的parent复制数据，child与parent在同一台机器上，并在同一个盘上。因此，child可以：

- 直接复制parent内存中的mutation，而无需对mutation进行序列化和反序列化；
- 直接读取private log并replay private log，而无需再拷贝private log；
- 直接apply parent生成的rocksdb checkpoint，而无需进行sst文件的拷贝。

```txt
+--------+                          +-------+
| parent |                          | child |
+--------+                          +-------+
    |         4. create child           |
    |---------------------------------->|
    |                                   |
    |         5. async learn            |
    |---------------------------------->|
    |           (2pc async)             |
    |                                   |
    |      6. finish async learn        |
    |<----------------------------------|
    |     (send to primary parent)      |
    |                                   |
    |  7. all child finish async learn  |
    |-----------------------------------|
    | （2pc sync, wait for sync_point)  |
    |                                   |
    |  8. update child partition_count  |
    |---------------------------------->|
    |                                   |
    | 9. update partition_count ack     |
    |<--------------------------------->|
    |                                   |
```

replica执行partition split的流程如上图所示：

4. primary parent创建自己的child，child的ballot以及app_info.partition_count设为与parent相等，同时，让child的数据与parent位于同一块磁盘。并且，通过group_check通知各个secondary创建他们的child;
5. child异步learn parent的状态
 - 复制parent的prepare list;
 - apply parent的checkpoint;
 - 读取private log并relay log;
 - 复制parent内存中的mutation;
 - 在这期间，parent收到的写请求也会异步地复制给child
6. 当child完成异步复制之后，会给primary parent发送通知
7. 当primary parent收到所有child的通知之后，将写请求改为同步复制
 - 在此后的2PC过程中，secondary都必须收到child的回复后才能向primary回复ACK，而primary也必须收到child的确认才可以commit
 - 我们将同步复制模式后的第一个decree称为**`同步点`**，当同步点mutation commit后，所有的child已拥有所需的全部数据
8. primary通知所有的child更新partition_count为新partition_count，并把该信息写入磁盘文件.app_info中
9. 当primary收到所有child更新partition_count成功的ack后，准备向meta_server注册child

### Register child

```txt
+----------------+ 10. register child +-------------+                         +-----------+
|                |------------------->|             | 11. update child config |           |
| parent primary |                    | meta_server |------------------------>| zookeeper |
|                |<-------------------|             |                         |           |
+----------------+        ack         +-------------+                         +-----------+
        |
        | 12. active child
+-------v---------+
|  child primary  |
+-----------------+
```

注册child的流程如上图所示：

10. primary向meta server注册child partition
 - 将child的ballot设为ballot(parent) + 1
 - parent暂时拒绝读写访问，此时，parent和child都不响应client的读写请求
 - 向meta_server发送注册child的请求
11. meta_server收到注册请求后，将更新child的partition_configuration，并将它写入zookeeper和内存，然后返回ERR_OK给primary parent
12. primary从meta_server收到注册成功的回复，先激活child：
 - 将对应的child的状态由PS_PARTITION_SPLIT改为PS_PRIMARY；
 - 这个升级为PS_PRIMARY的child会通过group_check让其它机器上的child升级为PS_SECONARY。此时, child partition可以开始提供正常的读写服务
13.	primary parent通知所有的seconadary更新app_info.partition_count，并恢复读写服务。

在第13步之前，parent与child所对应的所有读写请求都由parent处理；在第13步之后，parent将拒绝child对应的请求。

## split过程中如何处理client请求

我们引入**`partition_version`**这个概念，来保证client读写数据的正确性，即，不要把数据写错地方，不要读到错误的数据，不要读不到数据。

> partition_version是primary内存中的一个变量，一般应为partition_count – 1，在split过程中拒绝读写时候会被设置为-1

client在向server端发读写请求时，会在请求的header中带上所访问的hash_key的hash值，primary将此hash值与partition_version进行按位与操作，检查结果是否等于partitionId。
检查的过程用伪代码表示如下：

```
if partition_version == -1
    return ERR_OBJECT_NOT_FOUND
elif partition_version & hash ! = partition
    return ERR_PARENT_PARTITION_MISUSED
return ERR_OK
```

client收到ERR_OBJECT_NOT_FOUND时，会从meta_server更新当前partition的信息；收到ERR_PARENT_PARTITION_MISUSED时，会更新table所有partition的信息。信息更新后，再向正确的partition重发请求

下面举一个例子来分析partition_version的作用：  
假设split前，table的partition个数为4，split后为8，client需要读写hash_key的hash值为5的key-value，

1. split前，hash % partition_count = 5%4 = 1，访问replica1，正确
2. split命令发出后
3. 
```
partition_count(meta) = 8 
ballot(replica5) = -1 
partition_count(replica1) = 4  
partition_version(replica1) = 4–1 = 3
```

 - 对于之前加入的client，由于缓存，`partition_count(client-old) = 4`，会访问replica1
 - 对于此时新加入的client，它从meta得到新的状态，`partition_count(client-new) = 8`，通过`hash % partition_count = 5%8 = 5`得知应该访问replica5，但是，ballot(replica5) = -1，client知道replica5暂不存在，所以根据`hash % (partition_count / 2) = 1`，会访问replica1，replica1收到请求后，检查`hash & partition_version(replica1) = 5&3 = 1`，正确
3. split完成后

```
partition_count(replica1) = partition_count(replica5) = 8
partition_version(replica1) = partition_version(replica5) = 7
```

 - 对于之前的cilent，由于缓存的原因，继续访问replica1，但replica1收到请求后，检查`hash & partition(replica1) = 5 % 8 = 5`，由于5不等于partitionId，所以拒绝访问，并通知client从meta_server更新config，client更新后，将会访问replica5，读写也正确
 - 对于此时新加入的client，将会直接访问replica5，读写也正确

上面描述的交互依赖于一个前提，即request header中的hash必须是希望访问的hash_key的hash值，而这个假设对于绝大部分请求都成立，除了全表scan。在full_scan时，request header中的hash是partitionId，因此可能会得到冗余数据。  
因此，我们为full_scan增加一步检查操作，replica server从rocksdb中读到数据后，检查数据的hash，滤除无效数据。这样，除了在split的过程中，client不会读到无效数据。由于full_scan本身不具备原子性和一致性，想完全解决一致性问题很难，而split是一个非频繁操作，我们只要让split避开full_scan的时间段就可以了。

partition_version除了用于client的访问控制，还用于无效数据清理。
partition split结束后，历史数据会同时存在于parent和child，但实际上应该分别只保留一半数据。我们同样可以使用`partition_version & hash == partitionId`把无效数据区分出来，并通过rocksdb filter回收清理这些数据。 

## 异常处理

在执行partition split时，我们需要检查partition的健康状态，我们认为只有在partition健康的情况下，才会开始split。一个典型的“不健康”场景是partition正在执行learn，或者secondary数量过少。并且，replica是通过on_config_sync检查partition_count是否翻倍来判断是否需要执行split，而on_config_sync是周期性执行的，replica完全可以等到partition健康再进行split。

在执行partition split过程中，parent的ballot不能发生变化，一旦发生变化，将抛弃这个partition所有的child，重新开始split过程。即在split过程中，如果发生replica迁移，无论是因为故障还是负载均衡的原因，我们都认为本次split失败，在之后的on_config_sync中重新split。

若在partition split过程中，meta_server发生故障，meta group会选出一个新的leader，会从zookeeper中得到新的partition_count，并通过on_config_sync开始split
