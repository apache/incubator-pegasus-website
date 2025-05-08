---
permalink: clients/cpp-client
---

# Obtain Pegasus C++ client

First, you need to compile [Pegasus](/overview/compilation). After compilation is complete, run the following command to package the production C++ client library:

```
./run.sh pack_client
```
After successful execution, a folder named `pegasus-client-{version}-{platform}-{buildType}` and a corresponding `.tar.gz` file will be generated in the local directory. Inside this folder, there is a `sample/` subdirectory. Navigate into it and run `make` to compile the example programs.



# Configuration File

The C++ client uses the RDSN framework, so its configuration file is relatively complex, as shown below:

```
[apps..default]
run = true
count = 1
;network.client.RPC_CHANNEL_TCP = dsn::tools::sim_network_provider, 65536
;network.client.RPC_CHANNEL_UDP = dsn::tools::sim_network_provider, 65536
;network.server.0.RPC_CHANNEL_TCP = dsn::tools::sim_network_provider, 65536

[apps.mimic]
type = dsn.app.mimic
arguments =
pools = THREAD_POOL_DEFAULT
run = true
count = 1

[core]
;tool = simulator
;tool = fastrun
tool = nativerun
;toollets = tracer
;toollets = tracer, profiler, fault_injector
pause_on_start = false
cli_local = false
cli_remote = false

start_nfs = false

logging_start_level = LOG_LEVEL_DEBUG
logging_factory_name = dsn::tools::simple_logger
logging_flush_on_exit = true

enable_default_app_mimic = true

data_dir = ./data

[tools.simple_logger]
short_header = true
fast_flush = true
max_number_of_log_files_on_disk = 10
stderr_start_level = LOG_LEVEL_ERROR

[tools.hpc_logger]
per_thread_buffer_bytes = 8192
max_number_of_log_files_on_disk = 10

[tools.simulator]
random_seed = 0

[network]
; how many network threads for network library(used by asio)
io_service_worker_count = 4

; specification for each thread pool
[threadpool..default]
worker_count = 4

[threadpool.THREAD_POOL_DEFAULT]
name = default
partitioned = false
max_input_queue_length = 1024
worker_priority = THREAD_xPRIORITY_NORMAL
worker_count = 4

[task..default]
is_trace = false
is_profile = false
allow_inline = false
fast_execution_in_network_thread = false
rpc_call_header_format = NET_HDR_DSN
rpc_call_channel = RPC_CHANNEL_TCP
rpc_timeout_milliseconds = 5000

[pegasus.clusters]
onebox = @LOCAL_IP@:34601,@LOCAL_IP@:34602,@LOCAL_IP@:34603
another_cluster = @SOME_IP@:34601,@SOME_IP@:34601,@SOME_IP@:34601
```
For detailed explanations of the configuration file, please refer to [Configuration Guide](/administration/config).



# Interface Definition

## Creating a Client Instance

Client Factory Class
```c++
namespace pegasus {
class pegasus_client_factory
{
public:
    ///
    /// \brief initialize
    /// initialize pegasus client lib. must call this function before anything else.
    /// \param config_file
    /// the configuration file of client lib
    /// \return
    /// true indicate the initailize is success.
    ///
    static bool initialize(const char *config_file);

    ///
    /// \brief get_client
    /// get an instance for a given cluster and a given app name.
    /// \param cluster_name
    /// the pegasus cluster name.
    /// a cluster can have multiple apps.
    /// \param app_name
    /// an app is a logical isolated k-v store.
    /// a cluster can have multiple apps.
    /// \return
    /// the client instance. DO NOT delete this client even after usage.
    static pegasus_client *get_client(const char *cluster_name, const char *app_name);
};
} //end namespace
```
Client initialization essentially initializes the underlying RDSN framework.

```c++
if (!pegasus::pegasus_client_factory::initialize("config.ini")) {
    fprintf(stderr, "ERROR: init pegasus failed\n");
    return -1;
}
/**succeed， continue**/
```
**Note：**

