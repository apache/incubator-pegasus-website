---
permalink: administration/zk-migration
---

由于 Pegasus 的 Meta Server 使用 Zookeeper 来存储元数据和选主，所以 Zookeeper 服务的不稳定会造成 Pegasus 服务不稳定，必要时需要迁移元数据到其他更稳定或者空闲的 Zookeeper 上。

Zookeeper 元数据迁移有两种方式：通过元数据恢复迁移，或通过 `zkcopy` 工具迁移。

# 通过元数据恢复迁移

Pegasus 提供了 [元数据恢复](meta-recovery) 功能，这个功能也可用于 Zookeeper 迁移。基本思路是配置新的 Zookeeper 后，通过 `recover` 命令发起元数据恢复，这样元数据就写入新的 Zookeeper 上。

1. 备份 table 列表

   使用 shell 工具的 `ls` 命令：
   ```
   >>> ls -o apps.list
   ```

2. 备份 node 列表

   使用 shell 工具的 `nodes` 命令：
   ```
   >>> nodes -d -o nodes.list
   ```

   生成元数据恢复所需的 `recover_node_list` 文件：
   ```bash
   grep ALIVE nodes.list | awk '{print $1}' > recover_node_list
   ```

3. 停掉所有 Meta Server

   停掉所有 Meta Server，并等待一段时间（默认为 30 秒，取决于配置项 `[replication]config_sync_interval_ms`），以保证所有 Replica Server 因为心跳超时进入 `INACTIVE` 状态。

4. 修改 Meta Server 配置文件

   修改内容如下：
   ```
   [meta_server]
     recover_from_replica_server = true
   [zookeeper]
     hosts_list = {new Zookeeper host list}
   ```
   即：
   * 将 `recover_from_replica_server` 设置为 `true`，开启从 Replica Server 恢复元数据的开关
   * 更新 Zookeeper 配置更新为新的服务地址

5. 启动一个 Meta Server

   启动集群中的一个 Meta Server，它将成为集群的主 Meta Server。

6. 通过 shell 工具发送 `recover` 命令

   ```
   >>> recover -f recover_node_list
   ```

7. 修改配置文件并重启 Meta Server

   恢复成功后，需要修改 Meta Server 的配置文件，重新改回非 recovery 模式：
   ```
   [meta_server]
     recover_from_replica_server = false
   ```

8. 重新启动所有的 Meta Server，集群进入正常状态。

## 示例脚本

可以参考 Zookeeper 元数据迁移的示例脚本 [pegasus_migrate_zookeeper.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_migrate_zookeeper.sh) 中的主要流程。

# 通过 `zkcopy` 工具迁移

基本思路就是使用 [zkcopy 工具](https://github.com/ksprojects/zkcopy) 将原始 Zookeeper 上的 Pegasus 元数据拷贝到目标 Zookeeper 上，修改 Meta Server 配置文件并重启。

1. 停掉所有的备 Meta Server

   为了防止重启主 Meta Server 时，其他的备 Meta Server 抢到锁而成为新的主，造成元数据不一致的问题，需要在整个迁移过程中只保留主 Meta Server 为存活状态，其他的备 Meta Server 全部停掉。

2. 修改主 Meta Server 状态为 `blind`

   将主 Meta Server 的 meta_level 设置为 `blind`，以禁止任何对 Zookeeper 数据的更新操作，防止在迁移过程中出现引起元数据不一致：
   ```
   >>> set_meta_level blind
   ```
   > 关于 Meta Server 的 meta_level 介绍请参见 [负载均衡](rebalance#控制集群的负载均衡)。

3. 使用 zkcopy 工具拷贝 Zookeeper 元数据

   通过 shell 工具的 `cluster_info` 命令获取 Pegasus 元数据存储在 Zookeeper 上的路径 `zookeeper_root`，然后使用 zkcopy 工具将该路径的数据全部拷贝到新 Zookeeper 上，注意需要递归拷贝。

4. 修改配置文件

   修改 Meta Server 的配置文件，将 `hosts_lists` 配置值改为新的服务地址：
   ```
   [meta_server]
     hosts_list = {new Zookeeper host list}
   ```

5. 重启主 Meta Server

   重新启动主 Meta Server，通过 shell 工具 [检查](/administration/experiences#问题排查) 集群进入正常状态。

6. 启动所有备 Meta Server

   启动所有备 Meta Server，集群进入正常状态。

7. 清理旧 Zookeeper 上的数据

   使用 [zookeepercli 工具](https://github.com/openark/zookeepercli) 的 `rmr` 命令清理旧 Zookeeper 上的数据。
