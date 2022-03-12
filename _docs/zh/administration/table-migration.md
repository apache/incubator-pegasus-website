---
permalink: administration/table-migration
---

这里说的Table迁移是指将某个Pegasus集群的一个表的数据迁移到另一个Pegasus集群中。

目前提供了两种办法：使用Shell工具的copy_data命令；通过冷备份恢复。

# copy_data迁移

Shell工具的[copy_data命令](/_docs/zh/tools/shell.md#copy_data)的原理：通过scan接口从源集群的表中逐条读入数据，然后通过set接口将数据逐条写入到目标集群的表中。如果set的数据在目标集群的表中已经存在，会直接覆盖。

copy_data命令：
```
    copy_data              <-c|--target_cluster_name str> <-a|--target_app_name str>
                           [-s|--max_split_count num] [-b|--max_batch_count num]
                           [-t|--timeout_ms num]
```

假设源集群为ClusterA，目标集群为ClusterB，需要迁移的表为TableA。迁移步骤如下：
* 在目标集群上建表。由于copy_data命令并不会自动在目标集群上创建表，所以需要自己先建表。相对源表，新表的表名可以不同，partition count也可以不同。假设在目标集群上新建的表名为TableB。
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
* 如果以上步骤都没有问题，copy操作应当就开始执行了，每隔1秒会打印进度。通常来说，copy速度应当在10万/秒以上。copy过程中如果出现问题终止了，就重新执行命令。

# 冷备份迁移

所谓冷备份迁移，就是利用Pegasus的[冷备份功能](/_docs/zh/administration/cold-backup.md)，先将数据备份到HDFS或者其他介质上，然后恢复到新的表中。

冷备份迁移的好处：
* 速度更快：因为冷备份是拷贝文件，相对copy_data的逐条拷贝，速度要快很多。
* 错误容忍度高：冷备份功能有很多容错逻辑，避免因为网络抖动等问题带来的影响。如果用copy_data，中途出错就需要从头再来。
* 多次迁移更友好：如果要从一个表拷贝到多个地方，只需要备份一次，然后执行多次恢复。

