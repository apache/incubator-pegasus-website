---
permalink: administration/duplication
---

在 pegasus 中，跨机房同步又被称为 **_热备份_**，或 **_duplication_**，简称 **_dup_**。这一功能的主要目的是保证 **数据中心级别的可用性**。当业务需要保证服务与数据能够容忍机房故障时，可以考虑使用此功能。

此外，当 Pegasus 客户端在多机房分布时，时常会遇到跨机房访问 Pegasus 服务带来的高延时问题，这时我们可以将 Pegasus 的服务与客户端部署在相同的机房内，客户端可以只读写本地机房的服务，然后由热备份功能将写同步到各个机房上。这种做法既能保证各个机房都有完整数据，又能避免跨机房的延时开销。

```
        client               client               client
           +                    +                   +
 +---------v-------+   +--------v--------+   +------v-----------+
 |                 |   |                 |   |                  |
 | pegasus-beijing <---> pegasus-tianjin <---> pegasus-shanghai |
 |                 |   |                 |   |                  |
 +----------^------+   +-----------------+   +---------^--------+
            |                                          |
            +------------------------------------------+
```

我们能够做到**一主一备（single-master）**，也能提供**多机房多主（multi-master）**，用户可以根据需要进行配置。

这里需要注意的是，跨机房同步是**异步**的数据复制，并非完全实时。与单机房不同，该功能不提供跨机房 *read-after-write* 的一致性保证。目前在跨机房网络健康的环境下，数据延时大概在 10s 左右，即 A 机房的写数据大概在 10s 后会写入 B 机房。

## 操作上手

假设我们有两个 pegasus 集群 _bjsrv-account_ 和 _tjsrv-account_，分别位于北京与天津的两个机房内，表 `account_xiaomi` 由于存储了极其关键的用户帐号数据，需要能够在双集群保证可用，所以我们为它实施热备份：

```
> ./run.sh shell -n bjsrv-account

Type "help" for more information.
Type "Ctrl-D" or "Ctrl-C" to exit the shell.

The cluster name is: bjsrv-account
The cluster meta list is: ***

>>> ls
app_id    status              app_name
12        AVAILABLE           account_xiaomi

>>> add_dup account_xiaomi tjsrv-account
Success for adding duplication [appid: 12, dupid: 1535008534]

>>> query_dup account_xiaomi
duplications of app [account_xiaomi] are listed as below:
|     dup_id     |   status   |     remote cluster     |       create time       |
|   1535008534   |  DS_START  |      tjsrv-account     |   2018-08-23 15:15:34   |
```

通过 `add_dup` 命令，bjsrv-account 集群的表 account_xiaomi 将会近实时地把数据复制到 tjsrv-account 上，这意味着，每一条在北京机房的写入，最终都一定会复制到天津机房。

热备份使用日志异步复制的方式来实现跨集群的同步，可与 mysql 的 binlog 复制和 hbase replication 类比。

热备份功能**以表为粒度**，你可以只对集群内一部分表实施热备份。热备份的两集群的表名需要保持一致，但 partition 的个数不需要相同。例如用户可以建表如下：

```sh
## bjsrv-account
>>> create account_xiaomi -p 128

## tjsrv-account
>>> create account_xiaomi -p 32
```

## 线上表开启热备份

有时一个线上表可能在设计之初未考虑到跨机房同步的需求，而在服务一段时间后，才决定进行热备份。此时我们需要将源集群已有的全部数据复制到目的集群。因为是线上表，我们要求拷贝过程中：

1. **不可以停止服务**
2. 拷贝过程中的**写增量数据不能丢失**

面对这个需求，我们的操作思路是：

1. 首先源集群**保留从此刻开始的所有写增量**（即WAL日志）
2. 将源集群的全量快照（冷备份）上传至 HDFS / xiaomi-FDS 等备份存储上。
3. 然后恢复到目标集群。
4. 此后源集群开启热备份，并复制此前堆积的写增量，复制到远端目标集群。

```
                +-----Source Table------+
                |                       |
                |  +---------+          |
   2. Backup    |  |         |          |
+----------+    |  |         |          |
|          |    |  | RocksDB | +-----+  |
| snapshot +<------+  Store  | |     |  |
|          |    |  |         | | WAL +<-------+ 1. No GC
+------+---+    |  |         | |     |  |
       |        |  +---------+ +---+-+  |
       |        |                  |    |
       |        +-----------------------+
       |                           |
       |                           | 4. Start duplication
       |                           |
       |         +-----------------v----+
       |         |                      |
       +-------->+                      |
      3. Restore |                      |
                 +------Dest Table------+
```

