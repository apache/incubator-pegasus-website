---
permalink: administration/cold-backup
---

## 介绍

Pegasus 的冷备份功能用来将 Pegasus 中的数据定期生成快照文件，并备份到其他存储介质上，从而为数据容灾多提供一层保障。但由于备份的是某个时间点的数据快照文件，所以冷备份只能保证某个时间点之前写入的数据，也就是说，恢复的时候可能会丢失最近一段时间新写入的数据。

冷备份功能主要涉及下列参数：

* 存储介质（backup_provider)：指其他的文件存储系统或服务，如本地文件系统或者 HDFS。
* 数据冷备份的周期（backup_interval)：周期的长短决定了备份数据的覆盖范围。如果周期是 1 个月，那么恢复数据时，就可能只恢复一个月之前的数据。但如果周期设的太短，备份就会太频繁，从而使得备份开销很大。在小米内部，冷备份的周期通常是 1 天。
* 保留的冷备份个数（backup_history_count)：保留的备份个数越多，存储的空间开销就越大。在工程实践中，一般保留最近的 3 个冷备份。
* 进行冷备份的表的集合（backup_app_ids)：并不是所有的表都值得进行冷备份。在工程实践中，对于经常重灌全量数据的表，我们是不进行冷备份的。

在 Pegasus 中，以上这几个参数的组合称为一个冷备份策略（backup_policy)。数据的冷备份就行按照 policy 为单位进行的。

## 存储介质

目前 Pegasus 支持本地文件系统和 HDFS 两种冷备份介质。在2.5及之前的版本还支持FDS，但由于仅对小米的生态链业务开放，该特性在2.5后的社区版本被移除。此外，如果需要支持更多的存储介质（如 S3)，请联系我们或者直接把 pull request 砸过来。

我们接下来会以本地文件系统为例，介绍冷备的创建和恢复的相关操作。然后，我们会介绍如何用 fuse 的方式将 HDFS 挂载到本地目录下。



### 本地文件系统

通过使用 Pegasus 本地文件系统（local service）的备份接口，可以把 Pegasus 的数据备份到某个目录下。



### HDFS

如果第三方存储介质支持以 nfs 或者 Linux Fuse 的方式挂载到本地某个目录下的话，该介质就可以通过 local service 来作为 pegasus 的备份介质。HDFS 就是通过 fuse 的方式来支持的。



### FDS

