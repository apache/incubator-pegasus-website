---
title: Backup Request
layout: page
menubar: administration_menu
---

# 背景
在当前的Pegasus实现中，由于向secondary读取会导致不一致的情况发生，所以目前Pegasus仅仅支持对primary副本的读取。但是在某些情况下（例如：负载均衡、热点写入等）经常会导致primary不稳定。所以我们希望在primary不稳定时能够读取secondary，通过牺牲部分强一致性来降低请求的长尾并提高系统的可用性。backup request便是用来实现此功能的。

# 设计实现

backup reqeust的实现原理比较简单：当client向primary发送请求后，如果经过一段时间延时后（通常是p999），如果其response仍然没有返回，则随机选择一台secondary并向其发送backup request。最后获取最快返回来的response进行处理。

这里发送secondary请求的延时我们建议选择p999，因为backup request操作是用来实现消除长尾的，并不是提升集群性能的。如果将该值设置过低，则会由于backup request的请求量过大而导致集群压力增大（假设选择p50作为其延时，这样便会有50%的请求向secondary发送请求，系统负载便会增大50%）。

# 如何使用
在Pegasus java client中，我们增加了一个接口，通过该接口可以打开某个表的backup reqeust功能。其实现如下：
```java
public PegasusTableInterface openTable(String tableName, int backupRequestDelayMs) throws PException;
```

相比于老版本的`openTable`接口，我们增加了一个`backupRequestDelayMs`参数。这个参数便是上文所指的时延，即：向primary发送请求，如果过了`backupRequestDelayMs`毫秒response仍没有返回，则向secondary发送backup request。需要注意的是，`backupRequestDelayMs <= 0`代表禁用backup reqeust功能。

另外在老版本的`openTable`接口中，backup request功能默认是关闭的。

# 性能测试

set/get operation:

|  test case   | enable backup request  |  qps | read/write propotion  |  read avg  |  read p95  |  read p99  |  read p999  |  read p9999  |  write avg  |  write p95  |  write p99  |  write p999  |  write p9999  |  
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | --- |
| 3-clients 15-threads | no | 1 : 3 | 7076 | 880.6512836149132 | 428.0 | 727.0 | 138495.0 | 988671.0 | 2495.0710801540517 | 6319.0 | 9023.0 | 36319.0 | 531455.0|
| 3-clients 15-threads | yes, delay 138ms | 1 : 3 | 6987 | 1010.1412488662884 | 403.0  | 7747.0 | 138751.0 | 153599.0 | 2476.104380444753 | 6859.0 | 9119.0 | 13759.0 | 185855.0 |
| 3-clients 100-threads | no | 1 : 0 | 140607 | 707.98960978 | 1474.0 | 2731.0 | 5511.0 | 167551.0 |  | | |  | |
| 3-clients 100-threads | yes, delay 5ms | 1 : 0 | 77429 | 1288.01461934 | 2935.0 | 3487.0 | 6323.0 | 71743.0 | ---- | ---- | ---- | ---- | --- |
| 3-clients 30-threads | no | 30 : 1 | 87198 | 306.9600544730426 | 513.0 | 805.0 | 4863.0 | 28271.0 | 1369.4669874672938 | 2661.0 | 5795.0 | 22319.0 | 51359.0 |
| 3-clients 30-threads | yes, delay 5ms | 30 : 1 | 88541 | 298.22470022339127 | 493.0 | 711.0 | 4483.0 | 18479.0 | 1467.6130963728997 | 3263.0 | 6411.0 | 17439.0 | 50975.0 |

Multi-get/Batch-Set operation: 

|  test case  | enable backup request  |  qps | read/write porpotion  |  read avg  |  read p95  |  read p99  |  read p999  |  read p9999  |  write avg  |  write p95  |  write p99  |  write p999  |  write p9999  |  
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | --- |
| 3-clients  7-threads | no | 20 : 1 | 24113 | 200.37956913733476 | 277.0 | 410.0 | 2317.0 | 21647.0 | 2034.1923768463382 | 4283.0 | 6427.0 | 18271.0 | 62687.0 |
| 3-clients  7-threads | yes, deley 2ms | 20 : 1 | 23756 | 197.48540031650361 | 268.0 | 351.0 | 2173.0 | 5759.0 | 2187.199077764627 | 4531.0 | 6551.0 | 21551.0 | 63999.0 |
| 3-clients  15-threads | no | 20 : 1 | 30980 | 236.7482510418767 | 348.0 | 526.0 | 3535.0 | 25695.0 | 5361.380053671262 | 14087.0 | 20223.0 | 40639.0 | 90815.0 |
| 3-clients  15-threads | yes, delay 3ms | 20 : 1 | 30483 | 244.1182599024727 | 386.0 | 540.0 | 3105.0 | 13287.0 | 5377.992155339365 | 14119.0 | 19535.0 | 31311.0 | 103103.0 |
