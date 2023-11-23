---
permalink: overview/index.html
---

Apache Pegasus是一个分布式Key-Value存储系统，它的设计目标是具备：

- **高扩展性**：通过哈希分片实现分布式横向扩展。
- **强一致性**：通过[PacificA](https://www.microsoft.com/en-us/research/publication/pacifica-replication-in-log-based-distributed-storage-systems/)一致性协议保证。
- **高性能**：底层使用[RocksDB](https://rocksdb.org/)作为存储引擎。
- **简单易用**：基于Key-Value的良好接口。

## 背景

Pegasus项目的目标是弥补Redis与[HBase](https://hbase.apache.org/)之间的空白。Redis作为一个纯内存存储，它提供了低延迟读写能力，但它不具备强一致性。而与HBase不同，我们需要Pegasus以C++进行编写，同时其写路径应当只依赖于本地文件系统，不依赖于其他分布式文件系统（如HDFS），由此才能保证延迟稳定。

除了性能需求外，我们还需要一个存储系统，它应能够支持多级别数据安全保障，快速跨数据中心迁移，自动负载均衡，以及快速分片分裂等功能。这就是我们发起Pegasus项目的原因。

## 特性

- **数据的持久性**：每一份数据写入都将分别复制到3个不同ReplicaServer上，待全部完成后才响应客户端。通过PacificA协议，Pegasus具备强一致数复制的能力，同时也能够实现强一致的成员变更。

- **ReplicaServer之间的自动负载均衡**：自动负载均衡是MetaServer的内置功能，它能够让Replica在节点之间均匀分布。当集群处于不均衡状态时，管理员可以通过简单的命令让Replica在节点之间自动迁移，从而实现负载均衡。

- **冷备份**：Pegasus支持可扩展的备份和恢复策略，由此可实现数据安全性。数据的存储位置可以是在HDFS或本地存储上。在文件系统上存储的快照数据可以通过[pegasus-spark](https://github.com/pegasus-kv/pegasus-spark)实现离线数据分析。

- **满足最终一致性的跨数据中心复制**：这一功能我们又称之为*duplication*，它能够让本地集群的数据写在短时间内到达远端集群。它可以帮助你实现业务的更高的可用性，同时也可以让你避免跨机房访问，从而降低访问延迟。

## 社区分享

- **2018 年**

  《深入了解Pegasus》[【Slides】](https://www.slideshare.net/ssuser0a3cdd/pegasus-in-depth)
  
  《Pegasus分布式KV系统：让用户专注于业务逻辑》[【Slides】](https://www.slideshare.net/ssuser0a3cdd/pegasus-kv-storage-let-the-users-focus-on-their-work-201807)

- **2017 年**
  
  [ArchSummit-深圳](https://sz2017.archsummit.com/presentation/969)
    《分布式实现那些事儿：Pegasus背后的故事》 [【Slides】](https://www.slideshare.net/ssuser0a3cdd/behind-pegasus-what-matters-in-a-distributed-system-arch-summit-shenzhen2017)

- **2016 年**
  
  [ArchSummit-北京](http://bj2016.archsummit.com/presentation/3023)《从Pegasus看分布式系统的设计》[【Slides】](https://www.slideshare.net/ssuser0a3cdd/pegasus-designing-a-distributed-key-value-system-arch-summit-beijing2016)
