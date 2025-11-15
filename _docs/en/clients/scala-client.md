---
permalink: clients/scala-client
---

# Getting the Client
Project repository: [Pegasus Scala Client](https://github.com/apache/incubator-pegasus/tree/master/scala-client)

Download:
```bash
git clone git@github.com:apache/incubator-pegasus.git
cd incubator-pegasus/scala-client
```

Choose the version to use and build. It is recommended to use the `master` version. Note that the Scala client depends on the [Java client](https://github.com/apache/incubator-pegasus/tree/master/java-client). Please refer to [Getting the Java Client](/clients/java-client#getting-the-java-client) to add the Java dependency to your project. You can package it into a Jar for use:
```bash
sbt package
```

Alternatively, install to the local sbt repository for convenient use in sbt projects:
```bash
sbt publish-local
```

Or install to the local Maven repository:
```bash
sbt publish-m2
```

By default, the project is built with Scala 2.11. When publishing, both 2.11 (`pegasus-scala-client_2.11`) and 2.12 (`pegasus-scala-client_2.12`) artifacts are released. If your project is built with sbt, you can configure:
```sbt
// Using sbt repository, no suffix needed. It uses the current Scala version, i.e., 2.12
scalaVersion := "2.12.8"
libraryDependencies ++= Seq(
    "com.xiaomi.infra" %% "pegasus-scala-client" % "1.11.4-1-SNAPSHOT"
)
```

Or configure:
```sbt
// Using a Maven repository (you can add custom Maven repos with resolvers ++= Seq()), suffix required
scalaVersion := "2.12.8"
libraryDependencies ++= Seq(
    "com.xiaomi.infra" % "pegasus-scala-client_2.11" % "1.11.4-1-SNAPSHOT"
)
```

If your project is built with Maven, add the dependency like:
```xml
<dependency>
    <groupId>com.xiaomi.infra</groupId>
    <artifactId>pegasus-scala-client_2.11</artifactId>
    <version>1.11.4-1</version>
</dependency>
```

# Using the Client

## Get an Instance
Obtain an instance by specifying server configuration. Scala provides two ways to get an instance:

1) Use file path as configuration parameter. Refer to [Java client file-based configuration](/clients/java-client#configuration-file)
```scala
def createClient(configPath: String): ScalaPegasusClient
```
Example:
```scala
val pegasusClient = ScalaPegasusClientFactory.createClient("resource:///pegasus.properties")
```

2) Use a `Properties` object as configuration:
```scala
def createClient(props: Properties): ScalaPegasusClient
```
Example:
```scala
Properties pegasusConfig = new Properties();
pegasusConfig.setProperty("meta_servers", "127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603");
pegasusConfig.setProperty("operation_timeout", 100);
val pegasusClient = ScalaPegasusClientFactory.createClient(pegasusConfig)
```

## Data Operations
Note: Before calling functions, ensure you import `Serializers._`. See [Implementation Details](#implementation-details)
```scala
val hashKey = 12345L
pegasusClient.set(table, hashKey, "sort_1", "value_1")
val value = pegasusClient.get(table, hashKey, "sort_1").as[String]
pegasusClient.del(table, hashKey, "sort_1")
pegasusClient.exists(table, hashKey, "sort_1") 
pegasusClient.sortKeyCount(table, hashKey)
pegasusClient.close
```

# Interface Definition
The Scala client classes are located in `com.xiaomi.infra.pegasus.scalaclient`, mainly including the following four classes:

| Class Name                 | Functionality                                                         |
| -------------------------- | -------------------------------------------------------------------- |
| ScalaPegasusClientFactory  | Client factory class for creating Client instances                    |
| ScalaPegasusClient         | Client class that encapsulates various **synchronous APIs**, and can also be used to create Table instances |
| ScalaPegasusTable          | Table class that encapsulates **synchronous APIs** for operating on a single table |
| ScalaPegasusAsyncTable     | Table class that encapsulates **asynchronous APIs** for operating on a single table |

Users can choose to use the Client class (`ScalaPegasusClient`) or the Table classes (`ScalaPegasusTable` or `ScalaPegasusAsyncTable`) for data access. Differences:
- The Client class specifies the table name directly in parameters, avoiding the need to open a table, making it simpler to use.
- The Table classes support both **synchronous and asynchronous APIs**, while the Client class supports only **synchronous APIs**.
- The Table classes allow individual timeout settings for each operation, whereas the Client class cannot specify timeouts individually and uses the default timeout in the configuration file.
- The Table classes provide more accurate timeout behavior. The Client class may need to initialize the Table object internally on the first read/write request, causing the initial timeout to be less accurate.

## ScalaPegasusClient Interface
### Implementation Details
The `ScalaPegasusClient` interface accesses specific tables by holding a `ScalaPegasusTable`, which wraps the Java client interface `PegasusTableInterface`. The function form is as follows:
```scala
def get[H, S](table: String, hashKey: H, sortKey: S)(implicit hSer: SER[H], sSer: SER[S]) = {
    getTable(table).get(hashKey, sortKey)
}
```
Each table operation function is defined as a generic function. The parameter list `(table: String, hashKey: H, sortKey: S)` is the actual passed parameters, and implicit parameters `(implicit hSer: SER[H], sSer: SER[S])` perform generic conversion of `(table: String, hashKey: H, sortKey: S)`. `SER[H]` is a generic declaration in the `Serializers` class, which contains implicit conversion functions for different generic objects (converting into `byte[]` parameters in the Java client’s `PegasusTableInterface`, corresponding to `Array[Byte]` in Scala). The example shows the implicit conversion when the generic type is defined as `String`:
```scala
implicit object Utf8String extends Serializer[String] {
    override def serialize(obj: String): Array[Byte] = if (obj == null) null else obj.getBytes("UTF-8")
    override def deserialize(bytes: Array[Byte]): String = if (bytes == null) null else  new String(bytes, "UTF-8")
}
```
When calling methods provided by `ScalaPegasusClient`, if the generic parameter in the first parameter list is a `String`, it is automatically converted to `Array[Byte]` and passed to the corresponding method of `PegasusTableInterface`. Ensure `Serializers._` is included; otherwise, parameter type conversion cannot be completed. You can use:
```scala
import com.xiaomi.infra.pegasus.scalaclient.Serializers._
```
to import dependencies. Currently supported automatic conversions include `String`, `Boolean`, `Int`, `Long`, `Short`, `Double`. These types can be automatically converted to `Array[Byte]`.

### API Functions
#### exists
Check whether a key exists. See [Java Client Doc: exist](/clients/java-client#exist)
```scala
def exists[H, S](table: String, hashKey: H, sortKey: S)
```
table: table name, usually `String`
hashKey: usually `String`
sortKey: usually `String`
return: whether it exists, `boolean`

#### sortKeyCount
Get the number of sort keys under a hash key. See [Java Client Doc: sortKeyCount](/clients/java-client#sortkeycount)
```scala
def sortKeyCount[H](table: String, hashKey: H)
```
table: table name, usually `String`
hashKey: usually `String`
return: count of sortKeys, `long`

#### get
Get a single value. See [Java Client Doc: get](/clients/java-client#get)
```scala
def get[H, S](table: String, hashKey: H, sortKey: S)
```
table: `String`
hashKey: `String`
sortKey: `String`
return: value, `Array[Byte]`. You can convert with `as[String]` to `String`

#### batchGet
Read a batch of values. It concurrently sends async requests to server and waits for results. If any request fails, it terminates early and throws an exception. If an exception is thrown, values in the result are undefined. See [Java Client Doc: batchGet](/clients/java-client#batchget)
```scala
def batchGet[H, S](table: String, keys: List[PegasusKey[H, S]])
```
table: `String`
keys: list of `PegasusKey`, composed of `hashKey` and `sortKey`
return: list of values, `PegasusResultList`

#### batchGet2
Read a batch of values, similar to `batchGet`. It concurrently sends async requests to server, but unlike the above, it waits for all requests to finish regardless of success or failure. See [Java Client Doc: batchGet2](/clients/java-client#batchget)
```scala
def batchGet2[H, S](table: String, keys: Seq[PegasusKey[H, S]])
```
table: `String`
keys: list of `PegasusKey`, composed of `hashKey` and `sortKey`
return: list of values, `PegasusResultList`

#### multiGet
The Java client includes multiple `multiGet` interfaces for reading multiple rows under the same `hashKey`. This wraps the following:
```Java
public boolean multiGet(String tableName, byte[] hashKey, 
                        List<byte[]> sortKeys, int maxFetchCount, 
                        int maxFetchSize, List<Pair<byte[], byte[]>> values) throws PException;
```
Supports parameters `maxFetchCount` and `maxFetchSize`. See [Java Client Doc: multiGet](/clients/java-client#multiget)
```scala
def multiGet[H, S](table: String, hashKey: H, sortKeys: Seq[S],
            maxFetchCount: Int = 100, maxFetchSize: Int = 1000000)
```
table: `String`
hashKey: `String`
sortKeys: list of sort keys
maxFetchCount: maximum number of entries to fetch, default `100`
maxFetchSize: maximum total bytes to fetch, default `1000000`
return: list of values, `convertMultiGetResult`

#### multiGetRange
The Java client includes multiple `multiGet` interfaces. This wraps the following:
```java
public boolean multiGet(String tableName, byte[] hashKey,
                    byte[] startSortKey, byte[] stopSortKey, MultiGetOptions options,
                    int maxFetchCount, int maxFetchSize,
                    List<Pair<byte[], byte[]>> values) throws PException;
```
Supports range query on sort keys and conditional filtering, only reading data that meets the conditions. See [Java Client Doc: multiGet](/clients/java-client#multiget)
```scala
def multiGetRange[H, S](hashKey: H, startSortKey: S, stopSortKey: S, 
                        options: Options.MultiGet,
                        maxFetchCount: Int = 100, maxFetchSize: Int = 1000000, 
                        timeout: Duration = 0 milli)
```
table: `String`
hashKey: `String`
startSortKey: start of sort key range
stopSortKey: end of sort key range
options: query options
maxFetchCount: default `100`
maxFetchSize: default `1000000`
timeout: timeout for fetching, default `0` (use value from config file)
return: list of values, `convertMultiGetResult`

#### batchMultiGet
Batch wrapper for `multiGet`. It concurrently sends async requests to server and waits for results. If any request fails, it terminates early and throws an exception. If an exception is thrown, values in the result are undefined. See [Java Client Doc: batchMultiGet](/clients/java-client#batchmultiget)
```scala
def batchMultiGet[H, S](keys: Seq[(H, Seq[S])], timeout: Duration = 0 milli)
```
keys: list of `hashKey`-`sortKeys`, e.g., `Seq(("1",Seq("1","2")),("1",Seq("1","2")))`
timeout: timeout for fetching, default `0` (use value from config file)
return: list of values, `List`

#### batchMultiGet2
Batch wrapper for `multiGet`. It concurrently sends async requests to server and waits for results, but unlike the above, it waits for all requests to finish regardless of success or failure. See [Java Client Doc: batchMultiGet2](/clients/java-client#batchmultiget2)
```scala
def batchMultiGet2[H, S](keys: Seq[(H, Seq[S])], timeout: Duration = 0 milli)
```
keys: list of `hashKey`-`sortKeys`, e.g., `Seq(("1",Seq("1","2")),("1",Seq("1","2")))`
timeout: default `0`
return: list of values, `List`

#### set
Write a single row
```scala
def set[H, S, V](hashKey: H, sortKey: S, value: V, ttl: Duration = 0 second, timeout: Duration = 0 milli)
```
hashKey: usually `String`
sortKey: usually `String`
value: value to write, usually `String`
ttl: time-to-live, default `0` (permanent)
timeout: default `0` (use config file value)
return: none

#### batchSet
Write a batch of entries, a batch wrapper for `set`. It concurrently sends async requests to server and waits for results. If any request fails, it terminates early and throws an exception. See [Java Client Doc: batchSet](/clients/java-client#batchset)
```scala
def batchSet[H, S, V](table: String, items: Seq[SetItem[H, S, V]])
```
table: `String`
items: list composed of `hashKey`, `sortKey`, `value`
return: number of successful requests (not atomic; partial success is possible. You may choose to use only successful results)

#### batchSet2
Batch wrapper for `set`. It concurrently sends async requests to server and waits for results, but unlike above, it waits for all requests to finish regardless of success or failure. See [Java Client Doc: batchSet2](/clients/java-client#batchset2)

#### multiSet
The Java client provides two interfaces for writing multiple rows under the same `hashKey`. This wraps:
```java
public void multiSet(String tableName, byte[] hashKey, 
                    List<Pair<byte[], byte[]>> values, 
                    int ttl_seconds) throws PException;
```
Supports TTL for entries
```scala
def multiSet[H, S, V](table: String, hashKey: H, values: Seq[(S, V)], ttl: Duration = 0 second)
```
table: `String`
hashKey: `String`
value: list of values composed of `sortKey` and `value`, e.g., `Seq(("hashKey1","sortKey1"),("hashKey2","sortKey2"))`
ttl: default `0` (permanent)
return: none

#### batchMultitSet
Batch wrapper for `multiSet`. It concurrently sends async requests to server and waits for results. If any request fails, it terminates early and throws an exception. See [Java Client Doc: batchMultiSet](/clients/java-client#batchmultiset)
```scala
def batchMultitSet[H, S, V](table: String, items: Seq[HashKeyData[H, S, V]], ttl: Duration = 0 second)
```
table: `String`
items: batch data to write
ttl: default `0` (permanent)
return: number of successful requests (not atomic; partial success is possible)

#### batchMultitSet2
Batch wrapper for `multiSet`. It concurrently sends async requests to server and waits for results, but unlike above, it waits for all requests to finish regardless of success or failure. See [Java Client Doc: batchMultitSet2](/clients/java-client#batchmultiset2)
```scala
def batchMultiSet2[H, S, V](table: String, items: Seq[HashKeyData[H, S, V]], ttl: Duration = 0 second)
```
table: `String`
items: batch data to write
ttl: default `0`
return: number of successful requests (not atomic; partial success is possible)

#### del
Delete a single row. See [Java Client Doc: del](/clients/java-client#del)
```scala
def del[H, S](table: String, hashKey: H, sortKey: S)
```
table: `String`
hashKey: `String`
sortKey: `String`
return: none

#### batchDel
Delete a batch of rows, batch wrapper for `del`. It concurrently sends async requests to server and waits for results. If any request fails, it terminates early and throws an exception. See [Java Client Doc: batchDel](/clients/java-client#batchdel)
```scala
batchDel[H, S](table: String, keys: Seq[PegasusKey[H, S]])
```
table: `String`
keys: list of keys composed of `hashKey` and `sortKey`
return: number of successful requests (not atomic; partial success is possible)

#### batchDel2
Batch wrapper for `del`. It concurrently sends async requests to server and waits for results, but unlike above, it waits for all requests to finish regardless of success or failure. See [Java Client Doc: batchDel2](/clients/java-client#batchdel2)
```scala
def batchDel2[H, S](table: String, keys: Seq[PegasusKey[H, S]])
```

#### multiDel
Delete multiple rows under the same `hashKey`. See [Java Client Doc: multiDel](/clients/java-client#multidel)
```scala
def multiDel[H, S](table: String, hashKey: H, sortKeys: Seq[S])
```
table: `String`
hashKey: `String`
sortKeys: list of sort keys
return: none

#### batchMultiDel
Batch wrapper for `multiDel`. It concurrently sends async requests to server and waits for results. If any request fails, it terminates early and throws an exception. See [Java Client Doc: batchMultiDel](/clients/java-client#batchmultidel)
```scala
def batchMultiDel[H, S](table: String, keys: Seq[(H, Seq[S])])
```
table: `String`
keys: list composed of `hashKey` and `sortKeys`, e.g., `Seq(("hashKey1",(sortKey1,sortKey2)),("hashKey2",(sortKey3,sortKey4)))`
return: none

#### batchMultiDel2
Batch wrapper for `del`. It concurrently sends async requests to server and waits for results, but unlike above, it waits for all requests to finish regardless of success or failure. See [Java Client Doc: batchMultiDel2](/clients/java-client#batchmultidel2)
```scala
def batchMultiDel2[H, S](table: String, keys: Seq[(H, Seq[S])])
```
table: `String`
keys: list composed of `hashKey` and `sortKeys`, e.g., `Seq(("hashKey1",(sortKey1,sortKey2)),("hashKey2",(sortKey3,sortKey4)))`
return: none

#### ttl
Get the TTL of a single row. TTL (Time To Live) indicates how long the data will still be alive. If the TTL expires, the data cannot be read. See [Java Client Doc: ttl](/clients/java-client#ttl)
```scala
def ttl[H, S](table: String, hashKey: H, sortKey: S)
```
table: `String`
hashKey: `String`
sortKeys: `String`
return: TTL in seconds. If no TTL is set, returns `-1`; if the data does not exist, returns `-2`

#### incr
Single-row atomic increment/decrement. See [Single Row Atomic Operations](/api/single-atomic) for details. The operation first converts the value bytes pointed by the key to `int64` (similar to Java’s `Long.parseLong()`), then adds `increment`, converts the result to bytes and sets it as the new value. If `increment` is positive, it increments; if negative, it decrements. See [Java Client Doc: incr](/clients/java-client#incr).
```scala
def incr[H, S](table: String, hashKey: H, sortKey: S, increment: Long, ttl: Duration = 0 milli)
```
table: `String`
hashKey: `String`
sortKey: `String`
increment: amount to add
ttl: default `0` (permanent)
return: the new value after success

## ScalaPegasusTable Interface
`ScalaPegasusTable` provides synchronous APIs. The `ScalaPegasusClient` interface wraps these by default. See [ScalaPegasusClient Interface](#scalapegasusclient-interface) for details.

## ScalaPegasusAsyncTable
`ScalaPegasusAsyncTable` provides asynchronous APIs, wrapping the Java client's async interfaces. Refer to [ScalaPegasusClient Interface](#scalapegasusclient-interface) and [Java Client Doc: PegasusTableInterface](/clients/java-client#pegasustableinterface). Example wrapper:
```scala
@throws[PException]
    def multiGet[H, S](hashKey: H, sortKeys: Seq[S], maxFetchCount: Int = 100, maxFetchSize: Int = 1000000, timeout: Duration = 0 milli)
            (implicit hSer: SER[H], sSer: SER[S]): Future[MultiGetResult[S, Array[Byte]]] = {
        val result = table.asyncMultiGet(hashKey, sortKeys, maxFetchCount, maxFetchSize, timeout)
        toScala(result)(convertMultiGetResult[S])
    }
```
Where `table.asyncMultiGet(hashKey, sortKeys, maxFetchCount, maxFetchSize, timeout)` is the Java client interface. See [Implementation Details](#implementation-details) for parameter passing principles. The full form of `toScala(result)(convertMultiGetResult[S])` is:
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
This uses implicit conversion to transform Java async programming to Scala async programming, utilizing `io.netty.util.concurrent.{GenericFutureListener, Future => NFuture}`.
