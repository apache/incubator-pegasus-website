---
permalink: clients/java-client
---

# Getting the Java Client

Project repository: [Pegasus Java Client](https://github.com/apache/incubator-pegasus/tree/master/java-client)

Download:

```bash
git clone https://github.com/apache/incubator-pegasus.git
cd pegasus-java-client
```

Choose the version to use and build the client. It is recommended to use the [latest release version](https://github.com/xiaomi/pegasus-java-client/releases):

```bash
git checkout v2.0.0
mvn clean package -DskipTests
```

Install it into your local Maven repository for convenient use in your project:

```bash
mvn clean install -DskipTests
```

Once the installation is complete, configure it via Maven to use th client:

```xml
<dependency>
  <groupId>com.xiaomi.infra</groupId>
  <artifactId>pegasus-client</artifactId>
  <version>2.0.0</version>
</dependency>
```

**Note: Version 2.0.0 is only compatible with PegasusServer >= 2.0. If your server version is older, please use the following version:**

```xml
<dependency>
  <groupId>com.xiaomi.infra</groupId>
  <artifactId>pegasus-client</artifactId>
  <version>1.11.10-thrift-0.11.0-inlined</version>
</dependency>
```

# Client Configuration

To create a Java client instance, it is necessary to configure relevant parameters. Users can choose between two methods of configuration: file-based configuration or parameter passing.

## File-based Configuration

The Java client requires a configuration file to locate the Pegasus cluster, set default timeout values, and other parameters.

The configuration file is usually named `pegasus.properties`. Here is an example:

```ini
meta_servers = 127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603
operation_timeout = 1000
# Additional parameters can be added as needed; otherwise, default values will apply
async_workers = 4
enable_perf_counter = true
perf_counter_tags = cluster=onebox,app=unit_test
push_counter_interval_secs = 10
meta_query_timeout = 5000
```

Where:

* **meta_servers**: mandatory, specifies a list of MetaServer addresses for the Pegasus cluster used to locate the cluster.
* **operation_timeout**: optional, the default timeout for each operation in milliseconds. In general, each operation in the interface can have its own timeout. The default timeout is used if specified as 0. Default: 1000.
* **async_workers**:optional, the number of backend worker threads that will internally handle RPC between the client and replica_server using Netty NIO. Default: 4.
* **enable_perf_counter**: optional, specifies whether performance monitoring should be enabled. If enabled, the client will periodically report the monitoring data, currently only [Falcon](http://open-falcon.org/) is supported. Default: true (prior to version 2.0.0, the default was false).
* **perf_counter_tags**: optional, tags for Falcon counter data. If performance monitoring is enabled, it is recommended to set the tag name to easily distinguish between different services. Default: empty.
* **push_counter_interval_secs**: optional, the interval of Falcon monitoring data reporting in seconds. Default: 10
* **meta_query_timeout**: optional, the timeout for establishing a connection to the MetaServer in milliseconds. Typically, the initial connection takes more time; users can adjust this parameter based on their scenarios to mitigate query timeout issues on initial service startup. Default: 5000 (prior to version 2.0.0, this parameter did not exist and defaulted to operation_timeout).

The configuration file is used when the client instance is created by passing the `configPath` parameter:

```java
PegasusClientInterface client = PegasusClientFactory.getSingletonClient(configPath);
```

The format for `configPath` is `type://path`, with three supported types:

* **Local File System**
  * Format: file:///path/to/config
  * Example 1: file://./pegasus.properties (indicating the local file ./pegasus.properties)
  * Example 2: file:///home/work/pegasus.properties (indicating the local file /home/work/pegasus.properties)
* **Java Resource**
  * Format: resource:///path/to/config
  * Example 1: resource:///pegasus.properties
  * Example 2: resource:///com/xiaomi/xxx/pegasus.properties
* **Zookeeper**
  * Format: zk://host1:port1,host2:port2,host3:port3/path/to/config
  * Example 1: zk://127.0.0.1:2181/databases/pegasus/pegasus.properties
  * Example 2: zk://127.0.0.1:2181,127.0.0.1:2182/databases/pegasus/pegasus.properties

## Parameter Passing

Users can also create a `ClientOptions` instance as parameters for creating a client instance. `ClientOptions` includes the following parameters:

* **metaServers**: mandatory, the meta_servers addresses. Default: 127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603
* **operationTimeout**: optional, the timeout threshold for client requests. Default: 1000 ms.
* **asyncWorkers**: optional, the number of backend worker threads that will internally handle RPC between the client and replica_server using Netty NIO. Default: 4
* **enablePerfCounter**: optional, specifies whether performance monitoring should be enabled. If enabled, the client will periodically report the monitoring data, currently only [Falcon](http://open-falcon.org/) is supported. Default: false
* **falconPerfCounterTags**: optional, tags for Falcon counter data. If performance monitoring is enabled, it is recommended to set the tag name to easily distinguish between different services. Default: empty
* **falconPushInterval**: optional, the interval of Falcon monitoring data reporting in seconds. Default: 10
* **metaQueryTimeout**: optional, the timeout for establishing a connection to the MetaServer in milliseconds. Typically, the initial connection takes more time; users can adjust this parameter based on their scenarios to mitigate query timeout issues on initial service startup. Default: 5000 (prior to version 2.0.0, this parameter did not exist and defaulted to operation_timeout)

The `ClientOptions` instance can be created in two ways. You can use:

```java
ClientOptions clientOptions = ClientOptions.create()
```

to create a default `ClientOptions` instance. Alternatively, you may refer to the following example to create a customized instance:

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

# Interface Definition

The classes of the Java client are located in the `com.xiaomi.infra.pegasus.client` package, primarily providing three classes:

| Class Name             | Functionality                                                |
| ---------------------- | ------------------------------------------------------------ |
| PegasusClientFactory   | A factory class for creating Client instances                |
| PegasusClientInterface | An interface class for the client, encapsulating various **synchronous APIs**, which can also be used to create table instances. |
| PegasusTableInterface  | An interface class for table, encapsulating both **synchronous and asynchronous APIs** for data access |

Users can choose to use either the Client interface (`PegasusClientInterface`) or the Table interface (`PegasusTableInterface`) for data access, with the following differences:

* The Client interface allows the direct specification of the table name in parameters, eliminating the need to open a table, thus simplifying usage.
* The Table interface supports both **synchronous and asynchronous APIs**, whereas the Client interface supports  only **synchronous APIs**.
* The Table interface allows individual timeout settings for each operation, while the Client interface cannot specify timeouts individually, relying only on the default timeout defined in the configuration file.
* The Table interface introduces a `backupRequestDelayMs` parameter in version 2.0.0, enabling backup-request functionality to improve read performance; further details can be found in the [Backup-Request](/administration/backup-request).
* The Table interface provides more accurate timeout settings, while the Client interface may experience inaccuracies in timeout during initial read/write requests due to internal initialization of the Table object.
* It is recommended that users prioritize the Table interface.

## Creating a Client Instance

There are two methods for creating a Client instance: singleton and non-singleton.

### Singleton

If the application requires access to a **single cluster**, utilizing a singleton is appropriate, as it allows for the sharing of various resources such as thread pools and connections.

**Note**: If `getSingletonClient()` is called in multiple locations to retrieve the singleton object, it is essential to ensure that the `configPath` or `ClientOptions` object provided is consistent; otherwise, an exception will be thrown. This is to ensure that multiple calls retrieve the same instance.

Invoke the `PegasusClientFactory::getSingletonClient()` method to obtain the singleton object of `PegasusClientInterface`:

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

Remember to close the singleton after use to free up resources, for example:

```java
PegasusClientInterface client = PegasusClientFactory.getSingletonClient(configPath);

... ...

PegasusClientFactory.closeSingletonClient();
```

### Non-Singleton

The singleton method cannot be used if the program needs to access multiple clusters. So we provide an interface for creating non-singleton instances, where a `configPath` or `ClientOptions`object must be passed at the time of creation. Different clusters should use different `configPath` or `ClientOptions` objects.

**Note**: Each instance has its own independent resources and does not interfere with one another. So it is recommended to avoid creating redundant instances to avoid wasting resources. Additionally, remember to call `close()` to release resources after use.

Call the ```PegasusClientFactory::createClient()``` method to obtain a non-singleton client instance:

```java
/**
  * Create a client instance. After use, be sure to call client.close() to release resources.
  *
  * @param configPath The client configuration path, which could be:
  * - Zookeeper path  : zk://host1:port1,host2:port2,host3:port3/path/to/config
  * - Local file path : file:///path/to/config
  * - Java resource   : resource:///path/to/config
  *
  * @return PegasusClientInterface.
  * @throws PException Throws an exception if any error occurs.
  */
public static PegasusClientInterface createClient(String configPath) throws PException;

/**
  * Create a client instance using ClientOptions. After use, be sure to call
  * client.close() to release resources.
  *
  * @param options The client options.
  * @return PegasusClientInterface.
  * @throws PException Throws an exception if any error occurs.
  */
public static PegasusClientInterface createClient(ClientOptions options) throws PException;
```

For instance:

```java
PegasusClientInterface client = PegasusClientFactory.createClient(configPath);

... ...

client.close();
```

## PegasusClientInterface

### get

Read a single row of data.

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

Notes:

* Parameters: Must pass in `tableName`, `hashKey`, and `SortKey`.
* Return value: If null is returned, it indicates that the data corresponding to the key does not exist.
* Exception: If an exception occurs, such as a network error, timeout error, or server error, a `PException` will be thrown.

### batchGet

Reads a batch of data. This function is the encapsulation of the `get` function in bulk. This function sends asynchronous requests to the server concurrently and waits for the results. If any request fails, it will terminate immediately and throw an exception. If an exception is thrown, the results in the values list are undefined.

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

Notes:

* Parameters:
  * Input parameters: `tableName`, `keys`.
  * Output parameters: `Values`. This variable should be created by the caller, if read successfully, `Values[i]` stores the result corresponding to `Keys[i]`. If the value does not exist, it will be null.
* Return value: None.
* Exception: If an exception occurs, such as a network error, timeout error, or server error, a `PException` will be thrown.
* Note: This method is not atomic, meaning some keys may succeed while others fail; as long as one fails, an exception will be thrown.

### batchGet2

Reads a batch of data. This function is the encapsulation of the `get` function in bulk. This function sends asynchronous requests to the server concurrently, but unlike the `batchGet` above, it will wait for all requests to finish regardless of success or failure.

Users can determine if the requests were successful or not based on whether the `PException` in the results is set, and they can choose to use only the successful results.

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

Notes:

* Parameters:
  * Input parameters: `ableName` , `keys`.
  * Output parameters: Results. This variable should be created by the caller; `results[i]` stores the result corresponding to `Keys[i]`. If `results[i]`.left is not null (`PException` is set), it indicates the request for `Keys[i]` failed.
* Return value: The count of successful requests.
* Exception: If an exception occurs, such as parameter errors, table name does not exist, etc., a `PException` will be thrown.
* Note: This method is not atomic, meaning some keys may succeed while others fail; users can choose to use only the successful results.

### multiGet

Read multiple rows of data under the same HashKey.

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

Notes:

* Two versions of the interface are provided, where the first interface allows specifying `maxFetchCount` and `axFetchSize`.
* Parameters:
  * Input parameters: Must pass in `tableName`, `hashKey`, `SortKeys`; optionally pass `maxFetchCount` and `maxFetchSize`.
  * Output parameters: Data is returned through `values`, which should be created by the user before calling.
  * If `SortKeys` are not empty, only the specified data will be read. An empty `SortKeys` means all data under the `hashKey` will be read.
  * `maxFetchCount` and `maxFetchSize` are used to limit the amount of data read: `maxFetchCount` indicates the maximum number of data entries to read, while `maxFetchSize` indicates the maximum size of data in bytes to read. When either limit is reached, the read operation is stopped.
* Return value: If `maxFetchCount` or `maxFetchSize` is specified, a single query may retrieve only part of the results. If all satisfying data has been retrieved, it returns true, otherwise it returns false.
* Exception: If an exception occurs, such as a network error, timeout error, or server error, a `PException` will be thrown.

`multiGet` also has another version of the interface that supports **range queries** and **conditional filtering** for `SortKey`, only reading data that meets certain criteria. From version 1.8.0, the `MultiGetOptions` has a reverse parameter, supporting **reverse scanning** of data.

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

Notes:

* Two versions of the interface are provided, where the first interface allows specifying `maxFetchCount` and `axFetchSize`.
* Parameters:
  * Input parameters: Must pass in `tableName`, `hashKey`, `SortKeys`; optionally pass `maxFetchCount` and `maxFetchSize`.
  * Output parameters: Data is returned through `values`, which should be created by the user before calling.
  * If `StopSortKeys` is empty, regardless of the value of `stopInclusive`, all data under this `hashKey` will be read up to the end of `SortKey`.
  * `maxFetchCount` and `maxFetchSize` are used to limit the amount of data read: `maxFetchCount` indicates the maximum number of data entries to read, while `maxFetchSize` indicates the maximum size of data in bytes to read. When either limit is reached, the read operation is stopped. Note that from version 1.12.3, PegasusServer limits the total number of data (including expired and conditionally filtered data) read at one time to 3000 entries, so the effective data read by this interface may be less than the expected value.
  * Description of `MultiGetOptions`:
    * `startInclusive`: Whether to include `StartSortKey`, default is true.
    * `stopInclusive`: Whether to include `StopSortKey`, default is false.
    * `sortKeyFilterType`: Filter type for `SortKey`, including no filter, match anywhere, match prefix, and match postfix, default is no filter.
    * `sortKeyFilterPattern`: `SortKey` filter pattern, an empty string is equivalent to no filter.
    * `noValue`: Only fetch `hashKey` and `SortKey`, do not fetch any `Value` data, default is false.
    * `reverse`: Whether to scan in reverse, searching from back to front. However, the results found will still be stored in the list in ascending order of `SortKey`. Supported from Pegasus Server 1.8.0.
  * Return value: If all satisfying data has been read, it returns true. If only partially satisfying data has been read, it returns false.
  * Exception: If an exception occurs, such as a network error, timeout error, or server error, a `PException` will be thrown.
  * Example: Retrieve all data under a specific `hashKey` (note that if the number of data entries is too large, it may easily timeout):
    * `multiGet(hashKey, null, null, new MultiGetOptions(), -1, -1, values);`

### batchMultiGet

Batch encapsulation of the `multiGet` function. This function concurrently sends asynchronous requests to the server and waits for the results. If any request fails, it will abort and throw an exception. If an exception is thrown, the results in `values` are undefined.

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

Note:

* Parameters:
  * Input parameters: `tableName`, `keys`. `keys` is a list of `Pair`, where the left value of the `Pair` is the `hashKey`, and the right value is the list of `sortKey`s. If the right value is null or an empty list, all data under the `hashKey` is fetched.
  * Output parameters: `Values`. This `List` must be created by the caller; if the read is successful, `Values[i]` stores the result corresponding to `Keys[i]`.
* Return value: None.
* Exception: A `PException` will be throw when an exception occurs, such as a network error, timeout error, server error, etc.
* Note: This method is not atomic, meaning some keys may succeed while others fail. As long as any one fails, an exception will be thrown.

### batchMultiGet2

Batch encapsulation of the `multiGet` function. This function concurrently sends asynchronous requests to the server and waits for the results. However, unlike `batchMultiGet`, it waits for the completion of all requests, regardless of their success or failure.

Users can determine the success or failure of requests based on whether the `PException` is set in the results, and can choose to use only the successful results.

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

Note:

* Parameters:
  * Input parameters: `tableName`, `keys`. `keys` is a list of `Pair`, where the left value of the `Pair` is the `hashKey`, and the right value is the list of `sortKey`s. If the right value is null or an empty list, all data under the `hashKey` is fetched.
  * Output parameters: `results`. This variable must be created by the caller; `results[i]` stores the result corresponding to `Keys[i]`. If `results[i].left` is not null (`PException` is set), it indicates that the request for `Keys[i]` has failed.
* Return value: The number of successful requests.
* Exception: A `PException` will be thrown when an exception occurs, such as a parameter error, table name does not exist, etc.
* Note: This method is not atomic, meaning some keys may succeed while others fail, allowing users to choose to use only the successful results.

### set

Write a single row of data.

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

Note:

* Two versions of the interface are provided, where the first interface allows specifying the TTL time.
* Parameters: You need to pass TableName, HashKey, SortKey, value; optionally pass TTL, which must be >= 0; when < 0, a PException will be thrown.
* Return value: None.
* Exception: If an exception occurs, such as network errors, timeout errors, server errors, TTL < 0, etc., a PException will be thrown.

### batchSet

Write a batch of data, batch encapsulation of the set function. This function concurrently sends asynchronous requests to the server and waits for results. If any request fails, it will terminate immediately and throws an exception.

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

Note:

* Parameters: `tableName`, `items`.
* Return value: None.
* Exception: A `PException` is thrown when an exception occurs, such as network errors, timeout errors, server errors, etc.
* Note: This method is not atomic, meaning some keys may succeed while others fail; as long as any one fails, an exception will be thrown.

### batchSet2

Batch encapsulation of the set function. This function concurrently sends asynchronous requests to the server and waits for results. However, unlike `batchSet`, it waits for all requests, whether successful or not.

Users can determine the success or failure of requests based on whether the `PException` is set in the results, and can choose to use only the successful results.

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

Note:

* Parameters:
  * Input parameters: `tableName`, `items`.
  * Output parameters: Results. This variable must be created by the caller; `results[i]` stores the result corresponding to `items[i]`; if `results[i]` is not null (`PException` is set), it indicates that the request for `items[i]` has failed.
* Return value: The number of successful requests.
* Exception: If an exception occurs, such as parameter errors, table name does not exist, etc., a `PException` will be thrown.
* Note: This method is not atomic, meaning some keys may succeed while others fail, allowing users to choose to use only the successful results.

### multiSet

Write multiple rows of data under the same HashKey.

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

Note:

* Two versions of the interface are provided, where the first interface allows specifying the `TTL` time.
* Parameters: Pass `tableName`, `hashKey`, `Values`; optionally pass `TTL`, which must be >= 0; when `TTL` < 0, a `PException` will be thrown.
  * Values is a list of Pairs, where the first element of the Pair is `SortKey`, and the second element is `value`.
* Return value: None.
* Exception: If an exception occurs, such as network errors, timeout errors, server errors, `TTL` < 0, etc., a `PException` will be thrown.

### batchMultiSet

A batch wrapper for the `multiSet` function. This function concurrently sends asynchronous requests to the server and waits for results. If any request fails, it will terminate immediately and throws an exception.

```java
/**
* Batch set multiple values under the same hash key.
* Will terminate immediately if any error occurs.
* @param tableName TableHandler name
* @param items list of items.
* @param ttl_seconds time to live in seconds,
*                    0 means no TTL. Default value is 0.
* @throws PException throws exception if any error occurs.
*
* Notice: the method is not atomic, meaning some keys may succeed while others fail.
*/
public void batchMultiSet(String tableName, List<HashKeyData> items, int ttl_seconds) throws PException;
public void batchMultiSet(String tableName, List<HashKeyData> items) throws PException;
```

Notes:

* Two versions of the interface are provided, where the first allows specifying TTL.
* Parameters: `tableName`, `items`. Optionally, TTL, which must be >= 0. If < 0, a `PException` will be thrown.
* Return value: None.
* Exceptions: If an exception occurs, such as network errors, timeout errors, server errors, or TTL < 0, a `PException` will be thrown.
* Note: This method is not atomic; some keys may succeed while others fail, and any failure will throw an exception.

### batchMultiSet2

A batch wrapper for the `multiSet` function. This function concurrently sends asynchronous requests to the server and waits for results. However, unlike `batchMultiSet`, it waits for the completion of all requests, regardless of their success or failure.

```java
/**
* Batch set multiple values under the same hash key.
* Will wait for all requests to complete even if some errors occur.
* @param tableName table name
* @param items list of items.
* @param ttl_seconds time to live in seconds,
*                    0 means no TTL. Default value is 0.
* @param results output results; should be created by the caller; after the call, the size of results will
*                be the same as items; results[i] is a PException:
*                - if results[i] != null: means setting items[i] failed, results[i] is the exception.
*                - if results[i] == null: means setting items[i] succeeded.
* @return succeed count.
* @throws PException
*
* Notice: the method is not atomic, meaning some keys may succeed while others fail.
*/
public int batchMultiSet2(String tableName, List<HashKeyData> items, int ttl_seconds, List<PException> results) throws PException;
public int batchMultiSet2(String tableName, List<HashKeyData> items, List<PException> results) throws PException;
```

Notes:

* Two versions of the interface are provided, where the first allows specifying TTL.
* Parameters:
  * Input: `tableName`, `items`; optionally, TTL, which must be >= 0. If < 0, a `PException` will be thrown.
  * Output: `results`. This variable should be created by the caller; `results[i]` contains the result for `items[i]`; if `results[i]` is not null (a `PException` is set), it indicates a failure for `items[i]`.
* Return value: The number of successful requests.
* Exceptions: If an exception occurs, such as parameter errors, non-existent table names, or TTL < 0, a `PException` will be thrown.
* Note: This method is not atomic; some keys may succeed while others fail, and users can choose to use only the successful results.

### del

Delete a single row of data.

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

Notes:

* Parameters: Requires `tableName`, `hashKey`, and `sortKey`.
* Return value: None.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.

### batchDel

Batch delete data, wrapping the `del` function. This function concurrently sends asynchronous requests to the server and waits for results. If any request fails, it will terminate immediately and throws an exception.

```java
/**
* Batch delete values of different keys.
* Will terminate immediately if any error occurs.
* @param tableName table name
* @param keys hashKey and sortKey pair list.
* @throws PException throws exception if any error occurs.
*
* Notice: the method is not atomic, meaning some keys may succeed while others fail.
*/
public void batchDel(String tableName, List<Pair<byte[], byte[]>> keys) throws PException;
```

Notes:

* Parameters: Requires `tableName` and `keys`.
* Return value: None.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.
* Note: This method is not atomic; some keys may succeed while others fail, and any failure will throw an exception.

### batchDel2

A batch wrapper for the `del` function. This function concurrently sends asynchronous requests to the server and waits for results. However, unlike `batchDel`, it waits for all requests to finish regardless of success or failure.

Users can determine the success or failure of requests based on whether `PException` is set in the results, and can choose to use only successful results.

```java
/**
* Batch delete values of different keys.
* Will wait for all requests to complete even if some errors occur.
* @param tableName table name
* @param keys hashKey and sortKey pair list.
* @param results output results; should be created by the caller; after the call, the size of results will
*                be the same as keys; results[i] is a PException:
*                - if results[i] != null: means deleting keys[i] failed, results[i] is the exception.
*                - if results[i] == null: means deleting keys[i] succeeded.
* @return succeed count.
* @throws PException
*
* Notice: the method is not atomic, meaning some keys may succeed while others fail.
*/
public int batchDel2(String tableName, List<Pair<byte[], byte[]>> keys, List<PException> results) throws PException;
```

Notes:

* Parameters:
  * Input: `tableName`, `keys`.
  * Output: `results`. This variable should be created by the caller; `results[i]` contains the result for `keys[i]`; if `results[i]` is not null (a `PException` is set), it indicates a failure for `keys[i]`.
* Return value: The number of successful requests.
* Exceptions: If an exception occurs, such as parameter errors or non-existent table names, a `PException` will be thrown.
* Note: This method is not atomic; some keys may succeed while others fail, and users can choose to use only the successful results.

### multiDel

Delete multiple rows of data under the same HashKey.

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

Notes:

* Parameters: Requires `tableName`, `hashKey`, and `sortKeys`.
  * `sortKeys` must not be empty. If you don’t know what sort keys exist under the `hashKey`, you can use the `multiGetSortKeys` method to retrieve them.
* Return value: None.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.

### batchMultiDel

A batch wrapper for the `multiDel` function. This function concurrently sends asynchronous requests to the server and waits for results. If any request fails, it will terminate immediately and throws an exception.

```java
/**
* Batch delete specified sort keys under the same hash key.
* Will terminate immediately if any error occurs.
* @param tableName table name
* @param keys List{hashKey,List{sortKey}}
* @throws PException throws exception if any error occurs.
*
* Notice: the method is not atomic, meaning some keys may succeed while others fail.
*/
public void batchMultiDel(String tableName, List<Pair<byte[], List<byte[]>>> keys) throws PException;
```

Notes:

* Parameters: Requires `tableName` and `keys`. `keys` is a list of pairs, where the left value is the `hashKey`, and the right value is a non-empty list of `sortKeys`.
* Return value: None.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.
* Note: This method is not atomic; some keys may succeed while others fail, and any failure will throw an exception.



### batchMultiDel2

A batch wrapper for the `multidel` function. This function concurrently sends asynchronous requests to the server and waits for results. However, unlike `batchMultiDel`, it waits for all requests to finish regardless of success or failure.

Users can determine the success or failure of requests based on whether `PException` is set in the results, and can choose to use only successful results.

```java
/**
* Batch delete specified sort keys under the same hash key.
* Will wait for all requests to complete even if some errors occur.
* @param tableName table name
* @param keys List{hashKey,List{sortKey}}
* @param results output results; should be created by the caller; after the call, the size of results will
*                be the same as keys; results[i] is a PException:
*                - if results[i] != null: means deleting keys[i] failed, results[i] is the exception.
*                - if results[i] == null: means deleting keys[i] succeeded.
* @return succeed count.
* @throws PException
*
* Notice: the method is not atomic, meaning some keys may succeed while others fail.
*/
public int batchMultiDel2(String tableName, List<Pair<byte[], List<byte[]>>> keys, List<PException> results) throws PException;
```

Notes:

* Parameters:
  * Input: `tableName`, `keys`. `keys` is a list of pairs, where the left value is the `hashKey`, and the right value is a non-empty list of `sortKeys`.
  * Output: `results`. This variable should be created by the caller; `results[i]` contains the result for `keys[i]`; if `results[i]` is not null (a `PException` is set), it indicates a failure for `keys[i]`.
* Return value: The number of successful requests.
* Exceptions: If an exception occurs, such as parameter errors or non-existent table names, a `PException` will be thrown.
* Note: This method is not atomic; some keys may succeed while others fail, and users can choose to use only the successful results.

### delRange

Delete data under the same HashKey where SortKey values fall within the range of startSortKey and stopSortKey. If an error occurs during the deletion, it will not affect the already deleted data and will mark the first SortKey that was not deleted within the range.

```java
/**
   * Delete key-values within the range of startSortKey and stopSortKey under hashKey. Will terminate
   * immediately if any error occurs.
   *
   * @param tableName table name
   * @param hashKey used to decide which partition the key may exist, should not be null or empty.
   * @param startSortKey the start sort key. null or "" means fetch to the first sort key.
   * @param stopSortKey the stop sort key. null or "" means fetch to the last sort key.
   * @param options del range options.
   * @throws PException throws exception if any error occurs.
   */
public void delRange(String tableName, byte[] hashKey, byte[] startSortKey, byte[] stopSortKey, DelRangeOptions options) throws PException;

public class DelRangeOptions {
    public byte[] nextSortKey = null;
    public boolean startInclusive = true; // whether the startSortKey is included
    public boolean stopInclusive = false; // whether the stopSortKey is included
    public FilterType sortKeyFilterType = FilterType.FT_NO_FILTER; // filter type for sort key
    public byte[] sortKeyFilterPattern = null; // filter pattern for sort key
}
```

Notes:

* Parameters:
  * Input parameters:
    * `startSortKey` and `stopSortKey` are the start and end key values for the sort keys.
    * `DelRangeOptions`:
      * `nextSortKey`: The first sort key value to be deleted, default is null. During deletion, it dynamically records the next key to delete. Notably, when an error occurs during deletion, this parameter can record the next sort key to continue deleting.
      * `startInclusive`: Whether to include `startSortKey`, default is true.
      * `stopInclusive`: Whether to include `stopSortKey`, default is false.
      * `sortKeyFilterType`: Filter type for sort keys, including no filter, any position matching, prefix matching, and suffix matching, default is no filter.
      * `sortKeyFilterPattern`: Sort key filter pattern string, an empty string is treated as no filter.
  * Output parameters: None.
* Return value: None.
* Exceptions: If an exception occurs, such as parameter errors, non-existent table names, or timeouts, a `PException` will be thrown.
* Note: This method is not atomic; some keys may succeed while others fail.

### incr

Single-row atomic increment (or decrement) operation. For detailed instructions, refer to [Single-row Atomic Operations](/api/single-atomic#atomic-increment-decrement).

This operation first converts the byte string of the value pointed to by the key into an int64 type (similar to Java's [Long.parseLong()](https://docs.oracle.com/javase/7/docs/api/java/lang/Long.html#parseLong(java.lang.String)) function), then adds the increment, and converts the result back into a byte string as the new value.

It performs an atomic increment when the `increment` parameter is positive, and performs an atomic decrement when the `increment` parameter is negative.

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

Notes:

* Parameters: Requires `tableName`, `hashKey`, `sortKey`, and `increment`.
* Return value: The new value after the operation succeeds.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown. Additionally, exceptions will be thrown in the following cases:
  * Error converting the old value to int64, such as invalid number format or exceeding the int64 range.
  * The result of the old value plus `increment` exceeds the int64 range.
* Other notes:
  * If the old value does not exist, it is treated as 0, meaning the new value equals `increment`.
  * TTL semantics: If the old value exists, the new value retains the same TTL as the old value; if the old value does not exist, the new value will have no TTL.

Starting from Pegasus Server v1.11.1, modifying TTL during `incr` operations is supported. Use [Pegasus Java Client 1.11.2-thrift-0.11.0-inlined-release](https://github.com/XiaoMi/pegasus-java-client/releases/tag/1.11.2-thrift-0.11.0-inlined-release) or later to utilize this feature.

```java
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

Notes:

* Except for TTL, all other semantics are the same as above.
* TTL operations:
  * If `ttlSeconds == 0`, the semantics align with Redis: If the old value exists, the new value retains the same TTL; if the old value does not exist, the new value will have no TTL.
  * If `ttlSeconds > 0`, the TTL is set to the new value.
  * If `ttlSeconds == -1`, the TTL is cleared, meaning the new value will have no TTL.
  * If `ttlSeconds < -1`, an exception is thrown.

### checkAndSet

Atomic CAS operation for single HashKey data (can be understood as **single-row atomic operation**). For detailed instructions, refer to [Single-row Atomic Operations](/api/single-atomic#cas-operation).

This operation first performs a conditional check on the value of a specific SortKey (referred to as `CheckSortKey`):

* If the check condition is satisfied, the value of another SortKey (referred to as `SetSortKey`) is set to the new value.
* If the check condition is not satisfied, the set operation is skipped.

`CheckSortKey` and `SetSortKey` can be the same or different.

Users can also set `CheckAndSetOptions.returnCheckValue` to retrieve the value corresponding to `CheckSortKey`. By doing so, if `CheckSortKey` and `SetSortKey` are the same and the set operation succeeds, the old value before the set is returned.

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

Notes:

* Parameters: Requires `tableName`, `hashKey`, `checkSortKey`, `checkType`, `checkOperand`, `setSortKey`, `setValue`, and `options`.
  * `checkSortKey`, `checkType`, `checkOperand`: Specify the condition to check.
  * `setSortKey`, `setValue`: Specify the new value to set if the check condition is satisfied.
  * `options`: Additional options, including:
    * `setValueTTLSeconds`: TTL for the new value; must be >= 0, where 0 means no TTL. If < 0, a `PException` is thrown.
    * `returnCheckValue`: Whether to return the value corresponding to `checkSortKey`.
* Return value: `CheckAndSetResult`, including:
  * `setSucceed`: Whether the set operation succeeded.
  * `checkValueReturned`: Whether the value corresponding to `checkSortKey` is returned.
  * `checkValueExist`: Whether the value corresponding to `checkSortKey` exists; this field is meaningful only when `checkValueReturned=true`.
  * `checkValue`: The value corresponding to `checkSortKey`; this field is meaningful only when `checkValueExist=true`.
* Exceptions: If an exception occurs, such as network errors, timeout errors, server errors, or invalid TTL, a `PException` will be thrown. Additionally, exceptions will be thrown in the following cases:
  * If `CheckType` is an `int compare` operation and `checkOperand` or `checkValue` fails to convert to int64 (e.g., invalid number format or exceeding the int64 range).

### checkAndMutate

`checkAndMutate` is an extended version of [`checkAndSet`](#checkandset): While `checkAndSet` only allows setting a single value, `checkAndMutate` enables setting or deleting multiple values in a single atomic operation. This interface has been available since [Pegasus Java Client 1.11.0-thrift-0.11.0-inlined-release](https://github.com/XiaoMi/pegasus-java-client/releases/tag/1.11.0-thrift-0.11.0-inlined-release).

To support this, we provide a wrapper class [`Mutations`](https://github.com/XiaoMi/pegasus-java-client/blob/thrift-0.11.0-inlined/src/main/java/com/xiaomi/infra/pegasus/client/Mutations.java), allowing users to predefine the set or delete operations to be performed.

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

Notes:

* Parameters: Requires `tableName`, `hashKey`, `checkSortKey`, `checkType`, `checkOperand`, `mutations`, and `options`.
  * `checkSortKey`, `checkType`, `checkOperand`: Specify the condition to check.
  * `mutations`: Define the set or delete operations to perform if the check condition is satisfied.
  * `options`: Additional options, including:
    * `returnCheckValue`: Whether to return the value corresponding to `checkSortKey`.
* Return value: `CheckAndMutateResult`, including:
  * `mutateSucceed`: Whether the mutation succeeded.
  * `checkValueReturned`: Whether the value corresponding to `checkSortKey` is returned.
  * `checkValueExist`: Whether the value corresponding to `checkSortKey` exists, meaningful only when `checkValueReturned=true`.
  * `checkValue`: The value corresponding to `checkSortKey`, meaningful only when `checkValueExist=true`.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown. Additionally, exceptions will be thrown in the following cases:
  * If `CheckType` is an `int compare` operation and `checkOperand` or `checkValue` fails to convert to int64 (e.g., invalid number format or exceeding the int64 range).

### compareExchange

`compareExchange` is a specialized version of [`checkAndSet`](#checkandset):

* `CheckSortKey` and `SetSortKey` are the same.
* `CheckType` is `CT_VALUE_BYTES_EQUAL`.

The semantics of this method are: If the value corresponding to the `SortKey` exists and equals the expected value, it will be set to the new value. For details, refer to [Single-row Atomic Operations](/api/single-atomic#cas-operation).

This method aligns with the semantics of the commonly used [`atomic_compare_exchange`](https://en.cppreference.com/w/cpp/atomic/atomic_compare_exchange) in C++ libraries.

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

Notes:

* Parameters: Requires `tableName`, `hashKey`, `sortKey`, `expectedValue`, `desiredValue`, and `ttlSeconds`.
  * `hashKey`, `sortKey`: Specify the key of the data.
  * `expectedValue`: The expected old value.
  * `desiredValue`: The new value to set if the old value equals `expectedValue`.
  * `ttlSeconds`: TTL for the new value, must be >= 0, where 0 means no TTL. If `ttlSeconds < 0`, a `PException` is thrown.
* Return value: `CompareExchangeResult`, including:
  * `setSucceed`: Whether the set operation succeeded. If the old data does not exist, the set fails.
  * `actualValue`: If the set fails, returns the actual value of the data; `null` means the data does not exist.
* Exceptions: If an exception occurs, such as network errors, timeout errors, server errors, or TTL<0, a `PException` will be thrown.

### ttl

Get the TTL (Time To Live) of a single-row data. TTL indicates how long the data can survive. Once the TTL expires, the data becomes unreadable.

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

Notes:

* Parameters: Requires `tableName`, `hashKey`, and `sortKey`.
* Return value: TTL time in seconds. Returns `-1` if no TTL is set; returns `-2` if the data does not exist.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.

### exist

Check if data exists.

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

Notes:

* Parameters: Requires `tableName`, `hashKey`, and `sortKey`.
* Return value: Returns `true` if the data exists; otherwise, returns `false`.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.

### sortKeyCount

Get the count of all `SortKey`s under a specific `HashKey`.

```java
/**
 * @param tableName TableHandler name
 * @param hashKey used to decide which partition the key may exist.
 * @return the count result for the hashKey
 * @throws PException
 */
public long sortKeyCount(String tableName, byte[] hashKey) throws PException;
```

Notes:

* Parameters: Requires `tableName` and `hashKey`.
* Return value: The count of all `SortKey`s under the `HashKey`.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.

### multiGetSortKeys

Get the list of `SortKey`s under a specific `HashKey`.

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

Notes:

* Two versions of the interface are provided, with the first allowing specification of `maxFetchCount` and `maxFetchSize`.
* Parameters:
  * Input: Requires `tableName` and `hashKey`; optionally, `maxFetchCount` and `maxFetchSize`.
  * Output: Data is returned via `sortKeys`, which must be initialized by the caller.
  * `maxFetchCount` and `maxFetchSize` limit the amount of data fetched. `maxFetchCount` specifies the maximum number of entries, and `maxFetchSize` specifies the maximum byte size. Fetching stops when either limit is reached.
* Return value: If `maxFetchCount` or `maxFetchSize` is specified, a single query may retrieve only partial results. Returns `true` if all matching data is fetched; otherwise, returns `false`.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.

### getScanner

Get an iterator to traverse all data under a specific `HashKey` for partial scanning.

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

Notes:

* Parameters: Requires `tableName`, `hashKey`, `startSortKey`, `stopSortKey`, and `ScanOptions`.
  * `startSortKey` and `stopSortKey` define the scan range, with inclusivity/exclusivity specified in `ScanOptions`.
  * If `startSortKey` is `null`, scanning starts from the beginning; if `stopSortKey` is `null`, scanning continues to the end.
  * `ScanOptions` details:
    * `timeoutMillis`: Timeout for reading data from the server, in milliseconds (default: 5000).
    * `batchSize`: Number of entries per batch when fetching data from the server (default: 1000).
    * `startInclusive`: Whether to include `startSortKey` (default: `true`).
    * `stopInclusive`: Whether to include `stopSortKey` (default: `false`).
    * `hashKeyFilterType`: Filter type for `hashKey` (no filter, match anywhere, prefix, or postfix; default: no filter).
    * `hashKeyFilterPattern`: Filter pattern for `hashKey`; empty string means no filter.
    * `sortKeyFilterType`: Filter type for `sortKey` (no filter, match anywhere, prefix, or postfix; default: no filter).
    * `sortKeyFilterPattern`: Filter pattern for `sortKey`; empty string means no filter.
    * `noValue`: Fetch only `hashKey` and `sortKey`, excluding values (default: `false`).
* Return value: Returns an iterator `PegasusScannerInterface`.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.

### getUnorderedScanner

Get iterators to traverse all data in the entire table for global scanning.

```java
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

Notes:

* Parameters: Requires `tableName`, `maxSplitCount`, and `ScanOptions`.
  * `maxSplitCount`: Determines the number of iterators returned. Multiple iterators allow concurrent scanning or use in MapReduce. Set to `1` if only one iterator is needed.
  * `ScanOptions`: As described above.
* Return value: Returns a list of `PegasusScannerInterface` iterators.
* Exceptions: If an exception occurs, such as network errors, timeout errors, or server errors, a `PException` will be thrown.



## Creating Table Instances

Use the `PegasusClientInterface::openTable()` method to obtain an instance of `PegasusTableInterface`:

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

Notes:

- Exceptions will be thrown for network timeouts or if the table does not exist.

Example usage:

```java
PegasusTableInterface table = client.openTable(tableName);
```

`PegasusTableInterface` provides both synchronous and asynchronous APIs.

The synchronous APIs are similar to `PegasusClientInterface`, with the following differences:

- No need to specify the `tableName` parameter.
- Timeout can be specified individually.

Additionally, `openTable` includes a warmup feature to address slow first RPC calls for a table. Refer to the best practices section for details.

### Future-Based Asynchronous APIs

The asynchronous APIs use the Future pattern, specifically `io.netty.util.concurrent.Future` (see https://netty.io/4.1/api/index.html). Each async API returns a `Future<T>`, where `T` is the result type of the operation. Features of `Future`:

- Listeners callbacks can be added via `addListener()`. Callbacks are invoked when the operation completes. If the operation is already complete when adding, the callback is invoked immediately. Callbacks are executed in the order they are added.
- The `await()` method blocks until the operation completes. Note that `await()` only ensures the operation is finished and the following three methods are available, not that callbacks have been executed.
- After completion:
  - `isSuccess()` checks if the operation succeeded.
  - `getNow()` retrieves the result if successful.
  - `cause()` retrieves the exception if failed.

**Note**: The first async API call for a table may have additional latency (~10ms) due to fetching table metadata and routing info from the meta-server.

Example async usage:

```java
// Get table instance
PegasusTableInterface table = client.openTable(tableName);
  
// Initiate async call
Future<Boolean> future = table.asyncExist(hashKey, sortKey, 0);
  
// Set callback
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
  
// Wait for completion
future.await();
```

## PegasusTableInterface APIs

### asyncGet

Asynchronously read a single row of data.

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

Notes:

- Parameters: `hashKey`, `sortKey`, `timeout` (ms). Timeout <=0 uses the default timeout from the configuration file.
- Returns: `Future<byte[]>`.

### asyncMultiGet

Asynchronously read multiple rows of data under the same HashKey.

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

Notes:

* Two versions of the interface are provided, where the first one allows specifying `maxFetchCount` and `maxFetchSize`.
* Parameters: Requires `hashKey`, `sortKeys`, and `timeout`; optionally includes `maxFetchCount` and `maxFetchSize`.
  * If `sortKeys` is non-empty, only the specified data will be read. If empty, all data under the `hashKey` will be read.
  * `timeout` is in milliseconds. If <= 0, the default timeout from the configuration file will be used.
  * `maxFetchCount` and `maxFetchSize` limit the amount of data to be read. `maxFetchCount` specifies the maximum number of data entries, and `maxFetchSize` specifies the maximum data size in bytes. Reading stops when either limit is reached.
* Return value: `Future<MultiGetResult>`.
  * `allFetched`: If the user specifies `maxFetchCount` or `maxFetchSize`, a single query may only retrieve partial results. If all matching data has been fetched, this is set to `true`; otherwise, it is set to `false`.

Another version of `asyncMultiGet` supports **range queries** and **conditional filtering** for `SortKey`, allowing only data that meets specific conditions to be read. Starting from version 1.8.0, the `MultiGetOptions` includes a `reverse` parameter to support **reverse scanning** of data.

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

Notes:

* Parameters are the same as [`multiGet`](#multiget).

### asyncSet

Asynchronously write a single row of data.

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

Notes:

* Two versions of the interface are provided, where the first one allows specifying the TTL time.
* Parameters: Requires `hashKey`, `sortKey`, `value`, and `timeout`; optionally includes `ttlSeconds`.
  * `timeout` is in milliseconds. If <= 0, the default timeout from the configuration file will be used.
  * `ttlSeconds` is the TTL time for the data, in seconds. TTL must be >= 0; 0 means no TTL is set. If TTL < 0, a `PException` will be thrown.
* Return value: `Future<Void>`.

### asyncMultiSet

Asynchronously write multiple rows of data under the same HashKey.

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

Notes:

* Two versions of the interface are provided, where the first one allows specifying the TTL time.
* Parameters: Requires `hashKey`, `values`, and `timeout`; optionally includes `ttlSeconds`.
  * `values` is a list of pairs, where the first element is the `sortKey` and the second is the `value`.
  * `timeout` is in milliseconds. If <= 0, the default timeout from the configuration file will be used.
  * `ttlSeconds` is the TTL time for the data, in seconds. TTL must be >= 0; 0 means no TTL is set. If TTL < 0, a `PException` will be thrown.
* Return value: `Future<Void>`.

### asyncDel

Asynchronously delete a single row of data.

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
 * Delete value for a specific (hashKey, sortKey) pair, async version  
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

Notes:

* Parameters: Requires `hashKey`, `sortKey`, and `timeout`.
  * `timeout` is in milliseconds. If <= 0, the default timeout from the configuration file will be used.
* Return value: `Future<Void>`.

### asyncMultiDel

Asynchronously delete multiple rows of data under the same HashKey.

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
 * Delete multiple values for a specific hashKey, async version  
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

Notes:

* Parameters: Requires `hashKey`, `sortKeys`, and `timeout`.
  * `sortKeys` must not be empty. If you don’t know what sort keys exist under the `hashKey`, you can use the `multiGetSortKeys` method to retrieve them.
  * `timeout` is in milliseconds. If <= 0, the default timeout from the configuration file will be used.
* Return value: `Future<Void>`.

### asyncIncr

Asynchronous atomic increment (or decrement) operation. The async version of [incr](#incr).

```java  
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

Notes:

* Parameters and return value: See synchronous [incr](#incr) interface.

### asyncCheckAndSet

Atomic CAS operation for single HashKey, async version of [checkAndSet](#checkandset).

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

Notes:

* Parameters and return value: See synchronous [checkAndSet](#checkandset) interface.

### asyncCompareExchange

Atomic compare-and-exchange for single `HashKey`, async version of [compareExchange](#compareexchange).

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

Notes:

* Parameters and return value: See synchronous [compareExchange](#compareexchange) interface.

### asyncTTL

Asynchronously get TTL (time-to-live) for a key-value pair in seconds.

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

### asyncExist

Asynchronously check if data exists.

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

Notes:

* Parameters: Requires `hashKey`, `sortKey`, and `timeout`.
  * `timeout` is in milliseconds. If <= 0, the default timeout from the configuration file will be used.
* Return value: `Future<Boolean>`.
  * The result is a boolean value. Returns `true` if the data exists, otherwise `false`.

### asyncSortKeyCount

Asynchronously get the count of all `sortKeys` under a specific `hashKey`.

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

Notes:

* Parameters: Requires `HashKey` and `timeout`.
  * `timeout` is in milliseconds. If <= 0, the default timeout from the configuration file will be used.
* Return value: `Future<Long>`.
  * The result is the count of all sortKeys under the specified hashKey.

### asyncMultiGetSortKeys

Asynchronously get the list of `sortKeys` under a specific `hashKey`.

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

Notes:

* Two versions of the interface are provided, where the first one allows specifying `maxFetchCount` and `maxFetchSize`.
* Parameters: Requires `hashKey` and `timeout`; optionally accepts `maxFetchCount` and `maxFetchSize`.
  * `timeout` is in milliseconds. If <= 0, the default timeout from the configuration file will be used.
  * `maxFetchCount` and `maxFetchSize` limit the amount of data fetched. `maxFetchCount` specifies the maximum number of items, and `maxFetchSize` specifies the maximum data size in bytes. Fetching stops when either limit is reached.
* Return value: `Future<MultiGetSortKeysResult>`.
  * `allFetched`: If the user specifies `maxFetchCount` or `maxFetchSize`, a single query may only retrieve partial results. If all matching data has been fetched, this is set to `true`; otherwise, it is set to `false`.

## PegasusScannerInterface

### next

Synchronously fetches the next item during scan operation.

```java
/**
 * Get the next item.
 * @return item like <<hashKey, sortKey>, value>; null returned if scan completed.
 * @throws PException
 */
public Pair<Pair<byte[], byte[]>, byte[]> next() throws PException;
```

Notes:

* Return value: `Pair<Pair<byte[], byte[]>, byte[]>`.
  * Returns the next kv-pair; returns null if scan operation completes.

### asyncNext

Asynchronously fetches the next item during scan operation.

```java
/**
 * Get the next item asynchronously.
 * @return A future for current op.
 *
 * Future return:
 *      On success: if scan hasn't reached the end then return the kv-pair, else return null.
 *      On failure: a throwable, which is an instance of PException.
 */
public Future<Pair<Pair<byte[], byte[]>, byte[]>> asyncNext();
```

Notes:

* Return value: Future\<Pair\<Pair\<byte[], byte[]\>, byte[]\>\>.
* Returns the required kv-pair before scan completes; returns null after scan completes.

## Common Exceptions

### ERR_OBJECT_NOT_FOUND

Table does not exist. Possible causes:

* Table not created in the cluster.
* Accessed wrong cluster. Search for `meta_servers` in logs to verify cluster configuration.
* Table name misspelled. Check table name in code, search for `initialize table handler` in logs to verify table name.

### ERR_TIMEOUT

Request timeout. Possible causes:

* Network connection error.
* Read/write latency exceeds timeout threshold.
* Service jitter.

### ERR_SESSION_RESET

Server-side state error. Possible causes:

* Server is undergoing replica migration with state transition.
* Server node failure causes insufficient replicas, leading to service degradation for data consistency.
* If this error occurs during client initialization, check meta configuration for correctness.

### ERR_BUSY

Server-side flow control limit reached. Causes:

* Cluster server has enabled [table-level write flow control](/administration/throttling#server-side-flow-control).
* Instantaneous write operations per second (QPS) exceeded threshold, triggering reject flow control with `ERR_BUSY`.



# Best Practices

## Flow Control

In scenarios where businesses frequently perform bulk data ingestion (either single-machine or distributed, such as using Spark for processing before writing to Pegasus), it's common to encounter high QPS spikes during writes. Without flow control, these spikes can impose significant pressure on the Pegasus system:

- Extremely high write QPS can degrade read performance, increasing latency for read operations.
- Extremely high write QPS may overwhelm the cluster, causing service interruptions.

Thus, it is strongly recommended that business sides implement write QPS flow control during bulk data ingestion.

The client-side flow control approach involves:

1. Determining the total QPS limit (e.g., 10,000/s) and the number of concurrent client threads (e.g., 50), then calculating the per-thread QPS limit (e.g., 10,000/50 = 200).
2. For each client thread, use a flow control tool to restrict QPS within the desired range. If the QPS limit is exceeded, a simple `sleep` mechanism is applied to wait. We provide a flow control utility class, [`com.xiaomi.infra.pegasus.tools.FlowController`](https://github.com/XiaoMi/pegasus-java-client/blob/thrift-0.11.0-inlined/src/main/java/com/xiaomi/infra/pegasus/tools/FlowController.java), which encapsulates the QPS calculation and `sleep` logic for ease of use.

**Usage of `FlowController`:**

- The constructor accepts a QPS parameter to specify the flow limit (e.g., 200/s for a single thread).
- Before each write operation, call `cntl.getToken()`. This method behaves as follows:
  - If the flow limit hasn't been reached, it returns immediately, allowing the write operation to proceed.
  - If the flow limit is exceeded, the method blocks (via `sleep`) for a period to enforce the limit.
- This tool works best with synchronous interfaces; its effectiveness with asynchronous interfaces may be limited.

Example usage:

```java
FlowController cntl = new FlowController(qps);
while (true) {
    // Call getToken before operation
    cntl.getToken();
    client.set(...);
}
cntl.stop();
```

For distributed bulk data ingestion, determine the total concurrent tasks, then divide the total QPS limit by the number of tasks to get the per-task QPS limit, and apply `FlowController` accordingly.

## Paginated Queries

Similar to implementing pagination for web lists, a typical use case involves displaying a fixed number of `SortKey` values per page under a single `HashKey`, with subsequent pages showing the next set of `SortKey` values.

Pegasus supports multiple approaches for paginated queries:

1. Fetch all data under the `HashKey` in one time, cache and implement pagination logic on the client side.
2. **Forward pagination**: Use [`multiGet()`](#multiget) or [`getScanner()`](#getscanner), both of which support range queries on `SortKey`.
3. **Reverse pagination**: Use [`multiGet()`](#multiget), which supports reverse-order queries on `SortKey`.

### Forward Pagination

Using the `getScanner` interface:

```java
ScanOptions options = new ScanOptions();
options.startInclusive = true;
options.stopInclusive = false;
options.batchSize = 20; // Limit page size to 20
byte[] startSortKey = null;
byte[] stopSortKey = null;
PegasusScannerInterface scanner =
  client.getScanner(tableName, hashKey, startSortKey, stopSortKey, options);

// Synchronous retrieval
Pair<Pair<byte[], byte[]>, byte[]> item;
while ((item = scanner.next()) != null) {
  // ... //
}

// Asynchronous retrieval
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

If using `multiGet`, set `maxFetchCount` in `MultiGetOptions` to limit the number of items per page:

```java
// Fetch first page
MultiGetOptions options = new MultiGetOptions();
options.startInclusive = true;
options.stopInclusive = false;
int maxFetchCount = 20; // Limit page size to 20
int maxFetchSize = 20000; // Limit total bytes per page to 20,000
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

// Fetch next page
options.startInclusive = false;
options.stopInclusive = false;
startSortKey = values.get(values.size() - 1); // Use the last (max) value from the previous page as the start for the next
stopSortKey = null;
allFetched =
    client.multiGet(
        tableName, hashKey, startSortKey, stopSortKey, options,
        maxFetchCount, maxFetchSize, values);
if (allFetched) {
  return;
}
```

### Reverse Pagination

For reverse pagination, use the `multiGet` interface with `reverse=true` in the options:

```java
MultiGetOptions options = new MultiGetOptions();
options.startInclusive = true;
options.stopInclusive = false;
options.reverse = true;
```

## Data Serialization

Pegasus stores keys and values as raw byte arrays (`byte[]` in Java), while user data is typically structured as classes or objects. Thus, **serialization** is required to convert user data into byte arrays before storage, and **deserialization** is needed to reconstruct the data when reading from Pegasus. These processes are typically paired, so we focus on serialization here.

Common serialization methods include:

- **JSON**: Human-readable but space-inefficient (not recommended).
- **Thrift**: Offers multiple compact protocols (e.g., binary). We recommend `tcompact` for higher compression.
- **Protocol Buffers**: Similar to thrift; recommend binary format serialization.

Example for Thrift serialization using `tcompact` protocol:

```java
import org.apache.thrift.TSerializer;
import org.apache.thrift.protocol.TCompactProtocol;

TSerializer serializer = new TSerializer(new TCompactProtocol.Factory()); 
byte[] bytes = serializer.serialize(data);
```

## Data Compression

For applications with large values (≥2KB), we recommend using [Facebook's Zstandard (Zstd)](https://github.com/facebook/zstd) compression on the client side to reduce value size, improving Pegasus stability and performance. Zstd offers a good balance between compression ratio and speed.

Starting with Java Client v1.11.3, we provide [`com.xiaomi.infra.pegasus.tools.ZstdWrapper`](https://github.com/XiaoMi/pegasus-java-client/blob/thrift-0.11.0-inlined/src/main/java/com/xiaomi/infra/pegasus/tools/ZstdWrapper.java) for easy compression.

Example usage:

```java
byte[] value = "xxx";

    // write the record into pegasus
    table.set("h".getBytes(), "s".getBytes(), ZstdWrapper.compress(value), 1000);

    // read the record from pegasus
    byte[] compressedBuf = table.get("h".getBytes(), "s".getBytes(), 1000);

    // decompress the value
    byte[] orginalValue = ZstdWrapper.decompress(compressedBuf);
```

Refer to the test case [`TestZstdWrapper.java`](https://github.com/XiaoMi/pegasus-java-client/blob/thrift-0.11.0-inlined/src/test/java/com/xiaomi/infra/pegasus/tools/TestZstdWrapper.java) for more details.

Both optimizations—[data serialization](#data-serialization) and [data compression](#data-compression)—trade client-side CPU for improved cluster stability and performance, which is generally worthwhile.

For existing tables without client-side compression, follow these steps to adopt compression:

1. **[Evaluate Compression Benefits](#evaluating-compression-benefits)**: Assess potential compression ratios.
2. **[Use Compatibility Mode](#using-compatibility-compression)**: Upgrade client logic to support compression while maintaining backward compatibility.

### Evaluating Compression Benefits

For existing tables that originally did not use client-side compression, how to quickly evaluate the potential benefits after enabling client-side compression?

Prerequisites:

* Production cluster: `user_cluster` with meta server address `${user_cluster_meta_list}`, containing user table `user_table`.
* Test cluster: `test_cluster` with meta server address `${test_cluster_meta_list}`.
* [Shell tool](/overview/shell): Version 1.11.3 or higher; modify the configuration file `src/shell/config.ini` to add access configuration for `test_cluster`.
* [Java client tool](#getting-the-java-client): Version 1.11.4 or higher; modify the configuration file `pegasus.properties` to set `meta_servers = ${test_cluster_meta_list}`.

Steps:

1. Use the shell tool's `create` command to create test tables `user_table_no_compress` and `user_table_zstd_compress` in the test cluster:

```
./run.sh shell --cluster ${test_cluster_meta_list}
>>> create user_table_no_compress -p 8 -r 3
>>> create user_table_zstd_compress -p 8 -r 3
```

2. Use the shell tool's `copy_data` command to copy partial data from the production cluster's `user_table` to the test cluster's `user_table_no_compress` (interrupt with Ctrl-C after sufficient data is copied):

```
./run.sh shell --cluster ${user_cluster_meta_list}
>>> use user_table
>>> copy_data -c test_cluster -a user_table_no_compress
```

3. Use the Java client tool's `copy_data` command to copy data from `user_table_no_compress` to `user_table_zstd_compress` with zstd compression enabled for writing:

```
./PegasusCli file://./pegasus.properties user_table_no_compress \
    copy_data file://./pegasus.properties user_table_zstd_compress none zstd
```

4. Use the shell tool's `count_data` command to compare data sizes between the two test tables and calculate compression ratio:

```
./run.sh shell --cluster ${test_cluster_meta_list}
>>> use user_table_no_compress 
>>> count_data -a
>>> use user_table_zstd_compress 
>>> count_data -a
```

### Using Compatibility Compression

When a business table contains existing uncompressed data and client-side compression is later enabled, newly written compressed data will coexist with old uncompressed data (having the same hashKey and sortKey), resulting in a mixed state where:

* Some values store uncompressed data
* Some values store compressed data

This requires the client to maintain compatibility when reading data - being able to handle both compressed and uncompressed values.

Based on the fact that zstd decompression will almost always fail when applied to uncompressed data, the client-side reading logic should:

1. First attempt to decompress the retrieved value. If successful, the data is compressed.
2. If decompression fails, treat the data as uncompressed.

Sample code:

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

Meanwhile, background tools can gradually replace uncompressed data with compressed versions while maintaining consistency:

* Scan the table record by record
* For uncompressed data, convert it to compressed format
* Use check-and-set atomic operations for replacement

## Client Connection Warm-Up

We provide connection warm-up functionality that prefetches routing tables and establishes connections during `openTable`, preventing slow first RPC calls caused by these initialization steps.

Sample code:

```java
  PegasusTableInterface table = client.openTable(tableName);
```

# Frequently Asked Questions