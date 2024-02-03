---
permalink: administration/experiences
---

一个分布式系统的Meta Server管理工作包含周期巡检，监控报警，故障排查，接入审核等，通过这些手段来帮助服务稳定运行。

# 周期巡检

* 可用性：正常时可用性会保持在 100%，发生节点故障等异常偶尔会有可用性低于 100% 的情况
* IOPS：流量的突增可能导致服务稳定性受到影响，而流量的突降可能是服务已故障所致
* 读写延迟：读写操作的 P99 延迟可能有异常毛刺的情况，对 Pegasus 用户产生影响
* 系统资源使用：CPU、内存、磁盘的使用量，网络带宽及连接数是否出现暴涨、是否达到高水位线

# 监控报警

参考 [可视化监控](/administration/monitoring).

# 问题排查

使用 [Shell 工具](/overview/shell) 查看 Pegasus 系统状态：
* 集群基础信息是否正常：`cluster_info`
  * `meta_servers` 列表是否正常
  * `meta_function_level` 是否是 `steady` 状态
* 各 Table、各 Partition 是否健康：`ls -d`
  * Table 数量是否正常
  * 所有 Table 的 `unhealthy` 分片数量是否都为 0
* 各节点是否健康：`nodes -d`
  * 所有节点都在列表中，且状态都是 `ALIVE`
  * 数据分布是否倾斜严重（即 `replica_count` 列或 `primary_count` 列数量不平均）。如果倾斜严重，可以选择集群流量比较小的时间段，使用 shell 工具命令 `set_meta_level` 设置为 `lively`，使其进行负载均衡调整。记得在调整完成后设置回 `steady` 状态
  > 注意：对于延迟敏感的用户，负载均衡只能在必要的时候才进行，不要影响服务稳定性，在该过程中要密切观察集群状态
* 各节点的基本信息是否正常：`server_info`
  * 每个 server 的版本是否正确
  * 通过 start time 判断是否发生过重启
* 各节点的 metrics 信息是否正常：`server_stat`
  * IOPS、读写延迟
  * 内存使用量
* 各表的 metrics 信息是否正常：`app_stat`
  * IOPS
  * 存储用量

查看系统信息：
例如，检查服务器的 socket 连接数（其中 `34601` 为 MetaServer 的服务监听端口）：
  * 在 Meta Server 所在服务器上使用 `netstat` 命令检查连接数：
  ```bash
  netstat -na | grep '34601\>' | grep ESTABLISHED | wc -l
  ```
  * 检查与该服务器建立连接的远程节点，按照连接数排序：
  ```bash
  netstat -na | grep '34601\>' | grep ESTABLISHE | awk '{print $5}' | sed 's/:.*//' | sort | uniq -c | sort -k1 -n -r | head
  ```
  * 如果连接数太多（例如单节点连接数超过 100），就需要进一步分析原因。

## 常见故障处理方法

* 如果服务进程异常退出，需要登录到对应服务器上，检查原因：
  * 查看 `dmesg` 或 `/var/log/messages` 确认进程退出原因
  * 如果是 `Out of memory: Killed process xxx`：查看 Meta Server 或 Replica Server 的内存使用监控，分析是否有异常现象
  * 如果是 `segfault at xxx`：
    * 查看 Meta Server 或 Replica Server 的标准错误输出日志和服务日志
    * 检查是否有 coredump 文件生成，有则使用 `gdb` 分析；如果没有 coredump 文件，则按需设置系统和用户的 `ulimit`
* 如果出故障服务器较多，可以考虑将设置 `set_meta_level` 置为 `freezed` 状态，避免服务雪崩
* 如果进程不断重启（异常退出，又被其他进程监控服务拉起），可以考虑临时停止进程监控服务自动地拉起 Pegasus 进程
* 如果无法远程登录（如 `ssh`）到该服务器，有可能是物理机发生宕机，请联系服务提供方处理

# Pegasus 服务接入审核

Pegasus 和多数数据库一样，以 _表_ 为单位管理资源。作为 Pegasus 的管理员，在每个表接入时，需要了解表需要的资源量，以便分配合适的计算和存储资源。结合 Pegasus 的存储原理，优化 key-value 的 schema 设计，也有助于保证服务的稳定性。

可以收集分析以下信息：

* 表名
* 读峰值（QPS）
* 读总量（条/天）
* 写峰值（QPS）
* 写总量（条/天）
* key-value 设计模式（以此判断是否存在数据倾斜问题）
* 访问模式（判断是否存在热点读写问题）
* 单条数据平均大小（KB/条）
* 数据总量预估（GB）
* 增长预估（例如 6 个月 / 1 年 / 3 年的增长量）
* 读延迟需求（P99 延迟）
* 写延迟需求（P99 延迟）
* IOPS 特征（例如全天均衡、平滑的波峰与低谷、定时的批量写入等）