FDS 是小米生态云提供的存储产品，目前仅面向小米的生态链业务开放，故不做过多介绍。更多详细的介绍 [请戳这里](https://cnbj6.cloud.mi.com/#/index/product/fds?_k=rq2znr)。



## 怎样开始冷备份

### 配置
需要先设定一些参数来配置系统的冷备份功能：

1. 配置 [meta_server].cold_backup_disable ：

   ```
   [meta_server]
   ...
   ;; 设置为 false, 不然冷备份功能不会打开
   cold_backup_disabled = false
   ...
   ```2. 配置 [apps.meta].pools 和 [apps.replica].pools ：```
   [apps.meta]
   ...
   ;; 需增加 THREAD_POOL_LOCAL_SERVICE，不然会没有可用的线程池而 coredump
   pools = ...,THREAD_POOL_LOCAL_SERVICE
   
   [apps.replica]
   ...
   ;; 需增加 THREAD_POOL_LOCAL_SERVICE，不然会没有可用的线程池而 coredump
   pools = ...,THREAD_POOL_LOCAL_SERVICE
   ```3. 配置 [replication].cold_backup_root 和 [replication].max_concurrent_uploading_file_count ：```
   [replication]
   ;; 这个参数指定了冷备数据要保存到存储介质的什么文件夹下，一般建议填写集群名字
   cold_backup_root = onebox
   ;; 这个参数指定了冷备份上传文件的并发数，根据自己的网络情况进行设置，建议参数为 5
   max_concurrent_uploading_file_count = 5
   ```4. 添加或修改 [block_service.xxxx] 配置段：```
   ;; 这样的一个 section, 就指定了一种存储介质。可以按照自己的需求添加
   [block_service.my_backup_media]
   ;; 指定这种存储介质使用的存储接口是 local_service
   type = local_service
   ;; 存储介质的初始化参数。对于 local_service, 该参数要设置成一个本地目录，表示所有的备份全在此目录下。
   args = /home/weijiesun/pegasus_cold_backup
   ```

在上面的配置中，一定要区分清楚 [replication].cold_backup_root 和 [block_service.my_backup_media].args 所配置的两个路径：
* 前者指定了数据在某种存储介质下的存放目录。
* 后者是存储介质本身的初始化参数，是和 type 相关的。对于 local_service 而言，这个参数是一个绝对路径。换种说法，**本地文件系统的某个目录**，就是一种存储介质。
* 对于当前的配置情况而言，冷备数据会保存到 `/home/weijiesun/pegasus_cold_backup/onebox` 这个目录下。

### 创建冷备份策略

通过 [Shell 工具的 add_backup_policy 命令](/overview/shell# 冷备份管理) 可以创建一个冷备份策略：

```
>>> add_backup_policy -p policy1 -b my_backup_media -a 1 -i 300 -s 16:00 -c 3
add backup policy succeed, policy_name = policy1
```

几个参数的含义如下：
* -p：policy 的名字，创建后就不能修改，某个集群只能有唯一的名字
* -b：存储介质的名称。系统会按指定的名称寻找对应的 section, 并初始化存储介质。在上例中，系统从 [block_service.my_backup_media] 这一配置 section 中进行初始化。
* -a：policy 下 app_id 的集合。如果有多个，用逗号隔开。
* -i：备份周期，以秒为单位。
* -s：开始时间，精确到分钟。这个参数含义略显复杂，后文专门介绍。
* -c：冷备份的保留个数

对于 -s 参数指定的备份开始时间，其含义和 -i 指定备份周期是有联系的
* 如果备份周期是 86400 秒，也就是一天。那么 -s 就表示备份每天的启动时间。
* 如果备份周期不是一整天。那么开始时间就代表的着第一次备份的开启时间点。而这个时间点，指的是当前时间朝后推的第一个相对的时间点。

比如上面的 "-i 60 -s 8:00", 就是说下次备份从 8:00 开始，然后每 60 秒开启一轮备份。而 "-i 86400 -s 8:30"，指的是每天的 8:30 开启一轮备份。

对于 -a 参数指定的 app_id。目前 pegasus 并没有强制约束某个 app_id 只能属于一个 policy, 但原则上不建议把同一个表加到不同的 policy 中。

### 查询冷备份策略
可以用 ls_backup_policy 列举系统当前所有的策略：
```
>>> ls_backup_policy
[1]
    name                 : another_policy
    backup_provider_type : my_backup_media
    backup_interval      : 600s
    app_ids              : {2}
    start_time           : 16:10
    status               : enabled
    backup_history_count : 2

[2]
    name                 : policy1
    backup_provider_type : my_backup_media
    backup_interval      : 300s
    app_ids              : {1}
    start_time           : 16:00
    status               : enabled
    backup_history_count : 3


ls backup policy succeed
```也可以用 query_backup_policy 查询某个指定 policy 的信息：```
>>> query_backup_policy -p policy1
policy_info:
    name                 : policy1
    backup_provider_type : my_backup_media
    backup_interval      : 300s
    app_ids              : {1}
    start_time           : 16:00
    status               : enabled
    backup_history_count : 3

backup_infos:
[1]
    id         : 1533801635364
    start_time : 2018-08-09 16:00:35
    end_time   : 2018-08-09 16:01:15
    app_ids    : {1}

query backup policy succeed
```
如上图所示，当 query 某个特定的 policy 时，该 policy 下已经完成或正在进行的备份也会显示出来。

### 修改冷备份策略
冷备份策略的一些参数，可以用 modify_backup_policy 命令进行修改：
```
>>> modify_backup_policy -p policy1 -s 17:00 -i 600
Modify policy result: ERR_OK
>>> query_backup_policy -p policy1
policy_info:
    name                 : policy1
    backup_provider_type : my_backup_media
    backup_interval      : 600s
    app_ids              : {1}
    start_time           : 17:00
    status               : enabled
    backup_history_count : 3

backup_infos:
.....
query backup policy succeed
```
可以修改的参数有：
* app 集合：通过 -a 和 -r 参数进行增删 app_id
* backup_interval：通过 -i 修改周期
* start_time：通过 -s 参数修改开始时间

### 禁用和重新开始冷备份策略

可以用 disable_backup_policy 和 enable_backup_policy 来对某个 policy 进行禁用和开启
```
>>> disable_backup_policy -p policy1
disable policy result: ERR_OK
>>> ls_backup_policy
..........
[2]
    name                 : policy1
    backup_provider_type : my_backup_media
    backup_interval      : 600s
    app_ids              : {1}
    start_time           : 17:00
    status               : disabled
    backup_history_count : 3


ls backup policy succeed
>>> enable_backup_policy -p policy1
enable policy result: ERR_OK
>>> ls_backup_policy
......
[2]
    name                 : policy1
    backup_provider_type : my_backup_media
    backup_interval      : 600s
    app_ids              : {1}
    start_time           : 17:00
    status               : enabled
    backup_history_count : 3


ls backup policy succeed
>>>
```

### 查看备份的结果

对于我们配置好的 local_service, 备份存在 /home/weijiesun/pegasus_cold_backup/onebox 的目录下。

这里稍微做展示，详细的文件内容大家可以自行翻看：
```
weijiesun@weijiesun-kubuntu ~/pegasus_cold_backup/onebox/policy1 $ pwd
/home/weijiesun/pegasus_cold_backup/onebox/policy1
weijiesun@weijiesun-kubuntu ~/pegasus_cold_backup/onebox/policy1 $ ls
1533802216079  1533802236170  1533802256259
```

## 从冷备中恢复数据

可以用 restore_app 从冷备中恢复表数据
```
>>> restore_app -c onebox -p policy1 -a temp -i 1 -t 1533802236170 -b my_backup_media -n result
sleep 1 second to wait complete...
        new app_id = 3
```
其中各个参数的含义如下（这些参数都可以通过在原集群上执行 shell 命令`query_backup_policy` 得到）：
* -c：旧集群的名称
* -p：旧的 policy 名称
* -a：旧表名称
* -i：旧表的 id
* -t：旧的备份的时间戳编号
* -b：存储介质名称
* -n：新表的名称，如果不指定就使用旧名字，如果和新的名字冲突则报错
* -s：是否跳过损坏的 partition, 默认不跳过

对于恢复进度，可以用 query_restore_status 进行查看
```
>>> query_restore_status 3 -d
pid           progress (%)   restore_status
0             100           ok
1             100           ok
2             100           ok
3             100           ok
4             100           ok
5             100           ok
6             100           ok
7             100           ok

the overall progress of restore is 100%

annotations:
    ok : mean restore complete
    ongoing : mean restore is under going
    skip : data on cold backup media is damaged, but skip the damaged partition
    unknown : invalid, should login server and check it
```



## 怎样将数据备份到 HDFS

我们采用 HDFS fuse 的方式，具体可以参考 [这篇文章](https://www.jianshu.com/p/1beb5325c6d8)。

在生产实践中，我们会在集群配置中block_service的类型和连接方式，然后通过admin client中的backup命令发送RPC进行单次冷备。具体步骤如下：

```
1. 在 config.ini 中配置 block_service 的类型
[block_service.hdfs_example1]
type = hdfs_service
args = hdfs://hdfs_example1-hadoop /

2. 启动集群

3. 在源集群使用admin-cli 执行命令连接集群
 ./admin-cli -m 10.xxx.xxx.5:33601,10.xxx.xxx.6:33601
 
4. 根据需求开启限速
server-config replica hdfs_write_batch_size_bytes set 524288

5. 指定冷备份目标路径，执行备份命令。三个参数分别为表id、hdfs位置、hdfs路径
backup 4 hdfs_example1 /user/pegasus/backup

6. 查询冷备进度。两个参数分别为表id、backup id
query-backup-status 4 1697508662432 
```



### restore恢复HDFS上的冷备份数据

1. 同样使用admin-cli连接目标集群，使用命令查看限速

   ```
   >> server-config replica list
   
   // 查看参数
   >> hdfs_read_batch_size_bytes=67108864
   
   // 通过调整hdfs_read_limit_rate_megabytes，进行限速。单位为MB
   >> hdfs_read_limit_rate_megabytes=100
   ```

2. 执行命令进行restore

   参数说明：-c 为源集群名称，-a 为旧表名称，-i 为旧表id，-t 为backup id，-b 为hdfs位置，-r 为hdfs路径。

   ```
   // 目标集群不能存在表名相同的表
   restore -c your_cluster_name -a your_table_name -i 4 -t 1697508662432 -b hdfs_example1 -r /user/pegasus/backup
   ```

   

