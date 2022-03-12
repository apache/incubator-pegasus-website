---
permalink: administration/rolling-update
---

# 功能目标

当需要升级server版本或者修改config配置时，都需要对集群进行升级。对于分布式集群来说，常用的升级方法就是**滚动升级(Rolling-Update)**，即不停止服务，对一台一台server逐个进行升级。

集群升级的重要目标在于**平稳**，即不停服，并且对可用性的影响降至最低。为了达到这个目标，我们先看看在升级过程中哪些地方可能会影响可用性：
* replica server进程被kill后，该进程服务的replica无法提供服务：
  * 对于primary replica：因为直接向客户端提供读写服务，所以进程kill后肯定会影响读写，需要等metaserver重新分派新的primary replica后才能恢复。meta server通过心跳感知replica server的存活状态，failure detection的时间延迟取决于配置参数`fd_grace_seconds`，通常配置为10秒，即最多需要经过**10秒**，meta server才能知道replica server挂了，然后重新分派新的primary replica。
  * 对于secondary replica：由于不服务读，所以理论上对读无影响。但是会影响写，因为一致性协议要求一主两备都写成功，写操作才能提交。进程kill后，primary replica在执行写操作过程中会发现该secondary replica已失联，然后通知meta server将其踢掉，经过`reconfiguration`阶段后变成一主一备，继续提供写服务。在切换过程中尚未完成的写操作，即使有`reconciliation`阶段重新执行，但客户端那边大概率已经超时了，对可用性有一定影响。但是这个影响相对小些，因为`reconfiguration`的速度是比较快的，通常在**1秒**以内就能完成。
* 升级meta server：升级meta server对可用度的影响几乎可以忽略不计，因为客户端会在本地缓存各partition的服务节点信息，通常情况下并不需要向meta server查询，因此meta server重启过程中的短暂失联对客户端基本没有影响。不过考虑到meta server需要与replica server维持心跳，所以要避免连续kill meta server进程，造成replica server心跳失联的风险。
* 升级collector：升级collector对可用度没有影响。但是可用度统计是在collector上进行的，所以可能会对统计数据有轻微影响。

因此，在集群升级过程要提高可用性，需要考虑如下几点：
* 一次只能升级一个进程，且在该进程重启并完全恢复进入服务状态后，才能升级下一个进程。
  * 因为如果升级一个进程后，集群没有恢复到完全健康状态，有的partition还只有一主一备，这时再kill一个replica server的话，很可能进入只有一主的状态，无法提供写服务。
  * 另外，等待集群所有partition都恢复三备份后再继续升级下一个进程，也能有效降低数据丢失的风险。
* 尽量主动迁移replica，而不是被动迁移replica，避免failure detection的时间延迟影响可用度。
  * 被动迁移需要等待failure detection来感知节点失联，而主动迁移就是在kill掉replica server之前，先将这个进程服务的primary replica都迁移到其他节点上，这个`reconfiguration`过程是很快的，基本1秒以内完成。
  * 更进一步，还可以在kill掉replica server之前，将这个进程服务的secondary replica手动降级，将`reconfiguration`过程由“写失败被动触发”变为“主动触发”，也能降低对可用度的影响。
* 尽量减少进程重启时恢复过程的工作量，缩短进程重启时间。
  * replica server在重启时需要replay log来恢复数据。如果直接kill掉，需要replay的数据量可能很大。但是如果在kill之前，先主动触发memtable的flush操作，让内存数据先落地，在重启时需要replay的数据量就会大大减少，重启时间会缩短很多，而整个集群升级所需的时间也能大大缩短。
* 尽量减少不必要的节点间数据拷贝，避免因为增加CPU/网络/IO负载影响可用度。
  * replica server挂掉后，部分partition进入一主一备的状态。如果meta server立即在其他replica server上补充备份，会带来大量的跨节点数据拷贝，增加CPU/网络/IO负载压力，影响集群稳定性。Pegasus解决这个问题的办法是，允许在一段时间内维持一主一备状态，给原来的replica server进行恢复的机会。如果长时间没有恢复，才会在新的replica server上补充备份。这样兼顾了数据的安全性和集群的稳定性。可以通过配置参数`replica_assign_delay_ms_for_dropouts`控制等待时间，默认为10分钟。

