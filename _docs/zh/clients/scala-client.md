---
permalink: clients/scala-client
---


# 获取客户端  
项目地址：[Pegasus scala client](https://github.com/xiaomi/pegasus-scala-client)  
下载：
```bash
git clone https://github.com/XiaoMi/pegasus-scala-client.git
cd pegasus-scala-client
```
选择所使用的版本并构建，建议使用master版本。同时注意，scala客户端构建依赖[Java客户端](https://github.com/XiaoMi/pegasus-java-client)，请参考 [获取Java客户端](/_docs/zh/clients/java-client.md#获取Java客户端) 在项目中添加Java依赖。你可以打包成Jar包进行使用：
```bash
sbt package
```
或者，安装到本地的sbt repository，方便在sbt项目中使用：
```bash
sbt publish-local
```
或者，安装到本地的maven repository：
```bash
sbt publish-m2
```
项目默认使用scala-2.11进行构建，打包发布时则同时发布2.11版本（pegasus-scala-client_2.11）和2.12版本（pegasus-scala-client_2.12），如果你的项目使用sbt构建，则可配置为：
```sbt
//使用sbt仓库，不需要添加后缀，默认使用当前scala版本号，即使用2.12
scalaVersion := "2.12.8"
libraryDependencies ++= Seq(
    "com.xiaomi.infra" %% "pegasus-scala-client" % "1.11.4-1-SNAPSHOT"
)
```
或者配置为：
```sbt
//使用maven仓库(你可以使用resolvers ++= Seq()添加自定义maven仓库)，需要添加后缀
scalaVersion := "2.12.8"
libraryDependencies ++= Seq(
    "com.xiaomi.infra" % "pegasus-scala-client_2.11" % "1.11.4-1-SNAPSHOT"
)
```
如果你的项目通过maven构建，则可通过maven配置在项目中使用，例如：
```xml
<dependency>
    <groupId>com.xiaomi.infra</groupId>
    <artifactId>pegasus-scala-client_2.11</artifactId>
    <version>1.11.4-1</version>
</dependency>
```
# 使用客户端

## 获取实例
通过指定server配置信息获取实例，Scala提供两种获取实例的接口：  
**1、文件路径作为配置参数：**  参见 [Java客户端文件配置](/_docs/zh/clients/java-client.md#文件配置)  
```scala
def createClient(configPath: String): ScalaPegasusClient
```
例如:
```scala
val pegasusClient = ScalaPegasusClientFactory.createClient("resource:///pegasus.properties")
```
**2、Properties对象作为配置：**  
```scala
def createClient(props: Properties): ScalaPegasusClient
```
例如：
```scala
Properties pegasusConfig = new Properties();
pegasusConfig.setProperty("meta_servers", "127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603");
pegasusConfig.setProperty("operation_timeout", 100);
val pegasusClient = ScalaPegasusClientFactory.createClient(pegasusConfig)
```
## 数据操作
注意：调用函数前请确认导入`Serializers._`，详情参阅[实现原理](#实现原理)
```scala
val hashKey = 12345L
pegasusClient.set(table, hashKey, "sort_1", "value_1")
val value = pegasusClient.get(table, hashKey, "sort_1").as[String]
pegasusClient.del(table, hashKey, "sort_1")
pegasusClient.exists(table, hashKey, "sort_1") 
pegasusClient.sortKeyCount(table, hashKey)
pegasusClient.close
```
# 接口定义
scala的客户端类地址为：`com.xiaomi.infra.pegasus.scalaclient`，主要包括以下四个类：

| 类名                        | 功能                                   |
|---------------------------|--------------------------------------|
| ScalaPegasusClientFactory | Client工厂类，用于创建Client实例               |
| ScalaPegasusClient        | Client类，封装了各种**同步API**，也可用于创建Table实例 |
| ScalaPegasusTable         | Table类，封装了操作单个Table数据的**同步API**      |
| ScalaPegasusAsyncTable    | Table类，封装了操作单个Table数据的**异步API**      |

用户可以选择使用Client类（ScalaPegasusClient）或者是Table类（ScalaPegasusTable或者ScalaPegasusAsyncTable）存取数据，区别如下：
  * Client类直接在参数中指定表名，省去了打开表的动作，使用更便捷。
  * Table类同时支持**同步和异步API**，而Client类只支持**同步API**。
  * Table类可以为每个操作设置单独的超时，而Client类无法单独指定超时，只能使用配置文件中的默认超时。
  * Table类的超时更准确，而Client类在首次读写请求时可能需要在内部初始化Table对象，所以首次读写的超时可能不太准确。
## ScalaPegasusClient接口
### 实现原理
`ScalaPegasusClient`接口通过持有`ScalaPegasusTable`实现对特定表的访问，而`ScalaPegasusTable`实际是封装了Java client的接口`PegasusTableInterface`而实现的。函数形式如下所示：
```scala
def get[H, S](table: String, hashKey: H, sortKey: S)(implicit hSer: SER[H], sSer: SER[S]) = {
    getTable(table).get(hashKey, sortKey)
}
```
每一个数据表的操作函数都被定义为泛型函数，参数列表`(table: String, hashKey: H, sortKey: S)`是实际传入的参数，同时使用隐式参数`(implicit hSer: SER[H], sSer: SER[S])`完成对参数列表`(table: String, hashKey: H, sortKey: S)`泛型的转换。其中SER[H]是类`Serializers`的泛型声明，该类包含对不同泛型对象的隐式转换函数（转换成Java client中`PegasusTableInterface`的`byte[]参数`，在scala中对应为`Array[Byte]`，例子展示的是当泛型在使用的时候被定义为`String`时的隐式转换函数：
```scala
implicit object Utf8String extends Serializer[String] {
    override def serialize(obj: String): Array[Byte] = if (obj == null) null else obj.getBytes("UTF-8")
    override def deserialize(bytes: Array[Byte]): String = if (bytes == null) null else  new String(bytes, "UTF-8")
}
```
客户端在调用`ScalaPegasusClient`提供的方法时，当对第一个参数列表的泛型参数传入`String`类型变量的时候，将被自动转换为`Array[Byte]`类型变量，并传入`PegasusTableInterface`的对应方法中。请确保包含`Serializers._`，否则无法完成参数的类型转换，你可以使用：
```scala
import com.xiaomi.infra.pegasus.scalaclient.Serializers._
```
导入依赖，目前接受的自动类型转换包括`String`、`Boolean`、`Int`、`Long`、`Short`、`Double`，这些类型可自动转换为`Array[Byte]`。
### API功能
#### exists
判断key是否存在，参见 [Java客户端文档#exist](/_docs/zh/clients/java-client.md#exist)
```scala
def exists[H, S](table: String, hashKey: H, sortKey: S)
```
table：表名，通常为`String`类型  
hashKey：通常为`String`类型  
sortKey：通常为`String`类型  
return： 返回是否存在，`boolean`类型
#### sortKeyCount
获取一个hashkey下的sortkey值，参见 [Java客户端文档#sortKeyCount](/_docs/zh/clients/java-client.md#sortkeycount)
```scala
def sortKeyCount[H](table: String, hashKey: H)
```
table：表名，通常为`String`类型  
hashKey：通常为`String`类型  
return：返回sortKeys个数，`long`类型
#### get
获取一条数据，参见[Java客户端文档#get](/_docs/zh/clients/java-client.md#get)
```scala
def get[H, S](table: String, hashKey: H, sortKey: S)
```
table：表名，通常为`String`类型  
hashKey：通常为`String`类型  
sortKey：通常为`String`类型  
return：返回获取值，`Array[Byte]`类型，你可以使用`as[String]`转换为`String`类型  
#### batchGet
读取一批数据，对get函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。如果抛出了异常，则values中的结果是未定义的，参见[Java客户端文档#batchGet](/_docs/zh/clients/java-client.md#batchget)
```scala
def batchGet[H, S](table: String, keys: List[PegasusKey[H, S]])
```
table：表名，通常为`String`类型  
keys：PegasusKey列表，由hashKey和SortKey组成  
return：返回获取值列表，`PegasusResultList`类型
#### batchGet2
读取一批数据，对get函数的批量封装。该函数并发地向server发送异步请求，但与上面batchGet不同的是，无论请求成功还是失败，它都会等待所有请求结束，参见[Java客户端文档#batchGet2](/_docs/zh/clients/java-client.md#batchget)
```scala
def batchGet2[H, S](table: String, keys: Seq[PegasusKey[H, S]])
```
table：表名，通常为`String`类型  
keys：PegasusKey列表，有hashKey和SortKey组成  
return：返回获取值列表，`PegasusResultList`类型
#### multiGet
Java client包含多种multiGet接口，提供读同一HashKey下的多行数据功能，这里封装的是：
```Java
public boolean multiGet(String tableName, byte[] hashKey, 
                        List<byte[]> sortKeys, int maxFetchCount, 
                        int maxFetchSize, List<Pair<byte[], byte[]>> values) throws PException;
```
支持最大数据量`maxFetchCount`和最大数据大小`maxFetchSize`的参数设置，参见[Java客户端文档#multiGet](/_docs/zh/clients/java-client.md#multiget)
```scala
def multiGet[H, S](table: String, hashKey: H, sortKeys: Seq[S],
            maxFetchCount: Int = 100, maxFetchSize: Int = 1000000)
```
table：表名，通常为`String`类型  
hashKey：通常为`String`类型  
sortKeys：sortKey列表  
maxFetchCount：最大获取数据量，这里默认为100  
maxFetchSize：最大获取数据值大小，这里默认为1000000字节  
return：返回获取值列表，`convertMultiGetResult`类型
#### multiGetRange
Java client包含多种multiGet接口，提供读同一HashKey下的多行数据功能，这里封装的是：
```java
public boolean multiGet(String tableName, byte[] hashKey,
                    byte[] startSortKey, byte[] stopSortKey, MultiGetOptions options,
                    int maxFetchCount, int maxFetchSize,
                    List<Pair<byte[], byte[]>> values) throws PException;
```
可以支持SortKey的范围查询和条件过滤，只读取满足特定条件的数据，参见[Java客户端文档#multiGet](/_docs/zh/clients/java-client.md#multiget)
```scala
def multiGetRange[H, S](hashKey: H, startSortKey: S, stopSortKey: S, 
                        options: Options.MultiGet,
                        maxFetchCount: Int = 100, maxFetchSize: Int = 1000000, 
                        timeout: Duration = 0 milli)
```
table：表名，通常为`String`类型  
hashKey：hashKey，通常为`String`类型  
startSortKey：sortKey范围的起始值  
stopSortKey：sortKey范围的终止值  
options：查询条件  
maxFetchCount：最大数据量，默认为100  
maxFetchSize：最大数据值大小，默认为1000000字节  
timeout：获取数据超时时间，默认为0，表示使用配置文件中的数值  
return：返回获取值列表，`convertMultiGetResult`类型
#### batchMultiGet
对multiGet函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。如果抛出了异常，则values中的结果是未定义的，参见[Java客户端文档#batchMultiGet](/_docs/zh/clients/java-client.md#batchmultiget)
```scala
def batchMultiGet[H, S](keys: Seq[(H, Seq[S])], timeout: Duration = 0 milli)
```
keys：hashKey-sortKeys列表，如：`Seq(("1",Seq("1","2")),("1",Seq("1","2")))`  
timeout：获取数据超时时间，默认为0，表示使用配置文件中的数值  
return：返回获取值列表，`List`类型  
#### batchMultiGet2
对multiGet函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchMultiGet不同的是，无论请求成功还是失败，它都会等待所有请求结束，参见[Java客户端文档#batchMultiGet2](/_docs/zh/clients/java-client.md#batchmultiget2)
```scala
def batchMultiGet2[H, S](keys: Seq[(H, Seq[S])], timeout: Duration = 0 milli)
```
keys：hashKey-sortKeys列表，如：`Seq(("1",Seq("1","2")),("1",Seq("1","2")))`  
timeout：获取数据超时时间，默认为0，表示使用配置文件中的数值  
return：返回获取值列表，`List`类型  
#### set
写单行数据
```scala
def set[H, S, V](hashKey: H, sortKey: S, value: V, ttl: Duration = 0 second, timeout: Duration = 0 milli)
```
hashKey：通常为`String`类型  
sortKey：通常为`String`类型  
value：对应key的写入值，通常为`String`类型  
ttl：写入值保留时间，默认为0，表示永久保留  
timeout：获取数据超时时间，默认为0，表示使用配置文件中的数值  
return：无返回值  
#### batchSet
写一批数据，对set函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常，参见[Java客户端文档#batchSet](/_docs/zh/clients/java-client.md#batchset)
```scala
def batchSet[H, S, V](table: String, items: Seq[SetItem[H, S, V]])
```
table：表名，通常为`String`类型  
items：写入值列表，由hashKey、sortKey、value组成  
return：请求成功的个数（该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果）
#### batchSet2
对set函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchSet不同的是，无论请求成功还是失败，它都会等待所有请求结束，参见[Java客户端文档#batchSet2](/_docs/zh/clients/java-client.md#batchset2)
#### multiSet
Java client有两种接口，提供写同一HashKey下的多行数据，这里封装的是：
```java
public void multiSet(String tableName, byte[] hashKey, 
                    List<Pair<byte[], byte[]>> values, 
                    int ttl_seconds) throws PException;
```
支持数据过期时间设定
```scala
def multiSet[H, S, V](table: String, hashKey: H, values: Seq[(S, V)], ttl: Duration = 0 second)
```
table：表名，通常为`String`类型  
hashKey：通常为`String`类型  
value：写入值列表，由sortkey、value组成，如`Seq(("hashKey1","sortKey1"),("hashKey2","sortKey2"))`  
ttl：写入值保留时间，默认为0，表示永久保留  
return：无返回值
#### batchMultitSet
对multiSet函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常，参见[Java客户端文档#batchMultiSet](/_docs/zh/clients/java-client.md#batchmultiset)
```scala
def batchMultitSet[H, S, V](table: String, items: Seq[HashKeyData[H, S, V]], ttl: Duration = 0 second)
```
table：表名，通常为`String`类型  
items：批量写入数据列表  
ttl：写入值保留时间，默认为0，表示永久保留  
return：请求成功的个数（该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果）
#### batchMultitSet2
对multiSet函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchMultiSet不同的是，无论请求成功还是失败，它都会等待所有请求结束，参见[Java客户端文档#batchMultitSet2](/_docs/zh/clients/java-client.md#batchmultiset2)
```scala
def batchMultiSet2[H, S, V](table: String, items: Seq[HashKeyData[H, S, V]], ttl: Duration = 0 second)
```
table：表名，通常为`String`类型  
items：批量写入数据列表  
ttl：写入值保留时间，默认为0，表示永久保留  
return：请求成功的个数（该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果）
#### del
删除单行数据，参见[Java客户端文档#del](/_docs/zh/clients/java-client.md#del)
```scala
def del[H, S](table: String, hashKey: H, sortKey: S)
```
table：表名，通常为`String`类型  
hashKey：通常为`String`类型  
sortkey：通常为`String`类型  
return：无返回值  
#### batchDel
删除一批数据，对del函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常，参见[Java客户端文档#batchDel](/_docs/zh/clients/java-client.md#batchdel)
```scala
batchDel[H, S](table: String, keys: Seq[PegasusKey[H, S]])
```
table：表名，通常为`String`类型  
keys：键值列表，由hashKey和sortKey组成  
return：请求成功的个数（该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果）
#### batchDel2
对del函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchDel不同的是，无论请求成功还是失败，它都会等待所有请求结束，参见[Java客户端文档#batchDel2](/_docs/zh/clients/java-client.md#batchdel2)
```scala
def batchDel2[H, S](table: String, keys: Seq[PegasusKey[H, S]])
```
#### multiDel
删同一HashKey下的多行数据，参见[Java客户端文档#multiDel](/_docs/zh/clients/java-client.md#multidel)
```scala
def multiDel[H, S](table: String, hashKey: H, sortKeys: Seq[S])
```
table：表名，通常为`String`类型  
hashKey：通常为`String`类型  
sortKeys：sortKey列表  
return：无返回值  
#### batchMultiDel
对multiDel函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常，参见[Java客户端文档#batchMultiDel](/_docs/zh/clients/java-client.md#batchmultidel)
```scala
def batchMultiDel[H, S](table: String, keys: Seq[(H, Seq[S])])
```
table：表名，通常为`String`类型  
keys：键列表，由hashKey、sortKeys组成，如`Seq(("hashKey1",(sortKey1,sortKey2),("hashKey2",(sortKey3,sortKey4))`  
return：无返回值
#### batchMultiDel2
对del函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchMultiDel不同的是，无论请求成功还是失败，它都会等待所有请求结束，参见[Java客户端文档#batchMultiDel2](/_docs/zh/clients/java-client.md#batchmultidel2)
```scala
def batchMultiDel2[H, S](table: String, keys: Seq[(H, Seq[S])])
```
table：表名，通常为`String`类型  
keys：键列表，由hashKey、sortKeys组成，如`Seq(("hashKey1",(sortKey1,sortKey2),("hashKey2",(sortKey3,sortKey4))`  
return：无返回值
#### ttl
获取单行数据的TTL时间。TTL表示Time To Live，表示该数据还能存活多久。如果超过存活时间，数据就读不到了，参见[Java客户端文档#ttl](/_docs/zh/clients/java-client.md#ttl)
```scala
def ttl[H, S](table: String, hashKey: H, sortKey: S)
```
table：表名，通常为`String`类型  
hashKey：通常为`String`类型  
sortKeys：通常为`String`类型  
return：TTL时间，单位为秒。如果该数据没有设置TTL，返回-1；如果该数据不存在，返回-2
#### incr
单行原子增(减)操作，详细说明参见[单行原子操作](/_docs/zh/api/single-atomic.md)，该操作先将key所指向的value的字节串转换为int64类型（实现上类似于Java的Long.parseLong()函数），然后加上increment，将结果转换为字节串设置为新值。当参数increment为正数时，即原子加；当参数increment为负数时，即原子减，参见[Java客户端文档#incr](/_docs/zh/clients/java-client.md#incr)。
```scala
def incr[H, S](table: String, hashKey: H, sortKey: S, increment: Long, ttl: Duration = 0 milli)
```
table：表名，通常为`String`类型  
hashKey：通常为`String`类型  
sortKey：通常为`String`类型  
increment：增加值  
ttl：值保留时间，默认为0，表示永久保留  
return：操作成功后的新值
## ScalaPegasusTable接口
ScalaPegasusTable接口提供的方法均为同步API，`ScalaPegasusClient`接口即默认封装该接口，详细API信息参见[ScalaPegasusClient接口](#ScalaPegasusClient接口)
## ScalaPegasusAsyncTable
ScalaPegasusAsyncTable接口提供的方法均为异步API，封装了java client的异步接口。对应API功能可参考[ScalaPegasusClient接口](#ScalaPegasusClient接口)和[Java客户端文档#PegasusTableInterface接口](/_docs/zh/clients/java-client.md#PegasusTableInterface接口)，接口封装形式如：
```scala
@throws[PException]
    def multiGet[H, S](hashKey: H, sortKeys: Seq[S], maxFetchCount: Int = 100, maxFetchSize: Int = 1000000, timeout: Duration = 0 milli)
            (implicit hSer: SER[H], sSer: SER[S]): Future[MultiGetResult[S, Array[Byte]]] = {
        val result = table.asyncMultiGet(hashKey, sortKeys, maxFetchCount, maxFetchSize, timeout)
        toScala(result)(convertMultiGetResult[S])
    }
```
其中`table.asyncMultiGet(hashKey, sortKeys, maxFetchCount, maxFetchSize, timeout)`即Java client接口，参数传递原理参见[实现原理](#实现原理)，`toScala(result)(convertMultiGetResult[S])`的完整形式如下：
```scala
implicit private [scalaclient] def toScala[A, B](future: NFuture[A])(implicit f: A => B): Future[B] = {
        val promise = Promise[B]()
        future.addListener(new GenericFutureListener[NFuture[_ >: A]] {
            override def operationComplete(future: NFuture[_ >: A]): Unit = {
                if (future.isSuccess) {
                    promise.success(f(future.get.asInstanceOf[A]))
                } else {
                    promise.failure(future.cause())
                }
            }
        })
        promise.future
    }
```
使用`隐式转换`实现Java的异步编程到Scala的异步编程变换，该函数利用`io.netty.util.concurrent.{GenericFutureListener, Future => NFuture}`实现异步编程。
