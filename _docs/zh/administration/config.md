---
permalink: administration/config
---

# 获取配置

## Remote command

可以通过 [Remote commands](remote-commands) 的 `config-dump` 命令获取 Pegasus server 的 **全部** 配置，输出格式为 ini 文件格式，包括 section，key，当前的配置值，以及简要说明。

例如，以下输出片段：
```
>>> remote_command -l 127.0.0.1:34601 config-dump
COMMAND: config-dump

CALL [user-specified] [127.0.0.1:34601] succeed:
[apps..default]
; arguments for the app instances
arguments =

; delay seconds for when the apps should be started
delay_seconds = 0

; Thread pools needed to be started for this app
pools =

; RPC server listening ports needed for this app
ports =

; The app type name, as given when registering by dsn::service_app::register_factory<T>("<type>")
type =

; Whether to run the app instances or not
run = true

; The count of app instances for this type (ports are automatically calculated accordingly to avoid conflict, i.e., ports, ports+1, ports+2, ...)
count = 1
```

## HTTP API

可以通过 [HTTP接口](/api/http) 的 `/config` 或 `/configs` 路径获取 Pegasus server 的 **部分** 配置，输出格式为 JSON 格式，包括 section，key，当前的配置值，值类型，tags（例如是否可以动态修改），以及简要说明。

> 只有通过 `DSN_DEFINE_xxx` 方式注册的配置，才可以通过 HTTP 接口获取。

例如，如下输出片段：
```
$ curl 127.0.0.1:34601/config?name=update_ranger_policy_interval_sec
{
    "name": "update_ranger_policy_interval_sec",
    "section": "security",
    "type": "FV_UINT32",
    "tags": "",
    "description": "The interval seconds of meta server to pull the latest access control policy from Ranger service.",
    "value": "5"
}
$ curl 127.0.0.1:34601/configs
{
    "abnormal_write_trace_latency_threshold": {
        "name": "abnormal_write_trace_latency_threshold",
        "section": "replication",
        "type": "FV_UINT64",
        "tags": "flag_tag::FT_MUTABLE",
        "description": "Latency trace will be logged when exceed the write latency threshold, in nanoseconds",
        "value": "1000000000"
    },
    "add_secondary_enable_flow_control": {
        "name": "add_secondary_enable_flow_control",
        "section": "meta_server",
        "type": "FV_BOOL",
        "tags": "",
        "description": "enable flow control for add secondary proposal",
        "value": "false"
    },
    "add_secondary_max_count_for_one_node": {
        "name": "add_secondary_max_count_for_one_node",
        "section": "meta_server",
        "type": "FV_INT32",
        "tags": "",
        "description": "add secondary max count for one node when flow control enabled",
        "value": "10"
    }
    ...
}
```

# 修改配置

## 配置文件

通过修改 ini 配置文件的方式，需要重启 server 生效。

## HTTP API

可以通过 [HTTP接口](/api/http) 的 `/updateConfig` 路径动态修改 Pegasus server 的 **部分** 配置。只有 tag 包含 `flag_tag::FT_MUTABLE` 的配置项才可以动态修改。

> 通过 HTTP 接口修改的配置不会被持久化到 ini 文件中，这意味着配置项会被重置为默认值（如果 ini 文件中已指定该配置项，则会重置为该配置值）。

例如：
```
$ curl 127.0.0.1:34601/updateConfig?abnormal_write_trace_latency_threshold=2000000000
{"update_status":"ERR_OK"}
```

# 配置组成部分

Pegasus 的配置为 ini 格式，主要有以下 section：

## [apps..default]

各个 app 相关配置的默认模板。如果具体的 `apps.XXX` section 中未显式指定某个配置型，则使用该 section 中的配置。

## [apps.meta]

`meta` app 的相关配置。

## [meta_server]

Pegasus Meta Server 的配置。

## [apps.replica]

`replica` app 的相关配置，也即 Pegasus Replica Server 的配置。

## [apps.collector]

Pegasus Collector 的配置（2.6 版本开始已废弃）。

## [core]

Pegasus server 内核引擎相关参数配置。

## [network]

网络相关配置参数。

## [threadpool..default]

线程池相关配置的默认模板。如果具体的 `THREAD_POOL_XXX` section 中未显式指定某个配置型，则使用该 section 中的配置。

## [threadpool.THREAD_POOL_XXX]

线程池 `THREAD_POOL_XXX` 的配置。

## [meta_server.apps.<app_unique_string>]

启动集群时，预先在集群中创建的表。根据 `<app_unique_string>` 的不同，可以创建多个表。

## [replication.app]

同上，但只能指定 1 个表。

## [replication]

一致性协议相关配置，很多概念和 PacificA 相关。

## [pegasus.server]

Pegasus Replica Server 相关配置。

## [task..default]

各个 task 相关配置的默认模板。如果具体的 `task.XXX` 配置中未显式指定某个配置型，则使用该 section 中的配置。
`task` 是 rDSN 中的一个概念，可以理解成 “异步任务”。比如一个 RPC 异步调用、一个异步文件 IO 操作、一个超时事件等，都是一个 task。
每种 task 都有定义一个唯一的名字。针对每种 task，都可以配置其相关的行为，例如 `trace`、`profiler` 等。

## [task.RPC_XXX]

Task `RPC_XXX` 的配置。

## [zookeeper]

Zookeeper 相关配置。

## [tools.simple_logger]

Simple logger 实现类，该 logger 会打印日志到文件。

# 配置建议

* 配置中所有需要使用服务器地址的地方，都建议使用 IP 地址。
* 大部分配置项，建议使用默认值。
* 在理解配置项的作用和影响的前提下，可以根据需要自行更改配置值。
* 对于配置项的进一步了解，可以查看源代码。
