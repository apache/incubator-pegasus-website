---
permalink: /overview/background/
---

# 设计目标

* 高可用：系统必须是高可用的。即使部分服务器宕机，Pegasus集群也能在极短时间（秒级）内恢复服务，尽量减少对用户的影响，要求服务可靠性达到99.99%以上。
* 高性能：系统能够提供高性能的读写服务，P99延迟需要在毫秒级别。
* 强一致：系统对用户提供强一致性的语义，使用户在编写业务逻辑时更容易。
* 易伸缩：系统能够很方便地扩容和缩容，以应对业务吞吐负载的变化。
* 易使用：系统给用户提供简单易用的库和接口，方便用户使用。

# 实现方案

在设计Pegasus时，我们在目标、实现难度、开发效率等方面做一些权衡。总的来说，包括这几个方面：
* 开发语言：基于性能考虑，我们选择了C++。
* 数据模型：采用简单的Key-Value数据模型。这既简化了开发，也能满足大部分业务需求。进一步地，我们将Key拆分为了HashKey和SortKey两级，加强了其表达能力。
* 数据分布：采用固定Hash分布。相比Range分布和一致性Hash分布，固定Hash分布实现更简单，数据倾斜和可伸缩性可以通过合理设计Hash键、预设更多的数据分片等措施来解决。我们也支持[Partition Split](https://pegasus.apache.org/zh/administration/partition-split)功能来扩展分片数量。
* 存储介质：建议选择SSD（固态硬盘）。SSD的性能和成本都介于内存和HDD（机械硬盘）之间，从业务需求和成本综合考虑，选择SSD是比较合适的。
* 本地存储引擎：选择[RocksDB](https://github.com/facebook/rocksdb)。RocksDB在LevelDB基础上做了很多优化，能充分利用SSD的IOPS性能和多核服务器的计算性能。
* 一致性协议：选择[PacificA](https://www.microsoft.com/en-us/research/publication/pacifica-replication-in-log-based-distributed-storage-systems/)。相比[Raft](https://raft.github.io/)，PacificA协议具有其自身的特点和优势。
* 故障检测：和HBase不同，Pegasus没有使用Zookeeper来进行故障检测，而是在MetaServer和ReplicaServer之间实现了基于租约的故障检测机制。

# 与HBase比较

Pegasus系统的最初目的就是弥补HBase的不足，这里从用户使用角度比较一下两者的区别：
* 数据模型：HBase是表格模型，采用Range分片；Pegasus是Key-Value模型，采用Hash分片。
* 接口：HBase的API接口功能虽然很丰富，但是使用也更复杂；Pegasus的接口简单，对用户更友好。
* 可靠性：由于架构和实现的原因（如Pegasus采用的本地存储、故障检测、使用C++语言实现等），Pegasus的可靠性通常优于HBase。
* 性能：由于分层架构，HBase的读写性能不是太好，P99延迟通常在几十甚至几百毫秒，而且GC问题会带来毛刺问题；Pegasus的P99可以在几毫秒，满足敏感在线业务的需求。

# 与Redis比较

如果仅从读写延迟和单机吞吐比较，Redis显然是优于Pegasus的。但如果从读写延迟、可用性、伸缩性、成本等方面综合比较，Pegasus也是有其自身的优势的。

与Redis进行比较的主要区别如下：
* 数据模型：两者都是Key-Value模型，但是Pegasus支持(HashKey + SortKey)的二级键。
* 接口：Redis的接口更丰富，支持List、Set、Map等容器特性；Pegasus的接口相对简单，功能更单一。
* 读写延迟：Redis性能比Pegasus好。
* 伸缩性：Pegasus伸缩性更好，可以很方便地增减机器节点，并支持自动的负载均衡；Redis的分布式方案在增减机器的时候比较麻烦。
* 可靠性：Pegasus数据总是持久化的，系统架构保证其较高的数据完整性；Redis在机器宕机后需要较长时间恢复，可用性不够好，还可能丢掉最后一段时间的数据。
* 成本：Pegasus使用SSD存储全量数据，而Redis需要使用内存来存储全量数据，Pegasus成本更低。

# 综合比较

业务在系统选型时，通常遇到这些问题：
* HBase虽然可用性高也易伸缩，但是性能不够好。
* Redis虽然性能好，但是需要大量内存，带来更昂贵的硬件成本。如果数据量太大，采用[Redis Cluster](https://redis.io/topics/cluster-tutorial)方案，在机器宕机故障情况下的可用性又不够。
* HBase+Redis的方案，即使用HBase做底层存储，使用Redis做上层缓存。该方案的缺点是：涉及两个系统，用户的读写逻辑会比较复杂；同时写两个系统，容易出现一致性问题；一份数据要同时存储在HBase和Redis中，成本比较高；Redis机器宕机后造成部分缓存丢失，此时从HBase读取的性能又明显降低。

Pegasus综合了HBase和Redis的优点，它既保证高的可靠性，又具有好的伸缩性，还具有良好的性能。
