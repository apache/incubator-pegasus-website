---
permalink: administration/experiences
---

The administrator work of a distributed system includes periodic inspections, monitoring & alarms, troubleshooting, access auditing, etc. to help ensure the stability of service.

# Periodic inspection

* Availability: Availability remains at 100% normally. Occasionally, in the event of node failures or other anomalies, availability may fall below 100%
* IOPS: The sudden increase in IOPS may affect service stability, while the sudden decrease in traffic may be caused by service issues
* Read and write latency: The P99 latency spikes of read and/or write operations may affect Pegasus users
* System resources usage: Whether CPU, memory, disk usage, network bandwidth and connection count have skyrocketed, and whether they have reached the high water mark

# Monitoring and alarms

Refer to [Monitoring](/administration/monitoring).

# Troubleshooting

Use the [Shell tools](/overview/shell) to check the status of Pegasus:
* Whether the basic information of the cluster is normal:
    * Whether the `meta_servers` list is normal
    * Whether the value of `meta_function_level` is `steady`
* Whether each table and each partition is health：`ls -d`
    * Whether the count of table count is correct
    * Whether the number of all table's `unhealthy` partition count is 0
* Whether each server is health: `nodes -d`
    * All servers are in the list and their status is `ALIVE`
    * Is the data distribution severely skewed (i.e. the number of `replica_count` or `primary_count` columns in the list is imbalance). If severely skewed, it's recommended to use the shell tool command `set_meta_level` to set it to `lively` in a time window with relatively low traffic, then load balancing performed. Remember to reset it to `steady` state when they are balanced.
  > Note: For latency sensitive users, load balancing can only be performed when necessary and should not affect service stability. During the process, the cluster status should be closely observed
* Whether the basic information of each server is normal: `server_info`
    * Whether each server version is correct
    * Determine whether a restart has occurred through each server's _start time_
* Whether the metrics of each server is normal: `server_stat`
    * IOPS and latency
    * Memory usage
* Whether the metrics of each table is normal: `app_stat`
    * IOPS
    * Disk usage

Check the system information:
For example, check the count of socket connections on the server (where `34601` is the service listening port of Meta Server):
* Use the `netstat` command on the server where the Meta Server is deployed to check the count of connections:
  ```bash
  netstat -na | grep '34601\>' | grep ESTABLISHED | wc -l
  ```
* Check the remote nodes that have established a connection with the server, sorted by the count of connections:
  ```bash
  netstat -na | grep '34601\>' | grep ESTABLISHE | awk '{print $5}' | sed 's/:.*//' | sort | uniq -c | sort -k1 -n -r | head
  ```
* If there are too many connections (for example, if the count of a single node connections exceeds 100), further analysis is needed to determine the cause.

## Common troubleshooting methods

* If the service process exits abnormally, it is necessary to log in to the corresponding server to check the reason:
    * Check to abnormal exit reason via `dmesg` or `/var/log/messages`
    * If it's `Out of memory: Killed process xxx`: Check the memory usage monitoring of Meta Server or Replica Server and analyze for any abnormal issues
    * If it's `segfault at xxx`:
        * Check the standard error output logs and server logs of Meta Server or Replica Server
        * Check if there is a coredump file generated, and use `gdb` for analysis if there is. If there is no coredump file, set the system and user's `ulimit` as needed.
* If there are many faulty servers, consider to use the `set_meta_level` command to set it to `freezed` state to avoid service avalanches
* If the process keeps restarting (abnormally exiting and being restarted by other process monitoring services), consider temporarily stopping the process monitoring service to automatically restart the Pegasus process
* If remote login (such as `ssh`) to the server is not available, it is possible that the physical server has shutdown. Please contact the service provider for assistance

# Audit when user apply Pegasus service

Pegasus, like most databases, manage resources in the unit of _table_. As Pegasus administrators, when user apply Pegasus table, it is necessary to understand the resources required by the table in order to allocate appropriate computing and storage resources. Consider Pegasus storage principles and optimizing the key-value schema design can also help ensure service stability.

The following information can be collected and analyzed:

* Table name
* Read operation peak (QPS)
* Total number of reads operations (operations/day)
* Write operation peak (TPS)
* Total number of reads operations (operations/day)
* Key-value design schema (to determine if there is a data skew issue)
* Read/write mode (to determine if there are read or write hotspot issues)
* Average size of each key-value (KB)
* Estimated total data usage (GB)
* Growth estimate (e.g. 6 months/1 year/3 years of growth)
* Read operation latency required (P99 latency)
* Write operation latency required (P99 latency)
* IOPS characteristic (such as all-day equilibrium, smooth with peaks and valleys, timed batch writes, etc.)
