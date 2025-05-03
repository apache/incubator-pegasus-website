---
permalink: administration/table-migration
---

Table migration refers to moving all data of a table from one Pegasus cluster to another Pegasus cluster.

Currently, four table migration methods are provided:

1. The Shell tool command migration;  
2. Cold backup and restore;  
3. Dual-write with bulkload;  
4. Online (hot) migration;  

Below, we explain the principles and step-by-step operations of each migration method:

# Shell Tool Command Migration

## Principle

The Shell tool’s [copy_data command](/overview/shell#copy_data) works by reading each record from the source table via the client and writing it one by one into the target table. Specifically, it uses the `scan` interface to fetch entries from the table in the source cluster, then uses the `set` interface to insert or overwrite entries in the target cluster’s table.

## Step‑by‑Step Operation

The `copy_data` command syntax is:

```
copy_data              <-c|--target_cluster_name str> <-a|--target_app_name str>
                       [-p|--partition num] [-b|--max_batch_count num] [-t|--timeout_ms num]
                       [-h|--hash_key_filter_type anywhere|prefix|postfix]
                       [-x|--hash_key_filter_pattern str]
                       [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                       [-y|--sort_key_filter_pattern str]
                       [-v|--value_filter_type anywhere|prefix|postfix|exact]
                       [-z|--value_filter_pattern str] [-m|--max_multi_set_concurrency]
                       [-o|--scan_option_batch_size] [-e|--no_ttl] [-n|--no_overwrite]
                       [-i|--no_value] [-g|--geo_data] [-u|--use_multi_set]
```

Assume the source cluster is `ClusterA`, the target cluster is `ClusterB`, and the table to migrate is `TableA`. The migration steps are:

1. **Create the table on the target cluster.**  
   The `copy_data` command does not auto-create tables on the target cluster. You must manually create a table (for example, named `TableB`). The new table’s name and partition count may differ from the original.

2. **Add the target cluster’s configuration to the Shell config file.**  
   Since you specify the target cluster with `-c`, you need to list `ClusterB`’s MetaServer addresses in `src/shell/config.ini`. In the Shell working directory, append:

   ```ini
   [pegasus.clusters]
    ClusterB = {MetaServer addresses of ClusterB}
   ```

3. **Run the `copy_data` command in the Shell:**

   ```shell
   >>> use TableA
   >>> copy_data -c ClusterB -a TableB -t 10000
   ```

4. **Monitor the copy process.**  
   If everything is set up correctly, copying will begin and progress will print every second. Typical throughput exceeds 100,000 records per second. If the process fails (e.g., due to write throttling or write stalls), shuold resolve the issue and retry.

# Cold Backup Migration

## Principle

Cold backup migration uses Pegasus’s [cold backup feature](/administration/cold-backup) to back up data to HDFS (or other storage) and then restore or bulkload it into the new table.

**Advantages of cold backup migration:**

- **Higher speed:** Cold backup copies files directly, which is much faster than row-by-row copying.  
- **Greater fault tolerance:** The cold backup process includes retry logic to handle network instability, whereas `copy_data` must restart on failure.  
- **Multiple targets friendly:** You can back up once and restore multiple times to different clusters.

## Step‑by‑Step Operation

**Cold backup consists of two main phases:**

1. **Create checkpoints**  
   Checkpoint creation on all primaries and replicas, preparing data for upload. Larger partitions incur higher disk I/O and may cause brief read/write spikes.  

2. **Upload checkpoints**  
   Uploading checkpoints to HDFS, consuming network bandwidth. Without rate limiting,this may saturate the network.

**Recommended practices:**

- **Rate‑limit network I/O before backup via Shell:**

  ```shell
  # For versions ≤ 2.3.x
  remote_command -t replica-server nfs.max_send_rate_megabytes 50
  # For versions ≥ 2.4.x
  remote_command -t replica-server nfs.max_send_rate_megabytes_per_disk 50
  ```

- **Initiate the backup via `admin-cli`, specifying table ID, HDFS region, and path:**

  ```shell
  backup 3 hdfs_xxx /user/pegasus/backup
  ```

  The `hdfs_xxx` region is defined in `config.ini`:

  ```ini
  [block_service.hdfs_xxx]
  type = hdfs_service
  args = hdfs://xxxprc-hadoop/
  ```

- **Monitor progress.**  
   Once disk I/O drops, the upload phase has begun. You may incrementally increase the rate limit (e.g., to 100 MB/s) to speed up:

   ```shell
   # version ≤ 2.3.x
   remote_command -t replica-server nfs.max_send_rate_megabytes 100
   # version ≥ 2.4.x
   remote_command -t replica-server nfs.max_send_rate_megabytes_per_disk 100
   ```

- **Handle failures.**  
   If a ReplicaServer restarts, the backup fails and must restart. Watch the `cold.backup.max.upload.file.size` metric; when it resets to zero, the failed backup has ended. Delete the HDFS backup directory and retry.

**Data restoration methods:**

1. **Using `restore`:**  

   ```shell
   restore -c ClusterA -a single -i 4 -t 1742888751127 -b hdfs_x -r /user/pegasus/backup
   ```

   - `restore` auto‑creates the table and does not support changing partition count.  
   - The source table (`TableA`) must exist; otherwise, use Bulkload.

2. **Using Bulkload:**  

   - Convert cold backup files to Bulkload format via Pegasus-spark’s offline split.  
   - In Shell, run:

     ```shell
     >>> use TableB
     >>> set_app_envs rocksdb.usage_scenario bulk_load
     >>> start_bulk_load -a TableB -c ClusterB -p hdfs_xxx -r /user/pegasus/split
     ```

# Dual‑Write with Bulkload

Both `copy_data` and cold backup migrate only existing data; incremental writes require a maintenance window. From version `v2.3.x`, Pegasus supports **online migration** with dual‑write plus Bulkload.

## Principle

- **Dual‑write:** from the application to both the source and target tables, ensuring real‑time sync of new writes.  
- **Bulkload:** existing data via cold backup, offline split, and `IngestBehind`, ensuring correct ordering between old and new data.

RocksDB’s `IngestBehind` assigns a global sequence number of 0 to ingested SST files, placing them below existing data so that incremental writes (with higher sequence numbers) remain in order.

## Step‑by‑Step Operation

- **Create the target table with `rocksdb.allow_ingest_behind=true`:** 

   ```sql
   create TableB -p 64 -e rocksdb.allow_ingest_behind=true
   ```

- **Implement dual‑write in your application, with retry logic on failures for both tables.**
- **Prepare Bulkload data via cold backup and offline split.**  
- **Start Bulkload with `--ingest_behind`:**

   ```shell
   >>> use TableB
   >>> set_app_envs rocksdb.usage_scenario bulk_load
   >>> start_bulk_load -a TableB -c ClusterB -p hdfs_xxx -r /user/pegasus/split --ingest_behind
   ```

- **Rate‑limit Bulkload network I/O as needed.** 
- **Partition counts may differ between source and target tables.**

# Online (Hot) Migration

From version `v2.4.x`, Pegasus supports hot backup. See [Cross‑datacenter Replication](/administration/duplication) for details. Hot backup enables zero‑downtime migration with minimal steps.

## Step‑by‑Step Operation

- **Replace ip straigt**  
   Route all clients through `MetaProxy`—no direct MetaServer IPs allowed.  
- **Start backup**  
   Establish hot backup from source to target cluster (setup omitted).  
- **Switch ZooKeeper**  
   Switch `MetaProxy` in ZooKeeper to point to the target cluster’s MetaServer addresses.  
- **Refresh topology**  
   Block reads/writes on the source table to force clients to refresh topology.

   ```shell
   >>> use TableB
   >>> set_app_envs replica.deny_client_request reconfig*all
   ```

- **Verify migration**  
   Verify migration success by observing that:  
   - QPS on the source table drops to zero;  
   - QPS on the target table rises to match the original;  
   - `dup.disabled_non_idempotent_write_count` remains at 0 on both clusters;  
   - `recent.read.fail.count` and `recent.write.fail.count` remain at 0 on both clusters.  

**Note:** C++ and Python clients currently do not support connecting via MetaProxy.
