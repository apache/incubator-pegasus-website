---
permalink: administration/rebalance
---

本文档主要介绍Pegasus负载均衡的概念、使用和设计。

## 概念篇

在Pegasus中，负载均衡主要包括以下几个方面的内容：

1. 如果某个partition分片不满足一主两备，要选择一个机器将缺失的分片补全。这个过程在Pegasus中叫做`cure`。
2. 当所有的分片都满足一主两备份后，对集群各个replica server上分片的个数做调整，尽量让每个机器上服务的分片数都维持在一个相近的水平上。这个过程在Pegasus中叫做`balance`。
3. 如果一个replica server上挂载了多个磁盘，并且通过配置文件`data_dirs`提供给Pegasus使用。replica server要尽量让每个磁盘上分片的数量都维持在一个相近的水平上。

围绕这几点内容，Pegasus引入了一些概念方便描述这些情况：

1. Partition的健康状况

   Pegasus为Partition定义了几种健康状况：
   * 【fully healthy】: 健康的，完全满足一主两备
   * 【unreadable】: 分片不可读了。指的是分片缺少primary, 但有一个或两个secondary。
   * 【readable but unwritable】: 分片可读但是不可写。指的是只剩下了一个primary，两个secondary副本全部丢失
   * 【readable and writable but unhealthy】: 分片可读可写，但仍旧不健康。指的是三副本里面少了一个secondary
   * 【dead】: partition的所有副本全不可用了，又称之为DDD状态。

![pegasus-healthy-status](/assets/images/pegasus-healthy-status.png){:class="img-responsive"}

   当通过pegasus shell来查看集群、表以及分片的状态时，会经常看到对分片健康情况的整体统计或单个描述。譬如通过`ls -d`命令，可以看到各个表处于不同健康状况的partition的个数，包括这些：
   * fully_healthy：完全健康。
   * unhealthy：不完全健康。
   * write_unhealthy：不可写，包括上面的readable but unwritable和dead。
   * read_unhealthy：不可读，包括上面的unreadable和dead。

2. Meta server的运行level

   meta server的运行level决定了meta server会对整个分布式系统做到何种程度的管理。最常用的运行level包括：
   * blind：在这种运行level之下，meta_server拒绝任何可能会修改元数据状态的操作。一般在做zookeeper迁移的时候会用到这个level。
   * steady：在这种运行level下，meta server只做`cure`，即只处理unhealthy的partition。
   * lively：在这种运行level下，一旦所有partion都进入了healthy, meta server就会尝试进行`balance`，来调整各个机器的分片数。

## 操作篇

### 观察系统情况

可以通过pegasus的shell客户端来观察系统的Partition情况：

1. nodes -d

   可以用来观察系统中每个节点的partition个数: 

   ```
   >>> nodes -d
   address              status              replica_count       primary_count       secondary_count
   10.132.5.1:32801     ALIVE               54                  18                  36
   10.132.5.2:32801     ALIVE               54                  18                  36
   10.132.5.3:32801     ALIVE               54                  18                  36
   10.132.5.5:32801     ALIVE               54                  18                  36
   ```

   如果节点间的partition个数分布差异太大，可以采用"set_meta_level lively"的命令来进行调整。

