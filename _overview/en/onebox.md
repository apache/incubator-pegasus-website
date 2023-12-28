---
permalink: /overview/onebox/
---

# Understanding the Onebox Cluster
Actions speak louder than words.

When you first delve into Pegasus, you're probably most eager to understand how its cluster functions in action. But as it's a distributed system, you may not have an abundance of machines at your disposal. Hence, we provide the onebox cluster, enabling you to experience the cluster-style service of Pegasus on a single machine.

Here's what the onebox cluster does when it starts up:

- Initiates Zookeeper: Automatically downloads the Zookeeper installation package from a remote source, installs it in the local hidden folder```.zk_install```, and then launches the local Zookeeper service on port 22181.
- Launches 3 MetaServers and 3 ReplicaServers: The ports for the MetaServers are 34601, 34602, and 34603; for the ReplicaServers, they are 34801, 34802, and 34803.
- After the cluster starts, it automatically creates a temporary table.

With the onebox cluster, you can explore how Pegasus operates. You can use the shell tool for reading and writing data, run tests with the bench tool (though don't expect stellar performance from onebox), delve into implementation details through logs, or conduct various experiments on the cluster.

# How to Experience It
Before launching the onebox cluster, you need to compile Pegasus. Please refer to [Compile and Build](/docs/build/compile-from-source/).

To start the onebox cluster:
```bash
./run.sh start_onebox
```

To view the onebox cluster:
```bash
./run.sh list_onebox
```

If you see 3 MetaServer and 3 ReplicaServer processes, congratulations, you've successfully launched it. Otherwise, check the logs and core files in the```./onebox```folder and report any errors to us via a pull request. For example, if the replica1 process is missing, find the core file in```onebox/replica1```(assuming ulimit allows core file generation) and the log files in```onebox/replica1/data/log```.

To stop the onebox cluster:
```bash
./run.sh stop_onebox
```

After stopping, you can restart the cluster using the start_onebox command.

To clean the onebox cluster (including data):
```bash
./run.sh clear_onebox
```

To stop/start/restart any individual process:
```bash
./run.sh start_onebox_instance -h
./run.sh stop_onebox_instance -h
./run.sh restart_onebox_instance -h
```

To manage and view the cluster with the shell tool:
```bash
./run.sh shell
```

For detailed usage of the shell tool, please refer to [Shell Tools](shell).

To perform read/write tests with the bench tool:
```bash
./run.sh bench
```
