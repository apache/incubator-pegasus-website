---
permalink: administration/manual-compact
---

注：manual compact功能从v1.8.1版本开始支持。
# 原理

RocksDB除了根据需要自动触发compaction外，还能通过接口手动触发compaction，这个功能称之为[Manual Compaction](https://github.com/facebook/rocksdb/wiki/Manual-Compaction)。其提供了`CompactRange()`接口，如下：
```C++
// CompactRangeOptions is used by CompactRange() call.
struct CompactRangeOptions {
  // If true, no other compaction will run at the same time as this
  // manual compaction
  bool exclusive_manual_compaction = true;
  // If true, compacted files will be moved to the minimum level capable
  // of holding the data or given level (specified non-negative target_level).
  bool change_level = false;
  // If change_level is true and target_level have non-negative value, compacted
  // files will be moved to target_level.
  int target_level = -1;
  // Compaction outputs will be placed in options.db_paths[target_path_id].
  // Behavior is undefined if target_path_id is out of range.
  uint32_t target_path_id = 0;
  // By default level based compaction will only compact the bottommost level
  // if there is a compaction filter
  BottommostLevelCompaction bottommost_level_compaction =
      BottommostLevelCompaction::kIfHaveCompactionFilter;
};

// Compact the underlying storage for the key range [*begin,*end].
// The actual compaction interval might be superset of [*begin, *end].
// In particular, deleted and overwritten versions are discarded,
// and the data is rearranged to reduce the cost of operations
// needed to access the data.  This operation should typically only
// be invoked by users who understand the underlying implementation.
//
// begin==nullptr is treated as a key before all keys in the database.
// end==nullptr is treated as a key after all keys in the database.
// Therefore the following call will compact the entire database:
//    db->CompactRange(options, nullptr, nullptr);
// Note that after the entire database is compacted, all data are pushed
// down to the last level containing any data. If the total data size after
// compaction is reduced, that level might not be appropriate for hosting all
// the files. In this case, client could set options.change_level to true, to
// move the files back to the minimum level capable of holding the data set
// or a given level (specified by non-negative options.target_level).
virtual Status CompactRange(const CompactRangeOptions& options,
                            ColumnFamilyHandle* column_family,
                            const Slice* begin, const Slice* end) = 0;
```

对应地，Pegasus对该功能在上层进行了封装，提供了表级别的Manual Compact功能，其作用是：
* 通过compaction去掉垃圾数据，减少数据量，降低文件层数，提升读操作的性能。
* 对最高层做compaction，可以清理掉Delete标记数据。
* 配合[Usage Scenario功能](usage-scenario)中表的bulk_load模式，可以在灌数据完成后执行一次Manual Compact，去除垃圾数据，整理数据和文件夹结构，提升读性能。

实现方式：
* 扩展RocksDB，在Manifest中记录上一次执行Manual Compact的时间，并提供`GetLastManualCompactFinishTime()`方法来获取该时间。
* 利用[Table环境变量](table-env)，来设置两类Manual Compect的环境变量：
  * 单次Manual Compact：
    * `manual_compact.once.trigger_time`：格式为Unix时间戳的秒数，可通过shell命令`date +%s`获取当前时间戳。如果LastManualCompactFinishTime旧于该trigger_time，就触发Manual Compaction的执行。
    * `manual_compact.once.target_level`：用于设置`CompactRangeOptions::target_level`。如果不设置，则使用默认值-1。
    * `manual_compact.once.bottommost_level_compaction`：可设置为`skip`或者`force`。如果是`skip`，则不对最高层做compaction；如果是`force`，则强制对最高层做compaction。如果不设置，则默认为`skip`。
  * 周期Manual Compact：
    * `manual_compact.periodic.trigger_time`：格式为逗号分隔的时钟，譬如`3:00,21:00`，表示每一天的3:00和21:00都触发一次Manual Compaction的执行。
    * `manual_compact.periodic.target_level`：用于设置`CompactRangeOptions::target_level`。如果不设置，则使用默认值-1。
    * `manual_compact.periodic.bottommost_level_compaction`：可设置为`skip`或者`force`。如果是`skip`，则不对最高层做compaction；如果是`force`，则强制对最高层做compaction。如果不设置，则默认为`skip`。
  * Manual Compact总开关：
    * `manual_compact.disabled`(从v1.9.0版本开始支持)：如果为true，则关闭Manual Compact功能，并且取消正在执行中的Manual Compact动作。如果不设置，默认为false。
    * `manual_compact.max_concurrent_running_count`(从v1.11.3版本开始支持)：指定最大并发数。实际上，可执行的最大并发数由`该env参数`和`服务端MANUAL_COMPACT_THRAD_POOL的线程数`共同决定，取两者的较小值。

注意：
* Manual Compact功能是分派到独立的Compact线程池中执行的，每个线程同一时刻只能处理一个replica的full compaction，因为并发处理量与Compact线程池的线程数量有关，可以通过配置文件的`worker_count`进行配置，如果使用Manual Compact比较频繁，建议调大线程数量（譬如设置为cpu core数量接近）：
  ```
  [threadpool.THREAD_POOL_COMPACT]
  name = compact
  partitioned = false
  max_input_queue_length = 128
  worker_priority = THREAD_xPRIORITY_NORMAL
  worker_count = 16
  ```
* Manual Compact属于CPU和IO密集型操作，处理过程中会使CPU使用率长期处于高位，容易对集群的读写性能造成影响，所以**建议在流量低峰时段进行操作**。如果启动后发现读写性能下降影响了业务，可以立即通过设置该表的环境变量`manual_compact.disabled=true`来中止。
* Manual Compact过程中可能需要较多的额外磁盘空间。因为compaction前后文件变化较大，而Pegasus一般又会保留最近3个版本的checkpoint，所以基本上额外需要的磁盘空间量大约等于执行Manual Compact的表的数据存储量。所以，在执行Manual Compact前需**确认集群有足够的存储空间**，同时在执行过程中**关注磁盘空间使用情况**，避免因为磁盘空间耗尽导致集群节点宕机，影响集群可用度。

# 如何设置

## 通过shell设置

既然Manual Compact功能是利用[Table环境变量](table-env)触发的，那么可以直接通过shell功能的[set_app_envs命令](/_docs/zh/tools/shell.md#set_app_envs)来设置。需要设置的环境变量参照上面的描述，环境变量设置后不会立即生效，大约需要等几十秒后才能在所有replica上生效。

由于需要设置的环境变量比较多，且对数据格式有要求，所以强烈建议不要自己直接设置，而是通过我们提供的脚本工具来设置，如下所示。

## 通过脚本设置
我们提供了一个脚本工具[scripts/pegasus_manual_compact.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_manual_compact.sh)来方便地设置，用法：
```
$ ./scripts/pegasus_manual_compact.sh 
This tool is for manual compact specified table(app).
USAGE: ./scripts/pegasus_manual_compact.sh -c cluster -a app-name [-t periodic|once] [-w] [-g trigger_time] [...]
Options:
  -h|--help                   print help message

  -c|--cluster <str>          cluster meta server list, default is "127.0.0.1:34601,127.0.0.1:34602"

  -a|--app_name <str>         target table(app) name

  -t|--type <str>             manual compact type, should be periodic or once, default is once

  -w|--wait_only              this option is only used when the type is once!
                              not trigger but only wait the last once compact to finish

  -g|--trigger_time <str>     this option is only used when the type is periodic!
                              specify trigger time of periodic compact in 24-hour format,
                              e.g. "3:00,21:00" means 3:00 and 21:00 everyday

  --target_level <num>        number in range of [-1,num_levels], -1 means automatically, default is -1

  --bottommost_level_compaction <skip|force>
                              skip or force, default is skip
                              more details: https://github.com/facebook/rocksdb/wiki/Manual-Compaction

  --max_concurrent_running_count <num>
                              max concurrent running count limit, should be positive integer.
                              if not set, means no limit.

for example:

  1) Start once type manual compact with default options:

      ./scripts/pegasus_manual_compact.sh -c 127.0.0.1:34601,127.0.0.1:34602 -a temp

  2) Only wait last once type manual compact to finish:

      ./scripts/pegasus_manual_compact.sh -c 127.0.0.1:34601,127.0.0.1:34602 -a temp -w

  3) Config periodic type manual compact with specified options:

      ./scripts/pegasus_manual_compact.sh -c 127.0.0.1:34601,127.0.0.1:34602 -a temp -t periodic -g 3:00,21:00 \
           --target_level 2 --bottommost_level_compaction force
```

该工具不仅会调用shell命令设置Table环境变量，对于once类型还会等待所有的replica上的操作都执行完成，使用起来十分方便。

譬如，在[bulk load](usage-scenario#支持场景)完成后执行once manual compact如下：
```
$ ./scripts/pegasus_manual_compact.sh -c 127.0.0.1:34601,127.0.0.1:34602 -a temp
```