- **Parameter (`config_file`):** Refer to the Configuration File section for details.
- **Return Value (`bool`):**
  - `true`: Initialization succeeded.
  - `false`: Initialization failed.
- **Usage Guidelines:**
  - This function only needs to be called **once** during a process's lifecycle.
  - **Not thread-safe** – ensure proper synchronization if called in a multi-threaded environment.

```c++
pegasus::pegasus_client* pg_client = pegasus::pegasus_client_factory::get_client("cluster_name", "table_name");
if (pg_client == nullptr) {
    fprintf(stderr, "ERROR: get pegasus client failed\n");
    return -1;
}
/***  do what you want with pg_client ****/
```
- Do NOT explicitly call `delete`on the `get_client()` return value. Do NOT wrap the pointer in smart pointers (e.g., `std::shared_ptr`). The framework **automatically releases** the client during shutdown (managed internally via singleton).

## pegasus_client Interface 
The C++ client provides two types of interfaces: asynchronous APIs and synchronous APIs. The synchronous APIs are implemented based on the asynchronous APIs, as detailed below:

### set
Write single-row data
```c++
    ///
    /// \brief set
    ///     store the k-v to the cluster.
    ///     key is composed of hashkey and sortkey.
    /// \param hashkey
    /// used to decide which partition to put this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be sorted by sortkey.
    /// \param value
    /// the value we want to store.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \param ttl_seconds
    /// time to live of this value, if expired, will return not found; 0 means no ttl
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string()
    ///
    virtual int set(const std::string &hashkey,
                    const std::string &sortkey,
                    const std::string &value,
                    int timeout_milliseconds = 5000,
                    int ttl_seconds = 0,
                    internal_info *info = NULL) = 0;
```
**Note:**

The `internal_info` structure records metadata about successfully written data. Before using it, check if `internal_info` is non-null.

```c++
    struct internal_info
    {
        int32_t app_id;
        int32_t partition_index;
        int64_t decree;
        std::string server;
        internal_info() : app_id(-1), partition_index(-1), decree(-1) {}
     }
```
 * Return value: An int value indicating success/failure. Use `get_error_string()` to interpret the return value's meaning. (All synchronous interfaces below can use this function to interpret their return values.)
```c++
    ///
    /// \brief get_error_string
    /// get error string
    /// all the function above return an int value that indicates an error can be converted into a
    /// string for human reading.
    /// \param error_code
    /// all the error code are defined in "error_def.h"
    /// \return
    ///
    virtual const char *get_error_string(int error_code) const = 0;
```
### async_set
Asynchronous write single row data
```c++
    ///
    /// \brief asynchronous set
    ///     store the k-v to the cluster.
    ///     will not be blocked, return immediately.
    ///     key is composed of hashkey and sortkey.
    /// \param hashkey
    /// used to decide which partition to put this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be stored by sortkey.
    /// \param value
    /// the value we want to store.
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error.
    /// \param ttl_seconds
    /// time to live of this value, if expired, will return not found; 0 means no ttl.
    /// \return
    /// void.
    ///
    virtual void async_set(const std::string &hashkey,
                           const std::string &sortkey,
                           const std::string &value,
                           async_set_callback_t &&callback = nullptr,
                           int timeout_milliseconds = 5000,
                           int ttl_seconds = 0) = 0;
```

### multi_set

Write multiple data rows (under the same hashkey)

```c++
    ///
    /// \brief multi_set (guarantee atomicity)
    ///     store multiple k-v of the same hashkey to the cluster.
    /// \param hashkey
    /// used to decide which partition to put this k-v
    /// \param kvs
    /// all <sortkey,value> pairs to be set. should not be empty
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \param ttl_seconds
    /// time to live of this value, if expired, will return not found; 0 means no ttl
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    /// return PERR_INVALID_ARGUMENT if param kvs is empty.
    ///
    virtual int multi_set(const std::string &hashkey,
                          const std::map<std::string, std::string> &kvs,
                          int timeout_milliseconds = 5000,
                          int ttl_seconds = 0,
                          internal_info *info = NULL) = 0;
```

### async_multi_set

