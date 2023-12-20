---
permalink: overview/index.html
lang: en
---

[PacificA]: https://www.microsoft.com/en-us/research/publication/pacifica-replication-in-log-based-distributed-storage-systems/
[pegasus-rocksdb]: https://rocksdb.org/
[hbase]: https://hbase.apache.org/

Apache Pegasus is a distributed key-value storage system which is designed to be:

- **horizontally scalable**: distributed using hash-based partitioning
- **strongly consistent**: ensured by [PacificA][PacificA] consensus protocol
- **high-performance**: using [RocksDB][pegasus-rocksdb] as underlying storage engine
- **simple**: well-defined, easy-to-use APIs

## Background

Pegasus targets to fill the gap between Redis and [HBase][hbase]. As the former
is in-memory, low latency, but does not provide a strong-consistency guarantee.
And unlike the latter, Pegasus is entirely written in C++ and its write-path
relies merely on the local filesystem.

Apart from the performance requirements, we also need a storage system
to ensure multiple-level data safety and support fast data migration
between data centers, automatic load balancing, and online partition split.

## Features

- **Persistence of data**: Each write is replicated three-way to different ReplicaServers before responding to the client. Using PacificA protocol, Pegasus has the ability for strong consistent replication and membership changes.

- **Automatic load balancing over ReplicaServers**: Load balancing is a builtin function of MetaServer, which manages the distribution of replicas. When the cluster is in an inbalance state, the administrator can invoke a simple rebalance command that automatically schedules the replica migration.

