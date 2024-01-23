---
permalink: administration/deployment
---

# Prepare servers

The Pegasus distributed cluster requires at least these servers to be prepared:
* MetaServer: 2 or 3 servers, no SSD required.
* ReplicaServer: At least 3 servers, it is recommended to mount SSD disks. Multiple disks can improve the throughput capacity of a single node, and each server should mount the same number and performance (e.g., IOPS, bandwidth and R/W latency) of disks to ensure load balancing.
* Collector: Optional role, 1 server, no SSD required. This process is mainly used to collect and summarize cluster metrics, with a small load. It is recommended to deploy it on one of the MetaServer servers.

# Prepare Apache Zookeeper

The Pegasus cluster relies on Zookeeper for metadata storage and MetaServer leader election, therefore requiring a Zookeeper service.
* It is recommended to deploy Zookeeper in the same server room as the Pegasus cluster server.

# Prepare configuration files

Since 1.7.1, Pegasus has provided [configuration file](https://github.com/apache/incubator-pegasus/blob/master/src/server/config.ini), you need to modify the file to replace all variables in the form of `%{xxx}` with appropriate values. As follows:

| Variables           | Description                                                                                                                                                                                                                                                           | Example                                                   | 
|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| %{cluster.name}     | Cluster name. Indicator reporting labels that will be used for collectors, etc                                                                                                                                                                                        | my_cluster                                                |
| %{home.dir}         | Pegasus home path. It will store global configuration files, such as disk blacklist configuration files                                                                                                                                                               | /home/work                                                |
| %{app.dir}          | Program working path. The data files and log files will be placed here by default                                                                                                                                                                                     | /home/work/app/pegasus                                    |
| %{slog.dir}         | The path to store the shared-log files. It is recommended to place it on an exclusive SSD drive. If there is no available SSD disk, it can be set as an empty string, indicating that `%{app.dir}` is used by default. Deprecate since version 2.6                    | /home/work/ssd1/pegasus                                   |
| %{data.dirs}        | A list of paths to store user data, separated by commas. Each path needs to be specified with a name in the format of `name1:path1,name2:path2`. If there is no available SSD disk, it can be set as an empty string, indicating that `%{app.dir}` is used by default | ssd2:/home/work/ssd2/pegasus,ssd3:/home/work/ssd3/pegasus |
| %{meta.server.list} | MetaServer address list, separated by commas. In the format of `ip1:port1,ip2:port2`. **Note: Currently, only IP addresses are supported and hostnames are not supported**                                                                                            | 1.2.3.4:34601,1.2.3.5:34601                               |
| %{zk.server.list}   | Zookeeper address list, separated by commas. In the format of `ip1:port1,ip2:port2`                                                                                                                                                                                   | 1.2.3.4:2181,1.2.3.5:2181                                 |

> Please refer to the meaning of [configuration](/administration/config)。

> Note: The same variable may appear in multiple places, so it is important to ensure that all `%{xxx}` variables are replaced.

## How to configure multiple SSD disks

If there are multiple SSD disks, it is recommended to use one SSD disk specifically for slog (i.e., shared-log) and the other disks to store user data for each replicas.

For example, suppose the server has 4 disks and the mounting path is `/home/work/ssd{id}`, where {id}=1,2,3,4. So you can use ssd1 for slog, which can be configured as follows:
```ini
[replication]
  slog_dir = /home/work/ssd1/pegasus
  data_dirs = ssd2:/home/work/ssd2/pegasus,ssd3:/home/work/ssd3/pegasus,ssd4:/home/work/ssd4/pegasus
```

If there is only one SSD drive, then both slog and each replicas data share this drive. Assuming the SSD disk mounting path is `/home/work/ssd`, it can be configured as follows:
```ini
[replication]
  slog_dir = /home/work/ssd/pegasus/{cluster.name}
  data_dirs = ssd:/home/work/ssd/pegasus/{cluster.name}
```

## How to configure multiple network cards

There is a section in the configuration file:
```ini
[network]
  primary_interface =
```
Specify network card through `primary_interface`:
* If there is only one network card, it can be set as an empty string to automatically obtain the appropriate network card address. The specific strategy is to search for the first address that complies with the `10.\*.\*.\*/172.16.\*.\*/192.168.\*.\*` rule (i.e., the intranet address) in the output list of the `ifconfig` command, which will ignore the loopback address and virtual address.
* If there are multiple network cards, please specify the network card name. If not specified, the first address that complies with `10.\*.\*.\*/172.16.\*.\*/192.168.\*.\*` rules will be used.

For example, if there are multiple network cards and you want to use the `eth2` network card, you can configure it as follows:
```ini
[network]
  primary_interface = eth2
```

# Preparing to deploy packages

The three roles of ReplicaServer, MetaServer, and Collector share the same program binaries and configuration files.

At first [build Pegasus](/overview/compilation). After building, run the following command to package and generate a server-side deployment package:
```
./run.sh pack_server
```
After successful packed, a directory and a tar.gz package named `pegasus-server-{version}-{gitSHA}-{platform}-{buildType}` will be generated in the local path.
There is a `bin/` directory that contains pegasus_server program binary and dependency libraries, as well as the recently modified `config.ini` file.

Copy the tar.gz package to the server that needs to be deployed and unzip it.

# Start Service

Before starting the server, it is necessary to add the path of the dynamic link libraries that the program depends on to `LD_LIBRARY_PATH`:
```
export LD_LIBRARY_PATH=/path/to/your/pegasus/bin:$LD_LIBRARY_PATH
```

## Start MetaServer：
```
cd bin/
./pegasus_server config.ini -app_list meta
```

## Start ReplicaServer：
```
cd bin/
./pegasus_server config.ini -app_list replica
```

## Start Collector：
```
cd bin/
./pegasus_server config.ini -app_list collector
```

* After the cluster is successfully started, a `temp` table will be created by default, which is also used for the cluster availability detection by the Collector.
* Use [Shell tools](/overview/shell) to view various states of the cluster.
* If the startup fails, you can check the logs in `%{app.dir}/log` to troubleshoot the issue.

# FAQ

## Cluster cleaning

If you want to completely redeploy the cluster and **clean up all data**, you need to clean up the following environment, otherwise there may be issues when starting a new cluster:
* Clean up the `%{app.dir}`, `%{slog.dir}` and `%{data.dirs}` directories of MetaServer，ReplicaServer and Collector
* Clean up the `/pegasus/%{cluster.name}` backpack path of Zookeeper
