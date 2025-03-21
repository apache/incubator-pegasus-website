---
permalink: administration/remote-commands
---

# Introduction

Send remote commands to the Pegasus cluster through the `remote_command` command of the Pegasus shell tool, which includes a command name and 0 or more parameters, and can achieve functions such as information collection and configuration modification.

Performing operations through remote commands has these benefits:
* Direct communication: The command will be sent directly to the target remote process without the need for routing or forwarding.
* Quick take effect: commands are usually executed immediately and take effect without waiting for time.
* Easy development: No need to introduce new RPC, just register a new command name, parameter parsing method, and callback function.

# Supported commands

Pegasus supports different remote commands for different roles (MetaServer, ReplicaServer).
You can query all supported commands through shell tool [`remote_command help` command](/docs/tools/shell/#remote_command).

## MetaServer

Obtain remote commands supported by MetaServer, for example:
```
>>> remote_command -l 127.0.0.1:34601 help
COMMAND: help

CALL [user-specified] [127.0.0.1:34601] succeed:
help|h|H|Help - Display help information
repeat|r|R|Repeat - Execute a command periodically in every interval seconds for the max count time (0 for infinite)
config-dump - Dump all configurations to a server local path or to stdout
engine - Get engine internal information, including threadpools and threads and queues in each threadpool
fd.allow_list - Show the allow list of failure detector
flush-log - Flush log to stderr or file
meta.live_percentage - node live percentage threshold for update
perf-counters - Query perf counters, filtered by OR of POSIX basic regular expressions
perf-counters-by-postfix - Query perf counters, filtered by OR of postfix strings
perf-counters-by-prefix - Query perf counters, filtered by OR of prefix strings
perf-counters-by-substr - Query perf counters, filtered by OR of substrs
reset-log-start-level - Reset the log start level
server-info - Query server information
server-stat - Query selected perf counters
system.queue - Get queue internal information, including the threadpool each queue belongs to, and the queue name and size
task-code - Query task code containing any given keywords
task.queue_max_length - Get the current or set a new max task queue length of a specific thread_pool. It can be set it to INT_MAX which means a big enough value, but it can't be cancelled the delay/reject policy dynamically


Succeed count: 1
Failed count: 0
```

## ReplicaServer

Obtain remote commands supported by ReplicaServer, for example:
```
>>> remote_command -l 127.0.0.1:34801 help
COMMAND: help

CALL [user-specified] [127.0.0.1:34801] succeed:
help|h|H|Help - Display help information
repeat|r|R|Repeat - Execute a command periodically in every interval seconds for the max count time (0 for infinite)
config-dump - Dump all configurations to a server local path or to stdout
engine - Get engine internal information, including threadpools and threads and queues in each threadpool
flush-log - Flush log to stderr or file
nfs.max_copy_rate_megabytes_per_disk - The maximum bandwidth (MB/s) of writing data per local disk when copying from remote node, 0 means no limit, should be greater than 'nfs_copy_block_bytes' which is 4194304
nfs.max_send_rate_megabytes_per_disk - The maximum bandwidth (MB/s) of reading data per local disk when transferring data to remote node, 0 means no limit
perf-counters - Query perf counters, filtered by OR of POSIX basic regular expressions
perf-counters-by-postfix - Query perf counters, filtered by OR of postfix strings
perf-counters-by-prefix - Query perf counters, filtered by OR of prefix strings
perf-counters-by-substr - Query perf counters, filtered by OR of substrs
replica.deny-client - control if deny client read & write request
replica.get-tcmalloc-status - Get the status of tcmalloc
replica.kill_partition - Kill partitions by (all, one app, one partition)
replica.max-concurrent-bulk-load-downloading-count - The maximum concurrent bulk load downloading replica count
replica.mem-release-max-reserved-percentage - control tcmalloc max reserved but not-used memory percentage
replica.query-app-envs - Query app envs on the underlying storage engine by app_id or app_id.partition_id
replica.query-compact - Query full compact status on the underlying storage engine by app_id or app_id.partition_id
replica.release-all-reserved-memory - Release tcmalloc all reserved-not-used memory back to operating system
replica.release-tcmalloc-memory - control if try to release tcmalloc memory
replica.trigger-checkpoint - Trigger replicas to do checkpoint by app_id or app_id.partition_id
replica.verbose-client-log - control if print verbose error log when reply read & write request
replica.verbose-commit-log - control if print verbose log when commit mutation
reset-log-start-level - Reset the log start level
server-info - Query server information
server-stat - Query selected perf counters
system.queue - Get queue internal information, including the threadpool each queue belongs to, and the queue name and size
task-code - Query task code containing any given keywords
task.queue_max_length - Get the current or set a new max task queue length of a specific thread_pool. It can be set it to INT_MAX which means a big enough value, but it can't be cancelled the delay/reject policy dynamically


Succeed count: 1
Failed count: 0
```

# How to use it

Refer to: [`remote_command` command](/docs/tools/shell/#remote_command)
