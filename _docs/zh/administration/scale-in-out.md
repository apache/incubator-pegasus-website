---
permalink: administration/scale-in-out
---

# 功能目标

当集群存储容量不够或者读写吞吐太大了，需要通过增加节点来扩容；反之，可以通过减少节点来缩容。

> 本文所述的扩容缩容是针对 replica server。

扩容和缩容时，需要考虑这些点：
* 不要停止 Pegasus 服务
* 尽量不要影响可用性
* 尽量减少不必要的数据传输

# 扩容流程

扩容流程比较简单：
* 要扩容多个服务器，就在这些新增服务器上启动 replica server 进程，启动后 replica server 会主动联系 meta server，加入节点列表中。
* 在 meta level 为 `steady` 时，不会进行 [负载均衡](rebalance)，因此用 shell 工具的 `nodes -d` 命令查看，可以看到新节点的状态为 `ALIVE`，但是该节点服务的 replica 个数为 0。
* 通过 shell 工具的 `set_meta_level lively` 启动负载均衡，meta server 会逐渐将部分 replica 迁移到新节点上。
* 通过 shell 工具的 `nodes -d` 命令查看各节点服务 replica 的情况，在达到均衡状态后，通过 `set_meta_level steady` 关闭负载均衡，扩容完成。

# 缩容流程

缩容相对扩容要考虑的点就多些，主要包括：
* 如果同时要下线多个节点，需要一个一个进行，等一个下线完成后再下线另一个，避免影响集群的可用性和数据的完整性。
* 如果同时要下线多个节点，那么在下线一个节点时，要尽量避免 meta server 在补充副本时将副本分派到即将要下线的其他节点上，否则在下线其他节点时，又要重新补充副本，造成不必要的跨节点数据拷贝。我们提供了 [black_list](/administration/rebalance#assign_secondary_black_list) 来支持这个功能。

> 注意：节点下线后，在 meta server 上的状态会变成 `UNALIVE`，可能会造成 `ALIVE` 的节点比例低于配置参数 `node_live_percentage_threshold_for_update`，此时，meta server 就会自动降级为 `freezed` 状态，此时所有的 `reconfiguration` 操作（即重新分派副本的操作）都无法进行，缩容流程也将无进继续进行。所以在缩容之前需要计算一下是否会造成这种情况，如果会，就先修改 meta server 的配置，将 `node_live_percentage_threshold_for_update` 修改至足够低，以保证在缩容过程中 meta server 不会自动降级为 `freezed` 状态。

## 推荐的缩容流程

* 计算缩容后 `ALIVE` 的节点比例，如果低于参数 `node_live_percentage_threshold_for_update`，则使用 [远程命令](/administration/remote-commands) 修改该参数使其足够小。
  ```
  >>> remote_command -t meta-server meta.live_percentage $percentage
  ```
  其中 `percentage` 为整数，取值范围为 [0, 100]。
* 使用 shell 工具的 `set_meta_level` 命令将集群设置为 `steady` 模式，关闭 [负载均衡功能](rebalance)，避免不必要的 replica 迁移。
  ```
  >>> set_meta_level steady
  ```
* 使用 shell 工具向 meta server 发送 [远程命令](remote-commands#meta-server) 来更新 `assign_secondary_black_list`：
  ```
  >>> remote_command -t meta-server meta.lb.assign_secondary_black_list $address_list
  ```
  其中 `address_list` 是要下线节点的 `ip:port` 列表，用逗号分隔。
* 使用 shell 工具将 `assign_delay_ms` 设为 10，使得在节点下线后，立即在其他存活节点上补充副本：
  ```
  >>> remote_command -t meta-server meta.lb.assign_delay_ms 10
  ```
* 逐个下线 replica server。单个 replica server 下线流程：
  * kill 掉想要下线的 replica server 进程。
  * 使用 shell 工具的 `ls -d` 命令查看集群状态，等待所有 partition 都完全恢复健康（所有表的 unhealthy partition 数都为 0）。
  * 清理该节点上的数据，释放磁盘空间。
* 重启 meta server：
  * 重启 meta server 是为了清理已下线节点的记录（即在 shell 工具的 `nodes -d` 不再显示已经下线的节点），并重置以上修改过的配置项。

## 脚本

以上过程已被脚本 [scripts/pegasus_offline_node_list.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_offline_node_list.sh) 实现。
> 不过该脚本不能直接使用，因为他依赖 [minos 部署工具](https://github.com/XiaoMi/minos).

# 节点迁移

通过先扩容，再缩容的方式，来实现集群的节点迁移。为了尽量减少不必要的数据传输，建议按照如下步骤：
* 先扩容：将需要扩容的服务器加入到集群中，但是在加入后暂时不进行 [负载均衡](/administration/rebalance#控制集群的负载均衡)。
* 再缩容：将需要缩容的服务器通过上面的 [缩容流程](#缩容流程) 进行下线。
* 执行 [负载均衡](/administration/rebalance#控制集群的负载均衡)。

# 其他配置

* 迁移限速。可以设置单块磁盘的读写带宽，避免高吞吐带来的性能影响。
  ```
  >>> remote_command -t replica-server nfs.max_send_rate_megabytes_per_disk $rate
  >>> remote_command -t replica-server nfs.max_copy_rate_megabytes_per_disk $rate
  ```
  其中 `rate` 的单位为 `MB/s`。