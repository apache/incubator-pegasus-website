---
permalink: administration/duplication
---

​	In Pegasus, cross-datacenter data synchronization is also known as 'hot' backup or duplication, abbreviated as "dup". The main purpose of this feature is to ensure data center-level availability. When the business needs to ensure that services and data can tolerate data center failures, this feature can be considered. 

​	In addition, when the Pegasus client is distributed across multiple data centers, it often encounters high latency issues when accessing the Pegasus service across data centers. In this case, we can deploy the Pegasus service and client in the same data center, and the client can only read and write the local data center's service. Then, the duplication feature synchronizes the writes to all data centers. This approach can ensure that all data centers have complete data while avoiding the latency overhead of cross-datacenter access.

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

​	We can achieve a single-master configuration as well as a multi-master configuration across multiple data centers, which users can configure according to their needs. It is important to note that cross-datacenter synchronization is asynchronous data replication and not completely real-time. Unlike within a single data center, this feature does not provide consistency guarantees for read-after-write across data centers. Currently, in a healthy cross-datacenter network environment, data latency is about 10 seconds, meaning that data written in data center A will be written to data center B after approximately 10 seconds.



## Get started

Suppose we have 2 pegasus clusters _bjsrv-account_ (source cluster) and _tjsrv-account_ (target cluster), located in two computer rooms in Beijing and Tianjin respectively. The table `my_source_app` stores extremely critical user account data. It needs to be available in dual clusters, so we implement duplication for it:

```
> ./run.sh shell -n bjsrv-account

Type "help" for more information.
Type "Ctrl-D" or "Ctrl-C" to exit the shell.

The cluster name is: bjsrv-account
The cluster meta list is: ******

(use meta list to connect cluster)
>./admin-cli -m ******

>>> ls
app_id    status              app_name
12        AVAILABLE           my_source_app

>>>use my_source_app
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

​	By using the "dup add" command, the pegasus table "my_source_app" in the "bjsrv-account" cluster will be replicated to the "tjsrv-account" cluster in near real-time. This means that every write operation in the Beijing data center will eventually be replicated to the Tianjin data center. Duplication uses log asynchronous replication to achieve cross-cluster synchronization, which can be compared to MySQL's binlog replication and HBase replication. 

​	The duplication function is based on the granularity of tables, and you can implement duplication for only a part of the tables in the cluster. The table names of the two clusters for duplication need to be consistent, but the number of partitions does not need to be the same. For example, users can create tables as follows:

```
## bjsrv-account
>>> create my_source_app -p 128

## tjsrv-account
>>> create my_source_app -p 32
```



## Sample: Begin duplicat on a online Pegasus Table

​	Sometimes, an online table may not have considered the need for cross-datacenter synchronization during its initial design, and it is only after serving for a period of time that it is decided to perform duplication. At this time, we need to copy all the existing data from the source cluster to the destination cluster. Because it is an online table, we require that during the copying process:  

1. The service cannot be stopped  
2. The incremental data written during the copying process cannot be lost  



To meet this requirement, our operational approach is: 

1. First, the source cluster retains all the incremental writes (i.e., WAL logs) from this moment on  
2. Move the full-data snapshot (cold backup) of the source cluster to the specified path and wait for the backup cluster (destination cluster) to learn from this data  
3.  After the target cluster completes learning the existing rdb data, it informs the source cluster to enter the WAL log sending phase  
4.  After that, the source cluster starts duplication and copies the accumulated incremental writes, sending them to the remote destination cluster.



| master cluster                                               |                                                              | follower cluster                                             |                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| meta                                                         | primary                                                      | primary                                                      | meta                                                         |
|                                                              | 0.A period RPC sending task will be found during replica server  initialization,which is used to communicate between replica server and meta server |                                                              |                                                              |
| 0. Recive the RPC send by replica server,summary duplication tasks and calculate progress and then reply replica server. |                                                              |                                                              |                                                              |
| 1.Initiate a request to add a duplication task for the table with the command "add_duplication", and add the related "dup_info". |                                                              |                                                              |                                                              |
| 2. Enter dup status **DS_PREPARE**，synchronization checkpoint | 3. Get the new dup_info from meta，build a class named replica_duplicator，use trigger_manual_emergency_checkpoint generate checkpoint |                                                              |                                                              |
| 4. Received replica server report that all checkpoints have been generated, and now starting to create the table "create_follower_app_for_duplication" for the standby cluster. | --> -->--> RPC_CM_CREATE_APP->-->                            | --> -->--> --> With master pegasus table info--> --> --> --> | 5.Received RPC_CM_CREATE_APP request, starting to create the table "duplicate_checkpoint". |
|                                                              | <-- <-- <-- <-- <-- <-- <-- <-- <-- <-- <-- <-- <-           | <-- <-- <-- <--Create Table success return ERR_OK <-- <-     | 6.Using the checkpoint of the master pegasus table. Send a request to fetch the checkpoint. The 'nfs' underlying method "async_duplicate_checkpoint_from_master_replica" is called to copy target checkpoint. |
| 7. Received ERR_OK response,and enter  the dup status **DS_APP** |                                                              |                                                              |                                                              |
| 8. In the next communication round, check the created table in the DS_APP state. If there are no errors, enter the dup status **DS_LOG** "check_follower_app_if_create_completed". |                                                              |                                                              |                                                              |
|                                                              | 9.The replica server first learns that the status has switched to **DS_LOG**, and starts dup the  part of the PLOG data using "start_dup_log". |                                                              |                                                              |
|                                                              | 10."load" function  replay the PLOG , and   "ship" function package and send those mutation | 11.As a server, receive the "ship" package, unpack it, and process it based on the specific RPC type. contains.pegasus_write_service::duplicate |                                                              |



Below are the steps required to enable duplication for an online pegasus table: 



## Step 1: Set the cluster duplication parameters .

​	The relevant parameters under the replication and duplication-group items on both the master cluster and backup clusters must be consistent. The master cluster refers to the sender of the synchronized data, while the backup cluster refers to the receiver. 

Example configuration for the master cluster:

```
[replication]
  duplication_enabled = true
  duplicate_log_batch_bytes = 4096 # 0 meaning no batch，usually we set it to 4096

