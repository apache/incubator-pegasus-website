---
permalink: /docs/tools/shell/
redirect_from: /overview/shell/
---

Pegasus 提供了 Shell 工具，用于查看集群相关信息，创建/删除表，操作数据等。本文档基于 2.5.0 版本。

# 工具获取

在成功[编译 Pegasus ](compilation)后，再成功启动 [onebox](overview/onebox) 后在 pegasus 目录下启动 Shell 工具:

```bash
./run.sh shell
```

也可以用 pack 工具打包 Shell 工具，方便在其他机器上使用：

```bash
./run.sh pack_tools
```

pack 成功后，会在本地文件夹下生成`pegasus-tools-{version}-{gitSHA}-{platform}-{buildType}.tar.gz`文件。将该文件拷贝到目标机器上，解压后进入该文件夹，运行`./run.sh shell`就可以使用 Shell 工具，可以使用 `-h` 选项获取帮助：

```
$ ./run.sh shell -h
Options for subcommand 'shell':
   -h|--help            print the help info
   -c|--config <path>   config file path, default './config-shell.ini.{PID}'
   --cluster <str>      cluster meta lists, default '127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603'
```

譬如访问某个特定集群:

```
./run.sh shell --cluster 127.0.0.1:34601,127.0.0.1:34602
```

# 工具使用

Shell 工具采用子命令模式，进入子命令模式执行`help`后会显示帮助文档。（注：根据版本不同命令会有区别，以下为 2.5.0 版本）。对于每个子命令，也可以通过`-h`选项获取该子命令的帮助信息。