### 执行步骤1

如何保留从此刻开始的所有写增量？我们可以如此进行操作：

首先使用 `add_dup [--freezed/-f]` 表示不进行日志复制，它的原理就是阻止当前日志 GC（log compaction）。该操作 **必须最先执行**，否则无法保证数据完整性。

```sh
## bjsrv-account
>>> add_dup account_xiaomi tjsrv-account --freezed
```

接着每个分片都会记录**当前确认点（confirmed_decree）**，并持久化到 MetaServer 上。
注意需等待所有的分片都将当前确认点更新至MetaServer后，才可进行下一步操作，这是该功能正确性的前提。

`confirme_decree` 值为 -1 即表示该分片的确认点尚未同步。

```
>>> query_dup -d account_xiaomi 1535008534
>>> {"dupid":1548442533,"status":"DS_START","remote":"c4srv-feedhistory","create_ts":1548442533763,"progress":[{"pid":0,"confirmed":-1},{"pid":1,"confirmed":276444333},{"pid":2,"confirmed":-1},{"pid":3,"confirmed":-1},{"pid":4,"confirmed":-1},{"pid":5,"confirmed":-1},{"pid":6,"confirmed":-1},{"pid":7,"confirmed":279069949},{"pid":8,"confirmed":-1}}

>>> query_dup -d account_xiaomi 1535008534
>>> {"dupid":1548442533,"status":"DS_START","remote":"c4srv-feedhistory","create_ts":1548442533763,"progress":[{"pid":0,"confirmed":276444111},{"pid":1,"confirmed":276444333},{"pid":2,"confirmed":276444332},{"pid":3,"confirmed":276444222},{"pid":4,"confirmed":276444111},{"pid":5,"confirmed":276444377},{"pid":6,"confirmed":276444388},{"pid":7,"confirmed":279069949},{"pid":8,"confirmed":276444399}}
```

### 执行步骤2,3

使用冷备份功能将数据快照上传至远端存储，再使用恢复功能在目标集群（tjsrv-account）恢复该表。示例命令如下：

```
# 立刻对表（app_id = 12）进行冷备
./run.sh shell -n bjsrv-account
>>> add_backup_policy -p dup_transfer -b fds_wq -a 12 -i 86400 -s 12:01 -c 1

# 耐心等待备份生成
>>> query_backup_policy -p dup_transfer
policy_info:
    name                 : dup_transfer
    backup_provider_type : fds_wq
    backup_interval      : 86400s
    app_ids              : {12}
    start_time           : 12:01
    status               : enabled
    backup_history_count : 1
backup_infos:
[1]
    id         : 1541649698875
    start_time : 2018-11-08 12:01:38
    end_time   : 2018-11-08 12:03:51
    app_ids    : {60}

# 在天津机房恢复表
./run.sh shell -n tjsrv-account
>>> restore_app -c bjsrv-account -p dup_transfer -a account_xiaomi -i 12 -t 1541649698875 -b fds_wq
```

### 执行步骤4

现在我们启动热备份。

```
# 开启日志复制
>>> start_dup account_xiaomi <dupid>

# 至此热备份已经完全可用。
```

当 `start_dup` 时，热备份任务会从之前记录的确认点开始复制，这样我们就保证了写增量的完整性。

另外需注意的是，由于写增量的长时间堆积，一时可能有大量日志复制，热备份流量会突增，从而导致服务不稳定。因此，我们需要在远端机房设置[限流（write throttling）](/_docs/zh/administration/throttling.md)。

```
>>> get_app_envs
get app envs succeed, count = 7
=================================
replica.write_throttling = 30000*delay*100,40000*reject*200
=================================
```

## 热备份的可靠性

### 自动故障处理

热备份是一个集成在ReplicaServer中的一个在线服务，因而我们对该功能的可靠性有较高的要求。
为应对在热备份过程中可能发生的各种故障，我们提供了几种故障处理的选项：

- ***fail-slow***：在这种故障处理模式下，热备份对任何故障都会**无限地重试**。我们的运维人员需要对一些关键监控项设置报警，从而可以获知故障的发生。这是Pegasus的**默认故障处理模式**。

- ***fail-skip***：遇到故障时，重试多次仍不成功后，直接跳过对当前这批数据的热备份，从而复制下一批数据。这适合那些**可容忍数据丢失**的业务场景。该选项通过数据丢失换得更好的可用性。

操作命令：

```
set_dup_fail_mode <app_name> <dupid> <slow|skip>
```

### 重要监控

在热备份的运维中，我们建议观察几个核心监控，以持续留意服务情况：

