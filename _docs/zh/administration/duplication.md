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

这里需要注意的是，跨机房同步是**异步**的数据复制，并非完全实时。与单机房不同，该功能不提供跨机房 *read-after-write* 的一致性保证。目前在跨机房网络健康的环境下，对于备集群而言，数据延时大概在秒级左右，但具体表现与写入流量大小有关。经测试，写入小于1KB的数据的延时在1秒内，即 A 机房的写数据大概在1秒后会写入 B 机房。

## 操作上手

假设我们有两个 pegasus 集群 `bjsrv-account` (源集群)和 `tjsrv-account`(目标集群)，分别位于北京与天津的两个机房内，表 `my_source_app` 由于存储了极其关键的用户帐号数据，需要能够在双集群保证可用，所以我们为它实施热备份：

```
#The cluster name is: bjsrv-account
#The cluster meta list is: ******

>./admin-cli -m ****** //use meta list to connect cluster

>>> ls
app_id    status              app_name
12        AVAILABLE           my_source_app

>>> use my_source_app
>>> dup add -c my_target_cluster -p
successfully add duplication [dupid: 1669972761]

>>> dup list 
[
  {
    "dupid": 1692240106,
    "status": "DS_LOG",
    "remote": "tjsrv-account",
    "create_ts": 1692240106066,
    "fail_mode": "FAIL_SLOW"
  }
]
```

通过 `dup add` 命令，bjsrv-account 集群的表 my_source_app 将会近实时地把数据复制到 tjsrv-account 上，这意味着，每一条在北京机房的写入，最终都一定会复制到天津机房。

热备份使用日志异步复制的方式来实现跨集群的同步，可与 MySQL 的 binlog 复制和 HBase replication 类比。

热备份功能**以表为粒度**，你可以只对集群内一部分表实施热备份。热备份的两集群的表名需要保持一致，但 partition 的个数不需要相同。例如用户可以建表如下：

```sh
## bjsrv-account
>>> create my_source_app -p 128

## tjsrv-account
>>> create my_source_app -p 32
```

## 线上表开启热备份

有时一个线上表可能在设计之初未考虑到跨机房同步的需求，而在服务一段时间后，才决定进行热备份。此时我们需要将源集群已有的全部数据复制到目的集群。因为是线上表，我们要求拷贝过程中：

1. **不可以停止服务**
2. 拷贝过程中的**写增量数据不能丢失**

面对这个需求，我们的操作思路是：

1. 首先源集群**保留从此刻开始的所有写增量**（即WAL日志）
2. 将源集群的全量快照（存量数据）移动到指定路径下，等待备集群(目标集群)对这些数据进行学习learn。
3. 目标集群将存量数据学习完成后，利用学来的存量数据构建表。构建完成后，告知源集群进入WAL日志发送阶段。
4. 此后源集群开启热备份，并复制此前堆积的写增量，发送到远端目标集群。         

| master cluster                                               |                                                              | follower cluster                                             |                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| meta                                                         | primary                                                      | primary                                                      | meta                                                         |
|                                                              | 0.replica server在初始化时会进行周期性RPC的任务创建，进行replica server与meta之间的热备信息通信 |                                                              |                                                              |
| 0.收到replica server发送的RPC，汇总热备任务和进度，回复replica server |                                                              |                                                              |                                                              |
| 1.发起添加表的热备任务的请求add_duplication，增加相关dup_info |                                                              |                                                              |                                                              |
| 2.**进入状态 DS_PREPARE**，同步checkpoint点                  | 3.得知meta上的新dup_info，创建replica_duplicator类，调用**trigger_manual_emergency_checkpoint**生成checkpoint。 |                                                              |                                                              |
| 4.得到replica server报告全部checkpoint生成完毕，开始创建备用集群的表create_follower_app_for_duplication | --> -->--> RPC_CM_CREATE_APP->-->                            | --> -->--> --> 携带主表信息--> --> --> -->                   | 5.接到RPC_CM_CREATE_APP请求，开始创建表。duplicate_checkpoint |
|                                                              | <-- <-- <-- <-- <-- <-- <-- <-- <-- <-- <-- <-- <-           | <-- <-- <-- <--建表成功 返回ERR_OK <-- <-                    | 6.使用主表checkpoint初始化。发送拉取checkpoint的请求。底层调用nfs copy的方法async_duplicate_checkpoint_from_master_replica |
| 7.接收到ERR_OK的返回，**进入DS_APP状态**                     |                                                              |                                                              |                                                              |
| 8.下一轮通讯中，在DS_APP状态下检查创建完成的表。无误后，**进入DS_LOG状态**check_follower_app_if_create_completed |                                                              |                                                              |                                                              |
|                                                              | 9.replica server首次得知status已经切换到DS_LOG，开始热备plog部分数据start_dup_log |                                                              |                                                              |
|                                                              | 10.load重放加载日志  ship打包发送                            | 11.作为服务端接收ship的包，解包并根据具体包含的RPC类型处理pegasus_write_service::duplicate |                                                              |





