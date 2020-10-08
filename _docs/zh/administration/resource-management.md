---
permalink: administration/resource-management
---

# 背景介绍
Pegasus系统主要用到了资源包括SSD存储、内存、网络连接等。对这些资源的使用不要太满，否则系统可能会不稳定甚至崩溃。建议：
* SSD存储使用不要超过每个节点的80%。
* 内存使用不要超过每个节点的80%。
* 网络连接数不要超过系统配置，建议连接数控制在5万以内。

通过调整这些配置参数，可以减少一些SSD存储资源的使用：
* 设置配置参数`max_replicas_in_group = 3`，参见[Replica备份数管理](#replica备份数管理)。
* 设置配置参数`gc_disk_error_replica_interval_seconds = 3600`和`gc_disk_garbage_replica_interval_seconds = 3600`，参见[垃圾文件夹管理](#垃圾文件夹管理)。
* 设置配置参数`checkpoint_reserve_min_count = 2`和`checkpoint_reserve_time_seconds = 1200`，参见[Rocksdb-Checkpoint管理](#rocksdb-checkpoint管理)。

# Replica备份数管理

Pegasus推荐使用3备份（1 primary + 2 secondary），在创建表的时候将`-r`参数设为3。

但是在系统中实际存在的备份数可能不止3个，这是通过以下配置参数决定的：
```
[meta_server]
    max_replicas_in_group = 4
```

该参数的意义是：允许一个partition中最多存在的备份数（包括活跃和不活跃的），默认为4（表示允许保留1个不活跃的备份）。为什么会有这个配置呢？这是因为，虽然正在提供服务的活跃备份是3个（1 primary + 2 secondary），但是在宕机恢复或者负载均衡过程中，可能发生replica从A节点迁移到B节点的情况，迁移完成后A节点上的数据实际上不需要了，但是在存储充足的情况下，可以将A节点的数据保留在SSD盘上，如果将来replica重新迁移到A节点，这些数据还有可能被重用，避免重新拷贝数据。

如果想要节省SSD存储占用，希望无用的备份数据及时删除，就可以设置`max_replicas_in_group = 3`，并重启MetaServer使配置生效，然后设置[负载均衡](rebalance)状态为`lively`，让MetaServer控制删除无用的备份数据。

# 垃圾文件夹管理

ReplicaServer中的replica文件夹如果**不需要了**或者**出错了**，都会变成垃圾文件夹：不需要的文件夹会加`.gar`后缀；出错的文件夹会加`.err`后缀。这些文件夹不会被立即删除，因为考虑到某些极端情况下可能还有价值（譬如系统崩溃了需要找回数据）。

有两个配置参数决定这些文件夹的真正删除时间：
```
[replication]
    gc_disk_error_replica_interval_seconds = 604800
    gc_disk_garbage_replica_interval_seconds = 86400
```
参数的意义是：对于这两种文件夹，会检查文件夹的最后修改时间（基本上就是文件夹重命名增加后缀的时间），只有最后修改时间与当前时间的差距超过了参数指定的interval时间，才会执行删除。

如果想要节省SSD存储占用，希望这些垃圾文件夹及时删除，可以减小这两个参数的值（譬如只保留1小时或者更短），然后重启ReplicaServer使配置生效：
```
[replication]
    gc_disk_error_replica_interval_seconds = 3600
    gc_disk_garbage_replica_interval_seconds = 3600
```

从1.11.3版本开始，支持通过[远程命令](remote-commands)`useless-dir-reserve-seconds`来动态修改这两个参数，可不重启ReplicaServer进程，用于紧急清理垃圾文件夹，譬如将这两个参数修改为0：
```
>>> remote_command -t replica-server useless-dir-reserve-seconds 0
```
在确认清理完毕后，再还原为配置文件中的值：
```
>>> remote_command -t replica-server useless-dir-reserve-seconds DEFAULT
```

# Rocksdb-Checkpoint管理

ReplicaServer底层使用RocksDB存储数据，会定期生成[checkpoint](https://github.com/facebook/rocksdb/wiki/Checkpoints)（有时也被称为snapshot）。checkpoint文件夹会放在replica的data文件夹下，并以生成时的last_durable_decree作为作为后缀。

如下图，replica的data文件夹下包含当前使用的rdb文件夹和若干个checkpoint文件夹：
[[https://github.com/XiaoMi/pegasus-common/blob/master/img/checkpoint_dirs.png|alt=octocat]]

生成checkpoint的时候，sstable文件都是通过硬链接方式拷贝，不会真正copy数据。一个sstable文件可能被rdb持有，也可能被一个或者多个checkpoint持有。只要任意一个在持有，该文件的数据就存在于SSD盘上，占据存储空间。只有rdb和所有的checkpoint都不持有该文件，数据才会被删除。因为RocksDB在不断地进行compaction，所以checkpoint中持有的sstable可能已经过期了。如果checkpoint的保留时间太久，这些过期的sstable不能被及时删除，就会占用SSD存储空间。尤其对于写操作频繁的表，compaction进行得很频繁，单个sstable文件的生命周期很短，如果checkpoint保留得比较多的话，占用的存储空间很可能几倍于实际的数据大小。

以下配置参数决定了checkpoint删除的策略：
```
[pegasus.server]
    checkpoint_reserve_min_count = 3
    checkpoint_reserve_time_seconds = 3600
```
其中：
* checkpoint_reserve_min_count：表示checkpoint最少保留个数，只有个数超过这个限制的时候，最老的checkpoint才允许被删除。
* checkpoint_reserve_time_seconds：表示checkpoint保留时间，只有checkpoint生成时间距离当前时间超过这个值时，才允许被删除。
* 这两个参数所提供的限制条件同时满足时，checkpoint才会被删除。

如果想要节省SSD存储占用，希望checkpoint文件夹删除得更及时，可以减小这两个参数，譬如：
```
[pegasus.server]
    checkpoint_reserve_min_count = 2
    checkpoint_reserve_time_seconds = 1200
```
注意：`checkpoint_reserve_time_seconds`不建议设得太小，考虑到对learn的影响，要尽量大于`replica_assign_delay_ms_for_dropouts`的值（该值默认10分钟），所以建议至少在10分钟以上。

从1.11.3版本开始，支持通过[Table环境变量](table-env)动态修改某个表的这两个配置，可不重启ReplicaServer进程，用于紧急清理checkpoint文件夹，譬如：
```
>>> use table_name
>>> set_app_envs rocksdb.checkpoint.reserve_min_count 1
>>> set_app_envs rocksdb.checkpoint.reserve_time_seconds 600
```
