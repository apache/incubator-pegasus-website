---
permalink: administration/zk-migration
---

Pegasus's Meta Server uses Zookeeper to store metadata and leader election, so the instability of the Zookeeper service can cause instability in Pegasus. If necessary, Pegasus metadata needs to be migrated to other more stable or idle Zookeeper.

There are two ways to migrate Zookeeper metadata: through metadata recovery, or through the `zkcopy` tool.

# Migration through metadata recovery

Pegasus provides [Metadata Recovery](meta-recovery) function, it can also be used for Zookeeper migration. The basic idea is to configure a new Zookeeper list and perform metadata recovery through the `recover` command, then the metadata is migrated to the new Zookeeper.

1. Backup table list

   Use the `ls` command of the shell tools:
   ```
   >>> ls -o apps.list
   ```

2. Backup node list

   Use the `nodes` command of the shell tools:
   ```
   >>> nodes -d -o nodes.list
   ```

   Generate the `recover_node_list` file required for metadata recovery:
   ```bash
   grep ALIVE nodes.list | awk '{print $1}' > recover_node_list
   ```

3. Stop all Meta Servers

   Stop all Meta Servers, and wait for a period of time (default to 30 seconds, depending on configuration `[replication]config_sync_interval_ms`) to ensure that all Replica Servers enter the `INACTIVE` state due to the beacon timeout.

4. Modifying Meta Server configuration file

   The modified content is as follows:
   ```
   [meta_server]
     recover_from_replica_server = true
   [zookeeper]
     hosts_list = {new Zookeeper host list}
   ```
   They mean:
    * Set `recover_from_replica_server` to `true` and enable to recover metadata from Replica Servers
    * Update Zookeeper configuration to the new service addresses

5. Start a Meta Server

   Start a Meta Server in the cluster, it will become the leader Meta Server of the cluster.

6. Use the `recover` command of the shell tools

   ```
   >>> recover -f recover_node_list
   ```

7. Modify the configuration file and restart the Meta Server

   After successful recovery, it is necessary to modify the configuration file of the Meta Server and reset to non-recovery state:
   ```
   [meta_server]
     recover_from_replica_server = false
   ```

8. Restart all Meta Servers, then the cluster enters the normal state.

## Sample script

Refer to the main process in the sample script [pegasus_migrate_zookeeper.sh](https://github.com/apache/incubator-pegasus/blob/master/scripts/pegasus_migrate_zookeeper.sh) for Zookeeper metadata migration.

# Migration through the `zkcopy` tool

The basic idea is to use [zkcopy tool](https://github.com/ksprojects/zkcopy) to copy the Pegasus metadata from the original Zookeeper to the target Zookeeper, modify the Meta Server configuration file, and restart the cluster.

1. Stop all follower Meta Servers

   In order to prevent other follower Meta Servers from requiring the lock and becoming the new leader when restarting the leader Meta Server, causing metadata inconsistency, it is necessary to keep only the leader Meta Server in live state and stop all other follower Meta Servers throughout the entire migration process.

2. Modify the leader Meta Server status to `blind`

   Set the leader Meta Server's meta_level to `blind`, to prohibit any update operations on Zookeeper data and prevent metadata inconsistency during the migration process:
   ```
   >>> set_meta_level blind
   ```
   > For an introduction to Meta Server's meta_level, please refer to [Rebalance](rebalance).

3. Use the `zkcopy` tool to copy Zookeeper metadata

   Obtain the path `zookeeper_root` where Pegasus metadata is stored on the Zookeeper through the `cluster_info` command of the shell tools, and then use the `zkcopy` tool to copy all the data from this path to the new Zookeeper, being careful to recursively copy.

4. Modify configuration file

   Modify the configuration file of Meta Servers and change the `hosts_lists` value to the new service addresses:
   ```
   [meta_server]
     hosts_list = {new Zookeeper host list}
   ```

5. Restart the leader Meta Server

   Restart the leader Meta Server and use shell tools to [check](/administration/experiences#troubleshooting) that the cluster has entered the normal state.

6. Restart all follower Meta Servers

   Start all follower Meta Servers and check the cluster enters the normal state.

7. Clean up data on old Zookeepers

   Use the `rmr` command of the [zookeepercli tool](https://github.com/openark/zookeepercli) to clean up data on old Zookeepers.
