---
permalink: administration/table-env
---

# Introduction

In order to control some of the behaviors of the table, Pegasus provides the table environment variables, also known as `app envs`.

The table environment variables are stored in the metadata of the table in the form of a map (in the Thrift structure `app_info`) and persisted to the Apache Zookeeper.

View the table information through the shell tool's [`ls` command](/docs/tools/shell/#ls), and the last column `envs_count` indicates the number of environment variables of the table. For example:
```
>>> ls
[general_info]
app_id  status     app_name  app_type  partition_count  replica_count  is_stateful  create_time          drop_time  drop_expire  envs_count
2       AVAILABLE  temp      pegasus   8                3              true         2024-04-15_06:58:38  -          -            1
```

If you want to view specific table environment variables, you need to use the [get_app_envs](#get_app_envs) command.

Table environment variables have the following characteristics:
* Persist the metadata of the table onto Apache Zookeeper.
* It can be dynamically modified through the command line, and once the modification is successful, it will be immediately updated to Zookeeper.
* Synchronize the variables though the periodic synchronization message `config_sync` between the Meta Server and the Replica Server to take effect on each Replica Server.
> Due to periodic synchronization, the updated environment variables may not take immediate effect on the Replica Server, but rather have a delay. This delay time depends on the value of the configuration 'config_sync_interval_ms', which defaults to 30 seconds.
* The key of environmental variables is usually separated by `.` for easy classification.

The functions currently supported through table environment variables include:
* [Manual-Compact](manual-compact)
* [Usage-Scenario](usage-scenario)

# Control commands

Pegasus provides [Shell commands](/docs/tools/shell/) for manipulating table environment variables.
> Before executing these commands, `use <table_name>` needs to be executed to select the table that needs to be operated on.

## get_app_envs

Refer to: [`get_app_envs` command](/docs/tools/shell/#get_app_envs)

## set_app_envs

Refer to: [`set_app_envs` command](/docs/tools/shell/#set_app_envs)

## del_app_envs

Refer to: [`del_app_envs` command](/docs/tools/shell/#del_app_envs)

## clear_app_envs

Refer to: [`clear_app_envs` command](/docs/tools/shell/#clear_app_envs)

# Supported environment variables

Starting from Pegasus 2.6, all supported table environment variables can be obtained through Meta Server [HTTP API](/api/http) `/envs/list`.
For example:

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