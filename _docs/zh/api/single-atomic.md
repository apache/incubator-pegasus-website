---
permalink: api/single-atomic
---

从 v1.10.0 版本开始，Pegasus 支持了单行原子操作。
> 这里的**单行**是指同一 HashKey 下的所有数据。

# 原理

Pegasus 的数据分布策略采用了固定 Hash 分片，同一个 HashKey 的数据总是存储在同一个 Partition 中，即在单节点内的同一 Replica 中。同时，同一个 Replica 的写操作在 server 端总是串行执行的。因此对于同一 HashKey 下的数据操作，可以很方便地实现原子语义。

对于写操作，譬如 [multiSet](/clients/java-client#multiset) 和 [multiDel](/clients/java-client#multidel)，单个操作中对多个 SortKey 同时 _set_ 或者 _delete_，原子语义很容易理解，要么同时成功，要么同时失败，所以这两个操作属于单行原子操作。

这里重点介绍另一类操作：**先读后写，并且写操作依赖读的结果**。这类操作的特点就是：它们是**非幂等**的，即同一个操作如果重复执行，造成的结果（包括数据实际的更新情况、返回给用户的结果）可能是不同的。原子增减和 CAS 操作都属于这类。 Pegasus 能保证这类操作的原子性和一致性，因为：
* 同一个 HashKey 的数据总是存储在同一个 Replica 中
* 同一个 Replica 的写操作在 server 端总是串行执行的
* 同一个操作保证执行且只会执行一次，即使发生数据迁移、宕机恢复等情况

由于非幂等特性，这类操作会和 Pegasus 的另外一些特性冲突，譬如 [跨机房同步](/administration/duplication)。所以我们在 1.10.0 版本中还提供了一个配置项，用于配置集群是否允许非幂等操作，如果配置为 false，则所有非幂等操作都会返回`ERR_OPERATION_DISABLED`：
```ini
[replication]
    allow_non_idempotent_write = false
```

# 原子增减

虽然 Pegasus 的 value 不支持 schema，但是我们依然提供了原子增减操作，类似 Redis 的 [incr命令](http://www.redis.cn/commands/incr.html)，Pegasus 接口参见 [incr](/clients/java-client#incr)。

## 语义解释

* 由于存储引擎 RocksDB 只能存储字节串类型的 value，所以在 `incr()` 的时候会先将读取出 value 字节串，转换为 int64 类型（转换方式就是简单的 String-to-Int），譬如字节串`"12345"`就会转换为数字 `12345`。完成`incr()`操作后，得到的结果会重新转换为字节串，然后存储为新值
* 字节串转换为 int64 时可能出错，譬如不是合法的数字、超过 int64 的范围等，都会返回失败
* 如果原 value 不存在，则认为原始值为 0，再执行`incr()`操作
* 操作数`increment`可以为正数也可以为负数，所以一个`incr()`接口就可以实现原子增或者原子减
* TTL：如果原 value 存在，则新值和原值的 TTL 保持一致；如果原 value 不存在，则新值在存储时不设 TTL

# CAS 操作

另一类很有用的原子操作就是 CAS（Compare-And-Swap）操作。基于 CAS 操作，可以实现很多高级的并发特性，譬如分布式锁。

Pegasus 提供了 _check_and_set_ 的 CAS 操作，其语义就是：根据 HashKey 的某一个 SortKey 的 value 是否满足某种条件，来决定是否修改另一个 SortKey 的值。将用于判断条件的 SortKey 称之为`CheckSortKey`，将用于设置值的 SortKey 称之为`SetSortKey`。对应地，`CheckSortKey` 的 value 称之为`CheckValue`，`SetSortKey` 要设置的 value 称之为`SetValue`。参见 [checkAndSet](/clients/java-client#checkandset)，以及其扩展版本 [checkAndMutate](/clients/java-client#checkandmutate) 和 [compareExchange](/clients/java-client#compareexchange)。

## 语义解释

* 只有当`CheckValue`满足指定的条件时，才会设置`SetSortKey`的值
* 需要满足的条件类型通过`CheckType`指定，有的`CheckType`还需要指定操作数`CheckOperand`。目前支持的类型包括：
  * 判断`CheckValue`的 _存在性_：是否存在、是否为空字节串等
  * 字节串比较：将`CheckValue`与`CheckOperand`按照字节序比较，看是否满足`<`、`<=`、`==`、`>=`、`>=`关系
  * 数字比较：类似于 [incr操作](#原子增减)，先将`CheckValue`转换为int64，再与`CheckOperand`比较，看是否满足`<`、`<=`、`==`、`>=`、`>=`关系
* `CheckSortKey`和`SetSortKey`可以相同，如果相同，就是先判断旧值是否满足条件，满足的话就设置为新值
* 可以通过选项`CheckAndSetOptions.returnCheckValue`指定返回`CheckValue`的值
* 可以通过选项`CheckAndSetOptions.setValueTTLSeconds`指定`SetValue`的 TTL

为了方便使用，Pegasus Java Client 还提供了 _compare_exchange_ 接口：当 HashKey 的某个 SortKey 的 value 按照字节串比较等于用户指定的`ExpectedValue`时，就将其 value 更新为用户指定的`DesiredValue`。从语义上来看，_compare_exchange_ 是 Compare-And-Swap 的一种特殊形式。接口参见 [compareExchange](/clients/java-client#compareexchange)。

_compare_exchange_ 其实是 _check_and_set_ 的特化版本，即：
* `CheckSortKey`和`SetSortKey`相同
* `CheckType`为`CT_VALUE_BYTES_EQUAL`
