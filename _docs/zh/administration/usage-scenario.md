---
permalink: administration/usage-scenario
---

> 从 1.8.1 版本开始，Pegasus 支持了 Usage Scenario 功能。

# 原理

Usage Scenario 功能，是指对于 Pegasus 的表，可以指定其 _使用场景_。针对不同的场景，通过优化底层 RocksDB 的配置，以获得更好的读写性能。

众所周知，RocksDB 的 LSM-Tree 设计具有明显的写放大效应。数据先是写入到 memtable 中，当 memtable 满了，就会 flush 到 sstable 中，并放在 level-0 层。当 level-0 层的文件个数超过阈值时，就会触发 compaction 操作，将 level-0 层的所有文件 merge 到 level-1 层。同理，当 level-1 层的数据量达到预设的限制时，也会触发 level-1 层的 compaction，将挑选一些文件 merge 到 level-2 层。这样，数据会从低层往高层逐层上移。

RocksDB 是一个可配置性很强的引擎，上面的各种行为都可以通过配置参数来调节，并且有很多参数都是可以动态修改的。这里给出几个比较关键的配置参数：
* write_buffer_size：memtable 的大小限制，配置得越小，写入同样数据量产生的 sstable 文件数就越多。
* level0_file_num_compaction_trigger：level-0 层的文件个数限制，当达到这个限制时，就会触发 compaction。
* level0_slowdown_writes_trigger：当 level-0 层的文件个数超过这个值的时候，就会触发 slowdown-writes 行为，通过主动提升写操作延迟，来降低写入速度。
* level0_stop_writes_trigger：当 level-0 层的文件个数超过这个值的时候，就会触发 stop-writes 行为，拒绝写入新的数据。
* max_bytes_for_level_base：level-1 层的数据量限制，当达到这个限制时，就会挑选一些文件 merge 到 level-2 层。
* max_bytes_for_level_multiplier：数据量随层数的增长因子，譬如如果设为 10，表示 level-2 的数据量限制就是 level-1 的 10 倍，level-3 的数据量限制也是 level-2 的 10 倍。

Pegasus 在提供读写服务的时候，需要考虑这些因素：
* 当写数据的速度较大时，memtable 很快就会写满，就会不断 flush memtable 产生新的 sstable 文件；
* 新 sstable 文件的产生就会触发 compaction，并从低层向高层逐层蔓延；
* compaction 需要耗费大量的 CPU 和 IO，造成 ** 机器的 CPU 和 IO 负载居高不下 **，影响读写操作的性能；
* 如果 compaction 速度赶不上数据写入的速度，level-0 的文件数就会越堆越多，最终达到 `level0_slowdown_writes_trigger` 的限制，** 使写操作的延迟陡增 **；甚至进一步达到 `level0_stop_writes_trigger` 的限制，** 使写操作失败 **，影响系统的稳定性和服务的可用性。
* ** 读写需求很难同时得到满足 **，二者需要权衡。compaction 进行得越快，level-0 的文件数维持得越少，读的时候需要读取的文件个数就越少，读性能就越高；但是 compaction 越快，带来的写放大效应就越大，CPU 和 IO 的负载就越重，也会影响读写性能。

所幸的是，RocksDB 针对这个问题也给出了一些解决方案，譬如在 [RocksDB-FAQ](https://github.com/facebook/rocksdb/wiki/RocksDB-FAQ) 中给出的方案：
```
Q: What's the fastest way to load data into RocksDB?

A: A fast way to direct insert data to the DB:
   1. using single writer thread and insert in sorted order
   2. batch hundreds of keys into one write batch
   3. use vector memtable
   4. make sure options.max_background_flushes is at least 4
   5. before inserting the data, disable automatic compaction, set options.level0_file_num_compaction_trigger, 
      options.level0_slowdown_writes_trigger and options.level0_stop_writes_trigger to very large. After inserting all the 
      data, issue a manual compaction.
 
3-5 will be automatically done if you call Options::PrepareForBulkLoad () to your option
```

而我们的思路正是：通过针对不同业务场景，设置不同的 RocksDB 参数，调节 RocksDB 的行为，以提供更好的读写性能。具体来说：
* 通过 [Table 环境变量](table-env) 设置 `rocksdb.usage_scenario` 来指定当前的业务场景。
* Replica 在检测到该环境变量发生变化时，就会根据业务场景，动态修改 RocksDB 的配置参数。具体设置了哪些参数，请参见 [src/server/pegasus_server_impl.cpp](https://github.com/apache/incubator-pegasus/blob/master/src/server/pegasus_server_impl.cpp) 中的 `set_usage_scenario ()` 方法。

# 支持场景

目前支持三种场景：
* normal：正常场景，读写兼顾。这也是表的默认场景，该场景不会对写进行特别的优化，适合大部分读多写少或者读写均衡的应用。
* prefer_write：写较多的场景。主要是增大 `write_buffer_size` 以降低 sstable 的产生速度。
* bulk_load：灌数据场景。应用上面 RocksDB-FAQ 中提到的优化，避免 compaction 过程。因为 Bulk load 模式停止 compaction，所以写入的数据都会堆放在 level-0 层，对读不友好。因此，Bulk load 模式通常与 [Manual Compact 功能](manual-compact) 配合使用，在数据加载完成后进行一次 Manual Compact，以去除垃圾数据、提升读性能（参见后面的 [应用示例](# 应用示例)）。另外，当不需要加载数据时，应当恢复为 Normal 模式。典型的灌数据流程：
  * 设置表的 Usage Scenario 模式为 bulk_load
  * 灌数据：在 bulk load 模式下灌数据的 QPS 会更高，流量更稳定
  * 执行 Manual Compact：该过程消耗大量的 CPU 和 IO，可能对集群读写性能有影响
  * 恢复表的 Usage Scenario 模式为 normal

# 如何设置
## 通过 shell 设置
通过 shell 的 [set_app_envs 命令](/overview/shell#set_app_envs) 来设置，譬如设置 temp 表为 bulk_load 模式：
```
>>> use temp
>>> set_app_envs rocksdb.usage_scenario bulk_load
```

Table 环境变量不会立即生效，大约需要等几十秒后才能在所有 replica 上生效。

## 通过脚本设置
我们提供了一个脚本工具 [scripts/pegasus_set_usage_scenario.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_set_usage_scenario.sh) 来方便地设置，用法：
```
$ ./scripts/pegasus_set_usage_scenario.sh   
This tool is for set usage scenario of specified table (app).
USAGE: ./scripts/pegasus_set_usage_scenario.sh <cluster-meta-list> <app-name> <normal|prefer_write|bulk_load>
```

该工具会调用 shell 命令设置 Table 环境变量，然后还会检测是否在所有 replica 上都已经生效，只有所有都生效了才算执行完成。

## 应用示例

bulk_load 模式通常用于灌数据，但是在灌数据过程中因为消耗大量的 CPU 和 IO，对读性能会产生较大影响，造成读延迟陡增、超时率升高等。如果业务对读性能要求比较苛刻，可以考虑 ** 读写分离的双集群方案 **。

假设两个集群分别为 A 和 B，最初线上流量访问 A 集群，灌数据流程：
* 第一步：​设置 B 模式为 bulk_load -> 灌数据至 B -> Manual Compact B -> 设置 B 模式为 normal​​ -> 切线上流量至 B
* 第二步：设置 A 模式为 bulk_load -> 灌数据至 A -> Manual Compact A -> 设置 A 模式为 normal -> 切线上流量至 A

关于如何 Manual Compact，请参考 [Manual-Compact 功能](manual-compact)。
