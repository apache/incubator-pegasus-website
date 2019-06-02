---
title: Zookeeper迁移
layout: page
menubar: administration_menu
---

由于Pegasus的meta server依赖Zookeeper存储元数据和抢主，所以Zookeeper服务的不稳定会造成Pegasus服务不稳定，有时就需要迁移到其他更稳定或者空闲的Zookeeper上。

Zookeeper迁移提供了两种办法：通过元数据恢复迁移；通过zkcopy工具迁移。

# 通过元数据恢复迁移

Pegasus提供了[元数据恢复](元数据恢复)功能，这个功能也可用于Zookeeper迁移。基本思路就是配置新的Zookeeper后，通过recover命令发起元数据恢复，这样元数据就写入新的Zookeeper上。

1. 备份app列表

   使用shell的`ls`命令：
   ```
   >>> ls -o apps.list
   ```

2. 备份node列表

   使用shell的`nodes`命令：
   ```
   >>> nodes -d -o nodes.list
   ```

   生成元数据恢复所需的`recover_node_list`文件：
   ```bash
   grep ALIVE nodes.list | awk '{print $1}' >recover_node_list
   ```

3. 停掉所有meta

   停掉所有meta server，并等待30秒以上，以保证所有replica server因为心跳超时进入INACTIVE状态。

4. 修改meta配置文件

   修改meta server的配置文件，如下：
   ```
   [meta_server]
     recover_from_replica_server = true
   [zookeeper]
     hosts_list = {new zookeeper host list}
   ```
   * 将`recover_from_replica_server`设置为true
   * 将zookeeper的`hosts_lists`改为新的服务地址

5. 启动一个meta

   启动其中一个meta server。

6. 通过shell发送recover命令

   ```
   >>> recover -f recover_node_list
   ```
   检查恢复结果，如果出错请参考[常见问题整理](元数据恢复#常见问题整理)排查问题。

7. 修改配置文件并重启meta

   恢复成功后，需要修改配置文件，重新改回非recovery模式：
   ```
   [meta_server]
     recover_from_replica_server = false
   ```

   重新启动所有的meta server，集群进入正常状态。

注：[scripts/pegasus_migrate_zookeeper.sh](https://github.com/XiaoMi/pegasus/blob/master/scripts/pegasus_migrate_zookeeper.sh)是我们在内部使用的迁移Zookeeper的脚本，虽然因为服务启停功能的兼容性不能直接使用，但是可以参考其中的流程，或者进行改造。

# 通过zkcopy工具迁移

基本思路就是使用zkcopy工具将原始Zookeeper数据拷贝到目标Zookeeper上，修改meta server配置文件并重启。

1. 停掉所有的备meta server

   为了防止重启主meta server时有其他的备meta server抢到锁，造成状态混乱，在整个迁移过程中只保留一个主meta server，其他的备meta server全部停掉。

2. 修改主meta server状态为blind

   将主meta server的level设置为blind（关于meta server的level介绍请参见[负载均衡](负载均衡#控制集群的负载均衡)），以禁止任何对Zookeeper数据的更新操作，防止在copy过程中出现不一致：
   ```
   >>> set_meta_level blind
   ```

3. 使用zkcopy工具拷贝Zookeeper数据

   通过shell的`cluster_info`命令获取Zookeeper元数据节点路径`zookeeper_root`，然后使用zkcopy工具将该节点的数据完全拷贝到新集群的节点上，注意需要递归拷贝。

4. 修改配置文件

   修改meta server的配置文件，将zookeeper的`hosts_lists`改为新的服务地址：
   ```
   [meta_server]
     hosts_list = {new zookeeper host list}
   ```

5. 重启主meta server

   重新启动主meta server，通过shell工具检查集群进入正常状态。

6. 启动所有备meta server

   启动所有备meta server，集群进入正常状态。

7. 清理旧Zookeeper上的数据

   使用zookeepercli工具的rmr命令清理旧zookeeper上的数据。

注：上面使用到的`zkcopy`和`zookeepercli`工具以后会提供出来。