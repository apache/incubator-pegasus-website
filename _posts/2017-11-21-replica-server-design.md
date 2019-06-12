---
title: Replica Server 的设计
layout: post
author: Pegasus
---

在 Pegasus 的架构中，ReplicaServer负责数据的读写请求。我们在这篇文章中详细讨论它的内部机制。

-----

### 读写流程

ReplicaServer由一个个的Replica的组成，每个Replica表示一个数据分片的Primary或者Secondary。真正的读写流程，则是由这些Replica来完成的。

前面说过，当客户端有一个写请求时，会根据MetaServer的记录查询到分片对应的ReplicaServer。具体来说，客户端需要的其实是分片Primary所在的ReplicaServer。当获取到这一信息后，客户端会构造一条请求发送给ReplicaServer。请求除数据本身外，最主要的就包含了分片的编号，在Pegasus里，这个编号叫**Gpid**(global partition id)。

ReplicaServer在收到写请求时，会检查自己是不是能对请求做响应，如果可以的话，相应的写请求会进入写流程。具体的写流程不再赘述，大体过程就是先prepare再commit的两阶段提交。

可能导致ReplicaServer不能响应写请求的原因有：

1. ReplicaServer无法向MetaServer持续汇报心跳，自动下线
2. Replica在IO上发生了一些无法恢复的异常故障，自动下线
3. MetaServer将Replica的Primary进行了迁移
4. Primary在和MetaServer进行group成员变更的操作，拒绝写
5. 当前Secondary个数太少，Replica出于安全性考虑拒绝写
6. 出于流控考虑而拒绝写

这些类型的问题，Pegasus都会以错误码的形式返回给客户端。根据不同的错误类型，客户端可以选择合适的处理策略：

* 无脑重试
* 降低发送频率
* 重新向MetaServer请求路由信息
* 放弃

在目前Pegasus提供的客户端中，对这些错误都做了合适的处理。

读流程比写流程简单些，直接由Primary进行读请求的响应。

除此之外，Pegasus还提供了两种scan的，允许用户对写入的数据进行遍历：

* HashScan: 可以对同一个HashKey下的所有(SorkKey, Value)序对进行扫描，扫描结果按SortKey排序输出。该操作在对应Primary上完成。
* table全局scan: 可以对一个表中的所有数据进行遍历。该操作在实现上会获取一个表中所有的Partition，然后逐个对Primary进行HashScan。

### 读写一致性模型

1. read-your-write consistency

   假如一个写请求已经成功返回，那么后续的读一定可以读出来。

2. 无external consistency

   两个先后发起的写请求，并不保证前面那个一定比后面那个先成功。

3. 无snapshot consistency

   scan请求到的数据是不遵守因果律的，有可能后写进去的数据先扫描出来。之所以这样，是因为Pegasus在实现scan的时候并没有打snapshot。Pegasus在后续上可以跟进。

### SharedLog和PrivateLog

前面介绍过，Pegasus在实现上追随了RSM(Replicated state machine)的模板：所有的写请求先写入到WAL(write ahead log)，然后再提交到存储引擎。在多Replica并存的存储系统中，WAL的处理是一个比较棘手的问题，因为每一个Replica都需要写WAL。如果Replica较多的话，这意味着对磁盘的随机写。一般来讲，我们是希望避免磁盘的随机写的。

对于这类问题，一般的解决办法是多个Replica合写一个WAL，例如HBase就采取了这种做法。但这种做法所带来的劣势是对Replica的迁移重建工作非常的不友好。就Pegasus的架构来看，合写WAL意味着添加PotentialSecondary的时候会有易错且速度慢的log split操作。

Kudu在应对此类问题上提供了另外一个思路：无视这个问题，每个Replica各写一份WAL。之所以能这么做，我们认为出发点主要在于写请求是不会直接落盘，而是进操作系统的buffer cache的。有了一层buffer cache, 这意味着HDD的随机写可以得到一定程度的抑制；对于SSD，其写放大的问题也可以得到规避。但在这种做法下，如果开启写文件的立即落盘(fsync/O_DIRECT)，整个写请求会有比较严重的性能损耗。

Pegasus在这里采取了另外一种做法：

1. 所有的写请求先合着写一个WAL，叫做**SharedLog**;
2. 同时，对于每个Replica, 所有的请求都有一个内存cache, 然后以批量的方式写各自的WAL，叫做**PrivateLog**；
3. 在进程重启的时候，PrivateLog缺失的部分可以在重放SharedLog时补全；
4. 添加PotentialSecondary时，直接使用PrivateLog。

### 要不要立即落盘

要不要立即落盘也是个很有趣的问题，需要纠结的点如下：

* 对于多副本的系统而言，只写OS缓存并不特别糟糕，因为单机断电的数据丢失并不会造成数据的真正丢失
* 对于单机房部署的集群，整机房的断电+不立即落盘可能会导致部分数据的丢失。为了应对这种问题，可以立即落盘或者加备用电池。
* 对于两地三机房部署的集群，所有机房全部不可用的可能性非常低，所以就算不立即落盘，一般问题也不大。

