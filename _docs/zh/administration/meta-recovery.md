---
permalink: administration/meta-recovery
---

# 功能目标
在 Pegasus bootstrap 的过程中， meta server 需要先从 zookeeper 上拉取 table 的元信息以及所有 replica 的拓扑结构，再开始服务。

元数据恢复的目标就是：**让 Pegasus 可以不依赖 zookeeper 的任何信息，完成系统的 bootstrap**。

具体流程就是：用户只需提供集群有效的 replica server 的集合； meta server 通过和这些 replica server 交互，尝试重建出 table 元信息和 replica 拓扑结构，并写入到新的 zookeeper 节点，完成 bootstrap。

**注意：元数据恢复功能只是 zookeeper 数据损坏或者丢失之后的补救措施，运维人员要尽力避免这种情况的发生。**

# 操作流程
## 使用 onebox 集群演示
1. 初始化 onebox 集群

   只启动一个 meta server：
   ```bash
   ./run.sh clear_onebox
   ./run.sh start_onebox -m 1 -w
   ```

   此时通过 shell 的 `cluster_info` 命令，可以看到 zookeeper 的节点路径：
   ```
   zookeeper_root      : /pegasus/onebox/x.x.x.x
   ```

2. 使用 bench 工具灌数据

   灌数据是为了测试集群元数据恢复前后数据的完整性：
   ```bash
   ./run.sh bench --app_name temp -t fillseq_pegasus -n 10000
   ```

3. 修改配置文件

   使用以下命令修改 meta server 的配置文件：
   ```bash
   sed -i 's@/pegasus/onebox@/pegasus/onebox_recovery@' onebox/meta1/config.ini
   sed -i 's@recover_from_replica_server = false@recover_from_replica_server = true@' onebox/meta1/config.ini
   ```

   以上命令将配置文件 `onebox/meta1/config.ini` 中的 zookeeper 路径进行修改，并设置为 recovery 模式：
   * `cluster_root = /pegasus/onebox/x.x.x.x` 改为 `cluster_root = /pegasus/onebox_recovery/x.x.x.x`
   * `distributed_lock_service_parameters = /pegasus/onebox/x.x.x.x` 改为 `distributed_lock_service_parameters = /pegasus/onebox_recovery/x.x.x.x`
   * `recover_from_replica_server = false` 改为 `recover_from_replica_server = true`

4. 重启 meta

   ```bash
   ./run.sh stop_onebox_instance -m 1
   ./run.sh start_onebox_instance -m 1
   ```

   重启成功后， meta server 会进入 recovery 模式，此时除了 start_recovery 请求，所有其他 RPC 请求都会返回 ERR_UNDER_RECOVERY，譬如，使用 shell 的 `ls` 命令得到结果如下：
   ```
   >>> ls
   list apps failed, error=ERR_UNDER_RECOVERY
   ```

5. 通过 shell 发送 recover 命令

   首先准备 `recover_node_list` 文件，用于指定有效的 replica server 节点，格式为每行一个节点，譬如：
   ```
   # comment line
   x.x.x.x:34801
   x.x.x.x:34802
   x.x.x.x:34803
   ```

   通过 shell 的 `recover` 命令，向 meta server 发送 start_recovery 请求：
   ```
   >>> recover -f recover_node_list
   Wait seconds: 100
   Skip bad nodes: false
   Skip lost partitions: false
   Node list:
   =============================
   x.x.x.x:34801
   x.x.x.x:34802
   x.x.x.x:34803
   =============================
   Recover result: ERR_OK
   ```

   当返回结果为 ERR_OK 时，表示恢复成功，可以通过 shell 的 `ls` 命令看到正常的表信息。

   通过 shell 的 `cluster_info` 命令，可以看到 zookeeper 节点路径已经改变：
   ```
   zookeeper_root      : /pegasus/onebox_recovery/x.x.x.x
   ```

6. 检查数据完整性

   使用 bench 工具查询之前写入的数据是否完整存在：
   ```bash
   ./run.sh bench --app_name temp -t readrandom_pegasus -n 10000
   ```

   在最后的统计结果中能看到 `(10000 of 10000 found)`，表示恢复后数据完整存在。

7. 修改配置文件并重启 meta

   恢复成功后，需要修改配置文件，重新改回非 recovery 模式：
   * `recover_from_replica_server = true` 改为 `recover_from_replica_server = false`

   重启 meta server：
   ```bash
   ./run.sh stop_onebox_instance -m 1
   ./run.sh start_onebox_instance -m 1
   ```

   这样做是避免 meta server 发生重启时，再次进入 recovery 模式，使集群变得不可用。

## 线上集群恢复

对线上集群进行元数据恢复时，请遵循上面的 `3~7` 步骤，需注意以下几点：
* 在 `recover_node_list` 中指定有效的 replica server 节点时，请保证所有节点都是正常可用的。
* 恢复之前不要忘记将配置文件中 `recover_from_replica_server` 设置为 true。
* 只能恢复到 zookeeper 的新节点或者空节点。
* 恢复完成后重新将配置文件中 `recover_from_replica_server` 设置为 false。

## 常见问题整理

