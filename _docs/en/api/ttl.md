---
permalink: api/ttl
---

# Principle

Pegasus supports TTL (Time To Live) function, which means the expiration time of the data can be specified when writing data. Once data expired, it is invisible to the user and can no longer be accessed through interfaces such as get/multiGet.

Users set TTL via the `ttl_seconds` parameter which represents the number of seconds after which the data will expire, starting from the current time. Zero means that TTL is not set, that is, the data will never expire.

How does TTL implement? Will the data be deleted from the disk immediately? Next, let's talk about the implementation principle of TTL.

Simply speaking, Pegasus TTL is achieved by recording the expiration time of data when writing and checking the expiration time during queries. As shown in the following figure:

![pegasus-ttl.png](/assets/images/pegasus-ttl.png){:class="img-responsive"}

**Writing process**

* When writing data, the user uses `ttl_seconds` parameter on the client side as the TTL, the client first calculates the expiration time of the data through `ExpireTime = CurrentTime + ttl_seconds`, and then pass the data and `ExpireTime` together to the ReplicaServer through RPC.
* After receiving a write request, ReplicaServer undergoes various processes (including writing WAL, replication, etc.) and finally stores the data in RocksDB. When storing values, `ExpireTime` will be placed in the value header.

**Reading process**

* Users query the value data corresponding to the specified key through the client
* After receiving a read request, ReplicaServer first retrieves the value corresponding to the key from RocksDB, and then extracts the `ExpireTime` from the value header:
  * If ExpireTime == 0, it indicates that the data has not been set TTL, it's always valid.
  * If ExpireTime > 0, it indicates that TTL has been set for the data, and further comparison is made:
    * If ExpireTime > now, the data has not expired and the user data in value is returned
    * If ExpireTime <= now, then the data has expired and returns `NotFound`

**Data deletion**

* After the data expires, it does not immediately remove from RocksDB, but rather garbage collect through [compaction](https://github.com/facebook/rocksdb/wiki/Compaction).
* Pegasus uses a custom RocksDB [CompactionFilter](https://github.com/facebook/rocksdb/wiki/Compaction-Filter) during the compaction process, check the `ExpireTime` in the value header of the data. If it has expired, discard the data, and it will not appear in the newly generated file.
* Because the GC process of expired data is asynchronous and depends on the timing and frequency of compaction execution, data expiration and deletion usually do not occur simultaneously. The only guarantee is that data deletion will definitely occur after data expiration.
* Expired but undeleted data will still occupy disk space.

# Interface

We provide interfaces for setting and querying TTL on both the client drivers and shell tools.

Taking Pegasus Java Client as an example, the interfaces for obtaining TTL include:
* [ttl](/clients/java-client#ttl)

The interfaces for setting TTL include:
* [set](/clients/java-client#set)
* [batchSet](/clients/java-client#batchset)
* [multiSet](/clients/java-client#multiset)
* [batchMultiSet](/clients/java-client#batchmultiset)
* [incr](/clients/java-client#incr) (Since Pegasus v1.11.1)
* [checkAndSet](/clients/java-client#checkandset)

The following commands in Shell tools can query/set TTL:
* [ttl](/docs/tools/shell/#ttl)
* [set](/docs/tools/shell/#set)
* [multi_set](/docs/tools/shell/#multi_set)

# Table level TTL

Since Pegasus v1.11.2, Pegasus supports table level TTL functionality.

## Implementation principle

* Users set `default_ttl` environment variable in the [Table environment variable](/administration/table-env)
* MetaServer synchronizes environment variables to each ReplicaServer asynchronously, so that each replica of the table obtains the environment variable
* After obtaining the environment variable in replica, parse to obtain the `default_ttl` parameter, and take effect immediately. Afterward:
  * If the user's newly written data's `ExpireTime` = 0, the actual `ExpireTime` of the data will be set to `default_ttl`
  * When RocksDB performs compaction, if the original data in the compact input file **does not have** `ExpireTime`, then the `ExpireTime` of the new data in the compact output file will be set to `default_ttl`
  * Due to the uncertainty of the execution timing of the background compaction, the time of data without TTL set `default_ttl` as TTL is also uncertain
  * If you want to set the TTL for all data quickly, you can use [Manual Compact](/administration/manual-compact). So all data will be processed by compaction, and data without TTL will be set TTL as `default_ttl`

## Application scenarios

* The disk space occupied by data tables is increasing. Users want to reduce disk space usage, improve query performance by garbage-collecting data, or reduce disk and CPU consumption
* All or part of the data in the table has no TTL set
* The validity of data without TTL is related to the write time. For example, data written for more than a month will no longer have a query requirement and can be discarded
In scenarios where all three conditions are met, the purpose of cleaning up disks and releasing resources can be achieved through the functions of table level TTL and Manual Compact.

# Calculate data write time through TTL

If TTL is set during data writing, the time of data writing can be calculated using TTL.

Due to:
```
ExpireTime = InsertTime + TTLSeconds = now + TTLRemainingSeconds
```
Therefore:
```
InsertTime = now + TTLRemainingSeconds - TTLSeconds
```
Among them:
* Now: The time when executing the Shell ttl command.
* TTLRemainingSeconds: Obtained through [Shell's ttl command](/overview/shell#ttl).
* TTL seconds: The TTL set by the user when writing data.
