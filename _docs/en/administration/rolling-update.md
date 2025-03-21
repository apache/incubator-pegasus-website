---
permalink: administration/rolling-update
---

# Design goals

When upgrading the Pegasus server version or persistently modifying the configuration, it is necessary to restart the cluster. For distributed clusters, the commonly used restart method is **Rolling Restart**, which means restarting servers one by one without stopping cluster service.

> The following document assumes that the number of replicas of tables in the Pegasus cluster is 3.

The important goal of cluster restart is to maintain continuous service and minimize the impact on availability. During the restart process, the following factors can affect service availability:
* After the Replica Server process is killed, the replicas served by the process cannot provide services:
  * For primary replicas: Since the primary replicas directly provide reading and writing services to the client, killing a process will definitely affect read and write operations, and it needs to wait for the Meta Server to reassign new primary replicas before it can be recovered. The Meta Server maintenance the survival status of the Replica Servers through beacons, and the latency of Failure Detector depends on the configuration parameter `fd_grace_seconds`, default to 10 seconds, which means it takes up to 10 seconds for the Meta Server to know that the Replica Server is down, and then reassign new primary replicas.
  * For secondary replicas: Since the secondary replicas do not serve reads, theoretically they have no impact on reads. But it will affect writing because the PacificA consistency protocol requires all replicas to be written successfully before the write operation can be submitted. After the process is killed, the primary replica will find that the secondary replica has been lost during the write operation, and then notify the Meta Server to kick it out. After the _configuration_ stage, the replica group is combined by one primary and one secondary replica, then continuing to provide write services. For write operations that have not yet been completed during this switching process, even if there is a _reconciliation_ stage to execute again, the client may have timed out, which has a certain impact on availability. However, this impact is relatively small because the speed of _reconfiguration_ is relatively fast and can usually be completed within 1 second.
* Restarting Meta Server: The impact of restarting Meta Server on availability can be almost negligible. Because the client retrieves the service node information for each partition from the Meta Server for the first time and caches the information locally, there is usually no need to query from Meta Server again. Therefore, a short disconnection during the Meta Server restart process has little impact on the client. However, considering that the Meta Server needs to maintain beacons with the Replica Server, it is important to avoid stopping the Meta Server process for a long time, which could cause the Replica Server to be disconnected.
* Restarting the Collector: Restarting the Collector has no impact on availability. However, availability metrics are collected from the Collector, so it may have a slight impact on the metrics data.

Therefore, the following points can be considered to keep availability during cluster restart:
* Only one process can be restarted at a time, and the next process can only be restarted after the process is restarted and fully recovered to provide service. Because:
  * If the cluster does not recover to a fully healthy state after restarting a process, and some partitions still have only one primary and one secondary replica, then killing another Replica Server process is likely to enter a state with only one primary replica, making it unable to provide write service.
  * Waiting for all partitions in the cluster to recover three replicas before restarting the next process can also reduce the risk of data loss.
* Proactively migrate replicas before Failure Detector delays impact availability, instead passively migrate. Because:
  * Passive migration requires waiting for the Failure Detector to detect Replica Server loss, while proactive migration involves migrating the primary replicas served by this server to other servers before killing the process. This `reconfiguration` procedure is fast and typically takes less than 1 second to complete.
* Try to manually downgrade the secondary replicas of the Replica Server served before killing the process. Because:
  * Proactively trigger the `reconfiguration` rather than passive triggering on write failures, further reducing the impact on availability.
* Minimize the workload of the recovery process during process restart to shorten the process restart time.
  * Replica Server requires replay WAL logs to recover data upon restart. If it is killed directly, the amount of data that needs to be replayed may be large. However, if the flush operation of memtables to disk is actively triggered before killing, the amount of data that needs to be replayed during restart will be greatly reduced, and the restart time will be much shorter. The time required for the entire cluster to restart can also be greatly reduced.
* Minimize unnecessary data transmission between servers to avoid availability impacts caused by high load of CPU, network IO, and disk IO when transmit data.
  * After the Replica Server crashes, some partitions enter the state of `1 primary + 1 secondary`. If the Meta Server immediately supplements replicas on other Replica Servers, it will bring about a large number of cross server data transmission, increase CPU, network IO, and disk IO load, and affect cluster stability. Pegasus's solution to this problem is to allow `1 primary + 1 secondary` state for a period of time, providing a maintenance window for the restarted Replica Server. If it's not recovered for too long time, the missing replicas will be replenished on other Replica Servers. This balances the data integrity and the stability of the cluster. The wait time can be configured though the parameter `replica_assign_delay_ms_for_dropouts`, default to 5 minutes.

