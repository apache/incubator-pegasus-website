---
permalink: administration/partition-split
---

# Overview

Pegasus is a distributed storage system that partitions data using a Hashkey. Typically, traffic is evenly distributed across all cluster nodes. However, in extreme scenarios—such as poor Hashkey design, hotspot events or users, or business logic errors—a single node may become overloaded, which can impact service availability. We have developed a hotspot detection mechanism to help operations teams (Ops) promptly identify and resolve traffic hotspots

# Hot Partition Detection

## Design Principle

Pegasus has three core components: Meta, Replica, and Collector. The Collector periodically retrieves read/write metrics from Replicas. For each partition, it calculates the [Z-score](https://en.wikipedia.org/wiki/Standard_score) by comparing historical and cross-sectional data to identify hotspots. When `enable_hotkey_auto_detect` is enabled, the Collector automatically sends `hotkey detection requests` to suspected partitions, collects statistics, and reports results to the monitoring system (Falcon).

## Configuration Example

Add these configurations,  and then restart Collector.

```Shell
[pegasus.collector]
# Enable automatic hotkey detection.
# Collector will send detection requests to hotspot partitions.
enable_hotkey_auto_detect = true

# The hotspot partition threshold (Z-score) is 3. This reflects the algorithm's sensitivity.
# Partitions above this threshold are marked as hotspots.
# Testing shows 3 is a reasonable setting.
hot_partition_threshold = 3

# Automatic hotspot detection triggers when a single partition exceeds this cumulative threshold count.
occurrence_threshold = 100
```

## Monitoring Metric

In Falcon, this metric detects hotspot partitions on target machines. The `hotkey_type` has two options: `read` (read hotspots) and `write` (write hotspots).

```Plain
app.stat.hotspots@{app_name}.{hotkey_type}.{partition_count}
```

# Hotkey Detection

## Design Principle

This feature identifies the exact `Hashkey` for hotspot partitions. When replicas receive hotspot query for a partition, they log traffic data over a monitoring period to pinpoint hotspot traffic. The collection automatically stops if no hotspots are detected within the monitoring window.

## Usage Example

**Start Detection**

Add to command line: <app_id> <partition_number> <hotspot_type(read/write)> <target_node_address>

```Plain
>>> detect_hotkey -a 3 -p 1 -t write -c start -d 10.231.57.104:34802
Detect hotkey rpc is starting, use 'detect_hotkey -a 3 -p 1 -t write -c query -d 10.231.57.104:34802' to get the result later
```

**Query** **Results**

If hotspot traffic detection is still running, you'll receive this notification:

```Plain
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34802
Hotkey detection performed failed, in 584.78, error_hint:ERR_BUSY Can't get hotkey now, now state: hotkey_collector_state::COARSE_DETECTING
```

Successful result:

```Plain
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34802
Find write hotkey in 3.2 result:\"Thisishotkey1\"
```

No hotspot detected：

```Plain
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34803
Hotkey detect rpc performed failed, in 3.2, error_hint:ERR_BUSY Can't get hotkey now, now state: hotkey_collector_state::STOPPED
```

**Stop Detection**

```Plain
>>> detect_hotkey -a 3 -p 2 -t write -c stop -d 10.231.57.104:34803
Detect hotkey rpc is stopped now
```

*Note: Always run* *`stop`* *before initiating a new detection.*

## Configuration

```Shell
[pegasus.server]
# Threshold for coarse-grained hotspot screening (sensitivity inversely related)
hot_key_variance_threshold = 5
# Threshold for fine-grained hotspot screening (sensitivity inversely related)
hot_bucket_variance_threshold = 7
# Negative value (modification not recommended)
hotkey_buckets_num = 37
# Maximum detection duration per probe (seconds)
max_seconds_to_detect_hotkey = 150
# Data collection interval per probe (seconds)
hotkey_analyse_time_interval_s = 10
```
