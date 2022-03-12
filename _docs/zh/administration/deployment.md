---
permalink: administration/deployment
---

## 准备机器
Pegasus分布式集群至少需要准备这些机器：
* MetaServer：2~3台机器，无需SSD盘。
* ReplicaServer：至少3台机器，建议挂SSD盘。譬如一台服务器挂着8块或者12块SSD盘。这些机器要求是同构的，即具有相同的配置。
* Collector：可选角色，1台机器，无需SSD盘。该进程主要用于收集和汇总集群的统计信息，负载很小，建议放在MetaServer的其中一台机器上。

## 准备Zookeeper
Pegasus集群依赖Zookeeper进行元数据存储和MetaServer抢锁，因此需要一个Zookeeper服务：
* 如果在公司内部维护着Zookeeper集群，直接使用该集群就可以了。
* 如果没有，就自己搭建一个Zookeeper集群，建议在Pegasus集群机器所在的同机房搭建。

记下Zookeeper的服务地址列表，后面配置文件要用。

## 准备配置文件
我们提供了配置文件[src/server/config.ini](https://github.com/apache/incubator-pegasus/blob/master/src/server/config.ini)（从1.7.1版本开始支持），你需要修改该文件，替换所有``%{xxx}``形式的变量为合适的值，如下：

| 变量                  | 说明                                                                                                                   | 示例                           | 
|---------------------|----------------------------------------------------------------------------------------------------------------------|------------------------------|
| %{cluster.name}     | 集群名称。                                                                                                                | my_cluster                   |
| %{home.dir}         | HOME路径。                                                                                                              | /home/work                   |
| %{app.dir}          | 程序工作路径，默认数据文件和日志文件都会放在这下面。                                                                                           | /home/work/app/pegasus       |
| %{slog.dir}         | 存放Shared Commit Log文件的路径，建议放在一个独享的SSD盘上。如果没有可用的SSD盘，可以设置为空字符串，表示默认使用%{app.dir}。                                      | /home/work/ssd1/pegasus      |
| %{data.dirs}        | 存放各Replica数据的路径列表，可以用逗号分隔指定多个盘，每个路径需要指定一个名称，格式为``name1:path1,name2:path2``。如果没有可用的独立SSD盘，可以设置为空字符串，表示默认使用%{app.dir}。 | ssd2:/home/work/ssd2/pegasus |
| %{meta.server.list} | MetaServer地址列表，用逗号分隔，格式为``ip1:port1,ip2:port2``。**注意只能用IP地址，不能用hostname**。                                           | 1.2.3.4:34601,1.2.3.5:34601  |
| %{zk.server.list}   | Zookeeper地址列表，用逗号分隔，格式为``ip1:port1,ip2:port2``。                                                                      | 1.2.3.4:2181,1.2.3.5:2181    |

注意：同一个变量可能出现在多个地方，要保证所有的``%{xxx}``变量都被替换掉。

### 多个SSD盘如何配置
如果有多个SSD盘，推荐使用一个SSD盘专门用于shared log，其他盘用于存储replica数据。

譬如，假设机器有4个盘，挂载路径为/home/work/ssd{id}，其中{id}=1,2,3,4。那么可以将ssd1用于shared log，可配置如下：
```ini
[replication]
  slog_dir = /home/work/ssd1/pegasus
  data_dirs = ssd2:/home/work/ssd2/pegasus,ssd3:/home/work/ssd3/pegasus,ssd4:/home/work/ssd4/pegasus
```

如果只有一个SSD盘，那么就没得选择，只能都用这一个盘。假设SSD盘挂载路径为/home/work/ssd，可配置如下：
```ini
[replication]
  slog_dir = /home/work/ssd/pegasus/{cluster.name}
  data_dirs = ssd:/home/work/ssd/pegasus/{cluster.name}
```

### 多个网卡如何配置
在配置文件中有以下section：
```ini
[network]
  primary_interface =
  io_service_worker_count = 4
```

通过primary_interface指定网卡：
* 如果只有一个网卡，可以设置为空字符串，表示自动获取合适的网卡地址。具体策略就是在ifconfig的列表中查找第一个符合10.\*.\*.\*/172.16.\*.\*/192.168.\*.\*的地址，这样就会忽略回环地址和虚拟地址。
* 如果有多个网卡，请指定网卡名。如果不指定，则会获取第一个符合10.\*.\*.\*/172.16.\*.\*/192.168.\*.\*的地址。

譬如，如果有多个网卡，想使用eth2所在网卡，可配置如下：
```ini
[network]
  primary_interface = eth2
  io_service_worker_count = 4
```

## 准备部署包
ReplicaServer/MetaServer/Collector三种角色的Server共用一套server程序和配置文件。

首先[编译Pegasus](/_docs/zh/build)，编译完成后运行以下命令可以打包生产server端部署包：
```
./run.sh pack_server
```
运行成功后，会在本地文件夹下生产``pegasus-server-{version}-{platform}-{buildType}``的文件夹以及tar.gz包。在文件夹里面有个bin/文件夹，里面包含pegasus_server程序及依赖库，还包括**刚刚修改好的config.ini文件**。

将部署tar.gz包拷贝到各个机器上，并解压。你可以使用合适的分布式分发工具来完成这件事情。

## 启动服务

在启动程序之前，需要先把程序所依赖的动态链接库的路径加入到`LD_LIBRARY_PATH`中：
```
export LD_LIBRARY_PATH=/path/to/your/pegasus/bin:$LD_LIBRARY_PATH
```

启动MetaServer：
```
cd bin/
./pegasus_server config.ini -app_list meta
```

启动ReplicaServer：
```
cd bin/
./pegasus_server config.ini -app_list replica
```

启动Collector：
```
cd bin/
./pegasus_server config.ini -app_list collector
```

集群启动成功后，会默认创建一个``temp``表，该表也用于Collector的集群可用度检查，最好不要删除。

你可以使用[Shell工具](/_docs/zh/tools/shell.md)查看集群的各种状态。如果启动失败，可以到``%{app.dir}/log``下面查看错误日志，排查问题。

# 分布式部署工具

## Minos部署

我们在小米内部使用Minos工具部署，该工具也已经开源，参见[XiaoMi/minos](https://github.com/XiaoMi/minos)。Minos工具能够基于配置模板动态生成合适的配置文件，操作简单，推荐使用。关于如何使用Minos的流程与细节，后续会补充相关文档。

# 常见问题

## 集群清理重建
如果想完全重新部署集群，**以前的数据都不要了**，需要清理以下环境，否则可能出现启动新集群失败的情况：
* 清理MetaServer/ReplicaServer/Collector的```%{app.dir}```、```%{slog.dir}```和```%{data.dirs}```文件夹
* 删除Zookeeper的```/pegasus/%{cluster.name}```节点
