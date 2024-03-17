---
permalink: administration/config
---

# 配置组成部分

Pegasus 的配置为 ini 格式，主要有以下 section：

## [apps..default]

各个 app 相关配置的默认模板。如果具体的 apps.XXX 配置中未显式指定某个配置型，则使用该 section 中的配置。

## [apps.meta]

meta app 的相关配置

[meta_server]

Pegasus Meta Server 的配置

## [apps.replica]

replica app 的相关配置

Pegasus Replica Server 的配置

## [apps.collector]

Pegasus Collector 的配置（2.6 版本开始已废弃）

## [core]

Pegasus server 内核引擎运行时的相关参数配置

## [network]

网络相关配置参数

## [threadpool..default]

线程池相关配置的默认模板。如果具体的 THREAD_POOL_XXX 配置中未显式指定某个配置型，则使用该 section 中的配置。

## [threadpool.THREAD_POOL_XXX]

线程池 THREAD_POOL_XXX 的配置

## [meta_server.apps.<app_unique_string>]

启动集群时，预先在集群中创建的表。可以创建多个表。
- app_name = stat 
- app_type = pegasus 
- partition_count = 4 
- max_replica_count = 3 
- stateful = true

## [replication.app]

同上，启动集群时，预先在集群中创建的表。但只能创建 1 个表。

## [replication]

一致性协议相关配置，很多概念和 PacificA 相关

## [pegasus.server]

Pegasus server 层相关配置

## [task..default]

各个 task 相关配置的默认模板。如果具体的 task.XXX 配置中未显式指定某个配置型，则使用该 section 中的配置。
Task 是 rDSN 中的一个概念，可以理解成 “异步任务”。比如一个 RPC 异步调用、一个异步文件 IO 操作、一个超时事件等，都是一个 task。
每种 task 都有定义一个唯一的名字。针对每种 task，都可以配置其相关的行为，例如 trace、profiler 等。

## [task.RPC_XXX]

Task RPC_XXX 的配置

## [zookeeper]

Zookeeper 相关配置

## [tools.simple_logger]

Simple logger 实现类，该 logger 会打印日志到文件。

# 配置建议

一些配置建议：

* 配置文件中所有需要使用服务器地址的地方，都建议使用 IP 地址。
* 大部分配置项，建议使用默认值。
* 在理解配置项的作用和影响的前提下，可以根据需要自行更改配置值。
* 对于配置项的进一步了解，可以查看源代码。
