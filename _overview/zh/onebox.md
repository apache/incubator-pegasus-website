---
permalink: /overview/onebox/
---

# 什么是onebox集群

千言万语不如一个行动。

初次接触Pegasus，你肯定最想了解这个集群运行起来是什么样子的。但是这是一个分布式系统，然而你手上未必有那么多机器。因此我们提供了onebox集群，让你在一台机器上就能体验Pegasus的集群式服务。

onebox集群在启动时实际上做了这些事情：
* 启动Zookeeper：自动从远程下载zookeeper安装包，安装在本地的隐藏文件夹```.zk_install```下，然后启动本地Zookeeper服务，端口为22181。
* 启动3个MetaServer和3个ReplicaServer：MetaServer的端口分别为34601,34602,34603；ReplicaServer的端口分别为34801,34802,34803。
* 集群启动后会默认创建一个temp表。

你可以用onebox集群感受下Pegasus如何工作的，用shell工具读写数据，用bench工具跑跑测试（当然别指望onebox的性能有多好），也可以通过看日志来了解实现上的一些细节，或者在集群上折腾各种实验。

# 如何体验

在启动onebox集群之前，你需要先编译Pegasus，请参考[编译构建](/_docs/zh/build/compile-from-source.md) 。

启动onebox集群：
```bash
./run.sh start_onebox
```

查看onebox集群：
```bash
./run.sh list_onebox
```
如果你能看到3个MetaServer和3个ReplicaServer进程，那么恭喜你，启动成功了。否则就到```./onebox```文件夹下查看日志和core文件，然后给我们发pull request报告错误吧。譬如replica1进程不在了，那么就到```onebox/replica1```下面找core文件（前提是ulimit配置为允许产生core文件），到```onebox/replica1/data/log```下面找日志文件。

停止onebox集群：
```bash
./run.sh stop_onebox
```
停止之后你还可以使用start_onebox命令重启集群。

清理onebox集群（包括数据）：
```bash
./run.sh clear_onebox
```

停止/启动/重启其中的某一个进程：
```bash
./run.sh start_onebox_instance -h
./run.sh stop_onebox_instance -h
./run.sh restart_onebox_instance -h
```

用shell工具来查看和管理集群：
```bash
./run.sh shell
```
关于shell工具的详细用法，请参考[Shell工具](/_docs/zh/tools/shell.md) 。

用bench工具进行读写测试：
```bash
./run.sh bench
```
