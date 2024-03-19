---
permalink: api/http
---

# 介绍

Pegasus 为 MetaServer，ReplicaServer 提供了 HTTP 接口，用于查看集群信息，修改配置等。

> 由于集群元数据由主 MetaServer 维护，当访问备 MetaServer 的元数据查询接口时，会自动重定向至主 MetaServer 对应的接口。
举个例子，假设 `127.0.0.1:34601` 和 `127.0.0.1:34602` 分别是主备 MetaServer，当访问 `127.0.0.1:34602/meta/cluster`时，
会自动跳转（通过 HTTP code 307）到 `127.0.0.1:34601/meta/cluster`。

# 接口

所有接口的结果都以 JSON 格式返回。使用浏览器查看结果时，建议使用 [Chrome 插件 JSON Viewer](https://chromewebstore.google.com/detail/json-viewer/gbmdgpbipfallnflgajpaliibnhdgobh) 提升阅读体验。

## MetaServer

通过根 path 可以获取到 MetaServer 支持的所有接口，例如：`curl 127.0.0.1:34601/`，结果如下所示：

```
{
    "/": "List all supported calls.",
    "/config": "name=<config_name>. Gets the details of a specified config. Only the configs which are registered by DSN_DEFINE_xxx macro can be queried.",
    "/configs": "List all configs. Only the configs which are registered by DSN_DEFINE_xxx macro can be queried.",
    "/meta/app": "name=<app_name>[&detail]. Query app info.",
    "/meta/app/duplication": "name=<app_name>. Query app duplication info.",
    "/meta/app/query_bulk_load": "name=<app_name>. Query app bulk load info.",
    "/meta/app/start_bulk_load": "A JSON format of start_bulk_load_request structure. Start bulk load on an app.",
    "/meta/app/start_compaction": "A JSON format of manual_compaction_info structure. Start compaction for an app.",
    "/meta/app/usage_scenario": "A JSON format of usage_scenario_info structure. Update usage scenario of an app.",
    "/meta/app_envs": "name=<app_name>. Query app environments.",
    "/meta/apps": "[detail]. List all apps in the cluster.",
    "/meta/backup_policy": "name=<app_name1>&name=<app_name2>. Query backup policy by policy names.",
    "/meta/cluster": "Query the cluster info.",
    "/meta/nodes": "[detail]. Query the replica servers info.",
    "/metrics": "[with_metric_fields=field1,field2,...][&types=type1,type2,...][&ids=id1,id2,...][&attributes=attr1,value1,attr2,value2,...][&metrics=metric1,metric2,...][&detail=true|false]Query the node metrics.",
    "/pprof/cmdline": "Query the process' cmdline.",
    "/pprof/growth": "Query the stack traces that caused growth in the address space size.",
    "/pprof/heap": "[seconds=<heap_profile_seconds>]. Query a sample of live objects and the stack traces that allocated these objects (an environment variable TCMALLOC_SAMPLE_PARAMETER should set to a positive value, such as 524288), or the current heap profiling information if 'seconds' parameter is specified.",
    "/pprof/profile": "[seconds=<cpu_profile_seconds>]. Query the CPU profile. 'seconds' is 60 if not specified.",
    "/pprof/symbol": "[symbol_address]. Query the process' symbols. Return the symbol count of the process if using GET, return the symbol of the 'symbol_address' if using POST.",
    "/recentStartTime": "Get the server start time.",
    "/updateConfig": "<key>=<new_value>. Update the config to the new value.",
    "/version": "Get the server version."
}
```

## ReplicaServer

通过根 path 可以获取到 ReplicaServer 支持的所有接口，例如：`curl 127.0.0.1:34801/`，结果如下所示：

```
{
    "/": "List all supported calls.",
    "/config": "name=<config_name>. Gets the details of a specified config. Only the configs which are registered by DSN_DEFINE_xxx macro can be queried.",
    "/configs": "List all configs. Only the configs which are registered by DSN_DEFINE_xxx macro can be queried.",
    "/metrics": "[with_metric_fields=field1,field2,...][&types=type1,type2,...][&ids=id1,id2,...][&attributes=attr1,value1,attr2,value2,...][&metrics=metric1,metric2,...][&detail=true|false]Query the node metrics.",
    "/pprof/cmdline": "Query the process' cmdline.",
    "/pprof/growth": "Query the stack traces that caused growth in the address space size.",
    "/pprof/heap": "[seconds=<heap_profile_seconds>]. Query a sample of live objects and the stack traces that allocated these objects (an environment variable TCMALLOC_SAMPLE_PARAMETER should set to a positive value, such as 524288), or the current heap profiling information if 'seconds' parameter is specified.",
    "/pprof/profile": "[seconds=<cpu_profile_seconds>]. Query the CPU profile. 'seconds' is 60 if not specified.",
    "/pprof/symbol": "[symbol_address]. Query the process' symbols. Return the symbol count of the process if using GET, return the symbol of the 'symbol_address' if using POST.",
    "/recentStartTime": "Get the server start time.",
    "/replica/data_version": "app_id=<app_id>. Query the data version of an app.",
    "/replica/duplication": "appid=<appid>. Query the duplication status of an app.",
    "/replica/manual_compaction": "app_id=<app_id>. Query the manual compaction status of an app.",
    "/updateConfig": "<key>=<new_value>. Update the config to the new value.",
    "/version": "Get the server version."
}
```
