---
permalink: administration/remote-commands
---

# 功能目标

通过 Pegasus shell 工具的 `remote_command` 命令向 Pegasus 集群发送远程命令，命令包含一个命令名和 0 个或多个参数，可以实现如信息收集、配置修改等功能。

通过远程命令执行操作有这些好处：
* 直接：命令会直接发给目标进程，而无需路由或转发。
* 快速生效：命令一般都是立即执行并生效，无需等待时间。
* 开发简单：无需引入新的 RPC，只需注册新的命令名、参数解析方式及回调函数即可。

# 支持命令

Pegasus 的不同角色支持不同的远程命令。

## rDSN 内建命令

| 命令 | 功能 
| ----- | ---- | 
| engine | 获取 rdsn 框架引擎的信息，主要是包含哪些线程池、每个线程池有多少个线程
| system.queue | 获取各线程池执行队列的排队长度
| server-info | 获取进程的基本信息，包括版本号、启动时间，对应 shell 的 `server_info` 子命令
| server-stat | 获取进程的简要统计信息，包括 get/put 等操作的 QPS 和延迟、机器的内存和存储使用情况，对应 shell 的 `server_stat` 子命令
| task-code | 获取该进程注册的 task code 列表
| flush_log | 将最近缓冲区中的日志数据刷出到日志文件中，对应 shell 的 `flush_log` 子命令
| reset-log-start-level | 动态修改日志的级别
| perf-counters | 获取最近一个统计周期内的 perf counter 数据
| config-dump | 获取该进程启动时的配置文件的信息

## meta-server

| 命令 | 功能 
| ----- | ---- | 
| meta.lb.assign_delay_ms | 动态修改配置 `replica_assign_delay_ms_for_dropouts`
| meta.lb.assign_secondary_black_list | 动态修改 `add_secondary` 操作的黑名单，名单中的节点在负载均衡中不再分派 replica
| meta.lb.balancer_in_turn | 动态修改配置 `balancer_in_turn`，控制负载均衡 app 时是 one-by-one 执行还是并行执行
| meta.lb.only_primary_balancer | 动态修改配置 `only_primary_balancer`，控制负载均衡时是否只要求各机器的 primary replica 个数达到平衡
| meta.lb.only_move_primary | 动态修改配置 `only_move_primary`，控制负载均衡时是否只做 primary replica 迁移，不做 replica 数据拷贝
| meta.lb.add_secondary_enable_flow_control | 动态修改配置 `add_secondary_enable_flow_control`，控制负载均衡时是否对 `add_secondary` 操作进行流控
| meta.lb.add_secondary_max_count_for_one_node | 动态修改配置 `add_secondary_max_count_for_one_node`，控制负载均衡时如果进行流控，单个机器最多并发执行 `add_secondary` 操作的个数

## replica-server

| 命令 | 功能 
| ----- | ---- | 
| replica.kill_partition | 将指定的 replica 关闭，停止提供服务
| replica.deny-client | 动态修改配置 `deny_client_on_start`，控制是否拒绝客户端的读写请求
| replica.verbose-client-log | 动态修改配置 `verbose_client_log_on_start`，控制回复客户端的请求时是否打印 ERROR 日志
| replica.verbose-commit-log | 动态修改配置 `verbose_commit_log_on_start`，控制在提交写请求时是否打印 DEBUG 日志
| replica.trigger-checkpoint | 对指定的 replica 手动触发 `async_checkpoint` 操作
| replica.query-compact | 对指定的 replica 查询其执行 [Manual-Compact](manual-compact) 操作的状态
| replica.query-app-envs | 对指定的 replica 查询其当前的 [Table 环境变量](table-env)
| useless-dir-reserve-seconds | 动态修改无用文件夹的保留时间，方便快速释放存储空间，从 1.11.3 版本开始支持，参见 [垃圾文件夹管理](#resource-management# 垃圾文件夹管理)

# 如何使用

通过 shell 工具的 `remote_command` 命令，可以向指定的一个或者多个进程发送远程命令。用法：
```
USAGE: 	remote_command          [-t all|meta-server|replica-server] [-r|--resolve_ip]
	                            [-l ip:port,ip:port...] <command> [arguments...]
```
其中需要通过 `-t` 或者 `-l` 来指定目标：
* `-t`：只向指定角色的所有进程发送。
* `-l`：只向指定的地址发送，可以通过列表指定多个地址。
* 如果不指定，则会向集群中的所有节点发送指令。

可以通过 `help` 查看目标进程支持的远程命令，例如：
```
>>> remote_command -l 127.0.0.1:34801 help
COMMAND: help

CALL [user-specified] [127.0.0.1:34801] succeed: help|Help|h|H [command] - display help information
help|Help|h|H [command] - display help information
repeat|Repeat|r|R interval_seconds max_count command - execute command periodically
...


Succeed count: 1
Failed count: 0
```

如果指定多个目标，就会并发地向这些目标发送命令，等待命令返回，并打印结果。
