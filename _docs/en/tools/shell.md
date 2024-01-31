---
permalink: /docs/tools/shell/
redirect_from: /overview/shell/
---

Pegasus offers a comprehensive Shell utility designed for perusing cluster-related data, crafting and eliminating tables, and orchestrating data operations, among other functions. This document base on version 2.5.0.

# Obtaining the tool

After successfully [compiling Pegasus](compilation) and initiating [onebox](overviwe/onebox), initiate the Shell utility in the Pegasus directory:

```bash
./run.sh shell
```

You can also utilize the 'pack' tool to package the Shell utility, making it convenient for use on other machines:

```bash
./run.sh pack_tools
```

After a successful execution of 'pack', a file named `pegasus-tools-{version}-{gitSHA}-{platform}-{buildType}.tar.gz` will be generated in your local directory. Copy this file to your target machine, extract it, navigate to the folder, and run './run.sh shell' to use the Shell utility. You can also use the '-h' option to retrieve assistance:

```
$ ./run.sh shell -h
Options for subcommand 'shell':
   -h|--help            print the help info
   -c|--config <path>   config file path, default './config-shell.ini.{PID}'
   --cluster <str>      cluster meta lists, default '127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603'
```

For instance, when accessing a particular cluster:

```
./run.sh shell --cluster 127.0.0.1:34601,127.0.0.1:34602
```

# Introduction to Tool Usage

The Shell tool adopts a subcommand mode. Entering the subcommand mode and executing `help` will display the help document. (Note: Commands may vary depending on the version. The following is for version 2.5.0). For each subcommand, you can also use the `-h` option to obtain help information for that subcommand.

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

To enhance user-friendliness, we have classified them according to their distinct functionalities.

## Basic Commands

| Subcommands | Functionality                                                         |
| ----------- | --------------------------------------------------------------------- |
| help        | To obtain assistance and information.                                 |
| version     | Obtain the version details of the Shell tool.                         |
| exit        | Exiting the Shell tool is analogous to entering "Ctrl-C" or "Ctrl-D". |

### help

To obtain assistance and information.

### version

Obtain the version details of the Shell tool.

### exit

Exiting the Shell tool is analogous to entering "Ctrl-C" or "Ctrl-D".

## Global properties

| Subcommands | Functionality                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cc          | Full name Change Cluster, altering the presently employed cluster.                                                                                                                          |
| use         | Specify the currently utilized table; certain subcommands require you to designate a table before usage, such as data manipulation commands.                                                |
| escape_all  | When presenting byte-class data, the default behavior is to convert only "invisible characters" into hexadecimal encoding, rather than converting "all characters" to hexadecimal encoding. |
| timeout     | The default timeout duration for data operations is set to a specific period.                                                                                                               |

### cc

Full name Change Cluster, altering the presently employed cluster.

Usage:

```
USAGE:  cc                     [cluster_name]
```

Explanation:

- The specified cluster name must be present in the [pegasus.clusters] section of the `src/shell/config.ini` configuration file.
- You can configure multiple clusters within the [pegasus.clusters] section.

Examples:

```
>>> cc my_cluster
```

### use

Specify the currently utilized table; certain subcommands require you to designate a table before usage, such as data manipulation commands.

Usage:

```
USAGE:  use                    [app_name]
```

Explanation:

- Tables must be created before they can be used. By default, there is a `temp` table available.

Examples:

```
>>> use tmp
```

### escape_all

When presenting byte-class data, the default behavior is to convert only "invisible characters" into hexadecimal encoding, rather than converting "all characters" to hexadecimal encoding.

Usage:

```
USAGE:  escape_all             [true|false]
```

Explanation:

- The default value is 'false'.

Examples:

```
>>> escape_all true
```

### timeout

Specify the default timeout duration for data operations, in milliseconds (ms).

Usage:

```
USAGE:  timeout                [time_in_ms]
```

Explanation:

- If you do not specify [time_in_ms], it will display the current timeout duration.

Examples:

```
>>> timeout 1000
```

## Node Management

| Subcommands    | Functionality                                                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cluster_info   | Obtain Basic Cluster Information.                                                                                                                                                              |
| nodes          | Retrieve a List of Nodes; you can include the `-d` option to obtain the load status of each node.                                                                                              |
| server_info    | Obtain essential information about each node, primarily including the server version and node startup time.                                                                                    |
| server_stat    | The statistical data for each node includes essential metrics, such as the Queries Per Second (QPS) and latency for **get** and **put** operations, as well as memory and storage utilization. |
| remote_command | Dispatch remote commands to the nodes to execute certain specialized operations.                                                                                                               |
| flush_log      | Transmit remote commands to the nodes to flush log data from the recent buffer into the log files.                                                                                             |
| disk_replica   | The distribution of each node's replicas across the disks.                                                                                                                                     |
| disk_capacity  | The disk space utilization of each node.                                                                                                                                                       |

### cluster_info

Obtain Basic Cluster Information.

