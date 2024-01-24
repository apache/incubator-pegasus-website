---
permalink: administration/deployment
---

# 准备服务器

Pegasus 分布式集群至少需要准备这些服务器：
* MetaServer：2~3 台服务器，无需 SSD 盘。
* ReplicaServer：至少 3 台服务器，建议挂载 SSD 盘。多块磁盘能够提升节点的吞吐能力，各台服务器挂载相同数量和性能（例如，IOPS，带宽和读写延迟等）的磁盘来保证负载均衡。
* Collector：可选角色，1 台服务器，无需 SSD 盘。该进程主要用于收集和汇总集群的 metrics 信息，负载很小，建议部署在 MetaServer 的其中一台服务器上。

# 准备 Apache Zookeeper

Pegasus 集群依赖 Zookeeper 进行元数据存储和 MetaServer 选主，因此需要一个 Zookeeper 服务。
* 建议在 Pegasus 集群服务器所在的同机房搭建。

# 准备配置文件

从 1.7.1 版本开始，Pegasus 提供了 [配置文件](https://github.com/apache/incubator-pegasus/blob/master/src/server/config.ini)，你需要修改该文件，替换所有 `%{xxx}` 形式的变量为合适的值。如下：

| 变量                 | 说明                                                                                                       | 示例                                                      | 
|---------------------|----------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| %{cluster.name}     | 集群名称。会用于 collector 的指标上报标签等                                                                              | my_cluster                                                |
| %{home.dir}         | Pegasus 主路径。会存放全局的配置文件，如磁盘黑名单配置文件                                                                        | /home/work                                                |
| %{app.dir}          | 程序工作路径。默认数据文件和日志文件都会放在这里                                                                                 | /home/work/app/pegasus                                    |
| %{slog.dir}         | 存放 shared-log 文件的路径，建议放在一个独享的 SSD 盘上。如果没有可用的 SSD 盘，可以设置为空字符串，表示默认使用 `%{app.dir}`。2.6 版本之后已废弃             | /home/work/ssd1/pegasus                                   |
| %{data.dirs}        | 存放用户数据的路径列表，用逗号分隔。每个路径需要指定一个名称，格式为 `name1:path1,name2:path2`。如果没有可用的 SSD 盘，可以设置为空字符串，表示默认使用 `%{app.dir}` | ssd2:/home/work/ssd2/pegasus,ssd3:/home/work/ssd3/pegasus |
| %{meta.server.list} | MetaServer 地址列表，用逗号分隔。格式为 `ip1:port1,ip2:port2`。**注意：目前只支持 IP 地址，不支持 hostname**                          | 1.2.3.4:34601,1.2.3.5:34601                               |
| %{zk.server.list}   | Zookeeper 地址列表，用逗号分隔。格式为 `ip1:port1,ip2:port2`                                                           | 1.2.3.4:2181,1.2.3.5:2181                                 |

> 配置的含义请参考 [配置说明](/administration/config)。

> 注意：同一个变量可能出现在多个地方，要保证所有的 `%{xxx}` 变量都被替换掉。

## 多个 SSD 盘如何配置

如果有多个 SSD 盘，推荐使用一个 SSD 盘专门用于 slog（即 shared-log），其他盘用于存储各分片的用户数据。

譬如，假设服务器有 4 个盘，挂载路径为 `/home/work/ssd{id}`，其中 {id}=1,2,3,4。那么可以将 ssd1 用于 slog，可配置如下：
```ini
[replication]
  slog_dir = /home/work/ssd1/pegasus
  data_dirs = ssd2:/home/work/ssd2/pegasus,ssd3:/home/work/ssd3/pegasus,ssd4:/home/work/ssd4/pegasus
```

如果只有一个 SSD 盘，那么就只能将 slog 和 data 共享这一块盘。假设 SSD 盘挂载路径为 `/home/work/ssd`，可配置如下：
```ini
[replication]
  slog_dir = /home/work/ssd/pegasus/{cluster.name}
  data_dirs = ssd:/home/work/ssd/pegasus/{cluster.name}
```

## 多个网卡如何配置

在配置文件中有以下 section：
```ini
[network]
  primary_interface =
```

通过 `primary_interface` 指定网卡：
* 如果只有一块网卡，可以设置为空字符串，表示自动获取合适的网卡地址。具体策略就是在 `ifconfig` 命令的输出列表中，查找第一个符合 `10.\*.\*.\*/172.16.\*.\*/192.168.\*.\*` 规则的地址（即内网地址），这样就会忽略回环地址和虚拟地址。
* 如果有多个网卡，请指定网卡名。如果不指定，则会获取第一个符合 `10.\*.\*.\*/172.16.\*.\*/192.168.\*.\*` 规则的地址。

譬如，如果有多个网卡，想使用 eth2 所在网卡，可配置如下：
```ini
[network]
  primary_interface = eth2
```

# 准备部署包

ReplicaServer，MetaServer，Collector 三种角色共用一套二进制程序和配置文件。

首先 [编译 Pegasus](/overview/compilation)，编译完成后运行以下命令可以打包生成 server 端部署包：
```
./run.sh pack_server
```
运行成功后，会在本地文件夹下产生 `pegasus-server-{version}-{gitSHA}-{platform}-{buildType}` 的目录以及 tar.gz 包。其中有个 `bin/` 目录，里面包含 pegasus_server 程序及依赖库，还包括刚刚修改好的 config.ini 文件。

将 tar.gz 包拷贝到需要部署的服务器上并解压。

# 启动服务

在启动程序之前，需要先把程序所依赖的动态链接库的路径加入到 `LD_LIBRARY_PATH` 中：
```
export LD_LIBRARY_PATH=/path/to/your/pegasus/bin:$LD_LIBRARY_PATH
```

## 启动 MetaServer：
```
cd bin/
./pegasus_server config.ini -app_list meta
```

## 启动 ReplicaServer：
```
cd bin/
./pegasus_server config.ini -app_list replica
```

## 启动 Collector：
```
cd bin/
./pegasus_server config.ini -app_list collector
```

* 集群启动成功后，会默认创建一个 `temp` 表，该表也用于 Collector 的集群可用度检查。
* 可以使用 [Shell 工具](/overview/shell) 查看集群的各种状态。
* 如果启动失败，可以到 `%{app.dir}/log` 内查看日志，排查问题。

# 常见问题

## 集群清理

如果想完全重新部署集群，**并清理所有数据**，需要清理以下环境，否则可能会出现启动新集群失败的问题：
* 清理 MetaServer，ReplicaServer 和 Collector 的 `%{app.dir}`，`%{slog.dir}` 和 `%{data.dirs}` 目录
* 删除 Zookeeper 的 `%{cluster_root}` 背包路径
