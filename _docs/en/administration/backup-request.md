---
permalink: administration/backup-request
---

# Background
In the current implementation of Pegasus, reading from secondary replicas can cause inconsistencies, so Pegasus currently only supports reading from primary replicas. However, in certain situations (such as load balancing, hotspot writes, etc.), the primary can often become unstable. Therefore, we hope to read from the secondary when the primary is unstable, sacrificing some strong consistency to reduce the tail latency of read requests and improve system availability. Backup request is designed to achieve this functionality.

# Design and Implementation

The implementation principle of the backup request is relatively simple: For read operations (currently, write operations do not support backup requests), when the client sends a request to the primary, if the response has not been returned after a certain delay (usually p999), a secondary is randomly selected and a backup request is sent to it. Finally, the fastest returned response is processed.

We recommend choosing p999 as the delay time for sending secondary requests because the backup request operation is intended to eliminate tail latency, not to improve cluster performance. If the value is set too low, the large number of backup requests will increase the cluster pressure (assuming p50 is chosen as the delay, then 50% of the requests will send requests to the secondary, and the system load will increase by 50%).

# How to Use
In Pegasus Java client v2.0.0, we have added an interface through which the backup request function of a specific table can be enabled. The implementation is as follows:
```java
public PegasusTableInterface openTable(String tableName, int backupRequestDelayMs) throws PException;
```

Compared to the old version of the `openTable` interface, we have added a `backupRequestDelayMs` parameter. This parameter is the delay mentioned above, i.e.: sending a request to the primary, if the response has not returned after `backupRequestDelayMs` milliseconds, then send a backup request to the secondary. Note that `backupRequestDelayMs <= 0` means disabling the backup request feature.

In addition, in the old version of the `openTable` interface, the backup request feature is disabled by default.

# Performance Testing

The following table shows the performance comparison of whether the backup request is enabled. Here we selected the p999 time of read requests when the backup request is not enabled as the delay time for the backup request (138ms). The data shows that after enabling the backup request, the p999 latency of get requests **remains almost unchanged**, while the p9999 latency is **reduced by several times**.

In addition, since the delay time is set to p999 time, about 1 out of 1000 requests will send a backup request, so the proportion of additional request volume (i.e., the additional overhead of enabling the backup request) is about 0.1%. By analogy, if you want to reduce P999 latency, you can set `backupRequestDelayMs` to P99 latency, which will increase the additional read traffic by 1%.

| test case            | enable backup request | read p9999 |
|----------------------|-----------------------|------------|
| 3-clients 15-threads | no                    | 988671     |
| 3-clients 15-threads | yes                   | 153599     |