Explanation:

- The primary components of cluster information primarily encompass:
  - Information on the nodes for meta_server and zookeeper.
  - Meta_function_level: Strategies for load balancing.
  - balance_operation_count: Statistics for load balancing operations, including **move_pri**, **move_pri**, **copy_sec**, and **total**. For more information on load balancing, refer to [Load balancing](/administration/rebalance).
  - Primary_replica_count_stddev: A metric for measuring load balancing.
  - Total_replica_count_stddev: A metric for measuring load balancing.

Examples:

```
>>> cluster_info
[cluster_info]
meta_servers                  :
primary_meta_server           :
zookeeper_hosts               :
zookeeper_root                :
meta_function_level           :
balance_operation_count       :
primary_replica_count_stddev  :
total_replica_count_stddev    :
```

### nodes

Retrieve the list of replica nodes, typically represented by their IP addresses, and display their fundamental information.

Usage:

```
USAGE:  nodes                  [-d|--detailed] [-j|--json] [-r|--resolve_ip] [-u|--resource_usage]
                               [-o|--output file_name] [-s|--status all|alive|unalive] [-q|--qps]
                               [-p|latency_percentile 50|90|95|99|999]
```

Explanation:

- The `-d` option: When specified, it provides detailed information about each node, such as the load conditions of the nodes.
- The `-r` option: When specified, represent the node using domain name information and display its basic details. If the domain name corresponding to the node's address cannot be found, indicate it as **UNRESOLVABLE**.
- The `-u` option: When specified, display the resource utilization of the nodes.
- The `-o` option: When specified, export basic information to a specified file, defaulting to the current path.
- The `-s` option: When specified, output information of nodes in a specific status, including options like **all**, **alive**, and **unalive**.
- The `-q` option: When specified, display only the QPS information of the specified node.
- The `-p` option: When specified, exhibit the latency levels of the specified node.

Examples:

```
>>> nodes -s alive
```

### server_info

Obtain essential information about each node, primarily including the server version and node startup time.

Usage:

```
USAGE:  server_info              [-t all|meta-server|replica-server] [-l ip:port,ip:port...]
```

Explanation:

- The `-t` option: When specified, opt to output information regarding the categories of server nodes, including **all**, **meta-server**, and **replica-server**.
- The `-l` option: When specified, choose to output information for nodes with specific IP addresses, connecting multiple nodes with a comma **","**.

Examples:

```
>>> server_info -t meta-server
```

### server_stat

The statistical data for each node includes essential metrics, such as the Queries Per Second (QPS) and latency for **get** and **put** operations, as well as memory and storage utilization.

Usage:

```
USAGE:  server_stat              [-t all|meta-server|replica-server] [-l ip:port,ip:port...]
```

Explanation:

