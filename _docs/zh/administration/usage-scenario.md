---
permalink: administration/usage-scenario
---

> 从 1.8.1 版本开始，Pegasus 支持了 Usage Scenario 功能。

# 原理

Usage Scenario 功能，是指对 Pegasus 表指定 _使用场景_。针对不同的场景，通过优化底层 RocksDB 的配置，以获得更好的读写性能。

RocksDB 采用了 LSM tree 存储架构，其中的 [Compaction](https://github.com/facebook/rocksdb/wiki/Compaction) 会较大地影响读写性能，Pegasus 采用了 Classic Leveled 算法，他的 Compaction 原理参考 [Leveled-Compaction](https://github.com/facebook/rocksdb/wiki/Leveled-Compaction)。

RocksDB 是一个可配置性很强的引擎，各种 flush 操作和 compaction 操作都可以通过配置调节，并且有部分配置是可以运行时修改的。这里给出几个比较关键的配置：
> （配置说明源自 RocksDB 源码）
> * write_buffer_size: Amount of data to build up in memory before converting to a sorted on-disk file.
> * level0_file_num_compaction_trigger: Number of files to trigger level-0 compaction. A value <0 means that level-0 compaction will not be triggered by number of files at all.
> * level0_slowdown_writes_trigger：Soft limit on number of level-0 files. We start slowing down writes at this point. A value <0 means that no writing slow down will be triggered by number of files in level-0.
> * level0_stop_writes_trigger: Maximum number of level-0 files.  We stop writes at this point.
> * max_bytes_for_level_base: Control maximum total data size for a level. max_bytes_for_level_base is the max total for level-1.
> * max_bytes_for_level_multiplier: Maximum number of bytes for level L can be calculated as (max_bytes_for_level_base) * (max_bytes_for_level_multiplier ^ (L-1)).

Pegasus 在提供读写服务时，需要考虑这些因素：
* 写操作越快，memtable 就会更快写满，就会更快地 flush memtable 产生 level-0 上新的 sstable 文件
* 随着 level-0 上 sstable 文件的累积，就会触发 compaction 操作，并从低层向高层逐层蔓延
* Compaction 操作越多，耗费的 CPU 和磁盘 IO 负载越高，从而影响读写操作的性能
* 如果 level-0 到 level-1 的 compaction 操作速度低于数据写入的速度，level-0 的文件数就会累积得越多，最终达到 `level0_slowdown_writes_trigger` 阈值，使写操作的延迟陡增，甚至进一步达到 `level0_stop_writes_trigger` 阈值，使写操作失败，影响系统的稳定性和服务的可用性
* 高吞吐且低延迟的读写需求很难同时得到满足，二者需要权衡。
  * Compaction 操作进行得越快，level-0 累积得文件数越少，读操作需要读取的文件个数就越少，读性能就越高
  * 但是 compaction 越快，带来的写放大就越大，CPU 和磁盘 IO 负载就越高，也会影响读写性能

所幸的是，RocksDB 针对这个问题也给出了一些解决方案，例如在 [RocksDB-FAQ](https://github.com/facebook/rocksdb/wiki/RocksDB-FAQ) 中给出的方案：

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

Pegasus 的解决方案是，针对不同应用场景，设置不同的 RocksDB 参数，调节 RocksDB 的行为，以提供更好的读写性能。具体来说：
* 通过 [Table 环境变量](table-env) 设置 `rocksdb.usage_scenario` 来指定对应的应用场景
* 各表的 replica 在检测到该环境变量发生变化时，就会根据业务场景修改 RocksDB 的配置参数。
> 具体设置了哪些参数，可参考 [src/server/pegasus_server_impl.cpp](https://github.com/apache/incubator-pegasus/blob/master/src/server/pegasus_server_impl.cpp) 中的 `set_usage_scenario()` 方法。

# 支持场景

目前 Pegasus 支持三种场景：
* normal：正常场景，读写兼顾。这也是表的默认场景，该场景不会对写进行特别的优化，适合大部分读写均衡的应用
* prefer_write：写多读少的场景。主要是增大 `write_buffer_size` 和 `level0_file_num_compaction_trigger` 以降低 memtable 的 flush 操作和 level-0 到 level-1 的 compaction 操作的速度
* bulk_load：批量导入数据的场景（注意这不是 [bulk-load](https://pegasus.apache.org/zh/2020/02/18/bulk-load-design.html)）。使用上面 RocksDB-FAQ 中提到的优化，禁用 compaction 操作。此时，所有新写入的数据都会堆积在 level-0 层，对读不友好。因此，`bulk_load` 场景通常与 [Manual Compact 功能](manual-compact) 结合使用，在数据导入完成后，进行一次 Manual Compact，以快速进行垃圾回收、全局排序来提升读性能，然后恢复为 normal 模式。典型的批量数据导入流程：
  * 设置表的 `rocksdb.usage_scenario` 模式为 `bulk_load`
  * 导入数据：在 `bulk_load` 场景下数据写入 TPS 会更高，流量更稳定
  * 执行 Manual Compact：该过程会消耗大量的 CPU 和磁盘 IO 资源，可能对集群读写性能有影响
  * 恢复表的 `rocksdb.usage_scenario` 模式为 `normal`

# 如何使用

## 通过 shell 工具设置

通过 shell 工具的 [set_app_envs](/docs/tools/shell/#set_app_envs) 命令来设置，例如设置 temp 表为 bulk_load 模式：
```
>>> use temp
>>> set_app_envs rocksdb.usage_scenario bulk_load
```

> Table 的环境变量不会立即生效，大约需要等几十秒（取决于配置项 `[replication]config_sync_interval_ms`）后才能在所有 replica 上生效。

## 通过辅助脚本设置

Pegasus 提供了一个辅助脚本 [scripts/pegasus_set_usage_scenario.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_set_usage_scenario.sh) 来方便地设置环境变量，用法：
```
$ ./scripts/pegasus_set_usage_scenario.sh
This tool is for set usage scenario of specified table(app).
USAGE: ./scripts/pegasus_set_usage_scenario.sh <cluster-meta-list> <app-name> <normal|prefer_write|bulk_load>
```

该脚本会调用 shell 工具中设置 Table 环境变量的命令，然后检测是否在所有 replica 上都已经生效，只有所有 replica 上都生效了才算执行完成。
