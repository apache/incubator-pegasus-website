---
permalink: administration/scale-in-out
---

# Design goal

When the storage capacity of the cluster is insufficient or the read/write throughput is too high, it is necessary to scale out the capacity by adding more nodes. On the contrary, scaling in can be achieved by reducing the number of nodes.

> The scaling in and scaling out described in this document are for replica servers.

When scale out or scale in the cluster, it's necessary to consider:
* Do not stop Pegasus service
* Try not to affect availability as much as possible
* Minimize unnecessary data transmission as much as possible

# Scale out steps

The scale out steps are relatively simple:
* To add multiple servers, start the replica server process on these newly added servers. After starting, the replica server will actively contact the meta server and join the node list.
* When the meta level is `steady`, [load balancing](rebalance) is not performed. Therefore, when using the `nodes -d` command in the shell tool, you can see that the status of the newly added node is in `ALIVE` status, but the count of replicas served by the node is `0`.
* Set through shell tool `set_meta_level lively` to start load balancing, and the meta server will gradually migrate some replicas to the newly added node.
* Observe the servicing replicas through the `nodes -d` command of the shell tool. After reaching balanced status, use the `set_meta_level steady` to turn off load balancing and complete the scale out process.

# Scale in steps

There are more factors to consider when scaling in compared to scaling out, mainly including:
* If multiple nodes need to be removed from the cluster at the same time, they need to be removed one by one, and wait for one to be removed completely before removing another to avoid affecting the availability of the cluster and data integrity.
* If multiple nodes need to be removed from the cluster at the same time, when removing one node, it is advisable to avoid the meta server assigning replicas to other nodes that are about to be removed when curing replicas. Otherwise, when removing other nodes, it has to cure the replicas again, resulting in unnecessary cross node data transmission. [Black_list](/administration/rebalance#assign_secondary_black_list) is provided for this aim.

> Note: When the node has been removed, its status on the meta server will change to `UNALIVE`, which may cause the proportion of `ALIVE` nodes to be lower than the configuration value of `node_live_percentage_threshold_for_update`, then the meta server will automatically downgrade to the `freezed` state, then all `reconfiguration` operations (i.e. reassigning replicas operations) cannot be performed, and the scaling in process cannot be performed. So before scaling in, it is necessary to calculate whether the situation would be caused. If so, modify the configuration of the meta server and set the `node_live_percentage_threshold_for_update` to low enough to ensure that the meta server does not automatically downgrade to the `freezed` state during the scaling in process.

## Recommended scaling in steps

* Calculate the proportion of `ALIVE` nodes after scaling in, if it is lower than configuration value of `node_live_percentage_threshold_for_update`, then use [remote commands](/administration/remote-commands) to update the value to be small enough.
  ```
  >>> remote_command -t meta-server meta.live_percentage $percentage
  ```
  `percentage` is an integer with a value range of [0, 100].
* Using shell tools command `set_meta_level` to set the cluster to `steady` mode and disable the [rebalance](rebalance) to avoid unnecessary replica migration.
  ```
  >>> set_meta_level steady
  ```
* Use shell tools to send [remote commands](remote-commands#meta-server) to the meta server to update `assign_secondary_black_list`:
  ```
  >>> remote_command -t meta-server meta.lb.assign_secondary_black_list $address_list
  ```
  `address_list` is the `ip:port` list of nodes to be removed, separated by commas.
* Use shell tools to set `assign_delay_ms` to 10, to make it possible to cure replicas immediately on other alive nodes after the node has been removed:
  ```
  >>> remote_command -t meta-server meta.lb.assign_delay_ms 10
  ```
* Remove replica servers one by one. The removing steps for a single replica server:
    * Kill the replica server process that you want to remove.
    * Use shell tools command `ls -d` to check the cluster status, wait for all partitions to be fully recovered to health status (all tables have 0 unhealthy partition counts).
    * Clean up the data on this node to free up disk space.
* Restart the meta server:
    * Restarting the meta server is to clear the records of the removed nodes (i.e. no longer displaying removed nodes in the `nodes -d` command of the shell tools), reset the modified configuration items mentioned above.

## Script

The above steps are completed by the script [scripts/pegasus_offline_node_list.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_offline_node_list.sh).
> However, this script cannot be used directly because it relies on the [minos deployment tool](https://github.com/XiaoMi/minos).

# Nodes migration

The nodes migration of the cluster can be achieved by first scaling out and then scaling in. To minimize unnecessary data transmission, it is recommended to follow the following steps:
* Scaling out: Add the new servers to the cluster, but temporarily do not perform [rebalance](/administration/rebalance) after joining.
* Scaling in: Remove the old servers through the [Scale in steps](#scale-in-steps) above.
* Perform [rebalance](/administration/rebalance).

# Other configurations

* Limit the migration speed. It can be achieved by limiting the read and write bandwidth per disk to avoid the performance impact caused by high disk IO throughput.
  ```
  >>> remote_command -t replica-server nfs.max_send_rate_megabytes_per_disk $rate
  >>> remote_command -t replica-server nfs.max_copy_rate_megabytes_per_disk $rate
  ```
  The unit of `rate` is `MB/s`.