- The explanation of option parameters same as [server_info](#server_info)。

Examples:

```
>>> server_stat -t meta-server
```

### remote_command

Dispatch remote commands to the nodes to execute certain specialized operations.

Usage:

```
USAGE:  remote_command           [-t all|meta-server|replica-server] [-l ip:port,ip:port...] <command>
```

Explanation:

- The `-t`、`-l` option: Used to select specific target machines,see [server_info](#server_info) explanation.
- Detailed information on remote commands, refer to [remote commands](/administration/remote-commands).

Examples:

```
>>> recommand -t meta-server server-info
```

### flush_log

Transmit remote commands to the nodes to flush log data from the recent buffer into the log files.

Usage:

```
USAGE:  flush_log                [-t all|meta-server|replica-server] [-l ip:port,ip:port...]
```

Explanation:

- The `-t`、`-l` option: Used to select specific target machines,see [server_info](#server_info) explanation.

Examples:

```
>>> flush_log -t meta-server
```

### disk_replica

The distribution of each node's replicas across the disks. Version 1.12.3 offers support.

Usage:

```
USAGE:  disk_replica             [-n|--node replica_server(ip:port)][-a|-app app_name][-o|--out file_name][-j|--json]
```

Explanation:

- The `-n` option: Utilized to view the distribution of replicas on the disk of a specific node, formatted as ip:port.
- The `-a` option: Used to observe the distribution of a table's replicas across the disk of a node.
- The `-o` option: Direct the output to a specified file.
- The `-j` option: Output the query results in JSON format.

Examples:

```
>>> disk_replica -n 127.0.0.1:34608 -a temp
```

### disk_capacity

Query the disk space utilization of replica_server nodes. Version 1.12.3 offers support.

Usage:

```
USAGE:  disk_capacity            [-n|--node replica_server(ip:port)][-o|--out file_name][-j|-json][-d|--detail]
```

Explanation:

- The `-n` option: Utilized to view the distribution of replicas on the disk of a specific node, formatted as ip:port.
- The `-d` option: Used to examine the space utilization information for each disk on a node.
- The `-o` option: Direct the results to a specific file.
- The `-j` option: Output the query results in JSON format.

Examples:

```
>>> disk_capacity -n 127.0.0.1:34608 -d
```

## Table management

| Subcommands       | Functionality                                                                                                                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ls                | Retrieve a list of all tables, with the option to add `-d` to obtain the health status of each table, and `-a` to include information on tables that have been deleted.                                                                                         |
| app               | Acquire information about a specific table, with the option to add `-d` for detailed information, including the distribution and health status of each partition.                                                                                               |
| app_stat          | Obtain the read-write status and storage statistics of tables, with the option to add `-a` to specify an individual table and access detailed statistical information for each of its partitions.                                                               |
| app_disk          | Retrieve detailed storage information for a specific table, with the option to add `-d` to obtain comprehensive storage details for each partition.                                                                                                             |
| create            | Create a table, with the option to add `-p` and `-r` to specify the number of partitions and replicas, respectively. The number of partitions must be a power of two. If `-r` is not specified, the default number of replicas is set to 3 (recommended value). |
| drop              | Delete a table, refer to [use drop commands to delete a table](/administration/table-soft-delete#drop_commands).                                                                                                                                                |
| recall            | Restore a previously deleted table, refer to [use recall commands to recovery table](/administration/table-soft-delete#recall_commands).                                                                                                                        |
| get_app_envs      | Retrieve the environmental variables of a table, refer to [Table environment#get_app_envs](/administration/table-env#get_app_envs).                                                                                                                             |
| set_app_envs      | Set the environmental variables for a table, refer to [Table environment#set_app_envs](/administration/table-env#set_app_envs).                                                                                                                                 |
| del_app_envs      | Delete the environmental variables of a table, refer to [Table environment#del_app_envs](/administration/table-env#del_app_envs).                                                                                                                               |
| clear_app_envs    | Clean up the environmental variables of a table, refer to [Table environment#clear_app_envs](/administration/table-env#clear_app_envs).                                                                                                                         |
| add_dup           | Add a cluster with duplication, refer to [duplication](/administration/duplication).                                                                                                                                                                            |
| query_dup         | Query the clusters for cross-data center synchronization of a table, refer to [duplication](/administration/duplication).                                                                                                                                       |
| remove_dup        | Remove a cluster with duplication, refer to [duplication](/administration/duplication).                                                                                                                                                                         |
| start_dup         | Initiate cross-data center synchronization and activate the duplication backup feature, refer to [duplication](/administration/duplication).                                                                                                                    |
| pause_dup         | Pause cross-data center synchronization and suspend the duplication backup feature, refer to [duplication](/administration/duplication).                                                                                                                        |
| set_dup_fail_mode | Configure the handling method for duplication failures, setting it for a specified table and its synchronization cluster, with options to set as **fail** or **skip**.                                                                                              |
| get_replica_count | Retrieve the replica count parameter value for the table.                                                                                                                                                                                                       |
| set_replica_count | Set the replica count parameter for the table.                                                                                                                                                                                                                  |

### ls

Retrieve a list of all tables.

Usage:

```
USAGE:  ls                     [-a|-all] [-d|--detailed] [-o|--output file_name]
                               [-s|--status all|available|creating|dropping|dropped]
```

Explanation:

- The `-a` option: When specified, display all tables, including those that have been deleted.
- The `-d` option: When specified, show detailed information for each table, primarily focusing on the health status of the partitions.
- The `-o` option: When specified, direct the results to the file specified by the parameter.
- The `-s` option: When specified, display only the tables that match the status specified by the parameter.

Examples:

```
>>> ls -d -o ls.txt
```

### app

Acquire information about a specific table.

Usage:

```
USAGE:  app                    <app_name> [-d|--detailed] [-o|--output file_name]
```

Explanation:

- The `-d` option: When specified, display detailed information for each table, such as the distribution and health status of partitions.
- The `-o` option: When specified, output the results to the file designated by the parameter.

Examples:

```
>>> app temp
```

### app_stat

Retrieve the read, write, and storage statistical information of the table, including operations like **get**, **put**, **del**, etc.

Usage:

```
USAGE:  app_stat               [-a|--app_name str] [-q|--only_qps] [-u|--only_usage]
                               [-o|--output file_name]
```

Examples:

```
>>> app_stat temp
```

Explanation:

- The `-a` option: When specified, display detailed information categorized by the partitions of the specified table.
- The `-q` option: When specified, display only the QPS information of the specified table.
- The `-u` option: When specified, display only the usage information of the specified table.
- The `-o` option: When specified, output the results to the specified file.

### app_disk

Retrieve detailed storage information for a specific table.

Usage:

```
USAGE:  app_disk                <app_name> [-d|--detailed] [-o|--output file_name]
```

Explanation:

- The `-d` option: When specified, will allows for obtaining detailed information about the table, such as the status of primary and secondary elements.
- The `-o` option: When specified, output the results to the specified file.

Examples:

```
>>> app_disk temp
```

### create

Create table.

Usage:

```
USAGE: create                  <app_name> [-p|--partition_count num] [-r|--replica_count num]
                                          [-e|--envs k1=v1,k2=v2...]
```

Explanation:

- The `-p` option: When specified, will allows for setting the number of partitions, with the requirement that the number of partitions be a power of two.
- The `-r` option: When specified, will allows for specifying the number of replicas, with a recommended replica count of 3.
- The `-e` option: When specified, will allows for setting environmental variables, refer to [Table environment](/administration/table-env).

Examples:

```
>>> create temp
```

### drop

Delete table.

Usage:

```
USAGE: drop                    <app_name> [-r|--reserve_seconds num]
```

Explanation:

- The `-r` option: When specified, will sets the data retention duration (counted from the time of deletion, in seconds). If not specified, it uses the value from the configuration file hold_seconds_for_dropped_app, which defaults to 7 days, refer to [Table soft delete#drop_commands](/administration/table-soft-delete#drop_commands).

Examples:

```
>>> drop temp
```

### recall

Restore a previously deleted table.

Usage:

```
USAGE: recall                  <app_id> [new_app_name]
```

Explanation:

- Note that this command restores tables using the `app_id`.
- The `new_app_name` parameter: If a new table name is not specified, the original table name will be used. Otherwise, the specified new table name will be adopted. If the original table name already exists (a new table with the same name was created after the deletion), a different new table name must be specified; otherwise, the operation will fail.
- For more information please to refer to [Table soft delete#recall_commands](/administration/table-soft-delete#recall_commands).

Examples:

```
>>> recall 19
```

### get_app_envs

Retrieve the environmental variables of a table. For more information about environmental variables, please refer to [Table environment](/administration/table-env).

Usage:

```
USAGE: get_app_envs
```

Explanation:

- This command outputs the current environmental variables of the table. Please use `use [app_name]` to select a specific table before executing this command. For reference, see [get_app_envs](/administration/table-env#get_app_envs).

Examples:

```
>>> use temp
>>> get_app_envs
```

### set_app_envs

Set the environmental variables for a table. For more information about environmental variables, please refer to [Table environment](/administration/table-env).

Usage:

```
USAGE: set_app_envs            <key> <value> [key value...]
```

Explanation:

- This command will set the current environmental variables of the table. Please use `use [app_name]` to select a specific table before executing this command. For reference, see [get_app_envs](/administration/table-env#get_app_envs).

Examples:

```
>>> use temp
>>> set_app_envs rocksdb.usage_scenario bulk_load
```

### del_app_envs

Delete the environmental variables of a table. For more information about environmental variables, please refer to [Table environment](/administration/table-env).

Usage:

```
USAGE: del_app_envs            <key> [key...]
```

Explanation:

- This command delete the environmental variables of the current table. Please use `use [app_name]` to select a specific table before executing this command. For reference, see [get_app_envs](/administration/table-env#get_app_envs).

Examples:

```
>>> use temp
>>> del_app_envs rocksdb.usage_scenario
```

### clear_app_envs

Cleanse the environmental variables of the table. For further details regarding environmental variables, kindly refer to [Table environment](/administration/table-env).

Usage:

```
USAGE: clear_app_envs          [-a|--all] [-p|--prefix str]
```

Explanation:

- This command eradicates the present table's environmental variables. Prior to employment, please ensure to employ `use [app_name]` to designate a specific table, as referenced in [clear_app_envs](/administration/table-env#clear_app_envs).
- The `-a` option: When specified, it results in the purging of all environmental variables.
- The `-p` option: When specified, it allows for the elimination of environmental variables with a specific prefix string.

Examples:

```
>>> use temp
>>> clear_app_envs -p rocksdb
```

### add_dup

Incorporate a cluster with duplication, as indicated in [duplication](/administration/duplication).

Usage:

```
USAGE: add_dup                 <app_name> <remote_cluster_name>
```

Explanation:

- Apply the specified duplication cluster to the designated table.

Examples:

```
>>> add_dup temp my_cluster
```

### query_dup

Retrieve the clusters responsible for cross-data center synchronization of the table, as referenced in [duplication](/administration/duplication).

Usage:

```
USAGE: query_dup               <app_name> [-d|--detail]
```

Explanation:

- The `-d` option: When specified, print out the detailed information.

Examples:

```
>>> query_dup temp -d
```

### remove_dup

Remove a duplication cluster, as specified in [duplication](/administration/duplication).

Usage:

```
USAGE: remove_dup              <app_name> <dup_id>
```

Examples:

```
>>> remove_dup temp my_cluster:8000
```

### start_dup

Initiate cross-data center synchronization and activate the duplication backup feature, as described in [duplication](/administration/duplication).

Usage:

```
USAGE: start_dup               <app_name> <dup_id>
```

Examples:

```
>>> start_dup temp my_cluster
```

### pause_dup

Pause cross-data center synchronization and suspend the duplication backup feature, as outlined in [duplication](/administration/duplication).

Usage:

```
USAGE: pause_dup               <app_name> <dup_id>
```

Explanation:

- This command pause the present app's duplication function. Prior to employment, please ensure to employ `use [app_name]` to designate a specific table.

Examples:

```
>>> pause_dup temp my_cluster
>>>
```

### set_dup_fail_mode

Configure the handling method for duplication failures for a specified table and synchronization cluster. Options include `fail` and `skip`.

Usage:

```
USAGE: set_dup_fail_mode       <app_name> <dup_id> <slow|skip>
```

Explanation:

- The `slow mode` is the default mode. In this mode, it will endlessly retry for any failure.
- The `skip mode` when encountering a failure that persists through multiple retries, it will skip the hot backup for the current batch of data and proceed to replicate the next batch.

Examples:

```
>>> set_dup_fail_mode temp my_cluster slow
>>> set_dup_fail_mode temp my_cluster skip
```

### get_replica_count

Retrieve the parameter value for the number of replicas for the table.

Usage:

```
USAGE:  get_replica_count       <app_name>
```

Examples:

```
>>> get_replica_count temp
>>> the replica count of app(temp) is 3
```

### set_replica_count

Set the replica count parameter for the table.

Usage:

```
USAGE: set_replica_count       <app_name> <replica_count>
```

Examples:

```
>>> set_replica_count temp 4
>>> PLEASE be CAUTIOUS with this operation ! Are you sure to set the replica count of app(temp) to 4 ? [Y/n]: Y
```

## Data manipulation

| Subcommands        | Functionality                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| set                | Set a single piece of data.                                                                                                                                                                                                                                                                                                                                                                                              |
| multi_set          | Configure multiple pieces of data under the same HashKey.                                                                                                                                                                                                                                                                                                                                                                |
| get                | Retrieve a single piece of data.                                                                                                                                                                                                                                                                                                                                                                                         |
| multi_get          | Retrieve multiple pieces of data under the same HashKey by specifying multiple SortKeys.                                                                                                                                                                                                                                                                                                                                 |
| multi_get_range    | Retrieve multiple pieces of data under the same HashKey by specifying a query range and filtering criteria for the SortKey.                                                                                                                                                                                                                                                                                              |
| multi_get_sortkeys | Retrieve all SortKeys under the same HashKey.                                                                                                                                                                                                                                                                                                                                                                            |
| del                | Delete a single piece of data.                                                                                                                                                                                                                                                                                                                                                                                           |
| multi_del          | Delete multiple pieces of data under the same HashKey by specifying multiple SortKeys.                                                                                                                                                                                                                                                                                                                                   |
| multi_del_range    | Delete multiple pieces of data under the same HashKey by specifying a query range and filtering criteria for the SortKey.                                                                                                                                                                                                                                                                                                |
| incr               | [Atomic Increment-Decrement](/api/single-atomic#Atomic-Increment-Decrement).                                                                                                                                                                                                                                                                                                                                             |
| check_and_set      | [Atomic CAS operation](/api/single-atomic#cas-operation).                                                                                                                                                                                                                                                                                                                                                                |
| check_and_mutate   | [Atomic CAS extented version](/clients/java-client#checkandmutate).                                                                                                                                                                                                                                                                                                                                                      |
| exist              | Query whether a specific piece of data exists.                                                                                                                                                                                                                                                                                                                                                                           |
| count              | Retrieve the count of SortKeys under the same HashKey.                                                                                                                                                                                                                                                                                                                                                                   |
| ttl                | Inquire about the TTL (Time To Live) duration for a specific piece of data, returning the remaining live time in seconds. If "Infinite" is returned, it indicates there is no TTL limit.                                                                                                                                                                                                                                 |
| hash               | Compute the hash value of the key.                                                                                                                                                                                                                                                                                                                                                                                       |
| hash_scan          | Scan the data under the same HashKey one item at a time, with the option to specify a query range and filtering criteria for the SortKey. The results will be sorted by SortKey.                                                                                                                                                                                                                                         |
| full_scan          | Perform a full scan of the table, with the option to specify filtering conditions for HashKey, SortKey, and Value. Results under the same HashKey will be sorted by SortKey. There is no guaranteed order between HashKeys.                                                                                                                                                                                              |
| copy_data          | Insert the data from one table into another table one item at a time. Specify the source table using the `use` command and the target table using the `-c` and `-a` commands. The target table can be in another cluster. For detailed usage, refer to [Table Migration#copy_data_migration](/administration/table-migration#copy-data-migration). You can specify filtering conditions for HashKey, SortKey, and Value. |
| clear_data         | Delete the data from one table one item at a time, which involves scanning the data and performing deletion for each item. You can specify filtering conditions for HashKey, SortKey, and Value.                                                                                                                                                                                                                         |
| count_data         | Count the number of data items in a table, with the option to add `-z` to calculate the data size. You can also specify filtering conditions for HashKey, SortKey, and Value.                                                                                                                                                                                                                                            |

### set

Set a single piece of data.

Usage:

```
USAGE:  set                    <hash_key> <sort_key> <value> [ttl_in_seconds]
```

Explanation:

- The data format for writing must follow the pattern `hash_key` + `sort_key` + `value`.
- The `ttl_in_seconds` parameter: When specified, it sets the lifespan of the data item in seconds.

Examples:

```
>>> set pegasus cloud 000
```

### multi_set

Configure multiple pieces of data under the same **HashKey**.

Usage:

```
USAGE:  multi_set              <hash_key> <sort_key> <value> [sort_key value...]
```

Explanation:

- Sort_key is a data model defined by Pegasus. For detailed information, please refer to the [Data Model](/overview/data-model).
- Different sort_key names must be distinct; otherwise, an "ERROR: duplicate sort key <sort_key>" will be generated.

Examples:

```
>>> multi_set pegasus cloud0 000 cloud1 001
```

### get

Retrieve a single piece of data.

Usage:

```
USAGE:  get                    <hash_key> <sort_key>
```

Examples:

```
>>> get pegasus cloud
```

### multi_get

Retrieve multiple pieces of data under the same **HashKey** by specifying multiple SortKeys.

Usage:

```
USAGE:  multi_get              <hash_key> [sort_key...]
```

Examples:

```
>>> multi_get pegasus cloud0 cloud1
```

### multi_get_range

Retrieve multiple pieces of data under the same **HashKey** by specifying a query range and filtering criteria for the **SortKey**.

Usage:

```
USAGE:  multi_get_range        <hash_key> <start_sort_key> <stop_sort_key>
                               [-a|--start_inclusive true|false] [-b|--stop_inclusive true|false]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix]
                               [-y|--sort_key_filter_pattern str] [-n|--max_count num]
                               [-i|--no_value] [-r|--reverse]
```

Explanation:

- `-a|--start_inclusive`: Specifies whether to include the StartSortKey. Default is true.
- `-b|--stop_inclusive`: Specifies whether to include the StopSortKey. Default is false.
- `-s|--sort_key_filter_type`: Specifies the filter type for **SortKey**, including no filter, any position match, prefix match, and suffix match. Default is no filter.
- `-y|--sort_key_filter_pattern`: Specifies the filter pattern for **SortKey**. An empty string is equivalent to no filter.
- `-n|--max_count`: Specifies the maximum number of data items to read.
- `-i|--no_value`: Specifies whether to only return **HashKey** and **SortKey** without returning **Value** data. Default is false.
- `-r|--reverse`: Specifies whether to scan the database in reverse order, from the end to the beginning while returning results in ascending **SortKey** order. This parameter is supported from [v1.8.0 version](https://github.com/apache/incubator-pegasus/releases/tag/v1.8.0) onward.

Examples:

```
>>> multi_get_range pegasus cloud0 cloud5 -a true -b true -s prefix -y str -n 100 -i false -r false
```

### multi_get_sortkeys

Retrieve all SortKeys under the same **HashKey**.

Usage:

```
USAGE:  multi_get_sortkeys     <hash_key>
```

Examples:

```
>>> multi_get_sortkeys pegasus
```

### del

Delete a single piece of data.

Usage:

```
USAGE:  del                    <hash_key> <sort_key>
```

Examples:

```
>>> del pegasus cloud0
```

### multi_del

Delete multiple pieces of data under the same **HashKey** by specifying multiple **SortKey**s.

Usage:

```
USAGE:  multi_del              <hash_key> <sort_key> [sort_key...]
```

Examples:

```
>>> multi_del del pegasus cloud0 cloud1
```

### multi_del_range

Delete multiple pieces of data under the same **HashKey** by specifying a query range and filtering criteria for the **SortKey**.

Usage:

```
USAGE:  multi_del_range        <hash_key> <start_sort_key> <stop_sort_key>
                               [-a|--start_inclusive true|false] [-b|--stop_inclusive true|false]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix]
                               [-y|--sort_key_filter_pattern str] [-o|--output file_name]
                               [-i|--silent]
```

Explanation:

- The `-i|--silent` parameter: If set to `true`, it means not to print logs during deletion.
- The rest of the parameters are explained in the [multi_get_range](#multi_get_range) section.

Examples:

```
>>> multi_del_range pegasus cloud0 cloud5 -a true -b true -s prefix -y str -n 100 -i false -r false
```

### incr

Atomic increment and decrement operations.

Usage:

```
USAGE:  incr                   <hash_key> <sort_key> [increment]
```

Explanation:

- The operand "increment" can be either positive or negative, so a single "incr" interface can be used to achieve both atomic increment and atomic decrement. For more details, please refer to [Atomic Increment/Decrement](/api/single-atomic#Atomic-Increment-Decrement).

Examples:

```
>>> incr  cloud0 pegasus 1
```

### check_and_set

Atomic Compare-And-Swap (CAS) Operation.

Usage:

```
USAGE:  check_and_set          <hash_key> [-c|--check_sort_key str]
                               [-t|--check_type not_exist|not_exist_or_empty|exist|not_empty]
                               [match_anywhere|match_prefix|match_postfix]
                               [bytes_less|bytes_less_or_equal|bytes_equal|bytes_greater_or_equal|bytes_greater]
                               [int_less|int_less_or_equal|int_equal|int_greater_or_equal|int_greater]
                               [-o|--check_operand str] [-s|--set_sort_key str] [-v|--set_value str]
                               [-l|--set_value_ttl_seconds num] [-r|--return_check_value]
```

Explanation:

- Compare-And-Swap (CAS) is originally a term used to describe a CPU's atomic instruction. Its purpose is to compare two values and then atomically update a location if they are equal. Please refer to [Atomic CAS](/api/single-atomic#cas-operations).

Examples:
Like the below command checks data with hashKey "cloud." If the value with sortKey "90" exists, it sets the value of sortKey "91" to "92" and returns the value of sortKey "90".

```
>>> check_and_set cloud -c 90 -t exist -s 91 -v 92 -r
```

### check_and_mutate

The extended version of the atomic CAS for more information please refer to [Atomic CAS Extended Version](/clients/java-client#checkandmutate).

Usage:

```
USAGE:  check_and_mutate       <hash_key> [-c|--check_sort_key str]
                               [-t|--check_type not_exist|not_exist_or_empty|exist|not_empty]
                               [match_anywhere|match_prefix|match_postfix]
                               [bytes_less|bytes_less_or_equal|bytes_equal|bytes_greater_or_equal|bytes_greater]
                               [int_less|int_less_or_equal|int_equal|int_greater_or_equal|int_greater]
                               [-o|--check_operand str] [-r|--return_check_value]
```

### exist

Query whether a specific piece of data exists.

Usage:

```
USAGE:  exist <hash_key> <sort_key>
```

Examples:

```
>>> exist pegasus cloud0
```

### count

Retrieve the count of SortKeys under the same **HashKey**.

Usage:

```
USAGE:  count <hash_key>
```

Examples:

```
>>> count pegasus
```

### ttl

Inquire about the TTL (Time To Live) duration for a specific piece of data, returning the remaining live time in seconds. If "Infinite" is returned, it indicates there is no TTL limit.

Usage:

```
USAGE:  ttl                    <hash_key> <sort_key>
```

Examples:

```
>>> ttl pegasus cloud
```

### hash

Retrieve the hash value of a specific piece of data and return it in integer form.
If a specific table is selected using `use [app_name]` before using this command, it will also calculate the partition_id based on the hash value of the data, and return information about the primary and secondary nodes currently serving that partition.

Usage:

```
USAGE:  hash <hash_key> <sort_key>
```

Examples:

```
>>> hash pegasus cloud
```

### hash_scan

Scan the data under the same **HashKey** one item at a time, with the option to specify a query range and filtering criteria for the **SortKey**. The results will be sorted by **SortKey**.

Usage:

```
USAGE:  hash_scan              <hash_key> <start_sort_key> <stop_sort_key>
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

Explanation:

- Parameter `-a|--start_inclusive`: Specifies whether to include StartSortKey, defaulting to true.
- Parameter `-b|--stop_inclusive`: Specifies whether to include StopSortKey, defaulting to false.
- Parameter `-s|--sort_key_filter_type`: Specifies the filtering type for SortKey, including no filtering, any position match, prefix match, and suffix match, with the default being no filtering.
- Parameter `-y|--sort_key_filter_pattern`: Specifies the filtering pattern for SortKey, where an empty string is equivalent to no filtering.
- Parameter `-v|--value_filter_type`: Specifies the value filtering type, including any position match, prefix match, suffix match, etc.
- Parameter `-z|--value_filter_pattern str`: Specifies the filtering pattern for the value, where an empty string is equivalent to no filtering.
- Parameter `-o|--output file_name`: Specifies the filename for storing the output results.
- Parameter `-n|--max_count num`: Specifies the maximum number of values to retrieve.
- Parameter `-t|--timeout_ms num`: Specifies the timeout duration for data retrieval.
- Parameter `-d|--detailed`: Outputs detailed storage information for the data, including app_id, partition_index, and server_ip.
- Parameter `-i|--no_value`: Retrieves only hash_key and sort_key without fetching the value.

Examples:

```
>>> hash_scan pegasus cloud00 cloud01
```

### full_scan

Perform a full scan of the table, with the option to specify filtering conditions for **HashKey**, **SortKey**, and **Value**. Results under the same **HashKey** will be sorted by **SortKey**. There is no guaranteed order between HashKeys.

Usage:

```
USAGE: full_scan               [-h|--hash_key_filter_type anywhere|prefix|postfix]
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

Explanation:

- Please refer to the parameter explanations for more details [hash scan](#hash_scan).

Examples:

```
>>> full_scan
```

### copy_data

Insert the data from one table into another table one item at a time.

Usage:

```
USAGE:  copy_data              <-c|--target_cluster_name str> <-a|--target_app_name str>
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

Explanation:

- The source table is specified using the `use` command, and the target table is executed using the `-c` and `-a` commands. The target table can be in another cluster. For detailed usage, refer to [Table Migration#copy_data_migration](/administration/table-migration#copy-data-migration). You can specify filtering conditions for **HashKey**, **SortKey**, and **Value**.

Examples:

```
>>> copy_data -c ClusterB -a TableB -t 10000
```

### clear_data

Deleting the data from one table item by item essentially involves scanning the data and then performing a delete operation on each data item. You can specify filtering conditions for **HashKey**, **SortKey**, and **Value**.

Usage:

```
USAGE:  clear_data             [-p|--partition num]
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

Explanation:

- Parameter `-p|--partition num`: Specifies the partition to delete.
- Parameter `-b|--max_batch_count num`: Specifies the maximum number to delete at once.
- Parameter `-f|--force`: If set to true, it indicates deletion; otherwise, it cannot be deleted, and it prints a confirmation message "ERROR: be careful to clear data!!! Please specify --force if you are determined to do so.".
- The rest of the parameters are filtering conditions, refer to [multi_get_range](#multi_get_range).

Examples:

```
>>> clear_data
```

### count_data

Count the number of data items in a table. You can specify filtering conditions for **HashKey**, **SortKey**, and **Value**.

Usage:

```
USAGE:  count_data             [-c|--precise][-p|--partition num]
                               [-b|--max_batch_count num][-t|--timeout_ms num]
                               [-h|--hash_key_filter_type anywhere|prefix|postfix]
                               [-x|--hash_key_filter_pattern str]
                               [-s|--sort_key_filter_type anywhere|prefix|postfix|exact]
                               [-y|--sort_key_filter_pattern str]
                               [-v|--value_filter_type anywhere|prefix|postfix|exact]
                               [-z|--value_filter_pattern str][-d|--diff_hash_key] [-a|--stat_size]
                               [-n|--top_count num] [-r|--run_seconds num]
```

Explanation:

- Parameter `-c|--precise`: Specifies detailed data for the table.
- Parameter `-p|--partition`: Specifies the partition to delete.
- Parameter `-b|--max_batch_count`: Specifies the maximum number to delete at once.
- Parameter `-d|--diff_hash_key`: Counts the number of hashKeys.
- Parameter `-n|--top_count`: Displays only the specified number of data items.
- Parameter `-a|--stat_size`: Calculates the current size of the value in bytes.
- Parameter `-r|--run_seconds num`: Performs statistics for the specified time duration.
- The rest of the parameters are filtering conditions, refer to [multi_get_range](#multi_get_range).

Examples:

```
>>> count_data
```

## Load balancing

| Subcommands    | Functionality                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| set_meta_level | Set the cluster's load balancing level, including stopped, blind, freezed, steady, lively. The cluster default is steady, which means no automatic load balancing; setting it to lively enables automatic load balancing. |
| get_meta_level | Retrieve the cluster's load balancing level.                                                                                                                                                                              |
| propose        | Send partition operations, including ASSIGN_PRIMARY, ADD_SECONDARY, DOWNGRADE_TO_INACTIVE, and more.                                                                                                                      |
| balance        | Send balance operations, including move_pri, copy_pri, copy_sec, and more.                                                                                                                                                |

For detailed documentation on load balancing, please refer to the following resources [load balance](/administration/rebalance).

## Data recovery

| Subcommands  | Functionality                                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| recover      | To initiate the data recovery process and rebuild metadata information on Zookeeper, please refer to [Meta recovery](/administration/meta-recovery).             |
| ddd_diagnose | To use the DDD automatic diagnostic tool for recovering all backup-unavailable partitions, please refer to [Replica recovery](/administration/replica-recovery). |

## Cold backup management

| Subcommands           | Functionality                                             |
| --------------------- | --------------------------------------------------------- |
| add_backup_policy     | Implementing a cold backup strategy.                      |
| ls_backup_policy      | Inquiring about the cold backup strategy.                 |
| modify_backup_policy  | Modifying the cold backup strategy.                       |
| disable_backup_policy | Disabling the cold backup strategy.                       |
| enable_backup_policy  | Enabling the cold backup strategy.                        |
| restore_app           | Restoring a table from cold backup.                       |
| query_backup_policy   | Retrieve backup policies and the last backup information. |
| query_restore_status  | Inquire about the progress of cold backup restoration.    |

For detailed documentation on cold backups, please refer to [cold backup management](/administration/cold-backup).

## Debugging tools

| Subcommands | Functionality                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------ |
| sst_dump    | Utilize the `sst_dump` tool from RocksDB to convert binary sstable data into readable text data. |
| mlog_dump   | Transform Pegasus' binary commit log data into human-readable text data.                         |
| local_get   | Retrieve values from the local database.                                                         |
