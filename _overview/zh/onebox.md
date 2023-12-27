---
permalink: /overview/onebox/
---

# 什么是 onebox 集群

千言万语不如一个行动。

初次接触 Pegasus, 你肯定最想了解这个集群运行起来是什么样子的。但是这是一个分布式系统, 然而你手上未必有那么多机器。因此我们提供了 onebox 集群, 让你在一台机器上就能体验 Pegasus 的集群式服务。

onebox 集群在启动时实际上做了这些事情:
- 启动 Zookeeper: 自动从远程下载 zookeeper安装包, 安装在本地的隐藏文件夹```.zk_install```下, 然后启动本地 Zookeeper 服务，端口为 22181。
- 启动 3 个 MetaServer 和 3 个 ReplicaServer:MetaServer 的端口分别为 34601,34602,34603;ReplicaServer 的端口分别为 34801,34802,34803。
- 集群启动后会默认创建一个 temp 表。

你可以用 onebox 集群感受下 Pegasus 如何工作的, 用 shell 工具读写数据，用 bench 工具跑跑测试 ( 当然别指望 onebox 的性能有多好 ), 也可以通过看日志来了解实现上的一些细节, 或者在集群上折腾各种实验。

# 如何体验

在启动 onebox 集群之前，你需要先编译 Pegasus, 请参考[编译构建](/docs/build/compile-from-source/)。

启动 onebox 集群:
```bash
./run.sh start_onebox
```

查看 onebox 集群:
```bash
./run.sh list_onebox
```
如果你能看到 3 个 MetaServer 和 3 个 ReplicaServer 进程, 那么恭喜你, 启动成功了。否则就到```./onebox```文件夹下查看日志和core文件, 然后给我们发 pull request 报告错误吧。譬如 replica1 进程不在了，那么就到```onebox/replica1```下面找 core 文件 (前提是 ulimit 配置为允许产生 core 文件), 到```onebox/replica1/data/log```下面找日志文件。

停止 onebox 集群:
```bash
./run.sh stop_onebox
```
停止之后你还可以使用 start_onebox 命令重启集群。

清理 onebox 集群 (包括数据):
```bash
./run.sh clear_onebox
```

停止/启动/重启其中的某一个进程:
```bash
./run.sh start_onebox_instance -h
./run.sh stop_onebox_instance -h
./run.sh restart_onebox_instance -h
```

用 shell 工具来查看和管理集群:
```bash
./run.sh shell
```

关于 shell 工具的详细用法, 请参考[Shell工具](shell)。

用 bench 工具进行读写测试:
```bash
./run.sh bench
```
