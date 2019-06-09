---
title: Pegasus 线程梳理
layout: post
author: 吴涛
---

当前在我们的推荐配置下，Pegasus Replica Server 一共会有 174 线程在工作，所有的线程都是长线程。

多数线程会通过 wait 的方式沉睡，实际对 CPU 的竞争影响较小，典型的 pstack 情况是

- pthread_cond_wait 49
- epoll_wait 36
- sem_wait 81

这样算下来会发现实际运转的线程数是 8，而我们的机器通常配置的核心数是 24 核，平时的计算资源存在一定冗余。

```txt
THREAD_POOL_COMPACT
worker_count = 8

THREAD_POOL_FDS_SERVICE
worker_count = 8

THREAD_POOL_REPLICATION_LONG
worker_count = 8

THREAD_POOL_LOCAL_APP
worker_count = 24

THREAD_POOL_FD
worker_count = 2

THREAD_POOL_DLOCK
worker_count = 1

THREAD_POOL_META_STATE
worker_count = 1

THREAD_POOL_REPLICATION
worker_count = 24

THREAD_POOL_DEFAULT
worker_count = 8
```

抛开 meta_server 的线程池（`THREAD_POOL_DLOCK`，`THREAD_POOL_META_STATE`），由 rDSN 托管的线程数算下来应该是 82 个，多出来的 92 线程如何分配：

- 30 个线程负责 timer_service，即定时任务的处理。

rDSN 默认为每个线程池分配一个 timer 线程，理论上有 7 个线程池，就是 7 线程。但是因为 `THREAD_POOL_REPLICATION` 是各个线程 share nothing 的，所以它的每个 worker 线程会单独配一个 timer 线程。因此总 timer 线程数是 24 + 6 = 30。

-----

- 20 个线程负责 tcp 的处理（asio_net_provider），20 个线程执行 udp 的处理（asio_udp_provider）

目前每个 rpc_channel (udp/tcp) 对每个 `network_header_format` 都会配置 4 个 worker 线程。

我们目前有四种 format：RAW，THRIFT，HTTP，DSN，（目前不清楚第 5 种的类型）

相关配置：

```ini
[network]
io_service_worker_count = 4
```

-----

- 2 个线程负责上报监控到 falcon，这里的线程数是写死的。

参考：
`pegasus_counter_reporter`

-----

- 1 个线程执行 aio 读写磁盘的任务，即 libaio 的 get_event 操作。

-----

- 16 个线程执行 rocksdb 后台操作

其中 12 个线程执行 rocskdb background compaction

4 个线程执行 rocksdb background flush。

参考：
`pegasus_server_impl`

相关配置：

```ini
[pegasus.server]
rocksdb_max_background_flushes=4
rocksdb_max_background_compactions=12
```

-----

- 2 个线程执行 shared_io_service，给 percentile 类型的 perf-counter 用

相关配置：

```ini
[core]
timer_service_worker_count=2
```