2. app <table_name> -d
   
   可以用来某张表的所有partition的分布情况：可以观察到某个具体partition的组成，也可以汇总每个节点服务该表的partition个数。

   ```
   >>> app temp -d
   [Parameters]
   app_name: temp
   detailed: true
   
   [Result]
   app_name          : temp
   app_id            : 14
   partition_count   : 8
   max_replica_count : 3
   details           :
   pidx      ballot    replica_count       primary                                 secondaries
   0         22344     3/3                 10.132.5.2:32801                        [10.132.5.3:32801,10.132.5.5:32801]
   1         20525     3/3                 10.132.5.3:32801                        [10.132.5.2:32801,10.132.5.5:32801]
   2         19539     3/3                 10.132.5.1:32801                        [10.132.5.3:32801,10.132.5.5:32801]
   3         18819     3/3                 10.132.5.5:32801                        [10.132.5.3:32801,10.132.5.1:32801]
   4         18275     3/3                 10.132.5.5:32801                        [10.132.5.2:32801,10.132.5.1:32801]
   5         18079     3/3                 10.132.5.3:32801                        [10.132.5.2:32801,10.132.5.1:32801]
   6         17913     3/3                 10.132.5.2:32801                        [10.132.5.1:32801,10.132.5.5:32801]
   7         17692     3/3                 10.132.5.1:32801                        [10.132.5.3:32801,10.132.5.2:32801]
   
   node                                    primary   secondary total
   10.132.5.1:32801                        2         4         6
   10.132.5.2:32801                        2         4         6
   10.132.5.3:32801                        2         4         6
   10.132.5.5:32801                        2         4         6
                                           8         16        24
   
   fully_healthy_partition_count   : 8
   unhealthy_partition_count       : 0
   write_unhealthy_partition_count : 0
   read_unhealthy_partition_count  : 0
   
   list app temp succeed
   ```

3. server_stat
   
   可以用来观察各个replica server当前的一些监控数据。如果想分析流量的均衡程度，要重点观察各个操作的qps和latency。对于数据值明显异常的节点(和其他节点差异太大)，需要排查下partition个数是不是分布不均，或者是不是出现了某个分片的读写热点。

   ```
   >>> server_stat -t replica-server
   COMMAND: server-stat
   
   CALL [replica-server] [10.132.5.1:32801] succeed: manual_compact_enqueue_count=0, manual_compact_running_count=0, closing_replica_count=0, disk_available_max_ratio=88, disk_available_min_ratio=78, disk_available_total_ratio=85, disk_capacity_total(MB)=8378920, opening_replica_count=0, serving_replica_count=54, commit_throughput=0, learning_count=0, shared_log_size(MB)=4, memused_res(MB)=2499, memused_virt(MB)=4724, get_p99(ns)=0, get_qps=0, multi_get_p99(ns)=0, multi_get_qps=0, multi_put_p99(ns)=0, multi_put_qps=0, put_p99(ns)=0, put_qps=0
   CALL [replica-server] [10.132.5.2:32801] succeed: manual_compact_enqueue_count=0, manual_compact_running_count=0, closing_replica_count=0, disk_available_max_ratio=88, disk_available_min_ratio=79, disk_available_total_ratio=86, disk_capacity_total(MB)=8378920, opening_replica_count=0, serving_replica_count=54, commit_throughput=0, learning_count=0, shared_log_size(MB)=4, memused_res(MB)=2521, memused_virt(MB)=4733, get_p99(ns)=0, get_qps=0, multi_get_p99(ns)=0, multi_get_qps=0, multi_put_p99(ns)=0, multi_put_qps=0, put_p99(ns)=0, put_qps=0
   CALL [replica-server] [10.132.5.3:32801] succeed: manual_compact_enqueue_count=0, manual_compact_running_count=0, closing_replica_count=0, disk_available_max_ratio=90, disk_available_min_ratio=78, disk_available_total_ratio=85, disk_capacity_total(MB)=8378920, opening_replica_count=0, serving_replica_count=54, commit_throughput=0, learning_count=0, shared_log_size(MB)=4, memused_res(MB)=2489, memused_virt(MB)=4723, get_p99(ns)=0, get_qps=0, multi_get_p99(ns)=0, multi_get_qps=0, multi_put_p99(ns)=0, multi_put_qps=0, put_p99(ns)=0, put_qps=0
   CALL [replica-server] [10.132.5.5:32801] succeed: manual_compact_enqueue_count=0, manual_compact_running_count=0, closing_replica_count=0, disk_available_max_ratio=88, disk_available_min_ratio=82, disk_available_total_ratio=85, disk_capacity_total(MB)=8378920, opening_replica_count=0, serving_replica_count=54, commit_throughput=0, learning_count=0, shared_log_size(MB)=4, memused_res(MB)=2494, memused_virt(MB)=4678, get_p99(ns)=0, get_qps=0, multi_get_p99(ns)=0, multi_get_qps=0, multi_put_p99(ns)=0, multi_put_qps=0, put_p99(ns)=0, put_qps=0
   
   Succeed count: 4
   Failed count: 0
   ```

