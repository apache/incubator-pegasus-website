---
title: 跨机房同步
layout: page
menubar: administration_menu
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

这里需要注意的是，跨机房同步是**异步**的数据复制，并非完全实时。与单机房不同，我们不提供跨机房 *read-after-write* 的一致性保证。目前在跨机房网络健康的环境下，数据延时大概在 10s 左右，即 A 机房的写数据大概在 10s 后会写入 B 机房。

## Get Started

假设我们有两个 pegasus 集群 _bjsrv-account_ 和 _tjsrv-account_ 分别位于北京与天津的两个机房内，表 `account_xiaomi` 由于存储了极其关键的用户帐号数据，需要能够在双集群保证可用，所以我们为它实施热备份：

```
./run.sh shell -n bjsrv-account

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

热备份使用日志异步复制的方式来实现跨集群的同步，可与 mysql 的 binlog 复制和 hbase replication 类比。每个 replica 单独发送自己的日志到远端集群上，保证了 replica 之间互不干扰。

热备份的两集群的表名需要保持一致，但 partition 的个数不需要相同。例如用户可以建表如下：
```
>>> cc bjsrv-account
>>> create account_xiaomi -p 128
>>>
>>> cc tjsrv-account
>>> create account_xiaomi -p 32
```

## 线上表开启热备

有时一个线上表可能在设计之初未考虑到跨机房同步的需求，而在服务一段时间后，才决定进行热备份。此时我们需要进行全量数据拷贝，例如将 bj 已有的全部数据复制到 tj。因为是线上表，拷贝过程中**不可以停止服务**，同时拷贝过程中的**写增量数据也不能丢**。

面对这个需求，我们的思路是：首先 bj 保留从此刻开始的所有写增量（即 wal），将 bj 的全量快照（冷备份）上传至 HDFS / xiaomi-FDS 上，然后恢复到 tj。此后 bj 开启热备份，并重放此前堆积的写增量，复制到远端 tj 机房。

如何保留写增量？pegasus 如此进行操作：

- 首先使用 `add_dup [--freezed/-f]` 表示不进行日志复制，它的原理就是阻止当前日志 GC（log compaction）。该操作 **必须最先执行**，否则无法保证数据完整性。

```
>>> cc bjsrv-account
>>> add_dup account_xiaomi tjsrv-account --freezed
```

- 虽然不进行复制，但每个分片都会记录**当前确认点（confirmed_decree）**（初始为 `private_log->max_committed_decree`），并持久化到 meta server 上。注意需等待所有的 replica 都将当前确认点更新至 meta server 后，才可进行下一步操作，这是该功能正确性的前提。

confirme_decree 值为 -1 即表示该分片的确认点尚未同步。

```
>>> query_dup_detail account_xiaomi 1535008534
>>> {"dupid":1548442533,"status":"DS_START","remote":"c4srv-feedhistory","create_ts":1548442533763,"progress":[{"pid":0,"confirmed":-1},{"pid":1,"confirmed":276444333},{"pid":2,"confirmed":-1},{"pid":3,"confirmed":-1},{"pid":4,"confirmed":-1},{"pid":5,"confirmed":-1},{"pid":6,"confirmed":-1},{"pid":7,"confirmed":279069949},{"pid":8,"confirmed":-1}}
>>> query_dup_detail account_xiaomi 1535008534
>>> {"dupid":1548442533,"status":"DS_START","remote":"c4srv-feedhistory","create_ts":1548442533763,"progress":[{"pid":0,"confirmed":276444111},{"pid":1,"confirmed":276444333},{"pid":2,"confirmed":276444332},{"pid":3,"confirmed":276444222},{"pid":4,"confirmed":276444111},{"pid":5,"confirmed":276444377},{"pid":6,"confirmed":276444388},{"pid":7,"confirmed":279069949},{"pid":8,"confirmed":276444399}}
```

- 使用冷备份将数据快照上传至远端存储，再使用恢复功能在 tjsrv-account 恢复该表。示例命令如下：

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

# 开启日志复制
>>> start_dup account_xiaomi <dupid>

# 至此热备份已经完全可用。
```

当 `start_dup` 时，热备份任务会从之前的确认点开始复制，这样我们就保证了写增量的完整性。

另外需注意的是，由于写增量的长时间堆积，一时可能有大量日志复制，热备份流量会突增，从而导致服务不稳定。因此，我们需要在远端机房设置限流（write throttling）。

```
>>> get_app_envs
get app envs succeed, count = 7
=================================
replica.write_throttling = 30000*delay*100,40000*reject*200
=================================
```

### 元信息存储

热备份的元信息会经由 meta server 持久化于 zookeeper 上，其存储路径如下：

```
                                    <cluster_root>                     <app_id>          <dupid>
                                          |                                |                |
                                          |                                |                |
[zk: 127.0.0.1:22181(CONNECTED) 0] get /pegasus/bjsrv-account/0.0.x.x/apps/1/duplication/1537336970 

{"remote":"tjsrv-account","status":"DS_START","create_timestamp_ms":1537336970483}
```

## 配置项

- `duplication_enabled`：如果遇到紧急情况想要手动关闭热备份，可以将该项设置为 false，默认为 true。

- 开启热备份的集群必须配置远端机房的具体地址

```
  [pegasus.clusters]
     tjsrv-account = 127.0.0.1:51601,127.0.0.1:51601
```

- 热备份要求 `allow_non_idempotent_write` 必须为 false（默认值）。因为开启热备份的集群 **不支持 “幂等操作”** 如 CHECK_AND_MUTATE, CHECK_AND_SET，INCR 等。

- 如果有多机房同时写的需求，配置 `verify_timetag` 需修改为 true ：
```
  [pegasus.server]
    verify_timetag = true
```

- 热备份的集群需要登记其 cluster_id：

```
  # Configuration for cluster_id.
  # This is required for every cluster that enables duplication.
  [duplication-group]
    tjsrv-account = 1
    bjsrv-account = 2
```

我们在每条数据前都会加上 `timestamp+cluster_id` 的前缀，timestamp 即数据写到 pegasus 的时间戳，cluster_id 即上面 duplication-group 中所配置的，tjsrv 的 cluster_id 为 1，bjsrv 的 cluster_id 为 2。

cluster_id 具有两个作用：

一旦出现写冲突，例如 tjsrv 和 bjsrv 同时写 key `"user_1"`，系统首先会检查两次写的时间戳，以时间戳大的为最终值。当极罕见地遇到时间戳相同的情况时，以 cluster_id 大的为最终值。使用这种机制我们可以保证两集群的最终值一定相同。

cluster_id 的另一个作用就是保证热备份不会

## 相关监控项

| 监控项 | 描述 |
|-------|-----|
| dup.log_read_in_bytes_rate | |
| dup.log_mutations_read_rate | |
| dup.shipped_size_in_bytes_rate | |
| dup.time_lag(ms) | |
| dup.shipped_ops | |
| dup.failed_shipping_ops | |
| duplicated_put_qps | |
| duplicated_remove_qps | |
| duplicated_multi_put_qps | |
| duplicated_multi_remove_qps | |

## Known Limitations

- 热备份暂时不建议两机房同时写一份数据。在我们的业务经验看来，通常这是可以接受的。用户可以将数据均分在 tjsrv 和 bjsrv 两机房内，热备份能保证当任一机房宕机，只有数秒的数据丢失（假设机房之间网络稳定）。
