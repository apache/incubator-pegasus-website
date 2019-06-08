---
title: 数据模型
layout: page
show_sidebar: false
menubar: overview_menu
---

## 模型介绍

Pegasus 的数据模型非常简单，就是 Key-Value 模型，不支持数据 Schema。但是为了增强其表达能力，我们将key分裂为 **HashKey** 和 **SortKey**，即组合键（composite key），在这点上与 [DynamoDB](https://aws.amazon.com/dynamodb/) 中提供的 [_composite primary key_](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey)（partition key and sort key）是很类似的。

### HashKey

字节串，限制为64KB。类似于 DynamoDB 中的 partition key 概念，HashKey 用于计算数据属于哪个分片。Pegasus 使用一个特定的 hash 函数，对HashKey 计算出一个hash值，然后对分片个数取模，就得到该数据对应的 **Partition ID** 。HashKey 相同的数据总是存储在同一个分片中。

### SortKey

字节串，长度无限制。类似于 DynamoDB 中的 sort key 概念，SortKey 用于数据在分片内的排序。HashKey 相同的数据放在一起，并且按照 SortKey 的字节序排序。实际上，在内部存储到RocksDB时，我们将 HashKey 和 SortKey 拼在一起作为 RocksDB 的 key。

### Value

字节串，长度无限制。

-----

![pegasus-data-model](/assets/images/pegasus-data-model.png){:class="img-responsive"}

-----

之所以这样设计，是因为：

* Pegasus系统采用基于 Hash 的固定分片，必须通过一个方式计算数据的分片ID。最简单的办法就是让用户提供一个 HashKey，然后通过hash函数计算获得。
* 如果直接采用 `HashKey -> Value` 方式，在表达能力上又偏弱，不方便业务使用。所以增加了一层 SortKey，变成了 `[HashKey, SortKey] -> Value` 的形式。

## Pegasus vs. HBase

虽然不及 HBase 的表格模型语义丰富，但是 Pegasus 也能满足大部分业务需求，这得益于其 HashKey+SortKey 组合键的设计。

譬如用户可以将 HashKey 当作 row key，将 SortKey 当作 attribute name 或者 column name，这样同一 HashKey 的多条数据可以看作一行，同样能表达出 HBase 中 row 的概念。正是考虑到这一点，Pegasus 除了提供存取单条数据的 get/set/del 接口，还提供了存取同一 HashKey 数据的 multi_get/multi_set/multi_del 接口，并且这些接口都是单行原子操作，让用户在使用时更加简单。

-----

![pegasus-data-model](/assets/images/pegasus-data-model-sample.png){:class="img-responsive"}

-----

## Pegasus vs. Redis

虽然不像Redis一样支持丰富的list/set/map等数据Schema，用户同样可以使用Pegasus实现类似的语义。

譬如用户可以将 HashKey 等同于 Redis 的 key，将 SortKey 作为 map 的 key，实现 Redis 中 map 或者 set 的语义。list 语义的支持稍微困难些，但是也可以基于 Key-Value 进行封装，譬如360开源的 [Pika](https://github.com/Qihoo360/pika) 就做过 [类似的事情](https://github.com/Qihoo360/pika/wiki/pika-nemo%E5%BC%95%E6%93%8E%E6%95%B0%E6%8D%AE%E5%AD%98%E5%82%A8%E6%A0%BC%E5%BC%8F#3-list%E7%BB%93%E6%9E%84%E7%9A%84%E5%AD%98%E5%82%A8)。另一种解决方案就是，将 map/set/list 数据结构通过某种方法（protobuf/thrift/json）序列化为一个字节串，然后直接作为一个整体存储在 value 中，其缺点是用户需要在客户端增加序列化/反序列化开销，并且每次数据更新都需要对整个 value 读写一次。
