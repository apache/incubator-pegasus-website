---
permalink: administration/usage-scenario
---

> Since 1.8.1, Pegasus supports the Usage Scenario function.

# Principle

The Usage Scenario function refers to specifying the Pegasus table's _usage scenario_. By optimizing RocksDB options for different scenarios, better read and write performance can be achieved.

RocksDB adopts the LSM tree storage architecture, [Compaction](https://github.com/facebook/rocksdb/wiki/Compaction) haa a significant impact on read-write performance. Pegasus adopts the _Classic Level_ algorithm, and its comparison principle is referenced to [Leveled-Compaction](https://github.com/facebook/rocksdb/wiki/Leveled-Compaction).

RocksDB is a highly configurable engine, where various flush and compact operations can be adjusted through configurations, and some configurations can be modified at runtime. Here are several key configurations:
> (The configuration instructions are from the RocksDB source code)
> * write_buffer_size: Amount of data to build up in memory before converting to a sorted on-disk file.
> * level0_file_num_compaction_trigger: Number of files to trigger level-0 compaction. A value <0 means that level-0 compaction will not be triggered by number of files at all.
> * level0_slowdown_writes_trigger：Soft limit on number of level-0 files. We start slowing down writes at this point. A value <0 means that no writing slow down will be triggered by number of files in level-0.
> * level0_stop_writes_trigger: Maximum number of level-0 files.  We stop writes at this point.
> * max_bytes_for_level_base: Control maximum total data size for a level. max_bytes_for_level_base is the max total for level-1.
> * max_bytes_for_level_multiplier: Maximum number of bytes for level L can be calculated as (max_bytes_for_level_base) * (max_bytes_for_level_multiplier ^ (L-1)).

When providing read and write services, Pegasus needs to consider these factors:
* The faster the write operations, the faster the memtable can be filled up, and the faster it flushes to generate new sstable files on level-0
* As the sstable files accumulate on level-0, compaction operations are triggered, and it propagates layer by layer from lower to higher levels
* The more compaction operations, the higher the CPU and disk IO load consumed, thereby affecting the performance of read and write operations
* If the speed of the compaction operations from level-0 to level-1 is lower than the speed of data writing, the number of files on level-0 accumulates more, eventually reaching the `level0_slowdown_writes_trigger` threshold, causing the latency of the write operations increase sharply, and even further reaching the `level0_stop_writes_trigger` threshold, causing the write operations fail, affecting system stability and service availability
* It is difficult to meet both high throughput and low latency for read and write operations requirements simultaneously, it needs a trade-off.
  * The faster the compaction operations performed, the fewer files accumulated on level-0, and the fewer files that need to be consulted during the read operations, resulting in higher read performance
  * But the faster the compaction operations performed, the greater the write amplification they bring, and the higher the CPU and disk IO load, which also affect read and write performance

Fortunately, RocksDB has also provided some solutions to this issue, for example in [RocksDB-FAQ](https://github.com/facebook/rocksdb/wiki/RocksDB-FAQ):

> Q: What's the fastest way to load data into RocksDB?
>
> A: A fast way to direct insert data to the DB:
>
> 1. using single writer thread and insert in sorted order
> 2. batch hundreds of keys into one write batch
> 3. use vector memtable
> 4. make sure options.max_background_flushes is at least 4
> 5. before inserting the data, disable automatic compaction, set options.level0_file_num_compaction_trigger, options.level0_slowdown_writes_trigger and options.level0_stop_writes_trigger to very large value. After inserting all the data, issue a manual compaction.
>
>   3-5 will be automatically done if you call Options::PrepareForBulkLoad() to your option

Pegasus's solution is to set different RocksDB options for different usage scenarios and adjust the behavior of RocksDB to provide better read and write performance. Specifically:
* Use the [Table environment](table-env) to set `rocksdb.usage_scenario` to specify the corresponding usage scenario
* When the replicas of each table detect the environment variable changes, they will modify the RocksDB options according to the usage scenario.
> Refer to the `set_usage_scenario()` function in [src/server/pegasus_server_impl.cpp](https://github.com/apache/incubator-pegasus/blob/master/src/server/pegasus_server_impl.cpp) to check which options are modified.

# Supported scenarios

Currently, Pegasus supports three scenarios:
* normal: Normal scenario, balancing reading and writing. This is also the default scenario for tables, which does not require special optimization for writing and is suitable for most read-write balanced applications
* prefer_write: Write more and read less scenario. Mainly increase the size of `write_buffer_size` and `level0_file_num_compaction_trigger` to slow down the memtable flush operations and the compaction operations from level-0 to level-1
* bulk_load: The scenario of bulk loading data (Note: this is not [bulk-load](https://pegasus.apache.org/zh/2020/02/18/bulk-load-design.html)). Use the optimization mentioned in RocksDB-FAQ above, disable the compaction operations. Now, all newly written data accumulates on level-0, which is not read friendly. Therefore, the `bulk_load` scenario is usually used in conjunction with [Manual Compact](manual-compact). After the data loading is completed, perform a _Manual Compact_ to garbage collection quickly, full sorting to improve read performance, and then restore to `normal` scenario. Typical batch data import process:
    * Set the table `rocksdb.usage_scenario` to `bulk_load`
    * load data: In `bulk_load` scenario, the TPS will be higher and traffic will be more stable
    * Execute _Manual Compact_: A significant amount of CPU and disk IO resources will be consumed in this process, which may have an impact on the cluster read and write performance
    * Reset the table `rocksdb.usage_scenario` to `normal`

# How to use it ?

## Through shell tools

Use the [set_app_envs](/docs/tools/shell/#set_app_envs) command in shell tools, for example, set table `temp` to `bulk_load` scenario:
```
>>> use temp
>>> set_app_envs rocksdb.usage_scenario bulk_load
```

> The environment variables of table doesn't take effect immediately and will take about a few seconds (depends on `[replication]config_sync_interval_ms` option) to take effect on all replicas.

## Through an assisted script

Pegasus provides an assisted script [scripts/pegasus_set_usage_scenario.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_set_usage_scenario.sh) to set environment variables conveniently, usage:
```
$ ./scripts/pegasus_set_usage_scenario.sh
This tool is for set usage scenario of specified table(app).
USAGE: ./scripts/pegasus_set_usage_scenario.sh <cluster-meta-list> <app-name> <normal|prefer_write|bulk_load>
```

This script sets the table environment variables through the commands in the shell tools, then check if it has taken effect on all replicas. It is considered complete only if it has taken effect on all replicas.
