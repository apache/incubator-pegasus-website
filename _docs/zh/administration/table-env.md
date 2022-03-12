---
permalink: administration/table-env
---

# 功能目标

为了对Table的一些行为进行控制，Pegasus提供了Table环境变量，又称之为`app envs`。

Table环境变量以kv-map的形式存储在Table的元数据`app_info`中，并持久化到Zookeeper上。通过shell的`ls`命令查看表信息，最后一列`envs_count`记录Table环境变量的kv对个数：
```
>>> ls
app_id    status              app_name            app_type            partition_count     replica_count       is_stateful         drop_expire_time    envs_count          
1         AVAILABLE           temp                pegasus             8                   3                   true                -                   1     
```

如果要查看具体的Table环境变量，则需要使用[get_app_envs](#get_app_envs)命令。

Table环境变量具有如下特性：
* 作为Table的元数据持久化到Zookeeper上。
* 可以通过命令动态修改，修改成功后会立即更新到Zookeeper上。
* 通过meta server和replica server的定期同步消息`config_sync`同步给各个replica生效。由于是定期同步，所以环境变量更新后不会立即生效，而是有一个同步过程，这个过程的时间依赖于配置文件`config_sync_interval_ms`的值，默认是30秒。
* 环境变量的key通过都是采用`.`分隔的字段的形式，方便组织。

目前通过Table环境变量支持的功能包括：
* [Manual-Compact功能](/_docs/zh/administration/manual-compact.md)
* [Usage-Scenario功能](/_docs/zh/administration/usage-scenario.md)

# 操作命令
Pegasus的[Shell工具](/_docs/zh/tools/shell.md#set_app_envs)中提供了操作Table环境变量的命令。这些命令执行前都需要先执行`use xxx`选择表。

## get_app_envs
获取环境变量列表，用法：`get_app_envs`

示例：
```
>>> use temp
OK
>>> get_app_envs
get app envs succeed, count = 1
=================================
rocksdb.usage_scenario = normal
=================================
```
## set_app_envs
设置环境变量，用法：`set_app_envs <key> <value> [key value...]`

示例：
```
>>> use temp
OK
>>> set_app_envs rocksdb.usage_scenario bulk_load
set app envs succeed
>>> get_app_envs
get app envs succeed, count = 1
=================================
rocksdb.usage_scenario = bulk_load
=================================
```

## del_app_envs
删除环境变量，用法：`del_app_envs <key> [key...]`

示例：
```
>>> use temp
OK
>>> del_app_envs rocksdb.usage_scenario
del app envs succeed
=============================
deleted keys:
    rocksdb.usage_scenario
=============================
>>> get_app_envs
get app envs succeed, count = 0
```

## clear_app_envs
清理环境变量，或者叫批量删除环境变量，用法：`clear_app_envs <-a|--all> <-p|--prefix str>`

两种方式：
* 全部清理：使用`-a`选项。
* 通过前缀清理：使用`-p`选项指定前缀，匹配时会先自动在前缀后面加上`.`，然后按照字符串前缀匹配。

譬如：
```
>>> use temp
OK
>>> set_app_envs k.x v1 k.y v2
set app envs succeed
>>> get_app_envs
get app envs succeed, count = 2
=================================
k.x = v1
k.y = v2
=================================
>>> clear_app_envs -p k
clear app envs succeed
=============================
deleted keys:
    k.x
    k.y
=============================
>>> get_app_envs
get app envs succeed, count = 0
```

# 支持列表

key名称 | value类型 | value约束 | value示例 | 功能说明 | 支持版本
-- | -- | -- | -- | -- | --
rocksdb.usage_scenario | string | normal \| prefer_write \| bulk_load | bulk_load | [Usage-Scenario](usage-scenario) | 1.8.1
replica.deny_client_write | bool | true \| false | true | 拒绝写请求 | 1.11.2
replica.write_throttling | string | 特定格式 | 1000\*delay\*100 | [流量控制#表级流控](throttling#表级流控) | 1.11.2
replica.write_throttling_by_size | string | 特定格式 | 1000\*delay\*100 | [流量控制#表级流控](throttling#表级流控) | 1.12.0
default_ttl | int | >=0 | 86400 | [表级TTL](/_docs/zh/api/ttl.md#表级TTL) | 1.11.2
manual_compact.disabled | bool | true \| false | true | [Manual-Compact](manual-compact) | 1.9.0
manual_compact.max_concurrent_running_count | int | >=0 | 10 | [Manual-Compact](manual-compact) | 1.11.3
manual_compact.once.trigger_time | int | Unix Timestamp in Seconds | 1547091115 | [Manual-Compact](manual-compact) | 1.8.1
manual_compact.once.target_level | int | -1 \| >=1 | 2 | [Manual-Compact](manual-compact) | 1.8.1
manual_compact.once.bottommost_level_compaction | string | force \| skip | force | [Manual-Compact](manual-compact) | 1.8.1
manual_compact.periodic.trigger_time | string | 特定格式 | 3:00,5:00 | [Manual-Compact](manual-compact) | 1.8.1
manual_compact.periodic.target_level | int | -1 \| >=1 | 2 | [Manual-Compact](manual-compact) | 1.8.1
manual_compact.periodic.bottommost_level_compaction | string | force \| skip | force | [Manual-Compact](manual-compact) | 1.8.1
rocksdb.checkpoint.reserve_min_count | int | >=1 | 2 | [Rocksdb-Checkpoint管理](resource-management#Rocksdb-Checkpoint管理) | 1.11.3
rocksdb.checkpoint.reserve_time_seconds | int | >=0 | 600 | [Rocksdb-Checkpoint管理](resource-management#Rocksdb-Checkpoint管理) | 1.11.3
business.info | string | 特定格式(使用utf-8编码) | depart=云平台部-存储平台,user=qinzuoyan&wutao1 | 记录表的业务归属信息，可用于生成账单 | -
replica.slow_query_threshold | int | >=20 | 30 | 慢查询阈值 | 1.12.0
