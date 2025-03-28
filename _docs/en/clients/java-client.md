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

Choose the version you to use and build the client. It is recommended to use the [latest release version](https://github.com/xiaomi/pegasus-java-client/releases):

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