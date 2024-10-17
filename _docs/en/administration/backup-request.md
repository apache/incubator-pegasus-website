---
permalink: administration/backup-request
---

# Background
In the current implementation of Pegasus, reading from secondary replicas can lead to inconsistencies, so only primary replicas are used for reads. However, in certain scenarios, such as load balancing or hotspot writes can cause instability on the primary replica. To address this, we aim to enable reads from secondary replicas when the primary is unstable. While this approach sacrifices some strong consistency, it helps to alleviate long-tail latency in read requests and improves overall system availability. The **backup request** mechanism is designed to facilitate this functionality.

# Design and Implementation
Implementing of backup requests is relatively straightforward. For read operations (write operations currently do not support backup requests), when a client sends a request to the primary, it will wait for a specified delay period (typically p999). If no response is received within this time, the client will randomly select a secondary replica and send a backup request. The first response received will be used.

We recommend using p999 as the delay for sending secondary requests, as the purpose of the backup request operation is to eliminate long-tail latency rather than to improve cluster performance. Setting this value too low can result in an overwhelming number of backup requests, thereby significantly increasing the overall system load. For example, if the delay is set to p50, 50% of the requests would be sent to secondary replicas, causing a 50% increase in system load.

# How to Use
In Pegasus Java Client v2.0.0, we introduced an interface that allows users to enable the backup request feature for a specific table. The method is defined as follows:

```java
public PegasusTableInterface openTable(String tableName, int backupRequestDelayMs) throws PException;
```

Compared to the previous version of the `openTable` interface, we’ve added the `backupRequestDelayMs` parameter. This parameter defines the delay time in milliseconds: if a request sent to the primary replica does not receive a response within `backupRequestDelayMs`, a backup request will be sent to a secondary replica. Notice that setting `backupRequestDelayMs <= 0` disables the backup request feature.

In previous versions of the openTable interface, the backup request mechanism was disabled by default.

# Performance Testing
The table below compares the performance between enabling and disabling backup requests. We used the p999 latency of read without backup requests (138 ms) as the delay for triggering backup requests. The data shows that enabling backup requests has **no significant impact** on the p999 latency for `get` requests, but the p9999 latency is **reduced by several times**.

Additionally, since the delay is set to the p999 value, approximately one out of every thousand requests triggers a backup request. This results in an additional request load (i.e., the overhead of enabling backup requests) of approximately 0.1%. Similarly, setting the `backupRequestDelayMs` to p99 can further reduce the p999 latency, which may increase the additional read request load by around 1%.

| Test Case               | Backup Request Enabled | Read p9999 |
|-------------------------|------------------------|------------|
| 3 Clients, 15 Threads    | No                     | 988,671    |
| 3 Clients, 15 Threads    | Yes                    | 153,599    |