[pegasus.clusters]
  # the master cluster have to set the meta address of backup cluster
  tjsrv-account = xxxxxxxxx

# both clusters which have been join in duplication should register the cluster_id of each other
  [[duplication-group]]
  bjsrv-account = 1
  tjsrv-account = 2
```



Example configuration for the backup cluster:

```
[replication]
  duplication_enabled = true
  duplicate_log_batch_bytes = 4096 

[pegasus.clusters]
  # backup cluster can set nothing in this config project
  
  [[duplication-group]]
  bjsrv-account = 1
  tjsrv-account = 2
```



## Step 2: Connect to the domain proxy system on demand.

​	The main purpose of cross-datacenter duplication is to provide datacenter-level disaster recovery. In order to provide the ability to switch traffic across datacenters, business applications that require duplication must connect to the meta-proxy. The logic of the meta-proxy is that the client accesses the proxy, the proxy looks up the path of the corresponding table on ZooKeeper, obtains a real cluster meta address, and then accesses this meta. The path configuration of the meta-proxy on ZooKeeper is at the table level, so it is best to avoid having tables with the same name for different businesses within the same region. Of course, if the business side can modify the meta address by themselves, they do not need to connect to the domain proxy system.



## Step 3: Enable duplication. 

Before enabling duplication, it is necessary to consider whether to synchronize all data of the table (full data synchronization) or only synchronize from the current moment (incremental synchronization). 

1. If a full copy is performed, the checkpoint needs to be copied, and the backup cluster cannot have a table with the same name. This command creates a new table and enables the primary-backup task. 
2. If incremental synchronization is performed, the checkpoint does not need to be copied (i.e., only incremental data is synchronized), and it is necessary to ensure that the backup cluster has already created a table with the same name.

```
# typing in pegasus admin-cli
# dup add -c {cluster_name} -p {-p meaing full data synchronization，without -p meaing incremental synchronization}

