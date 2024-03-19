---
permalink: api/http
---

# Introduction

Pegasus provides HTTP interfaces for MetaServer and ReplicaServer to view cluster information, modify configurations, and more.

> Due to the fact that the metadata of the cluster is maintained by the primary MetaServer, when accessing the metadata query interfaces of the backup MetaServer, it will automatically redirect to the corresponding interfaces of the primary MetaServer.
For example, assuming that `127.0.0.1:34601` and `127.0.0.1:34602` are the primary and backup MetaServer, respectively, when accessing `127.0.0.1:34602/meta/cluster`,
it will automatically redirect (via HTTP code 307) to `127.0.0.1:34601/meta/cluster`.

# Interfaces

All interface results are returned in JSON format. When using a browser to view the results, it is recommended to use the [Chrome JSON-Viewer plugin](https://chromewebstore.google.com/detail/json-viewer/gbmdgpbipfallnflgajpaliibnhdgobh) to improve the reading experience.

## MetaServer

All supported interfaces of MetaServer can be obtained through the root path, such as `curl 127.0.0.1:34601/`, and the result is as follows:

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

All supported interfaces of ReplicaServer can be obtained through the root path, such as `curl 127.0.0.1:34801/`, and the result is as follows:

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
