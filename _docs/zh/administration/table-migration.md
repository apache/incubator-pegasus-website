---
permalink: administration/table-migration
---

Table 迁移是指将某个 Pegasus 集群的一张表所有数据迁移到另一个 Pegasus 集群中。

目前提供了四种 Table 迁移方法：

1. Shell 工具命令迁移 ;
2. 冷备份恢复 ;
3. 业务双写配合 Bulkload;
4. 热备迁移 ;

下面开始讲述这些迁移方法的原理、具体操作方式：

# Shell 工具命令迁移

## 原理

Shell 工具的 [copy_data 命令 ](/overview/shell#copy_data) 原理是通过客户端将原表数据逐条读出并逐条写入新表。具体就是通过 scan 接口从原集群的表中逐条读入数据，然后通过 set 接口将数据逐条写入到目标集群的表中。如果 set 的数据在目标集群的表中已经存在，会直接覆盖。

## 具体操作方式

copy_data 命令：
   
```
copy_data              <-c|--target_cluster_name str> <-a|--target_app_name str>
                      [-p|--partition num] [-b|--max_batch_count num] [-t|--timeout_ms num]
                      [-h|--hash_key_filter_type anywhere|prefix|postfix]
                      [-x|--hash_key_filter_pattern str]
                      [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                      [-y|--sort_key_filter_pattern str]
                      [-v|--value_filter_type anywhere|prefix|postfix|exact]
                      [-z|--value_filter_pattern str] [-m|--max_multi_set_concurrency]
                      [-o|--scan_option_batch_size] [-e|--no_ttl] [-n|--no_overwrite]
                      [-i|--no_value] [-g|--geo_data] [-u|--use_multi_set]
```

假设原集群为 ClusterA，目标集群为 ClusterB，需要迁移的表为 TableA。迁移步骤如下：

1. **在目标集群上建表.**  
   由于 copy_data 命令并不会自动在目标集群上创建表，所以需要自己先建表。相对原表，新表的表名可以不同， partition count 也可以不同。假设在目标集群上新建的表名为 TableB。

2. **在 Shell 工具的配置文件中添加目标集群的配置.**  
   因为 copy_data 命令需要通过 ```-c``` 参数指定目标集群，所以需要配置目标集群的 MetaServer 地址列表。在执行 Shell 所在文件夹，修改配置文件 [src/shell/config.ini](https://github.com/apache/incubator-pegasus/blob/master/src/shell/config.ini)，在文件最后添加如下几行（将 ClusterB 替换为你自己的集群名）：
   ```
   [pegasus.clusters]
    ClusterB = {ClusterB 的 MetaServer 地址 }
   ```

3. **在 Shell 中执行命令.**  
   ```
   >>> use TableA
   >>> copy_data -c ClusterB -a TableB -t 10000
   ```

4. **监控迁移进度.**  
   如果以上步骤都没有问题， copy 操作应当就开始执行了，每隔 1 秒会打印进度。通常来说， copy 速度应当在 10 万 / 秒以上。 copy 过程中如果出现问题终止了（比如遭遇写限流， write stall 等），需排查问题后再重新执行命令。



# 冷备份迁移

## 原理

所谓冷备份迁移，就是利用 Pegasus 的 [ 冷备份功能 ](/administration/cold-backup)，先将数据备份到 HDFS 或者其他介质上，然后通过 restore 或 bulkload 恢复到新的表中。

**冷备份迁移的好处**
- **速度更快:** 因为冷备份是拷贝文件，相对 copy_data 的逐条拷贝，速度要快很多。
- **错误容忍度高:** 冷备份功能有很多容错逻辑，避免因为网络抖动等问题带来的影响。如果用 copy_data，中途出错就需要从头再来。
- **多次迁移更友好:** 如果要从一个表拷贝到多个地方，只需要备份一次，然后执行多次恢复。

## 具体操作方式

**冷备份大致分为两个阶段：**

1. 表的所有主副本通过创建 checkpoints 为上传 HDFS 做准备。此过程期间冷备表分片越大，占用的磁盘 IO 越大，会产生短暂的读写毛刺。
2. 创建 checkpoints 后调用 HDFS 接口进行上传。此过程期间将占用较多网络资源，若不限速，容易造成网络带宽打满。

冷备份最佳实践方式如下：

- 冷备之前通过 Pegasus Shell 工具设置限速规避网络带宽资源的占用。

   ```shell
   #2.3.x 版本及以前设置方式
   remote_command -t replica-server  nfs.max_send_rate_megabytes 50
   #2.4.x 版本及以后设置方式
   remote_command -t replica-server  nfs.max_send_rate_megabytes_per_disk 50
   ```

- 通过 admin-cli 发起冷备并等待，参数依次为表 id， HDFS 所在 Region， HDFS 存储路径。 

   ```
   backup 3 hdfs_xyz /user/pegasus/backup
   ```

  其中 HDFS 所在 Region 字段会匹配 config.ini 文件中的以下内容来连接 HDFS： 

   ```
   [block_service.hdfs_xyz]
   type = hdfs_service
   args = hdfs://xyzprc-hadoop /
   ```

- 观察监控磁盘 IO 逐渐降低，代表冷备份进入第二阶段。此时可以不断观察监控中网络带宽占用情况，适当放开限速来加速冷备，经验值是每次递增 50 。

   ```shell
   #2.3.x 版本及以前设置方式
   remote_command -t replica-server  nfs.max_send_rate_megabytes 100
   #2.4.x 版本及以后设置方式
   remote_command -t replica-server  nfs.max_send_rate_megabytes_per_disk 100
   ```

- 一旦发生 ReplicaServer 节点重启将造成冷备份失败，并且只能等待，目前不支持取消冷备。此时需要观察监控 `cold.backup.max.upload.file.size`，此指标归零后表示失败的冷备结束。后续需要删除 HDFS 上的冷备目录，重新发起冷备操作。

**冷备份数据恢复到新表有两种方式：**

1. [ 冷备份功能 ](/administration/cold-backup) 中介绍的 restore 命令来将数据恢复到新表。  

   restore 执行方式如下：

   ```
   restore -c ClusterA -a single -i 4 -t 1742888751127 -b hdfs_xyz -r /user/pegasus/backup
   ```

   执行此命令需要注意：
   - restore 命令会自动创建表，因此 restore 命令不支持变更表分片数。
   - restore 命令强制要求原表 TableA 存在，否则无法执行此命令。因此原表不存在时，只能通过 Bulkload 将数据灌入新表。
   - 注意限速避免打满网络带宽，限速方式于冷备份限速方式相同。

2. [Bulkload 功能 ](/2020/02/18/bulk-load-design.html) 中介绍的 Bulkload 功能来将数据灌入到新表。

   Bulkload 功能可以将冷备份数据灌入新表，最佳实践方式如下：

   - 由于 Bulkload 需要特定格式数据，使用 Pegasus-spark 提供的离线 split 操作将冷备数据转换为所需格式。 Pegasus-spark 的使用方式此处不进行介绍。
   - 使用 Pegasus-spark 提供的 Bulkload 操作功能将处理好的数据灌入 Pegasus 中。
    - Pegasus shell 命令行同样支持发起 Bulkload，假设离线 split 处理后的数据在 `/user/pegasus/split` 目录中，具体操作方式如下：

   ```
   >>> use TableB
   >>> set_app_envs rocksdb.usage_scenario bulk_load
   >>> start_bulk_load -a TableB -c ClusterB -p hdfs_xyz -r /user/pegasus/split
   ```



# 业务双写配合 Bulkload

copy_data 命令迁移和冷备份迁移都只能迁移存量数据，若业务有增量数据，则需要业务停写迁移。`v2.3.x` 及以后版本支持了 **业务不停写迁移方案**，即业务双写配合 Bulkload。

## 原理

1. 业务侧双写原表和目标表，保证增量数据的同步。
2. 服务侧通过冷备、离线 Split、 Bulkload IngestBehind 三步来迁移存量数据，保证存量数据同步。

Rocksdb 支持 IngestBehind 功能， Rocksdb 内部的 sst 文件由 global seqno 号来表示 sst 文件的新旧，并且是递增的。 Rocksdb 通过 ingest 功能会为即将导入的外部 sst 文件分配 global seqno 号， IngestBehind 功能则表示为导入的 sst 文件分配的 global seqno 号为 0 。这样存量数据将被导入 Rocksdb 引擎底部，进而保证增量数据和存量数据的读取顺序。

## 具体操作方式

- 创建目标表时需指定 `rocksdb.allow_ingest_behind=true`，若不指定此参数将无法使用 IngestBehind 功能！

   ```
   create TableB -p 64 -e rocksdb.allow_ingest_behind=true
   ```

- 与业务侧沟通让其双写原表和目标表。
  - 需注意双写两张表均需增加写失败重试机制。
- 业务侧双写改造完成后，服务侧通过冷备、离线 Split 将 Bulkload 所需数据准备好。
- 通过 Pegasus shell 发起 Bulkload 操作，与普通 Bulkload 操作不同的是需指定 `--ingest_behind` 参数。

   ```
   >>> use TableB
   >>> set_app_envs rocksdb.usage_scenario bulk_load
   >>> start_bulk_load -a TableB -c ClusterB -p hdfs_xyz -r /user/pegasus/split --ingest_behind
   ```

- 若 Bulkload 占用过多网络带宽资源，仍然可以通过上述介绍的 `max_send_rate_megabytes` 进行限速。
- 此方式不要求原表分片数和目标表分片数一致，故可自由调整目标表分片数。



# 热备迁移

`v2.4.x` 及之后版本支持了热备份，[ 跨机房同步 ](/administration/duplication) 有详细介绍，这里不再阐述。热备份可以实现业务无感迁移，且操作流程简单。

## 具体操作方式

- 热备份迁移要求业务所有 Client 通过 MetaProxy 组件来访问 Pegasus。不能有直连 Metaserver IP 地址的客户端！关于 Pegasus 直连 IP 客户端检测，可咨询 Pegasus 社区。
- 业务侧全部客户端接入 MetaProxy 后，开始向目标集群建立热备，此处省略如何建立热备。

- 热备建立后，修改 MetaProxy 依赖 Zookeeper 中相应信息，改为目标集群的 MetaServer IP 地址。
- 对于原表 TableA 进行阻读阻写，以此触发业务侧 Client 重新从 MetaProxy 拉取拓扑。

   ```
   >>> use TableB
   >>> set_app_envs replica.deny_client_request reconfig*all
   ```

- 观察下列监控指标符合预期即为迁移成功：
  - 观察监控原表 QPS 流量消失 ;
  - 目标表 QPS 上涨并恢复至原表相当的流量 ;
  - 原集群、目标集群热备监控中 `dup.disabled_non_idempotent_write_count` 为 0;
  - 原集群、目标集群监控中读写失败次数 `recent.read.fail.count recent.write.fail.count` 为 0;
- 需注意：目前 C++ Client 和 Python Client 暂不支持连入 MetaProxy。