- `collector*app.pegasus*app.stat.dup_failed_shipping_ops#<app_name>`：有多少写复制RPC遇到失败。失败往往意味着远端集群或跨集群网络存在不可用。

- `replica*app.pegasus*dup.time_lag_ms@<app_name>`：P99的数据复制延迟。即源集群的一条写过了多长时间才到达目的集群。

- `replica*app.pegasus*dup.lagging_writes@<app_name>`：当前有多少写花费了过长的时间才到达目的集群。我们可以配置一个阈值，耗时超过该阈值的一条复制会被记录一次：

  ```ini
  [pegasus.server]
    dup_lagging_write_threshold_ms = 10000
  ```

- `replica*eon.replica_stub*dup.pending_mutations_count`：当前有多少写堆积在源集群，且尚未复制。如果一切正常，该监控项会稳定维持在某个值上下。当热备份的某个环节出现故障时，往往会有大量的写堆积，该值会持续上涨。

- `replica*eon.replica_stub*dup.load_file_failed_count`：源集群读取日志文件的失败次数。日志文件的读取是热备份的关键环节，如果该环节因某种原因出现故障，则会导致热备份被阻塞。

## 热备份的元信息

热备份的元信息会经由 MetaServer 持久化于 Zookeeper 上，其存储路径如下：

```
                                    <cluster_root>                     <app_id>          <dupid>
                                          |                                |                |
                                          |                                |                |
[zk: 127.0.0.1:22181(CONNECTED) 0] get /pegasus/bjsrv-account/0.0.x.x/apps/1/duplication/1537336970 

{"remote":"tjsrv-account","status":"DS_START","create_timestamp_ms":1537336970483}
```

## 完整配置项列表

```ini
[replication]
  # 如果遇到紧急情况想要手动关闭热备份，可以将该项设置为 false，默认为 true。
  duplication_enabled = true

[pegasus.clusters]
  # 开启热备份的集群必须配置目的集群的具体地址：
  tjsrv-account = 127.0.0.1:51601,127.0.0.1:51601

[pegasus.server]
  dup_lagging_write_threshold_ms = 10000

# 热备份的两个集群需要登记源集群和目的集群的“cluster_id”：
[duplication-group]
  tjsrv-account = 1
  bjsrv-account = 2
```

我们在每条数据前都会加上 `timestamp+cluster_id` 的前缀，timestamp 即数据写到 pegasus 的时间戳，cluster_id 即上面 duplication-group 中所配置的，tjsrv 的 cluster_id 为 1，bjsrv 的 cluster_id 为 2。

cluster_id 的作用是：一旦出现写冲突，例如 tjsrv 和 bjsrv 同时写 key `"user_1"`，系统首先会检查两次写的时间戳，以时间戳大的为最终值。当极罕见地遇到时间戳相同的情况时，以 cluster_id 大的为最终值。使用这种机制我们可以保证两集群的最终值一定相同。

## 完整监控项列表

| 监控项 |
|-------|
| `replica*eon.replica_stub*dup.log_read_bytes_rate` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.log_read_mutations_rate` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.shipped_bytes_rate` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.confirmed_rate` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.pending_mutations_count` (XiaoMi/rdsn#393) | 
| `replica*eon.replica_stub*dup.time_lag(ms)` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.load_file_failed_count` (XiaoMi/rdsn#425) |
| `replica*eon.replica*dup.disabled_non_idempotent_write_count@<app_name>` (XiaoMi/rdsn#411) |
| `replica*app.pegasus*dup_shipped_ops@<gpid>` (#399) |
| `replica*app.pegasus*dup_failed_shipping_ops@<gpid>` (#399) |
| `replica*app.pegasus*dup.time_lag_ms@<app_name>` #526 |
| `replica*app.pegasus*dup.lagging_writes@<app_name>` #526 |
| `collector*app.pegasus*app.stat.duplicate_qps#<app_name>` #520 |
| `collector*app.pegasus*app.stat.dup_shipped_ops#<app_name>` #520 |
| `collector*app.pegasus*app.stat.dup_failed_shipping_ops#<app_name>` #520 |

## 完整 HTTP 接口列表

- `http://0.0.0.0:34602/meta/app/duplication?name=temp`

- `http://0.0.0.0:34801/replica/duplication?appid=2`

## Known Limitations

- 热备份暂时不建议两机房同时写一份数据。在我们的业务经验看来，通常这是可以接受的。用户可以将数据均分在 tjsrv 和 bjsrv 两机房内，热备份能保证当任一机房宕机，只有数秒的数据丢失（假设机房之间网络稳定）。
