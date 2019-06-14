---
title: 运维经验
layout: page
menubar: administration_menu
---

任何一个分布式系统的运维工作都少不了周期巡检，问题排查，故障报警，人工审核。它们是保证服务稳定运行的关键。
这里整理Pegasus的监控指标，你可以根据需要接入到你的运维工具中。

## 周期巡检

* **可用度**：正常时可用度会保持在100%，发生节点故障等异常偶尔会有可用度低于100%的情况

* **总QPS**：异常流量的突增或者突降有时会导致服务抖动

* **读写延迟**：P99读延迟和P99写延迟可能有异常毛刺的情况，对用户会造成影响

* **内存使用**：关注内存使用是否正常，譬如memory是否出现暴涨、是否达到了警戒线

* **存储使用**：关注磁盘存储使用是否正常，预估存储是否够用

## 问题排查

* 集群基础信息是否正常：`cluster_info`
  * meta_servers列表是否正确
  * primary_meta_server是否为第一个（因为推荐使用第一个，第二个节点上可能部署有数据节点）
  * meta_function_level是否是steady状态
* 各Table、各Partition是否健康：`ls -d`
  * Table数量是否正常
  * 所有Table的unhealthy_num（没有达到一主一备的partition数量）和partly_healthy_num（没有达到一主两备的partition数量）是否都为0
* 各节点是否健康：`nodes -d`
  * 所有节点是否都是ALIVE状态
  * 数据分布是否倾斜严重，如果倾斜严重，可以选择集群流量比较小的时间段将meta_function_level设置为lively进行负载均衡调整，并在调整完成后设置回steady状态
  * 注意：负载均衡只有在必要的时候才进行，前提是不要影响服务稳定性，因此不要频繁操作；在调整过程中要全程监控集群状态
* 各节点的基本信息是否正常：`server_info`
  * Server版本是否正确
  * 通过Start Time判断是否发生过重启
* 各节点的实时统计信息是否正常：`server_stat`
  * 读写QPS、读写延迟
  * SharedLog大小
  * 内存使用量
* 各Table的实时统计信息是否正常：`app_stat`
  * 各操作的QPS情况是否正常
  * 各Table的存储用量是否正常
* 检查机器的socket连接数：
  * 到MetaServer所在机器上使用netstat命令检查连接数：

  ```bash
  netstat -na | grep '601\>' | grep ESTABLISHED | wc -l
  ```

  * 检查与该机器建立连接的远程节点，按照连接数排序：

  ```bash
  netstat -na | grep '601\>' | grep ESTABLISHE | awk '{print $5}' | sed 's/:.*//' | sort | uniq -c | sort -k1 -n -r | head
  ```

  * 如果连接数太多（譬如单节点连接数超过100），就需要进一步分析原因。

常见故障处理办法：

* 如果节点挂掉重启，需要登录到对应机器上，检查原因：
  * 通过server的日志
  * 通过core文件；如果没有core文件，需要检查ulimit配置是否正确，或者通过dmesg或者/var/log/messages查看是否因为OutOfMemory原因被系统杀死
* 如果出故障机器较多，可以考虑将meta置为freezed状态，避免雪崩
* 进程不停重启，可以考虑停止进程
* 机器无法从relay连接，有可能是宕机了，快速联系系统运维人员
* 注意系统的参数：CPU情况、diskIO负载和latency、network负载和latency、socket个数
* 通过dmesg查看内核报错

## 需求审核

Pegasus和多数数据库一样，以表的方式管理资源。
每个表需要的资源量需要提前告知，这样我们才能为需求分配合适的计算存储资源。
除此外，与业务深度交流，定制最合适的存储方案也有助于后期服务的稳定运行。

有哪些重要的需求需要提前审核：

* 表名
* 读峰值（QPS）
* 读总量（条/天）
* 写峰值（QPS）
* 写总量（条/天）
* 单条数据平均大小（KB/条）
* 数据总量预估 （GB）
* 增长预估（6个月/1年/3年与目前相比倍数）
* 读延迟需求（毫秒/P99）
* 写延迟需求（毫秒/P99）
* 访问特征（如定时批量写入）
* 是否存在既有数据需导入/数据规模
