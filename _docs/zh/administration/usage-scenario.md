---
permalink: administration/usage-scenario
---

注：Usage Scenario功能从v1.8.1版本开始支持。

# 原理
Usage Scenario功能，是指对于Pegasus的表，可以指定其使用场景。针对不同的场景，通过优化底层RocksDB的配置，以获得更好的读写性能。

我们知道，RocksDB的LSM-Tree设计具有明显的写放大效应。数据先是写入到memtable中，当memtable满了，就会flush到sstable中，并放在level-0层。当level-0层的文件个数达到预设的限制时，就会触发compaction操作，将level-0层的所有文件merge到level-1层。同理，当level-1层的数据量达到预设的限制时，也会触发level-1层的compaction，将挑选一些文件merge到level-2层。这样，数据会从低层往高层逐层上移。

RocksDB是一个可配置性很强的引擎，上面的各种行为都可以通过配置参数来调节，并且有很多参数都是可以动态修改的。这里给出几个比较关键的配置参数：
* write_buffer_size：memtable的大小限制，配置得越小，写入同样数据量产生的sstable文件数就越多。
* level0_file_num_compaction_trigger：level-0层的文件个数限制，当达到这个限制时，就会触发compaction。
* level0_slowdown_writes_trigger：当level-0层的文件个数超过这个值的时候，就会触发slowdown-writes行为，通过主动提升写操作延迟，来降低写入速度。
* level0_stop_writes_trigger：当level-0层的文件个数超过这个值的时候，就会触发stop-writes行为，拒绝写入新的数据。
* max_bytes_for_level_base：level-1层的数据量限制，当达到这个限制时，就会挑选一些文件merge到level-2层。
* max_bytes_for_level_multiplier：数据量随层数的增长因子，譬如如果设为10，表示level-2的数据量限制就是level-1的10倍，level-3的数据量限制也是level-2的10倍。

Pegasus在提供读写服务的时候，需要考虑这些因素：
* 当写数据的速度较大时，memtable很快就会写满，就会不断flush memtable产生新的sstable文件；
* 新sstable文件的产生就会触发compaction，并从低层向高层逐层蔓延；
* compaction需要耗费大量的CPU和IO，造成**机器的CPU和IO负载居高不下**，影响读写操作的性能；
* 如果compaction速度赶不上数据写入的速度，level-0的文件数就会越堆越多，最终达到`level0_slowdown_writes_trigger`的限制，**使写操作的延迟陡增**；甚至进一步达到`level0_stop_writes_trigger`的限制，**使写操作失败**，影响系统的稳定性和服务的可用性。
* **读写需求很难同时得到满足**，二者需要权衡。compaction进行得越快，level-0的文件数维持得越少，读的时候需要读取的文件个数就越少，读性能就越高；但是compaction越快，带来的写放大效应就越大，CPU和IO的负载就越重，也会影响读写性能。

所幸的是，RocksDB针对这个问题也给出了一些解决方案，譬如在[RocksDB-FAQ](https://github.com/facebook/rocksdb/wiki/RocksDB-FAQ)中给出的方案：
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
 
3-5 will be automatically done if you call Options::PrepareForBulkLoad() to your option
```

而我们的思路正是：通过针对不同业务场景，设置不同的RocksDB参数，调节RocksDB的行为，以提供更好的读写性能。具体来说：
* 通过[Table环境变量](table-env)设置`rocksdb.usage_scenario`来指定当前的业务场景。
* Replica在检测到该环境变量发生变化时，就会根据业务场景，动态修改RocksDB的配置参数。具体设置了哪些参数，请参见[src/server/pegasus_server_impl.cpp](https://github.com/apache/incubator-pegasus/blob/master/src/server/pegasus_server_impl.cpp)中的`set_usage_scenario()`方法。

# 支持场景

目前支持三种场景：
* normal：正常场景，读写兼顾。这也是表的默认场景，该场景不会对写进行特别的优化，适合大部分读多写少或者读写均衡的应用。
* prefer_write：写较多的场景。主要是增大`write_buffer_size`以降低sstable的产生速度。
* bulk_load：灌数据场景。应用上面RocksDB-FAQ中提到的优化，避免compaction过程。因为Bulk load模式停止compaction，所以写入的数据都会堆放在level-0层，对读不友好。因此，Bulk load模式通常与[Manual Compact功能](manual-compact)配合使用，在数据加载完成后进行一次Manual Compact，以去除垃圾数据、提升读性能（参见后面的[应用示例](#应用示例)）。另外，当不需要加载数据时，应当恢复为Normal模式。典型的灌数据流程：
  * 设置表的Usage Scenario模式为bulk_load
  * 灌数据：在bulk load模式下灌数据的QPS会更高，流量更稳定
  * 执行Manual Compact：该过程消耗大量的CPU和IO，可能对集群读写性能有影响
  * 恢复表的Usage Scenario模式为normal

# 如何设置
## 通过shell设置
通过shell的[set_app_envs命令](/_docs/zh/tools/shell.md#set_app_envs)来设置，譬如设置temp表为bulk_load模式：
```
>>> use temp
>>> set_app_envs rocksdb.usage_scenario bulk_load
```

Table环境变量不会立即生效，大约需要等几十秒后才能在所有replica上生效。

## 通过脚本设置
我们提供了一个脚本工具[scripts/pegasus_set_usage_scenario.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_set_usage_scenario.sh)来方便地设置，用法：
```
$ ./scripts/pegasus_set_usage_scenario.sh   
This tool is for set usage scenario of specified table(app).
USAGE: ./scripts/pegasus_set_usage_scenario.sh <cluster-meta-list> <app-name> <normal|prefer_write|bulk_load>
```

该工具会调用shell命令设置Table环境变量，然后还会检测是否在所有replica上都已经生效，只有所有都生效了才算执行完成。

## 应用示例

bulk_load模式通常用于灌数据，但是在灌数据过程中因为消耗大量的CPU和IO，对读性能会产生较大影响，造成读延迟陡增、超时率升高等。如果业务对读性能要求比较苛刻，可以考虑**读写分离的双集群方案**。

假设两个集群分别为A和B，最初线上流量访问A集群，灌数据流程：
* 第一步：​设置B模式为bulk_load -> 灌数据至B -> Manual Compact B -> 设置B模式为normal​​ -> 切线上流量至B
* 第二步：设置A模式为bulk_load -> 灌数据至A -> Manual Compact A -> 设置A模式为normal -> 切线上流量至A

关于如何Manual Compact，请参考[Manual-Compact功能](manual-compact)。