Pegasus当前在写WAL上并没有采用即时落盘的方式，主要是性能和安全上的一种权衡。后续这一点可以作为一个配置项供用户选择。

### 存储引擎

Pegasus选择[rocksdb](https://github.com/facebook/rocksdb)作为了单个Replica的存储引擎。在rocksdb的使用上，有三点需要说明一下：

* 我们关闭掉了rocksdb的WAL。
* PacificA对每条写请求都编了SequenceID, rocksdb对写请求也有内部的SequenceID。我们对二者做了融合，来支持我们自定义的checkpoint的生成。
* 我们给rocksdb添加了一些compaction filter以支持Pegasus的语义：例如某个value的TTL。

和很多一致性协议的实现一样，Pegasus中PacificA的实现也是和存储引擎解耦的。如果后面有对其他存储引擎的需求，Pegasus也可能会引入。

### 是否共享存储引擎

在实现ReplicaServer上，另一个值得强调的点是“多个Replica共享一个存储引擎实例，还是每个Replica使用一个存储引擎实例”。主要的考虑点如下：

1. 共享存储引擎实例，意味着存储引擎是并发写的。如果存储引擎对并发写优化的不是很好，很有可能会成为性能瓶颈。
2. 共享存储引擎不利于向replica group中添加新的成员。
3. 如果一个存储引擎有自己的WAL，那么不共享存储引擎很有可能会造成磁盘的随机写。
4. 一般在存储引擎的实现中，都会有单独的compaction过程。不共享存储引擎，并且存储引擎数太多的话，可能会导致过多的线程开销，各自在compaction时也可能引发随机写。

Pegasus目前各个Replica是不共享存储引擎的。我们关掉rocksdb的WAL一方面的考虑也是为了避免3。

### Replica的状态转换

在Pegasus中，一个Replica有如下几种状态：

* Primary
* Secondary
* PotentialSecondary(learner)：当group中新添加一个成员时，在它补全完数据成为Secondary之前的状态
* Inactive：和MetaServer断开连接时候的状态，或者在向MetaServer请求修改group的PartitionConfiguration时的状态
* Error：当Replica发生IO或者逻辑错误时候的状态

这几个状态的转换图不再展开，这里简述下状态转换的一些原则：

* Primary负责管理一个group中所有成员的状态。当Primary和Secondary或者Learner通信失败时，会采取措施将其移除。Secondary或者Learner从来不去尝试推翻一个Primary，推翻并选举新的Primary时MetaServer的责任。
* 当管理者决定触发状态变化时，**当事人**不会立即得到通知。例如，MetaServer因为探活失败要移除旧Primary时，不会通知旧Primary“我要移除你”；同理，当Primary因为通信失败要移除一个Secondary或者Learner时，也不会通知对应的Secondary或者Learner。这么做的原因也很好理解，这些动作之所以会发生，是因为网络不通，此时和**当事人**做通知是没有意义的。当事人在和决策者或者MetaServer恢复通信后，会根据对方的状态做响应变化。

下面以Primary移除一个Secondary为例来阐述上述原则：

* Primary向Secondary发送prepare消息失败时，准备移除该Secondary
* Primary会进入一个拒绝写的状态
* 开始把移除掉Secondary新的PartitionConfiguration发送给MetaServer
* MetaServer在把新PartitionConfiguration持久化后会回复Primary成功
* Primary把新的PartitionConfiguration修改到本地，并恢复到响应写的状态

### 添加Learner

添加Learner是整个一致性协议部分中最复杂的一个环节，这里概述以下其过程：

* MetaServer向Primary发起add_secondary的提议，把一个新的Replica添加到某台机器上。这一过程不会修改PartitionConfiguration。
* Primary**定期**向对应机器发起添加Learner的邀请
* Leaner在收到Primary的邀请后，开始向Primary拷贝数据。整个拷贝数据的过程比较复杂，要根据Learner当前的数据量决定是拷贝Primary的数据库镜像、PrivateLog、还是内存中对写请求的缓存。
* Leaner在拷贝到Primary的全部数据后，会通知Primary拷贝完成
* Primary向MetaServer发起修改PartitionConfiguration的请求。请求期间同样拒绝写，并且仍旧是MetaServer持久化完成后Primary才会修改本地视图。

### ReplicaServer的bootstrap

当一个ReplicaServer的进程启动时，它会加载自己的所有replica，并且重放所有的WAL。这些replica会被设置为inactive，是不会向外界提供读写服务的。

等加载完成后，ReplicaServer会启动FD模块连接MetaServer。连接成功后会向MetaServer查询自己服务的replica列表，并和自己加载的replica列表相比较并做相应调整：

* 如果本地多出了一部分replica, replica server会将其关闭
* 如果MetaServer多出了一部分replica，请求MetaServer将其移除
* 如果MetaServer和本地都有，按MetaServer所标记的角色进行服务

ReplicaServer向MetaServer查询replica列表并做本地调整的这一过程叫**ConfigSync**。这一过程并不仅限于bootstrap时候会有，而是在集群运行过程中会定期发生的一个任务。
