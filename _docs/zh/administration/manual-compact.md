---
permalink: administration/manual-compact
---

注：manual compact 功能从 v1.8.1 版本开始支持。
# 原理

RocksDB 除了根据需要自动触发 compaction 外，还能通过接口手动触发 compaction，这个功能称之为 [Manual Compaction](https://github.com/facebook/rocksdb/wiki/Manual-Compaction)。其提供了 `CompactRange()` 接口，如下：
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

对应地，Pegasus 对该功能在上层进行了封装，提供了表级别的 Manual Compact 功能，其作用是：
* 通过 compaction 去掉垃圾数据，减少数据量，降低文件层数，提升读操作的性能。
* 对最高层做 compaction，可以清理掉 Delete 标记数据。
* 配合 [Usage Scenario 功能](usage-scenario) 中表的 bulk_load 模式，可以在灌数据完成后执行一次 Manual Compact，去除垃圾数据，整理数据和文件夹结构，提升读性能。

实现方式：
* 扩展 RocksDB，在 Manifest 中记录上一次执行 Manual Compact 的时间，并提供 `GetLastManualCompactFinishTime()` 方法来获取该时间。
* 利用 [Table 环境变量](table-env)，来设置两类 Manual Compect 的环境变量：
  * 单次 Manual Compact：
    * `manual_compact.once.trigger_time`：格式为 Unix 时间戳的秒数，可通过 shell 命令 `date +%s` 获取当前时间戳。如果 LastManualCompactFinishTime 旧于该 trigger_time，就触发 Manual Compaction 的执行。
    * `manual_compact.once.target_level`：用于设置 `CompactRangeOptions::target_level`。如果不设置，则使用默认值 `-1`。
    * `manual_compact.once.bottommost_level_compaction`：可设置为 `skip` 或者 `force`。如果是 `skip`，则不对最高层做 compaction；如果是 `force`，则强制对最高层做 compaction。如果不设置，则默认为 `skip`。
  * 周期 Manual Compact：
    * `manual_compact.periodic.trigger_time`：格式为逗号分隔的时钟，譬如 `3:00,21:00`，表示每一天的 3:00 和 21:00 都触发一次 Manual Compaction 的执行。
    * `manual_compact.periodic.target_level`：用于设置 `CompactRangeOptions::target_level`。如果不设置，则使用默认值 `-1`。
    * `manual_compact.periodic.bottommost_level_compaction`：可设置为 `skip` 或者 `force`。如果是 `skip`，则不对最高层做 compaction；如果是 `force`，则强制对最高层做 compaction。如果不设置，则默认为 `skip`。
  * Manual Compact 总开关：
    * `manual_compact.disabled`(从 v1.9.0 版本开始支持)：如果为 true，则关闭 Manual Compact 功能，并且取消正在执行中的 Manual Compact 动作。如果不设置，默认为 false。
    * `manual_compact.max_concurrent_running_count`(从 v1.11.3 版本开始支持)：指定最大并发数。实际上，可执行的最大并发数由该参数和服务端`MANUAL_COMPACT_THRAD_POOL`的线程数共同决定，取两者的较小值。该参数是节点级别的，如果同一时间进行 manual compaction 的表太多，则很有可能达到该最大并发数，后续该节点上的 replica 会忽略本轮 manual compaction 请求，延后执行。在日志中可以看到 `xxx ignored compact because exceed max_concurrent_running_count`

注意：
* Manual Compact 功能是分派到独立的 Compact 线程池中执行的，每个线程同一时刻只能处理一个 replica 的 full compaction，因为并发处理量与 Compact 线程池的线程数量有关，可以通过配置文件的 `worker_count` 进行配置，如果使用 Manual Compact 比较频繁，建议调大线程数量（譬如设置为 cpu core 数量接近）：
  ```
  [threadpool.THREAD_POOL_COMPACT]
  name = compact
  partitioned = false
  max_input_queue_length = 128
  worker_priority = THREAD_xPRIORITY_NORMAL
  worker_count = 16
  ```
* Manual Compact 属于 CPU 和 IO 密集型操作，处理过程中会使 CPU 使用率长期处于高位，容易对集群的读写性能造成影响，所以 ** 建议在流量低峰时段进行操作 **。如果启动后发现读写性能下降影响了业务，可以立即通过设置该表的环境变量 `manual_compact.disabled=true` 来中止。
* Manual Compact 过程中可能需要较多的额外磁盘空间。因为 compaction 前后文件变化较大，而 Pegasus 又会保留最近多个版本的 checkpoint，所以需要的额外磁盘空间量大约等于执行 Manual Compact 的表的数据存储量。所以，在执行 Manual Compact 前需 ** 确认集群有足够的存储空间 **，同时在执行过程中 ** 关注磁盘空间使用情况 **，避免因为磁盘空间耗尽导致集群节点宕机，影响集群可用度。



# 如何设置

## 通过 Pegasus shell 工具设置

既然 Manual Compact 功能是利用 [Table 环境变量](table-env) 触发的，那么可以直接通过 shell 工具的 [set_app_envs 命令](/overview/shell#set_app_envs) 来设置，需要设置的环境变量参照上面的描述。
> 环境变量设置后不会立即生效，大约需要等几十秒后才能在所有 replica 上生效。

由于需要设置的环境变量比较多，且对数据格式有要求，所以强烈建议不要自己直接设置，而是通过我们提供的脚本工具来设置，如下所示。

## 通过脚本设置
我们提供了一个脚本工具 [scripts/pegasus_manual_compact.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_manual_compact.sh) 来方便地设置，用法：
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

该工具不仅会调用 shell 命令设置 Table 环境变量，对于 once 类型还会等待所有的 replica 上的操作都执行完成，使用起来十分方便。

譬如，在 [bulk load](usage-scenario#支持场景) 完成后执行 once manual compact 如下：
```
$ ./scripts/pegasus_manual_compact.sh -c 127.0.0.1:34601,127.0.0.1:34602 -a temp
```
## 通过 admin-cli 设置

在 **2.4.0** 之后的 Pegasus 版本还支持用 admin-cli 来设置 manual compaction 的开始并且可以方便的查看进行的进度。

### 使用命令

```bash
# 开始单次 manual compaction
Pegasus-AdminCli-1.2.0 » manual-compaction start -h
start manual compaction for a specific table

Usage:
  start [flags]

Flags:
  -b, --bottommostLevelCompaction           bottommost level files will be compacted or not, default value is false
  -h, --help                                display help
  -c, --maxConcurrentRunningCount int       max concurrent running count, default value is 0, no limited (default: 0)
  -a, --tableName                 string    table name
  -l, --targetLevel               int       compacted files move level, default value is -1 (default: -1)
  
  
#查看 manual compaction 进度
Pegasus-AdminCli-1.2.0 » manual-compaction query -h
query manual compaction progress for a specific table

Usage:
  query [flags]

Flags:
  -h, --help                display help
  -a, --tableName string    table name

```



## 补充说明

manual compaction 常与 bulk load 功能配合使用，作为批量导入大量数据后统一优化读取的手段。在需要进行 bulk load 操作的表中，我们常将 **Usage Scenario** 参数设置为 bulk_load 模式，以便减小增加大量数据带来的性能损耗。

- manual-compaction 的开销要比引擎层 compaction 低，因为我们可以通过参数主动控制并发度。
- bulk_load 开启后会将 **Usage Scenario** 参数变为 bulk_load，在这种模式下，我们会禁止引擎层的 compaction，因为 bulk_load 模式下会在 level0 层堆积大量的 sst 文件，如果不关闭引擎 compact 会消耗大量 IO 并且对读非常不友好。
- 写延迟比较容易被磁盘 IO 瓶颈影响。compact 本质是归并排序磁盘，需要把数据先读到内存中进行排序，然后再写，涉及 2 两次 IO，是一个对磁盘 IO 负载很重的操作，因此会增加一定写延迟。但我们可以灵活的设置 manual-compaction 的并发度，逐个磁盘进行，将影响控制在可接受范围内。