Asynchronous write multiple data rows

```c++
    ///
    /// \brief asynchronous multi_set (guarantee atomicity)
    ///     store multiple k-v of the same hashkey to the cluster.
    ///     will not be blocked, return immediately.
    /// \param hashkey
    /// used to decide which partition to put this k-v
    /// \param kvs
    /// all <sortkey,value> pairs to be set. should not be empty
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \param ttl_seconds
    /// time to live of this value, if expired, will return not found; 0 means no ttl
    /// \return
    /// void.
    ///
    virtual void async_multi_set(const std::string &hashkey,
                                 const std::map<std::string, std::string> &kvs,
                                 async_multi_set_callback_t &&callback = nullptr,
                                 int timeout_milliseconds = 5000,
                                 int ttl_seconds = 0) = 0;
```

### get
Read a single data row
```c++
    ///
    /// \brief get
    ///     get value by key from the cluster.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be sorted by sortkey.
    /// \param value
    /// the returned value will be put into it.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    /// returns PERR_NOT_FOUND if no value is found under the <hashkey,sortkey>.
    ///
    virtual int get(const std::string &hashkey,
                    const std::string &sortkey,
                    std::string &value,
                    int timeout_milliseconds = 5000,
                    internal_info *info = NULL) = 0;
```

### async_get
Asynchronous read single data row
```c++
    ///
    /// \brief asynchronous get
    ///     get value by key from the cluster.
    ///     will not be blocked, return immediately.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be sorted by sortkey.
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// void.
    ///
    virtual void async_get(const std::string &hashkey,
                           const std::string &sortkey,
                           async_get_callback_t &&callback = nullptr,
                           int timeout_milliseconds = 5000) = 0;
```

### multi_get
Read multiple data rows
```c++
    ///
    /// \brief multi_get
    ///     get multiple value by key from the cluster.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkeys
    /// all the k-v under hashkey will be sorted by sortkey.
    /// if empty, means fetch all sortkeys under the hashkey.
    /// \param values
    /// the returned <sortkey,value> pairs will be put into it.
    /// if data is not found for some <hashkey,sortkey>, then it will not appear in the map.
    /// \param max_fetch_count
    /// max count of k-v pairs to be fetched. max_fetch_count <= 0 means no limit.
    /// \param max_fetch_size
    /// max size of k-v pairs to be fetched. max_fetch_size <= 0 means no limit.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    /// returns PERR_OK if fetch done, even no data is returned.
    /// returns PERR_INCOMPLETE is only partial data is fetched.
    ///
    virtual int multi_get(const std::string &hashkey,
                          const std::set<std::string> &sortkeys,
                          std::map<std::string, std::string> &values,
                          int max_fetch_count = 100,
                          int max_fetch_size = 1000000,
                          int timeout_milliseconds = 5000,
                          internal_info *info = NULL) = 0;
```
Note: `max_fetch_count` and `max_fetch_size` limit the `multi_get` return values by the number of kv-pairs and total size respectively.

### async_multi_get
Asynchronous read multiple data rows.
```c++
    ///
    /// \brief asynchronous multi_get
    ///     get multiple value by key from the cluster.
    ///     will not be blocked, return immediately.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkeys
    /// all the k-v under hashkey will be sorted by sortkey.
    /// if empty, means fetch all sortkeys under the hashkey.
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param max_fetch_count
    /// max count of k-v pairs to be fetched. max_fetch_count <= 0 means no limit.
    /// \param max_fetch_size
    /// max size of k-v pairs to be fetched. max_fetch_size <= 0 means no limit.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// void.
    ///
    virtual void async_multi_get(const std::string &hashkey,
                                 const std::set<std::string> &sortkeys,
                                 async_multi_get_callback_t &&callback = nullptr,
                                 int max_fetch_count = 100,
                                 int max_fetch_size = 1000000,
                                 int timeout_milliseconds = 5000) = 0;
```

### multi_get_sortkeys
Get multiple sortkeys under a hashkey (values not returned)

