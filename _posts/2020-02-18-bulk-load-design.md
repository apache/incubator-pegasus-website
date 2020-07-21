---
title: Bulk Load 设计文档
layout: post
author: 何昱晨
---

## 功能简介

Pegasus是强一致的分布式KV存储系统，每次写入数据时，需要每个partition的三个副本都写成功才会真正写下数据。而在业务实际使用上，发现向pegasus灌数据需要耗费大量时间，因此pegasus希望能够实现类似于HBase的bulk load功能，在尽量对读写影响小的情况下，能够快速灌入大量数据。  

HBase提供多种写入数据的方式，Bulk Load是其中一种。HBase数据是以HFile的格式存储在HDFS上，Bulk load通过MapReduce等离线方式直接将数据组织成HFile格式的文件，再将这些文件导入到HBase的Region中，更详细的说明可参见 [HBase book bulk load](http://hbase.apache.org/book.html#arch.bulk.load)  
Pegasus使用RocksDB作为存储引擎，用户数据存储在RocksDB SST文件中，借鉴HBase的实现，Pegasus bulk load也首先离线生成用户数据，再直接将数据导入到RocksDB中来。RocksDB支持ingestion SST file的功能，详情可参见wiki: [Creating and Ingesting SST files](https://github.com/facebook/rocksdb/wiki/Creating-and-Ingesting-SST-files)  

因此，Bulk load整体流程可分为以下三个步骤：（1）离线生成SST文件；（2）下载SST文件；（3）导入SST文件。本设计文档侧重于描述Pegasus server如何处理和进行Bulk load，如何离线生成SST文件不在本文档介绍之内。

## 概念说明

### 离线存储路径

目前Bulk load支持使用[XiaoMi/FDS](http://docs.api.xiaomi.com/fds/introduction.html)作为离线生成SST文件的存储介质，并且要求生成的SST文件被组织成如下的路径：

```txt
<bulk_load_root>/<cluster_name>/<app_name>/{bulk_load_info}
                                          /<partition_index>/<file_name>
                                          /<partition_index>/{bulk_load_metadata}
```

在生成SST文件时，需要指定待导入数据的表名和所在集群名称，每个表需要有一个`bulk_load_info`文件，每个partition除了SST文件之外还需要有一个`bulk_load_metadata`文件。  
`bulk_load_info`文件存储着待导入数据的表名、app_id和partition_count，这个文件的作用是用来在开始bulk_load时进行检查，检查表的信息是否匹配。  
`bulk_load_metadata`则存储着partition待导入所有文件的名称，大小和md5值，以及所有文件的总大小。这个文件的作用是在下载SST文件时，进行下载进度统计和校验。  
我们目前在fds上为同一张表只保留一个bulk load的路径，这里毕竟只是一个中间路径，没有保留多个的必要性。

### bulk load状态

```thrift
enum bulk_load_status
{
    BLS_INVALID,
    BLS_DOWNLOADING,
    BLS_DOWNLOADED,
    BLS_INGESTING,
    BLS_SUCCEED,
    BLS_FAILED,
    BLS_PAUSING,
    BLS_PAUSED,
    BLS_CANCELED
}
```

我们为bulk load定义了多种状态，表app和每个partition都将有bulk load status，更多关于bulk load status的描述请参见后文。

### zookeeper上的路径

首先，bulk load在app_info中新增了一个`is_bulk_loading`的成员变量，用来标志当前表是否在进行bulk load，会在开始bulk load被设置为true，在bulk load成功或失败的时候被设置为false。  
由于bulk load是由meta驱动的，meta存储bulk load的状态，为了防止meta宕机后的状态丢失，bulk load的状态需要持久化到zookeeper上，bulk load的存储路径如下：

```txt
<cluster_root>/bulk_load/<app_id>/{app_bulk_load_info}
                                 /<partition_index>/{partition_bulk_load_info}
```

`app_bulk_load_info`存储着app的bulk load状态和fds基本信息，`partition_bulk_load_info`存储着partition的bulk load状态和bulk_load_metadata。

## 整体流程

###  Start bulk load

```txt
  
+--------+ bulk load  +------------+  create path  +-----------+  
| client ----------->   meta_server -------------->  zookeeper |
+--------+            +-----^------+               +-----------+
                            |
                            | verification
                            |
                      +-----v------+
                      |    fds     |
                      +------------+
                    
```

1. client给meta server发送开始bulk load的request
  - 检查参数: 检查表是否存在，表是否已经在进行bulk load，检查remote bulk_load_info文件中的数据是否合法等
  - 将meta server状态设置为steady，尽量避免进行load balance
  - 在zk上创建表的bulk load路径，创建每个partition的路径
  - 将表bulk load状态设置为downloading，并将每个partition的bulk load状态设置成downloading
  - 给每个partition发送bulk load request
  - 当给所有partition都发送request之后返回ERR_OK给client

### download SST files

```txt
          +---------+
          |  meta   |
          +----^----+
               |
               | bulk load request/response
               |       (downloading)
               |
          +----v----+
      --->| primary |<---
      |   +----^----+   |
      |        |        | group bulk load request/response
      |        |        |     (downloading)
      |        |        |
+-----v-----+  |  +-----v-----+
| secondary |  |  | secondary |
+-----^-----+  |  +-----^-----+
      |        |        |
      |        |        | download files
      |        |        |
  +---v--------v--------v----+
  |           fds            |
  +--------------------------+

```

1. meta给primary发送bulk load request
  - 将partition的bulk load状态设置为downloading
  - 在本地创建临时的bulk load文件夹，存储下载的SST文件
  - 从fds上下载bulk_load_metadata文件，并解析文件
  - 根据metadata文件逐一下载SST文件，并校验md5值
  - 更新下载进度，若下载完成则将状态从downloading更新为downloaded
      - 给secondary发送group_bulk_load_request
  - 上报整个group的下载状态和进度给meta
2. primary给secondary发送group bulk load request
  - 同2的步骤，secondary从fds上下载并校验文件
  - 把下载状态和进度回复给primary
3. 当meta收到partition完成下载，将partition bulk load状态设置为downloaded，若所有partition都为downloaded，app bulk load状态设置为downloaded

### ingest SST files

```txt
          +-----------+
          |   meta    |
          +-----------+
             |     |
     ingest  |     | bulk load request/response
             |     |       (ingesting)
             |     |
          +--v-----v--+
      --->|  primary  |<---
      |   +---^---^---+   |
      |       |   |       | group bulk load request/response
      |       |   | 2pc   |      (ingesting)
      |       |   |       |
+-----v-----+ |   | +-----v-----+
| secondary |<-   ->| secondary |
+-----------+       +-----------+

```
在ingesting阶段，meta与primary会有两种rpc，一种是和download阶段相同的bulk load request，用来交互ingest的状态，另一种是特殊的ingest rpc，用来执行真正的ingest操作。这两种rpc分别如下步骤的3和2所述，这里的2,3并不表示执行顺序。

1. 当app状态被设置为downloaded之后，将每个partition状态设置为ingesting，当所有partition均为ingesting时，app的bulk load status会被设置为ingesting
2. 当app状态为ingesting，meta会给所有primary发送ingest rpc
  - ingest rpc是一类特殊的写请求，primary收到后会执行2pc，每个replica的RocksDB在收到ingest请求后会将指定路径上的SST文件ingest到RocksDB中，在这个过程中，meta类似于用户client，发送了一个特殊的写请求
  - 当primary收到ingest rpc后会拒绝写入新数据，直到三备份都完成ingest之后再恢复写数据
3. 当partition被设置为ingesting之后，meta会给primary发送bulk load request
  - 若partition当前bulk load status为downloaded，则更新状态为ingesting，若是primary，则会给secondary发送group_bulk_load_request
  - 若partition的状态已经是ingesting，则secondary上报ingest的状态给primary，primary上报整个group的ingest状态给meta
4. 若meta发现partition三备份都完成了ingest，则会将bulk load status设置为succeed，当所有partition都为succeed，app bulk load状态设置为succeed。

### finish bulk load

```txt
          +---------+   remove path   +-----------+
          |  meta   | -------------->   zookeeper |
          +---------+                 +-----------+
               |
               | bulk load request/response
               |        (succeed)
               |
          +----v----+
      --->| primary |<---
      |   +----^----+   |
      |                 | group bulk load/response
      |                 |       (succeed)
      |                 |
+-----v-----+     +-----v-----+
| secondary |     | secondary |
+-----------+     +-----------+

```

1. meta给primary发送bulk load request
  - 若partition当前bulk load status为ingesting，则更新状态为succeed，若是primary，则会给secondary发送group_bulk_load_request
  - 若partition的状态已经是succeed，primary和secondary都会删除本地的bulk load文件夹，将bulk load状态设置为invalid
2. 若meta发现表的所有partition都完成了bulk load则会删除zk上的bulk load文件夹

### download阶段的补充说明

在download阶段，我们选择了primary和secondary同时从fds上下载文件的方式。若只有primary下载文件，再由secondary去learn这些数据可能存在两个问题。一方面，bulk load会下载大量数据，secondary需要从primary learn大量数据，而若三备份同时从fds上下载文件，我们可以对同时执行下载的replica个数进行限制，并且异步低优先级的执行这个下载任务，这样能尽可能减少对正常读写的影响。另一方面，若采用learn的形式，每个partition完成下载的时间点是不确定的，这对何时开始进入需要拒绝客户端写请求的ingest状态带来较大麻烦，而在现在的实现中，三备份同时下载，并且secondary向primary上报进度，primary向meta上报进度，meta server能够确定何时可以开始执行ingest。

### ingest阶段的补充说明

RocksDB在执行ingest SST文件时，为了保证数据一致性会拒绝写请求，因此在bulk load的ingestion阶段，pegasus也会拒绝客户端的写请求。同时，由于RocksDB的ingest操作是一个同步的耗时操作，ingest所用的时间会随着SST文件的大小和个数的增长而增长，因此ingest不能在replication线程池中执行，否则会阻塞replication线程池中执行的操作，如meta与replica之间的config同步，replica之间的group_check等。在目前的实现中，为ingestion定义了一个新的线程池，thread_count为24与replication线程池一致，尽可能减少ingestion阶段的时间，因为这段时间是不可写的。

Ingest rpc和传统写请求也有不同，在pegasus现在的设计中一主一备也可以写成功，而ingest不同，若当前group不是健康的一主两备就会直接认为ingest失败。

```thrift
enum ingestion_status
{
    IS_INVALID,
    IS_RUNNING,
    IS_SUCCEED,
    IS_FAILED
}
```

我们还为ingest定义了如上状态，在未进行bulk load和开始bulk load时，状态为IS_INVALID, 在bulk load状态被设置为ingesting时，ingest状态为IS_RUNNING，在RocksDB执行ingest之后依照ingest的结果被设置为IS_SUCCEED或IS_FAILED，在bulk load全部完成后会被重新设置为IS_INVALID。

## 异常处理

在bulk load的设计中，若replica发生config变换，进程挂掉或者机器宕机，meta server都会认为本次bulk load失败。因为一旦出现如上问题，replica group的一主两备的信息都可能发生变化，而bulk load需要三备份都从fds上下载SST文件并ingest到RocksDB中。因此在遇到如上问题时候，meta都会将app状态重新设置为downloading，重新开始bulk load。在bulk load过程中，最耗时的是下载SST文件，只要保证重新下载的时间较短，那么在failover阶段重新开始bulk load也不会开销过大。目前下载文件时，会先检查本地是否存在同名文件，若存在同名文件并且md5与远端文件相同则无需重新下载，这样能保证无需重复下载文件。结合了failover的bulk load status转换如下图所示：

```txt
                   Invalid
                      |
             Err      v
         ---------Downloading <---------|
         |            |                 |
         |            v         Err     |
         |        Downloaded  --------->|
         |            |                 |
         | IngestErr  v         Err     |
         |<------- Ingesting  --------->|
         |            |                 |
         v            v         Err     |
       Failed       Succeed   --------->|
```

- 在downloaded, succeed阶段遇到问题都会回退到downloading
- 若在downloading阶段遇到问题，如远端文件不存在等问题，会直接转换成failed状态，删除本地和zk上的bulk load文件夹
- 比较特殊的是ingesting，如果遇到的是timeout或者2pc导致的问题会回退到downloading阶段重新开始，若遇到的RocksDB的ingest问题则会直接认为bulk load失败

为了更好的管理和控制bulk load，当集群负载较重时，为了保证集群的稳定性，可能需要暂停bulk load或者取消bulk load，结合暂停和取消功能的bulk load status转换如下图所示：

```txt
                    Invalid
                       |         pause  
           cancel      v       ---------->
         |<------- Downloading <---------- Paused
         |             |         restart
         | cancel      v
         |<------- Downloaded  
         |             |
         | cancel      v
         |<------- Ingesting  
         |             |
         | cancel      v
         |<-------  Succeed  
         |
         v
      Canceled <--------------------------- Failed
                          cancel
```

- 只有在app状态为downloading时，才能pause bulk load，在暂停之后可以restart bulk load，会重新到downloading状态
- cancel可以从任何一个状态转换，取消bulk load会删除已经下载的文件，删除remote stroage的bulk load状态，就像bulk load成功或者失败一样，cancel bulk load能够确保bulk load停止。

若meta server出现进程挂掉或者机器宕机等问题，新meta会从zk上获得bulk load状态信息。zk上的`bulk load`文件夹存储着每个正在进行bulk load的表和partition的信息，meta server需要将这些信息同步到内存中，并根据其中的状态继续进行bulk load。

需要说明的是，如果在bulk load在ingestion阶段失败或者在ingestion阶段执行cancel bulk load操作，可能会出现部分partition完成ingestion，而部分失败或者被cancel的情况，即部分partition成功导入了数据，部分partition没有导入数据的现象。

## ingest的数据一致性

RocksDB在ingest时提供两种模式，一种是认为ingestion的文件数据是最新的，另一种则认为它们是最老的，目前我们认为ingestion的数据是最新的。
即如下图所示：

```txt
ingest(a=2)                       -> a = 2
write(a=1) ingest(a=2)            -> a = 2
write(a=1) ingest(a=2) write(a=3) -> a = 3
write(a=1) ingest(a=2) del(a)     -> a not existed
```

## TODO

1. 允许配置RocksDB ingest的更多参数
2. 考虑bulk load如何计算CU