# 升级流程

## 高可用升级
根据以上对高可用度的考虑，我们建议完善的升级流程如下：
* 准备好新的Server程序包和配置文件
* 使用shell工具将集群的meta level设置为steady，关闭[负载均衡功能](/_docs/zh/administration/rebalance.md)，避免不必要的replica迁移
  ```
  >>> set_meta_level steady
  ```
* 升级replica server进程，采用逐个升级的策略。升级单个replica server：
  * 通过shell向meta server发送[远程命令](/_docs/zh/administration/remote-commands.md#meta-server)，禁掉`add_secondary`操作：
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node 0
    ```
  * 通过migrate_node命令，将replica server上的primary replica都迁走：
    ```bash
    $ ./run.sh migrate_node -c $meta_list -n $node -t run
    ```
    通过shell的`nodes -d`命令查看该节点的服务replica情况，等待primary replica的个数变为0；如果长时间不变为0，重新执行上面命令。
  * 通过downgrade_node命令，将replica server上的secondary replica都降级为INACTIVE：
    ```bash
    $ ./run.sh downgrade_node -c $meta_list -n $node -t run
    ```
    通过shell的`nodes -d`命令查看该节点的服务replica情况，等待secondary replica的个数变为0；如果长时间不变为0，重新执行上面命令。
  * 通过shell向replica server发送远程命令，将所有replica都关闭，以触发flush操作，将数据都落地：
    ```
    >>> remote_command -l $node replica.kill_partition
    ```
    等待大约1分钟，让数据完成落地。
  * 通过shell向meta server发送[远程命令](remote-commands#meta-server)，开启`add_secondary`操作：
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node 100
    ```
  * 替换程序包和配置文件
  * 重启meta server进程
  * 使用shell的`ls -d`命令查看集群状态，等待所有partition都完全恢复健康
  * 继续升级下一个replica server
* 升级meta server进程，采用逐个升级的策略。升级单个meta server：
  * kill掉meta server进程
  * 替换程序包和配置文件
  * 重启meta server进程
  * 等待30秒以上，保证meta server与replica server心跳的连续性
  * 继续升级下一个meta server
* 升级collector进程：
  * kill掉collector进程
  * 替换程序包和配置文件
  * 重启collector进程

## 简化版升级
如果对可用性要求没那么高，升级流程可简化如下：
* 准备好新的Server程序包和配置文件
* 使用shell工具将集群的meta level设置为steady，关闭[负载均衡功能](rebalance)，避免不必要的replica迁移
  ```
  >>> set_meta_level steady
  ```
* 升级replica server进程，采用逐个升级的策略。升级单个replica server：
  * kill掉replica server进程
  * 替换程序包和配置文件
  * 重启replica server进程
  * 使用shell的`ls -d`命令查看集群状态，等待所有partition都完全恢复健康
  * 继续升级下一个replica server
* 升级meta server进程，采用逐个升级的策略。升级单个meta server：
  * kill掉meta server进程
  * 替换程序包和配置文件
  * 重启meta server进程
  * 等待30秒以上，保证meta server与replica server心跳的连续性
  * 继续升级下一个meta server
* 升级collector进程：
  * kill掉collector进程
  * 替换程序包和配置文件
  * 重启collector进程

# 升级脚本

我们提供了集群升级脚本[scripts/pegasus_rolling_update.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_rolling_update.sh)。该脚本采用[高可用升级](#高可用升级)流程，用于小米内部的集群升级。

不过这个脚本并不能直接使用，因为其依赖minos部署工具来完成以下事情：
* 获取集群的进程列表
* 自动部署更新程序包和配置文件，并重启进程

你可以修改该脚本，针对你们自己的部署系统，修改以上通过minos完成的部分，使其可以正常工作。如需帮助，请联系我们。
