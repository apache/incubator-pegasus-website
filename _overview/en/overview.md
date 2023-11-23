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