```c++
    ///
    /// \brief multi_get_sortkeys
    ///     get multiple sort keys by hash key from the cluster.
    ///     only fetch sort keys, but not fetch values.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkeys
    /// the returned sort keys will be put into it.
    /// \param max_fetch_count
    /// max count of sort keys to be fetched. max_fetch_count <= 0 means no limit.
    /// \param max_fetch_size
    /// max size of sort keys to be fetched. max_fetch_size <= 0 means no limit.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    /// returns PERR_OK if fetch done, even no data is returned.
    /// returns PERR_INCOMPLETE is only partial data is fetched.
    ///
    virtual int multi_get_sortkeys(const std::string &hashkey,
                                   std::set<std::string> &sortkeys,
                                   int max_fetch_count = 100,
                                   int max_fetch_size = 1000000,
                                   int timeout_milliseconds = 5000,
                                   internal_info *info = NULL) = 0;
```
Note: `max_fetch_count` and `max_fetch_size` limit the number of returned sortkeys and total size respectively (when calculating size, the hashkey size is counted for each sortkey).

### async_multi_get_sortkeys
Asynchronously fetch multiple sortkeys under a hashkey (values not returned)

```c++
    ///
    /// \brief asynchronous multi_get_sortkeys
    ///     get multiple sort keys by hash key from the cluster.
    ///     only fetch sort keys, but not fetch values.
    ///     will not be blocked, return immediately.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param max_fetch_count
    /// max count of sort keys to be fetched. max_fetch_count <= 0 means no limit.
    /// \param max_fetch_size
    /// max size of sort keys to be fetched. max_fetch_size <= 0 means no limit.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// void.
    ///
    virtual void async_multi_get_sortkeys(const std::string &hashkey,
                                          async_multi_get_sortkeys_callback_t &&callback = nullptr,
                                          int max_fetch_count = 100,
                                          int max_fetch_size = 1000000,
                                          int timeout_milliseconds = 5000) = 0;
```

### exist
Check if a single data row exists.
```c++
    ///
    /// \brief exist
    ///     check value exist by key from the cluster.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be sorted by sortkey.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    /// returns PERR_OK if exist.
    /// returns PERR_NOT_FOUND if not exist.
    ///
    virtual int exist(const std::string &hashkey,
                      const std::string &sortkey,
                      int timeout_milliseconds = 5000,
                      internal_info *info = NULL) = 0;
```

### sortkey_count
Count the number of sortkeys under a hashkey.
```c++
    ///
    /// \brief sortkey_count
    ///     get sortkey count by hashkey from the cluster.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param count
    /// the returned sortkey count
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    ///
    virtual int sortkey_count(const std::string &hashkey,
                              int64_t &count,
                              int timeout_milliseconds = 5000,
                              internal_info *info = NULL) = 0;
```

### del
Delete a single data row.
```c++
    ///
    /// \brief del
    ///     del stored k-v by key from cluster
    ///     key is composed of hashkey and sortkey. must provide both to get the value.
    /// \param hashkey
    /// used to decide from which partition to del this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be sorted by sortkey.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string()
    ///
    virtual int del(const std::string &hashkey,
                    const std::string &sortkey,
                    int timeout_milliseconds = 5000,
                    internal_info *info = NULL) = 0;
```

### async_del
Asynchronous delete single data row.
```c++
    ///
    /// \brief asynchronous del
    ///     del stored k-v by key from cluster
    ///     key is composed of hashkey and sortkey. must provide both to get the value.
    ///     will not be blocked, return immediately.
    /// \param hashkey
    /// used to decide from which partition to del this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be sorted by sortkey.
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// void.
    ///
    virtual void async_del(const std::string &hashkey,
                           const std::string &sortkey,
                           async_del_callback_t &&callback = nullptr,
                           int timeout_milliseconds = 5000) = 0;
```

### multi_del
Delete multiple data rows.
```c++
    ///
    /// \brief multi_del
    ///     delete multiple value by key from the cluster.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkeys
    /// all the k-v under hashkey will be sorted by sortkey. should not be empty.
    /// \param deleted_count
    /// return count of deleted k-v pairs.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    ///
    virtual int multi_del(const std::string &hashkey,
                          const std::set<std::string> &sortkeys,
                          int64_t &deleted_count,
                          int timeout_milliseconds = 5000,
                          internal_info *info = NULL) = 0;
```

