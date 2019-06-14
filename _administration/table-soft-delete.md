---
title: Table软删除
layout: page
show_sidebar: false
menubar: administration_menu
---

# 功能目标
软删除主要用于防范数据被错误的永久删除。具体而言，软删除应该具有如下几个功能：
* 当用户删除某个指定的表后，该表变得不可访问。
* 被删除的表其数据不会立即物理清除，而是会保留一段时间。
* 被删除的表过期（超过保留时间）后，数据会从物理上做彻底的删除，以释放资源。
* 未过期的表可以通过一定的方式恢复，恢复成功后又可以像正常的表一样进行读写访问。

# 操作命令
shell端提供了`drop`和`recall`命令支持软删除。

## 使用drop命令删除表
使用方式：
```
drop                   <app_name> [-r|--reserve_seconds num]
```

drop命令用于删除一个表，通过`-r`选项指定数据的保留时间，从删除时间开始计算，单位为秒。如果不指定，则使用配置文件`hold_seconds_for_dropped_app`指定的值，默认为7天。

表删除成功后：
* 再次访问该表，将会返回`ERR_OBJECT_NOT_FOUND`，提示表不存在。
* 通过shell的`ls`命令看不到被删除的表。
* 通过shell的`ls -a`命令可以看到被删除的表。
* 被删除的表的ID不会被重用，以防止恢复时出现ID冲突。
* 表删除后，可以新建同名表，当客户端访问这个表名时，访问的是新表。

## 过期表数据的物理删除
过期表的数据在各个replica server上也未必能立即被物理删除，因为：
* 表的保留时间过期后，只有通过shell设置了`set_meta_level lively`，使meta server进入[负载均衡模式](rebalance#控制集群的负载均衡)，meta server才会通过`config_sync`RPC通知replica server删除相关的replica。而replica server在收到meta server的通知后，就会将需删除的replica文件夹通过添加`.gar`后缀进行重命名，表示这是可以被删除的垃圾数据。但此时数据仍未被真正物理删除。
* replica server会定期（配置文件`disk_stat_interval_seconds`）扫描各个数据文件夹（配置文件`data_dirs`），统计文件夹的使用情况。对于标记为`.gar`后缀的replica文件夹，获取其最后修改时间，并和当前时间进行比较，只有当两者时间差超过了阈值（配置文件`gc_disk_garbage_replica_interval_seconds`）后，在会将文件夹删除掉。此时数据才算被真正物理删除。

所以综上所述，能够影响表被删除后进行物理删除的时间点的配置项包括：
* `[meta_server] hold_seconds_for_dropped_app`：当drop表没有指定`-r`选项时，决定该表的保留时间。
* `[replication] disk_stat_interval_seconds`：replica server定期扫描各个数据文件夹的时间间隔。
* `[replication] gc_disk_garbage_replica_interval_seconds`：垃圾replica文件夹的最后修改时间距离当前时间超过这个阈值，文件夹才会被删除。

如果遇到需要紧急删除数据以释放磁盘空间，但是又不方便重启replica server更新配置的情况，可以根据表ID进行手工暴力删除，但是千万注意：
* 不到万不得已，不要进行手工暴力删表，避免误操作。
* 坚决只能删除**过期表**的数据。
* 不要误删其他表的数据。

## 使用recall命令恢复表
使用方式
```
recall                 <app_id> [new_app_name]
```

只要表的保留时间还没有过期，就能执行恢复：
* 恢复时需指定表ID。
* 可以指定新表名，如果不指定新表名，则会使用原表名。
* 如果原表名已存在（删表后新建了同名表），则必须指定另外一个不同的新表名，否则会失败。
* 恢复过程可能需要花费一段时间。

## 示例
以下是使用示例：删除mytable表，然后恢复成新表名mytable2
```
>>> ls
app_id    status              app_name            app_type            partition_count     replica_count       is_stateful         drop_expire_time    envs_count          
1         AVAILABLE           temp                pegasus             8                   3                   true                -                   0                   
2         AVAILABLE           mytable             pegasus             8                   3                   true                -                   0                   

list apps succeed

>>> drop mytable
reserve_seconds = 0
drop app mytable succeed

>>> ls
app_id    status              app_name            app_type            partition_count     replica_count       is_stateful         drop_expire_time    envs_count          
1         AVAILABLE           temp                pegasus             8                   3                   true                -                   0                   

list apps succeed

>>> ls -a
app_id    status              app_name            app_type            partition_count     replica_count       is_stateful         drop_expire_time    envs_count          
1         AVAILABLE           temp                pegasus             8                   3                   true                -                   0                   
2         DROPPED             mytable             pegasus             8                   3                   true                2018-07-28 19:07:21 0                   

list apps succeed

>>> recall 2 mytable2
recall app ok, id(2), name(mytable2), partition_count(8), wait it ready
mytable2 not ready yet, still waiting... (0/8)
mytable2 not ready yet, still waiting... (0/8)
mytable2 not ready yet, still waiting... (0/8)
mytable2 not ready yet, still waiting... (0/8)
mytable2 not ready yet, still waiting... (0/8)
mytable2 not ready yet, still waiting... (0/8)
mytable2 not ready yet, still waiting... (0/8)
mytable2 not ready yet, still waiting... (0/8)
mytable2 not ready yet, still waiting... (7/8)
mytable2 is ready now: (8/8)
recall app 2 succeed

>>> ls
app_id    status              app_name            app_type            partition_count     replica_count       is_stateful         drop_expire_time    envs_count          
1         AVAILABLE           temp                pegasus             8                   3                   true                -                   0                   
2         AVAILABLE           mytable2            pegasus             8                   3                   true                -                   0                   

list apps succeed
```

# 设计与实现
关键点：
* 表的生命周期定义要清晰：对于正在删除/召回的表，其他的create/recall/drop的操作要禁止。
* 表的过期时间要在各个meta server之间达成一致，这需要各个meta server做时钟同步。
* 如果表格被多次的删除和召回，当这些消息以乱序的方式送达到replica server时，一定要保证replica server能处理这些情况。最好能把drop操作映射成replica configuration元数据的变更。

实现要点简述：
* meta server对删除动作的响应：当收到客户端响应时，meta server需要把信息更新到zookeeper: (1) app的状态改为dropped, 记录过期时间 (2) 升级configuration的状态，并记录到zookeeper。
* replica server的replica生命周期变化：replica server通过定期和meta server交换心跳获取自己所服务的replica，如果发现本地的replica已经在远端不存在，则把本地的replica清除掉。
* 过期数据的删除：replica server和meta交换心跳时，汇报自己所存储的replica。当meta判定一个replica已经无效时，命令replica将其删掉。
