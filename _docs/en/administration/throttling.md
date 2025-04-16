---
permalink: administration/throttling
---

# Background
Throttling refers to controlling the speed of read/write requests through certain mechanisms.

Why implement throttling? Mainly to reduce cluster pressure and improve stability. If write traffic to the cluster is too high, it will consume significant system resources (CPU, IO, etc.), affecting read request latency. Some services have high requirements for read performance, and without write throttling, quality of service cannot be guaranteed.

From the perspective of throttling location, it can be divided into:
* Client-side throttling: Controls traffic at the source. Advantage is avoiding unnecessary network transmission; disadvantage is requiring additional client logic and difficulty in precise control due to unpredictable user behavior.
* Server-side throttling: Implements throttling on ReplicaServer nodes. Advantage is being transparent to clients with centralized control; disadvantage is only being able to throttle by increasing latency or rejecting requests, which is less direct and may not avoid unnecessary network transmission.

From the granularity perspective, it can be divided into:
* Table-level throttling: Controls throttling for individual tables with finer granularity.
* Node-level throttling: Implements throttling at the ReplicaServer node level without distinguishing specific tables (node-level throttling is not yet supported).

# Client-side Throttling

The Java client currently provides throttling tools. See [Java Client Documentation#Throttling](/clients/java-client#throttling).

# Server-side Throttling

## Table Write Throttling

Starting from version `v1.11.2`, Pegasus added server-side table-level write throttling based on QPS. From version `v1.12.0`, Pegasus added table-level throttling based on throughput.

Implementation principle:
* Users can set `replica.write_throttling` and `replica.write_throttling_by_size` environment variables in [Table Environment Variables](table-env). `replica.write_throttling` is QPS-based throttling, while `replica.write_throttling_by_size` is throughput-based throttling.
* MetaServer asynchronously notifies all ReplicaServers of the environment variables, allowing each replica of the table to obtain them. This process typically takes several seconds to tens of seconds, but no more than one minute.
* After obtaining the environment variables, replicas parse the write_throttling configuration and immediately put it into effect.

write_throttling currently supports two operation types:
* delay: The server does not process requests immediately upon receipt but delays them for a period, increasing client-side write latency to indirectly achieve throttling.
* reject: The server does not process requests upon receipt but returns an ERR_BUSY error code. The error code can be delayed to increase client-side error latency, preventing immediate retries and frequent unnecessary retries.

Environment variable `replica.write_throttling`/`replica.write_throttling_by_size` value format:
```
{delay_qps_threshold}*delay*{delay_ms},{reject_qps_threshold}*reject*{delay_ms_before_reject}
```
Notes:
* delay_qps_threshold: QPS threshold triggering delay operation. If write requests processed within 1 second exceed this value, subsequent requests within that second will be delayed.
* delay_ms: Delay time in milliseconds, must be >=0.
* reject_qps_threshold: QPS threshold triggering reject operation. If write requests processed within 1 second exceed this value, subsequent requests within that second will be rejected.
* delay_ms_before_reject: Delay time before returning error code in milliseconds, must be >=0.
* Both delay and reject configurations can be provided together or separately.
* If both delay and reject configurations are provided and QPS reaches both thresholds, the reject operation will be executed.
* Table-level throttling is distributed across each partition, so thresholds shouldn't be set too small. For example, if table `temp` has 256 partitions with the sample throttling parameters below, throttling will trigger when a partition's QPS exceeds (1000/256) for delay or (2000/256) for reject. For size-based throttling, delay triggers at (10^9/256) bytes/sec and reject at (20^9/256) bytes/sec.

**Write throttling configuration example:**

```bash
$ ./run.sh shell -n {clusterName}
>>> use temp
OK
>>> set_app_envs replica.write_throttling 1000*delay*100,2000*reject*200
set app envs succeed
>>> set_app_envs replica.write_throttling_by_size 1000K*delay*100,2000K*reject*200
set app envs succeed
>>> set_app_envs replica.write_throttling_by_size 1000M*delay*100,2000M*reject*200
set app envs succeed
>>> get_app_envs
[app_envs]
replica.write_throttling          : 1000*delay*100,2000*reject*200
replica.write_throttling_by_size  : 1000M*delay*100,2000M*reject*200
```

## Table Read Throttling

Starting from version `v2.4.x`, server-side read throttling based on QPS was added. Read throttling follows the same implementation principle as write throttling.

**Read throttling configuration example:**

```shell
$ ./run.sh shell
>>> use temp
OK
>>> set_app_envs replica.read_throttling 1000*delay*100,2000*reject*200
set app envs succeed
>>> get_app_envs
[app_envs]
replica.read_throttling           : 1000*delay*100,2000*reject*200