### async_multi_del

Asynchronously delete multiple data rows.
```c++
    ///
    /// \brief asynchronous multi_del
    ///     delete multiple value by key from the cluster.
    ///     will not be blocked, return immediately.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkeys
    /// all the k-v under hashkey will be sorted by sortkey. should not be empty.
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// void.
    ///
    virtual void async_multi_del(const std::string &hashkey,
                                 const std::set<std::string> &sortkeys,
                                 async_multi_del_callback_t &&callback = nullptr,
                                 int timeout_milliseconds = 5000) = 0;
```

### incr

Increment

```c++
    ///
    /// \brief incr
    ///     atomically increment value by key from the cluster.
    ///     key is composed of hashkey and sortkey. must provide both to get the value.
    ///
    ///     the increment semantic is the same as redis:
    ///       - if old data is not found or empty, then set initial value to 0.
    ///       - if old data is not an integer or out of range, then return PERR_INVALID_ARGUMENT,
    ///         and return `new_value' as 0.
    ///       - if new value is out of range, then return PERR_INVALID_ARGUMENT, and return old
    ///         value in `new_value'.
    ///
    ///     if ttl_seconds == 0, the semantic is also the same as redis:
    ///       - normally, increment will preserve the original ttl.
    ///       - if old data is expired by ttl, then set initial value to 0 and set no ttl.
    ///     if ttl_seconds > 0, then update with the new ttl if incr succeed.
    ///     if ttl_seconds == -1, then update to no ttl if incr succeed.
    ///
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be sorted by sortkey.
    /// \param increment
    /// the value we want to increment.
    /// \param new_value
    /// out param to return the new value if increment succeed.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \param ttl_seconds
    /// time to live of this value.
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    ///
    virtual int incr(const std::string &hashkey,
                     const std::string &sortkey,
                     int64_t increment,
                     int64_t &new_value,
                     int timeout_milliseconds = 5000,
                     int ttl_seconds = 0,
                     internal_info *info = nullptr) = 0;
```

### async_incr

Asynchronous increment

```c++
    ///
    /// \brief asynchronous incr
    ///     atomically increment value by key from the cluster.
    ///     will not be blocked, return immediately.
    ///
    ///     the increment semantic is the same as redis:
    ///       - if old data is not found or empty, then set initial value to 0.
    ///       - if old data is not an integer or out of range, then return PERR_INVALID_ARGUMENT,
    ///         and return `new_value' as 0.
    ///       - if new value is out of range, then return PERR_INVALID_ARGUMENT, and return old
    ///         value in `new_value'.
    ///
    ///     if ttl_seconds == 0, the semantic is also the same as redis:
    ///       - normally, increment will preserve the original ttl.
    ///       - if old data is expired by ttl, then set initial value to 0 and set no ttl.
    ///     if ttl_seconds > 0, then update with the new ttl if incr succeed.
    ///     if ttl_seconds == -1, then update to no ttl if incr succeed.
    ///
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be sorted by sortkey.
    /// \param increment
    /// the value we want to increment.
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \param ttl_seconds
    /// time to live of this value.
    /// \return
    /// void.
    ///
    virtual void async_incr(const std::string &hashkey,
                            const std::string &sortkey,
                            int64_t increment,
                            async_incr_callback_t &&callback = nullptr,
                            int timeout_milliseconds = 5000,
                            int ttl_seconds = 0) = 0;