4. app_stat -a <app_name>

   可以用来观察某个表中，各个partition的统计信息。对于数据值明显异常的分片，要关注是不是出现了分片热点。

   ```
   >>> app_stat -a temp
   pidx                 GET   MULTI_GET         PUT   MULTI_PUT         DEL   MULTI_DEL        INCR         CAS        SCAN     expired    filtered    abnormal  storage_mb  file_count
   0                      0           0           0           0           0           0           0           0           0           0           0           0           0           3
   1                      0           0           0           0           0           0           0           0           0           0           0           0           0           1
   2                      0           0           0           0           0           0           0           0           0           0           0           0           0           4
   3                      0           0           0           0           0           0           0           0           0           0           0           0           0           2
   4                      0           0           0           0           0           0           0           0           0           0           0           0           0           3
   5                      0           0           0           0           0           0           0           0           0           0           0           0           0           2
   6                      0           0           0           0           0           0           0           0           0           0           0           0           0           1
   7                      0           0           0           0           0           0           0           0           0           0           0           0           0           3
                          0           0           0           0           0           0           0           0           0           0           0           0           0          19
   ```

### 控制集群的负载均衡

Peagsus提供以下几种命令来控制集群的负载均衡：

1. set_meta_level

   这个命令用来控制meta的运行level，支持以下几种level：
   * freezed：meta server会停止unhealthy partition的cure工作，一般在集群出现较多节点宕机或极其不稳定的情况下使用，另外如果集群的节点数掉到一个数量或者比例以下（通过配置文件`min_live_node_count_for_unfreeze`和`node_live_percentage_threshold_for_update`控制）就会自动变为freezed，等待人工介入。
   * steady：meta server的默认level, 只做cure，不做balance。
   * lively：meta server会调整分片数，力求均衡。
   
   可以使用`cluster_info`或者`get_meta_level`查看当前集群的运行level。

   关于调整的一些建议：
   * 先用shell的`nodes -d`命令查看集群是否均衡，当不均衡时再进行调整。通常在以下几种情况发生后，需要开启lively进行调整：
     * 新创建了表，这个时候分片数目可能不均匀。
     * 集群上线、下线、升级了节点，这时候分片数目也可能不均匀。
     * 有节点宕机，一些replica迁移到了别的节点上。
   * 调整过程会触发replica迁移，影响集群可用度，虽然影响不大，但是如果对可用度要求很高，并且调整需求不紧急，建议在**低峰时段**进行调整。
   * 调整完成后通过`set_meta_level steady`将level重置为steady状态，避免在平时进行不必要的replica迁移，减少集群抖动。
   * Pegasus还提供了一些精细控制balance的命令，参见[负载均衡的高级选项](#负载均衡的高级选项)。

2. balance

   balance命令用来手动发送分片迁移的命令。支持的迁移类型：
   * move_pri：把某个partition下的primary和secondary做调换（本质上为两步：1.将from降级;2.将to升级。如果meta server在第1步完成后挂掉，新的meta server不会继续进行第2步，可以视为move_pri命令被中断了）
   * copy_pri：把某个partition下的primary迁移到一个新节点下
   * copy_sec：把某个partition下的secondary迁移到一个新节点下

   **注意在使用时，请保证meta server处在steady状态，不然命令无法生效。**

   参见以下样例（不相关的输出已经被删去）：
   ```
   >>> get_meta_level
   current meta level is fl_steady
   
   >>> app temp -d
   pidx      ballot    replica_count       primary                                 secondaries
   0         3         3/3                 10.231.58.233:34803                     [10.231.58.233:34802,10.231.58.233:34801]
   
   list app temp succeed
   
   >>> balance -g 1.0 -p move_pri -f 10.231.58.233:34803 -t 10.231.58.233:34802
   send balance proposal result: ERR_OK
   
   >>> app temp -d
   pidx      ballot    replica_count       primary                                 secondaries
   0         5         3/3                 10.231.58.233:34802                     [10.231.58.233:34801,10.231.58.233:34803]
   list app temp succeed
   ```

3. propose
   
   propose命令用来发送更低原语的分片调整命令，主要有以下几种：
   * assign_primary：把某个partition的primary分配到某台机器上
   * upgrade_to_primary：把某个partition的secondary升级为primary
   * add_secondary: 为某个partition添加secondary
   * upgrade_to_secondary: 把某个partition下的某个learner升级为secondary
   * downgrade_to_secondary：把某个partition下的primary降级为secondary
   * downgrade_to_inactive：把某个partition下的primary/secondary降级为inactive状态
   * remove：移除掉某个partition下的某个副本

   ```
   >>> app temp -d
   pidx      ballot    replica_count       primary                                 secondaries                             
   0         5         3/3                 10.231.58.233:34802                     [10.231.58.233:34801,10.231.58.233:34803]
   list app temp succeed
   >>> propose -g 1.0 -p downgrade_to_inactive -t 10.231.58.233:34802 -n 10.231.58.233:34801
   send proposal response: ERR_OK
   >>> app temp -d
   pidx      ballot    replica_count       primary                                 secondaries                             
   0         7         3/3                 10.231.58.233:34802                     [10.231.58.233:34803,10.231.58.233:34801]
   list app temp succeed
   ```

   在上面的例子中，propose命令希望把10.231.38.233:34801降级。所以需要把这个命令发给partition的primary(10.231.58.233:34802)，由它来执行具体某个副本降级的事宜。注意这里体现了pegasus系统的设计理念：**meta server负责管理primary , pimary负责管理partition下的其他副本**。
   
   上面的例子也许看不出10.231.38.233:34801被降级的痕迹。这是因为系统cure功能的存在，对于unhealthy的partition会迅速修复。你可以通过观察ballot的变化来确认这个命令已经生效了。

   正常情况下，你应该不会需要使用到propose命令。

### 负载均衡的高级选项

meta server提供了一些更细粒度的参数用来做负载均衡的控制。这些参数是通过**remote_command**命令来调整的：

#### 通过help查看所有的remote_command

```
>>> remote_command -l 127.0.0.1:34601 help
COMMAND: help

CALL [user-specified] [127.0.0.1:34601] succeed: help|Help|h|H [command] - display help information
repeat|Repeat|r|R interval_seconds max_count command - execute command periodically
...
meta.lb.assign_delay_ms [num | DEFAULT]
meta.lb.assign_secondary_black_list [<ip:port,ip:port,ip:port>|clear]
meta.lb.balancer_in_turn <true|false>
meta.lb.only_primary_balancer <true|false>
meta.lb.only_move_primary <true|false>
meta.lb.add_secondary_enable_flow_control <true|false>
meta.lb.add_secondary_max_count_for_one_node [num | DEFAULT]
...

Succeed count: 1
Failed count: 0
```

[remote_command](https://github.com/apache/incubator-pegasus/blob/master/src/utils/command_manager.h)是pegasus的一个特性, 允许一个server注册一些命令，然后命令行可以通过rpc调用这些命令。这里我们使用**help**来访问meta server leader，获取meta server端支持的所有命令。例子中已经略掉了所有不相关的行，只留下以"meta.lb"开头的所有和负载均衡相关的命令。

由于文档和代码的不一致问题，文档里不一定覆盖了当前meta所有的lb控制命令。如果想获取最新的命令列表，请用最新的代码手动执行一下help。

#### assign_delay_ms

assign_delay_ms用来控制**当partition缺少一个secondary时，我们要延时多久才选择一个新的**。之所以这么做，是因为一个副本的掉线可能是临时性的，如果不给予一定的缓冲就选择新的secondary, 可能会导致巨量的数据拷贝。

```
>>> remote_command -t meta-server meta.lb.assign_delay_ms
COMMAND: meta.lb.assign_delay_ms
CALL [meta-server] [127.0.0.1:34601] succeed: 300000
CALL [meta-server] [127.0.0.1:34602] succeed: unknown command 'meta.lb.assign_delay_ms'
CALL [meta-server] [127.0.0.1:34603] succeed: unknown command 'meta.lb.assign_delay_ms'
Succeed count: 3
Failed count: 0
>>> remote_command -t meta-server meta.lb.assign_delay_ms 10
COMMAND: meta.lb.assign_delay_ms 10
CALL [meta-server] [127.0.0.1:34601] succeed: OK
CALL [meta-server] [127.0.0.1:34602] succeed: unknown command 'meta.lb.assign_delay_ms'
CALL [meta-server] [127.0.0.1:34603] succeed: unknown command 'meta.lb.assign_delay_ms'
Succeed count: 3
Failed count: 0
>>> remote_command -t meta-server meta.lb.assign_delay_ms
COMMAND: meta.lb.assign_delay_ms
CALL [meta-server] [127.0.0.1:34601] succeed: 10
CALL [meta-server] [127.0.0.1:34602] succeed: unknown command 'meta.lb.assign_delay_ms'
CALL [meta-server] [127.0.0.1:34603] succeed: unknown command 'meta.lb.assign_delay_ms'
Succeed count: 3
Failed count: 0
```

如例所示，命令不加参数表示返回当前设定的值。加参数表示期望的新值。

#### assign_secondary_black_list

该命令用来设定**添加secondary的黑名单**。这个命令在批量下线集群节点的时候非常有用, 例如: 

#### add secondary时候的流控

在某些时候, 负载均衡的决策算法可能会要求一个机器上要新增不少secondary副本, 如
* 一个或多个节点的宕机,会导致正常的节点瞬时接受很多的芬片
* 新节点的加入,可能会有大量的涌入。

但在执行这些增加分片的决策动作时,我们应该避免同一时刻有大量的secondary分片同时添加, 因为
* 添加secondary副本基本会涉及数据拷贝, 如果量太大可能会对正常读写造成影响
* 带宽总量是有限的, 如果由分给多个添加分片的任务去分享这些带宽, 那么每个任务执行的时常都会拉长, 从而让系统长期处在一个**大量分片都不健康的状态下**, 增加了稳定性的风险。

所以, pegasus用两个命令来对流控做支持：
1. meta.lb.add_secondary_enable_flow_control: 表示是否开启流控的feature。
2. meta.lb.add_secondary_max_count_for_one_node: 表示对于每个节点，同时执行多少个add_secondary的动作。

#### 精细控制balancer

balancer表示把各节点个数调匀的过程。在目前的pegasus实现中，balancer过程大概可以用四点来概括：
1. 尽量通过角色互换来做到primary均衡
2. 如果1做不到让primary变均匀，通过拷数据来做到primary均衡
3. 在2做完后，通过拷数据做到secondary的均衡
4. 分别针对每个表做1-2-3的动作

Pegasus提供了一些控制参数给些过程可以提供更精细的控制：
* meta.lb.only_primary_balancer: 对于每个表，只进行1和2(减少copy secondary带来的数据拷贝)
* meta.lb.only_move_primary: 对于每个表，primary调节的时候只考虑方法1(减少copy primary带来的数据拷贝)
* meta.lb.balancer_in_turn：各个表的balancer用串行的方式做，而不是并行进行(用于调试，观察系统行为)

### 一些命令的使用案例

通过把上面的这些负载均衡原语结合起来，pegasus提供了一些一些脚本来执行滚动升级、节点下线等一些操作，如：

1. [scripts/migrate_node.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/migrate_node.sh)

   这个脚本用来把某个节点上服务的所有primary都赶走

2. [scripts/pegasus_rolling_update.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_rolling_update.sh)

   用来对集群中的节点做在线滚动升级

3. [scripts/pegasus_offline_node_list.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_offline_node_list.sh)

   用来做一批节点的下线

不过有部分脚本的逻辑依赖小米的[minos部署系统](https://github.com/XiaoMi/minos)。这里希望大家可以帮助pegasus, 可以支持更多的部署系统。

## 设计篇

待补充。
