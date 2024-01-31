---
permalink: administration/rolling-update
---

# Design goals

When upgrading the Pegasus server version or persistently modifying the configuration, it is necessary to restart the cluster. For distributed clusters, the commonly used restart method is **Rolling Restart**, which means restarting servers one by one without stopping cluster service.

> The following document assumes that the number of replicas of tables in the Pegasus cluster is 3.

The important goal of cluster restart is to maintain continuous service and minimize the impact on availability. During the restart process, the following factors can affect service availability:
* After the Replica Server process is killed, the replicas served by the process cannot provide services:
  * For primary replicas: Since the primary replicas directly provide reading and writing services to the client, killing a process will definitely affect read and write operations, and it needs to wait for the Meta Server to reassign new primary replicas before it can be recovered. The Meta Server maintenance the survival status of the Replica Servers through beacons, and the latency of Failure Detector depends on the configuration parameter `fd_grace_seconds`, default to 10 seconds, which means it takes up to 10 seconds for the Meta Server to know that the Replica Server is down, and then reassign new primary replicas.
  * For secondary replicas: Since the secondary replicas do not serve reads, theoretically they have no impact on reads. But it will affect writing because the PacificA consistency protocol requires all replicas to be written successfully before the write operation can be submitted. After the process is killed, the primary replica will find that the secondary replica has been lost during the write operation, and then notify the Meta Server to kick it out. After the _configuration_ stage, the replica group is combined by one primary and one secondary replica, then continuing to provide write services. For write operations that have not yet been completed during this switching process, even if there is a _reconciliation_ stage to execute again, the client may have timed out, which has a certain impact on availability. However, this impact is relatively small because the speed of _reconfiguration_ is relatively fast and can usually be completed within 1 second.
* Restarting Meta Server: The impact of restarting Meta Server on availability can be almost negligible. Because the client retrieves the service node information for each partition from the Meta Server for the first time and caches the information locally, there is usually no need to query from Meta Server again. Therefore, a short disconnection during the Meta Server restart process has little impact on the client. However, considering that the Meta Server needs to maintain beacons with the Replica Server, it is important to avoid stopping the Meta Server process for a long time, which could cause the Replica Server to be disconnected.
* Restarting the Collector: Restarting the Collector has no impact on availability. However, availability metrics are collected from the Collector, so it may have a slight impact on the metrics data.

Therefore, the following points can be considered to keep availability during cluster restart:
* Only one process can be restarted at a time, and the next process can only be restarted after the process is restarted and fully recovered to provide service. Because:
  * If the cluster does not recover to a fully healthy state after restarting a process, and some partitions still have only one primary and one secondary replica, then killing another Replica Server process is likely to enter a state with only one primary replica, making it unable to provide write service.
  * Waiting for all partitions in the cluster to recover three replicas before restarting the next process can also reduce the risk of data loss.
* Try to actively migrate replicas instead of passively migrating replicas to avoid the delay of Failure Detector affecting availability. Because:
* 尽量主动迁移 replica，而不是被动迁移 replica，避免 Failure Detector 的延迟影响可用性。因为：
  * 被动迁移需要等待 Failure Detector 来感知节点失联，而主动迁移就是在 kill 掉 Replica Server 之前，先将这个进程服务的 primary replica 都迁移到其他节点上，这个 `reconfiguration` 过程是很快的，基本 1 秒以内完成。
* 尽量在 kill 掉 Replica Server 之前，将该进程服务的 secondary replica 手动降级。因为：
  * 将 `reconfiguration` 过程由 “写失败时的被动触发” 变为 “主动触发”，进一步降低对可用性的影响。
* 尽量减少进程重启时恢复过程的工作量，以缩短进程重启时间。
  * Replica Server 在重启时需要 replay log 来恢复数据。如果直接 kill 掉，则需要 replay 的数据量可能很大。但是如果在 kill 之前，先主动触发 memtable 的 flush 操作，让内存数据持久化到磁盘，在重启时需要 replay 的数据量就会大大减少，重启时间会缩短很多，而整个集群重启所需的时间也能大大缩短。
* 尽量减少不必要的节点间数据拷贝，避免因为增加 CPU、网络 IO、磁盘 IO 的负载带来的可用性影响。
  * Replica Server 挂掉后，部分 partition 进入一主一备的状态。如果 Meta Server 立即在其他 Replica Server 上补充副本，会带来大量的跨节点数据拷贝，增加 CPU、网络 IO、磁盘 IO 负载压力，影响集群稳定性。Pegasus 解决这个问题的办法是，允许在一段时间内维持一主一备状态，给重启的 Replica Server 一个维护窗口。如果长时间没有恢复，才会在新的 Replica Server 上补充副本。这样兼顾了数据的安全性和集群的稳定性。可以通过配置参数 `replica_assign_delay_ms_for_dropouts` 控制等待时间，默认为 5 分钟。

