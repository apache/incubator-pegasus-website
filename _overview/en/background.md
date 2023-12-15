---
permalink: /overview/background/
---

# Design Goals

* High availability: The system must be highly available. Even if some servers go down, the Pegasus cluster can recover services in an extremely short time (in several seconds), minimizing the impact on the Pegasus users and requiring service reliability to reach 99.99% or higher.
* High performance: The system must provide high-performance read and write services, with P99 latency required in milliseconds.
* Strong consistency: The system provides users with strong consistency semantics, making it easier for the Pegasus users to develop applications.
* Scalable: The system must easily scale in and scale out to cope with changes in application throughput loads.
* Easy to use: The system provides Pegasus users with simple and easy-to-use client libraries and interfaces, making it convenient for users to use.

# Implementation

When designing Pegasus, we make some trade-offs in terms of design goals, implementation difficulty, and development efficiency. Overall, including these aspects:
* Development language: Based on performance considerations, we have chosen C++.
* Data model: Using a simple Key-Value data model. This not only simplifies development, but also meets most application development needs. Furthermore, we split the Key into two levels: HashKey and SortKey, enhancing its expressive power.
* Data distribution: Using a fixed hash distribution. Compared to Range distribution and Consistent Hash distribution, Fixed Hash distribution is simpler to implement, and data skewing and scalability can be solved through measures such as reasonable design of hash keys and preset more data shards. We also support [Partition Split](https://pegasus.apache.org/en/administration/partition-split) Function to expand the number of shards.
* Storage medium: It is recommended to choose SSD (Solid State Drive). The performance and cost of SSDs are between memory and HDD (Hard Disk Drive), and considering both application requirements and costs, choosing SSDs is a more appropriate option.
* Local storage engine: Select [RocksDB](https://github.com/facebook/rocksdb). RocksDB has made many optimizations on the basis of LevelDB, which can fully utilize the IOPS performance on SSDs and the performance on multi-core servers.
* Consistency Protocol: Select [PacificA](https://www.microsoft.com/en-us/research/publication/pacifica-replication-in-log-based-distributed-storage-systems/). Compared to [Raft](https://raft.github.io/), the PacificA protocol has its own characteristics and advantages.
* Fault detection: Unlike the HBase, Pegasus does not use Zookeeper for fault detection, but implements a lease-based fault detection mechanism between MetaServer and ReplicaServer.

# Compare to Apache HBase

The original purpose of the Pegasus system was to compensate for the shortcomings of HBase. Here, we compare the differences between the two from the user's perspective:
* Data model: HBase is a tabular model that uses Range sharding, while Pegasus is a Key Value model that uses Hash sharding.
* Interface: Although HBase's API interface features are rich, its usage is also more complex. The interfaces of Pegasus are simple to understand and use.
* Reliability: Due to architecture and implementation reasons (such as the use of local storage, fault detection, and implementation in C++ language), the reliability of Pegasus is usually better than that of HBase.
* Performance: Due to the layered architecture, the read and write performance of HBase is not very good, P99 latency is usually in the tens or even hundreds of milliseconds, and GC issues can bring glitches. Pegasus's P99 latency can meet sensitive online application requirements in just a few milliseconds.

# Compare to Redis

If only compare on read/write latency and single-machine throughput, Redis is clearly superior to Pegasus. But if compared comprehensively in terms of read/write latency, availability, scalability, cost, etc., Pegasus also has its own advantages.
The main differences compared to Redis are as follows:
* Data model: Both are Key Value models, but Pegasus supports secondary keys (HashKey + SortKey).
* Interface: Redis has richer interfaces and supports container features such as List, Set, Map, etc. The interfaces of Pegasus are simple to understand and use, and its functions are more singular.
* Read/write latency: Redis performs better than Pegasus.
* Scalability: Pegasus has better scalability, making it easier to scale in and scale out, and supporting automatic load balancing. Redis's distributed solution can be quite cumbersome when adding or removing instances.
* Reliability: Pegasus is always persistent application data to disk, and the system architecture ensures its high data integrity. Redis takes a long time to recover after an instance crash, its availability is not good enough, and it may also lose the last period of data.
* Cost: Pegasus uses SSD to store full data, while Redis requires memory to store full data, resulting in lower cost for Pegasus.

# Comprehensive comparison

When selecting Key-Value storage systems, application developers often encounter these issues:
* Although HBase has high availability and is easy to scale, its performance is not good enough.
* Although Redis has good performance, it requires a large amount of memory, resulting in higher hardware costs. If the data volume is too large, use [Redis Cluster](https://redis.io/topics/cluster-tutorial), the availability of the solution is insufficient in the event of machine failure.
* The HBase+Redis solution uses HBase for underlying storage and Redis for upper level caching. The disadvantage of this solution is that it involves two systems, and the user's read and write logic will be relatively complex. Writing two systems simultaneously can lead to consistency issues. A piece of data needs to be stored in both HBase and Redis simultaneously, which is relatively costly. After the Redis machine crashed, it caused partial cache loss, and at this time, the performance of reading from HBase decreased significantly.

Pegasus combines the advantages of HBase and Redis, ensuring high reliability, good scalability, and excellent performance.
