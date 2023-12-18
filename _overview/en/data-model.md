---
permalink: /overview/data-model/
---

## Introduction

The data model of Pegasus is a simple Key-Value model, it does not support complex schemas. However, to enhance its expressive power, Key is split into **HashKey** and **SortKey**, namely composite key (`[HashKey, SortKey] ->Value`), which is similar to [DynamoDB](https://aws.amazon.com/dynamodb/)'s [composite primary key](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks.corecomponents.html#howitworks.corecomponents.primarykey).

### HashKey

Byte string. Similar to the partition key in DynamoDB, HashKey is used to calculate which partition (a.k.a. shard) the data belongs to. Pegasus uses a specific hash function to calculate the hash value for a HashKey, and then modulo the number of partitions to obtain the **Partition ID** for the data. Therefore, data with the same HashKey is always stored in the same partition.

> Note:
> On the C++ client side, the HashKey length limit is 64KB.
> On the Java client side, if [WriteLimiter](https://github.com/apache/incubator-pegasus/blob/v2.5.0/java-client/src/main/java/org/apache/pegasus/client/ClientOptions.java#L360C12-L360C12) is enabled, then the limit is 1KB.
> On the server side, since Pegasus 2.0.0, if `[replication]max_allowed_write_size` is set as non-zero, limit the size of the entire request packet to this value, defaulting to 1MB.

### SortKey

Byte string. Similar to the sort key in DynamoDB, SortKey is used for sorting data within a partition. In fact, when storing data internally in RocksDB, we concatenate HashKey and SortKey as the keys of RocksDB.
> Note:
> On the C++ client side, there is no limit to the length of SortKey.
> On the Java client side, if [WriteLimiter](https://github.com/apache/incubator-pegasus/blob/v2.5.0/java-client/src/main/java/org/apache/pegasus/client/ClientOptions.java#L360C12-L360C12) is enabled, then the limit is 1KB.
> On the server side, since Pegasus 2.0.0, if `[replication]max_allowed_write_size` is set as non-zero, limit the size of the entire request packet to this value, defaulting to 1MB.

### Value

Byte string.
> Note:
> On the C++ client side, there is no limit to the length of the Value.
> On the Java client side, if [WriteLimiter](https://github.com/apache/incubator-pegasus/blob/v2.5.0/java-client/src/main/java/org/apache/pegasus/client/ClientOptions.java#L360C12-L360C12) is enabled, then the limit is 400KB.
> On the server side, since Pegasus 2.0.0, if `[replication]max_allowed_write_size` is set as non-zero, limit the size of the entire request packet to this value, defaulting to 1MB.

![pegasus-data-model](/assets/images/pegasus-data-model.png){:class="img-responsive docs-image"}

## Pegasus vs. HBase

Although Pegasus is not as semantically rich as HBase's tabular model, it can still meet most applications' needs, thanks to its HashKey+SortKey combination key design.
For example, users can treat HashKey as a row key and SortKey as an attribute name or column name, so that multiple data of the same HashKey can be viewed as one row, which can also express the concept of row in HBase.
Taking this into consideration, Pegasus not only provides the `get`/`set`/`del` interface for accessing individual data, but also provides the `multi_get`/`multi_set`/`multi_del` interfaces for accessing batch data in the same HashKey, and these interfaces provide single line atomic semantics, making it convenient for users to use.

![pegasus-data-model](/assets/images/pegasus-data-model-sample.png){:class="img-responsive docs-image"}

## Pegasus vs. Redis

Although Pegasus does not support rich data structures such as `List`/`Set`/`Hash` like Redis, users can still use Pegasus to implement similar semantics.
For example, users can equate HashKey with Redis' `key` and use SortKey as the `field` of Hash (or `member` of Set) to implement Hash in Redis.
