---
permalink: administration/partition-split
---

# Feature Overview
In Pegasus, the number of partitions in a table is specified at creation time and does not change dynamically. However, as the amount of data grows, some partitions may become too large, which can lead to degraded read and write performance. Therefore, it is necessary to manually increase the number of partitions to ensure service quality.

In Pegasus's design, the number of partitions is always a power of two. Currently, the split functionality doubles the number of partitions. Each partition(i) is split into partition(i) and partition(i + original_count).
For example, if the original table has 4 partitions, after the split it will have 8 partitions:
* partition(0) will be split into partition(0) and partition(4)
* partition(1) into partition(1) and partition(5)
* and so on.  
  
We refer to partition(i) as the parent partition, and partition(i + original_count) as the child partition.

# Command Description
`partition_split <app_name> <new_partition_count>`
* If the table is unavailable, return ERR_APP_NOT_EXIST
* If new_partition_count != old_partition_count * 2, return ERR_INVALID_PARAMETERS
* If the table is currently undergoing a split, return ERR_BUSY
* If the split is successful, return ERR_OK
  
## Note
* In versions 2.4 and 2.5, the split process may hang. It is recommended to upgrade to the latest version before performing a split.


# Design and Implementation

## Overall Process
The partition split process can be divided into the following steps:
1. The client sends a partition split request to the meta server.
2. The replica server detects the change in the number of table partitions through `config_sync` with the meta server.
3. Each parent partition asynchronously replicates all its data to create a corresponding child partition
4. Once all child partitions in a group are ready, the primary sends a request to the meta server to register the child partitions.
5. The meta server registers the child partitions.
6. After all child partitions have been registered, the split process is complete.
7. Invalid data is cleaned up. See [How to Delete Invalid Data](#how-to-delete-invalid-data) for details.

## Reads and Writes During the Partition Split Process
During the partition split process, read and write operations can generally proceed as normal. But there is a brief period of service unavailability during the registration of child partitions.

To illustrate, suppose the app initially has 4 partitions, which will be split into 8. Assume the data a client wants to access is originally served by partition(1), and after the split, it will be served by partition(5). From the beginning of the split process until the asynchronous learn phase is completed, partition(1) continues to serve the client. However, once the primary sends a request to the meta server to register the child partitions, partition(1) will reject client read/write requests until the registration is complete. After registration, the client is still unaware that the serving partition has changed to partition(5) and will continue to send requests to partition(1). At this point, partition(1) will notify the client to update its routing table. This update is transparent to the user. Overall, the period of unavailability is very short.

## Why It Is Necessary to Specify the Number of Partitions
Since the partition split operation cannot be canceled and there is no functionality to decrease the number of partitions, performing a split must be done with caution. Although each split operation currently only doubles the number of partitions, it is still necessary to explicitly specify the target partition count. This is to prevent the client from unintentionally retrying this non-idempotent operation multiple times, which could lead to the partition count increasing beyond what was intended.

## How to Delete Invalid Data
Before performing a partition split, ensure that more than 50% of disk space is available and that there is sufficient free memory. This is because the split operation involves copying data for each partition.
After the split is completed, Pegasus will use RocksDB’s background filter mechanism to delete the invalid data generated during the split process.If disk resources are tight, or if you want to remove invalid data more quickly, you can use the manual_compact feature to manually trigger the filter when the cluster’s CPU is idle. For command details, refer to [Usage Example](#usage-example).

## Partition Split and Hotspot Issues

The partition split feature is primarily designed to ensure service quality in cases of unexpected data growth. However, it cannot fully resolve the issue of a single partition becoming a hotspot. Pegasus uses a hash-based sharding model. After a split, traffic is not guaranteed to be evenly distributed between the parent and child partitions — the distribution depends on the user's hashkey. Therefore, while partition split can help alleviate hotspot issues, it is not a complete solution. Additionally, partition split is currently a table-level operation. Splitting individual partitions is not supported at this time.

# Usage Example
## Executing a Partition Split
Before performing a split, it is recommended to use the `app_stat` command to check the size of the table to be split. Then, execute the following command:
```
>>> partition_split split_table 8
split app split_table succeed
```
Use the shell tool to perform a partition split, changing the split_table partition count from 4 to 8

## During the Partition Split Process
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
Use the command `app <table_name> -d` to view detailed information about the current table. If a partition shows ballot = -1, it indicates that the partition has not yet been registered by the meta server.

## Partition Split Completed
You can again use the command `app <table_name> -d` to check the table details. When you see that all ballot values are greater than 0, it means that all partitions have been successfully registered. If the current traffic is low, you may set the meta server to lively mode to enable load balancing.Also, use the `app_stat` command to check the size of the table — it should now be approximately twice the size compared to before the split.

## Manually Triggering Manual Compact
For more details on manual compaction, refer to [Manual Compact](manual-compact). It's recommended to perform this operation when the cluster's CPU is idle. Suggested command example:  
`./scripts/pegasus_manual_compact.sh -c <meta_list> -a <table_name> --bottommost_level_compaction force`  
 Note: Be sure to include the --bottommost_level_compaction option. This ensures that all redundant data will be thoroughly cleaned up.

