---
title: Backup Request
layout: page
menubar: administration_menu
---

# 背景
在当前的Pegasus实现中，由于向secondary读取会导致不一致的情况发生，所以目前Pegasus仅仅支持对primary副本的读取。但是在某些情况下（例如：负载均衡、热点写入等）经常会导致primary不稳定。所以我们希望在primary不稳定时能够读取secondary，通过牺牲部分强一致性来降低读请求的长尾并提高系统的可用性。backup request便是用来实现此功能的。

# 设计实现

backup reqeust的实现原理比较简单：对于读操作（目前写操作不支持backup request），当client向primary发送请求后，如果经过一段时间延时（通常是p999）其response仍然没有返回，则随机选择一台secondary并向其发送backup request。最后获取最快返回来的response进行处理。

这里发送secondary请求的延时我们建议选择p999，因为backup request操作是用来实现消除长尾的，并不是提升集群性能的。如果将该值设置过低，则会由于backup request的请求量过大而导致集群压力增大（假设选择p50作为其延时，这样便会有50%的请求向secondary发送请求，系统负载便会增大50%）。

# 如何使用
在Pegasus java client v2.0.0中，我们增加了一个接口，通过该接口可以打开某个表的backup reqeust功能。其实现如下：
```java
public PegasusTableInterface openTable(String tableName, int backupRequestDelayMs) throws PException;
```

相比于老版本的`openTable`接口，我们增加了一个`backupRequestDelayMs`参数。这个参数便是上文所指的时延，即：向primary发送请求，如果过了`backupRequestDelayMs`毫秒response仍没有返回，则向secondary发送backup request。需要注意的是，`backupRequestDelayMs <= 0`代表禁用backup reqeust功能。

另外在老版本的`openTable`接口中，backup request功能默认是关闭的。

# 性能测试

set/get operation:

|  test case   | enable backup request  |  read/write propotion  | qps |  read avg  |  read p95  |  read p99  |  read p999  |  read p9999  |  write avg  |  write p95  |  write p99  |  write p999  |  write p9999  |  
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | --- |
| 3-clients 15-threads | no | 1:3 | 7076 | 880 | 428 | 727 | 138495 | 988671 | 2495 | 6319 | 9023 | 36319 | 531455|
| 3-clients 15-threads | yes, delay 138ms | 1:3 | 6987 | 1010 | 403  | 7747 | 138751 | 153599 | 2476 | 6859 | 9119 | 13759 | 185855 |
| 3-clients 100-threads | no | 1:0 | 140607 | 707 | 1474 | 2731 | 5511 | 167551 | | | | | |
| 3-clients 100-threads | yes, delay 5ms | 1:0 | 77429 | 1288 | 2935 | 3487 | 6323 | 71743 | | | | | |
| 3-clients 30-threads | no | 30:1 | 87198 | 306 | 513 | 805 | 4863 | 28271 | 1369 | 2661 | 5795 | 22319 | 51359 |
| 3-clients 30-threads | yes, delay 5ms | 30:1 | 88541 | 298 | 493 | 711 | 4483 | 18479 | 1467 | 3263 | 6411 | 17439 | 50975 |

Multi-get/Batch-Set operation: 

|  test case  | enable backup request  | read/write porpotion  |  qps |  read avg  |  read p95  |  read p99  |  read p999  |  read p9999  |  write avg  |  write p95  |  write p99  |  write p999  |  write p9999  |  
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | --- |
| 3-clients  7-threads | no | 20:1 | 24113 | 200 | 277 | 410 | 2317 | 21647 | 2034 | 4283 | 6427 | 18271 | 62687 |
| 3-clients  7-threads | yes, deley 2ms | 20:1 | 23756 | 197 | 268 | 351 | 2173 | 5759 | 2187 | 4531 | 6551 | 21551 | 63999 |
| 3-clients  15-threads | no | 20:1 | 30980 | 236 | 348 | 526 | 3535 | 25695 | 5361 | 14087 | 20223 | 40639 | 90815 |
| 3-clients  15-threads | yes, delay 3ms | 20:1 | 30483 | 244 | 386 | 540 | 3105 | 13287 | 5377 | 14119 | 19535 | 31311 | 103103 |
