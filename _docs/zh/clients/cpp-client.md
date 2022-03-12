---
permalink: clients/cpp-client
---

# 获取Cpp客户端
首先需要[编译Pegasus](/_docs/zh/build)，编译完成后运行以下命令可以打包生产Cpp客户端库：
```
./run.sh pack_client
```
运行成功后，会在本地文件夹下生产pegasus-client-{version}-{platform}-{buildType}的文件夹以及tar.gz文件。在文件夹里面有个sample/文件夹，进去后可以运行make编译示例程序。

# 配置文件
Cpp客户端由于使用了rdsn框架，所以配置文件较为复杂，如下：
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
配置文件的具体解释，请移步[配置说明](/_docs/zh/administration/config.md)。

# 接口定义
## 创建Client实例
客户端工厂类
```
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
客户端的初始化，实际上是对rdsn框架初始化
```
if (!pegasus::pegasus_client_factory::initialize("config.ini")) {
    fprintf(stderr, "ERROR: init pegasus failed\n");
    return -1;
}
/**succeed， continue**/
```
注：
 * 参数：config_file 见 配置文件 的介绍
 * 返回值：bool值，true代表初始化成功，false初始化失败
 * 该函数只需在一个进程生命周期内调用一次即可，并且非线程安全的

获取客户端
```
pegasus::pegasus_client* pg_client = pegasus::pegasus_client_factory::get_client("cluster_name", "table_name");
if (pg_client == nullptr) {
    fprintf(stderr, "ERROR: get pegasus client failed\n");
    return -1;
}
/***  do what you want with pg_client ****/
```
注意： get_client返回值不能明确的调用delete，也不能用智能指针封装，框架在停止的时候自动释放（底层使用单例来保存）

## pegasus_client接口
Cpp客户端提供两种接口，异步API 和 同步API，同步API是基于异步API实现的，具体如下：

### set
写单行数据
```
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
注：
 * internal_info 结构如下，主要是记录在写入成功之后，该条数据的一些信息，在使用之前需要判断info是否为空
```
    struct internal_info
    {
        int32_t app_id;
        int32_t partition_index;
        int64_t decree;
        std::string server;
        internal_info() : app_id(-1), partition_index(-1), decree(-1) {}
     }
```
 * 返回值：int值来表示是否成功，通过get_error_string() 函数来判断返回值的意义（下面的所有同步接口的返回值，都可以通过该函数判断返回值意义）
```
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
异步写单行数据
```
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
写多条数据（同一hashkey下面）
```
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
异步写多条数据
```
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
读取一条数据
```
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
异步读取一条数据
```
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
读取多条数据
```
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
注：max_fetch_count 和 max_fetch_size 分别从kv-pair的条数 和 总的大小来限制multi_get的返回值

### async_multi_get
异步读取多条数据
```
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
获取hashkey下面的多个sortkey，不返回value
```
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
注：max_fetch_count 和 max_fetch_size 分别限制返回的sortkey的个数与总大小（计算大小的时候，为每条sortkey都计算一次hashkey的大小）

### async_multi_get_sortkeys
异步获取hashkey下面的多个sortkey（不包含value）
```
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
判断单条数据是否存在
```
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
统计hashkey下面的sortkey个数
```
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
删除单条数据
```
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
异步删除单条数据
```
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
删除多条数据
```
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
异步的删除多条数据
```
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

### ttl
获取单行数据的TTL时间。TTL表示Time To Live，表示该数据还能存活多久。如果超过存活时间，数据就读不到了
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
获取针对某个hashkey下的sortkey区间 [sortkeyA ~ sortkeyB)的一个scanner
```
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
异步获取针对某个hashkey下的sortkey区间 [sortkeyA ~ sortkeyB)的一个scanner
```
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
获取一个遍历所有数据的scanner
```
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
异步获取一个遍历所有数据的scanner
```
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