```

### check_and_set

```c++
    ///
    /// \brief check_and_set
    ///     atomically check and set value by key from the cluster.
    ///     the value will be set if and only if check passed.
    ///     the sort key for checking and setting can be the same or different.
    /// \param hash_key
    /// used to decide which partition to get this k-v
    /// \param check_sort_key
    /// the sort key to check.
    /// \param check_type
    /// the check type.
    /// \param check_operand
    /// the check operand.
    /// \param set_sort_key
    /// the sort key to set value if check passed.
    /// \param set_value
    /// the value to set if check passed.
    /// \param options
    /// the check-and-set options.
    /// \param results
    /// the check-and-set results.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    /// if check type is int compare, and check_operand/check_value is not integer
    /// or out of range, then return PERR_INVALID_ARGUMENT.
    ///
    virtual int check_and_set(const std::string &hash_key,
                              const std::string &check_sort_key,
                              cas_check_type check_type,
                              const std::string &check_operand,
                              const std::string &set_sort_key,
                              const std::string &set_value,
                              const check_and_set_options &options,
                              check_and_set_results &results,
                              int timeout_milliseconds = 5000,
                              internal_info *info = nullptr) = 0;
```

### async_check_and_set

```c++
    ///
    /// \brief asynchronous check_and_set
    ///     atomically check and set value by key from the cluster.
    ///     will not be blocked, return immediately.
    /// \param hash_key
    /// used to decide which partition to get this k-v
    /// \param check_sort_key
    /// the sort key to check.
    /// \param check_type
    /// the check type.
    /// \param check_operand
    /// the check operand.
    /// \param set_sort_key
    /// the sort key to set value if check passed.
    /// \param set_value
    /// the value to set if check passed.
    /// \param options
    /// the check-and-set options.
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// void.
    ///
    virtual void async_check_and_set(const std::string &hash_key,
                                     const std::string &check_sort_key,
                                     cas_check_type check_type,
                                     const std::string &check_operand,
                                     const std::string &set_sort_key,
                                     const std::string &set_value,
                                     const check_and_set_options &options,
                                     async_check_and_set_callback_t &&callback = nullptr,
                                     int timeout_milliseconds = 5000) = 0;
```

### check_and_mutate

```c++
    ///
    /// \brief check_and_mutate
    ///     atomically check and mutate from the cluster.
    ///     the mutations will be applied if and only if check passed.
    /// \param hash_key
    /// used to decide which partition to get this k-v
    /// \param check_sort_key
    /// the sort key to check.
    /// \param check_type
    /// the check type.
    /// \param check_operand
    /// the check operand.
    /// \param mutations
    /// the list of mutations to perform if check condition is satisfied.
    /// \param options
    /// the check-and-mutate options.
    /// \param results
    /// the check-and-mutate results.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string().
    /// if check type is int compare, and check_operand/check_value is not integer
    /// or out of range, then return PERR_INVALID_ARGUMENT.
    ///
    virtual int check_and_mutate(const std::string &hash_key,
                                 const std::string &check_sort_key,
                                 cas_check_type check_type,
                                 const std::string &check_operand,
                                 const mutations &mutations,
                                 const check_and_mutate_options &options,
                                 check_and_mutate_results &results,
                                 int timeout_milliseconds = 5000,
                                 internal_info *info = nullptr) = 0;

```

### async_check_and_mutate

```c++
    ///
    /// \brief asynchronous check_and_mutate
    ///     atomically check and mutate from the cluster.
    ///     will not be blocked, return immediately.
    /// \param hash_key
    /// used to decide which partition to get this k-v
    /// \param check_sort_key
    /// the sort key to check.
    /// \param check_type
    /// the check type.
    /// \param check_operand
    /// the check operand.
    /// \param mutations
    /// the list of mutations to perform if check condition is satisfied.
    /// \param options
    /// the check-and-mutate options.
    /// \param callback
    /// the callback function will be invoked after operation finished or error occurred.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// void.
    ///
    virtual void async_check_and_mutate(const std::string &hash_key,
                                        const std::string &check_sort_key,
                                        cas_check_type check_type,
                                        const std::string &check_operand,
                                        const mutations &mutations,
                                        const check_and_mutate_options &options,
                                        async_check_and_mutate_callback_t &&callback = nullptr,
                                        int timeout_milliseconds = 5000) = 0;
