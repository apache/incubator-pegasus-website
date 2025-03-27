---
permalink: administration/table-migration
---

Table迁移是指将某个Pegasus集群的一张表所有数据迁移到另一个Pegasus集群中。

目前提供了四种Table迁移方法：

1. Shell工具copy_data命令；
2. 冷备份恢复；
3. 业务双写配合Bulkload；
4. 热备迁移；

下面开始讲述这些迁移方法的原理、具体操作方式：

# Shell工具copy_data命令迁移

## 原理

Shell工具的[copy_data命令](/overview/shell#copy_data)原理是通过客户端将原表数据逐条读出并逐条写入新表。具体就是通过scan接口从原集群的表中逐条读入数据，然后通过set接口将数据逐条写入到目标集群的表中。如果set的数据在目标集群的表中已经存在，会直接覆盖。

## 具体操作方式

copy_data命令：
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

假设原集群为ClusterA，目标集群为ClusterB，需要迁移的表为TableA。迁移步骤如下：
* 在目标集群上建表。由于copy_data命令并不会自动在目标集群上创建表，所以需要自己先建表。相对原表，新表的表名可以不同，partition count也可以不同。假设在目标集群上新建的表名为TableB。
* 在Shell工具的配置文件中添加目标集群的配置。因为copy_data命令需要通过```-c```参数指定目标集群，所以需要配置目标集群的MetaServer地址列表。在执行Shell所在文件夹，修改配置文件[src/shell/config.ini](https://github.com/apache/incubator-pegasus/blob/master/src/shell/config.ini)，在文件最后添加如下几行（将ClusterB替换为你自己的集群名）：
```
[pegasus.clusters]
    ClusterB = {ClusterB的MetaServer地址}
```
* 在Shell中执行命令：
```
>>> use TableA
>>> copy_data -c ClusterB -a TableB -t 10000
```
* 如果以上步骤都没有问题，copy操作应当就开始执行了，每隔1秒会打印进度。通常来说，copy速度应当在10万/秒以上。copy过程中如果出现问题终止了（比如遭遇写限流，write stall等），需排查问题后再重新执行命令。



# 冷备份迁移

## 原理

所谓冷备份迁移，就是利用Pegasus的[冷备份功能](/administration/cold-backup)，先将数据备份到HDFS或者其他介质上，然后通过restore或bulkload恢复到新的表中。

冷备份迁移的好处：
* 速度更快：因为冷备份是拷贝文件，相对copy_data的逐条拷贝，速度要快很多。
* 错误容忍度高：冷备份功能有很多容错逻辑，避免因为网络抖动等问题带来的影响。如果用copy_data，中途出错就需要从头再来。
* 多次迁移更友好：如果要从一个表拷贝到多个地方，只需要备份一次，然后执行多次恢复。

## 具体操作方式

**冷备份大致分为两个阶段：**

1. 表的所有主副本通过创建checkpoints为上传HDFS做准备。此过程期间冷备表分片越大，占用的磁盘IO越大，会产生短暂的读写毛刺。
2. 创建checkpoints后调用HDFS接口进行上传。此过程期间将占用较多网络资源，若不限速，容易造成网络带宽打满。

冷备份最佳实践方式如下：

- 冷备之前通过Pegasus Shell工具设置限速规避网络带宽资源的占用。

```shell
#2.3.x版本及以前设置方式
remote_command -t replica-server  nfs.max_send_rate_megabytes 50
#2.4.x版本及以后设置方式
remote_command -t replica-server  nfs.max_send_rate_megabytes_per_disk 50
```

- 通过admin-cli发起冷备并等待，参数依次为表id，HDFS所在Region，HDFS存储路径。

```
backup 3 hdfs_zjy /user/pegasus/backup
```

其中HDFS所在Region字段会匹配config.ini文件中的以下内容来连接HDFS：

```
[block_service.hdfs_zjy]
type = hdfs_service
args = hdfs://zjyprc-hadoop /
```

- 观察监控磁盘IO逐渐降低，代表冷备份进入第二阶段。此时可以不断观察监控中网络带宽占用情况，适当放开限速来加速冷备，经验值是每次递增50。

```shell
#2.3.x版本及以前设置方式
remote_command -t replica-server  nfs.max_send_rate_megabytes 100
#2.4.x版本及以后设置方式
remote_command -t replica-server  nfs.max_send_rate_megabytes_per_disk 100
```

- 一旦发生ReplicaServer节点重启将造成冷备份失败，并且只能等待，目前不支持取消冷备。此时需要观察监控`cold.backup.max.upload.file.size`，此指标归零后表示失败的冷备结束。后续需要删除HDFS上的冷备目录，重新发起冷备操作。

**冷备份数据恢复到新表有两种方式：**

1. [冷备份功能](/administration/cold-backup)中介绍的restore命令来将数据恢复到新表。

restore执行方式如下：

```
restore -c ClusterA -a single -i 4 -t 1742888751127 -b hdfs_zjy -r /user/pegasus/backup
```

执行此命令需要注意：

- restore命令会自动创建表，因此restore命令不支持变更表分片数。
- restore命令强制要求原表TableA存在，否则无法执行此命令。因此原表不存在时，只能通过Bulkload将数据灌入新表。
- 注意限速避免打满网络带宽，限速方式于冷备份限速方式相同。

2. [Bulkload功能](/2020/02/18/bulk-load-design.html)中介绍的Bulkload功能来将数据灌入到新表。

Bulkload功能可以将冷备份数据灌入新表，最佳实践方式如下：

- 由于Bulkload需要特定格式数据，使用Pegasus-spark提供的离线split操作将冷备数据转换为所需格式。Pegasus-spark的使用方式此处不进行介绍。
- 使用Pegasus-spark提供的Bulkload操作功能将处理好的数据灌入Pegasus中。
  - Pegasus shell命令行同样支持发起Bulkload，假设离线split处理后的数据在`/user/pegasus/split`目录中，具体操作方式如下：

```
>>> use TableB
>>> set_app_envs rocksdb.usage_scenario bulk_load
>>> start_bulk_load -a TableB -c ClusterB -p hdfs_zjy -r /user/pegasus/split
```



# 业务双写配合Bulkload

copy_data命令迁移和冷备份迁移都只能迁移存量数据，若业务有增量数据，则需要业务停写迁移。`v2.3.x`及以后版本支持了**业务不停写迁移方案**，即业务双写配合Bulkload。

## 原理

1. 业务侧双写原表和目标表，保证增量数据的同步。
2. 服务侧通过冷备、离线Split、Bulkload IngestBehind三步来迁移存量数据，保证存量数据同步。

Rocksdb支持IngestBehind功能，Rocksdb内部的sst文件由global seqno号来表示sst文件的新旧，并且是递增的。Rocksdb通过ingest功能会为即将导入的外部sst文件分配global seqno号，IngestBehind功能则表示为导入的sst文件分配的global seqno号为0。这样存量数据将被导入Rocksdb引擎底部，进而保证增量数据和存量数据的读取顺序。

## 具体操作方式

- 创建目标表时需指定`rocksdb.allow_ingest_behind=true`，若不指定此参数将无法使用IngestBehind功能！

```SQL
create TableB -p 64 -e rocksdb.allow_ingest_behind=true
```

- 与业务侧沟通让其双写原表和目标表。
  - 需注意双写两张表均需增加写失败重试机制。
- 业务侧双写改造完成后，服务侧通过冷备、离线Split将Bulkload所需数据准备好。
- 通过Pegasus shell发起Bulkload操作，与普通Bulkload操作不同的是需指定`--ingest_behind`参数。

```
>>> use TableB
>>> set_app_envs rocksdb.usage_scenario bulk_load
>>> start_bulk_load -a TableB -c ClusterB -p hdfs_zjy -r /user/pegasus/split --ingest_behind
```

- 若Bulkload占用过多网络带宽资源，仍然可以通过上述介绍的`max_send_rate_megabytes`进行限速。
- 此方式不要求原表分片数和目标表分片数一致，故可自由调整目标表分片数。



# 热备迁移

`v2.4.x`及之后版本支持了热备份，[跨机房同步](/administration/duplication)有详细介绍，这里不再阐述。热备份可以实现业务无感迁移，且操作流程简单。

## 具体操作方式

- 热备份迁移要求业务所有Client通过MetaProxy组件来访问Pegasus。不能有直连Metaserver IP地址的客户端！关于Pegasus直连IP客户端检测，可咨询Pegasus社区。
- 业务侧全部客户端接入MetaProxy后，开始向目标集群建立热备，此处省略如何建立热备。

- 热备建立后，修改MetaProxy依赖Zookeeper中相应信息，改为目标集群的MetaServer IP地址。
- 对于原表TableA进行阻读阻写，以此触发业务侧Client重新从MetaProxy拉取拓扑。

```
>>> use TableB
>>> set_app_envs replica.deny_client_request reconfig*all
```

- 观察下列监控指标符合预期即为迁移成功：
  - 观察监控原表QPS流量消失；
  - 目标表QPS上涨并恢复至原表相当的流量；
  - 原集群、目标集群热备监控中`dup.disabled_non_idempotent_write_count`为0；
  - 原集群、目标集群监控中读写失败次数`recent.read.fail.count recent.write.fail.count`为0;
- 需注意：目前C++ Client和Python Client暂不支持连入MetaProxy。
