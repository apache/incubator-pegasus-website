---
permalink: administration/meta-recovery
---

# Functional Objectives
During the Pegasus bootstrap process, the meta server must first pull the table metadata and the topology of all replicas from zookeeper before starting service.

The goal of metadata recovery is to **allow Pegasus to complete system bootstrap without relying on any information from zookeeper**.

The specific process is as follows: the user only needs to provide a set of valid replica servers of the cluster; the meta server interacts with these replica servers to attempt to rebuild the table metadata and replica topology, then writes them to new zookeeper nodes to complete bootstrap.

**Note: The metadata recovery function is only a remedial measure after zookeeper data is corrupted or lost. Operators should strive to avoid such situations.**

# Operational Process
## Demonstration Using a Onebox Cluster
1. Initialize the onebox cluster

   Start only one meta server:
   ```bash
   ./run.sh clear_onebox
   ./run.sh start_onebox -m 1 -w
   ```

   At this point, using the shell command `cluster_info`, you can see the zookeeper node path:
   ```
   zookeeper_root      : /pegasus/onebox/x.x.x.x
   ```

2. Use the bench tool to load data

   Data loading is performed to test the integrity of data before and after metadata recovery:
   ```bash
   ./run.sh bench --app_name temp -t fillseq_pegasus -n 10000
   ```

3. Modify the configuration file

   Use the following commands to modify the meta server configuration file:
   ```bash
   sed -i 's@/pegasus/onebox@/pegasus/onebox_recovery@' onebox/meta1/config.ini
   sed -i 's@recover_from_replica_server = false@recover_from_replica_server = true@' onebox/meta1/config.ini
   ```

   These commands modify the zookeeper path in the configuration file `onebox/meta1/config.ini` and set it to recovery mode:
   * Change `cluster_root = /pegasus/onebox/x.x.x.x` to `cluster_root = /pegasus/onebox_recovery/x.x.x.x`
   * Change `distributed_lock_service_parameters = /pegasus/onebox/x.x.x.x` to `distributed_lock_service_parameters = /pegasus/onebox_recovery/x.x.x.x`
   * Change `recover_from_replica_server = false` to `recover_from_replica_server = true`

4. Restart meta

   ```bash
   ./run.sh stop_onebox_instance -m 1
   ./run.sh start_onebox_instance -m 1
   ```

   After a successful restart, the meta server enters recovery mode. At this point, aside from the start_recovery request, all other RPC requests will return ERR_UNDER_RECOVERY. For example, using the shell command `ls` yields:
   ```
   >>> ls
   list apps failed, error=ERR_UNDER_RECOVERY
   ```

5. Send the recover command through the shell

   First, prepare a file named `recover_node_list` to specify the valid replica server nodes, with one node per line, for example:
   ```
   # comment line
   x.x.x.x:34801
   x.x.x.x:34802
   x.x.x.x:34803
   ```

   Then, use the shell command `recover` to send the start_recovery request to the meta server:
   ```
   >>> recover -f recover_node_list
   Wait seconds: 100
   Skip bad nodes: false
   Skip lost partitions: false
   Node list:
   =============================
   x.x.x.x:34801
   x.x.x.x:34802
   x.x.x.x:34803
   =============================
   Recover result: ERR_OK
   ```

   When the result is ERR_OK, recovery is successful, and you can see the normal table information via the shell command `ls`.

   Also, using the shell command `cluster_info`, you can see that the zookeeper node path has changed:
   ```
   zookeeper_root      : /pegasus/onebox_recovery/x.x.x.x
   ```

6. Check data integrity

   Use the bench tool to query whether the previously written data exists completely:
   ```bash
   ./run.sh bench --app_name temp -t readrandom_pegasus -n 10000
   ```

   The final statistics should show `(10000 of 10000 found)`, indicating that the data is completely intact after recovery.

7. Modify the configuration file and restart meta

   After recovery succeeds, modify the configuration file to revert back to non-recovery mode:
   * Change `recover_from_replica_server = true` back to `recover_from_replica_server = false`

   Restart the meta server:
   ```bash
   ./run.sh stop_onebox_instance -m 1
   ./run.sh start_onebox_instance -m 1
   ```

   This step prevents the meta server from entering recovery mode again upon restart, which would make the cluster unavailable.

## Online Cluster Recovery

When performing metadata recovery on an online cluster, please follow steps `3~7` above and note the following:
* When specifying valid replica server nodes in `recover_node_list`, ensure that all nodes are functioning properly.
* Do not forget to set `recover_from_replica_server` to true in the configuration file before recovery.
* Recovery can only be performed on new or empty zookeeper nodes.
* After recovery, reset `recover_from_replica_server` to false in the configuration file.

## Common Issues and Solutions

* **Recovery to a non-empty zookeeper node**

  In this case, the MetaServer should fail to start and coredump:
  ```
  F12:16:26.793 (1488341786793734532 26cc)   meta.default0.0000269c00010001: /home/Pegasus/pegasus/rdsn/src/dist/replication/meta_server/server_state.cpp:698:initialize_data_structure(): assertion expression: false
  F12:16:26.793 (1488341786793754317 26cc)   meta.default0.0000269c00010001: /home/Pegasus/pegasus/rdsn/src/dist/replication/meta_server/server_state.cpp:698:initialize_data_structure(): find apps from remote storage, but [meta_server].recover_from_replica_server = true
  ```

