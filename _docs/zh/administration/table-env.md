---
permalink: administration/table-env
---

# 功能目标

为了对 Table 的一些行为进行控制，Pegasus 提供了 Table 环境变量，又称之为 `app envs`。

Table 环境变量以 map 的形式存储在 Table 的元数据中（Thrift 结构 `app_info` 中），并持久化到 Zookeeper 上。

通过 shell 工具的 [`ls` 命令](/tools/shell/#ls) 查看表信息，最后一列 `envs_count` 记录了 table 环境变量的个数。例如：
```
>>> ls
[general_info]
app_id  status     app_name  app_type  partition_count  replica_count  is_stateful  create_time          drop_time  drop_expire  envs_count
2       AVAILABLE  temp      pegasus   8                3              true         2024-04-15_06:58:38  -          -            1
```

如果要查看具体的 table 环境变量，则需要使用 [get_app_envs](#get_app_envs) 命令。

Table 环境变量具有如下特性：
* 作为 Table 的元数据持久化到 Zookeeper 上。
* 可以通过命令行动态修改，修改成功后会立即更新到 Zookeeper 上。
* 通过 meta server 和 replica server 的定期同步消息 `config_sync` 同步给各个 replica server 生效。
> 由于是定期同步，所以环境变量更新后可能不会在 replica server 上立即生效，而是有一个延迟。这个延迟时间依赖于配置 `config_sync_interval_ms` 的值，默认是 30 秒。
* 环境变量的 key 通常使用 `.` 分隔，方便分类。

目前通过 Table 环境变量支持的功能如：
* [Manual-Compact 功能](manual-compact)
* [Usage-Scenario 功能](usage-scenario)

# 操作命令
Pegasus 的 [Shell 工具](/tools/shell/) 中提供了操作 table 环境变量的命令。这些命令执行前都需要先执行 `use <table_name>` 选择需要操作的表。

## get_app_envs
获取环境变量列表，用法：`get_app_envs [-j|--json]`

示例：
```
>>> use temp
OK
>>> get_app_envs
[app_envs]
rocksdb.usage_scenario  : normal
```
## set_app_envs
设置环境变量，用法：`set_app_envs <key> <value> [key value...]`

示例：
```
>>> use temp
OK
>>> set_app_envs rocksdb.usage_scenario bulk_load
set app envs succeed
```

## del_app_envs
删除环境变量，用法：`del_app_envs <key> [key...]`

示例：
```
>>> use temp
OK
>>> set_app_envs rocksdb.usage_scenario bulk_load
set app envs succeed
>>> del_app_envs rocksdb.usage_scenario
del app envs succeed
=============================
deleted keys:
    rocksdb.usage_scenario
=============================
```

## clear_app_envs
清理环境变量，或者叫批量删除环境变量，用法：`clear_app_envs <-a|--all> <-p|--prefix str>`

支持两种方式：
* 全部清理：使用 `-a` 选项。
* 通过前缀清理：使用 `-p` 选项指定前缀，匹配时会先自动在前缀后面加上 `.`，然后按照字符串前缀匹配。

譬如：
```
>>> use temp
OK
>>> set_app_envs manual_compact.once.trigger_time 1713700000
set app envs succeed
>>> set_app_envs manual_compact.once.target_level -1
set app envs succeed
>>> set_app_envs manual_compact.once.bottommost_level_compaction force
set app envs succeed
>>> set_app_envs rocksdb.usage_scenario bulk_load
set app envs succeed
>>> clear_app_envs -p manual_compact
clear app envs succeed
=============================
deleted keys:
    manual_compact.once.bottommost_level_compaction
    manual_compact.once.target_level
    manual_compact.once.trigger_time
=============================
>>> get_app_envs
[app_envs]
rocksdb.usage_scenario  : bulk_load
```

# 支持列表

可通过 meta server 的 [HTTP 接口](/api/http) `/envs/list` 获取所有支持的 table 环境变量。
例如，2.6 版本支持的环境变量如下：

```
$ curl 127.0.0.1:34601/envs/list
{
  "business.info": {
    "limitation": "",
    "sample": "",
    "type": "string"
  },
  "default_ttl": {
    "limitation": ">= 0",
    "sample": "86400",
    "type": "unsigned int32"
  },
  "manual_compact.disabled": {
    "limitation": "true | false",
    "sample": "true",
    "type": "bool"
  },
  "manual_compact.max_concurrent_running_count": {
    "limitation": ">= 0",
    "sample": "8",
    "type": "unsigned int32"
  },
  "manual_compact.once.bottommost_level_compaction": {
    "limitation": "force | skip",
    "sample": "skip",
    "type": "string"
  },
  "manual_compact.once.target_level": {
    "limitation": "-1 or >= 1",
    "sample": "6",
    "type": "unsigned int64"
  },
  "manual_compact.once.trigger_time": {
    "limitation": "> 0, timestamp (in seconds) to trigger the once manual compaction",
    "sample": "1700000000",
    "type": "unsigned int64"
  },
  "manual_compact.periodic.bottommost_level_compaction": {
    "limitation": "force | skip",
    "sample": "skip",
    "type": "string"
  },
  "manual_compact.periodic.target_level": {
    "limitation": "-1 or >= 1",
    "sample": "6",
    "type": "unsigned int64"
  },
  "manual_compact.periodic.trigger_time": {
    "limitation": "",
    "sample": "",
    "type": "string"
  },
  "replica.backup_request_throttling": {
    "limitation": "<size[K|M]>*<delay|reject>*<milliseconds>",
    "sample": "10000*delay*100,20000*reject*100",
    "type": "string"
  },
  "replica.deny_client_request": {
    "limitation": "timeout*all | timeout*write | timeout*read | reconfig*all | reconfig*write | reconfig*read",
    "sample": "timeout*all",
    "type": "string"
  },
  "replica.read_throttling": {
    "limitation": "<size[K|M]>*<delay|reject>*<milliseconds>",
    "sample": "10000*delay*100,20000*reject*100",
    "type": "string"
  },
  "replica.read_throttling_by_size": {
    "limitation": "",
    "sample": "20000*delay*100,20000*reject*100",
    "type": "string"
  },
  "replica.rocksdb_block_cache_enabled": {
    "limitation": "true | false",
    "sample": "true",
    "type": "bool"
  },
  "replica.rocksdb_iteration_threshold_time_ms": {
    "limitation": ">= 0",
    "sample": "1000",
    "type": "unsigned int64"
  },
  "replica.slow_query_threshold": {
    "limitation": ">= 20",
    "sample": "1000",
    "type": "unsigned int64"
  },
  "replica.split.validate_partition_hash": {
    "limitation": "true | false",
    "sample": "true",
    "type": "bool"
  },
  "replica.write_throttling": {
    "limitation": "<size[K|M]>*<delay|reject>*<milliseconds>",
    "sample": "10000*delay*100,20000*reject*100",
    "type": "string"
  },
  "replica.write_throttling_by_size": {
    "limitation": "<size[K|M]>*<delay|reject>*<milliseconds>",
    "sample": "10000*delay*100,20000*reject*100",
    "type": "string"
  },
  "replica_access_controller.allowed_users": {
    "limitation": "",
    "sample": "",
    "type": "string"
  },
  "replica_access_controller.ranger_policies": {
    "limitation": "",
    "sample": "",
    "type": "string"
  },
  "rocksdb.allow_ingest_behind": {
    "limitation": "true | false",
    "sample": "true",
    "type": "bool"
  },
  "rocksdb.checkpoint.reserve_min_count": {
    "limitation": "> 0",
    "sample": "2",
    "type": "unsigned int32"
  },
  "rocksdb.checkpoint.reserve_time_seconds": {
    "limitation": ">= 0",
    "sample": "3600",
    "type": "unsigned int32"
  },
  "rocksdb.num_levels": {
    "limitation": "In range [1, 10]",
    "sample": "6",
    "type": "unsigned int64"
  },
  "rocksdb.usage_scenario": {
    "limitation": "bulk_load | normal | prefer_write",
    "sample": "normal",
    "type": "string"
  },
  "rocksdb.write_buffer_size": {
    "limitation": "In range [16777216, 536870912]",
    "sample": "16777216",
    "type": "unsigned int64"
  },
  "user_specified_compaction": {
    "limitation": "",
    "sample": "",
    "type": "string"
  }
}
```