- **Cold Backup**: Pegasus supports an extensible backup and restore mechanism to ensure data safety. The location of snapshot could be a distributed filesystem like HDFS or local filesystem. The snapshot storing in the filesystem can be further used for analysis based on [pegasus-spark](https://github.com/pegasus-kv/pegasus-spark).

- **Eventually-consistent intra-datacenter replication**: This is a feature we called *duplication*. It allows a change made in the local cluster accesible after a short time period by the remote cluster. It help achieving higher availability of your service and gaining better performance by accessing only local cluster.

## Presentations

(不完全统计,如果你有新的Pegasus相关分享,欢迎提交 [PR](https://github.com/apache/incubator-pegasus-website/pulls))

- 2023, Chengdu China, COSCon 2023, _How does Apache Pegasus used in SensorsData_, Guohao Li ([Intro](https://kaiyuanshe.cn/activity/recVnSz8ru/agenda/recAg8mw7f), [Slides](https://www.slideshare.net/acelyc1112009/how-does-apache-pegasusused-in-sensorsdata))
- 2023, Beijing China, DataFunSummit 2023, _The Implementation and Future Planning of Apache Pegasus Application_, Yuchen He
- 2022, Beijing China, DataFunSummit 2022, _The Design, Implementation, and Open Source Way of Pegasus_, Yuchen He ([Intro](https://mp.weixin.qq.com/s/rLiwNdl2baCw6m1FoQT4jw))
- 2022, Beijing China, Pegasus meetup, _How does the Apache Pegasus used in Advertising Data Stream in SensorsData_, Jiaoming Shi ([Slides](https://www.slideshare.net/acelyc1112009/how-does-the-apache-pegasus-used-in-advertising-data-stream-in-sensorsdata), [video](https://www.bilibili.com/video/BV1q84y1h7xG/))
- 2022, Beijing China, Pegasus meetup, _How to continuously improve Apache Pegasus in complex toB scenarios_, Hao Wang ([Slides](https://www.slideshare.net/acelyc1112009/how-to-continuously-improve-apache-pegasus-in-complex-tob-scenarios), [video](https://www.bilibili.com/video/BV1M14y1g7yy/))
- 2022, Beijing China, Pegasus meetup, _The Construction and Practice of Apache Pegasus in Offline and Online Scenarios Integration_, Wei Wang ([Slides](https://www.slideshare.net/acelyc1112009/the-construction-and-practice-of-apache-pegasus-in-offline-and-online-scenarios-integration), [video](https://www.bilibili.com/video/BV1Ux4y137ib/))
- 2022, Beijing China, Pegasus meetup, _How does Apache Pegasus used in Xiaomi's Universal Recommendation Algorithm Framework_, Wei Liang ([Slides](https://www.slideshare.net/acelyc1112009/how-does-apache-pegasus-used-in-xiaomis-universal-recommendation-algorithm-framework), [video](https://www.bilibili.com/video/BV16M411b7Pc/))
- 2022, Beijing China, Pegasus meetup, _The Introduction of the Apache Pegasus 2.4.0 release_, Shuo Jia ([Slides](https://www.slideshare.net/acelyc1112009/the-introduction-of-apache-pegasus-240), [video](https://www.bilibili.com/video/BV1C8411N7hp/))
- 2022, Online, ApacheCon Asia 2022, _How does Apache Pegasus (incubating) community develop at SensorsData_,  Dan Wang, Yingchun Lai ([Slides](https://www.slideshare.net/acelyc1112009/how-does-apache-pegasus-incubating-community-develop-at-sensorsdata), [video](https://www.bilibili.com/video/BV18v4y1U7RG/))
- 2021, Beijing China, System Software Tech Day, _Apache Pegasus: A high performance, strong consistent distributed key-value storage system_, Yuchen He ([Intro](https://www.modb.pro/db/168862), [video](https://www.bilibili.com/video/BV1SP4y1p7cW/))
- 2021, Beijing China, Pegasus meetup, _The Design, Implementation and Open Source Way of Apache Pegasus_, Yuchen He ([Slides](https://www.slideshare.net/acelyc1112009/the-design-implementation-and-open-source-way-of-apache-pegasus), [video](https://www.bilibili.com/video/BV1YL411s7dP/))
- 2021, Beijing China, Pegasus meetup, _Apache Pegasus's Practice in Data Access Business of Xiaomi_, Fateng Xiao ([Slides](https://www.slideshare.net/acelyc1112009/apache-pegasuss-practice-in-data-access-business-of-xiaomi), [video](https://www.bilibili.com/video/BV1K44y1t76C/))
- 2021, Beijing China, Pegasus meetup, _The Advertising Algorithm Architecture in Xiaomi and How does Pegasus Practice in Feature Caching_, Gang Hao ([Slides](https://www.slideshare.net/acelyc1112009/the-advertising-algorithm-architecture-in-xiaomi-and-how-does-pegasus-practice-in-feature-caching), [video](https://www.bilibili.com/video/BV1JR4y1n77B/))
- 2021, Beijing China, Pegasus meetup, _How do we manage more than one thousand of Pegasus clusters - engine part_, Guohao Li ([Slides](https://www.slideshare.net/acelyc1112009/how-do-we-manage-more-than-one-thousand-of-pegasus-clusters-engine-part), [video](https://www.bilibili.com/video/BV1y44y147U6/))
- 2021, Beijing China, Pegasus meetup, _How do we manage more than one thousand of Pegasus clusters - backend part_, Dan Wang ([Slides](https://www.slideshare.net/acelyc1112009/how-do-we-manage-more-than-one-thousand-of-pegasus-clusters-backend-part), [video](https://www.bilibili.com/video/BV1Lv411G7aW/))
- 2021, Online, ApacheCon Asia 2021, _Apache Pegasus (incubating): A distributed key-value storage system_, Yuchen He, Shuo Jia ([Slides](https://www.slideshare.net/acelyc1112009/apache-pegasus-incubating-a-distributed-keyvalue-storage-system), [video](https://www.bilibili.com/video/BV1b3411z7rR/))
- 2020, Beijing China, MIDC 2020, _Pegasus: Make an open source Key-Value storage system_, Tao Wu ([Intro](https://zhuanlan.zhihu.com/p/281519769))
- 2018, Beijing China, MIDC 2018, _Pegasus: A distributed Key-Value storage system_, Zuoyan Qin
- 2018, Beijing China, _Pegasus In Depth_, Zuoyan Qin ([Slides](https://www.slideshare.net/ssuser0a3cdd/pegasus-in-depth))
- 2018, Beijing China, _Pegasus KV Storage, Let the Users focus on their work_, Zuoyan Qin  ([Slides](https://www.slideshare.net/ssuser0a3cdd/pegasus-kv-storage-let-the-users-focus-on-their-work-201807))
- 2017, Shenzhen China, ArchSummit, _Behind Pegasus, What matters in a Distributed System_, Weijie Sun ([Intro](https://sz2017.archsummit.com/presentation/969), [Slides](https://www.slideshare.net/ssuser0a3cdd/behind-pegasus-what-matters-in-a-distributed-system-arch-summit-shenzhen2017))
- 2016, Beijing China, ArchSummit, _Pegasus: Designing a Distributed Key Value System_, Zuoyan Qin ([Intro](http://bj2016.archsummit.com/presentation/3023), [Slides](https://www.slideshare.net/ssuser0a3cdd/pegasus-designing-a-distributed-key-value-system-arch-summit-beijing2016))
