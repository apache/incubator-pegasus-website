---
permalink: administration/hotspot-detection
---

# 功能简介
Pegasus 是一个以 `Hash` 分片打散数据的分布式存储系统。通常情况下，流量会均匀地打在集群中的所有节点上。但是在极端情况下，比如 `Hashkey` 设计不合理、出现了热点事件/热点用户、业务代码逻辑错误等场景下，Pegasus 单机节点往往会负载过高从而影响服务整体的可用性。于是我们设计了一套热点检测方案帮助运维人员能及时发现热点问题并找出热点流量。

# 热点分片查询

## 设计原理
Pegasus服务端主要有三个组件：Meta，Replica和Collector。其中Collector负责从Replica中获取Metric信息并上报给监控平台、集群可用性探测等功能。

此功能中，Collector 周期性从集群拿到的各个分片的读写流量进行数据分析，对每个分片通过纵向的历史数据和横向同期数据对比，计算 [Z-score](https://en.wikipedia.org/wiki/Standard_score) 用来描述分片的热点情况。在开启 `enable_hotkey_auto_detect` 选项后，Collector 会自动向热点分片发送 [热点流量查询](#热点流量查询) 请求，统计当前异常的热点流量，并将结果上报到监控平台（Falcon）。

## 操作示例
在配置文件中添加以下几个配置项，然后重启 Collector：
```shell
[pegasus.collector]
# 开启热点流量自动检测功能，当热点分片被确认之后,
# Collector 会向对应的分片发送热点流量查询请求
enable_hotkey_auto_detect = true

# 热点分片阈值(Z-score)为 3。在这里可以理解为算法的灵敏度，
# 超过阈值的会被判定成热点分片。
# 在测试中，我们认为阈值设为 3 为比较合理的选项。
hot_partition_threshold = 3

# 单个分片被判定为热点的累积次数超过这个值就会触发热点流量自动检测。
occurrence_threshold = 100
```

## 相关监控

在Falcon中依据此Metric即可查到是否目标机器存在热点，`hotkey_type` 分为 `read` 和 `write` 分别代表读/写热点。

```
app.stat.hotspots@{app_name}.{hotkey_type}.{partition_count}
```
# 热点流量查询
## 设计原理
此功能可确认某一个分片热点的具体`Hashkey`。 Replica 收到对应分片的热点流量查询请求后，会记录统计一段时间的流量，从而分析出具体的热点流量。如果周期时间内找不到热点流量，收集会自动停止。

## 操作示例
**开启热点流量检测**

你需要在命令行中添加探测表的 `app_id`、分片号、热点数据类型、需要探测的节点地址
```
>>> detect_hotkey -a 3 -p 1 -t write -c start -d 10.231.57.104:34802
Detect hotkey rpc is starting, use 'detect_hotkey -a 3 -p 1 -t write -c query -d 10.231.57.104:34802' to get the result later
```
**查询热点流量结果**

当热点流量检测未结束时，会受到如下提示：
```
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34802
Hotkey detection performed failed, in 584.78, error_hint:ERR_BUSY Can't get hotkey now, now state: hotkey_collector_state::COARSE_DETECTING
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34802
Hotkey detection performed failed, in 584.78, error_hint:ERR_BUSY Can't get hotkey now, now state: hotkey_collector_state::FINE_DETECTING
```

成功获取到热点流量 `hashkey = Thisishotkey1`，后的结果：
```
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34802
Find write hotkey in 3.2 result:\"Thisishotkey1\"
```

周期内无法检测到热点流量的结果：
```
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34803
Hotkey detect rpc performed failed, in 3.2, error_hint:ERR_BUSY Can't get hotkey now, now state: hotkey_collector_state::STOPPED
```

**结束热点流量检测**
```
>>> detect_hotkey -a 3 -p 2 -t write -c stop -d 10.231.57.104:34803
Detect hotkey rpc is stopped now
```
注意：无论是检测成功还是检测失败都要先 `stop` 这次探测才能开始下一次探测。

## 相关配置
```shell
[pegasus.server]
# 粗粒度筛查热点流量的阈值，灵敏度负相关
hot_key_variance_threshold = 5
# 细粒度筛查热点流量的阈值，灵敏度负相关
hot_bucket_variance_threshold = 7
# 设置为负数，一般不推荐改动
hotkey_buckets_num = 37
# 一次探测最长时间
max_seconds_to_detect_hotkey = 150
# 单次探测收集时间周期
hotkey_analyse_time_interval_s = 10
```
