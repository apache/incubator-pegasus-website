---
permalink: api/single-atomic
---

从v1.10.0版本开始，Pegasus支持单行原子操作。这里的**单行**是指同一HashKey下的所有数据。

# 原理
Pegasus采用Hash分片，同一个HashKey的数据总是存储在同一个Partition中，即相同的Replica中。同时，Pegasus实现时，同一个Replica的写操作在server端总是串行执行的。因此对于同一HashKey下的数据操作，可以很方便地实现原子的语义。

对于纯粹的写操作，譬如[multiSet](/_docs/zh/clients/java-client.md#multiset)和[multiDel](/_docs/zh/clients/java-client.md#multidel)，单个操作中对多个SortKey同时set或者del，原子语义很容易理解，要么同时成功，要么同时失败，所以这两个操作属于单行原子操作。

不过我们这里重点关注的是另一类操作：**先读后写，并且写操作依赖读的结果**。这类操作的特点就是：它们是**非幂等**的，即同一个操作如何多次重复执行，造成的结果（包括数据实际的更新情况、返回给用户的结果）可能是不同的。原子增减和CAS操作都属于这类。Pegasus能保证这类操作的原子性和一致性，因为：
* 同一个HashKey的数据总是存储在同一个Replica中；
* 同一个Replica的写操作在server端总是串行执行的；
* 同一个操作保证执行且只会执行一次，即使发生数据迁移、宕机恢复等情况。

由于**非幂等**特性，这类操作会和Pegasus的另外一些特性冲突，譬如跨机房热备。所以我们在1.10.0版本中还提供了一个配置项，用于配置集群是否允许**非幂等**操作，如果配置为false，则所有非幂等操作都会返回`ERR_OPERATION_DISABLED`：
```ini
[replication]
    allow_non_idempotent_write = false
```

# 原子增减
虽然Pegasus的value不支持schema，但是我们依然提供了原子增减操作，类似Redis的[incr命令](http://www.redis.cn/commands/incr.html)。接口参见[incr](/clients/java-client#incr)。

语义解释：
* 首先server端存储的仍然是字节串，但是在incr的时候会先将字节串先转换为int64类型，转换方式就是简单的String-to-Int，譬如字节串`12345`就会转换为数字12345。完成incr操作后，得到的结果会重新转换为字节串，然后存储为新值。
* 字节串转换为int64时可能出错，譬如不是合法的数字、超过int64的范围等，都会报错。
* 如果原value不存在，则认为原始值为0，正常执行incr操作。
* 操作数`increment`可以为正数也可以为负数，所以一个incr接口就可以实现原子增或者原子减。
* TTL语义：如果原value存在，则新值和原值的TTL保持一致；如果原value不存在，则新值在存储时不设TTL。

# CAS操作
另一类很有用的原子操作就是CAS（Compare-And-Swap），直译就是对比交换，最初是表示一条CPU的原子指令，其作用是让CPU先进行比较两个值是否相等，然后原子地更新某个位置的值。基于CAS操作，可以实现很多高级的并发特性，譬如锁。因此很多编程语言也原生地提供CAS操作。

Pegasus提供了check_and_set的CAS操作，其语义就是：根据HashKey的某一个SortKey的值是否满足某种条件，来决定是否修改另一个SortKey的值。我们将用于判断条件的SortKey称之为`CheckSortKey`，将用于设置值的SortKey称之为`SetSortKey`。对应地，CheckSortKey的value称之为`CheckValue`，SetSortKey要设置的value称之为`SetValue`。接口参见[checkAndSet](/_docs/zh/clients/java-client.md#checkandset)，以及其扩展版本[checkAndMutate](/_docs/zh/clients/java-client.md#checkandmutate)和[compareExchange](/_docs/zh/clients/java-client.md#compareexchange)。

语义解释：
* 只有当CheckValue满足指定的条件时，才会设置SetSortKey的值。
* 需要满足的条件类型通过CheckType指定，有的CheckType还需要指定操作数CheckOperand。目前支持的类型包括：
  * 判断CheckValue的appearance属性：是否存在、是否为空字节串等。
  * 字节串比较：将CheckValue与CheckOperand按照字节序比较，看是否满足`<`、`<=`、`==`、`>=`、`>=`关系。
  * 数字比较：类似于[incr操作](#原子增减)，先将CheckValue转换为int64，再与CheckOperand比较，看是否满足`<`、`<=`、`==`、`>=`、`>=`关系。
* CheckSortKey和SetSortKey可以相同，如果相同，就是先判断旧值是否满足条件，满足的话就设置为新值。
* 可以通过选项`CheckAndSetOptions.returnCheckValue`指定返回CheckValue的值。
* 可以通过选项`CheckAndSetOptions.setValueTTLSeconds`指定SetValue的TTL。

为了方便使用，Pegasus Java Client还提供了compare_exchange接口：当HashKey的某个SortKey的value按照字节串比较**等于**用户指定的ExpectedValue时，就将其value更新为用户指定的DesiredValue。从语义上来看，compare_exchange更像是Compare-And-Swap的另外一种说法。接口参见[compareExchange](/_docs/zh/clients/java-client.md#compareexchange)。

compare_exchange其实是check_and_set的特化版本：
* CheckSortKey和SetSortKey相同。
* CheckType为CT_VALUE_BYTES_EQUAL。
