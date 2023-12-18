---
permalink: /overview/data-model/
---

## 数据模型介绍

Pegasus 的数据模型非常简单，就是 Key-Value 模型，不支持复杂的 Schema。但是为了增强其表达能力，Key被分裂为 **HashKey** 和 **SortKey**，即组合键（composite key， `[HashKey, SortKey] -> Value`），这与 [DynamoDB](https://aws.amazon.com/dynamodb/) 中提供的 [_composite primary key_](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey)（partition key and sort key）是很类似的。

这样设计的原因是：
* Pegasus系统采用基于 Hash 的固定分片，必须通过一个方式计算数据的分片ID。最简单的办法就是让用户提供一个 HashKey，然后通过hash函数计算获得。
* 简单的 `HashKey -> Value` 方式，在表达能力上又偏弱，不方便业务使用。

### HashKey

字节串。类似于 DynamoDB 中的 partition key，HashKey 用于计算数据属于哪个分片。Pegasus 使用一个特定的 hash 函数，对HashKey 计算出一个hash值，然后对分片个数取模，就得到该数据对应的 **Partition ID** 。因此，HashKey 相同的数据总是存储在同一个分片中。
> 注意：在C++客户端侧，HashKey长度限制为64KB。在Java客户侧，如果开启了[WriteLimiter](https://github.com/apache/incubator-pegasus/blob/v2.5.0/java-client/src/main/java/org/apache/pegasus/client/ClientOptions.java#L360C12-L360C12)，则限制为1KB。
> 在Server侧，从Pegasus 2.0.0开始，如果设置 `[replication]max_allowed_write_size` 为非0，则限制整个请求包的大小为该值，默认为1MB。

### SortKey

字节串。类似于 DynamoDB 中的 sort key，SortKey 用于数据在分片内的排序。HashKey 相同的数据放在一起，并且按照 SortKey 的字节序排序。实际上，在内部存储到RocksDB时，我们将 HashKey 和 SortKey 拼在一起作为 RocksDB 的 key。
> 注意：在C++客户端侧，SortKey长度无限制。在Java客户侧，如果开启了[WriteLimiter](https://github.com/apache/incubator-pegasus/blob/v2.5.0/java-client/src/main/java/org/apache/pegasus/client/ClientOptions.java#L360C12-L360C12)，则限制为1KB。
> 在Server侧，从Pegasus 2.0.0开始，如果设置 `[replication]max_allowed_write_size` 为非0，则限制整个请求包的大小为该值，默认为1MB。

### Value

字节串。
> 注意：在C++客户端侧，Value长度无限制。在Java客户侧，如果开启了[WriteLimiter](https://github.com/apache/incubator-pegasus/blob/v2.5.0/java-client/src/main/java/org/apache/pegasus/client/ClientOptions.java#L360C12-L360C12)，则限制为400KB。
> 在Server侧，从Pegasus 2.0.0开始，如果设置 `[replication]max_allowed_write_size` 为非0，则限制整个请求包的大小为该值，默认为1MB。

![pegasus-data-model](/assets/images/pegasus-data-model.png){:class="img-responsive docs-image"}

## Pegasus vs. HBase

虽然不及 HBase 的表格模型语义丰富，但是 Pegasus 也能满足大部分业务需求，这得益于其 HashKey+SortKey 组合键的设计。

譬如用户可以将 HashKey 当作 row key，将 SortKey 当作 attribute name 或者 column name，这样同一 HashKey 的多条数据可以看作一行，同样能表达出 HBase 中 row 的概念。正是考虑到这一点，Pegasus 除了提供存取单条数据的 `get`/`set`/`del` 接口，还提供了存取同一 HashKey 数据的 `multi_get`/`multi_set`/`multi_del` 接口，并且这些接口都是单行原子操作，让用户在使用时更加简单。

![pegasus-data-model](/assets/images/pegasus-data-model-sample.png){:class="img-responsive docs-image"}

## Pegasus vs. Redis

虽然不像Redis一样支持丰富的`List`/`Set`/`Hash`等数据结构，但用户同样可以使用Pegasus实现类似的语义。

譬如用户可以将 HashKey 等同于 Redis 的 `key`，将 SortKey 作为 Hash 的 `field`（或 Set 的`member`），实现 Redis 中 Hash (或 Set)。
