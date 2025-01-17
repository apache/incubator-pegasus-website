---
permalink: administration/backup-request
---

# 背景
在当前的 Pegasus 实现中，由于向 secondary 读取会导致不一致的情况发生，所以目前 Pegasus 仅支持对 primary 副本的读取。但是在某些情况下（例如：负载均衡、热点写入等）经常会导致 primary 不稳定。因此，我们希望在 primary 不稳定时能够读取 secondary，通过牺牲部分强一致性来降低读请求的长尾并提高系统的可用性。backup request 便是用来实现此功能的。

# 设计实现

backup request 的实现原理比较简单：对于读操作（目前写操作不支持 backup request），当 client 向 primary 发送请求后，如果经过一段时间延迟（通常是 p999）其 response 仍然没有返回，则随机选择一台 secondary 并向其发送 backup request。最后获取最快返回的 response 进行处理。

这里发送 secondary 请求的延迟我们建议选择 p999，因为 backup request 操作是用来消除长尾的，并不是提升集群性能的。如果将该值设置过低，则会由于 backup request 的请求量过大而导致集群压力增大（假设选择 p50 作为其延迟，这样便会有 50% 的请求向 secondary 发送请求，系统负载便会增大 50%）。

# 如何使用
在 Pegasus Java client v2.0.0 中，我们增加了一个接口，通过该接口可以打开某个表的 backup request 功能。其实现如下：
```java
public PegasusTableInterface openTable(String tableName, int backupRequestDelayMs) throws PException;
```

相比于老版本的 `openTable` 接口，我们增加了一个 `backupRequestDelayMs` 参数。这个参数便是上文所指的时延，即：向 primary 发送请求，如果过了 `backupRequestDelayMs` 毫秒 response 仍没有返回，则向 secondary 发送 backup request。需要注意的是，`backupRequestDelayMs <= 0` 代表禁用 backup request 功能。

另外在老版本的 `openTable` 接口中，backup request 功能默认是关闭的。

# 性能测试

下面表格里展示了是否打开 backup request 的性能对比，这里我们选取了未打开 backup request 时读请求的 p999 时间作为 backup request 的 delay 时间（138ms）。数据显示，打开 backup request 之后 get 请求的 p999 时延**基本没有变化**，而 p9999 时延却有了**数倍的降低**。

另外，由于 delay 时间设置的是 p999 时间，大约 1000 个请求里只有 1 个请求会发送 backup request，因此额外请求量（也就是开启 backup request 的额外开销）比例在 0.1% 左右。依此类推，若想要降低 P999 时延，则可以将 `backupRequestDelayMs` 设置为 P99 延迟，由此会增加 1% 的额外读流量。

| test case            | enable backup request | read p9999 |
|----------------------|-----------------------|------------|
| 3-clients 15-threads | no                    | 988671     |
| 3-clients 15-threads | yes                   | 153599     |
