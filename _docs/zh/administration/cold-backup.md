---
permalink: administration/cold-backup
---

## 介绍

Pegasus的冷备份功能用来将Pegasus中的数据定期生成快照文件，并备份到其他存储介质上，从而为数据容灾多提供一层保障。但由于备份的是某个时间点的数据快照文件，所以冷备份并不保证可以保留所有最新的数据，也就是说，恢复的时候可能会丢失最近一段时间的数据。

具体来看，冷备份过程要涉及到如下一些参数：

* 存储介质(backup_provider): 指其他的文件存储系统或服务，如本地文件系统或者HDFS。
* 数据冷备份的周期(backup_interval)：周期的长短决定了备份数据的覆盖范围。如果周期是1个月，那么恢复数据时，就可能只恢复一个月之前的数据。但如果周期设的太短，备份就会太频繁，从而使得备份开销很大。在小米内部，冷备份的周期通常是1天。
* 保留的冷备份个数(backup_history_count)：保留的备份个数越多，存储的空间开销就越大。在小米内部，一般保留最近的3个冷备份。
* 进行冷备份的表的集合(backup_app_ids)：并不是所有的表都值得进行冷备份。在小米内部，对于经常重灌全量数据的表，我们是不进行冷备份的。

在Pegasus中，以上这几个参数的组合称为一个冷备份策略(backup_policy)。数据的冷备份就行按照policy为单位进行的。

## 存储介质

目前Pegasus支持本地文件系统和FDS两种冷备份介质。如果需要支持更多的存储介质(如S3)，请联系我们或者直接把pull request砸过来。

### FDS

