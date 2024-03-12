---
permalink: administration/config
---

# 配置组成部分

Pegasus 的配置为 ini 格式，主要有以下 section ：

## [apps..default]

各个 app 配置项的默认模板

## [apps.meta]

Pegasus Meta Server 的配置

## [apps.replica]

Pegasus Replica Server 的配置

## [apps.collector]

Pegasus Collector 的配置（2.6 版本开始已废弃）

## [core]

一个 Pegasus Service 内核引擎运行时的相关参数配置


* network：RPC 组件的相关参数配置。
* 线程池相关：Pegasus 进程中启动的各个线程池的相关参数配置。
* app 相关：app 是 rDSN 中的一个概念，可以理解成分布式系统中的 “组件” 或者 “job”，例如 Pegasus 中的 MetaServer、ReplicaServer 就各是一个 app。一个进程内可以启动多个 app，针对每个 app，可以分别配置其行为，譬如名字、端口、线程池等。
* task 相关：task 也是 rDSN 中的一个概念，可以理解成 “异步任务”。比如一个 RPC 异步调用、一个异步文件 IO 操作、一个超时事件，都是一个 task。每种 task 都有定义一个唯一的名字。针对每种 task，都可以配置其相关的行为，譬如 trace、profiler 等。
* 一致性协议相关：一致性 replication 协议的相关参数配置。
* RocksDB 相关：Pegasus 所依赖的 RocksDB 的参数配置。
* 其他：Pegasus 中一些组件模块的参数配置，譬如日志、监控、Zookeeper 配置等。