# 重启流程

## 高可用重启

流程如下：
* 如果是升级，请先准备好新的 server 程序包和配置文件
* 使用 shell 工具将集群的 meta level 设置为 `steady`，关闭 [负载均衡功能](rebalance)，避免不必要的 replica 迁移
  ```
  >>> set_meta_level steady
  ```
* 使用 shell 工具将集群的 meta level 设置为 `steady`，关闭 [负载均衡功能](rebalance)，避免不必要的 replica 迁移
  ```
  >>> remote_command -t meta-server meta.lb.assign_delay_ms $value
  ```
  其中 `value` 可理解为 replcia server 的维护时间，即为 Meta Server 发现 Replica Server 失联后，到其他节点补充副本的触发时间。例如配置为 `3600000`。
* 重启 Replica Server 进程，采用逐个重启的策略。重启单个 Replica Server：
  * 通过 shell 工具向 Meta Server 发送 [远程命令](remote-commands#meta-server)，临时禁掉 `add_secondary` 操作：
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node 0
    ```
  * 通过 migrate_node 命令，将 Replica Server 上的 primary replica 都转移到其他节点：
    ```bash
    $ ./run.sh migrate_node -c $meta_list -n $node -t run
    ```
    通过 shell 工具的 `nodes -d` 命令查看该节点服务的 replica 情况，等待 primary replica 的个数变为 0。如果长时间不变为 0，请重新执行该命令。
  * 通过 downgrade_node 命令，将 Replica Server 上的 secondary replica 都降级为 `INACTIVE`：
    ```bash
    $ ./run.sh downgrade_node -c $meta_list -n $node -t run
    ```
    通过 shell 工具的 `nodes -d` 命令查看该节点的服务 replica 情况，等待 secondary replica 的个数变为 0。如果长时间不变为 0，请重新执行该命令。
  * 通过 shell 工具向 Replica Server 发送远程命令，将所有 replica 都关闭，以触发 flush 操作，将数据都刷到磁盘：
    ```
    >>> remote_command -l $node replica.kill_partition
    ```
    等待大约 1 分钟，让数据刷到磁盘完成。
  * 如果是升级操作，则替换程序包和配置文件
  * 重启 Replica Server 进程
  * 通过 shell 工具向 Meta Server 发送 [远程命令](remote-commands#meta-server)，开启 `add_secondary` 操作，让其快速补充副本：
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node 100
    ```
  * 使用 shell 工具的 `ls -d` 命令查看集群状态，等待所有 partition 都完全恢复健康
  * 继续操作下一个 Replica Server
* 重启 Meta Server 进程，采用逐个重启的策略。重启单个 Meta Server：
  * kill 掉 Meta Server 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 Meta Server 进程
  * 等待 30 秒以上，保证 Meta Server 与 Replica Server 心跳的连续性
  * 继续操作下一个 Meta Server
* 重启 Collector 进程：
  * kill 掉 Collector 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 Collector 进程
* 重置参数
  * 通过 shell 工具重置以上步骤修改过的参数：
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node DEFAULT
    >>> remote_command -t meta-server meta.lb.assign_delay_ms DEFAULT
    ```

## 简化版重启

如果对可用性要求不高，重启流程可简化如下：
* 如果是升级操作，请准备好新的 server 程序包和配置文件
* 使用 shell 工具将集群的 meta level 设置为 `steady`，关闭 [负载均衡功能](rebalance)，避免不必要的 replica 迁移
  ```
  >>> set_meta_level steady
  ```
* 重启 Replica Server 进程，采用逐个重启的策略。重启单个 Replica Server：
  * kill 掉 Replica Server 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 Replica Server 进程
  * 使用 shell 工具的 `ls -d` 命令查看集群状态，等待所有 partition 都完全恢复健康
  * 继续操作下一个 Replica Server
* 重启 Meta Server 进程，采用逐个重启的策略。重启单个 Meta Server：
  * kill 掉 Meta Server 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 Meta Server 进程
  * 等待 30 秒以上，保证 Meta Server 与 Replica Server 心跳的连续性
  * 继续操作下一个 Meta Server
* 重启 Collector 进程：
  * kill 掉 Collector 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 Collector 进程

# 重启脚本

可参考基于 [Minos](https://github.com/XiaoMi/minos) 和 [高可用重启](#高可用重启) 流程的脚本：[scripts/pegasus_rolling_update.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_rolling_update.sh)。