```
Usage:
        help
        version
        cluster_info           [-r|--resolve_ip] [-o|--output file_name] [-j|--json]
        app                    <app_name> [-d|--detailed] [-r|--resolve_ip] [-o|--output file_name]
                               [-j|--json]
        app_disk               <app_name> [-d|--detailed] [-r|--resolve_ip] [-j|--json]
                               [-o|--output file_name]
        ls                     [-a|-all] [-d|--detailed] [-j|--json]
                               [-o|--output file_name][-s|--status all|available|creating|dropping|dropped]
        nodes                  [-d|--detailed] [-j|--json] [-r|--resolve_ip] [-u|--resource_usage]
                               [-o|--output file_name] [-s|--status all|alive|unalive] [-q|--qps]
                               [-p|latency_percentile 50|90|95|99|999]
        create                 <app_name> [-p|--partition_count num] [-r|--replica_count num]
                               [-e|--envs k1=v1,k2=v2...]
        drop                   <app_name> [-r|--reserve_seconds num]
        recall                 <app_id> [new_app_name]
        set_meta_level         <stopped|blind|freezed|steady|lively>
        get_meta_level
        balance                <-g|--gpid appid.pidx> <-p|--type move_pri|copy_pri|copy_sec>
                               <-f|--from from_address> <-t|--to to_address>
        propose                [-f|--force] <-g|--gpid appid.pidx>
                               <-p|--type ASSIGN_PRIMARY|ADD_SECONDARY|DOWNGRADE_TO_INACTIVE...>
                               <-t|--target node_to_exec_command> <-n|--node node_to_be_affected>
        use                    [app_name]
        cc                     [cluster_name]
        escape_all             [true|false]
        timeout                [time_in_ms]
        hash                   <hash_key> <sort_key>
        set                    <hash_key> <sort_key> <value> [ttl_in_seconds]
        multi_set              <hash_key> <sort_key> <value> [sort_key value...]
        get                    <hash_key> <sort_key>
        multi_get              <hash_key> [sort_key...]
        multi_get_range        <hash_key> <start_sort_key> <stop_sort_key>
                               [-a|--start_inclusive true|false] [-b|--stop_inclusive true|false]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix]
                               [-y|--sort_key_filter_pattern str] [-n|--max_count num]
                               [-i|--no_value] [-r|--reverse]
        multi_get_sortkeys     <hash_key>
        del                    <hash_key> <sort_key>
        multi_del              <hash_key> <sort_key> [sort_key...]
        multi_del_range        <hash_key> <start_sort_key> <stop_sort_key>
                               [-a|--start_inclusive true|false] [-b|--stop_inclusive true|false]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix]
                               [-y|--sort_key_filter_pattern str] [-o|--output file_name]
                               [-i|--silent]
        incr                   <hash_key> <sort_key> [increment]
        check_and_set          <hash_key> [-c|--check_sort_key str]
                               [-t|--check_type not_exist|not_exist_or_empty|exist|not_empty]
                               [match_anywhere|match_prefix|match_postfix]
                               [bytes_less|bytes_less_or_equal|bytes_equal|bytes_greater_or_equal|bytes_greater]
                               [int_less|int_less_or_equal|int_equal|int_greater_or_equal|int_greater]
                               [-o|--check_operand str] [-s|--set_sort_key str] [-v|--set_value str]
                               [-l|--set_value_ttl_seconds num] [-r|--return_check_value]
        check_and_mutate       <hash_key> [-c|--check_sort_key str]
                               [-t|--check_type not_exist|not_exist_or_empty|exist|not_empty]
                               [match_anywhere|match_prefix|match_postfix]
                               [bytes_less|bytes_less_or_equal|bytes_equal|bytes_greater_or_equal|bytes_greater]
                               [int_less|int_less_or_equal|int_equal|int_greater_or_equal|int_greater]
                               [-o|--check_operand str] [-r|--return_check_value]
        exist                  <hash_key> <sort_key>
        count                  <hash_key>
        ttl                    <hash_key> <sort_key>
        hash_scan              <hash_key> <start_sort_key> <stop_sort_key>
                               [-a|--start_inclusive true|false] [-b|--stop_inclusive true|false]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix]
                               [-y|--sort_key_filter_pattern str]
                               [-v|--value_filter_type anywhere|prefix|postfix|exact]
                               [-z|--value_filter_pattern str] [-o|--output file_name]
                               [-n|--max_count num] [-t|--timeout_ms num] [-d|--detailed]
                               [-i|--no_value]
        full_scan              [-h|--hash_key_filter_type anywhere|prefix|postfix]
                               [-x|--hash_key_filter_pattern str]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                               [-y|--sort_key_filter_pattern str]
                               [-v|--value_filter_type anywhere|prefix|postfix|exact]
                               [-z|--value_filter_pattern str] [-o|--output file_name]
                               [-n|--max_count num] [-t|--timeout_ms num] [-d|--detailed]
                               [-i|--no_value] [-p|--partition num]
        copy_data              <-c|--target_cluster_name str> <-a|--target_app_name str>
                               [-p|--partition num] [-b|--max_batch_count num] [-t|--timeout_ms num]
                               [-h|--hash_key_filter_type anywhere|prefix|postfix]
                               [-x|--hash_key_filter_pattern str]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                               [-y|--sort_key_filter_pattern str]
                               [-v|--value_filter_type anywhere|prefix|postfix|exact]
                               [-z|--value_filter_pattern str] [-m|--max_multi_set_concurrency]
                               [-o|--scan_option_batch_size] [-n|--no_overwrite] [-i|--no_value]
                               [-g|--geo_data] [-u|--use_multi_set]
        clear_data             [-p|--partition num] [-b|--max_batch_count num] [-t|--timeout_ms num]
                               [-h|--hash_key_filter_type anywhere|prefix|postfix]
                               [-x|--hash_key_filter_pattern str]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                               [-y|--sort_key_filter_pattern str]
                               [-v|--value_filter_type anywhere|prefix|postfix|exact]
                               [-z|--value_filter_pattern str] [-f|--force]
        count_data             [-c|--precise][-p|--partition num]
                               [-b|--max_batch_count num][-t|--timeout_ms num]
                               [-h|--hash_key_filter_type anywhere|prefix|postfix]
                               [-x|--hash_key_filter_pattern str]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                               [-y|--sort_key_filter_pattern str]
                               [-v|--value_filter_type anywhere|prefix|postfix|exact]
                               [-z|--value_filter_pattern str][-d|--diff_hash_key] [-a|--stat_size]
                               [-n|--top_count num] [-r|--run_seconds num]
        remote_command         [-t all|meta-server|replica-server] [-r|--resolve_ip]
                               [-l ip:port,ip:port...]<command> [arguments...]
        server_info            [-t all|meta-server|replica-server] [-l ip:port,ip:port...]
                               [-r|--resolve_ip]
        server_stat            [-t all|meta-server|replica-server] [-l ip:port,ip:port...]
                               [-r|--resolve_ip]
        app_stat               [-a|--app_name str] [-q|--only_qps] [-u|--only_usage] [-j|--json]
                               [-o|--output file_name]
        flush_log              [-t all|meta-server|replica-server]
                               [-l ip:port,ip:port...][-r|--resolve_ip]
        local_get              <db_path> <hash_key> <sort_key>
        rdb_key_str2hex        <hash_key> <sort_key>
        rdb_key_hex2str        <rdb_key_in_hex>
        rdb_value_hex2str      <value_in_hex>
        sst_dump               [--command=check|scan|none|raw] <--file=data_dir_OR_sst_file>
                               [--from=user_key] [--to=user_key] [--read_num=num] [--show_properties]
                               [--pegasus_data]
        mlog_dump              <-i|--input log_dir> [-o|--output file_name] [-d|--detailed]
        recover                [-f|--node_list_file file_name] [-s|--node_list_str str]
                               [-w|--wait_seconds num] [-b|--skip_bad_nodes]
                               [-l|--skip_lost_partitions] [-o|--output file_name]
        add_backup_policy      <-p|--policy_name str> <-b|--backup_provider_type str>
                               <-a|--app_ids 1,2...> <-i|--backup_interval_seconds num>
                               <-s|--start_time hour:minute> <-c|--backup_history_cnt num>
        ls_backup_policy
        query_backup_policy    <-p|--policy_name p1,p2...> [-b|--backup_info_cnt num]
        modify_backup_policy   <-p|--policy_name str> [-a|--add_app 1,2...] [-r|--remove_app 1,2...]
                               [-i|--backup_interval_seconds num] [-c|--backup_history_count num]
                               [-s|--start_time hour:minute]
        disable_backup_policy  <-p|--policy_name str>
        enable_backup_policy   <-p|--policy_name str>
        restore_app            <-c|--old_cluster_name str> <-p|--old_policy_name str>
                               <-a|--old_app_name str> <-i|--old_app_id id>
                               <-t|--timestamp/backup_id timestamp> <-b|--backup_provider_type str>
                               [-n|--new_app_name str] [-s|--skip_bad_partition]
        query_restore_status   <restore_app_id> [-d|--detailed]
        get_app_envs           [-j|--json]
        set_app_envs           <key> <value> [key value...]
        del_app_envs           <key> [key...]
        clear_app_envs         [-a|--all] [-p|--prefix str]
        ddd_diagnose           [-g|--gpid appid|appid.pidx] [-d|--diagnose] [-a|--auto_diagnose]
                               [-s|--skip_prompt] [-o|--output file_name]
        add_dup                <app_name> <remote_cluster_name> [-f|--freezed]
        query_dup              <app_name> [-d|--detail]
        remove_dup             <app_name> <dup_id>
        start_dup              <app_name> <dup_id>
        pause_dup              <app_name> <dup_id>
        disk_capacity          [-n|--node replica_server(ip:port)][-o|--out file_name][-j|-json][-d|--detail]
        disk_replica           [-n|--node replica_server(ip:port)][-a|-app app_name][-o|--out file_name][-j|--json]
        set_dup_fail_mode      <app_name> <dup_id> <slow|skip>
        get_replica_count      <app_name>
        set_replica_count      <app_name> <replica_count>
        exit
```

由于子命令很多，为了方便使用，我们根据功能不同进行分类。

## 基本命令

| 子命令  | 功能                                               |
| ------- | -------------------------------------------------- |
| help    | 获取帮助信息                                       |
| version | 获取 Shell 工具的版本信息                          |
| exit    | 退出 Shell 工具，等同于输入 "Ctrl-C" 或者 "Ctrl-D" |

### help

获取帮助信息。

### version

获取 Shell 工具的版本信息。

### exit

退出 Shell 工具，等同于输入 "Ctrl-C" 或者 "Ctrl-D"。

## 全局属性

