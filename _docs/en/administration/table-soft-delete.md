---
permalink: administration/table-soft-delete
---

# Background
Soft delete is primarily used to prevent accidental permanent data deletion. Specifically, soft delete should provide the following functionality:
* When a user deletes a specified table, the table becomes inaccessible.
* Deleted tables are not immediately physically removed but retained for a period of time.
* After the deleted table expires (exceeds retention time), data is physically deleted, though the actual deletion time depends on other factors (see [Garbage Folder Management](resource-management#garbage-folder-management)).
* Unexpired tables can be recovered and then accessed normally for read/write operations.

# Commands
The shell provides `drop` and `recall` commands to support soft delete.

## Using drop Command to Delete Table
Usage:
```
drop                   <app_name> [-r|--reserve_seconds num]
```

The drop command deletes a table, with the `-r` option specifying data retention time in seconds from deletion time. If unspecified, uses the `hold_seconds_for_dropped_app` config value (default: 7 days).

After successful deletion:
* Accessing the table returns `ERR_OBJECT_NOT_FOUND`.
* The deleted table won't appear in shell `ls` output.
* Deleted tables are visible with `ls -a`.
* Deleted table IDs aren't reused to prevent conflicts during recovery.
* New tables can be created with the same name, which clients will access.

## Physical Deletion of Expired Tables
Expired table data may not be immediately physically deleted because:
* After retention expires, meta server must be in [load balancing mode](rebalance#cluster-load-balancing-control) (`set_meta_level lively`) to notify replica servers via `config_sync` RPC. Replica servers then rename replica folders with `.gar` suffix to mark them as deletable, though data remains.
* Replica servers periodically scan data folders (config `disk_stat_interval_seconds`) and compare `.gar` folder modification times against current time. Only when the difference exceeds threshold (config `gc_disk_garbage_replica_interval_seconds`) are folders deleted.

Key configurations affecting physical deletion timing:
* `[meta_server] hold_seconds_for_dropped_app`: Retention time when `-r` isn't specified.
* `[replication] disk_stat_interval_seconds`: Interval for scanning data folders.
* `[replication] gc_disk_garbage_replica_interval_seconds`: Threshold for deleting garbage folders.

Warning for manual deletion:
* Only delete expired tables when absolutely necessary.
* Never delete non-expired tables.
* Avoid accidental deletion of other tables.

## Using recall Command to Recover Table
Usage:
```
recall                 <app_id> [new_app_name]
```

Recovery is possible before retention expires:
* Requires table ID.
* Optional new table name (uses original name if unspecified).
* Must specify different name if original exists.
* Recovery may take time.

## Example
Example workflow deleting mytable and recovering as mytable2:
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

# Design and Implementation
Key points:
* Clear table lifecycle definition: Block create/recall/drop operations during deletion/recovery.
* Synchronize expiration times across meta servers (requires clock synchronization).
* Handle out-of-order drop/recall operations at replica servers by mapping drops to replica configuration metadata changes.

Implementation highlights:
* Meta server response to deletion: Update ZooKeeper with (1) app status->dropped + expiration (2) configuration state.
* Replica lifecycle changes: Replica servers periodically sync with meta server to remove local replicas no longer existing remotely.
* Expired data deletion: Meta server commands replica servers to delete invalid replicas reported during heartbeat.