>> use my_source_app
>> dup add -c tjsrv-account -p
successfully add duplication [dupid: 1669972761]
```



### Step 4: Pause/Restart/Remove a duplication. 

```C#
# TIPS：only in DS_LOG status duplication can be paused
>> dup pause/start/remove -d {the id of current duplication，use dup list can check it}
```

**FYI：After pause, the accumulated unsent logs continue to pile up. After remove, the unsent logs are directly cleared to zero.**



## Reliability of duplication

###  Automatic fault handling.  

Duplication is an online service integrated in ReplicaServer, so we have high requirements for the reliability of this function.  To deal with various failures that may occur during duplication, we provide several options for fault handling:  

- fail-slow: In this fault handling mode, duplication will retry indefinitely for any failure. Our operations personnel need to set alarms for some key monitoring items to be aware of the occurrence of failures. This is the default fault handling mode for Pegasus. 
- fail-skip: When a failure occurs, if multiple retries are unsuccessful, duplication will skip the current batch of data and replicate the next batch of data. This is suitable for business scenarios that can tolerate data loss. This option trades data loss for better availability.

Commond

```
set_dup_fail_mode <app_name> <dupid> <slow|skip>
```



### Important Monitoring 

In the  operation and maintenance of duplication , we recommend observing several core monitoring indicators to continuously monitor the service situation: 

- collector*app.pegasus*app.stat.dup_failed_shipping_ops#<app_name>: The number of failed write replication RPCs. Failure often means that the remote cluster or cross-cluster network is unavailable. 

- replica*app.pegasus*dup.time_lag_ms@<app_name>: P99 data replication delay. That is, how long it takes for a write from the source cluster to reach the destination cluster. 

- replica*app.pegasus*dup.lagging_writes@<app_name>: The number of writes that have taken too long to reach the destination cluster. We can configure a threshold, and a replication that takes longer than this threshold will be recorded once: 

  ```
  [pegasus.server]  
  dup_lagging_write_threshold_ms = 10000 
  ```

- replica*eon.replica_stub*dup.pending_mutations_count: The number of writes that are piled up in the source cluster and have not yet been replicated. If everything is normal, this monitoring item will remain stable at a certain value. When a fault occurs in a certain link of duplication, there will often be a large number of writes piled up, and this value will continue to rise. 

- replica*eon.replica_stub*dup.load_file_failed_count: The number of times the source cluster failed to read the log file. Reading the log file is a key link in duplication. If this link fails for some reason, it will cause duplication to be blocked.

  

## The metadata of duplication

The metadata of the duplication will be persisted on Zookeeper through MetaServer, and its storage path is as follows:

```

                                    <cluster_root>                     <app_id>          <dupid>
                                          |                                |                |
                                          |                                |                |
[zk: 127.0.0.1:22181(CONNECTED) 0] get /pegasus/bjsrv-account/0.0.x.x/apps/1/duplication/1537336970 

{"remote":"tjsrv-account","status":"DS_START","create_timestamp_ms":1537336970483}
```



## Complete configuration parameters item list 

```
[replication]
  # default is true
  duplication_enabled = true

[pegasus.clusters]
  # master cluster HAVE TO config it
  tjsrv-account = 127.0.0.1:51601,127.0.0.1:51601

[pegasus.server]
  dup_lagging_write_threshold_ms = 10000

[duplication-group]
  bjsrv-account = 1
  tjsrv-account = 2
```

​	We add a prefix of `timestamp+cluster_id` before each piece of data. The timestamp is the time when the data is written to Pegasus, and the cluster_id is configured in the duplication-group. The cluster_id for bjsrv is 1, and the cluster_id for tjsrv is 2. 

​	The purpose of cluster_id is that in case of a write conflict, for example, if tjsrv and bjsrv both write to the key "user_1" at the same time, the system will first check the timestamps of the two writes and take the one with the larger timestamp as the final value. 

​	In the extremely rare case where the timestamps are the same, the one with the larger cluster_id will be taken as the final value. Using this mechanism, we can ensure that the final values of the two clusters are always the same.



## Complete list of monitoring items

| monitoring items                                             |
| ------------------------------------------------------------ |
| `replica*eon.replica_stub*dup.log_read_bytes_rate` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.log_read_mutations_rate` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.shipped_bytes_rate` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.confirmed_rate` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.pending_mutations_count` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.time_lag(ms)` (XiaoMi/rdsn#393) |
| `replica*eon.replica_stub*dup.load_file_failed_count` (XiaoMi/rdsn#425) |
| `replica*eon.replica*dup.disabled_non_idempotent_write_count@<app_name>` (XiaoMi/rdsn#411) |
| `replica*app.pegasus*dup_shipped_ops@<gpid>` (#399)          |
| `replica*app.pegasus*dup_failed_shipping_ops@<gpid>` (#399)  |
| `replica*app.pegasus*dup.time_lag_ms@<app_name>` #526        |
| `replica*app.pegasus*dup.lagging_writes@<app_name>` #526     |
| `collector*app.pegasus*app.stat.duplicate_qps#<app_name>` #520 |
| `collector*app.pegasus*app.stat.dup_shipped_ops#<app_name>` #520 |
| `collector*app.pegasus*app.stat.dup_failed_shipping_ops#<app_name>` #520 |



## Complete HTTP interface list

- `http://0.0.0.0:34602/meta/app/duplication?name=temp`

- `http://0.0.0.0:34801/replica/duplication?appid=2`



## Known Limitations

- Duplication is not recommended to have two data copies written simultaneously in two different data centers. Based on our experience, it is usually acceptable to have only one data copy written at a time when dealing with two data centers.
- Users can distribute their data evenly between the tjsrv and bjsrv data centers.Duplication can ensure that in the event of a data center outage,so that only a few seconds of data will be lost (assuming stable network connections between the data centers).
