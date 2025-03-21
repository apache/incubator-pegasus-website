---
permalink: administration/resource-management
---

# 背景介绍

Pegasus 主要用到的资源包括 CPU、磁盘、内存、网络等。对这些系统资源的使用负载不要太高，否则 Pegasus 服务可能会不稳定甚至崩溃。建议：
* 单块磁盘的存储使用不要超过 80%。
* 内存使用不要超过每个节点的 80%。
* 网络连接数不要超过系统配置，建议连接数控制在 5 万以内。

通过调整这些配置参数，可以减少一些磁盘存储容量的使用：
* 设置 `max_replicas_in_group = 3`，参见 [Replica 副本数管理](#replica 副本数管理)。
* 设置 `gc_disk_error_replica_interval_seconds = 3600` 和 `gc_disk_garbage_replica_interval_seconds = 3600`，参见 [垃圾目录管理](#垃圾目录管理)。
* 设置 `checkpoint_reserve_min_count = 2` 和 `checkpoint_reserve_time_seconds = 1200`，参见 [Rocksdb checkpoints 管理](#rocksdb-checkpoints-管理)。

# Replica 副本数管理

Pegasus 推荐使用 3 副本（1 primary + 2 secondaries），在创建表的时候将 `-r` 参数设为 3。

但是在系统中实际存在的副本数可能不止 3 个，这是通过以下配置参数决定的：
```
[meta_server]
    max_replicas_in_group = 4
```

该参数的意义是：允许一个 partition 中最多存在的副本数（包括活跃和不活跃的），默认为 4（表示允许保留 1 个不活跃的副本）。虽然正在提供服务的活跃副本是 3 个（1 primary + 2 secondary），但是在宕机恢复或者负载均衡过程中，replica 可能从 A 节点迁移到 B 节点，迁移完成后 A 节点上的数据实际上不需要了，但是在存储充足的情况下，可以继续将 A 节点的数据保留在磁盘上，如果将来 replica 重新迁移到 A 节点，这些数据还有可能被重用，避免重新传输数据。

如果想要节省磁盘存储使用量，及时删除无用的副本数据，就可以设置 `max_replicas_in_group = 3`，并重启 Meta Server 使配置生效，然后设置 [负载均衡](rebalance) 状态为 `lively`，让 Meta Server 允许删除无用的副本数据。

# 垃圾目录管理

Replica Server 中的 replica 目录如果不需要了或者损坏了，都会变成垃圾目录：不需要的目录会加 `.gar` 后缀，出错的目录会加 `.err` 后缀。这些目录不会被立即删除，因为考虑到某些极端情况下可能还有价值（例如系统崩溃时通过他们来找回数据）。

有两个配置参数决定这些目录的真正删除时机：
```
[replication]
    gc_disk_error_replica_interval_seconds = 604800
    gc_disk_garbage_replica_interval_seconds = 86400
```
对于这两种目录，会检查目录的最后修改时间（2.6 版本以前是目录的最后修改时间，2.6 开始是目录名中的时间戳字段），只有当最后修改时间与当前时间的差距超过了对应的参数时，才会执行删除。

如果想通过及时删除这些垃圾目录来节省磁盘存储使用量，可以减小这两个参数的值。
```
[replication]
    gc_disk_error_replica_interval_seconds = 3600
    gc_disk_garbage_replica_interval_seconds = 3600
```
* 如果版本小于 1.11.3，需要重启 Replica Server 使配置生效。
* 如果版本在 1.11.3 到 2.1 之间，可以通过 [远程命令](remote-commands) 的 `useless-dir-reserve-seconds` 命令来动态地同时修改这两个参数，不用重启 Replica Server 进程使其生效。例如将这两个参数修改为 0，用于紧急清理垃圾目录：
```
>>> remote_command -t replica-server useless-dir-reserve-seconds 0
```
在确认清理完毕后，再还原为配置文件中的值：
```
>>> remote_command -t replica-server useless-dir-reserve-seconds DEFAULT
```
* 从版本 2.2 开始，可以通过 [HTTP 接口](/api/http) 动态修改这两个参数的值，不用重启 Replica Server 进程使其生效。

# RocksDB checkpoints 管理

Replica Server 底层使用 RocksDB 存储数据，会定期生成 [checkpoint](https://github.com/facebook/rocksdb/wiki/Checkpoints)。Checkpoint 目录会放在 replica 的 data 目录下，并以生成时的 `last_durable_decree` 作为作为后缀。

如下图，replica 的 data 目录下包含当前正在使用的 rdb 目录和若干个 checkpoint 目录：
![checkpoint_dirs.png](/assets/images/checkpoint_dirs.png){:class="img-responsive"}

生成 checkpoint 时，checkpoint 中的文件都是通过硬链接方式生成的，而不是通过拷贝的方式。其中的一个 sstable 文件可能被 rdb 持有，也可能被一个或者多个 checkpoint 持有。只要任意一个在持有，该文件的数据就存在于磁盘盘上，消耗存储空间。只有 rdb 和所有的 checkpoint 都不持有该文件，他才会被删除。

RocksDB 后台在持续进行 compaction 操作，所以 checkpoint 中持有的 sstable 可能已经不被 rdb 所持有了（称其为过期）。如果 checkpoint 的保留时间太长，这些过期的 sstable 不能被及时删除，就会占用额外的磁盘存储空间。尤其对于写入量大的表，compaction 也会进行得更频繁，单个 sstable 文件的生命周期很短，如果 checkpoint 数保留得比较多的话，占用的存储空间很可能几倍于当前实际的数据大小。

以下配置参数决定了 checkpoint 删除的策略：
```
[pegasus.server]
    checkpoint_reserve_min_count = 2
    checkpoint_reserve_time_seconds = 1800
```
其中：
* checkpoint_reserve_min_count：表示 checkpoint 的最少保留个数，只有 checkpoint 个数超过这个限制的时候，最老的 checkpoint 才可能被删除。
* checkpoint_reserve_time_seconds：表示 checkpoint 的最小保留时间，只有 checkpoint 生成时间距离当前时间超过这个值时，最老的才可能被删除。
* 只有当这两个参数所提供的限制条件同时满足时，checkpoint 才会被删除。

如果想要节省磁盘存储使用量，及时删除过老的 checkpoint 目录，可以减小这两个参数。例如：
```
[pegasus.server]
    checkpoint_reserve_min_count = 1
    checkpoint_reserve_time_seconds = 1200
```
注意：不建议将 `checkpoint_reserve_time_seconds` 设得太小。考虑到对 learn 的影响，要大于 `replica_assign_delay_ms_for_dropouts` 的值（默认是 5 分钟）。

## 设置表级配置

从 1.11.3 版本开始，支持通过 [Table 环境变量](table-env) 动态修改指定表的这两项配置，可不重启 Replica Server 进程。例如：
```
>>> use <table_name>
>>> set_app_envs rocksdb.checkpoint.reserve_min_count 1
>>> set_app_envs rocksdb.checkpoint.reserve_time_seconds 600
```
