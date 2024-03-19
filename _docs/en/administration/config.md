---
permalink: administration/config
---

# Get Configurations

## Remote command

You can obtain **all** the configurations of Pegasus server through the `config-dump` command of [Remote commands](remote-commands), the output is in _ini_ file format, including section, key, current configuration values, and a brief description.

For example, the following output fragment:
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

You can obtain **partial** configurations of Pegasus server through the `/config` or `/configs` path of [HTTP API](/api/http), the output is in _JSON_ format, including section, key, current configuration value, value type, tags (such as whether it can be dynamically modified), and a brief description.

> Only configurations registered through method `DSN_DEFINE_xxx` can be obtained through the HTTP API.

For example, the following output fragment:
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

# Modify Configuration

## Configuration file

By modifying the ini configuration file, the server needs to be restarted to take effect.

## HTTP API

**Partial** configuration of Pegasus server can be dynamically modified through the `/updateConfig` path of [HTTP API](/api/http). Only configuration items with tag `flag_tag::FT_MUTABLE` can be dynamically modified.

> The configuration modified through the HTTP API will not be persisted to the ini file, which means that the configuration item will be reset to the default value (or the value in the configuration file if specified).

For example:
```
$ curl 127.0.0.1:34601/updateConfig?abnormal_write_trace_latency_threshold=2000000000
{"update_status":"ERR_OK"}
```

# Configuration Components

The configuration of Pegasus is in _ini_ format, which mainly includes the following sections:

## [apps..default]

The default templates for various `app` related configurations. If a specific configuration type is not explicitly specified in the `apps.XXX` section, use the configuration in this section.

## [apps.meta]

The relevant configuration of the `meta` app.

## [meta_server]

The relevant configuration of the Pegasus Meta Server.

## [apps.replica]

The relevant configuration of the `replica` app, i.e. the relevant configuration of the Pegasus Replica Server.

## [apps.collector]

The relevant configuration of the Pegasus Collector (removed since Pegasus 2.6).

## [core]

Pegasus server kernel engine related configurations.

## [network]

Network related configurations.

## [threadpool..default]

The default template for various thread-pool related configurations. If a specific configuration type is not explicitly specified in the `THREAD_POOL_XXX` section, use the configuration in this section.

## [threadpool.THREAD_POOL_XXX]

The relevant configuration of the `THREAD_POOL_XXX` thread-pool.

## [meta_server.apps.<app_unique_string>]

Tables will be created in the cluster when starting. Depending on `<app_unique_string>`, multiple tables can be created.

## [replication.app]

Ditto, but only 1 table can be specified.

## [replication]

Consistency protocol related configurations, many concepts are related to _PacificA_.

## [pegasus.server]

The relevant configuration of the Pegasus Replica Server.

## [task..default]

The default template for various `task` related configurations. If a specific configuration type is not explicitly specified in the `task.XXX` section, use the configuration in this section.

`task` is a concept in rDSN, which can be understood as _asynchronous task_. For example, an RPC asynchronous call, an asynchronous file IO operation, a timeout event, etc., are all tasks.
Each task has a unique name defined. For each task, its related behavior can be configured, such as `trace`, `profiler`, etc.

## [task.RPC_XXX]

The relevant configuration of the `RPC_XXX` task.

## [zookeeper]

The relevant configuration of Zookeeper。

## [tools.simple_logger]

The _simple-logger_ implementation class, it print logs to files.

# Configuration suggestions

* It is recommended to use IP addresses for the configuration items that require the use of server addresses.
* For most configuration items, it is recommended to use default values.
* Under the premise of understanding the role and impact of configuration items, you can change the configuration values as needed.
* For further understanding of configuration items, you can refer to the source code.
