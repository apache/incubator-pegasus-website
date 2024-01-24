---
permalink: administration/rolling-update
---

# 功能目标

当需要升级 server 版本或者持久化修改配置时，都需要对集群进行重启。对于分布式集群来说，常用的重启方法是滚动重启 (Rolling-Restart)，即不停止集群服务，而对 server 逐个进行重启。

> 以下文档假定 Pegasus 集群中表配置的副本数为 3。

集群重启的重要目标是不停服，并且对可用性的影响降至最低。为了达到这个目标，我们先梳理在重启过程会影响可用性的点：
* replica server 进程被 kill 后，该进程服务的 replica 无法提供服务：
  * 对于 primary replica：因为直接向客户端提供读写服务，所以进程被 kill 后肯定会影响读写，需要等 meta server 重新分派新的 primary replica 后才能恢复。meta server 通过心跳感知 replica server 的存活状态，failure detection 的时间延迟取决于配置参数 `fd_grace_seconds`，默认为 10 秒，即最多需要经过 10 秒*，meta server 才能知道 replica server 宕机了，然后重新分派新的 primary replica。
  * 对于 secondary replica：由于不服务读，所以理论上对读无影响。但是会影响写，因为 PacificA 一致性协议要求所有副本都写成功，写操作才能提交。进程被 kill 后，primary replica 在执行写操作过程中会发现该 secondary replica 已失联，然后通知 meta server 将其踢出，经过 `reconfiguration` 阶段后变成一主一备，继续提供写服务。对于在该切换过程中尚未完成的写操作，即使有 `reconciliation` 阶段重新执行，但客户端可能已经超时，这对可用性是有一定影响的。但是这个影响相对较小，因为 `reconfiguration` 的速度是比较快的，通常能在 1 秒内完成。
* 重启 meta server：重启 meta server 对可用性的影响几乎可以忽略不计。因为客户端首次从 meta server 获取到各 partition 的服务节点信息后，会在本地缓存该信息，通常不需要再次向 meta server 查询，因此 meta server 重启过程中的短暂失联对客户端基本没有影响。不过考虑到 meta server 需要与 replica server 维持心跳，所以要避免连续 kill meta server 进程，造成 replica server 心跳失联的风险。
* 重启 collector：重启 collector 对可用性没有影响。但是可用性统计是在 collector 上进行的，所以可能会对 metrics 数据有轻微影响。

因此，在集群重启过程要提高可用性，需要考虑如下几点：
* 一次只能重启一个进程，且在该进程重启并完全恢复进入服务状态后，才能重启下一个进程。因为：
  * 如果重启一个进程后，集群没有恢复到完全健康状态，有的 partition 还只有一主一备，这时如果再 kill 一个 replica server 进程，很可能进入只有一主的状态，从而无法提供写服务。
  * 等待集群所有 partition 都恢复三副本后再重启下一个进程，也能降低数据丢失的风险。
* 尽量主动迁移 replica，而不是被动迁移 replica，避免 failure detection 的延迟影响可用性。因为：
  * 被动迁移需要等待 failure detection 来感知节点失联，而主动迁移就是在 kill 掉 replica server 之前，先将这个进程服务的 primary replica 都迁移到其他节点上，这个 `reconfiguration` 过程是很快的，基本 1 秒以内完成。
* 尽量在 kill 掉 replica server 之前，将该进程服务的 secondary replica 手动降级。因为：
  * 将 `reconfiguration` 过程由 “写失败被动触发” 变为 “主动触发”，进一步降低对可用性的影响。
* 尽量减少进程重启时恢复过程的工作量，以缩短进程重启时间。
  * replica server 在重启时需要 replay log 来恢复数据。如果直接 kill 掉，则需要 replay 的数据量可能很大。但是如果在 kill 之前，先主动触发 memtable 的 flush 操作，让内存数据持久化到磁盘，在重启时需要 replay 的数据量就会大大减少，重启时间会缩短很多，而整个集群重启所需的时间也能大大缩短。
* 尽量减少不必要的节点间数据拷贝，避免因为增加 CPU、网络 IO、磁盘 IO 的负载带来的可用性影响。
  * replica server 挂掉后，部分 partition 进入一主一备的状态。如果 meta server 立即在其他 replica server 上补充副本，会带来大量的跨节点数据拷贝，增加 CPU、网络 IO、磁盘 IO 负载压力，影响集群稳定性。Pegasus 解决这个问题的办法是，允许在一段时间内维持一主一备状态，给重启的 replica server 一个维护窗口。如果长时间没有恢复，才会在新的 replica server 上补充副本。这样兼顾了数据的安全性和集群的稳定性。可以通过配置参数 `replica_assign_delay_ms_for_dropouts` 控制等待时间，默认为 5 分钟。