* **Forgetting to set recover_from_replica_server to true**

  The meta server will start normally, but since the apps fetched from zookeeper are empty, during config sync it finds unrecognized replicas on the replica server, leading to metadata inconsistency and a coredump:
  ```
  F12:22:21.228 (1488342141228270056 2764)   meta.meta_state0.0102000000000001: /home/Pegasus/pegasus/rdsn/src/dist/replication/meta_server/server_state.cpp:823:on_config_sync(): assertion expression: false
  F12:22:21.228 (1488342141228314857 2764)   meta.meta_state0.0102000000000001: /home/Pegasus/pegasus/rdsn/src/dist/replication/meta_server/server_state.cpp:823:on_config_sync(): gpid(2.7) on node(10.235.114.240:34801) is not exist on meta server, administrator should check consistency of meta data
  ```

* **Cannot connect to a replica server during recovery**

  If the meta server fails to connect to a replica server during recovery, the recover command will fail:
  ```
  >>> recover -f recover_node_list
  Wait seconds: 100
  Skip bad nodes: false
  Skip lost partitions: false
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  x.x.x.x:34804
  =============================
  Recover result: ERR_TRY_AGAIN
  =============================
  ERROR: collect app and replica info from node(x.x.x.x:34804) failed with err(ERR_NETWORK_FAILURE), you can skip it by set skip_bad_nodes option
  =============================
  ```

  You can force skipping problematic nodes by specifying the `--skip_bad_nodes` parameter. Note that skipping bad nodes may result in some partitions having an incomplete number of replicas, risking data loss.
  ```
  >>> recover -f recover_node_list --skip_bad_nodes
  Wait seconds: 100
  Skip bad nodes: true
  Skip lost partitions: false
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  =============================
  Recover result: ERR_OK
  =============================
  WARNING: collect app and replica info from node(x.x.x.x:34804) failed with err(ERR_NETWORK_FAILURE), skip the bad node
  WARNING: partition(1.0) only collects 2/3 of replicas, may lost data
  WARNING: partition(1.1) only collects 2/3 of replicas, may lost data
  WARNING: partition(1.3) only collects 2/3 of replicas, may lost data
  WARNING: partition(1.5) only collects 2/3 of replicas, may lost data
  WARNING: partition(1.7) only collects 2/3 of replicas, may lost data
  =============================
  ```

* **Recovery finds a partition with an incomplete replica count**

  When a partition collects an incomplete set of replicas, recovery will still succeed but with warning messages:
  ```
  >>> recover -f recover_node_list
  Wait seconds: 100
  Skip bad nodes: false
  Skip lost partitions: false
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  =============================
  Recover result: ERR_OK
  =============================
  WARNING: partition(1.0) only collects 1/3 of replicas, may lost data
  =============================
  ```

* **Recovery finds a partition with no available replica**

  If a partition fails to collect any available replica, recovery will fail:
  ```
  >>> recover -f recover_node_list
  Wait seconds: 100
  Skip bad nodes: false
  Skip lost partitions: false
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  =============================
  Recover result: ERR_TRY_AGAIN
  =============================
  ERROR: partition(1.0) has no replica collected, you can force recover it by set skip_lost_partitions option
  =============================
  ```

  You can force recovery by specifying the `--skip_lost_partitions` parameter, which will initialize partition(1.0) as an empty replica. **Use with caution, as data loss may occur.**
  ```
  >>> recover -f recover_node_list --skip_lost_partitions
  Wait seconds: 100
  Skip bad nodes: false
  Skip lost partitions: true
  Node list:
  =============================
  x.x.x.x:34801
  x.x.x.x:34802
  x.x.x.x:34803
  =============================
  Recover result: ERR_OK
  =============================
  WARNING: partition(1.0) has no replica collected, force recover the lost partition to empty
  =============================
  ```

* **Recovery of soft-deleted tables**

  For tables that have been deleted, due to the [Table Soft-Delete](table-soft-delete) feature, as long as the retention period has not expired, the replica data on the replica servers will not be cleaned up. Therefore, such tables can be recovered and treated as normal, non-deleted tables— that is, the deletion information is lost, but the data is intact.

  Since a new table with the same name can be created after deletion, the recovery process may find multiple tables using the same name, causing a conflict. In such cases, the table with the highest id retains its original name, while the others are renamed to `{name}-{id}`.

# Design and Implementation
The design and implementation of the metadata recovery function are as follows:
* The meta server provides a configuration option to indicate whether to enter metadata recovery mode when no metadata is obtained from zookeeper.
* The shell provides a recovery command to trigger the meta server to start the metadata recovery process.
* If the metadata recovery process is initiated, the meta server will receive heartbeat messages from replica servers and will only respond to a special `start_recovery` RPC, ignoring all other types of RPC.
* The user must specify a set of replica servers; the meta server communicates only with the nodes in this set and responds to their `start_recovery` RPC to collect information for bootstrap. Any communication failure between the meta server and any node will cause the recovery process to fail.