# Restart steps

## High availability restart steps

* If it is an upgrade, please prepare new server packages and configuration files first
* Use shell tools to set the meta level of the cluster to `steady`, turn off [load balancing](rebalance), and avoid unnecessary replica migration
  ```
  >>> set_meta_level steady
  ```
* Use shell tools to set the maintenance window of a single Replica Server
  ```
  >>> remote_command -t meta-server meta.lb.assign_delay_ms $value
  ```
  `value` can be understood as the maintenance window of a single Replica Server, which is the trigger time for the Meta Server to supplement replicas to other servers after discovering that the Replica Server is lost. For example, configure to `3600000`.
* Restart the Replica Server process one by one. Restart a single Replica Server steps:
  * Use shell tools to send [remote commands](remote-commands#meta-server) to Meta Server, temporarily disable `add_secondary` operations:
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node 0
    ```
  * Use `migrate_node` command to transfer all primary replicas on the Replica Server to other servers:
    ```bash
    $ ./run.sh migrate_node -c $meta_list -n $node -t run
    ```
    Use shell tools to check the replicas of the servers served through the `nodes -d` command, and wait for the number of **primary** replicas to become 0. If it doesn't change to 0 for a long time, please execute the command again.
  * Use `downgrade_node` command to downgrade all secondary replicas on the Replica Server to `INACTIVE`:
    ```bash
    $ ./run.sh downgrade_node -c $meta_list -n $node -t run
    ```
    Use shell tools to check the replicas of the servers served through the `nodes -d` command, and wait for the number of **secondary** replicas to become 0. If it doesn't change to 0 for a long time, please execute the command again.
  * Use shell tools to send a remote command to the Replica Server to close all replicas and trigger flush operations:
    ```
    >>> remote_command -l $node replica.kill_partition
    ```
    Wait for about 1 minute for the data to be flushed to the disk to complete.
  * If it is an upgrade, replace the package and configuration file
  * Restart the Replica Server process
  * Use shell tools to send [remote commands](remote-commands#meta-server) to Meta Server, enable `add_secondary` operations, let it quickly supplement replicas:
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node 100
    ```
  * Use the `ls - d` command of the shell tool to check the cluster status and wait for all partitions to fully recover health
  * Continue with the next Replica Server
* Restart the Meta Server process one by one. Restart a single Meta Server steps:
  * If it is an upgrade, replace the package and configuration file
  * Restart the Meta Server process
  * Wait for more than 30 seconds to ensure the continuity of beacons between Meta Server and Replica Servers
  * Continue with the next Meta Server
* Restart the Collector process:
  * If it is an upgrade, replace the package and configuration file
  * Restart the Collector process
* Reset configurations
  * Reset the configurations modified in the above steps using shell tools:
    ```
    >>> remote_command -t meta-server meta.lb.add_secondary_max_count_for_one_node DEFAULT
    >>> remote_command -t meta-server meta.lb.assign_delay_ms DEFAULT
    ```

## Simplified restart steps

If the availability requirement is not high, the restart steps can be simplified as follows:
* If it is an upgrade, please prepare new server packages and configuration files first
* Use shell tools to set the meta level of the cluster to `steady`, turn off [load balancing](rebalance), and avoid unnecessary replica migration
  ```
  >>> set_meta_level steady
  ```
* Restart the Replica Server process one by one. Restart a single Replica Server steps:
  * If it is an upgrade, replace the package and configuration file
  * Restart the Replica Server process
  * Use the `ls - d` command of the shell tool to check the cluster status and wait for all partitions to fully recover health
  * Continue with the next Replica Server
* Restart the Meta Server process one by one. Restart a single Meta Server steps:
  * If it is an upgrade, replace the package and configuration file
  * Restart the Meta Server process
  * Wait for more than 30 seconds to ensure the continuity of beacons between Meta Server and Replica Servers
  * Continue with the next Meta Server
* Restart the Collector process:
  * If it is an upgrade, replace the package and configuration file
  * Restart the Collector process

# Restart script

It can be referenced the script based on [Minos](https://github.com/XiaoMi/minos) and [High availability restart steps](#high-availability-restart-steps): [scripts/pegasus_rolling_update.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_rolling_update.sh).
