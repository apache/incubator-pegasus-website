---
title: Pegasus 的 last_flushed_decree
layout: post
author: 吴涛
---

一般的强一致性存储分为 **replicated log** 和 **db storage** 两层。replicated log 用于日志的复制，通过一致性协议（如 PacificA）进行组间复制同步，日志同步完成后，数据方可写入 db storage。通常来讲，在数据写入 db storage 之后，与其相对应的那一条日志即可被删除。因为 db storage 具备持久性，既然 db storage 中已经存有一份数据，在日志中就不需要再留一份。为了避免日志占用空间过大，我们需要定期删除日志，这一过程被称为 **log compaction**。

这个简单的过程在 pegasus 中，问题稍微复杂了一些。

首先 pegasus 在使用 rocksdb 时，关闭了其 write-ahead-log，这样写操作就只会直接落到不具备持久性的 memtable。显然，当数据尚未从 memtable 落至 sstable 时，日志是不可随便清理的。因此，pegasus 在 rocksdb 内部维护了一个 `last_flushed_decree`，当数据从 memtable 写落至 sstable 时，它就会更新，表示从〔0, last_flushed_decree〕之间的日志都可以被清除。

故事到了这里还要再加一层复杂性：有一些日志只是心跳（`WRITE_EMPTY`），它们不含有任何数据。我们**把心跳写入日志中**，可以避免某个表
长时间无数据写，日志无法被清理的情况，同时也可以起到坏节点检测的作用。许多一致性协议（如 Raft）都会将心跳写入日志，这里不做赘述。

**但心跳是否需要写入 rocksdb 呢？**

这里讲一下架构，每个 pegasus 的 replica server 上都有许多分片，每个分片拥有一个 rocksdb 实例，而每个 rocksdb 维护一个 `last_flushed_decree`。所有的实例都会写入同一个日志，这被称为 shared log。每个实例自己会单独写一个 WAL，被称为 private log。复杂点在 **shared log**。

```txt
<r:1 d:1> 表示 replica id 为 1 的实例所写入的 decree = 1 的日志

   0         1         2         3         4         5
<r:1 d:1> <r:2 d:1> <r:2 d:2> <r:2 d:3> <r:2 d:4> <r:2 d:5>
```

可以看到，r1 写入 1 条日志后，r2 不断地写入 5 条日志。假设 r2 的 `last_flushed_decree = 5`，那么当前 shared_log 应当将 [0, 5] 的日志全部删掉，即删掉从 `<r:1 d:1>` 到 `<r:2 d:5>`。

这时候问题来了：如果 `<r:1 d:1>` 是一个心跳请求，且不写 rocksdb 的话，那就意味着 r1 的 last_flushed_decree = 0，也就意味着 `<r:1 d:1>` 不可被删。这就给我们带来了困扰，因为日志只能 “前缀删除”，即只能删除 [0, 5]，不能删除 [1, 5]。

如果 r1 长时间没有数据写入，而 r2 长时间有较大吞吐，那么 shared log 可能会因为 r1 而无法清理，造成磁盘空间不足的情况。
这个问题是 shared log 的一个弊端。因此我们在设计上选择将每次心跳都写入 `rocksdb`，这样就能及时更新 `last_flushed_decree`，
shared log 也可以及时被删除。
如何将一个没有任何数据的心跳 “写入” rocksdb 呢？实际上我们也仅仅只是写入一个 `key=""`，`value=""` 的记录，这对系统几乎没有开销。

但如果我们没有 shared log 呢？假设我们仅使用 private log 作为唯一的 WAL 存储，那么 rocksdb 虽然仍需维护 `last_flushed_decree`，
但并不需要处理心跳，这一定程度上可以减少写路径的复杂度。
