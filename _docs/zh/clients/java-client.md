---
permalink: clients/java-client
---

# 获取Java客户端

项目地址：[Pegasus Java Client](https://github.com/XiaoMi/pegasus-java-client)

下载：

```bash
git clone https://github.com/XiaoMi/pegasus-java-client.git
cd pegasus-java-client
```

选择所使用的版本并构建，建议使用 [最新的release版本](https://github.com/xiaomi/pegasus-java-client/releases) ：

```bash
git checkout v2.0.0
mvn clean package -DskipTests
```

安装到本地的maven repository，方便在项目中使用：

```bash
mvn clean install -DskipTests
```

安装完成后，通过maven配置在项目中使用：

```xml
<dependency>
  <groupId>com.xiaomi.infra</groupId>
  <artifactId>pegasus-client</artifactId>
  <version>2.0.0</version>
</dependency>
```

**注：2.0.0版本仅适用于服务端PegasusServer >= 2.0, 如果服务端版本较低，请使用下面的版本**
```xml
<dependency>
  <groupId>com.xiaomi.infra</groupId>
  <artifactId>pegasus-client</artifactId>
  <version>1.11.10-thrift-0.11.0-inlined</version>
</dependency>
```

# 客户端配置
创建Java client实例需要配置相关参数，用户可以选择两种方式进行配置：文件配置方式和参数传递方式

## 文件配置
Java客户端需要准备配置文件，用以确定Pegasus集群的位置，以及配置默认超时时间等。

配置文件一般命名为```pegasus.properties```，样例：

```ini
meta_servers = 127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603
operation_timeout = 1000
# 以下参数可以根据需要添加，否则以默认值即可
async_workers = 4
enable_perf_counter = true
perf_counter_tags = cluster=onebox,app=unit_test
push_counter_interval_secs = 10
meta_query_timeout = 5000
```
其中：  
* meta_servers: 必选项，表示Pegasus集群的MetaServer地址列表，用于定位集群的位置。  
* operation_timeout: 可选项，表示各操作的默认超时时间，单位毫秒，默认值为1000。接口中每个操作一般都可以指定单独的超时时间，当指定为0时，使用该默认超时时间。
* async_workers：可选项，后台工作线程数，内部实际是Netty NIO处理客户端和replica_server之间RPC的线程，默认：4
* enable_perf_counter：可选项，是否开启性能指标监控数据，如果开启则客户端会周期性的上报监控数据，目前仅支持 [Falcon](http://open-falcon.org/) ，默认：true(2.0.0以前默认为false)
* perf_counter_tags：可选项，falcon监控数据标签，如果开启监控，建议设置易于区分不同业务的标签名字。默认：空
* push_counter_interval_secs：可选值，falcon监控数据上报间隔，默认：10s
* meta_query_timeout： 可选项，与MetaServer建立连接的超时时间，一般首次建立连接将需要更多的时间，用户可以根据实际场景配置该参数，以降低服务首次启动后的请求超时问题。连接默认值：5000ms(2.0.0以前没有该参数，默认等于operation_timeout)

配置文件在创建Client实例的时候使用，需传入configPath参数：  

```java
PegasusClientInterface client = PegasusClientFactory.getSingletonClient(configPath);
```

其中configPath的格式为```type : // path```，目前type支持三种类型：  

* 本地文件系统
  * 格式：file:///path/to/config
  * 样例1：file://./pegasus.properties （表示本地 ./pegasus.properties 文件）  
  * 样例2：file:///home/work/pegasus.properties （表示本地 /home/work/pegasus.properties 文件）  
* Java Resource  
  * 格式：resource:///path/to/config
  * 样例1：resource:///pegasus.properties  
  * 样例2：resource:///com/xiaomi/xxx/pegasus.properties
* Zookeeper
  * 格式：zk://host1:port1,host2:port2,host3:port3/path/to/config
  * 样例1：zk://127.0.0.1:2181/databases/pegasus/pegasus.properties
  * 样例2：zk://127.0.0.1:2181,127.0.0.1:2182/databases/pegasus/pegasus.properties

## 参数传递
用户可以选择构造ClientOptions实例作为创建客户端实例的参数，ClientOptions包含下列参数：
* metaServers：必选项，meta_servers地址，默认：127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603
* operationTimeout：可选项，客户端请求的超时阈值，默认：1000ms
* asyncWorkers：可选项，后台工作线程数，内部实际是Netty NIO处理客户端和replica_server之间RPC的线程，默认：4
* enablePerfCounter：可选项，是否开启性能指标监控数据，如果开启则客户端会周期性的上报监控数据，目前仅支持 [Falcon](http://open-falcon.org/) ，默认：false
* falconPerfCounterTags：可选项，falcon监控数据标签，如果开启监控，建议设置易于区分不同业务的标签名字。默认：空
* falconPushInterval：可选项，falcon监控数据上报间隔，默认：10s
* metaQueryTimeout: 可选项，与MetaServer建立连接的超时时间，一般首次建立连接将需要更多的时间，用户可以根据实际场景配置该参数，以降低服务首次启动后的请求超时问题。连接默认值：5000ms(2.0.0以前没有该参数，默认等于operation_timeout)

其中ClientOptions实例提供两种创建方式，你可以使用：
```java
ClientOptions clientOptions = ClientOptions.create()
```
创建默认的ClientOptions实例。否则，可以参照下列样例创建自定义的实例：
```java
ClientOptions clientOptions =
      ClientOptions.builder()
          .metaServers("127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603")
          .operationTimeout(Duration.ofMillis(1000))
          .asyncWorkers(4)
          .enablePerfCounter(false)
          .falconPerfCounterTags("")
          .falconPushInterval(Duration.ofSeconds(10))
          .build();
```
# 接口定义

Java客户端的类都在```com.xiaomi.infra.pegasus.client```包下面，主要提供了三个类：

| 类名                     | 功能                                     |
|------------------------|----------------------------------------|
| PegasusClientFactory   | Client工厂类，用于创建Client实例                 |
| PegasusClientInterface | Client接口类，封装了各种**同步API**，也可用于创建Table实例 |
| PegasusTableInterface  | Table接口类，封装了存取单个Table数据的**同步和异步API**   |

用户可以选择使用Client接口（PegasusClientInterface）或者是Table接（PegasusTableInterface）存取数据，区别如下：

* Client接口直接在参数中指定表名，省去了打开表的动作，使用更便捷。
* Table接口同时支持**同步和异步API**，而Client接口只支持**同步API**。
* Table接口可以为每个操作设置单独的超时，而Client接口无法单独指定超时，只能使用配置文件中的默认超时。
* Table接口在2.0.0中增加了backupRequestDelayMs参数，可以开启backup-request功能，以提高读性能，详情参见：[Backup-Request](/_docs/zh/administration/backup-request.md)
* Table接口的超时更准确，而Client接口在首次读写请求时可能需要在内部初始化Table对象，所以首次读写的超时可能不太准确。
* 推荐用户首选Table接口。

## 创建Client实例

创建Client实例有两种方式：单例和非单例。

### 单例

如果程序中只需要访问**单个集群**，那么用单例是比较合适的，这样可以共享各种资源，譬如线程池、连接等。

**注意**：如果在多个地方调用```getSingletonClient()```获取单例对象，需要保证传入的configPath或者ClientOptions对象是一致的，不然就会抛出异常，这样是为了保证多次调用获取到的是同一个实例。

调用```PegasusClientFactory::getSingletonClient()```方法获取PegasusClientInterface的单例对象：

```java
/**
  * Get the singleton client instance with default config path of "resource:///pegasus.properties".
  * After used, should call PegasusClientFactory.closeSingletonClient() to release resource.
  *
  * @return PegasusClientInterface PegasusClientInterface.
  * @throws PException throws exception if any error occurs.
  */
public static PegasusClientInterface getSingletonClient() throws PException;

/**
  * Get the singleton client instance with customized config path. After used, should call
  * PegasusClientFactory.closeSingletonClient() to release resource.
  *
  * @param configPath configPath could be:
  * - zookeeper path  : zk://host1:port1,host2:port2,host3:port3/path/to/config
  * - local file path : file:///path/to/config
  * - java resource   : resource:///path/to/config
  *
  * @return PegasusClientInterface PegasusClientInterface.
  * @throws PException throws exception if any error occurs.
  */
public static PegasusClientInterface getSingletonClient(String configPath) throws PException;

/**
  * Get the singleton client instance instance with ClientOptions. After used, should call
  * PegasusClientFactory.closeSingletonClient() to release resource.
  *
  * @param options The client option
  * @return PegasusClientInterface PegasusClientInterface.
  * @throws PException throws exception if any error occurs.
  */
public static PegasusClientInterface getSingletonClient(ClientOptions options) throws PException;
```

使用完毕后，记得close单例以释放资源，譬如：

```java
PegasusClientInterface client = PegasusClientFactory.getSingletonClient(configPath);

... ...

PegasusClientFactory.closeSingletonClient();
```

### 非单例

如果在程序中需要访问多个集群，就不能用单例了。因此我们提供了创建普通实例的接口，创建时传入一个configPath或者ClientOptions对象，不同集群使用不同的configPath或者ClientOptions对象。

**注意**：每个实例都拥有自己独立的资源，互不影响，因此要尽量避免重复创建实例，造成资源浪费，并且使用完后要记得调用close()释放资源。

调用```PegasusClientFactory::createClient()```方法，获取非单例的client实例：

```java
/**
  * Create a client instance. After used, should call client.close() to release resource.
  *
  * @param configPath client config path,could be:
  * - zookeeper path  : zk://host1:port1,host2:port2,host3:port3/path/to/config
  * - local file path : file:///path/to/config
  * - java resource   : resource:///path/to/config
  *
  * @return PegasusClientInterface.
  * @throws PException throws exception if any error occurs.
  */
public static PegasusClientInterface createClient(String configPath) throws PException;

/**
  * Create a client instance instance with ClientOptions. After used, should call
  * client.close() to release resource.
  *
  * @param options The client option
  * @return PegasusClientInterface.
  * @throws PException throws exception if any error occurs.
  */
public static PegasusClientInterface createClient(ClientOptions options) throws PException;
```

譬如：
```java
PegasusClientInterface client = PegasusClientFactory.createClient(configPath);

... ...

client.close();
```

## PegasusClientInterface接口

### get  
读单行数据。
```java
/**
 * Get value.
 * @param tableName TableHandler name
 * @param hashKey used to decide which partition to get this k-v,
 *                if null or length == 0, means hash key is "".
 * @param sortKey all the k-v under hashKey will be sorted by sortKey,
 *                if null or length == 0, means sort key is "".
 * @return value; null if not found
 * @throws PException
 */
public byte[] get(String tableName, byte[] hashKey, byte[] sortKey) throws PException;
```
注：
  * 参数：需传入TableName、HashKey、SortKey。
  * 返回值：如果返回null，表示key对应的数据不存在
  * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

### batchGet
读取一批数据，对get函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。如果抛出了异常，则values中的结果是未定义的。
```java
/**
 * Batch get values of different keys.
 * Will terminate immediately if any error occurs.
 * @param tableName table name
 * @param keys hashKey and sortKey pair list.
 * @param values output values; should be created by caller; if succeed, the size of values will
 *               be same with keys; the value of keys[i] is stored in values[i]; if the value of
 *               keys[i] is not found, then values[i] will be set to null.
 * @throws PException throws exception if any error occurs.
 *
 * Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
 */
public void batchGet(String tableName, List<Pair<byte[], byte[]>> keys, List<byte[]> values) throws PException;
```
注：
 * 参数：
   * 传入参数：TableName、Keys。
   * 传出参数：Values。该变量需由调用者创建；如果读取成功，Values[i]中存放Keys[i]对应的结果，如果value不存在则为null。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，只要任意一个失败都会抛出异常。

### batchGet2
读取一批数据，对get函数的批量封装。该函数并发地向server发送异步请求，但与上面batchGet不同的是，无论请求成功还是失败，它都会等待所有请求结束。

用户可以根据results中的PException是否设置来判断请求成功还是失败，并可以选择只使用成功的结果。
```java
/**
* Batch get values of different keys.
* Will wait for all requests done even if some error occurs.
* @param tableName table name
* @param keys hashKey and sortKey pair list.
* @param results output results; should be created by caller; after call done, the size of results will
*                be same with keys; the results[i] is a Pair:
*                - if Pair.left != null : means query keys[i] failed, Pair.left is the exception.
*                - if Pair.left == null : means query keys[i] succeed, Pair.right is the result value.
* @return succeed count.
* @throws PException
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public int batchGet2(String tableName, List<Pair<byte[], byte[]>> keys, List<Pair<PException, byte[]>> results) throws PException;
```
注：
 * 参数：
   * 传入参数：TableName、Keys。
   * 传出参数：Results。该变量需由调用者创建；Results[i]中存放Keys[i]对应的结果；如果Results[i].left不为null（PException已设置），表示对Keys[i]的请求失败。
 * 返回值：请求成功的个数。
 * 异常：如果出现异常，譬如参数错误、表名不存在等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果。

### multiGet
读同一HashKey下的多行数据。
```java
/**
 * Get multiple value under the same hash key.
 * @param tableName table name
 * @param hashKey used to decide which partition to put this k-v,
 *                should not be null or empty.
 * @param sortKeys all the k-v under hashKey will be sorted by sortKey,
 *                if null or empty, means fetch all sortKeys under the hashKey.
 * @param maxFetchCount max count of k-v pairs to be fetched.
 *                      max_fetch_count <= 0 means no limit. default value is 100.
 * @param maxFetchSize max size of k-v pairs to be fetched.
 *                     max_fetch_size <= 0 means no limit. default value is 1000000.
 * @param values output values; if sortKey is not found, then it will not appear in values.
 *               the returned sortKey is just the same one in incoming sortKeys.
 * @return true if all data is fetched; false if only partial data is fetched.
 * @throws PException
 */
public boolean multiGet(String tableName, byte[] hashKey, List<byte[]> sortKeys, int maxFetchCount, int maxFetchSize, List<Pair<byte[], byte[]>> values) throws PException;
public boolean multiGet(String tableName, byte[] hashKey, List<byte[]> sortKeys, List<Pair<byte[], byte[]>> values) throws PException;
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定maxFetchCount和maxFetchSize。
 * 参数：
   * 传入参数：需传入TableName、HashKey、SortKeys；选择性传入maxFetchCount、maxFetchSize。
   * 传出参数：数据通过values传出，values由用户在调用前new出来。
   * SortKeys如果非空，则只读取指定的数据；SortKeys如果为空，则表示读取该HashKey下的所有数据。
   * maxFetchCount和maxFetchSize用于限制读取的数据量，maxFetchCount表示最多读取的数据条数，maxFetchSize表示最多读取的数据字节数，两者任一达到限制就停止读取。
 * 返回值：如果用户指定了maxFetchCount或者maxFetchSize，单次查询可能只获取到部分结果。如果所有满足条件的数据都已经获取到，则返回true；否则返回false。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

multiGet还有另外一个版本的接口，可以支持SortKey的**范围查询**和**条件过滤**，只读取满足特定条件的数据。并且从1.8.0开始在MultiGetOptions中增加了reverse参数，支持**逆向扫描**数据。
```java
public enum FilterType {
    FT_NO_FILTER(0),
    FT_MATCH_ANYWHERE(1), // match filter string at any position
    FT_MATCH_PREFIX(2),   // match filter string at prefix
    FT_MATCH_POSTFIX(3);  // match filter string at postfix
}
 
public class MultiGetOptions {
    public boolean startInclusive = true; // if the startSortKey is included
    public boolean stopInclusive = false; // if the stopSortKey is included
    public FilterType sortKeyFilterType = FilterType.FT_NO_FILTER; // filter type for sort key
    public byte[] sortKeyFilterPattern = null; // filter pattern for sort key
    public boolean noValue = false; // only fetch hash_key and sort_key, but not fetch value
    public boolean reverse = false; // if search in reverse direction
}
 
/**
* Get multiple key-values under the same hashKey with sortKey range limited.
* @param tableName table name
* @param hashKey used to decide which partition the key may exist
*                should not be null or empty.
* @param startSortKey the start sort key.
*                     null means "".
* @param stopSortKey the stop sort key.
*                    null or "" means fetch to the last sort key.
* @param options multi-get options.
* @param maxFetchCount max count of kv pairs to be fetched
*                      maxFetchCount <= 0 means no limit. default value is 100
* @param maxFetchSize max size of kv pairs to be fetched.
*                     maxFetchSize <= 0 means no limit. default value is 1000000.
* @param values output values; if sortKey is not found, then it will not appear in values.
*               the returned sortKey is just the same one in incoming sortKeys.
* @return true if all data is fetched; false if only partial data is fetched.
* @throws PException
*/
public boolean multiGet(String tableName, byte[] hashKey,
                    byte[] startSortKey, byte[] stopSortKey, MultiGetOptions options,
                    int maxFetchCount, int maxFetchSize,
                    List<Pair<byte[], byte[]>> values) throws PException;
public boolean multiGet(String tableName, byte[] hashKey,
                    byte[] startSortKey, byte[] stopSortKey, MultiGetOptions options,
                    List<Pair<byte[], byte[]>> values) throws PException;
```
注：
  * 提供了两个版本的接口，其中第一个接口可以指定maxFetchCount和maxFetchSize。
  * 参数：
    * 传入参数：需传入TableName、HashKey、StartSortKey、StopSortKey、MultiGetOptions；选择性传入maxFetchCount、maxFetchSize。
    * 传出参数：数据通过values传出，values由用户在调用前new出来。
    * StopSortKeys如果为空，不论stopInclusive为何值，都会读到该HashKey的SortKey结束。
    * maxFetchCount和maxFetchSize用于限制读取的数据量，maxFetchCount表示最多读取的数据条数，maxFetchSize表示最多读取的数据字节数，两者任一达到限制就停止读取。需要注意的是，PegasusServer从1.12.3开始限制一次性读取的数据（包括过期和条件过滤的数据）为3000条，该接口读取的有效数据可能会小于期望的数值
    * MultiGetOptions说明：
      * startInclusive：是否包含StartSortKey，默认为true。
      * stopInclusive：是否包含StopSortKey，默认为false。
      * sortKeyFilterType：SortKey的过滤类型，包括无过滤、任意位置匹配、前缀匹配和后缀匹配，默认无过滤。
      * sortKeyFilterPattern：SortKey的过滤模式串，空串相当于无过滤。
      * noValue：只返回HashKey和SortKey，不返回Value数据，默认为false。
      * reverse：是否逆向扫描数据库，从后往前查找数据。但是查找得到的结果在list中还是按照SortKey从小到大顺序存放。从Pegasus Server 1.8.0时开始支持。
    * 返回值：如果读取了所有满足条件的数据，返回true；如果只读取了部分满足条件的数据，返回false。
    * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。
    * 示例：获取某个HashKey下的所有数据（注意如果数据条数太多容易超时）
      * multiGet(hashKey, null, null, new MultiGetOptions(), -1, -1, values);

### batchMultiGet
对multiGet函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。如果抛出了异常，则values中的结果是未定义的。
```java
/**
* Batch get multiple values under the same hash key.
* Will terminate immediately if any error occurs.
* @param tableName table name
* @param keys List{hashKey,List{sortKey}}; if List{sortKey} is null or empty, means fetch all
*             sortKeys under the hashKey.
* @param values output values; should be created by caller; if succeed, the size of values will
*               be same with keys; the data for keys[i] is stored in values[i].
* @throws PException throws exception if any error occurs.
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public void batchMultiGet(String tableName, List<Pair<byte[], List<byte[]>>> keys, List<HashKeyData> values) throws PException;
```
注：
 * 参数：
   * 传入参数：TableName、Keys。Keys是一个Pair列表，Pair的左值是hashKey，右值是sortKey列表；如果Pair的右值为null或者空列表，则获取该hashKey下的所有数据。
   * 传出参数：Values。该List需由调用者创建；如果读取成功，Values[i]中存放Keys[i]对应的结果。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，只要任意一个失败都会抛出异常。

### batchMultiGet2
对multiGet函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchMultiGet不同的是，无论请求成功还是失败，它都会等待所有请求结束。

用户可以根据results中的PException是否设置来判断请求成功还是失败，并可以选择只使用成功的结果。
```java
/**
* Batch get multiple values under the same hash key.
* Will wait for all requests done even if some error occurs.
* @param tableName table name
* @param keys List{hashKey,List{sortKey}}; if List{sortKey} is null or empty, means fetch all
*             sortKeys under the hashKey.
* @param results output results; should be created by caller; after call done, the size of results will
*                be same with keys; the results[i] is a Pair:
*                - if Pair.left != null : means query keys[i] failed, Pair.left is the exception.
*                - if Pair.left == null : means query keys[i] succeed, Pair.right is the result value.
* @return succeed count.
* @throws PException
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public int batchMultiGet2(String tableName, List<Pair<byte[], List<byte[]>>> keys, List<Pair<PException, HashKeyData>> results) throws PException;
```
注：
 * 参数：
   * 传入参数：TableName、Keys。Keys是一个Pair列表，Pair的左值是hashKey，右值是sortKey列表；如果Pair的右值为null或者空列表，则获取该hashKey下的所有数据。
   * 传出参数：Results。该变量需由调用者创建；Results[i]中存放Keys[i]对应的结果；如果Results[i].left不为null（PException已设置），表示对Keys[i]的请求失败。
 * 返回值：请求成功的个数。
 * 异常：如果出现异常，譬如参数错误、表名不存在等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果。

### set
写单行数据。
```java
/**
 * Set value.
 * @param tableName TableHandler name
 * @param hashKey used to decide which partition to put this k-v,
 *                if null or length == 0, means hash key is "".
 * @param sortKey all the k-v under hashKey will be sorted by sortKey,
 *                if null or length == 0, means sort key is "".
 * @param value should not be null
 * @param ttl_seconds time to live in seconds,
 *                    0 means no ttl. default value is 0.
 * @throws PException
 */
public void set(String tableName, byte[] hashKey, byte[] sortKey, byte[] value, int ttl_seconds) throws PException;
public void set(String tableName, byte[] hashKey, byte[] sortKey, byte[] value) throws PException;
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定TTL时间。
 * 参数：需传入TableName、HashKey、SortKey、value；选择性传入TTL，TTL必须>=0, 当<0时会抛出PException异常。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误、TTL<0等，会抛出 PException。

### batchSet
写一批数据，对set函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。
```java
/**
 * Batch set lots of values.
 * @param tableName TableHandler name
 * @param items list of items.
 * @throws PException throws exception if any error occurs.
 *
 * Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
 */
public void batchSet(String tableName, List<SetItem> items) throws PException;
```
注：
 * 参数：需传入TableName、Items。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，只要任意一个失败都会抛出异常。

### batchSet2
对set函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchSet不同的是，无论请求成功还是失败，它都会等待所有请求结束。

用户可以根据results中的PException是否设置来判断请求成功还是失败，并可以选择只使用成功的结果。
```java
/**
* Batch set lots of values.
* Will wait for all requests done even if some error occurs.
* @param tableName table name
* @param items list of items.
* @param results output results; should be created by caller; after call done, the size of results will
*                be same with items; the results[i] is a PException:
*                - if results[i] != null : means set items[i] failed, results[i] is the exception.
*                - if results[i] == null : means set items[i] succeed.
* @return succeed count.
* @throws PException
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public int batchSet2(String tableName, List<SetItem> items, List<PException> results) throws PException;
```
注：
 * 参数：
   * 传入参数：TableName、Items。
   * 传出参数：Results。该变量需由调用者创建；Results[i]中存放Items[i]对应的结果；如果Results[i]不为null（PException已设置），表示对Items[i]的请求失败。
 * 返回值：请求成功的个数。
 * 异常：如果出现异常，譬如参数错误、表名不存在等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果。

### multiSet
写同一HashKey下的多行数据。
```java
/**
 * Set multiple value under the same hash key.
 * @param tableName table name
 * @param hashKey used to decide which partition to put this k-v,
 *                should not be null or empty.
 * @param values all <sortkey,value> pairs to be set,
 *               should not be null or empty.
 * @param ttl_seconds time to live in seconds,
 *                    0 means no ttl. default value is 0.
 * @throws PException
 */
public void multiSet(String tableName, byte[] hashKey, List<Pair<byte[], byte[]>> values, int ttl_seconds) throws PException;
public void multiSet(String tableName, byte[] hashKey, List<Pair<byte[], byte[]>> values) throws PException;
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定TTL时间。
 * 参数：需传入TableName、HashKey、Values；选择性传入TTL，TTL必须>=0, 当<0时会抛出PException异常。
   * Values是Pair列表，Pair的第一个元素是SortKey，第二个元素为value。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误、TTL<0等，会抛出 PException。

### batchMultiSet
对multiSet函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。
```java
/**
* Batch set multiple value under the same hash key.
* Will terminate immediately if any error occurs.
* @param tableName TableHandler name
* @param items list of items.
* @param ttl_seconds time to live in seconds,
*                    0 means no ttl. default value is 0.
* @throws PException throws exception if any error occurs.
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public void batchMultiSet(String tableName, List<HashKeyData> items, int ttl_seconds) throws PException;
public void batchMultiSet(String tableName, List<HashKeyData> items) throws PException;
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定TTL时间。
 * 参数：需传入TableName、Items；选择性传入TTL，TTL必须>=0, 当<0时会抛出PException异常。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误、TTL<0等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，只要任意一个失败都会抛出异常。

### batchMultiSet2
对multiSet函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchMultiSet不同的是，无论请求成功还是失败，它都会等待所有请求结束。
```java
/**
* Batch set multiple value under the same hash key.
* Will wait for all requests done even if some error occurs.
* @param tableName table name
* @param items list of items.
* @param ttl_seconds time to live in seconds,
*                    0 means no ttl. default value is 0.
* @param results output results; should be created by caller; after call done, the size of results will
*                be same with items; the results[i] is a PException:
*                - if results[i] != null : means set items[i] failed, results[i] is the exception.
*                - if results[i] == null : means set items[i] succeed.
* @return succeed count.
* @throws PException
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public int batchMultiSet2(String tableName, List<HashKeyData> items, int ttl_seconds, List<PException> results) throws PException;
public int batchMultiSet2(String tableName, List<HashKeyData> items, List<PException> results) throws PException;
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定TTL时间。
 * 参数：
   * 传入参数：TableName、Items；选择性传入TTL，TTL必须>=0, 当<0时会抛出PException异常。
   * 传出参数：Results。该变量需由调用者创建；Results[i]中存放Items[i]对应的结果；如果Results[i]不为null（PException已设置），表示对Items[i]的请求失败。
 * 返回值：请求成功的个数。
 * 异常：如果出现异常，譬如参数错误、表名不存在、TTL<0等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果。

### del
删单行数据。
```java
/**
 * Delete value.
 * @param tableName TableHandler name
 * @param hashKey used to decide which partition to put this k-v,
 *                if null or length == 0, means hash key is "".
 * @param sortKey all the k-v under hashKey will be sorted by sortKey,
 *                if null or length == 0, means sort key is "".
 * @throws PException
 */
public void del(String tableName, byte[] hashKey, byte[] sortKey) throws PException;
```
注：
 * 参数：需传入TableName、HashKey、SortKey。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

### batchDel
删除一批数据，对del函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。
```java
/**
* Batch delete values of different keys.
* Will terminate immediately if any error occurs.
* @param tableName table name
* @param keys hashKey and sortKey pair list.
* @throws PException throws exception if any error occurs.
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public void batchDel(String tableName, List<Pair<byte[], byte[]>> keys) throws PException;
```
注：
 * 参数：需传入TableName、Keys。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，只要任意一个失败都会抛出异常。

### batchDel2
对del函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchDel不同的是，无论请求成功还是失败，它都会等待所有请求结束。

用户可以根据results中的PException是否设置来判断请求成功还是失败，并可以选择只使用成功的结果。
```java
/**
* Batch delete values of different keys.
* Will wait for all requests done even if some error occurs.
* @param tableName table name
* @param keys hashKey and sortKey pair list.
* @param results output results; should be created by caller; after call done, the size of results will
*                be same with keys; the results[i] is a PException:
*                - if results[i] != null : means del keys[i] failed, results[i] is the exception.
*                - if results[i] == null : means del keys[i] succeed.
* @return succeed count.
* @throws PException
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public int batchDel2(String tableName, List<Pair<byte[], byte[]>> keys, List<PException> results) throws PException;
```
注：
 * 参数：
   * 传入参数：TableName、Keys。
   * 传出参数：Results。该变量需由调用者创建；Results[i]中存放Keys[i]对应的结果；如果Results[i]不为null（PException已设置），表示对Keys[i]的请求失败。
 * 返回值：请求成功的个数。
 * 异常：如果出现异常，譬如参数错误、表名不存在等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果。

### multiDel
删同一HashKey下的多行数据。
```java
/**
 * Delete specified sort keys under the same hash key.
 * @param tableName table name
 * @param hashKey used to decide which partition to put this k-v,
 *                should not be null or empty.
 * @param sortKeys specify sort keys to be deleted.
 *                 should not be empty.
 * @throws PException
 */
public void multiDel(String tableName, byte[] hashKey, List<byte[]> sortKeys) throws PException;
```
注：
 * 参数：需传入TableName、HashKey、SortKeys。
   * SortKeys不允许为空，如果不知道该HashKey下面有哪些SortKey，可以通过下面的multiGetSortKeys方法获取。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

### batchMultiDel
对multiDel函数的批量封装。该函数并发地向server发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。
```java
/**
* Batch delete specified sort keys under the same hash key.
* Will terminate immediately if any error occurs.
* @param tableName table name
* @param keys List{hashKey,List{sortKey}}
* @throws PException throws exception if any error occurs.
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public void batchMultiDel(String tableName, List<Pair<byte[], List<byte[]>>> keys) throws PException;
```
注：
 * 参数：需传入TableName、Keys。Keys是一个Pair列表，Pair的左值是hashKey，右值是非空的sortKey列表。
 * 返回值：无。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，只要任意一个失败都会抛出异常。

### batchMultiDel2
对del函数的批量封装。该函数并发地向server发送异步请求，并等待结果。但与上面batchMultiDel不同的是，无论请求成功还是失败，它都会等待所有请求结束。

用户可以根据results中的PException是否设置来判断请求成功还是失败，并可以选择只使用成功的结果。
```java
/**
* Batch delete specified sort keys under the same hash key.
* Will wait for all requests done even if some error occurs.
* @param tableName table name
* @param keys List{hashKey,List{sortKey}}
* @param results output results; should be created by caller; after call done, the size of results will
*                be same with keys; the results[i] is a PException:
*                - if results[i] != null : means del keys[i] failed, results[i] is the exception.
*                - if results[i] == null : means del keys[i] succeed.
* @return succeed count.
* @throws PException
*
* Notice: the method is not atomic, that means, maybe some keys succeed but some keys failed.
*/
public int batchMultiDel2(String tableName, List<Pair<byte[], List<byte[]>>> keys, List<PException> results) throws PException;
```
注：
 * 参数：
   * 传入参数：TableName、Keys。Keys是一个Pair列表，Pair的左值是hashKey，右值是非空的sortKey列表。
   * 传出参数：Results。该变量需由调用者创建；Results[i]中存放Keys[i]对应的结果；如果Results[i]不为null（PException已设置），表示对Keys[i]的请求失败。
 * 返回值：请求成功的个数。
 * 异常：如果出现异常，譬如参数错误、表名不存在等，会抛出 PException。
 * 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果。

### delRange
删除同一HashKey下，SortKey值在startSortKey和stopSortKey范围内的数据。删除过程中若发生错误，不影响已经删除的数据，同时会标记该范围内未删除的第一个SortKey。
```java
/**
   * Delete key-values within range of startSortKey and stopSortKey under hashKey. Will terminate
   * immediately if any error occurs.
   *
   * @param tableName table name
   * @param hashKey used to decide which partition the key may exist, should not be null or empty.
   * @param startSortKey the start sort key. null or "" means fetch to the first sort key.
   * @param stopSortKey the stop sort key. null or "" means fetch to the last sort key.
   * @param options del range options.
   * @throws PException throws exception if any error occurs.
   */
  public void delRange(String tableName, byte[] hashKey, byte[] startSortKey, byte[] stopSortKey,DelRangeOptions options) throws PException;


  public class DelRangeOptions {
    public byte[] nextSortKey = null;
    public boolean startInclusive = true; // whether the startSortKey is included
    public boolean stopInclusive = false; // whether the stopSortKey is included
    public FilterType sortKeyFilterType = FilterType.FT_NO_FILTER; // filter type for sort key
    public byte[] sortKeyFilterPattern = null; // filter pattern for sort key
  }
```
注：
* 参数：
  * 传入参数：
    * startSortKey和stopSortKey是sortkey的起止key值。
    * DelRangeOptions：
      * nextSortKey：将要删除的第一个sortKey值，默认为null, 在删除开始后会动态记录下一个要删除的值。特别的，当删除过程中出现错误时，该参数可以记录接下来需要继续删除的sortKey
      * startInclusive：是否包含StartSortKey，默认为true
      * stopInclusive：是否包含StopSortKey，默认为false
      * sortKeyFilterType：SortKey的过滤类型，包括无过滤、任意位置匹配、前缀匹配和后缀匹配，默认无过滤。
      * sortKeyFilterPattern：SortKey的过滤模式串，空串相当于无过滤。
  * 传出参数：无。
* 返回值：无。
* 异常：如果出现异常，譬如参数错误、表名不存在、超时等，会抛出 PException。
* 注意：该方法不是原子的，有可能出现部分成功部分失败的情况。

### incr
单行原子增(减)操作。详细说明参见[单行原子操作](/_docs/zh/api/single-atomic.md#原子增减)。

该操作先将key所指向的value的字节串转换为int64类型（实现上类似于Java的[Long.parseLong()](https://docs.oracle.com/javase/7/docs/api/java/lang/Long.html#parseLong(java.lang.String))函数），然后加上increment，将结果转换为字节串设置为新值。

当参数increment为正数时，即原子加；当参数increment为负数时，即原子减。

```java
/**
 * Atomically increment value.
 *
 * @param tableName the table name.
 * @param hashKey   the hash key to increment.
 * @param sortKey   the sort key to increment.
 * @param increment the increment to be added to the old value.
 * @return the new value.
 * @throws PException throws exception if any error occurs.
 */
public long incr(String tableName, byte[] hashKey, byte[] sortKey, long increment) throws PException;
```
注：
 * 参数：需传入TableName、HashKey、SortKey、Increment。
 * 返回值：操作成功后的新值。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。另外以下情况也会抛出异常：
   * 旧值转换为int64时出错，譬如不是合法的数字或者超出int64范围。
   * 旧值加上increment后的结果超出int64范围。
 * 其他说明：
   * 如果旧值不存在，则把旧值当做0处理，即新值等于increment。
   * TTL语义：如果旧值存在，新值的TTL和旧值保持一致；如果旧值不存在，新值将不设TTL。

从Pegasus Server v1.11.1版本开始支持在incr操作时修改TTL，需使用[Pegasus Java Client 1.11.2-thrift-0.11.0-inlined-release](https://github.com/XiaoMi/pegasus-java-client/releases/tag/1.11.2-thrift-0.11.0-inlined-release)及以上版本来使用这个功能。
```
/**
 * Atomically increment value.
 *
 * @param tableName the table name.
 * @param hashKey   the hash key to increment.
 * @param sortKey   the sort key to increment.
 * @param increment the increment to be added to the old value.
 * @param ttlSeconds time to live in seconds for the new value.
 *                   should be no less than -1. for the second method, the ttlSeconds is 0.
 *                   - if ttlSeconds == 0, the semantic is the same as redis:
 *                     - normally, increment will preserve the original ttl.
 *                     - if old data is expired by ttl, then set initial value to 0 and set no ttl.
 *                   - if ttlSeconds > 0, then update with the new ttl if increment succeed.
 *                   - if ttlSeconds == -1, then update to no ttl if increment succeed.
 * @return the new value.
 * @throws PException throws exception if any error occurs.
 */
public long incr(String tableName, byte[] hashKey, byte[] sortKey, long increment, int ttlSeconds) throws PException;
public long incr(String tableName, byte[] hashKey, byte[] sortKey, long increment) throws PException;
```
注：
 * 除了TTL之外，其他语义都与前面相同。
 * TTL操作说明：
   * 如果参数ttlSeconds == 0，则和redis语义保持一致：如果旧值存在，新值的TTL和旧值保持一致；如果旧值不存在，新值将不设TTL。
   * 如果参数ttlSeconds > 0，则将TTL设置为新值。
   * 如果参数ttlSeconds == -1，则清理掉TTL，即新值不再设置TTL。
   * 如果参数ttlSeconds < -1，则抛出异常。

### checkAndSet
单HashKey数据的原子CAS操作（可以理解为**单行原子操作**）。详细说明参见[单行原子操作](/_docs/zh/api/single-atomic.md#CAS操作)。

该操作先对某个SortKey（称之为CheckSortKey）的value做条件检查：
  * 如果检查的条件满足，则将另一个SortKey（称之为SetSortKey）的value设置为新值。
  * 如果检查的条件不满足，则不执行set操作。

CheckSortKey和SetSortKey可以相同也可以不同。

用户还可以设置`CheckAndSetOptions.returnCheckValue`来获取CheckSortKey对应的value。如果CheckSortKey和SetSortKey相同并且set成功，则获取set之前的旧值。

```java
public enum CheckType {
    CT_NO_CHECK(0),

    // appearance
    CT_VALUE_NOT_EXIST(1),          // value is not exist
    CT_VALUE_NOT_EXIST_OR_EMPTY(2), // value is not exist or value is empty
    CT_VALUE_EXIST(3),              // value is exist
    CT_VALUE_NOT_EMPTY(4),          // value is exist and not empty

    // match
    CT_VALUE_MATCH_ANYWHERE(5), // operand matches anywhere in value
    CT_VALUE_MATCH_PREFIX(6),   // operand matches prefix in value
    CT_VALUE_MATCH_POSTFIX(7),  // operand matches postfix in value

    // bytes compare
    CT_VALUE_BYTES_LESS(8),              // bytes compare: value < operand
    CT_VALUE_BYTES_LESS_OR_EQUAL(9),     // bytes compare: value <= operand
    CT_VALUE_BYTES_EQUAL(10),            // bytes compare: value == operand
    CT_VALUE_BYTES_GREATER_OR_EQUAL(11), // bytes compare: value >= operand
    CT_VALUE_BYTES_GREATER(12),          // bytes compare: value > operand

    // int compare: first transfer bytes to int64; then compare by int value
    CT_VALUE_INT_LESS(13),             // int compare: value < operand
    CT_VALUE_INT_LESS_OR_EQUAL(14),    // int compare: value <= operand
    CT_VALUE_INT_EQUAL(15),            // int compare: value == operand
    CT_VALUE_INT_GREATER_OR_EQUAL(16), // int compare: value >= operand
    CT_VALUE_INT_GREATER(17);          // int compare: value > operand
}

public class CheckAndSetOptions {
    public int setValueTTLSeconds = 0; // time to live in seconds of the set value, 0 means no ttl.
    public boolean returnCheckValue = false; // if return the check value in results.
}

public class CheckAndSetResult {
    /**
     * return value for checkAndSet
     *
     * @param setSucceed true if set value succeed.
     * @param checkValueReturned true if the check value is returned.
     * @param checkValueExist true if the check value is exist; can be used only when checkValueReturned is true.
     * @param checkValue return the check value if exist; can be used only when checkValueExist is true.
     */
    boolean setSucceed;
    boolean checkValueReturned;
    boolean checkValueExist;
    byte[] checkValue;
}

/**
 * Atomically check and set value by key.
 * If the check condition is satisfied, then apply to set value.
 *
 * @param tableName    the table name.
 * @param hashKey      the hash key to check and set.
 * @param checkSortKey the sort key to check.
 * @param checkType    the check type.
 * @param checkOperand the check operand.
 * @param setSortKey   the sort key to set value if check condition is satisfied.
 * @param setValue     the value to set if check condition is satisfied.
 * @param options      the check-and-set options.
 * @return CheckAndSetResult
 * @throws PException throws exception if any error occurs.
 */
public PegasusTableInterface.CheckAndSetResult checkAndSet(String tableName, byte[] hashKey, byte[] checkSortKey,
                                                           CheckType checkType, byte[] checkOperand,
                                                           byte[] setSortKey, byte[] setValue,
                                                           CheckAndSetOptions options) throws PException;
```
注：
 * 参数：需传入TableName、HashKey、CheckSortKey、CheckType、CheckOperand、SetSortKey、SetValue、Options。
   * checkSortKey、checkType、checkOperand：用于指定检查的条件。
   * setSortKey、setValue：用于指定条件检查成功后要set的新值。
   * options：其他选项，包括：
     * setValueTTLSeconds：新值的TTL时间；TTL必须>=0，0表示不设置TTL限制，当<0时将抛出PException异常。
     * returnCheckValue：是否需要返回CheckSortKey对应的value。
 * 返回值：CheckAndSetResult，包括：
   * setSucceed：是否set成功。
   * checkValueReturned：是否返回了CheckSortKey对应的value。
   * checkValueExist：CheckSortKey对应的value是否存在；该域只有在`checkValueReturned=true`时有意义。
   * checkValue：CheckSortKey对应的value值；该域只有在`checkValueExist=true`时有意义。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误、TTL<0等，会抛出 PException。另外以下情况也会抛出异常：
   * 如果CheckType为`int compare`类型的操作，且CheckOperand或者CheckValue转换为int64时出错，譬如不是合法的数字或者超出int64范围。

### checkAndMutate
checkAndMutate是[checkAndSet](#checkandset)的扩展版本：checkAndSet只允许set一个值，而checkAndMutate允许在单个原子操作中set或者del多个值。该接口从[Pegasus Java Client 1.11.0-thrift-0.11.0-inlined-release](https://github.com/XiaoMi/pegasus-java-client/releases/tag/1.11.0-thrift-0.11.0-inlined-release)版本开始提供。

为此，我们提供了一个包装类[Mutations](https://github.com/XiaoMi/pegasus-java-client/blob/thrift-0.11.0-inlined/src/main/java/com/xiaomi/infra/pegasus/client/Mutations.java)，用户可以预先设置需要实施的set或者del操作。

```java
class CheckAndMutateResult {
/**
 * return value for checkAndMutate
 *
 * @param mutateSucceed true if mutate succeed.
 * @param checkValueReturned true if the check value is returned.
 * @param checkValueExist true if the check value is exist; can be used only when
 *     checkValueReturned is true.
 * @param checkValue return the check value if exist; can be used only when checkValueExist is
 *     true.
 */
public boolean mutateSucceed;

public boolean checkValueReturned;
public boolean checkValueExist;
public byte[] checkValue;
}

/**
* atomically check and mutate by key, async version. if the check condition is satisfied, then
* apply to mutate.
*
* @param hashKey the hash key to check and mutate.
* @param checkSortKey the sort key to check.
* @param checkType the check type.
* @param checkOperand the check operand.
* @param mutations the list of mutations to perform if check condition is satisfied.
* @param options the check-and-mutate options.
* @param timeout how long will the operation timeout in milliseconds. if timeout > 0, it is a
*     timeout value for current op, else the timeout value in the configuration file will be
*     used.
* @return the future for current op
*     <p>Future return: On success: return CheckAndMutateResult. On failure: a throwable, which
*     is an instance of PException
*     <p>Thread safety: All the listeners for the same table are guaranteed to be dispatched in
*     the same thread, so all the listeners for the same future are guaranteed to be executed as
*     the same order as the listeners added. But listeners for different tables are not
*     guaranteed to be dispatched in the same thread.
*/
Future<CheckAndMutateResult> asyncCheckAndMutate(
  byte[] hashKey,
  byte[] checkSortKey,
  CheckType checkType,
  byte[] checkOperand,
  Mutations mutations,
  CheckAndMutateOptions options,
  int timeout /*ms*/);
```
注：
 * 参数：需传入TableName、HashKey、CheckSortKey、CheckType、CheckOperand、Mutations、Options。
   * checkSortKey、checkType、checkOperand：用于指定检查的条件。
   * mutations：用于指定条件检查成功后要实施的set或者del操作。
   * options：其他选项，包括：
     * returnCheckValue：是否需要返回CheckSortKey对应的value。
 * 返回值：CheckAndMutateResult，包括：
   * mutateSucceed：是否实施成功。
   * checkValueReturned：是否返回了CheckSortKey对应的value。
   * checkValueExist：CheckSortKey对应的value是否存在；该域只有在`checkValueReturned=true`时有意义。
   * checkValue：CheckSortKey对应的value值；该域只有在`checkValueExist=true`时有意义。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。另外以下情况也会抛出异常：
   * 如果CheckType为`int compare`类型的操作，且CheckOperand或者CheckValue转换为int64时出错，譬如不是合法的数字或者超出int64范围。

### compareExchange
compareExchange是[checkAndSet](#checkandset)的特化版本：
  * CheckSortKey和SetSortKey相同。
  * CheckType为CT_VALUE_BYTES_EQUAL。

该方法语义就是：如果SortKey对应的value存在且等于期望的值，则将其设置为新值。详细说明参见[单行原子操作](/_docs/zh/api/single-atomic.md#CAS操作) 。

该方法与C++库中常见的[atomic_compare_exchange](https://en.cppreference.com/w/cpp/atomic/atomic_compare_exchange)语义基本保持一致。

```java
public static class CompareExchangeResult {
    /**
     * return value for CompareExchange
     *
     * @param setSucceed true if set value succeed.
     * @param actualValue return the actual value if set value failed; null means the actual value is not exist.
     */
    boolean setSucceed;
    byte[] actualValue;
}

/**
 * Atomically compare and exchange value by key.
 * <p>
 * - if the original value for the key is equal to the expected value, then update it with the desired value,
 *   set CompareExchangeResult.setSucceed to true, and set CompareExchangeResult.actualValue to null because
 *   the actual value must be equal to the desired value.
 * - if the original value for the key is not exist or not equal to the expected value, then set
 *   CompareExchangeResult.setSucceed to false, and set the actual value in CompareExchangeResult.actualValue.
 * <p>
 * This method is very like the C++ function in {https://en.cppreference.com/w/cpp/atomic/atomic_compare_exchange}.
 *
 * @param tableName     the table name.
 * @param hashKey       the hash key to compare and exchange.
 * @param sortKey       the sort key to compare and exchange.
 * @param expectedValue the value expected to be found for the key.
 * @param desiredValue  the desired value to set if the original value for the key is equal to the expected value.
 * @param ttlSeconds    time to live in seconds of the desired value, 0 means no ttl.
 * @return CompareExchangeResult
 * @throws PException throws exception if any error occurs.
 */
public PegasusTableInterface.CompareExchangeResult compareExchange(String tableName, byte[] hashKey, byte[] sortKey,
                                                                   byte[] expectedValue, byte[] desiredValue,
                                                                   int ttlSeconds) throws PException;
```
注：
 * 参数：需传入TableName、HashKey、SortKey、ExpectedValue、DesiredValue、ttlSeconds。
   * hashKey、sortKey：用于指定数据的key。
   * expectedValue：期望的旧值。
   * desiredValue：如果旧值等于expectedValue，需要设置的新值。
   * ttlSeconds：新值的TTL时间；TTL必须>=0，0表示不设置TTL限制，当TTL<0时将抛出PException异常。
 * 返回值：CompareExchangeResult，包括：
   * setSucceed：是否set成功，如果旧数据不存在，则set失败。
   * actualValue：如果set失败，返回该value的实际值；null表示不存在。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误、TTL<0等，会抛出 PException。

### ttl
获取单行数据的TTL时间。TTL表示Time To Live，表示该数据还能存活多久。如果超过存活时间，数据就读不到了。
```java
/**
 * Get ttl time.
 * @param tableName TableHandler name
 * @param hashKey used to decide which partition to put this k-v,
 *                if null or length == 0, means hash key is "".
 * @param sortKey all the k-v under hashKey will be sorted by sortKey,
 *                if null or length == 0, means sort key is "".
 * @return ttl time in seconds; -1 if no ttl set; -2 if not exist.
 * @throws PException
 */
public int ttl(String tableName, byte[] hashKey, byte[] sortKey) throws PException;
```
注：
 * 参数：需传入TableName、HashKey、SortKey。
 * 返回值：TTL时间，单位为秒。如果该数据没有设置TTL，返回-1；如果该数据不存在，返回-2。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

### exist
检查数据是否存在。
```java
/**
 * Check value exist by key from the cluster
 * @param tableName TableHandler name
 * @param hashKey used to decide which partition the key may exist.
 * @param sortKey all keys under the same hashKey will be sorted by sortKey
 *
 * @return true if exist, false if not exist
 * @throws PException
 */
public boolean exist(String tableName, byte[] hashKey, byte[] sortKey) throws PException;
```
注：
 * 参数：需传入TableName、HashKey、SortKey。
 * 返回值：如果存在返回true，否则返回false。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

### sortKeyCount
获取某个HashKey下所有SortKey的个数。
```java
/**
 * @param tableName TableHandler name
 * @param hashKey used to decide which partition the key may exist.
 * @return the count result for the hashKey
 * @throws PException
 */
public long sortKeyCount(String tableName, byte[] hashKey) throws PException;
```
注：
 * 参数：需传入TableName、HashKey。
 * 返回值：返回HashKey下所有SortKey的个数。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

### multiGetSortKeys
获取某个HashKey下SortKey列表。
```java
/**
 * Get multiple sort keys under the same hash key.
 * @param tableName table name
 * @param hashKey used to decide which partition to put this k-v,
 *                should not be null or empty.
 * @param maxFetchCount max count of k-v pairs to be fetched.
 *                      max_fetch_count <= 0 means no limit. default value is 100.
 * @param maxFetchSize max size of k-v pairs to be fetched.
 *                     max_fetch_size <= 0 means no limit. default value is 1000000.
 * @param sortKeys output sort keys.
 * @return true if all data is fetched; false if only partial data is fetched.
 * @throws PException
 */
public boolean multiGetSortKeys(String tableName, byte[] hashKey, int maxFetchCount, int maxFetchSize, List<byte[]> sortKeys) throws PException;
public boolean multiGetSortKeys(String tableName, byte[] hashKey, List<byte[]> sortKeys) throws PException;
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定maxFetchCount和maxFetchSize。
 * 参数：
   * 传入参数：需传入TableName、HashKey；选择性传入maxFetchCount、maxFetchSize。
   * 传出参数：数据通过sortKeys传出，sortKeys由用户在调用前new出来。
   * maxFetchCount和maxFetchSize用于限制读取的数据量，maxFetchCount表示最多读取的数据条数，maxFetchSize表示最多读取的数据字节数，两者任一达到限制就停止读取。
 * 返回值：如果用户指定了maxFetchCount或者maxFetchSize，单次查询可能只获取到部分结果。如果所有满足条件的数据都已经获取到，则返回true；否则返回false。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

### getScanner
获取遍历某个HashKey下所有数据的迭代器，用于局部扫描。
```java
public enum FilterType {
    FT_NO_FILTER(0),
    FT_MATCH_ANYWHERE(1), // match filter string at any position
    FT_MATCH_PREFIX(2),   // match filter string at prefix
    FT_MATCH_POSTFIX(3);  // match filter string at postfix
}
 
 
public class ScanOptions {
    public int timeoutMillis = 5000; // operation timeout in milli-seconds.
                                     // if timeoutMillis > 0, it is a timeout value for current op,
                                     // else the timeout value in the configuration file will be used.
    public int batchSize = 1000; // internal buffer batch size
    public boolean startInclusive = true; // if the startSortKey is included
    public boolean stopInclusive = false; // if the stopSortKey is included
    public FilterType hashKeyFilterType = FilterType.FT_NO_FILTER; // filter type for hash key
    public byte[] hashKeyFilterPattern = null; // filter pattern for hash key
    public FilterType sortKeyFilterType = FilterType.FT_NO_FILTER; // filter type for sort key
    public byte[] sortKeyFilterPattern = null; // filter pattern for sort key
    public boolean noValue = false; // only fetch hash_key and sort_key, but not fetch value
}
 
 
/**
 * Get Scanner for {startSortKey, stopSortKey} within hashKey
 * @param tableName TableHandler name
 * @param hashKey used to decide which partition to put this k-v,
 * @param startSortKey start sort key scan from
 *                     if null or length == 0, means start from begin
 * @param stopSortKey stop sort key scan to
 *                    if null or length == 0, means stop to end
 * @param options scan options like endpoint inclusive/exclusive
 * @return scanner              
 * @throws PException
 */
public PegasusScannerInterface getScanner(String tableName, byte[] hashKey, byte[] startSortKey, byte[] stopSortKey, ScanOptions options) throws PException;
```
注：
 * 参数：需传入TableName、HashKey、StartSortKey、StopSortKey、ScanOptions。
   * StartSortKey和StopSortKey用于指定scan的返回，并通过ScanOptions指定区间的开闭。
   * 如果StartSortKey为null，表示从头开始；如果StopSortKey为null，表示一直读到尾。
   * ScanOptions说明：
     * timeoutMillis：从server端读取数据的超时时间，单位毫秒，默认值为5000。
     * batchSize：从server端读取数据时每批数据的个数，默认值为1000。
     * startInclusive：是否包含StartSortKey，默认为true。
     * stopInclusive：是否包含StopSortKey，默认为false。
     * hashKeyFilterType：HashKey的过滤类型，包括无过滤、任意位置匹配、前缀匹配和后缀匹配，默认无过滤。
     * hashKeyFilterPattern：HashKey的过滤模式串，空串相当于无过滤。
     * sortKeyFilterType：SortKey的过滤类型，包括无过滤、任意位置匹配、前缀匹配和后缀匹配，默认无过滤。
     * sortKeyFilterPattern：SortKey的过滤模式串，空串相当于无过滤。
     * noValue：只返回HashKey和SortKey，不返回Value数据，默认为false。
 * 返回值：返回迭代器PegasusScannerInterface。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

### getUnorderedScanner
获取遍历整个表的所有数据的迭代器，用于全局扫描。
```
/**
 * Get Scanners for all data in database
 * @param tableName TableHandler name
 * @param maxSplitCount how many scanner expected
 * @param options scan options like batchSize
 * @return scanners, count of which would be no more than maxSplitCount
 * @throws PException
 */
public List<PegasusScannerInterface> getUnorderedScanners(String tableName, int maxSplitCount, ScanOptions options) throws PException;
```
注：
 * 参数：需传入TableName、maxSplitCount、ScanOptions。
   * maxSplitCount：用于决定返回的迭代器的个数。当返回多个迭代器时，每个迭代器可以访问表中的部分数据。通过返回迭代器列表，用户可以进行并发scan或者在MapReduce中使用。如果不需要多个迭代器，可以将其设置为1。
   * ScanOptions同上。
 * 返回值：返回迭代器PegasusScannerInterface列表。
 * 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，会抛出 PException。

## 创建Table实例
通过```PegasusClientInterface::openTable()```方法获取PegasusTableInterface的对象实例：
```java
/**
* Open a table. Please notice that pegasus support two kinds of API:
*     1. the client-interface way, which is provided in this class.
*     2. the table-interface way, which is provided by {@link PegasusTableInterface}.
* With the client-interface, you don't need to create PegasusTableInterface by openTable, so
* you can access the pegasus cluster conveniently. However, the client-interface's api also has
* some restrictions:
*     1. we don't provide async methods in client-interface.
*     2. the timeout in client-interface isn't as accurate as the table-interface.
*     3. the client-interface may throw an exception when open table fails. It means that
*        you may need to handle this exception in every data access operation, which is annoying.
*     4. You can't specify a per-operation timeout.
* So we recommend you to use the table-interface.
* 
* @param tableName the table should be exist on the server, which is created before by
*                  the system administrator
* @return the table handler
* @throws PException
*/
public PegasusTableInterface openTable(String tableName) throws PException;
```
注：
  * 如果网络超时或者表不存在，都会抛出异常。

使用示例：
```java
  PegasusTableInterface table = client.openTable(tableName);
```

PegasusTableInterface中同时提供了同步和异步的API。

同步API与PegasusClientInterface基本一致，区别在于：不用指定tableName参数；可以单独指定超时时间。

同时，openTable提供了warmup功能，用于解决表的第一次rpc调用过慢的问题，具体可参考最佳实践一节。

### 基于Future的异步API
异步API使用Future模式，具体来说是使用的 io.netty.util.concurrent.Future (参见 https://netty.io/4.1/api/index.html )。每个异步接口的返回值都是一个Future\<T\>，其中T是该操作返回结果的类型。Future具有如下特性：
 * 可以通过 addListener() 方法设置一个或者多个Listener，即异步回调函数。回调函数会在操作完成时被调用；如果在add时操作已经完成，回调函数就会被立即调用；回调函数被调用的顺序与添加的顺序一致。
 * 可以通过 await() 方法等待操作完成。但是注意的是await()方法只能保证操作完成以及下面的三个方法可用，并不能保证回调函数已经被执行。
 * 在操作完成后，可以通过 isSuccess() 方法判断操作是否成功；如果成功，可以通过 getNow() 方法获取结果；如果失败，可以通过 cause() 方法获取异常。

**注意**：第一次调用一个表的异步API的时候，函数返回之前可能会有一些额外延迟（典型地10ms左右），这是因为第一次调用时需要从meta-server获取表的信息和路由信息。

一个典型的异步使用样例：
```java
// 获取Table实例
PegasusTableInterface table = client.openTable(tableName);
  
// 发起异步调用
Future<Boolean> future = table.asyncExist(hashKey, sortKey, 0);
  
// 设置回调函数
future.addListener(
        new ExistListener() {
            public void operationComplete(Future<Boolean> future) throws Exception {
                if (future.isSuccess()) {
                    Boolean result = future.getNow();
                }
                else {
                    future.cause().printStackTrace();
                }
            }
        }
);
  
// 等待操作完成
future.await();
```

## PegasusTableInterface接口

### asyncGet
异步读单行数据。
```java
public static interface GetListener extends GenericFutureListener<Future<byte[]>> {
    /**
     * This function will be called when listened asyncGet future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<byte[]> future) throws Exception;
}
 
/**
 * Get value for a specific (hashKey, sortKey) pair, async version
 * @param hashKey used to decide which partition the key may exist
 *                if null or empty, means hash key is "".
 * @param sortKey all keys under the same hashKey will be sorted by sortKey
 *                if null or empty, means sort key is "".
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return the future for current op
 *
 * Future return:
 *      On success: the got value
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      The api is thread safe.
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<byte[]> asyncGet(byte[] hashKey, byte[] sortKey, int timeout/*ms*/);
```
注：
 * 参数：需传入HashKey、SortKey、timeout。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
 * 返回值：Future\<byte[]\>。

### asyncMultiGet
异步读同一HashKey下的多行数据。
```java
public static class MultiGetResult {
    /**
     * return value for multiGet
     * @param allFetched true if all data on the server are fetched; false if only partial data are fetched.
     * @param values the got values. If sortKey in the input sortKeys is not found, it won't be in values.
     *               The output values are ordered by the sortKey.
     */
    public boolean allFetched;
    public List<Pair<byte[], byte[]>> values;
}
 
public static interface MultiGetListener extends GenericFutureListener<Future<MultiGetResult>> {
    /**
     * This function will be called when listened asyncMultiGet future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<MultiGetResult> future) throws Exception;
}
 
/**
 * get multiple key-values under the same hashKey, async version
 * @param hashKey used to decide which partition the key may exist
 *                should not be null or empty.
 * @param sortKeys try to get values of sortKeys under the hashKey
 *                 if null or empty, try to get all (sortKey,value) pairs under hashKey
 * @param maxFetchCount max count of kv pairs to be fetched
 *                      maxFetchCount <= 0 means no limit. default value is 100
 * @param maxFetchSize max size of kv pairs to be fetched.
 *                     maxFetchSize <= 0 means no limit. default value is 1000000.
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return the future for current op
 *
 * Future return:
 *      On success: An object of type MultiGetResult
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<MultiGetResult> asyncMultiGet(byte[] hashKey, List<byte[]> sortKeys, int maxFetchCount, int maxFetchSize, int timeout/*ms*/);
public Future<MultiGetResult> asyncMultiGet(byte[] hashKey, List<byte[]> sortKeys, int timeout/*ms*/);
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定maxFetchCount和maxFetchSize。
 * 参数：需传入HashKey、SortKeys、timeout；选择性传入maxFetchCount、maxFetchSize。
   * SortKeys如果非空，则只读取指定的数据；SortKeys如果为空，则表示读取该HashKey下的所有数据。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
   * maxFetchCount和maxFetchSize用于限制读取的数据量，maxFetchCount表示最多读取的数据条数，maxFetchSize表示最多读取的数据字节数，两者任一达到限制就停止读取。
 * 返回值：Future\<MultiGetResult\>。
   * allFetched：如果用户指定了maxFetchCount或者maxFetchSize，单次查询可能只获取到部分结果。如果所有满足条件的数据都已经获取到，则设置为true；否则设置为false。

asyncMultiGet还有另外一个版本的接口，可以支持SortKey的**范围查询**和**条件过滤**，只读取满足特定条件的数据。并且从1.8.0开始在MultiGetOptions中增加了reverse参数，支持**逆向扫描**数据。
```java
    /**
     * get multiple key-values under the same hashKey with sortKey range limited, async version
     * @param hashKey used to decide which partition the key may exist
     *                should not be null or empty.
     * @param startSortKey the start sort key.
     *                     null means "".
     * @param stopSortKey the stop sort key.
     *                    null or "" means fetch to the last sort key.
     * @param options multi-get options.
     * @param maxFetchCount max count of kv pairs to be fetched
     *                      maxFetchCount <= 0 means no limit. default value is 100
     * @param maxFetchSize max size of kv pairs to be fetched.
     *                     maxFetchSize <= 0 means no limit. default value is 1000000.
     * @param timeout how long will the operation timeout in milliseconds.
     *                if timeout > 0, it is a timeout value for current op,
     *                else the timeout value in the configuration file will be used.
     *
     * @return the future for current op
     *
     * Future return:
     *      On success: An object of type MultiGetResult
     *      On failure: a throwable, which is an instance of PException
     *
     * Thread safety:
     *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
     *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
     *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
     */
    public Future<MultiGetResult> asyncMultiGet(byte[] hashKey, byte[] startSortKey, byte[] stopSortKey,
                                                MultiGetOptions options, int maxFetchCount, int maxFetchSize,
                                                int timeout/*ms*/);
    public Future<MultiGetResult> asyncMultiGet(byte[] hashKey, byte[] startSortKey, byte[] stopSortKey,
                                                MultiGetOptions options, int timeout/*ms*/);
```
注：
  * 参数使用同[multiGet](#multiget)

### asyncSet
异步写单行数据。
```java
public static interface SetListener extends GenericFutureListener<Future<Void>> {
    /**
     * This function will be called when listened asyncSet future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<Void> future) throws Exception;
}
 
/**
 * Set value for a specific (hashKey, sortKey) pair, async version
 * @param hashKey used to decide which partition the key may exist
 *                if null or empty, means hash key is "".
 * @param sortKey all keys under the same hashKey will be sorted by sortKey
 *                if null or empty, means sort key is "".
 * @param value should not be null
 * @param ttlSeconds time to live in seconds
 *                   0 means no ttl, default value is 0
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return the future for current op
 *
 * Future return:
 *      On success: no return
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      The api is thread safe.
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<Void> asyncSet(byte[] hashKey, byte[] sortKey, byte[] value, int ttlSeconds, int timeout/*ms*/);
public Future<Void> asyncSet(byte[] hashKey, byte[] sortKey, byte[] value, int timeout/*ms*/);
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定TTL时间。
 * 参数：需传入HashKey、SortKey、Value、timeout；选择性传入TTL。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
   * ttlSeconds是数据的TTL时间，单位为秒。TTL必须>=0, 0表示不设置TTL时间，当TTL<0时将抛出PException异常。
 * 返回值：Future\<Void\>。

### asyncMultiSet
异步写同一HashKey下的多行数据。
```java
public static interface MultiSetListener extends GenericFutureListener<Future<Void>> {
    /**
     * This function will be called when listened asyncMultiSet future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<Void> future) throws Exception;
}
 
/**
 * Set key-values for a specific hashKey, async version
 * @param hashKey used to decide which partition the key may exist
 *                if null or empty, means hash key is "".
 * @param values all (sortKey, value) pairs
 *               should not be null or empty
 * @param ttlSeconds time to live in seconds
 *                   0 means no ttl, default value is 0
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return the future for current op
 *
 * Future return:
 *      On success: no return
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<Void> asyncMultiSet(byte[] hashKey, List<Pair<byte[], byte[]>> values, int ttlSeconds, int timeout/*ms*/);
public Future<Void> asyncMultiSet(byte[] hashKey, List<Pair<byte[], byte[]>> values, int timeout/*ms*/);
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定TTL时间。
 * 参数：需传入HashKey、Values、timeout；选择性传入ttlSeconds。
   * Values是Pair列表，Pair的第一个元素是SortKey，第二个元素为value。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
   * ttlSeconds是数据的TTL时间，单位为秒。TTL必须>=0, 0表示不设置TTL时间，当TTL<0时将抛出PException异常。
 * 返回值：Future\<Void\>。

### asyncDel
异步删单行数据。
```java
public static interface DelListener extends GenericFutureListener<Future<Void>> {
    /**
     * This function will be called when listened asyncDel future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<Void> future) throws Exception;
}
 
/**
 * delete value for a specific (hashKey, sortKey) pair, async version
 * @param hashKey used to decide which partition the key may exist
 *                if null or empty, means hash key is "".
 * @param sortKey all keys under the same hashKey will be sorted by sortKey
 *                if null or empty, means sort key is "".
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return the future for current op
 *
 * Future return:
 *      On success: no return
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<Void> asyncDel(byte[] hashKey, byte[] sortKey, int timeout/*ms*/);
```
注：
 * 参数：需传入HashKey、SortKey、timeout。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
 * 返回值：Future\<Void\>。

### asyncMultiDel
异步删同一HashKey下的多行数据。
```java
public static interface MultiDelListener extends GenericFutureListener<Future<Void>> {
    /**
     * This function will be called when listened asyncMultiDel future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<Void> future) throws Exception;
}
 
/**
 * delete mutiple values for a specific hashKey, async version
 * @param hashKey used to decide which partition the key may exist
 *                if null or empty, means hash key is "".
 * @param sortKeys all the sortKeys need to be deleted
 *                 should not be null or empty
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return the future for current op
 *
 * Future return:
 *      On success: no return
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<Void> asyncMultiDel(byte[] hashKey, List<byte[]> sortKeys, int timeout/*ms*/);
```
注：
 * 参数：需传入HashKey、SortKeys、timeout。
   * SortKeys不允许为空，如果不知道该HashKey下面有哪些SortKey，可以通过multiGetSortKeys方法获取。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
 * 返回值：Future\<Void\>。

### asyncIncr
原子增（减）操作。[incr](#incr)的异步版本。

```
public static interface IncrListener extends GenericFutureListener<Future<Long>> {
    /**
     * This function will be called when listened asyncIncr future is done.
     *
     * @param future the listened future
     * @throws Exception throw exception if any error occurs.
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<Long> future) throws Exception;
}

/**
 * atomically increment value by key, async version
 *
 * @param hashKey   the hash key to increment.
 * @param sortKey   the sort key to increment.
 * @param increment the increment to be added to the old value.
 * @param timeout   how long will the operation timeout in milliseconds.
 *                  if timeout > 0, it is a timeout value for current op,
 *                  else the timeout value in the configuration file will be used.
 * @return the future for current op
 * <p>
 * Future return:
 * On success: return new value.
 * On failure: a throwable, which is an instance of PException
 * <p>
 * Thread safety:
 * All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 * listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 * But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<Long> asyncIncr(byte[] hashKey, byte[] sortKey, long increment, int timeout/*ms*/);
```
注：
 * 参数和返回值：参见同步接口[incr](#incr)。

### asyncCheckAndSet
单HashKey数据的原子CAS操作。[checkAndSet](#checkandset)的异步版本。

```java
public static class CheckAndSetResult {
    /**
     * return value for checkAndSet
     *
     * @param setSucceed true if set value succeed.
     * @param checkValueReturned true if the check value is returned.
     * @param checkValueExist true if the check value is exist; can be used only when checkValueReturned is true.
     * @param checkValue return the check value if exist; can be used only when checkValueExist is true.
     */
    boolean setSucceed;
    boolean checkValueReturned;
    boolean checkValueExist;
    byte[] checkValue;
}

public static interface CheckAndSetListener extends GenericFutureListener<Future<CheckAndSetResult>> {
    /**
     * This function will be called when listened asyncCheckAndSet future is done.
     *
     * @param future the listened future
     * @throws Exception throw exception if any error occurs.
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<CheckAndSetResult> future) throws Exception;
}

/**
 * atomically check and set value by key, async version.
 * if the check condition is satisfied, then apply to set value.
 *
 * @param hashKey      the hash key to check and set.
 * @param checkSortKey the sort key to check.
 * @param checkType    the check type.
 * @param checkOperand the check operand.
 * @param setSortKey   the sort key to set value if check condition is satisfied.
 * @param setValue     the value to set if check condition is satisfied.
 * @param options      the check-and-set options.
 * @param timeout      how long will the operation timeout in milliseconds.
 *                     if timeout > 0, it is a timeout value for current op,
 *                     else the timeout value in the configuration file will be used.
 * @return the future for current op
 * <p>
 * Future return:
 * On success: return CheckAndSetResult.
 * On failure: a throwable, which is an instance of PException
 * <p>
 * Thread safety:
 * All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 * listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 * But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<CheckAndSetResult> asyncCheckAndSet(byte[] hashKey, byte[] checkSortKey, CheckType checkType,
                                                  byte[] checkOperand, byte[] setSortKey, byte[] setValue,
                                                  CheckAndSetOptions options, int timeout/*ms*/);
```
注：
 * 参数和返回值：参见同步接口[checkAndSet](#checkandset)。

### asyncCompareExchange
单HashKey数据的原子CAS操作。[compareExchange](#compareexchange)的异步版本。

```java
public static class CompareExchangeResult {
    /**
     * return value for CompareExchange
     *
     * @param setSucceed true if set value succeed.
     * @param actualValue return the actual value if set value failed; null means the actual value is not exist.
     */
    boolean setSucceed;
    byte[] actualValue;
}

public static interface CompareExchangeListener extends GenericFutureListener<Future<CompareExchangeResult>> {
    /**
     * This function will be called when listened asyncCompareExchange future is done.
     *
     * @param future the listened future
     * @throws Exception throw exception if any error occurs.
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<CompareExchangeResult> future) throws Exception;
}

/**
 * atomically compare and exchange value by key, async version.
 * <p>
 * - if the original value for the key is equal to the expected value, then update it with the desired value,
 *   set CompareExchangeResult.setSucceed to true, and set CompareExchangeResult.actualValue to null because
 *   the actual value must be equal to the desired value.
 * - if the original value for the key is not exist or not equal to the expected value, then set
 *   CompareExchangeResult.setSucceed to false, and set the actual value in CompareExchangeResult.actualValue.
 * <p>
 * this method is very like the C++ function in {https://en.cppreference.com/w/cpp/atomic/atomic_compare_exchange}.
 *
 * @param hashKey       the hash key to compare and exchange.
 * @param sortKey       the sort key to compare and exchange.
 * @param expectedValue the value expected to be found for the key.
 * @param desiredValue  the desired value to set if the original value for the key is equal to the expected value.
 * @param ttlSeconds    time to live in seconds of the desired value, 0 means no ttl.
 * @param timeout       how long will the operation timeout in milliseconds.
 *                      if timeout > 0, it is a timeout value for current op,
 *                      else the timeout value in the configuration file will be used.
 * @return the future for current op
 * <p>
 * Future return:
 * On success: return CompareExchangeResult.
 * On failure: a throwable, which is an instance of PException
 * <p>
 * Thread safety:
 * All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 * listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 * But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<CompareExchangeResult> asyncCompareExchange(byte[] hashKey, byte[] sortKey,
                                                          byte[] expectedValue, byte[] desiredValue,
                                                          int ttlSeconds, int timeout/*ms*/);
```
注：
 * 参数和返回值：参见同步接口[compareExchange](#compareexchange)。

### asyncTTL
异步获取单行数据的TTL时间，即该数据还能存活多久，单位为秒。
```java
public static interface TTLListener extends GenericFutureListener<Future<Integer>> {
    /**
     * This function will be called when listened asyncTTL future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<Integer> future) throws Exception;
}
 
/**
 * get TTL value for a specific (hashKey, sortKey) pair, async version
 * @param hashKey used to decide which partition the key may exist
 *                if null or empty, means hash key is "".
 * @param sortKey all keys under the same hashKey will be sorted by sortKey
 *                if null or empty, means sort key is "".
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return the future for current op
 *
 * Future return:
 *      On success: ttl time in seconds; -1 if no ttl set; -2 if not exist.
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<Integer> asyncTTL(byte[] hashKey, byte[] sortKey, int timeout/*ms*/);
```
注：
 * 参数：需传入HashKey、SortKey、timeout。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
 * 返回值：Future\<Integer\>。
   * 返回结果为TTL时间，单位为秒。如果该数据没有设置TTL，返回-1；如果该数据不存在，返回-2。

### asyncExist
异步检查数据是否存在。
```java
public static interface ExistListener extends GenericFutureListener<Future<Boolean>> {
    /**
     * This function will be called when listened asyncExist future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<Boolean> future) throws Exception;
}
 
/**
 * Check value existence for a specific (hashKey, sortKey) pair of current table, async version
 * @param hashKey used to decide which partition the key may exist
 *                if null or length == 0, means hash key is "".
 * @param sortKey all keys under the same hashKey will be sorted by sortKey
 *                if null or length == 0, means sort key is "".
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return A future for current op.
 *
 * Future return:
 *      On success: true if exist, false if not exist
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      The api is thread safe.
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<Boolean> asyncExist(byte[] hashKey, byte[] sortKey, int timeout/*ms*/);
```
注：
 * 参数：需传入HashKey、SortKey、timeout。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
 * 返回值：Future\<Boolean\>。
   *  返回结果是个布尔值。如果存在返回true，否则返回false。

### asyncSortKeyCount
异步获取某个HashKey下所有SortKey的个数。
```java
public static interface SortKeyCountListener extends GenericFutureListener<Future<Long>> {
    /**
     * This function will be called when listened asyncSortKeyCount future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<Long> future) throws Exception;
}
 
/**
 * Count the sortkeys for a specific hashKey, async version
 * @param hashKey used to decide which partition the key may exist
 *                should not be null or empty
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return the future for current op
 *
 * Future return:
 *      On success: the count result for the hashKey
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      The api is thread safe.
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<Long> asyncSortKeyCount(byte[] hashKey, int timeout/*ms*/);
```
注：
 * 参数：需传入HashKey、timeout。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
 * 返回值：Future\<Long\>。
   * 返回结果为HashKey下所有SortKey的个数。

### asyncMultiGetSortKeys
异步获取某个HashKey下SortKey列表。
```java
public static class MultiGetSortKeysResult {
    /**
     * return value for multiGetSortkeys
     * @param allFetched true if all data on the server are fetched; false if only partial data are fetched.
     * @param keys the got keys.
     *             The output keys are in order.
     */
    public boolean allFetched;
    public List<byte[]> keys;
};
 
public static interface MultiGetSortKeysListener extends GenericFutureListener<Future<MultiGetSortKeysResult>> {
    /**
     * This function will be called when listened asyncMultiGetSortKeys future is done.
     * @param future the listened future
     * @throws Exception
     *
     * Notice: User shouldn't do any operations that may block or time-consuming
     */
    @Override
    public void operationComplete(Future<MultiGetSortKeysResult> future) throws Exception;
}
 
/**
 * get all the sortKeys for the same hashKey
 * @param hashKey used to decide which partition the key may exist
 *                should not be null or empty.
 * @param maxFetchCount max count of kv pairs to be fetched
 *                      maxFetchCount <= 0 means no limit. default value is 100
 * @param maxFetchSize max size of kv pairs to be fetched.
 *                     maxFetchSize <= 0 means no limit. default value is 1000000.
 * @param timeout how long will the operation timeout in milliseconds.
 *                if timeout > 0, it is a timeout value for current op,
 *                else the timeout value in the configuration file will be used.
 *
 * @return the future for current op
 *
 * Future return:
 *      On success: An object of type MultiGetSortKeysResult
 *      On failure: a throwable, which is an instance of PException
 *
 * Thread safety:
 *      All the listeners for the same table are guaranteed to be dispatched in the same thread, so all the
 *      listeners for the same future are guaranteed to be executed as the same order as the listeners added.
 *      But listeners for different tables are not guaranteed to be dispatched in the same thread.
 */
public Future<MultiGetSortKeysResult> asyncMultiGetSortKeys(byte[] hashKey, int maxFetchCount, int maxFetchSize, int timeout/*ms*/);
public Future<MultiGetSortKeysResult> asyncMultiGetSortKeys(byte[] hashKey, int timeout/*ms*/);
```
注：
 * 提供了两个版本的接口，其中第一个接口可以指定maxFetchCount和maxFetchSize。
 * 参数：需传入HashKey、timeout；选择性传入maxFetchCount、maxFetchSize。
   * timeout单位为毫秒，如果<=0，表示使用配置文件中的默认超时。
   * maxFetchCount和maxFetchSize用于限制读取的数据量，maxFetchCount表示最多读取的数据条数，maxFetchSize表示最多读取的数据字节数，两者任一达到限制就停止读取。
 * 返回值：Future\<MultiGetSortKeysResult\>。
   * allFetched：如果用户指定了maxFetchCount或者maxFetchSize，单次查询可能只获取到部分结果。如果所有满足条件的数据都已经获取到，则设置为true；否则设置为false。

## PegasusScannerInterface接口

### next
在scan操作时，同步获取下一条数据。
```java
/**
 * Get the next item.
 * @return item like <<hashKey, sortKey>, value>; null returned if scan completed.
 * @throws PException
 */
public Pair<Pair<byte[], byte[]>, byte[]> next() throws PException;
```
注：
  * 返回值：Pair\<Pair\<byte[], byte[]\>, byte[]\>。
    * 下一条kv-pair；若scan操作完成，则返回null。

### asyncNext
在scan操作时，异步获取下一条数据。
```java
/**
 * Get the next item asynchronously.
 * @return A future for current op.
 *
 * Future return:
 *      On success: if scan haven't reach the end then return the kv-pair, else return null.
 *      On failure: a throwable, which is an instance of PException.
 */
public Future<Pair<Pair<byte[], byte[]>, byte[]>> asyncNext();
```
注：
  * 返回值：Future\<Pair\<Pair\<byte[], byte[]\>, byte[]\>\>。
  * 在scan未扫描完成之前，会返回需要的kv-pair；当scan扫描完成之后，返回null。

## 常见异常

### ERR_OBJECT_NOT_FOUND
表名不存在。可能原因：
* 集群中没有建表。
* 访问了错误的集群。在日志中搜索`meta_servers`，看集群的配置是否正确。
* 表名拼写错误。检查代码中的表名是否正确；在日志中搜索`initialize table handler`，看表名是否正确。

### ERR_TIMEOUT
访问超时。可能原因：
* 网络连接出错。
* 读写延迟超过了超时时间。
* 服务出现抖动。

### ERR_SESSION_RESET
服务端状态出错。可能原因：
* 服务端正在做replica迁移，发生了状态切换。
* 服务端有节点宕机，造成备份数不够，为了保证数据一致性，服务降级，变得不可用。
* 如果是客户端初始化时得到该错误，可能是由于 meta 配置不正确，请检查配置

### ERR_BUSY
服务端流控达到限制。原因是：
* 集群服务端对表设置了[表级写流量控制](/_docs/zh/administration/throttling.md#服务端流控) 。
* 此时该表的瞬时流量（在这1秒内的写入操作数）达到了阈值，触发了reject流控操作，返回`ERR_BUSY`错误码。

# 最佳实践

## 流量控制
经常有业务有集中灌数据的场景，灌数据的过程可能是单机的也可能是分布式的，譬如使用Spark处理后将数据写入Pegasus中。

如果不做流控，很可能产生很高的QPS峰值写，对Pegasus系统造成较大压力：
  * 写QPS太大，会影响读性能，造成读操作延迟上升；
  * 写QPS太大，可能会造成集群无法承受压力而停止服务；

因此，强烈建议业务方在灌数据的时候对写QPS进行流量控制。

客户端流控的思路就是：
* 首先定好总的QPS限制是多少（譬如10000/s），有多少个并发的客户端访问线程（譬如50个），然后计算出每个线程的QPS限制（譬如10000/50=200）。
* 对于单个客户端线程，通过流控工具将QPS限制在期望的范围内。如果超过了QPS限制，就采用简单的sleep方式来等待。我们提供了一个流控工具类[com.xiaomi.infra.pegasus.tools.FlowController](https://github.com/XiaoMi/pegasus-java-client/blob/thrift-0.11.0-inlined/src/main/java/com/xiaomi/infra/pegasus/tools/FlowController.java)，把计算QPS和执行sleep的逻辑封装起来，方便用户使用。

FlowController用法：
  * 构造函数接受一个QPS参数，用于指定流量限制，譬如单线程QPS只允许200/s，就传入200；
  * 用户在每次需要执行写操作之前调用cntl.getToken()方法，该方法产生两种可能：
    * 如果当前未达到流量控制，则无阻塞直接返回，继续执行后面的写操作；
    * 如果当前已经达到流量限制，则该方法会阻塞(sleep)一段时间才返回，以达到控制流量的效果。
  * 该工具尽量配合同步接口使用，对于异步接口可能效果没那么好。

使用方法很简单：
```java
FlowController cntl = new FlowController(qps);
while (true) {
    // call getToken before operation
    cntl.getToken();
    client.set(...);
}
cntl.stop();
```

在分布式灌数据的场景下，用户可以先确定分布式的Task并发数，然后通过```总QPS限制 / Task并发数```，得到单个Task的QPS限制，再使用FlowController进行控制。

## 分页查询

类似实现网页列表的分页功能。
典型地，一个HashKey下有很多SortKey，一页只显示固定数量的SortKey，下一页时再显示接下来的固定数量的SortKey。

分页查询在Pegasus下有多种实现方式：

1. 一次性获取HaskKey下的全部数据，在业务端缓存下来，由业务端自己实现分页逻辑。
2. **顺序分页**：可以使用[multiGet()](#multiget)和[getScanner()](#getscanner)方法，这两者都支持SortKey的范围查询
3. **逆序分页**：请使用[multiGet()](#multiget)方法，其支持SortKey的逆序查询

### 顺序分页

使用 `getScanner` 接口：

```java
ScanOptions options = new ScanOptions();
options.startInclusive = true;
options.stopInclusive = false;
options.batchSize = 20; // 限制每页的大小为 20
byte[] startSortKey = null;
byte[] stopSortKey = null;
PegasusScannerInterface scanner =
  client.getScanner(tableName, hashKey, startSortKey, stopSortKey, options);

// 同步方式获取
Pair<Pair<byte[], byte[]>, byte[]> item;
while ((item = scanner.next()) != null) {
  // ... //
}

// 异步方式获取
Future<Pair<Pair<byte[], byte[]>, byte[]>> item;
while (true) {
  item = scanner.asyncNext();
  try {
    Pair<Pair<byte[], byte[]>, byte[]> pair = item.get();
    if (pair == null) {
      break;
    }
    // ... //
  } catch (Exception e) {
    e.printStackTrace();
  }
}
```

如果你使用 `multiGet`，在 `MultiGetOptions` 中还需设置 `maxFetchCount`，限制每页条数：

```java
// 查第一页
MultiGetOptions options = new MultiGetOptions();
options.startInclusive = true;
options.stopInclusive = false;
int maxFetchCount = 20; // 限制每页的大小为 20
int maxFetchSize = 20000; // 限制每页的总字节数为 20000
byte[] startSortKey = null;
byte[] stopSortKey = null;
List<Pair<byte[], byte[]>> values = new ArrayList<>();
boolean allFetched =
    client.multiGet(
        tableName, hashKey, startSortKey, stopSortKey, options,
        maxFetchCount, maxFetchSize, values);
if (allFetched) {
  return;
}

// ... //

// 查下一页
options.startInclusive = false;
options.stopInclusive = false;
startSortKey = values.get(values.size() - 1); // 以上一页的最后（最大）一个值作为下一页查询的开始
stopSortKey = null;
allFetched =
    client.multiGet(
        tableName, hashKey, startSortKey, stopSortKey, options,
        maxFetchCount, maxFetchSize, values);
if (allFetched) {
  return;
}
```

### 逆序分页

逆序分页需要使用`multiGet`接口，并在选项中设置`reverse=true`。

```java
MultiGetOptions options = new MultiGetOptions();
options.startInclusive = true;
options.stopInclusive = false;
options.reverse = true;
```

## 数据序列化

Pegasus的key和value都是原始的字节串（Java中就是byte[]），而用户存储数据一般用struct或者class。因此，在将数据存储到Pegasus中时，需要将用户数据转化为字节串，这就是**序列化**；在从Pegasus中读取数据时，又需要将字节串转化为用户的数据结构，这就是**反序列化**。序列化和反序列化通常都是成对出现了，后面我们只描述序列化。

通常序列化有这些方式：
* json：好处是数据可读性好；坏处是比较占空间。不推荐。
* thrift：提供了多种Compact协议，常见的有binary协议。但是推荐用tcompact协议，因为这种协议的压缩率更高。
* protobuf：与thrift类似，推荐序列化为binary格式。

对于Thrift结构，使用tcompact协议进行序列化的样例：
```java
    import org.apache.thrift.TSerializer;
    import org.apache.thrift.protocol.TCompactProtocol;

    TSerializer serializer = new TSerializer(new TCompactProtocol.Factory()); 
    byte[] bytes = serializer.serialize(data);
```

## 数据压缩

对于value较大（>=2kb）的业务，我们推荐在客户端使用[facebook/Zstandard](https://github.com/facebook/zstd)压缩算法（简称 Zstd）对数据进行压缩，以减少value的数据长度，提升Pegasus的服务稳定性和读写性能。Zstd算法在压缩比和压缩速率上取得较好的平衡，适合通用场景。

从Java Client 1.11.3版本开始，我们提供了Zstd压缩工具类[com.xiaomi.infra.pegasus.tools.ZstdWrapper](https://github.com/XiaoMi/pegasus-java-client/blob/thrift-0.11.0-inlined/src/main/java/com/xiaomi/infra/pegasus/tools/ZstdWrapper.java)，方便用户实现压缩功能。

使用示例：
```java
    byte[] value = "xxx";

    // write the record into pegasus
    table.set("h".getBytes(), "s".getBytes(), ZstdWrapper.compress(value), 1000);

    // read the record from pegasus
    byte[] compressedBuf = table.get("h".getBytes(), "s".getBytes(), 1000);

    // decompress the value
    byte[] orginalValue = ZstdWrapper.decompress(compressedBuf);
```

也可以参考测试用例代码 [TestZstdWrapper.java](https://github.com/XiaoMi/pegasus-java-client/blob/thrift-0.11.0-inlined/src/test/java/com/xiaomi/infra/pegasus/tools/TestZstdWrapper.java)。

以上两个优化 [数据序列化](#数据序列化) 和 [数据压缩](#数据压缩) 可以在客户端同时使用，都是用客户端的CPU换取Pegasus集群的稳定性和读写性能。在通常情况下这都是值得的。

有时候，业务方在开始使用Pegasus的时候，没有采用客户端压缩，但是在使用一段时间后，发现单条数据的value比较大，希望能通过压缩的办法改进性能。可以分两步：
* [评估压缩收益](#评估压缩收益)：评估通过客户端压缩是否能够获得足够好的压缩率。
* [使用兼容性压缩](#使用兼容性压缩)：升级业务端使用Pegasus Java客户端的逻辑，增加客户端压缩支持，同时兼容原来未压缩的数据。

### 评估压缩收益

对于已经存在的表，原来没有采用客户端压缩，如何快速评估采用客户端压缩后有多大收益？

原料：
* 业务集群：user_cluster，meta配置地址为`${user_cluster_meta_list}`，其中用户表为user_table。
* 测试集群：test_cluster，meta配置地址为`${test_cluster_meta_list}`。
* [Shell工具](/_docs/zh/tools/shell.md) ：使用1.11.3及以上版本；修改配置文件`src/shell/config.ini`，添加访问test_cluster集群的配置项。
* Java客户端：使用1.11.4及以上版本；修改配置文件`pegasus.properties`，设置`meta_servers = ${test_cluster_meta_list}`。

步骤：
* 使用Shell工具的create命令，在test_cluster集群中新建测试表user_table_no_compress和user_table_zstd_compress：
```
./run.sh shell --cluster ${test_cluster_meta_list}
>>> create user_table_no_compress -p 8 -r 3
>>> create user_table_zstd_compress -p 8 -r 3
```
* 使用Shell工具的copy_data命令，将业务集群的user_table表的部分数据复制到测试集群的user_table_no_compress表中（在复制足够条数后通过Ctrl-C中断执行）：
```
./run.sh shell --cluster ${user_cluster_meta_list}
>>> use user_table
>>> copy_data -c test_cluster -a user_table_no_compress
```
* 使用Java客户端工具的copy_data命令，将测试集群user_table_no_compress表的数据复制到user_table_zstd_compress表中，并设置数据写出时采用zstd压缩：
```
./PegasusCli file://./pegasus.properties user_table_no_compress \
    copy_data file://./pegasus.properties user_table_zstd_compress none zstd
```
* 使用Shell工具的count_data命令，分别统计两个测试表的数据大小，然后计算压缩率：
```
./run.sh shell --cluster ${test_cluster_meta_list}
>>> use user_table_no_compress 
>>> count_data -a
>>> use user_table_zstd_compress 
>>> count_data -a
```

### 使用兼容性压缩

业务表原来已经有未压缩的数据，如果应用了客户端压缩，写入新的已压缩的数据，但是hashKey和sortKey保持不变，就会出现未压缩数据和已压缩数据**混合存在**的情况：有的value存储的是未压缩的数据，有的value存储的是已压缩的数据。

这就要求业务端在读数据的时候**保证兼容性**：既能读取未压缩的数据，又能读取已压缩的数据。

基于**未压缩的数据采用zstd进行解压缩时基本都会失败**这一事实，业务端读取的逻辑可以这样：
* 首先，尝试将客户端读到的value数据进行解压缩，如果成功，则说明是已压缩的数据。
* 如果上一步解压缩失败，则说明读到的是未压缩的数据，不需要解压。

示例代码：
```java
    // decompress the value
    byte[] decompressedValue = null;
    try {
        decompressedValue = ZstdWrapper.decompress(value);
    } catch (PException e) {
        // decompress fail
        decompressedValue = value;
    }
```

与此同时，可以使用后台工具将未压缩数据逐渐替换掉为已压缩数据，并在替换过程中保证数据的一致性：扫描表，逐条读取数据，如果数据是未压缩的，则将其转换为已压缩的，使用check_and_set原子操作进行数据替换。

## 客户端连接预热(Warm Up)

我们提供了提供了客户端连接预热（warmup）功能，在进行openTable时提前拉取路由表并建立连接。这样可以避免在该表的第一次rpc调用时，由于执行上述步骤而导致的该次rpc调用过慢的问题。

示例代码：
```java
  PegasusTableInterface table = client.openTable(tableName);
```

# 常见问题