FDS是小米生态云提供的存储产品，目前仅面向小米的生态链业务开放。更多详细的介绍[请戳这里](https://cnbj6.cloud.mi.com/#/index/product/fds?_k=rq2znr)。

### 本地文件系统

通过使用Pegasus本地文件系统(local service)的备份接口，可以把Pegasus的数据备份到某个目录下。如果第三方存储介质支持以nfs或者Linux Fuse的方式挂载到本地某个目录下的话，该介质就可以通过local service来作为pegasus的备份介质。目前HDFS就是通过fuse的方式来支持的。

我们接下来会以本地文件系统为例，介绍冷备的创建和恢复的相关操作。然后，我们会介绍如何用fuse的方式将HDFS挂载到本地目录下。

## 怎样开始冷备份

### 配置
需要先设定一些参数来配置系统的冷备份功能：

1. 配置 [meta_server].cold_backup_disable ：

   ```
   [meta_server]
   ...
   ;; 设置为false, 不然冷备份功能不会打开
   cold_backup_disabled = false
   ...
   ```

2. 配置 [apps.meta].pools 和 [apps.replica].pools ：

   ```
   [apps.meta]
   ...
   ;; 需增加THREAD_POOL_LOCAL_SERVICE，不然会没有可用的线程池而coredump
   pools = ...,THREAD_POOL_LOCAL_SERVICE
   
   [apps.replica]
   ...
   ;; 需增加THREAD_POOL_LOCAL_SERVICE，不然会没有可用的线程池而coredump
   pools = ...,THREAD_POOL_LOCAL_SERVICE
   ```

3. 配置 [replication].cold_backup_root 和 [replication].max_concurrent_uploading_file_count ：

   ```
   [replication]
   ;; 这个参数指定了冷备数据要保存到存储介质的什么文件夹下，一般建议填写集群名字
   cold_backup_root = onebox
   ;; 这个参数指定了冷备份上传文件的并发数，根据自己的网络情况进行设置，建议参数为5
   max_concurrent_uploading_file_count = 5
   ```

4. 添加或修改 [block_service.xxxx] 配置段：

   ```
   ;; 这样的一个section, 就指定了一种存储介质。可以按照自己的需求添加
   [block_service.my_backup_media]
   ;; 指定这种存储介质使用的存储接口是local_service
   type = local_service
   ;; 存储介质的初始化参数。对于local_service, 该参数要设置成一个本地目录，表示所有的备份全在此目录下。
   args = /home/weijiesun/pegasus_cold_backup
   ```

在上面的配置中，一定要区分清楚[replication].cold_backup_root和[block_service.my_backup_media].args所配置的两个路径：
* 前者指定了数据在某种存储介质下的存放目录。
* 后者是存储介质本身的初始化参数，是和type相关的。对于local_service而言，这个参数是一个绝对路径。换种说法，**本地文件系统的某个目录**，就是一种存储介质。
* 对于当前的配置情况而言，冷备数据会保存到`/home/weijiesun/pegasus_cold_backup/onebox`这个目录下。

### 创建冷备份策略

通过[Shell工具的add_backup_policy命令](/_docs/zh/tools/shell.md#冷备份管理)可以创建一个冷备份策略：

```
>>> add_backup_policy -p policy1 -b my_backup_media -a 1 -i 300 -s 16:00 -c 3
add backup policy succeed, policy_name = policy1
```

几个参数的含义如下：
* -p: policy的名字，创建后就不能修改，某个集群只能有唯一的名字
* -b: 存储介质的名称。系统会按指定的名称寻找对应的section, 并初始化存储介质。在上例中，系统从[block_service.my_backup_media]这一配置section中进行初始化。
* -a: policy下app_id的集合。如果有多个，用逗号隔开。
* -i: 备份周期，以秒为单位。
* -s: 开始时间，精确到分钟。这个参数含义略显复杂，后文专门介绍。
* -c: 冷备份的保留个数

对于-s参数指定的备份开始时间，其含义和-i指定备份周期是有联系的
* 如果备份周期是86400秒，也就是一天。那么-s就表示备份每天的启动时间。
* 如果备份周期不是一整天。那么开始时间就代表的着第一次备份的开启时间点。而这个时间点，指的是当前时间朝后推的第一个相对的时间点。

比如上面的"-i 60 -s 8:00",就是说下次备份从8:00开始，然后每60秒开启一轮备份。而"-i 86400 -s 8:30"，指的是每天的8:30开启一轮备份。

对于-a参数指定的app_id。目前pegasus并没有强制约束某个app_id只能属于一个policy, 但原则上不建议把同一个表加到不同的policy中。

### 查询冷备份策略
可以用ls_backup_policy列举系统当前所有的策略：
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
```

也可以用query_backup_policy查询某个指定policy的信息：
```
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
如上图所示，当query某个特定的policy时，该policy下已经完成或正在进行的备份也会显示出来。

### 修改冷备份策略
冷备份策略的一些参数，可以用modify_backup_policy命令进行修改：
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
* app集合: 通过-a和-r参数进行增删app_id
* backup_interval: 通过-i修改周期
* start_time: 通过-s参数修改开始时间

### 禁用和重新开始冷备份策略

可以用disable_backup_policy和enable_backup_policy来对某个policy进行禁用和开启
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

对于我们配置好的local_service, 备份存在/home/weijiesun/pegasus_cold_backup/onebox的目录下。

这里稍微做展示，详细的文件内容大家可以自行翻看：
```
weijiesun@weijiesun-kubuntu ~/pegasus_cold_backup/onebox/policy1 $ pwd
/home/weijiesun/pegasus_cold_backup/onebox/policy1
weijiesun@weijiesun-kubuntu ~/pegasus_cold_backup/onebox/policy1 $ ls
1533802216079  1533802236170  1533802256259
```

## 从冷备中恢复数据

可以用restore_app从冷备中恢复表数据
```
>>> restore_app -c onebox -p policy1 -a temp -i 1 -t 1533802236170 -b my_backup_media -n result
sleep 1 second to wait complete...
        new app_id = 3
```
其中各个参数的含义如下（这些参数都可以通过在原集群上执行shell命令`query_backup_policy`得到）：
* -c：旧集群的名称
* -p：旧的policy名称
* -a：旧表名称
* -i：旧表的id
* -t：旧的备份的时间戳编号
* -b：存储介质名称
* -n：新表的名称，如果不指定就使用旧名字，如果和新的名字冲突则报错
* -s：是否跳过损坏的partition, 默认不跳过

对于恢复进度，可以用query_restore_status进行查看
```
>>> query_restore_status 3 -d
pid           progress(%)   restore_status
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

## 怎样将数据备份到HDFS

采用HDFS fuse即可，可以参考[这篇文章](https://www.jianshu.com/p/1beb5325c6d8)。