| 子命令     | 功能                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| cc         | change cluster，改变当前使用的集群                                                                     |
| use        | 指定当前使用的表，有的子命令在使用前需要先指定表，譬如数据操作类命令                                   |
| escape_all | 输出字节类数据时，选择将"所有字符"转换为十六进制编码还是仅将"不可见字符"转换为十六进制编码，默认为后者 |
| timeout    | 数据操作的默认超时时间                                                                                 |

### cc

change cluster，改变当前使用的集群。

用法：

```
USAGE:  cc                       [cluster_name]
```

说明：

- 指定的集群名必须在`src/shell/config.ini`配置文件的 [pegasus.clusters] 配置段中可以找到。
- 你可以在 [pegasus.clusters] 配置段中设置多个集群。

示例：

```
>>> cc my_cluster
```

### use

指定当前使用的表，有的子命令在使用前需要先指定表，譬如数据操作类命令。

用法：

```
USAGE:  use                      [app_name]
```

说明：

- 表必须已经创建才能使用，默认存在 temp 表。

示例：

```
>>> use tmp
```

### escape_all

输出字节类数据时，选择将"所有字符"转换为十六进制编码还是仅将"不可见字符"转换为十六进制编码，默认为后者。

用法：

```
USAGE:  escape_all               [true|false]
```

说明：

- 默认为 false。

示例：

```
>>> escape_all true
```

### timeout

设置数据操作的默认超时时间，单位 ms。

用法：

```
USAGE:  timeout                  [time_in_ms]
```

说明：

- 如果不指定 [time_in_ms]，则输出当前的超时时间。

示例：

```
>>> timeout 1000
```

## 节点管理

| 子命令         | 功能                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------- |
| cluster_info   | 获取集群基本信息                                                                                |
| nodes          | 获取节点列表，可加`-d`选项获取各节点的负载情况                                                  |
| server_info    | 各节点的基本信息，主要是 server 版本、节点启动时间                                              |
| server_stat    | 各节点的统计信息，包含一些关键的统计数据，譬如 get 和 put 操作的 QPS 和延迟、内存和存储使用情况 |
| remote_command | 向节点发送[远程命令](/administration/remote_command)，以执行某些特殊操作                        |
| flush_log      | 向节点发送[远程命令](/administration/remote_command)，将最近缓冲区中的日志数据刷出到日志文件中  |
| disk_replica   | 各节点的副本在磁盘上的分布                                                                      |
| disk_capacity  | 各节点的磁盘空间占用                                                                            |

### cluster_info

获取集群基本信息。

说明：

- 集群信息主要主要包含：
  - meta_server、zookeeper 的节点信息。
  - meta_function_level：负载均衡策略。
  - balance_operation_count：负载均衡操作统计，包括 move_pri、move_pri、copy_sec、total。负载均衡信息参见[负载均衡](/administration/rebalance)。
  - primary_replica_count_stddev：负载均衡衡量指标。
  - total_replica_count_stddev：负载均衡衡量指标。

### nodes

获取 replica 节点列表，默认以 IP 地址表示各个节点，并输出基本信息。

用法：

```
USAGE:  nodes                    [-d|--detailed] [-j|--json] [-r|--resolve_ip] [-u|--resource_usage]
                                 [-o|--output file_name] [-s|--status all|alive|unalive] [-q|--qps]
                                 [-p|latency_percentile 50|90|95|99|999]
```

说明：

- `-d`选项：如果指定，输出节点的详细信息，如获取各节点的负载情况。
- `-r`选项：如果指定，以域名信息表示该节点，并输出基本信息，如果无法找到节点地址对应域名信息，显示 UNRESOLVABLE。
- `-u`选项：如果指定，输出节点资源使用情况。
- `-o`选项：如果指定，输出基本信息到指定文件，默认为当前路径。
- `-s`选项：如果指定，输出某种状态的节点信息，包括 all、alive、unalive。
- `-q`选项：如果指定，则仅显示指定节点的 QPS 信息。
- `-p`选项：如果指定，则显示指定节点的延迟等级。

示例：

```
>>> nodes -s alive
```

### server_info

各节点的基本信息，主要是节点地址、状态、server 版本、启动时间等。

用法：

```
USAGE:server_info                [-t all|meta-server|replica-server] [-l ip:port,ip:port...]
```

说明：

- `-t`选项：如果指定，则选择输出服务器节点类别的信息，包含 all、meta-server、replica-server。
- `-l`选项：如果指定，则选择输出特定 IP 地址节点的信息，多个节点使用`,`连接。

示例：

```
>>> server_info -t meta-server
```

### server_stat

各节点的统计信息，包含一些关键的统计数据，譬如 get 和 put 操作的 QPS 和延迟、内存和存储使用情况。

用法：

```
USAGE:server_stat                [-t all|meta-server|replica-server] [-l ip:port,ip:port...]
```

说明：

