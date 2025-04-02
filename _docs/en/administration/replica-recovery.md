---
permalink: administration/replica-recovery
---

# Principle

Generally speaking, data in Pegasus is stored with 3 replicas. For each partition, under normal situation, there should be one primary replica and two secondary replicas, totaling three replicas providing service.

However, it is inevitable that the cluster will experience node crashes, network anomalies, heartbeat disconnections, and other situations that can cause replica loss, affecting the availability of services. The degree of replica loss affects the ability to read and write (introduced in [Load Balancing](rebalance#conceptual) as well):

* One primary and two replicas are available: The partition is completely healthy and can **read and write normally**.
* One primary and one replica are available: According to the PacificA consistency protocol, it can still **read and write safely**.
* Only one primary is available: At this point, it is **not writable**, but **readable**.
* All are unavailable: At this point, it is **neither readable nor writable**. This situation is referred to as **DDD**, which stands for Dead-Dead-Dead, indicating that all three replicas are unavailable.

In the above situations, except for the **completely unavailable DDD state**, MetaServer can automatically replenish replicas and eventually restore to a completely healthy state. However, if a partition enters the DDD state, MetaServer cannot automatically recover it and manual intervention is required.

[This discussion](https://github.com/XiaoMi/rdsn/issues/80) provides examples of entering the DDD state. In fact, **as long as a partition enters the DDD state and one of the last two nodes in LastDrop cannot start normally, it will enter the DDD state requiring manual intervention**. During the process of multiple nodes starting and stopping in an online cluster, this situation is quite common.

The health status can be viewed using the `ls -d` command in the Shell tool. If the number of `read_unhealthy` is greater than 0, it indicates that a partition has entered the DDD state.



# DDD Diagnostic Tool

Starting from version v1.11.0, Pegasus has provided the `ddd_diagnose` command in the Shell tool to support automatic DDD diagnostics.

Command usage:

```
ddd_diagnose [-g|--gpid appid|appid.pidx] [-d|--diagnose] [-a|--auto_diagnose]
             [-s|--skip_prompt] [-o|--output file_name]
```

Parameter explanation:

* `-g`: Specify the app_id or partition_id, for example, `-g 1` or `-g 1.3`; if not specified, the operation is performed on all tables.

* `-d`: Enter diagnostic mode; if not specified, only the DDD situation is displayed without diagnosis.

* `-a`: Enable automatic diagnosis, that is, if the diagnostic tool can find a suitable backup as the primary backup for this partition while ensuring data consistency, it automatically sets it as primary to complete data recovery without manual intervention.

* `-s`: Avoid interactive mode; if not specified, the diagnostic process may require user input to complete selections, confirmations, or information supplementation.

* `-o`: Output the results to a specified file.

  

Usage example (if not clear, please open the image in a separate page):

![ddd-diagnose.png](/assets/images/ddd-diagnose.png){:class="img-responsive"}

The above image is the output when using the `ddd_diagnose` command, and we explain it in sequence with red arrows:

1. The current partition id being diagnosed.

2. The `ballot` and `last_committed_decree` information of this partition persisted in zookeeper, but since persistence is not real-time, this value may be less than the actual value.

3. The dropped list, listing the status information of nodes that have served this partition, focusing on:

   * alive: Whether the node is available.

   * ballot: The actual `ballot` of the replica on this partition on that node; if it is -1, it means that there is no data for this partition on that node.

   * last_committed: The actual `last_committed_decree` of the replica on this partition on that node.

   * last_prepared: The actual `last_prepared_decree` of the replica on this partition on that node.

   * If there is a `<==` at the end, it indicates whether the node is the **latest to become unavailable** or the **second to last to become unavailable**.

4. The last_drops list, recording the chronological order in which nodes become unavailable.

5. ddd_reason, indicating the reason why this partition has become a DDD state.

6. recommanded_primary, the new primary recommended by the diagnostic tool under the premise of ensuring data consistency; if it cannot be given, it is `none`.

7. If step 6 provides a recommended node, then prompt the user for the next step (if the `-a` or `-s` option is specified, this step will not be entered, equivalent to always automatically selecting y):

   * y: Use the recommended node as the new primary.

   * n: Do not use the recommended node and let the user choose another node.

   * s: Ignore the diagnosis of this partition.

8. If step 6 does not provide a recommended node or step 7 chooses n, then prompt the user to enter a new node as the primary.

9. Generate a propose command, send it to MetaServer, and designate the node as the new primary to recover this partition.

10. Receive the reply to the propose command, `ERR_OK` indicates successful execution.

11. Display the current progress, with the numerator being the number of diagnoses completed and the denominator being the total number of diagnoses needed.

**Recommended usage**:

* `ddd_diagnose -d -a`, that is, enable automatic diagnosis, for partitions that cannot be diagnosed automatically, obtain manual intervention through interaction with the user. This is the simplest and most worry-free method, and in most cases, the recovery process can be completed automatically without manual intervention.

In cases where automatic diagnosis cannot be completed, step 8 in the above figure will be entered, requiring the user to input a new node as the primary. So, among the many nodes in the dropped list, how to choose the most suitable node as the primary? Our suggestion is:

* **Among all nodes where alive is true, choose the node with the largest `last_prepared` value**, because this can recover as much data as possible and reduce the possibility of data loss.
