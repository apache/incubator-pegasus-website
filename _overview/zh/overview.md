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

（不完全统计，如果你有新的Pegasus相关分享，欢迎提交 [PR](https://github.com/apache/incubator-pegasus-website/pulls)）

  - 2023，北京，DataFunSummit 2023，《Apache Pegasus的应用实现与未来规划》，何昱晨
  - 2022，北京，DataFunSummit 2022，《Pegasus的设计实现和开源之路》，何昱晨（[介绍](https://mp.weixin.qq.com/s/rLiwNdl2baCw6m1FoQT4jw)）
  - 2022，北京，Pegasus meetup，《Apache Pegasus在神策广告数据流中的应用》，史佼明（[Slides](https://www.slideshare.net/acelyc1112009/how-does-the-apache-pegasus-used-in-advertising-data-stream-in-sensorsdata)，[video](https://www.bilibili.com/video/BV1q84y1h7xG/)）
  - 2022，北京，Pegasus meetup，《如何在复杂 toB 场景下对Pegasus 进行持续改进》，王浩（[Slides](https://www.slideshare.net/acelyc1112009/how-to-continuously-improve-apache-pegasus-in-complex-tob-scenarios)，[video](https://www.bilibili.com/video/BV1M14y1g7yy/)）
  - 2022，北京，Pegasus meetup，《Apache Pegasus离在线融合建设与实践》，王伟（[Slides](https://www.slideshare.net/acelyc1112009/the-construction-and-practice-of-apache-pegasus-in-offline-and-online-scenarios-integration)，[video](https://www.bilibili.com/video/BV1Ux4y137ib/)）
  - 2022，北京，Pegasus meetup，《Pegasus在小米通用推荐算法框架中的应用》，梁伟（[Slides](https://www.slideshare.net/acelyc1112009/how-does-apache-pegasus-used-in-xiaomis-universal-recommendation-algorithm-framework)，[video](https://www.bilibili.com/video/BV16M411b7Pc/)）
  - 2022，北京，Pegasus meetup，《Apache Pegasus 2.4.0 版本介绍》，贾硕（[Slides](https://www.slideshare.net/acelyc1112009/the-introduction-of-apache-pegasus-240)，[video](https://www.bilibili.com/video/BV1C8411N7hp/)）
  - 2022，线上，ApacheCon Asia 2022，《How does Apache Pegasus (incubating) community develop at SensorsData》，王聃，赖迎春（[Slides](https://www.slideshare.net/acelyc1112009/how-does-apache-pegasus-incubating-community-develop-at-sensorsdata)，[video](https://www.bilibili.com/video/BV18v4y1U7RG/)）
  - 2021，北京，《Apache Pegasus：高性能强一致分布式KV存储系统》，何昱晨（[介绍](https://www.modb.pro/db/168862)，[video](https://www.bilibili.com/video/BV1SP4y1p7cW/)）
  - 2021，北京，Pegasus meetup，《Pegasus的设计实现和开源之路》，何昱晨（[Slides](https://www.slideshare.net/acelyc1112009/the-design-implementation-and-open-source-way-of-apache-pegasus)，[video](https://www.bilibili.com/video/BV1YL411s7dP/)）
  - 2021，北京，Pegasus meetup，《Pegasus在小米数据接入上的实践》，肖发腾（[Slides](https://www.slideshare.net/acelyc1112009/apache-pegasuss-practice-in-data-access-business-of-xiaomi)，[video](https://www.bilibili.com/video/BV1K44y1t76C/)）
  - 2021，北京，Pegasus meetup，《小米广告算法架构及Pegasus在特征缓存的实践》，郝刚（[Slides](https://www.slideshare.net/acelyc1112009/the-advertising-algorithm-architecture-in-xiaomi-and-how-does-pegasus-practice-in-feature-caching)，[video](https://www.bilibili.com/video/BV1JR4y1n77B/)）
  - 2021，北京，Pegasus meetup，《我们是如何支撑起上千个Pegasus集群的-工程篇》，李国豪（[Slides](https://www.slideshare.net/acelyc1112009/the-advertising-algorithm-architecture-in-xiaomi-and-how-does-pegasus-practice-in-feature-caching)，[video](https://www.bilibili.com/video/BV1y44y147U6/)）
  - 2021，北京，Pegasus meetup，《我们是如何支撑起上千个Pegasus集群的-后端篇》，王聃（[Slides](https://www.slideshare.net/acelyc1112009/how-do-we-manage-more-than-one-thousand-of-pegasus-clusters-backend-part)，[video](https://www.bilibili.com/video/BV1Lv411G7aW/)）
  - 2021，线上，ApacheCon Asia 2021，《Apache Pegasus (incubating): A distributed key-value storage system》，何昱晨，贾硕（[video](https://www.bilibili.com/video/BV1b3411z7rR/)）
  - 2020，北京，MIDC 2020，《Pegasus：打造小米开源KV存储》，吴涛（[介绍](https://zhuanlan.zhihu.com/p/281519769)）
  - 2018，北京，MIDC 2018，《Pegasus：分布式Key-Value存储系统》，覃左言
  - 2018，北京，《深入了解Pegasus》，覃左言（[Slides](https://www.slideshare.net/ssuser0a3cdd/pegasus-in-depth)）
  - 2018，北京，《Pegasus分布式KV系统：让用户专注于业务逻辑》([Slides](https://www.slideshare.net/ssuser0a3cdd/pegasus-kv-storage-let-the-users-focus-on-their-work-201807))
  - 2017，深圳，ArchSummit，《分布式实现那些事儿：Pegasus背后的故事》，孙伟杰（[介绍](https://sz2017.archsummit.com/presentation/969)，[Slides](https://www.slideshare.net/ssuser0a3cdd/behind-pegasus-what-matters-in-a-distributed-system-arch-summit-shenzhen2017)）
  - 2016，北京，ArchSummit，《从Pegasus看分布式系统的设计》，覃左言（[介绍](http://bj2016.archsummit.com/presentation/3023)，[Slides](https://www.slideshare.net/ssuser0a3cdd/pegasus-designing-a-distributed-key-value-system-arch-summit-beijing2016)）