下面介绍给一张线上表开启具体的热备所需的步骤

### 执行步骤1 集群热备参数设置

主备集群两边的replication与duplication-group项下**相关参数须保持一致**。其中，主集群指同步数据的发送方，备集群指接收方。

主集群配置示例：

```Shell
[replication]
  duplication_enabled = true
  duplicate_log_batch_bytes = 4096 # 0意味着不做batch处理，一般设置为4096即可，该配置可以通过admin-cli的server-config动态修改

[pegasus.clusters]
  # 开启热备份的主集群必须配置备集群的具体meta server地址：
  tjsrv-account = xxxxxxxxx

# 热备份的两个集群需要登记源集群和目的集群的“cluster_id”：
  [[duplication-group]]
  bjsrv-account = 1
  tjsrv-account = 2
```



备集群配置示例：

```Shell
[replication]
  duplication_enabled = true
  duplicate_log_batch_bytes = 4096 # 0意味着不做batch处理，一般设置为4096即可，该配置可以通过admin-cli的server-config动态修改

[pegasus.clusters]
  # 备集群的这一项可以不额外增加配置
  
# 热备份的两个集群需要登记源集群和目的集群的“cluster_id”：
  [[duplication-group]]
  bjsrv-account = 1
  tjsrv-account = 2
```



### 执行步骤2 按需接入域名proxy系统 (可选)

跨机房热备的主要目的是提供机房级容灾，为了提供跨机房切换流量的能力，在内部使用中需要热备的业务必须接入meta-proxy。

meta-proxy的逻辑是客户端访问proxy，proxy去zookeeper上找对应表的路径，获得一个真实的集群meta地址，然后再访问这个meta。meta-proxy在ZK上的路径配置是表级别的，所以要注意一个region内最好不要有不同业务的同名表。

当然如果业务侧可以自己修改meta地址，是可以不接入域名proxy系统的。



### 执行步骤3 开启热备

在开启热备前，需要考虑好本次热备是同步表的全部数据(全量数据同步)还是只需要同步此刻开始(增量同步)。

1. 如果进行表的全量数据拷贝，则需要拷贝的数据分为两部分，存量数据的checkpoint+增量写入的数据。在admin-cli中，使用dup add命令时增加`-p`参数，pegasus duplication即可生成checkpoint同步到备集群。需要注意的是，在这种情况下备集群不能存在同名表，在duplication逻辑中，备集群会使用主集群同步过来的checkpoint创建与主集群表名一致的新表，随后接收主集群同步过来的增量数据。

2. 如果增量同步，不需要拷贝checkpoint（即仅同步增量数据），则需要确保备集群已经创建好同名表

```
# 以admin-cli命令为例
# dup add -c {集群名} -p {出现-p是全量同步，不带-p参数是增量同步}

>> use my_source_app
>> dup add -c tjsrv-account -p
successfully add duplication [dupid: 1669972761]
```



### 执行步骤4 暂停/重启/删除一个热备任务

```
# 注意：仅在DS_LOG 阶段可以暂停
>> dup pause/start/remove -d {dup的id，使用dup list 可以查看}
```

**注：pause后，没有发送的日志持续堆积。remove后，没有发送的日志直接被清零**。



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



## 热备相关配置项列表

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
  bjsrv-account = 1
  tjsrv-account = 2
  
```

我们在每条数据前都会加上 `timestamp+cluster_id` 的前缀，timestamp 即数据写到 pegasus 的时间戳，cluster_id 即上面 duplication-group 中所配置的，bjsrv-account集群的cluster_id 为 1，tjsrv-account集群的 cluster_id 为 2。

cluster_id 的作用是：一旦出现写冲突，例如 bjsrv-account 和 tjsrv-account 同时写 key `"user_1"`，系统首先会检查两次写的时间戳，以时间戳大的为最终值。当极罕见地遇到时间戳相同的情况时，以 cluster_id 大的为最终值。使用这种机制我们可以保证两集群的最终值一定相同。



## Known Limitations

- 热备份暂时不建议两机房同时写一份数据。在我们的业务经验看来，通常这是可以接受的。用户可以将数据均分在两个不同的机房内，热备份能保证当任一机房宕机，只有数秒的数据丢失（假设机房之间网络稳定）。
