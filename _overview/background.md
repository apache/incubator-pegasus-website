---
title: 项目背景
layout: page
show_sidebar: false
menubar: overview_menu
---

小米云平台长期以来一直使用开源的[Apache HBase](https://hbase.apache.org/)来存储结构化/半结构化数据，并逐渐成为国内使用HBase最多的公司之一，同时也培养了一个比较有实力的HBase开发团队，前后共产生了6位[HBase Committer](https://hbase.apache.org/team-list.html)，包括一位PMC成员。可以说，HBase在小米云存储中起到了举足轻重的作用，而小米也为HBase社区贡献出一份重要的力量。

然而，HBase并不是十全十美的，它的架构、语言、实现等决定了它具有一些难以克服的不足：
* HBase实现采用的Java语言，虽然开发上效率比较高，但是运行性能并不如C/C++这样的语言。
* Java语言还存在GC（Garbage Collection）问题，GC时可能造成进程进入假死状态，对于Server来说就是无法提供读写服务，造成读写延迟出现突然增加，容易触发客户端超时，降低系统可用性。
* HBase宕机恢复时间比较长（分钟级），在这段时间内服务是不可用的。其原因是：
  * HBase使用分层架构，底层使用HDFS存储数据，上层的RegionServer仅仅是服务点（Serving Point）。为了保证数据一致性，HBase要求每个Region在同一时刻只能由一个RegionServer服务。当某个RegionServer宕机，必须选一个新的RegionServer来服务该Region。恢复过程中需要做较多处理，包括日志的传输、切分、重放，这个过程比较耗时。
  * HBase依赖Zookeeper来探测宕机问题，而由于Java的GC问题存在，Zookeeper的session timeout不能设得太短，典型地设为30秒。如果设得太短，Java GC的假死机就容易造成session超时，触发RegionServer不必要的自杀。因此从RegionServer宕机到被发现，这中间可能就需要几十秒。
* HBase的分层架构使数据服务点和存储位置分离，对Data Locality不够友好，也是影响其读性能的一个原因。

以上这些原因造成了HBase的可用性和性能都存在一些不足，难以满足对服务可用性和延迟都很敏感的一些在线业务的需求，譬如广告业务。因此，我们急需一个不一样的系统，以弥补HBase的这些不足。在此之前，我们也调研过市面上存在的一些开源系统，包括[Apache Cassandra](http://cassandra.apache.org/)，然而并没有一款能让我们满意。

基于此，从2015年开始，我们开始尝试自己开发Pegasus系统，并且从一开始就明确了我们的目标：
* 高可用：系统必须是高可用的，即使在部分服务器挂掉之后，也能在极短时间（秒级）内恢复服务，尽量减少对用户的影响，要求服务可用度达到99.99%以上。
* 高性能：系统能够提供高性能的读写服务，并且在吞吐和延迟之间我们更倾向于低延迟。
* 强一致：系统对用户提供强一致性的语义，使用户编写业务逻辑时更轻松。
* 易伸缩：系统能够很方便增加或者减少机器节点个数，以应对业务负载的变化，并且这样的操作是自动化的，减少运维负担。
* 易使用：系统给用户提供简单易懂的库和接口，方便用户使用。

# 设计考虑

在设计Pegasus时，我们要在目标、实现难度、开发效率等方面做一些权衡和选择。关于这方面的考虑，我在ArchSummit 2016上做的分享中有具体介绍，参见[ArchSummit_Beijing_2016.pptx](docs/ppt/ArchSummit_Beijing_2016.pptx)。总的来说，包括这几个方面：
* 开发语言：基于性能考虑，我们选择了C++。当然，我们也要忍受开发效率相对较低的问题。
* 数据模型：采用简单的key-value数据模型。这是为了简化开发，而且我们认为key-value已经能够满足大部分业务需求。同时我们又对key-value模型做了一些改进，将key分为了HashKey和SortKey，使其表达能力更强。
* 数据分布：采用固定Hash分布。相比Range分布和一致性Hash分布，固定Hash分布实现更简单，数据倾斜和可伸缩性可以通过合理设计Hash键和Hash函数、预设更多的桶等措施来缓解。当然我们后续还会提供partition split的功能，支持扩展分片数量。
* 存储介质：选择SSD。SSD的性能和成本都介于内存和磁盘之间，从业务需求和成本综合考虑，选择SSD是比较合适的。
* 单机存储引擎：选择[RocksDB](https://github.com/facebook/rocksdb)。因为RocksDB在LevelDB基础上做了很多优化，能充分利用SSD的IOPS性能和多核服务器的计算性能。我们没有必要自己实现一个。
* 一致性协议：选择[PacificA](https://www.microsoft.com/en-us/research/publication/pacifica-replication-in-log-based-distributed-storage-systems/)。相比更有名的[Raft](https://raft.github.io/)，PacificA协议具有其自身的特点和优势。两者之间具体的区别，会有专门的文档来阐述。
* 故障检测（Failure Detection）：和HBase不同，Pegasus没有使用Zookeeper来进行故障检测，而是在MetaServer和ReplicaServer之间实现了基于租约的故障检测机制。这样一方面是避免依赖外部服务Zookeeper，同时也更方便针对自己的系统进行优化。关于故障检测，会有专门的文档进行阐述。

# 与HBase比较

Pegasus系统的最初目的就是弥补HBase的不足，而且上面也详细阐述了理由和设计思想。这里再从用户使用角度比较一下两者的区别：
* 数据模型：HBase是表格模型，采用Range分片；Pegasus是Key-Value模型，采用Hash分片。
* 接口：HBase的API接口功能虽然很丰富，但是使用也更复杂；Pegasus的接口简单，对用户更友好。
* 可用度：由于架构和实现的原因，HBase的可用度通常达到99.95%就不错了；Pegasus的可用度可以到达99.99%。
* 性能：由于分层架构，HBase的读写性能不是太好，P99通常在几十甚至几百毫秒级别，而且GC问题会带来毛刺问题；Pegasus的P99可以在几毫秒，满足低延迟的在线业务需求。

# 与Redis比较

其实Pegasus是不适合与Redis比较的，Redis是基于内存的缓存系统，与之比较性能肯定被吊打。但是我们发现，业务往往需要的不仅仅是性能，可能还有可用性、伸缩性等，所以比拼综合素质，Pegasus也是有其自身的优势的。

我们在与业务的沟通中发现，他们很多时候对数据的性能和可用性要求都很高。在系统选型时遇到这些问题：
* HBase虽然可用性高也易伸缩，但是性能不够好。
* Redis虽然性能好，但是需要大量内存，如果数据量太大，一台机器搞不定；如果采用分布式方案，譬如[Redis Cluster](https://redis.io/topics/cluster-tutorial)或者[Codis](https://github.com/CodisLabs/codis)，在机器宕机故障情况下的可用性又不够，并且使用内存的成本也比较高。
* 一些用户想出了HBase+Redis的方案，即使用HBase做底层存储，使用Redis做上层缓存，写数据的时候同时更新HBase和Redis，读数据的时候先从Redis中读，如果读不到再从HBase中读；但是这样的缺点是：因为涉及两个系统，用户的读写逻辑会比较复杂，且同时写两个系统时容易出现一致性问题；一份数据要存储在HBase和Redis中，成本比较高；Redis机器宕机后造成部分缓存丢失，还是要从HBase读取，性能明显降低，服务质量下降甚至降级。

Pegasus可以看做是HBase和Redis的结合体，它即保证高的可用度，又具有好的伸缩性，还具有相对不错的性能。如果业务对性能的要求不是太变态（譬如P99要求在1毫秒以内），那么可以考虑直接使用Pegasus。与Redis进行比较区别如下：
* 数据模型：两者都是Key-Value模型，但是Pegasus支持(HashKey + SortKey)的二级键。
* 接口：Redis的接口更丰富，支持List、Set、Map等容器特性；Pegasus的接口相对简单，功能更单一。
* 性能：Redis性能比Pegasus好不少，Redis是在几十或者几百微妙级别，Pegasus是在毫秒级别。
* 伸缩性：Pegasus伸缩性更好，可以很方便地增减机器节点，并支持自动的负载均衡；Redis的分布式方案在增减机器的时候比较麻烦，需要较多的运维介入。
* 可用性：Pegasus数据总是持久化的，系统架构保证其较高的可用性；Redis在机器宕机后需要较长时间恢复，可用性不够好，还可能丢掉最后一段时间的数据。
* 成本：Pegasus使用SSD，Redis主要使用内存，从成本上考虑，Pegasus显然更划算。
