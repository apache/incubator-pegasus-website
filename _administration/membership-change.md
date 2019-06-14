---
title: 集群扩容缩容
layout: page
show_sidebar: false
menubar: administration_menu
---

# 功能目标

当集群容量不够或者读写压力太大了，需要通过增加节点来扩容；当集群承担的业务规模缩减时，可以通过减少节点来缩容。

扩容和缩容时，需要考虑这些点：
* 不停服
* 尽量不要影响可用性
* 尽量减少不必要的数据拷贝

# 扩容流程

扩容流程非常简单：
* 要扩容多个机器，就在这些新增机器上启动replica server进程，启动后replica server会主动联系meta server，加入节点列表中。
* 在meta level为steady的情况下，不会进行[负载均衡](rebalance)，因此用shell工具的`nodes -d`命令查看，可以看到新节点的状态为ALIVE，但是服务的replica个数为0。
* 通过shell工具的`set_meta_level lively`启动负载均衡，meta server会逐渐将部分replica迁移到新节点上。
* 通过shell工具的`nodes -d`命令查看个节点服务replica的情况，在达到均衡状态后，通过`set_meta_level steady`关闭负载均衡，扩容完成。

# 缩容流程

缩容相对扩容来说要考虑的点就多些，主要包括：
* 如果同时要下线多个节点，需要一个一个进行，等一个下线完成后再下线另一个，避免影响集群的可用度和数据的安全性。
* 如果同时要下线多个节点，在下线一个节点时，meta server补充备份要避免将备份分派在即将要下线的其他节点上，不然等后面下线其他节点时，又要重新补充备份，造成不必要的跨节点数据拷贝。我们提供了black_list来支持这个功能。
* **需要注意**：节点下线后，在meta server上的状态会变成UNALIVE，可能会造成ALIVE的节点比例低于配置参数`node_live_percentage_threshold_for_update`，如果低于了限制，meta server就会自动降级为freezed状态，此时所有的`reconfiguration`操作都无法进行，缩容流程也进行不下去。所以在缩容之前需要计算一下是否会造成这种情况，如果会，就先升级meta server的配置，将`node_live_percentage_threshold_for_update`修改至足够低，保证在缩容过程中meta server不会自动降级为freezed状态。

推荐的缩容流程：
* 计算缩容后ALIVE的节点比例会不会低于配置参数`node_live_percentage_threshold_for_update`，如果低于，就将该配置参数改小些，然后升级meta server。
* 使用shell工具将集群的meta * level设置为steady，关闭[负载均衡功能](rebalance)，避免不必要的replica迁移。
  ```
  >>> set_meta_level steady
  ```
* 使用shell工具向meta server发送[远程命令](remote-commands#meta-server)，设置black_list：
  ```
  >>> remote_command -t meta-server meta.lb.assign_secondary_black_list $address_list
  ```
  其中`address_list`是要下线节点的ip:port地址列表，用逗号分隔。
* 使用shell工具将`assign_delay_ms`设为10，这样做的目的是让节点下线后，立即在其他节点上补充备份：
  ```
  >>> remote_command -t meta-server meta.lb.assign_delay_ms 10
  ```
* 逐个下线replica server。单个replica server下线流程：
  * kill掉replica server进程。
  * 使用shell的`ls -d`命令查看集群状态，等待所有partition都完全恢复健康（所有表的unhealthy数都为0）。
  * 清理该节点上的数据，释放存储空间。
  * 继续下线下一个replica server。
* 重启meta server：
  * 重启是为了重置上面动态修改过的配置，并且让shell的`nodes -d`不再显示已经下线的节点。
  * 如果之前调整过配置参数`node_live_percentage_threshold_for_update`，重启时需要修改配置文件，再其调整为合适的值。

以上过程可以自动化，我们提供了集群升级脚本[scripts/pegasus_offline_node_list.sh](https://github.com/XiaoMi/pegasus/blob/master/scripts/pegasus_offline_node_list.sh)。不过这个脚本并不能直接使用，因为其依赖minos部署工具来完成进程的远程stop操作。`pegasus_offline_node_list.sh`调用`pegasus_offline_node.sh`，因此这两个脚本的minos_client_dir都需要更改。你可以针对你们自己的部署系统，修改脚本中minos相关部分，使其可以正常工作。如需帮助，请联系我们。

注意：在使用集群升级脚本的时候，也要保证配置参数`node_live_percentage_threshold_for_update`的值足够小（有必要可以先升级meta-server），避免使集群进入freezed状态。

# 节点迁移
通过先**扩容**后**缩容**，可以实现集群的节点迁移。为了尽量减少数据的重复拷贝和移动，建议按照如下步骤：
* 先扩容：把需要扩容的机器加入到集群中，但是在加入后**暂时不进行负载均衡**。
* 再缩容：将需要缩容的机器通过上面的[缩容流程](#缩容流程)进行下线，**特别注意参数`node_live_percentage_threshold_for_update`的配置**。
* 进行[负载均衡](rebalance)。
