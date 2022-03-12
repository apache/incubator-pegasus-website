---
permalink: administration/remote-commands
---

# 功能目标

Pegasus基于rDSN框架构建，可以利用到rDSN框架的很多有用的功能，远程命令就是其中一个。

rDSN框架通过RPC对外提供服务，除了开发者注册的用于业务逻辑的RPC服务，还提供了内建的RPC服务`RPC_CLI_CLI_CALL`，接口定义如下：
```idl
struct command
{
    1:string       cmd;
    2:list<string> arguments;
}

service cli
{
    string call(1:command c);
}
```
RPC的请求参数为command结构体，指定远程命令的`cmd`和`arguments`；RPC的返回结果是`string`。

开发者可以注册各种远程命令，对远程命令处理并返回结果。你可以通过shell的`remote_command`接口向Pegasus的进程发送远程命令，以执行某些操作。

通过远程命令执行操作有这些好处：
* 直接。命令直接发给目标进程。
* 快速生效。命令一般都是立即执行。
* 开发简单。注册和开发过程都很容易。

# 支持命令

Pegasus不同角色的进程支持不同的远程命令。但是collector没有监听端口，所以不支持远程命令。

## rdsn内建命令

| 命令                    | 功能                                                                    |
|-----------------------|-----------------------------------------------------------------------| 
| engine                | 获取rdsn框架引擎的信息，主要是包含哪些线程池、每个线程池有多少个线程                                  |
| system.queue          | 获取各线程池执行队列的排队长度                                                       |
| server-info           | 获取进程的基本信息，包括版本号、启动时间，对应shell的`server_info`子命令                         |
| server-stat           | 获取进程的简要统计信息，包括get/put等操作的QPS和延迟、机器的内存和存储使用情况，对应shell的`server_stat`子命令 |
| task-code             | 获取该进程注册的task code列表                                                   |
| flush_log             | 将最近缓冲区中的日志数据刷出到日志文件中，对应shell的`flush_log`子命令                           |
| reset-log-start-level | 动态修改日志的级别                                                             |
| perf-counters         | 获取最近一个统计周期内的perf counter数据                                            |
| config-dump           | 获取该进程启动时的配置文件的信息                                                      |

## meta-server

| 命令                                          | 功能                                                                                        
|----------------------------------------------|-------------------------------------------------------------------------------------------| 
| meta.lb.assign_delay_ms                      | 动态修改配置`replica_assign_delay_ms_for_dropouts`                                              
| meta.lb.assign_secondary_black_list          | 动态修改`add_secondary`操作的黑名单，名单中的节点在负载均衡中不再分派replica                                         
| meta.lb.balancer_in_turn                     | 动态修改配置`balancer_in_turn`，控制负载均衡app时是one-by-one执行还是并行执行                                    
| meta.lb.only_primary_balancer                | 动态修改配置`only_primary_balancer`，控制负载均衡时是否只要求各机器的primary replica个数达到平衡                       
| meta.lb.only_move_primary                    | 动态修改配置`only_move_primary`，控制负载均衡时是否只做primary replica迁移，不做replica数据拷贝                      
| meta.lb.add_secondary_enable_flow_control    | 动态修改配置`add_secondary_enable_flow_control`，控制负载均衡时是否对`add_secondary`操作进行流控                 
| meta.lb.add_secondary_max_count_for_one_node | 动态修改配置`add_secondary_max_count_for_one_node`，控制负载均衡时如果进行流控，单个机器最多并发执行`add_secondary`操作的个数 

## replica-server

| 命令                          | 功能                                                                                                           |
|-----------------------------|--------------------------------------------------------------------------------------------------------------| 
| replica.kill_partition      | 将指定的replica关闭，停止提供服务                                                                                         |
| replica.deny-client         | 动态修改配置`deny_client_on_start`，控制是否拒绝客户端的读写请求                                                                  |
| replica.verbose-client-log  | 动态修改配置`verbose_client_log_on_start`，控制回复客户端的请求时是否打印ERROR日志                                                   |
| replica.verbose-commit-log  | 动态修改配置`verbose_commit_log_on_start`，控制在提交写请求时是否打印DEBUG日志                                                     |
| replica.trigger-checkpoint  | 对指定的replica手动触发`async_checkpoint`操作                                                                          |
| replica.query-compact       | 对指定的replica查询其执行[Manual-Compact](/_docs/zh/administration/manual-compact.md)操作的状态                            |
| replica.query-app-envs      | 对指定的replica查询其当前的[Table环境变量](/_docs/zh/administration/table-env.md)                                          |
| useless-dir-reserve-seconds | 动态修改无用文件夹的保留时间，方便快速释放存储空间，从1.11.3版本开始支持，参见[垃圾文件夹管理](/_docs/zh/administration/resource-management.md#垃圾文件夹管理) |

# 如何使用

通过shell的`remote_command`子命令，可以向指定的一个或者多个进程发送远程命令。用法：
```
USAGE:  remote_command         [-t all|meta-server|replica-server] [-l ip:port,ip:port...] <command>
                               [arguments...]
```
其中需要通过`-t`或者`-l`来指定目标进程：
* `-t`：只向指定角色的所有进程发送。
* `-l`：只向指定的地址发送，可以通过列表指定多个地址。

如果你不知道目标进程支持哪些远程命令，可以发送`help`命令查看，譬如：
```
>>> remote_command -l 127.0.0.1:34801 help
COMMAND: help

CALL [user-specified] [127.0.0.1:34801] succeed: help|Help|h|H [command] - display help information
repeat|Repeat|r|R interval_seconds max_count command - execute command periodically
engine - get engine internal information
system.queue - get queue internal information
server-info - query server information
server-stat - query selected perf counters
task-code - query task code containing any given keywords
flush-log - flush log to stderr or log file
reset-log-start-level - reset the log start level
perf-counters - query perf counters, supporting filter by POSIX basic regular expressions
profile|Profile|p|P - performance profiling
profiler data - get appointed data, using by pjs
profiler.query|pq - query profiling data, output in json format
config-dump - dump configuration
replica.kill_partition [app_id [partition_index]]
replica.deny-client <true|false>
replica.verbose-client-log <true|false>
replica.verbose-commit-log <true|false>
replica.trigger-checkpoint [id1,id2,...] (where id is 'app_id' or 'app_id.partition_id')
replica.query-compact [id1,id2,...] (where id is 'app_id' or 'app_id.partition_id')
replica.query-app-envs [id1,id2,...] (where id is 'app_id' or 'app_id.partition_id')


Succeed count: 1
Failed count: 0
```

如果指定多个进程，就会并发地向所有进程发送命令，等待命令的返回结果，然后打印出来。
