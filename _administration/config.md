---
title: 配置说明
layout: page
menubar: administration_menu
---

## 配置组成部分
Pegasus的配置为ini格式，主要有以下组成部分：
* core：一个Pegasus Service内核引擎运行时的相关参数配置。
* network：RPC组件的相关参数配置。
* 线程池相关：Pegasus进程中启动的各个线程池的相关参数配置。
* app相关：app是rDSN中的一个概念，可以理解成分布式系统中的“组件”或者“job”，例如Pegasus中的MetaServer、ReplicaServer就各是一个app。一个进程内可以启动多个app，针对每个app，可以分别配置其行为，譬如名字、端口、线程池等。
* task相关：task也是rDSN中的一个概念，可以理解成“异步任务”。比如一个RPC异步调用、一个异步文件IO操作、一个超时事件，都是一个task。每种task都有定义一个唯一的名字。针对每种task，都可以配置其相关的行为，譬如trace、profiler等。
* 一致性协议相关：一致性replication协议的相关参数配置。
* 其他杂项：Pegasus中一些组件模块的参数配置，譬如日志、监控、Zookeeper配置等。

配置文件中会涉及到一些rDSN的概念，对这些概念的进一步理解，请参见[rDSN项目](https://github.com/XiaoMi/rdsn)。

下面列举出了Pegasus配置文件的部分说明。这些配置项有些是和client通用的，比如app、task、threadpool等，其他是server端所独有的。要理解这些配置的真正含义，建议先阅读PacificA论文，并了解清楚rDSN项目和Pegasus架构。

## 配置文件部分说明
	[apps..default] ;各个app配置项的默认模板
	run = true
	count = 1
	
	[apps.meta] ;meta app的配置项
	type = meta
	name = meta
	arguments = 
	ports = 34601 ;meta的运行端口

	; meta app运行时需要的线程池
	pools = THREAD_POOL_DEFAULT,THREAD_POOL_META_SERVER,THREAD_POOL_META_STATE,THREAD_POOL_FD,THREAD_POOL_DLOCK
	run = true
	count = 3 ;meta app的实例个数，每个实例的运行端口依次为ports, ports+1...；可以用参数-app_list meta@1的方式启动指定的app
	
	[apps.replica] ; replica app的配置项目
	type = replica
	name = replica
	arguments =
	ports = 34801
	pools = THREAD_POOL_DEFAULT,THREAD_POOL_REPLICATION_LONG,THREAD_POOL_REPLICATION,THREAD_POOL_FD,THREAD_POOL_LOCAL_APP
	run = true
	count = 3
	
	[core] ;pegasus内核引擎运行参数
	tool = nativerun ;rDSN相关概念，参见rDSN文档
	toollets = profiler ;rDSN相关概念，参见rDSN文档
	pause_on_start = false ;启动时是否暂停以等待交互输入
	cli_local = true ;是否开启本地命令行控制
	cli_remote = true ;是否开启远程命令行
	perf_counter_factory_name = pegasus::server::pegasus_perf_counter ;pegasus监控metrics的实现类
	start_nfs = true ;是否开启NFS服务
	
	logging_start_level = LOG_LEVEL_DEBUG ;logging级别
	logging_factory_name = dsn::tools::simple_logger ;logging的实现类
	logging_flush_on_exit = true ;进程退出时是否将缓存的日志数据刷出到文件系统
	
	data_dir = /home/work/data/pegasus/@cluster@ ;默认的数据文件夹

	[network] ;网络相关配置
	io_service_worker_count = 4 ;负责网络IO的线程个数
	
	[threadpool..default] ;线程池相关配置的默认模板
	worker_count = 4 ;线程池的默认线程数
	
	[threadpool.THREAD_POOL_REPLICATION] ;线程池THREAD_POOL_REPLICATION的配置
	name = replica ;线程池名称
	partitioned = true ;rDSN相关概念，partitioned = ture表示每个线程有一个自己的任务队列，且task会根据hash分派到特定的线程执行
	max_input_queue_length = 2048 ;线程队列最大长度
	worker_priority = THREAD_xPRIORITY_NORMAL ;线程在OS中的调度优先级
	worker_count = 23 ;线程池中的线程数，如果没有配置则使用默认模板的值

	[threadpool.XXXXX] ;线程池XXXXX的相关配置
	.....

	[meta_server] ; meta_server的相关配置
	server_list = 127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603  ;MetaServer的地址列表
	cluster_root = /pegasus/my-cluster ;MetaServer在元数据存储服务上的根目录，一个集群的不同meta_server要配成相同的值，不同的集群用不同的值
	meta_state_service_type = meta_state_service_zookeeper ;元数据存储服务的实现类
	meta_state_service_parameters = ;元数据存储服务的初始化参数
	distributed_lock_service_type = distributed_lock_service_zookeeper ;分布式锁服务的实现类
	distributed_lock_service_parameters = /pegasus/onebox/127.0.0.1 ;分布式锁服务的初始化参数
	stable_rs_min_running_seconds = 600 ;判断一个ReplicaServer是不是稳定运行的时间阈值
	max_succssive_unstable_restart = 5 ;一个ReplicaServer最多可以崩溃的次数，如果崩溃太频繁，就会上MetaServer的黑名单
	server_load_balancer_type = greedy_load_balancer ;负载均衡器的实现类
	replica_assign_delay_ms_for_dropouts = 300000 ;当一个secondary被移除后，等待它回来的最长时间阈值
	node_live_percentage_threshold_for_update = 50 ;如果不可用节点比例太高，MetaServer会进入freezed的保护状态
	min_live_node_count_for_unfreeze = 3 ;如果不可用的节点个数太少，MetaServer也会进入freezed的保护状态
	hold_seconds_for_dropped_app = 604800 ;表删除后在回收站中默认的保留时间
	meta_function_level_on_start = steady ;MetaServer启动时的默认function_level状态，steady表示不进行负载均衡的稳定状态
	recover_from_replica_server = false ;如果为true, 集群启动时就会进入“元数据恢复”流程
	max_replicas_in_group = 4 ;一个replica group中最多保留的副本数(可用副本+尸体)
	
	[replication.app] ;集群在bootstrap时默认要创建的表
	app_name = temp ;表名
	app_type = pegasus ;type表征了存储引擎，pegasus表示我们基于rocksdb实现的存储引擎
	partition_count = 8 ;分片数
	max_replica_count = 3 ;每个分片的副本个数
	stateful = true ;rDSN参数，对于app_type = pegasus需要设置为true
	package_id = 
	
	[replication] ;一致性协议相关配置，很多概念和PacificA相关
	slog_dir = /home/work/ssd1/pegasus/@cluster@ ;shared log存储的文件夹路径
	data_dirs = tag1:/home/work/ssd2/pegasus/@cluster@,tag2:/home/work/ssd3/pegasus/@cluster@ ;replica数据存储的文件夹路径列表，建议一块磁盘配置一个项，tag为磁盘的标记名
	data_dirs_black_list_file = /home/mi/.pegasus_data_dirs_black_list ;黑名单文件，文件中每行是一个需忽略掉的文件夹，主要用于过滤坏盘
	
	deny_client_on_start = false ;ReplicaServer启动时是否要拒绝掉客户端写
	delay_for_fd_timeout_on_start = false ;ReplicaServer启动时是否等待一段时间后才开始连接MetaServer
	verbose_log_on_commit = false ;是否打印commit log的调试信息
	empty_write_disabled = false ;primary会定期生成一个空的写操作以检查group状态，是否禁止该特性
	
	prepare_timeout_ms_for_secondaries = 1000 ;prepare的超时时间
	prepare_timeout_ms_for_potential_secondaries = 3000 ;给learner发prepare的超时时间
	
	batch_write_disabled = false ;是否禁止掉客户端写请求的batch功能
	staleness_for_commit = 20 ;保留多少个已经commit的写请求在队列中
	max_mutation_count_in_prepare_list = 110 ;prepare_list的容量
	mutation_2pc_min_replica_count = 2 ;想要成功进行一次写操作，最少需要多少个副本
	
	group_check_disabled = false ;primary会定期推送group状态给其他成员，是否禁用该特性
	group_check_interval_ms = 100000 ;group check的时间间隔
	
	checkpoint_disabled = false ;是否禁用定期checkpoint的生成
	checkpoint_interval_seconds = 100 ;checkpoint的尝试触发时间间隔，尝试触发并不一定生成checkpoint
	checkpoint_min_decree_gap = 10000
	checkpoint_max_interval_hours = 1 ;checkpoint的强制触发时间间隔，强制触发会将memtable的数据刷出
	
	gc_disabled = false ;是否禁用WAL的垃圾回收
	gc_interval_ms = 30000
	gc_memory_replica_interval_ms = 300000 ;如果一个replica需要关闭，在内存中保留多长时间
	gc_disk_error_replica_interval_seconds = 172800000 ;一个因为IO错误关闭掉的replica，在磁盘保留多长时间
	
	fd_disabled = false ;failure detector是否禁止
	fd_check_interval_seconds = 5
	fd_beacon_interval_seconds = 3
	fd_lease_seconds = 10
	fd_grace_seconds = 15
	
	log_private_file_size_mb = 32 ;每一个private log多大，超过了该阈值就滚动到下一个文件
	log_private_batch_buffer_kb = 512 ;private log一个batch的最小容量
	log_private_batch_buffer_count = 512 ;private log一个batch的最小条数
	log_private_batch_buffer_flush_interval_ms = 100000 ;超过该事件没写private log, 则强制刷一次
	log_private_reserve_max_size_mb = 0
	log_private_reserve_max_time_seconds = 0
	
	log_shared_file_size_mb = 32 ;shared log多大，超过该阈值就滚动到下一个文件
	log_shared_file_count_limit = 32
	log_shared_batch_buffer_kb = 0
	log_shared_force_flush = false
	
	config_sync_disabled = false ;replica server会定期和meta server同步本机所服务的replica, 是否禁止这一特性
	config_sync_interval_ms = 30000 
	
	lb_interval_ms = 10000 ;meta server跑负载均衡的周期
	
	[pegasus.server]
	;;; rocksdb相关配置
	rocksdb_verbose_log = false ;是否打印rocksdb中一些调试日志
	rocksdb_write_buffer_size = 10485760 
	updating_rocksdb_sstsize_interval_seconds = 30

	;;; 监控相关配置，部分和小米的开源监控系统open-falcon相关
	perf_counter_cluster_name = onebox
	perf_counter_update_interval_seconds = 10 ;监控项的汇报周期
	perf_counter_enable_stat = true ;是否允许直接向service拉去监控项
	perf_counter_enable_logging = false ;是否允许把所有监控项打印到日志
	perf_counter_enable_falcon = false ;是否允许把监控项推送到falcon
	
	falcon_host = 127.0.0.1
	falcon_port = 1988
	falcon_path = /v1/push
	
	[task..default] ; task相关配置模板，里面的概念都和rDSN相关
	is_trace = false
	is_profile = false
	allow_inline = false
	fast_execution_in_network_thread = false
	rpc_call_header_format = NET_HDR_DSN
	rpc_call_channel = RPC_CHANNEL_TCP
	rpc_timeout_milliseconds = 5000	
	disk_write_fail_ratio = 0.0
	disk_read_fail_ratio = 0.0

	[task.RPC_L2_CLIENT_READ] ; task RPC_L2_CLIENT_READ的相关配置，选项均继承模板，自定义的部分表示该task需要监控的内容
	is_profile = true
	profiler::inqueue = false
	profiler::queue = false
	profiler::exec = false
	profiler::qps = false
	profiler::cancelled = false
	profiler::latency.server = false	

	;;;;;; 以下是各种各样的杂项配置
	[components.pegasus_perf_counter_number_percentile_atomic] ;监控实现类相关
	counter_computation_interval_seconds = 10
	
	[zookeeper] ; zookeeper相关
	hosts_list = 127.0.0.1:22181
	timeout_ms = 10000
	logfile = zoo.log
	
	[tools.simple_logger] ;logger的实现类相关
	short_header = false
	fast_flush = false
	max_number_of_log_files_on_disk = 100000
	stderr_start_level = LOG_LEVEL_FATAL

## 配置建议
一些配置建议：
* 配置文件中所有需要使用机器名的地方，都建议使用IP地址。
* 大部分配置项，建议使用默认值。
* 对于高级用户，可以根据需要自行配置，但是前提是需要理解配置项的作用和影响。
* 由于文档不能面面俱到，对配置项的作用不太清楚的，可以直接查看源代码。
