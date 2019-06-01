---
title: Benchmark
layout: page
show_sidebar: false
menubar: overview_menu
---

* [Benchmark on v1.10.0](#benchmark-on-v1100)
  * [测试环境](#测试环境)
  * [测试结果](#测试结果)
* [Benchmark with redis proxy](#benchmark-with-redis-proxy)
  * [测试配置](#测试配置-2)
  * [测试结果](#测试结果-1)
***

# Benchmark on v1.10.0

测试时间：2018/07/27

## 测试环境

机器配置：
* CPU：E5-2620v3 *2
* 内存​：128GB
* 存储：480G SSD *8
* 网卡：10Gb

集群配置：
* 节点数：5个replica server节点 (使用[v1.10.0](https://github.com/XiaoMi/pegasus/releases/tag/v1.10.0)版本)
* 测试表的Partition数：64个
* Load的数据总条数：3亿条
* 单条数据大小：320字节

## 测试结果

测试工具：[YCSB](https://github.com/xiaomi/pegasus-ycsb) (使用Pegasus Java Client)

读写请求的数据分布特征：zipfian，可以理解为遵守80/20原则的数据分布，即80%的访问都集中在20%的内容上。

测试结果：

| 测试Case | 读写比 | 运行时长 | 读QPS | 读Avg延迟 | 读P99延迟 | 写QPS | 写Avg延迟 | 写P99延迟  
| -------- | ---- | ------------- | ----- | -------- | --------- | ----- | -------- | -------- |  
| (1)数据加载: 3客户端*10线程 | 0:1 | 1.89 | - | - | - | 44039 | 679 | 3346
| (2)​读写同时: 3客户端*15线程 | ​1:3 | 1.24 | 16690 | 311 | 892 | 50076 | 791 | 4396
|​ (3)读写同时: 3客户端*30线程 | ​30:1 | 1.04 | 311633 | 264 | 511 | 10388 | 619 | 2468
| (4)数据只读: 6客户端*100线程 | 1:0​ | ​0.17 | ​978884 | 623 | ​1671 | - | - | -
| (5)数据只读: 12客户端*100线程 | 1:0​ | ​0.28 | ​1194394 | 1003 | ​2933 | - | - | -

注：
* 运行时长单位：小时。
* QPS单位：条/秒。
* 延迟单位：微秒。

## Benchmark with redis proxy
对pegasus redis proxy进行测试。

### 测试配置

 * Server端：3 replica server + 3 proxy（共用机器）
 * Client端：与Server不同的3台机器
 * 测试表的partition_count = 16，所有replica在3个replica server上均匀分布

### 测试结果
单replica server平均QPS（总QPS / 3）： 
 * set QPS 13000
 * get QPS 43814

延迟： 
 * set P99 13ms，P999 20ms，P9999 34ms
 * get P99 6ms，P999 14ms，P9999 40ms
