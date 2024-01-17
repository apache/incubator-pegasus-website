---
permalink: api/single-atomic
---

Since v1.10.0, Pegasus supports single row atomic operations.
> The ** single row ** here means all data under the same HashKey.

# Principle

Pegasus adopts a fixed hash sharding strategy for data distribution, where data from the same HashKey is always stored in the same partition, i.e. in the same Replica within a single node. Meanwhile, the write operations of the same Replica are always executed serially on the server side. Therefore, for data operations under the same HashKey, atomic semantics can be easily implemented.

For write operations, such as [multiSet](/clients/java-client#multiset) and [multiDel](/clients/java-client#multidel), _set_ or _delete_ multiple SortKeys simultaneously in a single operation, atomic semantics are easy to understand, either successful or failed at the same time, so these two operations belong to single row atomic operations.

Here we focus on another type of operations: **read first, then write, and the write operation depends on the result of the read operation**. The characteristic of this type of operations are that they are **non-idempotent**, that is, if the same operation is repeated, the results (including the actual updates of data and the results returned to the user APIs) may be different. Atomic increment and decrement operations, as well as CAS operations, belong to this category. Pegasus can ensure the atomicity and consistency of such operations because:

* The data of the same HashKey is always stored in the same Replica
* The write operations of the same Replica are always executed serially on the server side
* One operation is guaranteed to be executed exactly once, even in the event of data migration, downtime recovery, etc

Due to non-idempotent properties, such operations may conflict with other features of Pegasus, such as [Duplication](/administration/duplication). So since 1.10.0, Pegasus provides an option to specify whether the cluster allows non-idempotent operations. If setting as false, all non-idempotent operations will return `ERR_OPERATION_DISABLED`:
```ini
[replication]
    allow_non_idempotent_write = false
```

# Atomic increment and decrement operations

Although Pegasus does not support schema in values, it still provides atomic increment and decrement operations, similar to Redis's [incr](http://www.redis.cn/commands/incr.html)，refer to Pegasus' interface [incr](/clients/java-client#incr).

## Description

* Due to the fact that the storage engine RocksDB can only store values of byte string type, when using `incr()`, the value byte string will be read and converted to `int64` type (the conversion method is simple String-to-Int). For example, the byte string `"12345"` will be converted to a number `12345`. After completing the `incr()` operation, the obtained result will be converted back into a byte string and stored as a new value
* When converting a byte string to `int64`, there may be encounter errors, such as invalid numbers or overflow of `int64`, all of these cases will return a failure status
* If the original value does not exist, it is considered as `0` and then `incr()` operation is executed normally
* The operand `increment` can be positive or negative, so the `incr()` interface can implement as atomic increment and decrement
* TTL: If the original value exists, the TTL of the new value and the original value remains the same. If the original value does not exist, the new value will be stored without TTL

# CAS operations

Another useful type of atomic operations are the CAS (Compare-And-Swap) operations. Based on CAS operations, many advanced distribute concurrency features can be implemented, such as distributed locks.

Pegasus provides _check_and_set_ CAS operations, the semantics are: whether to modify the value of one SortKey is based on whether the value of another SortKey of the same HashKey meets certain conditions.

The SortKey which is used to determine the conditions is called `CheckSortKey`, the SortKey which is used to set value is called `SetSortKey`. Correspondingly, the value of `CheckSortKey` is called `CheckValue`, and the value to be set by `SetSortKey` is called `SetValue`.

See [checkAndSet](/clients/java-client#checkandset), as well as its extended versions [checkAndMutate](/clients/java-client#checkandmutate) and [compareExchange](/clients/java-client#compareexchange).

## Description

* The value of `SetSortKey` will be set only when `CheckValue` meets the specified conditions
* The condition types that need to be met are specified through `CheckType`, and some `CheckType` also require the specified operand `CheckOperand`. Currently, supporting:
* 需要满足的条件类型通过`CheckType`指定，有的`CheckType`还需要指定操作数`CheckOperand`。目前支持的类型包括：
    * Determine the _existence_ of `CheckValue`: Whether it exists, whether it is an empty byte string, etc
    * Byte string comparison: Compare `CheckValue` and `CheckOperand` in byte order to see if they meet the relationships of `<`, `<=`, `==`, `>=`, or `>=`
    * Number comparison: similar to [Atomic increment and decrement operations](#atomic-increment-and-decrement-operations)，convert `CheckValue` to type of int64，then compare with `CheckOperand`, to see if they meet the relationships of `<`, `<=`, `==`, `>=`, or `>=`
* `CheckSortKey` and `SetSortKey` can be the same. If they are the same, it means checking whether the old value meets the condition first. If it does, set it to the new value
* You can enable the `CheckAndSetOptions.returnCheckValue` option if you want to return the value of `CheckValue`
* You can enable the `CheckAndSetOptions.setValueTTLSeconds` option if you want to specify TTL

For ease of use, Pegasus Java Client also provides _compare_exchange_ interface: When the value of a SortKey in HashKey is equal to the user specified `ExpectedValue` in byte string, its value will be updated to the user specified `DesiredValue`. Semantically, _compare_exchange_ is a special form of Compare-And-Swap. The interface can be found in [compareExchange](/clients/java-client#compareexchange).

Actually, _compare_exchange_ is a specialized version of _check_and_set_, namely:
* `CheckSortKey` and `SetSortKey` are the same
* `CheckType` is `CT_VALUE_BYTES_EQUAL`