配置文件中会涉及到一些 rDSN 的概念，对这些概念的进一步理解，请参见 [rDSN 项目](https://github.com/XiaoMi/rdsn)。

下面列举出了 Pegasus 配置文件的部分说明。这些配置项有些是和 client 通用的，比如 app、task、threadpool 等，其他是 server 端所独有的。要理解这些配置的真正含义，建议先阅读 PacificA 论文，并了解清楚 rDSN 项目和 Pegasus 架构。

# 配置文件部分说明

```ini
;;;; 网络相关配置
[network]
; 负责网络 IO 的线程个数
io_service_worker_count = 4
; 每个客户端 IP 限制的连接数
conn_threshold_per_ip = 0

;;;; 线程池相关配置的默认模板
[threadpool..default]
; 线程池的默认线程数
worker_count = 4

;;;; 线程池 THREAD_POOL_REPLICATION 的配置
[threadpool.THREAD_POOL_REPLICATION]
; 线程池名称
name = replica
; rDSN 相关概念，partitioned = ture 表示每个线程有一个自己的任务队列，且 task 会根据 hash 规则分派到特定的线程执行
partitioned = true
; 线程在 OS 中的调度优先级
worker_priority = THREAD_xPRIORITY_NORMAL
; 线程池中的线程数，如果没有配置则使用默认模板的值
worker_count = 23

;;;; 线程池 XXXXX 的相关配置
[threadpool.XXXXX]
.....

;;;; meta_server 的相关配置
[meta_server]
; MetaServer 的地址列表
server_list = 127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603; MetaServer 在元数据存储服务上的根目录，一个集群的不同 meta_server 要配成相同的值，不同的集群用不同的值
cluster_root = /pegasus/my-cluster
; 元数据存储服务的实现类
meta_state_service_type = meta_state_service_zookeeper
; 元数据存储服务的初始化参数
meta_state_service_parameters =
; 分布式锁服务的实现类
distributed_lock_service_type = distributed_lock_service_zookeeper
; 分布式锁服务的初始化参数
distributed_lock_service_parameters = /pegasus/onebox/127.0.0.1
; 判断一个 ReplicaServer 是不是稳定运行的时间阈值
stable_rs_min_running_seconds = 600
; 一个 ReplicaServer 最多可以崩溃的次数，如果崩溃太频繁，就会上 MetaServer 的黑名单
max_succssive_unstable_restart = 5
; 负载均衡器的实现类
server_load_balancer_type = greedy_load_balancer
; 当一个 secondary 被移除后，等待它回来的最长时间阈值
replica_assign_delay_ms_for_dropouts = 300000
; 如果不可用节点比例太高，MetaServer 会进入 freezed 的保护状态
node_live_percentage_threshold_for_update = 50
; 如果不可用的节点个数太少，MetaServer 也会进入 freezed 的保护状态
min_live_node_count_for_unfreeze = 3
; 表删除后在回收站中默认的保留时间
hold_seconds_for_dropped_app = 604800
; MetaServer 启动时的默认 function_level 状态。steady 表示不进行负载均衡的稳定状态
meta_function_level_on_start = steady
; 如果为 true, 集群启动时就会进入 “元数据恢复” 流程
recover_from_replica_server = false
; 一个 replica group 中最多保留的副本数 (可用副本 + 尸体)
max_replicas_in_group = 4

;;;; 集群在 bootstrap 时默认要创建的表
[replication.app]
; 表名
app_name = temp
; 存储引擎类型，pegasus 表示我们基于 rocksdb 实现的存储引擎。当前只可选 pegasus
app_type = pegasus
; 分片数
partition_count = 8
; 每个分片的副本个数
max_replica_count = 3
; rDSN 参数，对于 app_type = pegasus 需要设置为 true
stateful = true
package_id =

;;;; 一致性协议相关配置，很多概念和 PacificA 相关
[replication]
; shared log 存储的文件夹路径（2.6开始已被移除）
slog_dir = /home/work/ssd1/pegasus/@cluster@
; replica 数据存储的文件夹路径列表，建议一块磁盘配置一个项。tag 为磁盘的标记名
data_dirs = tag1:/home/work/ssd2/pegasus/@cluster@,tag2:/home/work/ssd3/pegasus/@cluster@
; 黑名单文件，文件中每行是一个需忽略掉的文件夹，主要用于过滤坏盘
data_dirs_black_list_file = /home/mi/.pegasus_data_dirs_black_list
; ReplicaServer 启动时是否要拒绝掉客户端写
deny_client_on_start = false
; ReplicaServer 启动时是否等待一段时间后才开始连接 MetaServer
delay_for_fd_timeout_on_start = false
; 是否打印 commit log 的调试信息
verbose_log_on_commit = false
; primary 会定期生成一个空的写操作以检查 group 状态，是否禁止该特性
empty_write_disabled = false
; prepare 的超时时间
prepare_timeout_ms_for_secondaries = 1000
; 给 learner 发 prepare 的超时时间
prepare_timeout_ms_for_potential_secondaries = 3000
; 是否禁止掉客户端写请求的 batch 功能
batch_write_disabled = false
; 保留多少个已经 commit 的写请求在队列中
staleness_for_commit = 20
; prepare_list 的容量
max_mutation_count_in_prepare_list = 110
; 想要成功进行一次写操作，最少需要多少个副本
mutation_2pc_min_replica_count = 2
; primary 会定期推送 group 状态给其他成员，是否禁用该特性
group_check_disabled = false
; group check 的时间间隔
group_check_interval_ms = 100000
; 是否禁用定期 checkpoint 的生成
checkpoint_disabled = false
; checkpoint 的尝试触发时间间隔。注意尝试触发并不一定生成 checkpoint
checkpoint_interval_seconds = 100
checkpoint_min_decree_gap = 10000
; checkpoint 的强制触发时间间隔，强制触发会将 memtable 的数据刷出
checkpoint_max_interval_hours = 1
; 是否禁用 WAL 的垃圾回收
gc_disabled = false
; WAL 的垃圾回收间隔
gc_interval_ms = 30000
; 如果一个 replica 需要关闭，在内存中保留多长时间
gc_memory_replica_interval_ms = 300000
; 一个因为 IO 错误关闭掉的 replica，在磁盘保留多长时间
gc_disk_error_replica_interval_seconds = 172800000
; failure detector 相关参数
fd_disabled = false
fd_check_interval_seconds = 5
fd_beacon_interval_seconds = 3
fd_lease_seconds = 10
fd_grace_seconds = 15
; 每一个 private log 多大，超过了该阈值就滚动到下一个文件
log_private_file_size_mb = 32
; private log 一个 batch 的最小容量
log_private_batch_buffer_kb = 512
; private log 一个 batch 的最小条数
log_private_batch_buffer_count = 512
; 超过该事件没写 private log, 则强制刷一次
log_private_batch_buffer_flush_interval_ms = 100000
log_private_reserve_max_size_mb = 0
log_private_reserve_max_time_seconds = 0
; shared log 多大，超过该阈值就滚动到下一个文件
log_shared_file_size_mb = 32
log_shared_file_count_limit = 32
log_shared_batch_buffer_kb = 0
log_shared_force_flush = false
; replica server 会定期和 meta server 同步本机所服务的 replica。该配置表示是否禁止这一特性
config_sync_disabled = false
; 同步的时间间隔
config_sync_interval_ms = 30000
; meta server 跑负载均衡的周期
lb_interval_ms = 10000

;;;; pegasus server 层相关配置
[pegasus.server]
;;; rocksdb 相关配置
; 是否打印 Pegasus 中反应 RocksDB 运行情况的调试日志
rocksdb_verbose_log = false
; RocksDB Get 操作的慢日志阈值，如果操作时长超过了该数值，那么将会打印相关日志。0 代表不打印
rocksdb_abnormal_get_time_threshold_ns = 100000000
; RocksDB Get 操作的大 key 日志阈值，如果操作获取的 value 的长度大于该数值，那么将会打印相关日志。0 代表不打印
rocksdb_abnormal_get_size_threshold = 1000000
; RocksDB Multi-Get 操作的慢日志阈值，如果操作时长超过了该数值，那么将会打印相关日志。0 代表不打印
rocksdb_abnormal_multi_get_time_threshold_ns = 100000000
; 如果 RocksDB Multi-Get 操作的所有 key-value 的长度之和大于该数值，那么将会打印相关日志。0 代表不打印
rocksdb_abnormal_multi_get_size_threshold = 10000000
; 如果 RocksDB Multi-Get 操作的 key-value 对数量超过了该数值，那么将会打印相关日志。0 代表不打印
rocksdb_abnormal_multi_get_iterate_count_threshold = 1000
; 单个 memtable 的最大 size。一旦 memtable 大小超过该数值，将会被标记为不可修改，并且会创建一个新的 memtable。然后，一个后台线程会把 memtable 的内容落盘到一个 SST 文件
rocksdb_write_buffer_size = 67108864
; memtable 的最大数量，包括 active-memtable 和 immutable-memtable，如果 active memtable 被填满，并且 memtable 的总数量大于该数值，那么将会被延缓写入
rocksdb_max_write_buffer_number = 3
; 后台 flush 线程数量。flush 线程在高优先级的线程池中
rocksdb_max_background_flushes = 4
; 后台 compaction 线程数量。compaction 线程在低优先级的线程池中
rocksdb_max_background_compactions = 12
; RocksDB LSM tree 层数
rocksdb_num_levels = 6
; level 1 层的文件大小最大为 target_file_size_base 字节
rocksdb_target_file_size_base = 67108864
; 每一层文件大小是其上一层的 rocksdb_target_file_size_multiplier 倍
rocksdb_target_file_size_multiplier = 1
; level 1 层中的所有文件的总大小
rocksdb_max_bytes_for_level_base = 671088640
; 每一层其所有总文件大小是其上一层的 rocksdb_max_bytes_for_level_multiplier 倍
rocksdb_max_bytes_for_level_multiplier = 10
; 如果 level 0 中的文件数量超过了该指定数值，L0->L1 compaction 将会被触发
rocksdb_level0_file_num_compaction_trigger = 4
; 如果 level 0 中的文件数量超过了该指定数值，那么写入速度将会被降低
rocksdb_level0_slowdown_writes_trigger = 30
; 如果 level 0 中的文件数量超过了该指定数值，那么写入将会被禁止
rocksdb_level0_stop_writes_trigger = 60
; 压缩算法类型，支持 none，snappy，lz4，zstd 几种选项。支持为每一层单独配置压缩算法，用逗号分隔，如: “none,none,snappy,zstd” 表示 L0，L1 不进行压缩，L2 使用 snappy 压缩，L3 往下使用 zstd 压缩。
rocksdb_compression_type = lz4
; 如果该值被设置为 true，则表示禁用 block cache 功能
rocksdb_disable_table_block_cache = false
; 进程中所有 RocksDB 实例共享的 Block Cache 内存容量，以 bytes 为单位
rocksdb_block_cache_capacity = 10737418240
; shard id 的 bit 位数。为了并发操作，block cache 被分成很多 shard，数量为 2^rocksdb_block_ache_num_shard_bits 个
rocksdb_block_cache_num_shard_bits = -1
; 如果该值被设置为 true, 则表示禁用 bloom filter 功能
rocksdb_disable_bloom_filter = false

;;; 监控相关配置，部分与 open-falcon 相关
perf_counter_cluster_name = onebox
; 监控项的汇报周期
perf_counter_update_interval_seconds = 10
; 是否允许直接向 service 拉去监控项
perf_counter_enable_stat = true
; 是否允许把所有监控项打印到日志
perf_counter_enable_logging = false
; 是否允许把监控项推送到 falcon
perf_counter_enable_falcon = false
falcon_host = 127.0.0.1
falcon_port = 1988
falcon_path = /v1/push

;;;; task 相关配置模板，里面的概念都和 rDSN 相关
[task..default]
is_trace = false
is_profile = false
allow_inline = false
rpc_call_header_format = NET_HDR_DSN
rpc_call_channel = RPC_CHANNEL_TCP
rpc_timeout_milliseconds = 5000	
disk_write_fail_ratio = 0.0
disk_read_fail_ratio = 0.0

;;;; task RPC_L2_CLIENT_READ 的相关配置，
; 选项均继承模板，自定义的部分表示该 task 需要监控的内容
[task.RPC_L2_CLIENT_READ]
is_profile = true
profiler::inqueue = false
profiler::queue = false
profiler::exec = false
profiler::qps = false
profiler::cancelled = false
profiler::latency.server = false

;;;; 监控实现类相关
[components.pegasus_perf_counter_number_percentile_atomic]
counter_computation_interval_seconds = 10

;;;; zookeeper 相关
[zookeeper]
hosts_list = 127.0.0.1:22181
timeout_ms = 10000
logfile = zoo.log

;;;; logger 的实现类相关
[tools.simple_logger]
short_header = false
fast_flush = false
max_number_of_log_files_on_disk = 500
stderr_start_level = LOG_LEVEL_ERROR
```

# 配置建议

一些配置建议：

* 配置文件中所有需要使用服务器地址的地方，都建议使用 IP 地址。
* 大部分配置项，建议使用默认值。
* 在理解配置项的作用和影响的前提下，可以根据需要自行更改配置值。
* 对于配置项的进一步了解，可以查看源代码。
