---
permalink: administration/partition-split
---

# 功能简介
在pegasus中，表的partition个数是在创建时指定的，并且不会动态改变，但随着数据量不断增大，可能出现partition数据过大的情况，这样可能会导致读写效率下降，因此需要人工增大partition个数来保障服务质量。

在pegasus的设计中，partition个数为2的幂次，目前split功能会将partition个数翻倍，partition(i)将会被分裂为partition(i)和partition(i+original_count) 。例如，原表有4个partition，在split之后将有8个partition，partition(0)将会分裂为partition(0)和partition(4)，partition(1)将会分裂为partition(1)和partition(5)……以此类推。我们将partition(i)称为parent partition，partition(i+original_count)称为 child partition

# 接口描述
`partition_split <app_name> <new_partition_count>`
* 若当前表不可用，返回 ERR_APP_NOT_EXIST
* 若new_partition_count != old_partition_count*2，返回 ERR_INVALID_PARAMETERS
* 若表正在进行split，返回 ERR_BUSY
* 若split成功返回 ERR_OK

# 设计与实现

## 整体流程
partition split过程可分为以下几个步骤：
1. client发送partition split请求给meta server。
2. replica server通过与meta server的config_sync发现表partition个数发生变化。
3. 每个parent partition通过异步learn的方式复制自己所有数据得到child partition。
4. 当一个group中的所有child partition就绪后，primary给meta server发送注册child partition的请求。
5. meta server注册child partition。
6. 所有child partition被注册完成后，split过程结束。
7. 清理无效数据，详见[如何删除无效数据](#如何删除无效数据)。

## Partition-Split过程中的读写
在partition split过程中，读写流程可保持正常进行，在注册child partition期间有短暂拒绝服务。

为了方便说明，假设app的partition个数为4，分裂后为8，而client希望访问的数据，在分裂前由partition(1)服务，分裂后由partition(5)服务。从split开始到partition进行异步learn，都仍将由partition(1)为client进行服务，但当primary给meta server发送注册child partition请求后，partition(1)将拒绝client的读写请求，直到meta server注册完成。当注册完成后，client并不知道将由partition(5)为其服务，仍将请求发送给partition(1)，这时partition(1)会提示client更新访问路由表，而更新路由表是对用户透明的。总体来说服务不可用时间非常短。

## 为什么需要指定partition个数
由于partition split功能不能取消，且没有减小partition的功能，因此执行partition split需谨慎，虽然目前单次split只能使partition个数翻倍，但仍需指定partition count，这是为了防止client多次重试这个非幂等操作导致partition个数非预期增大。

## 如何删除无效数据
执行partition
split前需要保证磁盘空间可用超过50%，内存可用充足，因为split操作首先需要对每个partition进行复制，在split完成后，pegasus会通过rocksdb提供的filter功能在后台删除split造成的无效数据。若磁盘资源紧张或者希望尽快删除无效数据，可在集群CPU空闲期间执行manual_compact功能，手动触发filter，命令详情参见[操作示例](#操作示例)。

## Partition-Split与热点问题
split功能主要是为了保障在数据量非预期增长情况下的服务质量，并不能完全解决单个partition过热的问题，pegasus的数据模式是hash分片，在split完成后流量并不能保障是被平分在两个partition上，这个是依赖于用户的hashkey决定的，只能说可以缓解热点问题，并且partition split是表级命令，暂时不支持针对单个partition的partition split。

# 操作示例
## 执行Partition-Split
在split前，建议先通过`app_stat`命令查看待split表的大小，再执行如下命令：
```
>>> partition_split split_table 8
split app split_table succeed
```
通过shell工具执行partition split，将split_table partition count从4设置为8

## Partition-Split过程中
```
>>> app split_table -d
[Parameters]
app_name: split_table
detailed: true

[Result]
app_name          : split_table
app_id            : 2
partition_count   : 8
max_replica_count : 3
details           :
pidx      ballot    replica_count       primary                                 secondaries                             
0         3         3/3                 10.239.35.234:34802                     [10.239.35.234:34803,10.239.35.234:34801]
1         3         3/3                 10.239.35.234:34803                     [10.239.35.234:34801,10.239.35.234:34802]
2         3         3/3                 10.239.35.234:34801                     [10.239.35.234:34803,10.239.35.234:34802]
3         3         3/3                 10.239.35.234:34802                     [10.239.35.234:34801,10.239.35.234:34803]
4         -1        0/0                 -                                       []
5         -1        0/0                 -                                       []
6         -1        0/0                 -                                       []
7         -1        0/0                 -                                       []

node                                    primary   secondary total     
10.239.35.234:34801                     1         3         4         
10.239.35.234:34802                     2         2         4         
10.239.35.234:34803                     1         3         4         
                                        4         8         12        

fully_healthy_partition_count   : 4
unhealthy_partition_count       : 4
write_unhealthy_partition_count : 4
read_unhealthy_partition_count  : 4

list app split_table succeed
```
通过`app <table_name> -d`命令查看当前表的详情，ballot=-1表示该partition还没有被meta server注册

## Partition-Split完成
同样通过`app <table_name> -d`查看表详情，当发现所有ballot都大于0时表示所有partition都被注册，若当前流量不大可以将meta server设置为lively状态，进行负载均衡，并且通过`app_stat`命令查看表的大小，应该是split前的2倍左右

## 手动触发Manual-Compact
关于Manual compact详情可参见[Manual compact功能](/_docs/zh/administration/manual-compact.md)，在集群CPU空闲时进行操作，建议命令示例如下：
`./scripts/pegasus_manual_compact.sh -c <meta_list> -a <table_name>` 