```

### ttl

Get the TTL (Time To Live) of a single data row. TTL indicates how long the data remains valid. Data becomes unreadable after the TTL expires.

```
    ///
    /// \brief ttl (time to live)
    ///     get ttl in seconds of this k-v.
    ///     key is composed of hashkey and sortkey. must provide both to get the value.
    /// \param hashkey
    /// used to decide which partition to get this k-v
    /// \param sortkey
    /// all the k-v under hashkey will be sorted by sortkey.
    /// \param ttl_seconds
    /// the returned ttl value in seconds.
    /// \param timeout_milliseconds
    /// if wait longer than this value, will return time out error
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string()
    ///
    virtual int ttl(const std::string &hashkey,
                    const std::string &sortkey,
                    int &ttl_seconds,
                    int timeout_milliseconds = 5000,
                    internal_info *info = NULL) = 0;
```

### get_scanner
Get a scanner for the sortkey range [sortkeyA ~ sortkeyB) under a specific hashkey.

```c++
    ///
    /// \brief get hash scanner
    ///     get scanner for [start_sortkey, stop_sortkey) of hashkey
    /// \param hashkey
    /// cannot be empty
    /// \param start_sortkey
    /// sortkey to start with
    /// \param stop_sortkey
    /// sortkey to stop. ""(empty string) represents the max key
    /// \param options
    /// which used to indicate scan options, like which bound is inclusive
    /// \param scanner
    /// out param, used to get k-v
    /// this pointer should be deleted when scan complete
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string()
    ///
    virtual int get_scanner(const std::string &hashkey,
                            const std::string &start_sortkey, // start from beginning if this set ""
                            const std::string &stop_sortkey,  // to the last item if this set ""
                            const scan_options &options,
                            pegasus_scanner *&scanner) = 0;
```

### async_get_scanner
Asynchronously get a scanner for the sortkey range [sortkeyA ~ sortkeyB) under a specific hashkey.

```c++
    ///
    /// \brief async get hash scanner
    ///     get scanner for [start_sortkey, stop_sortkey) of hashkey
    ///     will not be blocked, return immediately.
    /// \param hashkey
    /// cannot be empty
    /// \param start_sortkey
    /// sortkey to start with
    /// \param stop_sortkey
    /// sortkey to stop. ""(empty string) represents the max key
    /// \param options
    /// which used to indicate scan options, like which bound is inclusive
    /// \param callback
    /// return status and scanner in callback, and the latter should be deleted when scan complete
    ///
    virtual void
    async_get_scanner(const std::string &hashkey,
                      const std::string &start_sortkey, // start from beginning if this set ""
                      const std::string &stop_sortkey,  // to the last item if this set ""
                      const scan_options &options,
                      async_get_scanner_callback_t &&callback) = 0;
```

### get_unordered_scanners
Get a scanner to iterate through all data.
```c++
    ///
    /// \brief get a bundle of scanners to iterate all k-v in table
    ///        scanners should be deleted when scan complete
    /// \param max_split_count
    /// the number of scanners returned will always <= max_split_count
    /// \param options
    /// which used to indicate scan options, like timeout_milliseconds
    /// \param scanners
    /// out param, used to get k-v
    /// these pointers should be deleted
    /// \return
    /// int, the error indicates whether or not the operation is succeeded.
    /// this error can be converted to a string using get_error_string()
    ///
    virtual int get_unordered_scanners(int max_split_count,
                                       const scan_options &options,
                                       std::vector<pegasus_scanner *> &scanners) = 0;
```

### async_get_unordered_scanners
Asynchronously get a scanner to iterate through all data.
```c++
    ///
    /// \brief async get a bundle of scanners to iterate all k-v in table
    ///        scannners return by callback should be deleted when all scan complete
    /// \param max_split_count
    /// the number of scanners returned will always <= max_split_count
    /// \param options
    /// which used to indicate scan options, like timeout_milliseconds
    /// \param callback; return status and scanner in this callback
    ///
    virtual void
    async_get_unordered_scanners(int max_split_count,
                                 const scan_options &options,
                                 async_get_unordered_scanners_callback_t &&callback) = 0;
```