- 选项参数说明同 [server_info](#server_info)。

示例：

```
>>> server_stat -t meta-server
```

### remote_command

向指定的一个或者多个远程进程发送远程命令。参见[远程命令](/administration/remote-commands)。

用法：

```
USAGE:  remote_command          [-t all|meta-server|replica-server] [-r|--resolve_ip]
                                [-l ip:port,ip:port...] <command> [arguments...]
```

说明：

* `-t`：只向指定角色的所有进程发送。
* `-l`：只向指定的地址发送，可以通过列表指定多个地址。
* 如果不指定，则会向集群中的所有节点发送指令。

示例：

```
>>> remote_command -t meta-server server-info
```

### flush_log

向节点发送远程命令，将最近缓冲区中的日志数据刷出到日志文件中。

用法：

```
USAGE:flush_log                  [-t all|meta-server|replica-server] [-l ip:port,ip:port...]
```

说明：

- `-t`、`-l`选项：用于选择特定目标机器，参见 [server_info](#server_info) 说明。

示例：

```
>>> flush_log -t meta-server
```

### disk_replica

查询副本在 replica_server 节点的磁盘分布，1.12.3 版本提供支持。

用法：

```
USAGE:disk_replica             [-n|--node replica_server(ip:port)][-a|-app app_name][-o|--out file_name][-j|--json]
```

说明：

- `-n`选项：用于查看特定节点磁盘上的副本分布，格式为 ip:port
- `-a`选项：用于查看某个表的副本在节点磁盘上的分布
- `-o`选项：把结果输出到某个文件
- `-j`选项：以 json 格式输出查询结果

示例：

```
>>> disk_replica -n 127.0.0.1:34608 -a temp
```

### disk_capacity

查询 replica_server 节点的磁盘空间占用，1.12.3 版本提供支持。

用法：

```
USAGE:disk_capacity            [-n|--node replica_server(ip:port)][-o|--out file_name][-j|-json][-d|--detail]
```

说明：

- `-n`选项：用于查看特定节点磁盘上的副本分布，格式为 ip:port
- `-d`选项：用于查看节点上每个磁盘的空间占用信息
- `-o`选项：把结果输出到某个文件
- `-j`选项：以 json 格式输出查询结果

示例：

```
>>> disk_capacity -n 127.0.0.1:34608 -d
```

## 表管理

| 子命令            | 功能                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| ls                | 获取所有表的列表，可加`-d`选项获取各表的健康状况，可加`-a`选项包含已删除表的信息                           |
| app               | 获取某个表的信息，可加`-d`选项获取详细信息，包括各 partition 的分布情况、健康状况                          |
| app_stat          | 获取表的读写情况和存储统计信息，可加`-a`选项指定单个表，以获取该表各个 partition 的详细统计信息            |
| app_disk          | 获取某个表的详细存储信息，可加`-d`选项获取各 partition 的详细存储信息                                      |
| create            | 创建表，可加`-p`和`-r`选项指定分片数和副本数，要求分片数是 2 的指数倍，不指定 -r 则默认副本数为 3（推荐值）|
| drop              | 删除表，参见[使用 drop 命令删除表](/administration/table-soft-delete#使用drop命令删除表)                   |
| recall            | 恢复已删除的表，参见[使用 recall 命令恢复表](/administration/table-soft-delete#使用recall命令恢复表)       |
| get_app_envs      | 获取表的环境变量               |
| set_app_envs      | 设置表的环境变量               |
| del_app_envs      | 删除表的环境变量               |
| clear_app_envs    | 清理表的环境变量           |
| add_dup           | 添加 duplication 的集群，参见[跨机房同步](/administration/duplication)                                     |
| query_dup         | 查询表的跨机房同步的集群, 参加[跨机房同步](/administration/duplication)                                    |
| remove_dup        | 移除 duplication 的集群, 参见[跨机房同步](/administration/duplication)                                     |
| start_dup         | 开始跨机房同步, 启动 duplication 的备份功能, 参见[跨机房同步](/administration/duplication)                 |
| pause_dup         | 暂停跨机房同步, 暂停 duplication 的备份功能, 参见[跨机房同步](/administration/duplication)                 |
| set_dup_fail_mode | 设置 duplication 失败后的处理的方式, 对指定的表的指定同步集群设置, 可设置为 fail 和 skip                   |
| get_replica_count | 获取表的副本数参数值                                                                                       |
| set_replica_count | 设置表的副本数参数值                                                                                       |

### ls

获取所有表的列表。

用法：

```
USAGE:  ls                       [-a|-all] [-d|--detailed] [-o|--output file_name]
                                 [-s|--status all|available|creating|dropping|dropped]
```

说明：

- `-a`选项：如果指定，则显示包括已被删除的所有表。
- `-d`选项：如果指定，则显示各个表的详细信息，主要是 partition 的健康状况。
- `-o`选项：如果指定，则将结果输出到参数所指定的文件中。
- `-s`选项：如果指定，则只显示符合参数所指定的状态的表。

示例：

```
>>> ls -d -o ls.txt
```

### app

获取某个表的基本信息。

用法：

```
USAGE:  app                      <app_name> [-d|--detailed] [-o|--output file_name]
```

说明：

- `-d`选项：如果指定，则显示各个表的详细信息，如 partition 的分布和健康状况。
- `-o`选项：如果指定，则将结果输出到参数所指定的文件中。

示例：

```
>>> app temp
```

### app_stat

获取表的读写和存储统计信息，如 get、put、del 等。

用法：

```
USAGE: app_stat                [-a|--app_name str] [-q|--only_qps] [-u|--only_usage]
                               [-o|--output file_name]
```

示例：

```
>>> app_stat temp
```

说明：

- `-a`选项：如果指定，则按照指定表的 partition 分类显示详细信息。
- `-q`选项：如果指定，则仅显示指定表的 QPS 信息。
- `-u`选项：如果指定，则仅显示指定表的 usage 信息。
- `-o`选项：如果指定，则把结果输出到指定文件中。

### app_disk

获取某个表的详细存储信息。

用法：

```
USAGE: app_disk                   <app_name> [-d|--detailed] [-o|--output file_name]
```

说明：

- `-d`选项：如果指定，则可以获取表的详细信息，如 primary 和 secondary 情况。
- `-o`选项：如果指定，则将结果输出到参数所指定的文件中。

示例：

```
>>> app_disk temp
```

### create

创建表

用法：

```
USAGE: create                    <app_name> [-p|--partition_count num] [-r|--replica_count num]
                                            [-e|--envs k1=v1,k2=v2...]
```

说明：

- `-p`选项：如果指定，则可以设置分片数，要求分片数是 2 的指数倍。
- `-r`选项：如果指定，则可以指定副本数，推荐副本数为 3。
- `-e`选项：如果指定，则可是设置环境变量，参见 [Table 环境变量](/administration/table-env)。

示例：

```
>>> create temp
```

### drop

删除表。

用法：

```
USAGE: drop                      <app_name> [-r|--reserve_seconds num]
```

说明：

- `-r`选项：如果指定，则设置数据的保留时间（删除时间开始计算，单位为秒）。如果不指定，则使用配置文件 hold_seconds_for_dropped_app 指定的值，默认为 7 天，参见 [Table 软删除#使用drop命令删除表](/administration/table-soft-delete#使用drop命令删除表)。

示例：

```
>>> drop temp
```

### recall

恢复已经删除的表。

用法：

```
USAGE: recall                    <app_id> [new_app_name]
```

说明：

- 注意该命令通过 app_id 进行表恢复。
- `new_app_name`参数：如果不指定新表名，则会使用原表名，否则使用指定的新表名，如果原表名已存在（删表后新建了同名表），则必须指定另外一个不同的新表名，否则会失败。
- 详细信息参见 [Table 软删除#使用recall命令恢复表](/administration/table-soft-delete#使用recall命令恢复表)。

示例：

```
>>> recall 19
```

### get_app_envs

获取表的环境变量，关于环境变量请参见 [Table 环境变量](/administration/table-env)。

用法：

```
USAGE: get_app_envs
```

说明：

- 该命令输出当前表的环境变量，使用前请首先使用`use [app_name]`选定特定表。

示例：

```
>>> use temp
OK
>>> get_app_envs
[app_envs]
rocksdb.usage_scenario  : normal
```

### set_app_envs

设置表的环境变量，关于环境变量请参见 [Table 环境变量](/administration/table-env)。

用法：

```
USAGE: set_app_envs              <key> <value> [key value...]
```

说明：

- 该命令设置当前表的环境变量，使用前请首先使用`use [app_name]`选定特定表。

示例：

```
>>> use temp
OK
>>> set_app_envs rocksdb.usage_scenario bulk_load
set app envs succeed
```

### del_app_envs

删除表的环境变量，关于环境变量请参见 [Table 环境变量](/administration/table-env)。

用法：

```
USAGE: del_app_envs              <key> [key...]
```

说明：

- 该命令删除当前表的环境变量，使用前请首先使用`use [app_name]`选定特定表。

示例：

```
>>> use temp
OK
>>> set_app_envs rocksdb.usage_scenario bulk_load
set app envs succeed
>>> del_app_envs rocksdb.usage_scenario
del app envs succeed
=============================
deleted keys:
    rocksdb.usage_scenario
=============================
```

### clear_app_envs

清理表的环境变量，关于环境变量请参见 [Table 环境变量](/administration/table-env)。

用法：

```
USAGE: clear_app_envs              [-a|--all] [-p|--prefix str]
```

说明：

- 该命令删除当前表的环境变量，使用前请首先使用`use [app_name]`选定特定表。
- `-a`选项：如果指定，则清理所有的环境变量。
- `-p`选项：如果指定，则可以清理以特定字符串为前缀的环境变量。

示例：

```
>>> use temp
OK
>>> set_app_envs manual_compact.once.trigger_time 1713700000
set app envs succeed
>>> set_app_envs manual_compact.once.target_level -1
set app envs succeed
>>> set_app_envs manual_compact.once.bottommost_level_compaction force
set app envs succeed
>>> set_app_envs rocksdb.usage_scenario bulk_load
set app envs succeed
>>> clear_app_envs -p manual_compact
clear app envs succeed
=============================
deleted keys:
    manual_compact.once.bottommost_level_compaction
    manual_compact.once.target_level
    manual_compact.once.trigger_time
=============================
>>> get_app_envs
[app_envs]
rocksdb.usage_scenario  : bulk_load
```

### add_dup

添加 duplication 的集群，参见[跨机房同步](/administration/duplication)。

用法:

```
USAGE: add_dup                     <app_name> <remote_cluster_name> [-f|--freezed]
```

说明:

- 对指定表加上指定的 duplication 的集群

示例:

```
>>> add_dup temp my_cluster
```

### query_dup

查询表的跨机房同步的集群, 参见[跨机房同步](/administration/duplication)。

用法:

```
USAGE: query_dup                   <app_name> [-d|--detail]
```

说明:

- `-d`选项: 如果指定，则打印出详细信息

示例:

```
>>> query_dup temp -d
```

### remove_dup

移除 duplication 的集群, 参见[跨机房同步](/administration/duplication)。

用法:

```
USAGE: remove_dup                  <app_name> <dup_id>
```

示例:

```
>>> remove_dup temp my_cluster:8000
```

### start_dup

开始跨机房同步, 启动 duplication 的备份功能, 参见[跨机房同步](/administration/duplication)。

用法:

```
USAGE: start_dup                   <app_name> <dup_id>
```

示例:

```
>>> start_dup temp my_cluster
```

### pause_dup

暂停跨机房同步, 暂停 duplication 的备份功能, 参见[跨机房同步](/administration/duplication)。

用法:

```
USAGE: pause_dup                   <app_name> <dup_id>
```

说明:

- 选择好想要暂停 duplication 的 app name 后，需要指定 dup_id。

示例:

```
>>> pause_dup temp my_cluster
```

### set_dup_fail_mode

设置 duplication 失败后的处理的方式, 对指定的表的指定同步集群设置, 可设置为 fail 和 skip。

用法:

```
USAGE: set_dup_fail_mode           <app_name> <dup_id> <slow|skip>
```

说明:

- slow 模式为默认模式。该模式会对任何故障都会无限重试。
- skip 模式遇到故障时，重试多次仍不成功后，直接跳过对当前这批数据的热备份，从而复制下一批数据。

示例:

```
>>> set_dup_fail_mode temp my_cluster slow
```

### get_replica_count

获取表的副本数参数值。

用法:

```
USAGE: get_replica_count           <app_name>
```

示例:

```
>>> get_replica_count temp
>>> the replica count of app(temp) is 3
```

### set_replica_count

设置表的副本数参数。

用法:

```
USAGE: set_replica_count           <app_name> <replica_count>
```

示例:

```
>>> set_replica_count temp 4
>>> PLEASE be CAUTIOUS with this operation ! Are you sure to set the replica count of app(temp) to 4 ? [Y/n]: Y
```

## 数据操作

| 子命令             | 功能                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| set                | 设置单条数据                                                                                                                                                         |
| multi_set          | 设置同一 HashKey 下的多条数据                                                                                                                                        |
| get                | 获取单条数据                                                                                                                                                         |
| multi_get          | 通过指定多个 SortKey，获取同一 HashKey 下的多条数据                                                                                                                  |
| multi_get_range    | 通过指定 SortKey 的查询范围和过滤条件，获取同一 HashKey 下的多条数据                                                                                                 |
| multi_get_sortkeys | 获取同一 HashKey 下的所有 SortKey                                                                                                                                    |
| del                | 删除单条数据                                                                                                                                                         |
| multi_del          | 通过指定多个 SortKey，删除同一 HashKey 下的多条数据                                                                                                                  |
| multi_del_range    | 通过指定 SortKey 的查询范围和过滤条件，删除同一 HashKey 下的多条数据                                                                                                 |
| incr               | [原子增减操作](/api/single-atomic#原子增减)                                                                                                                          |
| check_and_set      | [原子 CAS 操作](/api/single-atomic#cas操作)                                                                                                                          |
| check_and_mutate   | [原子 CAS 扩展版本](/clients/java-client#checkandmutate)                                                                                                             |
| exist              | 查询某条数据是否存在                                                                                                                                                 |
| count              | 获取同一 HashKey 下的 SortKey 的个数                                                                                                                                 |
| ttl                | 查询某条数据的 TTL(Time To Live) 时间，返回剩余的 live 时间，单位为秒；返回 Infinite 表示没有 TTL 限制                                                               |
| hash               | 计算键值的哈希值                                                                                                                                                     |
| hash_scan          | 逐条扫描同一 HashKey 下的数据，可指定 SortKey 的查询范围和过滤条件，结果按照 SortKey 排序                                                                            |
| full_scan          | 对表进行全扫描，可指定 HashKey、SortKey 和 Value 的过滤条件，同一 HashKey 的结果按照 SortKey 排序，HashKey 之间无顺序保证                                            |
| copy_data          | 将一个表的数据逐条插入到另外一个表，源表通过`use`命令指定，目标表通过`-c`和`-a`命令执行，目标表可以在另外一个集群，详细用法参见 [Table迁移#copy_data迁移](/administration/table-migration#copy_data迁移)，可指定 HashKey、SortKey 和 Value 的过滤条件                                                                                                                                                     |
| clear_data         | 将一个表的数据逐条删除，实际上就是先扫描数据，然后对每一条数据执行删除操作，可指定 HashKey、SortKey 和 Value 的过滤条件                                              |
| count_data         | 统计一个表的数据条数，可加`-z`选项统计数据大小，可指定 HashKey、SortKey 和 Value 的过滤条件                                                                          |

### set

设置单条数据。

用法：

```
USAGE:  set                    <hash_key> <sort_key> <value> [ttl_in_seconds]
```

说明：

- 写入数据的格式必须为`hash_key`+`sort_key`+`value`。
- `ttl_in_seconds`参数：如果指定，则设置该条数据的存活时间，单位为秒。

示例：

```
>>> set pegasus cloud 000
```

### multi_set

设置同一 hash_key 下的多条数据。

用法：

```
USAGE:  multi_set                    <hash_key> <sort_key> <value> [sort_key value...]
```

说明：

- sort_key 是 pegasus 定义的一种数据模型，详细信息参见[数据模型](/overview/data-model)。
- 不同的 sort_key 名字必须不同，否则会输出 “ERROR: duplicate sort key <sort_key>”。

示例：

```
>>> multi_set pegasus cloud0 000 cloud1 001
```

### get

获取单条数据。

用法：

```
USAGE:  get                    <hash_key> <sort_key>
```

示例：

```
>>> get pegasus cloud
```

### multi_get

通过指定多个 SortKey，获取同一 HashKey 下的多条数据。

用法：

```
USAGE:  multi_get              <hash_key> [sort_key...]
```

示例：

```
>>> multi_get pegasus cloud0 cloud1
```

### multi_get_range

通过指定 SortKey 的查询范围和过滤条件，获取同一 HashKey 下的多条数据。

用法：

```
USAGE:  multi_get_range        <hash_key> <start_sort_key> <stop_sort_key>
                               [-a|--start_inclusive true|false] [-b|--stop_inclusive true|false]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix]
                               [-y|--sort_key_filter_pattern str] [-n|--max_count num]
                               [-i|--no_value] [-r|--reverse]
```

说明：

- `-a|--start_inclusive`参数：指定是否包含 StartSortKey，默认为 true。
- `-b|--stop_inclusive`参数：指定是否包含 StopSortKey，默认为 false。
- `-s|--sort_key_filter_type`参数：指定 SortKey 的过滤类型，包括无过滤、任意位置匹配、前缀匹配和后缀匹配，默认无过滤。
- `-y|--sort_key_filter_pattern`参数：指定 SortKey 的过滤模式串，空串相当于无过滤。
- `-n|--max_count`参数：指定最多读取的数据条数。
- `-i|--no_value`参数：指定是否只返回 HashKey 和 SortKey，不返回 Value 数据，默认为 false。
- `-r|--reverse`参数：是否逆向扫描数据库，从后往前查找数据，但是查找得到的结果在 list 中还是按照 SortKey 从小到大顺序存放。该参数从[v1.8.0版本](https://github.com/apache/incubator-pegasus/releases/tag/v1.8.0)开始支持。

示例：

```
>>> multi_get_range pegasus cloud0 cloud5 -a true -b true -s prefix -y str -n 100 -i false -r false
```

### multi_get_sortkeys

获取同一 HashKey 下的所有 SortKey。

用法：

```
USAGE:  multi_get_sortkeys     <hash_key>
```

示例：

```
>>> multi_get_sortkeys pegasus
```

### del

删除单条数据。

用法：

```
USAGE:  del                    <hash_key> <sort_key>
```

示例：

```
>>> del pegasus cloud0
```

### multi_del

通过指定多个 SortKey，删除同一 HashKey 下的多条数据。

用法：

```
USAGE:  multi_del              <hash_key> <sort_key> [sort_key...]
```

示例：

```
>>> multi_del del pegasus cloud0 cloud1
```

### multi_del_range

通过指定 SortKey 的查询范围和过滤条件，删除同一 HashKey 下的多条数据。

用法：

```
USAGE:  multi_del_range        <hash_key> <start_sort_key> <stop_sort_key>
                               [-a|--start_inclusive true|false] [-b|--stop_inclusive true|false]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix]
                               [-y|--sort_key_filter_pattern str] [-o|--output file_name]
                               [-i|--silent]
```

说明：

- `-i|--silent`参数：如果为`true`表示不打印删除时的日志。
- 其余参数，参见 [multi_get_range](#multi_get_range) 说明。

示例：

```
>>> multi_del_range pegasus cloud0 cloud5 -a true -b true -s prefix -y str -n 100 -i false -r false
```

### incr

原子增减操作。

用法：

```
USAGE:  incr                 <hash_key> <sort_key> [increment]
```

说明：

- 操作数 increment 可以为正数也可以为负数，所以一个 incr 接口就可以实现原子增或者原子减，详情参照[原子增减](/api/single-atomic#原子增减)。

示例：

```
>>> incr  cloud0 pegasus 1
```

### check_and_set

原子 CAS 操作。

用法：

```
USAGE:  check_and_set          <hash_key> [-c|--check_sort_key str]
                               [-t|--check_type not_exist|not_exist_or_empty|exist|not_empty]
                               [match_anywhere|match_prefix|match_postfix]
                               [bytes_less|bytes_less_or_equal|bytes_equal|bytes_greater_or_equal|bytes_greater]
                               [int_less|int_less_or_equal|int_equal|int_greater_or_equal|int_greater]
                               [-o|--check_operand str] [-s|--set_sort_key str] [-v|--set_value str]
                               [-l|--set_value_ttl_seconds num] [-r|--return_check_value]
```

说明：

- 对比交换，最初是表示一条 CPU 的原子指令，其作用是让 CPU 先进行比较两个值是否相等，然后原子地更新某个位置的值。参照 [CAS 操作](/api/single-atomic#cas操作)。

示例：
该命令检查 hashKey=cloud 的数据，若 sortKey=90 的 value 存在，则将 sortKey=91 的 value 设置为 92，且返回 sortKey=90 的 value 值。

```
>>> check_and_set cloud -c 90 -t exist -s 91 -v 92 -r
```

### check_and_mutate

原子 CAS 扩展版本，参见[原子 CAS 扩展版本](/clients/java-client#checkandmutate)。

用法：

```
USAGE:  check_and_mutate       <hash_key> [-c|--check_sort_key str]
                               [-t|--check_type not_exist|not_exist_or_empty|exist|not_empty]
                               [match_anywhere|match_prefix|match_postfix]
                               [bytes_less|bytes_less_or_equal|bytes_equal|bytes_greater_or_equal|bytes_greater]
                               [int_less|int_less_or_equal|int_equal|int_greater_or_equal|int_greater]
                               [-o|--check_operand str] [-r|--return_check_value]
```

### exist

查询某条数据是否存在。

用法：

```
USAGE:  exist <hash_key> <sort_key>
```

示例：

```
>>> exist pegasus cloud0
```

### count

获取同一 HashKey 下的 SortKey 的个数。

用法：

```
USAGE:  count <hash_key>
```

示例：

```
>>> count pegasus
```

### ttl

查询某条数据的 TTL(Time To Live) 时间，返回剩余的 live 时间，单位为秒；返回 Infinite 表示没有 TTL 限制。

用法：

```
USAGE:  ttl <hash_key> <sort_key>
```

示例：

```
>>> ttl pegasus cloud
```

### hash

查询某条数据的 hash 值，返回 hash 值的整数形式。

如果在使用该命令前通过`use [app_name]`选定了特定表，还会根据 hash 值计算数据所对应的 partition_id，并返回当前服务该 partition 的 primary 和 secondary 节点信息。

用法：

```
USAGE:  hash <hash_key> <sort_key>
```

示例：

```
>>> hash pegasus cloud
```

### hash_scan

逐条扫描同一 HashKey 下的数据，可指定 SortKey 的查询范围和过滤条件，结果按照 SortKey 排序。

用法：

```
USAGE:  hash_scan     <hash_key> <start_sort_key> <stop_sort_key>
                      [-a|--start_inclusive true|false]
                      [-b|--stop_inclusive true|false]
                      [-s|--sort_key_filter_type anywhere|prefix]
                      [-y|--sort_key_filter_pattern str]
                      [-v|--value_filter_type anywhere|prefix|postfix|exact
                      [-z|--value_filter_pattern str]
                      [-o|--output file_name]
                      [-n|--max_count num]
                      [-t|--timeout_ms num]
                      [-d|--detailed]
                      [-i|--no_value]
```

说明：

- `-a|--start_inclusive`参数：指定是否包含 StartSortKey，默认为 true。
- `-b|--stop_inclusive`参数：指定是否包含 StopSortKey，默认为 false。
- `-s|--sort_key_filter_type`参数：指定 SortKey 的过滤类型，包括无过滤、任意位置匹配、前缀匹配和后缀匹配，默认无过滤。
- `-y|--sort_key_filter_pattern`参数：指定 SortKey 的过滤模式串，空串相当于无过滤。
- `-v|--value_filter_type`参数：指定 value 过滤类型，包括任意位置匹配、前缀匹配、后缀匹配等。
- `-z|--value_filter_pattern str`参数：指定 value 的过滤模式串，空串相当于无过滤。
- `-o|--output file_name`参数：指定输出结果存入的文件名。
- `-n|--max_count num`参数：指定获取值的最大数量。
- `-t|--timeout_ms num`参数：指定获取数据的超时时间。
- `-d|--detailed`参数：输出数据的详细存储信息，包括 app_id、partition_index、server_ip。
- `-i|--no_value`参数：不获取 value 值，仅输出 hash_key 和 sort_key。

示例：

```
>>> hash_scan pegasus cloud00 cloud01
```

### full_scan

对表进行全扫描，可指定 HashKey、SortKey 和 Value 的过滤条件，同一 HashKey 的结果按照 SortKey 排序，HashKey 之间无顺序保证。

用法：

```
USAGE: full_scan      [-h|--hash_key_filter_type anywhere|prefix|postfix]
                      [-x|--hash_key_filter_pattern str]
                      [-s|--sort_key_filter_type anywhere|prefix]
                      [-y|--sort_key_filter_pattern str]
                      [-v|--value_filter_type anywhere|prefix|postfix|exact
                      [-z|--value_filter_pattern str]
                      [-o|--output file_name]
                      [-n|--max_count num]
                      [-t|--timeout_ms num]
                      [-d|--detailed]
                      [-i|--no_value]
```

说明：

- 参数说明参见 [hash_scan](#hashKey_scan)。

实例：

```
>>> full_scan
```

### copy_data

将一个表的数据逐条插入到另外一个表。

用法：

```
USAGE:  copy_data     <-c|--target_cluster_name str> <-a|--target_app_name str>
                      [-p|--partition num] [-b|--max_batch_count num] [-t|--timeout_ms num]
                      [-h|--hash_key_filter_type anywhere|prefix|postfix]
                      [-x|--hash_key_filter_pattern str]
                      [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                      [-y|--sort_key_filter_pattern str]
                      [-v|--value_filter_type anywhere|prefix|postfix|exact]
                      [-z|--value_filter_pattern str] [-m|--max_multi_set_concurrency]
                      [-o|--scan_option_batch_size] [-n|--no_overwrite] [-i|--no_value]
                      [-g|--geo_data] [-u|--use_multi_set]
```

说明：

- 源表通过 use 命令指定，目标表通过 -c 和 -a 命令执行，目标表可以在另外一个集群，详细用法参见 [Table 迁移#copy_data迁移](/administration/table-migration#copy_data迁移)，可指定 HashKey、SortKey 和 Value 的过滤条件。

示例：

```
>>> copy_data -c ClusterB -a TableB -t 10000
```

### clear_data

将一个表的数据逐条删除，实际上就是先扫描数据，然后对每一条数据执行删除操作，可指定 HashKey、SortKey 和 Value 的过滤条件。

用法：

```
USAGE:  clear_data    [-p|--partition num]
                      [-b|--max_batch_count num]
                      [-t|--timeout_ms num]
                      [-h|--hash_key_filter_type anywhere|prefix|postfix]
                      [-x|--hash_key_filter_pattern str]
                      [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                      [-y|--sort_key_filter_pattern str]
                      [-v|--value_filter_type anywhere|prefix|postfix|exact]
                      [-z|--value_filter_pattern str]
                      [-f|--force]
```

说明：

- `-p|--partition num`参数：指定删除的分片。
- `-b|--max_batch_count num`参数：指定一次性删除的最大数量。
- `-f|--force`参数：如果为 true，则表示删除，否则无法删除并打印再次确认信息 “ERROR: be careful to clear data!!! Please specify --force if you are determined to do”。
- 其余参数均为过滤条件，参见 [multi_get_range](#multi_get_range)。

示例：

```
>>> clear_data
```

### count_data

统计一个表的数据条数，可指定 HashKey、SortKey 和 Value 的过滤条件。

用法：

```
USAGE:   count_data   [-c|--precise][-p|--partition num]
                      [-b|--max_batch_count num][-t|--timeout_ms num]
                      [-h|--hash_key_filter_type anywhere|prefix|postfix]
                      [-x|--hash_key_filter_pattern str]
                      [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                      [-y|--sort_key_filter_pattern str]
                      [-v|--value_filter_type anywhere|prefix|postfix|exact]
                      [-z|--value_filter_pattern str][-d|--diff_hash_key] [-a|--stat_size]
                      [-n|--top_count num] [-r|--run_seconds num]
USAGE:  count_data    [-p|--partition num] [-b|--max_batch_count num] [-t|--timeout_ms num]
                      [-h|--hash_key_filter_type anywhere|prefix|postfix]
                      [-x|--hash_key_filter_pattern str]
                      [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                      [-y|--sort_key_filter_pattern str]
                      [-v|--value_filter_type anywhere|prefix|postfix|exact]
                      [-z|--value_filter_pattern str] [-d|--diff_hash_key] [-a|--stat_size]
                      [-n|--top_count num] [-r|--run_seconds num]
```

说明：

- `-c|--precise`参数：指定表的详细数据。
- `-p|--partition`参数：指定删除的分片。
- `-b|--max_batch_count`参数：指定一次性删除的最大数量。
- `-d|--diff_hash_key`参数：统计 hashKey 数量。
- `-n|--top_count`参数：仅展示指定数量的数据。
- `-a|--stat_size`参数：统计当前 value 的大小，单位字节。
- `-r|--run_seconds num`参数：仅运行指定时间进行统计。
- 其余参数均为过滤条件，参见 [multi_get_range](#multi_get_range)。

示例：

```
>>> count_data
```

## 负载均衡

| 子命令         | 功能                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| set_meta_level | 设置集群的负载均衡级别，包括 stopped、blind、freezed、steady、lively。集群默认为 steady，表示不进行自动负载均衡；设置为 lively 可以开启自动负载均衡 |
| get_meta_level | 获取集群的负载均衡级别                                                                                                                              |
| propose        | 发送 partition 操作，包括 ASSIGN_PRIMARY、ADD_SECONDARY、DOWNGRADE_TO_INACTIVE 等                                                                   |
| balance        | 发送 balance 操作，包括 move_pri、copy_pri、copy_sec 等                                                                                             |

关于负载均衡的详细文档，请参考[负载均衡](/administration/rebalance)。

## 数据恢复

| 子命令       | 功能                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| recover      | 启动数据恢复流程，通过向 ReplicaServer 收集和学习，重新构建 Zookeeper 上的元数据信息，参见[元数据恢复](/administration/meta-recovery) |
| ddd_diagnose | DDD 自动诊断工具，用于恢复所有备份全部不可用的 partition，参见 [Replica数据恢复](/administration/replica-recovery)                     |

## 冷备份管理

| 子命令                | 功能                       |
| --------------------- | -------------------------- |
| add_backup_policy     | 增加冷备份策略             |
| ls_backup_policy      | 查询冷备份策略             |
| modify_backup_policy  | 修改冷备份策略             |
| disable_backup_policy | 禁用冷备份策略             |
| enable_backup_policy  | 启用冷备份策略             |
| restore_app           | 从冷备份中恢复表           |
| query_backup_policy   | 查询备份策略和上次备份信息 |
| query_restore_status  | 查询冷备份恢复进度         |

关于冷备份的详细文档，请参考[冷备份](/administration/cold-backup)。

## 调试工具

| 子命令    | 功能                                                                                |
| --------- | ----------------------------------------------------------------------------------- |
| sst_dump  | 使用 RocksDB 的`sst_dump`工具，将 rocksdb 的二进制 sstable 数据转换为可读的文本数据 |
| mlog_dump | 将 Pegasus 的二进制 commit log 数据转换为可读的文本数据                             |
| local_get | 从本地数据库获取值（原来的调试工具）                                                |
