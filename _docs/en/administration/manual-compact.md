---
permalink: administration/manual-compact
---

> **Note**: The manual compact feature has been supported since v1.8.1.



# Purpose

Pegasus provides a table-level Manual Compaction feature built on top of RocksDB’s [Manual Compaction](https://github.com/facebook/rocksdb/wiki/Manual-Compaction). Its main purposes are:

1. Remove stale data via compaction, reduce data size, lower file levels, and improve read performance.
2. Perform compaction on bottommost levels to clean up data marked with `Delete`.
3. Combined with the [Usage Scenario feature](https://pegasus.apache.org/administration/usage-scenario) in bulk_load mode, you can run Manual Compaction after a large data import to eliminate garbage data, tidy up data and file structures, and further boost read performance.

---



```markdown
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
  // By default level-based compaction will only compact the bottommost level
  // if there is a compaction filter
  BottommostLevelCompaction bottommost_level_compaction =
      BottommostLevelCompaction::kIfHaveCompactionFilter;
};

// Compact the underlying storage for the key range [*begin,*end].
// The actual compaction interval might be a superset of [*begin, *end].
// In particular, deleted and overwritten versions are discarded,
// and the data is rearranged to reduce the cost of operations
// needed to access the data. This operation should typically only
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

## 

## Implementation Details

- **Prior to version 2.1**, Pegasus extended RocksDB and recorded the time of the last Manual Compaction in the Manifest, providing the method `GetLastManualCompactFinishTime()` to retrieve it. **Starting with version 2.1**, Pegasus stores this timestamp in the meta column family and offers the method `get_last_manual_compact_finish_time()` to fetch it.
- Table-level Manual Compaction in Pegasus is primarily controlled through [Table Environment Variables](https://pegasus.apache.org/administration/table-env). These environment variables define different strategies for Manual Compaction. The main related parameters can be categorized into three groups, as described below:
  1. **Overall Manual Compact switch and concurrency control**
     - `manual_compact.disabled` (supported since v1.9.0): If set to `true`, the Manual Compaction feature is turned off and any ongoing Manual Compaction tasks will be canceled. By default (if unset), it is `false`.
     - `manual_compact.max_concurrent_running_count` (supported since v1.11.3): Specifies the maximum concurrency. In practice, the actual maximum concurrency is the smaller value between this parameter and the number of threads in the server’s `MANUAL_COMPACT_THREAD_POOL`. This parameter is node-level. If multiple tables on the same node attempt to perform manual compaction simultaneously, it can reach this maximum concurrency. Subsequent requests on that node will be ignored (delayed until next time). In the logs, you may see a message like: `xxx ignored compact because exceed max_concurrent_running_count`.
  2. **Single-run Manual Compact strategy parameters**
     - `manual_compact.once.trigger_time`: Uses a Unix timestamp (in seconds). You can obtain the current timestamp via `date +%s`. If the `LastManualCompactFinishTime` is earlier than this `trigger_time`, Manual Compaction will be triggered.
     - `manual_compact.once.target_level`: Sets `CompactRangeOptions::target_level`. If unset, it defaults to `-1`.
     - `manual_compact.once.bottommost_level_compaction`: Can be set to `skip` or `force`. If set to `skip`, the bottommost level will not be compacted; if set to `force`, the bottommost level will definitely be compacted. Defaults to `skip` if not set.
  3. **Periodic Manual Compact strategy parameters**
     - `manual_compact.periodic.trigger_time`: A comma-separated list of clock times (e.g., `3:00,21:00`), meaning manual compaction is triggered each day at 3:00 and 21:00.
     - `manual_compact.periodic.target_level`: Sets `CompactRangeOptions::target_level`. Defaults to `-1` if not set.
     - `manual_compact.periodic.bottommost_level_compaction`: Can be `skip` or `force`. If `skip`, the bottommost level is not compacted; if `force`, the bottommost level is definitely compacted. Defaults to `skip` if not set.

### Important Notes

- Manual Compaction is dispatched to a dedicated compaction thread pool. Each thread can only handle one replica’s full compaction at a time. Because concurrent compaction capacity depends on the number of threads in this pool, you can configure the 

  ```
  worker_count
  ```

   in the config file. If Manual Compaction is frequently used, consider increasing the thread count (e.g., to be close to the number of CPU cores):

  ```ini
  [threadpool.THREAD_POOL_COMPACT]
  name = compact
  partitioned = false
  max_input_queue_length = 128
  worker_priority = THREAD_xPRIORITY_NORMAL
  worker_count = 16
  ```

- Manual Compaction is both CPU and I/O intensive. During the process, CPU usage can remain at a high level for a long time, potentially affecting read/write performance. **We strongly recommend running compaction during off-peak traffic hours**. If performance degradation is observed after starting compaction, you can immediately disable it by setting the environment variable `manual_compact.disabled=true` to terminate the ongoing compaction.

- Manual Compaction may require a significant amount of extra disk space. Because compaction can drastically change the set of files before and after the process, and Pegasus retains multiple checkpoint versions, the extra disk space needed could roughly equal the total data size of the table being compacted. **Ensure sufficient storage space** before initiating Manual Compaction, and monitor disk usage throughout the process to avoid running out of space and causing node crashes, which would affect cluster availability.

------

# How to Configure

## Configure via Pegasus Shell

Because Manual Compaction is triggered by [Table Environment Variables](https://pegasus.apache.org/administration/table-env), you can directly use the [set_app_envs command](https://pegasus.apache.org/docs/tools/shell/#set_app_envs) in the shell to configure the relevant environment variables. Keep in mind it can take **tens of seconds** before the changes propagate to all replicas.

However, due to the number of parameters and their specific formats, we **strongly advise** not to manually set them. Instead, use the script tool introduced below.

## Configure via Script

We provide a script tool [scripts/pegasus_manual_compact.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_manual_compact.sh) to manage these configurations conveniently. Usage is as follows:

```bash
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

This tool not only calls shell commands to set table environment variables but also waits until all replicas complete the compaction if you choose the once type. It’s quite convenient.

For example, after a [bulk load](https://pegasus.apache.org/administration/usage-scenario) is finished, run a one-time manual compaction like this:

```bash
$ ./scripts/pegasus_manual_compact.sh -c 127.0.0.1:34601,127.0.0.1:34602 -a temp
```

## Configure via admin-cli (Recommended)

From **Pegasus 2.4.0** onwards, you can also use **admin-cli** to start manual compaction and easily monitor its progress.

### Example Commands

```bash
# Start a once-type manual compaction on a specific table
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


# Example of starting a one-time manual compaction with the simplest settings
Pegasus-AdminCli-1.2.0 » manual-compaction start -a test 
Table test start manual compaction succeed


# Query manual compaction progress
Pegasus-AdminCli-1.2.0 » manual-compaction query -h
query manual compaction progress for a specific table

Usage:
  query [flags]

Flags:
  -h, --help                display help
  -a, --tableName string    table name
```

------

# Additional Notes

Manual Compaction can work together with the bulk load feature to optimize read/write performance after massive data imports. When performing bulk load on a table, you can set [Usage Scenario](https://pegasus.apache.org/administration/usage-scenario) to `bulk_load` mode to reduce performance impact caused by importing a large amount of data.

- Under the bulk load scenario, manual compaction is generally more flexible than engine-level compaction. You can choose to run compaction in a low-traffic window and actively control concurrency.
- When you enable `bulk_load`, engine-level compaction is disabled because large numbers of SST files can accumulate in level 0. If engine compaction is not disabled, it will consume massive I/O and negatively impact reads.
- Write latency can be easily affected by disk I/O bottlenecks. Compaction is essentially a merge-sort on disk. Data is first read into memory to be sorted, then written back, thus performing two full I/O operations. This is very heavy on disk I/O and can increase write latency. However, you can manually configure the concurrency of manual compaction, e.g., compact one disk at a time, thus keeping the impact under control.