* 恢复到 zookeeper 的非空节点

  此时 MetaServer 应当启动失败并 coredump：
  ```
  F12:16:26.793 (1488341786793734532 26cc)   meta.default0.0000269c00010001: /home/Pegasus/pegasus/rdsn/src/dist/replication/meta_server/server_state.cpp:698:initialize_data_structure(): assertion expression: false
  F12:16:26.793 (1488341786793754317 26cc)   meta.default0.0000269c00010001: /home/Pegasus/pegasus/rdsn/src/dist/replication/meta_server/server_state.cpp:698:initialize_data_structure(): find apps from remote storage, but [meta_server].recover_from_replica_server = true
  ```

* 忘记设置 recover_from_replica_server 为 true

  meta server 会进入正常启动逻辑，从 zookeeper 上获取的 apps 为空，但是在 config sync 过程中发现 replica server 上有无法识别的 replica，出现元数据不一致的情况，会 coredump：
  ```
  F12:22:21.228 (1488342141228270056 2764)   meta.meta_state0.0102000000000001: /home/Pegasus/pegasus/rdsn/src/dist/replication/meta_server/server_state.cpp:823:on_config_sync(): assertion expression: false
  F12:22:21.228 (1488342141228314857 2764)   meta.meta_state0.0102000000000001: /home/Pegasus/pegasus/rdsn/src/dist/replication/meta_server/server_state.cpp:823:on_config_sync(): gpid(2.7) on node(10.235.114.240:34801) is not exist on meta server, administrator should check consistency of meta data
  ```

* 恢复时连不上 replica server

  如果恢复时连不上 replica server， recover 命令就会执行失败：
  ```
  >>> recover -f recover_node_list
  Wait seconds: 100
  Skip bad nodes: false
  Skip lost partitions: false
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  x.x.x.x:34804
  =============================
  Recover result: ERR_TRY_AGAIN
  =============================
  ERROR: collect app and replica info from node(x.x.x.x:34804) failed with err(ERR_NETWORK_FAILURE), you can skip it by set skip_bad_nodes option
  =============================
  ```

  可以通过指定 `--skip_bad_nodes` 参数，强制忽略有问题的节点。但是要注意，忽略问题节点可能造成部分 partition 的备份数不全，有丢数据风险。
  ```
  >>> recover -f recover_node_list --skip_bad_nodes
  Wait seconds: 100
  Skip bad nodes: true
  Skip lost partitions: false
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  =============================
  Recover result: ERR_OK
  =============================
  WARNING: collect app and replica info from node(x.x.x.x:34804) failed with err(ERR_NETWORK_FAILURE), skip the bad node
  WARNING: partition(1.0) only collects 2/3 of replicas, may lost data
  WARNING: partition(1.1) only collects 2/3 of replicas, may lost data
  WARNING: partition(1.3) only collects 2/3 of replicas, may lost data
  WARNING: partition(1.5) only collects 2/3 of replicas, may lost data
  WARNING: partition(1.7) only collects 2/3 of replicas, may lost data
  =============================
  ```

* 恢复时发现某个 partition 的备份数不全

  当遇到 partition 备份数不全的情况时，依然能正常恢复，但是会打印告警提示：
  ```
  >>> recover -f recover_node_list
  Wait seconds: 100
  Skip bad nodes: false
  Skip lost partitions: false
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  =============================
  Recover result: ERR_OK
  =============================
  WARNING: partition(1.0) only collects 1/3 of replicas, may lost data
  =============================
  ```

* 恢复时发现某个 partition 没有可用的 replica

  当某个 partition 完全没有收集到可用的 replica 备份时，恢复会失败：
  ```
  >>> recover -f recover_node_list
  Wait seconds: 100
  Skip bad nodes: false
  Skip lost partitions: false
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  =============================
  Recover result: ERR_TRY_AGAIN
  =============================
  ERROR: partition(1.0) has no replica collected, you can force recover it by set skip_lost_partitions option
  =============================
  ```

  可以通过指定 `--skip_lost_partitions` 参数，强制其继续执行恢复，此时 partition(1.0) 会初始化为空 replica。**此操作需慎重，需确定能够容忍数据丢失**：
  ```
  >>> recover -f recover_node_list --skip_lost_partitions
  Wait seconds: 100
  Skip bad nodes: false
  Skip lost partitions: true
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  =============================
  Recover result: ERR_OK
  =============================
  WARNING: partition(1.0) has no replica collected, force recover the lost partition to empty
  =============================
  ```

* 恢复软删除的表

  对于已经删除的表，由于有 [Table 软删除 ](table-soft-delete) 功能，只要没有超过保留时间， replica server 上的 replica 数据就不会被清理，所以该表能被恢复，且被认为是一个正常的未删除的表，也就是说丢掉了删除信息，但是不会丢数据。

  由于表删除后可以创建新的同名表，所以在恢复过程中可能会发现多个表都使用相同表名，出现表名冲突。此时， id 最大的那个表会使用原始表名，其他表的表名都改为 `{name}-{id}` 的形式。

# 设计与实现
元数据恢复功能的设计与实现：
* meta server 提供一个配置项，用来标识“当从 zookeeper 上获取不到任何元数据信息时，是否进入元数据恢复的模式”。
* shell 端提供一个 recovery 的命令，来触发 meta 启动元数据恢复流程。
* 如果进入了元数据恢复流程， meta server 会接收 replica server 的探活心跳，并只响应一个特殊的 `start_recovery`RPC，而不响应任何其他类型的 RPC。
* 用户需要指定一个 replica server 的集合； meta server 只和该集合中节点进行通信，响应其 `start_recovery`RPC，以进行信息收集，用于 bootstrap； meta server 和任何节点的交互失败都会导致恢复流程的失败。