# 重启流程

## 高可用重启

建议的重启流程如下：
* 如果是升级，请先准备好新的 server 程序包和配置文件
* 使用 shell 工具将集群的 meta level 设置为 `steady`，关闭 [负载均衡功能](rebalance)，避免不必要的 replica 迁移
  ```
  >>> set_meta_level steady
  ```
* 重启 replica server 进程，采用逐个重启的策略。重启单个 replica server：
  * 通过 shell 工具向 meta server 发送 [远程命令](remote-commands#meta-server)，禁掉 `add_secondary` 操作：
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node 0
    ```
  * 通过 migrate_node 命令，将 replica server 上的 primary replica 都转移到其他节点：
    ```bash
    $ ./run.sh migrate_node -c $meta_list -n $node -t run
    ```
    通过 shell 工具的 `nodes -d` 命令查看该节点服务的 replica 情况，等待 primary replica 的个数变为 0。如果长时间不变为 0，请重新执行以上命令。
  * 通过 downgrade_node 命令，将 replica server 上的 secondary replica 都降级为 `INACTIVE`：
    ```bash
    $ ./run.sh downgrade_node -c $meta_list -n $node -t run
    ```
    通过 shell 工具的 `nodes -d` 命令查看该节点的服务 replica 情况，等待 secondary replica 的个数变为 0。如果长时间不变为 0，请重新执行以上命令。
  * 通过 shell 工具向 replica server 发送远程命令，将所有 replica 都关闭，以触发 flush 操作，将数据都刷到磁盘：
    ```
    >>> remote_command -l $node replica.kill_partition
    ```
    等待大约 1 分钟，让数据刷到磁盘完成。
  * 通过 shell 工具向 meta server 发送 [远程命令](remote-commands#meta-server)，开启 `add_secondary` 操作：
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node 100
    ```
  * 如果是升级操作，则替换程序包和配置文件
  * 重启 replica server 进程
  * 使用 shell 工具的 `ls -d` 命令查看集群状态，等待所有 partition 都完全恢复健康
  * 继续操作下一个 replica server
* 重启 meta server 进程，采用逐个重启的策略。重启单个 meta server：
  * kill 掉 meta server 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 meta server 进程
  * 等待 30 秒以上，保证 meta server 与 replica server 心跳的连续性
  * 继续操作下一个 meta server
* 重启 collector 进程：
  * kill 掉 collector 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 collector 进程

## 简化版重启

如果对可用性要求不高，重启流程可简化如下：
* 如果是升级操作，请准备好新的 server 程序包和配置文件
* 使用 shell 工具将集群的 meta level 设置为 `steady`，关闭 [负载均衡功能](rebalance)，避免不必要的 replica 迁移
  ```
  >>> set_meta_level steady
  ```
* 重启 replica server 进程，采用逐个重启的策略。重启单个 replica server：
  * kill 掉 replica server 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 replica server 进程
  * 使用 shell 工具的 `ls -d` 命令查看集群状态，等待所有 partition 都完全恢复健康
  * 继续操作下一个 replica server
* 重启 meta server 进程，采用逐个重启的策略。重启单个 meta server：
  * kill 掉 meta server 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 meta server 进程
  * 等待 30 秒以上，保证 meta server 与 replica server 心跳的连续性
  * 继续操作下一个 meta server
* 重启 collector 进程：
  * kill 掉 collector 进程
  * 如果是升级操作，替换程序包和配置文件
  * 重启 collector 进程

# 重启脚本

可使用自动化的集群重启脚本 [scripts/pegasus_rolling_update.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_rolling_update.sh)。该脚本采用 [高可用重启](#高可用重启) 流程，用于小米内部的集群重启。

不过这个脚本并不能直接使用，因为其依赖 minos 部署工具来完成以下事情：
* 获取集群的进程列表
* 自动部署更新程序包和配置文件，并重启进程

你可以修改该脚本，针对你们自己的部署系统，修改以上通过 minos 完成的部分，使其可以正常工作。如需帮助，请联系我们。
