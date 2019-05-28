---
title: 数据模型
layout: page
show_sidebar: false
menubar: intro_menu
---

Pegasus的数据模型非常简单，就是Key-Value模型，不支持数据Schema。但是为了增强其表达能力，我们将key分裂为HashKey和SortKey，即组合键（composite key），在这点上与[DynamoDB](https://aws.amazon.com/dynamodb/)中提供的[_composite primary key_](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey)（partition key and sort key）是很类似的。
* HashKey：字节串，限制为64KB。类似于DynamoDB中的partition key概念，HashKey用于计算数据属于哪个分片。Pegasus使用一个特定的hash函数，对HashKey计算出一个hash值，然后对分片个数取模，就得到该数据对应的PartitionID。HashKey相同的数据总是存储在同一个分片中。
* SortKey：字节串，长度无限制。类似于DynamoDB中的sort key概念，SortKey用于数据在分片内的排序。HashKey相同的数据放在一起，并且按照SortKey的字节序排序。实际上，在内部存储到RocksDB时，我们将HashKey和SortKey拼在一起作为RocksDB的key。
* Value：字节串，长度无限制。

![pegasus-data-model](https://github.com/XiaoMi/pegasus/blob/master/docs/media-img/pegasus-data-model.png)

之所以这样设计，是因为：
* Pegasus系统采用基于Hash的固定分片，必须通过一个方式计算数据的分片ID。最简单的办法就是让用户提供一个HashKey，然后通过hash函数计算获得。
* 如果直接采用HashKey -> Value方式，在表达能力上又偏弱，不方便业务使用。所以增加了一层SortKey，变成了[HashKey, SortKey] -> Value的形式。

虽然不及HBase的表格模型语义丰富，但是Pegasus也能满足大部分业务需求，这得益于其HashKey+SortKey组合键的设计。譬如用户可以将HashKey当作row key，将SortKey当作**attribute name**或者**column name**，这样同一HashKey的多条数据可以看作一行，同样能表达出HBase中row的概念。正是考虑到这一点，Pegasus除了提供存取单条数据的get/set/del接口，还提供了存取同一HashKey数据的multi_get/multi_set/multi_del接口，并且这些接口都是单行原子操作，让用户在使用时更加简单。

![pegasus-data-model](https://github.com/XiaoMi/pegasus/blob/master/docs/media-img/pegasus-data-model-sample.png)

虽然不像Redis一样支持丰富的list/set/map等数据Schema，用户同样可以使用Pegasus实现类似的语义。譬如用户可以将HashKey等同于Redis的key，将SortKey作为map的key，实现Redis中map或者set的语义。list语义的支持稍微困难些，但是也可以基于Key-Value进行封装，譬如360开源的[Pika](https://github.com/Qihoo360/pika)就做过[类似的事情](https://github.com/Qihoo360/pika/wiki/pika-nemo%E5%BC%95%E6%93%8E%E6%95%B0%E6%8D%AE%E5%AD%98%E5%82%A8%E6%A0%BC%E5%BC%8F#3-list%E7%BB%93%E6%9E%84%E7%9A%84%E5%AD%98%E5%82%A8)。另一种解决方案就是，将map/set/list数据结构通过某种方法（protobuf/thrift/json）序列化为一个字节串，然后直接作为一个整体存储在value中，其缺点是用户需要在客户端增加序列化/反序列化开销，并且每次数据更新都需要对整个value读写一次。
