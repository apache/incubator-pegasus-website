---
title: 运维经验
layout: page
menubar: administration_menu
---

以下是我们在小米公司运维Pegasus系统时的一些制度和经验，可以作为参考。

# 值班规范
OnCall人员要求：
* OnCall手机不离手；
* 如有特殊情况无法OnCall，**需提前告知**；
* 对于紧急告警，保证在**5分钟**内上线处理；
* 对于业务微信群的问题报告，**要立即回复**，并及时反馈处理情况；
* 自己无法处理的情况，需要及时通知其他人员一起处理；
* 每天上班后第一件事、下班前最后一件事，是排查一遍各集群是否正常；
* 对于异常情况、故障处理等，**要做好记录**，并整理后邮件发给大家；
* 对于业务需求咨询，OnCall人员负责进行回复，如果有什么信息需要了解，可以问其他人；
* 新入职成员：社招1个月开始支持OnCall，校招3个月开始支持OnCall；

故障处理原则：
* **保证不丢数据、保证可用性**
* 对于允许丢最近一段时间数据的业务，可优先想尽办法保证其可用性

定期在集群管理页面查看各个集群的falcon监控：
* 可用度：关注可用度是否在保持在100%，如果不是保持在100%，需要查明原因，譬如是不是有机器挂掉；同时做好记录发邮件；
* 总QPS：关注总QPS曲线是否正常，是否有异常流量（突增或者突降），如果有，先确定是不是自己集群的问题，如果不是再通过下面的单表QPS找到引发异常的业务，然后找业务方确认原因，最好通过微信群询问；同时做好记录发邮件；
* 延迟：关注P99读延迟和P99写延迟是否正常，是否有异常增大的情况，如果有，需要分析原因，譬如是否与QPS上升相关，是否因为有机器挂掉等；同时做好记录发邮件；
* 内存使用：关注内存使用是否正常，譬如memory是否出现暴涨、是否达到了警戒线，如果暴涨需查明原因，如果达到警戒线需要按照流程重启；同时做好记录发邮件；
* 存储使用：关注SSD存储使用是否正常，预估存储是否够用，如果不够用需要及时告知情况；同时做好记录发邮件；

定期使用Shell工具查看各集群的运行状况：（因为falcon不够实时、且Shell能看到更多信息）
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
  * 通过minos的stdout
  * 通过core文件；如果没有core文件，需要检查ulimit配置是否正确，或者通过dmesg或者/var/log/messages查看是否因为OutOfMemory原因被系统杀死
  * 如果是新问题，需要在线上故障记录页面下面增加记录页，记录包括：core所在的机器和路径、server版本、coredump的堆栈、相关日志、相关源代码（注：准备切到jira进行管理）
  * 最终做到：每一次server挂掉都有迹可循，每一个core都有记录方便追踪调试
* 如果出故障机器较多，可以考虑将meta置为freezed状态，避免雪崩
* 进程不停重启，可以考虑从minos端对其进行stop
* 机器无法从relay连接，有可能是宕机了，快速联系系统运维人员
* 注意系统的参数：CPU情况、diskIO负载和latency、network负载和latency、socket个数
* 通过dmesg查看内核报错

# 建表流程

当业务发起建表需求时，需要按照一定的流程给其建表。

测试表建表流程：
* 确定集群
* 确定partition个数：一般来说，测试表的partition count设为4即可；但是如果有特殊需要，可以设更大值。
* 建表：在集群上建测试表，注意分隔符用“_”。
* 发邮件：在发邮件时需说明这是测试集群，测试时不能进行大流量读写。

业务表建表流程：
* 确认需求：给用户发送建表需求表格，要求用户填写需求，以评估资源使用。包括如下项目：
  * 部门/项目级名称
  * 接口人/联系方式
  * 集群所在机房
  * 表名
  * 读峰值（QPS）
  * 读总量（条/天）
  * 写峰值（QPS）
  * 写总量（条/天）
  * 单条数据平均大小（KB/条）
  * 峰值出现时间段
  * 数据总量预估 （GB）	
  * 增长预估（6个月/1年/3年与目前相比倍数）
  * 读延迟需求（毫秒/P99）
  * 写延迟需求（毫秒/P99）
  * 访问特征（如定时批量写入，没有可填无）
  * 是否存在既有数据需导入/数据规模
  * 其它需求
* 确定机房：向用户确认业务主要是在哪个机房，尽量不要跨机房读写。
* 确定集群：
  * 如果该业务已经有专有集群：专有集群能满足需求，则使用专有集群；专有集群不能满足需求，则组内讨论评估扩容方案。
  * 如果该业务没有专有集群，则组内讨论是共享其他集群，还是新部署专有集群。
* 确定partition个数：根据一年内数据总量预估需要多少个partition。通常来说一个partition存储2GB~5GB左右数据，同时partition个数也不能太多。对于超过1TB的数据量，需在组内进行讨论。
* 建表前确认：在真正建表之前，将以上的分析过程和结果发邮件给大家，让大家知晓，且至少获得一个以上的其他同事确认。
* 建表：在集群上建测试表，注意分隔符用“_”。
* 记录：在集群管理页面（通常会维护一个集群管理页面）记录该表的信息，包括所服务的业务和人员。
* falcon监控：在该集群的falcon监控页面上添加该表的QPS曲线图。
* 发邮件：在发邮件时需提示集群meta-servers配置地址、falcon监控链接、灌数据的流量限制。

# 集群巡检
值班人员每天都需要定期对集群进行巡检，以检查集群的使用情况，排除隐患。

通过shell命令查看集群状况
* cluster_info：查看meta-server是否使用列表中的的第一个，level是否steady状态
* server_info：查看各节点是否与config配置列表一致，是否在最近重启过tat
* ls -d：查看各表是否健康
* nodes -d：查看各节点是否健康，负载是否均衡
* query_backup_policy -p every_day：查看冷备份是否正常

通过falcon监控查看集群状况：
* 集群可用度：是否正常
* 总QPS：是否有异常波动
* 读写延迟：是否有异常毛刺
* 各节点内存用量：是否在合理区间

# 脚本工具

## 统计集群情况

统计集群的【ReplicaServer节点数、Server版本号、月份可用度】：
```bash
#!/bin/bash

while read cluster
do
  rs_count=`echo server_info | ./run.sh shell -n $cluster 2>&1 | grep 'replica-server' | wc -l`
  rs_version=`echo server_info | ./run.sh shell -n $cluster 2>&1 | grep 'replica-server' | \
      grep -o 'Pegasus Server [^ ]*' | head -n 1 | sed 's/SNAPSHOT/SN/' | awk '{print $3}'`
  available=`./scripts/pegasus_stat_available.sh $cluster 2018-07 | awk '{print $4}' | sed 's/data/-/'`
  echo -e "$cluster\t$rs_count\t$rs_version\t$available"
done <clusters
```
其中输入的cluster文件是集群列表，每行一个集群名。